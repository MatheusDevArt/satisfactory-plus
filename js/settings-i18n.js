/**
 * Satisfactory+ — Barra Lateral de Navegação Principal (#main-nav-rail),
 * Modal de Configurações (#settings-modal), Internacionalização (i18n: pt-BR, en-US, es-ES),
 * Recuperação de Conta sem E-mail (Pergunta de Segurança com resposta normalizada e hash SHA-256),
 * Perfil Opcional e Preferências Leves Unificadas (JSON compacto).
 */

const SPLUS_PREFS_STORAGE_KEY = 'splus_user_prefs_v25';
const SPLUS_LOCAL_RECOVERY_KEY = 'splus_local_recovery_v25';
const SPLUS_LOCAL_RL_KEY = 'splus_recovery_rl_v25';
const SPLUS_LANG_MANUAL_KEY = 'splus_lang_manual_v1';

const SECURITY_QUESTIONS_LIST = [
  'Qual foi a primeira fábrica ou item que você automatizou no Satisfactory?',
  'Qual é o nome do seu bioma inicial favorito em MASSAGE-2(A-B)b?',
  'Qual era o apelido ou código do seu primeiro mundo/save?',
  'Qual é a sua receita alternativa favorita do jogo?',
  'Qual palavra-chave secreta você escolheu para recuperar esta conta?'
];

const DEFAULT_USER_PREFS = {
  lang: 'pt-BR', // 'pt-BR' | 'en-US' | 'es-ES'
  theme: 'dark', // 'dark' | 'light' | 'system'
  flowDirection: 'LR', // 'LR' | 'TB' | 'RL' | 'BT'
  maxBeltTier: 6, // 1..6
  maxPipeTier: 2, // 1..2
  expandAllMachinesDefault: true,
  navRailCollapsed: false,
  showCanvasGrid: true,
  snapToGrid: true,
  reduceMotion: false,
  energyAutoUnit: true, // true = auto MW/GW, false = sempre MW
  autoPatchNotes: true,
  profile: {
    gender: 'prefer_not_to_say', // 'prefer_not_to_say' | 'male' | 'female' | 'other'
    age: '',
    country: ''
  }
};

const SettingsState = {
  isOpen: false,
  activeSection: 'all',
  prefs: loadLocalUserPrefs(),
  securityNotice: '',
  securityError: '',
  passwordNotice: '',
  passwordError: '',
  recoveryTestMode: false,
  recoveryStep: 'username', // 'username' | 'answer'
  recoveryUsername: '',
  recoveryQuestion: ''
};

/* ============================================================================
 * DICIONÁRIO I18N (PORTUGUÊS PADRÃO, INGLÊS E ESPANHOL)
 * ========================================================================== */

const I18N_DICT = {
  'pt-BR': {
    'nav.production': 'Produção',
    'nav.power': 'Energia',
    'nav.free': 'Oficina',
    'nav.workshop': 'Oficina',
    'nav.map': 'Mapa',
    'nav.recipes': 'Receitas',
    'nav.codex': 'Biblioteca',
    'nav.library': 'Biblioteca',
    'nav.calculator': 'Calculadora',
    'nav.projects': 'Projetos',
    'nav.reports': 'Reports',
    'nav.theme': 'Tema',
    'nav.dark': 'Escuro',
    'nav.light': 'Claro',
    'nav.collapse': 'Minimizar barra',
    'nav.settings': 'Configurações',
    'top.patchNotes': 'Patch notes',
    'top.tutorial': 'Tutorial',
    'top.report': 'Reportar',
    'settings.title': 'Configurações',
    'settings.lang.tag': 'IDIOMA',
    'settings.lang.title': 'Idioma da Ferramenta',
    'settings.lang.desc': 'Traduz menus, botões, etiquetas e nomes de itens quando disponíveis.',
    'settings.security.tag': 'SEGURANÇA',
    'settings.security.title': 'Recuperação de Conta (sem e-mail) & Senha',
    'settings.profile.tag': 'PERFIL',
    'settings.profile.title': 'Perfil do Pioneiro (Opcional)',
    'settings.prefs.tag': 'PREFERÊNCIAS',
    'settings.prefs.title': 'Preferências da Ferramenta'
  },
  'en-US': {
    'nav.production': 'Production',
    'nav.power': 'Power',
    'nav.free': 'Workshop',
    'nav.workshop': 'Workshop',
    'nav.map': 'Map',
    'nav.recipes': 'Recipes',
    'nav.codex': 'Library',
    'nav.library': 'Library',
    'nav.calculator': 'Calculator',
    'nav.projects': 'Projects',
    'nav.reports': 'Reports',
    'nav.theme': 'Theme',
    'nav.dark': 'Dark',
    'nav.light': 'Light',
    'nav.collapse': 'Collapse rail',
    'nav.settings': 'Settings',
    'top.patchNotes': 'Patch notes',
    'top.tutorial': 'Tutorial',
    'top.report': 'Report',
    'settings.title': 'Settings',
    'settings.lang.tag': 'LANGUAGE',
    'settings.lang.title': 'Tool Language',
    'settings.lang.desc': 'Translates menus, buttons, badges, and item names when available.',
    'settings.security.tag': 'SECURITY',
    'settings.security.title': 'Account Recovery (Email-free) & Password',
    'settings.profile.tag': 'PROFILE',
    'settings.profile.title': 'Pioneer Profile (Optional)',
    'settings.prefs.tag': 'PREFERENCES',
    'settings.prefs.title': 'Tool Preferences'
  },
  'es-ES': {
    'nav.production': 'Producción',
    'nav.power': 'Energía',
    'nav.free': 'Taller',
    'nav.workshop': 'Taller',
    'nav.map': 'Mapa',
    'nav.recipes': 'Recetas',
    'nav.codex': 'Biblioteca',
    'nav.library': 'Biblioteca',
    'nav.calculator': 'Calculadora',
    'nav.projects': 'Proyectos',
    'nav.reports': 'Reportes',
    'nav.theme': 'Tema',
    'nav.dark': 'Oscuro',
    'nav.light': 'Claro',
    'nav.collapse': 'Minimizar barra',
    'nav.settings': 'Configuración',
    'top.patchNotes': 'Notas de parche',
    'top.tutorial': 'Tutorial',
    'top.report': 'Reportar',
    'settings.title': 'Configuración',
    'settings.lang.tag': 'IDIOMA',
    'settings.lang.title': 'Idioma de la Herramienta',
    'settings.lang.desc': 'Traduce menús, botones, etiquetas y nombres de ítems cuando estén disponibles.',
    'settings.security.tag': 'SEGURIDAD',
    'settings.security.title': 'Recuperación de Cuenta (sin correo) y Contraseña',
    'settings.profile.tag': 'PERFIL',
    'settings.profile.title': 'Perfil del Pionero (Opcional)',
    'settings.prefs.tag': 'PREFERENCIAS',
    'settings.prefs.title': 'Preferencias de la Herramienta'
  }
};

