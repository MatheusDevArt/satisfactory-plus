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

// ---------- Blob JSON Helpers ----------
async function readJsonBlob(pathname) {
  const { blobs } = await list({ prefix: pathname, limit: 10, token: getToken() });
  const exact = blobs.find((b) => b.pathname === pathname);
  if (!exact) return null;
  const res = await fetch(`${exact.url}?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return await res.json();
}

async function writeJsonBlob(pathname, obj) {
  return await put(pathname, JSON.stringify(obj), {
    access: 'public',
    contentType: 'application/json; charset=utf-8',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
    token: getToken()
  });
}

async function deleteBlobByPathname(pathname) {
  const { blobs } = await list({ prefix: pathname, limit: 10, token: getToken() });
  const exact = blobs.find((b) => b.pathname === pathname);
  if (exact) {
    await del(exact.url, { token: getToken() });
    return true;
  }
  return false;
}

async function listJsonBlobs(prefix) {
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
  const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return await res.json();
}

// ---------- Security: CORS, CSRF, Cookies, Sanitization ----------
function getClientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length > 0) return xf.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

function getAllowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return null;
  const host = req.headers.host || '';
  try {
    const u = new URL(origin);
    if (u.host === host || u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname.endsWith('.vercel.app')) {
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
  // Requer cabeçalho customizado X-Requested-With ou Origin do mesmo host
  const xrw = req.headers['x-requested-with'];
  if (xrw === 'SatisfactoryPlus') return true;
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin && host) {
    try {
      const u = new URL(origin);
      if (u.host === host) return true;
    } catch {
      return false;
    }
  }
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
      map[k] = decodeURIComponent(v);
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
  if (req.body && typeof req.body === 'object') return req.body;
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
        resolve(raw ? JSON.parse(raw) : {});
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

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    role: user.role === 'admin' ? 'admin' : 'user',
    createdAt: user.createdAt
  };
}

async function ensureAdminSeeded() {
  const adminUser = String(process.env.ADMIN_USERNAME || '').trim();
  const adminPass = String(process.env.ADMIN_PASSWORD || '');
  if (!adminUser || !adminPass) return;
  const key = `db/users/${normalizeUsername(adminUser)}.json`;
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
}

async function getUserByUsername(username) {
  const lower = normalizeUsername(username);
  if (!lower) return null;
  return await readJsonBlob(`db/users/${lower}.json`);
}

// ---------- Sessions (Persistent 90-day sliding window) ----------
async function createSession(user) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const now = Date.now();
  const sessionObj = {
    tokenHash,
    userId: user.id,
    username: user.username,
    usernameLower: user.usernameLower,
    role: user.role === 'admin' ? 'admin' : 'user',
    createdAt: now,
    lastSeenAt: now,
    expiresAt: now + SESSION_TTL_MS
  };
  await writeJsonBlob(`db/sessions/${tokenHash}.json`, sessionObj);
  return rawToken;
}

async function getAuthenticatedUser(req, res, renew = true) {
  const cookies = parseCookies(req);
  const rawToken = cookies[SESSION_COOKIE_NAME];
  if (!rawToken || rawToken.length < 32) return null;
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const session = await readJsonBlob(`db/sessions/${tokenHash}.json`);
  if (!session) return null;

  const now = Date.now();
  if (session.expiresAt < now) {
    await deleteBlobByPathname(`db/sessions/${tokenHash}.json`).catch(() => {});
    if (res) clearSessionCookie(res);
    return null;
  }

  // Renova sessão a cada 24h de uso para evitar escritas desnecessárias
  if (renew && now - (session.lastSeenAt || 0) > 24 * 60 * 60 * 1000) {
    session.lastSeenAt = now;
    session.expiresAt = now + SESSION_TTL_MS;
    await writeJsonBlob(`db/sessions/${tokenHash}.json`, session).catch(() => {});
    if (res) setSessionCookie(res, rawToken);
  }

  const user = await getUserByUsername(session.usernameLower);
  if (!user) return null;
  return { user, session, tokenHash };
}

async function invalidateSession(req, res) {
  const cookies = parseCookies(req);
  const rawToken = cookies[SESSION_COOKIE_NAME];
  if (rawToken && rawToken.length >= 32) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await deleteBlobByPathname(`db/sessions/${tokenHash}.json`).catch(() => {});
  }
  if (res) clearSessionCookie(res);
}

// ---------- Rate Limiting (Blob-backed, strongly consistent via list) ----------
async function checkRateLimit(bucketKey, maxAttempts, windowMs) {
  const hashKey = crypto.createHash('sha256').update(bucketKey).digest('hex').slice(0, 24);
  const prefix = `db/ratelimit/${hashKey}/`;
  const { blobs } = await list({ prefix, limit: 100, token: getToken() });
  const now = Date.now();
  const valid = [];
  for (const b of blobs) {
    const file = b.pathname.slice(prefix.length);
    const ts = Number(file.split('_')[0]);
    if (Number.isFinite(ts) && now - ts < windowMs) {
      valid.push(ts);
    } else {
      del(b.url, { token: getToken() }).catch(() => {});
    }
  }
  valid.sort((a, b) => a - b);
  return {
    blocked: valid.length >= maxAttempts,
    remaining: Math.max(0, maxAttempts - valid.length),
    retryAfterMs: valid.length >= maxAttempts ? Math.max(1000, windowMs - (now - valid[0])) : 0,
    prefix,
    valid
  };
}

async function recordRateLimitHit(bucketKey, windowMs) {
  const hashKey = crypto.createHash('sha256').update(bucketKey).digest('hex').slice(0, 24);
  const now = Date.now();
  const rand = crypto.randomBytes(4).toString('hex');
  const pathname = `db/ratelimit/${hashKey}/${now}_${rand}.json`;
  await put(pathname, '{}', {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
    token: getToken()
  });
}

async function clearRateLimit(bucketKey) {
  const hashKey = crypto.createHash('sha256').update(bucketKey).digest('hex').slice(0, 24);
  const prefix = `db/ratelimit/${hashKey}/`;
  const { blobs } = await list({ prefix, limit: 100, token: getToken() });
  for (const b of blobs) {
    await del(b.url, { token: getToken() }).catch(() => {});
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
  validateUsername,
  validatePassword,
  getReservedAdminUsernameLower,
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
  cleanupExpiredReports
};
