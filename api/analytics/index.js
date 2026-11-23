const crypto = require('crypto');
const {
  readJsonBlob,
  writeJsonBlob,
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

function getTodayKey(dateObj = new Date()) {
  return dateObj.toISOString().slice(0, 10);
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

module.exports = async function handler(req, res) {
  applySecurityHeaders(req, res);
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const action = String(url.searchParams.get('action') || '').trim().toLowerCase();

  try {
    // -------------------------------------------------------------------------
    // 1. POST /api/analytics?action=ping (Telemetria silenciosa — zero impacto UX)
    // -------------------------------------------------------------------------
    if (req.method === 'POST' && action === 'ping') {
      if (!verifyCsrf(req)) return sendJson(res, 403, { error: 'CSRF inválido.' });

      const ip = getClientIp(req);
      const rl = await checkRateLimit(`rl_ping_${ip}`, 120, 10 * 60 * 1000);
      if (!rl.allowed) return sendJson(res, 429, { ok: false });
      await recordRateLimitHit(`rl_ping_${ip}`, 10 * 60 * 1000);

      const body = await readRequestBody(req, 8 * 1024);
      const eventType = String(body.event || 'heartbeat').slice(0, 24);
      const modeRaw = String(body.mode || 'production').slice(0, 24);
      const mode = ALLOWED_MODES.has(modeRaw) ? modeRaw : 'production';
      const theme = (body.theme === 'light' || body.theme === 'dark') ? body.theme : 'dark';
      const lang = ['pt-BR', 'en-US', 'es-ES'].includes(body.lang) ? body.lang : 'pt-BR';
      const device = body.device === 'mobile' ? 'mobile' : 'desktop';
      const sessionId = String(body.sid || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);

      const ua = String(req.headers['user-agent'] || '').slice(0, 120);
      const { country, region } = getGeoFromReq(req);
      const dayKey = getTodayKey();
      const visitorId = sessionId || hashVisitor(ip, ua, dayKey);
      const now = Date.now();

      // Verifica se usuário está logado (silencioso, sem exigir login)
      let auth = null;
      try {
        auth = await getAuthenticatedUser(req, res, false);
      } catch {}

      // 1a) Atualiza presença online (janela de 5 minutos)
      const onlinePath = 'db/analytics/online.json';
      const onlineMap = (await readJsonBlob(onlinePath, true)) || {};
      const cutoff = now - 5 * 60 * 1000;
      const pruned = {};
      for (const [k, v] of Object.entries(onlineMap)) {
        if (v && Number(v.ts) >= cutoff) pruned[k] = v;
      }
      pruned[visitorId] = {
        ts: now,
        country,
        region,
        mode,
        device,
        username: auth?.user?.username || null,
        role: auth?.user?.role || 'guest'
      };
      await writeJsonBlob(onlinePath, pruned);

      // 1b) Atualiza métricas agregadas do dia em visitas e trocas de aba
      if (eventType === 'visit' || eventType === 'mode_switch') {
        const dayPath = `db/analytics/days/${dayKey}.json`;
        const dayDoc = (await readJsonBlob(dayPath, true)) || {
          date: dayKey,
          visits: 0,
          uniqueIds: [],
          countries: {},
          brStates: {},
          modes: {},
          devices: { desktop: 0, mobile: 0 },
          themes: { dark: 0, light: 0 },
          langs: {}
        };

        if (eventType === 'visit') {
          dayDoc.visits = (Number(dayDoc.visits) || 0) + 1;
          if (!Array.isArray(dayDoc.uniqueIds)) dayDoc.uniqueIds = [];
          if (!dayDoc.uniqueIds.includes(visitorId) && dayDoc.uniqueIds.length < 5000) {
            dayDoc.uniqueIds.push(visitorId);
          }
          dayDoc.countries[country] = (Number(dayDoc.countries[country]) || 0) + 1;
          if (country === 'BR' && region) {
            dayDoc.brStates[region] = (Number(dayDoc.brStates[region]) || 0) + 1;
          }
          dayDoc.devices[device] = (Number(dayDoc.devices[device]) || 0) + 1;
          dayDoc.themes[theme] = (Number(dayDoc.themes[theme]) || 0) + 1;
          dayDoc.langs[lang] = (Number(dayDoc.langs[lang]) || 0) + 1;
        }
        dayDoc.modes[mode] = (Number(dayDoc.modes[mode]) || 0) + 1;

        await writeJsonBlob(dayPath, dayDoc);
      }

      // 1c) Atualiza último acesso/geo do usuário logado (no máximo 1x a cada 10 min)
      if (auth && auth.user && auth.user.usernameLower) {
        const lastTs = auth.user.lastSeenAt ? new Date(auth.user.lastSeenAt).getTime() : 0;
        if (now - lastTs > 10 * 60 * 1000 || !auth.user.lastCountry) {
          auth.user.lastSeenAt = new Date(now).toISOString();
          auth.user.lastCountry = country;
          auth.user.lastRegion = region;
          await writeJsonBlob(`db/users/${auth.user.usernameLower}.json`, auth.user).catch(() => {});
        }
      }

      return sendJson(res, 200, { ok: true });
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

      const now = Date.now();
      const ms24h = 24 * 60 * 60 * 1000;
      const ms7d = 7 * ms24h;
      const ms30d = 30 * ms24h;
      const todayKey = getTodayKey();

      // Online agora
      const onlineMap = (await readJsonBlob('db/analytics/online.json', true)) || {};
      const cutoff = now - 5 * 60 * 1000;
      const onlineList = Object.entries(onlineMap)
        .filter(([, v]) => v && Number(v.ts) >= cutoff)
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

      // Reports
      const reportBlobs = await listJsonBlobs('db/reports/').catch(() => []);
      let totalReports = 0;
      let openReports = 0;
      for (const b of reportBlobs) {
        if (!b.pathname.endsWith('.json')) continue;
        totalReports++;
        try {
          const rep = await fetchJsonFromBlobUrl(b.url);
          if (rep && rep.status !== 'resolvido' && rep.status !== 'arquivado') openReports++;
        } catch {}
      }

      // Usuários cadastrados (SEMPRE sanitizados — nunca expor hashes!)
      const userBlobs = await listJsonBlobs('db/users/').catch(() => []);
      const users = [];
      let newUsers24h = 0;
      let newUsers7d = 0;
      let newUsers30d = 0;
      let activeUsers7d = 0;
      const newUsersByDay = {};

      for (const b of userBlobs) {
        if (!b.pathname.endsWith('.json')) continue;
        try {
          const u = await fetchJsonFromBlobUrl(b.url);
          if (!u || !u.username) continue;
          const createdTs = u.createdAt ? new Date(u.createdAt).getTime() : 0;
          const lastSeenTs = u.lastSeenAt ? new Date(u.lastSeenAt).getTime() : (u.lastLoginAt ? new Date(u.lastLoginAt).getTime() : createdTs);
          if (createdTs && now - createdTs <= ms24h) newUsers24h++;
          if (createdTs && now - createdTs <= ms7d) newUsers7d++;
          if (createdTs && now - createdTs <= ms30d) newUsers30d++;
          if (lastSeenTs && now - lastSeenTs <= ms7d) activeUsers7d++;

          if (createdTs) {
            const dk = new Date(createdTs).toISOString().slice(0, 10);
            newUsersByDay[dk] = (newUsersByDay[dk] || 0) + 1;
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
      const uniqueTodaySet = new Set();
      const unique7dSet = new Set();
      const unique30dSet = new Set();

      const countryTotals = {};
      const brStateTotals = {};
      const modeTotals = {};
      const deviceTotals = { desktop: 0, mobile: 0 };
      const themeTotals = { dark: 0, light: 0 };
      const langTotals = {};

      for (const b of dayBlobs) {
        if (!b.pathname.endsWith('.json')) continue;
        try {
          const d = await fetchJsonFromBlobUrl(b.url);
          if (!d || !d.date) continue;
          dayDocsMap[d.date] = d;
          const v = Number(d.visits) || 0;
          visitsTotal += v;
          const dTs = new Date(`${d.date}T12:00:00Z`).getTime();
          const age = now - dTs;

          if (d.date === todayKey) {
            visitsToday += v;
            (d.uniqueIds || []).forEach((id) => uniqueTodaySet.add(id));
          }
          if (age <= ms7d + ms24h) {
            visits7d += v;
            (d.uniqueIds || []).forEach((id) => unique7dSet.add(id));
          }
          if (age <= ms30d + ms24h) {
            visits30d += v;
            (d.uniqueIds || []).forEach((id) => unique30dSet.add(id));
          }

          Object.entries(d.countries || {}).forEach(([k, n]) => {
            countryTotals[k] = (countryTotals[k] || 0) + (Number(n) || 0);
          });
          Object.entries(d.brStates || {}).forEach(([k, n]) => {
            brStateTotals[k] = (brStateTotals[k] || 0) + (Number(n) || 0);
          });
          Object.entries(d.modes || {}).forEach(([k, n]) => {
            modeTotals[k] = (modeTotals[k] || 0) + (Number(n) || 0);
          });
          deviceTotals.desktop += Number(d.devices?.desktop) || 0;
          deviceTotals.mobile += Number(d.devices?.mobile) || 0;
          themeTotals.dark += Number(d.themes?.dark) || 0;
          themeTotals.light += Number(d.themes?.light) || 0;
          Object.entries(d.langs || {}).forEach(([k, n]) => {
            langTotals[k] = (langTotals[k] || 0) + (Number(n) || 0);
          });
        } catch {}
      }

      // Série dos últimos 14 dias
      const dailySeries = [];
      for (let i = 13; i >= 0; i--) {
        const dt = new Date(now - i * ms24h);
        const dk = dt.toISOString().slice(0, 10);
        const dDoc = dayDocsMap[dk];
        dailySeries.push({
          date: dk,
          label: `${dk.slice(8, 10)}/${dk.slice(5, 7)}`,
          visits: Number(dDoc?.visits) || 0,
          unique: Array.isArray(dDoc?.uniqueIds) ? dDoc.uniqueIds.length : 0,
          newUsers: newUsersByDay[dk] || 0
        });
      }

      const rankEntries = (obj, nameMap = null) => Object.entries(obj)
        .filter(([, count]) => count > 0)
        .map(([code, count]) => ({
          code,
          name: (nameMap && nameMap[code]) ? nameMap[code] : code,
          count
        }))
        .sort((a, b) => b.count - a.count);

      return sendJson(res, 200, {
        ok: true,
        generatedAt: new Date(now).toISOString(),
        kpis: {
          onlineNow: onlineList.length,
          totalUsers: users.length,
          newUsers24h,
          newUsers7d,
          newUsers30d,
          activeUsers7d,
          engagementRate7d: users.length > 0 ? Math.round((activeUsers7d / users.length) * 100) : 0,
          visitsToday,
          visits7d,
          visits30d,
          visitsTotal,
          uniqueToday: uniqueTodaySet.size,
          unique7d: unique7dSet.size,
          unique30d: unique30dSet.size,
          totalProjects,
          sharedProjects,
          avgProjectsPerUser: users.length > 0 ? Number((totalProjects / users.length).toFixed(2)) : 0,
          openReports,
          totalReports
        },
        dailySeries,
        countries: rankEntries(countryTotals, COUNTRY_NAMES),
        brStates: rankEntries(brStateTotals, BR_STATE_NAMES),
        modes: rankEntries(modeTotals),
        devices: deviceTotals,
        themes: themeTotals,
        langs: rankEntries(langTotals),
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
