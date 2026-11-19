/**
 * Satisfactory+ — Contas, Reports (Usuário & Admin) e Projetos Salvos na Nuvem
 * - Sessão persistente via cookie HttpOnly (/api/auth)
 * - Reports com compressão de imagens no navegador, cota de 10/24h e expiração em 14 dias (/api/reports)
 * - Painel Admin exclusivo (verificado no servidor) com filtros, lightbox e exportação .txt
 * - Projetos salvos completos (Produção & Modo Livre) com abrir, editar, atualizar, renomear e remover (/api/projects)
 * - Todo conteúdo de usuário é escapado via escText() para prevenção total de XSS.
 */

const AccountState = {
  user: null, // { id, username, role }
  sessionLoaded: false,
  menuOpen: false,

  authModal: {
    isOpen: false,
    tab: 'login', // 'login' | 'register' | 'change-password'
    notice: '',
    error: '',
    loading: false,
    afterLoginAction: null
  },

  reportModal: {
    isOpen: false,
    tab: 'new', // 'new' | 'mine'
    type: 'bug', // 'bug' | 'suggestion' | 'rating'
    title: '',
    message: '',
    rating: 5,
    images: [], // [{ id, name, dataBase64, size, previewUrl }]
    loading: false,
    compressing: false,
    error: '',
    success: '',
    myReports: [],
    myReportsLoaded: false,
    quota: null
  },

  adminReports: {
    list: [],
    loading: false,
    error: '',
    filterType: 'all',
    filterUser: '',
    filterPeriod: 'all', // 'all' | '24h' | '7d' | '14d'
    searchQuery: ''
  },

  projects: {
    list: [],
    loading: false,
    error: '',
    maxProjects: 50,
    activeProjectId: null,
    activeProjectName: '',
    activeProjectMode: null,
    saveModal: {
      isOpen: false,
      mode: 'save', // 'save' | 'rename'
      sourceMode: 'production',
      renameProjectId: null,
      name: '',
      error: '',
      duplicatePrompt: false,
      loading: false
    }
  }
};

