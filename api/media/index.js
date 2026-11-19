const { list } = require('@vercel/blob');
const { getToken, applySecurityHeaders } = require('../_lib/store');

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
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = String(url.searchParams.get('path') || '').trim();

    // Aceita apenas caminhos dentro de uploads/reports/ sem path traversal
    if (!pathname.startsWith('uploads/reports/') || pathname.includes('..')) {
      res.statusCode = 400;
      res.end('Caminho inválido');
      return;
    }

    const ext = pathname.split('.').pop().toLowerCase();
    const contentType = MIME_MAP[ext];
    if (!contentType) {
      res.statusCode = 403;
      res.end('Tipo de arquivo não permitido');
      return;
    }

    const { blobs } = await list({ prefix: pathname, limit: 5, token: getToken() });
    const exact = blobs.find((b) => b.pathname === pathname);
    if (!exact) {
      res.statusCode = 404;
      res.end('Imagem não encontrada ou expirada');
      return;
    }

    const upstream = await fetch(exact.url);
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
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.end(buf);
  } catch (err) {
    console.error('[api/media] error:', err.message);
    res.statusCode = 500;
    res.end('Erro ao carregar imagem');
  }
};
