const crypto = require('crypto');
const {
  readJsonBlob,
  writeJsonBlob,
  deleteBlobByPathname,
  listJsonBlobs,
  fetchJsonFromBlobUrl,
  getClientIp,
  applySecurityHeaders,
  verifyCsrf,
  sendJson,
  readRequestBody,
  getAuthenticatedUser,
  checkRateLimit,
  recordRateLimitHit,
  StorageUnavailableError
} = require('../_lib/store');

// Época de reset automático: ao publicar esta atualização, limpa dados antigos/duplicados
// e inicia a contagem do Painel CEO limpa a partir deste momento (sem apagar contas/projetos reais).
const ANALYTICS_RESET_EPOCH = '2026-11-24T03:41:00.000Z';
const ANALYTICS_META_PATH = 'db/analytics/meta.json';

async function performAnalyticsReset(resetBy = 'system', epochTag = ANALYTICS_RESET_EPOCH) {
  const dayBlobs = await listJsonBlobs('db/analytics/days/').catch(() => []);
  const BATCH = 10;
  for (let i = 0; i < dayBlobs.length; i += BATCH) {
    const slice = dayBlobs.slice(i, i + BATCH);
    await Promise.all(
      slice.map((b) => (b && b.pathname ? deleteBlobByPathname(b.pathname).catch(() => {}) : Promise.resolve()))
    );
  }
  await Promise.all([
    deleteBlobByPathname('db/analytics/online.json').catch(() => {}),
    deleteBlobByPathname('db/analytics/known_visitors.json').catch(() => {}),
    deleteBlobByPathname('db/analytics/errors.json').catch(() => {})
  ]);
  const meta = {
    resetAt: new Date().toISOString(),
    epochApplied: epochTag,
    resetBy: String(resetBy || 'system').slice(0, 40)
  };
  await writeJsonBlob(ANALYTICS_META_PATH, meta);
  return meta;
}

async function ensureAnalyticsEpoch() {
  const meta = await readJsonBlob(ANALYTICS_META_PATH, false).catch(() => null);
  if (meta && meta.epochApplied === ANALYTICS_RESET_EPOCH && meta.resetAt) {
    return meta;
  }
  return await performAnalyticsReset('auto-epoch', ANALYTICS_RESET_EPOCH);
}

const COUNTRY_NAMES = {
  BR: 'Brasil', US: 'Estados Unidos', PT: 'Portugal', AR: 'Argentina', CL: 'Chile',
  CO: 'Colômbia', MX: 'México', UY: 'Uruguai', PY: 'Paraguai', PE: 'Peru',
  ES: 'Espanha', DE: 'Alemanha', FR: 'França', GB: 'Reino Unido', CA: 'Canadá',
  IT: 'Itália', NL: 'Países Baixos', PL: 'Polônia', RU: 'Rússia', JP: 'Japão',
  AU: 'Austrália', IN: 'Índia', LOCAL: 'Local / Dev', UNKNOWN: 'Desconhecido'
};

const BR_STATE_NAMES = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia',
  CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás',
  MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
  PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí',
  RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul',
  RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo',
  SE: 'Sergipe', TO: 'Tocantins'
};

const ALLOWED_MODES = new Set([
  'production', 'power', 'free', 'map', 'recipes', 'library', 'calculator', 'projects', 'reports', 'ceo'
]);

const ALLOWED_ERROR_TYPES = new Set([
  'auth_login_fail', 'auth_session_expired', 'auth_server_error', 'frontend_error', 'api_error'
]);

function getUtcDateKey(offsetDays = 0, baseMs = Date.now()) {
  const dt = new Date(baseMs - offsetDays * 24 * 60 * 60 * 1000);
  return dt.toISOString().slice(0, 10);
}