function escText(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDateBR(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtBytes(bytes) {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

async function apiFetch(url, options = {}) {
  const headers = {
    'X-Requested-With': 'SatisfactoryPlus',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {})
  };
  const res = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (res.status === 401 && AccountState.user) {
    // Sessão expirou no servidor sem perder o estado atual do usuário na tela
    AccountState.user = null;
    updateAuthHeaderUI();
    updateRoleBasedTabs();
    openAuthModal('login', 'Sua sessão expirou. Entre novamente para continuar — seu trabalho atual não foi perdido.');
  }
  return { ok: res.ok, status: res.status, data };
}

/* ============================================================================
 * INICIALIZAÇÃO DE SESSÃO PERSISTENTE
 * ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  restoreSessionOnLoad();
  document.addEventListener('click', (e) => {
    if (AccountState.menuOpen && !e.target.closest('#auth-header-slot')) {
      AccountState.menuOpen = false;
      updateAuthHeaderUI();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (AccountState.authModal.isOpen) closeAuthModal();
      if (AccountState.reportModal.isOpen) closeReportModal();
      if (AccountState.projects.saveModal.isOpen) closeSaveProjectModal();
      closeImageLightbox();
    }
  });
});

async function restoreSessionOnLoad() {
  try {
    const res = await apiFetch('/api/auth?action=me', { method: 'GET' });
    AccountState.user = res.ok && res.data.authenticated ? res.data.user : null;
  } catch {
    AccountState.user = null;
  } finally {
    AccountState.sessionLoaded = true;
    updateAuthHeaderUI();
    updateRoleBasedTabs();
    if (typeof updateTopRightFloatingActions === 'function') {
      updateTopRightFloatingActions();
    }
  }
}

function updateRoleBasedTabs() {
  const projTab = document.getElementById('tab-projects');
  const repTab = document.getElementById('tab-reports');
  const isLogged = Boolean(AccountState.user);
  const isAdmin = Boolean(AccountState.user && AccountState.user.role === 'admin');

  if (projTab) projTab.classList.toggle('hidden', !isLogged);
  if (repTab) repTab.classList.toggle('hidden', !isAdmin);

  if (!isLogged && AppState.mode === 'projects') {
    switchMode('production');
  }
  if (!isAdmin && AppState.mode === 'reports') {
    switchMode('production');
  }
}

function updateAuthHeaderUI() {
  const slot = document.getElementById('auth-header-slot');
  if (!slot) return;

  if (!AccountState.user) {
    slot.innerHTML = `
      <button id="btn-auth-login" class="btn-top-action" onclick="openAuthModal('login')" title="Entrar ou criar uma conta">
        👤 Entrar
      </button>
    `;
    return;
  }

  const uName = escText(AccountState.user.username);
  const adminBadge = AccountState.user.role === 'admin' ? '<span class="user-role-tag">ADMIN</span>' : '';
  slot.innerHTML = `
    <div class="user-menu-wrap">
      <button type="button" class="btn-top-action btn-user-pill" onclick="toggleUserDropdown(event)">
        <span>👤 ${uName}</span>
        ${adminBadge}
        <span class="caret">▾</span>
      </button>
      ${AccountState.menuOpen ? `
        <div class="user-dropdown-menu">
          <div class="user-dropdown-head">Conectado como <strong>${uName}</strong></div>
          <button type="button" class="context-menu-item" onclick="openChangePasswordModal()">🔑 Alterar senha</button>
          <div class="context-menu-divider"></div>
          <button type="button" class="context-menu-item danger" onclick="performLogout()">🚪 Sair</button>
        </div>
      ` : ''}
    </div>
  `;
}

function toggleUserDropdown(event) {
  if (event) event.stopPropagation();
  AccountState.menuOpen = !AccountState.menuOpen;
  updateAuthHeaderUI();
}

/* ============================================================================
 * MODAL DE AUTENTICAÇÃO (ENTRAR / CRIAR CONTA / ALTERAR SENHA)
 * ========================================================================== */

function openAuthModal(tab = 'login', notice = '', afterLoginAction = null) {
  AccountState.menuOpen = false;
  updateAuthHeaderUI();
  AccountState.authModal = {
    isOpen: true,
    tab,
    notice: notice || '',
    error: '',
    loading: false,
    afterLoginAction
  };
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.remove('hidden');
  renderAuthModalBody();
}

function openChangePasswordModal() {
  openAuthModal('change-password', '');
}

function closeAuthModal() {
  AccountState.authModal.isOpen = false;
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.add('hidden');
}

function switchAuthTab(tab) {
  AccountState.authModal.tab = tab;
  AccountState.authModal.error = '';
  renderAuthModalBody();
}

function togglePasswordVisibility(inputId, btnEl) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  if (btnEl) btnEl.textContent = show ? '🙈' : '👁️';
}

function renderAuthModalBody() {
  const titleEl = document.getElementById('auth-modal-title');
  const body = document.getElementById('auth-modal-body');
  if (!body) return;
  const st = AccountState.authModal;

  if (st.tab === 'change-password') {
    if (titleEl) titleEl.textContent = '🔑 Alterar Senha';
    body.innerHTML = `
      ${st.error ? `<div class="form-alert error">${escText(st.error)}</div>` : ''}
      <form onsubmit="submitChangePassword(event)" class="account-form">
        <div class="field-group">
          <label for="cp-current">Senha atual</label>
          <div class="password-field-wrap">
            <input id="cp-current" type="password" class="sidebar-input" required autocomplete="current-password" />
            <button type="button" class="btn-toggle-eye" onclick="togglePasswordVisibility('cp-current', this)" title="Mostrar/ocultar senha">👁️</button>
          </div>
        </div>
        <div class="field-group">
          <label for="cp-new">Nova senha (mínimo 8 caracteres)</label>
          <div class="password-field-wrap">
            <input id="cp-new" type="password" class="sidebar-input" required minlength="8" autocomplete="new-password" />
            <button type="button" class="btn-toggle-eye" onclick="togglePasswordVisibility('cp-new', this)" title="Mostrar/ocultar senha">👁️</button>
          </div>
        </div>
        <div class="field-group">
          <label for="cp-confirm">Confirmar nova senha</label>
          <div class="password-field-wrap">
            <input id="cp-confirm" type="password" class="sidebar-input" required minlength="8" autocomplete="new-password" />
            <button type="button" class="btn-toggle-eye" onclick="togglePasswordVisibility('cp-confirm', this)" title="Mostrar/ocultar senha">👁️</button>
          </div>
        </div>
        <button type="submit" class="btn-mount-flow ready" ${st.loading ? 'disabled' : ''}>
          ${st.loading ? '⏳ Salvando...' : '✅ Salvar Nova Senha'}
        </button>
      </form>
    `;
    return;
  }

  const isReg = st.tab === 'register';
  if (titleEl) titleEl.textContent = isReg ? '✨ Criar Conta' : '👤 Entrar na Conta';

  body.innerHTML = `
    <div class="mode-switch-mini">
      <button type="button" class="mini-pill ${!isReg ? 'active' : ''}" onclick="switchAuthTab('login')">Entrar</button>
      <button type="button" class="mini-pill ${isReg ? 'active' : ''}" onclick="switchAuthTab('register')">Criar conta</button>
    </div>

    ${st.notice ? `<div class="form-alert info">ℹ️ ${escText(st.notice)}</div>` : ''}
    ${st.error ? `<div class="form-alert error">⚠️ ${escText(st.error)}</div>` : ''}

    <form onsubmit="${isReg ? 'submitRegisterForm(event)' : 'submitLoginForm(event)'}" class="account-form">
      <div class="field-group">
        <label for="auth-username">Nome de usuário</label>
        <input
          id="auth-username"
          type="text"
          class="sidebar-input"
          required
          minlength="3"
          maxlength="20"
          pattern="[a-zA-Z0-9_.-]+"
          placeholder="Ex: Pioneiro_01"
          autocomplete="username"
        />
        ${isReg ? '<small class="field-hint">3 a 20 caracteres: letras, números, ponto (.), hífen (-) ou underline (_).</small>' : ''}
      </div>

      <div class="field-group">
        <label for="auth-password">Senha</label>
        <div class="password-field-wrap">
          <input
            id="auth-password"
            type="password"
            class="sidebar-input"
            required
            minlength="${isReg ? 8 : 1}"
            placeholder="${isReg ? 'Mínimo de 8 caracteres' : 'Sua senha'}"
            autocomplete="${isReg ? 'new-password' : 'current-password'}"
          />
          <button type="button" class="btn-toggle-eye" onclick="togglePasswordVisibility('auth-password', this)" title="Mostrar/ocultar senha">👁️</button>
        </div>
      </div>

      ${isReg ? `
        <div class="field-group">
          <label for="auth-confirm">Confirmar senha</label>
          <div class="password-field-wrap">
            <input
              id="auth-confirm"
              type="password"
              class="sidebar-input"
              required
              minlength="8"
              placeholder="Repita a senha"
              autocomplete="new-password"
            />
            <button type="button" class="btn-toggle-eye" onclick="togglePasswordVisibility('auth-confirm', this)" title="Mostrar/ocultar senha">👁️</button>
          </div>
        </div>
        <div class="form-alert warn">
          🔒 <strong>Atenção:</strong> Como não pedimos e-mail, <strong>não existe recuperação de senha</strong>. Guarde sua senha em um local seguro.
        </div>
      ` : ''}

      <button type="submit" class="btn-mount-flow ready" ${st.loading ? 'disabled' : ''}>
        ${st.loading ? '⏳ Aguarde...' : (isReg ? '✨ Criar Conta e Entrar' : '🔓 Entrar')}
      </button>
    </form>
  `;
}

async function submitLoginForm(e) {
  e.preventDefault();
  const username = (document.getElementById('auth-username')?.value || '').trim();
  const password = document.getElementById('auth-password')?.value || '';
  AccountState.authModal.loading = true;
  AccountState.authModal.error = '';
  renderAuthModalBody();

  try {
    const res = await apiFetch('/api/auth?action=login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      AccountState.authModal.loading = false;
      AccountState.authModal.error = res.data.error || 'Usuário ou senha incorretos.';
      renderAuthModalBody();
      return;
    }
    AccountState.user = res.data.user;
    const nextAction = AccountState.authModal.afterLoginAction;
    closeAuthModal();
    updateAuthHeaderUI();
    updateRoleBasedTabs();
    if (typeof updateTopRightFloatingActions === 'function') updateTopRightFloatingActions();
    if (typeof nextAction === 'function') nextAction();
  } catch {
    AccountState.authModal.loading = false;
    AccountState.authModal.error = 'Erro de conexão com o servidor. Tente novamente.';
    renderAuthModalBody();
  }
}

async function submitRegisterForm(e) {
  e.preventDefault();
  const username = (document.getElementById('auth-username')?.value || '').trim();
  const password = document.getElementById('auth-password')?.value || '';
  const confirmPassword = document.getElementById('auth-confirm')?.value || '';

  if (password !== confirmPassword) {
    AccountState.authModal.error = 'As senhas não conferem.';
    renderAuthModalBody();
    return;
  }

  AccountState.authModal.loading = true;
  AccountState.authModal.error = '';
  renderAuthModalBody();

  try {
    const res = await apiFetch('/api/auth?action=register', {
      method: 'POST',
      body: JSON.stringify({ username, password, confirmPassword })
    });
    if (!res.ok) {
      AccountState.authModal.loading = false;
      AccountState.authModal.error = res.data.error || 'Não foi possível criar a conta.';
      renderAuthModalBody();
      return;
    }
    AccountState.user = res.data.user;
    const nextAction = AccountState.authModal.afterLoginAction;
    closeAuthModal();
    updateAuthHeaderUI();
    updateRoleBasedTabs();
    if (typeof updateTopRightFloatingActions === 'function') updateTopRightFloatingActions();
    if (typeof nextAction === 'function') nextAction();
  } catch {
    AccountState.authModal.loading = false;
    AccountState.authModal.error = 'Erro de conexão com o servidor. Tente novamente.';
    renderAuthModalBody();
  }
}

async function submitChangePassword(e) {
  e.preventDefault();
  const currentPassword = document.getElementById('cp-current')?.value || '';
  const newPassword = document.getElementById('cp-new')?.value || '';
  const confirmPassword = document.getElementById('cp-confirm')?.value || '';

  if (newPassword !== confirmPassword) {
    AccountState.authModal.error = 'A confirmação da nova senha não confere.';
    renderAuthModalBody();
    return;
  }

  AccountState.authModal.loading = true;
  AccountState.authModal.error = '';
  renderAuthModalBody();

  try {
    const res = await apiFetch('/api/auth?action=change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
    });
    if (!res.ok) {
      AccountState.authModal.loading = false;
      AccountState.authModal.error = res.data.error || 'Erro ao alterar a senha.';
      renderAuthModalBody();
      return;
    }
    closeAuthModal();
    alert('Senha alterada com sucesso!');
  } catch {
    AccountState.authModal.loading = false;
    AccountState.authModal.error = 'Erro de conexão com o servidor.';
    renderAuthModalBody();
  }
}

