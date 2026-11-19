const crypto = require('crypto');
const { put, del } = require('@vercel/blob');
const {
  REPORT_TTL_MS,
  MAX_REPORTS_24H,
  MAX_IMAGES_PER_REPORT,
  MAX_REPORT_IMAGES_TOTAL_BYTES,
  MAX_USER_IMAGE_QUOTA_BYTES,
  getToken,
  writeJsonBlob,
  listJsonBlobs,
  fetchJsonFromBlobUrl,
  applySecurityHeaders,
  verifyCsrf,
  sendJson,
  readRequestBody,
  getAuthenticatedUser,
  detectImageType
} = require('../_lib/store');

const VALID_TYPES = new Set(['bug', 'suggestion', 'rating']);

function computeDaysRemaining(expiresAt) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

function formatReportForClient(rep) {
  return {
    id: rep.id,
    userId: rep.userId,
    username: rep.username,
    type: rep.type,
    title: rep.title || '',
    message: rep.message,
    rating: rep.rating || null,
    techInfo: rep.techInfo || null,
    images: (rep.images || []).map((img) => ({
      id: img.id,
      url: img.proxyUrl || img.blobUrl,
      mime: img.mime,
      size: img.size
    })),
    createdAt: rep.createdAt,
    expiresAt: rep.expiresAt,
    daysRemaining: computeDaysRemaining(rep.expiresAt)
  };
}

async function loadAllValidReportsAndCleanup() {
  const blobs = await listJsonBlobs('db/reports/');
  const now = Date.now();
  const active = [];

  for (const b of blobs) {
    if (!b.pathname.endsWith('.json')) continue;
    try {
      const rep = await fetchJsonFromBlobUrl(b.url);
      if (!rep) continue;
      const expiresMs = rep.expiresAt
        ? new Date(rep.expiresAt).getTime()
        : (new Date(rep.createdAt).getTime() + REPORT_TTL_MS);

      if (now >= expiresMs) {
        // Reforço de limpeza na leitura
        for (const img of (rep.images || [])) {
          if (img.blobUrl) await del(img.blobUrl, { token: getToken() }).catch(() => {});
        }
        await del(b.url, { token: getToken() }).catch(() => {});
        continue;
      }
      active.push({ rep, blobUrl: b.url });
    } catch {
      // skip invalid
    }
  }

  active.sort((a, b) => new Date(b.rep.createdAt).getTime() - new Date(a.rep.createdAt).getTime());
  return active;
}

