const crypto = require('crypto');
const {
  LOGIN_FAIL_LIMIT,
  LOGIN_FAIL_WINDOW_MS,
  REGISTER_IP_LIMIT,
  REGISTER_IP_WINDOW_MS,
  hashPassword,
  verifyPassword,
  writeJsonBlob,
  getClientIp,
  applySecurityHeaders,
  verifyCsrf,
  setSessionCookie,
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
  StorageUnavailableError
} = require('../_lib/store');

module.exports = async function handler(req, res) {
  applySecurityHeaders(req, res);
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const action = url.searchParams.get('action') || '';

  if (req.method !== 'GET' && !verifyCsrf(req)) {
    return sendJson(res, 403, { error: 'Requisição bloqueada por proteção CSRF.' });
  }

  try {
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

      const uErr = validateUsername(username);
      if (uErr) return sendJson(res, 400, { error: uErr });
      const pErr = validatePassword(password);
      if (pErr) return sendJson(res, 400, { error: pErr });
      if (password !== confirmPassword) {
        return sendJson(res, 400, { error: 'As senhas não conferem.' });
      }

      const lower = normalizeUsername(username);
      if (lower === getReservedAdminUsernameLower()) {
        return sendJson(res, 409, { error: 'Este nome de usuário é reservado e não está disponível.' });
      }

      const existing = await getUserByUsername(lower);
      if (existing) {
        return sendJson(res, 409, { error: 'Este nome de usuário já está em uso.' });
      }

      const userObj = {
        id: `usr_${crypto.randomBytes(8).toString('hex')}`,
        username,
        usernameLower: lower,
        role: 'user',
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString()
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

      const user = await getUserByUsername(lower);
      const valid = user ? verifyPassword(password, user.passwordHash) : false;

      if (!user || !valid) {
        await recordRateLimitHit(failKey, LOGIN_FAIL_WINDOW_MS);
        return sendJson(res, 401, { error: 'Usuário ou senha incorretos.' });
      }

      await clearRateLimit(failKey);
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
      const auth = await getAuthenticatedUser(req, res, false);
      if (!auth) return sendJson(res, 401, { error: 'Sua sessão expirou. Faça login novamente.' });

      const body = await readRequestBody(req, 32 * 1024);
      const currentPassword = String(body.currentPassword || '');
      const newPassword = String(body.newPassword || '');
      const confirmPassword = String(body.confirmPassword || '');

      if (!verifyPassword(currentPassword, auth.user.passwordHash)) {
        return sendJson(res, 401, { error: 'Senha atual incorreta.' });
      }
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
      const auth = await getAuthenticatedUser(req, res, false);
      if (!auth) return sendJson(res, 401, { error: 'Sua sessão expirou. Faça login novamente.' });

      const body = await readRequestBody(req, 32 * 1024);
      const current = (auth.user.preferences && typeof auth.user.preferences === 'object')
        ? { ...auth.user.preferences }
        : {};

      if (body.theme === 'light' || body.theme === 'dark') {
        current.theme = body.theme;
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
          .map((x) => ({
            id: String(x.id || '').slice(0, 40),
            tool: String(x.tool || '').slice(0, 30),
            label: String(x.label || '').slice(0, 80),
            summary: String(x.summary || '').slice(0, 140),
            state: (x.state && typeof x.state === 'object') ? x.state : {},
            pinned: Boolean(x.pinned),
            at: String(x.at || '').slice(0, 40)
          }));
      }

      auth.user.preferences = current;
      await writeJsonBlob(`db/users/${auth.user.usernameLower}.json`, auth.user);
      return sendJson(res, 200, { ok: true, preferences: sanitizeUser(auth.user).preferences });
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