async function performLogout() {
  AccountState.menuOpen = false;
  try {
    await apiFetch('/api/auth?action=logout', { method: 'POST' });
  } catch {
    // ignore
  }
  AccountState.user = null;
  AccountState.projects.list = [];
  AccountState.projects.activeProjectId = null;
  AccountState.projects.activeProjectName = '';
  AccountState.adminReports.list = [];
  AccountState.reportModal.myReports = [];
  AccountState.reportModal.myReportsLoaded = false;
  updateAuthHeaderUI();
  updateRoleBasedTabs();
  if (typeof updateTopRightFloatingActions === 'function') updateTopRightFloatingActions();
}

/* ============================================================================
 * REPORTAR (LADO DO USUÁRIO — NOVO REPORT + MEUS REPORTS)
 * ========================================================================== */

function handleReportButtonClick() {
  if (!AccountState.user) {
    openAuthModal('login', 'Você precisa entrar na sua conta para enviar um report ou acompanhar seus reports.', () => {
      openReportModal();
    });
    return;
  }
  openReportModal();
}

function openReportModal() {
  AccountState.reportModal.isOpen = true;
  AccountState.reportModal.error = '';
  AccountState.reportModal.success = '';
  const modal = document.getElementById('report-modal');
  if (modal) modal.classList.remove('hidden');
  renderReportModalBody();
  loadMyReports();
}

function closeReportModal() {
  AccountState.reportModal.isOpen = false;
  const modal = document.getElementById('report-modal');
  if (modal) modal.classList.add('hidden');
}

function switchReportModalTab(tab) {
  AccountState.reportModal.tab = tab;
  AccountState.reportModal.error = '';
  AccountState.reportModal.success = '';
  renderReportModalBody();
  if (tab === 'mine') loadMyReports();
}

function setReportType(t) {
  AccountState.reportModal.type = t;
  renderReportModalBody();
}

function setReportRating(stars) {
  AccountState.reportModal.rating = stars;
  renderReportModalBody();
}

function removeReportDraftImage(imgId) {
  AccountState.reportModal.images = AccountState.reportModal.images.filter((i) => i.id !== imgId);
  renderReportModalBody();
}

async function handleReportImageSelect(fileList) {
  const files = Array.from(fileList || []);
  if (files.length === 0) return;

  const rm = AccountState.reportModal;
  rm.error = '';
  if (rm.images.length + files.length > 7) {
    rm.error = 'Você pode anexar no máximo 7 imagens por report.';
    renderReportModalBody();
    return;
  }

  rm.compressing = true;
  renderReportModalBody();

  const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

  try {
    for (const file of files) {
      if (!allowedTypes.has(file.type)) {
        rm.error = `Arquivo "${file.name}" recusado. Envie apenas imagens PNG, JPG ou WEBP.`;
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        rm.error = `A imagem "${file.name}" excede o limite de 5 MB por arquivo original.`;
        continue;
      }

      const compressed = await compressImageInBrowser(file, 1600, 0.8);
      const currentTotal = rm.images.reduce((s, x) => s + x.size, 0);
      if (currentTotal + compressed.size > 3 * 1024 * 1024) {
        rm.error = 'O total das imagens comprimidas excedeu o limite de 3 MB por report.';
        break;
      }

      rm.images.push({
        id: 'img_' + Math.random().toString(36).slice(2, 9),
        name: file.name,
        dataBase64: compressed.dataUrl,
        size: compressed.size,
        previewUrl: compressed.dataUrl
      });
    }
  } catch (err) {
    rm.error = err.message || 'Erro ao processar uma das imagens selecionadas.';
  } finally {
    rm.compressing = false;
    renderReportModalBody();
  }
}

