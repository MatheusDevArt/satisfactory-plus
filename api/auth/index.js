const crypto = require('crypto');
const { del } = require('@vercel/blob');
const {
  getToken,
  getBlobStoreId,
  getDirectBlobUrl,
  LOGIN_FAIL_LIMIT,
  LOGIN_FAIL_WINDOW_MS,
  REGISTER_IP_LIMIT,
  REGISTER_IP_WINDOW_MS,
  hashPassword,
  verifyPassword,
  writeJsonBlob,
  deleteBlobByPathname,
  listJsonBlobs,
  fetchJsonFromBlobUrl,
  clearSessionCookie,
  getClientIp,
  applySecurityHeaders,
  verifyCsrf,
  setSessionCookie,
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
  StorageUnavailableError
} = require('../_lib/store');

const DUMMY_PASSWORD_HASH = hashPassword('splus_dummy_timing_guard_password');

function extractReqGeo(req) {
  const rawCountry = String(req.headers['x-vercel-ip-country'] || '').trim().toUpperCase();
  const rawRegion = String(req.headers['x-vercel-ip-country-region'] || '').trim().toUpperCase();
  return {
    country: /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : '',
    region: /^[A-Z0-9]{1,6}$/.test(rawRegion) ? rawRegion : ''
  };
}

