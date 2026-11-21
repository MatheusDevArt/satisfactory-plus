/**
 * Satisfactory+ — Planejador Visual & Mapa Interativo (Satisfactory 1.0+ / th.gl/db)
 * - Modo Claro por padrão + Alternador Modo Claro / Escuro
 * - Animação de entrada (Splash) com a logo oficial S+
 * - 4 Abas reais e limpas:
 *   1. 🏭 Produção (Unificada: calcula pela Entrada/Mineradora OU pelo Produto Final dependendo do que você adicionar primeiro!)
 *   2. ⚡ Energia (Usinas, Combustível, Mineradoras e Bombas d'Água com Overclock)
 *   3. 🛠️ Livre (Construção manual livre + Botão Check para diagnóstico completo)
 *   4. 🗺️ Mapa (Mapa interativo 1.0 com filtros de Nodos, Purezas, Biomas, Discos Rígidos, Somersloops, Mercer e Lesmas)
 */

const AppState = {
  theme: 'light', // 'light' (padrão) | 'dark'
  mode: 'production', // 'production' | 'power' | 'free' | 'map'
  orientation: 'LR', // 'LR' (Esquerda -> Direita, padrão) | 'TB' (Cima -> Baixo)
  showAllMachines: true,
  sidebarCollapsed: false,
  tutorial: {
    isOpen: false,
    step: 0
  },
  excessModal: {
    isOpen: false,
    itemId: null,
    rate: 0
  },

  // Aba 1 Unificada: Produção (determinada pelo que o usuário coloca primeiro: 'input' ou 'product')
  production: {
    driver: null, // null | 'input' (começou pela Mineradora/Entrada) | 'product' (começou pelo Produto Final)
    mounted: false
  },

  // Estado quando guiado pela Entrada (Mineradora -> Produto)
  push: {
    inputs: [],
    targetItemId: null,
    recipeOverrides: {},
    stepSettings: {}
  },

  // Estado quando guiado pelo Produto Final (Produto -> Máquinas & Mineradoras)
  pull: {
    targets: [],
    availableInputs: [],
    recipeOverrides: {},
    stepSettings: {},
    minerSettings: {}
  },

  // Aba 2: Geração de Energia (MW)
  power: {
    mounted: false,
    calcMode: 'by_mw', // 'by_mw' | 'by_generators'
    generatorId: null,
    fuelItemId: null,
    fuelInputMode: 'miner',
    fuelRate: 0,
    minerMark: 'mk1',
    purity: 'normal',
    minerCount: 1,
    minerClock: 100,
    targetMW: '',
    generatorCount: '',
    manualGenerators: null,
    clockPercent: 100,
    waterExtractorClock: 100,
    manualWaterPumps: null
  },

  // Aba 3: Oficina (Construção manual + Validação)
  free: {
    blocks: [],
    customEdges: [],
    selectedIds: [],
    clipboard: null,
    undoStack: [],
    redoStack: [],
    searchQuery: '',
    filterMachineType: 'all',
    filterAlertOnly: false,
    groupBy: 'none', // 'none' | 'machine' | 'stage'
    expandedBlockId: null,
    checkPerformed: false,
    lastCheckReport: null
  },

  // Aba 4: Mapa Interativo Real (MapGenie MASSAGE-2(A-B)b)
  map: {
    viewSource: 'native', // 'native' | 'external'
    searchQuery: '',
    activeCategories: {
      14383: true, // Ferro Puro
      14381: true, // Cobre Puro
      14380: true, // Carvão Puro
      14382: true, // Petróleo Puro
      14378: true, // Bauxita Pura
      14371: true, // Hard Drive
      14373: true  // Somersloop
    },
    selectedLocationId: null,
    leafletMap: null,
    markersLayer: null
  },

  // Aba 5: Biblioteca do Jogo (Recursos, Itens, Máquinas, Ferramentas, Fauna)
  library: {
    category: 'all', // 'all' | 'resources' | 'items' | 'sub:<cat>' | 'machines' | 'generators' | 'logistics' | 'tools' | 'creatures'
    itemsExpanded: false,
    filtersOpen: false,
    filterForm: 'all', // 'all' | 'solid' | 'fluid'
    filterAltOnly: false,
    filterFavOnly: false,
    viewMode: 'grid', // 'grid' | 'list' | 'cards'
    cardSize: 'md', // 'sm' | 'md' | 'lg'
    sortBy: 'progression', // 'progression' | 'az' | 'category'
    collapsedSections: {},
    searchQuery: '',
    selectedId: null,
    detailHistory: [],
    focusedIndex: -1,
    favorites: [],
    recents: []
  },

  // Aba 6: Receitas (Banco completo Satisfactory 1.0+)
  recipes: {
    filter: 'all', // 'all' | 'alternate' | 'ficsmas'
    category: 'all',
    machineFilters: [], // multi-seleção de IDs de máquina
    filtersOpen: false,
    byproductOnly: false,
    favOnly: false,
    viewMode: 'grid', // 'grid' | 'list' | 'table'
    cardSize: 'md', // 'sm' | 'md' | 'lg'
    sortBy: 'progression', // 'progression' | 'az' | 'alternates'
    collapsedSections: {},
    compareMode: false,
    detailHistory: [],
    searchQuery: '',
    selectedId: null
  },

  // Aba 7: Calculadora (Suite completa de cálculos do jogo + Numérica)
  calculator: {
    tool: 'numeric', // 'numeric' | 'resources' | 'production' | 'energy' | 'logistics' | 'sink' | 'elevator'
    // 6.1 Calculadora (Numérica pura)
    expr: '',
    exprResult: '0',
    numHistory: [],
    // 6.2 Recursos (nada pré-definido)
    resItemId: '',
    resRecipeId: '',
    resTargetRate: '',
    resMachineClocks: {}, // machineId -> 100..250
    // 6.3 Produção (nada pré-definido, sem geradores)
    prodMachineId: '',
    prodRecipeId: '',
    prodMachineCount: '',
    prodClock: 100,
    // 6.4 Energia (nada pré-definido)
    energyMode: 'by_mw', // 'by_mw' | 'by_generators'
    energyTargetMw: '',
    genId: '',
    genFuelId: '',
    genCount: '',
    genClock: 100,
    genMarginPct: 0,
    // 6.7 Logística (Modo A linha existente | Modo B avulso)
    logMode: 'graph', // 'graph' | 'standalone'
    logKind: 'solid', // 'solid' | 'fluid'
    logItemId: '',
    logAction: 'split', // 'split' | 'merge'
    logTotalRate: '',
    logBranches: '',
    logLengthMeters: '',
    // 6.5 Triturador SUPIMPA (nada pré-definido)
    sinkItemId: '',
    sinkQty: '',
    sinkRate: '',
    // 6.6 Elevador Espacial (fases 1-5 + progresso entregue por item)
    elevatorPhase: 1,
    elevatorDelivered: {}, // `${phase}_${itemId}` -> number
    // Recentes & Fixados
    recents: []
  },

  // Câmera do Espaço Infinito
  canvas: {
    x: 40,
    y: 40,
    scale: 0.85,
    isPanning: false,
    movedDuringDrag: false,
    startX: 0,
    startY: 0,
    lastGraphBounds: null,
    nodeMap: new Map(),
    customPositions: {},
    is3DView: false,
    draggingNode: null,
    wiring: null,
    suppressClickUntil: 0,
    lastGraph: null
  },

  // Inspector de Máquina clicada no Espaço
  inspector: {
    isOpen: false,
    configMeta: null
  },

  // Modal de seleção de item
  picker: {
    isOpen: false,
    callback: null,
    filterType: 'all',
    selectedCategory: 'Todos',
    searchQuery: ''
  }
};

function uid() {
  return 'id_' + Math.random().toString(36).slice(2, 9);
}

function fmt(num, maxDecimals = 2) {
  if (num === undefined || num === null || Number.isNaN(num)) return '0';
  const rounded = Math.round(num * Math.pow(10, maxDecimals)) / Math.pow(10, maxDecimals);
  return rounded.toLocaleString('pt-BR', { maximumFractionDigits: maxDecimals });
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    const cachedTheme = localStorage.getItem('splus_theme');
    if (cachedTheme === 'dark' || cachedTheme === 'light') {
      applyTheme(cachedTheme, { persistLocal: false, saveAccount: false, rerender: false });
    }
  } catch {}
  syncOrientationButtons();
  initIntroSplash();
  initPickerEvents();
  initInfiniteCanvasEvents();
  renderAll(true);
});

/* ============================================================================
 * TELA HOME (ABERTURA DO SITE E REABERTA AO CLICAR NA LOGO) E TEMA CLARO / ESCURO
 * ========================================================================== */

function initIntroSplash() {
  const splash = document.getElementById('intro-splash');
  if (!splash) return;

  // Rolar para baixo (mouse wheel) transiciona da Home para a primeira aba
  window.addEventListener('wheel', (e) => {
    if (!document.body.classList.contains('home-active')) return;
    if (e.deltaY > 12) {
      dismissIntroSplash();
    }
  }, { passive: true });

  // Deslize para cima no celular / touch
  let touchStartY = null;
  splash.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length === 1) touchStartY = e.touches[0].clientY;
  }, { passive: true });
  splash.addEventListener('touchmove', (e) => {
    if (!document.body.classList.contains('home-active') || touchStartY === null) return;
    if (e.touches && e.touches.length === 1 && touchStartY - e.touches[0].clientY > 36) {
      touchStartY = null;
      dismissIntroSplash();
    }
  }, { passive: true });

  // Teclado: seta para baixo, PageDown, Enter ou Espaço
  window.addEventListener('keydown', (e) => {
    if (!document.body.classList.contains('home-active')) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      dismissIntroSplash();
    }
  });
}

function openHomeScreen() {
  const splash = document.getElementById('intro-splash');
  if (!splash) return;
  splash.classList.remove('splash-hidden', 'splash-fade-out');
  document.body.classList.add('home-active');
}

function dismissIntroSplash() {
  const splash = document.getElementById('intro-splash');
  if (!splash || splash.classList.contains('splash-hidden')) {
    document.body.classList.remove('home-active');
    return;
  }
  document.body.classList.remove('home-active');
  splash.classList.add('splash-fade-out');
  if (typeof switchMode === 'function' && AppState.mode !== 'production') {
    switchMode('production');
  }
  setTimeout(() => {
    splash.classList.add('splash-hidden');
    if (typeof checkPendingPatchAutoCard === 'function') {
      checkPendingPatchAutoCard();
    }
  }, 480);
}

function applyTheme(theme, options = {}) {
  const next = theme === 'dark' ? 'dark' : 'light';
  AppState.theme = next;
  document.documentElement.dataset.theme = next;
  document.body.classList.toggle('theme-light', next === 'light');
  document.body.classList.toggle('theme-dark', next === 'dark');

  try {
    if (options.persistLocal !== false) {
      localStorage.setItem('splus_theme', next);
    }
  } catch {}

  const btn = document.getElementById('btn-theme-toggle');
  if (btn) {
    btn.innerHTML = next === 'light' ? '🌙 Escuro' : '☀️ Claro';
  }
  if (options.saveAccount && typeof saveAccountPreferences === 'function') {
    saveAccountPreferences({ theme: next });
  }
  if (options.rerender) {
    renderAll(false);
  }
}

function toggleTheme() {
  const next = AppState.theme === 'light' ? 'dark' : 'light';
  applyTheme(next, { persistLocal: true, saveAccount: true, rerender: true });
}

/* ============================================================================
 * CONTROLE DE ABAS, ORIENTAÇÃO, EXPANSÃO DE MÁQUINAS E MINIMIZAR SIDEBAR
 * ========================================================================== */

function switchMode(mode) {
  AppState.mode = mode;
  document.querySelectorAll('.real-tab').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`tab-${mode}`);
  if (activeBtn) activeBtn.classList.add('active');

  const actionSec = document.getElementById('sidebar-action-section');
  const orientPillWrap = document.getElementById('orient-pill-wrap');
  const statusFooter = document.getElementById('factory-status-footer');
  const hudControls = document.getElementById('spaces-hud-controls');
  const mapView = document.getElementById('map-workspace-view');
  const libraryView = document.getElementById('library-workspace-view');
  const recipesView = document.getElementById('recipes-workspace-view');
  const calcView = document.getElementById('calculator-workspace-view');
  const projectsView = document.getElementById('projects-workspace-view');
  const reportsView = document.getElementById('reports-workspace-view');
  const spacesWorld = document.getElementById('spaces-world');

  const isMap = mode === 'map';
  const isLibrary = mode === 'library';
  const isRecipes = mode === 'recipes';
  const isCalc = mode === 'calculator';
  const isProjects = mode === 'projects';
  const isReports = mode === 'reports';
  const isWorkspaceOverlay = isMap || isLibrary || isRecipes || isCalc || isProjects || isReports;
  const isFree = mode === 'free';
  const freeToolbar = document.getElementById('free-logistics-toolbar');
  if (actionSec) actionSec.classList.toggle('hidden', isWorkspaceOverlay);
  if (orientPillWrap) orientPillWrap.classList.toggle('hidden', isWorkspaceOverlay);
  if (statusFooter && isWorkspaceOverlay) statusFooter.classList.add('hidden');
  if (hudControls) hudControls.classList.toggle('hidden', isWorkspaceOverlay);
  if (freeToolbar) freeToolbar.classList.toggle('hidden', !isFree);
  if (mapView) mapView.classList.toggle('hidden', !isMap);
  if (libraryView) libraryView.classList.toggle('hidden', !isLibrary);
  if (recipesView) recipesView.classList.toggle('hidden', !isRecipes);
  if (calcView) calcView.classList.toggle('hidden', !isCalc);
  if (projectsView) projectsView.classList.toggle('hidden', !isProjects);
  if (reportsView) reportsView.classList.toggle('hidden', !isReports);
  if (spacesWorld) spacesWorld.classList.toggle('hidden', isWorkspaceOverlay);

  closeCanvasMenus();
  renderAll(true);
}

function toggleSidebarCollapse() {
  AppState.sidebarCollapsed = !AppState.sidebarCollapsed;
  const sidebar = document.getElementById('left-sidebar');
  const expandBtn = document.getElementById('btn-expand-sidebar');
  if (sidebar) sidebar.classList.toggle('collapsed', AppState.sidebarCollapsed);
  if (expandBtn) expandBtn.classList.toggle('hidden', !AppState.sidebarCollapsed);
  setTimeout(() => {
    if (AppState.mode === 'map' && typeof syncLeafletMapCover === 'function') {
      syncLeafletMapCover(false);
    } else if (AppState.mode !== 'map' && AppState.canvas.lastGraphBounds) {
      fitCanvasToScreen();
    }
  }, 210);
}

function toggleShowAllMachines() {
  AppState.showAllMachines = !AppState.showAllMachines;
  const btn = document.getElementById('btn-toggle-expand');
  if (btn) {
    btn.classList.toggle('active', AppState.showAllMachines);
    btn.title = AppState.showAllMachines
      ? 'Todas as Máquinas: SIM'
      : 'Todas as Máquinas: NÃO';
  }
  renderAll(true);
}

function toggle3DView() {
  AppState.canvas.is3DView = !AppState.canvas.is3DView;
  const btn = document.getElementById('btn-toggle-3d');
  const viewport = document.getElementById('spaces-viewport');
  if (btn) {
    btn.classList.toggle('active', AppState.canvas.is3DView);
    btn.title = AppState.canvas.is3DView
      ? 'Visão 3D em Andares: SIM'
      : 'Visão 3D em Andares: NÃO';
  }
  if (viewport) {
    viewport.classList.toggle('view-3d', AppState.canvas.is3DView);
  }
  renderAll(false);
}

function syncOrientationButtons() {
  const map = {
    LR: document.getElementById('orient-lr'),
    RL: document.getElementById('orient-rl'),
    TB: document.getElementById('orient-tb'),
    BT: document.getElementById('orient-bt')
  };
  Object.entries(map).forEach(([key, el]) => {
    if (el) el.classList.toggle('active', AppState.orientation === key);
  });
}

function setFlowOrientation(orient) {
  const valid = ['LR', 'RL', 'TB', 'BT'];
  AppState.orientation = valid.includes(orient) ? orient : 'LR';
  syncOrientationButtons();

  // Força o realinhamento do layout mesmo após o usuário ter arrastado cards manualmente
  AppState.canvas.customPositions = {};
  if (AppState.mode === 'free' && Array.isArray(AppState.free.blocks)) {
    AppState.free.blocks.forEach((b) => {
      delete b.x;
      delete b.y;
    });
  }
  renderAll(true);
}

let _lastClearUndoSnapshot = null;
let _undoClearTimer = null;

function hideUndoClearToast() {
  const toast = document.getElementById('undo-clear-toast');
  if (toast) toast.classList.add('hidden');
  if (_undoClearTimer) {
    clearTimeout(_undoClearTimer);
    _undoClearTimer = null;
  }
}

function showUndoClearToast() {
  const toast = document.getElementById('undo-clear-toast');
  if (!toast) return;
  toast.innerHTML = `
    <span>Área limpa.</span>
    <button type="button" class="btn-undo-clear" onclick="undoLastClearFlow()">Desfazer</button>
    <button type="button" class="btn-undo-dismiss" onclick="hideUndoClearToast()" aria-label="Fechar">✕</button>
  `;
  toast.classList.remove('hidden');
  if (_undoClearTimer) clearTimeout(_undoClearTimer);
  _undoClearTimer = setTimeout(() => {
    hideUndoClearToast();
    _lastClearUndoSnapshot = null;
  }, 8000);
}

function undoLastClearFlow() {
  if (!_lastClearUndoSnapshot) return;
  const snap = _lastClearUndoSnapshot;
  _lastClearUndoSnapshot = null;
  hideUndoClearToast();

  if (snap.mode === 'production') {
    AppState.production = snap.production;
    AppState.push = snap.push;
    AppState.pull = snap.pull;
  } else if (snap.mode === 'power') {
    AppState.power = snap.power;
  } else if (snap.mode === 'free') {
    AppState.free = snap.free;
  }
  AppState.canvas.customPositions = snap.customPositions || {};
  renderAll(true);
}

function clearCurrentFlow() {
  const mode = AppState.mode;
  const hasWork =
    (mode === 'production' && (AppState.push.inputs.length > 0 || AppState.pull.targets.length > 0 || AppState.production.mounted)) ||
    (mode === 'power' && (AppState.power.generatorId || AppState.power.mounted)) ||
    (mode === 'free' && (AppState.free.blocks.length > 0 || AppState.free.customEdges.length > 0));

  if (hasWork) {
    _lastClearUndoSnapshot = {
      mode,
      production: JSON.parse(JSON.stringify(AppState.production)),
      push: JSON.parse(JSON.stringify(AppState.push)),
      pull: JSON.parse(JSON.stringify(AppState.pull)),
      power: JSON.parse(JSON.stringify(AppState.power)),
      free: JSON.parse(JSON.stringify(AppState.free)),
      customPositions: JSON.parse(JSON.stringify(AppState.canvas.customPositions || {}))
    };
  }

  // Invalida qualquer cálculo ELK em andamento
  if (typeof _layoutRunSeq === 'number') _layoutRunSeq++;

  // Fecha inspetor, modal de excesso e menus flutuantes abertos
  if (AppState.inspector.isOpen && typeof closeMachineInspector === 'function') closeMachineInspector();
  if (AppState.excessModal.isOpen && typeof closeExcessRecipeModal === 'function') closeExcessRecipeModal();
  if (typeof closeCanvasMenus === 'function') closeCanvasMenus();
  if (typeof FactoryUIState !== 'undefined') FactoryUIState.activeFooterTab = null;

  if (mode === 'production') {
    AppState.production.driver = null;
    AppState.production.mounted = false;
    AppState.push.inputs = [];
    AppState.push.targetItemId = null;
    AppState.push.recipeOverrides = {};
    AppState.push.stepSettings = {};
    AppState.pull.targets = [];
    AppState.pull.availableInputs = [];
    AppState.pull.recipeOverrides = {};
    AppState.pull.stepSettings = {};
    AppState.pull.minerSettings = {};
  } else if (mode === 'power') {
    AppState.power.mounted = false;
    AppState.power.generatorId = null;
    AppState.power.fuelItemId = null;
    AppState.power.manualGenerators = null;
    AppState.power.manualWaterPumps = null;
  } else if (mode === 'free') {
    AppState.free.blocks = [];
    AppState.free.customEdges = [];
    AppState.free.checkPerformed = false;
    AppState.free.lastCheckReport = null;
  }

  AppState.canvas.customPositions = {};
  AppState.canvas.lastGraph = null;
  AppState.canvas.nodeMap = new Map();
  AppState.canvas.lastGraphBounds = null;
  clearCanvasGraph();
  renderAll(true);

  if (hasWork) {
    showUndoClearToast();
  }
}

/* ============================================================================
 * ESPAÇO INFINITO (PAN, ZOOM E CENTRALIZAÇÃO)
 * ========================================================================== */

function closeCanvasMenus() {
  const ctxMenu = document.getElementById('canvas-context-menu');
  const wireMenu = document.getElementById('wire-drop-menu');
  if (ctxMenu) ctxMenu.classList.add('hidden');
  if (wireMenu) wireMenu.classList.add('hidden');
}

function clientToWorld(clientX, clientY) {
  const viewport = document.getElementById('spaces-viewport');
  if (!viewport) return { x: 600, y: 500 };
  const rect = viewport.getBoundingClientRect();
  return {
    x: (clientX - rect.left - AppState.canvas.x) / AppState.canvas.scale,
    y: (clientY - rect.top - AppState.canvas.y) / AppState.canvas.scale
  };
}

function resetAllCanvasInteractions() {
  if (AppState.canvas.dragRafId) {
    cancelAnimationFrame(AppState.canvas.dragRafId);
    AppState.canvas.dragRafId = null;
  }
  AppState.canvas.isPanning = false;
  if (AppState.canvas.draggingNode) {
    const el = AppState.canvas.draggingNode.cardEl;
    if (el) {
      el.style.transform = '';
      el.classList.remove('is-dragging-node');
    }
    AppState.canvas.draggingNode = null;
  }
  if (AppState.canvas.wiring) {
    AppState.canvas.wiring = null;
    const prev = document.getElementById('wire-preview-path');
    if (prev) prev.remove();
    document.querySelectorAll('.magnific-card.wire-target-compatible, .magnific-card.wire-hover-ok, .magnific-card.wire-hover-bad').forEach(el => {
      el.classList.remove('wire-target-compatible', 'wire-hover-ok', 'wire-hover-bad');
    });
  }
  const viewportEl = document.getElementById('spaces-viewport');
  if (viewportEl) {
    viewportEl.classList.remove('panning', 'dragging-card', 'wiring-active');
  }
}

function updateConnectedWiresForNode(nodeId) {
  const graph = AppState.canvas.lastGraph;
  if (!graph || !Array.isArray(graph.edges)) return;
  const orient = AppState.orientation || 'LR';
  const nodeCoords = AppState.canvas.nodeMap;

  graph.edges.forEach((edge, idx) => {
    if (edge.from !== nodeId && edge.to !== nodeId) return;
    const fromBox = nodeCoords.get(edge.from);
    const toBox = nodeCoords.get(edge.to);
    if (!fromBox || !toBox) return;

    const geom = computeEdgeGeometry(fromBox, toBox, orient, edge);
    const groupEl = document.getElementById(`edge-group-${idx}`);
    if (groupEl) {
      groupEl.querySelectorAll('path').forEach(p => p.setAttribute('d', geom.d));
    }
    const pillEl = document.getElementById(`wire-pill-${idx}`);
    if (pillEl) {
      pillEl.style.left = `${geom.badgeX}px`;
      pillEl.style.top = `${geom.badgeY}px`;
    }
  });
}

function initInfiniteCanvasEvents() {
  const viewport = document.getElementById('spaces-viewport');
  if (!viewport) return;

  // Impede que o navegador inicie drag-and-drop nativo de imagens/elementos (causava travamento do pan)
  viewport.addEventListener('dragstart', (e) => {
    e.preventDefault();
  });

  viewport.addEventListener('mousedown', (e) => {
    if (AppState.mode === 'map' || AppState.mode === 'library' || AppState.mode === 'recipes' || AppState.mode === 'calculator' || AppState.mode === 'projects' || AppState.mode === 'reports') return;

    // Fecha menus se clicar fora deles
    if (!e.target.closest('#canvas-context-menu, #wire-drop-menu')) {
      closeCanvasMenus();
    }

    if (e.button !== 0) return;
    if (e.target.closest('button, input, select, .hud-btn, .empty-card-box, .btn-expand-sidebar, .top-right-floating-actions, .user-dropdown-menu, .modal-backdrop, .map-workspace-view, .library-workspace-view, .calculator-workspace-view, .projects-workspace-view, .reports-workspace-view, .wire-hit-area, .conveyor-edge-group, .wire-belt-pill, #canvas-context-menu, #wire-drop-menu')) return;

    // 1. Clique em uma porta de saída para puxar esteira/conexão (APENAS no Modo Livre)
    const outPort = e.target.closest('.port-lr-out, .port-rl-out, .port-tb-out, .port-bt-out');
    if (outPort) {
      if (AppState.mode !== 'free') return;
      e.preventDefault();
      e.stopPropagation();
      const cardEl = outPort.closest('.magnific-card');
      if (!cardEl) return;
      const fromNodeId = cardEl.id;
      const fromBox = AppState.canvas.nodeMap.get(fromNodeId);
      if (!fromBox) return;
      const orient = AppState.orientation || 'LR';
      let startX, startY;
      if (orient === 'TB') {
        startX = fromBox.x + fromBox.w / 2;
        startY = fromBox.y + fromBox.h;
      } else if (orient === 'BT') {
        startX = fromBox.x + fromBox.w / 2;
        startY = fromBox.y;
      } else if (orient === 'RL') {
        startX = fromBox.x;
        startY = fromBox.y + fromBox.h / 2;
      } else {
        startX = fromBox.x + fromBox.w;
        startY = fromBox.y + fromBox.h / 2;
      }

      AppState.canvas.wiring = { fromNodeId, startX, startY, currX: startX, currY: startY, hoveredCardId: null };
      viewport.classList.add('wiring-active');
      return;
    }

    // 2. Clique em um card para arrastar livremente no canvas (Alt + Arrastar = Duplicar)
    const cardEl = e.target.closest('.magnific-card');
    if (cardEl && !e.target.closest('.mcard-port, .mcard-delete-btn')) {
      e.preventDefault();
      let targetNodeId = cardEl.id;
      let box = AppState.canvas.nodeMap.get(targetNodeId);
      if (!box) return;

      if (e.altKey && AppState.mode === 'free' && box.node?.blockId) {
        const newBlockId = duplicateFreeBlock(box.node.blockId, { x: box.x + 28, y: box.y + 28 }, true);
        if (newBlockId) {
          targetNodeId = `free_${newBlockId}_0`;
          box = AppState.canvas.nodeMap.get(targetNodeId);
        }
      }

      if (!box) return;
      const actualCardEl = document.getElementById(targetNodeId);
      if (actualCardEl) actualCardEl.classList.add('is-dragging-node');
      AppState.canvas.draggingNode = {
        nodeId: targetNodeId,
        cardEl: actualCardEl,
        startClientX: e.clientX,
        startClientY: e.clientY,
        origX: box.x,
        origY: box.y,
        currDx: 0,
        currDy: 0,
        moved: false
      };
      AppState.canvas.movedDuringDrag = false;
      viewport.classList.add('dragging-card');
      return;
    }

    // 3. Clique no fundo vazio: Espaço+arrastar = Pan; sem Espaço na Oficina = seleção por retângulo
    if (AppState.mode === 'free' && !AppState.canvas.spacePressed) {
      const rect = viewport.getBoundingClientRect();
      AppState.canvas.marquee = {
        startX: e.clientX - rect.left,
        startY: e.clientY - rect.top,
        currX: e.clientX - rect.left,
        currY: e.clientY - rect.top,
        moved: false
      };
      AppState.canvas.movedDuringDrag = false;
      return;
    }

    AppState.canvas.isPanning = true;
    AppState.canvas.movedDuringDrag = false;
    AppState.canvas.startX = e.clientX - AppState.canvas.x;
    AppState.canvas.startY = e.clientY - AppState.canvas.y;
    viewport.classList.add('panning');
  });

  viewport.addEventListener('contextmenu', (e) => {
    if (AppState.mode !== 'free') return;
    if (e.target.closest('button, input, select, .hud-btn')) return;
    const cardEl = e.target.closest('.magnific-card');
    if (cardEl && cardEl.id) {
      e.preventDefault();
      openCardContextMenu(e.clientX, e.clientY, cardEl.id);
      return;
    }
    e.preventDefault();
    const worldPos = clientToWorld(e.clientX, e.clientY);
    openCanvasContextMenu(e.clientX, e.clientY, worldPos);
  });

  window.addEventListener('mousemove', (e) => {
    // Arrastando conexão (esteira): destaca SOMENTE a borda do card sob o ponteiro (verde = compatível, vermelho = incompatível)
    if (AppState.canvas.wiring) {
      const w = AppState.canvas.wiring;
      const worldPos = clientToWorld(e.clientX, e.clientY);
      w.currX = worldPos.x;
      w.currY = worldPos.y;
      updateWirePreviewPath(w.startX, w.startY, w.currX, w.currY);

      const under = document.elementFromPoint(e.clientX, e.clientY);
      const targetCard = under ? under.closest('.magnific-card') : null;
      const nextId = (targetCard && targetCard.id !== w.fromNodeId) ? targetCard.id : null;

      if (w.hoveredCardId !== nextId) {
        if (w.hoveredCardId) {
          const prevEl = document.getElementById(w.hoveredCardId);
          if (prevEl) prevEl.classList.remove('wire-hover-ok', 'wire-hover-bad');
        }
        w.hoveredCardId = nextId;
        if (nextId && targetCard) {
          const fromBox = AppState.canvas.nodeMap.get(w.fromNodeId);
          const toBox = AppState.canvas.nodeMap.get(nextId);
          const check = (fromBox && toBox) ? canConnectNodes(fromBox.node, toBox.node) : { ok: false };
          targetCard.classList.add(check.ok ? 'wire-hover-ok' : 'wire-hover-bad');
        }
      }
      return;
    }

    // Arrastando card de máquina (60fps com transform + requestAnimationFrame, atualizando SÓ esteiras ligadas)
    if (AppState.canvas.draggingNode) {
      const dn = AppState.canvas.draggingNode;
      const dist = Math.hypot(e.clientX - dn.startClientX, e.clientY - dn.startClientY);
      if (dist > 4) {
        dn.moved = true;
        AppState.canvas.movedDuringDrag = true;
      }
      dn.currDx = Math.round((e.clientX - dn.startClientX) / AppState.canvas.scale);
      dn.currDy = Math.round((e.clientY - dn.startClientY) / AppState.canvas.scale);

      if (!AppState.canvas.dragRafId) {
        AppState.canvas.dragRafId = requestAnimationFrame(() => {
          AppState.canvas.dragRafId = null;
          const activeDn = AppState.canvas.draggingNode;
          if (!activeDn) return;
          const box = AppState.canvas.nodeMap.get(activeDn.nodeId);
          if (!box) return;
          box.x = activeDn.origX + activeDn.currDx;
          box.y = activeDn.origY + activeDn.currDy;
          if (activeDn.cardEl) {
            activeDn.cardEl.style.transform = `translate3d(${activeDn.currDx}px, ${activeDn.currDy}px, 0)`;
          }
          updateConnectedWiresForNode(activeDn.nodeId);
        });
      }
      return;
    }

    // Seleção por retângulo (marquee) na Oficina
    if (AppState.canvas.marquee) {
      const m = AppState.canvas.marquee;
      const rect = viewport.getBoundingClientRect();
      m.currX = e.clientX - rect.left;
      m.currY = e.clientY - rect.top;
      if (Math.abs(m.currX - m.startX) > 6 || Math.abs(m.currY - m.startY) > 6) {
        m.moved = true;
        AppState.canvas.movedDuringDrag = true;
        let boxEl = document.getElementById('canvas-marquee-box');
        if (!boxEl) {
          boxEl = document.createElement('div');
          boxEl.id = 'canvas-marquee-box';
          boxEl.className = 'canvas-marquee-box';
          viewport.appendChild(boxEl);
        }
        const left = Math.min(m.startX, m.currX);
        const top = Math.min(m.startY, m.currY);
        const width = Math.abs(m.currX - m.startX);
        const height = Math.abs(m.currY - m.startY);
        boxEl.style.left = `${left}px`;
        boxEl.style.top = `${top}px`;
        boxEl.style.width = `${width}px`;
        boxEl.style.height = `${height}px`;
      }
      return;
    }

    // Pan da câmera (com requestAnimationFrame)
    if (!AppState.canvas.isPanning) return;
    const nx = e.clientX - AppState.canvas.startX;
    const ny = e.clientY - AppState.canvas.startY;
    if (Math.abs(nx - AppState.canvas.x) > 4 || Math.abs(ny - AppState.canvas.y) > 4) {
      AppState.canvas.movedDuringDrag = true;
    }
    AppState.canvas.x = nx;
    AppState.canvas.y = ny;
    if (!AppState.canvas.dragRafId) {
      AppState.canvas.dragRafId = requestAnimationFrame(() => {
        AppState.canvas.dragRafId = null;
        applyCanvasTransform();
      });
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (AppState.canvas.marquee) {
      const m = AppState.canvas.marquee;
      AppState.canvas.marquee = null;
      document.getElementById('canvas-marquee-box')?.remove();
      if (m.moved) {
        const rect = viewport.getBoundingClientRect();
        const xMin = Math.min(m.startX, m.currX) + rect.left;
        const xMax = Math.max(m.startX, m.currX) + rect.left;
        const yMin = Math.min(m.startY, m.currY) + rect.top;
        const yMax = Math.max(m.startY, m.currY) + rect.top;
        const picked = [];
        document.querySelectorAll('#spaces-nodes .magnific-card[data-block-id]').forEach(el => {
          const bid = el.getAttribute('data-block-id');
          if (!bid) return;
          const r = el.getBoundingClientRect();
          const intersects = !(r.right < xMin || r.left > xMax || r.bottom < yMin || r.top > yMax);
          if (intersects) picked.push(bid);
        });
        AppState.free.selectedIds = picked;
        AppState.canvas.suppressClickUntil = Date.now() + 140;
        renderAll(false);
      } else {
        if (AppState.free.selectedIds && AppState.free.selectedIds.length > 0) {
          AppState.free.selectedIds = [];
          renderAll(false);
        }
      }
      return;
    }

    if (AppState.canvas.wiring) {
      const w = AppState.canvas.wiring;
      const targetCard = e.target && e.target.closest ? e.target.closest('.magnific-card') : null;
      const fromNodeId = w.fromNodeId;
      resetAllCanvasInteractions();

      if (targetCard && targetCard.id && targetCard.id !== fromNodeId) {
        handleWireDropOnCard(fromNodeId, targetCard.id);
      } else {
        const worldPos = clientToWorld(e.clientX, e.clientY);
        openWireDropMenu(e.clientX, e.clientY, fromNodeId, worldPos);
      }
      return;
    }

    if (AppState.canvas.draggingNode) {
      const dn = AppState.canvas.draggingNode;
      const box = AppState.canvas.nodeMap.get(dn.nodeId);
      if (dn.moved && box) {
        box.x = dn.origX + dn.currDx;
        box.y = dn.origY + dn.currDy;
        AppState.canvas.customPositions[dn.nodeId] = { x: box.x, y: box.y };
        if (dn.cardEl) {
          dn.cardEl.style.transform = '';
          dn.cardEl.style.left = `${box.x}px`;
          dn.cardEl.style.top = `${box.y}px`;
        }
        updateConnectedWiresForNode(dn.nodeId);
        AppState.canvas.suppressClickUntil = Date.now() + 140;
        if (AppState.mode === 'free' && box.node?.blockId) {
          const blk = AppState.free.blocks.find(b => b.id === box.node.blockId);
          if (blk && (blk.count || 1) === 1) {
            blk.x = box.x;
            blk.y = box.y;
          }
        }
      }
      resetAllCanvasInteractions();
      return;
    }

    if (AppState.canvas.isPanning) {
      resetAllCanvasInteractions();
    }
  });

  window.addEventListener('blur', () => {
    resetAllCanvasInteractions();
  });

  viewport.addEventListener('wheel', (e) => {
    if (AppState.mode === 'map' || AppState.mode === 'library' || AppState.mode === 'recipes' || AppState.mode === 'calculator' || AppState.mode === 'projects' || AppState.mode === 'reports') return;
    e.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.11 : 0.9;
    const newScale = Math.min(1.65, Math.max(0.18, AppState.canvas.scale * zoomFactor));

    const worldX = (mouseX - AppState.canvas.x) / AppState.canvas.scale;
    const worldY = (mouseY - AppState.canvas.y) / AppState.canvas.scale;

    AppState.canvas.scale = newScale;
    AppState.canvas.x = mouseX - worldX * newScale;
    AppState.canvas.y = mouseY - worldY * newScale;

    applyCanvasTransform();
  }, { passive: false });
}

function applyCanvasTransform() {
  const world = document.getElementById('spaces-world');
  const viewport = document.getElementById('spaces-viewport');
  const gridBg = document.getElementById('spaces-grid-bg');
  const readout = document.getElementById('zoom-readout');

  if (world) {
    world.style.transform = `translate3d(${AppState.canvas.x}px, ${AppState.canvas.y}px, 0) scale(${AppState.canvas.scale})`;
  }
  if (viewport) {
    viewport.classList.toggle('zoom-far', AppState.canvas.scale < 0.45);
  }
  if (gridBg) {
    const gridSize = 32 * AppState.canvas.scale;
    gridBg.style.backgroundSize = `${gridSize}px ${gridSize}px`;
    gridBg.style.backgroundPosition = `${AppState.canvas.x}px ${AppState.canvas.y}px`;
  }
  if (readout) {
    readout.textContent = `${Math.round(AppState.canvas.scale * 100)}%`;
  }
}

function zoomCanvas(delta) {
  const viewport = document.getElementById('spaces-viewport');
  if (!viewport) return;
  const rect = viewport.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;

  const newScale = Math.min(1.65, Math.max(0.18, AppState.canvas.scale + delta));
  const worldX = (cx - AppState.canvas.x) / AppState.canvas.scale;
  const worldY = (cy - AppState.canvas.y) / AppState.canvas.scale;

  AppState.canvas.scale = newScale;
  AppState.canvas.x = cx - worldX * newScale;
  AppState.canvas.y = cy - worldY * newScale;
  applyCanvasTransform();
}

function resetCanvasView() {
  AppState.canvas.scale = 1;
  fitCanvasToScreen(1);
}

function fitCanvasToScreen(forcedScale = null) {
  const viewport = document.getElementById('spaces-viewport');
  const bounds = AppState.canvas.lastGraphBounds;
  if (!viewport || !bounds) return;

  const rect = viewport.getBoundingClientRect();
  const availW = Math.max(320, rect.width - 90);
  const availH = Math.max(260, rect.height - 90);

  const graphW = Math.max(360, bounds.maxX - bounds.minX);
  const graphH = Math.max(320, bounds.maxY - bounds.minY);

  const scaleX = availW / graphW;
  const scaleY = availH / graphH;
  const targetScale = forcedScale || Math.min(0.95, Math.max(0.24, Math.min(scaleX, scaleY)));

  const graphCenterX = (bounds.minX + bounds.maxX) / 2;
  const graphCenterY = (bounds.minY + bounds.maxY) / 2;

  AppState.canvas.scale = targetScale;
  AppState.canvas.x = (rect.width / 2) - graphCenterX * targetScale;
  AppState.canvas.y = (rect.height / 2) - graphCenterY * targetScale;
  applyCanvasTransform();
}

/* ============================================================================
 * RENDERIZAÇÃO PRINCIPAL (SIDEBAR ESQUERDA + ÁREA DE TRABALHO À DIREITA)
 * ========================================================================== */

function renderAll(autoFit = false) {
  const sidebarContent = document.getElementById('left-sidebar-content');
  const emptyOverlay = document.getElementById('spaces-empty-overlay');
  if (!sidebarContent || !emptyOverlay) return;

  if (AppState.mode === 'production') {
    renderProductionMode(sidebarContent, emptyOverlay, autoFit);
  } else if (AppState.mode === 'power') {
    renderPowerMode(sidebarContent, emptyOverlay, autoFit);
  } else if (AppState.mode === 'free') {
    renderFreeMode(sidebarContent, emptyOverlay, autoFit);
  } else if (AppState.mode === 'map') {
    renderMapMode(sidebarContent, emptyOverlay);
  } else if (AppState.mode === 'recipes') {
    renderRecipesMode(sidebarContent, emptyOverlay);
  } else if (AppState.mode === 'library') {
    renderLibraryMode(sidebarContent, emptyOverlay);
  } else if (AppState.mode === 'calculator') {
    renderCalculatorMode(sidebarContent, emptyOverlay);
  } else if (AppState.mode === 'projects' && typeof renderProjectsMode === 'function') {
    renderProjectsMode(sidebarContent, emptyOverlay);
  } else if (AppState.mode === 'reports' && typeof renderAdminReportsMode === 'function') {
    renderAdminReportsMode(sidebarContent, emptyOverlay);
  }

  updateTopRightFloatingActions();

  if (AppState.inspector.isOpen) {
    renderMachineInspectorContent();
  }
}

function commitFocusedSidebarInput() {
  const active = document.activeElement;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'SELECT') && active.closest('#left-sidebar')) {
    active.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function mountProductionFlow() {
  commitFocusedSidebarInput();
  if (!AppState.production.driver) {
    if (AppState.pull.targets.length > 0) AppState.production.driver = 'product';
    else if (AppState.push.inputs.length > 0 && AppState.push.targetItemId) AppState.production.driver = 'input';
  }
  AppState.production.mounted = true;
  renderAll(true);
}

function mountPowerFlow() {
  commitFocusedSidebarInput();
  AppState.power.mounted = true;
  renderAll(true);
}

function getShardsForClock(clockPct) {
  const c = Math.max(100, Math.min(250, Number(clockPct) || 100));
  if (c <= 100) return 0;
  if (c <= 150) return 1;
  if (c <= 200) return 2;
  return 3;
}

/**
 * Componente único reutilizável de Overclock em slide (100% a 250%)
 * com botões -/+, atalhos 100/150/200/250% e contador de Fragmentos de Energia.
 */
function renderOverclockSliderHtml({ value = 100, onChangeExpr, label = 'Overclock' }) {
  const c = Math.max(100, Math.min(250, Math.round(Number(value) || 100)));
  const shards = getShardsForClock(c);
  const shardLabel = shards === 0 ? '0 fragmentos' : `${shards} fragmento${shards > 1 ? 's' : ''}`;
  const setVal = (v) => onChangeExpr.replace(/__VAL__/g, String(Math.max(100, Math.min(250, v))));

  return `
    <div class="oc-slider-wrap">
      <div class="oc-slider-head">
        <span class="oc-slider-lbl">${label}</span>
        <span class="oc-slider-meta">
          <strong class="oc-slider-val">${c}%</strong>
          <span class="oc-shard-pill ${shards > 0 ? 'has-shards' : ''}" title="Fragmentos de Energia necessários">💎 ${shardLabel}</span>
        </span>
      </div>
      <div class="oc-slider-row">
        <button type="button" class="oc-step-btn" onclick="${setVal(Math.max(100, c - 5))}" title="-5%">−</button>
        <input
          type="range"
          class="oc-range-input"
          min="100"
          max="250"
          step="1"
          value="${c}"
          oninput="const p=this.closest('.oc-slider-wrap'); if(p){ const v=Math.max(100,Number(this.value)||100); const ve=p.querySelector('.oc-slider-val'); if(ve) ve.textContent=v+'%'; const sp=p.querySelector('.oc-shard-pill'); if(sp){ const s=getShardsForClock(v); sp.textContent='💎 '+s+' fragmento'+(s===1?'':'s'); sp.classList.toggle('has-shards', s>0); } }"
          onchange="${onChangeExpr.replace(/__VAL__/g, 'Math.max(100, Math.min(250, Number(this.value)||100))')}"
        />
        <button type="button" class="oc-step-btn" onclick="${setVal(Math.min(250, c + 5))}" title="+5%">+</button>
      </div>
      <div class="oc-presets-row">
        ${[100, 150, 200, 250].map(p => `
          <button type="button" class="oc-preset-btn ${c === p ? 'active' : ''}" onclick="${setVal(p)}">${p}%</button>
        `).join('')}
      </div>
    </div>
  `;
}

// 3.4 Raio de Overclock Global (desligado -> 150% -> 200% -> 250% -> desligado)
const _globalOverclockState = {
  level: 0, // 0 = desligado | 150 | 200 | 250
  saved: null // snapshot dos clocks individuais anteriores
};

function syncGlobalOverclockBtnUI() {
  const btn = document.getElementById('btn-global-overclock');
  const badge = document.getElementById('global-oc-badge');
  if (!btn || !badge) return;
  const lvl = _globalOverclockState.level;
  btn.classList.toggle('active', lvl > 0);
  if (lvl > 0) {
    const labelMap = { 150: '1,5x', 200: '2x', 250: '2,5x' };
    badge.textContent = labelMap[lvl] || `${lvl}%`;
    badge.classList.remove('hidden');
    btn.title = `Overclock global: ${lvl}% (clique para alternar)`;
  } else {
    badge.textContent = '';
    badge.classList.add('hidden');
    btn.title = 'Overclock global: Desligado (clique para 150% / 200% / 250%)';
  }
}

function cycleGlobalOverclock() {
  const order = [0, 150, 200, 250];
  const nextIdx = (order.indexOf(_globalOverclockState.level) + 1) % order.length;
  const nextLevel = order[nextIdx];

  if (_globalOverclockState.level === 0 && nextLevel > 0) {
    // Salva snapshot dos clocks individuais atuais antes de aplicar o global
    _globalOverclockState.saved = {
      pullSteps: JSON.parse(JSON.stringify(AppState.pull.stepSettings || {})),
      pullMiners: JSON.parse(JSON.stringify(AppState.pull.minerSettings || {})),
      pushSteps: JSON.parse(JSON.stringify(AppState.push.stepSettings || {})),
      pushInputs: (AppState.push.inputs || []).map(i => ({ id: i.id, clockPercent: i.clockPercent || 100 })),
      power: {
        clockPercent: AppState.power.clockPercent || 100,
        minerClock: AppState.power.minerClock || 100,
        waterExtractorClock: AppState.power.waterExtractorClock || 100
      },
      freeBlocks: (AppState.free.blocks || []).map(b => ({ id: b.id, clockPercent: b.clockPercent || 100 }))
    };
  }

  _globalOverclockState.level = nextLevel;

  if (nextLevel === 0 && _globalOverclockState.saved) {
    // Restaura os valores individuais anteriores
    const sv = _globalOverclockState.saved;
    AppState.pull.stepSettings = sv.pullSteps || {};
    AppState.pull.minerSettings = sv.pullMiners || {};
    AppState.push.stepSettings = sv.pushSteps || {};
    (AppState.push.inputs || []).forEach(inp => {
      const found = (sv.pushInputs || []).find(x => x.id === inp.id);
      if (found) inp.clockPercent = found.clockPercent;
    });
    if (sv.power) {
      AppState.power.clockPercent = sv.power.clockPercent;
      AppState.power.minerClock = sv.power.minerClock;
      AppState.power.waterExtractorClock = sv.power.waterExtractorClock;
    }
    (AppState.free.blocks || []).forEach(b => {
      const found = (sv.freeBlocks || []).find(x => x.id === b.id);
      if (found) b.clockPercent = found.clockPercent;
    });
    _globalOverclockState.saved = null;
  } else if (nextLevel > 0) {
    // Aplica o overclock global a todas as máquinas que suportam overclock
    if (AppState.mode === 'production') {
      if (AppState.production.driver === 'product' && AppState.pull.targets.length > 0) {
        const plan = Solver.solveProductionChain({
          targets: AppState.pull.targets,
          recipeOverrides: AppState.pull.recipeOverrides,
          stepSettings: AppState.pull.stepSettings,
          minerSettings: AppState.pull.minerSettings
        });
        (plan?.stages || []).forEach(st => {
          if (!AppState.pull.stepSettings[st.itemId]) AppState.pull.stepSettings[st.itemId] = {};
          AppState.pull.stepSettings[st.itemId].clockPercent = nextLevel;
        });
        (plan?.rawResources || []).forEach(r => {
          if (!AppState.pull.minerSettings[r.itemId]) AppState.pull.minerSettings[r.itemId] = { minerMark: 'mk1', purity: 'normal' };
          AppState.pull.minerSettings[r.itemId].clockPercent = nextLevel;
        });
      } else if (AppState.production.driver === 'input') {
        (AppState.push.inputs || []).forEach(inp => { inp.clockPercent = nextLevel; });
        const plan = Solver.calculatePushChain(AppState.push.inputs, AppState.push.targetItemId, AppState.push.recipeOverrides, AppState.push.stepSettings);
        (plan?.stages || []).forEach(st => {
          if (!AppState.push.stepSettings[st.itemId]) AppState.push.stepSettings[st.itemId] = {};
          AppState.push.stepSettings[st.itemId].clockPercent = nextLevel;
        });
      }
    } else if (AppState.mode === 'power') {
      AppState.power.clockPercent = nextLevel;
      AppState.power.minerClock = nextLevel;
      AppState.power.waterExtractorClock = nextLevel;
      AppState.power.manualGenerators = null;
      AppState.power.manualWaterPumps = null;
    } else if (AppState.mode === 'free') {
      (AppState.free.blocks || []).forEach(b => {
        if (b.blockType === 'machine' || b.blockType === 'extractor' || b.blockType === 'generator') {
          b.clockPercent = nextLevel;
        }
      });
    }
  }

  syncGlobalOverclockBtnUI();
  renderAll(false);
}

function updateTopRightFloatingActions() {
  const container = document.getElementById('sidebar-action-section');
  if (!container) return;

  const footerEl = document.getElementById('factory-status-footer');
  const setFooterHtml = (html) => {
    if (!footerEl) return;
    if (html) {
      footerEl.innerHTML = html;
      footerEl.classList.remove('hidden');
    } else {
      footerEl.innerHTML = '';
      footerEl.classList.add('hidden');
    }
  };

  if (AppState.mode === 'map' || AppState.mode === 'library' || AppState.mode === 'recipes' || AppState.mode === 'calculator' || AppState.mode === 'projects' || AppState.mode === 'reports') {
    container.classList.add('hidden');
    container.innerHTML = '';
    setFooterHtml('');
    return;
  }

  container.classList.remove('hidden');

  if (AppState.mode === 'production') {
    const isPushReady = AppState.production.driver === 'input' && AppState.push.inputs.length > 0 && Boolean(AppState.push.targetItemId);
    const isPullReady = AppState.production.driver === 'product' && AppState.pull.targets.length > 0;
    const isReady = isPushReady || isPullReady;
    const isMounted = Boolean(AppState.production.mounted);

    let footerHtml = '';
    if (isReady && isMounted) {
      let plan = null;
      if (isPushReady) {
        plan = Solver.calculatePushChain(AppState.push.inputs, AppState.push.targetItemId, AppState.push.recipeOverrides, AppState.push.stepSettings);
      } else if (isPullReady) {
        plan = Solver.solveProductionChain({
          targets: AppState.pull.targets,
          recipeOverrides: AppState.pull.recipeOverrides,
          stepSettings: AppState.pull.stepSettings,
          minerSettings: AppState.pull.minerSettings
        });
      }
      if (plan && plan.stages && plan.stages.length > 0 && typeof renderFactorySummaryPanel === 'function') {
        footerHtml = renderFactorySummaryPanel({ mode: 'production', plan, graph: AppState.canvas.lastGraph });
      }
    }
    setFooterHtml(footerHtml);

    const saveActionsHtml = (isReady && typeof renderSaveProjectButtonsHtml === 'function')
      ? renderSaveProjectButtonsHtml('production')
      : '';

    const hasAnyProd = AppState.push.inputs.length > 0 || AppState.pull.targets.length > 0 || isMounted;
    container.innerHTML = `
      <div class="sidebar-action-row">
        <button
          class="btn-floating-primary sidebar-action-btn ${isReady ? 'ready' : 'disabled'}"
          ${!isReady ? 'disabled title="Configure a entrada e o produto abaixo primeiro"' : ''}
          onmousedown="event.preventDefault()"
          onclick="mountProductionFlow()"
        >
          ${isMounted ? '🔄 Atualizar' : '⚡ Montar Linha'}
        </button>
        <button
          type="button"
          class="btn-clear-inline"
          ${!hasAnyProd ? 'disabled' : ''}
          onmousedown="event.preventDefault()"
          onclick="clearCurrentFlow()"
          title="Limpar área de trabalho"
        >Limpar</button>
      </div>
      ${isReady && isMounted ? `
        <button type="button" class="btn-edit-in-free" onmousedown="event.preventDefault()" onclick="convertProductionToFreeMode()" title="Levar esta linha para o Modo Livre para adicionar divisores e armazenamento">
          🛠️ Editar no Livre
        </button>
      ` : ''}
      ${saveActionsHtml}
    `;
  } else if (AppState.mode === 'power') {
    const isReady = Boolean(AppState.power.generatorId && AppState.power.fuelItemId);
    const isMounted = Boolean(AppState.power.mounted);
    const hasAnyPower = Boolean(AppState.power.generatorId || isMounted);
    let powerFooterHtml = '';
    if (isReady) {
      const pwr = Solver.calculatePowerPlan(AppState.power);
      if (pwr) {
        const fuelName = pwr.fuelItem?.name || '';
        const waterPart = pwr.waterRequired > 0
          ? `<span class="fs-footer-tab">💧 Água: ${fmt(pwr.waterRequired, 1)} m³/min (${pwr.intWaterPumps || 0}×)</span>`
          : '';
        powerFooterHtml = `
          <div class="fs-footer-bar" role="status" aria-label="Resumo de energia">
            <span class="fs-footer-tab tone-pos">⚡ Bruta: +${fmt(pwr.totalGrossMw, 1)} MW (${pwr.intGenerators}×)</span>
            <span class="fs-footer-tab tone-pos">🔋 Líquida: +${fmt(pwr.netPowerMw, 1)} MW</span>
            <span class="fs-footer-tab">🔥 ${fuelName}: ${fmt(pwr.totalFuelConsumed, 1)}/min</span>
            ${waterPart}
          </div>
        `;
      }
    }
    setFooterHtml(powerFooterHtml);
    container.innerHTML = `
      <div class="sidebar-action-row">
        <button
          class="btn-floating-primary sidebar-action-btn ${isReady ? 'ready' : 'disabled'}"
          ${!isReady ? 'disabled title="Escolha uma usina abaixo primeiro"' : ''}
          onmousedown="event.preventDefault()"
          onclick="mountPowerFlow()"
        >
          ${isMounted ? '🔄 Atualizar' : '⚡ Montar Usina'}
        </button>
        <button
          type="button"
          class="btn-clear-inline"
          ${!hasAnyPower ? 'disabled' : ''}
          onmousedown="event.preventDefault()"
          onclick="clearCurrentFlow()"
          title="Limpar área de trabalho"
        >Limpar</button>
      </div>
    `;
  } else if (AppState.mode === 'free') {
    const blocks = AppState.free.blocks || [];
    const hasBlocks = blocks.length > 0;
    const footerHtml = (hasBlocks && typeof renderFactorySummaryPanel === 'function')
      ? renderFactorySummaryPanel({ mode: 'free', freeBlocks: blocks, freeEdges: AppState.free.customEdges, graph: AppState.canvas.lastGraph })
      : '';
    setFooterHtml(footerHtml);

    const freeSaveHtml = (hasBlocks && typeof renderSaveProjectButtonsHtml === 'function')
      ? renderSaveProjectButtonsHtml('free')
      : '';

    container.innerHTML = `
      <div class="sidebar-action-row">
        <button
          class="btn-floating-primary sidebar-action-btn ready"
          onclick="openAddMachineModal()"
        >
          ➕ Adicionar
        </button>
        <button
          type="button"
          class="btn-clear-inline"
          ${!hasBlocks ? 'disabled' : ''}
          onclick="clearCurrentFlow()"
          title="Limpar área de trabalho"
        >Limpar</button>
      </div>
      ${freeSaveHtml}
    `;
  }
}

/* ============================================================================
 * 4.6 SELETOR DE RECEITAS COM ÍCONES REAIS E BUSCA (PRODUÇÃO, OFICINA, CALCULADORA)
 * ========================================================================== */

function renderRecipePickerTriggerHtml(recipe, availableRecipes, onSelectCallbackExpr) {
  const count = Array.isArray(availableRecipes) ? availableRecipes.length : 0;
  const key = `rp_${uid()}`;
  window._recipePickerRegistry = window._recipePickerRegistry || {};
  window._recipePickerRegistry[key] = {
    recipes: availableRecipes || [],
    selectedId: recipe?.id || '',
    onSelectExpr: onSelectCallbackExpr
  };
  if (!recipe) {
    return `
      <button type="button" class="rp-trigger-btn" onclick="openRecipePickerModal('${key}')">
        <span class="rp-trigger-placeholder">Escolher receita (${count})</span>
        <span class="calc-pick-caret">▾</span>
      </button>
    `;
  }
  const m = Solver.getMachine(recipe.machine || recipe.producedIn);
  const inIcons = (recipe.ingredients || []).map(i => renderEntityIcon(Solver.getItem(i.item), 18)).join('');
  const outIcons = (recipe.products || []).map(p => renderEntityIcon(Solver.getItem(p.item), 18)).join('');
  return `
    <button type="button" class="rp-trigger-btn" onclick="openRecipePickerModal('${key}')" title="Clique para trocar a receita">
      <div class="rp-trigger-main">
        ${m ? renderEntityIcon(m, 22) : ''}
        <div class="rp-trigger-text">
          <strong class="rp-trigger-name">${recipe.isAlternate ? '<span class="rp-alt-tag">ALT</span> ' : ''}${libEsc(recipe.cleanName || recipe.name)}</strong>
          <span class="rp-trigger-io">${inIcons} <span class="rp-arrow">→</span> ${outIcons}</span>
        </div>
      </div>
      <span class="calc-pick-caret">▾</span>
    </button>
  `;
}

function openRecipePickerModal(registryKey) {
  const entry = window._recipePickerRegistry?.[registryKey];
  if (!entry) return;
  let modal = document.getElementById('recipe-picker-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'recipe-picker-modal';
    modal.className = 'modal-backdrop hidden';
    modal.onclick = (e) => { if (e.target === modal) modal.classList.add('hidden'); };
    document.body.appendChild(modal);
  }
  window._activeRecipePickerKey = registryKey;
  modal.innerHTML = `
    <div class="modal-card rp-modal-card">
      <div class="modal-header">
        <h3>Escolher Receita (${entry.recipes.length})</h3>
        <button type="button" class="btn-icon-close" onclick="document.getElementById('recipe-picker-modal').classList.add('hidden')">✕</button>
      </div>
      <div class="calc-picker-search-wrap">
        <input type="text" id="rp-search-input" class="sidebar-input" placeholder="Buscar receita, ingrediente ou máquina..." oninput="renderRecipePickerList(this.value)" />
      </div>
      <div id="rp-modal-list" class="rp-modal-list"></div>
    </div>
  `;
  modal.classList.remove('hidden');
  renderRecipePickerList('');
  setTimeout(() => document.getElementById('rp-search-input')?.focus(), 30);
}

function renderRecipePickerList(query) {
  const listEl = document.getElementById('rp-modal-list');
  const entry = window._recipePickerRegistry?.[window._activeRecipePickerKey];
  if (!listEl || !entry) return;
  const q = Solver.normalizeText(query || '');
  const filtered = (entry.recipes || []).filter(r => {
    if (!q) return true;
    const m = Solver.getMachine(r.machine || r.producedIn);
    const io = [...(r.ingredients || []), ...(r.products || [])].map(x => Solver.getItem(x.item)?.name || '').join(' ');
    return Solver.normalizeText(`${r.cleanName || r.name} ${r.nameEn || ''} ${m?.name || ''} ${io}`).includes(q);
  });

  listEl.innerHTML = filtered.map(r => {
    const m = Solver.getMachine(r.machine || r.producedIn);
    const mw = r.avgPowerMw ?? m?.powerConsumption ?? 0;
    const isSel = r.id === entry.selectedId;
    const ingsHtml = (r.ingredients || []).map(i => {
      const it = Solver.getItem(i.item);
      return `<span class="rp-io-pill">${renderEntityIcon(it, 18)} ${fmt(i.ratePerMin, 1)}/min</span>`;
    }).join('');
    const prodsHtml = (r.products || []).map(p => {
      const it = Solver.getItem(p.item);
      return `<span class="rp-io-pill out">${renderEntityIcon(it, 18)} ${fmt(p.ratePerMin, 1)}/min</span>`;
    }).join('');
    return `
      <button type="button" class="rp-option-card ${isSel ? 'is-selected' : ''}" onclick="selectRecipeFromPicker('${r.id}')">
        <div class="rp-opt-top">
          <span class="rp-opt-title">${r.isAlternate ? '<span class="rp-alt-tag">ALT</span> ' : ''}${libEsc(r.cleanName || r.name)}</span>
          <span class="rp-opt-meta">${m ? renderEntityIcon(m, 18) : ''} ${libEsc(m?.name || '')} · ⚡ ${fmt(mw, 0)} MW</span>
        </div>
        <div class="rp-opt-flow">
          <div class="rp-opt-side">${ingsHtml}</div>
          <span class="rp-arrow">→</span>
          <div class="rp-opt-side">${prodsHtml}</div>
        </div>
      </button>
    `;
  }).join('') || '<div class="calc-empty-note">Nenhuma receita encontrada.</div>';
}

function selectRecipeFromPicker(recipeId) {
  const entry = window._recipePickerRegistry?.[window._activeRecipePickerKey];
  document.getElementById('recipe-picker-modal')?.classList.add('hidden');
  if (!entry || !entry.onSelectExpr) return;
  const fn = new Function('__RID__', entry.onSelectExpr.replace(/__RID__/g, '__RID__'));
  fn(recipeId);
}

/* ============================================================================
 * ABA 1 UNIFICADA: 🏭 PRODUÇÃO
 * ========================================================================== */

function renderProductionMode(sidebarEl, emptyOverlay, autoFit) {
  // Determine driver automatically based on what is currently filled
  if (AppState.push.inputs.length > 0 && AppState.production.driver !== 'product') {
    AppState.production.driver = 'input';
  } else if (AppState.pull.targets.length > 0 && AppState.production.driver !== 'input') {
    AppState.production.driver = 'product';
  } else if (AppState.push.inputs.length === 0 && AppState.pull.targets.length === 0) {
    AppState.production.driver = null;
  }

  const driver = AppState.production.driver;

  // 4.5 ESTADO INICIAL: "Escolha um produto" separado em cards por categoria da Biblioteca
  if (!driver) {
    const allProds = Solver.getAllItems().filter(it => (Solver.indexes.recipesByProduct.get(it.id) || []).length > 0);
    const catMap = new Map();
    allProds.forEach(it => {
      const cat = it.category || 'Outros';
      if (!catMap.has(cat)) catMap.set(cat, []);
      catMap.get(cat).push(it);
    });
    const catEntries = Array.from(catMap.entries()).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
    const colors = (typeof LIB_CATEGORY_COLORS !== 'undefined') ? LIB_CATEGORY_COLORS : {};

    sidebarEl.innerHTML = `
      <div class="sidebar-step-block">
        <div class="step-header-row">
          <span class="step-badge">PRODUÇÃO</span>
          <h4>Escolha um produto</h4>
        </div>
        <button type="button" class="empty-step-cta" style="margin-bottom:10px;" onclick="openPullAddTargetModal()">
          <span class="cta-plus">🔍</span>
          <div>
            <strong>Buscar qualquer produto</strong>
            <span>${allProds.length} itens fabricáveis</span>
          </div>
        </button>
        <div class="prod-cat-cards-list">
          ${catEntries.map(([cat, list]) => {
            const color = colors[cat] || '#2563EB';
            const sample = list[0];
            return `
              <button type="button" class="prod-cat-card" style="--cat-color:${color};" onclick="openPullAddTargetModal('${cat.replace(/'/g, "\\'")}')">
                <span class="prod-cat-dot" style="background:${color};"></span>
                ${sample ? renderEntityIcon(sample, 24) : ''}
                <span class="prod-cat-name">${libEsc(cat)}</span>
                <span class="prod-cat-cnt">${list.length}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;

    clearCanvasGraph();
    emptyOverlay.classList.add('hidden');
    emptyOverlay.innerHTML = '';
    return;
  }

  // CASO 1: Usuário começou colocando a ENTRADA / MINERADORA primeiro (Push)
  if (driver === 'input') {
    renderPushFlowInsideProduction(sidebarEl, emptyOverlay, autoFit);
  } else {
    // CASO 2: Usuário começou colocando o PRODUTO FINAL primeiro (Pull)
    renderPullFlowInsideProduction(sidebarEl, emptyOverlay, autoFit);
  }
}

function renderPushFlowInsideProduction(sidebarEl, emptyOverlay, autoFit) {
  const inputsHtml = AppState.push.inputs.map(inp => renderPushInputCard(inp)).join('');

  let discovery = { craftableNow: [], almostCraftable: [] };
  if (AppState.push.inputs.length > 0) {
    discovery = Solver.discoverFromInputs(
      AppState.push.inputs,
      AppState.push.recipeOverrides,
      AppState.push.stepSettings
    );
  }

  const targetItem = AppState.push.targetItemId ? Solver.getItem(AppState.push.targetItemId) : null;

  let chainResult = null;
  if (AppState.push.inputs.length > 0 && AppState.push.targetItemId) {
    chainResult = Solver.calculatePushChain(
      AppState.push.inputs,
      AppState.push.targetItemId,
      AppState.push.recipeOverrides,
      AppState.push.stepSettings
    );
  }

  let suggestedProductsHtml = '';
  if (AppState.push.inputs.length > 0 && !targetItem) {
    const topCraftable = discovery.craftableNow.slice(0, 10);
    const topAlmost = discovery.almostCraftable.slice(0, 6);
    if (topCraftable.length > 0 || topAlmost.length > 0) {
      suggestedProductsHtml = `
        <div class="sidebar-Quick-list">
          <div class="quick-list-title">Clique em um produto abaixo para montar o fluxo imediatamente:</div>
          <div class="quick-chips-grid">
            ${topCraftable.map(res => `
              <button class="quick-item-btn" onclick="selectPushTargetItem('${res.item.id}')">
                ${renderEntityIcon(res.item, 28)}
                <div class="quick-item-meta">
                  <strong>${res.item.name}</strong>
                  <span>${fmt(res.maxOutputRate, 1)} un/m</span>
                </div>
              </button>
            `).join('')}
            ${topAlmost.map(res => `
              <button class="quick-item-btn almost" onclick="selectPushTargetItem('${res.item.id}')">
                ${renderEntityIcon(res.item, 28)}
                <div class="quick-item-meta">
                  <strong>${res.item.name}</strong>
                  <span>+ ${res.missingRaw.map(m => m.item?.name).join(', ')}</span>
                </div>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }
  }

  let recipesConfigHtml = '';
  if (chainResult && chainResult.steps.length > 0) {
    recipesConfigHtml = `
      <div class="sidebar-step-block">
        <div class="step-header-row">
          <span class="step-badge">PASSO 3</span>
          <h4>Receitas, Máquinas &amp; Overclock</h4>
        </div>
        <div class="stage-config-list">
          ${chainResult.steps.map(step => renderPushStageConfigCard(step)).join('')}
        </div>
      </div>
    `;
  }

  const isReady = Boolean(AppState.push.inputs.length > 0 && AppState.push.targetItemId && chainResult);

  sidebarEl.innerHTML = `
    <div class="sidebar-step-block">
      <div class="step-header-row">
        <span class="step-badge">1º ENTRADA</span>
        <h4>Mineradora / Recurso Base</h4>
        <button class="btn-small-accent" onclick="openPushAddInputModal()">+ Entrada</button>
      </div>
      <div class="sidebar-cards-stack">
        ${inputsHtml}
      </div>
    </div>

    <div class="sidebar-step-block">
      <div class="step-header-row">
        <span class="step-badge">2º PRODUTO</span>
        <h4>Produto a ser Gerado</h4>
      </div>
      ${targetItem ? `
        <div class="selected-item-banner">
          <div class="selected-item-left">
            ${renderEntityIcon(targetItem, 44)}
            <div>
              <div class="selected-item-label">PRODUTO GERADO</div>
              <strong class="selected-item-name">${targetItem.name}</strong>
              ${chainResult ? `<span class="selected-item-rate">Produz ${fmt(chainResult.outputRate, 2)} un/min</span>` : ''}
            </div>
          </div>
          <div class="selected-item-actions">
            <button class="btn-icon-action" onclick="openPushTargetPicker()" title="Trocar Produto">🔄 Trocar</button>
            <button class="btn-icon-danger" onclick="clearPushTargetItem()" title="Remover Produto">✕</button>
          </div>
        </div>
      ` : `
        <button class="empty-step-cta" onclick="openPushTargetPicker()">
          <span class="cta-plus">🎯</span>
          <div>
            <strong>Escolher Produto para Fabricar</strong>
            <span>Ou clique em uma das sugestões abaixo</span>
          </div>
        </button>
        ${suggestedProductsHtml}
      `}
    </div>

    ${recipesConfigHtml}
  `;

  if (!isReady) {
    clearCanvasGraph();
    emptyOverlay.classList.add('hidden');
    emptyOverlay.innerHTML = '';
    return;
  }

  if (!AppState.production.mounted) {
    clearCanvasGraph();
    emptyOverlay.classList.add('hidden');
    emptyOverlay.innerHTML = '';
    return;
  }

  emptyOverlay.classList.add('hidden');
  const graph = Solver.buildCanvasFlowGraph('push', chainResult, { showAllMachines: AppState.showAllMachines });
  renderCanvasGraph(graph, autoFit);
}

function renderPullFlowInsideProduction(sidebarEl, emptyOverlay, autoFit) {
  let pullResult = null;
  if (AppState.pull.targets.length > 0) {
    pullResult = Solver.solveProductionChain({
      targets: AppState.pull.targets,
      availableInputs: AppState.pull.availableInputs,
      recipeOverrides: AppState.pull.recipeOverrides,
      stepSettings: AppState.pull.stepSettings,
      minerSettings: AppState.pull.minerSettings
    });
  }

  // 4.4 Primeiro card: Produto Final com quantidade E seletor de receita com ícones
  const targetsHtml = AppState.pull.targets.map(t => {
    const item = Solver.getItem(t.itemId);
    if (!item) return '';
    const availRecs = Solver.indexes.recipesByProduct.get(t.itemId) || [];
    const chosenId = AppState.pull.recipeOverrides[t.itemId] || availRecs.find(r => !r.isAlternate)?.id || availRecs[0]?.id;
    const chosenRec = availRecs.find(r => r.id === chosenId) || availRecs[0] || null;
    return `
      <div class="sidebar-config-card" data-sb-item-id="${t.itemId}">
        <div class="config-card-top">
          <div class="config-item-title" onclick="openChangePullTargetModal('${t.id}')" title="Clique para trocar o produto">
            ${renderEntityIcon(item, 40)}
            <div>
              <strong>${item.name}</strong>
              <span class="config-rate-badge">Meta: ${fmt(t.rate, 1)} ${item.unit || 'un'}/min</span>
            </div>
          </div>
          <button class="btn-icon-danger" onclick="removePullTarget('${t.id}')" title="Remover produto">✕</button>
        </div>
        <div class="field-group">
          <label>Quantidade Desejada (${item.unit || 'un'}/min)</label>
          <input type="number" class="sidebar-input" min="0.5" step="1" value="${t.rate}" onchange="updatePullTargetRate('${t.id}', this.value)" />
        </div>
        ${availRecs.length > 0 ? `
          <div class="field-group">
            <label>Receita (${availRecs.length})</label>
            ${renderRecipePickerTriggerHtml(chosenRec, availRecs, `setPullRecipe('${t.itemId}', __RID__)`)}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  let stagesConfigHtml = '';
  if (pullResult && pullResult.steps.length > 0) {
    // 4.4 Ordem: Etapa 1 (Extratores) -> Demais etapas na ordem do fluxo -> Etapa final
    const orderedSteps = [...pullResult.steps];
    stagesConfigHtml = `
      <div class="sidebar-step-block">
        <div class="step-header-row">
          <span class="step-badge">ETAPA 1</span>
          <h4>Extração (Mineradoras e Bombas)</h4>
        </div>
        <div class="stage-config-list">
          ${pullResult.rawResources.map(raw => `
            <div class="stage-config-card" data-sb-item-id="${raw.itemId}">
              <div class="stage-config-header">
                <div class="stage-config-title">
                  ${renderEntityIcon(raw.extractorPlan.extractor, 34)}
                  <div>
                    <strong>${raw.extractorPlan.machineCount}× ${raw.extractorPlan.extractor.name}</strong>
                    <span class="sb-prod-sub">${renderEntityIcon(raw.item, 14)} ${raw.item.name} (${fmt(raw.requiredRate, 1)} ${raw.item.unit || 'un'}/min)</span>
                  </div>
                </div>
                ${raw.minerCfg?.customCount ? `<button class="btn-small-accent" onclick="setPullMinerCustomCount('${raw.itemId}', null)">Auto</button>` : ''}
              </div>
              <div class="config-controls-grid">
                ${raw.itemId !== 'Desc_Water_C' && raw.itemId !== 'Desc_LiquidOil_C' && raw.itemId !== 'Desc_NitrogenGas_C' ? `
                  <div class="field-group">
                    <label>Nível da Mineradora</label>
                    <div class="btn-group-row">
                      <button class="seg-btn ${raw.minerCfg.minerMark === 'mk1' ? 'active' : ''}" onclick="setPullMinerMark('${raw.itemId}', 'mk1')">v.1</button>
                      <button class="seg-btn ${raw.minerCfg.minerMark === 'mk2' ? 'active' : ''}" onclick="setPullMinerMark('${raw.itemId}', 'mk2')">v.2</button>
                      <button class="seg-btn ${raw.minerCfg.minerMark === 'mk3' ? 'active' : ''}" onclick="setPullMinerMark('${raw.itemId}', 'mk3')">v.3</button>
                    </div>
                  </div>
                ` : ''}
                ${raw.itemId !== 'Desc_Water_C' ? `
                  <div class="field-group">
                    <label>Pureza do Jazigo</label>
                    <div class="btn-group-row">
                      <button class="seg-btn ${raw.minerCfg.purity === 'impure' ? 'active' : ''}" onclick="setPullMinerPurity('${raw.itemId}', 'impure')">Impuro</button>
                      <button class="seg-btn ${raw.minerCfg.purity === 'normal' ? 'active' : ''}" onclick="setPullMinerPurity('${raw.itemId}', 'normal')">Normal</button>
                      <button class="seg-btn ${raw.minerCfg.purity === 'pure' ? 'active' : ''}" onclick="setPullMinerPurity('${raw.itemId}', 'pure')">Puro</button>
                    </div>
                  </div>
                ` : ''}
                <div class="field-group">
                  ${renderOverclockSliderHtml({ value: raw.minerCfg.clockPercent || 100, onChangeExpr: `setPullMinerClock('${raw.itemId}', __VAL__)`, label: 'Overclock' })}
                </div>
                <div class="field-group">
                  <label>Nº Inteiro (${raw.extractorPlan.extractor.name})</label>
                  <input type="number" class="sidebar-input" min="1" step="1" value="${raw.extractorPlan.machineCount}" onchange="setPullMinerCustomCount('${raw.itemId}', this.value)" />
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="sidebar-step-block">
        <div class="step-header-row">
          <span class="step-badge">ETAPAS</span>
          <h4>Produção (na ordem do fluxo)</h4>
        </div>
        <div class="stage-config-list">
          ${orderedSteps.map((step, sIdx) => `
            <div class="stage-config-card" data-sb-item-id="${step.itemId}">
              <div class="stage-config-header">
                <div class="stage-config-title">
                  ${renderEntityIcon(step.machine || step.item, 36)}
                  <div>
                    <strong>#${sIdx + 1} · ${step.machineCount}× ${step.machine?.name || 'Máquina'}</strong>
                    <span class="sb-prod-sub">${renderEntityIcon(step.item, 14)} ${step.item.name} (${fmt(step.actualProducedRate, 1)} ${step.item.unit || 'un'}/min)</span>
                  </div>
                </div>
                ${AppState.pull.stepSettings[step.itemId]?.customMachineCount ? `<button class="btn-small-accent" onclick="setPullStepCustomCount('${step.itemId}', null)">Auto</button>` : ''}
              </div>
              <div class="field-group">
                <label>Receita (${step.availableRecipes.length})</label>
                ${renderRecipePickerTriggerHtml(step.recipe, step.availableRecipes, `setPullRecipe('${step.itemId}', __RID__)`)}
              </div>
              <div class="field-group">
                ${renderOverclockSliderHtml({ value: step.clockPercent, onChangeExpr: `setPullStepClock('${step.itemId}', __VAL__)`, label: 'Overclock' })}
              </div>
              <div class="field-group">
                <label>Nº Inteiro</label>
                <input type="number" class="sidebar-input" min="1" step="1" value="${step.machineCount}" onchange="setPullStepCustomCount('${step.itemId}', this.value)" />
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  sidebarEl.innerHTML = `
    <div class="sidebar-step-block">
      <div class="step-header-row">
        <span class="step-badge">1º PRODUTO</span>
        <h4>Produto(s) que Deseja Fabricar</h4>
        <button class="btn-small-accent" onclick="openPullAddTargetModal()">+ Produto</button>
      </div>
      <div class="sidebar-cards-stack">
        ${targetsHtml}
      </div>
    </div>

    ${stagesConfigHtml}
  `;

  if (!pullResult) {
    clearCanvasGraph();
    emptyOverlay.classList.add('hidden');
    emptyOverlay.innerHTML = '';
    return;
  }

  if (!AppState.production.mounted) {
    clearCanvasGraph();
    emptyOverlay.classList.add('hidden');
    emptyOverlay.innerHTML = '';
    return;
  }

  emptyOverlay.classList.add('hidden');
  const graph = Solver.buildCanvasFlowGraph('pull', pullResult, { showAllMachines: AppState.showAllMachines });
  renderCanvasGraph(graph, autoFit);
}

function renderPushInputCard(inp) {
  const item = Solver.getItem(inp.itemId);
  if (!item) return '';
  const isRaw = Solver.isRawResource(inp.itemId);
  const rate = Solver.computeInputRate(inp);
  const belt = Solver.getRecommendedTransport(inp.itemId, rate);

  return `
    <div class="sidebar-config-card">
      <div class="config-card-top">
        <div class="config-item-title" onclick="openChangePushInputItemModal('${inp.id}')" title="Clique para trocar o item">
          ${renderEntityIcon(item, 40)}
          <div>
            <strong>${item.name}</strong>
            <span class="config-rate-badge">${fmt(rate, 1)}/min • ${belt.singleTransport.shortName}</span>
          </div>
        </div>
        <button class="btn-icon-danger" onclick="removePushInput('${inp.id}')" title="Remover entrada">✕</button>
      </div>

      ${isRaw ? `
        <div class="mode-switch-mini">
          <button class="mini-pill ${inp.mode === 'extractor' ? 'active' : ''}" onclick="updatePushInput('${inp.id}', 'mode', 'extractor')">Pela Mineradora</button>
          <button class="mini-pill ${inp.mode === 'rate' ? 'active' : ''}" onclick="updatePushInput('${inp.id}', 'mode', 'rate')">Taxa Fixa/min</button>
        </div>
      ` : ''}

      ${isRaw && inp.mode === 'extractor' ? `
        <div class="config-controls-grid">
          ${inp.itemId !== 'Desc_Water_C' && inp.itemId !== 'Desc_LiquidOil_C' && inp.itemId !== 'Desc_NitrogenGas_C' ? `
            <div class="field-group">
              <label>Mineradora</label>
              <div class="btn-group-row">
                <button class="seg-btn ${inp.minerMark === 'mk1' ? 'active' : ''}" onclick="updatePushInput('${inp.id}', 'minerMark', 'mk1')">v.1</button>
                <button class="seg-btn ${inp.minerMark === 'mk2' ? 'active' : ''}" onclick="updatePushInput('${inp.id}', 'minerMark', 'mk2')">v.2</button>
                <button class="seg-btn ${inp.minerMark === 'mk3' ? 'active' : ''}" onclick="updatePushInput('${inp.id}', 'minerMark', 'mk3')">v.3</button>
              </div>
            </div>
          ` : ''}
          ${inp.itemId !== 'Desc_Water_C' ? `
            <div class="field-group">
              <label>Pureza</label>
              <div class="btn-group-row">
                <button class="seg-btn ${inp.purity === 'impure' ? 'active' : ''}" onclick="updatePushInput('${inp.id}', 'purity', 'impure')">Impuro</button>
                <button class="seg-btn ${inp.purity === 'normal' ? 'active' : ''}" onclick="updatePushInput('${inp.id}', 'purity', 'normal')">Normal</button>
                <button class="seg-btn ${inp.purity === 'pure' ? 'active' : ''}" onclick="updatePushInput('${inp.id}', 'purity', 'pure')">Puro</button>
              </div>
            </div>
          ` : ''}
          <div class="field-group">
            <label>Nº Máquinas</label>
            <input type="number" class="sidebar-input" min="1" step="1" value="${Math.max(1, Math.round(inp.extractorCount || 1))}" onchange="updatePushInput('${inp.id}', 'extractorCount', Math.max(1, Math.round(parseFloat(this.value)||1)))" />
          </div>
          <div class="field-group">
            ${renderOverclockSliderHtml({ value: inp.clockPercent || 100, onChangeExpr: `updatePushInput('${inp.id}', 'clockPercent', __VAL__)`, label: 'Overclock' })}
          </div>
        </div>
      ` : `
        <div class="field-group">
          <label>Taxa de Entrada (/min)</label>
          <input type="number" class="sidebar-input" min="1" step="10" value="${inp.rate || 60}" onchange="updatePushInput('${inp.id}', 'rate', Math.max(1, parseFloat(this.value)||60))" />
        </div>
      `}
    </div>
  `;
}

function renderPushStageConfigCard(step) {
  return `
    <div class="stage-config-card">
      <div class="stage-config-header">
        <div class="stage-config-title">
          ${renderEntityIcon(step.item, 36)}
          <div>
            <strong>${step.item.name}</strong>
            <span>${step.machineCount}x ${step.machine?.name || 'Máquina'} (${fmt(step.outputRate, 1)}/min)</span>
          </div>
        </div>
        ${AppState.push.stepSettings[step.itemId]?.customMachineCount ? `<button class="btn-small-accent" onclick="setPushStepCustomCount('${step.itemId}', null)">Auto</button>` : ''}
      </div>

      <div class="field-group">
        <label>Receita &amp; Máquina / Refinaria (${step.availableRecipes.length} opções)</label>
        <select class="sidebar-select" onchange="setPushRecipe('${step.itemId}', this.value)">
          ${step.availableRecipes.map(r => {
            const m = Solver.getMachine(r.producedIn);
            return `<option value="${r.id}" ${r.id === step.recipe.id ? 'selected' : ''}>${r.isAlternate ? '★ [Alt] ' : ''}${r.cleanName || r.name} — (${m ? m.name : 'Máquina'})</option>`;
          }).join('')}
        </select>
      </div>

      <div class="field-group">
        ${renderOverclockSliderHtml({ value: step.clockPercent, onChangeExpr: `setPushStepClock('${step.itemId}', __VAL__)`, label: 'Overclock' })}
      </div>
      <div class="field-group">
        <label>Nº Inteiro (${step.machine?.name || 'Máq.'})</label>
        <input type="number" class="sidebar-input" min="1" step="1" value="${step.machineCount}" onchange="setPushStepCustomCount('${step.itemId}', this.value)" />
      </div>
    </div>
  `;
}

/* ============================================================================
 * ABA 2: ⚡ ENERGIA — COM BOMBA D'ÁGUA, MINERADORA E USINA CONFIGURÁVEIS
 * ========================================================================== */

function renderPowerMode(sidebarEl, emptyOverlay, autoFit) {
  const p = AppState.power;
  const generators = Solver.getPowerGenerators();
  const selectedGen = p.generatorId ? generators.find(g => g.id === p.generatorId) : null;

  let powerPlan = null;
  if (selectedGen && p.fuelItemId) {
    let availableFuelRate = p.fuelRate;
    if (p.fuelInputMode === 'miner' && Solver.isRawResource(p.fuelItemId)) {
      availableFuelRate = Solver.computeInputRate({
        mode: 'extractor',
        itemId: p.fuelItemId,
        minerMark: p.minerMark,
        purity: p.purity,
        extractorCount: p.minerCount,
        clockPercent: p.minerClock
      });
    }
    powerPlan = Solver.calculatePowerPlan({
      calcMode: p.calcMode,
      generatorId: selectedGen.id,
      fuelItemId: p.fuelItemId,
      availableFuelRate,
      targetMW: p.targetMW,
      generatorCount: p.generatorCount,
      manualGenerators: p.manualGenerators,
      clockPercent: p.clockPercent,
      waterExtractorClock: p.waterExtractorClock,
      manualWaterPumps: p.manualWaterPumps,
      minerMark: p.minerMark,
      purity: p.purity,
      minerClock: p.minerClock,
      minerCount: p.minerCount
    });
  }

  const isReady = Boolean(selectedGen && p.fuelItemId && powerPlan);
  const waterItem = Solver.getItem('Desc_Water_C');
  const waterEx = Solver.getMachine('Build_WaterPump_C');

  sidebarEl.innerHTML = `
    <div class="sidebar-step-block">
      <div class="step-header-row">
        <span class="step-badge">MODO</span>
        <h4>Como calcular</h4>
      </div>
      <div class="btn-group-row">
        <button type="button" class="seg-btn ${p.calcMode === 'by_mw' ? 'active' : ''}" onclick="setPowerCalcMode('by_mw')">Por energia (MW)</button>
        <button type="button" class="seg-btn ${p.calcMode === 'by_generators' ? 'active' : ''}" onclick="setPowerCalcMode('by_generators')">Por geradores</button>
      </div>
      ${p.calcMode === 'by_mw' ? `
        <div class="field-group" style="margin-top:10px;">
          <label>Energia desejada (MW)</label>
          <input type="number" class="sidebar-input" min="1" step="any" value="${p.targetMW === '' || p.targetMW === null ? '' : p.targetMW}" placeholder="Ex.: 600" onchange="setPowerParam('targetMW', this.value ? Math.max(1, parseFloat(this.value)) : '')" />
        </div>
      ` : ''}
    </div>

    <div class="sidebar-step-block">
      <div class="step-header-row">
        <span class="step-badge">PASSO ${p.calcMode === 'by_mw' ? '2' : '1'}</span>
        <h4>Gerador de Energia</h4>
      </div>
      <div class="generator-select-grid">
        ${generators.map(g => `
          <button class="gen-option-card ${selectedGen && g.id === selectedGen.id ? 'active' : ''}" onclick="selectPowerGenerator('${g.id}')">
            ${renderEntityIcon(g, 42)}
            <div class="gen-option-info">
              <strong>${g.name}</strong>
              <span>⚡ ${g.powerProduction} MW base</span>
            </div>
          </button>
        `).join('')}
      </div>
    </div>

    <div class="sidebar-step-block ${!selectedGen ? 'step-disabled' : ''}">
      <div class="step-header-row">
        <span class="step-badge">PASSO ${p.calcMode === 'by_mw' ? '3' : '2'}</span>
        <h4>Combustível</h4>
      </div>
      ${!selectedGen ? `
        <p class="step-help-text">Escolha um gerador acima.</p>
      ` : `
        <div class="generator-select-grid">
          ${selectedGen.fuels.map(f => {
            const fItem = Solver.getItem(f.itemId);
            return `
              <button class="gen-option-card ${f.itemId === p.fuelItemId ? 'active' : ''}" onclick="selectPowerFuel('${f.itemId}')">
                ${renderEntityIcon(fItem, 38)}
                <div class="gen-option-info">
                  <strong>${fItem ? fItem.name : f.itemId}</strong>
                  <span>100%: ${fmt(f.ratePerMin, 2)}/min${f.waterPerMin ? ` • 💧 ${f.waterPerMin} m³/min` : ''}</span>
                </div>
              </button>
            `;
          }).join('')}
        </div>
      `}
    </div>

    ${selectedGen && p.fuelItemId ? `
      <div class="sidebar-step-block">
        <div class="step-header-row">
          <span class="step-badge">PASSO 3</span>
          <h4>Máquinas &amp; Overclock</h4>
        </div>

        <div class="mode-switch-mini">
          <button class="mini-pill ${p.calcMode === 'by_fuel' ? 'active' : ''}" onclick="setPowerCalcMode('by_fuel')">Pela Entrada</button>
          <button class="mini-pill ${p.calcMode === 'by_mw' ? 'active' : ''}" onclick="setPowerCalcMode('by_mw')">Meta MW</button>
          <button class="mini-pill ${p.calcMode === 'by_generators' ? 'active' : ''}" onclick="setPowerCalcMode('by_generators')">Nº Usinas</button>
        </div>

        <div class="stage-config-card" style="margin-top:6px;">
          <div class="stage-config-header">
            <div class="stage-config-title">
              ${renderEntityIcon(Solver.getItem(p.fuelItemId), 34)}
              <div>
                <strong>Entrada: ${Solver.getItem(p.fuelItemId)?.name || 'Combustível'}</strong>
                <span>${powerPlan ? `Consumo total: ${fmt(powerPlan.totalFuelConsumed, 1)}/min` : ''}</span>
              </div>
            </div>
          </div>

          ${Solver.isRawResource(p.fuelItemId) ? `
            <div class="config-controls-grid">
              <div class="field-group">
                <label>Nível da Mineradora</label>
                <div class="btn-group-row">
                  <button class="seg-btn ${p.minerMark === 'mk1' ? 'active' : ''}" onclick="setPowerParam('minerMark', 'mk1')">v.1</button>
                  <button class="seg-btn ${p.minerMark === 'mk2' ? 'active' : ''}" onclick="setPowerParam('minerMark', 'mk2')">v.2</button>
                  <button class="seg-btn ${p.minerMark === 'mk3' ? 'active' : ''}" onclick="setPowerParam('minerMark', 'mk3')">v.3</button>
                </div>
              </div>
              <div class="field-group">
                <label>Pureza do Nodo</label>
                <div class="btn-group-row">
                  <button class="seg-btn ${p.purity === 'impure' ? 'active' : ''}" onclick="setPowerParam('purity', 'impure')">Impuro</button>
                  <button class="seg-btn ${p.purity === 'normal' ? 'active' : ''}" onclick="setPowerParam('purity', 'normal')">Normal</button>
                  <button class="seg-btn ${p.purity === 'pure' ? 'active' : ''}" onclick="setPowerParam('purity', 'pure')">Puro</button>
                </div>
              </div>
              <div class="field-group">
                <label>Nº Mineradoras</label>
                <input type="number" class="sidebar-input" min="1" step="1" value="${p.minerCount}" onchange="setPowerParam('minerCount', Math.max(1, Math.round(parseFloat(this.value)||1)))" />
              </div>
              <div class="field-group">
                ${renderOverclockSliderHtml({ value: p.minerClock, onChangeExpr: `setPowerParam('minerClock', __VAL__)`, label: 'Overclock Mineradora' })}
              </div>
            </div>
          ` : `
            <div class="field-group">
              <label>Combustível Disponível (/min)</label>
              <input type="number" class="sidebar-input" min="1" step="10" value="${p.fuelRate}" onchange="setPowerParam('fuelRate', Math.max(1, parseFloat(this.value)||60))" />
            </div>
          `}
        </div>

        <div class="stage-config-card">
          <div class="stage-config-header">
            <div class="stage-config-title">
              ${renderEntityIcon(selectedGen, 34)}
              <div>
                <strong>${selectedGen.name}</strong>
                <span>${powerPlan ? `${powerPlan.generatorCount}x Usinas • ⚡ ${fmt(powerPlan.totalMW, 0)} MW brutos` : ''}</span>
              </div>
            </div>
            ${p.manualGenerators ? `<button class="btn-small-accent" onclick="setPowerParam('manualGenerators', null)">Auto</button>` : ''}
          </div>

          ${p.calcMode === 'by_mw' ? `
            <div class="field-group">
              <label>Meta de Energia Desejada (MW)</label>
              <input type="number" class="sidebar-input" min="1" step="any" value="${p.targetMW ?? (selectedGen?.powerProduction || '')}" onchange="setPowerParam('targetMW', Math.max(1, parseFloat(this.value)||${selectedGen?.powerProduction || 1}))" />
            </div>
          ` : ''}

          <div class="field-group">
            ${renderOverclockSliderHtml({ value: p.clockPercent, onChangeExpr: `setPowerParam('clockPercent', __VAL__)`, label: 'Overclock Geradores' })}
          </div>
          <div class="field-group">
            <label>Nº Inteiro de Usinas</label>
            <input type="number" class="sidebar-input" min="1" step="1" value="${powerPlan ? powerPlan.generatorCount : p.generatorCount}" onchange="setPowerGeneratorCountOverride(this.value)" />
          </div>
        </div>

        ${powerPlan && powerPlan.totalWaterNeeded > 0 ? `
          <div class="stage-config-card">
            <div class="stage-config-header">
              <div class="stage-config-title">
                ${renderEntityIcon(waterEx || waterItem, 34)}
                <div>
                  <strong>Bomba d'Água (Resfriamento)</strong>
                  <span>Requer ${fmt(powerPlan.totalWaterNeeded, 1)} m³/m (${fmt(powerPlan.waterRatePerPump, 1)} m³/m cada)</span>
                </div>
              </div>
              ${p.manualWaterPumps ? `<button class="btn-small-accent" onclick="setPowerParam('manualWaterPumps', null)">Auto</button>` : ''}
            </div>
            <div class="field-group">
              ${renderOverclockSliderHtml({ value: p.waterExtractorClock || 100, onChangeExpr: `setPowerWaterClock(__VAL__)`, label: "Overclock Bomba d'Água" })}
            </div>
            <div class="field-group">
              <label>Nº Bombas d'Água</label>
              <input type="number" class="sidebar-input" min="1" step="1" value="${powerPlan.intWaterPumps}" onchange="setPowerParam('manualWaterPumps', Math.max(1, Math.round(parseFloat(this.value)||1)))" />
            </div>
          </div>
        ` : ''}
      </div>
    ` : ''}
  `;

  if (!isReady) {
    clearCanvasGraph();
    emptyOverlay.classList.add('hidden');
    emptyOverlay.innerHTML = '';
    return;
  }

  if (!AppState.power.mounted) {
    clearCanvasGraph();
    emptyOverlay.classList.add('hidden');
    emptyOverlay.innerHTML = '';
    return;
  }

  emptyOverlay.classList.add('hidden');
  const graph = Solver.buildCanvasFlowGraph('power', powerPlan, { showAllMachines: AppState.showAllMachines });
  renderCanvasGraph(graph, autoFit);
}

/* ============================================================================
 * ABA 3: 🛠️ LIVRE (CONSTRUÇÃO MANUAL + CHECK DE DIAGNÓSTICO)
 * ========================================================================== */

function toggleFreeBlockExpand(blockId) {
  AppState.free.expandedBlockId = (AppState.free.expandedBlockId === blockId) ? null : blockId;
  AppState.free.selectedIds = blockId ? [blockId] : [];
  renderAll(false);
  if (AppState.free.expandedBlockId) focusCanvasCardByBlockId(blockId);
}

function setFreeSidebarSearch(q) {
  AppState.free.searchQuery = q;
  const listEl = document.getElementById('oficina-blocks-list');
  if (listEl) listEl.innerHTML = renderOficinaBlocksListHtml();
}

function applyBatchOverclockFree(val) {
  const pct = Math.max(100, Math.min(250, Math.round(Number(val) || 100)));
  const ids = new Set(AppState.free.selectedIds || []);
  if (ids.size === 0) return;
  pushFreeUndoSnapshot();
  (AppState.free.blocks || []).forEach(b => {
    if (ids.has(b.id)) b.clockPercent = pct;
  });
  renderAll(false);
}

function duplicateSelectedFreeBlocks() {
  copySelectedFreeBlocks();
  pasteSelectedFreeBlocks();
}

function renderOficinaBlocksListHtml() {
  const free = AppState.free;
  const blocks = free.blocks || [];
  const { belts, pipes } = Solver.getBeltsAndPipes();
  const machines = Solver.getProductionMachines();
  const generators = Solver.getPowerGenerators();
  const q = Solver.normalizeText(free.searchQuery || '');

  const enriched = blocks.map((b, idx) => {
    const st = Solver.computeFreeBlockStats(b);
    if (!st) return null;
    const rec = b.blockType === 'machine' ? Solver.getRecipe(b.recipeId) : null;
    const outItem = b.blockType === 'extractor'
      ? Solver.getItem(b.itemId)
      : (rec?.products?.[0] ? Solver.getItem(rec.products[0].item) : null);
    const outRate = st.outputs?.[0]?.rate || 0;
    const hasAlert = b.blockType === 'machine' && (!b.machineId || !b.recipeId);
    return { b, idx, st, rec, outItem, outRate, hasAlert };
  }).filter(Boolean);

  const filtered = enriched.filter(e => {
    if (free.filterMachineType && free.filterMachineType !== 'all') {
      if ((e.st.entity?.id || e.b.blockType) !== free.filterMachineType) return false;
    }
    if (free.filterAlertOnly && !e.hasAlert) return false;
    if (q) {
      const hay = Solver.normalizeText(`${e.st.title} ${e.st.subtitle} ${e.outItem?.name || ''}`);
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    return '<div class="calc-empty-note" style="padding:10px 4px;">Nenhum bloco corresponde ao filtro.</div>';
  }

  const renderItem = ({ b, idx, st, rec, outItem, outRate, hasAlert }) => {
    const isExpanded = free.expandedBlockId === b.id;
    const isSel = Array.isArray(free.selectedIds) && free.selectedIds.includes(b.id);
    let expandedHtml = '';
    if (isExpanded) {
      let specificControls = '';
      if (b.blockType === 'extractor') {
        const rawItems = Solver.getAllItems().filter(i => i.isRawResource);
        specificControls = `
          <div class="field-group">
            <label>Recurso Extraído</label>
            <select class="sidebar-select" onchange="updateFreeBlock('${b.id}', 'itemId', this.value)">
              ${rawItems.map(it => `<option value="${it.id}" ${it.id === b.itemId ? 'selected' : ''}>${it.name}</option>`).join('')}
            </select>
          </div>
          ${b.itemId !== 'Desc_Water_C' && b.itemId !== 'Desc_LiquidOil_C' && b.itemId !== 'Desc_NitrogenGas_C' ? `
            <div class="field-row-2">
              <div class="field-group">
                <label>Mineradora</label>
                <select class="sidebar-select" onchange="updateFreeBlock('${b.id}', 'minerMark', this.value)">
                  <option value="mk1" ${b.minerMark === 'mk1' ? 'selected' : ''}>Mineradora v.1</option>
                  <option value="mk2" ${b.minerMark === 'mk2' ? 'selected' : ''}>Mineradora v.2</option>
                  <option value="mk3" ${b.minerMark === 'mk3' ? 'selected' : ''}>Mineradora v.3</option>
                </select>
              </div>
              <div class="field-group">
                <label>Pureza</label>
                <select class="sidebar-select" onchange="updateFreeBlock('${b.id}', 'purity', this.value)">
                  <option value="impure" ${b.purity === 'impure' ? 'selected' : ''}>Impuro</option>
                  <option value="normal" ${b.purity === 'normal' ? 'selected' : ''}>Normal</option>
                  <option value="pure" ${b.purity === 'pure' ? 'selected' : ''}>Puro</option>
                </select>
              </div>
            </div>
          ` : ''}
        `;
      } else if (b.blockType === 'machine') {
        const machineRecipes = b.machineId ? Solver.getRecipesByMachine(b.machineId) : [];
        specificControls = `
          <div class="field-group">
            <label>Máquina</label>
            <select class="sidebar-select" onchange="changeFreeBlockMachine('${b.id}', this.value)">
              <option value="" ${!b.machineId ? 'selected' : ''}>Escolher máquina...</option>
              ${machines.map(m => `<option value="${m.id}" ${m.id === b.machineId ? 'selected' : ''}>${m.name}</option>`).join('')}
            </select>
          </div>
          ${b.machineId ? `
            <div class="field-group">
              <label>Receita (${machineRecipes.length})</label>
              ${renderRecipePickerTriggerHtml(rec, machineRecipes, `updateFreeBlock('${b.id}', 'recipeId', __RID__)`)}
            </div>
          ` : ''}
        `;
      } else if (b.blockType === 'generator') {
        const genObj = generators.find(g => g.id === b.generatorId) || generators[0];
        specificControls = `
          <div class="field-group">
            <label>Gerador</label>
            <select class="sidebar-select" onchange="changeFreeBlockGenerator('${b.id}', this.value)">
              ${generators.map(g => `<option value="${g.id}" ${g.id === b.generatorId ? 'selected' : ''}>${g.name}</option>`).join('')}
            </select>
          </div>
          <div class="field-group">
            <label>Combustível</label>
            <select class="sidebar-select" onchange="updateFreeBlock('${b.id}', 'fuelItemId', this.value)">
              ${(genObj?.fuels || []).map(f => {
                const fIt = Solver.getItem(f.itemId);
                return `<option value="${f.itemId}" ${f.itemId === b.fuelItemId ? 'selected' : ''}>${fIt ? fIt.name : f.itemId}</option>`;
              }).join('')}
            </select>
          </div>
        `;
      }

      expandedHtml = `
        <div class="sb-acc-body">
          ${specificControls}
          <div class="field-group">
            <label>Nº de Máquinas</label>
            <input type="number" class="sidebar-input" min="1" step="1" value="${b.count}" onchange="updateFreeBlock('${b.id}', 'count', Math.max(1, Math.round(parseFloat(this.value)||1)))" />
          </div>
          ${b.blockType === 'machine' || b.blockType === 'extractor' || b.blockType === 'generator' ? `
            <div class="field-group">
              ${renderOverclockSliderHtml({ value: b.clockPercent, onChangeExpr: `updateFreeBlock('${b.id}', 'clockPercent', __VAL__)`, label: 'Overclock' })}
            </div>
          ` : ''}
          <div class="field-row-2">
            <div class="field-group">
              <label>Esteira</label>
              <select class="sidebar-select" onchange="updateFreeBlock('${b.id}', 'beltTierId', this.value)">
                ${belts.map(bl => `<option value="${bl.id}" ${bl.id === b.beltTierId ? 'selected' : ''}>${bl.name.replace('Esteira de transporte ', 'Esteira ')} (${bl.ratePerMin}/min)</option>`).join('')}
              </select>
            </div>
            <div class="field-group">
              <label>Tubulação</label>
              <select class="sidebar-select" onchange="updateFreeBlock('${b.id}', 'pipeTierId', this.value)">
                ${pipes.map(pp => `<option value="${pp.id}" ${pp.id === b.pipeTierId ? 'selected' : ''}>${pp.name} (${pp.ratePerMin}/min)</option>`).join('')}
              </select>
            </div>
          </div>
          <details class="sb-3d-details">
            <summary>Visão 3D</summary>
            <div class="field-row-2" style="margin-top:8px;">
              <div class="field-group">
                <label>Andar Inicial</label>
                <input type="number" class="sidebar-input" min="1" max="20" step="1" value="${b.floor || 1}" onchange="updateFreeBlock('${b.id}', 'floor', Math.max(1, Math.round(parseFloat(this.value)||1)))" />
              </div>
              <div class="field-group">
                <label>Máqs/Andar</label>
                <input type="number" class="sidebar-input" min="0" max="100" step="1" value="${b.machinesPerFloor || 0}" onchange="updateFreeBlock('${b.id}', 'machinesPerFloor', Math.max(0, Math.round(parseFloat(this.value)||0)))" />
              </div>
            </div>
          </details>
        </div>
      `;
    }

    return `
      <div class="sb-acc-card ${isExpanded ? 'is-expanded' : ''} ${isSel ? 'sb-card-selected' : ''}" data-sb-block-id="${b.id}">
        <div class="sb-acc-row" onclick="toggleFreeBlockExpand('${b.id}')">
          ${renderEntityIcon(st.entity, 28)}
          <div class="sb-acc-info">
            <strong>#${idx + 1} ${libEsc(st.title)} ×${st.count}</strong>
            <span class="sb-acc-sub">
              ${outItem ? renderEntityIcon(outItem, 14) : ''}
              ${outItem ? `${libEsc(outItem.name)} · ${fmt(outRate, 1)}/min` : libEsc(st.subtitle)}
            </span>
          </div>
          ${hasAlert ? '<span class="sb-alert-dot" title="Configuração incompleta"></span>' : ''}
          <div class="sb-acc-actions" onclick="event.stopPropagation()">
            <button type="button" class="btn-icon-dup" onclick="duplicateFreeBlock('${b.id}')" title="Duplicar">⧉</button>
            <button type="button" class="btn-icon-danger" onclick="removeFreeBlock('${b.id}')" title="Remover">✕</button>
          </div>
        </div>
        ${expandedHtml}
      </div>
    `;
  };

  if (free.groupBy === 'machine') {
    const groups = new Map();
    filtered.forEach(item => {
      const k = item.st.title || 'Outros';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(item);
    });
    return Array.from(groups.entries()).map(([gName, items]) => `
      <details class="sb-group-details" open>
        <summary>${libEsc(gName)} <span>(${items.length})</span></summary>
        <div class="sb-acc-list">${items.map(renderItem).join('')}</div>
      </details>
    `).join('');
  }

  return `<div class="sb-acc-list">${filtered.map(renderItem).join('')}</div>`;
}

function renderFreeMode(sidebarEl, emptyOverlay, autoFit) {
  const free = AppState.free;
  const blocks = free.blocks || [];

  const catCards = [
    { key: 'all', label: 'Todos', sub: 'Todas as construções e receitas', icon: '📦' },
    { key: 'maquinas', label: 'Máquinas', sub: 'Produção, mineradoras e extratores', icon: '🏭' },
    { key: 'receitas', label: 'Receitas', sub: 'Padrão e alternativas (ALT)', icon: '📜' },
    { key: 'logistica', label: 'Logística', sub: 'Divisores, unificadores e tubulações', icon: '🔀' },
    { key: 'armazenamento', label: 'Armazenamento', sub: 'Contêineres, tanques e destinos', icon: '🗄️' },
    { key: 'energia', label: 'Energia', sub: 'Geradores e usinas', icon: '⚡' }
  ];

  const multiSelCount = Array.isArray(free.selectedIds) ? free.selectedIds.length : 0;
  const batchBarHtml = multiSelCount > 1 ? `
    <div class="sb-batch-bar">
      <strong>${multiSelCount} itens selecionados</strong>
      <div class="sb-batch-actions">
        <button type="button" class="btn-small-accent" onclick="applyBatchOverclockFree(150)">150%</button>
        <button type="button" class="btn-small-accent" onclick="applyBatchOverclockFree(250)">250%</button>
        <button type="button" class="btn-small-accent" onclick="duplicateSelectedFreeBlocks()">⧉ Duplicar</button>
        <button type="button" class="btn-icon-danger" onclick="deleteSelectedFreeBlocks()" title="Remover selecionados">✕</button>
      </div>
    </div>
  ` : '';

  const blocksSectionHtml = blocks.length > 0 ? `
    <div class="sidebar-step-block">
      <div class="step-header-row">
        <span class="step-badge">${blocks.length}</span>
        <h4>Blocos na Oficina</h4>
      </div>
      ${batchBarHtml}
      <div class="sb-sticky-filters">
        <input
          type="text"
          class="sidebar-input"
          placeholder="Buscar máquina ou item..."
          value="${libEsc(free.searchQuery || '')}"
          oninput="setFreeSidebarSearch(this.value)"
        />
        <div class="btn-group-row" style="margin-top:6px;">
          <button type="button" class="seg-btn ${free.groupBy === 'none' ? 'active' : ''}" onclick="AppState.free.groupBy='none'; renderAll(false);">Lista</button>
          <button type="button" class="seg-btn ${free.groupBy === 'machine' ? 'active' : ''}" onclick="AppState.free.groupBy='machine'; renderAll(false);">Por máquina</button>
          <button type="button" class="seg-btn ${free.filterAlertOnly ? 'active' : ''}" onclick="AppState.free.filterAlertOnly=!AppState.free.filterAlertOnly; renderAll(false);">Com alerta</button>
        </div>
      </div>
      <div id="oficina-blocks-list">${renderOficinaBlocksListHtml()}</div>
    </div>
  ` : '';

  sidebarEl.innerHTML = `
    <div class="sidebar-step-block">
      <div class="step-header-row">
        <span class="step-badge">OFICINA</span>
        <h4>Adicionar à Oficina</h4>
      </div>
      <div class="free-add-buttons free-cat-filter-grid">
        ${catCards.map(c => `
          <button type="button" class="empty-step-cta oficina-cat-cta" onclick="openAddMachineModal({ quickFilter: '${c.key}' })">
            <span class="cta-plus">${c.icon}</span>
            <div>
              <strong>${c.label}</strong>
              <span>${c.sub}</span>
            </div>
          </button>
        `).join('')}
      </div>
    </div>
    ${blocksSectionHtml}
  `;

  if (blocks.length === 0) {
    clearCanvasGraph();
    emptyOverlay.classList.add('hidden');
    emptyOverlay.innerHTML = '';
    return;
  }

  emptyOverlay.classList.add('hidden');
  const graph = Solver.buildFreeCanvasFlowGraph(free, AppState.showAllMachines);
  renderCanvasGraph(graph, autoFit);
}

/* ============================================================================
 * ABA 4: 🗺️ MAPA INTERATIVO REAL (MAPGENIE MASSAGE-2(A-B)b + ATLAS DE ÍCONES)
 * ========================================================================== */

function renderMapSprite(iconKey, displaySize = 24) {
  const mapData = window.SATISFACTORY_MAP_DATA;
  const sp = mapData?.sprites?.[iconKey];
  if (!sp) return `<span class="map-sprite-fallback">📍</span>`;
  const scale = displaySize / sp.w;
  const bgW = Math.round(mapData.atlasWidth * scale);
  const bgH = Math.round(mapData.atlasHeight * scale);
  const bgX = -Math.round(sp.x * scale);
  const bgY = -Math.round(sp.y * scale);
  return `<span class="map-sprite-icon" style="width:${displaySize}px;height:${displaySize}px;background-image:url('${mapData.atlasUrl}');background-size:${bgW}px ${bgH}px;background-position:${bgX}px ${bgY}px;"></span>`;
}

function renderMapMode(sidebarEl, emptyOverlay) {
  emptyOverlay.classList.add('hidden');
  const mapData = window.SATISFACTORY_MAP_DATA;
  const mState = AppState.map;
  if (!mapData) return;

  const filteredLocs = getFilteredMapLocations();

  sidebarEl.innerHTML = `
    <div class="sidebar-step-block">
      <div class="step-header-row">
        <span class="step-badge">MAPA REAL 1.0+</span>
        <h4>MASSAGE-2(A-B)b (${filteredLocs.length} pinos)</h4>
      </div>
      <div class="mode-switch-mini">
        <button class="mini-pill ${mState.viewSource === 'native' ? 'active' : ''}" onclick="setMapViewSource('native')">🗺️ Mapa Interativo S+</button>
        <button class="mini-pill ${mState.viewSource === 'external' ? 'active' : ''}" onclick="setMapViewSource('external')">🌐 MapGenie Web</button>
      </div>
      <input
        type="text"
        class="sidebar-input"
        placeholder="🔍 Buscar nó, disco rígido, caverna..."
        value="${(mState.searchQuery || '').replace(/"/g, '&quot;')}"
        oninput="setMapSearchQuery(this.value)"
      />
      <div class="btn-group-row">
        <button class="seg-btn" onclick="toggleAllMapCategories(true)">👁️ Mostrar Todos (2.509)</button>
        <button class="seg-btn" onclick="toggleAllMapCategories(false)">🚫 Ocultar Todos</button>
      </div>
    </div>

    ${mapData.groups.map(grp => {
      const activeInGroup = grp.categories.filter(c => mState.activeCategories[c.id]).length;
      return `
        <div class="sidebar-step-block">
          <div class="step-header-row">
            <span class="step-badge" style="border-color:${grp.color};color:${grp.color};">${activeInGroup}/${grp.categories.length}</span>
            <h4>${grp.title}</h4>
            <button class="btn-small-accent" onclick="toggleMapGroup(${grp.id}, true)">Todos</button>
            <button class="btn-small-accent" onclick="toggleMapGroup(${grp.id}, false)">Nenhum</button>
          </div>
          <div class="map-filter-grid">
            ${grp.categories.map(cat => {
              const active = Boolean(mState.activeCategories[cat.id]);
              return `
                <button type="button" class="map-filter-row ${active ? 'active' : ''}" onclick="toggleMapCategory(${cat.id})">
                  ${renderMapSprite(cat.icon, 22)}
                  <span class="map-filter-name">${cat.title}</span>
                  <span class="map-filter-count">${cat.count}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('')}
  `;

  renderMapWorkspace(filteredLocs);
}

function getFilteredMapLocations() {
  const mapData = window.SATISFACTORY_MAP_DATA;
  if (!mapData) return [];
  const mState = AppState.map;
  const q = Solver.normalizeText(mState.searchQuery || '');

  return mapData.locations.filter(loc => {
    if (!mState.activeCategories[loc.c]) return false;
    if (q) {
      const cat = mapData.categoriesById[String(loc.c)];
      const hay = Solver.normalizeText(`${loc.t} ${loc.d} ${cat ? cat.title : ''}`);
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderMapWorkspace(filteredLocs) {
  const container = document.getElementById('map-workspace-view');
  if (!container) return;
  const mapData = window.SATISFACTORY_MAP_DATA;
  const mState = AppState.map;

  if (mState.viewSource === 'external') {
    if (mState.leafletMap) {
      mState.leafletMap.remove();
      mState.leafletMap = null;
      mState.markersLayer = null;
    }
    container.innerHTML = `
      <div class="map-external-wrap">
        <div class="map-external-bar">
          <span>🌐 MapGenie Oficial (satisfactory/maps/massage-2a-bb)</span>
          <button class="btn-small-accent" onclick="setMapViewSource('native')">Voltar ao Mapa Integrado S+</button>
        </div>
        <iframe
          src="https://mapgenie.io/satisfactory/maps/massage-2a-bb?embed=light"
          class="map-external-iframe"
          title="MapGenie Satisfactory Interactive Map"
          allowfullscreen
        ></iframe>
      </div>
    `;
    return;
  }

  // Build container DOM once so Leaflet instance stays smooth during filter toggles!
  if (!document.getElementById('leaflet-map-canvas')) {
    container.innerHTML = `
      <div class="interactive-map-stage">
        <div class="map-top-hud">
          <div class="map-hud-title">
            <strong>🗺️ Mapa Real MASSAGE-2(A-B)b (Dados &amp; Ícones Oficiais MapGenie)</strong>
            <span>Use o scroll para dar zoom no terreno, arraste para navegar e clique em qualquer ícone para ver detalhes ou enviar para a Produção</span>
          </div>
          <div class="map-hud-actions">
            <button class="btn-small-accent" onclick="centerLeafletMap()">🎯 Centralizar Mapa</button>
          </div>
        </div>
        <div class="map-board-wrapper">
          <div id="leaflet-map-canvas" class="leaflet-map-canvas"></div>
          <div id="map-detail-card-slot"></div>
        </div>
      </div>
    `;
  }

  if (!mState.leafletMap && typeof L !== 'undefined') {
    // Área útil real sem as margens pretas embutidas nos tiles MapGenie MASSAGE-2(A-B)b
    const mapBounds = L.latLngBounds([0.18, -1.14], [1.22, -0.26]);
    mState.mapBounds = mapBounds;
    const map = L.map('leaflet-map-canvas', {
      center: [0.7, -0.7],
      zoom: 11,
      minZoom: 10,
      maxZoom: 15,
      zoomSnap: 0.1,
      zoomDelta: 0.5,
      maxBounds: mapBounds,
      maxBoundsViscosity: 1.0,
      zoomControl: true
    });

    L.tileLayer(mapData.tilesUrl, {
      minZoom: 9,
      maxZoom: 15,
      maxNativeZoom: 14,
      tileSize: 256,
      bounds: L.latLngBounds([0, -1.4], [1.4, 0]),
      noWrap: true,
      attribution: 'Terreno &amp; Dados: MapGenie (MASSAGE-2(A-B)b)'
    }).addTo(map);

    mState.leafletMap = map;
    mState.markersLayer = L.layerGroup().addTo(map);

    window.syncLeafletMapCover = function syncLeafletMapCover(recenter = false) {
      const m = AppState.map.leafletMap;
      const bounds = AppState.map.mapBounds;
      if (!m || !bounds) return;
      const container = m.getContainer();
      if (!container || container.clientWidth === 0 || container.clientHeight === 0) return;
      m.invalidateSize({ animate: false });
      const exactCover = m.getBoundsZoom(bounds, true);
      const safeMinZoom = Math.min(14.5, Math.ceil((exactCover + 0.05) * 10) / 10);
      m.setMinZoom(safeMinZoom);
      m.setMaxBounds(bounds);
      if (recenter) {
        m.setView([0.7, -0.7], safeMinZoom, { animate: false });
      } else if (m.getZoom() < safeMinZoom) {
        m.setZoom(safeMinZoom, { animate: false });
      }
      m.panInsideBounds(bounds, { animate: false });
    };

    if (!mState._resizeBound) {
      mState._resizeBound = true;
      window.addEventListener('resize', () => {
        if (AppState.mode === 'map') syncLeafletMapCover(false);
      });
      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => {
          if (AppState.mode === 'map') syncLeafletMapCover(false);
        });
        ro.observe(map.getContainer());
      }
    }

    requestAnimationFrame(() => syncLeafletMapCover(true));
    setTimeout(() => syncLeafletMapCover(true), 120);
  } else if (mState.leafletMap) {
    requestAnimationFrame(() => {
      if (typeof syncLeafletMapCover === 'function') syncLeafletMapCover(false);
    });
    setTimeout(() => {
      if (typeof syncLeafletMapCover === 'function') syncLeafletMapCover(false);
    }, 80);
  }

  // Update markers on the Leaflet map
  if (mState.markersLayer && typeof L !== 'undefined') {
    mState.markersLayer.clearLayers();
    filteredLocs.forEach(loc => {
      const cat = mapData.categoriesById[String(loc.c)];
      if (!cat) return;
      const isSelected = loc.id === mState.selectedLocationId;
      const size = isSelected ? 34 : 26;
      const iconHtml = `<div class="leaflet-sprite-pin ${isSelected ? 'selected' : ''}">${renderMapSprite(cat.icon, size)}</div>`;
      const divIcon = L.divIcon({
        html: iconHtml,
        className: 'map-div-icon-wrap',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });

      const marker = L.marker([loc.lat, loc.lng], { icon: divIcon });
      marker.on('click', () => {
        selectMapLocation(loc.id);
      });
      marker.bindTooltip(`${loc.t || cat.title}`, { direction: 'top', offset: [0, -12] });
      mState.markersLayer.addLayer(marker);
    });
  }

  renderMapDetailPopup();
}

function renderMapDetailPopup() {
  const slot = document.getElementById('map-detail-card-slot');
  if (!slot) return;
  const mapData = window.SATISFACTORY_MAP_DATA;
  const locId = AppState.map.selectedLocationId;
  if (!locId) {
    slot.innerHTML = '';
    return;
  }

  const loc = mapData.locations.find(l => l.id === locId);
  if (!loc) {
    slot.innerHTML = '';
    return;
  }
  const cat = mapData.categoriesById[String(loc.c)];
  const purity = cat?.purity || 'normal';
  const pMult = purity === 'pure' ? 2.0 : purity === 'impure' ? 0.5 : 1.0;
  const canSendToCalc = Boolean(cat && cat.resourceId && cat.resourceId !== 'GEYSER');

  const purityBadge = cat?.purity === 'pure'
    ? '<span class="purity-pill pure">🟢 PURO (2.0×)</span>'
    : cat?.purity === 'normal'
      ? '<span class="purity-pill normal">🟡 NORMAL (1.0×)</span>'
      : cat?.purity === 'impure'
        ? '<span class="purity-pill impure">🔴 IMPURO (0.5×)</span>'
        : '<span class="purity-pill collect">📍 LOCAL / COLETÁVEL</span>';

  slot.innerHTML = `
    <div class="map-node-popup">
      <div class="map-popup-head">
        <div class="map-popup-title">
          ${cat ? renderMapSprite(cat.icon, 40) : ''}
          <div>
            <h4>${loc.t || (cat ? cat.title : 'Local')}</h4>
            <span>${cat ? cat.title : ''} • Lat ${loc.lat.toFixed(4)} / Lng ${loc.lng.toFixed(4)}</span>
          </div>
        </div>
        <button class="icon-close" onclick="selectMapLocation(null)">✕</button>
      </div>

      <div class="map-popup-badges">${purityBadge}</div>

      ${loc.d ? `<p class="map-popup-note">${loc.d}</p>` : ''}
      ${loc.img ? `<img src="${loc.img}" alt="${loc.t}" class="map-popup-photo" loading="lazy" />` : ''}

      ${canSendToCalc ? `
        <div class="map-rates-table">
          <div><strong>Mineradora v.1:</strong> ${60 * pMult}/m (100%) • ${150 * pMult}/m (250%)</div>
          <div><strong>Mineradora v.2:</strong> ${120 * pMult}/m (100%) • ${300 * pMult}/m (250%)</div>
          <div><strong>Mineradora v.3:</strong> ${240 * pMult}/m (100%) • ${Math.min(1200, 600 * pMult)}/m (250%)</div>
        </div>
        <button class="btn-mount-flow ready" style="margin-top:6px;" onclick="useMapLocationInCalculator(${loc.id})">
          🚀 Usar este Nó na Aba de Produção
        </button>
      ` : ''}
    </div>
  `;
}

function centerLeafletMap() {
  if (AppState.map.leafletMap) {
    AppState.map.leafletMap.setView([0.68, -0.72], 11);
  }
}

function setMapViewSource(src) {
  AppState.map.viewSource = src;
  renderAll(false);
}

function setMapSearchQuery(q) {
  AppState.map.searchQuery = q;
  renderMapWorkspace(getFilteredMapLocations());
}

function toggleMapCategory(catId) {
  AppState.map.activeCategories[catId] = !AppState.map.activeCategories[catId];
  renderAll(false);
}

function toggleMapGroup(groupId, enable) {
  const mapData = window.SATISFACTORY_MAP_DATA;
  const grp = mapData?.groups.find(g => g.id === groupId);
  if (!grp) return;
  grp.categories.forEach(c => {
    AppState.map.activeCategories[c.id] = enable;
  });
  renderAll(false);
}

function toggleAllMapCategories(enable) {
  const mapData = window.SATISFACTORY_MAP_DATA;
  if (!mapData) return;
  Object.keys(mapData.categoriesById).forEach(cid => {
    AppState.map.activeCategories[cid] = enable;
  });
  renderAll(false);
}

function selectMapLocation(locId) {
  AppState.map.selectedLocationId = locId;
  renderMapWorkspace(getFilteredMapLocations());
}

function useMapLocationInCalculator(locId) {
  const mapData = window.SATISFACTORY_MAP_DATA;
  const loc = mapData?.locations.find(l => l.id === locId);
  const cat = loc ? mapData.categoriesById[String(loc.c)] : null;
  if (!cat || !cat.resourceId || cat.resourceId === 'GEYSER') return;

  AppState.production.driver = 'input';
  AppState.production.mounted = true;
  AppState.push.inputs = [
    {
      id: uid(),
      itemId: cat.resourceId,
      mode: 'extractor',
      minerMark: 'mk2',
      purity: cat.purity || 'normal',
      extractorCount: 1,
      clockPercent: 100,
      rate: 120
    }
  ];
  switchMode('production');
}

/* ============================================================================
 * RENDERIZADOR DO GRAFO NO ESPAÇO INFINITO (LR: ESQUERDA->DIREITA | TB: CIMA->BAIXO)
 * ========================================================================== */

function clearCanvasGraph() {
  const nodesEl = document.getElementById('spaces-nodes');
  const wiresEl = document.getElementById('spaces-wires');
  if (nodesEl) nodesEl.innerHTML = '';
  if (wiresEl) wiresEl.innerHTML = '';
}

let _elkInstance = null;
let _layoutRunSeq = 0;

function getElkInstance() {
  if (!_elkInstance && typeof ELK !== 'undefined') {
    _elkInstance = new ELK();
  }
  return _elkInstance;
}

function renderCanvasGraph(graph, autoFit = false) {
  const nodesEl = document.getElementById('spaces-nodes');
  const wiresEl = document.getElementById('spaces-wires');
  if (!nodesEl || !wiresEl) return;

  if (!graph || !graph.columns || graph.columns.length === 0) {
    clearCanvasGraph();
    return;
  }

  AppState.canvas.lastGraph = graph;
  const orient = AppState.orientation || 'LR';
  const isTB = orient === 'TB' || orient === 'BT';
  const isRev = orient === 'RL' || orient === 'BT';
  const is3D = Boolean(AppState.canvas.is3DView);

  const CARD_WIDTH = 330;
  const COMPACT_WIDTH = 228;
  const CARD_HEIGHT = 400;
  const COMPACT_HEIGHT = 176;

  const ORIGIN_X = 600;
  const ORIGIN_Y = 500;

  // Resolve floor per node (supports machinesPerFloor in Free Mode, and auto-stacking in 3D view)
  const blockCountsSeen = {};
  const getEffectiveFloor = (node, rowIdx = 0) => {
    if (node.blockId && AppState.mode === 'free') {
      const blk = AppState.free.blocks.find(b => b.id === node.blockId);
      if (blk) {
        const baseFloor = Number(blk.floor) || 1;
        const perFloor = Number(blk.machinesPerFloor) || 0;
        const idxInBlock = blockCountsSeen[blk.id] || 0;
        blockCountsSeen[blk.id] = idxInBlock + 1;
        if (perFloor > 0) {
          return baseFloor + Math.floor(idxInBlock / perFloor);
        }
        return baseFloor;
      }
    }
    if (is3D && !node.floor && rowIdx >= 4) {
      return 1 + Math.floor(rowIdx / 4);
    }
    return Number(node.floor) || 1;
  };

  if (is3D) {
    // Layout de Maquete Vertical (Andares empilhados de baixo para cima: 1º Andar embaixo, 2º em cima...)
    const nodeCoords = new Map();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const FLOOR_HEIGHT = 490;
    const FLOOR_GAP_X = 390;
    const floorsMap = new Map();

    graph.columns.forEach((col, stageIdx) => {
      col.nodes.forEach((node, rowIdx) => {
        const floor = getEffectiveFloor(node, rowIdx);
        node._effectiveFloor = floor;
        if (!floorsMap.has(floor)) floorsMap.set(floor, []);
        floorsMap.get(floor).push({ node, col, stageIdx, rowIdx });
      });
    });

    const sortedFloors = [...floorsMap.keys()].sort((a, b) => a - b);
    const maxFloor = sortedFloors[sortedFloors.length - 1] || 1;
    const BASE_BOTTOM_Y = ORIGIN_Y + (maxFloor - 1) * FLOOR_HEIGHT;

    let maqueteFramesHtml = '';
    let maxFloorWidth = 420;

    sortedFloors.forEach((floor) => {
      const entries = floorsMap.get(floor);
      const floorY = BASE_BOTTOM_Y - (floor - 1) * FLOOR_HEIGHT;
      entries.forEach((entry, idxOnFloor) => {
        const { node, col, stageIdx } = entry;
        const isCompact = node.kind === 'splitter' || node.kind === 'merger' || node.kind === 'pipe_junction' || node.kind === 'power_emblem';
        const cardW = isCompact ? COMPACT_WIDTH : CARD_WIDTH;
        const cardH = isCompact ? COMPACT_HEIGHT : CARD_HEIGHT;
        const customPos = AppState.canvas.customPositions[node.id];
        const autoX = ORIGIN_X + idxOnFloor * FLOOR_GAP_X;
        const autoY = floorY;
        const x = customPos ? customPos.x : (typeof node.x === 'number' ? node.x : autoX);
        const y = customPos ? customPos.y : (typeof node.y === 'number' ? node.y : autoY);

        nodeCoords.set(node.id, { x, y, w: cardW, h: cardH, node, title: col.title, stageIdx, wrapGroup: 0, floor });
        minX = Math.min(minX, x - 60);
        maxX = Math.max(maxX, x + cardW + 60);
        minY = Math.min(minY, y - 90);
        maxY = Math.max(maxY, y + cardH + 60);
      });
      maxFloorWidth = Math.max(maxFloorWidth, entries.length * FLOOR_GAP_X + 60);
    });

    sortedFloors.forEach((floor) => {
      const floorY = BASE_BOTTOM_Y - (floor - 1) * FLOOR_HEIGHT;
      const frameX = ORIGIN_X - 42;
      const frameY = floorY - 52;
      const frameW = maxFloorWidth;
      const frameH = FLOOR_HEIGHT - 28;
      maqueteFramesHtml += `
        <div class="maquete-floor-frame" style="left:${frameX}px; top:${frameY}px; width:${frameW}px; height:${frameH}px;">
          <div class="maquete-floor-label">🏢 ${floor}º ANDAR ${floor === 1 ? '(TÉRREO)' : ''}</div>
          <div class="maquete-floor-slab"></div>
        </div>
      `;
      minX = Math.min(minX, frameX - 20);
      maxX = Math.max(maxX, frameX + frameW + 20);
      minY = Math.min(minY, frameY - 20);
      maxY = Math.max(maxY, frameY + frameH + 20);
    });

    AppState.canvas.lastGraphBounds = { minX, maxX, minY, maxY };
    AppState.canvas.nodeMap = nodeCoords;

    let nodesHtml = maqueteFramesHtml;
    for (const [, box] of nodeCoords.entries()) {
      nodesHtml += renderMagnificNodeCard(box, orient);
    }
    nodesEl.innerHTML = nodesHtml;
    // Sincroniza dimensões reais dos cards no DOM antes de traçar as esteiras (garante encaixe exato nas portas)
    for (const [nid, box] of nodeCoords.entries()) {
      const cardEl = document.getElementById(nid);
      if (cardEl) {
        const ow = cardEl.offsetWidth;
        const oh = cardEl.offsetHeight;
        if (ow > 20) box.w = ow;
        if (oh > 20) box.h = oh;
      }
    }
    renderCanvasWiresAndBadges(graph, nodeCoords, orient, wiresEl, nodesEl);

    if (autoFit) {
      setTimeout(() => fitCanvasToScreen(), 20);
    } else {
      applyCanvasTransform();
    }
    return;
  }

  // =========================================================================
  // LAYOUT EM CAMADAS COMPACTO COM ELKJS (layered + wrapping + grade > 8)
  // Direção DOWN (padrão) ou RIGHT — quem consome SEMPRE fica depois!
  // =========================================================================
  const NODE_GAP = 20;
  const LAYER_GAP = 48;
  const WRAP_GAP = 96;

  // Pré-calcula cada camada (sub-grade interna se > 8 máquinas)
  const layersInfo = graph.columns
    .map((col, idx) => {
      const count = col.nodes.length;
      if (count === 0) return null;
      const firstNode = col.nodes[0];
      const isCompact = firstNode && (firstNode.kind === 'splitter' || firstNode.kind === 'merger' || firstNode.kind === 'pipe_junction' || firstNode.kind === 'power_emblem');
      const cardW = isCompact ? COMPACT_WIDTH : CARD_WIDTH;
      const cardH = isCompact ? COMPACT_HEIGHT : CARD_HEIGHT;

      // Se camada tem > 8 máquinas, divide em grade dentro da própria camada mantendo a ordem
      const maxPerLine = count > 8 ? Math.min(8, Math.ceil(Math.sqrt(count * 1.4))) : count;
      const lines = Math.ceil(count / maxPerLine);
      const gridCols = isTB ? maxPerLine : lines;
      const gridRows = isTB ? lines : maxPerLine;

      const boxW = gridCols * cardW + Math.max(0, gridCols - 1) * NODE_GAP;
      const boxH = gridRows * cardH + Math.max(0, gridRows - 1) * NODE_GAP;

      return {
        layerIdx: idx,
        col,
        count,
        isCompact,
        cardW,
        cardH,
        gridCols,
        gridRows,
        boxW,
        boxH
      };
    })
    .filter(Boolean);

  const finalizeLayeredPositions = (layerPosMap, wrapGroupMap) => {
    const nodeCoords = new Map();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let wrapMarkersHtml = '';

    // Detecta quebras de coluna/linha (wrapping) para marcar onde o fluxo continua
    let prevWrapGroup = null;
    let prevLayerRect = null;

    layersInfo.forEach((li) => {
      const pos = layerPosMap.get(li.layerIdx) || { x: 0, y: 0 };
      const wrapGroup = wrapGroupMap.get(li.layerIdx) || 0;
      const layerX = ORIGIN_X + pos.x;
      const layerY = ORIGIN_Y + pos.y;

      if (prevWrapGroup !== null && wrapGroup !== prevWrapGroup && prevLayerRect) {
        // Marcador de continuação na saída da coluna/linha anterior e na entrada da nova
        const outX = isTB ? (prevLayerRect.x + prevLayerRect.w / 2) : (prevLayerRect.x + prevLayerRect.w + 18);
        const outY = isTB ? (prevLayerRect.y + prevLayerRect.h + 18) : (prevLayerRect.y + prevLayerRect.h / 2);
        const inX = isTB ? (layerX + li.boxW / 2) : (layerX - 18);
        const inY = isTB ? (layerY - 26) : (layerY + li.boxH / 2);

        wrapMarkersHtml += `
          <div class="wrap-flow-marker out" style="left:${outX}px; top:${outY}px;">
            ${isTB ? `↪ Continua na Coluna ${wrapGroup + 1}` : `↪ Continua na Faixa ${wrapGroup + 1}`}
          </div>
          <div class="wrap-flow-marker in" style="left:${inX}px; top:${inY}px;">
            ${isTB ? `↘ Continuação (Coluna ${wrapGroup + 1})` : `↘ Continuação (Faixa ${wrapGroup + 1})`}
          </div>
        `;
      }
      prevWrapGroup = wrapGroup;
      prevLayerRect = { x: layerX, y: layerY, w: li.boxW, h: li.boxH };

      li.col.nodes.forEach((node, idxInLayer) => {
        const floor = getEffectiveFloor(node, idxInLayer);
        node._effectiveFloor = floor;
        const customPos = AppState.canvas.customPositions[node.id];

        let subCol, subRow;
        if (isTB) {
          subCol = idxInLayer % li.gridCols;
          subRow = Math.floor(idxInLayer / li.gridCols);
        } else {
          subRow = idxInLayer % li.gridRows;
          subCol = Math.floor(idxInLayer / li.gridRows);
        }

        const autoX = Math.round(layerX + subCol * (li.cardW + NODE_GAP));
        const autoY = Math.round(layerY + subRow * (li.cardH + NODE_GAP));
        const x = customPos ? customPos.x : (typeof node.x === 'number' ? node.x : autoX);
        const y = customPos ? customPos.y : (typeof node.y === 'number' ? node.y : autoY);

        nodeCoords.set(node.id, {
          x,
          y,
          w: li.cardW,
          h: li.cardH,
          node,
          title: li.col.title,
          stageIdx: li.layerIdx,
          wrapGroup,
          floor
        });

        minX = Math.min(minX, x - 48);
        maxX = Math.max(maxX, x + li.cardW + 48);
        minY = Math.min(minY, y - 64);
        maxY = Math.max(maxY, y + li.cardH + 48);
      });
    });

    AppState.canvas.lastGraphBounds = { minX, maxX, minY, maxY };
    AppState.canvas.nodeMap = nodeCoords;

    let nodesHtml = wrapMarkersHtml;
    for (const [, box] of nodeCoords.entries()) {
      nodesHtml += renderMagnificNodeCard(box, orient);
    }
    nodesEl.innerHTML = nodesHtml;
    // Sincroniza dimensões reais dos cards no DOM antes de traçar as esteiras (garante encaixe exato nas portas)
    for (const [nid, box] of nodeCoords.entries()) {
      const cardEl = document.getElementById(nid);
      if (cardEl) {
        const ow = cardEl.offsetWidth;
        const oh = cardEl.offsetHeight;
        if (ow > 20) box.w = ow;
        if (oh > 20) box.h = oh;
      }
    }
    renderCanvasWiresAndBadges(graph, nodeCoords, orient, wiresEl, nodesEl);

    if (autoFit) {
      setTimeout(() => fitCanvasToScreen(), 25);
    } else {
      applyCanvasTransform();
    }
  };

  // Fallback síncrono caso ELK não esteja disponível no ambiente
  const runFallbackWrappedLayout = () => {
    const layerPosMap = new Map();
    const wrapGroupMap = new Map();
    const targetPrimarySpan = isTB ? 2400 : 3200;
    let cursorPrimary = 0;
    let cursorSecondary = 0;
    let maxSecondaryInStrip = 0;
    let wrapIdx = 0;

    layersInfo.forEach((li) => {
      const primarySize = isTB ? li.boxH : li.boxW;
      const secondarySize = isTB ? li.boxW : li.boxH;

      if (cursorPrimary > 0 && cursorPrimary + primarySize > targetPrimarySpan) {
        wrapIdx++;
        cursorPrimary = 0;
        cursorSecondary += maxSecondaryInStrip + WRAP_GAP;
        maxSecondaryInStrip = 0;
      }

      if (isTB) {
        layerPosMap.set(li.layerIdx, { x: cursorSecondary, y: cursorPrimary });
      } else {
        layerPosMap.set(li.layerIdx, { x: cursorPrimary, y: cursorSecondary });
      }
      wrapGroupMap.set(li.layerIdx, wrapIdx);
      cursorPrimary += primarySize + LAYER_GAP;
      maxSecondaryInStrip = Math.max(maxSecondaryInStrip, secondarySize);
    });

    finalizeLayeredPositions(layerPosMap, wrapGroupMap);
  };

  const elk = getElkInstance();
  if (!elk || layersInfo.length === 0) {
    runFallbackWrappedLayout();
    return;
  }

  const runSeq = ++_layoutRunSeq;
  const elkChildren = layersInfo.map((li) => ({
    id: `L_${li.layerIdx}`,
    width: Math.round(li.boxW),
    height: Math.round(li.boxH)
  }));
  const elkEdges = [];
  for (let i = 1; i < layersInfo.length; i++) {
    elkEdges.push({
      id: `LE_${i}`,
      sources: [`L_${layersInfo[i - 1].layerIdx}`],
      targets: [`L_${layersInfo[i].layerIdx}`]
    });
  }

  const elkDir = orient === 'TB' ? 'DOWN' : (orient === 'BT' ? 'UP' : (orient === 'RL' ? 'LEFT' : 'RIGHT'));
  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': elkDir,
      'elk.aspectRatio': '1.6',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.wrapping.strategy': 'MULTI_EDGE',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.spacing.nodeNode': String(NODE_GAP + 16),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(LAYER_GAP)
    },
    children: elkChildren,
    edges: elkEdges
  };

  elk.layout(elkGraph).then((res) => {
    if (runSeq !== _layoutRunSeq) return;
    const layerPosMap = new Map();
    const wrapGroupMap = new Map();

    // Agrupa por coluna/faixa para identificar quebras de wrapping
    let currentGroup = 0;
    let prevPrimary = null;
    (res.children || []).forEach((c) => {
      const layerIdx = Number(String(c.id).replace('L_', ''));
      const x = Math.round(c.x || 0);
      const y = Math.round(c.y || 0);
      const primary = isTB ? y : x;
      if (prevPrimary !== null) {
        const wrapped = isRev ? (primary > prevPrimary + 10) : (primary < prevPrimary - 10);
        if (wrapped) currentGroup++;
      }
      prevPrimary = primary;
      layerPosMap.set(layerIdx, { x, y });
      wrapGroupMap.set(layerIdx, currentGroup);
    });

    finalizeLayeredPositions(layerPosMap, wrapGroupMap);
  }).catch(() => {
    if (runSeq !== _layoutRunSeq) return;
    runFallbackWrappedLayout();
  });
}

// Tabela oficial de portas por máquina do Satisfactory 1.0 (sólido = esteira #EA580C, fluido = tubulação #2563EB)
const OFFICIAL_MACHINE_PORTS = {
  Build_SmelterMk1_C:      { inputs: ['solid'], outputs: ['solid'] },
  Build_FoundryMk1_C:      { inputs: ['solid', 'solid'], outputs: ['solid'] },
  Build_ConstructorMk1_C:  { inputs: ['solid'], outputs: ['solid'] },
  Build_AssemblerMk1_C:    { inputs: ['solid', 'solid'], outputs: ['solid'] },
  Build_ManufacturerMk1_C: { inputs: ['solid', 'solid', 'solid', 'solid'], outputs: ['solid'] },
  Build_OilRefinery_C:     { inputs: ['solid', 'fluid'], outputs: ['solid', 'fluid'] },
  Build_Packager_C:        { inputs: ['solid', 'fluid'], outputs: ['solid', 'fluid'] },
  Build_Blender_C:         { inputs: ['solid', 'solid', 'fluid', 'fluid'], outputs: ['solid', 'fluid'] },
  Build_HadronCollider_C:  { inputs: ['solid', 'solid', 'fluid'], outputs: ['solid', 'fluid'] },
  Build_QuantumEncoder_C:  { inputs: ['solid', 'solid', 'solid', 'fluid'], outputs: ['solid', 'fluid'] },
  Build_Converter_C:       { inputs: ['solid', 'solid'], outputs: ['solid', 'fluid'] },
  Build_GeneratorCoal_C:   { inputs: ['solid', 'fluid'], outputs: [] },
  Build_GeneratorFuel_C:   { inputs: ['fluid'], outputs: [] },
  Build_GeneratorNuclear_C:{ inputs: ['solid', 'fluid'], outputs: ['solid'] },
  Build_GeneratorBiomass_C:{ inputs: ['solid'], outputs: [] }
};

function getNodePortSpecs(node) {
  if (!node) return { inputs: [], outputs: [] };
  if (node.kind === 'power_emblem') return { inputs: [], outputs: [] };
  const entId = node.entity?.id || '';
  if (OFFICIAL_MACHINE_PORTS[entId]) {
    return {
      inputs: [...OFFICIAL_MACHINE_PORTS[entId].inputs],
      outputs: [...OFFICIAL_MACHINE_PORTS[entId].outputs]
    };
  }
  const logDb = window.SATISFACTORY_DATA?.logistics || {};
  const logObj = logDb[entId] || Object.values(logDb).find(l => l.kind === node.kind);
  if (logObj) {
    const t = logObj.isFluid ? 'fluid' : 'solid';
    return {
      inputs: Array(Math.max(0, Number(logObj.inPorts) || 0)).fill(t),
      outputs: Array(Math.max(0, Number(logObj.outPorts) || 0)).fill(t)
    };
  }
  if (node.kind === 'extractor') {
    const isFl = Boolean(node.resourceExtractInfo?.item?.isFluid || node.outputsList?.[0]?.item?.isFluid);
    return { inputs: [], outputs: [isFl ? 'fluid' : 'solid'] };
  }
  if (node.kind === 'final_product' || node.isFinalProduct) {
    const isFl = Boolean(node.outputsList?.[0]?.item?.isFluid || node.inputsList?.[0]?.item?.isFluid);
    return { inputs: [isFl ? 'fluid' : 'solid'], outputs: [] };
  }
  const ins = (node.inputsList || []).map(i => (i.item?.isFluid ? 'fluid' : 'solid'));
  const outs = (node.outputsList || []).map(o => (o.item?.isFluid ? 'fluid' : 'solid'));
  return {
    inputs: ins.length > 0 ? ins : ['solid'],
    outputs: outs.length > 0 ? outs : (node.outPorts === 0 ? [] : ['solid'])
  };
}

function getPortFraction(idx, total) {
  if (!total || total <= 1) return 0.5;
  return (idx + 1) / (total + 1);
}

function highlightPortPair(portKey, active) {
  if (!portKey) return;
  document.querySelectorAll(`.mcard-port-dot[data-pair="${portKey}"]`).forEach(el => {
    el.classList.toggle('port-pair-hover', active);
  });
}

function computeEdgeGeometry(fromBox, toBox, orientOrIsTB, edge, outPct = 0.5, inPct = 0.5) {
  const orient = typeof orientOrIsTB === 'string'
    ? orientOrIsTB
    : (orientOrIsTB ? 'TB' : 'LR');
  let x1, y1, x2, y2, midX, midY, d, badgeX, badgeY;
  // Usa as dimensões reais medidas do card e a fração exata da porta na borda
  const fh = fromBox.h || 260;
  const th = toBox.h || 260;
  const fw = fromBox.w || 270;
  const tw = toBox.w || 270;

  if (orient === 'LR') {
    x1 = fromBox.x + fw;
    y1 = fromBox.y + fh * outPct;
    x2 = toBox.x;
    y2 = toBox.y + th * inPct;
    midX = (x1 + x2) / 2;
    midY = (y1 + y2) / 2;
    d = buildRoundedOrthogonalPathLR(x1, y1, x2, y2, midX);
    badgeX = x2 >= x1 + 24 ? midX : (x1 + x2) / 2;
    badgeY = x2 >= x1 + 24 ? midY : Math.min(y1, y2) - Math.max(fh, th) / 2 - 26;
  } else if (orient === 'RL') {
    x1 = fromBox.x;
    y1 = fromBox.y + fh * outPct;
    x2 = toBox.x + tw;
    y2 = toBox.y + th * inPct;
    midX = (x1 + x2) / 2;
    midY = (y1 + y2) / 2;
    d = buildRoundedOrthogonalPathRL(x1, y1, x2, y2, midX);
    badgeX = x1 >= x2 + 24 ? midX : (x1 + x2) / 2;
    badgeY = x1 >= x2 + 24 ? midY : Math.min(y1, y2) - Math.max(fh, th) / 2 - 26;
  } else if (orient === 'BT') {
    x1 = fromBox.x + fw * outPct;
    y1 = fromBox.y;
    x2 = toBox.x + tw * inPct;
    y2 = toBox.y + th;
    midX = (x1 + x2) / 2;
    midY = (y1 + y2) / 2;
    d = buildRoundedOrthogonalPathBT(x1, y1, x2, y2, midY);
    badgeX = midX;
    badgeY = y1 >= y2 + 24 ? midY : (y1 + y2) / 2;
  } else {
    x1 = fromBox.x + fw * outPct;
    y1 = fromBox.y + fh;
    x2 = toBox.x + tw * inPct;
    y2 = toBox.y;
    midX = (x1 + x2) / 2;
    midY = (y1 + y2) / 2;
    d = buildRoundedOrthogonalPathTB(x1, y1, x2, y2, midY);
    badgeX = midX;
    badgeY = y2 >= y1 + 24 ? midY : (y1 + y2) / 2;
  }
  return { x1, y1, x2, y2, midX, midY, d, badgeX, badgeY };
}

function renderCanvasWiresAndBadges(graph, nodeCoords, orientOrIsTB, wiresEl, nodesEl) {
  const orient = typeof orientOrIsTB === 'string'
    ? orientOrIsTB
    : (orientOrIsTB ? 'TB' : 'LR');
  let pathsHtml = '';
  let badgesHtml = '';

  // Limpa marcação de portas ocupadas antes de recalcular
  if (nodesEl) {
    nodesEl.querySelectorAll('.mcard-port-dot').forEach(dot => {
      dot.classList.remove('is-occupied', 'port-pair-hover');
      dot.removeAttribute('data-pair');
    });
  }

  // Rastreia índices de portas usadas por nó e direção/tipo
  const usedOut = new Map();
  const usedIn = new Map();
  const claimPort = (map, nodeId, portsArr, wantType) => {
    const key = `${nodeId}`;
    if (!map.has(key)) map.set(key, new Set());
    const used = map.get(key);
    let chosen = -1;
    for (let i = 0; i < portsArr.length; i++) {
      if (portsArr[i] === wantType && !used.has(i)) { chosen = i; break; }
    }
    if (chosen === -1) {
      for (let i = 0; i < portsArr.length; i++) {
        if (portsArr[i] === wantType) { chosen = i; break; }
      }
    }
    if (chosen === -1) chosen = 0;
    used.add(chosen);
    return { idx: chosen, total: Math.max(1, portsArr.length) };
  };

  graph.edges.forEach((edge, idx) => {
    const fromBox = nodeCoords.get(edge.from);
    const toBox = nodeCoords.get(edge.to);
    if (!fromBox || !toBox) return;

    const wantType = edge.isPipe ? 'fluid' : 'solid';
    const fromSpecs = getNodePortSpecs(fromBox.node);
    const toSpecs = getNodePortSpecs(toBox.node);
    const outSlot = claimPort(usedOut, edge.from, fromSpecs.outputs, wantType);
    const inSlot = claimPort(usedIn, edge.to, toSpecs.inputs, wantType);
    const outPct = getPortFraction(outSlot.idx, outSlot.total);
    const inPct = getPortFraction(inSlot.idx, inSlot.total);

    // Atualiza bolinhas de porta como ocupadas com tooltip e destaque de par
    if (nodesEl) {
      const pairId = `pair_${idx}`;
      const fromCard = document.getElementById(edge.from);
      const toCard = document.getElementById(edge.to);
      const outDot = fromCard?.querySelector(`.mcard-port-dot[data-dir="out"][data-idx="${outSlot.idx}"]`);
      const inDot = toCard?.querySelector(`.mcard-port-dot[data-dir="in"][data-idx="${inSlot.idx}"]`);
      const itemLabel = edge.itemName || edge.label || (edge.isPipe ? 'Fluido' : 'Item');
      const toTitle = toBox.node?.topLabel || toBox.node?.entity?.name || 'Destino';
      const fromTitle = fromBox.node?.topLabel || fromBox.node?.entity?.name || 'Origem';
      if (outDot) {
        outDot.classList.add('is-occupied');
        outDot.setAttribute('data-pair', pairId);
        outDot.setAttribute('title', `Saída: ${itemLabel} → ${toTitle}`);
      }
      if (inDot) {
        inDot.classList.add('is-occupied');
        inDot.setAttribute('data-pair', pairId);
        inDot.setAttribute('title', `Entrada: ${itemLabel} ← ${fromTitle}`);
      }
    }

    const isLift = (fromBox.floor || 1) !== (toBox.floor || 1);
    edge._isOffPage = false;

    const hitHandler = (edge.isCustom && edge.edgeId)
      ? `onclick="openEdgeBeltMenu(event, '${edge.edgeId}')" oncontextmenu="openEdgeBeltMenu(event, '${edge.edgeId}')"`
      : '';

    const geom = computeEdgeGeometry(fromBox, toBox, orient, edge, outPct, inPct);
    const { d, badgeX, badgeY } = geom;

    if (edge.isPipe) {
      pathsHtml += `
        <g id="edge-group-${idx}" class="conveyor-edge-group pipe-edge-group ${edge.isCustom ? 'clickable-edge-group' : ''}" ${hitHandler}>
          <path
            class="pipe-casing"
            d="${d}"
            stroke="#334155"
            stroke-width="11"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />
          <path
            id="wire-${idx}"
            data-from="${edge.from}"
            data-to="${edge.to}"
            class="magnific-wire pipe-wire"
            d="${d}"
            stroke="#0284c7"
            stroke-width="6.5"
            stroke-linecap="round"
            fill="none"
          />
          <path
            class="pipe-liquid-flow pipe-liquid-animated"
            d="${d}"
            stroke="#38bdf8"
            stroke-width="3.2"
            stroke-dasharray="14 10"
            stroke-linecap="round"
            fill="none"
          />
          <path
            class="wire-hit-area ${edge.isCustom ? 'clickable-wire' : ''}"
            d="${d}"
            stroke="transparent"
            stroke-width="24"
            fill="none"
          >
            ${edge.isCustom ? '<title>Clique para escolher a tubulação, inserir junção ou excluir</title>' : ''}
          </path>
        </g>
      `;
    } else {
      pathsHtml += `
        <g id="edge-group-${idx}" class="conveyor-edge-group ${edge.isCustom ? 'clickable-edge-group' : ''}" ${hitHandler}>
          <path
            class="belt-rail"
            d="${d}"
            stroke="#1e293b"
            stroke-width="9"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />
          <path
            id="wire-${idx}"
            data-from="${edge.from}"
            data-to="${edge.to}"
            class="magnific-wire belt-wire belt-track-animated ${isLift ? 'lift-wire' : ''}"
            d="${d}"
            stroke="#EA580C"
            stroke-width="5"
            stroke-dasharray="10 6"
            fill="none"
          />
          <path
            class="wire-hit-area ${edge.isCustom ? 'clickable-wire' : ''}"
            d="${d}"
            stroke="transparent"
            stroke-width="24"
            fill="none"
          >
            ${edge.isCustom ? '<title>Clique para escolher a esteira, inserir divisor ou excluir</title>' : ''}
          </path>
        </g>
      `;
    }

    if (edge.label || edge.isCustom) {
      const liftPrefix = isLift ? '🛗 ' : '';
      const pillClick = (edge.isCustom && edge.edgeId)
        ? `onclick="openEdgeBeltMenu(event, '${edge.edgeId}')" oncontextmenu="openEdgeBeltMenu(event, '${edge.edgeId}')"`
        : '';
      const deletePillBtn = (edge.isCustom && edge.edgeId)
        ? `<button type="button" class="wire-pill-del" onclick="event.stopPropagation(); removeCustomEdge('${edge.edgeId}')" title="Excluir conexão">✕</button>`
        : '';
      const bottleneckCls = edge.isBottleneck ? 'wire-bottleneck' : '';
      badgesHtml += `
        <div
          id="wire-pill-${idx}"
          class="wire-belt-pill ${edge.isPipe ? 'pipe-pill' : 'belt-pill'} ${edge.isCustom ? 'clickable-belt-pill' : ''} ${isLift ? 'lift-pill' : ''} ${bottleneckCls}"
          data-from="${edge.from}"
          data-to="${edge.to}"
          style="left:${badgeX}px; top:${badgeY}px;"
          ${pillClick}
        >
          <span>${liftPrefix}${edge.label || 'v.1 · 60/m'}</span>
          ${deletePillBtn}
        </div>
      `;
    }
  });

  // Ajusta o tamanho real do SVG ao bounding box do grafo para evitar cintilação/culling em zoom distante
  let svgMaxX = 2400;
  let svgMaxY = 1800;
  for (const [, b] of nodeCoords.entries()) {
    svgMaxX = Math.max(svgMaxX, (b.x || 0) + (b.w || 330) + 400);
    svgMaxY = Math.max(svgMaxY, (b.y || 0) + (b.h || 400) + 400);
  }
  wiresEl.style.width = `${Math.ceil(svgMaxX)}px`;
  wiresEl.style.height = `${Math.ceil(svgMaxY)}px`;

  wiresEl.innerHTML = pathsHtml;
  nodesEl.querySelectorAll('.wire-belt-pill').forEach(el => el.remove());
  nodesEl.insertAdjacentHTML('beforeend', badgesHtml);
}

function highlightEdgePair(fromId, toId, active) {
  document.querySelectorAll('.magnific-wire').forEach(path => {
    const match = path.getAttribute('data-from') === fromId && path.getAttribute('data-to') === toId;
    if (match) path.classList.toggle('wire-highlight', active);
  });
  document.querySelectorAll('.wire-belt-pill').forEach(pill => {
    const match = pill.getAttribute('data-from') === fromId && pill.getAttribute('data-to') === toId;
    if (match) pill.classList.toggle('pill-highlight', active);
  });
}

function focusOnNode(nodeId) {
  const viewport = document.getElementById('spaces-viewport');
  const box = AppState.canvas.nodeMap.get(nodeId);
  if (!viewport || !box) return;
  const rect = viewport.getBoundingClientRect();
  const targetScale = Math.max(AppState.canvas.scale, 0.72);
  AppState.canvas.scale = targetScale;
  AppState.canvas.x = (rect.width / 2) - (box.x + box.w / 2) * targetScale;
  AppState.canvas.y = (rect.height / 2) - (box.y + box.h / 2) * targetScale;
  applyCanvasTransform();
  highlightNodeWires(nodeId, true);
  setTimeout(() => highlightNodeWires(nodeId, false), 1500);
}

function updateCanvasWiresOnly() {
  const graph = AppState.canvas.lastGraph;
  const wiresEl = document.getElementById('spaces-wires');
  const nodesEl = document.getElementById('spaces-nodes');
  if (!graph || !wiresEl || !nodesEl) return;
  const orient = AppState.orientation || 'LR';
  renderCanvasWiresAndBadges(graph, AppState.canvas.nodeMap, orient, wiresEl, nodesEl);
}

function buildRoundedOrthogonalPathLR(x1, y1, x2, y2, midX) {
  const dy = y2 - y1;
  if (x2 >= x1 + 24) {
    if (Math.abs(dy) < 4) return `M ${x1} ${y1} L ${x2} ${y2}`;
    const r = Math.min(18, Math.abs(dy) / 2, Math.abs(midX - x1) / 2, Math.abs(x2 - midX) / 2);
    const signY = dy > 0 ? 1 : -1;
    return [
      `M ${x1} ${y1}`,
      `L ${midX - r} ${y1}`,
      `Q ${midX} ${y1} ${midX} ${y1 + r * signY}`,
      `L ${midX} ${y2 - r * signY}`,
      `Q ${midX} ${y2} ${midX + r} ${y2}`,
      `L ${x2} ${y2}`
    ].join(' ');
  }
  const outX = x1 + 28;
  const inX = x2 - 28;
  const routeY = Math.min(y1, y2) - 165;
  return `M ${x1} ${y1} L ${outX} ${y1} L ${outX} ${routeY} L ${inX} ${routeY} L ${inX} ${y2} L ${x2} ${y2}`;
}

function buildRoundedOrthogonalPathRL(x1, y1, x2, y2, midX) {
  const dy = y2 - y1;
  if (x1 >= x2 + 24) {
    if (Math.abs(dy) < 4) return `M ${x1} ${y1} L ${x2} ${y2}`;
    const r = Math.min(18, Math.abs(dy) / 2, Math.abs(x1 - midX) / 2, Math.abs(midX - x2) / 2);
    const signY = dy > 0 ? 1 : -1;
    return [
      `M ${x1} ${y1}`,
      `L ${midX + r} ${y1}`,
      `Q ${midX} ${y1} ${midX} ${y1 + r * signY}`,
      `L ${midX} ${y2 - r * signY}`,
      `Q ${midX} ${y2} ${midX - r} ${y2}`,
      `L ${x2} ${y2}`
    ].join(' ');
  }
  const outX = x1 - 28;
  const inX = x2 + 28;
  const routeY = Math.min(y1, y2) - 165;
  return `M ${x1} ${y1} L ${outX} ${y1} L ${outX} ${routeY} L ${inX} ${routeY} L ${inX} ${y2} L ${x2} ${y2}`;
}

function buildRoundedOrthogonalPathTB(x1, y1, x2, y2, midY) {
  const dx = x2 - x1;
  if (y2 >= y1 + 24) {
    if (Math.abs(dx) < 4) return `M ${x1} ${y1} L ${x2} ${y2}`;
    const r = Math.min(18, Math.abs(dx) / 2, Math.abs(midY - y1) / 2, Math.abs(y2 - midY) / 2);
    const signX = dx > 0 ? 1 : -1;
    return [
      `M ${x1} ${y1}`,
      `L ${x1} ${midY - r}`,
      `Q ${x1} ${midY} ${x1 + r * signX} ${midY}`,
      `L ${x2 - r * signX} ${midY}`,
      `Q ${x2} ${midY} ${x2} ${midY + r}`,
      `L ${x2} ${y2}`
    ].join(' ');
  }
  const outY = y1 + 28;
  const inY = y2 - 28;
  const corridorX = Math.abs(dx) > 120 ? (x1 + x2) / 2 : (x1 + 170);
  return `M ${x1} ${y1} L ${x1} ${outY} L ${corridorX} ${outY} L ${corridorX} ${inY} L ${x2} ${inY} L ${x2} ${y2}`;
}

function buildRoundedOrthogonalPathBT(x1, y1, x2, y2, midY) {
  const dx = x2 - x1;
  if (y1 >= y2 + 24) {
    if (Math.abs(dx) < 4) return `M ${x1} ${y1} L ${x2} ${y2}`;
    const r = Math.min(18, Math.abs(dx) / 2, Math.abs(y1 - midY) / 2, Math.abs(midY - y2) / 2);
    const signX = dx > 0 ? 1 : -1;
    return [
      `M ${x1} ${y1}`,
      `L ${x1} ${midY + r}`,
      `Q ${x1} ${midY} ${x1 + r * signX} ${midY}`,
      `L ${x2 - r * signX} ${midY}`,
      `Q ${x2} ${midY} ${x2} ${midY - r}`,
      `L ${x2} ${y2}`
    ].join(' ');
  }
  const outY = y1 - 28;
  const inY = y2 + 28;
  const corridorX = Math.abs(dx) > 120 ? (x1 + x2) / 2 : (x1 + 170);
  return `M ${x1} ${y1} L ${x1} ${outY} L ${corridorX} ${outY} L ${corridorX} ${inY} L ${x2} ${inY} L ${x2} ${y2}`;
}

function renderMagnificNodeCard(box, orientOrIsTB) {
  const orient = typeof orientOrIsTB === 'string'
    ? orientOrIsTB
    : (orientOrIsTB ? 'TB' : 'LR');
  const { x, y, w, h, node } = box;

  if (node.kind === 'power_emblem') {
    return `
      <div
        id="${node.id}"
        class="magnific-card power-emblem-card"
        style="left:${x}px; top:${y}px; width:${w}px;"
        onmouseenter="highlightNodeWires('${node.id}', true)"
        onmouseleave="highlightNodeWires('${node.id}', false)"
      >
        <div class="power-emblem-badge">
          <div class="power-emblem-bolt">⚡</div>
          <div class="power-emblem-info">
            <span class="power-emblem-lbl">ENERGIA GERADA</span>
            <strong class="power-emblem-val">${fmt(node.grossMw || 0, 1)} MW</strong>
            <small class="power-emblem-net">Líquida: ${fmt(node.netMw || 0, 1)} MW</small>
          </div>
        </div>
      </div>
    `;
  }

  const isCompact = node.kind === 'splitter' || node.kind === 'merger' || node.kind === 'pipe_junction';
  const isExtractor = node.kind === 'extractor';
  const isFinalProduct = node.kind === 'final_product' || Boolean(node.isFinalProduct);
  const isConfigurable = Boolean(node.configMeta);
  const imgSize = isCompact ? 74 : 168;

  const inputsList = node.inputsList || [];
  const outputsList = node.outputsList || [];

  // Nós de recurso: sem seção de SAÍDA, mostra apenas nome do recurso e quantidade extraída por minuto
  const resourceExtractHtml = (isExtractor && node.resourceExtractInfo) ? `
    <div class="io-section io-resource-extract">
      <div class="io-item-row">
        <div class="io-item-left">
          ${node.resourceExtractInfo.item ? renderEntityIcon(node.resourceExtractInfo.item, 34) : ''}
          <div class="io-item-text">
            <strong class="io-item-name">${node.resourceExtractInfo.item ? node.resourceExtractInfo.item.name : 'Recurso'}</strong>
          </div>
        </div>
        <div class="io-rate-value resource-val">
          ${fmt(node.resourceExtractInfo.rate, 1)} <small>${node.resourceExtractInfo.unit || 'un'}/min</small>
        </div>
      </div>
    </div>
  ` : '';

  const inputsHtml = (isCompact || isExtractor) ? '' : (inputsList.length > 0 ? `
    <div class="io-section io-consume">
      <div class="io-section-title">ENTRADA</div>
      ${inputsList.map(inp => `
        <div class="io-item-row">
          <div class="io-item-left">
            ${inp.item ? renderEntityIcon(inp.item, 34) : ''}
            <div class="io-item-text">
              <strong class="io-item-name">${inp.item ? inp.item.name : 'Entrada'}</strong>
            </div>
          </div>
          <div class="io-rate-value consume-val">
            ${fmt(inp.rate, 1)} <small>${inp.unit || 'un/min'}</small>
          </div>
        </div>
      `).join('')}
    </div>
  ` : '');

  const outputsHtml = (isCompact || isExtractor) ? '' : (outputsList.length > 0 ? `
    <div class="io-section io-produce">
      <div class="io-section-title">${isFinalProduct ? 'PRODUÇÃO FINAL' : 'SAÍDA'}</div>
      ${outputsList.map(out => `
        <div class="io-item-row">
          <div class="io-item-left">
            ${out.item && !out.isPower ? renderEntityIcon(out.item, 34) : '<span class="power-bolt-icon">⚡</span>'}
            <div class="io-item-text">
              <strong class="io-item-name">${out.customName || (out.item ? out.item.name : 'Energia Elétrica')}</strong>
            </div>
          </div>
          <div class="io-rate-value produce-val">
            ${fmt(out.rate, 1)} <small>${out.unit || 'un/min'}</small>
          </div>
        </div>
      `).join('')}
    </div>
  ` : '');

  // Em divisores/unificadores/junção, mostrar apenas o ícone do item e a quantidade levada
  const compactSummaryItems = isCompact ? (outputsList.length > 0 ? outputsList : inputsList) : [];
  const compactIoHtml = (isCompact && compactSummaryItems.length > 0) ? `
    <div class="compact-io-strip">
      ${compactSummaryItems.map(entry => `
        <div class="compact-io-chip" title="${entry.item ? entry.item.name : ''}">
          ${entry.item ? renderEntityIcon(entry.item, 24) : ''}
          <strong>${fmt(entry.rate, 1)} <small>${entry.unit || 'un'}/m</small></strong>
        </div>
      `).join('')}
    </div>
  ` : '';

  const logisticsHtml = (!isCompact && inputsList.length === 0 && outputsList.length === 0) ? `
    <div class="io-section io-logistics">
      ${(node.subLines || []).map(l => `<div class="logistics-line">${l}</div>`).join('')}
      ${(node.footLines || []).map(l => `<div class="logistics-line accent">${l}</div>`).join('')}
    </div>
  ` : '';

  const isFluidNode = Boolean(
    node.kind === 'pipe_junction' || node.kind === 'fluid_buffer_mk1' || node.kind === 'fluid_buffer_mk2' ||
    node.kind === 'pipe_pump_mk1' || node.kind === 'pipe_pump_mk2' ||
    (outputsList[0]?.item?.isFluid) || (inputsList[0]?.item?.isFluid)
  );
  const isSplitterLike = node.kind === 'splitter' || node.kind === 'merger' || node.kind === 'smart_splitter' || node.kind === 'programmable_splitter' || node.kind === 'priority_merger';
  const portInType = isFluidNode ? 'port-fluid' : (isSplitterLike ? 'port-splitter' : 'port-in');
  const portOutType = isFluidNode ? 'port-fluid' : (isSplitterLike ? 'port-splitter' : 'port-out');
  const portOrientPrefix = orient === 'TB' ? 'port-tb' : (orient === 'BT' ? 'port-bt' : (orient === 'RL' ? 'port-rl' : 'port-lr'));
  const portInClass = `${portOrientPrefix}-in ${portInType}`;
  const portOutClass = `${portOrientPrefix}-out ${portOutType}`;
  const hasInPort = node.kind !== 'extractor';
  const hasOutPort = node.outPorts !== 0 && node.kind !== 'generator';
  const missingInputs = Array.isArray(node._missingInputs) ? node._missingInputs : [];
  const missingBadgeHtml = missingInputs.length > 0
    ? `<span class="mcard-missing-badge" title="Sem entrada ligada: ${missingInputs.join(', ')}">!</span>`
    : '';

  const floorNum = box.floor || node._effectiveFloor || 1;
  const floorBadgeHtml = (AppState.canvas.is3DView || floorNum > 1)
    ? `<span class="mcard-floor-badge" title="Andar no layout vertical 3D">🏢 ${floorNum}º Andar</span>`
    : '';
  const duplicateBtnHtml = (AppState.mode === 'free' && node.blockId)
    ? `<button type="button" class="mcard-dup-btn" onclick="duplicateCanvasCard(event, '${node.id}')" title="Duplicar este card">⧉</button>`
    : '';
  const deleteBtnHtml = (AppState.mode === 'free' && node.blockId)
    ? `<button type="button" class="mcard-delete-btn" onclick="deleteCanvasCard(event, '${node.id}')" title="Remover este card">✕</button>`
    : '';
  const groupedCircleHtml = node.badgeText
    ? `<span class="mcard-count-badge mcard-count-top-right" title="Quantidade de máquinas agrupadas">${node.badgeText}</span>`
    : '';

  const portSpecs = getNodePortSpecs(node);
  const renderPortDots = (portsArr, dir) => {
    const total = portsArr.length;
    if (total === 0) return '';
    return portsArr.map((ptype, idx) => {
      const pct = (getPortFraction(idx, total) * 100).toFixed(2);
      const isHoriz = orient === 'LR' || orient === 'RL';
      const isStartEdge = (dir === 'in' && (orient === 'LR' || orient === 'TB')) || (dir === 'out' && (orient === 'RL' || orient === 'BT'));
      const posStyle = isHoriz
        ? `top:${pct}%; ${isStartEdge ? 'left:-7px;' : 'right:-7px;'} transform:translateY(-50%);`
        : `left:${pct}%; ${isStartEdge ? 'top:-7px;' : 'bottom:-7px;'} transform:translateX(-50%);`;
      const typeCls = ptype === 'fluid' ? 'port-fluid' : 'port-solid';
      const dirCls = dir === 'out' ? 'mcard-port-out' : 'mcard-port-in';
      const titleTxt = dir === 'out'
        ? (ptype === 'fluid' ? 'Saída de tubulação (arraste para conectar)' : 'Saída de esteira (arraste para conectar)')
        : (ptype === 'fluid' ? 'Entrada de tubulação' : 'Entrada de esteira');
      return `<div class="mcard-port-dot ${typeCls} ${dirCls} ${AppState.mode === 'free' ? 'mcard-port' : ''}" data-dir="${dir}" data-type="${ptype}" data-idx="${idx}" style="${posStyle}" title="${titleTxt}" onmouseenter="highlightPortPair(this.getAttribute('data-pair'), true)" onmouseleave="highlightPortPair(this.getAttribute('data-pair'), false)"></div>`;
    }).join('');
  };
  const portsHtml = `${renderPortDots(portSpecs.inputs, 'in')}${renderPortDots(portSpecs.outputs, 'out')}`;
  const isMultiSelected = AppState.mode === 'free' && Array.isArray(AppState.free.selectedIds) && node.blockId && AppState.free.selectedIds.includes(node.blockId);

  return `
    <div
      id="${node.id}"
      data-floor="${floorNum}"
      data-block-id="${node.blockId || ''}"
      class="magnific-card kind-${node.kind} ${isCompact ? 'compact-card' : ''} ${isFinalProduct ? 'final-product-highlight' : ''} ${isConfigurable ? 'configurable-card' : ''} ${floorNum > 1 ? 'upper-floor-card' : ''} ${missingInputs.length > 0 ? 'has-missing-input' : ''} ${isMultiSelected ? 'card-multi-selected' : ''}"
      style="left:${x}px; top:${y}px; width:${w}px; --card-accent:${node.accent || '#EA580C'}; --floor-idx:${floorNum - 1};"
      onmouseenter="highlightNodeWires('${node.id}', true)"
      onmouseleave="highlightNodeWires('${node.id}', false)"
      ${isConfigurable || AppState.mode === 'free' ? `onclick="handleCanvasCardClick(event, '${node.id}')"` : ''}
      title="${isConfigurable ? 'Clique para selecionar na barra lateral ou arraste para mover' : 'Arraste para mover livremente'}"
    >
      <div class="mcard-top-label ${isFinalProduct ? 'final-top-label' : ''}">
        <span class="mcard-title">${isFinalProduct ? `🎯 ${node.entity?.name || 'Produto Final'}` : node.topLabel}</span>
        <div class="mcard-top-badges">
          ${missingBadgeHtml}
          ${isFinalProduct ? '<span class="final-product-pill">PRODUTO FINAL</span>' : ''}
          ${floorBadgeHtml}
          ${groupedCircleHtml}
          ${duplicateBtnHtml}
          ${deleteBtnHtml}
        </div>
      </div>

      <div class="mcard-box ${isFinalProduct ? 'final-product-box' : ''}">
        <div class="mcard-image-stage ${isCompact ? 'compact-stage' : ''} ${isFinalProduct ? 'final-product-stage' : ''}">
          ${renderShowcaseImage(node.entity, imgSize)}
          ${node.recipePill && !isFinalProduct ? `<div class="mcard-recipe-pill">${node.recipePill}</div>` : ''}
          ${node.metaRight && !isCompact ? `<div class="mcard-meta-pill">${node.metaRight}</div>` : ''}
        </div>

        <div class="mcard-io-container">
          ${compactIoHtml}
          ${resourceExtractHtml}
          ${inputsHtml}
          ${outputsHtml}
          ${logisticsHtml}
        </div>
      </div>

      ${portsHtml}
    </div>
  `;
}

function highlightNodeWires(nodeId, active) {
  document.querySelectorAll('.magnific-wire').forEach(path => {
    const isConnected = path.getAttribute('data-from') === nodeId || path.getAttribute('data-to') === nodeId;
    if (isConnected) path.classList.toggle('wire-highlight', active);
  });
  document.querySelectorAll('.wire-belt-pill').forEach(pill => {
    const isConnected = pill.getAttribute('data-from') === nodeId || pill.getAttribute('data-to') === nodeId;
    if (isConnected) pill.classList.toggle('pill-highlight', active);
  });
}

/* ============================================================================
 * INSPECTOR DE CONFIGURAÇÃO AO CLICAR NA MÁQUINA NO ESPAÇO
 * ========================================================================== */

const INSPECTOR_EXCEPTION_KINDS = new Set([
  'splitter', 'merger', 'smart_splitter', 'programmable_splitter', 'priority_merger',
  'pipe_junction', 'pipe_pump_mk1', 'pipe_pump_mk2',
  'storage_mk1', 'storage_mk2', 'fluid_buffer_mk1', 'fluid_buffer_mk2'
]);

function selectAndRevealSidebarCard(node) {
  if (!node) return;
  // Expande sidebar caso esteja recolhida
  const sidebar = document.getElementById('left-sidebar');
  if (sidebar && sidebar.classList.contains('collapsed') && typeof toggleSidebarCollapse === 'function') {
    toggleSidebarCollapse();
  }

  let selectorKey = null;
  if (AppState.mode === 'free' && node.blockId) {
    AppState.free.expandedBlockId = node.blockId;
    AppState.free.selectedIds = [node.blockId];
    renderAll(false);
    selectorKey = `[data-sb-block-id="${node.blockId}"]`;
  } else if (node.configMeta) {
    const m = node.configMeta;
    if (m.itemId) selectorKey = `[data-sb-item-id="${m.itemId}"]`;
    else if (m.configType) selectorKey = `[data-sb-cfg="${m.configType}"]`;
  }

  if (selectorKey) {
    setTimeout(() => {
      const target = document.querySelector(`#left-sidebar ${selectorKey}`);
      if (target) {
        document.querySelectorAll('#left-sidebar .sb-card-selected').forEach(el => el.classList.remove('sb-card-selected'));
        target.classList.add('sb-card-selected');
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 30);
  }
}

function focusCanvasCardByBlockId(blockId) {
  const card = document.querySelector(`.magnific-card[data-block-id="${blockId}"]`);
  if (!card) return;
  const box = AppState.canvas.nodeMap.get(card.id);
  const vp = document.getElementById('spaces-viewport');
  if (box && vp) {
    const rect = vp.getBoundingClientRect();
    const s = AppState.canvas.scale || 1;
    AppState.canvas.x = rect.width / 2 - (box.x + (box.w || 260) / 2) * s;
    AppState.canvas.y = rect.height / 2 - (box.y + (box.h || 220) / 2) * s;
    applyCanvasTransform();
  }
  card.classList.add('card-focus-flash');
  setTimeout(() => card.classList.remove('card-focus-flash'), 1100);
}

function handleCanvasCardClick(event, nodeId) {
  if (AppState.canvas.movedDuringDrag || Date.now() < (AppState.canvas.suppressClickUntil || 0)) return;
  event.stopPropagation();
  const box = AppState.canvas.nodeMap.get(nodeId);
  if (!box || !box.node) return;

  // Shift+Clique na Oficina: seleção múltipla
  if (event.shiftKey && AppState.mode === 'free' && box.node.blockId) {
    const list = Array.isArray(AppState.free.selectedIds) ? [...AppState.free.selectedIds] : [];
    const i = list.indexOf(box.node.blockId);
    if (i >= 0) list.splice(i, 1);
    else list.push(box.node.blockId);
    AppState.free.selectedIds = list;
    renderAll(false);
    return;
  }

  // Exceções (divisores, unificadores, junções, bombas, contêineres) mantêm o modal inspetor
  if (INSPECTOR_EXCEPTION_KINDS.has(box.node.kind)) {
    if (box.node.configMeta) openMachineInspector(box.node.configMeta);
    return;
  }

  // Máquinas: seleciona, rola e expande na barra lateral esquerda (sem card sobreposto)
  selectAndRevealSidebarCard(box.node);
}

function pushFreeUndoSnapshot() {
  if (!AppState.free.undoStack) AppState.free.undoStack = [];
  AppState.free.undoStack.push(JSON.stringify({
    blocks: AppState.free.blocks,
    customEdges: AppState.free.customEdges
  }));
  if (AppState.free.undoStack.length > 40) AppState.free.undoStack.shift();
  AppState.free.redoStack = [];
}

function undoFreeAction() {
  if (!AppState.free.undoStack || AppState.free.undoStack.length === 0) return;
  AppState.free.redoStack = AppState.free.redoStack || [];
  AppState.free.redoStack.push(JSON.stringify({ blocks: AppState.free.blocks, customEdges: AppState.free.customEdges }));
  const prev = JSON.parse(AppState.free.undoStack.pop());
  AppState.free.blocks = prev.blocks || [];
  AppState.free.customEdges = prev.customEdges || [];
  AppState.free.selectedIds = [];
  renderAll(false);
}

function redoFreeAction() {
  if (!AppState.free.redoStack || AppState.free.redoStack.length === 0) return;
  AppState.free.undoStack = AppState.free.undoStack || [];
  AppState.free.undoStack.push(JSON.stringify({ blocks: AppState.free.blocks, customEdges: AppState.free.customEdges }));
  const next = JSON.parse(AppState.free.redoStack.pop());
  AppState.free.blocks = next.blocks || [];
  AppState.free.customEdges = next.customEdges || [];
  AppState.free.selectedIds = [];
  renderAll(false);
}

function duplicateCanvasCard(event, nodeId) {
  if (event) { event.preventDefault(); event.stopPropagation(); }
  closeCanvasMenus();
  const box = AppState.canvas.nodeMap.get(nodeId);
  if (!box?.node?.blockId) return;
  const orig = AppState.free.blocks.find(b => b.id === box.node.blockId);
  if (!orig) return;
  pushFreeUndoSnapshot();
  const clone = JSON.parse(JSON.stringify(orig));
  clone.id = uid();
  clone.x = Math.round((typeof orig.x === 'number' ? orig.x : box.x) + (box.w || 270) + 40);
  clone.y = Math.round(typeof orig.y === 'number' ? orig.y : box.y);
  AppState.free.blocks.push(clone);
  AppState.free.expandedBlockId = clone.id;
  AppState.free.selectedIds = [clone.id];
  renderAll(false);
}

function openCardContextMenu(clientX, clientY, nodeId) {
  closeCanvasMenus();
  const menu = document.getElementById('canvas-context-menu');
  const box = AppState.canvas.nodeMap.get(nodeId);
  if (!menu || !box?.node) return;
  const title = box.node.topLabel || box.node.entity?.name || 'Item';
  menu.innerHTML = `
    <div class="context-menu-header">${libEsc(title)}</div>
    <button type="button" class="context-menu-item" onclick="duplicateCanvasCard(event, '${nodeId}')">⧉ Duplicar</button>
    <button type="button" class="context-menu-item" onclick="closeCanvasMenus(); selectAndRevealSidebarCard(AppState.canvas.nodeMap.get('${nodeId}')?.node)">⚙️ Selecionar na barra</button>
    <div class="context-menu-divider"></div>
    <button type="button" class="context-menu-item danger" onclick="closeCanvasMenus(); deleteCanvasCard(event, '${nodeId}')">✕ Remover</button>
  `;
  positionFloatingMenu(menu, clientX, clientY);
  menu.classList.remove('hidden');
}

function copySelectedFreeBlocks() {
  const ids = new Set(AppState.free.selectedIds || []);
  if (ids.size === 0 && AppState.free.expandedBlockId) ids.add(AppState.free.expandedBlockId);
  if (ids.size === 0) return;
  const blocks = AppState.free.blocks.filter(b => ids.has(b.id)).map(b => JSON.parse(JSON.stringify(b)));
  const edges = (AppState.free.customEdges || [])
    .filter(e => ids.has(e.fromBlockId) && ids.has(e.toBlockId))
    .map(e => JSON.parse(JSON.stringify(e)));
  AppState.free.clipboard = { blocks, edges };
}

function pasteSelectedFreeBlocks() {
  const clip = AppState.free.clipboard;
  if (!clip || !clip.blocks || clip.blocks.length === 0) return;
  pushFreeUndoSnapshot();
  const idMap = new Map();
  const newIds = [];
  clip.blocks.forEach(b => {
    const clone = JSON.parse(JSON.stringify(b));
    const newId = uid();
    idMap.set(b.id, newId);
    clone.id = newId;
    clone.x = Math.round((clone.x || 100) + 60);
    clone.y = Math.round((clone.y || 100) + 60);
    AppState.free.blocks.push(clone);
    newIds.push(newId);
  });
  (clip.edges || []).forEach(e => {
    const newFrom = idMap.get(e.fromBlockId);
    const newTo = idMap.get(e.toBlockId);
    if (!newFrom || !newTo) return;
    AppState.free.customEdges.push({
      ...JSON.parse(JSON.stringify(e)),
      id: uid(),
      fromBlockId: newFrom,
      toBlockId: newTo,
      fromNodeId: `free_${newFrom}_0`,
      toNodeId: `free_${newTo}_0`
    });
  });
  AppState.free.selectedIds = newIds;
  renderAll(false);
}

function deleteSelectedFreeBlocks() {
  const ids = new Set(AppState.free.selectedIds || []);
  if (ids.size === 0) return;
  pushFreeUndoSnapshot();
  AppState.free.blocks = AppState.free.blocks.filter(b => !ids.has(b.id));
  AppState.free.customEdges = (AppState.free.customEdges || []).filter(e => !ids.has(e.fromBlockId) && !ids.has(e.toBlockId));
  AppState.free.selectedIds = [];
  if (ids.has(AppState.free.expandedBlockId)) AppState.free.expandedBlockId = null;
  renderAll(false);
}

// Atalhos de teclado da Oficina (Ctrl+C, Ctrl+V, Backspace/Delete, Ctrl+Z/Y, Espaço para Pan)
window.addEventListener('keydown', (e) => {
  if (AppState.mode !== 'free') return;
  const active = document.activeElement;
  const tag = active ? active.tagName : '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  if (e.code === 'Space') {
    if (!AppState.canvas.spacePressed) {
      AppState.canvas.spacePressed = true;
      document.getElementById('spaces-viewport')?.classList.add('space-pan-ready');
    }
    e.preventDefault();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
    e.preventDefault();
    copySelectedFreeBlocks();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
    e.preventDefault();
    pasteSelectedFreeBlocks();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    undoFreeAction();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    redoFreeAction();
  } else if (e.key === 'Backspace' || e.key === 'Delete') {
    if (AppState.free.selectedIds && AppState.free.selectedIds.length > 0) {
      e.preventDefault();
      deleteSelectedFreeBlocks();
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'Space' && AppState.canvas.spacePressed) {
    AppState.canvas.spacePressed = false;
    document.getElementById('spaces-viewport')?.classList.remove('space-pan-ready');
  }
});

function openMachineInspector(configMeta) {
  AppState.inspector.isOpen = true;
  AppState.inspector.configMeta = configMeta;
  const modal = document.getElementById('machine-inspector-modal');
  if (modal) modal.classList.remove('hidden');
  renderMachineInspectorContent();
}

function closeMachineInspector() {
  AppState.inspector.isOpen = false;
  AppState.inspector.configMeta = null;
  const modal = document.getElementById('machine-inspector-modal');
  if (modal) modal.classList.add('hidden');
}

function handleInspectorBackdropClick(e) {
  if (e.target && e.target.id === 'machine-inspector-modal') closeMachineInspector();
}

function renderMachineInspectorContent() {
  const meta = AppState.inspector.configMeta;
  const body = document.getElementById('inspector-body');
  const titleEl = document.getElementById('inspector-title');
  if (!meta || !body) return;

  if (titleEl) {
    titleEl.textContent = `⚙️ Configurar: ${meta.title || 'Máquina'}`;
  }

  if (meta.configType === 'power_water_pump') {
    const p = AppState.power;
    const waterEx = Solver.getMachine('Build_WaterPump_C');
    const clock = p.waterExtractorClock || 100;
    const ratePerPump = 120 * (clock / 100);
    const powerPerPump = 20 * Math.pow(clock / 100, 1.321928);

    body.innerHTML = `
      <div class="inspector-hero">
        ${renderShowcaseImage(waterEx, 96)}
        <div class="inspector-hero-info">
          <h4>Bomba d'Água (Extrator de Água)</h4>
          <p>Cada bomba extrai <strong>${fmt(ratePerPump, 1)} m³/min</strong> a <strong>${clock}%</strong> de clock (Consome ⚡ ${fmt(powerPerPump, 1)} MW cada).</p>
        </div>
      </div>

      <div class="inspector-form-grid">
        <div class="field-group">
          ${renderOverclockSliderHtml({ value: clock, onChangeExpr: `setPowerWaterClock(__VAL__)`, label: "Overclock da Bomba d'Água" })}
        </div>

        <div class="field-row-2">
          <div class="field-group">
            <label>Nº Inteiro de Bombas d'Água</label>
            <input type="number" class="sidebar-input" min="1" step="1" value="${p.manualWaterPumps || ''}" placeholder="Automático" onchange="setPowerParam('manualWaterPumps', this.value ? Math.max(1, Math.round(parseFloat(this.value))) : null)" />
          </div>
          <div class="field-group">
            <label>Modo de Quantidade</label>
            <button type="button" class="btn-small-accent" style="height:34px;" onclick="setPowerParam('manualWaterPumps', null)">🔄 Recalcular Nº Automático</button>
          </div>
        </div>
      </div>

      <div class="inspector-footer">
        <button type="button" class="btn-mount-flow ready" onclick="closeMachineInspector()">✅ Concluído</button>
      </div>
    `;
    return;
  }

  if (meta.configType === 'power_generator') {
    const p = AppState.power;
    const generators = Solver.getPowerGenerators();
    const gen = generators.find(g => g.id === p.generatorId) || generators[0];
    const clock = p.clockPercent || 100;

    body.innerHTML = `
      <div class="inspector-hero">
        ${renderShowcaseImage(gen, 96)}
        <div class="inspector-hero-info">
          <h4>${gen ? gen.name : 'Gerador'}</h4>
          <p>Gera <strong>⚡ ${fmt((gen?.powerProduction || 75) * (clock / 100), 1)} MW</strong> por usina a <strong>${clock}%</strong> de clock.</p>
        </div>
      </div>

      <div class="inspector-form-grid">
        <div class="field-group">
          ${renderOverclockSliderHtml({ value: clock, onChangeExpr: `setPowerParam('clockPercent', __VAL__)`, label: 'Overclock dos Geradores' })}
        </div>

        <div class="field-row-2">
          <div class="field-group">
            <label>Nº Inteiro de Geradores</label>
            <input type="number" class="sidebar-input" min="1" step="1" value="${p.manualGenerators || p.generatorCount || 1}" onchange="setPowerGeneratorCountOverride(this.value)" />
          </div>
          <div class="field-group">
            <label>Cálculo Automático</label>
            <button type="button" class="btn-small-accent" style="height:34px;" onclick="setPowerParam('manualGenerators', null)">🔄 Automático pela Entrada/MW</button>
          </div>
        </div>
      </div>

      <div class="inspector-footer">
        <button type="button" class="btn-mount-flow ready" onclick="closeMachineInspector()">✅ Concluído</button>
      </div>
    `;
    return;
  }

  if (meta.configType === 'power_fuel_source') {
    const p = AppState.power;
    const fuelItem = Solver.getItem(p.fuelItemId);
    const isRaw = Solver.isRawResource(p.fuelItemId);

    body.innerHTML = `
      <div class="inspector-hero">
        ${renderShowcaseImage(fuelItem, 90)}
        <div class="inspector-hero-info">
          <h4>Extração de ${fuelItem ? fuelItem.name : 'Combustível'}</h4>
          <p>Configure o nível da mineradora, pureza do nodo, quantidade e overclock.</p>
        </div>
      </div>

      <div class="inspector-form-grid">
        ${isRaw ? `
          <div class="field-group">
            <label>Nível da Mineradora</label>
            <div class="btn-group-row">
              <button class="seg-btn ${p.minerMark === 'mk1' ? 'active' : ''}" onclick="setPowerParam('minerMark', 'mk1')">v.1</button>
              <button class="seg-btn ${p.minerMark === 'mk2' ? 'active' : ''}" onclick="setPowerParam('minerMark', 'mk2')">v.2</button>
              <button class="seg-btn ${p.minerMark === 'mk3' ? 'active' : ''}" onclick="setPowerParam('minerMark', 'mk3')">v.3</button>
            </div>
          </div>
          <div class="field-group">
            <label>Pureza do Nodo</label>
            <div class="btn-group-row">
              <button class="seg-btn ${p.purity === 'impure' ? 'active' : ''}" onclick="setPowerParam('purity', 'impure')">Impuro</button>
              <button class="seg-btn ${p.purity === 'normal' ? 'active' : ''}" onclick="setPowerParam('purity', 'normal')">Normal</button>
              <button class="seg-btn ${p.purity === 'pure' ? 'active' : ''}" onclick="setPowerParam('purity', 'pure')">Puro</button>
            </div>
          </div>
          <div class="field-group">
            <label>Nº de Mineradoras</label>
            <input type="number" class="sidebar-input" min="1" step="1" value="${p.minerCount}" onchange="setPowerParam('minerCount', Math.max(1, Math.round(parseFloat(this.value)||1)))" />
          </div>
          <div class="field-group">
            ${renderOverclockSliderHtml({ value: p.minerClock, onChangeExpr: `setPowerParam('minerClock', __VAL__)`, label: 'Overclock Mineradora' })}
          </div>
        ` : `
          <div class="field-group">
            <label>Taxa de Combustível (/min)</label>
            <input type="number" class="sidebar-input" min="1" step="10" value="${p.fuelRate}" onchange="setPowerParam('fuelRate', Math.max(1, parseFloat(this.value)||60))" />
          </div>
        `}
      </div>

      <div class="inspector-footer">
        <button type="button" class="btn-mount-flow ready" onclick="closeMachineInspector()">✅ Concluído</button>
      </div>
    `;
    return;
  }

  if (meta.configType === 'extractor') {
    const itemId = meta.itemId;
    const item = Solver.getItem(itemId);
    if (meta.mode === 'push') {
      const inp = AppState.push.inputs.find(i => i.itemId === itemId) || AppState.push.inputs[0];
      if (!inp) return;
      body.innerHTML = `
        <div class="inspector-hero">
          ${renderShowcaseImage(item, 90)}
          <div class="inspector-hero-info">
            <h4>Extração: ${item ? item.name : ''}</h4>
            <p>Ajuste diretamente o overclock, pureza, nível da mineradora ou número de extratores.</p>
          </div>
        </div>
        ${renderPushInputCard(inp)}
        <div class="inspector-footer">
          <button type="button" class="btn-mount-flow ready" onclick="closeMachineInspector()">✅ Concluído</button>
        </div>
      `;
    } else {
      const mCfg = AppState.pull.minerSettings[itemId] || { minerMark: 'mk1', purity: 'normal', clockPercent: 100, customCount: null };
      body.innerHTML = `
        <div class="inspector-hero">
          ${renderShowcaseImage(item, 90)}
          <div class="inspector-hero-info">
            <h4>Extração: ${item ? item.name : ''}</h4>
            <p>Configure o overclock, nível, pureza e número de extratores para ${item ? item.name : ''}.</p>
          </div>
        </div>
        <div class="inspector-form-grid">
          ${itemId !== 'Desc_Water_C' && itemId !== 'Desc_LiquidOil_C' && itemId !== 'Desc_NitrogenGas_C' ? `
            <div class="field-group">
              <label>Nível da Mineradora</label>
              <div class="btn-group-row">
                <button class="seg-btn ${mCfg.minerMark === 'mk1' ? 'active' : ''}" onclick="setPullMinerMark('${itemId}', 'mk1')">v.1</button>
                <button class="seg-btn ${mCfg.minerMark === 'mk2' ? 'active' : ''}" onclick="setPullMinerMark('${itemId}', 'mk2')">v.2</button>
                <button class="seg-btn ${mCfg.minerMark === 'mk3' ? 'active' : ''}" onclick="setPullMinerMark('${itemId}', 'mk3')">v.3</button>
              </div>
            </div>
          ` : ''}
          ${itemId !== 'Desc_Water_C' ? `
            <div class="field-group">
              <label>Pureza do Nodo</label>
              <div class="btn-group-row">
                <button class="seg-btn ${mCfg.purity === 'impure' ? 'active' : ''}" onclick="setPullMinerPurity('${itemId}', 'impure')">Impuro</button>
                <button class="seg-btn ${mCfg.purity === 'normal' ? 'active' : ''}" onclick="setPullMinerPurity('${itemId}', 'normal')">Normal</button>
                <button class="seg-btn ${mCfg.purity === 'pure' ? 'active' : ''}" onclick="setPullMinerPurity('${itemId}', 'pure')">Puro</button>
              </div>
            </div>
          ` : ''}
          <div class="field-group">
            ${renderOverclockSliderHtml({ value: mCfg.clockPercent || 100, onChangeExpr: `setPullMinerClock('${itemId}', __VAL__)`, label: 'Overclock' })}
          </div>
          <div class="field-row-2">
            <div class="field-group">
              <label>Nº Inteiro de Extratores</label>
              <input type="number" class="sidebar-input" min="1" step="1" value="${mCfg.customCount || ''}" placeholder="Automático" onchange="setPullMinerCustomCount('${itemId}', this.value)" />
            </div>
            <div class="field-group">
              <label>Modo de Quantidade</label>
              <button type="button" class="btn-small-accent" style="height:34px;" onclick="setPullMinerCustomCount('${itemId}', null)">🔄 Nº Automático</button>
            </div>
          </div>
        </div>
        <div class="inspector-footer">
          <button type="button" class="btn-mount-flow ready" onclick="closeMachineInspector()">✅ Concluído</button>
        </div>
      `;
    }
    return;
  }

  if (meta.configType === 'stage_machine') {
    const itemId = meta.itemId;
    const isPush = meta.mode === 'push';
    const stateObj = isPush ? AppState.push : AppState.pull;
    const item = Solver.getItem(itemId);
    const availableRecipes = Solver.indexes.recipesByProduct.get(itemId) || [];
    const currentRecipeId = Solver.getChosenRecipeId
      ? Solver.getChosenRecipeId(itemId, stateObj.recipeOverrides)
      : (stateObj.recipeOverrides[itemId] || (availableRecipes[0] && availableRecipes[0].id));
    const stepCfg = stateObj.stepSettings[itemId] || { clockPercent: 100, customMachineCount: null, sloops: 0 };
    const clock = stepCfg.clockPercent || 100;

    body.innerHTML = `
      <div class="inspector-hero">
        ${renderShowcaseImage(item, 90)}
        <div class="inspector-hero-info">
          <h4>Etapa de Produção: ${item ? item.name : ''}</h4>
          <p>Escolha a receita, ajuste o overclock de 1% a 250% ou defina manualmente o número de máquinas.</p>
        </div>
      </div>

      <div class="inspector-form-grid">
        <div class="field-group">
          <label>Receita &amp; Máquina (${availableRecipes.length} opções disponíveis)</label>
          <select class="sidebar-select" onchange="handleInspectorStageRecipe('${meta.mode}', '${itemId}', this.value)">
            ${availableRecipes.map(r => {
              const m = Solver.getMachine(r.machine || r.producedIn);
              return `<option value="${r.id}" ${r.id === currentRecipeId ? 'selected' : ''}>${r.isAlternate ? '★ [Alt] ' : ''}${r.cleanName || r.name} — (${m ? m.name : 'Máquina'})</option>`;
            }).join('')}
          </select>
        </div>

        <div class="field-group">
          ${renderOverclockSliderHtml({ value: clock, onChangeExpr: `handleInspectorStageClock('${meta.mode}', '${itemId}', __VAL__)`, label: 'Overclock da Máquina' })}
        </div>

        <div class="field-row-2">
          <div class="field-group">
            <label>Nº Inteiro de Máquinas</label>
            <input type="number" class="sidebar-input" min="1" step="1" value="${stepCfg.customMachineCount || ''}" placeholder="Automático" onchange="handleInspectorStageCount('${meta.mode}', '${itemId}', this.value)" />
          </div>
          <div class="field-group">
            <label>Recalcular Quantidade</label>
            <button type="button" class="btn-small-accent" style="height:34px;" onclick="handleInspectorStageCount('${meta.mode}', '${itemId}', null)">🔄 Automático</button>
          </div>
        </div>
      </div>

      <div class="inspector-footer">
        <button type="button" class="btn-mount-flow ready" onclick="closeMachineInspector()">✅ Concluído</button>
      </div>
    `;
    return;
  }

  if (meta.configType === 'free_block') {
    const b = AppState.free.blocks.find(x => x.id === meta.blockId);
    if (!b) return;
    const st = Solver.computeFreeBlockStats(b);
    const { belts, pipes } = Solver.getBeltsAndPipes();
    const machines = Solver.getProductionMachines();
    const generators = Solver.getPowerGenerators();

    let typeSpecificHtml = '';
    if (b.blockType === 'extractor') {
      const rawItems = Solver.getAllItems().filter(i => i.isRawResource);
      const isLiquidOrGas = b.itemId === 'Desc_Water_C' || b.itemId === 'Desc_LiquidOil_C' || b.itemId === 'Desc_NitrogenGas_C';
      typeSpecificHtml = `
        <div class="field-group">
          <label>Recurso Extraído</label>
          <select class="sidebar-select" onchange="updateFreeBlock('${b.id}', 'itemId', this.value)">
            ${rawItems.map(it => `<option value="${it.id}" ${it.id === b.itemId ? 'selected' : ''}>${it.name}</option>`).join('')}
          </select>
        </div>
        ${!isLiquidOrGas ? `
          <div class="field-row-2">
            <div class="field-group">
              <label>Nível da Mineradora</label>
              <select class="sidebar-select" onchange="updateFreeBlock('${b.id}', 'minerMark', this.value)">
                <option value="mk1" ${b.minerMark === 'mk1' ? 'selected' : ''}>Mineradora v.1 (60/m base)</option>
                <option value="mk2" ${b.minerMark === 'mk2' ? 'selected' : ''}>Mineradora v.2 (120/m base)</option>
                <option value="mk3" ${b.minerMark === 'mk3' ? 'selected' : ''}>Mineradora v.3 (240/m base)</option>
              </select>
            </div>
            <div class="field-group">
              <label>Pureza do Nó</label>
              <select class="sidebar-select" onchange="updateFreeBlock('${b.id}', 'purity', this.value)">
                <option value="impure" ${b.purity === 'impure' ? 'selected' : ''}>Impuro (0.5x)</option>
                <option value="normal" ${b.purity === 'normal' ? 'selected' : ''}>Normal (1.0x)</option>
                <option value="pure" ${b.purity === 'pure' ? 'selected' : ''}>Puro (2.0x)</option>
              </select>
            </div>
          </div>
        ` : ''}
      `;
    } else if (b.blockType === 'machine') {
      const machineRecipes = Solver.getRecipesByMachine(b.machineId);
      typeSpecificHtml = `
        <div class="field-group">
          <label>Máquina / Refinaria (${machines.length} disponíveis)</label>
          <select class="sidebar-select" onchange="changeFreeBlockMachine('${b.id}', this.value)">
            ${machines.map(m => `<option value="${m.id}" ${m.id === b.machineId ? 'selected' : ''}>${m.name}</option>`).join('')}
          </select>
        </div>
        <div class="field-group">
          <label>O que Produz / Receita (${machineRecipes.length} opções)</label>
          <select class="sidebar-select" onchange="updateFreeBlock('${b.id}', 'recipeId', this.value)">
            ${machineRecipes.map(r => {
              const prodNames = (r.products || []).map(p => Solver.getItem(p.item)?.name || p.item).join(' + ');
              return `<option value="${r.id}" ${r.id === b.recipeId ? 'selected' : ''}>${r.isAlternate ? '★ [Alt] ' : ''}${r.cleanName} (${prodNames})</option>`;
            }).join('')}
          </select>
        </div>
      `;
    } else if (b.blockType === 'generator') {
      const genObj = generators.find(g => g.id === b.generatorId) || generators[0];
      typeSpecificHtml = `
        <div class="field-group">
          <label>Usina / Gerador</label>
          <select class="sidebar-select" onchange="changeFreeBlockGenerator('${b.id}', this.value)">
            ${generators.map(g => `<option value="${g.id}" ${g.id === b.generatorId ? 'selected' : ''}>${g.name}</option>`).join('')}
          </select>
        </div>
        <div class="field-group">
          <label>Combustível</label>
          <select class="sidebar-select" onchange="updateFreeBlock('${b.id}', 'fuelItemId', this.value)">
            ${(genObj?.fuels || []).map(f => {
              const fIt = Solver.getItem(f.itemId);
              return `<option value="${f.itemId}" ${f.itemId === b.fuelItemId ? 'selected' : ''}>${fIt ? fIt.name : f.itemId}</option>`;
            }).join('')}
          </select>
        </div>
      `;
    } else if (b.blockType === 'splitter') {
      const factor = Number(b.splitFactor) || 2;
      typeSpecificHtml = `
        <div class="field-group">
          <label>Saídas do Divisor</label>
          <select class="sidebar-select" onchange="updateFreeBlock('${b.id}', 'splitFactor', Number(this.value))">
            <option value="2" ${factor === 2 ? 'selected' : ''}>2 Saídas (÷2)</option>
            <option value="3" ${factor === 3 ? 'selected' : ''}>3 Saídas (÷3)</option>
          </select>
        </div>
      `;
    }

    body.innerHTML = `
      <div class="inspector-hero">
        ${renderShowcaseImage(st?.entity, 90)}
        <div class="inspector-hero-info">
          <h4>${st ? st.title : 'Bloco Livre'}</h4>
          <p>${st ? st.subtitle : ''} • Configure máquina, receita, clock, andares e esteiras.</p>
        </div>
      </div>

      <div class="inspector-form-grid">
        ${typeSpecificHtml}

        <div class="field-group">
          <label>Nº Inteiro de Máquinas</label>
          <input type="number" class="sidebar-input" min="1" step="1" value="${b.count}" onchange="updateFreeBlock('${b.id}', 'count', Math.max(1, Math.round(parseFloat(this.value)||1)))" />
        </div>
        <div class="field-group">
          ${renderOverclockSliderHtml({ value: b.clockPercent, onChangeExpr: `updateFreeBlock('${b.id}', 'clockPercent', __VAL__)`, label: 'Overclock' })}
        </div>
        <div class="field-row-2">
          <div class="field-group">
            <label>Esteira Conectada</label>
            <select class="sidebar-select" onchange="updateFreeBlock('${b.id}', 'beltTierId', this.value)">
              ${belts.map(bl => `<option value="${bl.id}" ${bl.id === b.beltTierId ? 'selected' : ''}>${bl.name.replace('Esteira de transporte ', 'Esteira ')} (${bl.ratePerMin}/m)</option>`).join('')}
            </select>
          </div>
          <div class="field-group">
            <label>Tubulação (se fluido)</label>
            <select class="sidebar-select" onchange="updateFreeBlock('${b.id}', 'pipeTierId', this.value)">
              ${pipes.map(pp => `<option value="${pp.id}" ${pp.id === b.pipeTierId ? 'selected' : ''}>${pp.name} (${pp.ratePerMin}/m)</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="field-row-2">
          <div class="field-group">
            <label>Andar Inicial (Maquete 3D)</label>
            <input type="number" class="sidebar-input" min="1" max="20" step="1" value="${b.floor || 1}" onchange="updateFreeBlock('${b.id}', 'floor', Math.max(1, Math.round(parseFloat(this.value)||1)))" />
          </div>
          <div class="field-group">
            <label>Máqs p/ Andar (0 = todas)</label>
            <input type="number" class="sidebar-input" min="0" max="100" step="1" value="${b.machinesPerFloor || 0}" onchange="updateFreeBlock('${b.id}', 'machinesPerFloor', Math.max(0, Math.round(parseFloat(this.value)||0)))" />
          </div>
        </div>
      </div>

      <div class="inspector-footer" style="display:flex; gap:8px;">
        <button type="button" class="btn-small-accent" onclick="duplicateFreeBlock('${b.id}'); closeMachineInspector();" title="Duplicar">📋 Duplicar</button>
        <button type="button" class="btn-icon-danger" style="padding:8px 14px;" onclick="removeFreeBlock('${b.id}'); closeMachineInspector();">🗑️ Remover</button>
        <button type="button" class="btn-mount-flow ready" style="flex:1;" onclick="closeMachineInspector()">✅ Concluído</button>
      </div>
    `;
  }
}

function handleInspectorStageRecipe(mode, itemId, val) {
  if (mode === 'push') setPushRecipe(itemId, val);
  else setPullRecipe(itemId, val);
}

function handleInspectorStageClock(mode, itemId, val) {
  if (mode === 'push') setPushStepClock(itemId, val);
  else setPullStepClock(itemId, val);
}

function handleInspectorStageCount(mode, itemId, val) {
  if (mode === 'push') setPushStepCustomCount(itemId, val);
  else setPullStepCustomCount(itemId, val);
}

/* ============================================================================
 * AÇÕES DE INTERAÇÃO (PRODUÇÃO UNIFICADA, ENERGIA E LIVRE)
 * ========================================================================== */

function openPushAddInputModal() {
  openPickerModal({
    title: 'Escolher Recurso Primário ou Máquina',
    filterType: 'raw_and_machines',
    defaultCategory: 'Todos',
    prioritizeRaw: true,
    onSelect: (selectedId) => {
      // Se o usuário selecionou uma máquina de produção (ex: Construtor, Fornalha, Refinaria)
      const isExtractor = Solver.getExtractors().some(e => e.id === selectedId);
      if (!isExtractor && Solver.getMachine(selectedId)) {
        switchMode('free');
        addFreeBlock('machine', { machineId: selectedId });
        return;
      }

      // Se o usuário selecionou um extrator (Mineradora v.1/v.2/v.3, Bomba d'Água, Extrator de Petróleo)
      const extObj = Solver.getExtractors().find(e => e.id === selectedId);
      if (extObj) {
        AppState.production.driver = 'input';
        let itemId = 'Desc_OreIron_C';
        let minerMark = 'mk1';
        if (selectedId === 'Build_MinerMk2_C') minerMark = 'mk2';
        else if (selectedId === 'Build_MinerMk3_C') minerMark = 'mk3';
        else if (selectedId === 'Build_WaterPump_C') itemId = 'Desc_Water_C';
        else if (selectedId === 'Build_OilPump_C') itemId = 'Desc_LiquidOil_C';
        else if (selectedId === 'Build_FrackingSmasher_C' || selectedId === 'Build_FrackingExtractor_C') itemId = 'Desc_NitrogenGas_C';

        AppState.push.inputs.push({
          id: uid(),
          itemId,
          mode: 'extractor',
          minerMark,
          purity: 'normal',
          extractorCount: 1,
          clockPercent: 100,
          rate: 60
        });
        renderAll(true);
        return;
      }

      // Recurso primário do mapa (Ferro, Cobre, Carvão, Enxofre, etc.)
      AppState.production.driver = 'input';
      AppState.push.inputs.push({
        id: uid(),
        itemId: selectedId,
        mode: 'extractor',
        minerMark: 'mk1',
        purity: 'normal',
        extractorCount: 1,
        clockPercent: 100,
        rate: 60
      });
      renderAll(true);
    }
  });
}

function openChangePushInputItemModal(inputId) {
  openPickerModal({
    title: 'Trocar Recurso Primário',
    filterType: 'raw_only',
    defaultCategory: 'Todos',
    prioritizeRaw: true,
    onSelect: (itemId) => {
      const inp = AppState.push.inputs.find(i => i.id === inputId);
      if (inp) {
        inp.itemId = itemId;
        inp.mode = Solver.isRawResource(itemId) ? 'extractor' : 'rate';
      }
      renderAll(true);
    }
  });
}

function updatePushInput(id, field, value) {
  const inp = AppState.push.inputs.find(i => i.id === id);
  if (!inp) return;
  inp[field] = value;
  renderAll(false);
}

function removePushInput(id) {
  AppState.push.inputs = AppState.push.inputs.filter(i => i.id !== id);
  if (AppState.push.inputs.length === 0) {
    AppState.push.targetItemId = null;
    AppState.production.driver = null;
  }
  renderAll(true);
}

function openPushTargetPicker() {
  openPickerModal({
    title: 'Escolher Produto Final que Deseja Fabricar',
    filterType: 'craftable',
    defaultCategory: 'Todos',
    onSelect: (itemId) => {
      AppState.push.targetItemId = itemId;
      renderAll(true);
    }
  });
}

function selectPushTargetItem(itemId) {
  AppState.push.targetItemId = itemId;
  AppState.production.mounted = true;
  renderAll(true);
}

function clearPushTargetItem() {
  AppState.push.targetItemId = null;
  renderAll(true);
}

function setPushRecipe(itemId, recipeId) {
  AppState.push.recipeOverrides[itemId] = recipeId;
  if (AppState.push.stepSettings[itemId]) {
    delete AppState.push.stepSettings[itemId].customMachineCount;
  }
  renderAll(false);
}

function setPushStepClock(itemId, clockVal) {
  if (!AppState.push.stepSettings[itemId]) AppState.push.stepSettings[itemId] = {};
  AppState.push.stepSettings[itemId].clockPercent = Math.min(250, Math.max(1, parseFloat(clockVal) || 100));
  delete AppState.push.stepSettings[itemId].customMachineCount;
  renderAll(false);
}

function setPushStepCustomCount(itemId, countVal) {
  if (!AppState.push.stepSettings[itemId]) AppState.push.stepSettings[itemId] = {};
  if (!countVal) {
    delete AppState.push.stepSettings[itemId].customMachineCount;
  } else {
    AppState.push.stepSettings[itemId].customMachineCount = Math.max(1, Math.round(parseFloat(countVal) || 1));
  }
  renderAll(false);
}

/* --- Taxa base real de 1 máquina a 100% (quantidade * 60 / duração) --- */
function getBaseRecipeRateForItem(itemId, explicitRecipeId = null) {
  const recipes = Object.values((window.SATISFACTORY_DATA && window.SATISFACTORY_DATA.recipes) || {});
  let recipe = explicitRecipeId && window.SATISFACTORY_DATA?.recipes?.[explicitRecipeId]
    ? window.SATISFACTORY_DATA.recipes[explicitRecipeId]
    : null;
  if (!recipe) {
    const overrideId = AppState.pull.recipeOverrides[itemId];
    if (overrideId && window.SATISFACTORY_DATA?.recipes?.[overrideId]) {
      recipe = window.SATISFACTORY_DATA.recipes[overrideId];
    }
  }
  if (!recipe) {
    recipe = recipes.find((r) => !r.isAlternate && (r.products || []).some((p) => p.item === itemId))
      || recipes.find((r) => (r.products || []).some((p) => p.item === itemId));
  }
  if (!recipe || !recipe.duration) return 1;
  const prod = (recipe.products || []).find((p) => p.item === itemId);
  if (!prod) return 1;
  return Math.round(((prod.amount * 60) / recipe.duration) * 10000) / 10000;
}

/* --- Ações quando começa pelo Produto Final (Pull) --- */
function openPullAddTargetModal(preCategory) {
  openPickerModal({
    title: 'Escolher Produto Final',
    filterType: 'craftable',
    defaultCategory: preCategory || 'Todos',
    onSelect: (itemId) => {
      AppState.production.driver = 'product';
      const baseRate = getBaseRecipeRateForItem(itemId);
      const existing = AppState.pull.targets.find(t => t.itemId === itemId);
      if (existing) {
        existing.rate = Math.round((existing.rate + baseRate) * 10000) / 10000;
      } else {
        AppState.pull.targets.push({ id: uid(), itemId, rate: baseRate });
      }
      renderAll(true);
    }
  });
}

function openChangePullTargetModal(targetId) {
  openPickerModal({
    title: 'Trocar Produto Final',
    filterType: 'craftable',
    defaultCategory: 'Todos',
    onSelect: (itemId) => {
      const t = AppState.pull.targets.find(x => x.id === targetId);
      if (t) {
        t.itemId = itemId;
        t.rate = getBaseRecipeRateForItem(itemId);
      }
      renderAll(true);
    }
  });
}

function updatePullTargetRate(id, val) {
  const t = AppState.pull.targets.find(x => x.id === id);
  if (t) {
    const baseRate = getBaseRecipeRateForItem(t.itemId);
    t.rate = Math.max(0.1, parseFloat(val) || baseRate);
  }
  renderAll(false);
}

function removePullTarget(id) {
  AppState.pull.targets = AppState.pull.targets.filter(x => x.id !== id);
  if (AppState.pull.targets.length === 0) {
    AppState.production.driver = null;
  }
  renderAll(true);
}

function setPullRecipe(itemId, recipeId) {
  AppState.pull.recipeOverrides[itemId] = recipeId;
  if (AppState.pull.stepSettings[itemId]) {
    delete AppState.pull.stepSettings[itemId].customMachineCount;
  }
  const target = AppState.pull.targets.find((t) => t.itemId === itemId);
  if (target) {
    target.rate = getBaseRecipeRateForItem(itemId, recipeId);
  }
  renderAll(false);
}

function setPullStepClock(itemId, clockVal) {
  if (!AppState.pull.stepSettings[itemId]) AppState.pull.stepSettings[itemId] = {};
  AppState.pull.stepSettings[itemId].clockPercent = Math.min(250, Math.max(1, parseFloat(clockVal) || 100));
  delete AppState.pull.stepSettings[itemId].customMachineCount;
  renderAll(false);
}

function setPullStepCustomCount(itemId, countVal) {
  if (!AppState.pull.stepSettings[itemId]) AppState.pull.stepSettings[itemId] = {};
  if (!countVal) {
    delete AppState.pull.stepSettings[itemId].customMachineCount;
  } else {
    AppState.pull.stepSettings[itemId].customMachineCount = Math.max(1, Math.round(parseFloat(countVal) || 1));
  }
  renderAll(false);
}

function ensurePullMinerSetting(itemId) {
  if (!AppState.pull.minerSettings[itemId]) {
    AppState.pull.minerSettings[itemId] = { minerMark: 'mk1', purity: 'normal', clockPercent: 100, customCount: null };
  }
  return AppState.pull.minerSettings[itemId];
}

function setPullMinerMark(itemId, mark) {
  const cfg = ensurePullMinerSetting(itemId);
  cfg.minerMark = mark;
  cfg.customCount = null;
  renderAll(false);
}

function setPullMinerPurity(itemId, purity) {
  const cfg = ensurePullMinerSetting(itemId);
  cfg.purity = purity;
  cfg.customCount = null;
  renderAll(false);
}

function setPullMinerClock(itemId, clockVal) {
  const cfg = ensurePullMinerSetting(itemId);
  cfg.clockPercent = Math.min(250, Math.max(1, parseFloat(clockVal) || 100));
  cfg.customCount = null;
  renderAll(false);
}

function setPullMinerCustomCount(itemId, countVal) {
  const cfg = ensurePullMinerSetting(itemId);
  cfg.customCount = countVal ? Math.max(1, Math.round(parseFloat(countVal) || 1)) : null;
  renderAll(false);
}

/* --- Ações Aba 2 (Energia) --- */
function selectPowerGenerator(genId) {
  AppState.power.generatorId = genId;
  AppState.power.manualWaterPumps = null;
  AppState.canvas.customPositions = {};
  const gen = Solver.getPowerGenerators().find(g => g.id === genId);
  if (AppState.power.calcMode === 'by_mw') {
    AppState.power.manualGenerators = null;
    if (!AppState.power.targetMW && gen) {
      AppState.power.targetMW = gen.powerProduction || 1;
    }
  } else {
    if (!AppState.power.generatorCount) AppState.power.generatorCount = 1;
    AppState.power.manualGenerators = Number(AppState.power.generatorCount) || 1;
  }
  if (gen && gen.fuels.length > 0) {
    AppState.power.fuelItemId = gen.fuels[0].itemId;
    AppState.power.fuelRate = gen.fuels[0].ratePerMin || 1;
  } else {
    AppState.power.fuelItemId = null;
    AppState.power.fuelRate = 0;
  }
  renderAll(true);
}

function selectPowerFuel(fuelId) {
  AppState.power.fuelItemId = fuelId;
  AppState.power.manualWaterPumps = null;
  AppState.canvas.customPositions = {};
  if (AppState.power.calcMode === 'by_mw') {
    AppState.power.manualGenerators = null;
  } else {
    const cnt = Math.max(1, Math.round(Number(AppState.power.generatorCount) || 1));
    AppState.power.generatorCount = cnt;
    AppState.power.manualGenerators = cnt;
  }
  const gen = Solver.getPowerGenerators().find(g => g.id === AppState.power.generatorId);
  const f = gen?.fuels?.find(x => x.itemId === fuelId);
  if (f) AppState.power.fuelRate = f.ratePerMin * (Number(AppState.power.generatorCount) || 1);
  renderAll(true);
}

function setPowerCalcMode(mode) {
  AppState.power.calcMode = mode;
  AppState.canvas.customPositions = {};
  if (mode === 'by_mw') {
    AppState.power.manualGenerators = null;
  } else {
    const cnt = Math.max(1, Math.round(Number(AppState.power.generatorCount) || 1));
    AppState.power.generatorCount = cnt;
    AppState.power.manualGenerators = cnt;
  }
  renderAll(false);
}

function setPowerParam(field, value) {
  if (field === 'clockPercent' || field === 'minerClock' || field === 'waterExtractorClock') {
    value = Math.max(100, Math.min(250, Math.round(Number(value) || 100)));
  }
  AppState.power[field] = value;
  if (field === 'targetMW') {
    AppState.power.calcMode = 'by_mw';
    AppState.power.manualGenerators = null;
    AppState.power.manualWaterPumps = null;
    AppState.canvas.customPositions = {};
  } else if (field === 'clockPercent' || field === 'minerCount' || field === 'minerClock' || field === 'minerMark' || field === 'purity') {
    if (AppState.power.calcMode !== 'by_generators') AppState.power.manualGenerators = null;
    AppState.power.manualWaterPumps = null;
    AppState.canvas.customPositions = {};
  }
  renderAll(false);
}

function setPowerWaterClock(val) {
  AppState.power.waterExtractorClock = Math.min(250, Math.max(100, Math.round(parseFloat(val) || 100)));
  AppState.power.manualWaterPumps = null;
  renderAll(false);
}

function setPowerGeneratorCountOverride(val) {
  const num = Math.max(1, Math.round(parseFloat(val) || 1));
  AppState.power.calcMode = 'by_generators';
  AppState.power.generatorCount = num;
  AppState.power.manualGenerators = num;
  AppState.power.manualWaterPumps = null;
  AppState.canvas.customPositions = {};
  renderAll(false);
}

/* --- Ações Aba 3 (Construção Livre + Check) --- */
function addFreeBlock(blockType, options = {}) {
  const id = uid();
  const posProps = {};
  if (typeof options.x === 'number') posProps.x = Math.round(options.x);
  if (typeof options.y === 'number') posProps.y = Math.round(options.y);

  if (blockType === 'extractor') {
    AppState.free.blocks.push({
      id,
      blockType: 'extractor',
      itemId: options.itemId || 'Desc_OreIron_C',
      minerMark: 'mk2',
      purity: 'normal',
      count: 1,
      clockPercent: 100,
      floor: 1,
      machinesPerFloor: 0,
      beltTierId: 'Build_ConveyorBeltMk3_C',
      pipeTierId: 'Build_Pipeline_C',
      ...posProps
    });
  } else if (blockType === 'machine') {
    const machines = Solver.getProductionMachines();
    const defMachine = (options.machineId && machines.find(m => m.id === options.machineId)) || machines[0];
    const recs = Solver.getRecipesByMachine(defMachine.id);
    AppState.free.blocks.push({
      id,
      blockType: 'machine',
      machineId: defMachine.id,
      recipeId: options.recipeId || (recs[0] ? recs[0].id : null),
      count: 1,
      clockPercent: 100,
      sloops: 0,
      floor: 1,
      machinesPerFloor: 0,
      beltTierId: 'Build_ConveyorBeltMk3_C',
      pipeTierId: 'Build_Pipeline_C',
      ...posProps
    });
  } else if (blockType === 'generator') {
    const gens = Solver.getPowerGenerators();
    const defGen = (options.generatorId && gens.find(g => g.id === options.generatorId)) || gens.find(g => g.id === 'Build_GeneratorCoal_C') || gens[0];
    AppState.free.blocks.push({
      id,
      blockType: 'generator',
      generatorId: defGen.id,
      fuelItemId: options.fuelItemId || defGen.fuels[0]?.itemId || 'Desc_Coal_C',
      count: 1,
      clockPercent: 100,
      floor: 1,
      machinesPerFloor: 0,
      beltTierId: 'Build_ConveyorBeltMk3_C',
      pipeTierId: 'Build_Pipeline_C',
      ...posProps
    });
  } else {
    // Logística, Armazenamento e Destinos Finais oficiais (build CL-517554)
    const logList = Object.values((window.SATISFACTORY_DATA && window.SATISFACTORY_DATA.logistics) || {});
    const logObj = logList.find(l => l.id === options.logisticsId || l.kind === blockType);
    AppState.free.blocks.push({
      id,
      blockType: logObj ? logObj.kind : blockType,
      logisticsId: logObj ? logObj.id : (options.logisticsId || null),
      count: 1,
      clockPercent: 100,
      floor: 1,
      machinesPerFloor: 0,
      beltTierId: 'Build_ConveyorBeltMk3_C',
      pipeTierId: 'Build_Pipeline_C',
      ...posProps
    });
  }

  if (options.connectFromNodeId) {
    const fromBox = AppState.canvas.nodeMap.get(options.connectFromNodeId);
    const fromBlockId = fromBox?.node?.blockId || null;
    const fromBlock = fromBlockId ? AppState.free.blocks.find(b => b.id === fromBlockId) : null;
    const outItem = fromBox?.node?.outputsList?.[0]?.item || fromBox?.node?.resourceExtractInfo?.item || null;
    const isFluid = Boolean(outItem?.isFluid);
    AppState.free.customEdges.push({
      id: uid(),
      fromNodeId: options.connectFromNodeId,
      fromBlockId,
      toNodeId: `free_${id}_0`,
      toBlockId: id,
      itemId: options.itemId || outItem?.id || null,
      beltTierId: isFluid ? (fromBlock?.pipeTierId || 'Build_Pipeline_C') : (fromBlock?.beltTierId || 'Build_ConveyorBeltMk3_C')
    });
  }

  AppState.free.checkPerformed = false;
  AppState.free.lastCheckReport = null;
  renderAll(AppState.free.blocks.length <= 1);
  return id;
}

function updateWirePreviewPath(x1, y1, x2, y2) {
  const wiresEl = document.getElementById('spaces-wires');
  if (!wiresEl) return;
  let path = document.getElementById('wire-preview-path');
  if (!path) {
    path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('id', 'wire-preview-path');
    path.setAttribute('class', 'wire-preview-path');
    wiresEl.appendChild(path);
  }
  const midX = (x1 + x2) / 2;
  const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
  path.setAttribute('d', d);
}

let _connErrTimer = null;
function showConnectionErrorToast(message = 'Conexão incompatível') {
  const el = document.getElementById('connection-error-toast');
  if (!el) return;
  el.textContent = message || 'Conexão incompatível';
  el.classList.remove('hidden');
  if (_connErrTimer) clearTimeout(_connErrTimer);
  _connErrTimer = setTimeout(() => {
    el.classList.add('hidden');
  }, 2200);
}

const SOLID_ONLY_FREE_KINDS = new Set([
  'splitter', 'smart_splitter', 'programmable_splitter',
  'merger', 'priority_merger',
  'storage_mk1', 'storage_mk2',
  'awesome_sink', 'dimensional_depot', 'space_elevator'
]);
const FLUID_ONLY_FREE_KINDS = new Set([
  'pipe_junction', 'pipe_pump_mk1', 'pipe_pump_mk2',
  'fluid_buffer_mk1', 'fluid_buffer_mk2'
]);

function getNodeTransportInfo(node) {
  const kind = node?.kind || '';
  const outItems = (node.outputsList || []).map(o => o.item).filter(Boolean);
  if (node.resourceExtractInfo?.item) outItems.push(node.resourceExtractInfo.item);
  const inItems = (node.inputsList || []).map(i => i.item).filter(Boolean);

  let outType = 'any';
  if (SOLID_ONLY_FREE_KINDS.has(kind)) outType = 'solid';
  else if (FLUID_ONLY_FREE_KINDS.has(kind)) outType = 'fluid';
  else if (outItems.length > 0) {
    const hasFluid = outItems.some(i => i.isFluid);
    const hasSolid = outItems.some(i => !i.isFluid);
    outType = hasFluid && hasSolid ? 'both' : (hasFluid ? 'fluid' : 'solid');
  }

  let inType = 'any';
  if (SOLID_ONLY_FREE_KINDS.has(kind)) inType = 'solid';
  else if (FLUID_ONLY_FREE_KINDS.has(kind)) inType = 'fluid';
  else if (inItems.length > 0) {
    const hasFluid = inItems.some(i => i.isFluid);
    const hasSolid = inItems.some(i => !i.isFluid);
    inType = hasFluid && hasSolid ? 'both' : (hasFluid ? 'fluid' : 'solid');
  }

  return { kind, outItems, inItems, outType, inType };
}

function validateFreeConnection(fromNode, toNode) {
  if (!fromNode || !toNode) return { ok: false, reason: 'Conexão inválida.' };
  if (fromNode.id === toNode.id) return { ok: false, reason: 'Não é possível conectar uma máquina nela mesma.' };

  // 1. Destino não pode ser extrator/mineradora
  if (toNode.kind === 'extractor') {
    return { ok: false, reason: 'Extratores e mineradoras não possuem entrada de esteira ou tubulação.' };
  }

  // 2. Origem não pode ser destino final (sem saída) nem gerador de energia
  if (fromNode.outPorts === 0) {
    return { ok: false, reason: `${fromNode.topLabel || 'Este destino'} é um destino final e não possui saída.` };
  }
  if (fromNode.kind === 'generator') {
    return { ok: false, reason: 'Geradores produzem energia elétrica e não possuem saída de esteira ou tubulação.' };
  }

  const src = getNodeTransportInfo(fromNode);
  const dst = getNodeTransportInfo(toNode);

  // 3. Incompatibilidade sólido (esteira) vs fluido (tubulação)
  if (src.outType === 'solid' && dst.inType === 'fluid') {
    return { ok: false, reason: 'Conexão incompatível' };
  }
  if (src.outType === 'fluid' && dst.inType === 'solid') {
    return { ok: false, reason: 'Conexão incompatível' };
  }

  // 4. Limite de portas de saída na origem e portas de entrada no destino
  const fromSpecs = getNodePortSpecs(fromNode);
  const toSpecs = getNodePortSpecs(toNode);
  const edges = AppState.free.customEdges || [];
  const usedOutCount = edges.filter(e => e.fromNodeId === fromNode.id).length;
  const usedInCount = edges.filter(e => e.toNodeId === toNode.id).length;
  if (fromSpecs.outputs.length > 0 && usedOutCount >= fromSpecs.outputs.length) {
    return { ok: false, reason: 'Quantidade de conexão excedida' };
  }
  if (toSpecs.inputs.length > 0 && usedInCount >= toSpecs.inputs.length) {
    return { ok: false, reason: 'Quantidade de conexão excedida' };
  }

  // 4. Se destino for máquina ou gerador com entradas definidas e origem tiver item conhecido, validar compatibilidade do item
  if ((toNode.kind === 'machine' || toNode.kind === 'generator') && dst.inItems.length > 0 && src.outItems.length > 0) {
    const acceptedIds = new Set(dst.inItems.map(i => i.id));
    const matchesAny = src.outItems.some(i => acceptedIds.has(i.id));
    if (!matchesAny) {
      const srcName = src.outItems[0]?.name || 'este item';
      return { ok: false, reason: `${toNode.topLabel || 'Esta máquina'} não aceita ${srcName} na receita atual.` };
    }
  }

  return { ok: true };
}

const canConnectNodes = validateFreeConnection;

function handleWireDropOnCard(fromNodeId, toNodeId) {
  const fromBox = AppState.canvas.nodeMap.get(fromNodeId);
  const toBox = AppState.canvas.nodeMap.get(toNodeId);
  if (!fromBox || !toBox) return;

  if (AppState.mode !== 'free') {
    return;
  }

  const check = canConnectNodes(fromBox.node, toBox.node);
  if (!check.ok) {
    showConnectionErrorToast(check.reason === 'Quantidade de conexão excedida' ? 'Quantidade de conexão excedida' : 'Conexão incompatível');
    return;
  }

  const srcInfo = getNodeTransportInfo(fromBox.node);
  const dstInfo = getNodeTransportInfo(toBox.node);
  let outItem = null;
  if (srcInfo.outItems.length > 0 && dstInfo.inItems.length > 0) {
    const acceptedIds = new Set(dstInfo.inItems.map(i => i.id));
    outItem = srcInfo.outItems.find(i => acceptedIds.has(i.id)) || srcInfo.outItems[0];
  } else {
    outItem = srcInfo.outItems[0] || dstInfo.inItems[0] || null;
  }

  const fromBlkId = fromBox.node?.blockId;
  const toBlkId = toBox.node?.blockId;
  const fromBlock = fromBlkId ? AppState.free.blocks.find(b => b.id === fromBlkId) : null;
  const isFluid = Boolean(outItem?.isFluid || srcInfo.outType === 'fluid' || dstInfo.inType === 'fluid');

  // Verifica se já existe
  const exists = AppState.free.customEdges.some(e => e.fromNodeId === fromNodeId && e.toNodeId === toNodeId);
  if (!exists) {
    AppState.free.customEdges.push({
      id: uid(),
      fromNodeId,
      fromBlockId: fromBlkId,
      toNodeId,
      toBlockId: toBlkId,
      itemId: outItem?.id || null,
      beltTierId: isFluid ? (fromBlock?.pipeTierId || 'Build_Pipeline_C') : (fromBlock?.beltTierId || 'Build_ConveyorBeltMk3_C')
    });
    AppState.free.checkPerformed = false;
    renderAll(false);
  }
}

function positionFloatingMenu(menuEl, clientX, clientY) {
  const viewport = document.getElementById('spaces-viewport');
  if (!viewport || !menuEl) return;
  const rect = viewport.getBoundingClientRect();
  let left = clientX - rect.left;
  let top = clientY - rect.top;
  if (left + 260 > rect.width) left = Math.max(12, rect.width - 270);
  if (top + 320 > rect.height) top = Math.max(12, rect.height - 330);
  menuEl.style.left = `${left}px`;
  menuEl.style.top = `${top}px`;
}

function openCanvasContextMenu(clientX, clientY, worldPos) {
  closeCanvasMenus();
  const wx = Math.round(worldPos.x);
  const wy = Math.round(worldPos.y);

  if (AppState.mode === 'free' && typeof openAddMachineModal === 'function') {
    openAddMachineModal({ worldPos: { x: wx, y: wy } });
    return;
  }

  const menu = document.getElementById('canvas-context-menu');
  if (!menu) return;

  menu.innerHTML = `
    <div class="context-menu-header">Adicionar</div>
    <button class="context-menu-item" onclick="quickCreateFromMenu('extractor', { x: ${wx}, y: ${wy}, itemId: 'Desc_OreIron_C' })">⛏️ Mineradora</button>
    <button class="context-menu-item" onclick="quickCreateFromMenu('extractor', { x: ${wx}, y: ${wy}, itemId: 'Desc_LiquidOil_C' })">🛢️ Extrator</button>
    <button class="context-menu-item" onclick="quickCreateFromMenu('extractor', { x: ${wx}, y: ${wy}, itemId: 'Desc_Water_C' })">💧 Bomba</button>
    <button class="context-menu-item" onclick="quickCreateFromMenu('machine', { x: ${wx}, y: ${wy} })">🏭 Máquina</button>
    <button class="context-menu-item" onclick="quickCreateFromMenu('generator', { x: ${wx}, y: ${wy} })">⚡ Gerador de Energia</button>
    <div class="context-menu-divider"></div>
    <button class="context-menu-item" onclick="quickCreateFromMenu('splitter', { x: ${wx}, y: ${wy} })">🔀 Divisor</button>
    <button class="context-menu-item" onclick="quickCreateFromMenu('merger', { x: ${wx}, y: ${wy} })">🔗 Unificador</button>
    <button class="context-menu-item" onclick="quickCreateFromMenu('pipe_junction', { x: ${wx}, y: ${wy} })">🔩 Junção de Tubulação</button>
  `;
  positionFloatingMenu(menu, clientX, clientY);
  menu.classList.remove('hidden');
}

function openWireDropMenu(clientX, clientY, fromNodeId, worldPos) {
  closeCanvasMenus();
  const fromBox = AppState.canvas.nodeMap.get(fromNodeId);
  const outItem = fromBox?.node?.outputsList?.[0]?.item || fromBox?.node?.resourceExtractInfo?.item || null;
  const wx = Math.round(worldPos.x);
  const wy = Math.round(worldPos.y - 120);

  if (AppState.mode === 'free' && typeof openAddMachineModal === 'function') {
    openAddMachineModal({
      filterItemId: outItem?.id || null,
      fromNodeId,
      worldPos: { x: wx, y: wy }
    });
    return;
  }

  const menu = document.getElementById('wire-drop-menu');
  if (!menu) return;

  if (AppState.mode !== 'free') {
    menu.innerHTML = `
      <div class="context-menu-header">ℹ️ Conexão Manual</div>
      <div class="context-menu-empty">Para criar e conectar máquinas livremente ao soltar a esteira, mude para a aba <strong>🛠️ Livre</strong>!</div>
    `;
    positionFloatingMenu(menu, clientX, clientY);
    menu.classList.remove('hidden');
    return;
  }

  const compatibleRecs = outItem ? Solver.getCompatibleRecipesForItem(outItem.id).slice(0, 8) : [];
  const gens = Solver.getPowerGenerators();
  const compatGens = outItem ? gens.filter(g => g.fuels.some(f => f.itemId === outItem.id)) : [];

  const recsHtml = compatibleRecs.map(r => {
    const mName = r.machineObj?.name || 'Máquina';
    return `
      <button class="context-menu-item" onclick="quickCreateFromMenu('machine', { x: ${wx}, y: ${wy}, machineId: '${r.machine}', recipeId: '${r.id}', connectFromNodeId: '${fromNodeId}', itemId: '${outItem.id}' })">
        🏭 ${r.cleanName} <small>(${mName})</small>
      </button>
    `;
  }).join('');

  const gensHtml = compatGens.map(g => `
    <button class="context-menu-item" onclick="quickCreateFromMenu('generator', { x: ${wx}, y: ${wy}, generatorId: '${g.id}', fuelItemId: '${outItem.id}', connectFromNodeId: '${fromNodeId}', itemId: '${outItem.id}' })">
      ⚡ ${g.name} <small>(${outItem.name})</small>
    </button>
  `).join('');

  menu.innerHTML = `
    <div class="context-menu-header">🔗 Conectar ${outItem ? outItem.name : 'Esteira'} a:</div>
    ${outItem?.isFluid
      ? `<button class="context-menu-item" onclick="quickCreateFromMenu('pipe_junction', { x: ${wx}, y: ${wy}, connectFromNodeId: '${fromNodeId}', itemId: '${outItem?.id || ''}' })">🔩 Nova Junção de Tubulação</button>`
      : `<button class="context-menu-item" onclick="quickCreateFromMenu('splitter', { x: ${wx}, y: ${wy}, connectFromNodeId: '${fromNodeId}', itemId: '${outItem?.id || ''}' })">🔀 Novo Divisor de Esteira</button>
         <button class="context-menu-item" onclick="quickCreateFromMenu('merger', { x: ${wx}, y: ${wy}, connectFromNodeId: '${fromNodeId}', itemId: '${outItem?.id || ''}' })">🔗 Novo Unificador de Esteira</button>`
    }
    ${recsHtml ? `<div class="context-menu-divider"></div><div class="context-menu-sub">Máquinas Compatíveis</div>${recsHtml}` : ''}
    ${gensHtml ? `<div class="context-menu-divider"></div><div class="context-menu-sub">Geradores Compatíveis</div>${gensHtml}` : ''}
    ${!recsHtml && !gensHtml ? `
      <div class="context-menu-divider"></div>
      <button class="context-menu-item" onclick="quickCreateFromMenu('machine', { x: ${wx}, y: ${wy}, connectFromNodeId: '${fromNodeId}' })">🏭 Nova Máquina (Escolher Receita)</button>
    ` : ''}
  `;
  positionFloatingMenu(menu, clientX, clientY);
  menu.classList.remove('hidden');
}

function quickCreateFromMenu(blockType, extra = {}) {
  closeCanvasMenus();
  addFreeBlock(blockType, extra);
}

function updateFreeBlock(blockId, field, value) {
  const b = AppState.free.blocks.find(x => x.id === blockId);
  if (!b) return;
  b[field] = value;
  AppState.free.checkPerformed = false;
  AppState.free.lastCheckReport = null;
  renderAll(false);
  if (AppState.inspector.isOpen) renderMachineInspectorContent();
}

function changeFreeBlockMachine(blockId, newMachineId) {
  const b = AppState.free.blocks.find(x => x.id === blockId);
  if (!b) return;
  b.machineId = newMachineId;
  const recs = Solver.getRecipesByMachine(newMachineId);
  b.recipeId = recs[0] ? recs[0].id : null;
  AppState.free.checkPerformed = false;
  AppState.free.lastCheckReport = null;
  renderAll(false);
  if (AppState.inspector.isOpen) renderMachineInspectorContent();
}

function changeFreeBlockGenerator(blockId, newGenId) {
  const b = AppState.free.blocks.find(x => x.id === blockId);
  if (!b) return;
  b.generatorId = newGenId;
  const gen = Solver.getPowerGenerators().find(g => g.id === newGenId);
  if (gen && gen.fuels.length > 0) {
    b.fuelItemId = gen.fuels[0].itemId;
  }
  AppState.free.checkPerformed = false;
  AppState.free.lastCheckReport = null;
  renderAll(false);
  if (AppState.inspector.isOpen) renderMachineInspectorContent();
}

function removeFreeBlock(blockId) {
  AppState.free.blocks = AppState.free.blocks.filter(x => x.id !== blockId);
  AppState.free.customEdges = (AppState.free.customEdges || []).filter(
    e => e.fromBlockId !== blockId && e.toBlockId !== blockId
  );
  AppState.free.checkPerformed = false;
  AppState.free.lastCheckReport = null;
  renderAll(false);
}

function duplicateFreeBlock(blockId, posOverride = null, skipAutoFit = false) {
  const src = AppState.free.blocks.find(x => x.id === blockId);
  if (!src) return null;
  const newId = uid();
  const clone = JSON.parse(JSON.stringify(src));
  clone.id = newId;
  if (posOverride && typeof posOverride.x === 'number' && typeof posOverride.y === 'number') {
    clone.x = Math.round(posOverride.x);
    clone.y = Math.round(posOverride.y);
  } else if (typeof clone.x === 'number' && typeof clone.y === 'number') {
    clone.x += 40;
    clone.y += 40;
  }
  AppState.free.blocks.push(clone);
  AppState.free.checkPerformed = false;
  AppState.free.lastCheckReport = null;
  renderAll(false);
  return newId;
}

function deleteCanvasCard(event, nodeId) {
  event.preventDefault();
  event.stopPropagation();
  const box = AppState.canvas.nodeMap.get(nodeId);
  if (!box?.node?.blockId) return;
  removeFreeBlock(box.node.blockId);
}

function openEdgeBeltMenu(event, edgeId) {
  event.preventDefault();
  event.stopPropagation();
  closeCanvasMenus();
  const edge = (AppState.free.customEdges || []).find(e => e.id === edgeId);
  const menu = document.getElementById('wire-drop-menu');
  if (!edge || !menu) return;

  const { belts, pipes } = Solver.getBeltsAndPipes();
  const item = edge.itemId ? Solver.getItem(edge.itemId) : null;
  const optionsList = item?.isFluid ? pipes : belts;

  menu.innerHTML = `
    <div class="context-menu-header">${item?.isFluid ? 'Tubulação' : 'Esteira'}</div>
    <button class="context-menu-item" onclick="insertSplitterOnEdge('${edge.id}')">
      ${item?.isFluid ? '🔩 Inserir Junção no meio' : '🔀 Inserir Divisor no meio'}
    </button>
    <div class="context-menu-divider"></div>
    ${optionsList.map(opt => `
      <button class="context-menu-item" onclick="setCustomEdgeBeltTier('${edge.id}', '${opt.id}')">
        ${opt.id === edge.beltTierId ? '✅ ' : ''}${opt.name.replace('Esteira de transporte ', 'Esteira ')} <small>(${opt.ratePerMin}/m)</small>
      </button>
    `).join('')}
    <div class="context-menu-divider"></div>
    <button class="context-menu-item" style="color:#ef4444;" onclick="removeCustomEdge('${edge.id}')">🗑️ Remover Conexão</button>
  `;
  positionFloatingMenu(menu, event.clientX, event.clientY);
  menu.classList.remove('hidden');
}

function insertSplitterOnEdge(edgeId) {
  const edges = AppState.free.customEdges || [];
  const idx = edges.findIndex(e => e.id === edgeId);
  if (idx === -1) return;
  const edge = edges[idx];
  const fromBox = AppState.canvas.nodeMap.get(edge.fromNodeId);
  const toBox = AppState.canvas.nodeMap.get(edge.toNodeId);
  const item = edge.itemId ? Solver.getItem(edge.itemId) : null;
  const isFluid = Boolean(item?.isFluid);

  const midX = (fromBox && toBox) ? Math.round((fromBox.x + toBox.x) / 2) : 800;
  const midY = (fromBox && toBox) ? Math.round((fromBox.y + toBox.y) / 2) : 600;

  closeCanvasMenus();

  const newBlockId = uid();
  AppState.free.blocks.push({
    id: newBlockId,
    blockType: isFluid ? 'pipe_junction' : 'splitter',
    logisticsId: isFluid ? 'Build_PipelineJunction_Cross_C' : 'Build_ConveyorAttachmentSplitter_C',
    itemId: edge.itemId || null,
    count: 1,
    clockPercent: 100,
    floor: 1,
    machinesPerFloor: 0,
    beltTierId: edge.beltTierId || 'Build_ConveyorBeltMk3_C',
    pipeTierId: edge.beltTierId || 'Build_Pipeline_C',
    x: midX,
    y: midY
  });

  const midNodeId = `free_${newBlockId}_0`;
  edges.splice(idx, 1,
    {
      id: uid(),
      fromNodeId: edge.fromNodeId,
      fromBlockId: edge.fromBlockId,
      toNodeId: midNodeId,
      toBlockId: newBlockId,
      itemId: edge.itemId || null,
      beltTierId: edge.beltTierId || null
    },
    {
      id: uid(),
      fromNodeId: midNodeId,
      fromBlockId: newBlockId,
      toNodeId: edge.toNodeId,
      toBlockId: edge.toBlockId,
      itemId: edge.itemId || null,
      beltTierId: edge.beltTierId || null
    }
  );

  AppState.free.checkPerformed = false;
  AppState.free.lastCheckReport = null;
  renderAll(false);
}

function convertProductionToFreeMode() {
  const graph = AppState.canvas.lastGraph;
  if (!graph || !Array.isArray(graph.columns) || graph.columns.length === 0) return;

  const newBlocks = [];
  const nodeIdToFree = new Map();
  const nodeMap = AppState.canvas.nodeMap || new Map();

  graph.columns.forEach((col) => {
    (col.nodes || []).forEach((node) => {
      const box = nodeMap.get(node.id);
      const pos = box ? { x: Math.round(box.x), y: Math.round(box.y) } : {};
      const blockId = uid();

      if (node.kind === 'extractor') {
        const resItem = node.resourceExtractInfo?.item || node.item;
        const exId = node.entity?.id || '';
        const minerMark = exId === 'Build_MinerMk3_C' ? 'mk3' : (exId === 'Build_MinerMk2_C' ? 'mk2' : 'mk1');
        newBlocks.push({
          id: blockId,
          blockType: 'extractor',
          itemId: resItem?.id || 'Desc_OreIron_C',
          minerMark,
          purity: 'normal',
          count: 1,
          clockPercent: 100,
          floor: 1,
          machinesPerFloor: 0,
          beltTierId: 'Build_ConveyorBeltMk3_C',
          pipeTierId: 'Build_Pipeline_C',
          ...pos
        });
        nodeIdToFree.set(node.id, { blockId, nodeId: `free_${blockId}_0` });
      } else if (node.kind === 'machine') {
        const stData = col.stageData;
        const recipeId = stData?.recipe?.id || null;
        const machineId = stData?.machine?.id || node.entity?.id || null;
        const clockPercent = stData?.clockPercent || 100;
        newBlocks.push({
          id: blockId,
          blockType: 'machine',
          machineId,
          recipeId,
          count: 1,
          clockPercent,
          sloops: 0,
          floor: 1,
          machinesPerFloor: 0,
          beltTierId: 'Build_ConveyorBeltMk3_C',
          pipeTierId: 'Build_Pipeline_C',
          ...pos
        });
        nodeIdToFree.set(node.id, { blockId, nodeId: `free_${blockId}_0` });
      } else if (node.kind === 'splitter' || node.kind === 'merger' || node.kind === 'pipe_junction') {
        const logId = node.kind === 'merger'
          ? 'Build_ConveyorAttachmentMerger_C'
          : (node.kind === 'pipe_junction' ? 'Build_PipelineJunction_Cross_C' : 'Build_ConveyorAttachmentSplitter_C');
        newBlocks.push({
          id: blockId,
          blockType: node.kind,
          logisticsId: logId,
          itemId: node.item?.id || null,
          count: 1,
          clockPercent: 100,
          floor: 1,
          machinesPerFloor: 0,
          beltTierId: 'Build_ConveyorBeltMk3_C',
          pipeTierId: 'Build_Pipeline_C',
          ...pos
        });
        nodeIdToFree.set(node.id, { blockId, nodeId: `free_${blockId}_0` });
      } else if (node.kind === 'final_product') {
        const finalItem = node.outputsList?.[0]?.item || node.entity;
        const isFluid = Boolean(finalItem?.isFluid);
        newBlocks.push({
          id: blockId,
          blockType: isFluid ? 'fluid_buffer_mk1' : 'storage_mk1',
          logisticsId: isFluid ? 'Build_PipeStorageTank_C' : 'Build_StorageContainerMk1_C',
          itemId: finalItem?.id || null,
          count: 1,
          clockPercent: 100,
          floor: 1,
          machinesPerFloor: 0,
          beltTierId: 'Build_ConveyorBeltMk3_C',
          pipeTierId: 'Build_Pipeline_C',
          ...pos
        });
        nodeIdToFree.set(node.id, { blockId, nodeId: `free_${blockId}_0` });
      }
    });
  });

  const newEdges = [];
  (graph.edges || []).forEach((e) => {
    const f = nodeIdToFree.get(e.from);
    const t = nodeIdToFree.get(e.to);
    if (!f || !t) return;
    newEdges.push({
      id: uid(),
      fromNodeId: f.nodeId,
      fromBlockId: f.blockId,
      toNodeId: t.nodeId,
      toBlockId: t.blockId,
      itemId: e.itemId || null,
      beltTierId: e.isPipe ? 'Build_Pipeline_C' : 'Build_ConveyorBeltMk3_C'
    });
  });

  AppState.free.blocks = newBlocks;
  AppState.free.customEdges = newEdges;
  AppState.free.checkPerformed = false;
  AppState.free.lastCheckReport = null;
  AppState.canvas.customPositions = {};
  switchMode('free');
}

function setCustomEdgeBeltTier(edgeId, beltTierId) {
  const edge = (AppState.free.customEdges || []).find(e => e.id === edgeId);
  if (!edge) return;
  edge.beltTierId = beltTierId;
  closeCanvasMenus();
  renderAll(false);
}

function removeCustomEdge(edgeId) {
  AppState.free.customEdges = (AppState.free.customEdges || []).filter(e => e.id !== edgeId);
  closeCanvasMenus();
  renderAll(false);
}

function runFreeModeCheck() {
  if (AppState.sidebarCollapsed) {
    toggleSidebarCollapse();
  }
  const report = Solver.analyzeFreeProject(AppState.free);
  AppState.free.checkPerformed = true;
  AppState.free.lastCheckReport = report;
  renderAll(false);
  setTimeout(() => {
    const repEl = document.querySelector('.check-report-box');
    if (repEl) repEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 60);
}

/* ============================================================================
 * MODAL VISUAL DE SELEÇÃO DE ITENS (COM ÍCONES MAIORES E NÍTIDOS)
 * ========================================================================== */

function initPickerEvents() {
  const searchInput = document.getElementById('picker-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      AppState.picker.searchQuery = e.target.value;
      renderPickerContent();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (AppState.excessModal.isOpen) closeExcessRecipeModal();
      if (AppState.picker.isOpen) closePickerModal();
      if (AppState.inspector.isOpen) closeMachineInspector();
      if (AppState.library.selectedId) {
        AppState.library.selectedId = null;
        if (AppState.mode === 'recipes') renderRecipesWorkspace();
  else renderLibraryWorkspace();
      }
      if (AppState.recipes.selectedId) {
        AppState.recipes.selectedId = null;
        renderRecipesWorkspace();
      }
      closeCanvasMenus();
    }
  });
}

function openPickerModal({ title, filterType = 'all', defaultCategory = 'Todos', prioritizeRaw = false, onSelect }) {
  AppState.picker.isOpen = true;
  AppState.picker.filterType = filterType;
  AppState.picker.selectedCategory = defaultCategory;
  AppState.picker.prioritizeRaw = Boolean(prioritizeRaw);
  AppState.picker.searchQuery = '';
  AppState.picker.callback = onSelect;

  const titleEl = document.getElementById('picker-title');
  if (titleEl) titleEl.textContent = title || 'Selecionar Item';

  const searchInput = document.getElementById('picker-search');
  if (searchInput) searchInput.value = '';

  const modal = document.getElementById('picker-modal');
  if (modal) modal.classList.remove('hidden');

  renderPickerCategories();
  renderPickerContent();
  setTimeout(() => searchInput && searchInput.focus(), 40);
}

function closePickerModal() {
  AppState.picker.isOpen = false;
  const modal = document.getElementById('picker-modal');
  if (modal) modal.classList.add('hidden');
}

function handleBackdropClick(e) {
  if (e.target && e.target.id === 'picker-modal') closePickerModal();
}

function getFilteredPickerItems() {
  let items = Solver.getAllItems();
  if (AppState.picker.filterType === 'craftable') {
    items = items.filter(it => (Solver.indexes.recipesByProduct.get(it.id) || []).length > 0);
  } else if (AppState.picker.filterType === 'raw_only') {
    items = items.filter(it => it.isRawResource);
  } else if (AppState.picker.filterType === 'raw_and_machines') {
    const rawItems = items
      .filter(it => it.isRawResource)
      .map(it => ({ ...it, category: 'Recursos Primários (Mapa)' }));
    const extractors = Solver.getExtractors()
      .map(ex => ({ ...ex, category: 'Máquinas de Extração', isRawResource: false }));
    const prodMachines = Solver.getProductionMachines()
      .map(m => ({ ...m, category: 'Máquinas de Produção', isRawResource: false }));
    return [...rawItems, ...extractors, ...prodMachines];
  }
  return items;
}

function renderPickerCategories() {
  const container = document.getElementById('picker-categories');
  if (!container) return;

  const items = getFilteredPickerItems();
  const uniqueCats = [...new Set(items.map(i => i.category))];
  uniqueCats.sort((a, b) => {
    if (a === 'Recursos Brutos') return -1;
    if (b === 'Recursos Brutos') return 1;
    return a.localeCompare(b, 'pt-BR');
  });
  const cats = ['Todos', ...uniqueCats];
  if (!cats.includes(AppState.picker.selectedCategory)) {
    AppState.picker.selectedCategory = 'Todos';
  }

  container.innerHTML = cats.map(cat => `
    <button
      type="button"
      class="cat-chip ${AppState.picker.selectedCategory === cat ? 'active' : ''}"
      onclick="selectPickerCategory('${cat.replace(/'/g, "\\'")}')"
    >
      ${cat}
    </button>
  `).join('');
}

function selectPickerCategory(cat) {
  AppState.picker.selectedCategory = cat;
  renderPickerCategories();
  renderPickerContent();
}

function renderPickerContent() {
  const grid = document.getElementById('picker-grid');
  if (!grid) return;

  const query = Solver.normalizeText(AppState.picker.searchQuery);
  let items = getFilteredPickerItems();

  if (AppState.picker.selectedCategory !== 'Todos' && !query) {
    items = items.filter(i => i.category === AppState.picker.selectedCategory);
  }
  if (query) {
    items = items.filter(i =>
      Solver.normalizeText(i.name).includes(query) ||
      Solver.normalizeText(i.nameEn || '').includes(query) ||
      Solver.normalizeText(i.category).includes(query)
    );
  }

  items.sort((a, b) => {
    if (AppState.picker.prioritizeRaw && AppState.picker.selectedCategory === 'Todos' && !query) {
      if (Boolean(a.isRawResource) !== Boolean(b.isRawResource)) {
        return a.isRawResource ? -1 : 1;
      }
    }
    return a.name.localeCompare(b.name, 'pt-BR');
  });

  if (items.length === 0) {
    grid.innerHTML = `<div class="picker-empty">Nenhum item encontrado para "${AppState.picker.searchQuery}".</div>`;
    return;
  }

  grid.innerHTML = items.map(item => `
    <button type="button" class="picker-item-card" onclick="choosePickerItem('${item.id}')">
      <div class="picker-item-img-wrap">
        ${renderShowcaseImage(item, 72)}
      </div>
      <div class="picker-item-name">${item.name}</div>
      <div class="picker-item-cat">${item.category}</div>
    </button>
  `).join('');
}

function choosePickerItem(itemId) {
  const cb = AppState.picker.callback;
  closePickerModal();
  if (typeof cb === 'function') cb(itemId);
}

/* ============================================================================
 * ABA 5: 📚 BIBLIOTECA COMPLETA DO JOGO (PT-BR)
 * ========================================================================== */

const LIB_CATEGORY_COLORS = {
  resources: '#0D9488',
  items: '#2563EB',
  'Peças & Componentes': '#2563EB',
  'Lingotes': '#475569',
  'Eletrônicos & Motores': '#4F46E5',
  'Fluidos & Refinaria': '#0891B2',
  'Biomassa': '#16A34A',
  'Elevador Espacial': '#7C3AED',
  'Nuclear': '#059669',
  'Quântico & Alienígena': '#9333EA',
  'Equipamentos': '#0284C7',
  'FICSMAS': '#E11D48',
  machines: '#4F46E5',
  generators: '#0891B2',
  logistics: '#0D9488',
  tools: '#6366F1',
  creatures: '#059669'
};

const LIB_PROGRESSION_ORDER = {
  resources: 1,
  'Lingotes': 2,
  'Peças & Componentes': 3,
  'Biomassa': 4,
  'Eletrônicos & Motores': 5,
  'Fluidos & Refinaria': 6,
  'Equipamentos': 7,
  'Elevador Espacial': 8,
  'Nuclear': 9,
  'Quântico & Alienígena': 10,
  'FICSMAS': 11,
  machines: 12,
  generators: 13,
  logistics: 14,
  tools: 15,
  creatures: 16
};

(function initLibraryLocalPrefs() {
  try {
    const favs = JSON.parse(localStorage.getItem('splus_lib_favorites') || '[]');
    if (Array.isArray(favs)) AppState.library.favorites = favs;
    const recs = JSON.parse(localStorage.getItem('splus_lib_recents') || '[]');
    if (Array.isArray(recs)) AppState.library.recents = recs;
  } catch {}
})();

function syncLibraryPrefsFromAccount(prefs) {
  if (!prefs) return;
  if (Array.isArray(prefs.libraryFavorites)) {
    AppState.library.favorites = [...new Set([...prefs.libraryFavorites, ...AppState.library.favorites])].slice(0, 250);
    try { localStorage.setItem('splus_lib_favorites', JSON.stringify(AppState.library.favorites)); } catch {}
  }
  if (Array.isArray(prefs.libraryRecents)) {
    AppState.library.recents = [...new Set([...prefs.libraryRecents, ...AppState.library.recents])].slice(0, 30);
    try { localStorage.setItem('splus_lib_recents', JSON.stringify(AppState.library.recents)); } catch {}
  }
  if (AppState.mode === 'library') renderAll(false);
}

function toggleLibraryFavorite(event, entryId) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const favs = AppState.library.favorites || [];
  const idx = favs.indexOf(entryId);
  if (idx >= 0) favs.splice(idx, 1);
  else favs.unshift(entryId);
  AppState.library.favorites = favs.slice(0, 250);
  try { localStorage.setItem('splus_lib_favorites', JSON.stringify(AppState.library.favorites)); } catch {}
  if (typeof saveAccountPreferences === 'function') {
    saveAccountPreferences({ libraryFavorites: AppState.library.favorites });
  }
  if (AppState.mode === 'recipes') renderRecipesWorkspace();
  else renderLibraryWorkspace();
}

function pushLibraryRecent(entryId) {
  const recs = (AppState.library.recents || []).filter(x => x !== entryId);
  recs.unshift(entryId);
  AppState.library.recents = recs.slice(0, 12);
  try { localStorage.setItem('splus_lib_recents', JSON.stringify(AppState.library.recents)); } catch {}
  if (typeof saveAccountPreferences === 'function') {
    saveAccountPreferences({ libraryRecents: AppState.library.recents });
  }
}

function getLibColor(entry) {
  if (entry.kind === 'items' && LIB_CATEGORY_COLORS[entry.subCategory]) {
    return LIB_CATEGORY_COLORS[entry.subCategory];
  }
  return LIB_CATEGORY_COLORS[entry.kind] || '#475569';
}

function libEsc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function highlightLibMatch(text, rawQuery) {
  const safe = libEsc(text);
  const q = Solver.normalizeText(rawQuery || '');
  if (!q) return safe;
  const norm = Solver.normalizeText(text || '');
  const idx = norm.indexOf(q);
  if (idx === -1) return safe;
  const orig = String(text || '');
  return libEsc(orig.slice(0, idx)) + '<mark class="lib-match">' + libEsc(orig.slice(idx, idx + q.length)) + '</mark>' + libEsc(orig.slice(idx + q.length));
}

let _libEntriesCache = null;

function getLibraryEntries() {
  if (_libEntriesCache) return _libEntriesCache;

  const allItems = Solver.getAllItems();
  const allRecipes = Object.values(window.SATISFACTORY_DATA?.recipes || {}).filter(r => !r.isFicsmas);

  const buildItemSearchMeta = (itemId) => {
    const prodRecs = allRecipes.filter(r => (r.products || []).some(p => p.item === itemId));
    const hasAlt = prodRecs.some(r => r.isAlternate);
    const machNames = [...new Set(prodRecs.map(r => Solver.getMachine(r.machine)?.name || '').filter(Boolean))];
    const ingNames = [...new Set(prodRecs.flatMap(r => (r.ingredients || []).map(i => {
      const it = Solver.getItem(i.item);
      return it ? `${it.name} ${it.nameEn || ''}` : '';
    })).filter(Boolean))];
    return { hasAlt, searchExtra: [...machNames, ...ingNames].join(' ') };
  };

  const rawResources = allItems
    .filter(it => it.isRawResource)
    .map(it => {
      const meta = buildItemSearchMeta(it.id);
      return {
        id: `res_${it.id}`,
        rawId: it.id,
        kind: 'resources',
        subCategory: 'Recursos Brutos',
        categoryLabel: 'Recursos',
        name: it.name,
        nameEn: it.nameEn || '',
        isFluid: Boolean(it.isFluid),
        hasAlt: meta.hasAlt,
        progressionRank: 1,
        entity: it,
        searchBlob: Solver.normalizeText(`${it.name} ${it.nameEn || ''} recursos ${meta.searchExtra}`),
        rawData: it
      };
    });

  const products = allItems
    .filter(it => !it.isRawResource)
    .map(it => {
      const meta = buildItemSearchMeta(it.id);
      const sub = it.category || 'Peças & Componentes';
      return {
        id: `item_${it.id}`,
        rawId: it.id,
        kind: 'items',
        subCategory: sub,
        categoryLabel: sub,
        name: it.name,
        nameEn: it.nameEn || '',
        isFluid: Boolean(it.isFluid),
        hasAlt: meta.hasAlt,
        progressionRank: LIB_PROGRESSION_ORDER[sub] || 8,
        entity: it,
        searchBlob: Solver.normalizeText(`${it.name} ${it.nameEn || ''} ${sub} ${meta.searchExtra}`),
        rawData: it
      };
    });

  const machines = [...Solver.getExtractors(), ...Solver.getProductionMachines()].map(m => ({
    id: `mach_${m.id}`,
    rawId: m.id,
    kind: 'machines',
    subCategory: 'Máquinas',
    categoryLabel: 'Máquinas',
    name: m.name,
    nameEn: m.nameEn || '',
    isFluid: false,
    hasAlt: false,
    progressionRank: 12,
    entity: m,
    searchBlob: Solver.normalizeText(`${m.name} ${m.nameEn || ''} maquinas extratores`),
    rawData: m
  }));

  const generators = Solver.getPowerGenerators().map(g => {
    const fuelsStr = (g.fuels || []).map(f => Solver.getItem(f.itemId || f.item)?.name || '').join(' ');
    return {
      id: `gen_${g.id}`,
      rawId: g.id,
      kind: 'generators',
      subCategory: 'Geradores',
      categoryLabel: 'Geradores',
      name: g.name,
      nameEn: g.nameEn || '',
      isFluid: false,
      hasAlt: false,
      progressionRank: 13,
      entity: g,
      searchBlob: Solver.normalizeText(`${g.name} ${g.nameEn || ''} geradores energia ${fuelsStr}`),
      rawData: g
    };
  });

  const { belts, pipes } = Solver.getBeltsAndPipes();
  const pipeImgMap = {
    Build_Pipeline_C: 'https://satisfactory.wiki.gg/images/Pipeline_Mk.1.png',
    Build_PipelineMK2_C: 'https://satisfactory.wiki.gg/images/Pipeline_Mk.2.png'
  };
  const logistics = [...belts, ...pipes].map(l => {
    const entityWithImg = l.wikiImage ? l : { ...l, wikiImage: pipeImgMap[l.id] || '' };
    const isPipe = String(l.id || '').toLowerCase().includes('pipe');
    return {
      id: `logi_${l.id}`,
      rawId: l.id,
      kind: 'logistics',
      subCategory: 'Esteiras & Tubos',
      categoryLabel: 'Esteiras & Tubos',
      name: l.name,
      nameEn: l.nameEn || '',
      isFluid: isPipe,
      hasAlt: false,
      progressionRank: 14,
      entity: entityWithImg,
      searchBlob: Solver.normalizeText(`${l.name} ${l.nameEn || ''} esteiras tubos logistica`),
      rawData: l
    };
  });

  const extra = window.SATISFACTORY_LIBRARY_EXTRA || { tools: [], creatures: [] };
  const tools = (extra.tools || []).map(t => ({
    id: t.id,
    rawId: t.id,
    kind: 'tools',
    subCategory: 'Ferramentas',
    categoryLabel: 'Ferramentas',
    name: t.name,
    nameEn: t.nameEn || '',
    isFluid: false,
    hasAlt: false,
    progressionRank: 15,
    entity: t,
    searchBlob: Solver.normalizeText(`${t.name} ${t.nameEn || ''} ferramentas equipamentos ${t.tier || ''}`),
    rawData: t
  }));

  const creatures = (extra.creatures || []).map(c => ({
    id: c.id,
    rawId: c.id,
    kind: 'creatures',
    subCategory: 'Fauna',
    categoryLabel: 'Fauna',
    name: c.name,
    nameEn: c.nameEn || '',
    isFluid: false,
    hasAlt: false,
    progressionRank: 16,
    entity: c,
    searchBlob: Solver.normalizeText(`${c.name} ${c.nameEn || ''} animais fauna ${c.behavior || ''}`),
    rawData: c
  }));

  _libEntriesCache = [
    ...rawResources,
    ...products,
    ...machines,
    ...generators,
    ...logistics,
    ...tools,
    ...creatures
  ];
  return _libEntriesCache;
}

function getFilteredLibraryEntries(allEntries, ignoreCategory = false) {
  const st = AppState.library;
  const query = Solver.normalizeText(st.searchQuery || '');
  const favSet = new Set(st.favorites || []);

  return allEntries.filter(e => {
    if (!ignoreCategory && st.category !== 'all') {
      if (st.category.startsWith('sub:')) {
        const subName = st.category.slice(4);
        if (e.kind !== 'items' || e.subCategory !== subName) return false;
      } else if (e.kind !== st.category) {
        return false;
      }
    }
    if (st.filterForm === 'solid' && e.isFluid) return false;
    if (st.filterForm === 'fluid' && !e.isFluid) return false;
    if (st.filterAltOnly && !e.hasAlt) return false;
    if (st.filterFavOnly && !favSet.has(e.id)) return false;
    if (query && !e.searchBlob.includes(query)) return false;
    return true;
  });
}

let _libSearchDebounce = null;
function setLibrarySearch(q) {
  AppState.library.searchQuery = q;
  AppState.library.focusedIndex = -1;
  if (_libSearchDebounce) clearTimeout(_libSearchDebounce);
  _libSearchDebounce = setTimeout(() => {
    if (AppState.mode === 'library') {
      updateLibrarySidebarCounts();
      if (AppState.mode === 'recipes') renderRecipesWorkspace();
  else renderLibraryWorkspace();
    }
  }, 100);
}

function setLibraryCategory(cat) {
  AppState.library.category = cat;
  AppState.library.focusedIndex = -1;
  renderAll(false);
}

function toggleLibraryItemsGroup(event) {
  if (event) event.stopPropagation();
  AppState.library.itemsExpanded = !AppState.library.itemsExpanded;
  renderAll(false);
}

function toggleLibraryFiltersOpen() {
  AppState.library.filtersOpen = !AppState.library.filtersOpen;
  renderAll(false);
}

function setLibraryFilter(field, val) {
  AppState.library[field] = val;
  AppState.library.focusedIndex = -1;
  renderAll(false);
}

function setLibraryViewMode(mode) {
  AppState.library.viewMode = mode;
  if (AppState.mode === 'recipes') renderRecipesWorkspace();
  else renderLibraryWorkspace();
}

function setLibraryCardSize(sz) {
  AppState.library.cardSize = sz;
  if (AppState.mode === 'recipes') renderRecipesWorkspace();
  else renderLibraryWorkspace();
}

function setLibrarySort(sortBy) {
  AppState.library.sortBy = sortBy;
  if (AppState.mode === 'recipes') renderRecipesWorkspace();
  else renderLibraryWorkspace();
}

function toggleLibrarySection(secKey) {
  AppState.library.collapsedSections[secKey] = !AppState.library.collapsedSections[secKey];
  if (AppState.mode === 'recipes') renderRecipesWorkspace();
  else renderLibraryWorkspace();
}

function selectLibraryEntry(entryId, fromHistory = false) {
  const st = AppState.library;
  if (!entryId || st.selectedId === entryId) {
    st.selectedId = null;
    st.detailHistory = [];
  } else {
    if (!fromHistory && st.selectedId && st.selectedId !== entryId) {
      st.detailHistory.push(st.selectedId);
      if (st.detailHistory.length > 25) st.detailHistory.shift();
    }
    st.selectedId = entryId;
    pushLibraryRecent(entryId);
  }
  if (AppState.mode === 'recipes') renderRecipesWorkspace();
  else renderLibraryWorkspace();
}

function navigateLibraryDetailBack() {
  const st = AppState.library;
  const prev = st.detailHistory.pop();
  if (prev) {
    st.selectedId = prev;
  } else {
    st.selectedId = null;
  }
  if (AppState.mode === 'recipes') renderRecipesWorkspace();
  else renderLibraryWorkspace();
}

function navigateLibraryToRawId(rawId) {
  const all = getLibraryEntries();
  const target = all.find(e => e.rawId === rawId);
  if (target) selectLibraryEntry(target.id);
}

function openRecipesForLibraryItem(itemName) {
  AppState.recipes.searchQuery = itemName || '';
  AppState.recipes.selectedId = null;
  switchMode('recipes');
}

function planItemFromLibrary(itemId, isRaw) {
  AppState.library.selectedId = null;
  if (isRaw) {
    AppState.production.driver = 'input';
    AppState.production.mounted = true;
    AppState.push.inputs = [
      {
        id: uid(),
        itemId,
        mode: 'extractor',
        minerMark: 'mk2',
        purity: 'normal',
        extractorCount: 1,
        clockPercent: 100,
        rate: 120
      }
    ];
  } else {
    AppState.production.driver = 'product';
    AppState.production.mounted = true;
    AppState.pull.targets = [{ id: uid(), itemId, rate: 30 }];
  }
  switchMode('production');
}

function openProductionMachinePicker() {
  const modal = document.getElementById('picker-modal');
  const titleEl = document.getElementById('picker-title');
  const searchEl = document.getElementById('picker-search');
  const catsEl = document.getElementById('picker-categories');
  const gridEl = document.getElementById('picker-grid');
  if (!modal || !gridEl) return;

  AppState.picker.isOpen = true;
  if (titleEl) titleEl.textContent = 'Escolher Máquina';
  if (searchEl) searchEl.value = '';
  if (catsEl) catsEl.innerHTML = '';

  const machines = Solver.getProductionMachines();
  const renderMachines = (q = '') => {
    const nq = Solver.normalizeText(q);
    const list = machines.filter(m => !nq || Solver.normalizeText(`${m.name} ${m.nameEn || ''}`).includes(nq));
    gridEl.innerHTML = list.map(m => {
      const recs = Solver.getRecipesByMachine(m.id);
      return `
        <button type="button" class="picker-item-card" onclick="openRecipesForSelectedMachine('${m.id}')">
          ${renderEntityIcon(m, 48)}
          <div class="picker-item-info">
            <strong>${m.name}</strong>
            <span>${recs.length} receita(s)</span>
          </div>
        </button>
      `;
    }).join('') || '<div class="picker-empty">Nenhuma máquina encontrada.</div>';
  };

  if (searchEl) {
    searchEl.oninput = (e) => renderMachines(e.target.value);
  }
  renderMachines('');
  modal.classList.remove('hidden');
  if (searchEl) setTimeout(() => searchEl.focus(), 40);
}

function openRecipesForSelectedMachine(machineId) {
  const titleEl = document.getElementById('picker-title');
  const searchEl = document.getElementById('picker-search');
  const catsEl = document.getElementById('picker-categories');
  const gridEl = document.getElementById('picker-grid');
  const mach = Solver.getMachine(machineId);
  if (!gridEl) return;

  if (titleEl) titleEl.textContent = `Receitas — ${mach ? mach.name : 'Máquina'}`;
  if (searchEl) searchEl.value = '';
  if (catsEl) {
    catsEl.innerHTML = `<button type="button" class="picker-cat-chip" onclick="openProductionMachinePicker()">← Máquinas</button>`;
  }

  const recs = Solver.getRecipesByMachine(machineId).filter(r => !r.isFicsmas);
  const renderRecs = (q = '') => {
    const nq = Solver.normalizeText(q);
    const list = recs.filter(r => !nq || Solver.normalizeText(`${r.cleanName || r.name} ${r.nameEn || ''}`).includes(nq));
    gridEl.innerHTML = list.map(r => {
      const mainProd = r.products?.[0];
      const item = mainProd ? Solver.getItem(mainProd.item) : null;
      const baseRate = mainProd ? (Number(mainProd.ratePerMin) || 30) : 30;
      return `
        <button type="button" class="picker-item-card" onclick="selectMachineRecipeForProduction('${mainProd ? mainProd.item : ''}', '${r.id}', ${baseRate})">
          ${item ? renderEntityIcon(item, 44) : ''}
          <div class="picker-item-info">
            <strong>${r.cleanName || r.name}${r.isAlternate ? ' ★' : ''}</strong>
            <span>${fmt(baseRate, 1)}/min</span>
          </div>
        </button>
      `;
    }).join('') || '<div class="picker-empty">Nenhuma receita encontrada.</div>';
  };

  if (searchEl) {
    searchEl.oninput = (e) => renderRecs(e.target.value);
  }
  renderRecs('');
}

function selectMachineRecipeForProduction(itemId, recipeId, baseRate) {
  closePickerModal();
  const searchEl = document.getElementById('picker-search');
  if (searchEl) searchEl.oninput = null;
  if (!itemId) return;
  planRecipeFromRecipesTab(itemId, recipeId, baseRate);
}

function planRecipeFromRecipesTab(itemId, recipeId, baseRate = null) {
  AppState.recipes.selectedId = null;
  AppState.production.driver = 'product';
  AppState.production.mounted = true;
  let rate = Number(baseRate);
  if (!rate || rate <= 0) {
    const rec = recipeId ? window.SATISFACTORY_DATA?.recipes?.[recipeId] : null;
    const prod = rec ? ((rec.products || []).find(p => p.item === itemId) || rec.products?.[0]) : null;
    rate = prod ? (Number(prod.ratePerMin) || 30) : 30;
  }
  AppState.pull.targets = [{ id: uid(), itemId, rate }];
  if (recipeId) {
    AppState.pull.recipeOverrides[itemId] = recipeId;
  }
  switchMode('production');
}

function getLibraryCategoryIcon(catId) {
  const d = window.SATISFACTORY_DATA || {};
  const ex = window.SATISFACTORY_LIBRARY_EXTRA || {};
  const map = {
    all: d.items?.Desc_SpaceElevatorPart_9_C?.wikiImage || d.items?.Desc_IronPlate_C?.wikiImage,
    resources: d.items?.Desc_OreIron_C?.wikiImage,
    items: d.items?.Desc_IronPlateReinforced_C?.wikiImage || d.items?.Desc_IronPlate_C?.wikiImage,
    machines: d.machines?.Build_ConstructorMk1_C?.wikiImage,
    generators: d.generators?.Build_GeneratorCoal_C?.wikiImage,
    logistics: (d.belts || [])[2]?.wikiImage || (d.belts || [])[0]?.wikiImage,
    tools: (ex.tools || [])[0]?.wikiImage,
    creatures: (ex.creatures || [])[0]?.wikiImage
  };
  return map[catId] || '';
}

function updateLibrarySidebarCounts() {
  const allEntries = getLibraryEntries();
  const matched = getFilteredLibraryEntries(allEntries, true);
  const countMap = new Map();
  countMap.set('all', matched.length);
  matched.forEach(e => {
    countMap.set(e.kind, (countMap.get(e.kind) || 0) + 1);
    if (e.kind === 'items') {
      const k = `sub:${e.subCategory}`;
      countMap.set(k, (countMap.get(k) || 0) + 1);
    }
  });
  document.querySelectorAll('[data-lib-cat-count]').forEach(el => {
    const key = el.getAttribute('data-lib-cat-count');
    const c = countMap.get(key) || 0;
    el.textContent = String(c);
    const btn = el.closest('.library-cat-btn');
    if (btn) btn.classList.toggle('is-empty', c === 0);
  });
}

function renderLibraryMode(sidebarEl, emptyOverlay) {
  emptyOverlay.classList.add('hidden');
  emptyOverlay.innerHTML = '';

  const st = AppState.library;
  const allEntries = getLibraryEntries();
  const matchedAll = getFilteredLibraryEntries(allEntries, true);

  const countByKind = (k) => k === 'all' ? matchedAll.length : matchedAll.filter(e => e.kind === k).length;

  // Subcategorias reais de "Itens & Produtos"
  const subNames = [...new Set(allEntries.filter(e => e.kind === 'items').map(e => e.subCategory))]
    .sort((a, b) => (LIB_PROGRESSION_ORDER[a] || 99) - (LIB_PROGRESSION_ORDER[b] || 99));

  const cats = [
    { id: 'all', label: 'Tudo', color: '#475569' },
    { id: 'resources', label: 'Recursos', color: LIB_CATEGORY_COLORS.resources },
    { id: 'items', label: 'Itens & Produtos', color: LIB_CATEGORY_COLORS.items, expandable: true },
    { id: 'machines', label: 'Máquinas', color: LIB_CATEGORY_COLORS.machines },
    { id: 'generators', label: 'Geradores', color: LIB_CATEGORY_COLORS.generators },
    { id: 'logistics', label: 'Esteiras & Tubos', color: LIB_CATEGORY_COLORS.logistics },
    { id: 'tools', label: 'Ferramentas', color: LIB_CATEGORY_COLORS.tools },
    { id: 'creatures', label: 'Fauna', color: LIB_CATEGORY_COLORS.creatures }
  ];

  const activeFiltersCount = (st.filterForm !== 'all' ? 1 : 0) + (st.filterAltOnly ? 1 : 0) + (st.filterFavOnly ? 1 : 0);

  sidebarEl.innerHTML = `
    <div class="sidebar-step-block lib-sidebar-search-block">
      <input
        id="lib-search-input"
        type="text"
        class="sidebar-input"
        placeholder="Buscar (PT ou EN)... [/]"
        value="${libEsc(st.searchQuery)}"
        oninput="setLibrarySearch(this.value)"
      />
      <button type="button" class="lib-filters-toggle ${st.filtersOpen || activeFiltersCount > 0 ? 'active' : ''}" onclick="toggleLibraryFiltersOpen()">
        <span>Filtros${activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}</span>
        <span>${st.filtersOpen ? '▾' : '▸'}</span>
      </button>
      ${st.filtersOpen ? `
        <div class="lib-filter-chips">
          <button type="button" class="am-qf-chip ${st.filterForm === 'all' ? 'active' : ''}" onclick="setLibraryFilter('filterForm', 'all')">Todos</button>
          <button type="button" class="am-qf-chip ${st.filterForm === 'solid' ? 'active' : ''}" onclick="setLibraryFilter('filterForm', 'solid')">Sólido</button>
          <button type="button" class="am-qf-chip ${st.filterForm === 'fluid' ? 'active' : ''}" onclick="setLibraryFilter('filterForm', 'fluid')">💧 Fluido</button>
          <button type="button" class="am-qf-chip ${st.filterAltOnly ? 'active' : ''}" onclick="setLibraryFilter('filterAltOnly', ${!st.filterAltOnly})">ALT</button>
          <button type="button" class="am-qf-chip ${st.filterFavOnly ? 'active' : ''}" onclick="setLibraryFilter('filterFavOnly', ${!st.filterFavOnly})">★ Favoritos</button>
        </div>
      ` : ''}
    </div>

    <div class="library-cat-list">
      ${cats.map(c => {
        const cnt = countByKind(c.id);
        const iconUrl = getLibraryCategoryIcon(c.id);
        const isActive = st.category === c.id;
        const subHtml = (c.expandable && st.itemsExpanded) ? `
          <div class="library-subcat-list">
            ${subNames.map(sub => {
              const subKey = `sub:${sub}`;
              const subCnt = matchedAll.filter(e => e.kind === 'items' && e.subCategory === sub).length;
              const subColor = LIB_CATEGORY_COLORS[sub] || '#2563EB';
              return `
                <button
                  type="button"
                  class="library-cat-btn library-subcat-btn ${st.category === subKey ? 'active' : ''} ${subCnt === 0 ? 'is-empty' : ''}"
                  onclick="setLibraryCategory('${libEsc(subKey)}')"
                >
                  <span class="lib-cat-left">
                    <span class="lib-cat-dot" style="background:${subColor};"></span>
                    <span>${libEsc(sub)}</span>
                  </span>
                  <span class="library-cat-count" data-lib-cat-count="${libEsc(subKey)}">${subCnt}</span>
                </button>
              `;
            }).join('')}
          </div>
        ` : '';

        return `
          <div class="library-cat-group">
            <button
              type="button"
              class="library-cat-btn ${isActive ? 'active' : ''} ${cnt === 0 ? 'is-empty' : ''}"
              onclick="${c.expandable ? `if (AppState.library.category === 'items') { toggleLibraryItemsGroup(event); } else { AppState.library.itemsExpanded = true; setLibraryCategory('items'); }` : `setLibraryCategory('${c.id}')`}"
            >
              <span class="lib-cat-left">
                ${c.id !== 'all' ? `<span class="lib-cat-dot" style="background:${c.color};"></span>` : ''}
                ${iconUrl ? `<img class="lib-cat-img" src="${iconUrl}" alt="" loading="lazy" />` : ''}
                <span>${c.label}</span>
              </span>
              <span class="lib-cat-right">
                ${c.expandable ? `<span class="lib-cat-chevron" onclick="toggleLibraryItemsGroup(event)">${st.itemsExpanded ? '▾' : '▸'}</span>` : ''}
                <span class="library-cat-count" data-lib-cat-count="${c.id}">${cnt}</span>
              </span>
            </button>
            ${subHtml}
          </div>
        `;
      }).join('')}
    </div>
  `;

  renderLibraryWorkspace(allEntries);
}

function renderLibraryDetailPanel(entry) {
  if (!entry) return '';
  const st = AppState.library;
  const favSet = new Set(st.favorites || []);
  const isFav = favSet.has(entry.id);
  const catColor = getLibColor(entry);
  const d = entry.rawData || {};

  let statsHtml = '';
  let bodyHtml = '';

  const clickableItemChip = (itemId, labelOverride = null) => {
    const it = Solver.getItem(itemId);
    if (!it) return libEsc(labelOverride || itemId);
    return `
      <button type="button" class="lib-link-chip" onclick="navigateLibraryToRawId('${it.id}')">
        ${renderEntityIcon(it, 18)}
        <span>${libEsc(labelOverride || it.name)}</span>
      </button>
    `;
  };

  if (entry.kind === 'resources' || entry.kind === 'items') {
    const stats = [];
    stats.push({ k: 'Forma', v: d.isFluid ? '💧 Fluido' : 'Sólido' });
    if (d.stackSize) stats.push({ k: 'Pilha', v: String(d.stackSize) });
    if (d.sinkPoints > 0) stats.push({ k: 'Pontos SUPIMPA', v: fmt(d.sinkPoints, 0) });
    if (d.energyMj > 0) stats.push({ k: 'Energia', v: `${fmt(d.energyMj, 0)} MJ` });
    if (d.radioactive > 0) stats.push({ k: 'Radioatividade', v: fmt(d.radioactive, 2) });

    statsHtml = stats.length ? `
      <div class="lib-detail-stats">
        ${stats.map(s => `<div class="lib-stat-pill"><span>${s.k}</span><strong>${s.v}</strong></div>`).join('')}
      </div>
    ` : '';

    const prodRecs = Solver.indexes.recipesByProduct.get(entry.rawId) || [];
    const usedInRecs = Object.values(window.SATISFACTORY_DATA?.recipes || {})
      .filter(r => !r.isFicsmas && (r.ingredients || []).some(i => i.item === entry.rawId));
    const isRaw = entry.kind === 'resources';

    const renderRecBlock = (r) => {
      const m = Solver.getMachine(r.machine);
      const ings = (r.ingredients || []).map(i => `<span class="lib-rec-io-item">${clickableItemChip(i.item)} <small>${fmt(i.ratePerMin, 1)}/m</small></span>`).join('');
      const prods = (r.products || []).map(p => `<span class="lib-rec-io-item">${clickableItemChip(p.item)} <small>${fmt(p.ratePerMin, 1)}/m</small></span>`).join('');
      return `
        <div class="lib-rec-card">
          <div class="lib-rec-head">
            <strong>${libEsc(r.cleanName || r.name)}</strong>
            ${r.isAlternate ? '<span class="am-alt-badge">ALT</span>' : ''}
            <span class="lib-rec-mach">${libEsc(m?.name || '')}</span>
          </div>
          <div class="lib-rec-flow">${ings} <span class="lib-rec-arrow">→</span> ${prods}</div>
        </div>
      `;
    };

    bodyHtml = `
      ${d.description ? `<p class="lib-detail-desc">${libEsc(d.description)}</p>` : ''}
      <div class="lib-detail-actions">
        ${(isRaw || prodRecs.length > 0) ? `
          <button type="button" class="btn-small-accent" onclick="planItemFromLibrary('${entry.rawId}', ${isRaw})">Planejar</button>
        ` : ''}
        <button type="button" class="btn-icon-action" onclick="openRecipesForLibraryItem('${libEsc(entry.name)}')">Receitas</button>
      </div>
      <div class="lib-detail-sec">
        <h4>Como produzir (${prodRecs.length})</h4>
        ${prodRecs.length > 0 ? prodRecs.map(renderRecBlock).join('') : '<div class="lib-empty-note">Recurso extraído diretamente do mapa.</div>'}
      </div>
      <div class="lib-detail-sec">
        <h4>Onde é usado (${usedInRecs.length})</h4>
        ${usedInRecs.length > 0 ? usedInRecs.slice(0, 14).map(renderRecBlock).join('') : '<div class="lib-empty-note">Uso direto / produto final.</div>'}
      </div>
    `;
  } else if (entry.kind === 'machines') {
    const recs = Solver.getRecipesByMachine(d.id);
    const stats = [];
    if (d.powerConsumption || d.basePowerMw || d.powerMw) {
      stats.push({ k: 'Consumo', v: `${fmt(d.powerConsumption || d.basePowerMw || d.powerMw, 1)} MW` });
    }
    if (d.sloopSlots > 0) stats.push({ k: 'Somersloop', v: `${d.sloopSlots} slot(s)` });
    statsHtml = stats.length ? `<div class="lib-detail-stats">${stats.map(s => `<div class="lib-stat-pill"><span>${s.k}</span><strong>${s.v}</strong></div>`).join('')}</div>` : '';
    const buildCost = Array.isArray(d.buildCost) ? d.buildCost : [];
    bodyHtml = `
      ${d.description ? `<p class="lib-detail-desc">${libEsc(d.description)}</p>` : ''}
      ${buildCost.length > 0 ? `
        <div class="lib-detail-sec">
          <h4>Custo de construção</h4>
          <div class="lib-cost-row">
            ${buildCost.map(bc => `<span class="lib-rec-io-item">${clickableItemChip(bc.item)} <small>×${bc.amount}</small></span>`).join('')}
          </div>
        </div>
      ` : ''}
      <div class="lib-detail-sec">
        <h4>Receitas (${recs.length})</h4>
        <div class="lib-rec-tags">
          ${recs.length > 0 ? recs.slice(0, 30).map(r => `<span class="lib-tag-pill">${libEsc(r.cleanName || r.name)}${r.isAlternate ? ' ★' : ''}</span>`).join('') : '<div class="lib-empty-note">Extração direta.</div>'}
        </div>
      </div>
    `;
  } else if (entry.kind === 'generators') {
    const stats = [{ k: 'Geração', v: `${fmt(d.powerProduction || d.powerProductionMw || 0, 1)} MW` }];
    statsHtml = `<div class="lib-detail-stats">${stats.map(s => `<div class="lib-stat-pill"><span>${s.k}</span><strong>${s.v}</strong></div>`).join('')}</div>`;
    const fuels = d.fuels || [];
    bodyHtml = `
      <div class="lib-detail-sec">
        <h4>Combustíveis (${fuels.length})</h4>
        <div class="lib-cost-row">
          ${fuels.map(f => `<span class="lib-rec-io-item">${clickableItemChip(f.itemId || f.item)} <small>${fmt(f.ratePerMin || 0, 1)}/m</small></span>`).join('')}
        </div>
      </div>
    `;
  } else if (entry.kind === 'logistics') {
    const stats = [{ k: 'Vazão', v: `${fmt(d.ratePerMin || 0, 0)} ${entry.isFluid ? 'm³' : 'un'}/min` }];
    statsHtml = `<div class="lib-detail-stats">${stats.map(s => `<div class="lib-stat-pill"><span>${s.k}</span><strong>${s.v}</strong></div>`).join('')}</div>`;
  } else if (entry.kind === 'tools' || entry.kind === 'creatures') {
    const stats = [];
    if (d.tier) stats.push({ k: 'Desbloqueio', v: d.tier });
    if (d.slot) stats.push({ k: 'Slot', v: d.slot });
    if (d.damage) stats.push({ k: 'Efeito', v: d.damage });
    if (d.behavior) stats.push({ k: 'Comportamento', v: d.behavior });
    if (d.hp) stats.push({ k: 'Vida', v: d.hp });
    if (d.drop) stats.push({ k: 'Drop', v: d.drop });
    statsHtml = stats.length ? `<div class="lib-detail-stats">${stats.map(s => `<div class="lib-stat-pill"><span>${s.k}</span><strong>${libEsc(s.v)}</strong></div>`).join('')}</div>` : '';
    bodyHtml = d.desc ? `<p class="lib-detail-desc">${libEsc(d.desc)}</p>` : '';
  }

  const isFauna = entry.kind === 'creatures';
  return `
    <aside class="lib-side-detail ${isFauna ? 'is-fauna' : ''}" aria-label="Detalhes do item">
      <div class="lib-side-detail-top">
        <div class="lib-side-top-left">
          ${st.detailHistory.length > 0 ? `<button type="button" class="btn-icon-action" onclick="navigateLibraryDetailBack()">← Voltar</button>` : ''}
          <span class="lib-cat-dot" style="background:${catColor};"></span>
          <span class="lib-side-cat">${libEsc(entry.categoryLabel)}</span>
        </div>
        <div class="lib-side-top-right">
          <button type="button" class="lib-fav-btn ${isFav ? 'active' : ''}" onclick="toggleLibraryFavorite(event, '${entry.id}')" title="Favoritar">${isFav ? '★' : '☆'}</button>
          <button type="button" class="icon-close" onclick="selectLibraryEntry('${entry.id}')" aria-label="Fechar">✕</button>
        </div>
      </div>
      <div class="lib-side-hero ${isFauna ? 'fauna-hero' : ''}">
        ${entry.entity ? renderShowcaseImage(entry.entity, isFauna ? 160 : 96) : ''}
        <div>
          <h3>${libEsc(entry.name)}</h3>
          ${entry.nameEn && entry.nameEn.toLowerCase() !== entry.name.toLowerCase() ? `<div class="lib-name-en">${libEsc(entry.nameEn)}</div>` : ''}
        </div>
      </div>
      ${statsHtml}
      <div class="lib-side-body">${bodyHtml}</div>
    </aside>
  `;
}

let _lastRenderedLibFlatIds = [];

function renderLibraryWorkspace(cachedEntries = null) {
  const view = document.getElementById('library-workspace-view');
  if (!view) return;

  const st = AppState.library;
  const allEntries = cachedEntries || getLibraryEntries();
  let filtered = getFilteredLibraryEntries(allEntries, false);

  // Ordenação
  if (st.sortBy === 'az') {
    filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  } else if (st.sortBy === 'category') {
    filtered = [...filtered].sort((a, b) => a.categoryLabel.localeCompare(b.categoryLabel, 'pt-BR') || a.name.localeCompare(b.name, 'pt-BR'));
  } else {
    filtered = [...filtered].sort((a, b) => (a.progressionRank - b.progressionRank) || a.name.localeCompare(b.name, 'pt-BR'));
  }

  _lastRenderedLibFlatIds = filtered.map(e => e.id);
  const favSet = new Set(st.favorites || []);
  const selectedEntry = st.selectedId ? allEntries.find(e => e.id === st.selectedId) : null;

  const renderCard = (entry, flatIdx) => {
    const color = getLibColor(entry);
    const isFav = favSet.has(entry.id);
    const isSel = st.selectedId === entry.id;
    const isFocused = st.focusedIndex === flatIdx;
    const imgSize = st.viewMode === 'list' ? 28 : (st.cardSize === 'sm' ? 40 : (st.cardSize === 'lg' ? 68 : 52));
    const nameHtml = highlightLibMatch(entry.name, st.searchQuery);

    if (st.viewMode === 'list') {
      return `
        <div
          class="lib-list-row ${isSel ? 'active' : ''} ${isFocused ? 'kb-focus' : ''}"
          style="--lib-cat-color:${color};"
          onclick="selectLibraryEntry('${entry.id}')"
        >
          <span class="lib-cat-dot" style="background:${color};"></span>
          ${entry.entity ? renderEntityIcon(entry.entity, imgSize) : ''}
          <strong class="lib-list-name">${nameHtml}${entry.isFluid ? ' <span class="lib-fluid-drop" title="Fluido">💧</span>' : ''}</strong>
          <span class="lib-list-cat">${libEsc(entry.categoryLabel)}</span>
          <button type="button" class="lib-fav-btn ${isFav ? 'active' : ''}" onclick="toggleLibraryFavorite(event, '${entry.id}')" title="Favoritar">${isFav ? '★' : '☆'}</button>
        </div>
      `;
    }

    return `
      <div
        role="button"
        tabindex="0"
        class="lib-card lib-view-${st.viewMode} lib-size-${st.cardSize} ${isSel ? 'active' : ''} ${isFocused ? 'kb-focus' : ''}"
        style="--lib-cat-color:${color};"
        onclick="selectLibraryEntry('${entry.id}')"
        onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectLibraryEntry('${entry.id}');}"
      >
        <div class="lib-card-strip" style="background:${color};"></div>
        <button type="button" class="lib-fav-btn lib-card-fav ${isFav ? 'active' : ''}" onclick="toggleLibraryFavorite(event, '${entry.id}')" title="Favoritar">${isFav ? '★' : '☆'}</button>
        ${entry.isFluid ? '<span class="lib-fluid-drop lib-card-drop" title="Fluido">💧</span>' : ''}
        <div class="lib-card-icon">
          ${entry.entity ? renderEntityIcon(entry.entity, imgSize) : ''}
        </div>
        <strong class="lib-card-name">${nameHtml}</strong>
        ${st.viewMode === 'cards' ? `<span class="lib-card-sub">${libEsc(entry.categoryLabel)}</span>` : ''}
      </div>
    `;
  };

  // Seções recolhíveis quando em "Tudo" ou "Itens & Produtos" sem busca estreita
  const useSections = (st.category === 'all' || st.category === 'items') && st.sortBy !== 'az';
  let contentHtml = '';

  // Seção Recentes (quando sem busca e na visão Tudo)
  const recentEntries = (!st.searchQuery && st.category === 'all' && !st.filterFavOnly && (st.recents || []).length > 0)
    ? st.recents.map(id => allEntries.find(e => e.id === id)).filter(Boolean).slice(0, 8)
    : [];

  if (recentEntries.length > 0) {
    const collapsed = Boolean(st.collapsedSections['__recents']);
    contentHtml += `
      <section class="lib-section">
        <button type="button" class="lib-section-head" onclick="toggleLibrarySection('__recents')">
          <span class="lib-sec-title">Recentes <small>(${recentEntries.length})</small></span>
          <span>${collapsed ? '▸' : '▾'}</span>
        </button>
        ${!collapsed ? `
          <div class="lib-items-container lib-view-${st.viewMode} lib-size-${st.cardSize}">
            ${recentEntries.map(e => renderCard(e, -1)).join('')}
          </div>
        ` : ''}
      </section>
    `;
  }

  if (filtered.length === 0) {
    contentHtml += '<div class="picker-empty">Nenhum resultado encontrado.</div>';
  } else if (useSections) {
    const groups = new Map();
    filtered.forEach((e, idx) => {
      const gKey = st.category === 'items' ? e.subCategory : e.categoryLabel;
      if (!groups.has(gKey)) groups.set(gKey, { color: getLibColor(e), items: [] });
      groups.get(gKey).items.push({ entry: e, idx });
    });

    for (const [gName, gData] of groups.entries()) {
      const collapsed = Boolean(st.collapsedSections[gName]);
      contentHtml += `
        <section class="lib-section">
          <button type="button" class="lib-section-head" onclick="toggleLibrarySection('${libEsc(gName)}')">
            <span class="lib-sec-title">
              <span class="lib-cat-dot" style="background:${gData.color};"></span>
              ${libEsc(gName)} <small>(${gData.items.length})</small>
            </span>
            <span>${collapsed ? '▸' : '▾'}</span>
          </button>
          ${!collapsed ? `
            <div class="lib-items-container lib-view-${st.viewMode} lib-size-${st.cardSize}">
              ${gData.items.map(x => renderCard(x.entry, x.idx)).join('')}
            </div>
          ` : ''}
        </section>
      `;
    }
  } else {
    contentHtml += `
      <div class="lib-items-container lib-view-${st.viewMode} lib-size-${st.cardSize}">
        ${filtered.map((e, idx) => renderCard(e, idx)).join('')}
      </div>
    `;
  }

  view.innerHTML = `
    <div class="lib-shell ${selectedEntry ? 'has-detail' : ''}">
      <div class="lib-main-col">
        <div class="lib-toolbar">
          <span class="lib-count-label">${filtered.length} item(ns)</span>
          <div class="lib-toolbar-controls">
            <select class="lib-sort-select" onchange="setLibrarySort(this.value)" aria-label="Ordenar">
              <option value="progression" ${st.sortBy === 'progression' ? 'selected' : ''}>Progressão</option>
              <option value="az" ${st.sortBy === 'az' ? 'selected' : ''}>A–Z</option>
              <option value="category" ${st.sortBy === 'category' ? 'selected' : ''}>Categoria</option>
            </select>
            <div class="lib-seg-group" role="group" aria-label="Visualização">
              <button type="button" class="lib-seg-btn ${st.viewMode === 'grid' ? 'active' : ''}" onclick="setLibraryViewMode('grid')" title="Grade compacta">⊞</button>
              <button type="button" class="lib-seg-btn ${st.viewMode === 'list' ? 'active' : ''}" onclick="setLibraryViewMode('list')" title="Lista">☰</button>
              <button type="button" class="lib-seg-btn ${st.viewMode === 'cards' ? 'active' : ''}" onclick="setLibraryViewMode('cards')" title="Cards">▭</button>
            </div>
            ${st.viewMode !== 'list' ? `
              <div class="lib-seg-group" role="group" aria-label="Tamanho">
                <button type="button" class="lib-seg-btn ${st.cardSize === 'sm' ? 'active' : ''}" onclick="setLibraryCardSize('sm')" title="Pequeno">P</button>
                <button type="button" class="lib-seg-btn ${st.cardSize === 'md' ? 'active' : ''}" onclick="setLibraryCardSize('md')" title="Médio">M</button>
                <button type="button" class="lib-seg-btn ${st.cardSize === 'lg' ? 'active' : ''}" onclick="setLibraryCardSize('lg')" title="Grande">G</button>
              </div>
            ` : ''}
          </div>
        </div>
        <div class="lib-scroll-area">${contentHtml}</div>
      </div>
      ${renderLibraryDetailPanel(selectedEntry)}
    </div>
  `;
}

// Atalhos de teclado da Biblioteca: "/" busca, Setas navegam, Enter abre, ESC fecha
document.addEventListener('keydown', (e) => {
  if (AppState.mode !== 'library') return;
  const tag = (e.target && e.target.tagName || '').toLowerCase();
  const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select';

  if (e.key === '/' && !isTyping) {
    e.preventDefault();
    const inp = document.getElementById('lib-search-input');
    if (inp) { inp.focus(); inp.select(); }
    return;
  }
  if (e.key === 'Escape' && AppState.library.selectedId) {
    e.preventDefault();
    AppState.library.selectedId = null;
    AppState.library.detailHistory = [];
    if (AppState.mode === 'recipes') renderRecipesWorkspace();
  else renderLibraryWorkspace();
    return;
  }
  if (isTyping || _lastRenderedLibFlatIds.length === 0) return;

  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault();
    AppState.library.focusedIndex = (AppState.library.focusedIndex + 1) % _lastRenderedLibFlatIds.length;
    if (AppState.mode === 'recipes') renderRecipesWorkspace();
  else renderLibraryWorkspace();
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    const len = _lastRenderedLibFlatIds.length;
    AppState.library.focusedIndex = (AppState.library.focusedIndex - 1 + len) % len;
    if (AppState.mode === 'recipes') renderRecipesWorkspace();
  else renderLibraryWorkspace();
  } else if (e.key === 'Enter' && AppState.library.focusedIndex >= 0) {
    e.preventDefault();
    const id = _lastRenderedLibFlatIds[AppState.library.focusedIndex];
    if (id) selectLibraryEntry(id);
  }
});

/* ============================================================================
 * ABA 6: 📜 RECEITAS (REAPROVEITA COMPONENTES E PREFERÊNCIAS DA BIBLIOTECA)
 * ========================================================================== */

let _recipeGroupsCache = null;
let _lastRenderedRecipeIds = [];
let _recipeSearchDebounce = null;

function getGroupedRecipeProducts(allRecipes) {
  if (_recipeGroupsCache && !allRecipes) return _recipeGroupsCache;
  const recs = allRecipes || Object.values(window.SATISFACTORY_DATA?.recipes || {});
  const groupsMap = new Map();

  recs.forEach((r) => {
    const prods = r.products || [];
    prods.forEach((prod, pIdx) => {
      if (!prod || !prod.item) return;
      const item = Solver.getItem(prod.item);
      if (!item) return;
      const isByproduct = pIdx > 0;

      if (!groupsMap.has(item.id)) {
        const sub = item.category || 'Peças & Componentes';
        groupsMap.set(item.id, {
          id: item.id,
          favKey: `item_${item.id}`,
          item,
          category: sub,
          color: LIB_CATEGORY_COLORS[sub] || '#2563EB',
          progressionRank: LIB_PROGRESSION_ORDER[sub] || 8,
          baseRecipes: [],
          alternates: [],
          byproductRecipes: [],
          allRecipes: [],
          isFicsmasOnly: true,
          hasByproductSource: false,
          machinesSet: new Set()
        });
      }
      const g = groupsMap.get(item.id);
      if (!r.isFicsmas) g.isFicsmasOnly = false;
      if (!g.allRecipes.some(x => x.id === r.id)) {
        g.allRecipes.push(r);
        if (r.machine) g.machinesSet.add(r.machine);
        if (isByproduct) {
          g.hasByproductSource = true;
          g.byproductRecipes.push(r);
        }
        if (r.isAlternate) g.alternates.push(r);
        else g.baseRecipes.push(r);
      }
    });
  });

  const list = [...groupsMap.values()].map(g => {
    const recTexts = g.allRecipes.map(r => {
      const m = Solver.getMachine(r.machine);
      const io = [...(r.ingredients || []), ...(r.products || [])].map(x => {
        const it = Solver.getItem(x.item);
        return it ? `${it.name} ${it.nameEn || ''}` : '';
      }).join(' ');
      return `${r.cleanName || r.name} ${r.nameEn || ''} ${m ? `${m.name} ${m.nameEn || ''}` : ''} ${io}`;
    }).join(' ');
    g.searchBlob = Solver.normalizeText(`${g.item.name} ${g.item.nameEn || ''} ${g.category} ${recTexts}`);
    g.machines = [...g.machinesSet];
    return g;
  });

  if (!allRecipes) _recipeGroupsCache = list;
  return list;
}

function getFilteredRecipeGroups(allGroups, opts = {}) {
  const st = AppState.recipes;
  const q = Solver.normalizeText(st.searchQuery || '');
  const favSet = new Set(AppState.library.favorites || []);

  return allGroups.filter(g => {
    // Critério consistente: "Todos" e "Com alternativas" excluem produtos exclusivos de Evento (FICSMAS);
    // "Evento (FICSMAS)" exibe exclusivamente os produtos FICSMAS.
    if (!opts.ignoreFilter) {
      if (st.filter === 'ficsmas') {
        if (!g.isFicsmasOnly) return false;
      } else {
        if (g.isFicsmasOnly) return false;
        if (st.filter === 'alternate' && g.alternates.length === 0) return false;
      }
    }
    if (!opts.ignoreCategory && st.category !== 'all' && g.category !== st.category) return false;
    if (!opts.ignoreMachine && Array.isArray(st.machineFilters) && st.machineFilters.length > 0) {
      if (!g.machines.some(mId => st.machineFilters.includes(mId))) return false;
    }
    if (st.byproductOnly && !g.hasByproductSource) return false;
    if (st.favOnly && !favSet.has(g.favKey)) return false;
    if (q && !g.searchBlob.includes(q)) return false;
    return true;
  });
}

function setRecipeFilter(f) {
  AppState.recipes.filter = f;
  AppState.recipes.selectedId = null;
  renderAll(false);
}

function setRecipeCategory(cat) {
  AppState.recipes.category = cat;
  renderAll(false);
}

function toggleRecipeMachineFilter(mId) {
  const arr = AppState.recipes.machineFilters || [];
  const idx = arr.indexOf(mId);
  if (idx >= 0) arr.splice(idx, 1);
  else arr.push(mId);
  AppState.recipes.machineFilters = arr;
  renderAll(false);
}

function clearRecipeMachineFilters() {
  AppState.recipes.machineFilters = [];
  renderAll(false);
}

function toggleRecipeFiltersOpen() {
  AppState.recipes.filtersOpen = !AppState.recipes.filtersOpen;
  renderAll(false);
}

function setRecipeFlag(field, val) {
  AppState.recipes[field] = val;
  renderAll(false);
}

function setRecipeViewMode(mode) {
  AppState.recipes.viewMode = mode;
  renderRecipesWorkspace();
}

function setRecipeCardSize(sz) {
  AppState.recipes.cardSize = sz;
  renderRecipesWorkspace();
}

function setRecipeSort(sortBy) {
  AppState.recipes.sortBy = sortBy;
  renderRecipesWorkspace();
}

function toggleRecipeSection(secKey) {
  AppState.recipes.collapsedSections[secKey] = !AppState.recipes.collapsedSections[secKey];
  renderRecipesWorkspace();
}

function toggleRecipeCompareMode() {
  AppState.recipes.compareMode = !AppState.recipes.compareMode;
  renderRecipesWorkspace();
}

function setRecipeSearch(q) {
  AppState.recipes.searchQuery = q;
  if (_recipeSearchDebounce) clearTimeout(_recipeSearchDebounce);
  _recipeSearchDebounce = setTimeout(() => {
    if (AppState.mode === 'recipes') {
      updateRecipeSidebarCounts();
      renderRecipesWorkspace();
    }
  }, 100);
}

function selectRecipeEntry(itemId, fromHistory = false) {
  const st = AppState.recipes;
  if (!itemId || st.selectedId === itemId) {
    st.selectedId = null;
    st.detailHistory = [];
    st.compareMode = false;
  } else {
    if (!fromHistory && st.selectedId && st.selectedId !== itemId) {
      st.detailHistory.push(st.selectedId);
      if (st.detailHistory.length > 25) st.detailHistory.shift();
    }
    st.selectedId = itemId;
    st.compareMode = false;
    pushLibraryRecent(`item_${itemId}`);
  }
  renderRecipesWorkspace();
}

function navigateRecipeDetailBack() {
  const st = AppState.recipes;
  const prev = st.detailHistory.pop();
  st.selectedId = prev || null;
  st.compareMode = false;
  renderRecipesWorkspace();
}

function navigateRecipeAdjacent(delta) {
  if (!_lastRenderedRecipeIds.length || !AppState.recipes.selectedId) return;
  const idx = _lastRenderedRecipeIds.indexOf(AppState.recipes.selectedId);
  if (idx === -1) return;
  const nextIdx = (idx + delta + _lastRenderedRecipeIds.length) % _lastRenderedRecipeIds.length;
  selectRecipeEntry(_lastRenderedRecipeIds[nextIdx]);
}

function openLibraryFromRecipes(itemId) {
  const all = getLibraryEntries();
  const target = all.find(e => e.rawId === itemId);
  if (target) {
    AppState.library.selectedId = target.id;
    pushLibraryRecent(target.id);
  }
  switchMode('library');
}

function updateRecipeSidebarCounts() {
  const allGroups = getGroupedRecipeProducts();
  const baseMatched = getFilteredRecipeGroups(allGroups, { ignoreFilter: true, ignoreCategory: true, ignoreMachine: true });
  const nonFics = baseMatched.filter(g => !g.isFicsmasOnly);
  const fics = baseMatched.filter(g => g.isFicsmasOnly);
  const altMatched = nonFics.filter(g => g.alternates.length > 0);
  const activeScope = getFilteredRecipeGroups(allGroups, { ignoreCategory: true, ignoreMachine: true });

  const setCnt = (key, val) => {
    const el = document.querySelector(`[data-rec-count="${key}"]`);
    if (el) {
      el.textContent = String(val);
      const btn = el.closest('button');
      if (btn) btn.classList.toggle('is-empty', val === 0);
    }
  };
  setCnt('filter:all', nonFics.length);
  setCnt('filter:alternate', altMatched.length);
  setCnt('filter:ficsmas', fics.length);
  setCnt('cat:all', activeScope.length);

  document.querySelectorAll('[data-rec-count^="cat:"]').forEach(el => {
    const key = el.getAttribute('data-rec-count');
    if (key === 'cat:all') return;
    const catName = key.slice(4);
    const c = activeScope.filter(g => g.category === catName).length;
    el.textContent = String(c);
    const btn = el.closest('button');
    if (btn) btn.classList.toggle('is-empty', c === 0);
  });
  document.querySelectorAll('[data-rec-count^="mach:"]').forEach(el => {
    const mId = el.getAttribute('data-rec-count').slice(5);
    const c = activeScope.filter(g => g.machines.includes(mId)).length;
    el.textContent = String(c);
    const btn = el.closest('button');
    if (btn) btn.classList.toggle('is-empty', c === 0);
  });
}

function renderRecipesMode(sidebarEl, emptyOverlay) {
  emptyOverlay.classList.add('hidden');
  emptyOverlay.innerHTML = '';

  const st = AppState.recipes;
  const allGroups = getGroupedRecipeProducts();
  const baseMatched = getFilteredRecipeGroups(allGroups, { ignoreFilter: true, ignoreCategory: true, ignoreMachine: true });
  const nonFicsCount = baseMatched.filter(g => !g.isFicsmasOnly).length;
  const withAltCount = baseMatched.filter(g => !g.isFicsmasOnly && g.alternates.length > 0).length;
  const ficsCount = baseMatched.filter(g => g.isFicsmasOnly).length;

  const activeScope = getFilteredRecipeGroups(allGroups, { ignoreCategory: true, ignoreMachine: true });
  const catNames = [...new Set(allGroups.map(g => g.category))]
    .sort((a, b) => (LIB_PROGRESSION_ORDER[a] || 99) - (LIB_PROGRESSION_ORDER[b] || 99));
  const machines = Solver.getProductionMachines();
  const activeExtraCount = (st.byproductOnly ? 1 : 0) + (st.favOnly ? 1 : 0);

  sidebarEl.innerHTML = `
    <div class="sidebar-step-block lib-sidebar-search-block">
      <input
        id="rec-search-input"
        type="text"
        class="sidebar-input"
        placeholder="Buscar produto, receita ou máquina... [/]"
        value="${libEsc(st.searchQuery)}"
        oninput="setRecipeSearch(this.value)"
      />
      <button type="button" class="lib-filters-toggle ${st.filtersOpen || activeExtraCount > 0 ? 'active' : ''}" onclick="toggleRecipeFiltersOpen()">
        <span>Filtros${activeExtraCount > 0 ? ` (${activeExtraCount})` : ''}</span>
        <span>${st.filtersOpen ? '▾' : '▸'}</span>
      </button>
      ${st.filtersOpen ? `
        <div class="lib-filter-chips">
          <button type="button" class="am-qf-chip ${st.byproductOnly ? 'active' : ''}" onclick="setRecipeFlag('byproductOnly', ${!st.byproductOnly})">Subprodutos</button>
          <button type="button" class="am-qf-chip ${st.favOnly ? 'active' : ''}" onclick="setRecipeFlag('favOnly', ${!st.favOnly})">★ Favoritos</button>
        </div>
      ` : ''}
    </div>

    <div class="library-cat-list">
      <button type="button" class="library-cat-btn ${st.filter === 'all' ? 'active' : ''} ${nonFicsCount === 0 ? 'is-empty' : ''}" onclick="setRecipeFilter('all')">
        <span class="lib-cat-left"><span>Todos</span></span>
        <span class="library-cat-count" data-rec-count="filter:all">${nonFicsCount}</span>
      </button>
      <button type="button" class="library-cat-btn ${st.filter === 'alternate' ? 'active' : ''} ${withAltCount === 0 ? 'is-empty' : ''}" onclick="setRecipeFilter('alternate')">
        <span class="lib-cat-left"><span>Com alternativas</span></span>
        <span class="library-cat-count" data-rec-count="filter:alternate">${withAltCount}</span>
      </button>
      <button type="button" class="library-cat-btn ${st.filter === 'ficsmas' ? 'active' : ''} ${ficsCount === 0 ? 'is-empty' : ''}" onclick="setRecipeFilter('ficsmas')">
        <span class="lib-cat-left"><span>Evento (FICSMAS)</span></span>
        <span class="library-cat-count" data-rec-count="filter:ficsmas">${ficsCount}</span>
      </button>
    </div>

    <div class="rec-sidebar-divider"></div>

    <div class="library-cat-list">
      <button type="button" class="library-cat-btn ${st.category === 'all' ? 'active' : ''}" onclick="setRecipeCategory('all')">
        <span class="lib-cat-left"><span>Todas as categorias</span></span>
        <span class="library-cat-count" data-rec-count="cat:all">${activeScope.length}</span>
      </button>
      ${catNames.map(cat => {
        const cnt = activeScope.filter(g => g.category === cat).length;
        const color = LIB_CATEGORY_COLORS[cat] || '#2563EB';
        const sampleItem = allGroups.find(g => g.category === cat)?.item;
        return `
          <button type="button" class="library-cat-btn library-subcat-btn ${st.category === cat ? 'active' : ''} ${cnt === 0 ? 'is-empty' : ''}" onclick="setRecipeCategory('${libEsc(cat)}')">
            <span class="lib-cat-left">
              <span class="lib-cat-dot" style="background:${color};"></span>
              ${sampleItem?.wikiImage ? `<img class="lib-cat-img" src="${sampleItem.wikiImage}" alt="" loading="lazy" />` : ''}
              <span>${libEsc(cat)}</span>
            </span>
            <span class="library-cat-count" data-rec-count="cat:${libEsc(cat)}">${cnt}</span>
          </button>
        `;
      }).join('')}
    </div>

    <div class="rec-sidebar-divider"></div>

    <div class="rec-machine-chips-wrap">
      ${st.machineFilters.length > 0 ? `<button type="button" class="rec-clear-mach-btn" onclick="clearRecipeMachineFilters()">Limpar máquinas (${st.machineFilters.length})</button>` : ''}
      <div class="rec-machine-chips">
        ${machines.map(m => {
          const cnt = activeScope.filter(g => g.machines.includes(m.id)).length;
          const active = st.machineFilters.includes(m.id);
          return `
            <button type="button" class="rec-mach-chip ${active ? 'active' : ''} ${cnt === 0 ? 'is-empty' : ''}" onclick="toggleRecipeMachineFilter('${m.id}')" title="${libEsc(m.name)}">
              ${m.wikiImage ? `<img src="${m.wikiImage}" alt="" loading="lazy" />` : ''}
              <span>${libEsc(m.name)}</span>
              <small data-rec-count="mach:${m.id}">${cnt}</small>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;

  renderRecipesWorkspace(allGroups);
}

function renderRecipeBadgesHtml(g) {
  const parts = [];
  if (g.baseRecipes.length > 0) parts.push('<span class="rec-pill-std">Padrão</span>');
  if (g.alternates.length > 0) parts.push(`<span class="rec-pill-alt">ALT ×${g.alternates.length}</span>`);
  return parts.join('');
}

function computeRawCostPerUnitForRecipe(itemId, recipeId) {
  try {
    const plan = Solver.solveProductionChain({
      targets: [{ itemId, rate: 10 }],
      recipeOverrides: { [itemId]: recipeId }
    });
    if (!plan || !Array.isArray(plan.rawResources)) return null;
    return plan.rawResources
      .filter(r => r.requiredRate > 0)
      .map(r => `${r.item?.name || r.itemId}: ${fmt(r.requiredRate / 10, 2)}`)
      .join(', ');
  } catch {
    return null;
  }
}

function renderRecipeDetailPanel(g) {
  if (!g) return '';
  const st = AppState.recipes;
  const favSet = new Set(AppState.library.favorites || []);
  const isFav = favSet.has(g.favKey);
  const orderedRecs = [...g.baseRecipes, ...g.alternates];

  const usedInRecs = Object.values(window.SATISFACTORY_DATA?.recipes || {})
    .filter(r => !r.isFicsmas && (r.ingredients || []).some(i => i.item === g.id));

  const clickableItem = (itemId) => {
    const it = Solver.getItem(itemId);
    if (!it) return libEsc(itemId);
    const hasRecGroup = getGroupedRecipeProducts().some(x => x.id === itemId);
    if (hasRecGroup) {
      return `<button type="button" class="lib-link-chip" onclick="selectRecipeEntry('${itemId}')">${renderEntityIcon(it, 18)}<span>${libEsc(it.name)}</span></button>`;
    }
    return `<button type="button" class="lib-link-chip" onclick="openLibraryFromRecipes('${itemId}')">${renderEntityIcon(it, 18)}<span>${libEsc(it.name)}</span></button>`;
  };

  let bodyHtml = '';
  if (st.compareMode && orderedRecs.length > 1) {
    const rows = orderedRecs.map(r => {
      const m = Solver.getMachine(r.machine);
      const prodEntry = (r.products || []).find(p => p.item === g.id) || r.products?.[0];
      const outRate = prodEntry ? Number(prodEntry.ratePerMin || 0) : 0;
      const mw = Number(r.avgPowerMw ?? m?.powerConsumption ?? 0);
      const mwPerItem = outRate > 0 ? mw / outRate : Infinity;
      const rawCost = computeRawCostPerUnitForRecipe(g.id, r.id);
      return { r, m, outRate, mw, mwPerItem, rawCost };
    });
    const bestOut = Math.max(...rows.map(x => x.outRate));
    const bestMw = Math.min(...rows.map(x => x.mwPerItem));

    bodyHtml = `
      <div class="rec-compare-wrap">
        <table class="rec-compare-table">
          <thead>
            <tr>
              <th>Receita</th>
              <th>Entradas (/min)</th>
              <th>Saída</th>
              <th>Energia</th>
              <th>Brutos / un</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(x => `
              <tr>
                <td>
                  <strong>${libEsc(x.r.cleanName || x.r.name)}</strong>
                  ${x.r.isAlternate ? '<span class="am-alt-badge">ALT</span>' : ''}
                  <div class="rec-tbl-sub">${libEsc(x.m?.name || '')}</div>
                </td>
                <td>${(x.r.ingredients || []).map(i => `${libEsc(Solver.getItem(i.item)?.name || i.item)} <strong>${fmt(i.ratePerMin, 1)}/min</strong>`).join('<br/>')}</td>
                <td class="${x.outRate === bestOut ? 'rec-best-metric' : ''}"><strong>${fmt(x.outRate, 1)}/min</strong></td>
                <td class="${x.mwPerItem === bestMw ? 'rec-best-metric' : ''}"><strong>${fmt(x.mw, 1)} MW</strong></td>
                <td>${x.rawCost ? libEsc(x.rawCost) : '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else {
    bodyHtml = orderedRecs.map(r => {
      const m = Solver.getMachine(r.machine);
      const avgMw = Number(r.avgPowerMw ?? m?.powerConsumption ?? 0);
      const prodEntry = (r.products || []).find(p => p.item === g.id) || r.products?.[0];
      const baseRate = prodEntry ? Number(prodEntry.ratePerMin || 30) : 30;
      const isByprodForThis = (r.products || []).findIndex(p => p.item === g.id) > 0;

      const inCards = (r.ingredients || []).map(i => {
        const it = Solver.getItem(i.item);
        return `
          <div class="rec-flow-io-card">
            ${clickableItem(i.item)}
            <div class="rec-flow-io-meta">${i.amount ? `${i.amount}× ciclo · ` : ''}<strong>${fmt(i.ratePerMin, 1)}/min</strong></div>
          </div>
        `;
      }).join('');

      const outCards = (r.products || []).map((p, pIdx) => {
        return `
          <div class="rec-flow-io-card out">
            ${clickableItem(p.item)}
            <div class="rec-flow-io-meta">
              ${p.amount ? `${p.amount}× ciclo · ` : ''}<strong>${fmt(p.ratePerMin, 1)}/min</strong>
              ${pIdx > 0 ? '<span class="rec-byprod-tag">Subproduto</span>' : ''}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="rec-detail-variant ${r.isAlternate ? 'is-alt' : ''}">
          <div class="rec-detail-var-head">
            <div class="rec-detail-var-title">
              ${r.isAlternate ? '<span class="am-alt-badge">ALT</span>' : '<span class="rec-pill-std">Padrão</span>'}
              ${isByprodForThis ? '<span class="rec-byprod-tag">Subproduto</span>' : ''}
              <strong>${libEsc(r.cleanName || r.name)}</strong>
            </div>
            <button type="button" class="btn-small-accent" onclick="planRecipeFromRecipesTab('${g.id}', '${r.id}', ${baseRate})">Planejar</button>
          </div>
          <div class="rec-visual-flow">
            <div class="rec-flow-col">${inCards}</div>
            <div class="rec-flow-mach">
              ${m ? renderEntityIcon(m, 34) : ''}
              <strong>${libEsc(m?.name || 'Bancada')}</strong>
              <small>${r.duration || 1}s · ${fmt(avgMw, 1)} MW</small>
            </div>
            <div class="rec-flow-col">${outCards}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  return `
    <aside class="lib-side-detail rec-side-detail" aria-label="Detalhes da receita">
      <div class="lib-side-detail-top">
        <div class="lib-side-top-left">
          ${st.detailHistory.length > 0 ? `<button type="button" class="btn-icon-action" onclick="navigateRecipeDetailBack()">← Voltar</button>` : ''}
          <button type="button" class="btn-icon-action" onclick="navigateRecipeAdjacent(-1)" title="Produto anterior">‹</button>
          <button type="button" class="btn-icon-action" onclick="navigateRecipeAdjacent(1)" title="Próximo produto">›</button>
        </div>
        <div class="lib-side-top-right">
          <button type="button" class="lib-fav-btn ${isFav ? 'active' : ''}" onclick="toggleLibraryFavorite(event, '${g.favKey}')" title="Favoritar">${isFav ? '★' : '☆'}</button>
          <button type="button" class="icon-close" onclick="selectRecipeEntry('${g.id}')" aria-label="Fechar">✕</button>
        </div>
      </div>

      <div class="lib-side-hero">
        ${renderShowcaseImage(g.item, 84)}
        <div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span class="lib-cat-dot" style="background:${g.color};"></span>
            <span class="lib-side-cat">${libEsc(g.category)}</span>
          </div>
          <h3>${libEsc(g.item.name)}</h3>
          ${g.item.nameEn && g.item.nameEn.toLowerCase() !== g.item.name.toLowerCase() ? `<div class="lib-name-en">${libEsc(g.item.nameEn)}</div>` : ''}
          <div class="rec-badges-row" style="margin-top:6px;">${renderRecipeBadgesHtml(g)}</div>
        </div>
      </div>

      <div class="lib-detail-actions" style="padding:0 16px 12px;">
        ${orderedRecs.length > 1 ? `
          <button type="button" class="btn-icon-action ${st.compareMode ? 'is-selected' : ''}" onclick="toggleRecipeCompareMode()">
            ${st.compareMode ? 'Ver receitas' : 'Comparar'}
          </button>
        ` : ''}
        <button type="button" class="btn-icon-action" onclick="openLibraryFromRecipes('${g.id}')">Biblioteca</button>
      </div>

      <div class="lib-side-body">
        ${bodyHtml}
        <div class="lib-detail-sec">
          <h4>Usado em (${usedInRecs.length})</h4>
          ${usedInRecs.length > 0 ? `
            <div class="lib-rec-tags">
              ${usedInRecs.slice(0, 20).map(r => {
                const p0 = r.products?.[0]?.item;
                return p0
                  ? `<button type="button" class="lib-link-chip" onclick="selectRecipeEntry('${p0}')">${libEsc(r.cleanName || r.name)}${r.isAlternate ? ' ★' : ''}</button>`
                  : `<span class="lib-tag-pill">${libEsc(r.cleanName || r.name)}</span>`;
              }).join('')}
            </div>
          ` : '<div class="lib-empty-note">Produto final / uso direto.</div>'}
        </div>
      </div>
    </aside>
  `;
}

function renderRecipesWorkspace(cachedGroups = null) {
  const view = document.getElementById('recipes-workspace-view');
  if (!view) return;

  const st = AppState.recipes;
  const allGroups = cachedGroups || getGroupedRecipeProducts();
  let filtered = getFilteredRecipeGroups(allGroups);

  if (st.sortBy === 'az') {
    filtered = [...filtered].sort((a, b) => a.item.name.localeCompare(b.item.name, 'pt-BR'));
  } else if (st.sortBy === 'alternates') {
    filtered = [...filtered].sort((a, b) => (b.alternates.length - a.alternates.length) || a.item.name.localeCompare(b.item.name, 'pt-BR'));
  } else {
    filtered = [...filtered].sort((a, b) => (a.progressionRank - b.progressionRank) || a.item.name.localeCompare(b.item.name, 'pt-BR'));
  }

  _lastRenderedRecipeIds = filtered.map(g => g.id);
  const favSet = new Set(AppState.library.favorites || []);
  const selectedGroup = st.selectedId ? allGroups.find(g => g.id === st.selectedId) : null;

  const renderCard = (g) => {
    const mainRec = g.baseRecipes[0] || g.alternates[0];
    const mainMach = mainRec ? Solver.getMachine(mainRec.machine) : null;
    const extraMachCount = Math.max(0, g.machines.length - 1);
    const ings = mainRec ? (mainRec.ingredients || []) : [];
    const shownIngs = ings.slice(0, 4);
    const extraIngCount = Math.max(0, ings.length - 4);
    const isFav = favSet.has(g.favKey);
    const isSel = st.selectedId === g.id;
    const imgSize = st.viewMode === 'list' ? 28 : (st.cardSize === 'sm' ? 40 : (st.cardSize === 'lg' ? 66 : 50));
    const nameHtml = highlightLibMatch(g.item.name, st.searchQuery);

    if (st.viewMode === 'list') {
      return `
        <div class="lib-list-row ${isSel ? 'active' : ''}" style="--lib-cat-color:${g.color};" onclick="selectRecipeEntry('${g.id}')">
          <span class="lib-cat-dot" style="background:${g.color};"></span>
          ${renderEntityIcon(g.item, imgSize)}
          <strong class="lib-list-name">${nameHtml}</strong>
          <div class="rec-badges-row">${renderRecipeBadgesHtml(g)}</div>
          <span class="lib-list-cat">${libEsc(mainMach?.name || '')}${extraMachCount > 0 ? ` +${extraMachCount}` : ''}</span>
          <button type="button" class="lib-fav-btn ${isFav ? 'active' : ''}" onclick="toggleLibraryFavorite(event, '${g.favKey}')" title="Favoritar">${isFav ? '★' : '☆'}</button>
        </div>
      `;
    }

    return `
      <div
        role="button"
        tabindex="0"
        class="lib-card rec-clean-card lib-size-${st.cardSize} ${isSel ? 'active' : ''}"
        style="--lib-cat-color:${g.color};"
        onclick="selectRecipeEntry('${g.id}')"
        onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectRecipeEntry('${g.id}');}"
      >
        <div class="lib-card-strip" style="background:${g.color};"></div>
        <button type="button" class="lib-fav-btn lib-card-fav ${isFav ? 'active' : ''}" onclick="toggleLibraryFavorite(event, '${g.favKey}')" title="Favoritar">${isFav ? '★' : '☆'}</button>
        <div class="lib-card-icon">${renderEntityIcon(g.item, imgSize)}</div>
        <strong class="lib-card-name">${nameHtml}</strong>
        <div class="rec-card-meta-icons">
          ${mainMach ? `<span class="rec-mini-mach" title="${libEsc(mainMach.name)}">${renderEntityIcon(mainMach, 18)}${extraMachCount > 0 ? `<small>+${extraMachCount}</small>` : ''}</span>` : ''}
          <span class="rec-mini-ings">
            ${shownIngs.map(i => {
              const it = Solver.getItem(i.item);
              return it ? `<span title="${libEsc(it.name)}">${renderEntityIcon(it, 18)}</span>` : '';
            }).join('')}
            ${extraIngCount > 0 ? `<small>+${extraIngCount}</small>` : ''}
          </span>
        </div>
        <div class="rec-badges-row">${renderRecipeBadgesHtml(g)}</div>
      </div>
    `;
  };

  let contentHtml = '';
  const recentGroups = (!st.searchQuery && st.category === 'all' && !st.favOnly && (AppState.library.recents || []).length > 0)
    ? AppState.library.recents
        .filter(id => id.startsWith('item_'))
        .map(id => allGroups.find(g => g.id === id.slice(5)))
        .filter(Boolean)
        .slice(0, 6)
    : [];

  if (recentGroups.length > 0 && st.viewMode !== 'table') {
    const collapsed = Boolean(st.collapsedSections['__recents']);
    contentHtml += `
      <section class="lib-section">
        <button type="button" class="lib-section-head" onclick="toggleRecipeSection('__recents')">
          <span class="lib-sec-title">Recentes <small>(${recentGroups.length})</small></span>
          <span>${collapsed ? '▸' : '▾'}</span>
        </button>
        ${!collapsed ? `<div class="lib-items-container lib-view-${st.viewMode === 'list' ? 'list' : 'cards'} lib-size-${st.cardSize}">${recentGroups.map(renderCard).join('')}</div>` : ''}
      </section>
    `;
  }

  if (filtered.length === 0) {
    contentHtml += '<div class="picker-empty">Nenhuma receita encontrada.</div>';
  } else if (st.viewMode === 'table') {
    contentHtml += `
      <div class="rec-table-wrap">
        <table class="rec-compare-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Máquina</th>
              <th>Entradas</th>
              <th>Saída/min</th>
              <th>Ciclo</th>
              <th>Energia</th>
              <th>ALT</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(g => {
              const mainRec = g.baseRecipes[0] || g.alternates[0];
              const m = mainRec ? Solver.getMachine(mainRec.machine) : null;
              const prodEntry = mainRec ? ((mainRec.products || []).find(p => p.item === g.id) || mainRec.products?.[0]) : null;
              const mw = mainRec ? Number(mainRec.avgPowerMw ?? m?.powerConsumption ?? 0) : 0;
              return `
                <tr class="rec-table-row ${st.selectedId === g.id ? 'active' : ''}" onclick="selectRecipeEntry('${g.id}')">
                  <td><div class="rec-tbl-prod">${renderEntityIcon(g.item, 22)}<strong>${highlightLibMatch(g.item.name, st.searchQuery)}</strong></div></td>
                  <td>${libEsc(m?.name || '—')}</td>
                  <td>${mainRec ? (mainRec.ingredients || []).map(i => `${libEsc(Solver.getItem(i.item)?.name || i.item)} (${fmt(i.ratePerMin, 1)}/min)`).join(', ') : '—'}</td>
                  <td><strong>${prodEntry ? `${fmt(prodEntry.ratePerMin, 1)}/min` : '—'}</strong></td>
                  <td>${mainRec ? `${mainRec.duration || 1}s` : '—'}</td>
                  <td>${fmt(mw, 1)} MW</td>
                  <td>${g.alternates.length > 0 ? `<span class="rec-pill-alt">ALT ×${g.alternates.length}</span>` : '—'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else if (st.category === 'all' && st.sortBy !== 'az') {
    const groupsByCat = new Map();
    filtered.forEach(g => {
      if (!groupsByCat.has(g.category)) groupsByCat.set(g.category, { color: g.color, items: [] });
      groupsByCat.get(g.category).items.push(g);
    });
    for (const [cName, cData] of groupsByCat.entries()) {
      const collapsed = Boolean(st.collapsedSections[cName]);
      contentHtml += `
        <section class="lib-section">
          <button type="button" class="lib-section-head" onclick="toggleRecipeSection('${libEsc(cName)}')">
            <span class="lib-sec-title">
              <span class="lib-cat-dot" style="background:${cData.color};"></span>
              ${libEsc(cName)} <small>(${cData.items.length})</small>
            </span>
            <span>${collapsed ? '▸' : '▾'}</span>
          </button>
          ${!collapsed ? `<div class="lib-items-container lib-view-${st.viewMode === 'list' ? 'list' : 'cards'} lib-size-${st.cardSize}">${cData.items.map(renderCard).join('')}</div>` : ''}
        </section>
      `;
    }
  } else {
    contentHtml += `<div class="lib-items-container lib-view-${st.viewMode === 'list' ? 'list' : 'cards'} lib-size-${st.cardSize}">${filtered.map(renderCard).join('')}</div>`;
  }

  view.innerHTML = `
    <div class="lib-shell ${selectedGroup ? 'has-detail' : ''}">
      <div class="lib-main-col">
        <div class="lib-toolbar">
          <span class="lib-count-label">${filtered.length} produto(s)</span>
          <div class="lib-toolbar-controls">
            <select class="lib-sort-select" onchange="setRecipeSort(this.value)" aria-label="Ordenar">
              <option value="progression" ${st.sortBy === 'progression' ? 'selected' : ''}>Progressão</option>
              <option value="az" ${st.sortBy === 'az' ? 'selected' : ''}>A–Z</option>
              <option value="alternates" ${st.sortBy === 'alternates' ? 'selected' : ''}>Mais alternativas</option>
            </select>
            <div class="lib-seg-group" role="group" aria-label="Visualização">
              <button type="button" class="lib-seg-btn ${st.viewMode === 'grid' ? 'active' : ''}" onclick="setRecipeViewMode('grid')" title="Grade">⊞</button>
              <button type="button" class="lib-seg-btn ${st.viewMode === 'list' ? 'active' : ''}" onclick="setRecipeViewMode('list')" title="Lista">☰</button>
              <button type="button" class="lib-seg-btn ${st.viewMode === 'table' ? 'active' : ''}" onclick="setRecipeViewMode('table')" title="Tabela">▦</button>
            </div>
            ${st.viewMode === 'grid' ? `
              <div class="lib-seg-group" role="group" aria-label="Tamanho">
                <button type="button" class="lib-seg-btn ${st.cardSize === 'sm' ? 'active' : ''}" onclick="setRecipeCardSize('sm')" title="Pequeno">P</button>
                <button type="button" class="lib-seg-btn ${st.cardSize === 'md' ? 'active' : ''}" onclick="setRecipeCardSize('md')" title="Médio">M</button>
                <button type="button" class="lib-seg-btn ${st.cardSize === 'lg' ? 'active' : ''}" onclick="setRecipeCardSize('lg')" title="Grande">G</button>
              </div>
            ` : ''}
          </div>
        </div>
        <div class="lib-scroll-area">${contentHtml}</div>
      </div>
      ${renderRecipeDetailPanel(selectedGroup)}
    </div>
  `;
}

// Atalhos de teclado da aba Receitas: "/" busca, ESC fecha detalhe
document.addEventListener('keydown', (e) => {
  if (AppState.mode !== 'recipes') return;
  const tag = (e.target && e.target.tagName || '').toLowerCase();
  const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select';
  if (e.key === '/' && !isTyping) {
    e.preventDefault();
    const inp = document.getElementById('rec-search-input');
    if (inp) { inp.focus(); inp.select(); }
  } else if (e.key === 'Escape' && AppState.recipes.selectedId) {
    e.preventDefault();
    AppState.recipes.selectedId = null;
    AppState.recipes.detailHistory = [];
    renderRecipesWorkspace();
  }
});

/* ============================================================================
 * ABA 7: 🧮 CALCULADORA S+ (SUITE COMPLETA DO JOGO + NUMÉRICA)
 * ========================================================================== */

const CALC_STORAGE_KEY = 'splus_calc_history_v1';

const CALC_TOOLS = [
  { id: 'numeric', label: 'Calculadora', icon: '🧮' },
  { id: 'resources', label: 'Recursos', icon: '📦' },
  { id: 'production', label: 'Produção', icon: '🏭' },
  { id: 'energy', label: 'Energia', icon: '⚡' },
  { id: 'logistics', label: 'Logística', icon: '🔀' },
  { id: 'sink', label: 'Triturador SUPIMPA', icon: '♻️' },
  { id: 'elevator', label: 'Elevador Espacial', icon: '🚀' }
];

function loadCalcHistoryLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(CALC_STORAGE_KEY) || '[]');
    if (Array.isArray(raw)) AppState.calculator.recents = raw.slice(0, 20);
  } catch {}
}

function persistCalcHistory() {
  const list = (AppState.calculator.recents || []).slice(0, 20);
  AppState.calculator.recents = list;
  try { localStorage.setItem(CALC_STORAGE_KEY, JSON.stringify(list)); } catch {}
  if (typeof saveAccountPreferences === 'function') {
    saveAccountPreferences({ calcHistory: list });
  }
}

function syncCalcHistoryFromAccount(prefs) {
  if (!prefs || !Array.isArray(prefs.calcHistory) || prefs.calcHistory.length === 0) return;
  const existing = AppState.calculator.recents || [];
  const merged = [...prefs.calcHistory];
  existing.forEach(item => {
    if (!merged.some(m => m.id === item.id || m.summary === item.summary)) merged.push(item);
  });
  AppState.calculator.recents = merged.slice(0, 20);
  try { localStorage.setItem(CALC_STORAGE_KEY, JSON.stringify(AppState.calculator.recents)); } catch {}
  if (AppState.mode === 'calculator') renderCalcRecentsStrip();
}

function restoreCalcFromUrlHash() {
  try {
    const hash = window.location.hash || '';
    if (!hash.startsWith('#calc=')) return;
    const payload = JSON.parse(decodeURIComponent(atob(hash.slice(6))));
    if (payload && typeof payload === 'object' && payload.tool) {
      Object.assign(AppState.calculator, payload);
      AppState.mode = 'calculator';
    }
  } catch {}
}

loadCalcHistoryLocal();
restoreCalcFromUrlHash();

function setCalcTool(toolId) {
  AppState.calculator.tool = toolId;
  renderAll(false);
}

function setCalcField(field, val, fullRerender = true) {
  const c = AppState.calculator;
  if (field === 'prodClock' || field === 'genClock') {
    val = Math.max(100, Math.min(250, Math.round(Number(val) || 100)));
  }
  c[field] = val;

  if (field === 'resItemId') {
    const recs = Solver.indexes.recipesByProduct.get(val) || [];
    const defRec = recs.find(r => !r.isAlternate) || recs[0] || null;
    c.resRecipeId = defRec ? defRec.id : '';
    const mainProd = defRec?.products?.find(p => p.item === val);
    c.resTargetRate = mainProd ? Number(mainProd.ratePerMin) : 1;
    c.resMachineClocks = {};
  } else if (field === 'resRecipeId') {
    c.resMachineClocks = {};
  } else if (field === 'prodMachineId') {
    const recs = val ? Solver.getRecipesByMachine(val).filter(r => !r.isFicsmas) : [];
    const defRec = recs.find(r => !r.isAlternate) || recs[0] || null;
    c.prodRecipeId = defRec ? defRec.id : '';
    if (!c.prodMachineCount) c.prodMachineCount = 1;
    c.prodClock = 100;
  } else if (field === 'genId') {
    const g = Solver.getPowerGenerators().find(x => x.id === val);
    c.genFuelId = g?.fuels?.[0]?.itemId || '';
    if (c.energyMode === 'by_mw' && !c.energyTargetMw && g) {
      c.energyTargetMw = g.powerProduction || '';
    } else if (c.energyMode === 'by_generators' && !c.genCount) {
      c.genCount = 1;
    }
  } else if (field === 'sinkItemId') {
    if (!c.sinkQty) c.sinkQty = 1;
    if (!c.sinkRate) c.sinkRate = 1;
  } else if (field === 'logKind') {
    c.logItemId = '';
  }

  if (fullRerender) renderCalculatorWorkspace();
  else updateCalcResultOnly();
}

function setCalcResMachineClock(machineId, val) {
  const pct = Math.max(100, Math.min(250, Math.round(Number(val) || 100)));
  if (!AppState.calculator.resMachineClocks) AppState.calculator.resMachineClocks = {};
  AppState.calculator.resMachineClocks[machineId] = pct;
  renderCalculatorWorkspace();
}

function setCalcElevatorDelivered(phase, itemId, val) {
  const key = `${phase}_${itemId}`;
  AppState.calculator.elevatorDelivered[key] = Math.max(0, Math.round(Number(val) || 0));
  updateCalcResultOnly();
}

function stepCalcNumber(field, delta, minVal = 1, maxVal = 999999) {
  const cur = Number(AppState.calculator[field]) || 0;
  const next = Math.max(minVal, Math.min(maxVal, Number((cur + delta).toFixed(4))));
  AppState.calculator[field] = next;
  renderCalculatorWorkspace();
}

function openCalcItemPicker(field, filterFn, title = 'Selecionar Item') {
  const items = Object.values(window.SATISFACTORY_DATA?.items || {})
    .filter(it => !filterFn || filterFn(it))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  openGenericPickerModal(title, items, (selected) => {
    setCalcField(field, selected.id, true);
  });
}

function openGenericPickerModal(title, entities, onSelect) {
  let modal = document.getElementById('calc-picker-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'calc-picker-modal';
    modal.className = 'modal-backdrop hidden';
    modal.onclick = (e) => { if (e.target === modal) modal.classList.add('hidden'); };
    document.body.appendChild(modal);
  }
  window._calcPickerEntities = entities;
  window._calcPickerOnSelect = onSelect;
  modal.innerHTML = `
    <div class="modal-card calc-picker-card">
      <div class="modal-header">
        <h3>${title} (${entities.length})</h3>
        <button type="button" class="btn-icon-close" onclick="document.getElementById('calc-picker-modal').classList.add('hidden')">✕</button>
      </div>
      <div class="calc-picker-search-wrap">
        <input type="text" id="calc-picker-search" class="sidebar-input" placeholder="Buscar..." oninput="filterCalcPickerList(this.value)" />
      </div>
      <div id="calc-picker-grid" class="calc-picker-grid"></div>
    </div>
  `;
  modal.classList.remove('hidden');
  filterCalcPickerList('');
  setTimeout(() => document.getElementById('calc-picker-search')?.focus(), 30);
}

function filterCalcPickerList(query) {
  const grid = document.getElementById('calc-picker-grid');
  if (!grid) return;
  const q = Solver.normalizeText(query || '');
  const list = (window._calcPickerEntities || []).filter(e => {
    if (!q) return true;
    return Solver.normalizeText(`${e.name} ${e.nameEn || ''} ${e.category || ''}`).includes(q);
  }).slice(0, 120);

  grid.innerHTML = list.map(e => `
    <button type="button" class="calc-picker-item" onclick="selectCalcPickerEntity('${e.id}')">
      ${renderEntityIcon(e, 28)}
      <span>${libEsc(e.name)}</span>
    </button>
  `).join('') || '<div class="calc-empty-note">Nenhum resultado.</div>';
}

function selectCalcPickerEntity(id) {
  const entity = (window._calcPickerEntities || []).find(e => e.id === id);
  document.getElementById('calc-picker-modal')?.classList.add('hidden');
  if (entity && typeof window._calcPickerOnSelect === 'function') {
    window._calcPickerOnSelect(entity);
  }
}

function appendCalcKey(k) {
  if (k === 'C') {
    AppState.calculator.expr = '';
    AppState.calculator.exprResult = '0';
  } else if (k === 'BACK') {
    AppState.calculator.expr = String(AppState.calculator.expr || '').slice(0, -1);
  } else if (k === '=') {
    evalMathExpr();
    return;
  } else {
    AppState.calculator.expr = String(AppState.calculator.expr || '') + k;
  }
  const inp = document.getElementById('calc-num-expr-input');
  const res = document.getElementById('calc-num-result-readout');
  if (inp) inp.value = AppState.calculator.expr;
  if (res) res.textContent = `= ${AppState.calculator.exprResult}`;
}

function evalMathExpr() {
  const raw = String(AppState.calculator.expr || '').replace(/,/g, '.').replace(/[^0-9+\-*/().%\s]/g, '');
  if (!raw.trim()) return;
  try {
    const normalized = raw.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
    const val = Function(`"use strict"; return (${normalized});`)();
    if (typeof val === 'number' && Number.isFinite(val)) {
      const formatted = fmt(val, 4);
      AppState.calculator.exprResult = formatted;
      AppState.calculator.numHistory.unshift(`${raw} = ${formatted}`);
      if (AppState.calculator.numHistory.length > 10) AppState.calculator.numHistory.pop();
    } else {
      AppState.calculator.exprResult = 'Erro';
    }
  } catch {
    AppState.calculator.exprResult = 'Erro';
  }
  const res = document.getElementById('calc-num-result-readout');
  if (res) res.textContent = `= ${AppState.calculator.exprResult}`;
  const histEl = document.getElementById('calc-num-hist-inline');
  if (histEl) {
    histEl.innerHTML = AppState.calculator.numHistory.slice(0, 5).map(h => `<div class="calc-num-hist-row">${libEsc(h)}</div>`).join('');
  }
}

// Teclado físico na Calculadora normal (ativo somente na aba Calculadora -> Calculadora e sem outro input focado)
window.addEventListener('keydown', (e) => {
  if (AppState.mode !== 'calculator' || AppState.calculator.tool !== 'numeric') return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const active = document.activeElement;
  const tag = active ? active.tagName : '';
  const isCalcInput = active && active.id === 'calc-num-expr-input';
  if ((tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') && !isCalcInput) return;

  const key = e.key;
  if (key === 'Enter' || key === '=') {
    e.preventDefault();
    evalMathExpr();
    return;
  }
  if (isCalcInput) return;

  if (/^[0-9+\-*/().%]$/.test(key)) {
    e.preventDefault();
    appendCalcKey(key);
  } else if (key === ',') {
    e.preventDefault();
    appendCalcKey('.');
  } else if (key === 'Backspace') {
    e.preventDefault();
    appendCalcKey('BACK');
  } else if (key === 'Delete' || key === 'Escape') {
    e.preventDefault();
    appendCalcKey('C');
  }
});

// 6.7 Logística — Modo A: conta diretamente a partir do grafo atual (fonte única da verdade)
function computeLogisticsFromGraph(graph) {
  const { belts, pipes } = Solver.getBeltsAndPipes();
  const data = window.SATISFACTORY_DATA || {};
  const splitterOut = data.logistics?.Build_ConveyorAttachmentSplitter_C?.outPorts || 3;
  const mergerIn = data.logistics?.Build_ConveyorAttachmentMerger_C?.inPorts || 3;
  const juncPorts = data.logistics?.Build_PipelineJunction_Cross_C?.outPorts || 2;

  const beltCounts = new Map();
  const pipeCounts = new Map();
  const itemTotals = new Map();
  const outDeg = new Map();
  const inDeg = new Map();

  let explicitSplitters = 0;
  let explicitMergers = 0;
  let explicitJunctions = 0;

  (graph?.columns || []).forEach(col => {
    (col.nodes || []).forEach(n => {
      const mult = n.badgeText && /^×(\d+)/.test(n.badgeText) ? Number(n.badgeText.slice(1)) : 1;
      if (n.kind === 'splitter' || n.kind === 'smart_splitter' || n.kind === 'programmable_splitter') explicitSplitters += mult;
      else if (n.kind === 'merger' || n.kind === 'priority_merger') explicitMergers += mult;
      else if (n.kind === 'pipe_junction') explicitJunctions += mult;
    });
  });

  (graph?.edges || []).forEach(e => {
    const rate = Math.max(0, Number(e.rate) || 0);
    const isFluid = Boolean(e.isPipe || e.item?.isFluid);
    const tiers = isFluid ? pipes : belts;
    const maxTier = tiers[tiers.length - 1];
    const best = tiers.find(t => t.ratePerMin >= rate) || maxTier;
    const parallel = maxTier && rate > maxTier.ratePerMin ? Math.ceil(rate / maxTier.ratePerMin) : 1;
    const map = isFluid ? pipeCounts : beltCounts;
    const key = best ? best.id : (isFluid ? 'pipe' : 'belt');
    const prev = map.get(key) || { tier: best, lines: 0, totalRate: 0 };
    prev.lines += parallel;
    prev.totalRate += rate;
    map.set(key, prev);

    if (e.item?.id) {
      const ip = itemTotals.get(e.item.id) || { item: e.item, totalRate: 0, lines: 0 };
      ip.totalRate += rate;
      ip.lines += parallel;
      itemTotals.set(e.item.id, ip);
    }

    const ok = `${e.from}|${isFluid ? 'f' : 's'}`;
    const ik = `${e.to}|${isFluid ? 'f' : 's'}`;
    outDeg.set(ok, (outDeg.get(ok) || 0) + 1);
    inDeg.set(ik, (inDeg.get(ik) || 0) + 1);
  });

  let inferredSplitters = 0;
  let inferredMergers = 0;
  let inferredJunctions = 0;
  outDeg.forEach((n, k) => {
    if (n <= 1) return;
    if (k.endsWith('|f')) inferredJunctions += Math.ceil((n - 1) / Math.max(1, juncPorts - 1));
    else inferredSplitters += Math.ceil((n - 1) / Math.max(1, splitterOut - 1));
  });
  inDeg.forEach((n, k) => {
    if (n <= 1) return;
    if (k.endsWith('|f')) inferredJunctions += Math.ceil((n - 1) / Math.max(1, juncPorts - 1));
    else inferredMergers += Math.ceil((n - 1) / Math.max(1, mergerIn - 1));
  });

  return {
    belts: Array.from(beltCounts.values()),
    pipes: Array.from(pipeCounts.values()),
    splitters: Math.max(explicitSplitters, inferredSplitters),
    mergers: Math.max(explicitMergers, inferredMergers),
    junctions: Math.max(explicitJunctions, inferredJunctions),
    items: Array.from(itemTotals.values()),
    edgeCount: (graph?.edges || []).length
  };
}

function computeCalcToolResult() {
  const c = AppState.calculator;
  const data = window.SATISFACTORY_DATA || {};
  const powerExp = data.rules?.powerExponent || 1.321929;

  // 6.2 RECURSOS (substitui Clock & Overclock) — sem extratoras/mineradoras, overclock por tipo de máquina
  if (c.tool === 'resources') {
    const missing = [];
    if (!c.resItemId) missing.push('produto');
    if (!c.resTargetRate || Number(c.resTargetRate) <= 0) missing.push('quantidade (/min)');
    if (missing.length > 0) {
      return { title: 'Recursos', incomplete: true, missingText: `Informe: ${missing.join(', ')}.`, heroLabel: 'Aguardando dados', heroValue: '—', rows: [] };
    }

    const item = Solver.getItem(c.resItemId);
    const recipeOverrides = c.resRecipeId ? { [c.resItemId]: c.resRecipeId } : {};
    // Primeiro calcula a cadeia para descobrir os tipos de máquina, aplicando overclock por tipo de máquina
    const basePlan = Solver.solveProductionChain({
      targets: [{ id: 'calc_t', itemId: c.resItemId, rate: Number(c.resTargetRate) }],
      recipeOverrides,
      stepSettings: {},
      minerSettings: {}
    });

    const stepSettings = {};
    (basePlan?.steps || []).forEach(st => {
      const mId = st.machine?.id;
      const oc = mId && c.resMachineClocks?.[mId] ? Math.max(100, Math.min(250, Number(c.resMachineClocks[mId]))) : 100;
      stepSettings[st.itemId] = { clockPercent: oc };
    });

    const plan = Solver.solveProductionChain({
      targets: [{ id: 'calc_t', itemId: c.resItemId, rate: Number(c.resTargetRate) }],
      recipeOverrides,
      stepSettings,
      minerSettings: {}
    });

    if (!plan || !plan.steps || plan.steps.length === 0) {
      return { title: item?.name || 'Recursos', incomplete: true, missingText: 'Nenhuma receita encontrada para este item.', heroLabel: '—', heroValue: '—', rows: [] };
    }

    // Agrega máquinas por tipo (SEM extratoras e mineradoras), energia e fragmentos
    const byMachine = new Map();
    let totalMachines = 0;
    let totalPowerMw = 0;
    let totalShards = 0;
    const excessMap = new Map();

    plan.steps.forEach(st => {
      const m = st.machine;
      if (!m) return;
      const cnt = Math.max(1, Math.ceil(st.exactMachines || st.machineCount || 1));
      const oc = stepSettings[st.itemId]?.clockPercent || 100;
      const baseMw = st.recipe?.avgPowerMw ?? m.powerConsumption ?? 0;
      const mw = baseMw * Math.pow(oc / 100, powerExp) * cnt;
      totalMachines += cnt;
      totalPowerMw += mw;
      totalShards += getShardsForClock(oc) * cnt;

      const prev = byMachine.get(m.id) || { machine: m, count: 0, clock: oc, mw: 0 };
      prev.count += cnt;
      prev.mw += mw;
      byMachine.set(m.id, prev);

      // Excesso por arredondamento de máquinas inteiras ou subprodutos
      const producedMain = (st.ratePerMachine || 0) * cnt;
      const excessMain = producedMain - (st.requiredRate || 0);
      if (excessMain > 0.05) {
        excessMap.set(st.itemId, (excessMap.get(st.itemId) || 0) + excessMain);
      }
      (st.recipe?.products || []).filter(p => p.item !== st.itemId).forEach(by => {
        const out = by.ratePerMin * (oc / 100) * cnt;
        if (out > 0.01) excessMap.set(by.item, (excessMap.get(by.item) || 0) + out);
      });
    });

    const rows = [];
    Array.from(byMachine.values()).forEach(entry => {
      rows.push({
        label: `${entry.machine.name} (${entry.clock}%)`,
        value: `${entry.count}× · ⚡ ${fmt(entry.mw, 1)} MW`,
        icon: entry.machine
      });
    });
    (plan.rawResources || []).forEach(r => {
      rows.push({
        label: `Recurso: ${r.item?.name || r.itemId}`,
        value: `${fmt(r.requiredRate, 1)} ${r.item?.unit || 'un'}/min`,
        icon: r.item
      });
    });
    rows.push({ label: 'Energia necessária (sem extratores)', value: `⚡ ${fmt(totalPowerMw, 1)} MW`, highlight: true });
    if (totalShards > 0) {
      rows.push({ label: 'Fragmentos de Energia', value: `💎 ${totalShards}` });
    }
    excessMap.forEach((rate, itemId) => {
      const it = Solver.getItem(itemId);
      rows.push({ label: `Excesso: ${it ? it.name : itemId}`, value: `+${fmt(rate, 2)} ${it?.unit || 'un'}/min`, icon: it });
    });

    return {
      title: `${item?.name || ''} — ${fmt(c.resTargetRate, 1)} ${item?.unit || 'un'}/min`,
      heroLabel: 'Máquinas necessárias (sem extratores)',
      heroValue: `${totalMachines}× · ⚡ ${fmt(totalPowerMw, 1)} MW`,
      rows,
      machineTypes: Array.from(byMachine.values()),
      planAction: { itemId: c.resItemId, rate: Number(c.resTargetRate), recipeId: c.resRecipeId }
    };
  }

  // 6.3 PRODUÇÃO (substitui Máquinas para X/min) — sem geradores de energia
  if (c.tool === 'production') {
    const missing = [];
    if (!c.prodMachineId) missing.push('máquina');
    if (!c.prodMachineCount || Number(c.prodMachineCount) <= 0) missing.push('quantidade de máquinas');
    if (!c.prodRecipeId) missing.push('receita');
    if (missing.length > 0) {
      return { title: 'Produção', incomplete: true, missingText: `Informe: ${missing.join(', ')}.`, heroLabel: 'Aguardando dados', heroValue: '—', rows: [] };
    }

    const machine = Solver.getMachine(c.prodMachineId);
    const recipe = Solver.getRecipe(c.prodRecipeId);
    if (!machine || !recipe) {
      return { title: 'Produção', incomplete: true, missingText: 'Selecione máquina e receita.', heroLabel: '—', heroValue: '—', rows: [] };
    }

    const count = Math.max(1, Math.round(Number(c.prodMachineCount) || 1));
    const clock = Math.max(100, Math.min(250, Number(c.prodClock) || 100));
    const mult = (clock / 100) * count;
    const mainProd = recipe.products?.[0];
    const mainItem = mainProd ? Solver.getItem(mainProd.item) : null;
    const mainOutRate = mainProd ? mainProd.ratePerMin * mult : 0;
    const baseMw = recipe.avgPowerMw ?? machine.powerConsumption ?? 0;
    const totalMw = baseMw * Math.pow(clock / 100, powerExp) * count;
    const totalShards = getShardsForClock(clock) * count;

    const rows = [];
    (recipe.products || []).slice(1).forEach(by => {
      const it = Solver.getItem(by.item);
      rows.push({ label: `Excesso (subproduto): ${it ? it.name : by.item}`, value: `+${fmt(by.ratePerMin * mult, 2)} ${it?.unit || 'un'}/min`, icon: it, highlight: true });
    });

    const collapsibleRows = [
      ...(recipe.ingredients || []).map(ing => {
        const it = Solver.getItem(ing.item);
        return { label: `Consome: ${it ? it.name : ing.item}`, value: `${fmt(ing.ratePerMin * mult, 2)} ${it?.unit || 'un'}/min`, icon: it };
      }),
      { label: 'Energia necessária', value: `⚡ ${fmt(totalMw, 1)} MW` },
      ...(totalShards > 0 ? [{ label: 'Fragmentos de Energia', value: `💎 ${totalShards}` }] : [])
    ];

    return {
      title: `${count}× ${machine.name} (${clock}%)`,
      heroLabel: mainItem ? `Produção de ${mainItem.name}` : 'Produção',
      heroValue: mainItem ? `${fmt(mainOutRate, 2)} ${mainItem.unit || 'un'}/min` : '—',
      rows,
      collapsibleTitle: 'Insumos consumidos e energia',
      collapsibleRows,
      planAction: mainItem ? { itemId: mainItem.id, rate: mainOutRate, recipeId: recipe.id } : null
    };
  }

  // 6.4 ENERGIA (mesma lógica da aba Energia: por MW ou por geradores, nada pré-definido)
  if (c.tool === 'energy') {
    const missing = [];
    if (c.energyMode === 'by_mw' && (!c.energyTargetMw || Number(c.energyTargetMw) <= 0)) missing.push('energia desejada (MW)');
    if (!c.genId) missing.push('gerador');
    if (!c.genFuelId) missing.push('combustível');
    if (c.energyMode === 'by_generators' && (!c.genCount || Number(c.genCount) <= 0)) missing.push('quantidade de geradores');
    if (missing.length > 0) {
      return { title: 'Energia', incomplete: true, missingText: `Informe: ${missing.join(', ')}.`, heroLabel: 'Aguardando dados', heroValue: '—', rows: [] };
    }

    const gen = Solver.getPowerGenerators().find(g => g.id === c.genId);
    const fuelObj = (gen?.fuels || []).find(f => f.itemId === c.genFuelId);
    const fuelItem = fuelObj ? Solver.getItem(fuelObj.itemId) : null;
    const waterPump = data.extractors?.Build_WaterPump_C;
    const pumpRate = waterPump?.baseRatePerMin || 120;
    const pumpMw = waterPump?.powerConsumption || 20;

    const clock = Math.max(100, Math.min(250, Number(c.genClock) || 100));
    const marginPct = Math.max(0, Math.min(100, Number(c.genMarginPct) || 0));
    const mwPerGen = (gen.powerProduction || 0) * (clock / 100);
    const count = c.energyMode === 'by_mw'
      ? Math.max(1, Math.ceil((Number(c.energyTargetMw) * (1 + marginPct / 100)) / Math.max(0.01, mwPerGen)))
      : Math.max(1, Math.round(Number(c.genCount) || 1));

    const grossMw = mwPerGen * count;
    const totalFuel = (fuelObj?.ratePerMin || 0) * (clock / 100) * count;
    const totalWater = (fuelObj?.waterPerMin || 0) * (clock / 100) * count;
    const waterPumps = totalWater > 0 ? Math.ceil(totalWater / pumpRate) : 0;
    const waterMw = waterPumps * pumpMw;
    const netMw = grossMw - waterMw;
    const totalShards = getShardsForClock(clock) * count;

    const rows = [
      { label: gen.name, value: `${count}× (${fmt(mwPerGen, 1)} MW cada)`, icon: gen },
      { label: `Combustível: ${fuelItem?.name || ''}`, value: `${fmt(totalFuel, 2)} ${fuelItem?.unit || 'un'}/min`, icon: fuelItem }
    ];
    if (totalWater > 0) {
      rows.push({ label: 'Água necessária', value: `💧 ${fmt(totalWater, 1)} m³/min (${waterPumps}× Bomba · ${fmt(waterMw, 1)} MW)` });
    }
    rows.push({ label: 'Energia líquida', value: `⚡ ${fmt(netMw, 1)} MW`, highlight: true });
    if (totalShards > 0) rows.push({ label: 'Fragmentos de Energia', value: `💎 ${totalShards}` });

    return {
      title: `${count}× ${gen.name} (${clock}%)`,
      heroLabel: 'Energia gerada',
      heroValue: `⚡ ${fmt(grossMw, 1)} MW`,
      rows,
      powerAction: { genId: gen.id, fuelId: fuelObj.itemId, count, clock }
    };
  }

  // 6.7 LOGÍSTICA (Modo A: grafo existente | Modo B: avulso)
  if (c.tool === 'logistics') {
    if (c.logMode === 'graph') {
      const g = AppState.canvas.lastGraph;
      if (!g || !g.edges || g.edges.length === 0) {
        return { title: 'Logística da Linha', incomplete: true, missingText: 'Monte uma linha em Produção ou Oficina para ler o grafo.', heroLabel: 'Nenhuma linha ativa', heroValue: '—', rows: [] };
      }
      const stats = computeLogisticsFromGraph(g);
      const lenM = Number(c.logLengthMeters) > 0 ? Number(c.logLengthMeters) : 0;
      const rows = [];
      stats.belts.forEach(b => {
        const mTxt = lenM > 0 ? ` · ${fmt(b.lines * lenM, 0)} m` : '';
        rows.push({ label: b.tier?.name || 'Esteira', value: `${b.lines} linha(s) · ${fmt(b.totalRate, 1)} un/min${mTxt}`, icon: b.tier });
      });
      stats.pipes.forEach(p => {
        const mTxt = lenM > 0 ? ` · ${fmt(p.lines * lenM, 0)} m` : '';
        rows.push({ label: p.tier?.name || 'Tubulação', value: `${p.lines} linha(s) · ${fmt(p.totalRate, 1)} m³/min${mTxt}`, icon: p.tier });
      });
      if (stats.splitters > 0) rows.push({ label: 'Divisores de Esteira', value: `${stats.splitters}×`, icon: data.logistics?.Build_ConveyorAttachmentSplitter_C, highlight: true });
      if (stats.mergers > 0) rows.push({ label: 'Unificadores de Esteira', value: `${stats.mergers}×`, icon: data.logistics?.Build_ConveyorAttachmentMerger_C, highlight: true });
      if (stats.junctions > 0) rows.push({ label: 'Junções de Tubulação', value: `${stats.junctions}×`, icon: data.logistics?.Build_PipelineJunction_Cross_C, highlight: true });
      stats.items.forEach(it => {
        rows.push({ label: `Item: ${it.item.name}`, value: `${fmt(it.totalRate, 1)} ${it.item.unit || 'un'}/min (${it.lines} conexões)`, icon: it.item });
      });
      return {
        title: 'Logística da Linha Atual',
        heroLabel: 'Conexões no grafo',
        heroValue: `${stats.edgeCount} conexões`,
        rows
      };
    } else {
      const missing = [];
      if (!c.logItemId) missing.push('item');
      if (!c.logTotalRate || Number(c.logTotalRate) <= 0) missing.push('vazão total (/min)');
      if (!c.logBranches || Number(c.logBranches) < 2) missing.push('ramais (mín. 2)');
      if (missing.length > 0) {
        return { title: 'Logística Avulsa', incomplete: true, missingText: `Informe: ${missing.join(', ')}.`, heroLabel: 'Aguardando dados', heroValue: '—', rows: [] };
      }

      const { belts, pipes } = Solver.getBeltsAndPipes();
      const isFluid = c.logKind === 'fluid';
      const tiers = isFluid ? pipes : belts;
      const maxTier = tiers[tiers.length - 1];
      const totalRate = Number(c.logTotalRate);
      const branches = Math.max(2, Math.round(Number(c.logBranches)));
      const ratePerBranch = totalRate / branches;
      const unit = isFluid ? 'm³/min' : 'un/min';

      const trunkTier = tiers.find(t => t.ratePerMin >= totalRate) || maxTier;
      const branchTier = tiers.find(t => t.ratePerMin >= ratePerBranch) || maxTier;
      const parallelTrunks = maxTier && totalRate > maxTier.ratePerMin ? Math.ceil(totalRate / maxTier.ratePerMin) : 1;

      const compObj = isFluid
        ? data.logistics?.Build_PipelineJunction_Cross_C
        : (c.logAction === 'split' ? data.logistics?.Build_ConveyorAttachmentSplitter_C : data.logistics?.Build_ConveyorAttachmentMerger_C);
      const fanFactor = isFluid
        ? Math.max(2, Number(compObj?.outPorts) || 2)
        : (c.logAction === 'split' ? Math.max(2, Number(compObj?.outPorts) || 3) : Math.max(2, Number(compObj?.inPorts) || 3));
      const compCount = Math.max(1, Math.ceil((branches - 1) / (fanFactor - 1)));
      const lenM = Number(c.logLengthMeters) > 0 ? Number(c.logLengthMeters) : 0;

      const rows = [
        { label: 'Tronco mínimo', value: `${parallelTrunks > 1 ? parallelTrunks + '× ' : ''}${trunkTier?.name || ''} (${fmt(totalRate, 1)} ${unit})`, icon: trunkTier, highlight: parallelTrunks > 1 },
        { label: 'Cada ramal', value: `${branchTier?.name || ''} (${fmt(ratePerBranch, 2)} ${unit})`, icon: branchTier },
        { label: compObj?.name || 'Componente', value: `${compCount}× (${branches} ramais)`, icon: compObj, highlight: true }
      ];
      if (lenM > 0) {
        rows.push({ label: 'Comprimento estimado', value: `${fmt((parallelTrunks + branches) * lenM, 0)} m totais` });
      }
      const miniTree = c.logAction === 'split'
        ? `[${fmt(totalRate, 1)} ${unit}] → ${compCount}× ${compObj?.name || 'Divisor'} → ${branches}× [${fmt(ratePerBranch, 1)} ${unit}]`
        : `${branches}× [${fmt(ratePerBranch, 1)} ${unit}] → ${compCount}× ${compObj?.name || 'Unificador'} → [${fmt(totalRate, 1)} ${unit}]`;

      return {
        title: `Logística — ${Solver.getItem(c.logItemId)?.name || ''}`,
        heroLabel: compObj?.name || 'Componentes necessários',
        heroValue: `${compCount}× · ${parallelTrunks > 1 ? parallelTrunks + ' troncos paralelos' : trunkTier?.shortName || ''}`,
        rows,
        miniTree
      };
    }
  }

  // 6.5 TRITURADOR SUPIMPA (todos os itens trituráveis, pontos oficiais exatos)
  if (c.tool === 'sink') {
    const missing = [];
    if (!c.sinkItemId) missing.push('item');
    if ((!c.sinkQty || Number(c.sinkQty) <= 0) && (!c.sinkRate || Number(c.sinkRate) <= 0)) missing.push('quantidade ou taxa (/min)');
    if (missing.length > 0) {
      return { title: 'Triturador SUPIMPA', incomplete: true, missingText: `Informe: ${missing.join(', ')}.`, heroLabel: 'Aguardando dados', heroValue: '—', rows: [] };
    }

    const item = Solver.getItem(c.sinkItemId);
    const ptsEach = Number(item?.sinkPoints) || 0;
    const qty = Math.max(0, Number(c.sinkQty) || 0);
    const rate = Math.max(0, Number(c.sinkRate) || 0);
    const ptsForQty = ptsEach * qty;
    const ptsPerMin = ptsEach * rate;
    const ptsPerHour = ptsPerMin * 60;

    return {
      title: `Triturador SUPIMPA — ${item?.name || ''}`,
      heroLabel: 'Pontos por minuto',
      heroValue: `${fmt(ptsPerMin, 0)} pts/min`,
      rows: [
        { label: 'Pontos por item (oficial)', value: `${fmt(ptsEach, 0)} pts`, icon: item, highlight: true },
        { label: `Total por quantidade (${fmt(qty, 0)}×)`, value: `${fmt(ptsForQty, 0)} pts` },
        { label: `Por minuto (${fmt(rate, 2)} /min)`, value: `${fmt(ptsPerMin, 0)} pts/min` },
        { label: 'Por hora', value: `${fmt(ptsPerHour, 0)} pts/h` }
      ]
    };
  }

  // 6.6 ELEVADOR ESPACIAL (5 fases oficiais 1.0 + entregue + faltando + progresso)
  if (c.tool === 'elevator') {
    const phases = Array.isArray(data.spaceElevatorPhases) ? data.spaceElevatorPhases : [];
    const ph = phases.find(p => Number(p.phase) === Number(c.elevatorPhase)) || phases[0];
    if (!ph) {
      return { title: 'Elevador Espacial', incomplete: true, missingText: 'Dados das fases indisponíveis.', heroLabel: '—', heroValue: '—', rows: [] };
    }
    let totalReq = 0;
    let totalDeliv = 0;
    const rows = (ph.requirements || []).map(req => {
      const it = Solver.getItem(req.item);
      const deliv = Math.min(req.amount, Math.max(0, Number(c.elevatorDelivered?.[`${ph.phase}_${req.item}`]) || 0));
      const rem = Math.max(0, req.amount - deliv);
      totalReq += req.amount;
      totalDeliv += deliv;
      return {
        label: it ? it.name : req.item,
        value: rem === 0 ? `Concluído (${fmt(req.amount, 0)}/${fmt(req.amount, 0)})` : `Faltam ${fmt(rem, 0)} de ${fmt(req.amount, 0)}`,
        icon: it,
        highlight: rem === 0
      };
    });
    const pct = totalReq > 0 ? Math.min(100, (totalDeliv / totalReq) * 100) : 0;
    return {
      title: `${ph.name} (${ph.unlocks})`,
      heroLabel: 'Progresso da fase',
      heroValue: `${fmt(pct, 1)}%`,
      progressPct: pct,
      rows
    };
  }

  return { title: 'Calculadora', heroLabel: 'Resultado', heroValue: c.exprResult || '0', rows: [] };
}

function renderCalcResultPanelHtml() {
  const res = computeCalcToolResult();
  return `
    <div class="calc-card calc-result-card">
      <div class="calc-card-head">
        <h4>Resultado</h4>
        <span class="calc-card-sub">${libEsc(res.title || '')}</span>
      </div>
      ${res.incomplete ? `
        <div class="calc-incomplete-box">${libEsc(res.missingText || 'Preencha os campos obrigatórios à esquerda.')}</div>
      ` : `
        <div class="calc-result-hero">
          <span class="calc-hero-lbl">${libEsc(res.heroLabel || '')}</span>
          <strong class="calc-hero-val">${libEsc(res.heroValue || '—')}</strong>
          ${typeof res.progressPct === 'number' ? `<div class="calc-progress-track"><div class="calc-progress-fill" style="width:${res.progressPct.toFixed(1)}%;"></div></div>` : ''}
        </div>
        ${res.miniTree ? `<div class="calc-mini-tree">${libEsc(res.miniTree)}</div>` : ''}
        <div class="calc-result-rows">
          ${(res.rows || []).map(r => `
            <div class="calc-res-row ${r.highlight ? 'is-highlight' : ''}">
              <span class="calc-res-lbl">${r.icon ? renderEntityIcon(r.icon, 20) : ''}${libEsc(r.label)}</span>
              <strong class="calc-res-val">${libEsc(r.value)}</strong>
            </div>
          `).join('')}
        </div>
        ${res.collapsibleRows && res.collapsibleRows.length > 0 ? `
          <details class="sb-3d-details">
            <summary>${libEsc(res.collapsibleTitle || 'Detalhes')}</summary>
            <div class="calc-result-rows" style="margin-top:8px;">
              ${res.collapsibleRows.map(r => `
                <div class="calc-res-row">
                  <span class="calc-res-lbl">${r.icon ? renderEntityIcon(r.icon, 18) : ''}${libEsc(r.label)}</span>
                  <strong class="calc-res-val">${libEsc(r.value)}</strong>
                </div>
              `).join('')}
            </div>
          </details>
        ` : ''}
        <div class="calc-actions-bar">
          ${res.planAction ? `<button type="button" class="calc-act-btn primary" onclick="openCalcInProduction('${res.planAction.itemId}', ${res.planAction.rate}, '${res.planAction.recipeId || ''}')">🏭 Planejar</button>` : ''}
          ${res.powerAction ? `<button type="button" class="calc-act-btn primary" onclick="openCalcInPower('${res.powerAction.genId}', '${res.powerAction.fuelId || ''}', ${res.powerAction.count}, ${res.powerAction.clock})">⚡ Energia</button>` : ''}
          <button type="button" class="calc-act-btn" onclick="copyCurrentCalcResult()">Copiar lista</button>
          <button type="button" class="calc-act-btn" onclick="pinCurrentCalc(true)">Fixar</button>
          <button type="button" class="calc-act-btn" onclick="shareCurrentCalcLink()">Link</button>
        </div>
      `}
    </div>
  `;
}

function updateCalcResultOnly() {
  const el = document.getElementById('calc-result-panel');
  if (el) el.innerHTML = renderCalcResultPanelHtml();
}

function getCurrentCalcSnapshot() {
  const c = AppState.calculator;
  const res = computeCalcToolResult();
  return {
    id: `calc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    tool: c.tool,
    label: res.title || c.tool,
    summary: `${res.heroLabel || ''}: ${res.heroValue || '—'}`.trim(),
    state: { ...c, recents: undefined, numHistory: undefined },
    pinned: false,
    at: new Date().toISOString()
  };
}

function pinCurrentCalc(pinFlag = true) {
  const snap = getCurrentCalcSnapshot();
  snap.pinned = pinFlag;
  const list = (AppState.calculator.recents || []).filter(r => r.summary !== snap.summary);
  list.unshift(snap);
  list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  AppState.calculator.recents = list.slice(0, 20);
  persistCalcHistory();
  renderCalcRecentsStrip();
  if (typeof showAccountToast === 'function') showAccountToast('Cálculo fixado.', 'success');
}

function removeCalcRecent(id) {
  AppState.calculator.recents = (AppState.calculator.recents || []).filter(r => r.id !== id);
  persistCalcHistory();
  renderCalcRecentsStrip();
}

function restoreCalcRecent(id) {
  const entry = (AppState.calculator.recents || []).find(r => r.id === id);
  if (!entry || !entry.state) return;
  Object.assign(AppState.calculator, entry.state);
  renderAll(false);
}

function copyCurrentCalcResult() {
  const res = computeCalcToolResult();
  const lines = [
    res.title,
    `${res.heroLabel}: ${res.heroValue}`,
    ...(res.rows || []).map(r => `${r.label}: ${r.value}`)
  ].join('\n');
  navigator.clipboard?.writeText(lines).then(() => {
    if (typeof showAccountToast === 'function') showAccountToast('Lista copiada.', 'success');
  }).catch(() => {});
}

function shareCurrentCalcLink() {
  const snap = getCurrentCalcSnapshot();
  try {
    const encoded = btoa(encodeURIComponent(JSON.stringify(snap.state)));
    const url = `${window.location.origin}${window.location.pathname}#calc=${encoded}`;
    navigator.clipboard?.writeText(url).then(() => {
      if (typeof showAccountToast === 'function') showAccountToast('Link copiado.', 'success');
    }).catch(() => {});
  } catch {}
}

function openCalcInProduction(itemId, targetRate, recipeId) {
  if (!itemId) return;
  AppState.production.driver = 'product';
  AppState.production.mounted = true;
  AppState.pull.targets = [{ id: uid(), itemId, rate: Math.max(0.1, Number(targetRate) || 10) }];
  AppState.pull.recipeOverrides = recipeId ? { [itemId]: recipeId } : {};
  AppState.pull.stepSettings = {};
  AppState.canvas.customPositions = {};
  switchMode('production');
}

function openCalcInPower(genId, fuelId, count, clock) {
  if (genId) AppState.power.generatorId = genId;
  if (fuelId) AppState.power.fuelItemId = fuelId;
  if (count) {
    AppState.power.calcMode = 'by_generators';
    AppState.power.generatorCount = Math.max(1, Math.round(count));
    AppState.power.manualGenerators = AppState.power.generatorCount;
  }
  if (clock) AppState.power.clockPercent = Math.max(100, Math.min(250, Math.round(clock)));
  AppState.power.mounted = true;
  switchMode('power');
}

function renderCalcRecentsStrip() {
  const strip = document.getElementById('calc-recents-strip');
  if (!strip) return;
  const list = AppState.calculator.recents || [];
  if (list.length === 0) {
    strip.innerHTML = '<div class="calc-recents-empty">Use "Fixar" para salvar cálculos frequentes aqui.</div>';
    return;
  }
  strip.innerHTML = list.map(r => `
    <div class="calc-recent-chip ${r.pinned ? 'is-pinned' : ''}">
      <button type="button" class="calc-recent-main" onclick="restoreCalcRecent('${r.id}')">
        ${r.pinned ? '📌 ' : ''}<strong>${libEsc(r.label)}</strong> · ${libEsc(r.summary)}
      </button>
      <button type="button" class="calc-recent-del" onclick="removeCalcRecent('${r.id}')" title="Remover">✕</button>
    </div>
  `).join('');
}

function renderCalcInputsPanelHtml() {
  const c = AppState.calculator;
  const data = window.SATISFACTORY_DATA || {};

  // 6.2 RECURSOS
  if (c.tool === 'resources') {
    const item = c.resItemId ? Solver.getItem(c.resItemId) : null;
    const recipes = c.resItemId ? (Solver.indexes.recipesByProduct.get(c.resItemId) || []) : [];
    const recipe = recipes.find(r => r.id === c.resRecipeId) || recipes.find(r => !r.isAlternate) || recipes[0] || null;
    const resObj = computeCalcToolResult();
    const machineTypes = resObj.machineTypes || [];

    return `
      <div class="calc-card">
        <div class="calc-card-head"><h4>Entradas</h4></div>
        <div class="field-group">
          <label>Produto</label>
          <button type="button" class="calc-entity-pick-btn" onclick="openCalcItemPicker('resItemId', it => (Solver.indexes.recipesByProduct.get(it.id)||[]).length > 0, 'Escolher Produto')">
            ${item ? renderEntityIcon(item, 28) : ''}
            <span>${item ? libEsc(item.name) : 'Escolher produto...'}</span>
            <span class="calc-pick-caret">▾</span>
          </button>
        </div>
        ${recipes.length > 0 ? `
          <div class="field-group">
            <label>Receita (${recipes.length})</label>
            ${renderRecipePickerTriggerHtml(recipe, recipes, `setCalcField('resRecipeId', __RID__, true)`)}
          </div>
        ` : ''}
        <div class="field-group">
          <label>Quantidade desejada (${item?.unit || 'un'}/min)</label>
          <div class="calc-qty-row">
            <button type="button" class="oc-step-btn" onclick="stepCalcNumber('resTargetRate', -5, 0.1)">−</button>
            <input type="number" class="sidebar-input" min="0.1" step="any" placeholder="Ex.: 30" value="${c.resTargetRate === '' ? '' : c.resTargetRate}" oninput="setCalcField('resTargetRate', this.value === '' ? '' : Math.max(0.01, parseFloat(this.value)||0), false)" />
            <button type="button" class="oc-step-btn" onclick="stepCalcNumber('resTargetRate', 5, 0.1)">+</button>
          </div>
        </div>
        ${machineTypes.length > 0 ? `
          <div class="calc-per-machine-oc">
            <div class="calc-conv-title">Overclock opcional por tipo de máquina</div>
            ${machineTypes.map(mt => `
              <div class="calc-mt-oc-card">
                <div class="calc-mt-oc-head">
                  ${renderEntityIcon(mt.machine, 24)}
                  <strong>${libEsc(mt.machine.name)} (${mt.count}×)</strong>
                </div>
                ${renderOverclockSliderHtml({ value: c.resMachineClocks?.[mt.machine.id] || 100, onChangeExpr: `setCalcResMachineClock('${mt.machine.id}', __VAL__)`, label: 'Overclock' })}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  // 6.3 PRODUÇÃO (sem geradores de energia)
  if (c.tool === 'production') {
    const machines = Solver.getProductionMachines();
    const machine = c.prodMachineId ? machines.find(m => m.id === c.prodMachineId) : null;
    const recs = machine ? Solver.getRecipesByMachine(machine.id).filter(r => !r.isFicsmas) : [];
    const recipe = recs.find(r => r.id === c.prodRecipeId) || null;

    return `
      <div class="calc-card">
        <div class="calc-card-head"><h4>Entradas</h4></div>
        <div class="field-group">
          <label>Máquina</label>
          <select class="sidebar-select" onchange="setCalcField('prodMachineId', this.value, true)">
            <option value="" ${!machine ? 'selected' : ''}>Escolher máquina...</option>
            ${machines.map(m => `<option value="${m.id}" ${m.id === machine?.id ? 'selected' : ''}>${libEsc(m.name)}</option>`).join('')}
          </select>
        </div>
        ${machine ? `
          <div class="field-group">
            <label>Receita (${recs.length})</label>
            ${renderRecipePickerTriggerHtml(recipe, recs, `setCalcField('prodRecipeId', __RID__, true)`)}
          </div>
        ` : ''}
        <div class="field-group">
          <label>Quantidade de máquinas</label>
          <div class="calc-qty-row">
            <button type="button" class="oc-step-btn" onclick="stepCalcNumber('prodMachineCount', -1, 1)">−</button>
            <input type="number" class="sidebar-input" min="1" step="1" placeholder="Ex.: 4" value="${c.prodMachineCount === '' ? '' : c.prodMachineCount}" oninput="setCalcField('prodMachineCount', this.value === '' ? '' : Math.max(1, Math.round(parseFloat(this.value)||1)), false)" />
            <button type="button" class="oc-step-btn" onclick="stepCalcNumber('prodMachineCount', 1, 1)">+</button>
          </div>
        </div>
        <div class="field-group">
          ${renderOverclockSliderHtml({ value: c.prodClock, onChangeExpr: `setCalcField('prodClock', __VAL__, true)`, label: 'Overclock' })}
        </div>
      </div>
    `;
  }

  // 6.4 ENERGIA
  if (c.tool === 'energy') {
    const gens = Solver.getPowerGenerators();
    const gen = c.genId ? gens.find(g => g.id === c.genId) : null;
    return `
      <div class="calc-card">
        <div class="calc-card-head"><h4>Entradas</h4></div>
        <div class="btn-group-row">
          <button type="button" class="seg-btn ${c.energyMode === 'by_mw' ? 'active' : ''}" onclick="setCalcField('energyMode', 'by_mw', true)">Por energia (MW)</button>
          <button type="button" class="seg-btn ${c.energyMode === 'by_generators' ? 'active' : ''}" onclick="setCalcField('energyMode', 'by_generators', true)">Por geradores</button>
        </div>
        ${c.energyMode === 'by_mw' ? `
          <div class="field-group">
            <label>Energia desejada (MW)</label>
            <input type="number" class="sidebar-input" min="1" step="any" placeholder="Ex.: 1200" value="${c.energyTargetMw === '' ? '' : c.energyTargetMw}" oninput="setCalcField('energyTargetMw', this.value === '' ? '' : Math.max(1, parseFloat(this.value)||0), false)" />
          </div>
        ` : ''}
        <div class="field-group">
          <label>Gerador</label>
          <select class="sidebar-select" onchange="setCalcField('genId', this.value, true)">
            <option value="" ${!gen ? 'selected' : ''}>Escolher gerador...</option>
            ${gens.map(g => `<option value="${g.id}" ${g.id === gen?.id ? 'selected' : ''}>${libEsc(g.name)} (${fmt(g.powerProduction, 0)} MW)</option>`).join('')}
          </select>
        </div>
        ${gen ? `
          <div class="field-group">
            <label>Combustível</label>
            <select class="sidebar-select" onchange="setCalcField('genFuelId', this.value, true)">
              <option value="" ${!c.genFuelId ? 'selected' : ''}>Escolher combustível...</option>
              ${(gen.fuels || []).map(f => {
                const it = Solver.getItem(f.itemId);
                return `<option value="${f.itemId}" ${f.itemId === c.genFuelId ? 'selected' : ''}>${libEsc(it ? it.name : f.itemId)} (${fmt(f.ratePerMin, 2)}/min)</option>`;
              }).join('')}
            </select>
          </div>
        ` : ''}
        <div class="field-row-2">
          ${c.energyMode === 'by_generators' ? `
            <div class="field-group">
              <label>Quantidade</label>
              <input type="number" class="sidebar-input" min="1" step="1" placeholder="Ex.: 8" value="${c.genCount === '' ? '' : c.genCount}" oninput="setCalcField('genCount', this.value === '' ? '' : Math.max(1, Math.round(parseFloat(this.value)||1)), false)" />
            </div>
          ` : ''}
          <div class="field-group">
            <label>Folga (%)</label>
            <input type="number" class="sidebar-input" min="0" max="100" step="5" value="${c.genMarginPct}" oninput="setCalcField('genMarginPct', Math.max(0, Math.min(100, parseFloat(this.value)||0)), false)" />
          </div>
        </div>
        <div class="field-group">
          ${renderOverclockSliderHtml({ value: c.genClock, onChangeExpr: `setCalcField('genClock', __VAL__, true)`, label: 'Overclock' })}
        </div>
      </div>
    `;
  }

  // 6.7 LOGÍSTICA
  if (c.tool === 'logistics') {
    const item = c.logItemId ? Solver.getItem(c.logItemId) : null;
    return `
      <div class="calc-card">
        <div class="calc-card-head"><h4>Entradas</h4></div>
        <div class="btn-group-row">
          <button type="button" class="seg-btn ${c.logMode === 'graph' ? 'active' : ''}" onclick="setCalcField('logMode', 'graph', true)">Linha existente</button>
          <button type="button" class="seg-btn ${c.logMode === 'standalone' ? 'active' : ''}" onclick="setCalcField('logMode', 'standalone', true)">Avulso</button>
        </div>
        ${c.logMode === 'standalone' ? `
          <div class="field-group">
            <label>Tipo de transporte</label>
            <div class="btn-group-row">
              <button type="button" class="seg-btn ${c.logKind === 'solid' ? 'active' : ''}" onclick="setCalcField('logKind', 'solid', true)">Sólido (Esteira)</button>
              <button type="button" class="seg-btn ${c.logKind === 'fluid' ? 'active' : ''}" onclick="setCalcField('logKind', 'fluid', true)">Líquido (Tubulação)</button>
            </div>
          </div>
          <div class="field-group">
            <label>Item</label>
            <button type="button" class="calc-entity-pick-btn" onclick="openCalcItemPicker('logItemId', it => AppState.calculator.logKind === 'fluid' ? Boolean(it.isFluid) : !it.isFluid, 'Escolher Item')">
              ${item ? renderEntityIcon(item, 24) : ''}
              <span>${item ? libEsc(item.name) : 'Escolher item...'}</span>
              <span class="calc-pick-caret">▾</span>
            </button>
          </div>
          <div class="field-group">
            <label>Ação</label>
            <div class="btn-group-row">
              <button type="button" class="seg-btn ${c.logAction === 'split' ? 'active' : ''}" onclick="setCalcField('logAction', 'split', true)">Dividir</button>
              <button type="button" class="seg-btn ${c.logAction === 'merge' ? 'active' : ''}" onclick="setCalcField('logAction', 'merge', true)">Unificar</button>
            </div>
          </div>
          <div class="field-row-2">
            <div class="field-group">
              <label>Vazão total (${c.logKind === 'fluid' ? 'm³/min' : 'un/min'})</label>
              <input type="number" class="sidebar-input" min="0.1" step="any" placeholder="Ex.: 480" value="${c.logTotalRate === '' ? '' : c.logTotalRate}" oninput="setCalcField('logTotalRate', this.value === '' ? '' : Math.max(0.1, parseFloat(this.value)||0), false)" />
            </div>
            <div class="field-group">
              <label>Número de ramais</label>
              <input type="number" class="sidebar-input" min="2" step="1" placeholder="Ex.: 6" value="${c.logBranches === '' ? '' : c.logBranches}" oninput="setCalcField('logBranches', this.value === '' ? '' : Math.max(2, Math.round(parseFloat(this.value)||2)), false)" />
            </div>
          </div>
        ` : `
          <div class="calc-empty-note">Lê automaticamente as conexões, esteiras, tubulações, divisores e unificadores da linha ativa em Produção ou Oficina.</div>
        `}
        <div class="field-group">
          <label>Comprimento médio por linha em metros (opcional)</label>
          <input type="number" class="sidebar-input" min="0" step="1" placeholder="Vazio = não calcular metros" value="${c.logLengthMeters === '' ? '' : c.logLengthMeters}" oninput="setCalcField('logLengthMeters', this.value === '' ? '' : Math.max(0, parseFloat(this.value)||0), false)" />
        </div>
      </div>
    `;
  }

  // 6.5 TRITURADOR SUPIMPA
  if (c.tool === 'sink') {
    const item = c.sinkItemId ? Solver.getItem(c.sinkItemId) : null;
    const totalSinkable = Object.values(data.items || {}).filter(it => (Number(it.sinkPoints) || 0) > 0).length;
    return `
      <div class="calc-card">
        <div class="calc-card-head">
          <h4>Entradas</h4>
          <span class="calc-card-sub">${totalSinkable} itens trituráveis</span>
        </div>
        <div class="field-group">
          <label>Item para triturar</label>
          <button type="button" class="calc-entity-pick-btn" onclick="openCalcItemPicker('sinkItemId', it => (Number(it.sinkPoints)||0) > 0, 'Todos os Itens Trituráveis')">
            ${item ? renderEntityIcon(item, 28) : ''}
            <span>${item ? `${libEsc(item.name)} (${fmt(item.sinkPoints, 0)} pts)` : 'Escolher item triturável...'}</span>
            <span class="calc-pick-caret">▾</span>
          </button>
        </div>
        <div class="field-row-2">
          <div class="field-group">
            <label>Quantidade fixa (un)</label>
            <input type="number" class="sidebar-input" min="1" step="1" placeholder="Ex.: 100" value="${c.sinkQty === '' ? '' : c.sinkQty}" oninput="setCalcField('sinkQty', this.value === '' ? '' : Math.max(0, parseFloat(this.value)||0), false)" />
          </div>
          <div class="field-group">
            <label>Taxa (${item?.unit || 'un'}/min)</label>
            <input type="number" class="sidebar-input" min="0.1" step="any" placeholder="Ex.: 10" value="${c.sinkRate === '' ? '' : c.sinkRate}" oninput="setCalcField('sinkRate', this.value === '' ? '' : Math.max(0, parseFloat(this.value)||0), false)" />
          </div>
        </div>
      </div>
    `;
  }

  // 6.6 ELEVADOR ESPACIAL
  if (c.tool === 'elevator') {
    const phases = Array.isArray(data.spaceElevatorPhases) ? data.spaceElevatorPhases : [];
    const ph = phases.find(p => Number(p.phase) === Number(c.elevatorPhase)) || phases[0];
    return `
      <div class="calc-card">
        <div class="calc-card-head"><h4>Fases do Elevador Espacial</h4></div>
        <div class="field-group">
          <label>Fase</label>
          <div class="btn-group-row">
            ${phases.map(p => `
              <button type="button" class="seg-btn ${Number(c.elevatorPhase) === Number(p.phase) ? 'active' : ''}" onclick="setCalcField('elevatorPhase', ${p.phase}, true)">Fase ${p.phase}</button>
            `).join('')}
          </div>
        </div>
        ${ph ? `
          <div class="calc-elev-inputs">
            <div class="calc-conv-title">Já entregue (${libEsc(ph.name)})</div>
            ${(ph.requirements || []).map(req => {
              const it = Solver.getItem(req.item);
              const key = `${ph.phase}_${req.item}`;
              const val = c.elevatorDelivered?.[key] || '';
              return `
                <div class="calc-elev-row">
                  <div class="calc-elev-item">
                    ${it ? renderEntityIcon(it, 26) : ''}
                    <div>
                      <strong>${libEsc(it ? it.name : req.item)}</strong>
                      <small>Exige ${fmt(req.amount, 0)} un</small>
                    </div>
                  </div>
                  <input type="number" class="sidebar-input calc-elev-input" min="0" max="${req.amount}" step="1" placeholder="0" value="${val}" oninput="setCalcElevatorDelivered(${ph.phase}, '${req.item}', this.value)" />
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  return '';
}

function renderCalculatorMode(sidebarEl, emptyOverlay) {
  emptyOverlay.classList.add('hidden');
  emptyOverlay.innerHTML = '';

  const c = AppState.calculator;
  sidebarEl.innerHTML = `
    <div class="sidebar-step-block">
      <div class="step-header-row">
        <span class="step-badge">CALCULADORA</span>
        <h4>Ferramentas</h4>
      </div>
      <div class="library-cat-list">
        ${CALC_TOOLS.map(t => `
          <button type="button" class="library-cat-btn ${c.tool === t.id ? 'active' : ''}" onclick="setCalcTool('${t.id}')">
            <span class="lib-cat-left"><span>${t.icon}</span><span>${t.label}</span></span>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  renderCalculatorWorkspace();
}

function renderCalculatorWorkspace() {
  const view = document.getElementById('calculator-workspace-view');
  if (!view) return;
  const c = AppState.calculator;

  // 6.1 Calculadora normal pura: centralizada, visor escuro só aqui, SEM conversão de vazão e SEM painel lateral
  if (c.tool === 'numeric') {
    const keys = ['7','8','9','/','4','5','6','*','1','2','3','-','0','.','(',')','+','%','C','BACK','='];
    view.innerHTML = `
      <div class="calc-shell calc-numeric-only-shell">
        <div class="calc-card calc-numeric-card">
          <div class="calc-card-head">
            <h4>Calculadora</h4>
            <span class="calc-card-sub">Teclado físico ativo</span>
          </div>
          <div class="calc-num-screen">
            <input
              id="calc-num-expr-input"
              type="text"
              class="calc-expr-input"
              value="${libEsc(c.expr)}"
              oninput="AppState.calculator.expr = this.value"
              placeholder="0"
            />
            <div id="calc-num-result-readout" class="calc-result-readout">= ${libEsc(c.exprResult)}</div>
          </div>
          <div class="calc-keypad">
            ${keys.map(k => `
              <button type="button" class="calc-key ${k === '=' ? 'eq' : (k === 'C' || k === 'BACK' ? 'fn' : '')}" onclick="appendCalcKey('${k}')">
                ${k === 'BACK' ? '⌫' : k}
              </button>
            `).join('')}
          </div>
          <div id="calc-num-hist-inline" class="calc-num-history">
            ${c.numHistory.slice(0, 5).map(h => `<div class="calc-num-hist-row">${libEsc(h)}</div>`).join('')}
          </div>
        </div>
      </div>
    `;
    return;
  }

  view.innerHTML = `
    <div class="calc-shell">
      <div class="calc-grid-2">
        <div id="calc-inputs-panel">${renderCalcInputsPanelHtml()}</div>
        <div id="calc-result-panel">${renderCalcResultPanelHtml()}</div>
      </div>
      <div class="calc-recents-wrap">
        <div class="calc-recents-head">Recentes &amp; Fixados</div>
        <div id="calc-recents-strip" class="calc-recents-strip"></div>
      </div>
    </div>
  `;
  renderCalcRecentsStrip();
}

/* ============================================================================
 * EXCESSO -> GERAR NOVA LINHA DE PRODUÇÃO (APENAS ABA DE PRODUÇÃO)
 * ========================================================================== */

function openExcessRecipeModal(itemId, excessRate) {
  const item = Solver.getItem(itemId);
  if (!item) return;
  AppState.excessModal = { isOpen: true, itemId, rate: Number(excessRate) || 0 };

  const modal = document.getElementById('excess-recipe-modal');
  const titleEl = document.getElementById('excess-modal-title');
  const body = document.getElementById('excess-modal-body');
  if (!modal || !body) return;

  if (titleEl) {
    titleEl.textContent = `♻️ Aproveitar Excesso de ${item.name} (${fmt(excessRate, 1)} ${item.unit || 'un'}/min)`;
  }

  const compatRecs = Solver.getCompatibleRecipesForItem(itemId);

  if (compatRecs.length === 0) {
    body.innerHTML = `
      <div class="inspector-hero">
        ${renderShowcaseImage(item, 80)}
        <div class="inspector-hero-info">
          <h4>${item.name}</h4>
          <p>Não há receitas de fabricação que utilizem este item como ingrediente. Você pode enviá-lo para o Triturador AWESOME (AWESOME Sink).</p>
        </div>
      </div>
      <div class="inspector-footer">
        <button type="button" class="btn-mount-flow ready" onclick="closeExcessRecipeModal()">Fechar</button>
      </div>
    `;
  } else {
    body.innerHTML = `
      <div class="inspector-hero">
        ${renderShowcaseImage(item, 80)}
        <div class="inspector-hero-info">
          <h4>Escolha uma receita para consumir o excesso</h4>
          <p>Disponível: <strong>${fmt(excessRate, 2)} ${item.unit || 'un'}/min</strong> de <strong>${item.name}</strong>. Ao selecionar uma receita abaixo, será gerada a nova linha de produção respeitando vazões de esteiras/tubos, máquinas inteiras e clock.</p>
        </div>
      </div>

      <div class="excess-recipe-list">
        ${compatRecs.map(r => {
          const m = r.machineObj || Solver.getMachine(r.machine);
          const ingEntry = (r.ingredients || []).find(i => i.item === itemId);
          const mainProd = r.products?.[0];
          const prodItem = mainProd ? Solver.getItem(mainProd.item) : null;
          const estMachines = ingEntry && ingEntry.ratePerMin > 0 ? (excessRate / ingEntry.ratePerMin) : 0;
          const estOut = mainProd ? estMachines * mainProd.ratePerMin : 0;
          const otherIngs = (r.ingredients || [])
            .filter(i => i.item !== itemId)
            .map(i => `${fmt(estMachines * i.ratePerMin, 1)}/m ${Solver.getItem(i.item)?.name || i.item}`)
            .join(' + ');

          return `
            <button type="button" class="excess-recipe-option" onclick="generateLineFromExcess('${itemId}', ${Number(excessRate.toFixed(4))}, '${r.id}', '${mainProd ? mainProd.item : ''}')">
              <div class="excess-rec-left">
                ${prodItem ? renderEntityIcon(prodItem, 40) : ''}
                <div>
                  <strong>${r.isAlternate ? '⭐ ' : ''}${r.cleanName || r.name}</strong>
                  <span>${m ? m.name : 'Máquina'} • Produz ~${fmt(estOut, 1)} ${prodItem?.unit || 'un'}/min de ${prodItem?.name || ''}</span>
                  ${otherIngs ? `<small>Também usa: ${otherIngs}</small>` : '<small>Usa apenas este item em excesso!</small>'}
                </div>
              </div>
              <span class="excess-rec-go">Gerar ➔</span>
            </button>
          `;
        }).join('')}
      </div>
    `;
  }

  modal.classList.remove('hidden');
}

function closeExcessRecipeModal() {
  AppState.excessModal.isOpen = false;
  const modal = document.getElementById('excess-recipe-modal');
  if (modal) modal.classList.add('hidden');
}

function generateLineFromExcess(excessItemId, excessRate, recipeId, targetItemId) {
  closeExcessRecipeModal();
  if (!excessItemId || !targetItemId) return;

  AppState.production.driver = 'input';
  AppState.production.mounted = true;
  AppState.push.inputs = [
    {
      id: uid(),
      itemId: excessItemId,
      mode: 'rate',
      minerMark: 'mk2',
      purity: 'normal',
      extractorCount: 1,
      clockPercent: 100,
      rate: Math.max(0.1, Number(excessRate) || 30)
    }
  ];
  AppState.push.targetItemId = targetItemId;
  AppState.push.recipeOverrides = { [targetItemId]: recipeId };
  AppState.push.stepSettings = {};
  AppState.canvas.customPositions = {};
  switchMode('production');
}

// Tutorial interativo movido para js/tutorial.js