function compressImageInBrowser(file, maxSide = 1600, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo de imagem.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Arquivo de imagem corrompido ou inválido.'));
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxSide || h > maxSide) {
          if (w >= h) {
            h = Math.round((h * maxSide) / w);
            w = maxSide;
          } else {
            w = Math.round((w * maxSide) / h);
            h = maxSide;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        const outMime = file.type === 'image/png' ? 'image/webp' : (file.type === 'image/webp' ? 'image/webp' : 'image/jpeg');
        let q = quality;
        let dataUrl = canvas.toDataURL(outMime, q);
        let byteSize = Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);

        // Tenta aproximar de ~600 KB quando possível
        while (byteSize > 620 * 1024 && q > 0.45) {
          q -= 0.1;
          dataUrl = canvas.toDataURL(outMime, q);
          byteSize = Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
        }

        resolve({ dataUrl, size: byteSize });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function loadMyReports() {
  if (!AccountState.user) return;
  try {
    const res = await apiFetch('/api/reports?scope=mine', { method: 'GET' });
    if (res.ok) {
      AccountState.reportModal.myReports = res.data.reports || [];
      AccountState.reportModal.quota = res.data.quota || null;
      AccountState.reportModal.myReportsLoaded = true;
      if (AccountState.reportModal.isOpen) renderReportModalBody();
    }
  } catch {
    // ignore
  }
}

async function submitNewReport(e) {
  e.preventDefault();
  const rm = AccountState.reportModal;
  rm.error = '';
  rm.success = '';

  const msg = (rm.message || '').trim();
  if (msg.length < 10 || msg.length > 2000) {
    rm.error = 'A mensagem deve ter entre 10 e 2000 caracteres.';
    renderReportModalBody();
    return;
  }

  rm.loading = true;
  renderReportModalBody();

  const payload = {
    type: rm.type,
    title: (rm.title || '').trim(),
    message: msg,
    rating: rm.type === 'rating' ? rm.rating : null,
    images: rm.images.map((i) => ({ dataBase64: i.dataBase64 }))
  };

  if (rm.type === 'bug') {
    payload.techInfo = {
      browser: navigator.userAgent.slice(0, 110),
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      tab: AppState.mode || 'production'
    };
  }

  try {
    const res = await apiFetch('/api/reports', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      rm.loading = false;
      rm.error = res.data.error || 'Não foi possível enviar o report. Seus dados foram mantidos para tentar novamente.';
      renderReportModalBody();
      return;
    }

    // Limpa rascunho apenas em caso de sucesso
    rm.loading = false;
    rm.title = '';
    rm.message = '';
    rm.images = [];
    rm.success = 'Report enviado com sucesso! Obrigado por contribuir com o Satisfactory+.';
    await loadMyReports();
    renderReportModalBody();
  } catch {
    rm.loading = false;
    rm.error = 'Falha na conexão ao enviar o report. Seu texto e imagens foram preservados — tente novamente.';
    renderReportModalBody();
  }
}

function reportTypeLabel(t) {
  if (t === 'bug') return '🐛 Bug';
  if (t === 'suggestion') return '💡 Sugestão de melhoria';
  if (t === 'rating') return '⭐ Avaliação';
  return t;
}

function renderReportModalBody() {
  const body = document.getElementById('report-modal-body');
  if (!body) return;
  const rm = AccountState.reportModal;
  const q = rm.quota;
  const totalImgBytes = rm.images.reduce((s, i) => s + i.size, 0);

  const quotaBanner = q ? `
    <div class="report-quota-bar">
      <span>📊 Restantes nas últimas 24h: <strong>${q.remaining24h}/${q.maxPer24h}</strong></span>
      <span>🖼️ Cota de imagens: <strong>${fmtBytes(q.usedImageBytes)} / ${fmtBytes(q.maxImageQuotaBytes)}</strong></span>
    </div>
  ` : '';

  const limitReachedNote = (q && q.remaining24h === 0 && q.nextAvailableAt)
    ? `<div class="form-alert warn">⏳ Você atingiu o limite de 10 reports em 24h. Poderá enviar novamente em <strong>${fmtDateBR(q.nextAvailableAt)}</strong>.</div>`
    : '';

  body.innerHTML = `
    <div class="mode-switch-mini">
      <button type="button" class="mini-pill ${rm.tab === 'new' ? 'active' : ''}" onclick="switchReportModalTab('new')">✏️ Novo report</button>
      <button type="button" class="mini-pill ${rm.tab === 'mine' ? 'active' : ''}" onclick="switchReportModalTab('mine')">📋 Meus reports (${rm.myReports.length})</button>
    </div>

    <div class="report-expiry-notice">🗑️ Reports são apagados automaticamente após 14 dias.</div>
    ${quotaBanner}

    ${rm.tab === 'new' ? `
      ${limitReachedNote}
      ${rm.error ? `<div class="form-alert error">⚠️ ${escText(rm.error)}</div>` : ''}
      ${rm.success ? `<div class="form-alert ok">✅ ${escText(rm.success)}</div>` : ''}

      <form onsubmit="submitNewReport(event)" class="account-form">
        <div class="field-group">
          <label>Tipo do report</label>
          <div class="btn-group-row">
            <button type="button" class="seg-btn ${rm.type === 'bug' ? 'active' : ''}" onclick="setReportType('bug')">🐛 Bug</button>
            <button type="button" class="seg-btn ${rm.type === 'suggestion' ? 'active' : ''}" onclick="setReportType('suggestion')">💡 Sugestão</button>
            <button type="button" class="seg-btn ${rm.type === 'rating' ? 'active' : ''}" onclick="setReportType('rating')">⭐ Avaliação</button>
          </div>
        </div>

        ${rm.type === 'rating' ? `
          <div class="field-group">
            <label>Nota (obrigatória — 1 a 5 estrelas)</label>
            <div class="rating-stars-row">
              ${[1, 2, 3, 4, 5].map((n) => `
                <button type="button" class="star-btn ${n <= rm.rating ? 'active' : ''}" onclick="setReportRating(${n})">★</button>
              `).join('')}
              <span class="rating-label">${rm.rating}/5</span>
            </div>
          </div>
        ` : ''}

        <div class="field-group">
          <label for="rep-title">Título curto (opcional)</label>
          <input
            id="rep-title"
            type="text"
            class="sidebar-input"
            maxlength="120"
            value="${escText(rm.title)}"
            oninput="AccountState.reportModal.title = this.value"
            placeholder="Resumo rápido do assunto..."
          />
        </div>

        <div class="field-group">
          <label for="rep-message">Mensagem (obrigatória — 10 a 2000 caracteres)</label>
          <textarea
            id="rep-message"
            class="sidebar-input report-textarea"
            rows="4"
            minlength="10"
            maxlength="2000"
            required
            oninput="AccountState.reportModal.message = this.value; const c=document.getElementById('rep-char-count'); if(c) c.textContent=this.value.length+'/2000';"
            placeholder="Descreva o problema, sugestão ou avaliação com detalhes..."
          >${escText(rm.message)}</textarea>
          <div class="field-hint-row">
            <span>${rm.type === 'bug' ? 'ℹ️ Para bugs, navegador, resolução da tela e aba atual são anexados automaticamente (sem dados pessoais).' : ''}</span>
            <span id="rep-char-count">${rm.message.length}/2000</span>
          </div>
        </div>

        <div class="field-group">
          <label>Imagens (até 7 • PNG, JPG ou WEBP • máx. 3 MB total após compressão)</label>
          <label class="file-upload-btn">
            <span>${rm.compressing ? '⏳ Comprimindo imagens...' : `📎 Selecionar imagens (${rm.images.length}/7 • ${fmtBytes(totalImgBytes)})`}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              style="display:none;"
              onchange="handleReportImageSelect(this.files); this.value='';"
              ${rm.images.length >= 7 || rm.compressing ? 'disabled' : ''}
            />
          </label>
          ${rm.images.length > 0 ? `
            <div class="report-thumbs-grid">
              ${rm.images.map((img) => `
                <div class="report-thumb-card">
                  <img src="${img.previewUrl}" alt="Prévia" onclick="openImageLightbox('${img.previewUrl}')" />
                  <small>${fmtBytes(img.size)}</small>
                  <button type="button" class="thumb-remove-btn" onclick="removeReportDraftImage('${img.id}')" title="Remover imagem">✕</button>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>

        <button type="submit" class="btn-mount-flow ready" ${rm.loading || rm.compressing || (q && q.remaining24h === 0) ? 'disabled' : ''}>
          ${rm.loading ? '⏳ Enviando report...' : '📣 Enviar Report'}
        </button>
      </form>
    ` : `
      <div class="my-reports-list">
        ${!rm.myReportsLoaded ? '<div class="picker-empty">⏳ Carregando seus reports...</div>' : (
          rm.myReports.length === 0
            ? '<div class="picker-empty">Você ainda não enviou nenhum report nos últimos 14 dias.</div>'
            : rm.myReports.map((r) => `
              <div class="report-item-card">
                <div class="report-card-head">
                  <span class="lib-badge">${reportTypeLabel(r.type)}</span>
                  ${r.rating ? `<span class="report-stars-tag">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)} (${r.rating}/5)</span>` : ''}
                  <span class="report-date-tag">${fmtDateBR(r.createdAt)} • ⏳ Expira em ${r.daysRemaining} dia(s)</span>
                </div>
                ${r.title ? `<strong class="report-card-title">${escText(r.title)}</strong>` : ''}
                <p class="report-card-msg">${escText(r.message)}</p>
                ${(r.images && r.images.length > 0) ? `
                  <div class="report-thumbs-grid">
                    ${r.images.map((img) => `
                      <div class="report-thumb-card">
                        <img src="${escText(img.url)}" alt="Anexo" onclick="openImageLightbox('${escText(img.url)}')" />
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('')
        )}
      </div>
    `}
  `;
}

function openImageLightbox(src) {
  const modal = document.getElementById('image-lightbox-modal');
  const img = document.getElementById('image-lightbox-img');
  if (!modal || !img) return;
  img.src = src;
  modal.classList.remove('hidden');
}

function closeImageLightbox() {
  const modal = document.getElementById('image-lightbox-modal');
  if (modal) modal.classList.add('hidden');
}

/* ============================================================================
 * ABA "REPORTS" (SOMENTE ADMIN)
 * ========================================================================== */

async function loadAdminReports() {
  AccountState.adminReports.loading = true;
  AccountState.adminReports.error = '';
  renderAdminReportsWorkspace();

  try {
    const res = await apiFetch('/api/reports?scope=all', { method: 'GET' });
    if (!res.ok) {
      AccountState.adminReports.error = res.data.error || 'Acesso negado ao painel de reports.';
      AccountState.adminReports.list = [];
    } else {
      AccountState.adminReports.list = res.data.reports || [];
    }
  } catch {
    AccountState.adminReports.error = 'Erro de conexão ao carregar os reports.';
  } finally {
    AccountState.adminReports.loading = false;
    renderAdminReportsWorkspace();
  }
}

function getFilteredAdminReports() {
  const st = AccountState.adminReports;
  const now = Date.now();
  const q = Solver.normalizeText(st.searchQuery || '');
  const uFilter = Solver.normalizeText(st.filterUser || '');

  return (st.list || []).filter((r) => {
    if (st.filterType !== 'all' && r.type !== st.filterType) return false;
    if (uFilter && !Solver.normalizeText(r.username || '').includes(uFilter)) return false;
    if (st.filterPeriod !== 'all') {
      const ageMs = now - new Date(r.createdAt).getTime();
      if (st.filterPeriod === '24h' && ageMs > 24 * 60 * 60 * 1000) return false;
      if (st.filterPeriod === '7d' && ageMs > 7 * 24 * 60 * 60 * 1000) return false;
      if (st.filterPeriod === '14d' && ageMs > 14 * 24 * 60 * 60 * 1000) return false;
    }
    if (q) {
      const hay = Solver.normalizeText(`${r.id} ${r.username} ${r.title || ''} ${r.message || ''}`);
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderAdminReportsMode(sidebarEl, emptyOverlay) {
  emptyOverlay.classList.add('hidden');
  emptyOverlay.innerHTML = '';

  const st = AccountState.adminReports;
  sidebarEl.innerHTML = `
    <div class="sidebar-step-block">
      <div class="step-header-row">
        <span class="step-badge">ADMIN</span>
        <h4>Filtros de Reports</h4>
      </div>

      <div class="field-group">
        <label>Buscar por texto</label>
        <input
          type="text"
          class="sidebar-input"
          placeholder="🔍 Buscar mensagem, título ou ID..."
          value="${escText(st.searchQuery)}"
          oninput="AccountState.adminReports.searchQuery = this.value; renderAdminReportsWorkspace();"
        />
      </div>

      <div class="field-group">
        <label>Filtrar por usuário</label>
        <input
          type="text"
          class="sidebar-input"
          placeholder="Nome de usuário..."
          value="${escText(st.filterUser)}"
          oninput="AccountState.adminReports.filterUser = this.value; renderAdminReportsWorkspace();"
        />
      </div>

      <div class="field-group">
        <label>Tipo</label>
        <select class="sidebar-select" onchange="AccountState.adminReports.filterType = this.value; renderAdminReportsWorkspace();">
          <option value="all" ${st.filterType === 'all' ? 'selected' : ''}>Todos os tipos</option>
          <option value="bug" ${st.filterType === 'bug' ? 'selected' : ''}>🐛 Bug</option>
          <option value="suggestion" ${st.filterType === 'suggestion' ? 'selected' : ''}>💡 Sugestão</option>
          <option value="rating" ${st.filterType === 'rating' ? 'selected' : ''}>⭐ Avaliação</option>
        </select>
      </div>

      <div class="field-group">
        <label>Período</label>
        <select class="sidebar-select" onchange="AccountState.adminReports.filterPeriod = this.value; renderAdminReportsWorkspace();">
          <option value="all" ${st.filterPeriod === 'all' ? 'selected' : ''}>Todos (últimos 14 dias)</option>
          <option value="24h" ${st.filterPeriod === '24h' ? 'selected' : ''}>Últimas 24 horas</option>
          <option value="7d" ${st.filterPeriod === '7d' ? 'selected' : ''}>Últimos 7 dias</option>
        </select>
      </div>

      <button type="button" class="btn-small-accent" style="width:100%; padding:8px;" onclick="loadAdminReports()">🔄 Atualizar Lista</button>
    </div>

    <div class="sidebar-step-block">
      <div class="step-header-row">
        <span class="step-badge">EXPORTAR</span>
        <h4>Download em .TXT</h4>
      </div>
      <button type="button" class="btn-mount-flow ready" onclick="downloadAdminReportsTxt(false)">📥 Baixar Filtrados (.txt)</button>
      <button type="button" class="btn-icon-action" style="width:100%; padding:9px;" onclick="downloadAdminReportsTxt(true)">📄 Baixar Todos (.txt)</button>
    </div>
  `;

  loadAdminReports();
}

function renderAdminReportsWorkspace() {
  const view = document.getElementById('reports-workspace-view');
  if (!view) return;
  const st = AccountState.adminReports;
  const filtered = getFilteredAdminReports();

  view.innerHTML = `
    <div class="lib-workspace-header">
      <div>
        <h2>🛡️ Painel de Reports (Admin)</h2>
        <span>Exibindo ${filtered.length} de ${st.list.length} report(s) ativo(s) • Expiração automática após 14 dias</span>
      </div>
    </div>

    ${st.error ? `<div class="form-alert error">⚠️ ${escText(st.error)}</div>` : ''}
    ${st.loading ? '<div class="picker-empty">⏳ Carregando reports...</div>' : `
      <div class="admin-reports-stack">
        ${filtered.length === 0 ? '<div class="picker-empty">Nenhum report encontrado com os filtros atuais.</div>' : filtered.map((r) => `
          <div class="report-item-card admin-card">
            <div class="report-card-head">
              <div class="report-head-left">
                <span class="lib-badge">${reportTypeLabel(r.type)}</span>
                <strong class="report-user-name">👤 ${escText(r.username)}</strong>
                ${r.rating ? `<span class="report-stars-tag">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)} (${r.rating}/5)</span>` : ''}
                <span class="report-date-tag">#${escText(r.id)} • ${fmtDateBR(r.createdAt)} • ⏳ ${r.daysRemaining} dia(s)</span>
              </div>
              <div class="report-head-actions">
                <button type="button" class="btn-icon-action" onclick="downloadSingleReportTxt('${escText(r.id)}')">📄 .txt</button>
                ${(r.images && r.images.length > 0) ? `<button type="button" class="btn-icon-action" onclick="downloadReportImages('${escText(r.id)}')">🖼️ Baixar imagens</button>` : ''}
                <button type="button" class="btn-icon-danger" onclick="deleteAdminReport('${escText(r.id)}')" title="Excluir report">🗑️</button>
              </div>
            </div>

            ${r.title ? `<strong class="report-card-title">${escText(r.title)}</strong>` : ''}
            <p class="report-card-msg">${escText(r.message)}</p>

            ${r.techInfo ? `
              <div class="report-tech-box">
                <strong>Info técnica:</strong> Aba: ${escText(r.techInfo.tab)} • Tela: ${escText(r.techInfo.viewport)} • Navegador: ${escText(r.techInfo.browser)}
              </div>
            ` : ''}

            ${(r.images && r.images.length > 0) ? `
              <div class="report-thumbs-grid">
                ${r.images.map((img) => `
                  <div class="report-thumb-card">
                    <img src="${escText(img.url)}" alt="Anexo do report" onclick="openImageLightbox('${escText(img.url)}')" />
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `}
  `;
}

function buildReportsTxtContent(reportsList) {
  const origin = window.location.origin;
  const header = [
    '============================================================',
    'SATISFACTORY+ — EXPORTAÇÃO DE REPORTS',
    `Data de geração: ${fmtDateBR(new Date().toISOString())}`,
    `Total de reports: ${reportsList.length}`,
    '============================================================',
    ''
  ].join('\n');

  const typeNamePt = (t) => (t === 'bug' ? 'Bug' : t === 'suggestion' ? 'Sugestão' : 'Avaliação');

  const blocks = reportsList.map((r) => {
    const lines = [
      `Report #${r.id}`,
      `Usuário: ${r.username}`,
      `Data: ${fmtDateBR(r.createdAt)}`,
      `Tipo: ${typeNamePt(r.type)}`
    ];
    if (r.type === 'rating' && r.rating) {
      lines.push(`Nota: ${r.rating}/5`);
    }
    if (r.title) {
      lines.push(`Título: ${r.title}`);
    }
    if (r.techInfo) {
      lines.push(`Info técnica: Aba=${r.techInfo.tab} | Tela=${r.techInfo.viewport} | Navegador=${r.techInfo.browser}`);
    }
    lines.push(`Mensagem: ${r.message}`);
    const imgs = r.images || [];
    if (imgs.length > 0) {
      lines.push(`Imagens (${imgs.length}):`);
      imgs.forEach((img, idx) => {
        const fullUrl = img.url.startsWith('http') ? img.url : `${origin}${img.url}`;
        lines.push(`  ${idx + 1}. ${fullUrl}`);
      });
    } else {
      lines.push('Imagens (0): Nenhuma');
    }
    lines.push('------------------------------------------------------------');
    return lines.join('\n');
  });

  return header + blocks.join('\n\n') + '\n';
}

function triggerTxtDownload(filename, textContent) {
  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 150);
}

function downloadAdminReportsTxt(all = false) {
  const list = all ? AccountState.adminReports.list : getFilteredAdminReports();
  if (!list.length) {
    alert('Não há reports para baixar.');
    return;
  }
  const content = buildReportsTxtContent(list);
  const stamp = new Date().toISOString().slice(0, 10);
  triggerTxtDownload(`satisfactory-plus-reports-${all ? 'todos' : 'filtrados'}-${stamp}.txt`, content);
}

function downloadSingleReportTxt(reportId) {
  const rep = AccountState.adminReports.list.find((r) => r.id === reportId);
  if (!rep) return;
  triggerTxtDownload(`report-${rep.id}.txt`, buildReportsTxtContent([rep]));
}

function downloadReportImages(reportId) {
  const rep = AccountState.adminReports.list.find((r) => r.id === reportId);
  if (!rep || !rep.images || rep.images.length === 0) return;
  rep.images.forEach((img, idx) => {
    const a = document.createElement('a');
    a.href = img.url;
    a.download = `${rep.id}-imagem-${idx + 1}`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
}

async function deleteAdminReport(reportId) {
  if (!confirm('Tem certeza que deseja excluir este report e todas as imagens anexadas?')) return;
  const res = await apiFetch(`/api/reports?id=${encodeURIComponent(reportId)}`, { method: 'DELETE' });
  if (!res.ok) {
    alert(res.data.error || 'Erro ao excluir report.');
    return;
  }
  AccountState.adminReports.list = AccountState.adminReports.list.filter((r) => r.id !== reportId);
  renderAdminReportsWorkspace();
}

/* ============================================================================
 * PROJETOS SALVOS (ABA "PROJETOS" + BOTÃO SALVAR / ATUALIZAR)
 * ========================================================================== */

function renderSaveProjectButtonsHtml(sourceMode) {
  const activeId = AccountState.projects.activeProjectId;
  const activeMode = AccountState.projects.activeProjectMode;
  const isEditingSaved = Boolean(AccountState.user && activeId && activeMode === sourceMode);

  if (isEditingSaved) {
    return `
      <div class="save-project-actions-row">
        <button type="button" class="btn-save-proj primary" onclick="quickUpdateActiveProject('${sourceMode}')" title="Sobrescrever o projeto aberto com as alterações atuais">
          💾 Atualizar projeto
        </button>
        <button type="button" class="btn-save-proj" onclick="handleSaveProjectClick('${sourceMode}', true)" title="Salvar como um novo projeto">
          ➕ Salvar como novo
        </button>
      </div>
    `;
  }

  return `
    <div class="save-project-actions-row">
      <button type="button" class="btn-save-proj" onclick="handleSaveProjectClick('${sourceMode}', false)" title="Salvar esta linha na sua conta">
        💾 Salvar
      </button>
    </div>
  `;
}

function suggestProjectName(sourceMode) {
  if (sourceMode === 'free') {
    const cnt = (AppState.free.blocks || []).length;
    return `Fábrica Livre (${cnt} blocos)`;
  }
  if (AppState.production.driver === 'input' && AppState.push.targetItemId) {
    const it = Solver.getItem(AppState.push.targetItemId);
    return it ? `Linha de ${it.name}` : 'Linha de Produção';
  }
  if (AppState.production.driver === 'product' && AppState.pull.targets.length > 0) {
    const first = AppState.pull.targets[0];
    const it = Solver.getItem(first.itemId);
    return it ? `${it.name} (${fmt(first.rate, 0)}/m)` : 'Linha de Produção';
  }
  return 'Novo Projeto Satisfactory+';
}

function buildProjectSnapshot(sourceMode) {
  let summary = '';
  if (sourceMode === 'free') {
    summary = `Modo Livre • ${(AppState.free.blocks || []).length} bloco(s) • ${(AppState.free.customEdges || []).length} conexão(ões)`;
  } else if (AppState.production.driver === 'input') {
    const tIt = AppState.push.targetItemId ? Solver.getItem(AppState.push.targetItemId) : null;
    summary = `Produção (Entrada ➔ Produto) • ${tIt ? tIt.name : 'Sem produto'}`;
  } else {
    const names = AppState.pull.targets.map((t) => `${fmt(t.rate, 0)}/m ${Solver.getItem(t.itemId)?.name || ''}`).join(', ');
    summary = `Produção (Meta) • ${names}`;
  }

  const payload = {
    version: 1,
    sourceMode,
    orientation: AppState.orientation,
    showAllMachines: AppState.showAllMachines,
    is3DView: Boolean(AppState.canvas.is3DView),
    customPositions: JSON.parse(JSON.stringify(AppState.canvas.customPositions || {})),
    production: JSON.parse(JSON.stringify(AppState.production)),
    push: JSON.parse(JSON.stringify(AppState.push)),
    pull: JSON.parse(JSON.stringify(AppState.pull)),
    free: JSON.parse(JSON.stringify(AppState.free))
  };

  return { sourceMode, summary, payload };
}

function handleSaveProjectClick(sourceMode, forceNew = false) {
  if (!AccountState.user) {
    openAuthModal('login', 'Entre na sua conta para salvar e acessar seus projetos de qualquer lugar.', () => {
      handleSaveProjectClick(sourceMode, forceNew);
    });
    return;
  }

  AccountState.projects.saveModal = {
    isOpen: true,
    mode: 'save',
    sourceMode,
    renameProjectId: null,
    name: forceNew ? `${AccountState.projects.activeProjectName || suggestProjectName(sourceMode)} (cópia)`.slice(0, 60) : suggestProjectName(sourceMode),
    error: '',
    duplicatePrompt: false,
    loading: false
  };
  const modal = document.getElementById('save-project-modal');
  if (modal) modal.classList.remove('hidden');
  renderSaveProjectModalBody();
}

function openRenameProjectModal(projectId, currentName) {
  AccountState.projects.saveModal = {
    isOpen: true,
    mode: 'rename',
    sourceMode: 'production',
    renameProjectId: projectId,
    name: currentName || '',
    error: '',
    duplicatePrompt: false,
    loading: false
  };
  const modal = document.getElementById('save-project-modal');
  if (modal) modal.classList.remove('hidden');
  renderSaveProjectModalBody();
}

function closeSaveProjectModal() {
  AccountState.projects.saveModal.isOpen = false;
  const modal = document.getElementById('save-project-modal');
  if (modal) modal.classList.add('hidden');
}

function renderSaveProjectModalBody() {
  const titleEl = document.getElementById('save-project-title');
  const body = document.getElementById('save-project-body');
  if (!body) return;
  const sm = AccountState.projects.saveModal;
  const isRename = sm.mode === 'rename';
  if (titleEl) titleEl.textContent = isRename ? '✏️ Renomear Projeto' : '💾 Salvar Projeto';

  body.innerHTML = `
    ${sm.error ? `<div class="form-alert error">⚠️ ${escText(sm.error)}</div>` : ''}
    <form onsubmit="submitSaveOrRenameProject(event, false)" class="account-form">
      <div class="field-group">
        <label for="save-proj-name">Nome do projeto (1 a 60 caracteres)</label>
        <input
          id="save-proj-name"
          type="text"
          class="sidebar-input"
          required
          minlength="1"
          maxlength="60"
          value="${escText(sm.name)}"
          oninput="AccountState.projects.saveModal.name = this.value; AccountState.projects.saveModal.duplicatePrompt = false;"
        />
      </div>

      ${sm.duplicatePrompt ? `
        <div class="form-alert warn">
          Já existe um projeto com este nome. Escolha outro nome acima ou clique em <strong>Atualizar existente</strong> para sobrescrevê-lo.
        </div>
        <div class="field-row-2">
          <button type="submit" class="btn-icon-action" style="padding:10px;" ${sm.loading ? 'disabled' : ''}>Tentar outro nome</button>
          <button type="button" class="btn-mount-flow ready" onclick="submitSaveOrRenameProject(event, true)" ${sm.loading ? 'disabled' : ''}>🔄 Atualizar existente</button>
        </div>
      ` : `
        <button type="submit" class="btn-mount-flow ready" ${sm.loading ? 'disabled' : ''}>
          ${sm.loading ? '⏳ Salvando...' : (isRename ? '✅ Salvar Novo Nome' : '💾 Salvar na Nuvem')}
        </button>
      `}
    </form>
  `;
}

async function submitSaveOrRenameProject(e, overwrite = false) {
  if (e && e.preventDefault) e.preventDefault();
  const sm = AccountState.projects.saveModal;
  const name = (sm.name || '').trim();
  if (name.length < 1 || name.length > 60) {
    sm.error = 'O nome do projeto deve ter entre 1 e 60 caracteres.';
    renderSaveProjectModalBody();
    return;
  }

  sm.loading = true;
  sm.error = '';
  renderSaveProjectModalBody();

  try {
    if (sm.mode === 'rename') {
      const res = await apiFetch(`/api/projects?id=${encodeURIComponent(sm.renameProjectId)}`, {
        method: 'PUT',
        body: JSON.stringify({ name })
      });
      if (!res.ok) {
        sm.loading = false;
        sm.error = res.data.error || 'Erro ao renomear projeto.';
        renderSaveProjectModalBody();
        return;
      }
      if (AccountState.projects.activeProjectId === sm.renameProjectId) {
        AccountState.projects.activeProjectName = name;
      }
      closeSaveProjectModal();
      loadUserProjects();
      return;
    }

    const snap = buildProjectSnapshot(sm.sourceMode);
    const res = await apiFetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        name,
        sourceMode: snap.sourceMode,
        summary: snap.summary,
        payload: snap.payload,
        overwrite
      })
    });

    if (res.status === 409 && res.data.code === 'DUPLICATE_NAME') {
      sm.loading = false;
      sm.duplicatePrompt = true;
      renderSaveProjectModalBody();
      return;
    }
    if (!res.ok) {
      sm.loading = false;
      sm.error = res.data.error || 'Erro ao salvar projeto.';
      renderSaveProjectModalBody();
      return;
    }

    AccountState.projects.activeProjectId = res.data.project.id;
    AccountState.projects.activeProjectName = res.data.project.name;
    AccountState.projects.activeProjectMode = sm.sourceMode;
    closeSaveProjectModal();
    if (typeof updateTopRightFloatingActions === 'function') updateTopRightFloatingActions();
    alert(`Projeto "${res.data.project.name}" salvo com sucesso!`);
  } catch {
    sm.loading = false;
    sm.error = 'Erro de conexão ao salvar o projeto.';
    renderSaveProjectModalBody();
  }
}

async function quickUpdateActiveProject(sourceMode) {
  const id = AccountState.projects.activeProjectId;
  if (!id || !AccountState.user) return;
  const snap = buildProjectSnapshot(sourceMode);
  const res = await apiFetch(`/api/projects?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      sourceMode: snap.sourceMode,
      summary: snap.summary,
      payload: snap.payload
    })
  });
  if (!res.ok) {
    alert(res.data.error || 'Não foi possível atualizar o projeto.');
    return;
  }
  alert(`Projeto "${AccountState.projects.activeProjectName}" atualizado com sucesso!`);
}

async function loadUserProjects() {
  if (!AccountState.user) return;
  AccountState.projects.loading = true;
  AccountState.projects.error = '';
  renderProjectsWorkspace();

  try {
    const res = await apiFetch('/api/projects', { method: 'GET' });
    if (!res.ok) {
      AccountState.projects.error = res.data.error || 'Erro ao carregar projetos.';
      AccountState.projects.list = [];
    } else {
      AccountState.projects.list = res.data.projects || [];
      AccountState.projects.maxProjects = res.data.maxProjects || 50;
    }
  } catch {
    AccountState.projects.error = 'Erro de conexão ao carregar projetos.';
  } finally {
    AccountState.projects.loading = false;
    renderProjectsWorkspace();
  }
}

async function openSavedProjectInSpaces(projectId) {
  const res = await apiFetch(`/api/projects?id=${encodeURIComponent(projectId)}`, { method: 'GET' });
  if (!res.ok || !res.data.project) {
    alert(res.data.error || 'Não foi possível abrir este projeto.');
    return;
  }

  const proj = res.data.project;
  const p = proj.payload || {};
  const targetMode = p.sourceMode === 'free' ? 'free' : 'production';

  AppState.orientation = p.orientation === 'LR' ? 'LR' : 'TB';
  AppState.showAllMachines = typeof p.showAllMachines === 'boolean' ? p.showAllMachines : true;
  AppState.canvas.is3DView = Boolean(p.is3DView);
  AppState.canvas.customPositions = p.customPositions || {};

  if (p.production) AppState.production = p.production;
  if (p.push) AppState.push = p.push;
  if (p.pull) AppState.pull = p.pull;
  if (p.free) AppState.free = p.free;

  if (targetMode === 'production') {
    AppState.production.mounted = true;
  }

  // Sincroniza botões de orientação, 3D e expansão
  const btnLR = document.getElementById('orient-lr');
  const btnTB = document.getElementById('orient-tb');
  if (btnLR) btnLR.classList.toggle('active', AppState.orientation === 'LR');
  if (btnTB) btnTB.classList.toggle('active', AppState.orientation === 'TB');
  const btn3d = document.getElementById('btn-toggle-3d');
  const vp = document.getElementById('spaces-viewport');
  if (btn3d) {
    btn3d.classList.toggle('active', AppState.canvas.is3DView);
    btn3d.textContent = AppState.canvas.is3DView ? '🏢 Visão 3D: SIM' : '🏢 Visão 3D: NÃO';
  }
  if (vp) vp.classList.toggle('view-3d', AppState.canvas.is3DView);
  const btnExp = document.getElementById('btn-toggle-expand');
  if (btnExp) {
    btnExp.classList.toggle('active', AppState.showAllMachines);
    btnExp.textContent = AppState.showAllMachines ? '🏭 Todas Máquinas: SIM' : '📦 Todas Máquinas: NÃO';
  }

  AccountState.projects.activeProjectId = proj.id;
  AccountState.projects.activeProjectName = proj.name;
  AccountState.projects.activeProjectMode = targetMode;

  switchMode(targetMode);
}

async function deleteSavedProject(projectId, projectName) {
  if (!confirm(`Tem certeza que deseja remover o projeto "${projectName}"? Essa ação não pode ser desfeita.`)) return;
  const res = await apiFetch(`/api/projects?id=${encodeURIComponent(projectId)}`, { method: 'DELETE' });
  if (!res.ok) {
    alert(res.data.error || 'Erro ao remover o projeto.');
    return;
  }
  if (AccountState.projects.activeProjectId === projectId) {
    AccountState.projects.activeProjectId = null;
    AccountState.projects.activeProjectName = '';
  }
  AccountState.projects.list = AccountState.projects.list.filter((p) => p.id !== projectId);
  renderProjectsWorkspace();
}

function renderProjectsMode(sidebarEl, emptyOverlay) {
  emptyOverlay.classList.add('hidden');
  emptyOverlay.innerHTML = '';

  const pState = AccountState.projects;
  sidebarEl.innerHTML = `
    <div class="sidebar-step-block">
      <div class="step-header-row">
        <span class="step-badge">PROJETOS</span>
        <h4>Suas Fábricas Salvas</h4>
      </div>
      <p class="step-help-text">
        Salve qualquer linha da aba <strong>🏭 Produção</strong> ou <strong>🛠️ Livre</strong> e reabra exatamente com todas as receitas, máquinas, conexões, clock e posições dos cards.
      </p>
      <button type="button" class="btn-small-accent" style="width:100%; padding:8px;" onclick="loadUserProjects()">🔄 Atualizar Projetos</button>
    </div>
  `;

  loadUserProjects();
}

function renderProjectsWorkspace() {
  const view = document.getElementById('projects-workspace-view');
  if (!view) return;
  const pState = AccountState.projects;

  view.innerHTML = `
    <div class="lib-workspace-header">
      <div>
        <h2>📁 Meus Projetos</h2>
        <span>${pState.list.length} / ${pState.maxProjects} projeto(s) salvo(s) na sua conta</span>
      </div>
    </div>

    ${pState.error ? `<div class="form-alert error">⚠️ ${escText(pState.error)}</div>` : ''}
    ${pState.loading ? '<div class="picker-empty">⏳ Carregando projetos...</div>' : `
      <div class="projects-cards-grid">
        ${pState.list.length === 0 ? `
          <div class="picker-empty">
            Você ainda não salvou nenhum projeto. Monte uma linha na aba <strong>🏭 Produção</strong> ou <strong>🛠️ Livre</strong> e clique em <strong>💾 Salvar</strong>!
          </div>
        ` : pState.list.map((p) => `
          <div class="project-saved-card ${pState.activeProjectId === p.id ? 'is-active' : ''}">
            <div class="project-card-top">
              <span class="lib-badge">${p.sourceMode === 'free' ? '🛠️ Modo Livre' : '🏭 Produção'}</span>
              <small>Atualizado: ${fmtDateBR(p.updatedAt)}</small>
            </div>
            <h3>${escText(p.name)}</h3>
            <p class="project-card-summary">${escText(p.summary || 'Projeto salvo do Satisfactory+')}</p>
            <div class="project-card-dates">Criado em: ${fmtDateBR(p.createdAt)}</div>
            <div class="project-card-actions">
              <button type="button" class="btn-mount-flow ready" style="padding:8px 12px; font-size:12px;" onclick="openSavedProjectInSpaces('${escText(p.id)}')">🚀 Abrir no Spaces</button>
              <button type="button" class="btn-icon-action" onclick="openRenameProjectModal('${escText(p.id)}', '${escText(p.name)}')">✏️ Renomear</button>
              <button type="button" class="btn-icon-danger" onclick="deleteSavedProject('${escText(p.id)}', '${escText(p.name)}')" title="Remover projeto">🗑️</button>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}
