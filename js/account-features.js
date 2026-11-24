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
    unreadCount: 0,
    quota: null
  },

  adminReports: {
    list: [],
    loading: false,
    error: '',
    view: 'active', // 'active' (novo + lido) | 'history' (resolvido)
    filterType: 'all',
    filterStatus: 'all', // 'all' | 'novo' | 'lido' | 'resolvido'
    filterUser: '',
    filterPeriod: 'all', // 'all' | '24h' | '7d' | '14d'
    searchQuery: '',
    newCount: 0,
    replyingId: null,
    replyDraft: '',
    savingId: null
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
  const { silent401 = false, timeoutMs = 20000, ...fetchOpts } = options;
  const headers = {
    'X-Requested-With': 'SatisfactoryPlus',
    ...(fetchOpts.body ? { 'Content-Type': 'application/json' } : {}),
    ...(fetchOpts.headers || {})
  };
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  let res;
  try {
    res = await fetch(url, {
      credentials: 'same-origin',
      ...fetchOpts,
      headers,
      ...(controller ? { signal: controller.signal } : {})
    });
  } catch (err) {
    if (timer) clearTimeout(timer);
    const isTimeout = err && err.name === 'AbortError';
    return {
      ok: false,
      status: 0,
      data: {
        error: isTimeout
          ? 'O servidor demorou para responder. Tente novamente em instantes.'
          : 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'
      }
    };
  }
  if (timer) clearTimeout(timer);
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  const wasLoggedIn = Boolean(AccountState.user);
  if (res.status === 401 && AccountState.user) {
    // Sessão expirou no servidor sem perder o estado atual do usuário na tela
    AccountState.user = null;
    try { localStorage.removeItem('splus_user_cache'); } catch {}
    updateAuthHeaderUI();
    updateRoleBasedTabs();
    if (!silent401) {
      openAuthModal('login', 'Sua sessão expirou. Entre novamente para continuar — seu trabalho atual não foi perdido.');
    }
  }
  if (!String(url).includes('/api/analytics') && typeof trackAnalyticsError === 'function') {
    if (res.status === 401 && wasLoggedIn) {
      trackAnalyticsError('auth_session_expired', 'Sessão expirada');
    } else if (String(url).includes('/api/auth') && res.status === 401) {
      trackAnalyticsError('auth_login_fail', data?.error || 'Falha de autenticação');
    } else if (String(url).includes('/api/auth') && res.status >= 500) {
      trackAnalyticsError('auth_server_error', data?.error || 'Erro interno no servidor de autenticação');
    } else if (!res.ok && res.status !== 401) {
      trackAnalyticsError('api_error', `HTTP ${res.status}: ${data?.error || 'Falha na requisição'}`);
    }
  }
  if (String(url) === '/api/projects' && String(fetchOpts.method || '').toUpperCase() === 'POST' && res.ok) {
    if (typeof trackAnalyticsEvent === 'function') {
      trackAnalyticsEvent('project_saved', {});
    }
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

function applyUserPreferences(prefs) {
  if (!prefs || typeof prefs !== 'object') return;
  if ((prefs.theme === 'dark' || prefs.theme === 'light' || prefs.theme === 'system') && typeof applyTheme === 'function') {
    const resolvedTheme = prefs.theme === 'system'
      ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : prefs.theme;
    applyTheme(resolvedTheme, { persistLocal: true, saveAccount: false, rerender: false });
  }
  if (typeof syncSettingsFromAccountPreferences === 'function') {
    syncSettingsFromAccountPreferences(prefs, AccountState.user?.profile || null);
  }
  if (typeof syncLibraryPrefsFromAccount === 'function') {
    syncLibraryPrefsFromAccount(prefs);
  }
  if (typeof syncCalcHistoryFromAccount === 'function') {
    syncCalcHistoryFromAccount(prefs);
  }
}

async function saveAccountPreferences(partial) {
  if (!AccountState.user) return;
  try {
    const res = await apiFetch('/api/auth?action=preferences', {
      method: 'POST',
      silent401: true,
      body: JSON.stringify(partial || {})
    });
    if (res.ok && res.data && res.data.preferences && AccountState.user) {
      AccountState.user.preferences = res.data.preferences;
    }
  } catch {
    // silencioso
  }
}

function updateReportUnreadDot() {
  const dot = document.getElementById('report-unread-dot');
  if (dot) {
    dot.classList.toggle('hidden', !AccountState.user || !(AccountState.reportModal.unreadCount > 0));
  }
}

function updateAdminReportsTabBadge() {
  const repTab = document.getElementById('tab-reports');
  if (!repTab) return;
  const existing = repTab.querySelector('.admin-new-badge');
  const count = Number(AccountState.adminReports.newCount) || 0;
  if (count > 0 && AccountState.user && AccountState.user.role === 'admin') {
    if (existing) {
      existing.textContent = String(count);
    } else {
      const span = document.createElement('span');
      span.className = 'admin-new-badge';
      span.textContent = String(count);
      repTab.appendChild(span);
    }
  } else if (existing) {
    existing.remove();
  }
}

async function refreshReportIndicators() {
  if (!AccountState.user) {
    AccountState.reportModal.unreadCount = 0;
    AccountState.adminReports.newCount = 0;
    updateReportUnreadDot();
    updateAdminReportsTabBadge();
    return;
  }
  try {
    const res = await apiFetch('/api/reports?scope=mine', { method: 'GET' });
    if (res.ok) {
      AccountState.reportModal.myReports = res.data.reports || [];
      AccountState.reportModal.myReportsLoaded = true;
      AccountState.reportModal.quota = res.data.quota || null;
      AccountState.reportModal.unreadCount = Number(res.data.unreadCount) || 0;
      updateReportUnreadDot();
    }
    if (AccountState.user.role === 'admin') {
      const aRes = await apiFetch('/api/reports?scope=all', { method: 'GET' });
      if (aRes.ok) {
        AccountState.adminReports.newCount = Number(aRes.data.newCount) || 0;
        updateAdminReportsTabBadge();
      }
    }
  } catch {
    // silencioso
  }
}

async function markMyReportsSeen() {
  if (!AccountState.user || !(AccountState.reportModal.unreadCount > 0)) return;
  AccountState.reportModal.unreadCount = 0;
  updateReportUnreadDot();
  try {
    await apiFetch('/api/reports', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'mark-seen' })
    });
    AccountState.reportModal.myReports.forEach((r) => {
      r.hasUnreadUpdate = false;
    });
  } catch {
    // silencioso
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && AccountState.user) {
    refreshReportIndicators();
  }
});

window.addEventListener('focus', () => {
  if (AccountState.user) {
    refreshReportIndicators();
  }
});

async function restoreSessionOnLoad(attempt = 0) {
  // Restaura cache local imediatamente para não piscar deslogado em reconexões
  if (attempt === 0 && !AccountState.user) {
    try {
      const cached = JSON.parse(localStorage.getItem('splus_user_cache') || 'null');
      if (cached && cached.id && cached.username) {
        AccountState.user = cached;
        updateAuthHeaderUI();
        updateRoleBasedTabs();
      }
    } catch {}
  }

  let shouldRetry = false;
  try {
    const res = await apiFetch('/api/auth?action=me', { method: 'GET' });
    if (res.status >= 500 || res.status === 0) {
      shouldRetry = true;
    } else if (res.ok && res.data.authenticated && res.data.user) {
      AccountState.user = res.data.user;
      try { localStorage.setItem('splus_user_cache', JSON.stringify(res.data.user)); } catch {}
    } else if (res.ok && res.data.authenticated === false) {
      AccountState.user = null;
      try { localStorage.removeItem('splus_user_cache'); } catch {}
    }
  } catch {
    shouldRetry = true;
  } finally {
    AccountState.sessionLoaded = true;
    if (AccountState.user && AccountState.user.preferences) {
      applyUserPreferences(AccountState.user.preferences);
    }
    updateAuthHeaderUI();
    updateRoleBasedTabs();
    if (!shouldRetry) refreshReportIndicators();
    if (typeof updateTopRightFloatingActions === 'function') {
      updateTopRightFloatingActions();
    }
    if (shouldRetry && attempt < 2) {
      const delay = attempt === 0 ? 1500 : 4000;
      setTimeout(() => restoreSessionOnLoad(attempt + 1), delay);
    }
  }
}

function updateRoleBasedTabs() {
  const projTab = document.getElementById('tab-projects');
  const repTab = document.getElementById('tab-reports');
  const ceoTab = document.getElementById('tab-ceo');
  const isLogged = Boolean(AccountState.user);
  const isCeo = Boolean(AccountState.user && AccountState.user.role === 'admin');

  if (projTab) projTab.classList.toggle('hidden', !isLogged);
  if (repTab) repTab.classList.toggle('hidden', !isCeo);
  if (ceoTab) ceoTab.classList.toggle('hidden', !isCeo);

  if (!isLogged && AppState.mode === 'projects') {
    switchMode('production');
  }
  if (!isCeo && (AppState.mode === 'reports' || AppState.mode === 'ceo')) {
    switchMode('production');
  }
}

