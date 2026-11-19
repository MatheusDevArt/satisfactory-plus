/* ============================================================================
 * PATCH NOTES — 7 ÚLTIMAS ATUALIZAÇÕES + CARD AUTOMÁTICO ÚNICO POR VERSÃO
 * ========================================================================== */

const PATCH_NOTES_STORAGE_KEY = 'splus_last_seen_patch_id';

const PatchNotesState = {
  entries: [],
  loaded: false,
  isListOpen: false,
  isAutoCardOpen: false,
  pendingAutoShow: false
};

function getSeenPatchId() {
  try {
    return localStorage.getItem(PATCH_NOTES_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function markLatestPatchSeen() {
  const latest = PatchNotesState.entries[0];
  if (!latest) return;
  try {
    localStorage.setItem(PATCH_NOTES_STORAGE_KEY, latest.id);
  } catch {
    // ignore storage errors
  }
  updatePatchNotesBadge();
}

function updatePatchNotesBadge() {
  const badge = document.getElementById('patch-notes-unread-dot');
  if (!badge) return;
  const latest = PatchNotesState.entries[0];
  const hasUnread = Boolean(latest && getSeenPatchId() !== latest.id);
  badge.classList.toggle('hidden', !hasUnread);
}

function isAnyOtherModalOpen() {
  if (document.body && document.body.classList.contains('home-active')) return true;
  const ids = [
    'tutorial-modal',
    'auth-modal',
    'report-modal',
    'save-project-modal',
    'picker-modal',
    'machine-inspector-modal',
    'excess-recipe-modal',
    'image-lightbox-modal'
  ];
  return ids.some((id) => {
    const el = document.getElementById(id);
    return el && !el.classList.contains('hidden');
  });
}

function escPatchText(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function patchTagClass(tag) {
  const t = String(tag || '').toLowerCase();
  if (t.includes('novo')) return 'novo';
  if (t.includes('corre')) return 'correcao';
  return 'melhoria';
}

function renderPatchEntryItems(items) {
  return `
    <ul class="pn-items-list">
      ${(items || []).map((it) => `
        <li class="pn-item-row">
          <span class="pn-tag pn-tag-${patchTagClass(it.tag)}">${escPatchText(it.tag)}</span>
          <span class="pn-item-text">${escPatchText(it.text)}</span>
        </li>
      `).join('')}
    </ul>
  `;
}

function openPatchNotesModal() {
  closePatchAutoCard(false);
  PatchNotesState.isListOpen = true;
  markLatestPatchSeen();
  const modal = document.getElementById('patch-notes-modal');
  const body = document.getElementById('patch-notes-body');
  if (!modal || !body) return;

  const list = PatchNotesState.entries.slice(0, 7);
  if (list.length === 0) {
    body.innerHTML = `<div class="picker-empty">Nenhuma atualização registrada ainda.</div>`;
  } else {
    body.innerHTML = `
      <div class="pn-timeline">
        ${list.map((entry, idx) => `
          <article class="pn-entry ${idx === 0 ? 'pn-latest' : ''}">
            <div class="pn-entry-head">
              <div class="pn-entry-title-wrap">
                ${idx === 0 ? '<span class="pn-latest-badge">Mais recente</span>' : ''}
                <h4>${escPatchText(entry.title)}</h4>
              </div>
              <time class="pn-entry-date">${escPatchText(entry.date)}</time>
            </div>
            ${renderPatchEntryItems(entry.items)}
          </article>
        `).join('')}
      </div>
    `;
  }
  modal.classList.remove('hidden');
}

function closePatchNotesModal() {
  PatchNotesState.isListOpen = false;
  const modal = document.getElementById('patch-notes-modal');
  if (modal) modal.classList.add('hidden');
}

function openPatchAutoCard() {
  const latest = PatchNotesState.entries[0];
  if (!latest) return;
  if (isAnyOtherModalOpen()) {
    PatchNotesState.pendingAutoShow = true;
    return;
  }
  PatchNotesState.pendingAutoShow = false;
  PatchNotesState.isAutoCardOpen = true;
  const modal = document.getElementById('patch-auto-modal');
  const body = document.getElementById('patch-auto-body');
  if (!modal || !body) return;

  body.innerHTML = `
    <div class="pn-auto-head-meta">
      <span class="pn-latest-badge">Nova atualização</span>
      <time class="pn-entry-date">${escPatchText(latest.date)}</time>
    </div>
    <h4 class="pn-auto-title">${escPatchText(latest.title)}</h4>
    ${renderPatchEntryItems(latest.items)}
    <div class="pn-auto-actions">
      <button type="button" class="btn-tutorial-nav" onclick="openPatchNotesModal()">Ver histórico</button>
      <button type="button" class="btn-tutorial-nav primary" onclick="closePatchAutoCard(true)">Entendi</button>
    </div>
  `;
  modal.classList.remove('hidden');
}

function closePatchAutoCard(markSeen = true) {
  PatchNotesState.isAutoCardOpen = false;
  if (markSeen) markLatestPatchSeen();
  const modal = document.getElementById('patch-auto-modal');
  if (modal) modal.classList.add('hidden');
}

function checkPendingPatchAutoCard() {
  if (PatchNotesState.pendingAutoShow && !isAnyOtherModalOpen()) {
    setTimeout(() => {
      if (PatchNotesState.pendingAutoShow && !isAnyOtherModalOpen()) {
        openPatchAutoCard();
      }
    }, 250);
  }
}

async function initPatchNotes() {
  try {
    const res = await fetch('./data/patch-notes.json?v=18', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    if (!Array.isArray(data)) return;
    PatchNotesState.entries = data.slice(0, 7);
    PatchNotesState.loaded = true;
    updatePatchNotesBadge();

    const latest = PatchNotesState.entries[0];
    if (latest && getSeenPatchId() !== latest.id) {
      // Aguarda splash desaparecer e verifica se não há outro overlay aberto
      setTimeout(() => {
        if (getSeenPatchId() !== latest.id) {
          openPatchAutoCard();
        }
      }, 1700);
    }
  } catch {
    // ignore fetch errors
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (PatchNotesState.isAutoCardOpen) {
    e.preventDefault();
    closePatchAutoCard(true);
  } else if (PatchNotesState.isListOpen) {
    e.preventDefault();
    closePatchNotesModal();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  initPatchNotes();
});