function tI18n(key, fallback = '') {
  const lang = SettingsState.prefs?.lang || 'pt-BR';
  const dict = I18N_DICT[lang] || I18N_DICT['pt-BR'];
  return dict[key] || I18N_DICT['pt-BR'][key] || fallback || key;
}

function detectBrowserSuggestedLang() {
  try {
    const list = Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language || ''];
    for (const raw of list) {
      const lc = String(raw || '').toLowerCase();
      if (lc.startsWith('pt')) return 'pt-BR';
      if (lc.startsWith('es')) return 'es-ES';
      if (lc.startsWith('en')) return 'en-US';
    }
  } catch {}
  return 'en-US';
}

function loadLocalUserPrefs() {
  try {
    const raw = localStorage.getItem(SPLUS_PREFS_STORAGE_KEY);
    if (!raw) {
      const base = JSON.parse(JSON.stringify(DEFAULT_USER_PREFS));
      base.lang = detectBrowserSuggestedLang();
      return base;
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_USER_PREFS,
      ...parsed,
      profile: {
        ...DEFAULT_USER_PREFS.profile,
        ...(parsed.profile || {})
      }
    };
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_USER_PREFS));
  }
}

function saveUserPrefs(partial = {}, syncServer = true) {
  SettingsState.prefs = {
    ...SettingsState.prefs,
    ...partial,
    profile: {
      ...(SettingsState.prefs.profile || DEFAULT_USER_PREFS.profile),
      ...(partial.profile || {})
    }
  };
  try {
    localStorage.setItem(SPLUS_PREFS_STORAGE_KEY, JSON.stringify(SettingsState.prefs));
  } catch {
    // ignore storage quota errors
  }
  applyAllUserPrefsToRuntime();
  if (syncServer && typeof saveAccountPreferences === 'function') {
    saveAccountPreferences(SettingsState.prefs);
  }
}