const PT_LANG_COUNTRIES = new Set(['BR', 'PT', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL', 'MO']);
const ES_LANG_COUNTRIES = new Set(['AR', 'ES', 'MX', 'CO', 'CL', 'PE', 'VE', 'EC', 'GT', 'CU', 'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'PR', 'GQ']);

function suggestLangFromCountry(country) {
  if (!country || country === 'LOCAL' || country === 'UNKNOWN') return null;
  if (PT_LANG_COUNTRIES.has(country)) return 'pt-BR';
  if (ES_LANG_COUNTRIES.has(country)) return 'es-ES';
  return 'en-US';
}

function getGeoFromReq(req) {
  const rawCountry = String(req.headers['x-vercel-ip-country'] || '').trim().toUpperCase();
  const rawRegion = String(req.headers['x-vercel-ip-country-region'] || '').trim().toUpperCase();
  const isLocal = !rawCountry && /^(127\.|::1|localhost)/i.test(String(req.headers.host || ''));
  const country = /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : (isLocal ? 'LOCAL' : 'UNKNOWN');
  const region = /^[A-Z0-9]{1,6}$/.test(rawRegion) ? rawRegion : '';
  return { country, region };
}

function hashVisitor(ip, ua, salt) {
  return crypto.createHash('sha256').update(`${ip}|${ua}|${salt}`).digest('hex').slice(0, 16);
}

function parseUserAgentInfo(uaRaw, clientDevice) {
  const ua = String(uaRaw || '');
  const isTablet = /ipad|tablet|(android(?!.*mobile))/i.test(ua);
  const isMobile = /mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua);
  let device = 'desktop';
  if (clientDevice === 'tablet' || isTablet) device = 'tablet';
  else if (clientDevice === 'mobile' || isMobile) device = 'mobile';

  let browser = 'Outros';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari';

  let os = 'Outros';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/mac os x|macintosh/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  return { device, browser, os };
}

function normalizeScreenBucket(w) {
  const width = Number(w) || 0;
  if (width <= 0) return '';
  if (width < 768) return '< 768px';
  if (width < 1280) return '768–1279px';
  if (width < 1440) return '1280–1439px';
  if (width < 1920) return '1440–1919px';
  return '1920px+';
}

function classifyTrafficSource(referrerRaw, utmRaw) {
  const utm = String(utmRaw || '').trim().toLowerCase();
  const ref = String(referrerRaw || '').trim().toLowerCase();
  const hay = `${utm} ${ref}`;
  if (!utm && !ref) return 'Acesso direto';
  if (hay.includes('instagram') || hay.includes('ig.me') || utm === 'ig') return 'Instagram';
  if (hay.includes('discord')) return 'Discord';
  if (hay.includes('youtube') || hay.includes('youtu.be')) return 'YouTube';
  if (hay.includes('twitch')) return 'Twitch';
  if (hay.includes('google')) return 'Google';
  return 'Outros';
}

function sanitizeErrorMessage(msg) {
  return String(msg || 'Erro não especificado')
    .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '[email]')
    .replace(/(password|senha|token|secret|authorization|cookie|hash|answer|resposta)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [redacted]')
    .slice(0, 140);
}

function createEmptyDayDoc(dateKey) {
  return {
    date: dateKey,
    visits: 0,
    newVisits: 0,
    returningVisits: 0,
    uniqueIds: [],
    countries: {},
    brStates: {},
    modes: {},
    devices: { desktop: 0, mobile: 0, tablet: 0 },
    browsers: {},
    oses: {},
    screens: {},
    sources: {},
    themes: { dark: 0, light: 0 },
    langs: {},
    linesGenerated: 0,
    projectsSaved: 0,
    calcUses: {},
    itemsGenerated: {},
    funnel: { lineIds: [], projectIds: [] },
    errors: {
      auth_login_fail: 0,
      auth_session_expired: 0,
      auth_server_error: 0,
      frontend_error: 0,
      api_error: 0
    }
  };
}

module.exports = async function handler(req, res) {
  applySecurityHeaders(req, res);
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const action = String(url.searchParams.get('action') || '').trim().toLowerCase();

  try {
    // -------------------------------------------------------------------------
    // 0. GET /api/analytics?action=geo (Detecção leve de idioma por país — LGPD)
    // -------------------------------------------------------------------------
    if (req.method === 'GET' && action === 'geo') {
      const { country } = getGeoFromReq(req);
      return sendJson(res, 200, {
        ok: true,
        country,
        suggestedLang: suggestLangFromCountry(country)
      });
    }

    // -------------------------------------------------------------------------
    // 1. POST /api/analytics?action=ping (Telemetria silenciosa em lote)
    // -------------------------------------------------------------------------
    if (req.method === 'POST' && (action === 'ping' || action === 'batch')) {
      if (!verifyCsrf(req)) return sendJson(res, 403, { error: 'CSRF inválido.' });

      await ensureAnalyticsEpoch();
      const now = Date.now();
      const dayKey = getUtcDateKey(0, now);
      const ip = getClientIp(req);
      const ipRlKey = hashVisitor(ip, 'rl', dayKey);
      const rl = await checkRateLimit(`rl_ping_${ipRlKey}`, 240, 10 * 60 * 1000);
      if (rl.blocked) return sendJson(res, 429, { ok: false });
      await recordRateLimitHit(`rl_ping_${ipRlKey}`, 10 * 60 * 1000);

      const body = await readRequestBody(req, 32 * 1024);
      const rawEvents = Array.isArray(body.events) ? body.events.slice(0, 30) : [body];
      if (rawEvents.length === 0) return sendJson(res, 200, { ok: true });

      const uaRaw = String(req.headers['user-agent'] || '').slice(0, 240);
      const { country, region } = getGeoFromReq(req);

      let auth = null;
      try {
        auth = await getAuthenticatedUser(req, res, false);
      } catch {}

      const firstEv = rawEvents[0] || {};
      const vidRaw = String(firstEv.vid || body.vid || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
      const sidRaw = String(firstEv.sid || body.sid || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
      const visitorId = vidRaw || sidRaw || hashVisitor(ip, uaRaw, dayKey);
      const sessionId = sidRaw || visitorId;
      const latestModeRaw = String(rawEvents[rawEvents.length - 1]?.mode || firstEv.mode || 'production').slice(0, 24);
      const latestMode = ALLOWED_MODES.has(latestModeRaw) ? latestModeRaw : 'production';
      const uaInfo = parseUserAgentInfo(uaRaw, firstEv.device);

      // 1a) Atualiza presença online (janela de 5 minutos, sem cache de leitura)
      const onlinePath = 'db/analytics/online.json';
      const onlineMap = (await readJsonBlob(onlinePath, false)) || {};
      const cutoff = now - 5 * 60 * 1000;
      const pruned = {};
      for (const [k, v] of Object.entries(onlineMap)) {
        if (v && Number(v.ts) >= cutoff) pruned[k] = v;
      }
      const onlineKey = auth?.user?.usernameLower ? `u:${auth.user.usernameLower}` : `v:${visitorId}`;
      // Remove entradas legadas duplicadas do mesmo usuário/visitante
      for (const [k, v] of Object.entries(pruned)) {
        if (!v) continue;
        if (auth?.user?.username && v.username === auth.user.username) delete pruned[k];
        else if (!auth?.user?.username && v.vid && v.vid === visitorId) delete pruned[k];
      }
      pruned[onlineKey] = {
        ts: now,
        vid: visitorId,
        country,
        region,
        mode: latestMode,
        device: uaInfo.device,
        username: auth?.user?.username || null,
        role: auth?.user?.role || 'guest'
      };
      await writeJsonBlob(onlinePath, pruned);

      // 1b) Processa eventos no documento diário (sem cache de leitura)
      const dayEvents = rawEvents.filter((ev) => ev && ev.event && ev.event !== 'heartbeat');
      if (dayEvents.length > 0) {
        const dayPath = `db/analytics/days/${dayKey}.json`;
        const existing = await readJsonBlob(dayPath, false);
        const dayDoc = existing ? { ...createEmptyDayDoc(dayKey), ...existing } : createEmptyDayDoc(dayKey);
        if (!Array.isArray(dayDoc.uniqueIds)) dayDoc.uniqueIds = [];
        if (!dayDoc.funnel || typeof dayDoc.funnel !== 'object') dayDoc.funnel = { lineIds: [], projectIds: [] };
        if (!Array.isArray(dayDoc.funnel.lineIds)) dayDoc.funnel.lineIds = [];
        if (!Array.isArray(dayDoc.funnel.projectIds)) dayDoc.funnel.projectIds = [];
        if (!dayDoc.errors || typeof dayDoc.errors !== 'object') dayDoc.errors = createEmptyDayDoc(dayKey).errors;

        const newErrorEntries = [];

        for (const ev of dayEvents) {
          const eventType = String(ev.event || '').slice(0, 32);
          const modeRaw = String(ev.mode || 'production').slice(0, 24);
          const mode = ALLOWED_MODES.has(modeRaw) ? modeRaw : 'production';
          const theme = (ev.theme === 'light' || ev.theme === 'dark') ? ev.theme : 'dark';
          const lang = ['pt-BR', 'en-US', 'es-ES'].includes(ev.lang) ? ev.lang : 'pt-BR';

          if (eventType === 'visit') {
            // Conta no máximo 1 visita por pessoa (visitorId) por dia
            const alreadyVisitedToday = dayDoc.uniqueIds.includes(visitorId);
            if (!alreadyVisitedToday) {
              if (dayDoc.uniqueIds.length < 10000) {
                dayDoc.uniqueIds.push(visitorId);
              }
              dayDoc.visits = dayDoc.uniqueIds.length;

              // Classifica como visita nova (primeira vez no site) ou recorrente (já visitou em outro dia)
              try {
                const knownPath = 'db/analytics/known_visitors.json';
                const knownMap = (await readJsonBlob(knownPath, false)) || {};
                const firstDay = knownMap[visitorId];
                if (!firstDay) {
                  knownMap[visitorId] = dayKey;
                  dayDoc.newVisits = (Number(dayDoc.newVisits) || 0) + 1;
                  const keys = Object.keys(knownMap);
                  if (keys.length > 50000) {
                    keys.slice(0, keys.length - 45000).forEach((k) => delete knownMap[k]);
                  }
                  await writeJsonBlob(knownPath, knownMap).catch(() => {});
                } else if (firstDay < dayKey) {
                  dayDoc.returningVisits = (Number(dayDoc.returningVisits) || 0) + 1;
                } else {
                  dayDoc.newVisits = (Number(dayDoc.newVisits) || 0) + 1;
                }
              } catch {
                dayDoc.newVisits = (Number(dayDoc.newVisits) || 0) + 1;
              }

              dayDoc.countries[country] = (Number(dayDoc.countries[country]) || 0) + 1;
              if (country === 'BR' && region) {
                dayDoc.brStates[region] = (Number(dayDoc.brStates[region]) || 0) + 1;
              }
              dayDoc.devices[uaInfo.device] = (Number(dayDoc.devices[uaInfo.device]) || 0) + 1;
              dayDoc.browsers[uaInfo.browser] = (Number(dayDoc.browsers[uaInfo.browser]) || 0) + 1;
              dayDoc.oses[uaInfo.os] = (Number(dayDoc.oses[uaInfo.os]) || 0) + 1;
              const scr = normalizeScreenBucket(ev.screenW);
              if (scr) dayDoc.screens[scr] = (Number(dayDoc.screens[scr]) || 0) + 1;
              const src = classifyTrafficSource(ev.referrer, ev.utmSource);
              dayDoc.sources[src] = (Number(dayDoc.sources[src]) || 0) + 1;
              dayDoc.themes[theme] = (Number(dayDoc.themes[theme]) || 0) + 1;
              dayDoc.langs[lang] = (Number(dayDoc.langs[lang]) || 0) + 1;
              if (mode !== 'ceo') {
                dayDoc.modes[mode] = (Number(dayDoc.modes[mode]) || 0) + 1;
              }
            }
          } else if (eventType === 'mode_switch') {
            if (mode !== 'ceo') {
              dayDoc.modes[mode] = (Number(dayDoc.modes[mode]) || 0) + 1;
            }
          } else if (eventType === 'line_generated') {
            dayDoc.linesGenerated = (Number(dayDoc.linesGenerated) || 0) + 1;
            const itemLabel = String(ev.item || '').trim().slice(0, 64);
            if (itemLabel) {
              dayDoc.itemsGenerated[itemLabel] = (Number(dayDoc.itemsGenerated[itemLabel]) || 0) + 1;
            }
            if (!dayDoc.funnel.lineIds.includes(visitorId) && dayDoc.funnel.lineIds.length < 10000) {
              dayDoc.funnel.lineIds.push(visitorId);
            }
          } else if (eventType === 'project_saved') {
            dayDoc.projectsSaved = (Number(dayDoc.projectsSaved) || 0) + 1;
            if (!dayDoc.funnel.projectIds.includes(visitorId) && dayDoc.funnel.projectIds.length < 10000) {
              dayDoc.funnel.projectIds.push(visitorId);
            }
          } else if (eventType === 'calc_used') {
            const calcType = String(ev.calcType || 'numeric').trim().slice(0, 32);
            dayDoc.calcUses[calcType] = (Number(dayDoc.calcUses[calcType]) || 0) + 1;
          } else if (eventType === 'error') {
            const errType = ALLOWED_ERROR_TYPES.has(ev.errType) ? ev.errType : 'frontend_error';
            dayDoc.errors[errType] = (Number(dayDoc.errors[errType]) || 0) + 1;
            newErrorEntries.push({
              ts: new Date(now).toISOString(),
              type: errType,
              mode,
              msg: sanitizeErrorMessage(ev.msg)
            });
          }
        }

        await writeJsonBlob(dayPath, dayDoc);

        if (newErrorEntries.length > 0) {
          const errPath = 'db/analytics/errors.json';
          const existingErrs = (await readJsonBlob(errPath, false)) || [];
          const retentionCutoff = now - 90 * 24 * 60 * 60 * 1000;
          const merged = [...newErrorEntries, ...(Array.isArray(existingErrs) ? existingErrs : [])]
            .filter((e) => e && new Date(e.ts).getTime() >= retentionCutoff)
            .slice(0, 100);
          await writeJsonBlob(errPath, merged);
        }
      }

      // 1c) Atualiza último acesso/geo do usuário logado (no máximo 1x a cada 5 min)
      if (auth && auth.user && auth.user.usernameLower) {
        const lastTs = auth.user.lastSeenAt ? new Date(auth.user.lastSeenAt).getTime() : 0;
        if (now - lastTs > 5 * 60 * 1000 || !auth.user.lastCountry) {
          auth.user.lastSeenAt = new Date(now).toISOString();
          auth.user.lastCountry = country;
          auth.user.lastRegion = region;
          await writeJsonBlob(`db/users/${auth.user.usernameLower}.json`, auth.user).catch(() => {});
        }
      }

      return sendJson(res, 200, { ok: true });
    }

    // -------------------------------------------------------------------------
    // 1.5. POST /api/analytics?action=reset (Zerar todas as métricas — EXCLUSIVO CEO)
    // -------------------------------------------------------------------------
    if (req.method === 'POST' && action === 'reset') {
      if (!verifyCsrf(req)) return sendJson(res, 403, { error: 'CSRF inválido.' });
      const auth = await getAuthenticatedUser(req, res, false);
      if (!auth || !auth.user) {
        return sendJson(res, 401, { error: 'Autenticação necessária.' });
      }
      if (auth.user.role !== 'admin') {
        return sendJson(res, 403, { error: 'Acesso restrito exclusivamente ao CEO.' });
      }
      const meta = await performAnalyticsReset(auth.user.username || 'CEO', ANALYTICS_RESET_EPOCH);
      return sendJson(res, 200, { ok: true, resetAt: meta.resetAt });
    }

    // -------------------------------------------------------------------------
    // 2. GET /api/analytics?action=dashboard (EXCLUSIVO CEO — role === 'admin')
    // -------------------------------------------------------------------------
    if (req.method === 'GET' && action === 'dashboard') {
      const auth = await getAuthenticatedUser(req, res, false);
      if (!auth || !auth.user) {
        return sendJson(res, 401, { error: 'Autenticação necessária.' });
      }
      if (auth.user.role !== 'admin') {
        return sendJson(res, 403, { error: 'Acesso restrito exclusivamente ao CEO.' });
      }

      const meta = await ensureAnalyticsEpoch();
      const resetAt = meta?.resetAt || ANALYTICS_RESET_EPOCH;
      const resetTs = new Date(resetAt).getTime() || 0;

      const periodRaw = String(url.searchParams.get('period') || '24h').toLowerCase();
      const period = ['24h', '7d', '30d', 'all'].includes(periodRaw) ? periodRaw : '24h';

      const now = Date.now();
      const ms24h = 24 * 60 * 60 * 1000;
      const ms7d = 7 * ms24h;
      const ms30d = 30 * ms24h;
      const todayKey = getUtcDateKey(0, now);

      const buildKeySet = (days, offset = 0) => {
        const s = new Set();
        for (let i = 0; i < days; i++) s.add(getUtcDateKey(i + offset, now));
        return s;
      };
      const keysToday = new Set([todayKey]);
      const keys7d = buildKeySet(7, 0);
      const keys30d = buildKeySet(30, 0);

      const periodDays = period === '24h' ? 1 : (period === '7d' ? 7 : (period === '30d' ? 30 : 0));
      const currKeys = periodDays > 0 ? buildKeySet(periodDays, 0) : null;
      const prevKeys = periodDays > 0 ? buildKeySet(periodDays, periodDays) : null;

      // Online agora (leitura fresca, sem cache)
      const onlineMap = (await readJsonBlob('db/analytics/online.json', false)) || {};
      const cutoff = now - 5 * 60 * 1000;
      const dedupOnline = new Map();
      for (const [id, v] of Object.entries(onlineMap)) {
        if (!v || Number(v.ts) < cutoff) continue;
        const dk = v.username ? `u:${String(v.username).toLowerCase()}` : (v.vid ? `v:${v.vid}` : id);
        const prev = dedupOnline.get(dk);
        if (!prev || Number(v.ts) > Number(prev[1].ts)) {
          dedupOnline.set(dk, [id, v]);
        }
      }
      const onlineList = Array.from(dedupOnline.values())
        .map(([id, v]) => ({
          id: id.slice(0, 8),
          username: v.username || null,
          role: v.role || 'guest',
          country: v.country || 'UNKNOWN',
          countryName: COUNTRY_NAMES[v.country] || v.country || 'Desconhecido',
          region: v.region || '',
          regionName: (v.country === 'BR' && BR_STATE_NAMES[v.region]) ? BR_STATE_NAMES[v.region] : (v.region || ''),
          mode: v.mode || 'production',
          device: v.device || 'desktop',
          lastSeenSecAgo: Math.max(0, Math.round((now - Number(v.ts)) / 1000))
        }))
        .sort((a, b) => a.lastSeenSecAgo - b.lastSeenSecAgo);

      // Projetos por usuário + compartilhados
      const projectBlobs = await listJsonBlobs('db/projects/').catch(() => []);
      const projectsByUserId = {};
      let totalProjects = 0;
      for (const b of projectBlobs) {
        if (!b.pathname.endsWith('.json')) continue;
        totalProjects++;
        const parts = b.pathname.split('/');
        if (parts.length >= 3) {
          const uid = parts[2];
          projectsByUserId[uid] = (projectsByUserId[uid] || 0) + 1;
        }
      }
      const sharedBlobs = await listJsonBlobs('db/shared_projects/').catch(() => []);
      const sharedProjects = sharedBlobs.filter((b) => b.pathname.endsWith('.json')).length;

      // Reports (total, hoje, pendentes, resolvidos, remetentes únicos, ranking e tempo médio até resposta)
      const reportBlobs = await listJsonBlobs('db/reports/').catch(() => []);
      let totalReports = 0;
      let reportsToday = 0;
      let openReports = 0;
      let resolvedReports = 0;
      let respTimeSumMs = 0;
      let respTimeCount = 0;
      const reportersCount = {};
      for (const b of reportBlobs) {
        if (!b.pathname.endsWith('.json')) continue;
        totalReports++;
        try {
          const rep = await fetchJsonFromBlobUrl(b.url);
          if (!rep) continue;
          const st = String(rep.status || 'novo').toLowerCase();
          if (st === 'resolvido' || st === 'feito') {
            resolvedReports++;
          } else if (st !== 'arquivado') {
            openReports++;
          }
          const createdMs = rep.createdAt ? new Date(rep.createdAt).getTime() : 0;
          if (createdMs && new Date(createdMs).toISOString().slice(0, 10) === todayKey) {
            reportsToday++;
          }
          const authorName = String(rep.username || rep.userId || 'Anônimo').trim();
          if (authorName) {
            reportersCount[authorName] = (reportersCount[authorName] || 0) + 1;
          }
          const respIso = rep.adminReply?.createdAt || rep.resolvedAt || rep.statusUpdatedAt || null;
          const respMs = respIso ? new Date(respIso).getTime() : 0;
          if (createdMs && respMs && respMs > createdMs) {
            respTimeSumMs += (respMs - createdMs);
            respTimeCount++;
          }
        } catch {}
      }
      const uniqueReporters = Object.keys(reportersCount).length;
      const avgReportResponseMinutes = respTimeCount > 0 ? Math.round(respTimeSumMs / respTimeCount / 60000) : null;

      // Usuários cadastrados (SEMPRE sanitizados — nunca expor hashes!)
      const userBlobs = await listJsonBlobs('db/users/').catch(() => []);
      const users = [];
      let newUsers24h = 0;
      let newUsers7d = 0;
      let newUsers30d = 0;
      let newUsersPeriod = 0;
      let newUsersPrevPeriod = 0;
      let activeUsers7d = 0;
      const newUsersByDay = {};

      const periodMs = periodDays * ms24h;

      for (const b of userBlobs) {
        if (!b.pathname.endsWith('.json')) continue;
        try {
          const u = await fetchJsonFromBlobUrl(b.url);
          if (!u || !u.username) continue;
          const createdTs = u.createdAt ? new Date(u.createdAt).getTime() : 0;
          const lastSeenTs = u.lastSeenAt ? new Date(u.lastSeenAt).getTime() : (u.lastLoginAt ? new Date(u.lastLoginAt).getTime() : createdTs);
          const createdAfterReset = createdTs >= resetTs;
          const seenAfterReset = lastSeenTs >= resetTs;
          if (createdAfterReset && now - createdTs <= ms24h) newUsers24h++;
          if (createdAfterReset && now - createdTs <= ms7d) newUsers7d++;
          if (createdAfterReset && now - createdTs <= ms30d) newUsers30d++;
          if (seenAfterReset && now - lastSeenTs <= ms7d) activeUsers7d++;

          if (createdAfterReset) {
            if (period === 'all') {
              newUsersPeriod++;
            } else if (createdTs) {
              const age = now - createdTs;
              if (age <= periodMs) newUsersPeriod++;
              else if (age <= periodMs * 2) newUsersPrevPeriod++;
            }

            if (createdTs) {
              const dk = new Date(createdTs).toISOString().slice(0, 10);
              newUsersByDay[dk] = (newUsersByDay[dk] || 0) + 1;
            }
          }

          const cCode = u.lastCountry || '';
          const rCode = u.lastRegion || '';
          users.push({
            id: u.id,
            username: u.username,
            role: u.role === 'admin' ? 'ceo' : 'user',
            createdAt: u.createdAt || null,
            lastSeenAt: u.lastSeenAt || u.lastLoginAt || u.createdAt || null,
            country: cCode,
            countryName: COUNTRY_NAMES[cCode] || u.profile?.country || cCode || '—',
            region: rCode,
            regionName: (cCode === 'BR' && BR_STATE_NAMES[rCode]) ? BR_STATE_NAMES[rCode] : rCode,
            projectsCount: projectsByUserId[u.id] || 0,
            hasSecurityRecovery: Boolean(u.securityAnswerHash && u.securityQuestion),
            lang: u.preferences?.lang || 'pt-BR',
            theme: u.preferences?.theme || 'dark'
          });
        } catch {}
      }
      users.sort((a, b) => new Date(b.lastSeenAt || 0).getTime() - new Date(a.lastSeenAt || 0).getTime());

      // Analytics diários
      const dayBlobs = await listJsonBlobs('db/analytics/days/').catch(() => []);
      const dayDocsMap = {};
      let visitsToday = 0;
      let visits7d = 0;
      let visits30d = 0;
      let visitsTotal = 0;
      let visitsPeriod = 0;
      let visitsPrevPeriod = 0;
      let newVisitsPeriod = 0;
      let returningVisitsPeriod = 0;
      let newVisitsToday = 0;
      let returningVisitsToday = 0;

      const uniqueTodaySet = new Set();
      const unique7dSet = new Set();
      const unique30dSet = new Set();
      const uniquePeriodSet = new Set();
      const uniquePrevPeriodSet = new Set();

      const countryTotals = {};
      const brStateTotals = {};
      const modeTotals = {};
      const deviceTotals = { desktop: 0, mobile: 0, tablet: 0 };
      const browserTotals = {};
      const osTotals = {};
      const screenTotals = {};
      const sourceTotals = {};
      const themeTotals = { dark: 0, light: 0 };
      const langTotals = {};
      const calcUsesTotals = {};
      const itemsGeneratedTotals = {};
      const errorTotals = {
        auth_login_fail: 0,
        auth_session_expired: 0,
        auth_server_error: 0,
        frontend_error: 0,
        api_error: 0
      };
      let linesGeneratedPeriod = 0;
      let projectsSavedPeriod = 0;
      const funnelLineSet = new Set();
      const funnelProjectSet = new Set();

      const addMap = (target, src) => {
        Object.entries(src || {}).forEach(([k, n]) => {
          target[k] = (target[k] || 0) + (Number(n) || 0);
        });
      };

      for (const b of dayBlobs) {
        if (!b.pathname.endsWith('.json')) continue;
        try {
          const isRecent = b.pathname.endsWith(`${todayKey}.json`);
          const d = isRecent ? await readJsonBlob(b.pathname, false) : await fetchJsonFromBlobUrl(b.url);
          if (!d || !d.date) continue;
          dayDocsMap[d.date] = d;
          const uLen = Math.max(Array.isArray(d.uniqueIds) ? d.uniqueIds.length : 0, Number(d.uniqueCount) || 0);
          const v = uLen > 0 ? uLen : (Number(d.visits) || 0);
          const nv = Number(d.newVisits) || 0;
          const rv = Number(d.returningVisits) || 0;
          const effNew = (nv === 0 && rv === 0 && v > 0) ? v : nv;
          const effRet = rv;
          visitsTotal += v;

          if (keysToday.has(d.date)) {
            visitsToday += v;
            newVisitsToday += effNew;
            returningVisitsToday += effRet;
            (d.uniqueIds || []).forEach((id) => uniqueTodaySet.add(id));
          }
          if (keys7d.has(d.date)) {
            visits7d += v;
            (d.uniqueIds || []).forEach((id) => unique7dSet.add(id));
          }
          if (keys30d.has(d.date)) {
            visits30d += v;
            (d.uniqueIds || []).forEach((id) => unique30dSet.add(id));
          }

          if (prevKeys && prevKeys.has(d.date)) {
            visitsPrevPeriod += v;
            (d.uniqueIds || []).forEach((id) => uniquePrevPeriodSet.add(id));
          }

          const inPeriod = !currKeys || currKeys.has(d.date);
          if (inPeriod) {
            visitsPeriod += v;
            newVisitsPeriod += effNew;
            returningVisitsPeriod += effRet;
            (d.uniqueIds || []).forEach((id) => uniquePeriodSet.add(id));
            addMap(countryTotals, d.countries);
            addMap(brStateTotals, d.brStates);
            addMap(modeTotals, d.modes);
            deviceTotals.desktop += Number(d.devices?.desktop) || 0;
            deviceTotals.mobile += Number(d.devices?.mobile) || 0;
            deviceTotals.tablet += Number(d.devices?.tablet) || 0;
            addMap(browserTotals, d.browsers);
            addMap(osTotals, d.oses);
            addMap(screenTotals, d.screens);
            addMap(sourceTotals, d.sources);
            themeTotals.dark += Number(d.themes?.dark) || 0;
            themeTotals.light += Number(d.themes?.light) || 0;
            addMap(langTotals, d.langs);
            addMap(calcUsesTotals, d.calcUses);
            addMap(itemsGeneratedTotals, d.itemsGenerated);
            linesGeneratedPeriod += Number(d.linesGenerated) || 0;
            projectsSavedPeriod += Number(d.projectsSaved) || 0;
            (d.funnel?.lineIds || []).forEach((id) => funnelLineSet.add(id));
            (d.funnel?.projectIds || []).forEach((id) => funnelProjectSet.add(id));
            Object.keys(errorTotals).forEach((ek) => {
              errorTotals[ek] += Number(d.errors?.[ek]) || 0;
            });
          }
        } catch {}
      }

      // Série dos últimos 14 dias
      const dailySeries = [];
      for (let i = 13; i >= 0; i--) {
        const dk = getUtcDateKey(i, now);
        const dDoc = dayDocsMap[dk];
        dailySeries.push({
          date: dk,
          label: `${dk.slice(8, 10)}/${dk.slice(5, 7)}`,
          visits: Math.max(Array.isArray(dDoc?.uniqueIds) ? dDoc.uniqueIds.length : 0, Number(dDoc?.uniqueCount) || 0) || (Number(dDoc?.visits) || 0),
          unique: Math.max(Array.isArray(dDoc?.uniqueIds) ? dDoc.uniqueIds.length : 0, Number(dDoc?.uniqueCount) || 0),
          newUsers: newUsersByDay[dk] || 0
        });
      }

      const recentErrorsRaw = (await readJsonBlob('db/analytics/errors.json', false)) || [];
      const recentErrors = Array.isArray(recentErrorsRaw) ? recentErrorsRaw.slice(0, 20) : [];

      const rankEntries = (obj, nameMap = null) => Object.entries(obj)
        .filter(([, count]) => count > 0)
        .map(([code, count]) => ({
          code,
          name: (nameMap && nameMap[code]) ? nameMap[code] : code,
          count
        }))
        .sort((a, b) => b.count - a.count);

      const calcUsesTotalPeriod = Object.values(calcUsesTotals).reduce((a, b) => a + (Number(b) || 0), 0);

      return sendJson(res, 200, {
        ok: true,
        period,
        resetAt,
        generatedAt: new Date(now).toISOString(),
        kpis: {
          onlineNow: onlineList.length,
          totalUsers: users.length,
          newUsers24h,
          newUsers7d,
          newUsers30d,
          newUsersPeriod,
          newUsersDelta: period === 'all' ? null : (newUsersPeriod - newUsersPrevPeriod),
          activeUsers7d,
          engagementRate7d: users.length > 0 ? Math.min(100, Math.round((activeUsers7d / users.length) * 100)) : 0,
          visitsToday,
          visits7d,
          visits30d,
          visitsTotal,
          visitsPeriod,
          newVisitsPeriod,
          returningVisitsPeriod,
          newVisitsToday,
          returningVisitsToday,
          visitsDelta: period === 'all' ? null : (visitsPeriod - visitsPrevPeriod),
          uniqueToday: uniqueTodaySet.size,
          unique7d: unique7dSet.size,
          unique30d: unique30dSet.size,
          uniquePeriod: uniquePeriodSet.size,
          uniqueDelta: period === 'all' ? null : (uniquePeriodSet.size - uniquePrevPeriodSet.size),
          totalProjects,
          sharedProjects,
          avgProjectsPerUser: users.length > 0 ? Number((totalProjects / users.length).toFixed(2)) : 0,
          openReports,
          resolvedReports,
          totalReports,
          reportsToday,
          uniqueReporters,
          avgReportResponseMinutes,
          linesGeneratedPeriod,
          projectsSavedPeriod,
          calcUsesTotalPeriod
        },
        dailySeries,
        countries: rankEntries(countryTotals, COUNTRY_NAMES),
        brStates: rankEntries(brStateTotals, BR_STATE_NAMES),
        modes: rankEntries(modeTotals),
        devices: deviceTotals,
        browsers: rankEntries(browserTotals),
        oses: rankEntries(osTotals),
        screens: rankEntries(screenTotals),
        sources: rankEntries(sourceTotals),
        themes: themeTotals,
        langs: rankEntries(langTotals),
        calcUses: rankEntries(calcUsesTotals),
        itemsGenerated: rankEntries(itemsGeneratedTotals).slice(0, 10),
        funnel: {
          visited: uniquePeriodSet.size,
          registered: newUsersPeriod,
          generatedLine: funnelLineSet.size,
          savedProject: funnelProjectSet.size
        },
        errorSummary: errorTotals,
        recentErrors,
        topReporters: rankEntries(reportersCount).slice(0, 10),
        onlineList,
        users
      });
    }

    return sendJson(res, 404, { error: 'Ação de analytics não encontrada.' });
  } catch (err) {
    if (err instanceof StorageUnavailableError || err?.name === 'StorageUnavailableError') {
      return sendJson(res, 503, { error: 'Armazenamento temporariamente indisponível.' });
    }
    console.error('[api/analytics] error:', err?.message || err);
    return sendJson(res, 500, { error: 'Erro interno ao processar analytics.' });
  }
};
