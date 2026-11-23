const crypto = require('crypto');
const { put, del, list } = require('@vercel/blob');

const SESSION_COOKIE_NAME = 'splus_session';
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 dias
const REPORT_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 dias
const MAX_REPORTS_24H = 10;
const MAX_IMAGES_PER_REPORT = 7;
const MAX_REPORT_IMAGES_TOTAL_BYTES = 3 * 1024 * 1024; // 3 MB pós-compressão
const MAX_USER_IMAGE_QUOTA_BYTES = 50 * 1024 * 1024; // 50 MB por usuário
const MAX_PROJECTS_PER_USER = 50;
const MAX_PROJECT_BYTES = 1024 * 1024; // 1 MB
const LOGIN_FAIL_LIMIT = 5;
const LOGIN_FAIL_WINDOW_MS = 10 * 60 * 1000; // 10 min
const REGISTER_IP_LIMIT = 5;
const REGISTER_IP_WINDOW_MS = 60 * 60 * 1000; // 1 hora

function getToken() {
  return process.env.BLOB_READ_WRITE_TOKEN || '';
}

function getRedisConfig() {
  let url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '').replace(/\/+$/, '');
  let token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
  if (!url || !token) {
    for (const k of Object.keys(process.env)) {
      if (k.endsWith('_KV_REST_API_URL') && process.env[k]) {
        const prefix = k.slice(0, -'_KV_REST_API_URL'.length);
        const t = process.env[`${prefix}_KV_REST_API_TOKEN`];
        if (t) { url = String(process.env[k]).replace(/\/+$/, ''); token = String(t); break; }
      }
      if (k.endsWith('_UPSTASH_REDIS_REST_URL') && process.env[k]) {
        const prefix = k.slice(0, -'_UPSTASH_REDIS_REST_URL'.length);
        const t = process.env[`${prefix}_UPSTASH_REDIS_REST_TOKEN`];
        if (t) { url = String(process.env[k]).replace(/\/+$/, ''); token = String(t); break; }
      }
    }
  }
  return (url && token) ? { url, token } : null;
}