function syncSettingsFromAccountPreferences(serverPrefs, serverProfile) {
  if (!serverPrefs || typeof serverPrefs !== 'object') return;
  const merged = { ...SettingsState.prefs };
  if (['pt-BR', 'en-US', 'es-ES'].includes(serverPrefs.lang)) merged.lang = serverPrefs.lang;
  if (['dark', 'light', 'system'].includes(serverPrefs.theme)) merged.theme = serverPrefs.theme;
  if (['LR', 'TB', 'RL', 'BT'].includes(serverPrefs.flowDirection)) merged.flowDirection = serverPrefs.flowDirection;
  if (serverPrefs.maxBeltTier) merged.maxBeltTier = Number(serverPrefs.maxBeltTier) || 6;
  if (serverPrefs.maxPipeTier) merged.maxPipeTier = Number(serverPrefs.maxPipeTier) || 2;
  if (serverPrefs.expandAllMachinesDefault !== undefined) merged.expandAllMachinesDefault = Boolean(serverPrefs.expandAllMachinesDefault);
  if (serverPrefs.navRailCollapsed !== undefined) merged.navRailCollapsed = Boolean(serverPrefs.navRailCollapsed);
  if (serverPrefs.showCanvasGrid !== undefined) merged.showCanvasGrid = Boolean(serverPrefs.showCanvasGrid);
  if (serverPrefs.snapToGrid !== undefined) merged.snapToGrid = Boolean(serverPrefs.snapToGrid);
  if (serverPrefs.reduceMotion !== undefined) merged.reduceMotion = Boolean(serverPrefs.reduceMotion);
  if (serverPrefs.energyAutoUnit !== undefined) merged.energyAutoUnit = Boolean(serverPrefs.energyAutoUnit);
  if (serverPrefs.autoPatchNotes !== undefined) merged.autoPatchNotes = Boolean(serverPrefs.autoPatchNotes);
  if (serverProfile && typeof serverProfile === 'object') {
    merged.profile = {
      gender: serverProfile.gender || merged.profile?.gender || 'prefer_not_to_say',
      age: (serverProfile.age !== null && serverProfile.age !== undefined) ? String(serverProfile.age) : (merged.profile?.age || ''),
      country: serverProfile.country || merged.profile?.country || ''
    };
  }
  SettingsState.prefs = merged;
  try {
    localStorage.setItem(SPLUS_PREFS_STORAGE_KEY, JSON.stringify(SettingsState.prefs));
  } catch {}
  applyAllUserPrefsToRuntime();
}

/* ============================================================================
 * APLICAÇÃO EM TEMPO REAL DAS PREFERÊNCIAS E DO IDIOMA
 * ========================================================================== */

function applyAllUserPrefsToRuntime() {
  const p = SettingsState.prefs || DEFAULT_USER_PREFS;

  // 1) Barra lateral principal minimizada ou expandida
  const rail = document.getElementById('main-nav-rail');
  if (rail) {
    rail.classList.toggle('is-collapsed', Boolean(p.navRailCollapsed));
    if (typeof syncCollapseButtonState === 'function') syncCollapseButtonState();
  }

  // 2) Reduzir animações
  if (document.body) {
    document.body.classList.toggle('reduce-motion', Boolean(p.reduceMotion));
    document.body.classList.toggle('hide-canvas-grid', !p.showCanvasGrid);
  }

  // 3) Sincronizar com AppState quando presente
  if (typeof AppState === 'object' && AppState) {
    if (AppState.ui) {
      AppState.ui.maxBeltTier = Number(p.maxBeltTier) || 6;
      AppState.ui.maxPipeTier = Number(p.maxPipeTier) || 2;
      AppState.ui.snapToGrid = Boolean(p.snapToGrid);
      AppState.ui.energyAutoUnit = Boolean(p.energyAutoUnit);
    }
  }

  // 4) Aplicar idioma (data-i18n + lang no html)
  applyI18nToDOM();
}

function applyI18nToDOM() {
  const lang = SettingsState.prefs?.lang || 'pt-BR';
  if (document.documentElement) {
    document.documentElement.lang = lang;
  }
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const translated = tI18n(key, '');
    if (translated) el.textContent = translated;
  });
  document.querySelectorAll('.top-lang-btn[data-lang]').forEach((btn) => {
    const isAct = btn.getAttribute('data-lang') === lang;
    btn.classList.toggle('active', isAct);
    btn.setAttribute('aria-pressed', isAct ? 'true' : 'false');
  });
}

function setAppLanguage(lang) {
  if (!['pt-BR', 'en-US', 'es-ES'].includes(lang)) return;
  try { localStorage.setItem(SPLUS_LANG_MANUAL_KEY, '1'); } catch {}
  saveUserPrefs({ lang });
  if (SettingsState.isOpen) {
    renderSettingsModalBody();
  }
  if (typeof renderLeftSidebar === 'function' && typeof AppState === 'object') {
    try { renderLeftSidebar(); } catch {}
  }
}

function toggleNavRailCollapse() {
  const next = !Boolean(SettingsState.prefs?.navRailCollapsed);
  saveUserPrefs({ navRailCollapsed: next });
}

/* ============================================================================
 * NORMALIZAÇÃO E HASH SHA-256 PARA RECUPERAÇÃO DE CONTA SEM E-MAIL
 * ========================================================================== */

