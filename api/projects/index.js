const crypto = require('crypto');
const { del } = require('@vercel/blob');
const {
  MAX_PROJECTS_PER_USER,
  MAX_PROJECT_BYTES,
  getToken,
  readJsonBlob,
  writeJsonBlob,
  deleteBlobByPathname,
  listJsonBlobs,
  fetchJsonFromBlobUrl,
  applySecurityHeaders,
  verifyCsrf,
  sendJson,
  readRequestBody,
  getAuthenticatedUser,
  StorageUnavailableError
} = require('../_lib/store');

function validateProjectName(name) {
  const trimmed = String(name || '').trim();
  if (trimmed.length < 1 || trimmed.length > 60) {
    return 'O nome do projeto deve ter entre 1 e 60 caracteres.';
  }
  return null;
}

function summarizeProject(proj) {
  return {
    id: proj.id,
    name: proj.name,
    sourceMode: proj.sourceMode || 'production',
    summary: proj.summary || '',
    createdAt: proj.createdAt,
    updatedAt: proj.updatedAt
  };
}

async function listUserProjects(userId) {
  const prefix = `db/projects/${userId}/`;
  const blobs = await listJsonBlobs(prefix);
  const items = [];
  for (const b of blobs) {
    if (!b.pathname.endsWith('.json')) continue;
    try {
      const p = await fetchJsonFromBlobUrl(b.url);
      if (p && p.userId === userId) {
        items.push({ proj: p, blobUrl: b.url });
      }
    } catch {
      // ignore corrupted
    }
  }
  items.sort((a, b) => new Date(b.proj.updatedAt).getTime() - new Date(a.proj.updatedAt).getTime());
  return items;
}

