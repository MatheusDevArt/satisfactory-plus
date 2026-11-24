/* ============================================================================
 * SATISFACTORY+ — CONTROLADOR EXCLUSIVO MOBILE (<= 768px) — v3
 * 100% isolado: em Desktop (> 768px) não cria elementos visíveis nem altera nada!
 * ========================================================================== */

(function () {
  const MOB_MQ = '(max-width: 768px)';
  const isMobile = () => window.matchMedia && window.matchMedia(MOB_MQ).matches;

  const MobState = {
    initialized: false,
    sheetOpen: false,
    userDropdownOpen: false,
    statusOpen: false,
    hudCollapsed: true
  };

  function el(id) {
    return document.getElementById(id);
  }

  function cycleMobileLang() {
    const order = ['pt-BR', 'en-US', 'es-ES'];
    const cur = (typeof SettingsState === 'object' && SettingsState.prefs?.lang) || 'pt-BR';
    const next = order[(order.indexOf(cur) + 1) % order.length];
    if (typeof setAppLanguage === 'function') setAppLanguage(next);
    updateTopbarState();
  }
  window.mobCycleLang = cycleMobileLang;

  function buildMobileShell() {
    if (el('mob-topbar')) return;

    // 1) Topbar: Logo | Idioma + Tema + Tutorial + Patch notes + Reportar + Usuário (dropdown vindo de cima)
    const topbar = document.createElement('header');
    topbar.id = 'mob-topbar';
    topbar.className = 'mob-only';
    topbar.style.display = 'none';
    topbar.innerHTML = `
      <button type="button" class="mob-brand-btn" onclick="openHomeScreen()" aria-label="Tela inicial Satisfactory+">
        <img src="./assets/logo-splus.jpg" alt="Satisfactory+" />
      </button>
      <div class="mob-top-actions">
        <button type="button" id="mob-lang-btn" class="mob-top-btn" data-no-i18n="1" onclick="mobCycleLang()" aria-label="Alterar idioma">PT</button>
        <button type="button" id="mob-theme-btn" class="mob-top-btn is-ico" onclick="if(typeof toggleTheme==='function')toggleTheme(); setTimeout(mobSyncUI,30);" aria-label="Alternar tema">🌙</button>
        <button type="button" class="mob-top-btn is-ico" onclick="mobCloseAllSheets(); if(typeof openTutorialModal==='function')openTutorialModal();" aria-label="Tutorial">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
        </button>
        <button type="button" class="mob-top-btn is-ico" onclick="mobCloseAllSheets(); if(typeof openPatchNotesModal==='function')openPatchNotesModal();" aria-label="Patch notes">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          <span id="mob-pn-dot" class="mob-dot hidden"></span>
        </button>
        <button type="button" class="mob-top-btn is-ico" onclick="mobCloseAllSheets(); if(typeof handleReportButtonClick==='function')handleReportButtonClick();" aria-label="Reportar">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
          <span id="mob-rep-dot" class="mob-dot hidden"></span>
        </button>
        <button type="button" id="mob-user-btn" class="mob-top-btn is-user-ico" onclick="mobToggleUserDropdown()" aria-label="Conta e configurações">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </button>
      </div>
    `;
    document.body.appendChild(topbar);

    // 2) Dropdown do Usuário vindo DE CIMA (#mob-user-dropdown)
    const userDd = document.createElement('div');
    userDd.id = 'mob-user-dropdown';
    userDd.className = 'mob-only';
    userDd.setAttribute('role', 'dialog');
    userDd.setAttribute('aria-label', 'Menu da conta');
    document.body.appendChild(userDd);

    // 3) Sub-bar no topo (Chips em Calculadora/CEO ou Busca em Biblioteca/Receitas)
    const subtabs = document.createElement('div');
    subtabs.id = 'mob-subtabs-bar';
    subtabs.className = 'mob-only hidden';
    subtabs.style.display = 'none';
    document.body.appendChild(subtabs);

    // 4) Barra inferior paginada (snap horizontal de seção em seção)
    const bnav = document.createElement('nav');
    bnav.id = 'mob-bottom-nav';
    bnav.className = 'mob-only';
    bnav.setAttribute('aria-label', 'Navegação mobile');
    bnav.style.display = 'none';
    document.body.appendChild(bnav);

    // 5) Backdrop dentro de #app-layout-root antes de #left-sidebar
    const backdrop = document.createElement('div');
    backdrop.id = 'mob-sheet-backdrop';
    backdrop.className = 'mob-only';
    backdrop.onclick = () => mobCloseAllSheets();
    const layoutRoot = el('app-layout-root');
    const sidebar = el('left-sidebar');
    if (layoutRoot && sidebar) {
      layoutRoot.insertBefore(backdrop, sidebar);
    } else {
      document.body.appendChild(backdrop);
    }

    // 6) Handle bar no topo da #left-sidebar
    if (sidebar && !el('mob-sidebar-handle')) {
      const handle = document.createElement('div');
      handle.id = 'mob-sidebar-handle';
      handle.className = 'mob-sheet-handle-bar mob-only';
      handle.style.display = 'none';
      handle.innerHTML = `
        <span id="mob-sheet-title" class="mob-sheet-title">Configurar</span>
        <div class="mob-sheet-pill"></div>
        <button type="button" class="mob-sheet-close" onclick="mobCloseAllSheets()" aria-label="Fechar">✕</button>
      `;
      sidebar.insertBefore(handle, sidebar.firstChild);
      attachSwipeDownToClose(sidebar, () => mobCloseAllSheets());
    }

    // 7) Aba retrátil colada na borda DIREITA (filha direta do body, right: 0) + botão fechar dentro da HUD
    if (!el('mob-hud-edge-tab')) {
      const edgeBtn = document.createElement('button');
      edgeBtn.id = 'mob-hud-edge-tab';
      edgeBtn.type = 'button';
      edgeBtn.className = 'mob-only hidden';
      edgeBtn.style.display = 'none';
      edgeBtn.setAttribute('aria-label', 'Abrir barra de ações direita');
      edgeBtn.textContent = '‹';
      edgeBtn.onclick = () => mobToggleHudDrawer(true);
      document.body.appendChild(edgeBtn);
    }
    const hud = el('spaces-hud-controls');
    if (hud && !el('mob-hud-close-btn')) {
      const closeBtn = document.createElement('button');
      closeBtn.id = 'mob-hud-close-btn';
      closeBtn.type = 'button';
      closeBtn.className = 'mob-only';
      closeBtn.style.display = 'none';
      closeBtn.setAttribute('aria-label', 'Recolher barra de ações direita');
      closeBtn.textContent = '›';
      closeBtn.onclick = () => mobToggleHudDrawer(false);
      hud.insertBefore(closeBtn, hud.firstChild);
    }

    // 8) Aba retrátil colada na borda ESQUERDA (#factory-status-footer)
    if (!el('mob-status-edge-tab')) {
      const stBtn = document.createElement('button');
      stBtn.id = 'mob-status-edge-tab';
      stBtn.type = 'button';
      stBtn.className = 'mob-only hidden';
      stBtn.style.display = 'none';
      stBtn.setAttribute('aria-label', 'Abrir ou fechar barra de status');
      stBtn.textContent = '›';
      stBtn.onclick = () => mobToggleStatusDrawer();
      document.body.appendChild(stBtn);
    }

    attachCanvasTouchGestures();
  }

  function renderBottomNavPages() {
    const bnav = el('mob-bottom-nav');
    if (!bnav) return;
    const mode = (typeof AppState === 'object' && AppState.mode) || 'production';
    const user = (typeof AccountState === 'object' && AccountState.user) ? AccountState.user : null;
    const isCeo = Boolean(user && user.role === 'ceo');
    const isStaff = Boolean(user && (user.role === 'ceo' || user.role === 'admin'));

    // Página 1: Produção, Energia, Oficina, Mapa
    const page1 = [
      { id: 'production', label: 'Produção', ico: '<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>' },
      { id: 'power', label: 'Energia', ico: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>' },
      { id: 'free', label: 'Oficina', ico: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>' },
      { id: 'map', label: 'Mapa', ico: '<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line>' }
    ];

    // Página 2: Receitas, Biblioteca, Calculadora (+ Projetos se logado)
    const page2 = [
      { id: 'recipes', label: 'Receitas', ico: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>' },
      { id: 'library', label: 'Biblioteca', ico: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>' },
      { id: 'calculator', label: 'Calculadora', ico: '<rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line>' }
    ];
    if (user) {
      page2.push({ id: 'projects', label: 'Projetos', ico: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>' });
    }

    // Página 3 (somente Staff / CEO)
    const page3 = [];
    if (isStaff) {
      page3.push({ id: 'reports', label: 'Reports', ico: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>' });
    }
    if (isCeo) {
      page3.push({ id: 'ceo', label: 'Painel CEO', ico: '<path d="M2 20h20"></path><path d="M4 17l2-11 6 5 6-5 2 11z"></path>' });
    }

    const pages = [page1, page2];
    if (page3.length > 0) pages.push(page3);

    const renderPage = (items) => `
      <div class="mob-nav-page">
        ${items.map((t) => `
          <button type="button" class="mob-nav-item ${mode === t.id ? 'active' : ''}" data-mob-mode="${t.id}" onclick="mobSelectMode('${t.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${t.ico}</svg>
            <span>${t.label}</span>
          </button>
        `).join('')}
      </div>
    `;

    const prevScroll = bnav.scrollLeft;
    bnav.innerHTML = pages.map(renderPage).join('');
    bnav.scrollLeft = prevScroll;
  }

  function attachSwipeDownToClose(sheetEl, onClose) {
    if (!sheetEl) return;
    let startY = 0;
    let tracking = false;
    sheetEl.addEventListener('touchstart', (e) => {
      if (!isMobile() || e.touches.length !== 1) return;
      const scroller = sheetEl.querySelector('#left-sidebar-content');
      if (scroller && scroller.scrollTop > 4) return;
      startY = e.touches[0].clientY;
      tracking = true;
    }, { passive: true });
    sheetEl.addEventListener('touchend', (e) => {
      if (!tracking) return;
      tracking = false;
      const dy = (e.changedTouches[0]?.clientY || startY) - startY;
      if (dy > 75) onClose();
    }, { passive: true });
  }

  function attachCanvasTouchGestures() {
    const vp = el('spaces-viewport');
    if (!vp) return;
    let mode = null;
    let startX = 0;
    let startY = 0;
    let startCamX = 0;
    let startCamY = 0;
    let startDist = 0;
    let startZoom = 1;
    let longPressTimer = null;

    const isCanvasMode = () => {
      const m = typeof AppState === 'object' ? AppState.mode : '';
      return m === 'production' || m === 'power' || m === 'free';
    };

    vp.addEventListener('touchstart', (e) => {
      if (!isMobile() || !isCanvasMode()) return;
      if (e.target.closest('button, input, select, #spaces-hud-controls, #factory-status-footer')) return;

      if (e.touches.length === 1) {
        mode = 'pan';
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startCamX = AppState.canvas.x || 0;
        startCamY = AppState.canvas.y || 0;

        const card = e.target.closest('.magnific-card');
        clearTimeout(longPressTimer);
        if (card && card.id && AppState.mode === 'free') {
          // Toque longo em um card da Oficina alterna seleção múltipla
          longPressTimer = setTimeout(() => {
            if (typeof AppState.free === 'object' && Array.isArray(AppState.free.selectedNodeIds)) {
              const idx = AppState.free.selectedNodeIds.indexOf(card.id);
              if (idx >= 0) AppState.free.selectedNodeIds.splice(idx, 1);
              else AppState.free.selectedNodeIds.push(card.id);
              card.classList.toggle('is-selected', idx < 0);
              if (navigator.vibrate) navigator.vibrate(20);
            }
          }, 500);
        } else if (!card) {
          // Segurar o dedo no espaço vazio do Spaces abre automaticamente as opções/adicionar!
          longPressTimer = setTimeout(() => {
            mobToggleControlsSheet(true);
            if (navigator.vibrate) navigator.vibrate(20);
          }, 450);
        }
      } else if (e.touches.length === 2) {
        clearTimeout(longPressTimer);
        mode = 'pinch';
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        startDist = Math.hypot(dx, dy) || 1;
        startZoom = AppState.canvas.zoom || 1;
      }
    }, { passive: true });

    vp.addEventListener('touchmove', (e) => {
      if (!isMobile() || !isCanvasMode() || !mode) return;
      if (mode === 'pan' && e.touches.length === 1) {
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) clearTimeout(longPressTimer);
        AppState.canvas.x = startCamX + dx;
        AppState.canvas.y = startCamY + dy;
        if (typeof applyCanvasTransform === 'function') applyCanvasTransform();
      } else if (mode === 'pinch' && e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy) || 1;
        AppState.canvas.zoom = Math.max(0.2, Math.min(2.2, startZoom * (dist / startDist)));
        if (typeof applyCanvasTransform === 'function') applyCanvasTransform();
      }
    }, { passive: true });

    vp.addEventListener('touchend', () => {
      clearTimeout(longPressTimer);
      mode = null;
    }, { passive: true });
  }

  function updateTopbarState() {
    const langBtn = el('mob-lang-btn');
    const themeBtn = el('mob-theme-btn');
    const curLang = (typeof SettingsState === 'object' && SettingsState.prefs?.lang) || 'pt-BR';
    if (langBtn) langBtn.textContent = curLang === 'en-US' ? 'EN' : (curLang === 'es-ES' ? 'ES' : 'PT');
    if (themeBtn) themeBtn.textContent = document.body.classList.contains('theme-dark') ? '🌙' : '☀';

    const pnDot = el('mob-pn-dot');
    const repDot = el('mob-rep-dot');
    if (pnDot) pnDot.classList.toggle('hidden', !(el('patch-notes-unread-dot') && !el('patch-notes-unread-dot').classList.contains('hidden')));
    if (repDot) repDot.classList.toggle('hidden', !(el('report-unread-dot') && !el('report-unread-dot').classList.contains('hidden')));

    const titleEl = el('mob-sheet-title');
    if (titleEl) {
      const mode = (typeof AppState === 'object' && AppState.mode) || 'production';
      const titleMap = {
        production: 'Configurar Produção',
        power: 'Configurar Energia',
        free: 'Adicionar à Oficina',
        map: 'Filtros do Mapa',
        recipes: 'Filtrar Receitas',
        library: 'Filtrar Biblioteca',
        projects: 'Meus Projetos',
        reports: 'Filtros de Reports',
        ceo: 'Ações CEO'
      };
      titleEl.textContent = titleMap[mode] || 'Opções';
    }
  }

  function updateSubtabsBar() {
    const bar = el('mob-subtabs-bar');
    if (!bar) return;
    if (!isMobile()) {
      bar.classList.add('hidden');
      document.body.classList.remove('mob-has-subtabs');
      return;
    }
    const mode = (typeof AppState === 'object' && AppState.mode) || 'production';

    if (mode === 'calculator') {
      const activeTool = (typeof AppState === 'object' && AppState.calculator?.tool) || 'numeric';
      const tools = [
        { id: 'numeric', label: 'Calculadora' },
        { id: 'resources', label: 'Recursos' },
        { id: 'production', label: 'Produção' },
        { id: 'power', label: 'Energia' },
        { id: 'logistics', label: 'Logística' },
        { id: 'sink', label: 'SUPIMPA' },
        { id: 'elevator', label: 'Elevador' }
      ];
      bar.innerHTML = tools.map((t) => `
        <button type="button" class="mob-subtab-chip ${activeTool === t.id ? 'active' : ''}" onclick="if(typeof selectCalculatorTool==='function'){selectCalculatorTool('${t.id}');}else if(typeof AppState==='object'){AppState.calculator.tool='${t.id}';if(typeof renderAll==='function')renderAll();} mobSyncUI();">${t.label}</button>
      `).join('');
      bar.classList.remove('hidden');
      document.body.classList.add('mob-has-subtabs');
      return;
    }

    if (mode === 'ceo' && typeof AccountState === 'object' && AccountState.user?.role === 'ceo') {
      const activeSec = (typeof CeoPanelState === 'object' && CeoPanelState.section) || 'overview';
      const secs = [
        { id: 'overview', label: 'Visão Executiva' },
        { id: 'geo', label: 'Geolocalização' },
        { id: 'usage', label: 'Uso & Perf.' },
        { id: 'users', label: 'Usuários' }
      ];
      bar.innerHTML = secs.map((s) => `
        <button type="button" class="mob-subtab-chip ${activeSec === s.id ? 'active' : ''}" onclick="if(typeof CeoPanelState==='object'){CeoPanelState.section='${s.id}';if(typeof renderCeoWorkspace==='function')renderCeoWorkspace();} mobSyncUI();">${s.label}</button>
      `).join('');
      bar.classList.remove('hidden');
      document.body.classList.add('mob-has-subtabs');
      return;
    }

    if (mode === 'library' || mode === 'recipes') {
      const curQ = mode === 'library'
        ? (typeof AppState === 'object' ? (AppState.library?.searchQuery || '') : '')
        : (typeof AppState === 'object' ? (AppState.recipes?.searchQuery || '') : '');
      const existingInp = el('mob-top-search-field');
      if (!existingInp || existingInp.dataset.mode !== mode) {
        bar.innerHTML = `<input id="mob-top-search-field" data-mode="${mode}" type="search" class="mob-top-search-input" placeholder="${mode === 'library' ? 'Pesquisar na Biblioteca...' : 'Pesquisar item ou receita...'}" value="${String(curQ).replace(/"/g, '&quot;')}" oninput="mobHandleTopSearch(this.value, '${mode}')" />`;
      }
      bar.classList.remove('hidden');
      document.body.classList.add('mob-has-subtabs');
      return;
    }

    bar.classList.add('hidden');
    document.body.classList.remove('mob-has-subtabs');
  }

  window.mobHandleTopSearch = function (val, mode) {
    if (typeof AppState !== 'object') return;
    if (mode === 'library' && AppState.library) {
      AppState.library.searchQuery = val;
      if (typeof renderLibraryWorkspace === 'function') renderLibraryWorkspace();
    } else if (mode === 'recipes' && AppState.recipes) {
      AppState.recipes.searchQuery = val;
      if (typeof renderRecipesWorkspace === 'function') renderRecipesWorkspace();
    }
  };

  function ensureDetailPanelCloseButton() {
    if (!isMobile()) return;
    document.querySelectorAll('.lib-side-detail').forEach((panel) => {
      if (panel.querySelector('.mob-detail-close-bar')) return;
      const bar = document.createElement('div');
      bar.className = 'mob-detail-close-bar mob-only';
      bar.innerHTML = `
        <span style="font-size:12.5px;font-weight:800;color:var(--text-secondary);">Detalhes</span>
        <button type="button" class="mob-detail-close-btn" onclick="mobCloseDetailOverlay()">✕ Fechar</button>
      `;
      panel.insertBefore(bar, panel.firstChild);
    });
  }

  window.mobCloseDetailOverlay = function () {
    if (typeof AppState === 'object') {
      if (AppState.library) AppState.library.selectedId = null;
      if (AppState.recipes) AppState.recipes.selectedId = null;
      if (AppState.mode === 'recipes' && typeof renderRecipesWorkspace === 'function') renderRecipesWorkspace();
      else if (AppState.mode === 'library' && typeof renderLibraryWorkspace === 'function') renderLibraryWorkspace();
    }
  };

  function updateStatusEdgeTab() {
    const stTab = el('mob-status-edge-tab');
    const hudTab = el('mob-hud-edge-tab');
    const footer = el('factory-status-footer');
    const mode = (typeof AppState === 'object' && AppState.mode) || 'production';
    const isCanvas = mode === 'production' || mode === 'power' || mode === 'free';
    const hasFooterContent = Boolean(footer && footer.innerHTML.trim().length > 0 && !footer.classList.contains('hidden'));
    if (stTab) {
      stTab.classList.toggle('hidden', !(isMobile() && isCanvas && hasFooterContent && !MobState.statusOpen && !MobState.sheetOpen));
    }
    if (hudTab) {
      hudTab.classList.toggle('hidden', !(isMobile() && isCanvas && MobState.hudCollapsed && !MobState.sheetOpen));
    }
  }

  window.mobToggleHudDrawer = function (forceOpen) {
    if (!isMobile()) return;
    const open = typeof forceOpen === 'boolean' ? forceOpen : MobState.hudCollapsed;
    MobState.hudCollapsed = !open;
    const hud = el('spaces-hud-controls');
    if (hud) hud.classList.toggle('mob-hud-open', open);
    updateStatusEdgeTab();
  };

  function renderUserDropdownContent() {
    const dd = el('mob-user-dropdown');
    if (!dd) return;
    const user = (typeof AccountState === 'object' && AccountState.user) ? AccountState.user : null;
    const ver = el('app-version-label')?.textContent?.trim() || 'v2.7';

    dd.innerHTML = `
      <div class="mob-dd-head">
        <span>${user ? `👤 ${user.username}` : 'Sua conta'}</span>
        <button type="button" class="mob-sheet-close" style="min-width:28px;min-height:28px;font-size:13px;" onclick="mobCloseAllSheets()" aria-label="Fechar">✕</button>
      </div>
      ${!user
        ? `<button type="button" class="mob-more-tile is-accent" style="justify-content:center;" onclick="mobCloseAllSheets(); if(typeof openAuthModal==='function')openAuthModal('login');">Entrar / Criar conta</button>`
        : `<button type="button" class="mob-more-tile" onclick="mobCloseAllSheets(); if(typeof openSettingsModal==='function')openSettingsModal('conta');">⚙ Minha Conta &amp; Segurança</button>`}
      <button type="button" class="mob-more-tile" onclick="mobCloseAllSheets(); if(typeof openSettingsModal==='function')openSettingsModal();">⚙ Configurações</button>
      ${user ? `<button type="button" class="mob-more-tile" style="border-color:rgba(239,68,68,0.4);color:#f87171;" onclick="mobCloseAllSheets(); if(typeof performLogout==='function')performLogout();">Sair da conta</button>` : ''}
      <div class="mob-credit-note">Satisfactory+ ${ver} · Criado por Matheus Pinheiro</div>
    `;
  }

  window.mobCloseAllSheets = function () {
    MobState.sheetOpen = false;
    MobState.userDropdownOpen = false;
    MobState.statusOpen = false;
    MobState.hudCollapsed = true;
    el('left-sidebar')?.classList.remove('mob-sheet-open');
    el('mob-user-dropdown')?.classList.remove('open');
    el('factory-status-footer')?.classList.remove('mob-status-open');
    el('spaces-hud-controls')?.classList.remove('mob-hud-open');
    el('mob-sheet-backdrop')?.classList.remove('open');
    document.body.classList.remove('mob-setup-full');
    updateStatusEdgeTab();
  };

  window.mobToggleControlsSheet = function (forceOpen) {
    if (!isMobile()) return;
    const next = typeof forceOpen === 'boolean' ? forceOpen : !MobState.sheetOpen;
    mobCloseAllSheets();
    if (next) {
      MobState.sheetOpen = true;
      el('left-sidebar')?.classList.add('mob-sheet-open');
      updateStatusEdgeTab();
    }
  };

  window.mobToggleStatusDrawer = function () {
    if (!isMobile()) return;
    const next = !MobState.statusOpen;
    mobCloseAllSheets();
    if (next) {
      MobState.statusOpen = true;
      const footer = el('factory-status-footer');
      if (footer) {
        footer.classList.add('mob-status-open');
        // Garante botão fechar no topo da gaveta de status
        if (!footer.querySelector('.mob-status-close-head')) {
          const head = document.createElement('div');
          head.className = 'mob-status-close-head mob-only';
          head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding-bottom:6px;border-bottom:1px solid var(--border-card);';
          head.innerHTML = '<strong style="font-size:13px;">Resumo da Linha</strong><button type="button" class="mob-sheet-close" onclick="mobCloseAllSheets()" aria-label="Fechar">✕</button>';
          footer.insertBefore(head, footer.firstChild);
        }
      }
      el('mob-sheet-backdrop')?.classList.add('open');
      updateStatusEdgeTab();
    }
  };

  window.mobToggleUserDropdown = function () {
    if (!isMobile()) return;
    const next = !MobState.userDropdownOpen;
    mobCloseAllSheets();
    if (next) {
      renderUserDropdownContent();
      MobState.userDropdownOpen = true;
      el('mob-user-dropdown')?.classList.add('open');
      el('mob-sheet-backdrop')?.classList.add('open');
    }
  };

  window.mobSelectMode = function (mode) {
    const curMode = (typeof AppState === 'object' && AppState.mode) || 'production';
    // Tocar novamente na aba ativa alterna (fecha se aberta, abre se fechada!)
    if (mode === curMode) {
      if (MobState.sheetOpen || MobState.userDropdownOpen || MobState.statusOpen) {
        mobCloseAllSheets();
      } else if (mode !== 'calculator') {
        mobToggleControlsSheet(true);
      }
      return;
    }

    mobCloseAllSheets();
    if (typeof switchMode === 'function') switchMode(mode);
    mobSyncUI();

    // Em Produção, Energia e Oficina (sem itens montados), abre o painel uniforme entre topo e barra inferior!
    if (isMobile() && mode === 'production' && !(typeof AppState === 'object' && AppState.production?.mounted)) {
      mobToggleControlsSheet(true);
    } else if (isMobile() && mode === 'power' && !(typeof AppState === 'object' && AppState.power?.mounted)) {
      mobToggleControlsSheet(true);
    } else if (isMobile() && mode === 'free') {
      mobToggleControlsSheet(true);
    }
  };

  window.mobSyncUI = function () {
    if (!isMobile()) {
      mobCloseAllSheets();
      el('mob-subtabs-bar')?.classList.add('hidden');
      el('mob-status-edge-tab')?.classList.add('hidden');
      el('mob-hud-edge-tab')?.classList.add('hidden');
      document.body.classList.remove('mob-has-subtabs');
      el('spaces-hud-controls')?.classList.remove('mob-hud-open');
      return;
    }
    buildMobileShell();
    renderBottomNavPages();
    updateTopbarState();
    updateSubtabsBar();
    updateStatusEdgeTab();
    ensureDetailPanelCloseButton();

    const hud = el('spaces-hud-controls');
    if (hud) hud.classList.toggle('mob-hud-open', !MobState.hudCollapsed);

    document.querySelectorAll('input[type="number"]').forEach((inp) => {
      if (!inp.getAttribute('inputmode')) inp.setAttribute('inputmode', 'decimal');
    });
  };

  function hookDesktopFunctionsSafely() {
    if (typeof window.switchMode === 'function' && !window.switchMode.__mobWrapped) {
      const origSwitch = window.switchMode;
      window.switchMode = function (...args) {
        const res = origSwitch.apply(this, args);
        if (isMobile()) setTimeout(() => mobSyncUI(), 0);
        return res;
      };
      window.switchMode.__mobWrapped = true;
    }

    ['renderLibraryWorkspace', 'renderRecipesWorkspace'].forEach((fnName) => {
      if (typeof window[fnName] === 'function' && !window[fnName].__mobWrapped) {
        const orig = window[fnName];
        window[fnName] = function (...args) {
          const res = orig.apply(this, args);
          if (isMobile()) ensureDetailPanelCloseButton();
          return res;
        };
        window[fnName].__mobWrapped = true;
      }
    });

    if (typeof window.toggleSummarySection === 'function' && !window.toggleSummarySection.__mobWrapped) {
      const origToggleSum = window.toggleSummarySection;
      window.toggleSummarySection = function (...args) {
        const res = origToggleSum.apply(this, args);
        if (isMobile() && MobState.statusOpen) {
          const footer = el('factory-status-footer');
          if (footer) {
            footer.classList.add('mob-status-open');
            if (!footer.querySelector('.mob-status-close-head')) {
              const head = document.createElement('div');
              head.className = 'mob-status-close-head mob-only';
              head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding-bottom:6px;border-bottom:1px solid var(--border-card);';
              head.innerHTML = '<strong style="font-size:13px;">Resumo da Linha</strong><button type="button" class="mob-sheet-close" onclick="mobCloseAllSheets()" aria-label="Fechar">✕</button>';
              footer.insertBefore(head, footer.firstChild);
            }
          }
        }
        return res;
      };
      window.toggleSummarySection.__mobWrapped = true;
    }

    document.addEventListener('click', (e) => {
      if (!isMobile()) return;
      const btn = e.target.closest('#sidebar-action-section button, .btn-mount-flow');
      if (btn && !btn.disabled && (btn.textContent.includes('Montar') || btn.textContent.includes('Atualizar'))) {
        setTimeout(() => {
          mobCloseAllSheets();
          updateStatusEdgeTab();
        }, 120);
      }
    }, true);

    if (typeof window.updateAuthHeaderUI === 'function' && !window.updateAuthHeaderUI.__mobWrapped) {
      const origAuth = window.updateAuthHeaderUI;
      window.updateAuthHeaderUI = function (...args) {
        const res = origAuth.apply(this, args);
        if (isMobile()) {
          renderBottomNavPages();
          updateTopbarState();
        }
        return res;
      };
      window.updateAuthHeaderUI.__mobWrapped = true;
    }
  }

  function initMobile() {
    if (MobState.initialized) return;
    MobState.initialized = true;
    hookDesktopFunctionsSafely();
    if (isMobile()) mobSyncUI();
    window.addEventListener('resize', () => {
      if (isMobile()) mobSyncUI();
      else {
        mobCloseAllSheets();
        document.body.classList.remove('mob-has-subtabs');
        el('mob-subtabs-bar')?.classList.add('hidden');
        el('mob-status-edge-tab')?.classList.add('hidden');
        el('spaces-hud-controls')?.classList.remove('mob-hud-collapsed');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobile);
  } else {
    initMobile();
  }
})();
