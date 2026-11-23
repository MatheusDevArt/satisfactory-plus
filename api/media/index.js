const { list } = require('@vercel/blob');
const {
  getToken,
  fetchBlobUrl,
  applySecurityHeaders,
  getAuthenticatedUser,
  readJsonBlob
} = require('../_lib/store');

const MIME_MAP = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp'
};

module.exports = async function handler(req, res) {
  applySecurityHeaders(req, res);
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  try {
    // Exige sessão autenticada: imagens de reports são privadas (somente autor ou CEO/admin)
    const auth = await getAuthenticatedUser(req, res, false, { allowStatelessFallback: true });
    if (!auth) {
      res.statusCode = 401;
      res.end('Não autorizado');
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = String(url.searchParams.get('path') || '').trim();

    // Aceita apenas caminhos estritos dentro de uploads/reports/<reportId>/<filename>
    const match = /^uploads\/reports\/(rep_[a-z0-9_]+)\/([a-z0-9_-]+\.(png|jpg|jpeg|webp))$/i.exec(pathname);
    if (!match || pathname.includes('..')) {
      res.statusCode = 400;
      res.end('Caminho inválido');
      return;
    }

    const reportId = match[1];
    const ext = match[3].toLowerCase();
    const contentType = MIME_MAP[ext];
    if (!contentType) {
      res.statusCode = 403;
      res.end('Tipo de arquivo não permitido');
      return;
    }

    // Verifica propriedade do report (CEO/admin pode ver qualquer anexo; usuário comum apenas os próprios)
    if (auth.user.role !== 'admin') {
      const rep = await readJsonBlob(`db/reports/${reportId}.json`).catch(() => null);
      if (!rep || rep.userId !== auth.user.id) {
        res.statusCode = 403;
        res.end('Acesso negado');
        return;
      }
    }

    const { blobs } = await list({ prefix: pathname, limit: 5, token: getToken() });
    const exact = blobs.find((b) => b.pathname === pathname);
    if (!exact) {
      res.statusCode = 404;
      res.end('Imagem não encontrada ou expirada');
      return;
    }

    const upstream = await fetchBlobUrl(exact.url);
    if (!upstream.ok) {
      res.statusCode = 404;
      res.end('Imagem indisponível');
      return;
    }

    const arrayBuf = await upstream.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('Cache-Control', 'private, no-store');
    res.end(buf);
  } catch (err) {
    console.error('[api/media] error:', err.message);
    res.statusCode = 500;
    res.end('Erro ao carregar imagem');
  }
};