module.exports = async function handler(req, res) {
  applySecurityHeaders(req, res);
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });

  if (req.method !== 'GET' && !verifyCsrf(req)) {
    return sendJson(res, 403, { error: 'Requisição bloqueada por proteção CSRF.' });
  }

  try {
    const auth = await getAuthenticatedUser(req, res, true, { allowStatelessFallback: true });
    if (!auth) {
      return sendJson(res, 401, { error: 'Você precisa entrar na sua conta para acessar seus projetos.' });
    }

    const userId = auth.user.id;
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const projectId = String(url.searchParams.get('id') || '').trim();

    // GET /api/projects (lista) ou GET /api/projects?id=prj_xxx (detalhe completo)
    if (req.method === 'GET') {
      if (projectId) {
        if (!/^prj_[a-z0-9_]+$/i.test(projectId)) {
          return sendJson(res, 400, { error: 'ID de projeto inválido.' });
        }
        const proj = await readJsonBlob(`db/projects/${userId}/${projectId}.json`);
        if (!proj || proj.userId !== userId) {
          return sendJson(res, 404, { error: 'Projeto não encontrado.' });
        }
        return sendJson(res, 200, { project: proj });
      }

      const list = await listUserProjects(userId);
      return sendJson(res, 200, {
        projects: list.map((x) => summarizeProject(x.proj)),
        total: list.length,
        maxProjects: MAX_PROJECTS_PER_USER
      });
    }

    // POST /api/projects (Criar novo projeto ou sobrescrever por nome se overwrite=true)
    if (req.method === 'POST') {
      const body = await readRequestBody(req, MAX_PROJECT_BYTES + 64 * 1024);
      const name = String(body.name || '').trim();
      const nameErr = validateProjectName(name);
      if (nameErr) return sendJson(res, 400, { error: nameErr });

      const payload = body.payload;
      if (!payload || typeof payload !== 'object') {
        return sendJson(res, 400, { error: 'Dados do projeto inválidos.' });
      }

      const payloadSize = Buffer.byteLength(JSON.stringify(payload), 'utf8');
      if (payloadSize > MAX_PROJECT_BYTES) {
        return sendJson(res, 413, { error: 'O projeto excedeu o limite máximo de 1 MB.' });
      }

      const existingList = await listUserProjects(userId);
      const nameLower = name.toLowerCase();
      const duplicate = existingList.find((x) => x.proj.name.toLowerCase() === nameLower);

      if (duplicate && !body.overwrite) {
        return sendJson(res, 409, {
          error: 'Já existe um projeto com esse nome.',
          code: 'DUPLICATE_NAME',
          existingId: duplicate.proj.id
        });
      }

      const nowIso = new Date().toISOString();

      if (duplicate && body.overwrite) {
        const updated = {
          ...duplicate.proj,
          name,
          sourceMode: String(body.sourceMode || duplicate.proj.sourceMode || 'production').slice(0, 30),
          summary: String(body.summary || '').slice(0, 240),
          payload,
          updatedAt: nowIso
        };
        await writeJsonBlob(`db/projects/${userId}/${updated.id}.json`, updated);
        return sendJson(res, 200, { ok: true, project: summarizeProject(updated), overwritten: true });
      }

      if (existingList.length >= MAX_PROJECTS_PER_USER) {
        return sendJson(res, 400, {
          error: `Você atingiu o limite máximo de ${MAX_PROJECTS_PER_USER} projetos salvos. Remova algum projeto antigo para salvar um novo.`
        });
      }

      const newId = `prj_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
      const newProj = {
        id: newId,
        userId,
        name,
        sourceMode: String(body.sourceMode || 'production').slice(0, 30),
        summary: String(body.summary || '').slice(0, 240),
        payload,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      await writeJsonBlob(`db/projects/${userId}/${newId}.json`, newProj);
      return sendJson(res, 201, { ok: true, project: summarizeProject(newProj) });
    }

    // PUT /api/projects?id=prj_xxx (Atualizar conteúdo e/ou renomear)
    if (req.method === 'PUT' || req.method === 'PATCH') {
      if (!projectId || !/^prj_[a-z0-9_]+$/i.test(projectId)) {
        return sendJson(res, 400, { error: 'ID de projeto inválido.' });
      }
      const existing = await readJsonBlob(`db/projects/${userId}/${projectId}.json`);
      if (!existing || existing.userId !== userId) {
        return sendJson(res, 404, { error: 'Projeto não encontrado.' });
      }

      const body = await readRequestBody(req, MAX_PROJECT_BYTES + 64 * 1024);
      let nextName = existing.name;

      if (body.name !== undefined) {
        const candidate = String(body.name || '').trim();
        const nErr = validateProjectName(candidate);
        if (nErr) return sendJson(res, 400, { error: nErr });
        if (candidate.toLowerCase() !== existing.name.toLowerCase()) {
          const allMine = await listUserProjects(userId);
          if (allMine.some((x) => x.proj.id !== projectId && x.proj.name.toLowerCase() === candidate.toLowerCase())) {
            return sendJson(res, 409, { error: 'Já existe outro projeto com este nome.' });
          }
        }
        nextName = candidate;
      }

      let nextPayload = existing.payload;
      if (body.payload !== undefined) {
        if (!body.payload || typeof body.payload !== 'object') {
          return sendJson(res, 400, { error: 'Dados do projeto inválidos.' });
        }
        const payloadSize = Buffer.byteLength(JSON.stringify(body.payload), 'utf8');
        if (payloadSize > MAX_PROJECT_BYTES) {
          return sendJson(res, 413, { error: 'O projeto excedeu o limite máximo de 1 MB.' });
        }
        nextPayload = body.payload;
      }

      const updated = {
        ...existing,
        name: nextName,
        sourceMode: body.sourceMode ? String(body.sourceMode).slice(0, 30) : existing.sourceMode,
        summary: body.summary !== undefined ? String(body.summary).slice(0, 240) : existing.summary,
        payload: nextPayload,
        updatedAt: new Date().toISOString()
      };

      await writeJsonBlob(`db/projects/${userId}/${projectId}.json`, updated);
      return sendJson(res, 200, { ok: true, project: summarizeProject(updated) });
    }

    // DELETE /api/projects?id=prj_xxx
    if (req.method === 'DELETE') {
      if (!projectId || !/^prj_[a-z0-9_]+$/i.test(projectId)) {
        return sendJson(res, 400, { error: 'ID de projeto inválido.' });
      }
      const blobs = await listJsonBlobs(`db/projects/${userId}/${projectId}.json`);
      const exact = blobs.find((b) => b.pathname === `db/projects/${userId}/${projectId}.json`);
      if (!exact) {
        return sendJson(res, 404, { error: 'Projeto não encontrado.' });
      }
      const existing = await fetchJsonFromBlobUrl(exact.url);
      if (!existing || existing.userId !== userId) {
        return sendJson(res, 403, { error: 'Você não tem permissão para remover este projeto.' });
      }
      await deleteBlobByPathname(exact.pathname);
      return sendJson(res, 200, { ok: true, deletedId: projectId });
    }

    return sendJson(res, 405, { error: 'Método não permitido.' });
  } catch (err) {
    if (err.message === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { error: 'O projeto excedeu o limite máximo de 1 MB.' });
    if (err.message === 'INVALID_JSON') return sendJson(res, 400, { error: 'Dados enviados em formato inválido.' });
    if (err instanceof StorageUnavailableError || err?.name === 'StorageUnavailableError') {
      return sendJson(res, 503, { error: 'Armazenamento temporariamente indisponível.', code: 'STORAGE_UNAVAILABLE' });
    }
    console.error('[api/projects] error:', err.message);
    return sendJson(res, 500, { error: 'Erro interno ao processar projetos.' });
  }
};
