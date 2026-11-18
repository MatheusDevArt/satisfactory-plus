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
  orientation: 'TB', // 'TB' (Cima -> Baixo, padrão) | 'LR' (Esquerda -> Direita)
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
    calcMode: 'by_fuel', // 'by_fuel' | 'by_mw' | 'by_generators'
    generatorId: null,
    fuelItemId: null,
    fuelInputMode: 'miner',
    fuelRate: 120,
    minerMark: 'mk2',
    purity: 'normal',
    minerCount: 1,
    minerClock: 100,
    targetMW: 3000,
    generatorCount: 10,
    manualGenerators: null,
    clockPercent: 100,
    waterExtractorClock: 100,
    manualWaterPumps: null
  },

  // Aba 3: Construção Livre (Sandbox + Check)
  free: {
    blocks: [],
    customEdges: [],
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
    category: 'all',
    searchQuery: '',
    selectedId: null
  },

  // Aba 6: Receitas (Banco completo Satisfactory 1.0+)
  recipes: {
    filter: 'all', // 'all' | 'standard' | 'alternate' | 'ficsmas'
    machineFilter: 'all',
    searchQuery: '',
    selectedId: null
  },

  // Aba 7: Calculadora (Contas normais + Cálculos rápidos do jogo no Spaces)
  calculator: {
    mode: 'smart', // 'smart' | 'math'
    expr: '20 * 75',
    exprResult: '1500',
    history: [],
    smartType: 'energy', // 'energy' | 'machines'
    energySource: 'extractor', // 'extractor' | 'generator'
    energyResourceId: 'Desc_Coal_C',
    minerCount: 20,
    minerMark: 'mk1',
    minerPurity: 'normal',
    minerClock: 100,
    genId: 'Build_GeneratorCoal_C',
    genCount: 20,
    genFuelId: 'Desc_Coal_C',
    genClock: 100,
    machineId: 'Build_ConstructorMk1_C',
    machineRecipeId: null,
    machineCount: 10,
    machineClock: 100
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
  initIntroSplash();
  initPickerEvents();
  initInfiniteCanvasEvents();
  renderAll(true);
});

/* ============================================================================
 * ANIMAÇÃO DE ENTRADA (INTRO SPLASH) E TEMA CLARO / ESCURO
 * ========================================================================== */

function initIntroSplash() {
  setTimeout(() => {
    dismissIntroSplash();
  }, 1850);
}

function dismissIntroSplash() {
  const splash = document.getElementById('intro-splash');
  if (!splash || splash.classList.contains('splash-hidden')) return;
  splash.classList.add('splash-fade-out');
  setTimeout(() => {
    splash.classList.add('splash-hidden');
  }, 480);
}

function toggleTheme() {
  AppState.theme = AppState.theme === 'light' ? 'dark' : 'light';
  document.body.classList.toggle('theme-light', AppState.theme === 'light');
  document.body.classList.toggle('theme-dark', AppState.theme === 'dark');

  const btn = document.getElementById('btn-theme-toggle');
  if (btn) {
    btn.innerHTML = AppState.theme === 'light' ? '🌙 Escuro' : '☀️ Claro';
  }
  renderAll(false);
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
  const hudControls = document.getElementById('spaces-hud-controls');
  const mapView = document.getElementById('map-workspace-view');
  const libraryView = document.getElementById('library-workspace-view');
  const recipesView = document.getElementById('recipes-workspace-view');
  const calcView = document.getElementById('calculator-workspace-view');
  const spacesWorld = document.getElementById('spaces-world');

  const isMap = mode === 'map';
  const isLibrary = mode === 'library';
  const isRecipes = mode === 'recipes';
  const isCalc = mode === 'calculator';
  const isWorkspaceOverlay = isMap || isLibrary || isRecipes || isCalc;
  const isFree = mode === 'free';
  const freeToolbar = document.getElementById('free-logistics-toolbar');
  if (actionSec) actionSec.classList.toggle('hidden', isWorkspaceOverlay);
  if (orientPillWrap) orientPillWrap.classList.toggle('hidden', isWorkspaceOverlay);
  if (hudControls) hudControls.classList.toggle('hidden', isWorkspaceOverlay);
  if (freeToolbar) freeToolbar.classList.toggle('hidden', !isFree);
  if (mapView) mapView.classList.toggle('hidden', !isMap);
  if (libraryView) libraryView.classList.toggle('hidden', !isLibrary);
  if (recipesView) recipesView.classList.toggle('hidden', !isRecipes);
  if (calcView) calcView.classList.toggle('hidden', !isCalc);
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
    if (AppState.mode !== 'map' && AppState.canvas.lastGraphBounds) {
      fitCanvasToScreen();
    }
  }, 190);
}

function toggleShowAllMachines() {
  AppState.showAllMachines = !AppState.showAllMachines;
  const btn = document.getElementById('btn-toggle-expand');
  if (btn) {
    btn.classList.toggle('active', AppState.showAllMachines);
    btn.textContent = AppState.showAllMachines
      ? '🏭 Todas Máquinas: SIM'
      : '📦 Todas Máquinas: NÃO';
  }
  renderAll(true);
}

function toggle3DView() {
  AppState.canvas.is3DView = !AppState.canvas.is3DView;
  const btn = document.getElementById('btn-toggle-3d');
  const viewport = document.getElementById('spaces-viewport');
  if (btn) {
    btn.classList.toggle('active', AppState.canvas.is3DView);
    btn.textContent = AppState.canvas.is3DView
      ? '🏢 Visão 3D: SIM'
      : '🏢 Visão 3D: NÃO';
  }
  if (viewport) {
    viewport.classList.toggle('view-3d', AppState.canvas.is3DView);
  }
  renderAll(false);
}