module.exports = async function handler(req, res) {
  applySecurityHeaders(req, res);
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const action = url.searchParams.get('action') || '';

  if (req.method !== 'GET' && !verifyCsrf(req)) {
    return sendJson(res, 403, { error: 'Requisição bloqueada por proteção CSRF.' });
  }

  try {
    // GET /api/auth?action=health (diagnóstico seguro sem segredos)
    if (req.method === 'GET' && action === 'health') {
      return sendJson(res, 200, {
        ok: true,
        hasBlobToken: Boolean(getToken()),
        hasStoreId: Boolean(getBlobStoreId()),
        hasSessionSecret: Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16)
      });
    }

    // GET /api/auth?action=me (não depende de ensureAdminSeeded nem de escrita no Blob!)
    if (req.method === 'GET' && action === 'me') {
      const auth = await getAuthenticatedUser(req, res, true, { allowStatelessFallback: true });
      if (!auth) return sendJson(res, 200, { authenticated: false, user: null });
      return sendJson(res, 200, {
        authenticated: true,
        user: sanitizeUser(auth.user),
        storageDegraded: Boolean(auth.storageDegraded)
      });
    }

    await ensureAdminSeeded();

    // POST /api/auth?action=register
    if (req.method === 'POST' && action === 'register') {
      const ip = getClientIp(req);
      const ipLimit = await checkRateLimit(`register_ip:${ip}`, REGISTER_IP_LIMIT, REGISTER_IP_WINDOW_MS);
      if (ipLimit.blocked) {
        const mins = Math.ceil(ipLimit.retryAfterMs / 60000);
        return sendJson(res, 429, { error: `Muitas contas criadas recentemente neste IP. Tente novamente em ${mins} minuto(s).` });
      }

      const body = await readRequestBody(req, 32 * 1024);
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      const confirmPassword = String(body.confirmPassword || '');
      const securityQuestion = String(body.securityQuestion || '').trim().slice(0, 140);
      const securityAnswerRaw = String(body.securityAnswer || '');
      const normAnswer = normalizeSecurityAnswer(securityAnswerRaw);

      const uErr = validateUsername(username);
      if (uErr) return sendJson(res, 400, { error: uErr });
      const pErr = validatePassword(password);
      if (pErr) return sendJson(res, 400, { error: pErr });
      if (password !== confirmPassword) {
        return sendJson(res, 400, { error: 'As senhas não conferem.' });
      }
      if ((securityQuestion && normAnswer.length < 2) || (!securityQuestion && normAnswer.length > 0)) {
        return sendJson(res, 400, { error: 'Para ativar a recuperação de conta, informe a pergunta e uma resposta com pelo menos 2 caracteres.' });
      }

      const lower = normalizeUsername(username);
      if (isReservedAdminUsernameLower(lower)) {
        return sendJson(res, 409, { error: 'Este nome de usuário é reservado e não está disponível.' });
      }

      const existing = await getUserByUsername(lower, false);
      if (existing) {
        return sendJson(res, 409, { error: 'Este nome de usuário já está em uso.' });
      }

      const regGeo = extractReqGeo(req);
      const nowIso = new Date().toISOString();
      const userObj = {
        id: `usr_${crypto.randomBytes(8).toString('hex')}`,
        username,
        usernameLower: lower,
        role: 'user',
        passwordHash: hashPassword(password),
        securityQuestion: (securityQuestion && normAnswer.length >= 2) ? securityQuestion : '',
        securityAnswerHash: (securityQuestion && normAnswer.length >= 2) ? hashPassword(normAnswer) : '',
        profile: { gender: 'prefer_not_to_say', age: null, country: regGeo.country || '' },
        lastCountry: regGeo.country || '',
        lastRegion: regGeo.region || '',
        lastSeenAt: nowIso,
        createdAt: nowIso
      };

      await writeJsonBlob(`db/users/${lower}.json`, userObj);
      await recordRateLimitHit(`register_ip:${ip}`, REGISTER_IP_WINDOW_MS);

      const token = await createSession(userObj);
      setSessionCookie(res, token);
      return sendJson(res, 201, { ok: true, user: sanitizeUser(userObj) });
    }

    // POST /api/auth?action=login
    if (req.method === 'POST' && action === 'login') {
      const body = await readRequestBody(req, 32 * 1024);
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      const lower = normalizeUsername(username);
      const ip = getClientIp(req);

      const failKey = `login_fail:${ip}:${lower || 'empty'}`;
      const rl = await checkRateLimit(failKey, LOGIN_FAIL_LIMIT, LOGIN_FAIL_WINDOW_MS);
      if (rl.blocked) {
        const mins = Math.ceil(rl.retryAfterMs / 60000);
        return sendJson(res, 429, { error: `Muitas tentativas de login falhas. Aguarde ${mins} minuto(s) e tente novamente.` });
      }

      if (!username || !password) {
        return sendJson(res, 400, { error: 'Informe o nome de usuário e a senha.' });
      }

      let user = null;
      let storageErr = null;
      try {
        user = await getUserByUsername(lower, false);
      } catch (err) {
        if (err instanceof StorageUnavailableError || err?.name === 'StorageUnavailableError') {
          storageErr = err;
        } else {
          throw err;
        }
      }

      // Fallback seguro para conta admin configurada em variáveis de ambiente caso o Blob esteja degradado
      if (!user && lower === getReservedAdminUsernameLower() && process.env.ADMIN_PASSWORD) {
        const expectedBuf = Buffer.from(String(process.env.ADMIN_PASSWORD), 'utf8');
        const actualBuf = Buffer.from(password, 'utf8');
        if (expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf)) {
          const adminName = String(process.env.ADMIN_USERNAME || 'Sungzeira_').trim();
          user = {
            id: `usr_admin_${lower}`,
            username: adminName,
            usernameLower: lower,
            role: 'admin',
            sessionVersion: 1,
            createdAt: new Date().toISOString()
          };
          await clearRateLimit(failKey);
          const token = await createSession(user);
          setSessionCookie(res, token);
          return sendJson(res, 200, { ok: true, user: sanitizeUser(user) });
        }
      }

      if (storageErr) throw storageErr;

      const valid = user
        ? verifyPassword(password, user.passwordHash)
        : (verifyPassword(password, DUMMY_PASSWORD_HASH) && false);

      if (!user || !valid) {
        await recordRateLimitHit(failKey, LOGIN_FAIL_WINDOW_MS);
        return sendJson(res, 401, { error: 'Usuário ou senha incorretos.' });
      }

      await clearRateLimit(failKey);
      // Atualiza último acesso e geolocalização silenciosamente para telemetria interna
      try {
        const loginGeo = extractReqGeo(req);
        user.lastSeenAt = new Date().toISOString();
        if (loginGeo.country) user.lastCountry = loginGeo.country;
        if (loginGeo.region) user.lastRegion = loginGeo.region;
        await writeJsonBlob(`db/users/${user.usernameLower}.json`, user);
      } catch {}
      const token = await createSession(user);
      setSessionCookie(res, token);
      return sendJson(res, 200, { ok: true, user: sanitizeUser(user) });
    }

    // POST /api/auth?action=logout
    if (req.method === 'POST' && action === 'logout') {
      await invalidateSession(req, res);
      return sendJson(res, 200, { ok: true });
    }

    // POST /api/auth?action=change-password
    if (req.method === 'POST' && action === 'change-password') {
      const auth = await getAuthenticatedUser(req, res, false, { useCache: false });
      if (!auth) return sendJson(res, 401, { error: 'Sua sessão expirou. Faça login novamente.' });

      const body = await readRequestBody(req, 32 * 1024);
      const currentPassword = String(body.currentPassword || '');
      const newPassword = String(body.newPassword || '');
      const confirmPassword = String(body.confirmPassword || '');

      const pwdRlKey = `pwd_check:${auth.user.id}`;
      const pwdRl = await checkRateLimit(pwdRlKey, 10, 10 * 60 * 1000);
      if (pwdRl.blocked) {
        const mins = Math.ceil(pwdRl.retryAfterMs / 60000);
        return sendJson(res, 429, { error: `Muitas tentativas inválidas. Aguarde ${mins} minuto(s).` });
      }
      if (!verifyPassword(currentPassword, auth.user.passwordHash)) {
        await recordRateLimitHit(pwdRlKey, 10 * 60 * 1000);
        return sendJson(res, 401, { error: 'Senha atual incorreta.' });
      }
      await clearRateLimit(pwdRlKey);
      const pErr = validatePassword(newPassword);
      if (pErr) return sendJson(res, 400, { error: pErr });
      if (newPassword !== confirmPassword) {
        return sendJson(res, 400, { error: 'A confirmação da nova senha não confere.' });
      }

      auth.user.passwordHash = hashPassword(newPassword);
      auth.user.passwordUpdatedAt = new Date().toISOString();
      auth.user.sessionVersion = (Number(auth.user.sessionVersion) || 1) + 1;
      await writeJsonBlob(`db/users/${auth.user.usernameLower}.json`, auth.user);
      const nextToken = await createSession(auth.user);
      setSessionCookie(res, nextToken);
      return sendJson(res, 200, { ok: true, message: 'Senha alterada com sucesso.' });
    }

    // POST /api/auth?action=preferences (Salvar tema e favoritos/recentes da Biblioteca na conta)
    if (req.method === 'POST' && action === 'preferences') {
      const auth = await getAuthenticatedUser(req, res, false, { useCache: false });
      if (!auth) return sendJson(res, 401, { error: 'Sua sessão expirou. Faça login novamente.' });

      const body = await readRequestBody(req, 32 * 1024);
      const current = (auth.user.preferences && typeof auth.user.preferences === 'object')
        ? { ...auth.user.preferences }
        : {};

      if (body.theme === 'light' || body.theme === 'dark' || body.theme === 'system') {
        current.theme = body.theme;
      }
      if (['pt-BR', 'en-US', 'es-ES'].includes(body.lang)) {
        current.lang = body.lang;
      }
      if (['LR', 'TB', 'RL', 'BT'].includes(body.flowDirection)) {
        current.flowDirection = body.flowDirection;
      }
      if (body.maxBeltTier !== undefined) {
        current.maxBeltTier = Math.max(1, Math.min(6, Number(body.maxBeltTier) || 6));
      }
      if (body.maxPipeTier !== undefined) {
        current.maxPipeTier = Math.max(1, Math.min(2, Number(body.maxPipeTier) || 2));
      }
      if (body.expandAllMachinesDefault !== undefined) {
        current.expandAllMachinesDefault = Boolean(body.expandAllMachinesDefault);
      }
      if (body.navRailCollapsed !== undefined) {
        current.navRailCollapsed = Boolean(body.navRailCollapsed);
      }
      if (body.showCanvasGrid !== undefined) {
        current.showCanvasGrid = Boolean(body.showCanvasGrid);
      }
      if (body.snapToGrid !== undefined) {
        current.snapToGrid = Boolean(body.snapToGrid);
      }
      if (body.reduceMotion !== undefined) {
        current.reduceMotion = Boolean(body.reduceMotion);
      }
      if (body.energyAutoUnit !== undefined) {
        current.energyAutoUnit = Boolean(body.energyAutoUnit);
      }
      if (body.autoPatchNotes !== undefined) {
        current.autoPatchNotes = Boolean(body.autoPatchNotes);
      }
      if (body.profile && typeof body.profile === 'object') {
        auth.user.profile = {
          gender: typeof body.profile.gender === 'string' ? body.profile.gender.slice(0, 40) : 'prefer_not_to_say',
          age: (body.profile.age !== null && body.profile.age !== undefined && body.profile.age !== '')
            ? Math.max(5, Math.min(120, Number(body.profile.age) || 0))
            : null,
          country: typeof body.profile.country === 'string' ? body.profile.country.slice(0, 60) : ''
        };
      }
      if (Array.isArray(body.libraryFavorites)) {
        current.libraryFavorites = [...new Set(
          body.libraryFavorites
            .filter((x) => typeof x === 'string' && x.length > 0 && x.length <= 120)
        )].slice(0, 250);
      }
      if (Array.isArray(body.libraryRecents)) {
        current.libraryRecents = [...new Set(
          body.libraryRecents
            .filter((x) => typeof x === 'string' && x.length > 0 && x.length <= 120)
        )].slice(0, 30);
      }
      if (Array.isArray(body.calcHistory)) {
        current.calcHistory = body.calcHistory
          .filter((x) => x && typeof x === 'object' && typeof x.summary === 'string')
          .slice(0, 20)
          .map((x) => {
            let safeState = {};
            if (x.state && typeof x.state === 'object' && !Array.isArray(x.state)) {
              try {
                if (Buffer.byteLength(JSON.stringify(x.state), 'utf8') <= 4096) {
                  safeState = x.state;
                }
              } catch {}
            }
            return {
              id: String(x.id || '').slice(0, 40),
              tool: String(x.tool || '').slice(0, 30),
              label: String(x.label || '').slice(0, 80),
              summary: String(x.summary || '').slice(0, 140),
              state: safeState,
              pinned: Boolean(x.pinned),
              at: String(x.at || '').slice(0, 40)
            };
          });
      }

      auth.user.preferences = current;
      await writeJsonBlob(`db/users/${auth.user.usernameLower}.json`, auth.user);
      return sendJson(res, 200, { ok: true, preferences: sanitizeUser(auth.user).preferences, profile: sanitizeUser(auth.user).profile });
    }

    // POST /api/auth?action=set-security-question (Criar ou alterar pergunta e resposta secreta)
    if (req.method === 'POST' && action === 'set-security-question') {
      const auth = await getAuthenticatedUser(req, res, false, { useCache: false });
      if (!auth) return sendJson(res, 401, { error: 'Sua sessão expirou. Faça login novamente.' });

      const body = await readRequestBody(req, 32 * 1024);
      const currentPassword = String(body.currentPassword || '');
      const securityQuestion = String(body.securityQuestion || '').trim().slice(0, 140);
      const normAnswer = normalizeSecurityAnswer(body.securityAnswer || '');

      const pwdRlKey = `pwd_check:${auth.user.id}`;
      const pwdRl = await checkRateLimit(pwdRlKey, 10, 10 * 60 * 1000);
      if (pwdRl.blocked) {
        const mins = Math.ceil(pwdRl.retryAfterMs / 60000);
        return sendJson(res, 429, { error: `Muitas tentativas inválidas. Aguarde ${mins} minuto(s).` });
      }
      if (!verifyPassword(currentPassword, auth.user.passwordHash)) {
        await recordRateLimitHit(pwdRlKey, 10 * 60 * 1000);
        return sendJson(res, 401, { error: 'Senha atual incorreta.' });
      }
      await clearRateLimit(pwdRlKey);
      if (!securityQuestion || securityQuestion.length < 5) {
        return sendJson(res, 400, { error: 'Escolha ou escreva uma pergunta de segurança válida.' });
      }
      if (normAnswer.length < 2) {
        return sendJson(res, 400, { error: 'A resposta deve ter pelo menos 2 caracteres.' });
      }

      auth.user.securityQuestion = securityQuestion;
      auth.user.securityAnswerHash = hashPassword(normAnswer);
      auth.user.securityUpdatedAt = new Date().toISOString();
      await writeJsonBlob(`db/users/${auth.user.usernameLower}.json`, auth.user);
      return sendJson(res, 200, {
        ok: true,
        message: 'Pergunta de segurança salva com sucesso.',
        user: sanitizeUser(auth.user)
      });
    }

    // POST /api/auth?action=recovery-question (Buscar pergunta de segurança pelo username com rate-limit)
    if (req.method === 'POST' && action === 'recovery-question') {
      const body = await readRequestBody(req, 16 * 1024);
      const username = String(body.username || '').trim();
      const lower = normalizeUsername(username);
      const ip = getClientIp(req);
      const rlKey = `recovery_attempt:${ip}:${lower || 'empty'}`;
      const rlUserKey = `recovery_user:${lower || 'empty'}`;
      const rl = await checkRateLimit(rlKey, 5, 60 * 60 * 1000); // 5 tentativas por hora por IP
      const rlUser = lower ? await checkRateLimit(rlUserKey, 8, 60 * 60 * 1000) : { blocked: false, retryAfterMs: 0 };
      if (rl.blocked || rlUser.blocked) {
        const retryMs = Math.max(rl.retryAfterMs || 0, rlUser.retryAfterMs || 0);
        const mins = Math.ceil(retryMs / 60000);
        return sendJson(res, 429, { error: `Limite de tentativas por hora atingido. Aguarde ${mins} minuto(s).` });
      }
      if (!lower) {
        return sendJson(res, 400, { error: 'Informe o nome de usuário.' });
      }
      const user = await getUserByUsername(lower, false);
      if (!user || !user.securityQuestion || !user.securityAnswerHash) {
        await recordRateLimitHit(rlKey, 60 * 60 * 1000);
        if (lower) await recordRateLimitHit(rlUserKey, 60 * 60 * 1000);
        // Mensagem genérica que não confirma se o usuário existe sem pergunta ou não existe
        return sendJson(res, 404, { error: 'Não foi possível iniciar a recuperação para este usuário (usuário inexistente ou sem pergunta de segurança configurada).' });
      }
      return sendJson(res, 200, {
        ok: true,
        username: user.username,
        securityQuestion: user.securityQuestion
      });
    }

    // POST /api/auth?action=recover-password (Validar resposta secreta normalizada e redefinir senha)
    if (req.method === 'POST' && action === 'recover-password') {
      const body = await readRequestBody(req, 32 * 1024);
      const username = String(body.username || '').trim();
      const lower = normalizeUsername(username);
      const normAnswer = normalizeSecurityAnswer(body.securityAnswer || '');
      const newPassword = String(body.newPassword || '');
      const confirmPassword = String(body.confirmPassword || '');
      const ip = getClientIp(req);

      const rlKey = `recovery_attempt:${ip}:${lower || 'empty'}`;
      const rlUserKey = `recovery_user:${lower || 'empty'}`;
      const rl = await checkRateLimit(rlKey, 5, 60 * 60 * 1000); // 5 tentativas por hora
      const rlUser = lower ? await checkRateLimit(rlUserKey, 8, 60 * 60 * 1000) : { blocked: false, retryAfterMs: 0 };
      if (rl.blocked || rlUser.blocked) {
        const retryMs = Math.max(rl.retryAfterMs || 0, rlUser.retryAfterMs || 0);
        const mins = Math.ceil(retryMs / 60000);
        return sendJson(res, 429, { error: `Limite de tentativas por hora atingido. Aguarde ${mins} minuto(s).` });
      }

      if (!lower || !normAnswer) {
        return sendJson(res, 400, { error: 'Informe o usuário e a resposta da pergunta de segurança.' });
      }
      const pErr = validatePassword(newPassword);
      if (pErr) return sendJson(res, 400, { error: pErr });
      if (newPassword !== confirmPassword) {
        return sendJson(res, 400, { error: 'A confirmação da nova senha não confere.' });
      }

      const user = await getUserByUsername(lower, false);
      const validAnswer = (user && user.securityAnswerHash)
        ? verifyPassword(normAnswer, user.securityAnswerHash)
        : (verifyPassword(normAnswer, DUMMY_PASSWORD_HASH) && false);

      if (!user || !validAnswer) {
        await recordRateLimitHit(rlKey, 60 * 60 * 1000);
        if (lower) await recordRateLimitHit(rlUserKey, 60 * 60 * 1000);
        return sendJson(res, 401, { error: 'Usuário ou resposta de segurança incorretos.' });
      }

      await clearRateLimit(rlKey);
      if (lower) await clearRateLimit(rlUserKey);
      user.passwordHash = hashPassword(newPassword);
      user.passwordUpdatedAt = new Date().toISOString();
      user.sessionVersion = (Number(user.sessionVersion) || 1) + 1;
      await writeJsonBlob(`db/users/${user.usernameLower}.json`, user);

      const token = await createSession(user);
      setSessionCookie(res, token);
      return sendJson(res, 200, {
        ok: true,
        message: 'Senha redefinida com sucesso!',
        user: sanitizeUser(user)
      });
    }

    // POST /api/auth?action=delete-account (Exclusão permanente da conta, projetos, reports e sessões)
    if (req.method === 'POST' && action === 'delete-account') {
      const auth = await getAuthenticatedUser(req, res, false, { useCache: false });
      if (!auth) return sendJson(res, 401, { error: 'Sua sessão expirou. Faça login novamente.' });

      if (isReservedAdminUsernameLower(auth.user.usernameLower)) {
        return sendJson(res, 403, { error: 'Contas de administrador não podem ser excluídas por aqui.' });
      }

      const body = await readRequestBody(req, 16 * 1024);
      const password = String(body.password || '');
      const delRlKey = `del_acct:${auth.user.id}`;
      const delRl = await checkRateLimit(delRlKey, 10, 10 * 60 * 1000);
      if (delRl.blocked) {
        const mins = Math.ceil(delRl.retryAfterMs / 60000);
        return sendJson(res, 429, { error: `Muitas tentativas inválidas. Aguarde ${mins} minuto(s).` });
      }
      if (!verifyPassword(password, auth.user.passwordHash)) {
        await recordRateLimitHit(delRlKey, 10 * 60 * 1000);
        return sendJson(res, 401, { error: 'Senha atual incorreta. Exclusão cancelada.' });
      }
      await clearRateLimit(delRlKey);

      // 1) Remove todos os projetos salvos da conta
      try {
        const projBlobs = await listJsonBlobs(`db/projects/${auth.user.id}/`);
        for (const b of projBlobs) {
          if (b && b.pathname) {
            await deleteBlobByPathname(b.pathname).catch(() => {});
          }
        }
      } catch {}

      // 2) Remove reports e imagens vinculadas ao usuário (LGPD)
      try {
        const repBlobs = await listJsonBlobs('db/reports/');
        for (const b of repBlobs) {
          if (!b || !b.pathname || !b.pathname.endsWith('.json')) continue;
          const rep = await fetchJsonFromBlobUrl(b.url).catch(() => null);
          if (rep && rep.userId === auth.user.id) {
            for (const img of (rep.images || [])) {
              if (img.blobUrl) await del(img.blobUrl, { token: getToken() }).catch(() => {});
              else if (img.pathname) await deleteBlobByPathname(img.pathname).catch(() => {});
            }
            await deleteBlobByPathname(b.pathname).catch(() => {});
          }
        }
      } catch {}

      // 3) Remove registro da conta e revoga sessão ativa
      await deleteBlobByPathname(`db/users/${auth.user.usernameLower}.json`);
      await invalidateSession(req, res).catch(() => {});
      if (typeof clearSessionCookie === 'function') {
        clearSessionCookie(res);
      }

      return sendJson(res, 200, {
        ok: true,
        message: 'Sua conta e todos os dados vinculados foram excluídos permanentemente.'
      });
    }

    return sendJson(res, 404, { error: 'Ação de autenticação não encontrada.' });
  } catch (err) {
    if (err.message === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { error: 'Requisição muito grande.' });
    if (err.message === 'INVALID_JSON') return sendJson(res, 400, { error: 'Corpo JSON inválido.' });
    if (err instanceof StorageUnavailableError || err?.name === 'StorageUnavailableError') {
      console.error('[api/auth] storage unavailable:', JSON.stringify({
        action,
        stage: err.stage,
        errName: err.causeName || err.name,
        errMessage: err.causeMessage || err.message,
        status: err.statusCode || 503
      }));
      return sendJson(res, 503, { error: 'Armazenamento temporariamente indisponível. Tente novamente.', code: 'STORAGE_UNAVAILABLE' });
    }
    console.error('[api/auth] error:', JSON.stringify({
      action,
      errName: err?.name || 'Error',
      errMessage: err?.message || String(err || ''),
      status: err?.statusCode || err?.status || 500
    }));
    return sendJson(res, 500, { error: 'Erro interno no servidor de autenticação.' });
  }
};