function updateAuthHeaderUI() {
  const slot = document.getElementById('auth-header-slot');
  if (!slot) return;

  if (!AccountState.user) {
    slot.innerHTML = `
      <button id="btn-auth-login" class="btn-top-action" onclick="openAuthModal('login')" title="Entrar ou criar uma conta">
        <svg class="ui-ico" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        <span>Entrar</span>
      </button>
    `;
    return;
  }

  const uName = escText(AccountState.user.username);
  const ceoBadge = AccountState.user.role === 'admin' ? '<span class="user-role-tag ceo-role-tag">CEO</span>' : '';
  slot.innerHTML = `
    <div class="user-menu-wrap">
      <button type="button" class="btn-top-action btn-user-pill" onclick="toggleUserDropdown(event)">
        <svg class="ui-ico" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        <span>${uName}</span>
        ${ceoBadge}
        <span class="caret">▾</span>
      </button>
      ${AccountState.menuOpen ? `
        <div class="user-dropdown-menu">
          <div class="user-dropdown-head">Conectado como <strong>${uName}</strong> ${ceoBadge}</div>
          ${AccountState.user.role === 'admin' ? `<button type="button" class="context-menu-item" onclick="AccountState.menuOpen=false;updateAuthHeaderUI();switchMode('ceo');">Painel CEO</button>` : ''}
          <button type="button" class="context-menu-item" onclick="if(typeof openSettingsModal==='function'){AccountState.menuOpen=false;updateAuthHeaderUI();openSettingsModal();}">Configurações &amp; Conta</button>
          <button type="button" class="context-menu-item" onclick="openChangePasswordModal()">Alterar senha</button>
          <div class="context-menu-divider"></div>
          <button type="button" class="context-menu-item danger" onclick="performLogout()">Sair</button>
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

  if (st.tab === 'forgot-password') {
    if (titleEl) titleEl.textContent = '🛡️ Recuperar Senha (Pergunta de Segurança)';
    const recQuestion = st.recoveryQuestion || '';
    const recUser = st.recoveryUsername || '';
    body.innerHTML = `
      <div class="mode-switch-mini">
        <button type="button" class="mini-pill" onclick="switchAuthTab('login')">← Voltar ao Login</button>
        <button type="button" class="mini-pill active">Recuperar Senha</button>
      </div>
      ${st.notice ? `<div class="form-alert info">ℹ️ ${escText(st.notice)}</div>` : ''}
      ${st.error ? `<div class="form-alert error">⚠️ ${escText(st.error)}</div>` : ''}
      ${!recQuestion ? `
        <form onsubmit="submitFetchRecoveryQuestion(event)" class="account-form">
          <div class="field-group">
            <label for="rec-username">Nome de usuário</label>
            <input id="rec-username" type="text" class="sidebar-input" required minlength="3" maxlength="20" value="${escText(recUser)}" placeholder="Digite seu nome de usuário" />
            <small class="field-hint">Exibiremos a pergunta de segurança cadastrada na sua conta (limite de 5 tentativas por hora).</small>
          </div>
          <button type="submit" class="btn-mount-flow ready" ${st.loading ? 'disabled' : ''}>
            ${st.loading ? '⏳ Buscando...' : '🔎 Ver Pergunta de Segurança'}
          </button>
        </form>
      ` : `
        <form onsubmit="submitRecoverPassword(event)" class="account-form">
          <div class="field-group">
            <label>Usuário</label>
            <input type="text" class="sidebar-input" value="${escText(recUser)}" disabled />
          </div>
          <div class="field-group">
            <label>Pergunta de segurança</label>
            <div class="recovery-question-box">${escText(recQuestion)}</div>
          </div>
          <div class="field-group">
            <label for="rec-answer">Sua resposta</label>
            <input id="rec-answer" type="text" class="sidebar-input" required minlength="2" placeholder="Digite sua resposta (maiúsculas e acentos são ignorados)" autocomplete="off" />
          </div>
          <div class="field-group">
            <label for="rec-new-pass">Nova senha (mínimo 8 caracteres)</label>
            <div class="password-field-wrap">
              <input id="rec-new-pass" type="password" class="sidebar-input" required minlength="8" autocomplete="new-password" />
              <button type="button" class="btn-toggle-eye" onclick="togglePasswordVisibility('rec-new-pass', this)">👁️</button>
            </div>
          </div>
          <div class="field-group">
            <label for="rec-confirm-pass">Confirmar nova senha</label>
            <div class="password-field-wrap">
              <input id="rec-confirm-pass" type="password" class="sidebar-input" required minlength="8" autocomplete="new-password" />
              <button type="button" class="btn-toggle-eye" onclick="togglePasswordVisibility('rec-confirm-pass', this)">👁️</button>
            </div>
          </div>
          <button type="submit" class="btn-mount-flow ready" ${st.loading ? 'disabled' : ''}>
            ${st.loading ? '⏳ Verificando...' : '🔓 Redefinir Senha e Entrar'}
          </button>
        </form>
      `}
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
          placeholder="Digite seu usuário"
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
        ${!isReg ? `
          <div style="display:flex;justify-content:flex-end;margin-top:4px;">
            <button type="button" class="btn-link-forgot" onclick="switchAuthTab('forgot-password')">Esqueci minha senha</button>
          </div>
        ` : ''}
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
        <div class="field-group">
          <label for="auth-sec-question">Crie sua pergunta de segurança (Recuperação sem e-mail)</label>
          <input
            id="auth-sec-question"
            type="text"
            class="sidebar-input"
            minlength="5"
            maxlength="140"
            placeholder="Digite a pergunta que você quiser..."
            autocomplete="off"
          />
        </div>
        <div class="field-group">
          <label for="auth-sec-answer">Sua resposta secreta</label>
          <input
            id="auth-sec-answer"
            type="text"
            class="sidebar-input"
            minlength="2"
            placeholder="Sua resposta (maiúsculas e acentos são ignorados)"
            autocomplete="off"
          />
          <small class="field-hint">⚠️ Não use dados pessoais sensíveis na pergunta ou resposta. Você também pode configurar ou alterar isso depois em Configurações.</small>
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
    if (AccountState.user && AccountState.user.preferences) {
      applyUserPreferences(AccountState.user.preferences);
    }
    const nextAction = AccountState.authModal.afterLoginAction;
    closeAuthModal();
    updateAuthHeaderUI();
    updateRoleBasedTabs();
    refreshReportIndicators();
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
  const securityQuestion = (document.getElementById('auth-sec-question')?.value || '').trim();
  const securityAnswer = (document.getElementById('auth-sec-answer')?.value || '').trim();

  if (password !== confirmPassword) {
    AccountState.authModal.error = 'As senhas não conferem.';
    renderAuthModalBody();
    return;
  }

  AccountState.authModal.loading = true;
  AccountState.authModal.error = '';
  renderAuthModalBody();

  try {
    const payload = { username, password, confirmPassword };
    if (securityAnswer.length >= 2) {
      payload.securityQuestion = securityQuestion;
      payload.securityAnswer = securityAnswer;
    }
    const res = await apiFetch('/api/auth?action=register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      AccountState.authModal.loading = false;
      AccountState.authModal.error = res.data.error || 'Não foi possível criar a conta.';
      renderAuthModalBody();
      return;
    }
    AccountState.user = res.data.user;
    try { localStorage.setItem('splus_user_cache', JSON.stringify(res.data.user)); } catch {}
    if (AccountState.user && AccountState.user.preferences) {
      applyUserPreferences(AccountState.user.preferences);
    }
    const nextAction = AccountState.authModal.afterLoginAction;
    closeAuthModal();
    updateAuthHeaderUI();
    updateRoleBasedTabs();
    refreshReportIndicators();
    if (typeof updateTopRightFloatingActions === 'function') updateTopRightFloatingActions();
    if (typeof nextAction === 'function') nextAction();
  } catch {
    AccountState.authModal.loading = false;
    AccountState.authModal.error = 'Erro de conexão com o servidor. Tente novamente.';
    renderAuthModalBody();
  }
}

async function submitFetchRecoveryQuestion(e) {
  e.preventDefault();
  const username = (document.getElementById('rec-username')?.value || '').trim();
  if (!username) return;
  AccountState.authModal.loading = true;
  AccountState.authModal.error = '';
  AccountState.authModal.recoveryUsername = username;
  renderAuthModalBody();

  try {
    // Suporte híbrido: servidor (/api/auth?action=recovery-question) + fallback local (caso offline)
    const res = await apiFetch('/api/auth?action=recovery-question', {
      method: 'POST',
      body: JSON.stringify({ username })
    });
    if (res.ok && res.data && res.data.securityQuestion) {
      AccountState.authModal.loading = false;
      AccountState.authModal.recoveryQuestion = res.data.securityQuestion;
      AccountState.authModal.recoveryUsername = res.data.username || username;
      renderAuthModalBody();
      return;
    }
    if (typeof checkLocalSecurityRecoveryQuestion === 'function') {
      const localQ = checkLocalSecurityRecoveryQuestion(username);
      if (localQ) {
        AccountState.authModal.loading = false;
        AccountState.authModal.recoveryQuestion = localQ;
        AccountState.authModal.recoveryUsername = username;
        renderAuthModalBody();
        return;
      }
    }
    AccountState.authModal.loading = false;
    AccountState.authModal.error = res.data?.error || 'Não foi possível iniciar a recuperação para este usuário.';
    renderAuthModalBody();
  } catch {
    AccountState.authModal.loading = false;
    AccountState.authModal.error = 'Erro de conexão com o servidor.';
    renderAuthModalBody();
  }
}

async function submitRecoverPassword(e) {
  e.preventDefault();
  const username = AccountState.authModal.recoveryUsername || '';
  const securityAnswer = (document.getElementById('rec-answer')?.value || '').trim();
  const newPassword = document.getElementById('rec-new-pass')?.value || '';
  const confirmPassword = document.getElementById('rec-confirm-pass')?.value || '';

  if (newPassword !== confirmPassword) {
    AccountState.authModal.error = 'A confirmação da nova senha não confere.';
    renderAuthModalBody();
    return;
  }

  AccountState.authModal.loading = true;
  AccountState.authModal.error = '';
  renderAuthModalBody();

  try {
    const res = await apiFetch('/api/auth?action=recover-password', {
      method: 'POST',
      body: JSON.stringify({ username, securityAnswer, newPassword, confirmPassword })
    });
    if (!res.ok) {
      AccountState.authModal.loading = false;
      AccountState.authModal.error = res.data?.error || 'Resposta incorreta ou erro na redefinição.';
      renderAuthModalBody();
      return;
    }
    AccountState.user = res.data.user;
    try { localStorage.setItem('splus_user_cache', JSON.stringify(res.data.user)); } catch {}
    closeAuthModal();
    updateAuthHeaderUI();
    updateRoleBasedTabs();
    showAccountToast('Senha redefinida com sucesso!', 'success');
  } catch {
    AccountState.authModal.loading = false;
    AccountState.authModal.error = 'Erro de conexão com o servidor.';
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
    showAccountToast('Senha alterada com sucesso!', 'success');
  } catch {
    AccountState.authModal.loading = false;
    AccountState.authModal.error = 'Erro de conexão com o servidor.';
    renderAuthModalBody();
  }
}

function openCustomConfirmModal(message, confirmLabel = 'Confirmar') {
  return new Promise((resolve) => {
    let modal = document.getElementById('splus-confirm-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'splus-confirm-modal';
      modal.className = 'modal-backdrop hidden';
      document.body.appendChild(modal);
    }
    const finish = (val) => {
      modal.classList.add('hidden');
      resolve(val);
    };
    modal.onclick = (e) => { if (e.target === modal) finish(false); };
    modal.innerHTML = `
      <div class="modal-card splus-confirm-card">
        <div class="modal-header">
          <h3>Confirmação</h3>
          <button type="button" class="btn-icon-close" id="splus-confirm-x">✕</button>
        </div>
        <p class="splus-confirm-msg">${escText(message)}</p>
        <div class="splus-confirm-actions">
          <button type="button" class="calc-act-btn" id="splus-confirm-cancel">Cancelar</button>
          <button type="button" class="calc-act-btn primary" id="splus-confirm-ok">${escText(confirmLabel)}</button>
        </div>
      </div>
    `;
    modal.classList.remove('hidden');
    modal.querySelector('#splus-confirm-x').onclick = () => finish(false);
    modal.querySelector('#splus-confirm-cancel').onclick = () => finish(false);
    modal.querySelector('#splus-confirm-ok').onclick = () => finish(true);
  });
}

function showAccountToast(message, tone = 'info') {
  let el = document.getElementById('splus-account-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'splus-account-toast';
    el.className = 'splus-account-toast hidden';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = `splus-account-toast tone-${tone}`;
  clearTimeout(window._splusToastTimer);
  window._splusToastTimer = setTimeout(() => {
    el.classList.add('hidden');
  }, 2800);
}

async function performLogout() {
  AccountState.menuOpen = false;
  try {
    await apiFetch('/api/auth?action=logout', { method: 'POST' });
  } catch {
    // ignore
  }
  AccountState.user = null;
  try { localStorage.removeItem('splus_user_cache'); } catch {}
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

function reportStatusLabel(status) {
  if (status === 'lido') return 'Lido';
  if (status === 'resolvido' || status === 'feito') return 'Resolvido';
  return 'Novo';
}

function reportStatusBadgeHtml(status) {
  const st = (status === 'resolvido' || status === 'feito') ? 'resolvido' : (status === 'lido' ? 'lido' : 'novo');
  return `<span class="report-status-badge status-${st}">${reportStatusLabel(st)}</span>`;
}

async function loadMyReports() {
  if (!AccountState.user) return;
  try {
    const res = await apiFetch('/api/reports?scope=mine', { method: 'GET' });
    if (res.ok) {
      AccountState.reportModal.myReports = res.data.reports || [];
      AccountState.reportModal.quota = res.data.quota || null;
      AccountState.reportModal.unreadCount = Number(res.data.unreadCount) || 0;
      AccountState.reportModal.myReportsLoaded = true;
      updateReportUnreadDot();
      if (AccountState.reportModal.isOpen) {
        renderReportModalBody();
        if (AccountState.reportModal.tab === 'mine') {
          markMyReportsSeen();
        }
      }
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

  const limitReachedNote = (q && q.remaining24h === 0 && q.nextAvailableAt)
    ? `<div class="form-alert warn">⏳ Limite de reports atingido. Tente novamente em <strong>${fmtDateBR(q.nextAvailableAt)}</strong>.</div>`
    : '';

  body.innerHTML = `
    <div class="mode-switch-mini">
      <button type="button" class="mini-pill ${rm.tab === 'new' ? 'active' : ''}" onclick="switchReportModalTab('new')">✏️ Novo report</button>
      <button type="button" class="mini-pill ${rm.tab === 'mine' ? 'active' : ''}" onclick="switchReportModalTab('mine')">📋 Meus reports (${rm.myReports.length})</button>
    </div>

    ${rm.tab === 'new' ? `
      ${limitReachedNote}
      ${rm.error ? `<div class="form-alert error">⚠️ ${escText(rm.error)}</div>` : ''}
      ${rm.success ? `<div class="form-alert ok">✅ ${escText(rm.success)}</div>` : ''}

      <form onsubmit="submitNewReport(event)" class="account-form">
        <div class="field-group">
          <label>Tipo</label>
          <div class="btn-group-row">
            <button type="button" class="seg-btn ${rm.type === 'bug' ? 'active' : ''}" onclick="setReportType('bug')">🐛 Bug</button>
            <button type="button" class="seg-btn ${rm.type === 'suggestion' ? 'active' : ''}" onclick="setReportType('suggestion')">💡 Sugestão</button>
            <button type="button" class="seg-btn ${rm.type === 'rating' ? 'active' : ''}" onclick="setReportType('rating')">⭐ Avaliação</button>
          </div>
        </div>

        ${rm.type === 'rating' ? `
          <div class="field-group">
            <label>Nota</label>
            <div class="rating-stars-row">
              ${[1, 2, 3, 4, 5].map((n) => `
                <button type="button" class="star-btn ${n <= rm.rating ? 'active' : ''}" onclick="setReportRating(${n})">★</button>
              `).join('')}
              <span class="rating-label">${rm.rating}/5</span>
            </div>
          </div>
        ` : ''}

        <div class="field-group">
          <label for="rep-title">Título (opcional)</label>
          <input
            id="rep-title"
            type="text"
            class="sidebar-input"
            maxlength="120"
            value="${escText(rm.title)}"
            oninput="AccountState.reportModal.title = this.value"
            placeholder="Resumo rápido..."
          />
        </div>

        <div class="field-group">
          <label for="rep-message">Mensagem</label>
          <textarea
            id="rep-message"
            class="sidebar-input report-textarea"
            rows="4"
            minlength="10"
            maxlength="2000"
            required
            oninput="AccountState.reportModal.message = this.value; const c=document.getElementById('rep-char-count'); if(c) c.textContent=this.value.length+'/2000';"
            placeholder="Descreva o problema, sugestão ou avaliação..."
          >${escText(rm.message)}</textarea>
          <div class="field-hint-row">
            <span></span>
            <span id="rep-char-count">${rm.message.length}/2000</span>
          </div>
        </div>

        <div class="field-group">
          <label>Imagens (até 7)</label>
          <label class="file-upload-btn">
            <span>${rm.compressing ? '⏳ Processando...' : `📎 Selecionar imagens (${rm.images.length}/7)`}</span>
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
                  <button type="button" class="thumb-remove-btn" onclick="removeReportDraftImage('${img.id}')" title="Remover imagem">✕</button>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>

        <button type="submit" class="btn-mount-flow ready" ${rm.loading || rm.compressing || (q && q.remaining24h === 0) ? 'disabled' : ''}>
          ${rm.loading ? '⏳ Enviando...' : '📣 Enviar Report'}
        </button>
      </form>
    ` : `
      <div class="my-reports-list">
        ${!rm.myReportsLoaded ? '<div class="picker-empty">⏳ Carregando...</div>' : (
          rm.myReports.length === 0
            ? '<div class="picker-empty">Nenhum report enviado.</div>'
            : rm.myReports.map((r) => `
              <div class="report-item-card ${r.hasUnreadUpdate ? 'has-unread' : ''}">
                <div class="report-card-head">
                  <span class="lib-badge">${reportTypeLabel(r.type)}</span>
                  ${reportStatusBadgeHtml(r.status)}
                  ${r.rating ? `<span class="report-stars-tag">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)} (${r.rating}/5)</span>` : ''}
                  <span class="report-date-tag">${fmtDateBR(r.createdAt)}</span>
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
                ${r.adminReply && r.adminReply.text ? `
                  <div class="report-admin-reply-box">
                    <div class="report-admin-reply-head">
                      <strong>Resposta da equipe</strong>
                      <span>${fmtDateBR(r.adminReply.updatedAt || r.adminReply.createdAt)}</span>
                    </div>
                    <p class="report-admin-reply-text">${escText(r.adminReply.text)}</p>
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
      AccountState.adminReports.newCount = Number(res.data.newCount) || AccountState.adminReports.list.filter((r) => (r.status || 'novo') === 'novo').length;
      updateAdminReportsTabBadge();
    }
  } catch {
    AccountState.adminReports.error = 'Erro de conexão ao carregar os reports.';
  } finally {
    AccountState.adminReports.loading = false;
    renderAdminReportsWorkspace();
  }
}

async function setAdminReportStatus(reportId, status) {
  AccountState.adminReports.savingId = reportId;
  renderAdminReportsWorkspace();
  try {
    const res = await apiFetch('/api/reports', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'set-status', id: reportId, status })
    });
    if (res.ok && res.data.report) {
      const idx = AccountState.adminReports.list.findIndex((r) => r.id === reportId);
      if (idx !== -1) AccountState.adminReports.list[idx] = res.data.report;
      AccountState.adminReports.newCount = AccountState.adminReports.list.filter((r) => (r.status || 'novo') === 'novo').length;
      updateAdminReportsTabBadge();
    } else if (!res.ok) {
      AccountState.adminReports.error = res.data.error || 'Erro ao atualizar status.';
    }
  } finally {
    AccountState.adminReports.savingId = null;
    renderAdminReportsWorkspace();
  }
}

async function markAllAdminReportsRead() {
  AccountState.adminReports.loading = true;
  renderAdminReportsWorkspace();
  try {
    const res = await apiFetch('/api/reports', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'mark-all-read' })
    });
    if (!res.ok) {
      AccountState.adminReports.error = res.data.error || 'Erro ao marcar todos como lidos.';
    }
    await loadAdminReports();
  } finally {
    AccountState.adminReports.loading = false;
    renderAdminReportsWorkspace();
  }
}

function openAdminReplyBox(reportId) {
  const rep = AccountState.adminReports.list.find((r) => r.id === reportId);
  AccountState.adminReports.replyingId = reportId;
  AccountState.adminReports.replyDraft = rep?.adminReply?.text || '';
  renderAdminReportsWorkspace();
  setTimeout(() => {
    const ta = document.getElementById(`admin-reply-ta-${reportId}`);
    if (ta) ta.focus();
  }, 30);
}

function cancelAdminReplyBox() {
  AccountState.adminReports.replyingId = null;
  AccountState.adminReports.replyDraft = '';
  renderAdminReportsWorkspace();
}

async function saveAdminReportReply(reportId) {
  const text = String(AccountState.adminReports.replyDraft || '').trim();
  if (!text) return;
  AccountState.adminReports.savingId = reportId;
  renderAdminReportsWorkspace();
  try {
    const res = await apiFetch('/api/reports', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'set-reply', id: reportId, text })
    });
    if (res.ok && res.data.report) {
      const idx = AccountState.adminReports.list.findIndex((r) => r.id === reportId);
      if (idx !== -1) AccountState.adminReports.list[idx] = res.data.report;
      AccountState.adminReports.replyingId = null;
      AccountState.adminReports.replyDraft = '';
      AccountState.adminReports.newCount = AccountState.adminReports.list.filter((r) => (r.status || 'novo') === 'novo').length;
      updateAdminReportsTabBadge();
    } else if (!res.ok) {
      AccountState.adminReports.error = res.data.error || 'Erro ao salvar resposta.';
    }
  } finally {
    AccountState.adminReports.savingId = null;
    renderAdminReportsWorkspace();
  }
}

async function deleteAdminReportReply(reportId) {
  AccountState.adminReports.savingId = reportId;
  renderAdminReportsWorkspace();
  try {
    const res = await apiFetch('/api/reports', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'delete-reply', id: reportId })
    });
    if (res.ok && res.data.report) {
      const idx = AccountState.adminReports.list.findIndex((r) => r.id === reportId);
      if (idx !== -1) AccountState.adminReports.list[idx] = res.data.report;
      if (AccountState.adminReports.replyingId === reportId) {
        AccountState.adminReports.replyingId = null;
        AccountState.adminReports.replyDraft = '';
      }
    } else if (!res.ok) {
      AccountState.adminReports.error = res.data.error || 'Erro ao remover resposta.';
    }
  } finally {
    AccountState.adminReports.savingId = null;
    renderAdminReportsWorkspace();
  }
}

async function emptyAdminReportHistory() {
  if (!(await openCustomConfirmModal('Apagar definitivamente todos os reports resolvidos do histórico? Esta ação não pode ser desfeita.', 'Apagar histórico'))) return;
  AccountState.adminReports.loading = true;
  renderAdminReportsWorkspace();
  try {
    const res = await apiFetch('/api/reports', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'empty-history' })
    });
    if (!res.ok) {
      AccountState.adminReports.error = res.data.error || 'Erro ao esvaziar histórico.';
    }
    await loadAdminReports();
  } finally {
    AccountState.adminReports.loading = false;
    renderAdminReportsWorkspace();
  }
}

function setAdminReportsView(v) {
  AccountState.adminReports.view = v === 'history' ? 'history' : 'active';
  AccountState.adminReports.filterStatus = 'all';
  renderAdminReportsWorkspace();
}

function getFilteredAdminReports(scopeOverride = null) {
  const st = AccountState.adminReports;
  const now = Date.now();
  const q = Solver.normalizeText(st.searchQuery || '');
  const uFilter = Solver.normalizeText(st.filterUser || '');
  const viewScope = scopeOverride || st.view || 'active';

  return (st.list || []).filter((r) => {
    const repStatus = (r.status === 'resolvido' || r.status === 'feito') ? 'resolvido' : (r.status === 'lido' ? 'lido' : 'novo');
    if (viewScope === 'active' && repStatus === 'resolvido') return false;
    if (viewScope === 'history' && repStatus !== 'resolvido') return false;
    if (st.filterType !== 'all' && r.type !== st.filterType) return false;
    if (viewScope === 'active' && st.filterStatus !== 'all' && repStatus !== st.filterStatus) return false;
    if (uFilter && !Solver.normalizeText(r.username || '').includes(uFilter)) return false;
    if (st.filterPeriod !== 'all') {
      const ageMs = now - new Date(r.createdAt).getTime();
      if (st.filterPeriod === '24h' && ageMs > 24 * 60 * 60 * 1000) return false;
      if (st.filterPeriod === '7d' && ageMs > 7 * 24 * 60 * 60 * 1000) return false;
      if (st.filterPeriod === '14d' && ageMs > 14 * 24 * 60 * 60 * 1000) return false;
    }
    if (q) {
      const hay = Solver.normalizeText(`${r.id} ${r.username} ${r.title || ''} ${r.message || ''} ${r.adminReply?.text || ''}`);
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderAdminReportsMode(sidebarEl, emptyOverlay) {
  emptyOverlay.classList.add('hidden');
  emptyOverlay.innerHTML = '';

  const st = AccountState.adminReports;
  const allList = st.list || [];
  const typeOpts = [
    { key: 'all', label: 'Todos os tipos', icon: '📋', color: '#475569', count: allList.length },
    { key: 'bug', label: 'Bug', icon: '🐛', color: '#DC2626', count: allList.filter(r => r.type === 'bug').length },
    { key: 'suggestion', label: 'Sugestão', icon: '💡', color: '#2563EB', count: allList.filter(r => r.type === 'suggestion').length },
    { key: 'rating', label: 'Avaliação', icon: '⭐', color: '#7C3AED', count: allList.filter(r => r.type === 'rating').length }
  ];
  const statusOpts = [
    { key: 'all', label: 'Todos os status', icon: '📂', color: '#475569' },
    { key: 'novo', label: 'Novos', icon: '🆕', color: '#2563EB' },
    { key: 'lido', label: 'Lidos', icon: '👁️', color: '#0891B2' },
    { key: 'resolvido', label: 'Resolvidos', icon: '✓', color: '#16A34A' }
  ];

  const filtersCard = DS.sectionCard({
    chip: 'REPORTS',
    title: 'Filtros de Reports',
    bodyHtml: `
      <div class="field-group">
        <label>Buscar por texto</label>
        <input
          type="text"
          class="sidebar-input"
          placeholder="Buscar mensagem, título ou ID..."
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
        <div class="ds-opt-list">
          ${typeOpts.map(t => DS.optionRow({
            color: t.color,
            iconHtml: `<span style="font-size:15px;">${t.icon}</span>`,
            title: t.label,
            count: t.count,
            selected: (st.filterType || 'all') === t.key,
            compact: true,
            onClick: `AccountState.adminReports.filterType='${t.key}'; renderAdminReportsMode(document.getElementById('left-sidebar-content'), document.getElementById('spaces-empty-overlay'));`
          })).join('')}
        </div>
      </div>

      <div class="field-group">
        <label>Status</label>
        <div class="ds-opt-list">
          ${statusOpts.map(s => DS.optionRow({
            color: s.color,
            iconHtml: `<span style="font-size:14px;">${s.icon}</span>`,
            title: s.label,
            arrow: true,
            selected: (st.filterStatus || 'all') === s.key,
            compact: true,
            onClick: `AccountState.adminReports.filterStatus='${s.key}'; renderAdminReportsMode(document.getElementById('left-sidebar-content'), document.getElementById('spaces-empty-overlay'));`
          })).join('')}
        </div>
      </div>

      <div class="field-group">
        <label>Período</label>
        <select class="sidebar-select" onchange="AccountState.adminReports.filterPeriod = this.value; renderAdminReportsWorkspace();">
          <option value="all" ${st.filterPeriod === 'all' ? 'selected' : ''}>Todos (últimos 14 dias)</option>
          <option value="24h" ${st.filterPeriod === '24h' ? 'selected' : ''}>Últimas 24 horas</option>
          <option value="7d" ${st.filterPeriod === '7d' ? 'selected' : ''}>Últimos 7 dias</option>
        </select>
      </div>

      <button type="button" class="ds-btn-primary" style="width:100%;" onclick="loadAdminReports()">🔄 Atualizar</button>
      <button type="button" class="ds-btn-secondary" style="width:100%;" onclick="markAllAdminReportsRead()">✓ Marcar todos como lidos</button>
    `
  });

  const exportCard = DS.sectionCard({
    chip: 'EXPORTAR',
    title: 'Download (.TXT)',
    bodyHtml: `
      <div class="admin-export-row-3">
        <button type="button" class="admin-exp-btn" onclick="downloadAdminReportsTxt('active')" title="Baixar reports ativos (.txt)">
          <svg class="ui-ico" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          <span>Ativos</span>
        </button>
        <button type="button" class="admin-exp-btn" onclick="downloadAdminReportsTxt('history')" title="Baixar histórico (.txt)">
          <svg class="ui-ico" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <span>Histórico</span>
        </button>
        <button type="button" class="admin-exp-btn" onclick="downloadAdminReportsTxt('all')" title="Baixar todos os reports (.txt)">
          <svg class="ui-ico" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          <span>Todos</span>
        </button>
      </div>
    `
  });

  sidebarEl.innerHTML = `<div class="ds-card-stack">${exportCard}${filtersCard}</div>`;

  loadAdminReports();
}

function renderAdminReportsWorkspace() {
  const view = document.getElementById('reports-workspace-view');
  if (!view) return;
  const st = AccountState.adminReports;
  const isHistory = st.view === 'history';
  const filtered = getFilteredAdminReports();

  const normStatus = (r) => (r.status === 'resolvido' || r.status === 'feito') ? 'resolvido' : (r.status === 'lido' ? 'lido' : 'novo');
  const activeAll = (st.list || []).filter((r) => normStatus(r) !== 'resolvido');
  const historyAll = (st.list || []).filter((r) => normStatus(r) === 'resolvido');
  const newCnt = activeAll.filter((r) => normStatus(r) === 'novo').length;
  const readCnt = activeAll.filter((r) => normStatus(r) === 'lido').length;

  view.innerHTML = `
    <div class="lib-workspace-header">
      <div>
        <h2>🛡️ Reports</h2>
        <span>${activeAll.length} ativo(s) · ${historyAll.length} resolvido(s)</span>
      </div>
      <div class="admin-status-chips">
        <button type="button" class="am-qf-chip ${!isHistory ? 'active' : ''}" onclick="setAdminReportsView('active')">Ativos (${activeAll.length})</button>
        <button type="button" class="am-qf-chip ${isHistory ? 'active' : ''}" onclick="setAdminReportsView('history')">Histórico (${historyAll.length})</button>
        ${!isHistory ? `
          <button type="button" class="am-qf-chip ${st.filterStatus === 'novo' ? 'active' : ''}" onclick="AccountState.adminReports.filterStatus = AccountState.adminReports.filterStatus==='novo' ? 'all' : 'novo'; renderAdminReportsWorkspace();">Novos (${newCnt})</button>
          <button type="button" class="am-qf-chip ${st.filterStatus === 'lido' ? 'active' : ''}" onclick="AccountState.adminReports.filterStatus = AccountState.adminReports.filterStatus==='lido' ? 'all' : 'lido'; renderAdminReportsWorkspace();">Lidos (${readCnt})</button>
        ` : (historyAll.length > 0 ? `
          <button type="button" class="btn-icon-danger" onclick="emptyAdminReportHistory()">🗑️ Esvaziar histórico</button>
        ` : '')}
      </div>
    </div>

    ${st.error ? `<div class="form-alert error" style="display:flex;align-items:center;justify-content:space-between;gap:12px;"><span>⚠️ ${escText(st.error)}</span><button type="button" class="btn-small-accent" onclick="fetchAdminReports()">Tentar de novo</button></div>` : ''}
    ${st.loading ? '<div class="picker-empty">⏳ Carregando reports...</div>' : `
      <div class="admin-reports-stack">
        ${filtered.length === 0 ? `<div class="picker-empty">${isHistory ? 'Histórico vazio.' : 'Não há reportes a serem resolvidos'}</div>` : filtered.map((r) => {
          const curStatus = normStatus(r);
          const isSaving = st.savingId === r.id;
          const isReplying = st.replyingId === r.id;
          return `
          <div class="report-item-card admin-card">
            <div class="report-card-head">
              <div class="report-head-left">
                <span class="lib-badge">${reportTypeLabel(r.type)}</span>
                ${reportStatusBadgeHtml(curStatus)}
                <strong class="report-user-name">👤 ${escText(r.username)}</strong>
                ${r.rating ? `<span class="report-stars-tag">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)} (${r.rating}/5)</span>` : ''}
                <span class="report-date-tag">#${escText(r.id)} • ${fmtDateBR(r.createdAt)}${curStatus === 'resolvido' && r.resolvedAt ? ` • Resolvido em ${fmtDateBR(r.resolvedAt)}` : ''}</span>
              </div>
              <div class="report-head-actions">
                ${!isHistory ? `
                  <button type="button" class="btn-icon-action ${curStatus === 'lido' ? 'is-selected' : ''}" ${isSaving ? 'disabled' : ''} onclick="setAdminReportStatus('${escText(r.id)}', 'lido')">Lido</button>
                  <button type="button" class="btn-icon-action" ${isSaving ? 'disabled' : ''} onclick="setAdminReportStatus('${escText(r.id)}', 'resolvido')">Resolvido</button>
                ` : `
                  <button type="button" class="btn-icon-action" ${isSaving ? 'disabled' : ''} onclick="setAdminReportStatus('${escText(r.id)}', 'lido')">Reabrir</button>
                `}
                <button type="button" class="btn-icon-action" ${isSaving ? 'disabled' : ''} onclick="openAdminReplyBox('${escText(r.id)}')">${r.adminReply ? 'Editar resposta' : 'Responder'}</button>
                <button type="button" class="btn-icon-action" onclick="downloadSingleReportTxt('${escText(r.id)}')">📄 .txt</button>
                ${(r.images && r.images.length > 0) ? `<button type="button" class="btn-icon-action" onclick="downloadReportImages('${escText(r.id)}')">🖼️ Imagens</button>` : ''}
                <button type="button" class="btn-icon-danger" onclick="deleteAdminReport('${escText(r.id)}')" title="Apagar definitivamente">${isHistory ? 'Apagar definitivamente' : '🗑️'}</button>
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

            ${r.adminReply && r.adminReply.text && !isReplying ? `
              <div class="report-admin-reply-box">
                <div class="report-admin-reply-head">
                  <strong>Sua resposta</strong>
                  <div>
                    <span>${fmtDateBR(r.adminReply.updatedAt || r.adminReply.createdAt)}</span>
                    <button type="button" class="btn-inline-link" onclick="openAdminReplyBox('${escText(r.id)}')">Editar</button>
                    <button type="button" class="btn-inline-link danger" onclick="deleteAdminReportReply('${escText(r.id)}')">Remover</button>
                  </div>
                </div>
                <p class="report-admin-reply-text">${escText(r.adminReply.text)}</p>
              </div>
            ` : ''}

            ${isReplying ? `
              <div class="admin-reply-editor">
                <textarea
                  id="admin-reply-ta-${escText(r.id)}"
                  class="sidebar-textarea"
                  rows="3"
                  maxlength="1000"
                  placeholder="Escreva a resposta para o usuário..."
                  oninput="AccountState.adminReports.replyDraft = this.value;"
                >${escText(st.replyDraft)}</textarea>
                <div class="admin-reply-editor-actions">
                  <button type="button" class="btn-small-accent" ${isSaving ? 'disabled' : ''} onclick="saveAdminReportReply('${escText(r.id)}')">${isSaving ? 'Salvando...' : 'Enviar resposta'}</button>
                  <button type="button" class="btn-icon-action" onclick="cancelAdminReplyBox()">Cancelar</button>
                  ${r.adminReply ? `<button type="button" class="btn-icon-danger" ${isSaving ? 'disabled' : ''} onclick="deleteAdminReportReply('${escText(r.id)}')">Remover resposta</button>` : ''}
                </div>
              </div>
            ` : ''}
          </div>
          `;
        }).join('')}
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
      `Tipo: ${typeNamePt(r.type)}`,
      `Status: ${reportStatusLabel(r.status)}`
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
    if (r.adminReply && r.adminReply.text) {
      lines.push(`Resposta do admin (${fmtDateBR(r.adminReply.updatedAt || r.adminReply.createdAt)}): ${r.adminReply.text}`);
    }
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

function downloadAdminReportsTxt(scope = 'active') {
  let list = [];
  let label = 'ativos';
  if (scope === 'all' || scope === true) {
    list = AccountState.adminReports.list || [];
    label = 'todos';
  } else if (scope === 'history') {
    list = getFilteredAdminReports('history');
    label = 'historico';
  } else {
    list = getFilteredAdminReports('active');
    label = 'ativos';
  }
  if (!list.length) {
    showAccountToast('Não há reports para baixar.', 'error');
    return;
  }
  const content = buildReportsTxtContent(list);
  const stamp = new Date().toISOString().slice(0, 10);
  triggerTxtDownload(`satisfactory-plus-reports-${label}-${stamp}.txt`, content);
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
  if (!(await openCustomConfirmModal('Tem certeza que deseja excluir este report e todas as imagens anexadas?', 'Excluir'))) return;
  const res = await apiFetch(`/api/reports?id=${encodeURIComponent(reportId)}`, { method: 'DELETE' });
  if (!res.ok) {
    showAccountToast(res.data.error || 'Erro ao excluir report.', 'error');
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
    summary = `Produção (Entrada ➔ Item) • ${tIt ? tIt.name : 'Sem item'}`;
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

function getSavedProjectNameById(projectId) {
  const found = (AccountState.projects.list || []).find((p) => p && p.id === projectId);
  return found ? String(found.name || 'Projeto') : 'Projeto';
}

function openRenameProjectModal(projectId, currentName) {
  const safeName = (typeof currentName === 'string' && currentName) ? currentName : getSavedProjectNameById(projectId);
  AccountState.projects.saveModal = {
    isOpen: true,
    mode: 'rename',
    sourceMode: 'production',
    renameProjectId: projectId,
    name: safeName,
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
    showAccountToast(`Projeto "${res.data.project.name}" salvo com sucesso!`, 'success');
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
    showAccountToast(res.data.error || 'Não foi possível atualizar o projeto.', 'error');
    return;
  }
  showAccountToast(`Projeto "${AccountState.projects.activeProjectName}" atualizado com sucesso!`, 'success');
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
    showAccountToast(res.data.error || 'Não foi possível abrir este projeto.', 'error');
    return;
  }

  const proj = res.data.project;
  const p = proj.payload || {};
  const targetMode = p.sourceMode === 'free' ? 'free' : 'production';

  const validOrient = ['LR', 'RL', 'TB', 'BT'];
  AppState.orientation = validOrient.includes(p.orientation) ? p.orientation : 'LR';
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
  if (typeof syncOrientationButtons === 'function') syncOrientationButtons();
  const btn3d = document.getElementById('btn-toggle-3d');
  const vp = document.getElementById('spaces-viewport');
  if (btn3d) {
    btn3d.classList.toggle('active', AppState.canvas.is3DView);
    btn3d.title = AppState.canvas.is3DView ? 'Visão 3D em Andares: SIM' : 'Visão 3D em Andares: NÃO';
  }
  if (vp) vp.classList.toggle('view-3d', AppState.canvas.is3DView);
  const btnExp = document.getElementById('btn-toggle-expand');
  if (btnExp) {
    btnExp.classList.toggle('active', AppState.showAllMachines);
    btnExp.title = AppState.showAllMachines ? 'Todas as Máquinas: SIM' : 'Todas as Máquinas: NÃO';
  }

  AccountState.projects.activeProjectId = proj.id;
  AccountState.projects.activeProjectName = proj.name;
  AccountState.projects.activeProjectMode = targetMode;

  switchMode(targetMode);
}

async function deleteSavedProject(projectId, projectName) {
  const safeName = (typeof projectName === 'string' && projectName) ? projectName : getSavedProjectNameById(projectId);
  if (!(await openCustomConfirmModal(`Tem certeza que deseja remover o projeto "${safeName}"? Essa ação não pode ser desfeita.`, 'Remover'))) return;
  const res = await apiFetch(`/api/projects?id=${encodeURIComponent(projectId)}`, { method: 'DELETE' });
  if (!res.ok) {
    showAccountToast(res.data.error || 'Erro ao remover o projeto.', 'error');
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

  const list = AccountState.projects.list || [];
  const prodCount = list.filter(p => p.sourceMode !== 'free').length;
  const freeCount = list.filter(p => p.sourceMode === 'free').length;

  sidebarEl.innerHTML = `<div class="ds-card-stack">${DS.sectionCard({
    chip: 'PROJETOS',
    title: 'Suas Fábricas Salvas',
    count: list.length,
    bodyHtml: `
      <div class="ds-opt-list">
        ${DS.optionRow({ color: '#475569', iconHtml: '<span>📁</span>', title: 'Todos os Projetos', count: list.length, selected: true, onClick: 'loadUserProjects()' })}
        ${DS.optionRow({ color: '#2563EB', iconHtml: '<span>🏭</span>', title: 'Linhas de Produção', count: prodCount, onClick: "switchMode('production')" })}
        ${DS.optionRow({ color: '#0891B2', iconHtml: '<span>🛠️</span>', title: 'Fábricas da Oficina', count: freeCount, onClick: "switchMode('free')" })}
      </div>
      <button type="button" class="ds-btn-primary" style="width:100%;" onclick="loadUserProjects()">🔄 Atualizar Projetos</button>
    `
  })}</div>`;

  loadUserProjects();
}

function setProjectsFilterMode(mode) {
  AccountState.projects.filterMode = mode || 'all';
  renderProjectsWorkspace();
}

function setProjectsSearchQuery(q) {
  AccountState.projects.searchQuery = q || '';
  renderProjectsWorkspace();
}

function renderProjectsWorkspace() {
  const view = document.getElementById('projects-workspace-view');
  if (!view) return;
  const pState = AccountState.projects;
  const filterMode = pState.filterMode || 'all';
  const query = String(pState.searchQuery || '').trim().toLowerCase();

  const filteredList = (pState.list || []).filter((p) => {
    if (filterMode !== 'all' && (p.sourceMode || 'production') !== filterMode) return false;
    if (query) {
      const hay = `${p.name || ''} ${p.summary || ''}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  const usedPct = Math.min(100, Math.round(((pState.list.length || 0) / Math.max(1, pState.maxProjects || 10)) * 100));

  const cardsHtml = pState.loading
    ? `<div class="proj-empty-box"><p>Carregando seus projetos...</p></div>`
    : (pState.list.length === 0
      ? `<div class="proj-empty-box">
          <div class="proj-empty-ico">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <h4>Nenhum projeto salvo ainda</h4>
          <p>Monte uma linha em Produção ou Oficina e clique em Salvar para manter suas fábricas na nuvem.</p>
          <div class="proj-empty-btns">
            <button type="button" class="ds-btn-primary" onclick="switchMode('production')">Ir para Produção</button>
            <button type="button" class="ds-btn-secondary" onclick="switchMode('free')">Abrir Oficina</button>
          </div>
        </div>`
      : (filteredList.length === 0
        ? `<div class="proj-empty-box"><p>Nenhum projeto corresponde ao filtro atual.</p></div>`
        : `<div class="projects-cards-grid proj-cards-v2">
            ${filteredList.map((p) => {
              const isFree = p.sourceMode === 'free';
              return `
                <article class="project-saved-card proj-card-v2 ${pState.activeProjectId === p.id ? 'is-active' : ''}">
                  <div class="proj-card-head">
                    <span class="proj-mode-badge ${isFree ? 'is-free' : 'is-prod'}">
                      ${isFree
                        ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg> Oficina'
                        : '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg> Produção'}
                    </span>
                    <span class="proj-card-date">${fmtDateBR(p.updatedAt)}</span>
                  </div>
                  <h3 class="proj-card-title">${escText(p.name)}</h3>
                  <p class="project-card-summary">${escText(p.summary || 'Projeto salvo do Satisfactory+')}</p>
                  <div class="proj-card-meta">Criado em ${fmtDateBR(p.createdAt)}</div>
                  <div class="proj-card-foot">
                    <button type="button" class="ds-btn-primary proj-open-btn" onclick="openSavedProjectInSpaces('${escText(p.id)}')">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                      Abrir
                    </button>
                    <button type="button" class="proj-ico-btn" onclick="shareSavedProject('${escText(p.id)}')" title="Compartilhar projeto entre contas" aria-label="Compartilhar projeto">
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                    </button>
                    <button type="button" class="proj-ico-btn" onclick="exportSavedProjectCompactPng('${escText(p.id)}')" title="Baixar imagem compactada (PNG) com resumo" aria-label="Baixar imagem do projeto">
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </button>
                    <button type="button" class="proj-ico-btn" onclick="openRenameProjectModal('${escText(p.id)}')" title="Renomear projeto" aria-label="Renomear projeto">
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button type="button" class="proj-ico-btn is-danger" onclick="deleteSavedProject('${escText(p.id)}')" title="Remover projeto" aria-label="Remover projeto">
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                </article>
              `;
            }).join('')}
          </div>`));

  view.innerHTML = `
    <div class="proj-ws-shell">
      <div class="proj-ws-header">
        <div class="proj-ws-title-group">
          <div class="proj-ws-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <div>
            <h2>Meus Projetos</h2>
            <p>Suas fábricas salvas em Produção e Oficina sincronizadas na conta.</p>
          </div>
        </div>
        <div class="proj-ws-quota">
          <div class="proj-ws-quota-top">
            <span>Armazenamento</span>
            <strong>${pState.list.length} / ${pState.maxProjects}</strong>
          </div>
          <div class="proj-ws-quota-bar"><i style="width:${usedPct}%"></i></div>
        </div>
      </div>

      <div class="proj-ws-toolbar">
        <div class="proj-ws-filters">
          <button type="button" class="proj-filter-btn ${filterMode === 'all' ? 'active' : ''}" onclick="setProjectsFilterMode('all')">Todos (${pState.list.length})</button>
          <button type="button" class="proj-filter-btn ${filterMode === 'production' ? 'active' : ''}" onclick="setProjectsFilterMode('production')">Produção</button>
          <button type="button" class="proj-filter-btn ${filterMode === 'free' ? 'active' : ''}" onclick="setProjectsFilterMode('free')">Oficina</button>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button type="button" class="ds-btn-secondary" onclick="openImportSharedProjectModal()" title="Importar projeto compartilhado por outra conta">
            <svg class="ui-ico" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Importar código
          </button>
          <input type="search" class="sidebar-input proj-ws-search" placeholder="Buscar projeto..." value="${escText(pState.searchQuery || '')}" oninput="setProjectsSearchQuery(this.value)" />
        </div>
      </div>

      ${pState.error ? `<div class="form-alert error" style="display:flex;align-items:center;justify-content:space-between;gap:12px;"><span>${escText(pState.error)}</span><button type="button" class="ds-btn-primary" onclick="loadUserProjects()">Tentar de novo</button></div>` : ''}
      ${cardsHtml}
    </div>
  `;
}


/* ============================================================================
 * COMPARTILHAR PROJETO ENTRE CONTAS + EXPORTAR PNG COMPACTADO COM FICHA TÉCNICA
 * ========================================================================== */

async function shareSavedProject(projectId, projectName) {
  const safeName = (typeof projectName === 'string' && projectName) ? projectName : getSavedProjectNameById(projectId);
  if (!AccountState.user) {
    showAccountToast('Entre na sua conta para compartilhar projetos.', 'error');
    return;
  }
  const res = await apiFetch('/api/projects?action=share', {
    method: 'POST',
    body: JSON.stringify({ id: projectId })
  });
  if (!res.ok || !res.data?.shareCode) {
    showAccountToast(res.data?.error || 'Não foi possível gerar o código de compartilhamento.', 'error');
    return;
  }
  const code = res.data.shareCode;
  const modal = document.getElementById('save-project-modal');
  const titleEl = document.getElementById('save-project-title');
  const bodyEl = document.getElementById('save-project-body');
  if (titleEl) titleEl.textContent = 'Compartilhar Projeto';
  if (bodyEl) {
    bodyEl.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <p style="margin:0;font-size:13px;color:var(--text-secondary);line-height:1.5;">
          Envie este código para outro jogador do <strong>Satisfactory+</strong> importar uma cópia de <strong>${escText(safeName)}</strong> na conta dele (em <em>Projetos → Importar código</em>):
        </p>
        <div style="display:flex;gap:8px;align-items:center;">
          <input id="shared-code-output" type="text" readonly class="sidebar-input" value="${escText(code)}" style="font-family:var(--font-mono);font-size:16px;font-weight:800;text-align:center;letter-spacing:0.06em;" />
          <button type="button" class="ds-btn-primary" onclick="navigator.clipboard?.writeText('${escText(code)}'); showAccountToast('Código copiado!', 'success');">Copiar</button>
        </div>
        <div style="display:flex;justify-content:flex-end;">
          <button type="button" class="ds-btn-secondary" onclick="closeSaveProjectModal()">Fechar</button>
        </div>
      </div>
    `;
  }
  if (modal) modal.classList.remove('hidden');
}

function openImportSharedProjectModal() {
  const modal = document.getElementById('save-project-modal');
  const titleEl = document.getElementById('save-project-title');
  const bodyEl = document.getElementById('save-project-body');
  if (titleEl) titleEl.textContent = 'Importar Projeto Compartilhado';
  if (bodyEl) {
    bodyEl.innerHTML = `
      <form onsubmit="submitImportSharedProject(event)" style="display:flex;flex-direction:column;gap:12px;">
        <p style="margin:0;font-size:13px;color:var(--text-secondary);line-height:1.5;">
          Cole o código recebido de outra conta (formato <code>SP-XXXXXXXX</code>) para importar uma cópia do projeto para a sua lista.
        </p>
        <div class="field-group">
          <label for="import-shared-code-input">Código do projeto</label>
          <input id="import-shared-code-input" type="text" class="sidebar-input" required placeholder="SP-A1B2C3D4" autocomplete="off" style="font-family:var(--font-mono);text-transform:uppercase;" />
        </div>
        <div id="import-shared-error" class="form-alert error hidden"></div>
        <div style="display:flex;justify-content:flex-end;gap:8px;">
          <button type="button" class="ds-btn-secondary" onclick="closeSaveProjectModal()">Cancelar</button>
          <button type="submit" class="ds-btn-primary">Importar projeto</button>
        </div>
      </form>
    `;
  }
  if (modal) modal.classList.remove('hidden');
}

async function submitImportSharedProject(e) {
  e.preventDefault();
  const inp = document.getElementById('import-shared-code-input');
  const errEl = document.getElementById('import-shared-error');
  const shareCode = (inp?.value || '').trim().toUpperCase();
  if (errEl) { errEl.classList.add('hidden'); errEl.textContent = ''; }

  const res = await apiFetch('/api/projects?action=import-shared', {
    method: 'POST',
    body: JSON.stringify({ shareCode })
  });
  if (!res.ok) {
    if (errEl) {
      errEl.textContent = res.data?.error || 'Não foi possível importar este código.';
      errEl.classList.remove('hidden');
    }
    return;
  }
  closeSaveProjectModal();
  showAccountToast(`Projeto "${res.data?.project?.name || 'Compartilhado'}" importado com sucesso!`, 'success');
  loadUserProjects();
}

/**
 * Gera e baixa uma imagem PNG de alta resolução do projeto salvo:
 * - Obrigatoriamente no formato COMPACTADO (cards compactos 236px, visão completa do fluxograma)
 * - Painel lateral direito com resumo completo: máquinas por tipo, logística/conexões, energia, recursos e saídas.
 */
async function exportSavedProjectCompactPng(projectId, projectName) {
  const safeName = (typeof projectName === 'string' && projectName) ? projectName : getSavedProjectNameById(projectId);
  projectName = safeName;
  showAccountToast('Gerando imagem compactada do projeto...', 'info');
  let proj = null;
  try {
    const res = await apiFetch(`/api/projects?id=${encodeURIComponent(projectId)}`, { method: 'GET' });
    if (res.ok && res.data?.project) proj = res.data.project;
  } catch {}
  if (!proj || !proj.payload) {
    showAccountToast('Não foi possível carregar os dados deste projeto.', 'error');
    return;
  }

  const p = proj.payload;
  let graph = null;
  let totalPowerMw = 0;

  try {
    if (p.sourceMode === 'free' && p.free && typeof Solver?.buildFreeCanvasGraph === 'function') {
      const diag = Solver.analyzeFreeProject ? Solver.analyzeFreeProject(p.free) : null;
      graph = Solver.buildFreeCanvasGraph(p.free, diag);
      totalPowerMw = Number(diag?.totalPowerConsumedMw || 0);
    } else if (p.pull && Array.isArray(p.pull.targets) && p.pull.targets.length > 0) {
      const pullRes = Solver.solvePull(p.pull);
      graph = Solver.buildCanvasFlowGraph('pull', pullRes, { showAllMachines: false });
      totalPowerMw = Number(pullRes?.totalPowerMw || 0);
    }
  } catch (err) {
    console.error('[exportPng] graph error:', err);
  }

  if (!graph || !Array.isArray(graph.columns) || graph.columns.length === 0) {
    showAccountToast('Este projeto não possui uma linha de produção montada para exportar.', 'error');
    return;
  }

  // Posiciona todos os cards no formato COMPACTADO (220×92)
  const CW = 220;
  const CH = 86;
  const COL_GAP = 64;
  const ROW_GAP = 22;
  const PAD = 36;

  const nodePos = new Map();
  let curX = PAD;
  let maxGraphY = 420;

  graph.columns.forEach((col) => {
    const nodes = col.nodes || [];
    if (nodes.length === 0) return;
    const rows = Math.min(8, nodes.length);
    const subCols = Math.ceil(nodes.length / rows);
    nodes.forEach((n, idx) => {
      const sc = Math.floor(idx / rows);
      const sr = idx % rows;
      const x = curX + sc * (CW + 24);
      const y = PAD + 48 + sr * (CH + ROW_GAP);
      nodePos.set(n.id, { x, y, w: CW, h: CH, node: n });
      if (y + CH + PAD > maxGraphY) maxGraphY = y + CH + PAD;
    });
    curX += subCols * CW + Math.max(0, subCols - 1) * 24 + COL_GAP;
  });

  const graphW = Math.max(760, curX - COL_GAP + PAD);
  const sideW = 340;
  const totalW = graphW + sideW;
  const totalH = Math.max(640, maxGraphY + 24);

  // Coleta estatísticas para a ficha técnica
  const machineCounts = new Map();
  const inputTotals = new Map();
  const outputTotals = new Map();
  let totalMachines = 0;
  let totalSplitters = 0;
  let totalMergers = 0;
  let totalJunctions = 0;

  for (const { node } of nodePos.values()) {
    const mult = node.badgeText && /^×(\d+)/.test(node.badgeText) ? Number(node.badgeText.slice(1)) : (Number(node.realCount) || 1);
    if (node.kind === 'splitter' || node.kind === 'smart_splitter') totalSplitters += mult;
    else if (node.kind === 'merger' || node.kind === 'priority_merger') totalMergers += mult;
    else if (node.kind === 'pipe_junction') totalJunctions += mult;
    else if (node.kind === 'final_product') {
      (node.outputsList || []).forEach((o) => {
        if (!o.item) return;
        outputTotals.set(o.item.name, (outputTotals.get(o.item.name) || 0) + (Number(o.rate) || 0));
      });
    } else if (node.kind !== 'power_emblem') {
      const nm = node.entity?.name || node.topLabel || 'Máquina';
      machineCounts.set(nm, (machineCounts.get(nm) || 0) + mult);
      totalMachines += mult;
      if (node.kind === 'extractor' && node.resourceExtractInfo?.item) {
        const rName = node.resourceExtractInfo.item.name;
        inputTotals.set(rName, (inputTotals.get(rName) || 0) + (Number(node.resourceExtractInfo.rate) || 0));
      }
    }
  }

  const canvas = document.createElement('canvas');
  const scale = Math.min(2, 3200 / Math.max(totalW, totalH));
  canvas.width = Math.round(totalW * scale);
  canvas.height = Math.round(totalH * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Fundo escuro neutro #101117 + grade sutil
  ctx.fillStyle = '#0c0d12';
  ctx.fillRect(0, 0, totalW, totalH);
  ctx.fillStyle = 'rgba(148, 163, 184, 0.14)';
  for (let gx = 24; gx < graphW; gx += 28) {
    for (let gy = 24; gy < totalH; gy += 28) {
      ctx.fillRect(gx, gy, 1.5, 1.5);
    }
  }

  // Cabeçalho do fluxograma
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 18px Inter, Segoe UI, sans-serif';
  ctx.fillText(proj.name || projectName || 'Projeto Satisfactory+', PAD, 34);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 12px Inter, Segoe UI, sans-serif';
  ctx.fillText(`Visão Compactada · ${(graph.edges || []).length} conexões · Satisfactory+ v2.5`, PAD, 54);

  // Conexões (ortogonais limpas)
  (graph.edges || []).forEach((e) => {
    const a = nodePos.get(e.from);
    const b = nodePos.get(e.to);
    if (!a || !b) return;
    const x1 = a.x + a.w;
    const y1 = a.y + a.h / 2;
    const x2 = b.x;
    const y2 = b.y + b.h / 2;
    const midX = x1 + (x2 - x1) / 2;
    ctx.strokeStyle = e.isPipe ? '#3b82f6' : '#EA580C';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(midX, y1);
    ctx.lineTo(midX, y2);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });

  // Helper rounded rect
  const roundRect = (x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  // Cards compactados
  for (const { x, y, w, h, node } of nodePos.values()) {
    const isFinal = node.kind === 'final_product' || Boolean(node.isFinalProduct);
    roundRect(x, y, w, h, 14);
    ctx.fillStyle = isFinal ? '#EA580C' : '#101117';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = isFinal ? '#EA580C' : 'rgba(148, 163, 184, 0.25)';
    ctx.stroke();

    // Título
    const title = isFinal
      ? (node.outputsList?.[0]?.item?.name || node.entity?.name || 'Item Final')
      : (node.entity?.name || node.topLabel || 'Bloco');
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 12.5px Inter, Segoe UI, sans-serif';
    ctx.fillText(title.length > 22 ? `${title.slice(0, 21)}…` : title, x + 14, y + 28);

    // Selo ×N
    const badge = node.badgeText || (isFinal ? 'FINAL' : '');
    if (badge) {
      const bw = Math.max(34, badge.length * 8 + 14);
      roundRect(x + w - bw - 10, y + 12, bw, 20, 10);
      ctx.fillStyle = isFinal ? '#ffffff' : '#EA580C';
      ctx.fill();
      ctx.fillStyle = isFinal ? '#EA580C' : '#ffffff';
      ctx.font = '700 10.5px monospace';
      ctx.fillText(badge, x + w - bw - 3, y + 25.5);
    }

    // Chip de fluxo principal
    const mainEntry = (node.kind === 'extractor' && node.resourceExtractInfo)
      ? node.resourceExtractInfo
      : (node.outputsList?.[0] || node.inputsList?.[0] || null);
    if (mainEntry) {
      const nm = mainEntry.item?.name || mainEntry.customName || 'Fluxo';
      const txt = `${nm.length > 16 ? nm.slice(0, 15) + '…' : nm} · ${fmt(mainEntry.rate || 0, 1)} ${mainEntry.unit || 'un'}/m`;
      roundRect(x + 12, y + 48, w - 24, 24, 12);
      ctx.fillStyle = isFinal ? 'rgba(255,255,255,0.18)' : 'rgba(148, 163, 184, 0.12)';
      ctx.fill();
      ctx.fillStyle = isFinal ? '#ffffff' : '#cbd5e1';
      ctx.font = '600 11px Inter, Segoe UI, sans-serif';
      ctx.fillText(txt, x + 20, y + 64);
    }
  }

  // Painel direito com informações completas da linha de produção
  ctx.fillStyle = '#101117';
  ctx.fillRect(graphW, 0, sideW, totalH);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(graphW, 0);
  ctx.lineTo(graphW, totalH);
  ctx.stroke();

  let sy = 36;
  const sx = graphW + 22;
  ctx.fillStyle = '#EA580C';
  ctx.font = '800 11px Inter, Segoe UI, sans-serif';
  ctx.fillText('FICHA TÉCNICA DA LINHA', sx, sy);
  sy += 24;

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 16px Inter, Segoe UI, sans-serif';
  const pTitle = proj.name || projectName || 'Projeto';
  ctx.fillText(pTitle.length > 26 ? pTitle.slice(0, 25) + '…' : pTitle, sx, sy);
  sy += 24;

  const drawStatLine = (lbl, val) => {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 12px Inter, Segoe UI, sans-serif';
    ctx.fillText(lbl, sx, sy);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 12px monospace';
    ctx.fillText(String(val), graphW + sideW - 22 - ctx.measureText(String(val)).width, sy);
    sy += 21;
  };

  drawStatLine('Modo:', proj.sourceMode === 'free' ? 'Oficina' : 'Produção');
  drawStatLine('Total de máquinas:', totalMachines);
  drawStatLine('Energia estimada:', `${fmt(totalPowerMw, 1)} MW`);
  drawStatLine('Conexões (esteiras/tubos):', (graph.edges || []).length);
  drawStatLine('Divisores / Unificadores:', `${totalSplitters} / ${totalMergers}`);
  if (totalJunctions > 0) drawStatLine('Junções de tubulação:', totalJunctions);

  const drawSectionList = (heading, entries, suffix = '') => {
    if (entries.length === 0 || sy > totalH - 60) return;
    sy += 10;
    ctx.fillStyle = '#EA580C';
    ctx.font = '700 11px Inter, Segoe UI, sans-serif';
    ctx.fillText(heading, sx, sy);
    sy += 18;
    entries.slice(0, 12).forEach(([k, v]) => {
      if (sy > totalH - 36) return;
      const valTxt = suffix ? `${fmt(v, 1)}${suffix}` : `×${v}`;
      drawStatLine(k.length > 22 ? k.slice(0, 21) + '…' : k, valTxt);
    });
  };

  drawSectionList('MÁQUINAS POR TIPO', [...machineCounts.entries()]);
  drawSectionList('RECURSOS DE ENTRADA', [...inputTotals.entries()], '/min');
  drawSectionList('PRODUÇÃO FINAL', [...outputTotals.entries()], '/min');

  ctx.fillStyle = '#64748b';
  ctx.font = '600 11px Inter, Segoe UI, sans-serif';
  ctx.fillText('Gerado por Satisfactory+ v2.5', sx, totalH - 18);

  const safeFile = String(proj.name || projectName || 'projeto')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `${safeFile}-satisfactory-plus.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  showAccountToast('Imagem PNG compactada baixada com sucesso!', 'success');
}


/* ============================================================================
 * TELEMETRIA SILENCIOSA (SEM AVISOS AOS USUÁRIOS) & PAINEL EXECUTIVO CEO
 * Exclusivo para a conta CEO (role === 'admin', validado no backend com 403)
 * ========================================================================== */

const CeoPanelState = {
  loading: false,
  error: '',
  data: null,
  section: 'overview', // overview | geo | users | usage
  period: '7d', // 24h | 7d | 30d | all
  userSearch: '',
  userFilter: 'all' // all | active7d | with_projects
};

function getAnalyticsVisitorId() {
  try {
    let vid = localStorage.getItem('splus_vid');
    if (!vid) {
      vid = `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem('splus_vid', vid);
    }
    return vid;
  } catch {
    return `v_${Date.now().toString(36)}`;
  }
}

function getAnalyticsSessionId() {
  try {
    let sid = sessionStorage.getItem('splus_sid');
    if (!sid) {
      sid = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem('splus_sid', sid);
    }
    return sid;
  } catch {
    return `s_${Date.now().toString(36)}`;
  }
}

function buildAnalyticsBasePayload(eventType, extra = {}) {
  const w = window.screen?.width || window.innerWidth || 1280;
  const device = w <= 640 ? 'mobile' : (w <= 1024 ? 'tablet' : 'desktop');
  let utmSource = '';
  try { utmSource = new URLSearchParams(window.location.search).get('utm_source') || ''; } catch {}
  return {
    event: eventType,
    vid: getAnalyticsVisitorId(),
    sid: getAnalyticsSessionId(),
    mode: extra.mode || (typeof AppState === 'object' ? AppState.mode : 'production') || 'production',
    theme: (typeof AppState === 'object' && AppState.theme === 'light') ? 'light' : 'dark',
    lang: (typeof SettingsState === 'object' && SettingsState.prefs?.lang) ? SettingsState.prefs.lang : 'pt-BR',
    device,
    screenW: w,
    referrer: document.referrer || '',
    utmSource,
    ...extra
  };
}

const _analyticsQueue = [];
let _analyticsFlushTimer = null;
let _lastPingSentTs = 0;

function flushAnalyticsQueue(useBeacon = false) {
  if (_analyticsFlushTimer) {
    clearTimeout(_analyticsFlushTimer);
    _analyticsFlushTimer = null;
  }
  if (_analyticsQueue.length === 0) return;
  const batch = _analyticsQueue.splice(0, 30);
  const bodyStr = JSON.stringify({ events: batch });
  _lastPingSentTs = Date.now();

  if (useBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      const blob = new Blob([bodyStr], { type: 'application/json' });
      if (navigator.sendBeacon('/api/analytics?action=ping', blob)) return;
    } catch {}
  }

  try {
    fetch('/api/analytics?action=ping', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'SatisfactoryPlus'
      },
      body: bodyStr,
      keepalive: true
    }).catch(() => {});
  } catch {}
}

function trackAnalyticsEvent(eventType, extra = {}, immediate = false) {
  try {
    _analyticsQueue.push(buildAnalyticsBasePayload(eventType, extra));
    if (immediate || _analyticsQueue.length >= 10) {
      flushAnalyticsQueue(false);
    } else if (!_analyticsFlushTimer) {
      _analyticsFlushTimer = setTimeout(() => flushAnalyticsQueue(false), 2500);
    }
  } catch {}
}

function sendSilentAnalyticsPing(eventType = 'heartbeat', modeOverride = null) {
  trackAnalyticsEvent(eventType, modeOverride ? { mode: modeOverride } : {}, true);
}

let _lastModePingTs = 0;
function trackAnalyticsModeSwitch(mode) {
  if (mode === 'ceo') {
    sendSilentAnalyticsPing('heartbeat', 'ceo');
    return;
  }
  const now = Date.now();
  if (now - _lastModePingTs < 1200) return;
  _lastModePingTs = now;
  trackAnalyticsEvent('mode_switch', { mode }, false);
}

let _errTrackWindowStart = 0;
let _errTrackCount = 0;
function trackAnalyticsError(errType, msg) {
  const now = Date.now();
  if (now - _errTrackWindowStart > 60000) {
    _errTrackWindowStart = now;
    _errTrackCount = 0;
  }
  if (_errTrackCount >= 5) return;
  _errTrackCount++;
  const cleanMsg = String(msg || 'Erro')
    .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '[email]')
    .replace(/(password|senha|token|secret|hash|answer|resposta)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .slice(0, 140);
  trackAnalyticsEvent('error', { errType, msg: cleanMsg }, false);
}

(function initSilentTelemetry() {
  if (typeof window === 'undefined') return;
  const startTelemetry = () => {
    setTimeout(() => sendSilentAnalyticsPing('visit'), 600);
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        sendSilentAnalyticsPing('heartbeat');
      }
    }, 60000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flushAnalyticsQueue(true);
      } else if (Date.now() - _lastPingSentTs > 45000) {
        sendSilentAnalyticsPing('heartbeat');
      }
    });
    window.addEventListener('pagehide', () => flushAnalyticsQueue(true));
    window.addEventListener('error', (ev) => {
      trackAnalyticsError('frontend_error', ev?.message || 'Erro de script no navegador');
    });
    window.addEventListener('unhandledrejection', (ev) => {
      const reason = ev?.reason?.message || String(ev?.reason || 'Promise rejeitada');
      trackAnalyticsError('frontend_error', reason);
    });
  };
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startTelemetry);
  } else {
    startTelemetry();
  }
})();

function renderCeoMode(sidebarEl, emptyOverlay) {
  if (!AccountState.user || AccountState.user.role !== 'admin') {
    if (typeof switchMode === 'function') switchMode('production');
    return;
  }
  emptyOverlay.classList.add('hidden');
  emptyOverlay.innerHTML = '';

  const navItems = [
    { id: 'overview', label: 'Visão Executiva', color: '#EA580C' },
    { id: 'geo', label: 'Geolocalização (Países / UF)', color: '#2DD4BF' },
    { id: 'usage', label: 'Uso & Performance', color: '#4C9AFF' },
    { id: 'users', label: 'Usuários Cadastrados', color: '#B07CFF' }
  ];

  sidebarEl.innerHTML = `<div class="ds-card-stack">
    ${DS.sectionCard({
      chip: 'CEO',
      title: 'Painel Executivo',
      bodyHtml: `
        <div class="ds-opt-list">
          ${navItems.map((it) => DS.optionRow({
            color: it.color,
            title: it.label,
            arrow: true,
            selected: CeoPanelState.section === it.id,
            compact: true,
            onClick: `CeoPanelState.section='${it.id}'; renderCeoMode(document.getElementById('left-sidebar-content'), document.getElementById('spaces-empty-overlay')); renderCeoWorkspace();`
          })).join('')}
        </div>
      `
    })}
    ${DS.sectionCard({
      chip: 'AÇÕES',
      title: 'Relatórios & Atualização',
      bodyHtml: `
        <div style="display:flex;flex-direction:column;gap:8px;">
          <button type="button" class="ds-btn-primary" style="width:100%;" onclick="loadCeoDashboard()">${CeoPanelState.loading ? 'Atualizando...' : 'Atualizar dados agora'}</button>
          <button type="button" class="ds-btn-secondary" style="width:100%;" onclick="exportCeoReportCsv()">Exportar Usuários (.CSV)</button>
          <button type="button" class="ds-btn-secondary" style="width:100%;" onclick="exportCeoReportJson()">Exportar Relatório (.JSON)</button>
        </div>
      `
    })}
  </div>`;

  if (!CeoPanelState.data && !CeoPanelState.loading) {
    loadCeoDashboard();
  } else {
    renderCeoWorkspace();
  }
}

function setCeoPeriod(period) {
  if (!['24h', '7d', '30d', 'all'].includes(period)) return;
  CeoPanelState.period = period;
  loadCeoDashboard();
}

async function loadCeoDashboard() {
  if (!AccountState.user || AccountState.user.role !== 'admin') return;
  CeoPanelState.loading = true;
  CeoPanelState.error = '';
  renderCeoWorkspace();

  try {
    const res = await apiFetch(`/api/analytics?action=dashboard&period=${encodeURIComponent(CeoPanelState.period || '7d')}`, { method: 'GET' });
    if (!res.ok) {
      CeoPanelState.error = res.data?.error || 'Não foi possível carregar os dados do painel CEO.';
    } else {
      CeoPanelState.data = res.data;
    }
  } catch {
    CeoPanelState.error = 'Erro de conexão ao buscar analytics do servidor.';
  } finally {
    CeoPanelState.loading = false;
    renderCeoWorkspace();
  }
}

function renderCeoRankList(items, emptyMsg, barColor = '#EA580C') {
  if (!Array.isArray(items) || items.length === 0) {
    return `<div class="ceo-empty-compact">${escText(emptyMsg)}</div>`;
  }
  const total = items.reduce((a, b) => a + (Number(b.count) || 0), 0) || 1;
  const max = Math.max(...items.map((x) => Number(x.count) || 0), 1);
  return `<div class="ceo-rank-list">
    ${items.slice(0, 14).map((it) => {
      const pct = Math.round(((Number(it.count) || 0) / total) * 100);
      const barW = Math.max(4, Math.round(((Number(it.count) || 0) / max) * 100));
      return `
        <div class="ceo-rank-row">
          <div class="ceo-rank-top">
            <span class="ceo-rank-name">${escText(it.name || it.code)}</span>
            <span class="ceo-rank-val"><strong>${it.count}</strong> <small>(${pct}%)</small></span>
          </div>
          <div class="ceo-rank-bar"><i style="width:${barW}%;background:${barColor};"></i></div>
        </div>
      `;
    }).join('')}
  </div>`;
}

function renderCeoDeltaBadge(delta, period) {
  if (period === 'all' || delta === null || delta === undefined) return '';
  const n = Number(delta) || 0;
  const compLabel = period === '24h' ? 'vs. ontem' : (period === '7d' ? 'vs. 7d ant.' : 'vs. 30d ant.');
  if (n > 0) return `<span class="ceo-delta is-up">↑ ${n} ${compLabel}</span>`;
  if (n < 0) return `<span class="ceo-delta is-down">↓ ${Math.abs(n)} ${compLabel}</span>`;
  return `<span class="ceo-delta is-flat">— igual ${compLabel}</span>`;
}

function formatDurationMinutes(mins) {
  if (mins === null || mins === undefined) return '—';
  const m = Number(mins);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function renderCeoWorkspace() {
  const view = document.getElementById('ceo-workspace-view');
  if (!view) return;
  if (!AccountState.user || AccountState.user.role !== 'admin') {
    view.innerHTML = '';
    return;
  }

  if (CeoPanelState.loading && !CeoPanelState.data) {
    view.innerHTML = `<div class="ceo-ws-shell"><div class="ceo-card"><p style="margin:0;color:var(--text-secondary);">Carregando métricas do Satisfactory+...</p></div></div>`;
    return;
  }

  const d = CeoPanelState.data || {
    period: CeoPanelState.period || '7d',
    kpis: {},
    dailySeries: [], countries: [], brStates: [], modes: [],
    devices: { desktop: 0, mobile: 0, tablet: 0 }, browsers: [], oses: [], screens: [], sources: [],
    themes: { dark: 0, light: 0 }, langs: [], calcUses: [], itemsGenerated: [],
    funnel: { visited: 0, registered: 0, generatedLine: 0, savedProject: 0 },
    errorSummary: {}, recentErrors: [], onlineList: [], users: []
  };
  const k = d.kpis || {};
  const period = d.period || CeoPanelState.period || '7d';
  const periodLabelMap = { '24h': '24h', '7d': '7d', '30d': '30d', all: 'Tudo' };
  const modeLabelMap = { production: 'Produção', power: 'Energia', free: 'Oficina', map: 'Mapa', recipes: 'Receitas', library: 'Biblioteca', calculator: 'Calculadora', projects: 'Projetos', reports: 'Reports' };
  const modesNamed = (d.modes || []).filter((m) => m.code !== 'ceo').map((m) => ({ ...m, name: modeLabelMap[m.code] || m.code }));

  const hasChartData = (d.dailySeries || []).some((pt) => (Number(pt.visits) || 0) > 0);
  const maxDailyVisits = Math.max(1, ...(d.dailySeries || []).map((x) => Number(x.visits) || 0));
  const chartHtml = hasChartData
    ? `
      <div class="ceo-chart-wrap">
        ${(d.dailySeries || []).map((pt) => {
          const h = Math.max(4, Math.round(((Number(pt.visits) || 0) / maxDailyVisits) * 120));
          return `
            <div class="ceo-chart-col" title="${pt.date}: ${pt.visits} visitas · ${pt.unique} únicos · ${pt.newUsers} novos cadastros">
              <span class="ceo-chart-num">${pt.visits || ''}</span>
              <div class="ceo-chart-bar-box"><i style="height:${h}px;"></i></div>
              <span class="ceo-chart-lbl">${escText(pt.label || (pt.date ? `${pt.date.slice(8, 10)}/${pt.date.slice(5, 7)}` : ''))}</span>
            </div>
          `;
        }).join('')}
      </div>
    `
    : '<div class="ceo-empty-compact">Nenhuma visita registrada nos últimos 14 dias.</div>';

  const sec = CeoPanelState.section || 'overview';
  let bodyHtml = '';

  if (sec === 'overview') {
    const visitsMain = period === 'all' ? (k.visitsTotal || 0) : (k.visitsPeriod || 0);
    const uniqueMain = period === 'all' ? (k.unique30d || 0) : (k.uniquePeriod || 0);
    const usersMain = period === 'all' ? (k.totalUsers || 0) : (k.newUsersPeriod || 0);

    bodyHtml = `
      <div class="ceo-kpi-grid">
        <div class="ceo-kpi-card is-online">
          <span class="ceo-kpi-lbl"><i class="ceo-online-dot"></i> Online agora (5m)</span>
          <strong class="ceo-kpi-val">${k.onlineNow || 0}</strong>
          <small>Sessões ativas no site</small>
        </div>
        <div class="ceo-kpi-card">
          <span class="ceo-kpi-lbl">Usuários cadastrados</span>
          <strong class="ceo-kpi-val">${k.totalUsers || 0}</strong>
          <small>+${usersMain} (${periodLabelMap[period]}) · ${renderCeoDeltaBadge(k.newUsersDelta, period) || `+${k.newUsers7d || 0} (7d)`}</small>
        </div>
        <div class="ceo-kpi-card">
          <span class="ceo-kpi-lbl">Visitas (${periodLabelMap[period]})</span>
          <strong class="ceo-kpi-val">${visitsMain}</strong>
          <small>Hoje: ${k.visitsToday || 0} · 7d: ${k.visits7d || 0} · ${renderCeoDeltaBadge(k.visitsDelta, period) || `Total: ${k.visitsTotal || 0}`}</small>
        </div>
        <div class="ceo-kpi-card">
          <span class="ceo-kpi-lbl">Visitantes únicos (${periodLabelMap[period]})</span>
          <strong class="ceo-kpi-val">${uniqueMain}</strong>
          <small>Hoje: ${k.uniqueToday || 0} · 7d: ${k.unique7d || 0} · ${renderCeoDeltaBadge(k.uniqueDelta, period) || `30d: ${k.unique30d || 0}`}</small>
        </div>
        <div class="ceo-kpi-card">
          <span class="ceo-kpi-lbl">Projetos na nuvem</span>
          <strong class="ceo-kpi-val">${k.totalProjects || 0}</strong>
          <small>${k.sharedProjects || 0} compartilhados · Média ${k.avgProjectsPerUser || 0}/usuário</small>
        </div>
        <div class="ceo-kpi-card">
          <span class="ceo-kpi-lbl">Engajamento (7d)</span>
          <strong class="ceo-kpi-val">${k.engagementRate7d || 0}%</strong>
          <small>${k.activeUsers7d || 0} de ${k.totalUsers || 0} usuários ativos</small>
        </div>
      </div>

      <div class="ceo-grid-2">
        <div class="ceo-card">
          <div class="ceo-card-head"><h4>Visitas nos últimos 14 dias</h4><span>Passe o mouse nas barras</span></div>
          ${chartHtml}
        </div>
        <div class="ceo-card">
          <div class="ceo-card-head"><h4>Online agora</h4><span>${(d.onlineList || []).length} ativo(s)</span></div>
          ${(d.onlineList || []).length === 0
            ? '<div class="ceo-empty-compact">Nenhuma sessão ativa nos últimos 5 minutos.</div>'
            : `<div class="ceo-online-list">
                ${(d.onlineList || []).slice(0, 12).map((o) => `
                  <div class="ceo-online-row">
                    <div>
                      <strong>${o.username ? escText(o.username) : 'Visitante'}</strong>
                      ${o.role === 'admin' ? '<span class="user-role-tag ceo-role-tag">CEO</span>' : ''}
                      <small>${escText(o.countryName)}${o.regionName ? ` · ${escText(o.regionName)}` : ''}</small>
                    </div>
                    <span class="ceo-mode-pill">${escText(modeLabelMap[o.mode] || o.mode)}</span>
                  </div>
                `).join('')}
              </div>`}
        </div>
      </div>

      <div class="ceo-grid-2">
        <div class="ceo-card">
          <div class="ceo-card-head"><h4>Origem do tráfego</h4><span>${periodLabelMap[period]}</span></div>
          ${renderCeoRankList(d.sources, 'Sem dados de origem de tráfego neste período.', '#EA580C')}
        </div>
        <div class="ceo-card">
          <div class="ceo-card-head">
            <h4>Reports</h4>
            <button type="button" class="ds-btn-secondary" style="padding:4px 10px;font-size:11px;" onclick="switchMode('reports')">Abrir Reports</button>
          </div>
          <div class="ceo-reports-stats">
            <div class="ceo-mini-stat"><span>Pendentes</span><strong>${k.openReports || 0}</strong></div>
            <div class="ceo-mini-stat"><span>Resolvidos</span><strong>${k.resolvedReports || 0}</strong></div>
            <div class="ceo-mini-stat"><span>Tempo médio de resposta</span><strong>${formatDurationMinutes(k.avgReportResponseMinutes)}</strong></div>
          </div>
          ${(k.openReports || 0) === 0 ? '<div class="ceo-empty-compact">Não há reportes a serem resolvidos.</div>' : ''}
        </div>
      </div>

      <div class="ceo-grid-2">
        <div class="ceo-card">
          <div class="ceo-card-head"><h4>Países de origem</h4><span>Top acessos</span></div>
          ${renderCeoRankList(d.countries, 'Ainda sem dados geográficos suficientes.', '#2DD4BF')}
        </div>
        <div class="ceo-card">
          <div class="ceo-card-head"><h4>Estados do Brasil (UF)</h4><span>Acessos do BR</span></div>
          ${renderCeoRankList(d.brStates, 'Ainda sem acessos por estado brasileiro registrados.', '#EA580C')}
        </div>
      </div>
    `;
  } else if (sec === 'geo') {
    bodyHtml = `
      <div class="ceo-grid-2">
        <div class="ceo-card">
          <div class="ceo-card-head"><h4>Ranking de Países</h4><span>${(d.countries || []).length} país(es)</span></div>
          ${renderCeoRankList(d.countries, 'Nenhum acesso geográfico registrado ainda.', '#2DD4BF')}
        </div>
        <div class="ceo-card">
          <div class="ceo-card-head"><h4>Estados do Brasil (UF)</h4><span>${(d.brStates || []).length} estado(s)</span></div>
          ${renderCeoRankList(d.brStates, 'Nenhum acesso por estado do Brasil registrado ainda.', '#EA580C')}
        </div>
      </div>
    `;
  } else if (sec === 'usage') {
    const devArr = [
      { code: 'desktop', name: 'Desktop / Notebook', count: Number(d.devices?.desktop) || 0 },
      { code: 'mobile', name: 'Celular', count: Number(d.devices?.mobile) || 0 },
      { code: 'tablet', name: 'Tablet', count: Number(d.devices?.tablet) || 0 }
    ].filter((x) => x.count > 0);
    const themeArr = [
      { code: 'dark', name: 'Modo Escuro (#101117)', count: Number(d.themes?.dark) || 0 },
      { code: 'light', name: 'Modo Claro', count: Number(d.themes?.light) || 0 }
    ].filter((x) => x.count > 0);
    const calcLabelMap = {
      numeric: 'Numérica', resources: 'Recursos', production: 'Produção',
      energy: 'Energia', logistics: 'Logística', sink: 'AWESOME Sink', elevator: 'Elevador Espacial'
    };
    const calcNamed = (d.calcUses || []).map((c) => ({ ...c, name: calcLabelMap[c.code] || c.code }));

    const f = d.funnel || { visited: 0, registered: 0, generatedLine: 0, savedProject: 0 };
    const funnelSteps = [
      { label: 'Visitou', count: Number(f.visited) || 0, prev: null },
      { label: 'Criou conta', count: Number(f.registered) || 0, prev: Number(f.visited) || 0 },
      { label: 'Gerou uma linha', count: Number(f.generatedLine) || 0, prev: Number(f.registered) || 0 },
      { label: 'Salvou um projeto', count: Number(f.savedProject) || 0, prev: Number(f.generatedLine) || 0 }
    ];
    const funnelMax = Math.max(1, ...funnelSteps.map((s) => s.count));
    const hasFunnelData = funnelSteps.some((s) => s.count > 0);

    const errSum = d.errorSummary || {};
    const errCounters = [
      { label: 'Login que falhou', count: Number(errSum.auth_login_fail) || 0 },
      { label: 'Sessão expirada', count: Number(errSum.auth_session_expired) || 0 },
      { label: 'Erro servidor auth', count: Number(errSum.auth_server_error) || 0 },
      { label: 'Erro do front-end', count: Number(errSum.frontend_error) || 0 },
      { label: 'Erro de API', count: Number(errSum.api_error) || 0 }
    ];
    const errTypeLabel = {
      auth_login_fail: 'Login falhou',
      auth_session_expired: 'Sessão expirada',
      auth_server_error: 'Servidor Auth',
      frontend_error: 'Front-end',
      api_error: 'API'
    };

    bodyHtml = `
      <div class="ceo-grid-2">
        <div class="ceo-card">
          <div class="ceo-card-head"><h4>Abas mais abertas</h4><span>${periodLabelMap[period]}</span></div>
          ${renderCeoRankList(modesNamed, 'Sem dados de uso por aba ainda.', '#4C9AFF')}
        </div>
        <div class="ceo-card">
          <div class="ceo-card-head"><h4>Produtos e receitas mais gerados</h4><span>Top 10</span></div>
          ${renderCeoRankList(d.itemsGenerated, 'Nenhuma linha gerada registrada neste período.', '#EA580C')}
        </div>
      </div>

      <div class="ceo-grid-2">
        <div class="ceo-card">
          <div class="ceo-card-head"><h4>Uso de funções</h4><span>${periodLabelMap[period]}</span></div>
          <div class="ceo-reports-stats">
            <div class="ceo-mini-stat"><span>Linhas geradas</span><strong>${k.linesGeneratedPeriod || 0}</strong></div>
            <div class="ceo-mini-stat"><span>Projetos salvos</span><strong>${k.projectsSavedPeriod || 0}</strong></div>
            <div class="ceo-mini-stat"><span>Usos da Calculadora</span><strong>${k.calcUsesTotalPeriod || 0}</strong></div>
          </div>
          ${renderCeoRankList(calcNamed, 'Sem usos da Calculadora registrados neste período.', '#2DD4BF')}
        </div>
        <div class="ceo-card">
          <div class="ceo-card-head"><h4>Funil de conversão</h4><span>${periodLabelMap[period]}</span></div>
          ${!hasFunnelData
            ? '<div class="ceo-empty-compact">Sem eventos suficientes para montar o funil.</div>'
            : `<div class="ceo-rank-list">
                ${funnelSteps.map((st, idx) => {
                  const pct = idx === 0 ? 100 : (st.prev > 0 ? Math.round((st.count / st.prev) * 100) : 0);
                  const barW = st.count > 0 ? Math.max(6, Math.round((st.count / funnelMax) * 100)) : 0;
                  return `
                    <div class="ceo-rank-row">
                      <div class="ceo-rank-top">
                        <span class="ceo-rank-name">${escText(st.label)}</span>
                        <span class="ceo-rank-val"><strong>${st.count}</strong> ${idx > 0 ? `<small>(${pct}% da etapa ant.)</small>` : ''}</span>
                      </div>
                      <div class="ceo-rank-bar"><i style="width:${barW}%;background:#EA580C;"></i></div>
                    </div>
                  `;
                }).join('')}
              </div>`}
        </div>
      </div>

      <div class="ceo-grid-2">
        <div class="ceo-card">
          <div class="ceo-card-head"><h4>Dispositivos</h4><span>Desktop / Celular / Tablet</span></div>
          ${renderCeoRankList(devArr, 'Sem dados de dispositivo.', '#2DD4BF')}
          <div class="ceo-card-head" style="margin-top:6px;"><h4>Resolução de tela</h4><span>Faixas</span></div>
          ${renderCeoRankList(d.screens, 'Sem dados de resolução.', '#4C9AFF')}
        </div>
        <div class="ceo-card">
          <div class="ceo-card-head"><h4>Navegadores</h4><span>User Agent</span></div>
          ${renderCeoRankList(d.browsers, 'Sem dados de navegador.', '#B07CFF')}
          <div class="ceo-card-head" style="margin-top:6px;"><h4>Sistemas operacionais</h4><span>SO</span></div>
          ${renderCeoRankList(d.oses, 'Sem dados de sistema operacional.', '#EA580C')}
        </div>
      </div>

      <div class="ceo-grid-2">
        <div class="ceo-card">
          <div class="ceo-card-head"><h4>Idiomas</h4><span>Preferência</span></div>
          ${renderCeoRankList(d.langs, 'Sem dados de idioma ainda.', '#B07CFF')}
        </div>
        <div class="ceo-card">
          <div class="ceo-card-head"><h4>Temas</h4><span>Escuro vs Claro</span></div>
          ${renderCeoRankList(themeArr, 'Sem dados de tema.', '#EA580C')}
        </div>
      </div>

      <div class="ceo-card">
        <div class="ceo-card-head"><h4>Erros e falhas</h4><span>${periodLabelMap[period]} · sem dados sensíveis</span></div>
        <div class="ceo-err-counters">
          ${errCounters.map((ec) => `<div class="ceo-mini-stat"><span>${escText(ec.label)}</span><strong>${ec.count}</strong></div>`).join('')}
        </div>
        ${(d.recentErrors || []).length === 0
          ? '<div class="ceo-empty-compact">Nenhum erro registrado.</div>'
          : `<div class="ceo-table-wrap">
              <table class="ceo-users-table">
                <thead><tr><th>Data/Hora</th><th>Tipo</th><th>Aba</th><th>Mensagem</th></tr></thead>
                <tbody>
                  ${(d.recentErrors || []).slice(0, 20).map((er) => `
                    <tr>
                      <td><small>${er.ts ? fmtDateBR(er.ts) : '—'}</small></td>
                      <td><span class="ceo-err-badge">${escText(errTypeLabel[er.type] || er.type)}</span></td>
                      <td>${escText(modeLabelMap[er.mode] || er.mode || '—')}</td>
                      <td><small>${escText(er.msg || '')}</small></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>`}
      </div>
    `;
  } else {
    const q = String(CeoPanelState.userSearch || '').trim().toLowerCase();
    const flt = CeoPanelState.userFilter || 'all';
    const now = Date.now();
    const ms7d = 7 * 24 * 60 * 60 * 1000;
    const filteredUsers = (d.users || []).filter((u) => {
      if (flt === 'active7d') {
        const ts = u.lastSeenAt ? new Date(u.lastSeenAt).getTime() : 0;
        if (!ts || now - ts > ms7d) return false;
      }
      if (flt === 'with_projects' && (Number(u.projectsCount) || 0) <= 0) return false;
      if (q) {
        const hay = `${u.username} ${u.countryName} ${u.regionName} ${u.lang}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    bodyHtml = `
      <div class="ceo-card">
        <div class="ceo-card-head" style="flex-wrap:wrap;gap:10px;">
          <h4>Usuários cadastrados (${filteredUsers.length} de ${(d.users || []).length})</h4>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <select class="sidebar-select" style="width:auto;min-width:150px;" onchange="CeoPanelState.userFilter=this.value;renderCeoWorkspace();">
              <option value="all" ${flt === 'all' ? 'selected' : ''}>Todos os usuários</option>
              <option value="active7d" ${flt === 'active7d' ? 'selected' : ''}>Ativos nos últimos 7d</option>
              <option value="with_projects" ${flt === 'with_projects' ? 'selected' : ''}>Com projetos salvos</option>
            </select>
            <input type="search" class="sidebar-input" style="width:220px;" placeholder="Buscar usuário, país, UF..." value="${escText(CeoPanelState.userSearch)}" oninput="CeoPanelState.userSearch=this.value;renderCeoWorkspace();" />
          </div>
        </div>
        <div class="ceo-table-wrap">
          <table class="ceo-users-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Origem (País / UF)</th>
                <th>Cadastro</th>
                <th>Último acesso</th>
                <th>Projetos</th>
                <th>Recuperação</th>
                <th>Idioma / Tema</th>
              </tr>
            </thead>
            <tbody>
              ${filteredUsers.length === 0
                ? '<tr><td colspan="7" style="text-align:center;color:var(--text-secondary);padding:20px;">Nenhum usuário encontrado.</td></tr>'
                : filteredUsers.map((u) => `
                  <tr>
                    <td>
                      <strong>${escText(u.username)}</strong>
                      ${u.role === 'ceo' ? '<span class="user-role-tag ceo-role-tag">CEO</span>' : ''}
                    </td>
                    <td>${escText(u.countryName)}${u.regionName ? ` · <small>${escText(u.regionName)}</small>` : ''}</td>
                    <td>${u.createdAt ? fmtDateBR(u.createdAt) : '—'}</td>
                    <td>${u.lastSeenAt ? fmtDateBR(u.lastSeenAt) : '—'}</td>
                    <td style="font-family:var(--font-mono);font-weight:700;">${u.projectsCount || 0}</td>
                    <td>${u.hasSecurityRecovery ? '<span style="color:#10b981;font-weight:700;">Ativa</span>' : '<span style="color:var(--text-secondary);">Pendente</span>'}</td>
                    <td><small>${escText(u.lang)} · ${escText(u.theme)}</small></td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  view.innerHTML = `
    <div class="ceo-ws-shell">
      <div class="ceo-ws-header">
        <div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="user-role-tag ceo-role-tag">CEO</span>
            <h2>Painel Executivo — Satisfactory+</h2>
          </div>
          <p>Acesso privado exclusivo do fundador · Atualizado: ${d.generatedAt ? fmtDateBR(d.generatedAt) : 'agora'}</p>
        </div>
        <div class="ceo-period-pills" role="group" aria-label="Filtro de período">
          ${['24h', '7d', '30d', 'all'].map((p) => `
            <button type="button" class="ceo-period-btn ${period === p ? 'active' : ''}" onclick="setCeoPeriod('${p}')">${periodLabelMap[p]}</button>
          `).join('')}
        </div>
      </div>
      ${CeoPanelState.error ? `<div class="form-alert error">${escText(CeoPanelState.error)}</div>` : ''}
      ${bodyHtml}
    </div>
  `;
}

function exportCeoReportCsv() {
  const users = CeoPanelState.data?.users || [];
  if (users.length === 0) {
    showAccountToast('Carregue os dados antes de exportar.', 'error');
    return;
  }
  const header = ['usuario', 'cargo', 'pais', 'estado', 'cadastro', 'ultimo_acesso', 'projetos', 'recuperacao', 'idioma', 'tema'];
  const escCsv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [header.join(','), ...users.map((u) => [
    u.username, u.role, u.countryName, u.regionName, u.createdAt || '', u.lastSeenAt || '', u.projectsCount || 0, u.hasSecurityRecovery ? 'ativa' : 'pendente', u.lang, u.theme
  ].map(escCsv).join(','))];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `satisfactory-plus-ceo-usuarios-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportCeoReportJson() {
  if (!CeoPanelState.data) {
    showAccountToast('Carregue os dados antes de exportar.', 'error');
    return;
  }
  const blob = new Blob([JSON.stringify(CeoPanelState.data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `satisfactory-plus-ceo-analytics-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