function setFlowOrientation(orient) {
  AppState.orientation = orient === 'TB' ? 'TB' : 'LR';
  const btnLR = document.getElementById('orient-lr');
  const btnTB = document.getElementById('orient-tb');
  if (btnLR) btnLR.classList.toggle('active', AppState.orientation === 'LR');
  if (btnTB) btnTB.classList.toggle('active', AppState.orientation === 'TB');

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

function clearCurrentFlow() {
  if (AppState.mode === 'production') {
    AppState.production.driver = null;
    AppState.production.mounted = false;
    AppState.push.inputs = [];
    AppState.push.targetItemId = null;
    AppState.push.recipeOverrides = {};
    AppState.push.stepSettings = {};
    AppState.pull.targets = [];
    AppState.pull.recipeOverrides = {};
    AppState.pull.stepSettings = {};
    AppState.pull.minerSettings = {};
  } else if (AppState.mode === 'power') {
    AppState.power.mounted = false;
    AppState.power.generatorId = null;
    AppState.power.fuelItemId = null;
    AppState.power.manualGenerators = null;
    AppState.power.manualWaterPumps = null;
  } else if (AppState.mode === 'free') {
    AppState.free.blocks = [];
    AppState.free.customEdges = [];
    AppState.free.checkPerformed = false;
    AppState.free.lastCheckReport = null;
  }
  AppState.canvas.customPositions = {};
  renderAll(true);
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
    document.querySelectorAll('.magnific-card.wire-target-compatible').forEach(el => {
      el.classList.remove('wire-target-compatible');
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
  const isTB = AppState.orientation === 'TB';
  const nodeCoords = AppState.canvas.nodeMap;

  graph.edges.forEach((edge, idx) => {
    if (edge.from !== nodeId && edge.to !== nodeId) return;
    if (edge._isOffPage) return;
    const fromBox = nodeCoords.get(edge.from);
    const toBox = nodeCoords.get(edge.to);
    if (!fromBox || !toBox) return;

    const geom = computeEdgeGeometry(fromBox, toBox, isTB, edge);
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
    if (AppState.mode === 'map' || AppState.mode === 'library' || AppState.mode === 'recipes' || AppState.mode === 'calculator') return;

    // Fecha menus se clicar fora deles
    if (!e.target.closest('#canvas-context-menu, #wire-drop-menu')) {
      closeCanvasMenus();
    }

    if (e.button !== 0) return;
    if (e.target.closest('button, input, select, .hud-btn, .empty-card-box, .btn-expand-sidebar, .map-workspace-view, .library-workspace-view, .calculator-workspace-view, .wire-hit-area, .conveyor-edge-group, .wire-belt-pill, #canvas-context-menu, #wire-drop-menu')) return;

    // 1. Clique em uma porta de saída para puxar esteira/conexão (APENAS no Modo Livre)
    const outPort = e.target.closest('.port-lr-out, .port-tb-out');
    if (outPort) {
      if (AppState.mode !== 'free') return;
      e.preventDefault();
      e.stopPropagation();
      const cardEl = outPort.closest('.magnific-card');
      if (!cardEl) return;
      const fromNodeId = cardEl.id;
      const fromBox = AppState.canvas.nodeMap.get(fromNodeId);
      if (!fromBox) return;
      const isTB = AppState.orientation === 'TB';
      const startX = isTB ? fromBox.x + fromBox.w / 2 : fromBox.x + fromBox.w;
      const startY = isTB ? fromBox.y + fromBox.h : fromBox.y + 132;

      AppState.canvas.wiring = { fromNodeId, startX, startY, currX: startX, currY: startY };
      viewport.classList.add('wiring-active');

      // Destaca máquinas compatíveis como alvo
      document.querySelectorAll('.magnific-card').forEach(el => {
        if (el.id !== fromNodeId) {
          el.classList.add('wire-target-compatible');
        }
      });
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

    // 3. Clique no fundo vazio para mover a câmera (Pan)
    AppState.canvas.isPanning = true;
    AppState.canvas.movedDuringDrag = false;
    AppState.canvas.startX = e.clientX - AppState.canvas.x;
    AppState.canvas.startY = e.clientY - AppState.canvas.y;
    viewport.classList.add('panning');
  });

  viewport.addEventListener('contextmenu', (e) => {
    if (AppState.mode !== 'free') return;
    if (e.target.closest('.magnific-card, button, input, select, .hud-btn')) return;
    e.preventDefault();
    const worldPos = clientToWorld(e.clientX, e.clientY);
    openCanvasContextMenu(e.clientX, e.clientY, worldPos);
  });

  window.addEventListener('mousemove', (e) => {
    // Arrastando conexão (esteira)
    if (AppState.canvas.wiring) {
      const w = AppState.canvas.wiring;
      const worldPos = clientToWorld(e.clientX, e.clientY);
      w.currX = worldPos.x;
      w.currY = worldPos.y;
      updateWirePreviewPath(w.startX, w.startY, w.currX, w.currY);
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
    if (AppState.mode === 'map' || AppState.mode === 'library' || AppState.mode === 'recipes' || AppState.mode === 'calculator') return;
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
  const gridBg = document.getElementById('spaces-grid-bg');
  const readout = document.getElementById('zoom-readout');

  if (world) {
    world.style.transform = `translate(${AppState.canvas.x}px, ${AppState.canvas.y}px) scale(${AppState.canvas.scale})`;
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
  }

  updateTopRightFloatingActions();

  if (AppState.inspector.isOpen) {
    renderMachineInspectorContent();
  }
}

function mountProductionFlow() {
  AppState.production.mounted = true;
  renderAll(true);
}

function mountPowerFlow() {
  AppState.power.mounted = true;
  renderAll(true);
}

function updateTopRightFloatingActions() {
  const container = document.getElementById('sidebar-action-section');
  if (!container) return;

  if (AppState.mode === 'map' || AppState.mode === 'library' || AppState.mode === 'recipes' || AppState.mode === 'calculator') {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  container.classList.remove('hidden');

  if (AppState.mode === 'production') {
    const isPushReady = AppState.production.driver === 'input' && AppState.push.inputs.length > 0 && Boolean(AppState.push.targetItemId);
    const isPullReady = AppState.production.driver === 'product' && AppState.pull.targets.length > 0;
    const isReady = isPushReady || isPullReady;
    const isMounted = Boolean(AppState.production.mounted);

    let summaryHtml = '';
    if (isReady) {
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
      if (plan && plan.stages && plan.stages.length > 0) {
        const lastSt = plan.stages[plan.stages.length - 1];
        const totalMach = plan.stages.reduce((s, x) => s + (x.intMachines || 0), 0);
        const totalExt = (plan.extractionPlan || plan.extraction || []).reduce((s, x) => s + (x.intExtractors || 0), 0);
        const totalMw = plan.totalPowerMw ?? plan.summary?.grandTotalPowerMw ?? plan.summary?.totalFactoryPowerMw ?? 0;
        const excessList = (plan.allExcessItems || []).filter(ex => ex.item && ex.excessRate > 0.05);

        const excessHtml = excessList.length > 0 ? `
          <div class="fqs-excess-block">
            <div class="fqs-excess-title">♻️ Excesso da Linha (${excessList.length})</div>
            ${excessList.map(ex => `
              <div class="fqs-excess-row">
                <div class="fqs-excess-item">
                  ${renderEntityIcon(ex.item, 22)}
                  <div>
                    <strong>${ex.item.name}</strong>
                    <span>+${fmt(ex.excessRate, 1)} ${ex.item.unit || 'un'}/min</span>
                  </div>
                </div>
                <button
                  type="button"
                  class="btn-excess-new-line"
                  onclick="openExcessRecipeModal('${ex.item.id}', ${Number(ex.excessRate.toFixed(4))})"
                  title="Escolher receita para aproveitar este excesso em uma nova linha de produção"
                >
                  ⚡ Gerar nova linha de produção
                </button>
              </div>
            `).join('')}
          </div>
        ` : '';

        summaryHtml = `
          <div class="flow-quick-summary">
            <div class="fqs-row"><span>🎯 Produto Final:</span><strong>${fmt(lastSt.actualProducedRate, 1)}/m ${lastSt.item?.name || ''}</strong></div>
            <div class="fqs-row"><span>🏭 Máquinas / Nós:</span><strong>${totalMach} máq. • ${totalExt} nó(s)</strong></div>
            <div class="fqs-row"><span>⚡ Consumo Total:</span><strong>${fmt(totalMw, 1)} MW</strong></div>
            ${excessHtml}
          </div>
        `;
      }
    }

    container.innerHTML = `
      <button
        class="btn-floating-primary sidebar-action-btn ${isReady ? 'ready' : 'disabled'}"
        ${!isReady ? 'disabled title="Configure a entrada e o produto abaixo primeiro"' : ''}
        onclick="mountProductionFlow()"
      >
        ${isMounted ? '🔄 Atualizar Linha de Produção' : '⚡ Montar Linha de Produção'}
      </button>
      ${summaryHtml}
    `;
  } else if (AppState.mode === 'power') {
    const isReady = Boolean(AppState.power.generatorId && AppState.power.fuelItemId);
    const isMounted = Boolean(AppState.power.mounted);
    let summaryHtml = '';
    if (isReady) {
      const pwr = Solver.calculatePowerPlan(AppState.power);
      if (pwr) {
        summaryHtml = `
          <div class="flow-quick-summary">
            <div class="fqs-row"><span>⚡ Geração Bruta:</span><strong>${fmt(pwr.totalGrossMw, 1)} MW (${pwr.intGenerators}x)</strong></div>
            <div class="fqs-row"><span>🔋 Potência Líquida:</span><strong>${fmt(pwr.netPowerMw, 1)} MW</strong></div>
            <div class="fqs-row"><span>🔥 Combustível:</span><strong>${fmt(pwr.totalFuelConsumed, 1)}/m ${pwr.fuelItem?.name || ''}</strong></div>
          </div>
        `;
      }
    }
    container.innerHTML = `
      <button
        class="btn-floating-primary sidebar-action-btn ${isReady ? 'ready' : 'disabled'}"
        ${!isReady ? 'disabled title="Escolha uma usina abaixo primeiro"' : ''}
        onclick="mountPowerFlow()"
      >
        ${isMounted ? '🔄 Atualizar Linha de Produção' : '⚡ Montar Linha de Produção'}
      </button>
      ${summaryHtml}
    `;
  } else if (AppState.mode === 'free') {
    const blocks = AppState.free.blocks || [];
    const hasBlocks = blocks.length > 0;
    let summaryHtml = '';
    if (hasBlocks) {
      let totalMach = 0, pwrUse = 0, pwrGen = 0;
      blocks.forEach(b => {
        const st = Solver.computeFreeBlockStats(b);
        if (!st) return;
        totalMach += st.count || 1;
        pwrUse += st.totalPowerMw || 0;
        pwrGen += st.powerProducedMw || 0;
      });
      summaryHtml = `
        <div class="flow-quick-summary">
          <div class="fqs-row"><span>🧱 Unidades no Espaço:</span><strong>${totalMach} (${blocks.length} bloco(s))</strong></div>
          <div class="fqs-row"><span>⚡ Consumo / Geração:</span><strong>-${fmt(pwrUse, 1)} MW / +${fmt(pwrGen, 1)} MW</strong></div>
        </div>
      `;
    }
    container.innerHTML = `
      <button
        class="btn-floating-primary sidebar-action-btn ${hasBlocks ? 'ready check-mode' : 'disabled'}"
        ${!hasBlocks ? 'disabled title="Adicione máquinas no espaço antes de executar o diagnóstico"' : ''}
        onclick="runFreeModeCheck()"
      >
        🩺 Diagnóstico / Check
      </button>
      ${summaryHtml}
    `;
  }
}

/* ============================================================================
 * ABA 1 UNIFICADA: 🏭 PRODUÇÃO
 * O sentido do cálculo é definido automaticamente pelo que o usuário coloca primeiro:
 * - Se adicionar uma Entrada/Mineradora primeiro -> Calcula da Entrada para o Produto
 * - Se adicionar um Produto Final primeiro -> Calcula do Produto para as Máquinas e Mineradoras
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

  // ESTADO INICIAL: Usuário escolhe o que colocar primeiro
  if (!driver) {
    sidebarEl.innerHTML = `
      <div class="sidebar-step-block">
        <div class="step-header-row">
          <span class="step-badge">PRODUÇÃO</span>
          <h4>Como deseja começar?</h4>
        </div>

        <button class="empty-step-cta" onclick="openPushAddInputModal()">
          <span class="cta-plus">⛏️</span>
          <div>
            <strong>Começar com Recurso / Máquina</strong>
            <span>Escolha o nó ou mineradora para ver tudo o que pode fabricar</span>
          </div>
        </button>

        <button class="empty-step-cta" style="margin-top:6px;" onclick="openPullAddTargetModal()">
          <span class="cta-plus">🎯</span>
          <div>
            <strong>Começar com Produto Final</strong>
            <span>Escolha a peça e a meta por minuto para calcular toda a fábrica</span>
          </div>
        </button>
      </div>
    `;

    clearCanvasGraph();
    emptyOverlay.classList.remove('hidden');
    emptyOverlay.innerHTML = `
      <div class="empty-card-box">
        <div class="empty-card-icon">🏭</div>
        <h2>Planejador Visual Satisfactory+ 1.0+</h2>
        <p>Comece adicionando seus recursos/mineradoras atuais ou escolha diretamente o produto final que deseja fabricar. O grafo visual calculará máquinas inteiras, divisores, esteiras e energia automaticamente.</p>
        <div class="dual-start-grid">
          <button class="btn-primary-Empty" onclick="openPushAddInputModal()">⛏️ Começar pela Mineradora / Recurso</button>
          <button class="btn-primary-Empty secondary" onclick="openPullAddTargetModal()">🎯 Começar pelo Produto Final</button>
        </div>
      </div>
    `;
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

    <div class="sidebar-footer-actions">
      ${isReady ? `
        <button class="btn-mount-flow ready" onclick="fitCanvasToScreen()">
          🎯 Centralizar Fluxo no Espaço
        </button>
      ` : ''}
      <button class="btn-clear-flow" onclick="clearCurrentFlow()">🗑️ Recomeçar / Limpar Tudo</button>
    </div>
  `;

  if (!isReady) {
    clearCanvasGraph();
    emptyOverlay.classList.remove('hidden');
    emptyOverlay.innerHTML = `
      <div class="empty-card-box">
        <div class="empty-card-icon">🎯</div>
        <h2>Escolha o Produto a ser Gerado</h2>
        <p>Você já configurou a entrada! Agora selecione no painel lateral qual produto deseja fabricar a partir dos seus recursos.</p>
        <div class="dual-start-grid">
          <button class="btn-primary-Empty" onclick="openPushTargetPicker()">🎯 Escolher Produto para Fabricar</button>
        </div>
      </div>
    `;
    return;
  }

  if (!AppState.production.mounted) {
    clearCanvasGraph();
    emptyOverlay.classList.remove('hidden');
    emptyOverlay.innerHTML = `
      <div class="empty-card-box">
        <div class="empty-card-icon">⚡</div>
        <h2>Linha de Produção Pronta!</h2>
        <p>Sua cadeia para <strong>${targetItem ? targetItem.name : 'o produto'}</strong> (${fmt(chainResult.outputRate, 1)}/min) está calculada. Clique abaixo para montar o grafo visual no espaço.</p>
        <div class="dual-start-grid">
          <button class="btn-primary-Empty" onclick="mountProductionFlow()">⚡ Montar Linha de Produção no Espaço</button>
        </div>
      </div>
    `;
    return;
  }

  emptyOverlay.classList.add('hidden');
  const graph = Solver.buildCanvasFlowGraph('push', chainResult, { showAllMachines: AppState.showAllMachines });
  renderCanvasGraph(graph, autoFit);
}

function renderPullFlowInsideProduction(sidebarEl, emptyOverlay, autoFit) {
  const targetsHtml = AppState.pull.targets.map(t => {
    const item = Solver.getItem(t.itemId);
    if (!item) return '';
    return `
      <div class="sidebar-config-card">
        <div class="config-card-top">
          <div class="config-item-title" onclick="openChangePullTargetModal('${t.id}')" title="Clique para trocar o produto">
            ${renderEntityIcon(item, 40)}
            <div>
              <strong>${item.name}</strong>
              <span class="config-rate-badge">Meta: ${fmt(t.rate, 1)} un/min</span>
            </div>
          </div>
          <button class="btn-icon-danger" onclick="removePullTarget('${t.id}')" title="Remover produto">✕</button>
        </div>
        <div class="field-group">
          <label>Quantidade Desejada (un/min)</label>
          <input type="number" class="sidebar-input" min="0.5" step="1" value="${t.rate}" onchange="updatePullTargetRate('${t.id}', this.value)" />
        </div>
      </div>
    `;
  }).join('');

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

  let stagesConfigHtml = '';
  if (pullResult && pullResult.steps.length > 0) {
    stagesConfigHtml = `
      <div class="sidebar-step-block">
        <div class="step-header-row">
          <span class="step-badge">2º ETAPAS</span>
          <h4>Receitas, Máquinas &amp; Overclock</h4>
        </div>
        <div class="stage-config-list">
          ${pullResult.steps.map(step => `
            <div class="stage-config-card">
              <div class="stage-config-header">
                <div class="stage-config-title">
                  ${renderEntityIcon(step.item, 36)}
                  <div>
                    <strong>${step.item.name}</strong>
                    <span>${step.machineCount}x ${step.machine?.name || 'Máquina'} (${fmt(step.actualProducedRate, 1)}/m)</span>
                  </div>
                </div>
                ${AppState.pull.stepSettings[step.itemId]?.customMachineCount ? `<button class="btn-small-accent" onclick="setPullStepCustomCount('${step.itemId}', null)">Auto</button>` : ''}
              </div>
              <div class="field-group">
                <label>Receita &amp; Máquina / Refinaria</label>
                <select class="sidebar-select" onchange="setPullRecipe('${step.itemId}', this.value)">
                  ${step.availableRecipes.map(r => {
                    const m = Solver.getMachine(r.producedIn);
                    return `<option value="${r.id}" ${r.id === step.recipe.id ? 'selected' : ''}>${r.isAlternate ? '★ [Alt] ' : ''}${r.cleanName || r.name} — (${m ? m.name : 'Máquina'})</option>`;
                  }).join('')}
                </select>
              </div>
              <div class="field-row-2">
                <div class="field-group">
                  <label>Overclock (%)</label>
                  <input type="number" class="sidebar-input" min="1" max="250" value="${step.clockPercent}" onchange="setPullStepClock('${step.itemId}', this.value)" />
                </div>
                <div class="field-group">
                  <label>Nº Inteiro</label>
                  <input type="number" class="sidebar-input" min="1" step="1" value="${step.machineCount}" onchange="setPullStepCustomCount('${step.itemId}', this.value)" />
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="sidebar-step-block">
        <div class="step-header-row">
          <span class="step-badge">3º EXTRAÇÃO</span>
          <h4>Mineradoras, Bombas d'Água &amp; Extratores</h4>
        </div>
        <div class="stage-config-list">
          ${pullResult.rawResources.map(raw => `
            <div class="stage-config-card">
              <div class="stage-config-header">
                <div class="stage-config-title">
                  ${renderEntityIcon(raw.item, 34)}
                  <div>
                    <strong>${raw.item.name}</strong>
                    <span>${raw.extractorPlan.machineCount}x ${raw.extractorPlan.extractor.name} (${fmt(raw.requiredRate, 1)}/m necessários)</span>
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
                    <label>Pureza do Nodo</label>
                    <div class="btn-group-row">
                      <button class="seg-btn ${raw.minerCfg.purity === 'impure' ? 'active' : ''}" onclick="setPullMinerPurity('${raw.itemId}', 'impure')">Impuro</button>
                      <button class="seg-btn ${raw.minerCfg.purity === 'normal' ? 'active' : ''}" onclick="setPullMinerPurity('${raw.itemId}', 'normal')">Normal</button>
                      <button class="seg-btn ${raw.minerCfg.purity === 'pure' ? 'active' : ''}" onclick="setPullMinerPurity('${raw.itemId}', 'pure')">Puro</button>
                    </div>
                  </div>
                ` : ''}
                <div class="field-row-2">
                  <div class="field-group">
                    <label>Overclock (%)</label>
                    <input type="number" class="sidebar-input" min="1" max="250" value="${raw.minerCfg.clockPercent || 100}" onchange="setPullMinerClock('${raw.itemId}', this.value)" />
                  </div>
                  <div class="field-group">
                    <label>Nº Inteiro (${raw.extractorPlan.extractor.name})</label>
                    <input type="number" class="sidebar-input" min="1" step="1" value="${raw.extractorPlan.machineCount}" onchange="setPullMinerCustomCount('${raw.itemId}', this.value)" />
                  </div>
                </div>
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

    <div class="sidebar-footer-actions">
      <button class="btn-mount-flow ready" onclick="fitCanvasToScreen()">
        🎯 Centralizar Fluxo no Espaço
      </button>
      <button class="btn-clear-flow" onclick="clearCurrentFlow()">🗑️ Recomeçar / Limpar Tudo</button>
    </div>
  `;

  if (!pullResult) {
    clearCanvasGraph();
    emptyOverlay.classList.add('hidden');
    emptyOverlay.innerHTML = '';
    return;
  }

  if (!AppState.production.mounted) {
    clearCanvasGraph();
    emptyOverlay.classList.remove('hidden');
    emptyOverlay.innerHTML = `
      <div class="empty-card-box">
        <div class="empty-card-icon">⚡</div>
        <h2>Linha de Produção Calculada!</h2>
        <p>Todas as etapas, máquinas inteiras e mineradoras foram dimensionadas. Clique abaixo para montar o fluxo visual completo no espaço.</p>
        <div class="dual-start-grid">
          <button class="btn-primary-Empty" onclick="mountProductionFlow()">⚡ Montar Linha de Produção no Espaço</button>
        </div>
      </div>
    `;
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
          <div class="field-row-2">
            <div class="field-group">
              <label>Nº Máquinas</label>
              <input type="number" class="sidebar-input" min="1" step="1" value="${Math.max(1, Math.round(inp.extractorCount || 1))}" onchange="updatePushInput('${inp.id}', 'extractorCount', Math.max(1, Math.round(parseFloat(this.value)||1)))" />
            </div>
            <div class="field-group">
              <label>Overclock (%)</label>
              <input type="number" class="sidebar-input" min="1" max="250" step="1" value="${inp.clockPercent || 100}" onchange="updatePushInput('${inp.id}', 'clockPercent', Math.min(250, Math.max(1, parseFloat(this.value)||100)))" />
            </div>
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

      <div class="field-row-2">
        <div class="field-group">
          <label>Overclock da Etapa (%)</label>
          <input type="number" class="sidebar-input" min="1" max="250" value="${step.clockPercent}" onchange="setPushStepClock('${step.itemId}', this.value)" />
        </div>
        <div class="field-group">
          <label>Nº Inteiro (${step.machine?.name || 'Máq.'})</label>
          <input type="number" class="sidebar-input" min="1" step="1" value="${step.machineCount}" onchange="setPushStepCustomCount('${step.itemId}', this.value)" />
        </div>
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
        <span class="step-badge">PASSO 1</span>
        <h4>Tipo de Usina / Gerador</h4>
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
        <span class="step-badge">PASSO 2</span>
        <h4>Combustível da Usina</h4>
      </div>
      ${!selectedGen ? `
        <p class="step-help-text">Selecione uma usina acima para montar o fluxo de energia.</p>
      ` : `
        <div class="generator-select-grid">
          ${selectedGen.fuels.map(f => {
            const fItem = Solver.getItem(f.itemId);
            return `
              <button class="gen-option-card ${f.itemId === p.fuelItemId ? 'active' : ''}" onclick="selectPowerFuel('${f.itemId}')">
                ${renderEntityIcon(fItem, 38)}
                <div class="gen-option-info">
                  <strong>${fItem ? fItem.name : f.itemId}</strong>
                  <span>100%: ${fmt(f.ratePerMin, 2)}/min${f.waterPerMin ? ` • 💧 ${f.waterPerMin} m³/m` : ''}</span>
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
              <div class="field-row-2">
                <div class="field-group">
                  <label>Nº Mineradoras</label>
                  <input type="number" class="sidebar-input" min="1" step="1" value="${p.minerCount}" onchange="setPowerParam('minerCount', Math.max(1, Math.round(parseFloat(this.value)||1)))" />
                </div>
                <div class="field-group">
                  <label>Overclock Mineradora (%)</label>
                  <input type="number" class="sidebar-input" min="1" max="250" value="${p.minerClock}" onchange="setPowerParam('minerClock', Math.min(250, Math.max(1, parseFloat(this.value)||100)))" />
                </div>
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
              <input type="number" class="sidebar-input" min="50" step="150" value="${p.targetMW}" onchange="setPowerParam('targetMW', Math.max(1, parseFloat(this.value)||3000))" />
            </div>
          ` : ''}

          <div class="field-row-2">
            <div class="field-group">
              <label>Overclock Geradores (%)</label>
              <input type="number" class="sidebar-input" min="1" max="250" value="${p.clockPercent}" onchange="setPowerParam('clockPercent', Math.min(250, Math.max(1, parseFloat(this.value)||100)))" />
            </div>
            <div class="field-group">
              <label>Nº Inteiro de Usinas</label>
              <input type="number" class="sidebar-input" min="1" step="1" value="${powerPlan ? powerPlan.generatorCount : p.generatorCount}" onchange="setPowerGeneratorCountOverride(this.value)" />
            </div>
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
            <div class="field-row-2">
              <div class="field-group">
                <label>Overclock Bomba d'Água (%)</label>
                <input type="number" class="sidebar-input" min="1" max="250" value="${p.waterExtractorClock || 100}" onchange="setPowerWaterClock(this.value)" />
              </div>
              <div class="field-group">
                <label>Nº Bombas d'Água</label>
                <input type="number" class="sidebar-input" min="1" step="1" value="${powerPlan.intWaterPumps}" onchange="setPowerParam('manualWaterPumps', Math.max(1, Math.round(parseFloat(this.value)||1)))" />
              </div>
            </div>
            <div class="quick-clock-row">
              <span>Clocks:</span>
              <button type="button" class="mini-clock-chip ${(p.waterExtractorClock || 100) === 75 ? 'active' : ''}" onclick="setPowerWaterClock(75)">75% (90m³)</button>
              <button type="button" class="mini-clock-chip ${(p.waterExtractorClock || 100) === 100 ? 'active' : ''}" onclick="setPowerWaterClock(100)">100% (120m³)</button>
              <button type="button" class="mini-clock-chip ${(p.waterExtractorClock || 100) === 150 ? 'active' : ''}" onclick="setPowerWaterClock(150)">150% (180m³)</button>
              <button type="button" class="mini-clock-chip ${(p.waterExtractorClock || 100) === 250 ? 'active' : ''}" onclick="setPowerWaterClock(250)">250% (300m³)</button>
            </div>
          </div>
        ` : ''}
      </div>
    ` : ''}

    <div class="sidebar-footer-actions">
      ${isReady ? `
        <button class="btn-mount-flow ready" onclick="fitCanvasToScreen()">
          🎯 Centralizar Fluxo no Espaço
        </button>
        <button class="btn-clear-flow" onclick="clearCurrentFlow()">🗑️ Limpar Tudo</button>
      ` : ''}
    </div>
  `;

  if (!isReady) {
    clearCanvasGraph();
    emptyOverlay.classList.remove('hidden');
    emptyOverlay.innerHTML = `
      <div class="empty-card-box">
        <div class="empty-card-icon">⚡</div>
        <h2>Planejador de Energia (MW)</h2>
        <p>Selecione o tipo de usina no painel lateral (Biomassa, Carvão, Combustível ou Nuclear) para dimensionar geradores, mineradoras, bombas d'água e divisores.</p>
      </div>
    `;
    return;
  }

  if (!AppState.power.mounted) {
    clearCanvasGraph();
    emptyOverlay.classList.remove('hidden');
    emptyOverlay.innerHTML = `
      <div class="empty-card-box">
        <div class="empty-card-icon">🔋</div>
        <h2>Usina de Energia Pronta!</h2>
        <p>Configuração para <strong>${powerPlan.intGenerators}x ${selectedGen.name}</strong> (⚡ ${fmt(powerPlan.totalGrossMw, 1)} MW brutos) concluída. Clique abaixo para montar o diagrama visual.</p>
        <div class="dual-start-grid">
          <button class="btn-primary-Empty" onclick="mountPowerFlow()">⚡ Montar Linha de Energia no Espaço</button>
        </div>
      </div>
    `;
    return;
  }

  emptyOverlay.classList.add('hidden');
  const graph = Solver.buildCanvasFlowGraph('power', powerPlan, { showAllMachines: AppState.showAllMachines });
  renderCanvasGraph(graph, autoFit);
}

/* ============================================================================
 * ABA 3: 🛠️ LIVRE (CONSTRUÇÃO MANUAL + CHECK DE DIAGNÓSTICO)
 * ========================================================================== */

function renderFreeMode(sidebarEl, emptyOverlay, autoFit) {
  const free = AppState.free;
  const blocks = free.blocks || [];
  const { belts, pipes } = Solver.getBeltsAndPipes();
  const machines = Solver.getProductionMachines();
  const generators = Solver.getPowerGenerators();

  const blocksHtml = blocks.map((b, idx) => {
    const st = Solver.computeFreeBlockStats(b);
    if (!st) return '';

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
      specificControls = `
        <div class="field-group">
          <label>Máquina / Refinaria</label>
          <select class="sidebar-select" onchange="changeFreeBlockMachine('${b.id}', this.value)">
            ${machines.map(m => `<option value="${m.id}" ${m.id === b.machineId ? 'selected' : ''}>${m.name}</option>`).join('')}
          </select>
        </div>
        <div class="field-group">
          <label>Receita (${machineRecipes.length} opções)</label>
          <select class="sidebar-select" onchange="updateFreeBlock('${b.id}', 'recipeId', this.value)">
            ${machineRecipes.map(r => `<option value="${r.id}" ${r.id === b.recipeId ? 'selected' : ''}>${r.isAlternate ? '★ [Alt] ' : ''}${r.cleanName}</option>`).join('')}
          </select>
        </div>
      `;
    } else if (b.blockType === 'generator') {
      const genObj = generators.find(g => g.id === b.generatorId) || generators[0];
      specificControls = `
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
    }

    return `
      <div class="stage-config-card">
        <div class="stage-config-header">
          <div class="stage-config-title">
            ${renderEntityIcon(st.entity, 36)}
            <div>
              <strong>#${idx + 1} • ${st.count}x ${st.title}</strong>
              <span>${st.subtitle} • Clock ${st.clockPercent}%</span>
            </div>
          </div>
          <div class="stage-config-actions">
            <button class="btn-icon-dup" onclick="duplicateFreeBlock('${b.id}')" title="Duplicar">📋</button>
            <button class="btn-icon-danger" onclick="removeFreeBlock('${b.id}')" title="Remover bloco">✕</button>
          </div>
        </div>

        ${specificControls}

        <div class="field-row-2">
          <div class="field-group">
            <label>Nº de Máquinas</label>
            <input type="number" class="sidebar-input" min="1" step="1" value="${b.count}" onchange="updateFreeBlock('${b.id}', 'count', Math.max(1, Math.round(parseFloat(this.value)||1)))" />
          </div>
          <div class="field-group">
            <label>Overclock (%)</label>
            <input type="number" class="sidebar-input" min="1" max="250" value="${b.clockPercent}" onchange="updateFreeBlock('${b.id}', 'clockPercent', Math.min(250, Math.max(1, parseFloat(this.value)||100)))" />
          </div>
        </div>

        <div class="field-row-2">
          <div class="field-group">
            <label>Andar Inicial (3D)</label>
            <input type="number" class="sidebar-input" min="1" max="20" step="1" value="${b.floor || 1}" onchange="updateFreeBlock('${b.id}', 'floor', Math.max(1, Math.round(parseFloat(this.value)||1)))" />
          </div>
          <div class="field-group">
            <label>Máqs p/ Andar (0 = todas)</label>
            <input type="number" class="sidebar-input" min="0" max="100" step="1" value="${b.machinesPerFloor || 0}" onchange="updateFreeBlock('${b.id}', 'machinesPerFloor', Math.max(0, Math.round(parseFloat(this.value)||0)))" />
          </div>
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
      </div>
    `;
  }).join('');

  let checkReportHtml = '';
  if (free.checkPerformed && free.lastCheckReport) {
    const rep = free.lastCheckReport;
    checkReportHtml = `
      <div class="sidebar-step-block check-report-box ${rep.isHealthy ? 'report-ok' : 'report-warn'}">
        <div class="step-header-row">
          <span class="step-badge">${rep.isHealthy ? '✅ TUDO CERTO' : '⚠️ DIAGNÓSTICO'}</span>
          <h4>Resultado do Check do Projeto</h4>
        </div>

        <div class="check-power-bar">
          <span>⚡ Consumo: <strong>${fmt(rep.totalPowerConsumedMw, 1)} MW</strong></span>
          <span>🔋 Gerado: <strong>${fmt(rep.totalPowerProducedMw, 1)} MW</strong></span>
        </div>

        ${rep.deficits.length === 0 && rep.beltIssues.length === 0 ? `
          <div class="check-item-card ok">
            <strong>✅ Sem falta de recursos ou gargalos de esteira!</strong>
            <p>Todas as entradas consumidas pelas suas máquinas estão supridas e as esteiras suportam a vazão configurada.</p>
          </div>
        ` : ''}

        ${rep.deficits.length > 0 ? `
          <div class="check-section-title">🔴 Falta de Recursos / Conflitos (${rep.deficits.length})</div>
          ${rep.deficits.map(d => `
            <div class="check-item-card error">
              <div class="check-item-head">
                ${renderEntityIcon(d.item, 26)}
                <strong>Falta ${fmt(d.deficitRate, 1)} ${d.item.unit}/min de ${d.item.name}</strong>
              </div>
              <p>Produzido: ${fmt(d.produced, 1)}/m • Consumido: ${fmt(d.consumed, 1)}/m</p>
              <div class="check-tip">🔧 <strong>Como resolver:</strong> ${d.suggestion}</div>
            </div>
          `).join('')}
        ` : ''}

        ${rep.beltIssues.length > 0 ? `
          <div class="check-section-title">🟣 Esteiras &amp; Tubulações (${rep.beltIssues.length})</div>
          ${rep.beltIssues.map(bi => `
            <div class="check-item-card ${bi.severity === 'error' ? 'error' : 'warn'}">
              <strong>${bi.blockTitle}</strong>
              <p>${bi.message}</p>
            </div>
          `).join('')}
        ` : ''}

        ${rep.surpluses.length > 0 ? `
          <div class="check-section-title">🟡 Excesso / Produção Disponível (${rep.surpluses.length})</div>
          ${rep.surpluses.map(s => `
            <div class="check-item-card surplus">
              <div class="check-item-head">
                ${renderEntityIcon(s.item, 24)}
                <strong>+${fmt(s.surplusRate, 1)} ${s.item.unit}/min de ${s.item.name} (${s.isFinalOutput ? 'Produto Final' : 'Excesso'})</strong>
              </div>
              ${s.extraConsumerNote ? `<div class="check-tip">💡 ${s.extraConsumerNote}</div>` : ''}
            </div>
          `).join('')}
        ` : ''}

        ${rep.recipeTips.length > 0 ? `
          <div class="check-section-title">💡 Sugestões de Receitas Mais Eficientes (${rep.recipeTips.length})</div>
          ${rep.recipeTips.map(rt => `
            <div class="check-item-card tip">
              <p>${rt.message}</p>
            </div>
          `).join('')}
        ` : ''}
      </div>
    `;
  }

  sidebarEl.innerHTML = `
    <div class="sidebar-step-block">
      <div class="step-header-row">
        <span class="step-badge">LIVRE</span>
        <h4>Adicionar ao Espaço</h4>
      </div>
      <div class="free-add-buttons">
        <button class="btn-free-add" onclick="addFreeBlock('extractor', { itemId: 'Desc_OreIron_C' })">⛏️ + Mineradora</button>
        <button class="btn-free-add" onclick="addFreeBlock('extractor', { itemId: 'Desc_LiquidOil_C' })">🛢️ + Extrator</button>
        <button class="btn-free-add" onclick="addFreeBlock('extractor', { itemId: 'Desc_Water_C' })">💧 + Bomba</button>
        <button class="btn-free-add" onclick="addFreeBlock('machine')">🏭 + Máquina</button>
        <button class="btn-free-add" onclick="addFreeBlock('generator')">⚡ + Gerador de Energia</button>
      </div>
    </div>

    ${blocks.length > 0 ? `
      <div class="sidebar-step-block">
        <div class="step-header-row">
          <span class="step-badge">${blocks.length}</span>
          <h4>Blocos no Projeto</h4>
        </div>
        <div class="stage-config-list">
          ${blocksHtml}
        </div>
      </div>
    ` : ''}

    ${blocks.length > 0 ? `
      <div class="sidebar-footer-actions">
        <button class="btn-clear-flow" onclick="clearCurrentFlow()">🗑️ Limpar Tudo</button>
      </div>
    ` : ''}

    ${checkReportHtml}
  `;

  if (blocks.length === 0) {
    clearCanvasGraph();
    emptyOverlay.classList.remove('hidden');
    emptyOverlay.innerHTML = `
      <div class="empty-card-box">
        <div class="empty-card-icon">🛠️</div>
        <h2>Modo de Construção Livre (Sandbox)</h2>
        <p>Adicione mineradoras, máquinas, divisores e geradores livremente, puxe esteiras entre as portas de conexão e clique em <strong>🩺 Diagnóstico / Check</strong> para validar gargalos e receitas!</p>
        <div class="dual-start-grid">
          <button class="btn-primary-Empty" onclick="addFreeBlock('extractor', { itemId: 'Desc_OreIron_C' })">⛏️ + Adicionar Mineradora</button>
          <button class="btn-primary-Empty secondary" onclick="addFreeBlock('machine')">🏭 + Adicionar Máquina</button>
        </div>
      </div>
    `;
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
    const mapBounds = L.latLngBounds([0, -1.4], [1.4, 0]);
    const map = L.map('leaflet-map-canvas', {
      center: [0.68, -0.72],
      zoom: 11,
      minZoom: 10,
      maxZoom: 15,
      maxBounds: mapBounds,
      maxBoundsViscosity: 1.0,
      zoomControl: true
    });

    L.tileLayer(mapData.tilesUrl, {
      minZoom: 10,
      maxZoom: 15,
      maxNativeZoom: 14,
      tileSize: 256,
      bounds: mapBounds,
      noWrap: true,
      attribution: 'Terreno &amp; Dados: MapGenie (MASSAGE-2(A-B)b)'
    }).addTo(map);

    mState.leafletMap = map;
    mState.markersLayer = L.layerGroup().addTo(map);
    setTimeout(() => {
      map.invalidateSize();
      const fillZ = Math.max(11, map.getBoundsZoom(mapBounds, true));
      map.setView([0.68, -0.72], fillZ, { animate: false });
    }, 60);
  } else if (mState.leafletMap) {
    setTimeout(() => {
      mState.leafletMap.invalidateSize();
    }, 30);
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
  const isTB = AppState.orientation === 'TB';
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
      nodesHtml += renderMagnificNodeCard(box, isTB);
    }
    nodesEl.innerHTML = nodesHtml;
    renderCanvasWiresAndBadges(graph, nodeCoords, isTB, wiresEl, nodesEl);

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
      nodesHtml += renderMagnificNodeCard(box, isTB);
    }
    nodesEl.innerHTML = nodesHtml;
    renderCanvasWiresAndBadges(graph, nodeCoords, isTB, wiresEl, nodesEl);

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

  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': isTB ? 'DOWN' : 'RIGHT',
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

    // Agrupa por coluna (DOWN) ou faixa (RIGHT) para identificar quebras de wrapping
    let currentGroup = 0;
    let prevPrimary = -Infinity;
    (res.children || []).forEach((c) => {
      const layerIdx = Number(String(c.id).replace('L_', ''));
      const x = Math.round(c.x || 0);
      const y = Math.round(c.y || 0);
      const primary = isTB ? y : x;
      if (prevPrimary !== -Infinity && primary < prevPrimary - 10) {
        currentGroup++;
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

function computeEdgeGeometry(fromBox, toBox, isTB, edge) {
  let x1, y1, x2, y2, midX, midY, d, badgeX, badgeY;
  const fromCompact = fromBox.node?.kind === 'splitter' || fromBox.node?.kind === 'merger' || fromBox.node?.kind === 'pipe_junction';
  const toCompact = toBox.node?.kind === 'splitter' || toBox.node?.kind === 'merger' || toBox.node?.kind === 'pipe_junction';

  if (!isTB) {
    x1 = fromBox.x + fromBox.w;
    y1 = fromBox.y + (fromCompact ? 78 : 132);
    x2 = toBox.x;
    y2 = toBox.y + (toCompact ? 78 : 132);
    midX = (x1 + x2) / 2;
    midY = (y1 + y2) / 2;
    d = buildRoundedOrthogonalPathLR(x1, y1, x2, y2, midX);
    badgeX = midX;
    badgeY = midY;
  } else {
    x1 = fromBox.x + fromBox.w / 2;
    y1 = fromBox.y + fromBox.h;
    x2 = toBox.x + toBox.w / 2;
    y2 = toBox.y;
    midX = (x1 + x2) / 2;
    midY = (y1 + y2) / 2;
    d = buildRoundedOrthogonalPathTB(x1, y1, x2, y2, midY);
    badgeX = midX;
    badgeY = midY;
  }
  return { x1, y1, x2, y2, midX, midY, d, badgeX, badgeY };
}

function renderCanvasWiresAndBadges(graph, nodeCoords, isTB, wiresEl, nodesEl) {
  let pathsHtml = '';
  let badgesHtml = '';

  graph.edges.forEach((edge, idx) => {
    const fromBox = nodeCoords.get(edge.from);
    const toBox = nodeCoords.get(edge.to);
    if (!fromBox || !toBox) return;

    const isLift = (fromBox.floor || 1) !== (toBox.floor || 1);
    const stageDiff = (typeof toBox.stageIdx === 'number' && typeof fromBox.stageIdx === 'number')
      ? (toBox.stageIdx - fromBox.stageIdx)
      : 1;
    const isWrapJump = (typeof fromBox.wrapGroup === 'number' && typeof toBox.wrapGroup === 'number')
      && fromBox.wrapGroup !== toBox.wrapGroup;
    const isCycleBack = stageDiff <= 0;
    const isOffPage = !edge.isCustom && (isWrapJump || stageDiff > 2 || isCycleBack);
    edge._isOffPage = isOffPage;

    const hitHandler = (edge.isCustom && edge.edgeId)
      ? `onclick="openEdgeBeltMenu(event, '${edge.edgeId}')" oncontextmenu="openEdgeBeltMenu(event, '${edge.edgeId}')"`
      : '';

    if (isOffPage) {
      // Conector curto de saída de página (não desenha linha gigante atravessando camadas ou colunas)
      const fromCompact = fromBox.node?.kind === 'splitter' || fromBox.node?.kind === 'merger' || fromBox.node?.kind === 'pipe_junction';
      const toCompact = toBox.node?.kind === 'splitter' || toBox.node?.kind === 'merger' || toBox.node?.kind === 'pipe_junction';
      const STUB = 28;

      let sx1, sy1, sx2, sy2, tx1, ty1, tx2, ty2;
      if (!isTB) {
        sx1 = fromBox.x + fromBox.w;
        sy1 = fromBox.y + (fromCompact ? 78 : 132);
        sx2 = sx1 + STUB;
        sy2 = sy1;
        tx2 = toBox.x;
        ty2 = toBox.y + (toCompact ? 78 : 132);
        tx1 = tx2 - STUB;
        ty1 = ty2;
      } else {
        sx1 = fromBox.x + fromBox.w / 2;
        sy1 = fromBox.y + fromBox.h;
        sx2 = sx1;
        sy2 = sy1 + STUB;
        tx2 = toBox.x + toBox.w / 2;
        ty2 = toBox.y;
        tx1 = tx2;
        ty1 = ty2 - STUB;
      }

      const dOut = `M ${sx1} ${sy1} L ${sx2} ${sy2}`;
      const dIn = `M ${tx1} ${ty1} L ${tx2} ${ty2}`;
      const fullGeom = computeEdgeGeometry(fromBox, toBox, isTB, edge);
      const stubStroke = edge.isPipe ? '#0284c7' : '#f97316';
      const fromName = (fromBox.node?.topLabel || fromBox.node?.item?.name || 'Origem').slice(0, 22);
      const toName = (toBox.node?.topLabel || toBox.node?.item?.name || 'Destino').slice(0, 22);
      const ratePart = edge.label ? ` · ${edge.label}` : '';

      pathsHtml += `
        <g id="edge-group-${idx}" class="conveyor-edge-group offpage-edge-group" data-from="${edge.from}" data-to="${edge.to}">
          <path class="offpage-stub" d="${dOut}" stroke="${stubStroke}" stroke-width="5" stroke-linecap="round" fill="none" />
          <path class="offpage-stub" d="${dIn}" stroke="${stubStroke}" stroke-width="5" stroke-linecap="round" fill="none" />
          <path
            id="wire-${idx}"
            data-from="${edge.from}"
            data-to="${edge.to}"
            class="magnific-wire offpage-full-ghost"
            d="${fullGeom.d}"
            stroke="${stubStroke}"
            stroke-width="3.5"
            stroke-dasharray="8 6"
            fill="none"
          />
        </g>
      `;

      badgesHtml += `
        <div
          class="wire-belt-pill offpage-pill ${edge.isPipe ? 'pipe-pill' : 'belt-pill'}"
          data-from="${edge.from}"
          data-to="${edge.to}"
          style="left:${sx2}px; top:${sy2 + (isTB ? 14 : 0)}px;"
          onmouseenter="highlightEdgePair('${edge.from}', '${edge.to}', true)"
          onmouseleave="highlightEdgePair('${edge.from}', '${edge.to}', false)"
          onclick="focusOnNode('${edge.to}')"
          title="Clique para ir até ${toName} • Passe o mouse para ver o caminho completo"
        >
          <span>→ ${toName}${ratePart}</span>
        </div>
        <div
          class="wire-belt-pill offpage-pill ${edge.isPipe ? 'pipe-pill' : 'belt-pill'}"
          data-from="${edge.from}"
          data-to="${edge.to}"
          style="left:${tx1}px; top:${ty1 - (isTB ? 14 : 0)}px;"
          onmouseenter="highlightEdgePair('${edge.from}', '${edge.to}', true)"
          onmouseleave="highlightEdgePair('${edge.from}', '${edge.to}', false)"
          onclick="focusOnNode('${edge.from}')"
          title="Clique para ir até ${fromName} • Passe o mouse para ver o caminho completo"
        >
          <span>← ${fromName}${ratePart}</span>
        </div>
      `;
      return;
    }

    const geom = computeEdgeGeometry(fromBox, toBox, isTB, edge);
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
            ${edge.isCustom ? '<title>Clique para escolher a tubulação ou excluir conexão</title>' : ''}
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
            stroke="#f97316"
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
            ${edge.isCustom ? '<title>Clique para escolher o nível da esteira ou excluir conexão</title>' : ''}
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
      badgesHtml += `
        <div
          id="wire-pill-${idx}"
          class="wire-belt-pill ${edge.isPipe ? 'pipe-pill' : 'belt-pill'} ${edge.isCustom ? 'clickable-belt-pill' : ''} ${isLift ? 'lift-pill' : ''}"
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
  const isTB = AppState.orientation === 'TB';
  renderCanvasWiresAndBadges(graph, AppState.canvas.nodeMap, isTB, wiresEl, nodesEl);
}

function buildRoundedOrthogonalPathLR(x1, y1, x2, y2, midX) {
  const dy = y2 - y1;
  if (Math.abs(dy) < 4) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  const r = Math.min(18, Math.abs(dy) / 2, Math.abs(midX - x1) / 2, Math.abs(x2 - midX) / 2);
  const signY = dy > 0 ? 1 : -1;
  const signX1 = midX >= x1 ? 1 : -1;
  const signX2 = x2 >= midX ? 1 : -1;

  return [
    `M ${x1} ${y1}`,
    `L ${midX - r * signX1} ${y1}`,
    `Q ${midX} ${y1} ${midX} ${y1 + r * signY}`,
    `L ${midX} ${y2 - r * signY}`,
    `Q ${midX} ${y2} ${midX + r * signX2} ${y2}`,
    `L ${x2} ${y2}`
  ].join(' ');
}

function buildRoundedOrthogonalPathTB(x1, y1, x2, y2, midY) {
  const dx = x2 - x1;
  if (Math.abs(dx) < 4) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  const r = Math.min(18, Math.abs(dx) / 2, Math.abs(midY - y1) / 2, Math.abs(y2 - midY) / 2);
  const signX = dx > 0 ? 1 : -1;
  const signY1 = midY >= y1 ? 1 : -1;
  const signY2 = y2 >= midY ? 1 : -1;

  return [
    `M ${x1} ${y1}`,
    `L ${x1} ${midY - r * signY1}`,
    `Q ${x1} ${midY} ${x1 + r * signX} ${midY}`,
    `L ${x2 - r * signX} ${midY}`,
    `Q ${x2} ${midY} ${x2} ${midY + r * signY2}`,
    `L ${x2} ${y2}`
  ].join(' ');
}

function renderMagnificNodeCard(box, isTB) {
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

  const portInClass = isTB ? 'port-tb-in' : 'port-lr-in';
  const portOutClass = isTB ? 'port-tb-out' : 'port-lr-out';

  const floorNum = box.floor || node._effectiveFloor || 1;
  const floorBadgeHtml = (AppState.canvas.is3DView || floorNum > 1)
    ? `<span class="mcard-floor-badge" title="Andar no layout vertical 3D">🏢 ${floorNum}º Andar</span>`
    : '';
  const deleteBtnHtml = (AppState.mode === 'free' && node.blockId)
    ? `<button type="button" class="mcard-delete-btn" onclick="deleteCanvasCard(event, '${node.id}')" title="Deletar este card">✕</button>`
    : '';
  const groupedCircleHtml = node.badgeText
    ? `<div class="mcard-count-circle" title="Quantidade de máquinas agrupadas">${node.badgeText}</div>`
    : '';

  return `
    <div
      id="${node.id}"
      data-floor="${floorNum}"
      class="magnific-card kind-${node.kind} ${isCompact ? 'compact-card' : ''} ${isFinalProduct ? 'final-product-highlight' : ''} ${isConfigurable ? 'configurable-card' : ''} ${floorNum > 1 ? 'upper-floor-card' : ''}"
      style="left:${x}px; top:${y}px; width:${w}px; --card-accent:${node.accent || '#ff7a1a'}; --floor-idx:${floorNum - 1};"
      onmouseenter="highlightNodeWires('${node.id}', true)"
      onmouseleave="highlightNodeWires('${node.id}', false)"
      ${isConfigurable ? `onclick="handleCanvasCardClick(event, '${node.id}')"` : ''}
      title="${isConfigurable ? 'Arraste para mover (Alt+Arrastar para duplicar) ou clique para configurar' : 'Arraste para mover livremente'}"
    >
      <div class="mcard-top-label ${isFinalProduct ? 'final-top-label' : ''}">
        <span class="mcard-title">${isFinalProduct ? `🎯 ${node.entity?.name || 'Produto Final'}` : node.topLabel}</span>
        <div class="mcard-top-badges">
          ${isFinalProduct ? '<span class="final-product-pill">PRODUTO FINAL</span>' : ''}
          ${floorBadgeHtml}
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
        ${groupedCircleHtml}
      </div>

      ${AppState.mode === 'free' ? `
        <div class="mcard-port ${portInClass}" title="Entrada">
          <span>▣</span>
        </div>
        <div class="mcard-port ${portOutClass}" title="Puxe para conectar">
          <span>▣</span>
        </div>
      ` : ''}
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

function handleCanvasCardClick(event, nodeId) {
  if (AppState.canvas.movedDuringDrag || Date.now() < (AppState.canvas.suppressClickUntil || 0)) return;
  event.stopPropagation();
  const box = AppState.canvas.nodeMap.get(nodeId);
  if (!box || !box.node || !box.node.configMeta) return;
  openMachineInspector(box.node.configMeta);
}

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
          <label>Overclock da Bomba d'Água (%) — 1% a 250%</label>
          <input type="number" class="sidebar-input" min="1" max="250" value="${clock}" onchange="setPowerWaterClock(this.value)" />
          <div class="quick-clock-row" style="margin-top:6px;">
            <button type="button" class="mini-clock-chip ${clock === 50 ? 'active' : ''}" onclick="setPowerWaterClock(50)">50% (60 m³/m)</button>
            <button type="button" class="mini-clock-chip ${clock === 75 ? 'active' : ''}" onclick="setPowerWaterClock(75)">75% (90 m³/m)</button>
            <button type="button" class="mini-clock-chip ${clock === 100 ? 'active' : ''}" onclick="setPowerWaterClock(100)">100% (120 m³/m)</button>
            <button type="button" class="mini-clock-chip ${clock === 150 ? 'active' : ''}" onclick="setPowerWaterClock(150)">150% (180 m³/m)</button>
            <button type="button" class="mini-clock-chip ${clock === 200 ? 'active' : ''}" onclick="setPowerWaterClock(200)">200% (240 m³/m)</button>
            <button type="button" class="mini-clock-chip ${clock === 250 ? 'active' : ''}" onclick="setPowerWaterClock(250)">250% (300 m³/m)</button>
          </div>
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
          <label>Overclock dos Geradores (%) — 1% a 250%</label>
          <input type="number" class="sidebar-input" min="1" max="250" value="${clock}" onchange="setPowerParam('clockPercent', Math.min(250, Math.max(1, parseFloat(this.value)||100)))" />
          <div class="quick-clock-row" style="margin-top:6px;">
            <button type="button" class="mini-clock-chip ${clock === 100 ? 'active' : ''}" onclick="setPowerParam('clockPercent', 100)">100%</button>
            <button type="button" class="mini-clock-chip ${clock === 150 ? 'active' : ''}" onclick="setPowerParam('clockPercent', 150)">150%</button>
            <button type="button" class="mini-clock-chip ${clock === 200 ? 'active' : ''}" onclick="setPowerParam('clockPercent', 200)">200%</button>
            <button type="button" class="mini-clock-chip ${clock === 250 ? 'active' : ''}" onclick="setPowerParam('clockPercent', 250)">250%</button>
          </div>
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
          <div class="field-row-2">
            <div class="field-group">
              <label>Nº de Mineradoras</label>
              <input type="number" class="sidebar-input" min="1" step="1" value="${p.minerCount}" onchange="setPowerParam('minerCount', Math.max(1, Math.round(parseFloat(this.value)||1)))" />
            </div>
            <div class="field-group">
              <label>Overclock Mineradora (%)</label>
              <input type="number" class="sidebar-input" min="1" max="250" value="${p.minerClock}" onchange="setPowerParam('minerClock', Math.min(250, Math.max(1, parseFloat(this.value)||100)))" />
            </div>
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
      const mCfg = AppState.pull.minerSettings[itemId] || { minerMark: 'mk2', purity: 'normal', clockPercent: 100, customCount: null };
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
          <div class="field-row-2">
            <div class="field-group">
              <label>Overclock (%)</label>
              <input type="number" class="sidebar-input" min="1" max="250" value="${mCfg.clockPercent || 100}" onchange="setPullMinerClock('${itemId}', this.value)" />
            </div>
            <div class="field-group">
              <label>Nº Inteiro de Extratores</label>
              <input type="number" class="sidebar-input" min="1" step="1" value="${mCfg.customCount || ''}" placeholder="Automático" onchange="setPullMinerCustomCount('${itemId}', this.value)" />
            </div>
          </div>
          <div class="quick-clock-row">
            <span>Clocks rápidos:</span>
            <button type="button" class="mini-clock-chip ${(mCfg.clockPercent || 100) === 100 ? 'active' : ''}" onclick="setPullMinerClock('${itemId}', 100)">100%</button>
            <button type="button" class="mini-clock-chip ${(mCfg.clockPercent || 100) === 150 ? 'active' : ''}" onclick="setPullMinerClock('${itemId}', 150)">150%</button>
            <button type="button" class="mini-clock-chip ${(mCfg.clockPercent || 100) === 200 ? 'active' : ''}" onclick="setPullMinerClock('${itemId}', 200)">200%</button>
            <button type="button" class="mini-clock-chip ${(mCfg.clockPercent || 100) === 250 ? 'active' : ''}" onclick="setPullMinerClock('${itemId}', 250)">250%</button>
            <button type="button" class="mini-clock-chip" onclick="setPullMinerCustomCount('${itemId}', null)">🔄 Nº Auto</button>
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
          <label>Overclock da Máquina (%) — 1% a 250%</label>
          <input type="number" class="sidebar-input" min="1" max="250" value="${clock}" onchange="handleInspectorStageClock('${meta.mode}', '${itemId}', this.value)" />
          <div class="quick-clock-row" style="margin-top:6px;">
            <button type="button" class="mini-clock-chip ${clock === 50 ? 'active' : ''}" onclick="handleInspectorStageClock('${meta.mode}', '${itemId}', 50)">50%</button>
            <button type="button" class="mini-clock-chip ${clock === 100 ? 'active' : ''}" onclick="handleInspectorStageClock('${meta.mode}', '${itemId}', 100)">100%</button>
            <button type="button" class="mini-clock-chip ${clock === 150 ? 'active' : ''}" onclick="handleInspectorStageClock('${meta.mode}', '${itemId}', 150)">150%</button>
            <button type="button" class="mini-clock-chip ${clock === 200 ? 'active' : ''}" onclick="handleInspectorStageClock('${meta.mode}', '${itemId}', 200)">200%</button>
            <button type="button" class="mini-clock-chip ${clock === 250 ? 'active' : ''}" onclick="handleInspectorStageClock('${meta.mode}', '${itemId}', 250)">250%</button>
          </div>
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

        <div class="field-row-2">
          <div class="field-group">
            <label>Nº Inteiro de Máquinas</label>
            <input type="number" class="sidebar-input" min="1" step="1" value="${b.count}" onchange="updateFreeBlock('${b.id}', 'count', Math.max(1, Math.round(parseFloat(this.value)||1)))" />
          </div>
          <div class="field-group">
            <label>Overclock (%)</label>
            <input type="number" class="sidebar-input" min="1" max="250" value="${b.clockPercent}" onchange="updateFreeBlock('${b.id}', 'clockPercent', Math.min(250, Math.max(1, parseFloat(this.value)||100)))" />
          </div>
        </div>
        <div class="quick-clock-row">
          <span>Clocks rápidos:</span>
          <button type="button" class="mini-clock-chip ${b.clockPercent === 100 ? 'active' : ''}" onclick="updateFreeBlock('${b.id}', 'clockPercent', 100)">100%</button>
          <button type="button" class="mini-clock-chip ${b.clockPercent === 150 ? 'active' : ''}" onclick="updateFreeBlock('${b.id}', 'clockPercent', 150)">150%</button>
          <button type="button" class="mini-clock-chip ${b.clockPercent === 200 ? 'active' : ''}" onclick="updateFreeBlock('${b.id}', 'clockPercent', 200)">200%</button>
          <button type="button" class="mini-clock-chip ${b.clockPercent === 250 ? 'active' : ''}" onclick="updateFreeBlock('${b.id}', 'clockPercent', 250)">250%</button>
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

/* --- Ações quando começa pelo Produto Final (Pull) --- */
function openPullAddTargetModal() {
  openPickerModal({
    title: 'Escolher Produto Final',
    filterType: 'craftable',
    defaultCategory: 'Todos',
    onSelect: (itemId) => {
      AppState.production.driver = 'product';
      const existing = AppState.pull.targets.find(t => t.itemId === itemId);
      if (existing) {
        existing.rate += 10;
      } else {
        AppState.pull.targets.push({ id: uid(), itemId, rate: 30 });
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
      if (t) t.itemId = itemId;
      renderAll(true);
    }
  });
}

function updatePullTargetRate(id, val) {
  const t = AppState.pull.targets.find(x => x.id === id);
  if (t) t.rate = Math.max(0.1, parseFloat(val) || 10);
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
    AppState.pull.minerSettings[itemId] = { minerMark: 'mk2', purity: 'normal', clockPercent: 100, customCount: null };
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
  AppState.power.manualGenerators = null;
  AppState.power.manualWaterPumps = null;
  const gen = Solver.getPowerGenerators().find(g => g.id === genId);
  if (gen && gen.fuels.length > 0) {
    AppState.power.fuelItemId = gen.fuels[0].itemId;
  } else {
    AppState.power.fuelItemId = null;
  }
  renderAll(true);
}

function selectPowerFuel(fuelId) {
  AppState.power.fuelItemId = fuelId;
  AppState.power.manualGenerators = null;
  AppState.power.manualWaterPumps = null;
  renderAll(true);
}

function setPowerCalcMode(mode) {
  AppState.power.calcMode = mode;
  AppState.power.manualGenerators = null;
  renderAll(false);
}

function setPowerParam(field, value) {
  AppState.power[field] = value;
  if (field === 'clockPercent' || field === 'minerCount' || field === 'minerClock' || field === 'minerMark' || field === 'purity') {
    AppState.power.manualGenerators = null;
    AppState.power.manualWaterPumps = null;
  }
  renderAll(false);
}

function setPowerWaterClock(val) {
  AppState.power.waterExtractorClock = Math.min(250, Math.max(1, parseFloat(val) || 100));
  AppState.power.manualWaterPumps = null;
  renderAll(false);
}

function setPowerGeneratorCountOverride(val) {
  const num = Math.max(1, Math.round(parseFloat(val) || 1));
  AppState.power.generatorCount = num;
  AppState.power.manualGenerators = num;
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
  } else if (blockType === 'splitter' || blockType === 'merger' || blockType === 'pipe_junction') {
    AppState.free.blocks.push({
      id,
      blockType,
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
    const outItem = fromBox?.node?.outputsList?.[0]?.item;
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

function handleWireDropOnCard(fromNodeId, toNodeId) {
  const fromBox = AppState.canvas.nodeMap.get(fromNodeId);
  const toBox = AppState.canvas.nodeMap.get(toNodeId);
  if (!fromBox || !toBox) return;

  if (AppState.mode !== 'free') {
    // Em modos automáticos, apenas destaca ou informa
    return;
  }

  const outItem = fromBox.node?.outputsList?.[0]?.item || toBox.node?.inputsList?.[0]?.item || null;
  const fromBlkId = fromBox.node?.blockId;
  const toBlkId = toBox.node?.blockId;
  const fromBlock = fromBlkId ? AppState.free.blocks.find(b => b.id === fromBlkId) : null;
  const isFluid = Boolean(outItem?.isFluid);

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
  const menu = document.getElementById('canvas-context-menu');
  if (!menu) return;

  const wx = Math.round(worldPos.x);
  const wy = Math.round(worldPos.y);

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
  const menu = document.getElementById('wire-drop-menu');
  if (!menu) return;

  const fromBox = AppState.canvas.nodeMap.get(fromNodeId);
  const outItem = fromBox?.node?.outputsList?.[0]?.item || null;
  const wx = Math.round(worldPos.x);
  const wy = Math.round(worldPos.y - 120);

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
    <div class="context-menu-header">🚚 Escolher ${item?.isFluid ? 'Tubulação' : 'Esteira'} da Conexão</div>
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
      if (AppState.tutorial.isOpen) closeTutorialModal();
      if (AppState.excessModal.isOpen) closeExcessRecipeModal();
      if (AppState.picker.isOpen) closePickerModal();
      if (AppState.inspector.isOpen) closeMachineInspector();
      if (AppState.library.selectedId) {
        AppState.library.selectedId = null;
        renderLibraryWorkspace();
      }
      if (AppState.recipes.selectedId) {
        AppState.recipes.selectedId = null;
        renderRecipesWorkspace();
      }
      closeCanvasMenus();
    } else if (AppState.tutorial.isOpen) {
      if (e.key === 'ArrowRight') nextTutorialStep();
      else if (e.key === 'ArrowLeft') prevTutorialStep();
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

function getLibraryEntries() {
  const allItems = Solver.getAllItems();
  const rawResources = allItems
    .filter(it => it.isRawResource)
    .map(it => ({
      id: `res_${it.id}`,
      rawId: it.id,
      kind: 'resources',
      categoryLabel: 'Recursos Primários',
      name: it.name,
      entity: it,
      summary: `Forma: ${it.isFluid ? 'Fluido / Gás' : 'Sólido'} • Unidade: ${it.unit || 'un'}`,
      rawData: it
    }));

  const products = allItems
    .filter(it => !it.isRawResource)
    .map(it => ({
      id: `item_${it.id}`,
      rawId: it.id,
      kind: 'items',
      categoryLabel: it.category || 'Itens & Produtos',
      name: it.name,
      entity: it,
      summary: `Forma: ${it.isFluid ? 'Fluido / Gás' : 'Sólido'} • Categoria: ${it.category || 'Item'}`,
      rawData: it
    }));

  const recipes = Object.values(window.SATISFACTORY_DATA?.recipes || {})
    .filter(r => !r.isFicsmas)
    .map(r => {
      const m = Solver.getMachine(r.machine);
      const firstProd = r.products?.[0] ? Solver.getItem(r.products[0].item) : null;
      return {
        id: `rec_${r.id}`,
        rawId: r.id,
        kind: 'recipes',
        categoryLabel: r.isAlternate ? 'Receita Alternativa ★' : 'Receita Padrão',
        name: r.cleanName || r.name,
        entity: firstProd || m,
        summary: `${m ? m.name : 'Máquina'} • Ciclo: ${r.duration || 1}s`,
        rawData: r
      };
    });

  const machines = [...Solver.getExtractors(), ...Solver.getProductionMachines()].map(m => ({
    id: `mach_${m.id}`,
    rawId: m.id,
    kind: 'machines',
    categoryLabel: 'Máquinas & Extratores',
    name: m.name,
    entity: m,
    summary: `Consumo Base: ${fmt(m.powerConsumption || 0, 1)} MW`,
    rawData: m
  }));

  const generators = Solver.getPowerGenerators().map(g => ({
    id: `gen_${g.id}`,
    rawId: g.id,
    kind: 'generators',
    categoryLabel: 'Geradores de Energia',
    name: g.name,
    entity: g,
    summary: `Geração Base: ${fmt(g.powerProduction || 0, 1)} MW`,
    rawData: g
  }));

  const { belts, pipes } = Solver.getBeltsAndPipes();
  const pipeImgMap = {
    Build_Pipeline_C: 'https://satisfactory.wiki.gg/images/Pipeline_Mk.1.png',
    Build_PipelineMK2_C: 'https://satisfactory.wiki.gg/images/Pipeline_Mk.2.png'
  };
  const logistics = [...belts, ...pipes].map(l => {
    const entityWithImg = l.wikiImage ? l : { ...l, wikiImage: pipeImgMap[l.id] || '' };
    return {
      id: `logi_${l.id}`,
      rawId: l.id,
      kind: 'logistics',
      categoryLabel: 'Esteiras & Tubulações',
      name: l.name,
      entity: entityWithImg,
      summary: `Capacidade: ${fmt(l.ratePerMin || 0, 0)} /min`,
      rawData: l
    };
  });

  const extra = window.SATISFACTORY_LIBRARY_EXTRA || { tools: [], creatures: [] };
  const tools = (extra.tools || []).map(t => ({
    id: t.id,
    rawId: t.id,
    kind: 'tools',
    categoryLabel: 'Ferramentas & Equipamentos',
    name: t.name,
    entity: t,
    summary: `${t.tier} • ${t.slot}`,
    rawData: t
  }));

  const creatures = (extra.creatures || []).map(c => ({
    id: c.id,
    rawId: c.id,
    kind: 'creatures',
    categoryLabel: 'Animais / Fauna',
    name: c.name,
    entity: c,
    summary: `${c.behavior} • ${c.hp}`,
    rawData: c
  }));

  return [
    ...rawResources,
    ...products,
    ...machines,
    ...generators,
    ...logistics,
    ...tools,
    ...creatures
  ];
}

function setLibraryCategory(cat) {
  AppState.library.category = cat;
  AppState.library.selectedId = null;
  renderAll(false);
}

function setLibrarySearch(q) {
  AppState.library.searchQuery = q;
  renderLibraryWorkspace();
}

function selectLibraryEntry(entryId) {
  AppState.library.selectedId = AppState.library.selectedId === entryId ? null : entryId;
  renderLibraryWorkspace();
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

function planRecipeFromRecipesTab(itemId, recipeId) {
  AppState.recipes.selectedId = null;
  AppState.production.driver = 'product';
  AppState.production.mounted = true;
  AppState.pull.targets = [{ id: uid(), itemId, rate: 30 }];
  if (recipeId) {
    AppState.pull.recipeOverrides[itemId] = recipeId;
  }
  switchMode('production');
}

function renderLibraryMode(sidebarEl, emptyOverlay) {
  emptyOverlay.classList.add('hidden');
  emptyOverlay.innerHTML = '';

  const allEntries = getLibraryEntries();
  const counts = {
    all: allEntries.length,
    resources: allEntries.filter(e => e.kind === 'resources').length,
    items: allEntries.filter(e => e.kind === 'items').length,
    machines: allEntries.filter(e => e.kind === 'machines').length,
    generators: allEntries.filter(e => e.kind === 'generators').length,
    logistics: allEntries.filter(e => e.kind === 'logistics').length,
    tools: allEntries.filter(e => e.kind === 'tools').length,
    creatures: allEntries.filter(e => e.kind === 'creatures').length
  };

  const cats = [
    { id: 'all', label: '🌐 Tudo', count: counts.all },
    { id: 'resources', label: '⛏️ Recursos', count: counts.resources },
    { id: 'items', label: '📦 Itens & Produtos', count: counts.items },
    { id: 'machines', label: '🏭 Máquinas', count: counts.machines },
    { id: 'generators', label: '⚡ Geradores', count: counts.generators },
    { id: 'logistics', label: '🚚 Esteiras & Tubos', count: counts.logistics },
    { id: 'tools', label: '🔧 Ferramentas', count: counts.tools },
    { id: 'creatures', label: '🐾 Animais / Fauna', count: counts.creatures }
  ];

  sidebarEl.innerHTML = `
    <div class="sidebar-step-block">
      <div class="step-header-row">
        <span class="step-badge">BIBLIOTECA</span>
        <h4>Enciclopédia do Jogo</h4>
      </div>
      <input
        type="text"
        class="sidebar-input"
        placeholder="🔍 Buscar recurso, máquina, receita, animal..."
        value="${AppState.library.searchQuery}"
        oninput="setLibrarySearch(this.value)"
      />
    </div>

    <div class="sidebar-step-block">
      <div class="step-header-row">
        <span class="step-badge">CATEGORIAS</span>
        <h4>Filtrar por Tipo</h4>
      </div>
      <div class="library-cat-list">
        ${cats.map(c => `
          <button
            type="button"
            class="library-cat-btn ${AppState.library.category === c.id ? 'active' : ''}"
            onclick="setLibraryCategory('${c.id}')"
          >
            <span>${c.label}</span>
            <span class="library-cat-count">${c.count}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  renderLibraryWorkspace(allEntries);
}

function renderLibraryWorkspace(cachedEntries = null) {
  const view = document.getElementById('library-workspace-view');
  if (!view) return;

  const allEntries = cachedEntries || getLibraryEntries();
  const cat = AppState.library.category;
  const query = Solver.normalizeText(AppState.library.searchQuery || '');

  let filtered = cat === 'all' ? allEntries : allEntries.filter(e => e.kind === cat);
  if (query) {
    filtered = filtered.filter(e =>
      Solver.normalizeText(e.name).includes(query) ||
      Solver.normalizeText(e.categoryLabel).includes(query) ||
      Solver.normalizeText(e.summary).includes(query)
    );
  }

  const selectedEntry = AppState.library.selectedId
    ? allEntries.find(e => e.id === AppState.library.selectedId)
    : null;

  let detailHtml = '';
  if (selectedEntry) {
    let extraDetails = '';
    if (selectedEntry.kind === 'resources' || selectedEntry.kind === 'items') {
      const prodRecs = Solver.indexes.recipesByProduct.get(selectedEntry.rawId) || [];
      const usedInRecs = Object.values(window.SATISFACTORY_DATA?.recipes || {})
        .filter(r => !r.isFicsmas && (r.ingredients || []).some(i => i.item === selectedEntry.rawId));
      const isRaw = selectedEntry.kind === 'resources';
      extraDetails = `
        <div class="lib-detail-lists">
          <div>
            <strong>Produzido em (${prodRecs.length} receita(s)):</strong>
            <ul>${prodRecs.slice(0, 6).map(r => `<li>${r.cleanName || r.name} (${Solver.getMachine(r.machine)?.name || ''})</li>`).join('') || '<li>Recurso extraído diretamente do mapa</li>'}</ul>
          </div>
          <div>
            <strong>Usado como ingrediente em (${usedInRecs.length} receita(s)):</strong>
            <ul>${usedInRecs.slice(0, 6).map(r => `<li>${r.cleanName || r.name}</li>`).join('') || '<li>Produto final / Uso direto</li>'}</ul>
          </div>
        </div>
        ${(isRaw || prodRecs.length > 0) ? `
          <div style="margin-top:14px;">
            <button type="button" class="btn-mount-flow ready" onclick="planItemFromLibrary('${selectedEntry.rawId}', ${isRaw})">
              ${isRaw ? '⛏️ Usar este Recurso na Aba de Produção' : '🏭 Planejar Produção deste Item (30/min)'}
            </button>
          </div>
        ` : ''}
      `;
    } else if (selectedEntry.kind === 'recipes') {
      const r = selectedEntry.rawData;
      const m = Solver.getMachine(r.machine);
      const ings = (r.ingredients || []).map(i => `${fmt(i.ratePerMin, 1)}/m ${Solver.getItem(i.item)?.name || i.item}`).join(' + ');
      const prods = (r.products || []).map(p => `${fmt(p.ratePerMin, 1)}/m ${Solver.getItem(p.item)?.name || p.item}`).join(' + ');
      extraDetails = `
        <div class="lib-detail-lists">
          <div><strong>Máquina:</strong> ${m ? m.name : 'Bancada'} • <strong>Ciclo:</strong> ${r.duration || 1}s</div>
          <div><strong>Entrada:</strong> ${ings || 'Nenhuma'}</div>
          <div><strong>Saída:</strong> ${prods || 'Nenhuma'}</div>
        </div>
      `;
    } else if (selectedEntry.kind === 'machines') {
      const m = selectedEntry.rawData;
      const recs = Solver.getRecipesByMachine(m.id);
      extraDetails = `
        <div class="lib-detail-lists">
          <div><strong>Consumo Elétrico Base:</strong> ⚡ ${fmt(m.powerConsumption || 0, 1)} MW</div>
          <div><strong>Receitas compatíveis:</strong> ${recs.length > 0 ? recs.slice(0, 8).map(r => r.cleanName).join(', ') + (recs.length > 8 ? '...' : '') : 'Extração direta de nós do mapa'}</div>
        </div>
      `;
    } else if (selectedEntry.kind === 'generators') {
      const g = selectedEntry.rawData;
      const fuels = (g.fuels || []).map(f => Solver.getItem(f.itemId)?.name || f.itemId).join(', ');
      extraDetails = `
        <div class="lib-detail-lists">
          <div><strong>Geração Base:</strong> ⚡ ${fmt(g.powerProduction || 0, 1)} MW</div>
          <div><strong>Combustíveis aceitos:</strong> ${fuels}</div>
        </div>
      `;
    } else if (selectedEntry.kind === 'tools' || selectedEntry.kind === 'creatures') {
      const d = selectedEntry.rawData;
      extraDetails = `
        <div class="lib-detail-lists">
          <div>${d.desc}</div>
          ${d.damage ? `<div><strong>Efeito / Dano:</strong> ${d.damage}</div>` : ''}
          ${d.drop ? `<div><strong>Recompensa / Drop:</strong> ${d.drop}</div>` : ''}
        </div>
      `;
    }

    detailHtml = `
      <div class="workspace-detail-backdrop" onclick="if(event.target===this) selectLibraryEntry('${selectedEntry.id}')">
        <div class="workspace-detail-modal">
          <div class="lib-detail-head">
            <div class="lib-detail-icon">
              ${selectedEntry.entity ? renderShowcaseImage(selectedEntry.entity, 68) : `<span class="lib-emoji-lg">${selectedEntry.emojiIcon || '📦'}</span>`}
            </div>
            <div style="flex:1;">
              <span class="lib-badge">${selectedEntry.categoryLabel}</span>
              <h3>${selectedEntry.name}</h3>
              <p>${selectedEntry.summary}</p>
            </div>
            <button type="button" class="icon-close" onclick="selectLibraryEntry('${selectedEntry.id}')">✕</button>
          </div>
          ${extraDetails}
        </div>
      </div>
    `;
  }

  const displayList = filtered.slice(0, 180);

  view.innerHTML = `
    <div class="lib-workspace-header">
      <div>
        <h2>📚 Biblioteca Satisfactory+</h2>
        <span>${filtered.length} registro(s) encontrado(s)</span>
      </div>
    </div>
    ${detailHtml}
    <div class="lib-cards-grid">
      ${displayList.map(entry => `
        <button
          type="button"
          class="lib-card ${AppState.library.selectedId === entry.id ? 'active' : ''}"
          onclick="selectLibraryEntry('${entry.id}')"
        >
          <div class="lib-card-icon">
            ${entry.entity ? renderEntityIcon(entry.entity, 48) : `<span class="lib-emoji">${entry.emojiIcon || '📦'}</span>`}
          </div>
          <div class="lib-card-body">
            <span class="lib-badge">${entry.categoryLabel}</span>
            <strong>${entry.name}</strong>
            <small>${entry.summary}</small>
          </div>
        </button>
      `).join('')}
      ${filtered.length === 0 ? `<div class="picker-empty">Nenhum item encontrado na Biblioteca.</div>` : ''}
    </div>
  `;
}

/* ============================================================================
 * ABA 6: 📜 RECEITAS (TODAS AS RECEITAS OFICIAIS SATISFACTORY 1.0+ EM PT-BR)
 * ========================================================================== */

function setRecipeFilter(f) {
  AppState.recipes.filter = f;
  AppState.recipes.selectedId = null;
  renderAll(false);
}

function setRecipeMachineFilter(mId) {
  AppState.recipes.machineFilter = mId;
  renderRecipesWorkspace();
}

function setRecipeSearch(q) {
  AppState.recipes.searchQuery = q;
  renderRecipesWorkspace();
}

function selectRecipeEntry(recId) {
  AppState.recipes.selectedId = AppState.recipes.selectedId === recId ? null : recId;
  renderRecipesWorkspace();
}

function renderRecipesMode(sidebarEl, emptyOverlay) {
  emptyOverlay.classList.add('hidden');
  emptyOverlay.innerHTML = '';

  const allRecipes = Object.values(window.SATISFACTORY_DATA?.recipes || {});
  const productGroups = getGroupedRecipeProducts(allRecipes);
  const withAltCount = productGroups.filter(g => g.alternates.length > 0).length;
  const ficsCount = productGroups.filter(g => g.isFicsmasOnly).length;
  const machines = Solver.getProductionMachines();

  sidebarEl.innerHTML = `
    <div class="sidebar-step-block">
      <div class="step-header-row">
        <span class="step-badge">RECEITAS</span>
        <h4>Produtos &amp; Variações</h4>
      </div>
      <input
        type="text"
        class="sidebar-input"
        placeholder="🔍 Buscar produto, receita ou máquina..."
        value="${AppState.recipes.searchQuery}"
        oninput="setRecipeSearch(this.value)"
      />
    </div>

    <div class="sidebar-step-block">
      <div class="step-header-row">
        <span class="step-badge">FILTRO</span>
        <h4>Exibir</h4>
      </div>
      <div class="library-cat-list">
        <button type="button" class="library-cat-btn ${AppState.recipes.filter === 'all' ? 'active' : ''}" onclick="setRecipeFilter('all')">
          <span>🌐 Todos os Produtos</span><span class="library-cat-count">${productGroups.length}</span>
        </button>
        <button type="button" class="library-cat-btn ${AppState.recipes.filter === 'alternate' ? 'active' : ''}" onclick="setRecipeFilter('alternate')">
          <span>⭐ Com Alternativas</span><span class="library-cat-count">${withAltCount}</span>
        </button>
        <button type="button" class="library-cat-btn ${AppState.recipes.filter === 'ficsmas' ? 'active' : ''}" onclick="setRecipeFilter('ficsmas')">
          <span>🎄 FICSMAS</span><span class="library-cat-count">${ficsCount}</span>
        </button>
      </div>
    </div>

    <div class="sidebar-step-block">
      <div class="step-header-row">
        <span class="step-badge">MÁQUINA</span>
        <h4>Filtrar por Máquina</h4>
      </div>
      <select class="sidebar-select" onchange="setRecipeMachineFilter(this.value)">
        <option value="all" ${AppState.recipes.machineFilter === 'all' ? 'selected' : ''}>Todas as Máquinas</option>
        ${machines.map(m => `<option value="${m.id}" ${AppState.recipes.machineFilter === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
      </select>
    </div>
  `;

  renderRecipesWorkspace(productGroups);
}

function getGroupedRecipeProducts(allRecipes) {
  const groupsMap = new Map();
  allRecipes.forEach((r) => {
    const prods = r.products || [];
    const mainProd = prods[0];
    if (!mainProd) return;
    const item = Solver.getItem(mainProd.item);
    if (!item) return;

    if (!groupsMap.has(item.id)) {
      groupsMap.set(item.id, {
        id: item.id,
        item,
        baseRecipes: [],
        alternates: [],
        allRecipes: [],
        isFicsmasOnly: true
      });
    }
    const g = groupsMap.get(item.id);
    if (!r.isFicsmas) g.isFicsmasOnly = false;
    g.allRecipes.push(r);
    if (r.isAlternate) g.alternates.push(r);
    else g.baseRecipes.push(r);
  });

  return [...groupsMap.values()].sort((a, b) => a.item.name.localeCompare(b.item.name, 'pt-BR'));
}

function renderRecipesWorkspace(cachedGroups = null) {
  const view = document.getElementById('recipes-workspace-view');
  if (!view) return;

  const allRecipes = Object.values(window.SATISFACTORY_DATA?.recipes || {});
  const allGroups = cachedGroups || getGroupedRecipeProducts(allRecipes);
  const f = AppState.recipes.filter;
  const mf = AppState.recipes.machineFilter;
  const q = Solver.normalizeText(AppState.recipes.searchQuery || '');

  const filtered = allGroups.filter(g => {
    if (f === 'alternate' && g.alternates.length === 0) return false;
    if (f === 'ficsmas' && !g.isFicsmasOnly) return false;
    if (f !== 'ficsmas' && g.isFicsmasOnly && !q) return false;
    if (mf !== 'all' && !g.allRecipes.some(r => r.machine === mf)) return false;
    if (q) {
      const recNames = g.allRecipes.map(r => `${r.cleanName || r.name} ${r.nameEn || ''} ${Solver.getMachine(r.machine)?.name || ''}`).join(' ');
      const hay = Solver.normalizeText(`${g.item.name} ${g.item.nameEn || ''} ${recNames}`);
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const selectedGroup = AppState.recipes.selectedId
    ? allGroups.find(g => g.id === AppState.recipes.selectedId)
    : null;

  let detailHtml = '';
  if (selectedGroup) {
    const orderedRecs = [...selectedGroup.baseRecipes, ...selectedGroup.alternates];
    const recipesListHtml = orderedRecs.map((r) => {
      const m = Solver.getMachine(r.machine);
      const avgMw = r.avgPowerMw ?? m?.powerConsumption ?? 0;
      const ingsHtml = (r.ingredients || []).map(i => {
        const it = Solver.getItem(i.item);
        return `<div class="rec-io-pill">${it ? renderEntityIcon(it, 22) : ''} <strong>${fmt(i.ratePerMin, 2)}/m</strong> ${it ? it.name : i.item}</div>`;
      }).join('');
      const prodsHtml = (r.products || []).map(p => {
        const it = Solver.getItem(p.item);
        return `<div class="rec-io-pill out">${it ? renderEntityIcon(it, 22) : ''} <strong>${fmt(p.ratePerMin, 2)}/m</strong> ${it ? it.name : p.item}</div>`;
      }).join('');

      return `
        <div class="recipe-variant-box ${r.isAlternate ? 'is-alt' : ''}">
          <div class="recipe-variant-head">
            <div>
              <span class="lib-badge">${r.isAlternate ? '⭐ Alternativa' : (r.isFicsmas ? '🎄 FICSMAS' : (m ? m.name : 'Receita'))}</span>
              <h4>${r.cleanName || r.name}</h4>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
              <small>${m ? m.name : 'Bancada'} • Ciclo ${r.duration || 1}s • ⚡ ${fmt(avgMw, 1)} MW</small>
              <button type="button" class="btn-small-accent" onclick="planRecipeFromRecipesTab('${selectedGroup.id}', '${r.id}')">🏭 Planejar</button>
            </div>
          </div>
          <div class="recipe-variant-io">
            <div><span class="rec-io-lbl">ENTRADA</span><div class="rec-io-wrap">${ingsHtml || 'Nenhuma'}</div></div>
            <div><span class="rec-io-lbl">SAÍDA</span><div class="rec-io-wrap">${prodsHtml || 'Nenhuma'}</div></div>
          </div>
        </div>
      `;
    }).join('');

    detailHtml = `
      <div class="workspace-detail-backdrop" onclick="if(event.target===this) selectRecipeEntry('${selectedGroup.id}')">
        <div class="workspace-detail-modal wide">
          <div class="lib-detail-head">
            <div class="lib-detail-icon">${renderShowcaseImage(selectedGroup.item, 68)}</div>
            <div style="flex:1;">
              <span class="lib-badge">${selectedGroup.baseRecipes.length} receita(s) + ${selectedGroup.alternates.length} alternativa(s)</span>
              <h3>${selectedGroup.item.name}</h3>
              <p>${selectedGroup.item.category || 'Produto'}</p>
            </div>
            <button type="button" class="icon-close" onclick="selectRecipeEntry('${selectedGroup.id}')">✕</button>
          </div>
          <div class="recipe-variants-stack">
            ${recipesListHtml}
          </div>
        </div>
      </div>
    `;
  }

  view.innerHTML = `
    <div class="lib-workspace-header">
      <div>
        <h2>📜 Receitas do Satisfactory</h2>
        <span>${filtered.length} produto(s) • Clique para ver a receita e suas alternativas</span>
      </div>
    </div>
    ${detailHtml}
    <div class="lib-cards-grid">
      ${filtered.map(g => {
        const mainRec = g.baseRecipes[0] || g.alternates[0];
        const m = mainRec ? Solver.getMachine(mainRec.machine) : null;
        const altTag = g.alternates.length > 0 ? ` + ${g.alternates.length} alt.` : '';
        return `
          <button
            type="button"
            class="lib-card ${AppState.recipes.selectedId === g.id ? 'active' : ''}"
            onclick="selectRecipeEntry('${g.id}')"
          >
            <div class="lib-card-icon">
              ${renderEntityIcon(g.item, 48)}
            </div>
            <div class="lib-card-body">
              <span class="lib-badge">${g.baseRecipes.length} rec.${altTag}</span>
              <strong>${g.item.name}</strong>
              <small>${m ? m.name : 'Produção'}${mainRec ? ` • ${(mainRec.ingredients || []).map(i => Solver.getItem(i.item)?.name || '').join(' + ')}` : ''}</small>
            </div>
          </button>
        `;
      }).join('')}
      ${filtered.length === 0 ? `<div class="picker-empty">Nenhuma receita encontrada.</div>` : ''}
    </div>
  `;
}

/* ============================================================================
 * ABA 7: 🧮 CALCULADORA NO SPACES (CONTAS NORMAIS + CÁLCULOS RÁPIDOS DO JOGO)
 * ========================================================================== */

function setCalcMode(m) {
  AppState.calculator.mode = m;
  renderAll(false);
}

function setCalcSmartType(t) {
  AppState.calculator.smartType = t;
  renderCalculatorWorkspace();
}

function updateCalcField(field, val) {
  AppState.calculator[field] = val;
  if (field === 'genId') {
    const g = Solver.getPowerGenerators().find(x => x.id === val);
    if (g && g.fuels.length > 0) AppState.calculator.genFuelId = g.fuels[0].itemId;
  } else if (field === 'machineId') {
    const recs = Solver.getRecipesByMachine(val);
    AppState.calculator.machineRecipeId = recs[0] ? recs[0].id : null;
  }
  renderCalculatorWorkspace();
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
  renderCalculatorWorkspace();
}

function evalMathExpr() {
  const raw = String(AppState.calculator.expr || '').replace(/,/g, '.').replace(/[^0-9+\-*/().%\s]/g, '');
  if (!raw.trim()) return;
  try {
    const val = Function(`"use strict"; return (${raw});`)();
    if (typeof val === 'number' && Number.isFinite(val)) {
      const formatted = fmt(val, 4);
      AppState.calculator.exprResult = formatted;
      AppState.calculator.history.unshift(`${raw} = ${formatted}`);
      if (AppState.calculator.history.length > 10) AppState.calculator.history.pop();
    } else {
      AppState.calculator.exprResult = 'Erro';
    }
  } catch {
    AppState.calculator.exprResult = 'Erro';
  }
  renderCalculatorWorkspace();
}

function renderCalculatorMode(sidebarEl, emptyOverlay) {
  emptyOverlay.classList.add('hidden');
  emptyOverlay.innerHTML = '';

  const c = AppState.calculator;
  sidebarEl.innerHTML = `
    <div class="sidebar-step-block">
      <div class="step-header-row">
        <span class="step-badge">CALCULADORA</span>
        <h4>Modo de Cálculo</h4>
      </div>
      <div class="library-cat-list">
        <button type="button" class="library-cat-btn ${c.mode === 'smart' ? 'active' : ''}" onclick="setCalcMode('smart')">
          <span>⚡ Cálculos do Jogo</span>
        </button>
        <button type="button" class="library-cat-btn ${c.mode === 'math' ? 'active' : ''}" onclick="setCalcMode('math')">
          <span>🔢 Calculadora Numérica</span>
        </button>
      </div>
    </div>
  `;

  renderCalculatorWorkspace();
}

function renderCalculatorWorkspace() {
  const view = document.getElementById('calculator-workspace-view');
  if (!view) return;
  const c = AppState.calculator;

  const modeTabsHtml = `
    <div class="calc-shell-header">
      <span class="calc-brand-tag">🧮 CALCULADORA S+</span>
      <div class="calc-mode-pills">
        <button type="button" class="calc-pill-btn ${c.mode === 'smart' ? 'active' : ''}" onclick="setCalcMode('smart')">⚡ Jogo</button>
        <button type="button" class="calc-pill-btn ${c.mode === 'math' ? 'active' : ''}" onclick="setCalcMode('math')">🔢 Normal</button>
      </div>
    </div>
  `;

  if (c.mode === 'math') {
    const keys = ['7','8','9','/','4','5','6','*','1','2','3','-','0','.','(',')','+','C','BACK','='];
    view.innerHTML = `
      <div class="calc-fixed-shell">
        ${modeTabsHtml}
        <div class="calc-visor">
          <input
            type="text"
            class="calc-expr-input"
            value="${c.expr}"
            oninput="AppState.calculator.expr = this.value"
            onkeydown="if(event.key==='Enter') evalMathExpr()"
            placeholder="0"
          />
          <div class="calc-result-readout">= ${c.exprResult}</div>
        </div>
        <div class="calc-shell-body">
          <div class="calc-keypad">
            ${keys.map(k => `
              <button type="button" class="calc-key ${k === '=' ? 'eq' : (k === 'C' || k === 'BACK' ? 'fn' : '')}" onclick="appendCalcKey('${k}')">
                ${k === 'BACK' ? '⌫' : k}
              </button>
            `).join('')}
          </div>
          ${c.history.length > 0 ? `
            <div class="calc-history">
              <strong>Histórico:</strong>
              ${c.history.slice(0, 4).map(h => `<div class="calc-hist-item">${h}</div>`).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
    return;
  }

  const gens = Solver.getPowerGenerators();
  const prodMachines = Solver.getProductionMachines();
  const selectedGen = gens.find(g => g.id === c.genId) || gens[0];
  const selectedMachine = prodMachines.find(m => m.id === c.machineId) || prodMachines[0];
  const machineRecipes = Solver.getRecipesByMachine(selectedMachine?.id);
  const selectedRecipe = machineRecipes.find(r => r.id === c.machineRecipeId) || machineRecipes[0];

  let visorFormula = '';
  let visorAnswer = '';
  let inputsHtml = '';
  let detailsHtml = '';

  if (c.smartType === 'energy') {
    const rawEnergyItems = [
      { id: 'Desc_Coal_C', name: 'Carvão (Mineradora)' },
      { id: 'Desc_LiquidOil_C', name: 'Petróleo Bruto (Extrator)' },
      { id: 'Desc_OreUranium_C', name: 'Urânio (Mineradora)' }
    ];

    inputsHtml = `
      <div class="calc-source-toggle">
        <button type="button" class="cat-chip ${c.energySource === 'extractor' ? 'active' : ''}" onclick="updateCalcField('energySource', 'extractor')">⛏️ A partir da Extração</button>
        <button type="button" class="cat-chip ${c.energySource === 'generator' ? 'active' : ''}" onclick="updateCalcField('energySource', 'generator')">⚡ A partir dos Geradores</button>
      </div>
    `;

    if (c.energySource === 'extractor') {
      const isOil = c.energyResourceId === 'Desc_LiquidOil_C';
      const baseRate = isOil ? 120 : (c.minerMark === 'mk1' ? 60 : (c.minerMark === 'mk2' ? 120 : 240));
      const purityMult = c.minerPurity === 'impure' ? 0.5 : (c.minerPurity === 'pure' ? 2.0 : 1.0);
      const clockMult = (Number(c.minerClock) || 100) / 100;
      const ratePerEx = baseRate * purityMult * clockMult;
      const count = Number(c.minerCount) || 1;
      const totalExtracted = ratePerEx * count;

      let genUsed = gens.find(g => g.id === 'Build_GeneratorCoal_C');
      let gensSupported = totalExtracted / 15;
      let waterNeeded = gensSupported * 45;
      let extraNote = '';

      if (c.energyResourceId === 'Desc_LiquidOil_C') {
        genUsed = gens.find(g => g.id === 'Build_GeneratorFuel_C');
        // 60 Petróleo bruto -> 40 Combustível (+30 Resíduo) na Refinaria; 20 Combustível por Gerador a Combustível
        const fuelProduced = totalExtracted * (40 / 60);
        gensSupported = fuelProduced / 20;
        waterNeeded = 0;
        extraNote = `Produz ~${fmt(fuelProduced, 1)} m³/m de Combustível (Refinaria)`;
      } else if (c.energyResourceId === 'Desc_OreUranium_C') {
        genUsed = gens.find(g => g.id === 'Build_GeneratorNuclear_C');
        // Aprox. 25 Urânio -> 0.2 Barra de Combustível Nuclear/m -> 1 Usina (2500 MW)
        gensSupported = totalExtracted / 25;
        waterNeeded = gensSupported * 240;
        extraNote = 'Estimativa via Barra de Combustível de Urânio';
      }

      const mwGenerated = gensSupported * (genUsed?.powerProduction || 75);
      const resObj = Solver.getItem(c.energyResourceId);

      visorFormula = `${count}x Extrator de ${resObj?.name || ''} (${fmt(totalExtracted, 1)}/m)`;
      visorAnswer = `⚡ ${fmt(mwGenerated, 1)} MW`;

      inputsHtml += `
        <div class="field-row-2">
          <div class="field-group"><label>Recurso</label><select class="sidebar-select" onchange="updateCalcField('energyResourceId', this.value)">${rawEnergyItems.map(it => `<option value="${it.id}" ${it.id===c.energyResourceId?'selected':''}>${it.name}</option>`).join('')}</select></div>
          <div class="field-group"><label>Quantidade</label><input type="number" class="sidebar-input" min="1" value="${count}" oninput="updateCalcField('minerCount', Math.max(1, Number(this.value)||1))" /></div>
        </div>
        <div class="field-row-2">
          ${!isOil ? `<div class="field-group"><label>Mineradora</label><select class="sidebar-select" onchange="updateCalcField('minerMark', this.value)"><option value="mk1" ${c.minerMark==='mk1'?'selected':''}>v.1 (60/m)</option><option value="mk2" ${c.minerMark==='mk2'?'selected':''}>v.2 (120/m)</option><option value="mk3" ${c.minerMark==='mk3'?'selected':''}>v.3 (240/m)</option></select></div>` : `<div class="field-group"><label>Extrator</label><input type="text" class="sidebar-input" value="Extrator de Petróleo" disabled /></div>`}
          <div class="field-group"><label>Pureza / Clock (%)</label>
            <div style="display:flex; gap:4px;">
              <select class="sidebar-select" onchange="updateCalcField('minerPurity', this.value)"><option value="impure" ${c.minerPurity==='impure'?'selected':''}>Impuro</option><option value="normal" ${c.minerPurity==='normal'?'selected':''}>Normal</option><option value="pure" ${c.minerPurity==='pure'?'selected':''}>Puro</option></select>
              <input type="number" class="sidebar-input" style="width:70px;" min="1" max="250" value="${c.minerClock}" oninput="updateCalcField('minerClock', Math.min(250, Math.max(1, Number(this.value)||100)))" />
            </div>
          </div>
        </div>
      `;

      detailsHtml = `
        <div class="calc-mini-stats">
          <div class="calc-mini-row"><span>Extraído Total:</span><strong>${fmt(totalExtracted, 1)} ${resObj?.unit || 'un'}/min</strong></div>
          <div class="calc-mini-row"><span>${genUsed?.name || 'Geradores'} Suportados:</span><strong>${fmt(gensSupported, 2)}x</strong></div>
          <div class="calc-mini-row"><span>Energia Gerada:</span><strong>⚡ ${fmt(mwGenerated, 1)} MW</strong></div>
          ${waterNeeded > 0 ? `<div class="calc-mini-row"><span>Água Necessária:</span><strong>💧 ${fmt(waterNeeded, 1)} m³/min (${Math.ceil(waterNeeded / 120)}x Bomba)</strong></div>` : ''}
          ${extraNote ? `<div class="calc-mini-row"><span>Nota:</span><strong>${extraNote}</strong></div>` : ''}
        </div>
      `;
    } else {
      // A partir dos Geradores
      const fuelObj = (selectedGen?.fuels || []).find(f => f.itemId === c.genFuelId) || selectedGen?.fuels?.[0];
      const fuelItem = fuelObj ? Solver.getItem(fuelObj.itemId) : null;
      const count = Number(c.genCount) || 1;
      const clockMult = (Number(c.genClock) || 100) / 100;
      const totalFuel = (fuelObj?.ratePerMin || 15) * clockMult * count;
      const totalMw = (selectedGen?.powerProduction || 75) * clockMult * count;
      const totalWater = (fuelObj?.waterPerMin || 0) * clockMult * count;
      const buildMaterials = (selectedGen?.buildCost || []).map(bc => {
        const it = Solver.getItem(bc.item);
        return `${fmt(bc.amount * count, 0)}x ${it ? it.name : bc.item}`;
      }).join(' • ');

      visorFormula = `${count}x ${selectedGen?.name || 'Gerador'} (${c.genClock}%)`;
      visorAnswer = `⚡ ${fmt(totalMw, 1)} MW`;

      inputsHtml += `
        <div class="field-row-2">
          <div class="field-group"><label>Gerador</label><select class="sidebar-select" onchange="updateCalcField('genId', this.value)">${gens.map(g => `<option value="${g.id}" ${g.id===c.genId?'selected':''}>${g.name}</option>`).join('')}</select></div>
          <div class="field-group"><label>Quantidade</label><input type="number" class="sidebar-input" min="1" value="${count}" oninput="updateCalcField('genCount', Math.max(1, Number(this.value)||1))" /></div>
        </div>
        <div class="field-row-2">
          <div class="field-group"><label>Combustível</label><select class="sidebar-select" onchange="updateCalcField('genFuelId', this.value)">${(selectedGen?.fuels||[]).map(f => `<option value="${f.itemId}" ${f.itemId===c.genFuelId?'selected':''}>${Solver.getItem(f.itemId)?.name || f.itemId}</option>`).join('')}</select></div>
          <div class="field-group"><label>Overclock (%)</label><input type="number" class="sidebar-input" min="1" max="250" value="${c.genClock}" oninput="updateCalcField('genClock', Math.min(250, Math.max(1, Number(this.value)||100)))" /></div>
        </div>
      `;

      detailsHtml = `
        <div class="calc-mini-stats">
          <div class="calc-mini-row"><span>Energia Gerada:</span><strong>⚡ ${fmt(totalMw, 1)} MW</strong></div>
          <div class="calc-mini-row"><span>Consumo (${fuelItem?.name || ''}):</span><strong>${fmt(totalFuel, 2)} ${fuelItem?.unit || 'un'}/min</strong></div>
          ${totalWater > 0 ? `<div class="calc-mini-row"><span>Água Consumida:</span><strong>💧 ${fmt(totalWater, 1)} m³/min (${Math.ceil(totalWater / 120)}x Bomba)</strong></div>` : ''}
          ${buildMaterials ? `<div class="calc-mini-row stack"><span>Criar ${count}x ${selectedGen?.name}:</span><strong>${buildMaterials}</strong></div>` : ''}
        </div>
      `;
    }
  } else {
    // Modo Máquinas: Seleciona Máquina + Receita/Produto + Quantidade + Clock
    const count = Number(c.machineCount) || 1;
    const clock = Number(c.machineClock) || 100;
    const clockMult = clock / 100;
    const baseMw = selectedRecipe?.avgPowerMw ?? selectedMachine?.powerConsumption ?? 0;
    const pwrPerMach = baseMw * Math.pow(clockMult, 1.321928);
    const totalMw = pwrPerMach * count;

    const prodsText = selectedRecipe
      ? (selectedRecipe.products || []).map(p => {
          const it = Solver.getItem(p.item);
          return `${fmt(p.ratePerMin * clockMult * count, 1)} ${it?.unit || 'un'}/min ${it ? it.name : p.item}`;
        }).join(' + ')
      : '—';

    const ingsText = selectedRecipe
      ? (selectedRecipe.ingredients || []).map(i => {
          const it = Solver.getItem(i.item);
          return `${fmt(i.ratePerMin * clockMult * count, 1)} ${it?.unit || 'un'}/min ${it ? it.name : i.item}`;
        }).join(' + ')
      : '—';

    const buildMaterials = (selectedMachine?.buildCost || []).map(bc => {
      const it = Solver.getItem(bc.item);
      return `${fmt(bc.amount * count, 0)}x ${it ? it.name : bc.item}`;
    }).join(' • ');

    const mainOut = selectedRecipe?.products?.[0];
    const mainOutItem = mainOut ? Solver.getItem(mainOut.item) : null;
    const mainOutRate = mainOut ? mainOut.ratePerMin * clockMult * count : 0;

    visorFormula = `${count}x ${selectedMachine?.name || 'Máquina'} (${selectedRecipe?.cleanName || ''})`;
    visorAnswer = mainOut ? `${fmt(mainOutRate, 1)} ${mainOutItem?.unit || ''}/m` : '—';

    inputsHtml = `
      <div class="field-row-2">
        <div class="field-group"><label>Máquina</label><select class="sidebar-select" onchange="updateCalcField('machineId', this.value)">${prodMachines.map(m => `<option value="${m.id}" ${m.id===selectedMachine?.id?'selected':''}>${m.name}</option>`).join('')}</select></div>
        <div class="field-group"><label>Quantidade</label><input type="number" class="sidebar-input" min="1" value="${count}" oninput="updateCalcField('machineCount', Math.max(1, Number(this.value)||1))" /></div>
      </div>
      <div class="field-row-2">
        <div class="field-group"><label>Produto / Receita</label><select class="sidebar-select" onchange="updateCalcField('machineRecipeId', this.value)">${machineRecipes.map(r => `<option value="${r.id}" ${r.id===selectedRecipe?.id?'selected':''}>${r.isAlternate ? '⭐ ' : ''}${r.cleanName || r.name}</option>`).join('')}</select></div>
        <div class="field-group"><label>Overclock (%)</label><input type="number" class="sidebar-input" min="1" max="250" value="${clock}" oninput="updateCalcField('machineClock', Math.min(250, Math.max(1, Number(this.value)||100)))" /></div>
      </div>
    `;

    detailsHtml = `
      <div class="calc-mini-stats">
        <div class="calc-mini-row stack"><span>Gerado (${count}x ${selectedMachine?.name}):</span><strong>${prodsText}</strong></div>
        <div class="calc-mini-row stack"><span>Recursos Consumidos:</span><strong>${ingsText}</strong></div>
        <div class="calc-mini-row"><span>Energia Consumida:</span><strong>⚡ ${fmt(totalMw, 1)} MW</strong></div>
        ${buildMaterials ? `<div class="calc-mini-row stack"><span>Criar ${count}x ${selectedMachine?.name}:</span><strong>${buildMaterials}</strong></div>` : ''}
      </div>
    `;
  }

  view.innerHTML = `
    <div class="calc-fixed-shell">
      ${modeTabsHtml}
      <div class="calc-visor">
        <div class="calc-visor-formula">${visorFormula}</div>
        <div class="calc-result-readout">= ${visorAnswer}</div>
      </div>

      <div class="calc-smart-tabs compact two-cols">
        <button type="button" class="cat-chip ${c.smartType === 'energy' ? 'active' : ''}" onclick="setCalcSmartType('energy')">⚡ Energia</button>
        <button type="button" class="cat-chip ${c.smartType === 'machines' ? 'active' : ''}" onclick="setCalcSmartType('machines')">🏭 Máquinas</button>
      </div>

      <div class="calc-shell-body">
        <div class="calc-compact-inputs">
          ${inputsHtml}
        </div>
        ${detailsHtml}
      </div>
    </div>
  `;
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

/* ============================================================================
 * TUTORIAL INTERATIVO EM CARROSSEL (BOTÃO NO CANTO SUPERIOR DIREITO)
 * ========================================================================== */

const TUTORIAL_SLIDES = [
  {
    icon: '🧭',
    title: 'Bem-vindo ao Satisfactory+ 1.0+',
    subtitle: 'Visão geral das 7 abas da ferramenta',
    desc: 'Use a barra superior à esquerda para navegar entre: 🏭 Produção (planejamento automático de fábricas), ⚡ Energia (usinas e bombas d\'água), 🛠️ Livre (sandbox manual + diagnóstico), 🗺️ Mapa (MASSAGE-2(A-B)b com 2.509 pinos), 📜 Receitas, 📚 Biblioteca e 🧮 Calculadora.'
  },
  {
    icon: '🏭',
    title: 'Como Gerar uma Linha de Produção',
    subtitle: 'Comece pelo Recurso ou pelo Produto Final',
    desc: 'Na aba Produção, você pode começar adicionando um Recurso/Mineradora (para ver tudo o que consegue fabricar) ou escolher diretamente o Produto Final e a meta por minuto. Depois clique em "Montar Linha de Produção" para visualizar todo o grafo.'
  },
  {
    icon: '⬇️',
    title: 'Como Ler o Fluxo e os Rótulos das Esteiras',
    subtitle: 'Sempre de cima para baixo (ou esquerda para direita)',
    desc: 'Quem consome um recurso SEMPRE fica depois de quem o produz. No meio de cada esteira ou tubo aparece uma pílula compacta com a versão mínima necessária e a vazão (ex.: "v.2 · 120/m"). Linhas longas ou que mudam de coluna usam conectores curtos "→ Destino" e "← Origem" — passe o mouse para destacar o caminho completo ou clique para saltar até o destino!'
  },
  {
    icon: '⛏️',
    title: 'Nós de Recurso e Cards de Máquina',
    subtitle: 'Informação limpa e configuração direta no clique',
    desc: 'Mineradoras, extratoras e bombas aparecem como "Nó de [recurso]" (ou "Água"), mostrando apenas o recurso e a taxa extraída por minuto. Clique em qualquer card de máquina ou nó no espaço para abrir o configurador de receita, overclock (1% a 250%) e quantidade inteira.'
  },
  {
    icon: '🎯',
    title: 'Produto Final em Destaque Laranja',
    subtitle: 'Identifique imediatamente o objetivo da fábrica',
    desc: 'O card do Produto Final (ou todos eles, se houver múltiplos objetivos) recebe destaque visual em laranja forte com a etiqueta "PRODUTO FINAL", ficando bem distinto das máquinas intermediárias e das esteiras.'
  },
  {
    icon: '♻️',
    title: 'Excesso e Nova Linha a Partir Dele',
    subtitle: 'Aproveite subprodutos como Resina de Polímero',
    desc: 'Somente itens produzidos pela linha que não são o produto final nem consumidos por outra etapa contam como Excesso. Eles aparecem somados no Quadro de Status (abaixo do botão Montar). Na aba Produção, clique em "⚡ Gerar nova linha de produção" ao lado de qualquer excesso para escolher uma receita já preenchida com a vazão disponível!'
  },
  {
    icon: '🛠️',
    title: 'Criação Livre (Sandbox) & Diagnóstico',
    subtitle: 'Construa do seu jeito e valide gargalos',
    desc: 'Na aba 🛠️ Livre, adicione mineradoras, máquinas, divisores, unificadores, junções de tubo e geradores. Arraste da porta de saída até outra máquina para conectar esteiras (ou solte no vazio para criar uma máquina compatível). Clique em "🩺 Diagnóstico / Check" para validar falta de recursos, limites de esteiras e receitas melhores.'
  },
  {
    icon: '🔍',
    title: 'Controles do Espaço, Agrupamento, Foco & 3D',
    subtitle: 'Domine a navegação mesmo em fábricas gigantes',
    desc: '• Arraste o fundo para mover a câmera e use a roda do mouse para dar zoom.\n• Arraste qualquer card livremente (Alt+Arrastar duplica no Modo Livre).\n• Passe o mouse sobre um card ou conector para ativar o Modo Foco nas esteiras ligadas.\n• Use "Todas Máquinas: SIM/NÃO" para expandir ou agrupar máquinas idênticas, "Visão 3D" para andares e "🎯 Centralizar" para enquadrar toda a fábrica.'
  }
];

function openTutorialModal() {
  AppState.tutorial.isOpen = true;
  AppState.tutorial.step = 0;
  const modal = document.getElementById('tutorial-modal');
  if (modal) modal.classList.remove('hidden');
  renderTutorialSlide();
}

function closeTutorialModal() {
  AppState.tutorial.isOpen = false;
  const modal = document.getElementById('tutorial-modal');
  if (modal) modal.classList.add('hidden');
}

function goToTutorialStep(idx) {
  AppState.tutorial.step = Math.max(0, Math.min(TUTORIAL_SLIDES.length - 1, idx));
  renderTutorialSlide();
}

function nextTutorialStep() {
  if (AppState.tutorial.step < TUTORIAL_SLIDES.length - 1) {
    AppState.tutorial.step++;
    renderTutorialSlide();
  } else {
    closeTutorialModal();
  }
}

function prevTutorialStep() {
  if (AppState.tutorial.step > 0) {
    AppState.tutorial.step--;
    renderTutorialSlide();
  }
}

function renderTutorialSlide() {
  const body = document.getElementById('tutorial-body');
  const footer = document.getElementById('tutorial-footer');
  if (!body || !footer) return;

  const idx = AppState.tutorial.step;
  const slide = TUTORIAL_SLIDES[idx];
  const isFirst = idx === 0;
  const isLast = idx === TUTORIAL_SLIDES.length - 1;

  body.innerHTML = `
    <div class="tutorial-slide-card">
      <div class="tutorial-slide-icon">${slide.icon}</div>
      <span class="tutorial-step-counter">Passo ${idx + 1} de ${TUTORIAL_SLIDES.length}</span>
      <h4>${slide.title}</h4>
      <div class="tutorial-slide-sub">${slide.subtitle}</div>
      <p class="tutorial-slide-desc">${slide.desc.replace(/\n/g, '<br>')}</p>
    </div>
  `;

  footer.innerHTML = `
    <button type="button" class="btn-tutorial-nav" onclick="prevTutorialStep()" ${isFirst ? 'disabled' : ''}>◀ Anterior</button>
    <div class="tutorial-dots">
      ${TUTORIAL_SLIDES.map((_, i) => `
        <button type="button" class="tutorial-dot ${i === idx ? 'active' : ''}" onclick="goToTutorialStep(${i})" aria-label="Slide ${i + 1}"></button>
      `).join('')}
    </div>
    <button type="button" class="btn-tutorial-nav primary" onclick="nextTutorialStep()">
      ${isLast ? '✅ Começar a Usar' : 'Próximo ▶'}
    </button>
  `;
}