async function redisCmd(args) {
  const cfg = getRedisConfig();
  if (!cfg) return null;
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args),
    cache: 'no-store'
  });
  if (!res.ok) {
    const err = new Error(`Redis HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  if (data && data.error) {
    const err = new Error(`Redis error: ${data.error}`);
    err.status = 503;
    throw err;
  }
  return data ? data.result : null;
}

function getBlobStoreId() {
  const token = getToken();
  const m = /^vercel_blob_rw_([a-zA-Z0-9]+)_/i.exec(token);
  return m ? m[1] : '';
}

function getDirectBlobUrl(pathname, isPrivate = false) {
  const storeId = getBlobStoreId();
  if (!storeId) return '';
  const clean = String(pathname || '').replace(/^\/+/, '');
  const sub = isPrivate ? 'private' : 'public';
  return `https://${storeId}.${sub}.blob.vercel-storage.com/${clean}`;
}

let _blobAccessMode = 'public'; // 'public' | 'private' (auto-detectado)

async function fetchBlobUrl(url, token = getToken()) {
  const sep = url.includes('?') ? '&' : '?';
  const target = `${url}${sep}t=${Date.now()}`;
  const isPrivateHost = /\.private\.blob\.vercel-storage\.com/i.test(url);

  if (isPrivateHost && token) {
    return await fetch(target, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  let res = await fetch(target, { cache: 'no-store' });
  if ((res.status === 401 || res.status === 403) && token) {
    res = await fetch(target, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` }
    });
  }
  return res;
}

function getSessionSecret() {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16) {
    return process.env.SESSION_SECRET;
  }
  const fallbackSeed = process.env.BLOB_READ_WRITE_TOKEN || process.env.ADMIN_PASSWORD || '';
  const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  if (isProd && !fallbackSeed) {
    throw new Error('SESSION_SECRET ausente em ambiente de produção.');
  }
  return crypto.createHash('sha256').update(`splus-session-v2:${fallbackSeed || 'splus-dev-fallback'}`).digest('hex');
}

class StorageUnavailableError extends Error {
  constructor(stage, cause) {
    super(`Storage error at ${stage}: ${cause?.message || 'unavailable'}`);
    this.name = 'StorageUnavailableError';
    this.stage = stage;
    this.statusCode = cause?.statusCode || cause?.status || 503;
    this.causeName = cause?.name || 'Error';
    this.causeMessage = cause?.message || String(cause || '');
  }
}

function logStorageError(stage, err) {
  console.error('[storage]', JSON.stringify({
    stage,
    errName: err?.name || 'Error',
    errMessage: err?.message || String(err || ''),
    status: err?.statusCode || err?.status || null,
    hasBlobToken: Boolean(getToken())
  }));
}

const _blobCache = new Map(); // pathname -> { data, exp }
const BLOB_CACHE_TTL_MS = 45 * 1000;
const MAX_CACHE_ENTRIES = 2000;

function setBlobCache(pathname, data, ttlMs = BLOB_CACHE_TTL_MS) {
  if (_blobCache.size >= MAX_CACHE_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of _blobCache.entries()) {
      if (!v || v.exp <= now) _blobCache.delete(k);
    }
    if (_blobCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = _blobCache.keys().next().value;
      if (oldestKey) _blobCache.delete(oldestKey);
    }
  }
  _blobCache.set(pathname, { data, exp: Date.now() + ttlMs });
}

function invalidateBlobCache(pathname) {
  if (pathname) _blobCache.delete(pathname);
}

// ---------- Password Hashing (Node native scrypt, timing-safe) ----------
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false;
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hexKey] = parts;
  const derived = crypto.scryptSync(String(password), salt, 64, { N: 16384, r: 8, p: 1 });
  const expected = Buffer.from(hexKey, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

// ---------- Blob / Redis JSON Helpers ----------
async function readJsonBlob(pathname, useCache = true) {
  if (useCache) {
    const cached = _blobCache.get(pathname);
    if (cached && cached.exp > Date.now()) {
      return cached.data ? JSON.parse(JSON.stringify(cached.data)) : null;
    }
  }

  // Se Upstash Redis / Vercel KV estiver conectado, usa Redis (500k ops/mês grátis)
  if (getRedisConfig()) {
    try {
      const raw = await redisCmd(['GET', pathname]);
      if (raw === null || raw === undefined) {
        setBlobCache(pathname, null, 15000);
        return null;
      }
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      setBlobCache(pathname, parsed, BLOB_CACHE_TTL_MS);
      return JSON.parse(JSON.stringify(parsed));
    } catch (err) {
      logStorageError(`redis:readJson:${pathname}`, err);
      throw new StorageUnavailableError(`redis:readJson:${pathname}`, err);
    }
  }

  const token = getToken();
  if (!token) {
    const err = new Error('BLOB_READ_WRITE_TOKEN ausente no ambiente');
    err.status = 503;
    logStorageError(`readJsonBlob:no_token:${pathname}`, err);
    throw new StorageUnavailableError(`readJsonBlob:no_token:${pathname}`, err);
  }

  // 1) Leitura direta por URL (0 chamadas list() / 0 Advanced Operations)
  const directUrl = getDirectBlobUrl(pathname, _blobAccessMode === 'private');
  if (directUrl) {
    try {
      const res = await fetchBlobUrl(directUrl, token);
      if (res.status === 404) {
        setBlobCache(pathname, null, 15000);
        return null;
      }
      if (res.ok) {
        const parsed = await res.json();
        setBlobCache(pathname, parsed, BLOB_CACHE_TTL_MS);
        return JSON.parse(JSON.stringify(parsed));
      }
      logStorageError(`readJsonBlob:direct_http_${res.status}:${pathname}`, new Error(`HTTP ${res.status}`));
    } catch (directErr) {
      logStorageError(`readJsonBlob:direct_fetch:${pathname}`, directErr);
    }
  }

  // 2) Fallback via list() + fetch autenticado (suporta store público e privado)
  try {
    const { blobs } = await list({ prefix: pathname, limit: 10, token });
    const exact = blobs.find((b) => b.pathname === pathname);
    if (!exact) {
      setBlobCache(pathname, null, 15000);
      return null;
    }
    if (/\.private\.blob\.vercel-storage\.com/i.test(exact.url)) {
      _blobAccessMode = 'private';
    }
    const res = await fetchBlobUrl(exact.url, token);
    if (!res.ok) {
      const err = new Error(`Blob fetch HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    const parsed = await res.json();
    setBlobCache(pathname, parsed, BLOB_CACHE_TTL_MS);
    return JSON.parse(JSON.stringify(parsed));
  } catch (err) {
    logStorageError(`readJsonBlob:${pathname}`, err);
    throw new StorageUnavailableError(`readJsonBlob:${pathname}`, err);
  }
}

async function writeJsonBlob(pathname, obj) {
  const payload = JSON.stringify(obj);

  if (getRedisConfig()) {
    try {
      await redisCmd(['SET', pathname, payload]);
      setBlobCache(pathname, obj, BLOB_CACHE_TTL_MS);
      return { pathname, url: `redis://${pathname}` };
    } catch (err) {
      logStorageError(`redis:writeJson:${pathname}`, err);
      throw new StorageUnavailableError(`redis:writeJson:${pathname}`, err);
    }
  }

  const token = getToken();
  const opts = {
    access: _blobAccessMode,
    contentType: 'application/json; charset=utf-8',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
    token
  };
  try {
    const res = await put(pathname, payload, opts);
    setBlobCache(pathname, obj, BLOB_CACHE_TTL_MS);
    return res;
  } catch (err) {
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('private') || msg.includes('public') || msg.includes('access')) {
      const altAccess = _blobAccessMode === 'public' ? 'private' : 'public';
      try {
        const res = await put(pathname, payload, { ...opts, access: altAccess });
        _blobAccessMode = altAccess;
        setBlobCache(pathname, obj, BLOB_CACHE_TTL_MS);
        return res;
      } catch (err2) {
        logStorageError(`writeJsonBlob:${pathname}`, err2);
        throw new StorageUnavailableError(`writeJsonBlob:${pathname}`, err2);
      }
    }
    logStorageError(`writeJsonBlob:${pathname}`, err);
    throw new StorageUnavailableError(`writeJsonBlob:${pathname}`, err);
  }
}

async function deleteBlobByPathname(pathname) {
  invalidateBlobCache(pathname);
  if (getRedisConfig()) {
    try {
      const n = await redisCmd(['DEL', pathname]);
      return Number(n) > 0;
    } catch (err) {
      logStorageError(`redis:delete:${pathname}`, err);
      throw new StorageUnavailableError(`redis:delete:${pathname}`, err);
    }
  }
  try {
    const { blobs } = await list({ prefix: pathname, limit: 10, token: getToken() });
    const exact = blobs.find((b) => b.pathname === pathname);
    if (exact) {
      await del(exact.url, { token: getToken() });
      return true;
    }
    return false;
  } catch (err) {
    logStorageError(`deleteBlobByPathname:${pathname}`, err);
    throw new StorageUnavailableError(`deleteBlobByPathname:${pathname}`, err);
  }
}

async function listJsonBlobs(prefix) {
  if (getRedisConfig()) {
    try {
      const seen = new Set();
      let cursor = '0';
      let safety = 0;
      do {
        const res = await redisCmd(['SCAN', cursor, 'MATCH', `${prefix}*`, 'COUNT', '200']);
        if (!Array.isArray(res) || res.length < 2) break;
        cursor = String(res[0] || '0');
        const batch = Array.isArray(res[1]) ? res[1] : [];
        for (const k of batch) seen.add(String(k));
        safety++;
      } while (cursor !== '0' && safety < 200);
      return Array.from(seen).map((k) => ({
        pathname: k,
        url: `redis://${k}`
      }));
    } catch (err) {
      logStorageError(`redis:list:${prefix}`, err);
      throw new StorageUnavailableError(`redis:list:${prefix}`, err);
    }
  }
  const results = [];
  let cursor = undefined;
  do {
    const page = await list({ prefix, limit: 200, cursor, token: getToken() });
    for (const b of page.blobs) {
      results.push(b);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return results;
}

async function fetchJsonFromBlobUrl(url) {
  if (String(url || '').startsWith('redis://')) {
    return await readJsonBlob(String(url).slice('redis://'.length), true);
  }
  const res = await fetchBlobUrl(url);
  if (!res.ok) return null;
  return await res.json();
}

// ---------- Security: CORS, CSRF, Cookies, Sanitization ----------
function getClientIp(req) {
  const vff = req.headers['x-vercel-forwarded-for'];
  if (typeof vff === 'string' && vff.length > 0) return vff.split(',')[0].trim();
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.length > 0) return realIp.trim();
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length > 0) return xf.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function getAllowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return null;
  const host = req.headers.host || '';
  const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  const extraAllowed = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  try {
    const u = new URL(origin);
    if (u.host === host) return origin;
    if (extraAllowed.includes(origin) || extraAllowed.includes(u.host)) return origin;
    if (!isProd && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) {
      return origin;
    }
  } catch {
    return null;
  }
  return null;
}

function applySecurityHeaders(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cache-Control', 'no-store');
  const allowedOrigin = getAllowedOrigin(req);
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Vary', 'Origin');
  }
}

function verifyCsrf(req) {
  const method = (req.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;
  const origin = req.headers.origin;
  const host = req.headers.host;
  // Se o cabeçalho Origin existir, ele DEVE coincidir estritamente com o host (bloqueia CSRF cross-origin primeiro)
  if (origin) {
    if (!host) return false;
    try {
      const u = new URL(origin);
      if (u.host !== host) return false;
    } catch {
      return false;
    }
  }
  // Exige cabeçalho customizado X-Requested-With ou Origin validado do mesmo host
  const xrw = req.headers['x-requested-with'];
  if (xrw === 'SatisfactoryPlus') return true;
  if (origin && host) return true;
  return false;
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const map = {};
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      try {
        map[k] = decodeURIComponent(v);
      } catch {
        map[k] = v;
      }
    }
  });
  return map;
}