module.exports = async function handler(req, res) {
  applySecurityHeaders(req, res);
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });

  if (req.method !== 'GET' && !verifyCsrf(req)) {
    return sendJson(res, 403, { error: 'Requisição bloqueada por proteção CSRF.' });
  }

  try {
    const auth = await getAuthenticatedUser(req, res, true);
    if (!auth) {
      return sendJson(res, 401, { error: 'Você precisa entrar na sua conta para acessar os reports.' });
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const scope = url.searchParams.get('scope') || 'mine';

    // GET /api/reports?scope=mine|all
    if (req.method === 'GET') {
      const allActive = await loadAllValidReportsAndCleanup();

      if (scope === 'all') {
        if (auth.user.role !== 'admin') {
          return sendJson(res, 403, { error: 'Acesso negado. Apenas administradores podem visualizar todos os reports.' });
        }
        return sendJson(res, 200, {
          reports: allActive.map((x) => formatReportForClient(x.rep)),
          total: allActive.length
        });
      }

      // scope=mine: apenas reports do próprio usuário
      const mine = allActive.filter((x) => x.rep.userId === auth.user.id);
      const now = Date.now();
      const window24h = 24 * 60 * 60 * 1000;
      const recent24h = mine.filter((x) => now - new Date(x.rep.createdAt).getTime() < window24h);
      const remaining24h = Math.max(0, MAX_REPORTS_24H - recent24h.length);
      let nextAvailableAt = null;
      if (remaining24h === 0 && recent24h.length > 0) {
        const oldestRecent = recent24h[recent24h.length - 1];
        nextAvailableAt = new Date(new Date(oldestRecent.rep.createdAt).getTime() + window24h).toISOString();
      }

      const usedImageBytes = mine.reduce(
        (sum, x) => sum + (x.rep.images || []).reduce((s, img) => s + (Number(img.size) || 0), 0),
        0
      );

      return sendJson(res, 200, {
        reports: mine.map((x) => formatReportForClient(x.rep)),
        quota: {
          maxPer24h: MAX_REPORTS_24H,
          used24h: recent24h.length,
          remaining24h,
          nextAvailableAt,
          usedImageBytes,
          maxImageQuotaBytes: MAX_USER_IMAGE_QUOTA_BYTES
        }
      });
    }

    // POST /api/reports (Criar novo report)
    if (req.method === 'POST') {
      const body = await readRequestBody(req, 4.4 * 1024 * 1024);
      const type = String(body.type || '').trim().toLowerCase();
      const title = String(body.title || '').trim().slice(0, 120);
      const message = String(body.message || '').trim();
      const rating = type === 'rating' ? Number(body.rating) : null;
      const rawImages = Array.isArray(body.images) ? body.images : [];

      if (!VALID_TYPES.has(type)) {
        return sendJson(res, 400, { error: 'Tipo de report inválido. Escolha Bug, Sugestão de melhoria ou Avaliação.' });
      }
      if (message.length < 10 || message.length > 2000) {
        return sendJson(res, 400, { error: 'A mensagem deve ter entre 10 e 2000 caracteres.' });
      }
      if (type === 'rating' && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
        return sendJson(res, 400, { error: 'Para avaliação, escolha uma nota de 1 a 5 estrelas.' });
      }
      if (rawImages.length > MAX_IMAGES_PER_REPORT) {
        return sendJson(res, 400, { error: `Você pode enviar no máximo ${MAX_IMAGES_PER_REPORT} imagens por report.` });
      }

      // Verifica limite de 10 reports em 24h e cota de 50 MB por usuário
      const allActive = await loadAllValidReportsAndCleanup();
      const mine = allActive.filter((x) => x.rep.userId === auth.user.id);
      const now = Date.now();
      const window24h = 24 * 60 * 60 * 1000;
      const recent24h = mine.filter((x) => now - new Date(x.rep.createdAt).getTime() < window24h);

      if (recent24h.length >= MAX_REPORTS_24H) {
        const oldestRecent = recent24h[recent24h.length - 1];
        const nextAt = new Date(new Date(oldestRecent.rep.createdAt).getTime() + window24h);
        const minsLeft = Math.max(1, Math.ceil((nextAt.getTime() - now) / 60000));
        const hrs = Math.floor(minsLeft / 60);
        const mins = minsLeft % 60;
        return sendJson(res, 429, {
          error: `Você atingiu o limite de ${MAX_REPORTS_24H} reports em 24 horas. Poderá enviar novamente em ${hrs}h ${mins}min.`,
          nextAvailableAt: nextAt.toISOString()
        });
      }

      const currentUserImageBytes = mine.reduce(
        (sum, x) => sum + (x.rep.images || []).reduce((s, img) => s + (Number(img.size) || 0), 0),
        0
      );

      // Valida magic bytes e tamanhos das imagens
      const parsedImages = [];
      let batchTotalBytes = 0;

      for (let i = 0; i < rawImages.length; i++) {
        const item = rawImages[i];
        const b64 = typeof item === 'string' ? item : String(item?.dataBase64 || '');
        const cleanB64 = b64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
        if (!cleanB64) {
          return sendJson(res, 400, { error: `Imagem #${i + 1} está vazia ou inválida.` });
        }
        const buf = Buffer.from(cleanB64, 'base64');
        const detected = detectImageType(buf);
        if (!detected) {
          return sendJson(res, 400, { error: `Arquivo #${i + 1} recusado: apenas imagens PNG, JPG ou WEBP válidas são aceitas.` });
        }
        if (buf.length > 1.5 * 1024 * 1024) {
          return sendJson(res, 400, { error: `Imagem #${i + 1} excedeu o tamanho máximo permitido após compressão.` });
        }
        batchTotalBytes += buf.length;
        parsedImages.push({ buf, mime: detected.mime, ext: detected.ext });
      }

      if (batchTotalBytes > MAX_REPORT_IMAGES_TOTAL_BYTES) {
        return sendJson(res, 400, { error: 'O tamanho total das imagens do report excede o limite de 3 MB.' });
      }
      if (currentUserImageBytes + batchTotalBytes > MAX_USER_IMAGE_QUOTA_BYTES) {
        return sendJson(res, 400, { error: 'Você atingiu a cota de 50 MB de imagens em reports ativos. Aguarde a expiração ou remova reports antigos.' });
      }

      const reportId = `rep_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
      const uploadedImages = [];

      for (const img of parsedImages) {
        const imgId = `${crypto.randomBytes(12).toString('hex')}.${img.ext}`;
        const pathname = `uploads/reports/${reportId}/${imgId}`;
        const stored = await put(pathname, img.buf, {
          access: 'public',
          contentType: img.mime,
          addRandomSuffix: false,
          token: getToken()
        });
        uploadedImages.push({
          id: imgId,
          pathname,
          blobUrl: stored.url,
          proxyUrl: `/api/media?path=${encodeURIComponent(pathname)}`,
          mime: img.mime,
          size: img.buf.length
        });
      }

      // Informações técnicas sem dados pessoais (apenas para bugs)
      let techInfo = null;
      if (type === 'bug' && body.techInfo && typeof body.techInfo === 'object') {
        techInfo = {
          browser: String(body.techInfo.browser || '').slice(0, 120),
          viewport: String(body.techInfo.viewport || '').slice(0, 40),
          tab: String(body.techInfo.tab || '').slice(0, 40)
        };
      }

      const createdAt = new Date(now).toISOString();
      const expiresAt = new Date(now + REPORT_TTL_MS).toISOString();
      const reportObj = {
        id: reportId,
        userId: auth.user.id,
        username: auth.user.username,
        type,
        title,
        message,
        rating,
        techInfo,
        images: uploadedImages,
        createdAt,
        expiresAt
      };

      await writeJsonBlob(`db/reports/${reportId}.json`, reportObj);
      return sendJson(res, 201, { ok: true, report: formatReportForClient(reportObj) });
    }

    // DELETE /api/reports?id=rep_xxx (Somente admin)
    if (req.method === 'DELETE') {
      if (auth.user.role !== 'admin') {
        return sendJson(res, 403, { error: 'Acesso negado. Apenas administradores podem excluir reports.' });
      }
      const id = String(url.searchParams.get('id') || '').trim();
      if (!id || !/^rep_[a-z0-9_]+$/i.test(id)) {
        return sendJson(res, 400, { error: 'ID de report inválido.' });
      }

      const blobs = await listJsonBlobs(`db/reports/${id}.json`);
      const targetBlob = blobs.find((b) => b.pathname === `db/reports/${id}.json`);
      if (!targetBlob) {
        return sendJson(res, 404, { error: 'Report não encontrado.' });
      }

      const rep = await fetchJsonFromBlobUrl(targetBlob.url);
      if (rep && Array.isArray(rep.images)) {
        for (const img of rep.images) {
          if (img.blobUrl) await del(img.blobUrl, { token: getToken() }).catch(() => {});
        }
      }
      await del(targetBlob.url, { token: getToken() });
      return sendJson(res, 200, { ok: true, deletedId: id });
    }

    return sendJson(res, 405, { error: 'Método não permitido.' });
  } catch (err) {
    if (err.message === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { error: 'Tamanho total da requisição excedeu o limite permitido (4 MB).' });
    if (err.message === 'INVALID_JSON') return sendJson(res, 400, { error: 'Dados enviados em formato inválido.' });
    console.error('[api/reports] error:', err.message);
    return sendJson(res, 500, { error: 'Erro interno ao processar reports.' });
  }
};