function normalizeSecurityAnswerClient(answer) {
  return String(answer || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

async function sha256HexClient(text) {
  const norm = normalizeSecurityAnswerClient(text);
  if (window.crypto && window.crypto.subtle) {
    const buf = new TextEncoder().encode(`splus_sec_v25:${norm}`);
    const digest = await window.crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback determinístico simples caso WebCrypto não esteja disponível
  let h = 2166136261;
  const s = `splus_sec_v25:${norm}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fnv1a_${(h >>> 0).toString(16)}`;
}

function getLocalRecoveryMap() {
  try {
    return JSON.parse(localStorage.getItem(SPLUS_LOCAL_RECOVERY_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function saveLocalRecoveryEntry(username, question, answerHash) {
  const key = String(username || '').trim().toLowerCase();
  if (!key) return;
  const map = getLocalRecoveryMap();
  map[key] = {
    username: String(username || '').trim(),
    question: String(question || '').trim(),
    answerHash: String(answerHash || ''),
    updatedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(SPLUS_LOCAL_RECOVERY_KEY, JSON.stringify(map));
  } catch {}
}

function checkLocalSecurityRecoveryQuestion(username) {
  const key = String(username || '').trim().toLowerCase();
  const map = getLocalRecoveryMap();
  return map[key]?.question || '';
}

function checkLocalRecoveryRateLimit(username) {
  const key = String(username || 'anon').trim().toLowerCase();
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hora
  let map = {};
  try {
    map = JSON.parse(localStorage.getItem(SPLUS_LOCAL_RL_KEY) || '{}') || {};
  } catch {}
  const hits = (map[key] || []).filter((ts) => now - ts < windowMs);
  map[key] = hits;
  try { localStorage.setItem(SPLUS_LOCAL_RL_KEY, JSON.stringify(map)); } catch {}
  return {
    blocked: hits.length >= 5,
    remaining: Math.max(0, 5 - hits.length)
  };
}

function recordLocalRecoveryAttempt(username) {
  const key = String(username || 'anon').trim().toLowerCase();
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  let map = {};
  try {
    map = JSON.parse(localStorage.getItem(SPLUS_LOCAL_RL_KEY) || '{}') || {};
  } catch {}
  const hits = (map[key] || []).filter((ts) => now - ts < windowMs);
  hits.push(now);
  map[key] = hits;
  try { localStorage.setItem(SPLUS_LOCAL_RL_KEY, JSON.stringify(map)); } catch {}
}

/* ============================================================================
 * MODAL DE CONFIGURAÇÕES (#settings-modal)
 * ========================================================================== */

function openSettingsModal(initialTab) {
  SettingsState.isOpen = true;
  if (initialTab && ['geral', 'prefs', 'conta', 'perfil'].includes(initialTab)) {
    SettingsState.activeTab = initialTab;
  } else if (!SettingsState.activeTab) {
    SettingsState.activeTab = 'geral';
  }
  SettingsState.securityNotice = '';
  SettingsState.securityError = '';
  SettingsState.passwordNotice = '';
  SettingsState.passwordError = '';
  const modal = document.getElementById('settings-modal');
  if (modal) modal.classList.remove('hidden');
  renderSettingsModalBody();
}

function setSettingsModalTab(tabId) {
  if (!['geral', 'prefs', 'conta', 'perfil'].includes(tabId)) return;
  SettingsState.activeTab = tabId;
  renderSettingsModalBody();
}

function resetDefaultUserPrefs() {
  const fresh = {
    ...DEFAULT_USER_PREFS,
    profile: { ...DEFAULT_USER_PREFS.profile }
  };
  SettingsState.prefs = fresh;
  try {
    localStorage.setItem(SPLUS_PREFS_KEY, JSON.stringify(fresh));
  } catch {}
  applyAllUserPrefsToRuntime();
  if (typeof applyTheme === 'function') {
    applyTheme('dark', { persistLocal: true, saveAccount: false, rerender: true });
  }
  if (typeof setCanvasDirection === 'function') {
    setCanvasDirection(fresh.flowDirection || 'LR');
  }
  if (typeof showToast === 'function') {
    showToast('Preferências restauradas para o padrão.');
  }
  renderSettingsModalBody();
}

function saveAndCloseSettingsModal() {
  saveUserPrefs({});
  if (typeof showToast === 'function') {
    showToast('Configurações salvas.');
  }
  closeSettingsModal();
}

function closeSettingsModal() {
  SettingsState.isOpen = false;
  const modal = document.getElementById('settings-modal');
  if (modal) modal.classList.add('hidden');
}

function renderSettingsModalBody() {
  const body = document.getElementById('settings-modal-body');
  if (!body) return;

  const p = SettingsState.prefs || DEFAULT_USER_PREFS;
  const prof = p.profile || DEFAULT_USER_PREFS.profile;
  const activeTab = SettingsState.activeTab || 'geral';
  const user = (typeof AccountState === 'object' && AccountState.user) ? AccountState.user : null;
  const localRecMap = getLocalRecoveryMap();
  const currentUsername = user ? user.username : 'pioneiro_local';
  const localRec = localRecMap[String(currentUsername).toLowerCase()] || null;
  const activeQuestion = (user && user.securityQuestion) || (localRec && localRec.question) || '';
  const hasRecovery = Boolean((user && user.hasSecurityRecovery) || (localRec && localRec.answerHash));

  const renderToggleRow = (key, title, desc, checked) => `
    <div class="sp-set-row">
      <div class="sp-set-rl">
        <strong>${title}</strong>
        <span>${desc}</span>
      </div>
      <button type="button" role="switch" aria-checked="${checked ? 'true' : 'false'}" class="sp-set-sw ${checked ? 'on' : ''}" onclick="updateUserPrefSetting('${key}', ${checked ? 'false' : 'true'})" aria-label="${escText(title)}"></button>
    </div>
  `;

  let tabContentHtml = '';
  if (activeTab === 'geral') {
    tabContentHtml = `
      <div class="sp-set-sec">
        <div class="sp-set-sl">Idioma</div>
        <div class="sp-set-g3">
          <button type="button" class="sp-set-op ${p.lang === 'pt-BR' ? 'on' : ''}" onclick="setAppLanguage('pt-BR')">
            <div class="sp-set-c">PT-BR</div>
            <div class="sp-set-n">Português</div>
          </button>
          <button type="button" class="sp-set-op ${p.lang === 'en-US' ? 'on' : ''}" onclick="setAppLanguage('en-US')">
            <div class="sp-set-c">EN-US</div>
            <div class="sp-set-n">English</div>
          </button>
          <button type="button" class="sp-set-op ${p.lang === 'es-ES' ? 'on' : ''}" onclick="setAppLanguage('es-ES')">
            <div class="sp-set-c">ES-ES</div>
            <div class="sp-set-n">Español</div>
          </button>
        </div>
      </div>

      <div class="sp-set-sec">
        <div class="sp-set-sl">Tema</div>
        <div class="sp-set-g3">
          <button type="button" class="sp-set-op ${p.theme === 'dark' ? 'on' : ''}" onclick="updateUserPrefSetting('theme', 'dark')">
            <div class="sp-set-c">Escuro</div>
            <div class="sp-set-n">#101117</div>
          </button>
          <button type="button" class="sp-set-op ${p.theme === 'light' ? 'on' : ''}" onclick="updateUserPrefSetting('theme', 'light')">
            <div class="sp-set-c">Claro</div>
            <div class="sp-set-n">Neutro</div>
          </button>
          <button type="button" class="sp-set-op ${p.theme === 'system' ? 'on' : ''}" onclick="updateUserPrefSetting('theme', 'system')">
            <div class="sp-set-c">Automático</div>
            <div class="sp-set-n">Sistema</div>
          </button>
        </div>
      </div>

      <div class="sp-set-sec">
        <div class="sp-set-sl">Direção do fluxo ao gerar linhas</div>
        <div class="sp-set-g2">
          <button type="button" class="sp-set-op ${p.flowDirection === 'LR' ? 'on' : ''}" onclick="updateUserPrefSetting('flowDirection', 'LR')">
            <div class="sp-set-c">Esquerda para direita</div>
            <div class="sp-set-n">Horizontal (padrão)</div>
          </button>
          <button type="button" class="sp-set-op ${p.flowDirection === 'TB' ? 'on' : ''}" onclick="updateUserPrefSetting('flowDirection', 'TB')">
            <div class="sp-set-c">Cima para baixo</div>
            <div class="sp-set-n">Vertical</div>
          </button>
        </div>
      </div>
    `;
  } else if (activeTab === 'prefs') {
    tabContentHtml = `
      <div class="sp-set-sec">
        <div class="sp-set-sl">Canvas</div>
        ${renderToggleRow('showCanvasGrid', 'Mostrar grade de pontos', 'Exibe pontos de referência no fundo do canvas', Boolean(p.showCanvasGrid))}
        ${renderToggleRow('snapToGrid', 'Alinhar à grade na Oficina', 'Encaixa blocos automaticamente na grade ao mover', Boolean(p.snapToGrid))}
        ${renderToggleRow('expandAllMachinesDefault', 'Mostrar todas as máquinas', 'Expande cada máquina individualmente ao gerar linhas', Boolean(p.expandAllMachinesDefault))}
      </div>

      <div class="sp-set-sec">
        <div class="sp-set-sl">Interface</div>
        ${renderToggleRow('navRailCollapsed', 'Iniciar com a barra lateral minimizada', 'Abre o planejador com mais área livre no canvas', Boolean(p.navRailCollapsed))}
        ${renderToggleRow('reduceMotion', 'Reduzir animações', 'Desativa transições e animação das esteiras', Boolean(p.reduceMotion))}
        ${renderToggleRow('energyAutoUnit', 'Formatar energia em MW e GW', 'Converte automaticamente valores grandes de energia', Boolean(p.energyAutoUnit))}
        ${renderToggleRow('autoPatchNotes', 'Mostrar patch notes ao atualizar', 'Exibe as novidades quando uma nova versão for publicada', Boolean(p.autoPatchNotes))}
      </div>
      <div class="sp-set-sec">
        <div class="sp-set-sl">${(SettingsState.prefs?.lang === 'en-US') ? 'Privacy' : (SettingsState.prefs?.lang === 'es-ES' ? 'Privacidad' : 'Privacidade')}</div>
        <div class="sp-set-hint">
          ${(SettingsState.prefs?.lang === 'en-US')
            ? 'This site collects anonymous usage data (visits, tabs used, country/state, device, and errors) to improve the tool, without identifying you.'
            : (SettingsState.prefs?.lang === 'es-ES'
              ? 'Este sitio recopila datos anónimos de uso (visitas, pestañas usadas, país/estado, dispositivo y errores) para mejorar la herramienta, sin identificarte.'
              : 'Este site coleta dados anônimos de uso (visitas, abas usadas, país/estado, dispositivo e erros) para melhorar a ferramenta, sem identificar você.')}
        </div>
      </div>
    `;
  } else if (activeTab === 'conta') {
    tabContentHtml = `
      <div class="sp-set-sec">
        <div class="sp-set-pill ${hasRecovery ? 'is-ok' : ''}">
          <span class="sp-set-dot"></span>
          ${hasRecovery ? 'Pergunta de segurança ativa' : 'Pergunta de segurança pendente'}
        </div>
        <div class="sp-set-hint">
          Crie sua própria pergunta e resposta para recuperar sua conta sem e-mail. A resposta é normalizada e armazenada apenas com hash criptográfico.
        </div>
        ${SettingsState.securityNotice ? `<div class="form-alert info">${escText(SettingsState.securityNotice)}</div>` : ''}
        ${SettingsState.securityError ? `<div class="form-alert error">${escText(SettingsState.securityError)}</div>` : ''}

        <form onsubmit="submitSettingsSecurityQuestion(event)" class="sp-set-form">
          <div class="sp-set-f">
            <label for="set-sec-question">Sua pergunta de segurança</label>
            <input id="set-sec-question" type="text" required minlength="5" maxlength="140" value="${escText(activeQuestion)}" placeholder="Digite a pergunta que você quiser..." autocomplete="off" />
          </div>
          <div class="sp-set-g2">
            <div class="sp-set-f">
              <label for="set-sec-answer">Sua resposta secreta</label>
              <input id="set-sec-answer" type="text" required minlength="2" placeholder="Digite a resposta" autocomplete="off" />
            </div>
            <div class="sp-set-f">
              <label for="set-sec-current-pw">Confirme sua senha</label>
              <input id="set-sec-current-pw" type="password" ${user ? 'required' : ''} placeholder="${user ? 'Sua senha atual' : 'Opcional no modo local'}" autocomplete="current-password" />
            </div>
          </div>
          <div class="sp-set-acts">
            <button type="submit" class="sp-set-btn sp-set-btn-p">Salvar pergunta</button>
            <button type="button" class="sp-set-btn" onclick="openAuthModal('forgot-password')">Esqueci minha senha</button>
            ${user
              ? `<button type="button" class="sp-set-btn" onclick="openChangePasswordModal()">Alterar senha</button>`
              : `<button type="button" class="sp-set-btn" onclick="openAuthModal('login')">Entrar / Criar conta</button>`}
          </div>
        </form>
      </div>

      <div class="sp-set-sec sp-set-danger-zone">
        <div class="sp-set-sl" style="color:#ef4444;">Zona de perigo</div>
        <div class="sp-set-danger-box">
          <div>
            <strong>Deletar conta permanentemente</strong>
            <span>Remove sua conta, acesso, projetos salvos e preferências do banco de dados. Esta ação não pode ser desfeita.</span>
          </div>
          <button type="button" class="sp-set-btn sp-set-btn-danger" onclick="openDeleteAccountConfirm()">Deletar conta</button>
        </div>
        ${SettingsState.deleteConfirmOpen ? `
          <div class="sp-del-confirm-card" role="alertdialog" aria-modal="true" aria-label="Confirmar exclusão de conta">
            <div class="sp-del-confirm-title">Tem certeza que deseja excluir sua conta?</div>
            <p class="sp-del-confirm-desc">
              Todos os seus dados, projetos salvos e credenciais serão apagados permanentemente do banco de dados.
            </p>
            ${SettingsState.deleteError ? `<div class="form-alert error">${escText(SettingsState.deleteError)}</div>` : ''}
            ${user ? `
              <div class="sp-set-f">
                <label for="del-acc-password">Digite sua senha atual para confirmar</label>
                <input id="del-acc-password" type="password" placeholder="Sua senha atual" autocomplete="current-password" />
              </div>
            ` : ''}
            <div class="sp-del-confirm-acts">
              <button type="button" class="sp-set-btn" onclick="cancelDeleteAccountConfirm()">Cancelar</button>
              <button
                type="button"
                id="btn-confirm-delete-account"
                class="sp-set-btn sp-set-btn-danger-solid"
                onclick="confirmDeleteAccountPermanent()"
                ${(SettingsState.deleteCountdown || 0) > 0 || SettingsState.deleteBusy ? 'disabled' : ''}
              >
                ${SettingsState.deleteBusy
                  ? 'Excluindo...'
                  : ((SettingsState.deleteCountdown || 0) > 0
                    ? `Aguarde ${SettingsState.deleteCountdown}s para confirmar`
                    : 'Confirmar e excluir conta')}
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  } else {
    tabContentHtml = `
      <div class="sp-set-sec">
        <div class="sp-set-sl">Informações opcionais</div>
        <div class="sp-set-f">
          <label for="set-prof-gender">Sexo</label>
          <select id="set-prof-gender" onchange="updateSettingsProfileField('gender', this.value)">
            <option value="prefer_not_to_say" ${prof.gender === 'prefer_not_to_say' ? 'selected' : ''}>Prefiro não informar</option>
            <option value="male" ${prof.gender === 'male' ? 'selected' : ''}>Masculino</option>
            <option value="female" ${prof.gender === 'female' ? 'selected' : ''}>Feminino</option>
            <option value="other" ${prof.gender === 'other' ? 'selected' : ''}>Outro</option>
          </select>
        </div>
        <div class="sp-set-g2">
          <div class="sp-set-f">
            <label for="set-prof-age">Idade</label>
            <input id="set-prof-age" type="number" min="5" max="120" value="${escText(prof.age || '')}" placeholder="Ex.: 24" onchange="updateSettingsProfileField('age', this.value)" />
          </div>
          <div class="sp-set-f">
            <label for="set-prof-country">País</label>
            <input id="set-prof-country" type="text" maxlength="56" value="${escText(prof.country || '')}" placeholder="Ex.: Brasil" onchange="updateSettingsProfileField('country', this.value)" />
          </div>
        </div>
      </div>
    `;
  }

  body.innerHTML = `
    <div class="sp-set-body">
      <nav class="sp-set-nav" aria-label="Seções de configurações">
        <button type="button" class="sp-set-nb ${activeTab === 'geral' ? 'on' : ''}" onclick="setSettingsModalTab('geral')">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>
          <span>Geral</span>
        </button>
        <button type="button" class="sp-set-nb ${activeTab === 'prefs' ? 'on' : ''}" onclick="setSettingsModalTab('prefs')">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg>
          <span>Preferências</span>
        </button>
        <button type="button" class="sp-set-nb ${activeTab === 'conta' ? 'on' : ''}" onclick="setSettingsModalTab('conta')">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><rect x="9" y="11" width="6" height="5" rx="1"></rect><path d="M10 11V9a2 2 0 1 1 4 0v2"></path></svg>
          <span>Conta e segurança</span>
        </button>
        <button type="button" class="sp-set-nb ${activeTab === 'perfil' ? 'on' : ''}" onclick="setSettingsModalTab('perfil')">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          <span>Perfil</span>
        </button>
      </nav>
      <div class="sp-set-cnt">
        ${tabContentHtml}
      </div>
    </div>
    <div class="sp-set-foot">
      <button type="button" class="sp-set-btn" onclick="resetDefaultUserPrefs()">Restaurar padrões</button>
      <button type="button" class="sp-set-btn sp-set-btn-p" onclick="saveAndCloseSettingsModal()">Salvar alterações</button>
    </div>
  `;
}

async function submitSettingsSecurityQuestion(e) {
  e.preventDefault();
  const question = (document.getElementById('set-sec-question')?.value || '').trim();
  const answerRaw = (document.getElementById('set-sec-answer')?.value || '').trim();
  const currentPassword = document.getElementById('set-sec-current-pw')?.value || '';
  const norm = normalizeSecurityAnswerClient(answerRaw);

  SettingsState.securityError = '';
  SettingsState.securityNotice = '';

  if (!question || norm.length < 2) {
    SettingsState.securityError = 'Informe uma pergunta e uma resposta com pelo menos 2 caracteres.';
    renderSettingsModalBody();
    return;
  }

  const hashHex = await sha256HexClient(norm);
  const user = (typeof AccountState === 'object' && AccountState.user) ? AccountState.user : null;

  // Salva hash normalizado localmente para suporte offline/imediato
  saveLocalRecoveryEntry(user ? user.username : 'pioneiro_local', question, hashHex);

  if (user && typeof apiFetch === 'function') {
    const res = await apiFetch('/api/auth?action=set-security-question', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword,
        securityQuestion: question,
        securityAnswer: norm
      })
    });
    if (!res.ok) {
      SettingsState.securityError = res.data?.error || 'Não foi possível salvar no servidor (verifique sua senha atual).';
      renderSettingsModalBody();
      return;
    }
    if (res.data?.user) {
      AccountState.user = res.data.user;
      try { localStorage.setItem('splus_user_cache', JSON.stringify(res.data.user)); } catch {}
    }
  }

  SettingsState.securityNotice = '✅ Pergunta e resposta de segurança atualizadas com hash criptográfico!';
  renderSettingsModalBody();
}

function updateSettingsProfileField(field, value) {
  const currentProfile = { ...(SettingsState.prefs?.profile || DEFAULT_USER_PREFS.profile) };
  currentProfile[field] = value;
  saveUserPrefs({ profile: currentProfile });
}

function updateUserPrefSetting(key, value) {
  saveUserPrefs({ [key]: value });
  if (key === 'theme' && typeof applyTheme === 'function') {
    const resolved = value === 'system'
      ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : value;
    applyTheme(resolved, { persistLocal: true, saveAccount: false, rerender: true });
  }
  if (key === 'flowDirection' && typeof setCanvasDirection === 'function') {
    setCanvasDirection(value);
  }
  if (SettingsState.isOpen) {
    renderSettingsModalBody();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  applyAllUserPrefsToRuntime();
});


/* ============================================================================
 * EXCLUSÃO DE CONTA COM VERIFICAÇÃO DUPLA + CONTADOR DE 5 SEGUNDOS
 * ========================================================================== */
let _deleteAccountTimer = null;

function clearDeleteAccountTimer() {
  if (_deleteAccountTimer) {
    clearInterval(_deleteAccountTimer);
    _deleteAccountTimer = null;
  }
}

function openDeleteAccountConfirm() {
  clearDeleteAccountTimer();
  SettingsState.deleteConfirmOpen = true;
  SettingsState.deleteError = '';
  SettingsState.deleteBusy = false;
  SettingsState.deleteCountdown = 5;
  renderSettingsModalBody();

  _deleteAccountTimer = setInterval(() => {
    if (!SettingsState.deleteConfirmOpen || !SettingsState.isOpen) {
      clearDeleteAccountTimer();
      return;
    }
    SettingsState.deleteCountdown = Math.max(0, (SettingsState.deleteCountdown || 0) - 1);
    const btn = document.getElementById('btn-confirm-delete-account');
    if (btn) {
      if (SettingsState.deleteCountdown > 0) {
        btn.disabled = true;
        btn.textContent = `Aguarde ${SettingsState.deleteCountdown}s para confirmar`;
      } else {
        btn.disabled = false;
        btn.textContent = 'Confirmar e excluir conta';
        clearDeleteAccountTimer();
      }
    } else if (SettingsState.deleteCountdown <= 0) {
      clearDeleteAccountTimer();
    }
  }, 1000);
}

function cancelDeleteAccountConfirm() {
  clearDeleteAccountTimer();
  SettingsState.deleteConfirmOpen = false;
  SettingsState.deleteError = '';
  SettingsState.deleteCountdown = 0;
  SettingsState.deleteBusy = false;
  renderSettingsModalBody();
}

async function confirmDeleteAccountPermanent() {
  if ((SettingsState.deleteCountdown || 0) > 0 || SettingsState.deleteBusy) return;
  const user = (typeof AccountState === 'object' && AccountState.user) ? AccountState.user : null;
  const password = document.getElementById('del-acc-password')?.value || '';

  if (user && !password) {
    SettingsState.deleteError = 'Digite sua senha atual para confirmar a exclusão.';
    renderSettingsModalBody();
    return;
  }

  SettingsState.deleteBusy = true;
  SettingsState.deleteError = '';
  renderSettingsModalBody();

  if (user && typeof apiFetch === 'function') {
    const res = await apiFetch('/api/auth?action=delete-account', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
    if (!res.ok) {
      SettingsState.deleteBusy = false;
      SettingsState.deleteError = res.data?.error || 'Não foi possível excluir a conta. Verifique sua senha.';
      renderSettingsModalBody();
      return;
    }
  }

  // Limpa sessão local, cache de usuário, projetos e recuperação local
  try {
    localStorage.removeItem('splus_user_cache');
    localStorage.removeItem(SPLUS_LOCAL_RECOVERY_KEY);
    localStorage.removeItem(SPLUS_LOCAL_RL_KEY);
  } catch {}
  if (typeof AccountState === 'object') {
    AccountState.user = null;
    if (AccountState.projects) AccountState.projects.list = [];
  }
  if (typeof updateAuthHeaderUI === 'function') updateAuthHeaderUI();
  if (typeof switchMode === 'function') switchMode('production');

  cancelDeleteAccountConfirm();
  closeSettingsModal();
  if (typeof showAccountToast === 'function') {
    showAccountToast('Conta e dados excluídos permanentemente.', 'info');
  } else if (typeof showToast === 'function') {
    showToast('Conta e dados excluídos permanentemente.');
  }
}

async function autoDetectGeoLanguage() {
  try {
    if (localStorage.getItem(SPLUS_LANG_MANUAL_KEY) === '1') return;
    if (sessionStorage.getItem('splus_geo_lang_done') === '1') return;
    sessionStorage.setItem('splus_geo_lang_done', '1');
    const res = await fetch('/api/analytics?action=geo', { method: 'GET', credentials: 'same-origin' });
    if (!res.ok) return;
    const data = await res.json();
    const suggested = data?.suggestedLang;
    if (!['pt-BR', 'en-US', 'es-ES'].includes(suggested)) return;
    if (localStorage.getItem(SPLUS_LANG_MANUAL_KEY) === '1') return;
    if (SettingsState.prefs?.lang !== suggested) {
      saveUserPrefs({ lang: suggested }, false);
      if (SettingsState.isOpen && typeof renderSettingsModalBody === 'function') {
        renderSettingsModalBody();
      }
      if (typeof renderLeftSidebar === 'function' && typeof AppState === 'object') {
        try { renderLeftSidebar(); } catch {}
      }
    }
  } catch {}
}

(function initGeoLanguageDetection() {
  if (typeof window === 'undefined') return;
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => autoDetectGeoLanguage());
  } else {
    autoDetectGeoLanguage();
  }
})();