function setSessionCookie(res, token) {
  const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`
  ];
  if (isProd) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res) {
  const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0'
  ];
  if (isProd) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

async function readRequestBody(req, maxBytes = 4 * 1024 * 1024) {
  if (req.body !== undefined) {
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      const approxLen = Buffer.byteLength(JSON.stringify(req.body), 'utf8');
      if (approxLen > maxBytes) throw new Error('PAYLOAD_TOO_LARGE');
      return req.body;
    }
    if (typeof req.body === 'string') {
      if (Buffer.byteLength(req.body, 'utf8') > maxBytes) throw new Error('PAYLOAD_TOO_LARGE');
      try {
        const parsed = req.body ? JSON.parse(req.body) : {};
        return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
      } catch {
        throw new Error('INVALID_JSON');
      }
    }
    return {};
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        const parsed = raw ? JSON.parse(raw) : {};
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          resolve({});
          return;
        }
        resolve(parsed);
      } catch {
        reject(new Error('INVALID_JSON'));
      }
    });
    req.on('error', reject);
  });
}

// ---------- User & Admin Seed Helpers ----------
function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function validateUsername(username) {
  const trimmed = String(username || '').trim();
  if (trimmed.length < 3 || trimmed.length > 20) {
    return 'O nome de usuário deve ter entre 3 e 20 caracteres.';
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    return 'Use apenas letras, números, ponto (.), hífen (-) ou underline (_).';
  }
  return null;
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'A senha deve ter no mínimo 8 caracteres.';
  }
  if (password.length > 128) {
    return 'A senha é muito longa.';
  }
  return null;
}

function getReservedAdminUsernameLower() {
  return normalizeUsername(process.env.ADMIN_USERNAME || 'Sungzeira_');
}

const EXTRA_ADMIN_USERNAMES = new Set(
  [
    'darkblood1331',
    ...String(process.env.EXTRA_ADMIN_USERNAMES || '')
      .split(',')
      .map((s) => normalizeUsername(s))
      .filter(Boolean)
  ]
);

function isReservedAdminUsernameLower(username) {
  const lower = normalizeUsername(username);
  if (!lower) return false;
  return lower === getReservedAdminUsernameLower() || EXTRA_ADMIN_USERNAMES.has(lower);
}

function isAdminUser(user) {
  if (!user) return false;
  const lower = normalizeUsername(user.usernameLower || user.username || '');
  return user.role === 'admin' || EXTRA_ADMIN_USERNAMES.has(lower);
}

function normalizeSecurityAnswer(answer) {
  return String(answer || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function sanitizeUser(user) {
  if (!user) return null;
  const prefs = (user.preferences && typeof user.preferences === 'object') ? user.preferences : {};
  const profile = (user.profile && typeof user.profile === 'object') ? user.profile : {};
  return {
    id: user.id,
    username: user.username,
    role: isAdminUser(user) ? 'admin' : 'user',
    createdAt: user.createdAt,
    securityQuestion: user.securityQuestion ? String(user.securityQuestion).slice(0, 140) : '',
    hasSecurityRecovery: Boolean(user.securityQuestion && user.securityAnswerHash),
    profile: {
      gender: typeof profile.gender === 'string' ? profile.gender.slice(0, 40) : 'prefer_not_to_say',
      age: (profile.age !== null && profile.age !== undefined && profile.age !== '') ? Number(profile.age) : null,
      country: typeof profile.country === 'string' ? profile.country.slice(0, 60) : ''
    },
    preferences: {
      theme: prefs.theme === 'dark' ? 'dark' : (prefs.theme === 'light' ? 'light' : (prefs.theme === 'system' ? 'system' : null)),
      lang: ['pt-BR', 'en-US', 'es-ES'].includes(prefs.lang) ? prefs.lang : 'pt-BR',
      flowDirection: ['LR', 'TB', 'RL', 'BT'].includes(prefs.flowDirection) ? prefs.flowDirection : 'LR',
      maxBeltTier: Number(prefs.maxBeltTier) || 6,
      maxPipeTier: Number(prefs.maxPipeTier) || 2,
      expandAllMachinesDefault: prefs.expandAllMachinesDefault !== undefined ? Boolean(prefs.expandAllMachinesDefault) : true,
      navRailCollapsed: Boolean(prefs.navRailCollapsed),
      showCanvasGrid: prefs.showCanvasGrid !== undefined ? Boolean(prefs.showCanvasGrid) : true,
      snapToGrid: prefs.snapToGrid !== undefined ? Boolean(prefs.snapToGrid) : true,
      reduceMotion: Boolean(prefs.reduceMotion),
      energyAutoUnit: prefs.energyAutoUnit !== undefined ? Boolean(prefs.energyAutoUnit) : true,
      autoPatchNotes: prefs.autoPatchNotes !== undefined ? Boolean(prefs.autoPatchNotes) : true,
      libraryFavorites: Array.isArray(prefs.libraryFavorites) ? prefs.libraryFavorites.slice(0, 250) : [],
      libraryRecents: Array.isArray(prefs.libraryRecents) ? prefs.libraryRecents.slice(0, 30) : [],
      calcHistory: Array.isArray(prefs.calcHistory) ? prefs.calcHistory.slice(0, 20) : []
    }
  };
}

let _adminSeedChecked = false;
async function ensureAdminSeeded() {
  if (_adminSeedChecked) return;
  const adminUser = String(process.env.ADMIN_USERNAME || '').trim();
  const adminPass = String(process.env.ADMIN_PASSWORD || '');
  if (!adminUser || !adminPass) {
    _adminSeedChecked = true;
    return;
  }
  const key = `db/users/${normalizeUsername(adminUser)}.json`;
  try {
    const existing = await readJsonBlob(key);
    if (!existing) {
      const userObj = {
        id: `usr_${crypto.randomBytes(8).toString('hex')}`,
        username: adminUser,
        usernameLower: normalizeUsername(adminUser),
        role: 'admin',
        passwordHash: hashPassword(adminPass),
        createdAt: new Date().toISOString()
      };
      await writeJsonBlob(key, userObj);
    }
    _adminSeedChecked = true;
  } catch (err) {
    logStorageError('ensureAdminSeeded', err);
  }
}

async function getUserByUsername(username, useCache = true) {
  const lower = normalizeUsername(username);
  if (!lower || !/^[a-z0-9_.-]{3,20}$/.test(lower)) return null;
  return await readJsonBlob(`db/users/${lower}.json`, useCache);
}

// ---------- Sessions (Stateless HMAC-SHA256 Signed Cookie, 90-day sliding window) ----------
function signSessionToken(payloadObj) {
  const b64 = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(b64).digest('hex');
  return `v2.${b64}.${sig}`;
}

function verifySignedSessionToken(token) {
  if (!token || typeof token !== 'string' || !token.startsWith('v2.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, b64, sig] = parts;
  const expected = crypto.createHmac('sha256', getSessionSecret()).update(b64).digest('hex');
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

async function createSession(user) {
  const now = Date.now();
  const payload = {
    uid: user.id,
    u: user.username,
    ul: user.usernameLower || normalizeUsername(user.username),
    r: isAdminUser(user) ? 'admin' : 'user',
    sv: Number(user.sessionVersion) || 1,
    iat: now,
    exp: now + SESSION_TTL_MS
  };
  return signSessionToken(payload);
}

async function getAuthenticatedUser(req, res, renew = true, options = {}) {
  const cookies = parseCookies(req);
  const rawToken = cookies[SESSION_COOKIE_NAME];
  if (!rawToken || rawToken.length < 32) return null;

  const now = Date.now();

  // Caminho principal: cookie assinado stateless (0 operações de Blob para validar sessão)
  if (rawToken.startsWith('v2.')) {
    const payload = verifySignedSessionToken(rawToken);
    if (!payload || !payload.ul) return null;
    if (!payload.exp || payload.exp < now) {
      if (res) clearSessionCookie(res);
      return null;
    }

    // Renovação deslizante a cada 24h apenas reemitindo o cookie (sem escrita no Blob)
    if (renew && now - (payload.iat || 0) > 24 * 60 * 60 * 1000) {
      const renewed = signSessionToken({
        ...payload,
        iat: now,
        exp: now + SESSION_TTL_MS
      });
      if (res) setSessionCookie(res, renewed);
    }

    // Se allowStatelessFallback (ex.: /api/auth?action=me), tenta ler preferências do cache/Blob,
    // mas se o Blob estiver indisponível, mantém usuário logado sem devolver 401/500!
    let user = null;
    try {
      user = await getUserByUsername(payload.ul, options.useCache !== false);
    } catch (err) {
      if (options.allowStatelessFallback) {
        return {
          user: {
            id: payload.uid,
            username: payload.u,
            usernameLower: payload.ul,
            role: isAdminUser({ usernameLower: payload.ul, role: payload.r }) ? 'admin' : 'user',
            sessionVersion: payload.sv || 1,
            preferences: {}
          },
          session: payload,
          storageDegraded: true
        };
      }
      throw err;
    }

    if (!user) return null;
    if (payload.uid && user.id && payload.uid !== user.id) {
      if (res) clearSessionCookie(res);
      return null;
    }
    const currentSv = Number(user.sessionVersion) || 1;
    if ((Number(payload.sv) || 1) !== currentSv) {
      if (res) clearSessionCookie(res);
      return null;
    }
    if (isAdminUser(user)) user.role = 'admin';
    return { user, session: payload, storageDegraded: false };
  }

  // Compatibilidade legada: sessão antiga salva no Blob -> migra automaticamente para cookie v2
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const session = await readJsonBlob(`db/sessions/${tokenHash}.json`);
  if (!session) return null;

  if (session.expiresAt < now) {
    await deleteBlobByPathname(`db/sessions/${tokenHash}.json`).catch(() => {});
    if (res) clearSessionCookie(res);
    return null;
  }

  const user = await getUserByUsername(session.usernameLower, options.useCache !== false);
  if (!user) return null;
  if (session.userId && user.id && session.userId !== user.id) {
    await deleteBlobByPathname(`db/sessions/${tokenHash}.json`).catch(() => {});
    if (res) clearSessionCookie(res);
    return null;
  }
  if (isAdminUser(user)) user.role = 'admin';

  // Migra imediatamente para cookie assinado stateless e remove blob legado
  if (res) {
    const v2Token = await createSession(user);
    setSessionCookie(res, v2Token);
    await deleteBlobByPathname(`db/sessions/${tokenHash}.json`).catch(() => {});
  }
  return { user, session, tokenHash };
}

async function invalidateSession(req, res) {
  const cookies = parseCookies(req);
  const rawToken = cookies[SESSION_COOKIE_NAME];
  if (rawToken && rawToken.length >= 32 && !rawToken.startsWith('v2.')) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await deleteBlobByPathname(`db/sessions/${tokenHash}.json`).catch(() => {});
  }
  if (res) clearSessionCookie(res);
}

// ---------- Rate Limiting (Redis distribuído quando disponível + fallback in-memory por instância) ----------
const _rateLimitMap = new Map(); // bucketKey -> number[] (timestamps)

function pruneRateLimitMap(now) {
  if (_rateLimitMap.size < MAX_CACHE_ENTRIES) return;
  for (const [k, v] of _rateLimitMap.entries()) {
    if (!Array.isArray(v) || v.length === 0 || now - v[v.length - 1] > 60 * 60 * 1000) {
      _rateLimitMap.delete(k);
    }
  }
  if (_rateLimitMap.size >= MAX_CACHE_ENTRIES) {
    const firstKey = _rateLimitMap.keys().next().value;
    if (firstKey) _rateLimitMap.delete(firstKey);
  }
}

async function checkRateLimit(bucketKey, maxAttempts, windowMs) {
  if (getRedisConfig()) {
    try {
      const rKey = `rl:${bucketKey}`;
      const count = Number(await redisCmd(['GET', rKey]) || 0);
      if (count >= maxAttempts) {
        const pttl = Number(await redisCmd(['PTTL', rKey]) || windowMs);
        return {
          blocked: true,
          remaining: 0,
          retryAfterMs: pttl > 0 ? pttl : windowMs,
          valid: []
        };
      }
      return {
        blocked: false,
        remaining: Math.max(0, maxAttempts - count),
        retryAfterMs: 0,
        valid: []
      };
    } catch {
      // fallback in-memory se Redis oscilar
    }
  }
  const now = Date.now();
  const arr = (_rateLimitMap.get(bucketKey) || []).filter((ts) => now - ts < windowMs);
  if (arr.length > 0) _rateLimitMap.set(bucketKey, arr);
  else _rateLimitMap.delete(bucketKey);

  return {
    blocked: arr.length >= maxAttempts,
    remaining: Math.max(0, maxAttempts - arr.length),
    retryAfterMs: arr.length >= maxAttempts ? Math.max(1000, windowMs - (now - arr[0])) : 0,
    valid: arr
  };
}

async function recordRateLimitHit(bucketKey, windowMs) {
  if (getRedisConfig()) {
    try {
      const rKey = `rl:${bucketKey}`;
      const count = Number(await redisCmd(['INCR', rKey]) || 1);
      if (count === 1) {
        await redisCmd(['PEXPIRE', rKey, String(windowMs)]);
      }
      return;
    } catch {
      // fallback in-memory
    }
  }
  const now = Date.now();
  pruneRateLimitMap(now);
  const arr = (_rateLimitMap.get(bucketKey) || []).filter((ts) => now - ts < windowMs);
  arr.push(now);
  _rateLimitMap.set(bucketKey, arr);
}

async function clearRateLimit(bucketKey) {
  _rateLimitMap.delete(bucketKey);
  if (getRedisConfig()) {
    await redisCmd(['DEL', `rl:${bucketKey}`]).catch(() => {});
  }
}

// ---------- Magic Bytes Image Validation ----------
function detectImageType(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
      buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) {
    return { mime: 'image/png', ext: 'png' };
  }
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  // WEBP: RIFF....WEBP
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return null;
}

// ---------- Cleanup Expired Reports (> 14 days) ----------
async function cleanupExpiredReports() {
  const reportBlobs = await listJsonBlobs('db/reports/');
  const now = Date.now();
  let deletedCount = 0;
  let deletedImages = 0;

  for (const blob of reportBlobs) {
    if (!blob.pathname.endsWith('.json')) continue;
    try {
      const rep = await fetchJsonFromBlobUrl(blob.url);
      if (!rep) continue;
      const createdMs = new Date(rep.createdAt).getTime();
      const expiresMs = rep.expiresAt ? new Date(rep.expiresAt).getTime() : (createdMs + REPORT_TTL_MS);
      if (now >= expiresMs) {
        for (const img of (rep.images || [])) {
          if (img.blobUrl) {
            await del(img.blobUrl, { token: getToken() }).catch(() => {});
            deletedImages++;
          } else if (img.pathname) {
            await deleteBlobByPathname(img.pathname).catch(() => {});
            deletedImages++;
          }
        }
        await del(blob.url, { token: getToken() }).catch(() => {});
        deletedCount++;
      }
    } catch {
      // ignore corrupted entry
    }
  }
  return { deletedCount, deletedImages };
}

module.exports = {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  REPORT_TTL_MS,
  MAX_REPORTS_24H,
  MAX_IMAGES_PER_REPORT,
  MAX_REPORT_IMAGES_TOTAL_BYTES,
  MAX_USER_IMAGE_QUOTA_BYTES,
  MAX_PROJECTS_PER_USER,
  MAX_PROJECT_BYTES,
  LOGIN_FAIL_LIMIT,
  LOGIN_FAIL_WINDOW_MS,
  REGISTER_IP_LIMIT,
  REGISTER_IP_WINDOW_MS,
  getToken,
  getBlobStoreId,
  getDirectBlobUrl,
  fetchBlobUrl,
  hashPassword,
  verifyPassword,
  readJsonBlob,
  writeJsonBlob,
  deleteBlobByPathname,
  listJsonBlobs,
  fetchJsonFromBlobUrl,
  getClientIp,
  applySecurityHeaders,
  verifyCsrf,
  setSessionCookie,
  clearSessionCookie,
  sendJson,
  readRequestBody,
  normalizeUsername,
  normalizeSecurityAnswer,
  validateUsername,
  validatePassword,
  getReservedAdminUsernameLower,
  isReservedAdminUsernameLower,
  sanitizeUser,
  ensureAdminSeeded,
  getUserByUsername,
  createSession,
  getAuthenticatedUser,
  invalidateSession,
  checkRateLimit,
  recordRateLimitHit,
  clearRateLimit,
  detectImageType,
  cleanupExpiredReports,
  StorageUnavailableError
};
