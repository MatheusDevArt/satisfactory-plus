const { cleanupExpiredReports, applySecurityHeaders, sendJson } = require('../_lib/store');

module.exports = async function handler(req, res) {
  applySecurityHeaders(req, res);
  if (req.method !== 'GET' && req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Método não permitido.' });
  }

  // Autorização da rotina agendada (Vercel Cron envia Authorization: Bearer <CRON_SECRET>)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization || '';
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return sendJson(res, 401, { error: 'Não autorizado.' });
  }

  try {
    const result = await cleanupExpiredReports();
    return sendJson(res, 200, {
      ok: true,
      ranAt: new Date().toISOString(),
      ...result
    });
  } catch (err) {
    console.error('[api/cron/cleanup] error:', err.message);
    return sendJson(res, 500, { error: 'Erro na rotina de limpeza.' });
  }
};
