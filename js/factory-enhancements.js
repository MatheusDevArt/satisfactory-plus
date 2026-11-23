/* ============================================================================
 * MELHORIAS DE PRODUÇÃO, RESUMO DA FÁBRICA, MODAL ADICIONAR MÁQUINA,
 * LOGÍSTICA OFICIAL (CL-517554) E MODO DE CARD COMPACTO
 * ========================================================================== */

const FactoryUIState = {
  compactCards: false,
  statsCollapsed: false,
  powerMarginPercent: 10,
  showOtherGenerators: false,
  activeFooterTab: null, // null = recolhido | 'visao' | 'energia' | 'entradas' | 'saidas' | 'faltando' | 'excesso' | 'construcoes' | 'materiais'
  hoverFooterTab: null,
  pinnedFooterTab: null,
  collapsedSections: {
    materiais: true
  },
  addMachineModal: {
    isOpen: false,
    search: '',
    quickFilter: 'all', // 'all' | 'logistica' | 'armazenamento' | 'destinos' | 'extratores' | 'geradores' | 'alternativas' | machineId
    filterItemId: null,
    fromNodeId: null,
    worldPos: null,
    activeIndex: 0
  }
};

// Restaura preferência de card compacto salva no navegador
try {
  FactoryUIState.compactCards = localStorage.getItem('splus_compact_cards') === '1';
} catch {}

function applyCompactCardModeUI() {
  const vp = document.getElementById('spaces-viewport');
  if (vp) vp.classList.toggle('compact-cards-mode', FactoryUIState.compactCards);
  const btn = document.getElementById('btn-toggle-compact');
  if (btn) {
    btn.classList.toggle('active', FactoryUIState.compactCards);
    btn.title = FactoryUIState.compactCards ? 'Cards Compactos: SIM' : 'Cards Compactos: NÃO';
  }
}

function toggleCompactCardMode() {
  FactoryUIState.compactCards = !FactoryUIState.compactCards;
  try {
    localStorage.setItem('splus_compact_cards', FactoryUIState.compactCards ? '1' : '0');
  } catch {}
  applyCompactCardModeUI();
  if (typeof renderAll === 'function' && AppState.mode !== 'map') {
    renderAll(false);
  }
}

function toggleSummaryStatsCollapsed() {
  FactoryUIState.statsCollapsed = !FactoryUIState.statsCollapsed;
  if (FactoryUIState.statsCollapsed) FactoryUIState.activeFooterTab = null;
  try {
    localStorage.setItem('splus_stats_collapsed', FactoryUIState.statsCollapsed ? '1' : '0');
  } catch {}
  if (typeof updateTopRightFloatingActions === 'function') updateTopRightFloatingActions();
}

let _footerHoverLeaveTimer = null;

function toggleSummarySection(secId) {
  if (_footerHoverLeaveTimer) {
    clearTimeout(_footerHoverLeaveTimer);
    _footerHoverLeaveTimer = null;
  }
  if (FactoryUIState.statsCollapsed) FactoryUIState.statsCollapsed = false;
  if (FactoryUIState.pinnedFooterTab === secId) {
    FactoryUIState.pinnedFooterTab = null;
    FactoryUIState.hoverFooterTab = null;
    FactoryUIState.activeFooterTab = null;
  } else {
    FactoryUIState.pinnedFooterTab = secId;
    FactoryUIState.hoverFooterTab = secId;
    FactoryUIState.activeFooterTab = secId;
  }
  if (typeof updateTopRightFloatingActions === 'function') updateTopRightFloatingActions();
}

function hoverSummarySection(secId) {
  if (_footerHoverLeaveTimer) {
    clearTimeout(_footerHoverLeaveTimer);
    _footerHoverLeaveTimer = null;
  }
  if (FactoryUIState.pinnedFooterTab) return; // se já está fixado por clique, respeita o clique
  if (FactoryUIState.activeFooterTab === secId) return;
  FactoryUIState.hoverFooterTab = secId;
  FactoryUIState.activeFooterTab = secId;
  if (typeof updateTopRightFloatingActions === 'function') updateTopRightFloatingActions();
}

function handleFooterMouseEnter() {
  if (_footerHoverLeaveTimer) {
    clearTimeout(_footerHoverLeaveTimer);
    _footerHoverLeaveTimer = null;
  }
}

function handleFooterMouseLeave() {
  if (FactoryUIState.pinnedFooterTab) return; // permanece aberto se o usuário clicou
  if (_footerHoverLeaveTimer) clearTimeout(_footerHoverLeaveTimer);
  _footerHoverLeaveTimer = setTimeout(() => {
    _footerHoverLeaveTimer = null;
    if (!FactoryUIState.pinnedFooterTab && FactoryUIState.activeFooterTab) {
      FactoryUIState.hoverFooterTab = null;
      FactoryUIState.activeFooterTab = null;
      if (typeof updateTopRightFloatingActions === 'function') updateTopRightFloatingActions();
    }
  }, 160);
}

function closeSummaryFooterDrawer() {
  if (_footerHoverLeaveTimer) {
    clearTimeout(_footerHoverLeaveTimer);
    _footerHoverLeaveTimer = null;
  }
  FactoryUIState.pinnedFooterTab = null;
  FactoryUIState.hoverFooterTab = null;
  FactoryUIState.activeFooterTab = null;
  if (typeof updateTopRightFloatingActions === 'function') updateTopRightFloatingActions();
}

function setSummaryPowerMargin(val) {
  const num = Math.max(0, Math.min(200, Number(val) || 0));
  FactoryUIState.powerMarginPercent = num;
  if (typeof updateTopRightFloatingActions === 'function') updateTopRightFloatingActions();
}

function toggleOtherGeneratorsList() {
  FactoryUIState.showOtherGenerators = !FactoryUIState.showOtherGenerators;
  if (typeof updateTopRightFloatingActions === 'function') updateTopRightFloatingActions();
}

function escSummary(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getRecommendedGenerators(deficitMw, marginPct) {
  const targetMw = deficitMw * (1 + (Number(marginPct) || 0) / 100);
  const gens = Object.values((window.SATISFACTORY_DATA && window.SATISFACTORY_DATA.generators) || {});
  const items = (window.SATISFACTORY_DATA && window.SATISFACTORY_DATA.items) || {};
  const list = gens
    .filter((g) => g && g.powerProductionMw > 0)
    .map((g) => {
      const count = Math.max(1, Math.ceil(targetMw / g.powerProductionMw));
      const mainFuel = (g.fuels || [])[0];
      const fuelItem = mainFuel ? items[mainFuel.item] : null;
      const fuelRate = mainFuel ? (mainFuel.ratePerMin * count) : 0;
      const unit = fuelItem?.unit || 'un';
      return {
        id: g.id,
        name: g.name,
        count,
        totalMw: count * g.powerProductionMw,
        fuelName: fuelItem?.name || '',
        fuelRate,
        unit,
        wikiImage: g.wikiImage || ''
      };
    });

  // Ordena priorizando gerador mais adequado à faixa de potência
  list.sort((a, b) => {
    const score = (x) => {
      if (targetMw <= 60 && x.id.includes('Biomass')) return 0;
      if (targetMw <= 600 && x.id.includes('Coal')) return 0;
      if (targetMw <= 4000 && x.id.includes('Fuel')) return 0;
      if (targetMw > 4000 && x.id.includes('Nuclear')) return 0;
      return x.count;
    };
    return score(a) - score(b);
  });
  return list;
}

function renderSummarySectionHtml(id, title, bodyHtml) {
  const collapsed = Boolean(FactoryUIState.collapsedSections[id]);
  return `
    <div class="fs-section ${collapsed ? 'collapsed' : ''}">
      <button type="button" class="fs-section-head" onclick="toggleSummarySection('${id}')">
        <span>${title}</span>
        <span>${collapsed ? '▸' : '▾'}</span>
      </button>
      <div class="fs-section-body">${bodyHtml}</div>
    </div>
  `;
}

function renderItemRateRow(item, rateText, cls = '') {
  const iconHtml = item && typeof renderEntityIcon === 'function' ? renderEntityIcon(item, 18) : '';
  return `
    <div class="fs-row">
      <span class="fs-row-item">${iconHtml}<span>${escSummary(item?.name || 'Item')}</span></span>
      <strong class="${cls}">${rateText}</strong>
    </div>
  `;
}

/**
 * Renderiza o painel completo "Resumo da Fábrica" para Produção ou Modo Livre.
 */
function renderFactorySummaryPanel({ mode, plan, freeBlocks, freeEdges, graph }) {
  const itemsDb = (window.SATISFACTORY_DATA && window.SATISFACTORY_DATA.items) || {};
  const machinesDb = (window.SATISFACTORY_DATA && window.SATISFACTORY_DATA.machines) || {};
  const extractorsDb = (window.SATISFACTORY_DATA && window.SATISFACTORY_DATA.extractors) || {};
  const generatorsDb = (window.SATISFACTORY_DATA && window.SATISFACTORY_DATA.generators) || {};
  const logisticsDb = (window.SATISFACTORY_DATA && window.SATISFACTORY_DATA.logistics) || {};

  let totalBuildings = 0;
  const totalConnections = (graph && Array.isArray(graph.edges))
    ? graph.edges.length
    : (Array.isArray(freeEdges) ? freeEdges.length : 0);

  let powerConsumed = 0;
  let powerGenerated = 0;

  const inputsMap = new Map();     // itemId -> rate
  const outputsMap = new Map();    // itemId -> rate
  const missingMap = new Map();    // itemId -> rate (não produzido)
  const excessList = [];           // [{ item, excessRate }]
  const buildingsMap = new Map();  // key -> { name, iconObj, count }
  const materialsMap = new Map();  // itemId -> total amount

  const addBuilding = (obj, count = 1) => {
    if (!obj || count <= 0) return;
    totalBuildings += count;
    const key = obj.id || obj.name;
    const prev = buildingsMap.get(key) || { name: obj.name, obj, count: 0 };
    prev.count += count;
    buildingsMap.set(key, prev);

    for (const bc of (obj.buildCost || [])) {
      materialsMap.set(bc.item, (materialsMap.get(bc.item) || 0) + bc.amount * count);
    }
  };

  if (mode === 'production' && plan) {
    powerConsumed = plan.totalPowerMw ?? plan.summary?.grandTotalPowerMw ?? plan.summary?.totalFactoryPowerMw ?? 0;

    for (const st of (plan.stages || [])) {
      const mObj = machinesDb[st.machine?.id || st.recipe?.machine] || st.machine;
      addBuilding(mObj, st.intMachines || 0);
      if (st.isFinalTarget && st.item) {
        outputsMap.set(st.item.id, (outputsMap.get(st.item.id) || 0) + (st.actualProducedRate || 0));
      }
    }
    if (outputsMap.size === 0 && plan.stages && plan.stages.length > 0) {
      const last = plan.stages[plan.stages.length - 1];
      if (last.item) outputsMap.set(last.item.id, last.actualProducedRate || 0);
    }

    for (const ex of (plan.extractionPlan || plan.extraction || plan.rawResources || plan.rawExtractions || [])) {
      const exId = ex.extractor?.id || (ex.item?.id === 'Desc_Water_C' ? 'Build_WaterPump_C'
        : ex.item?.id === 'Desc_LiquidOil_C' ? 'Build_OilPump_C'
        : ex.minerMark === 'mk3' ? 'Build_MinerMk3_C'
        : ex.minerMark === 'mk2' ? 'Build_MinerMk2_C' : 'Build_MinerMk1_C');
      const exObj = extractorsDb[exId] || ex.extractor;
      addBuilding(exObj, ex.intExtractors || ex.extractorCount || 1);
      if (ex.item) {
        inputsMap.set(ex.item.id, (inputsMap.get(ex.item.id) || 0) + (ex.extractedRate || ex.totalExtractedRate || ex.requiredRate || 0));
      }
    }

    for (const ex of (plan.allExcessItems || [])) {
      if (ex.item && ex.excessRate > 0.05) excessList.push(ex);
    }
  } else if (mode === 'power' && plan) {
    powerGenerated = plan.totalGrossMw ?? plan.totalMW ?? 0;
    const chainPlan = plan.fuelChainPlan || null;
    powerConsumed = (plan.waterPumpPowerMw || 0) + (plan.chainPowerMw || (plan.extractorStats ? (plan.extractorStats.totalPowerMw || 0) : 0));

    const genObj = generatorsDb[plan.generator?.id] || plan.generator;
    addBuilding(genObj, plan.intGenerators || plan.generatorCount || 1);

    if (plan.intWaterPumps > 0) {
      addBuilding(extractorsDb['Build_WaterPump_C'], plan.intWaterPumps);
      inputsMap.set('Desc_Water_C', (inputsMap.get('Desc_Water_C') || 0) + (plan.totalWaterNeeded || 0));
    }

    if (chainPlan) {
      for (const st of (chainPlan.stages || [])) {
        const mObj = machinesDb[st.machine?.id || st.recipe?.machine] || st.machine;
        addBuilding(mObj, st.intMachines || 0);
      }
      for (const ex of (chainPlan.extractionPlan || [])) {
        const exId = ex.extractor?.id || (ex.resource?.id === 'Desc_Water_C' ? 'Build_WaterPump_C'
          : ex.resource?.id === 'Desc_LiquidOil_C' ? 'Build_OilPump_C'
          : 'Build_MinerMk2_C');
        const exObj = extractorsDb[exId] || ex.extractor;
        addBuilding(exObj, ex.intExtractors || 1);
        if (ex.resource) {
          inputsMap.set(ex.resource.id, (inputsMap.get(ex.resource.id) || 0) + (ex.totalExtracted || ex.rateNeeded || 0));
        }
      }
      for (const ex of (chainPlan.allExcessItems || [])) {
        if (ex.item && ex.excessRate > 0.05) excessList.push(ex);
      }
    } else {
      if (plan.extractorStats && plan.extractorStats.extractor) {
        addBuilding(plan.extractorStats.extractor, plan.extractorStats.count || 1);
      }
      if (plan.fuelItem) {
        const fRate = (plan.calcMode === 'from_fuel' && plan.availableFuelRate > 0) ? plan.availableFuelRate : (plan.totalFuelConsumed || 0);
        inputsMap.set(plan.fuelItem.id, fRate);
        if (plan.fuelExcess > 0.05) {
          excessList.push({ item: plan.fuelItem, excessRate: plan.fuelExcess });
        }
      }
    }
    if (plan.byprodItem && plan.totalByproductRate > 0.05) {
      outputsMap.set(plan.byprodItem.id, plan.totalByproductRate);
    }
  } else if (mode === 'free' && Array.isArray(freeBlocks)) {
    const producedMap = new Map();
    const consumedMap = new Map();

    for (const b of freeBlocks) {
      const count = Math.max(1, Number(b.count || b.extractorCount || 1));
      const clockMult = (Number(b.clockPercent || 100)) / 100;

      if (b.blockType === 'extractor') {
        const exId = b.itemId === 'Desc_Water_C' ? 'Build_WaterPump_C'
          : b.itemId === 'Desc_LiquidOil_C' ? 'Build_OilPump_C'
          : b.minerMark === 'mk3' ? 'Build_MinerMk3_C'
          : b.minerMark === 'mk2' ? 'Build_MinerMk2_C' : 'Build_MinerMk1_C';
        const exObj = extractorsDb[exId];
        addBuilding(exObj, count);
        const purityMult = b.purity === 'impure' ? 0.5 : (b.purity === 'pure' ? 2.0 : 1.0);
        const rate = (exObj?.baseRatePerMin || 60) * purityMult * clockMult * count;
        if (b.itemId) {
          inputsMap.set(b.itemId, (inputsMap.get(b.itemId) || 0) + rate);
          producedMap.set(b.itemId, (producedMap.get(b.itemId) || 0) + rate);
        }
        powerConsumed += (exObj?.powerMw || 5) * Math.pow(clockMult, 1.321929) * count;
      } else if (b.blockType === 'machine') {
        const rec = window.SATISFACTORY_DATA?.recipes?.[b.recipeId];
        const mObj = rec ? machinesDb[rec.machine] : null;
        addBuilding(mObj, count);
        if (rec) {
          const baseMw = rec.avgPowerMw ?? mObj?.powerMw ?? 0;
          powerConsumed += baseMw * Math.pow(clockMult, 1.321929) * count;
          for (const ing of (rec.ingredients || [])) {
            consumedMap.set(ing.item, (consumedMap.get(ing.item) || 0) + ing.ratePerMin * clockMult * count);
          }
          for (const prod of (rec.products || [])) {
            producedMap.set(prod.item, (producedMap.get(prod.item) || 0) + prod.ratePerMin * clockMult * count);
          }
        }
      } else if (b.blockType === 'generator') {
        const gObj = generatorsDb[b.generatorId];
        addBuilding(gObj, count);
        if (gObj) {
          powerGenerated += (gObj.powerProductionMw || 0) * clockMult * count;
          const fuel = (gObj.fuels || []).find((f) => f.item === b.fuelItemId) || gObj.fuels?.[0];
          if (fuel) {
            consumedMap.set(fuel.item, (consumedMap.get(fuel.item) || 0) + fuel.ratePerMin * clockMult * count);
            if (fuel.waterPerMin > 0) {
              consumedMap.set('Desc_Water_C', (consumedMap.get('Desc_Water_C') || 0) + fuel.waterPerMin * clockMult * count);
            }
          }
        }
      } else {
        // Logística / Armazenamento / Destinos Finais
        const logObj = Object.values(logisticsDb).find((l) => l.kind === b.blockType || l.id === b.logisticsId);
        if (logObj) {
          addBuilding(logObj, count);
          powerConsumed += (logObj.powerMw || 0) * count;
        } else {
          totalBuildings += count;
        }
      }
    }

    // Calcula Não Produzido (falta) e Excesso / Saídas no Modo Livre
    for (const [itemId, need] of consumedMap.entries()) {
      const prod = producedMap.get(itemId) || 0;
      if (need - prod > 0.05) {
        missingMap.set(itemId, need - prod);
      }
    }
    for (const [itemId, prod] of producedMap.entries()) {
      const need = consumedMap.get(itemId) || 0;
      if (prod - need > 0.05) {
        const it = itemsDb[itemId];
        if (it && !it.isRawResource) {
          outputsMap.set(itemId, prod - need);
          excessList.push({ item: it, excessRate: prod - need });
        }
      }
    }
  }

  const balanceMw = powerGenerated - powerConsumed;
  const deficitMw = Math.max(0, -balanceMw);
  const recGens = deficitMw > 0.05 ? getRecommendedGenerators(deficitMw, FactoryUIState.powerMarginPercent) : [];
  const mainGen = recGens[0] || null;
  const otherGens = recGens.slice(1);

  const overviewBody = `
    <div class="fs-row"><span>Construções</span><strong>${totalBuildings}</strong></div>
    <div class="fs-row"><span>Conexões</span><strong>${totalConnections}</strong></div>
  `;

  const energyBody = `
    <div class="fs-row"><span>Energia necessária</span><strong>${fmt(powerConsumed, 1)} MW</strong></div>
    ${powerGenerated > 0 ? `<div class="fs-row"><span>Energia gerada</span><strong>${fmt(powerGenerated, 1)} MW</strong></div>` : ''}
    ${mainGen ? `
      <div class="fs-gen-box">
        <div class="fs-gen-head">
          <span>Energia recomendada</span>
          <label style="display:inline-flex;align-items:center;gap:4px;font-weight:600;">
            Folga
            <input type="number" class="fs-margin-input" min="0" max="200" value="${FactoryUIState.powerMarginPercent}" onchange="setSummaryPowerMargin(this.value)" />%
          </label>
        </div>
        <div class="fs-row">
          <span><strong>${mainGen.count}× ${escSummary(mainGen.name)}</strong></span>
          <strong class="fs-pos">+${fmt(mainGen.totalMw, 0)} MW</strong>
        </div>
        ${mainGen.fuelName ? `<div class="fs-row"><span>${escSummary(mainGen.fuelName)}</span><strong>${fmt(mainGen.fuelRate, 1)} ${mainGen.unit}/min</strong></div>` : ''}
        ${otherGens.length > 0 ? `
          <button type="button" class="btn-small-secondary" style="align-self:flex-start;padding:3px 8px;font-size:11px;" onclick="toggleOtherGeneratorsList()">
            ${FactoryUIState.showOtherGenerators ? '▾ Ocultar outros geradores' : `▸ Outros geradores (${otherGens.length})`}
          </button>
          ${FactoryUIState.showOtherGenerators ? `
            <div class="fs-gen-alt-list">
              ${otherGens.map((og) => `
                <div class="fs-row">
                  <span>${og.count}× ${escSummary(og.name)}</span>
                  <strong>+${fmt(og.totalMw, 0)} MW${og.fuelName ? ` · ${fmt(og.fuelRate, 1)} ${og.unit}/m` : ''}</strong>
                </div>
              `).join('')}
            </div>
          ` : ''}
        ` : ''}
      </div>
    ` : ''}
  `;

  const inputsBody = inputsMap.size > 0
    ? [...inputsMap.entries()].map(([id, rate]) => {
        const it = itemsDb[id];
        return renderItemRateRow(it, `${fmt(rate, 1)} ${it?.unit || 'un'}/min`);
      }).join('')
    : '<div class="fs-row"><span>Nenhuma entrada registrada</span></div>';

  const outputsBody = outputsMap.size > 0
    ? [...outputsMap.entries()].map(([id, rate]) => {
        const it = itemsDb[id];
        return renderItemRateRow(it, `${fmt(rate, 1)} ${it?.unit || 'un'}/min`, 'fs-pos');
      }).join('')
    : '<div class="fs-row"><span>Nenhuma saída registrada</span></div>';

  const missingBody = missingMap.size > 0
    ? [...missingMap.entries()].map(([id, rate]) => {
        const it = itemsDb[id];
        return renderItemRateRow(it, `-${fmt(rate, 1)} ${it?.unit || 'un'}/min`, 'fs-neg');
      }).join('')
    : '';

  const excessBody = excessList.length > 0
    ? excessList.map((ex) => `
        <div class="fqs-excess-row">
          <div class="fqs-excess-item">
            ${typeof renderEntityIcon === 'function' ? renderEntityIcon(ex.item, 20) : ''}
            <div>
              <strong>${escSummary(ex.item.name)}</strong>
              <span>+${fmt(ex.excessRate, 1)} ${ex.item.unit || 'un'}/min</span>
            </div>
          </div>
          ${mode === 'production' ? `
            <button
              type="button"
              class="btn-excess-new-line"
              onclick="openExcessRecipeModal('${ex.item.id}', ${Number(ex.excessRate.toFixed(4))})"
            >
              ⚡ Gerar nova linha de produção
            </button>
          ` : ''}
        </div>
      `).join('')
    : '<div class="fs-row"><span>Nenhum excesso</span></div>';

  const buildingsBody = buildingsMap.size > 0
    ? [...buildingsMap.values()]
        .sort((a, b) => b.count - a.count)
        .map((b) => `
          <div class="fs-row">
            <span class="fs-row-item">${typeof renderEntityIcon === 'function' ? renderEntityIcon(b.obj, 18) : ''}<span>${escSummary(b.name)}</span></span>
            <strong>×${b.count}</strong>
          </div>
        `).join('')
    : '<div class="fs-row"><span>Nenhuma construção</span></div>';

  const materialsBody = materialsMap.size > 0
    ? [...materialsMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([id, amt]) => {
          const it = itemsDb[id];
          return renderItemRateRow(it, `${fmt(amt, 0)}`);
        }).join('')
    : '<div class="fs-row"><span>Sem custo de construção</span></div>';

  // Item 13 + Elevadores/Bombas 3D automáticos
  const beltsTierMap = new Map();
  const liftsTierMap = new Map();
  const pipesTierMap = new Map();
  let pipePumpsCount = 0;
  let splittersCount = 0;
  let mergersCount = 0;
  let junctionsCount = 0;
  const graphEdges = (graph && Array.isArray(graph.edges)) ? graph.edges : [];
  const graphNodes = (graph && Array.isArray(graph.nodes))
    ? graph.nodes
    : (graph && Array.isArray(graph.columns) ? graph.columns.flatMap((c) => c.nodes || []) : []);
  const nodeFloorMap = new Map();
  graphNodes.forEach((n) => {
    nodeFloorMap.set(n.id, Number(n._effectiveFloor || n.floor || 1));
  });

  const pickLiftTierForRate = (rate) => {
    const r = Number(rate) || 0;
    if (r <= 60) return 'Elevador de Esteira v.1';
    if (r <= 120) return 'Elevador de Esteira v.2';
    if (r <= 270) return 'Elevador de Esteira v.3';
    if (r <= 480) return 'Elevador de Esteira v.4';
    if (r <= 780) return 'Elevador de Esteira v.5';
    return 'Elevador de Esteira v.6';
  };

  graphEdges.forEach((e) => {
    const isPipe = Boolean(e.isPipe || e.isFluid || e.transport?.isFluid);
    const fFloor = nodeFloorMap.get(e.from) || 1;
    const tFloor = nodeFloorMap.get(e.to) || 1;
    const floorDiff = Math.abs(tFloor - fFloor);
    let tierName = e.transport?.name || e.transport?.shortName || '';
    if (!tierName && e.label) {
      const m = String(e.label).match(/v\.\d/i);
      tierName = m ? `${isPipe ? 'Tubulação' : 'Esteira'} ${m[0]}` : (isPipe ? 'Tubulação' : 'Esteira');
    }
    if (!tierName) tierName = isPipe ? 'Tubulação' : 'Esteira';
    const targetMap = isPipe ? pipesTierMap : beltsTierMap;
    targetMap.set(tierName, (targetMap.get(tierName) || 0) + 1);

    if (floorDiff > 0) {
      if (isPipe && tFloor > fFloor) {
        // Cada andar ~12m; Bomba de Tubulação v.1 (20m) / v.2 (50m)
        const heightM = floorDiff * 12;
        pipePumpsCount += Math.max(1, Math.ceil(heightM / 20));
      } else if (!isPipe) {
        const liftName = pickLiftTierForRate(e.rate || e.flowRate || 60);
        liftsTierMap.set(liftName, (liftsTierMap.get(liftName) || 0) + 1);
      }
    }
  });

  graphNodes.forEach((n) => {
    const k = String(n.kind || '').toLowerCase();
    const t = String(n.topLabel || n.title || '').toLowerCase();
    const mult = n.badgeText ? Math.max(1, parseInt(String(n.badgeText).replace(/[^\d]/g, ''), 10) || 1) : 1;
    if (k.includes('junction') || t.includes('junção') || t.includes('juncao')) junctionsCount += mult;
    else if (k.includes('splitter') || t.includes('divisor')) splittersCount += mult;
    else if (k.includes('merger') || t.includes('unificador')) mergersCount += mult;
  });

  const totalBelts = [...beltsTierMap.values()].reduce((a, v) => a + v, 0);
  const totalLifts = [...liftsTierMap.values()].reduce((a, v) => a + v, 0);
  const totalPipes = [...pipesTierMap.values()].reduce((a, v) => a + v, 0);
  const totalLogisticsCount = totalBelts + totalLifts + totalPipes + pipePumpsCount + splittersCount + mergersCount + junctionsCount;
  const logisticsRows = [];
  beltsTierMap.forEach((cnt, name) => {
    logisticsRows.push(`<div class="fs-row"><span class="fs-row-item"><span>📦 ${escSummary(name)}</span></span><strong>${cnt} trecho(s)</strong></div>`);
  });
  liftsTierMap.forEach((cnt, name) => {
    logisticsRows.push(`<div class="fs-row"><span class="fs-row-item"><span>🛗 ${escSummary(name)}</span></span><strong>×${cnt}</strong></div>`);
  });
  pipesTierMap.forEach((cnt, name) => {
    logisticsRows.push(`<div class="fs-row"><span class="fs-row-item"><span>💧 ${escSummary(name)}</span></span><strong>${cnt} trecho(s)</strong></div>`);
  });
  if (pipePumpsCount > 0) {
    logisticsRows.push(`<div class="fs-row"><span class="fs-row-item"><span>🔧 Bombas de Tubulação (andares)</span></span><strong>×${pipePumpsCount}</strong></div>`);
  }
  if (splittersCount > 0) {
    logisticsRows.push(`<div class="fs-row"><span class="fs-row-item"><span>🔀 Divisores de Esteira</span></span><strong>×${splittersCount}</strong></div>`);
  }
  if (mergersCount > 0) {
    logisticsRows.push(`<div class="fs-row"><span class="fs-row-item"><span>🔁 Unificadores de Esteira</span></span><strong>×${mergersCount}</strong></div>`);
  }
  if (junctionsCount > 0) {
    logisticsRows.push(`<div class="fs-row"><span class="fs-row-item"><span>💧 Junções de Tubulação</span></span><strong>×${junctionsCount}</strong></div>`);
  }
  const logisticsBody = logisticsRows.length > 0
    ? logisticsRows.join('')
    : '<div class="fs-row"><span>Nenhuma conexão logística na linha</span></div>';

  const tabs = [
    { id: 'visao', label: `Visão geral (${totalBuildings})`, body: overviewBody },
    { id: 'energia', label: powerGenerated > 0 && powerConsumed === 0 ? `Energia gerada (${fmt(powerGenerated, 0)} MW)` : `Energia (${fmt(powerConsumed, 0)} MW)`, body: energyBody },
    { id: 'logistica', label: `Logística (${totalLogisticsCount})`, body: logisticsBody },
    { id: 'entradas', label: `Entradas (${inputsMap.size})`, body: inputsBody },
    { id: 'saidas', label: `Saídas (${outputsMap.size})`, body: outputsBody },
    ...(missingMap.size > 0 ? [{ id: 'faltando', label: `Não produzido (${missingMap.size})`, body: missingBody, tone: 'neg' }] : []),
    { id: 'excesso', label: `Excesso (${excessList.length})`, body: excessBody, tone: excessList.length > 0 ? 'warn' : '' },
    { id: 'construcoes', label: `Construções (${totalBuildings})`, body: buildingsBody },
    { id: 'materiais', label: `Materiais (${materialsMap.size})`, body: materialsBody }
  ];

  const activeTabObj = tabs.find((t) => t.id === FactoryUIState.activeFooterTab) || null;

  const powerNeutralPillsHtml = (mode === 'power' && plan) ? `
    <span class="fs-footer-stat-neutral">⚡ Bruta: +${fmt(powerGenerated, 0)} MW (${plan.intGenerators || plan.generatorCount || 1}×)</span>
    <span class="fs-footer-stat-neutral">🔋 Líquida: +${fmt(plan.netPowerMw ?? (powerGenerated - powerConsumed), 0)} MW</span>
    ${plan.fuelItem ? `<span class="fs-footer-stat-neutral">🔥 ${escSummary(plan.fuelItem.name)}: ${fmt((plan.calcMode === 'from_fuel' && plan.availableFuelRate > 0) ? plan.availableFuelRate : (plan.totalFuelConsumed || 0), 1)}/min</span>` : ''}
  ` : '';

  return `
    <div class="fs-footer-hover-zone" onmouseenter="handleFooterMouseEnter()" onmouseleave="handleFooterMouseLeave()">
      ${activeTabObj ? `
        <div class="fs-footer-drawer" onmouseenter="handleFooterMouseEnter()">
          <div class="fs-footer-drawer-head">
            <strong>${activeTabObj.label} ${FactoryUIState.pinnedFooterTab === activeTabObj.id ? '<span class="fs-pin-tag">Fixado</span>' : ''}</strong>
            <button type="button" class="fs-drawer-close" onclick="closeSummaryFooterDrawer()" title="Fechar">✕</button>
          </div>
          <div class="fs-footer-drawer-body">${activeTabObj.body}</div>
        </div>
      ` : ''}
      <div class="fs-footer-bar" role="tablist" aria-label="Resumo da linha">
        ${tabs.map((t) => `
          <button
            type="button"
            class="fs-footer-tab ${FactoryUIState.activeFooterTab === t.id ? 'active' : ''} ${FactoryUIState.pinnedFooterTab === t.id ? 'is-pinned' : ''} ${t.tone ? 'tone-' + t.tone : ''}"
            onmouseenter="hoverSummarySection('${t.id}')"
            onclick="toggleSummarySection('${t.id}')"
          >
            <span>${t.label}</span>
            <span class="fs-tab-caret">${FactoryUIState.activeFooterTab === t.id ? '▾' : '▴'}</span>
          </button>
        `).join('')}
        ${powerNeutralPillsHtml}
      </div>
    </div>
  `;
}

/* ============================================================================
 * MODAL COMPLETO "ADICIONAR MÁQUINA" (MODO LIVRE)
 * ========================================================================== */

function openAddMachineModal(options = {}) {
  const st = FactoryUIState.addMachineModal;
  st.isOpen = true;
  st.search = typeof options.initialSearch === 'string' ? options.initialSearch : '';
  st.quickFilter = options.quickFilter || 'all';
  st.filterItemId = options.filterItemId || null;
  st.fromNodeId = options.fromNodeId || null;
  st.worldPos = options.worldPos || null;
  st.activeIndex = -1;

  const titleEl = document.getElementById('add-machine-title');
  if (titleEl) {
    titleEl.textContent = 'Adicionar Máquina';
  }

  const modal = document.getElementById('add-machine-modal');
  if (modal) modal.classList.remove('hidden');
  renderAddMachineModalBody();
  setTimeout(() => {
    const inp = document.getElementById('am-search-input');
    if (inp) inp.focus();
  }, 40);
}

function setAddMachineQuickFilter(filterKey) {
  FactoryUIState.addMachineModal.quickFilter = filterKey;
  FactoryUIState.addMachineModal.activeIndex = -1;
  renderAddMachineModalResultsOnly();
}

function closeAddMachineModal() {
  FactoryUIState.addMachineModal.isOpen = false;
  const modal = document.getElementById('add-machine-modal');
  if (modal) modal.classList.add('hidden');
}

function normAmText(str) {
  if (typeof Solver !== 'undefined' && typeof Solver.normalizeText === 'function') {
    return Solver.normalizeText(str);
  }
  return String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function getFilteredAddMachineOptions() {
  const st = FactoryUIState.addMachineModal;
  const q = normAmText(st.search || '');
  const qf = st.quickFilter || 'all';
  const itemsDb = (window.SATISFACTORY_DATA && window.SATISFACTORY_DATA.items) || {};
  const machinesDb = (window.SATISFACTORY_DATA && window.SATISFACTORY_DATA.machines) || {};
  const extractorsDb = (window.SATISFACTORY_DATA && window.SATISFACTORY_DATA.extractors) || {};
  const generatorsDb = (window.SATISFACTORY_DATA && window.SATISFACTORY_DATA.generators) || {};
  const logisticsDb = (window.SATISFACTORY_DATA && window.SATISFACTORY_DATA.logistics) || {};
  const recipesDb = (window.SATISFACTORY_DATA && window.SATISFACTORY_DATA.recipes) || {};

  const filterItem = st.filterItemId ? itemsDb[st.filterItemId] : null;
  const isFilterFluid = Boolean(filterItem && filterItem.isFluid);

  const showLogistics = qf === 'all' || qf === 'logistica' || qf === 'armazenamento' || qf === 'logistica_armazenamento';
  const logistics = showLogistics ? Object.values(logisticsDb).filter((l) => {
    if (filterItem && l.isFluid !== isFilterFluid) return false;
    if (qf === 'logistica' && l.category !== 'Esteiras' && l.category !== 'Tubulações') return false;
    if (qf === 'armazenamento' && l.category !== 'Armazenamento' && l.category !== 'Destinos Finais') return false;
    if (!q) return true;
    return normAmText(`${l.name || ''} ${l.nameEn || ''} ${l.category || ''}`).includes(q);
  }) : [];

  // Todas as máquinas de produção do jogo (Fornalha, Construtor, Montadora, Refinaria, Fabricante, Misturador, etc.)
  const showMachines = qf === 'all' || qf === 'maquinas';
  const machines = showMachines ? Object.values(machinesDb).filter((m) => {
    if (!m || !m.id) return false;
    if (filterItem) {
      const mRecs = Object.values(recipesDb).filter((r) => r && r.machine === m.id && !r.isFicsmas);
      const accepts = mRecs.some((r) => (r.ingredients || []).some((ing) => ing.item === filterItem.id));
      if (!accepts) return false;
    }
    if (!q) return true;
    return normAmText(`${m.name || ''} ${m.nameEn || ''}`).includes(q);
  }).sort((a, b) => {
    if (window.DS?.getMachineProgressionRank) {
      const diff = DS.getMachineProgressionRank(a) - DS.getMachineProgressionRank(b);
      if (diff !== 0) return diff;
    }
    return (a.name || '').localeCompare(b.name || '', 'pt-BR');
  }) : [];

  const showExtractors = !filterItem && (qf === 'all' || qf === 'maquinas');
  const extractors = showExtractors ? Object.values(extractorsDb).filter((ex) => {
    if (!q) return true;
    return normAmText(`${ex.name || ''} ${ex.nameEn || ''}`).includes(q);
  }).sort((a, b) => {
    if (window.DS?.getMachineProgressionRank) {
      const diff = DS.getMachineProgressionRank(a) - DS.getMachineProgressionRank(b);
      if (diff !== 0) return diff;
    }
    return (a.name || '').localeCompare(b.name || '', 'pt-BR');
  }) : [];

  const showGenerators = qf === 'all' || qf === 'energia';
  const generators = showGenerators ? Object.values(generatorsDb).filter((g) => {
    if (filterItem) {
      const acceptsFuel = (g.fuels || []).some((f) => f.item === filterItem.id);
      const acceptsWater = filterItem.id === 'Desc_Water_C' && (g.waterPerMin || 0) > 0;
      if (!acceptsFuel && !acceptsWater) return false;
    }
    if (!q) return true;
    const fuelsText = (g.fuels || []).map((f) => {
      const it = itemsDb[f.item];
      return it ? `${it.name || ''} ${it.nameEn || ''}` : '';
    }).join(' ');
    return normAmText(`${g.name || ''} ${g.nameEn || ''} ${fuelsText}`).includes(q);
  }).sort((a, b) => {
    if (window.DS?.getMachineProgressionRank) {
      const diff = DS.getMachineProgressionRank(a) - DS.getMachineProgressionRank(b);
      if (diff !== 0) return diff;
    }
    return (a.name || '').localeCompare(b.name || '', 'pt-BR');
  }) : [];

  // Receitas (padrão + alternativas ALT unificadas) — exclusivas em 'receitas' ou quando buscando em 'all'
  const showRecipes = qf === 'receitas' || (qf === 'all' && (Boolean(q) || Boolean(filterItem)));
  const recipes = showRecipes ? Object.values(recipesDb).filter((r) => {
    if (!r || !r.machine || !machinesDb[r.machine]) return false;
    if (r.isFicsmas && !q) return false;
    if (st.filterItemId) {
      const accepts = (r.ingredients || []).some((ing) => ing.item === st.filterItemId);
      if (!accepts) return false;
    }
    if (!q) return true;
    const mObj = machinesDb[r.machine];
    const mName = `${mObj?.name || ''} ${mObj?.nameEn || ''}`;
    const rName = `${r.cleanName || r.name || ''} ${r.nameEn || ''}`;
    const ioNames = [...(r.ingredients || []), ...(r.products || [])]
      .map((x) => {
        const it = itemsDb[x.item];
        return it ? `${it.name || ''} ${it.nameEn || ''}` : '';
      })
      .join(' ');
    return normAmText(`${rName} ${mName} ${ioNames}`).includes(q);
  }).sort((a, b) => {
    if (Boolean(a.isAlternate) !== Boolean(b.isAlternate)) return a.isAlternate ? 1 : -1;
    return (a.cleanName || a.name).localeCompare(b.cleanName || b.name, 'pt-BR');
  }) : [];

  return { logistics, machines, extractors, generators, recipes, filterItem };
}

function pickMachineFromModal(machineId) {
  const st = FactoryUIState.addMachineModal;
  const pos = st.worldPos || {};
  const fromNodeId = st.fromNodeId;
  const filterItemId = st.filterItemId;
  closeAddMachineModal();
  if (typeof addFreeBlock !== 'function') return;

  let recipeId = null;
  if (filterItemId && typeof Solver !== 'undefined') {
    const mRecs = Solver.getRecipesByMachine(machineId).filter((r) => !r.isFicsmas);
    const compat = mRecs.find((r) => (r.ingredients || []).some((i) => i.item === filterItemId));
    if (compat) recipeId = compat.id;
  }
  addFreeBlock('machine', {
    machineId,
    recipeId: recipeId || undefined,
    x: pos.x,
    y: pos.y,
    connectFromNodeId: fromNodeId || undefined,
    itemId: filterItemId || undefined
  });
}

function pickExtractorFromModal(exId) {
  const st = FactoryUIState.addMachineModal;
  const pos = st.worldPos || {};
  closeAddMachineModal();
  if (typeof addFreeBlock !== 'function') return;
  let itemId = 'Desc_OreIron_C';
  let minerMark = 'mk1';
  if (exId === 'Build_MinerMk2_C') minerMark = 'mk2';
  else if (exId === 'Build_MinerMk3_C') minerMark = 'mk3';
  else if (exId === 'Build_OilPump_C') itemId = 'Desc_LiquidOil_C';
  else if (exId === 'Build_WaterPump_C') itemId = 'Desc_Water_C';
  else if (exId === 'Build_FrackingExtractor_C') itemId = 'Desc_NitrogenGas_C';
  addFreeBlock('extractor', { itemId, minerMark, x: pos.x, y: pos.y });
}

function pickGeneratorFromModal(genId) {
  const st = FactoryUIState.addMachineModal;
  const pos = st.worldPos || {};
  const fromNodeId = st.fromNodeId;
  const filterItemId = st.filterItemId;
  closeAddMachineModal();
  if (typeof addFreeBlock !== 'function') return;
  const g = window.SATISFACTORY_DATA?.generators?.[genId];
  const fuelItemId = (filterItemId && (g?.fuels || []).some((f) => f.item === filterItemId))
    ? filterItemId
    : (g?.fuels?.[0]?.item || null);
  addFreeBlock('generator', {
    generatorId: genId,
    fuelItemId,
    x: pos.x,
    y: pos.y,
    connectFromNodeId: fromNodeId || undefined,
    itemId: filterItemId || undefined
  });
}

function pickLogisticsFromModal(logisticsId) {
  const st = FactoryUIState.addMachineModal;
  const logObj = window.SATISFACTORY_DATA?.logistics?.[logisticsId];
  if (!logObj) return;
  const pos = st.worldPos || {};
  const fromNodeId = st.fromNodeId;
  const filterItemId = st.filterItemId;
  closeAddMachineModal();

  if (typeof addFreeBlock === 'function') {
    addFreeBlock(logObj.kind, {
      logisticsId: logObj.id,
      x: pos.x,
      y: pos.y,
      connectFromNodeId: fromNodeId || undefined,
      itemId: filterItemId || undefined
    });
  }
}

function pickRecipeFromModal(recipeId) {
  const st = FactoryUIState.addMachineModal;
  const pos = st.worldPos || {};
  const fromNodeId = st.fromNodeId;
  const filterItemId = st.filterItemId;
  closeAddMachineModal();

  if (typeof addFreeBlock === 'function') {
    addFreeBlock('machine', {
      recipeId,
      x: pos.x,
      y: pos.y,
      connectFromNodeId: fromNodeId || undefined,
      itemId: filterItemId || undefined
    });
  }
}

function handleAddMachineSearchInput(val) {
  FactoryUIState.addMachineModal.search = val;
  FactoryUIState.addMachineModal.activeIndex = -1;
  renderAddMachineModalResultsOnly();
}

function renderAddMachineModalBody() {
  const body = document.getElementById('add-machine-body');
  if (!body) return;
  const st = FactoryUIState.addMachineModal;

  // Cria o esqueleto com o input uma única vez para NUNCA perder o foco ao digitar
  if (!document.getElementById('am-search-input')) {
    body.innerHTML = `
      <div class="ds-modal-toolbar">
        <input
          id="am-search-input"
          type="text"
          class="ds-modal-search"
          value="${escSummary(st.search)}"
          placeholder="Buscar receita, item, máquina ou construção..."
          autocomplete="off"
          oninput="handleAddMachineSearchInput(this.value)"
        />
        <div id="am-filters-slot"></div>
      </div>
      <div id="am-results-slot" class="ds-modal-scroll"></div>
    `;
  } else {
    const inp = document.getElementById('am-search-input');
    if (inp && inp.value !== st.search) inp.value = st.search;
  }

  renderAddMachineModalResultsOnly();
}

function setAddMachineRecipeSubFilter(key) {
  FactoryUIState.addMachineModal.recipeSubFilter = key || 'all';
  FactoryUIState.addMachineModal.activeIndex = -1;
  renderAddMachineModalResultsOnly();
}

function renderAddMachineModalResultsOnly() {
  const filtersSlot = document.getElementById('am-filters-slot');
  const resultsSlot = document.getElementById('am-results-slot');
  if (!filtersSlot || !resultsSlot) return;

  const st = FactoryUIState.addMachineModal;
  const itemsDb = (window.SATISFACTORY_DATA && window.SATISFACTORY_DATA.items) || {};
  const machinesDb = (window.SATISFACTORY_DATA && window.SATISFACTORY_DATA.machines) || {};
  const { logistics, machines, extractors, generators, recipes: allFilteredRecipes, filterItem } = getFilteredAddMachineOptions();

  // Subfiltro para Receitas (Todas / Padrão / Alternativas / Categorias)
  const rSub = st.recipeSubFilter || 'all';
  const showRecipeSubFilters = (st.quickFilter === 'receitas' || (st.quickFilter === 'all' && allFilteredRecipes.length > 12));
  const recipes = showRecipeSubFilters && rSub !== 'all'
    ? allFilteredRecipes.filter((r) => {
        if (rSub === 'standard') return !r.isAlternate;
        if (rSub === 'alternate') return Boolean(r.isAlternate);
        const mainProd = r.products?.[0] ? itemsDb[r.products[0].item] : null;
        return (mainProd?.category || 'Outros') === rSub;
      })
    : allFilteredRecipes;

  const totalActions = machines.length + extractors.length + logistics.length + generators.length + Math.min(120, recipes.length);
  if (st.activeIndex >= totalActions) st.activeIndex = -1;

  const titleEl = document.getElementById('add-machine-title');
  if (titleEl) {
    const shownCount = machines.length + extractors.length + logistics.length + generators.length + recipes.length;
    titleEl.textContent = `Adicionar Máquina (${shownCount})`;
  }

  const quickFilters = [
    { key: 'all', label: 'Todos' },
    { key: 'maquinas', label: 'Máquinas' },
    { key: 'receitas', label: 'Receitas' },
    { key: 'logistica_armazenamento', label: 'Logística & Armazenamento' },
    { key: 'energia', label: 'Energia' }
  ];

  const quickFiltersHtml = window.DS ? DS.filterChips({
    chips: quickFilters,
    activeKey: st.quickFilter || 'all',
    onSelectExpr: 'setAddMachineQuickFilter(__KEY__)',
    ariaLabel: 'Filtros por categoria'
  }) : '';

  let recipeSubHtml = '';
  if (st.quickFilter === 'receitas' && window.DS) {
    const recCatSet = new Set();
    allFilteredRecipes.forEach(r => {
      const mp = r.products?.[0] ? itemsDb[r.products[0].item] : null;
      if (mp?.category) recCatSet.add(mp.category);
    });
    const orderMap = (typeof LIB_PROGRESSION_ORDER !== 'undefined') ? LIB_PROGRESSION_ORDER : {};
    const orderedCats = Array.from(recCatSet).sort((a, b) => (orderMap[a] || 50) - (orderMap[b] || 50) || a.localeCompare(b, 'pt-BR'));
    const subChips = [
      { key: 'all', label: 'Todas', count: allFilteredRecipes.length },
      { key: 'standard', label: 'Padrão', count: allFilteredRecipes.filter(r => !r.isAlternate).length },
      { key: 'alternate', label: 'ALT', count: allFilteredRecipes.filter(r => r.isAlternate).length },
      ...orderedCats.map(c => ({ key: c, label: c === 'Quântico & Alienígena' ? 'Material Alienígena' : c }))
    ];
    const subFn = window.DS.recipeFilterBox || window.DS.filterChips;
    recipeSubHtml = subFn({
      chips: subChips,
      activeKey: rSub,
      onSelectExpr: 'setAddMachineRecipeSubFilter(__KEY__)',
      ariaLabel: 'Filtrar receitas por categoria'
    });
  }

  const filterChipHtml = filterItem ? `
    <div class="am-filter-chip" style="margin-top:8px;">
      ${typeof renderEntityIcon === 'function' ? renderEntityIcon(filterItem, 18) : ''}
      <span>Conectando: ${escSummary(filterItem.name)}</span>
    </div>
  ` : '';

  filtersSlot.innerHTML = quickFiltersHtml + recipeSubHtml + filterChipHtml;

  let cursor = 0;
  const renderIcon44 = (entity, fallback) => {
    if (typeof renderEntityIcon === 'function') return renderEntityIcon(entity, 44);
    if (entity && entity.wikiImage) return `<img src="${entity.wikiImage}" alt="${escSummary(entity.name)}" width="44" height="44" loading="lazy" />`;
    return `<span>${fallback}</span>`;
  };

  const machinesHtml = machines.length > 0 ? `
    <div class="ds-modal-group" style="--grp-color:#6366F1;">
      ${DS.modalGroupHeader({ title: 'Máquinas de Produção', count: machines.length })}
      <div class="ds-modal-list">
        ${machines.map((m) => {
          const idx = cursor++;
          const mw = m.basePowerMw ?? m.powerConsumption ?? m.powerMw ?? 0;
          const sub = mw ? `⚡ ${mw} MW` : '';
          const prodsStrip = window.DS?.renderMachineProducedItemsHtml ? DS.renderMachineProducedItemsHtml(m, 10) : '';
          return `
            <button
              type="button"
              class="ds-refb-card ${idx === st.activeIndex ? 'is-selected' : ''}"
              onclick="pickMachineFromModal('${m.id}')"
            >
              <span class="ds-refb-icon">${renderIcon44(m, '🏭')}</span>
              <span class="ds-refb-body">
                <span class="ds-refb-top">
                  <span class="ds-refb-title">${escSummary(m.name)}</span>
                  <span class="ds-refb-meta">${sub}</span>
                </span>
                ${prodsStrip}
              </span>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const extractorsHtml = extractors.length > 0 ? `
    <div class="ds-modal-group" style="--grp-color:#14B8A6;">
      ${DS.modalGroupHeader({ title: 'Extratores e Mineradoras', count: extractors.length })}
      <div class="ds-modal-list">
        ${extractors.map((ex) => {
          const idx = cursor++;
          const mw = ex.basePowerMw ?? ex.powerConsumption ?? ex.powerMw ?? 0;
          const rateTxt = ex.baseRatePerMin ? `${ex.baseRatePerMin}${ex.isFluid ? ' m³' : ''}/min · ` : '';
          const sub = `${rateTxt}${mw ? `⚡ ${mw} MW` : ''}`;
          const prodsStrip = window.DS?.renderMachineProducedItemsHtml ? DS.renderMachineProducedItemsHtml(ex, 10) : '';
          return `
            <button
              type="button"
              class="ds-refb-card ${idx === st.activeIndex ? 'is-selected' : ''}"
              onclick="pickExtractorFromModal('${ex.id}')"
            >
              <span class="ds-refb-icon">${renderIcon44(ex, '⛏️')}</span>
              <span class="ds-refb-body">
                <span class="ds-refb-top">
                  <span class="ds-refb-title">${escSummary(ex.name)}</span>
                  <span class="ds-refb-meta">${sub}</span>
                </span>
                ${prodsStrip}
              </span>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  // Agrupa logística por subcategoria (Esteiras & Elevadores, Tubulações, Armazenamento, Destinos Finais)
  const logGroupsMap = new Map();
  logistics.forEach(l => {
    const cat = l.kind === 'conveyor_lift' ? 'Elevadores de Esteira' : (l.category || 'Logística');
    if (!logGroupsMap.has(cat)) logGroupsMap.set(cat, []);
    logGroupsMap.get(cat).push(l);
  });
  const logCatColors = { 'Logística': '#0EA5E9', 'Elevadores de Esteira': '#14B8A6', 'Tubulações': '#0284C7', 'Armazenamento': '#CA8A04', 'Destinos Finais': '#E11D48' };
  const logisticsHtml = Array.from(logGroupsMap.entries()).map(([cat, list]) => `
    <div class="ds-modal-group" style="--grp-color:${logCatColors[cat] || '#0EA5E9'};">
      ${DS.modalGroupHeader({ title: cat, count: list.length })}
      <div class="ds-modal-list">
        ${list.map((l) => {
          const idx = cursor++;
          let metaTxt = '';
          if (l.ratePerMin) metaTxt = `${l.ratePerMin} ${l.isFluid ? 'm³' : 'itens'}/min`;
          else if (l.kind === 'storage_mk1') metaTxt = '24 espaços';
          else if (l.kind === 'storage_mk2') metaTxt = '48 espaços';
          else if (l.kind === 'fluid_buffer_mk1') metaTxt = '400 m³';
          else if (l.kind === 'fluid_buffer_mk2') metaTxt = '2.400 m³';
          else if (l.kind === 'pipe_pump_mk1') metaTxt = '20 m · ⚡ 4 MW';
          else if (l.kind === 'pipe_pump_mk2') metaTxt = '50 m · ⚡ 8 MW';
          else if (l.powerMw) metaTxt = `⚡ ${l.powerMw} MW`;
          else metaTxt = `${l.inPorts || 0} ent. → ${l.outPorts || 0} saí.`;
          return `
            <button
              type="button"
              class="ds-refb-card ${idx === st.activeIndex ? 'is-selected' : ''}"
              onclick="pickLogisticsFromModal('${l.id}')"
            >
              <span class="ds-refb-icon">${renderIcon44(l, '📦')}</span>
              <span class="ds-refb-body">
                <span class="ds-refb-top">
                  <span class="ds-refb-title">${escSummary(l.name)}</span>
                  <span class="ds-refb-meta">${metaTxt}</span>
                </span>
              </span>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');

  // Geradores de Energia: mostra potência base REAL + combustíveis/água que consome!
  const generatorsHtml = generators.length > 0 ? `
    <div class="ds-modal-group" style="--grp-color:#10B981;">
      ${DS.modalGroupHeader({ title: 'Geradores de Energia', count: generators.length })}
      <div class="ds-modal-list">
        ${generators.map((g) => {
          const idx = cursor++;
          const mw = g.powerProductionMw ?? g.powerProduction ?? g.basePowerMw ?? 0;
          const sub = mw > 0 ? `⚡ ${mw} MW base` : 'Energia';
          const fuelPills = (g.fuels || []).slice(0, 6).map((f) => {
            const fItem = itemsDb[f.item || f.itemId];
            if (!fItem) return '';
            const ico = typeof renderEntityIcon === 'function' ? renderEntityIcon(fItem, 16) : '';
            return `<span class="ds-mach-prod-ico" title="${escSummary(fItem.name)}">${ico}</span>`;
          }).join('');
          const waterObj = itemsDb['Desc_Water_C'];
          const waterPill = (g.waterPerMin > 0 && waterObj)
            ? `<span class="ds-mach-prod-ico" title="Água (${g.waterPerMin} m³/min)">${typeof renderEntityIcon === 'function' ? renderEntityIcon(waterObj, 16) : ''}</span>`
            : '';
          const fuelsStrip = (fuelPills || waterPill)
            ? `<span class="ds-mach-prods-strip"><span class="ds-mach-prods-lbl">Consome:</span>${fuelPills}${waterPill}</span>`
            : '';
          return `
            <button
              type="button"
              class="ds-refb-card ${idx === st.activeIndex ? 'is-selected' : ''}"
              onclick="pickGeneratorFromModal('${g.id}')"
            >
              <span class="ds-refb-icon">${renderIcon44(g, '⚡')}</span>
              <span class="ds-refb-body">
                <span class="ds-refb-top">
                  <span class="ds-refb-title">${escSummary(g.name)}</span>
                  <span class="ds-refb-meta">${sub}</span>
                </span>
                ${fuelsStrip}
              </span>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  // Agrupa Receitas por categoria do item produzido, sem MW e com a máquina no canto inferior direito!
  const recGroupsMap = new Map();
  recipes.slice(0, 120).forEach((r) => {
    const mainProd = r.products?.[0] ? itemsDb[r.products[0].item] : null;
    const rawCat = mainProd?.category || 'Outros';
    const catLabel = rawCat === 'Quântico & Alienígena' ? 'Material Alienígena' : rawCat;
    if (!recGroupsMap.has(catLabel)) recGroupsMap.set(catLabel, { rawCat, list: [] });
    recGroupsMap.get(catLabel).list.push(r);
  });
  const catOrder = (typeof LIB_PROGRESSION_ORDER !== 'undefined') ? LIB_PROGRESSION_ORDER : {};
  const catColors = (typeof LIB_CATEGORY_COLORS !== 'undefined') ? LIB_CATEGORY_COLORS : {};
  const orderedRecGroups = Array.from(recGroupsMap.entries()).sort((a, b) =>
    (catOrder[a[1].rawCat] || 50) - (catOrder[b[1].rawCat] || 50) || a[0].localeCompare(b[0], 'pt-BR')
  );

  const recipesHtml = orderedRecGroups.length > 0 ? orderedRecGroups.map(([catLabel, { rawCat, list }]) => `
    <div class="ds-modal-group" style="--grp-color:${catColors[rawCat] || '#2563EB'};">
      ${DS.modalGroupHeader({ title: `Receitas · ${catLabel}`, count: list.length })}
      <div class="ds-modal-list">
        ${list.map((r) => {
          const idx = cursor++;
          const mObj = machinesDb[r.machine];
          const mainProd = r.products?.[0] ? itemsDb[r.products[0].item] : null;
          const ingsHtml = (r.ingredients || []).map((i) => {
            const it = itemsDb[i.item];
            const ico = it && typeof renderEntityIcon === 'function' ? renderEntityIcon(it, 17) : '';
            const rate = typeof fmt === 'function' ? fmt(i.ratePerMin, 1) : i.ratePerMin;
            return `<span class="rp-io-pill">${ico} ${rate}/min</span>`;
          }).join('');
          const prodsHtml = (r.products || []).map((p) => {
            const it = itemsDb[p.item];
            const ico = it && typeof renderEntityIcon === 'function' ? renderEntityIcon(it, 17) : '';
            const rate = typeof fmt === 'function' ? fmt(p.ratePerMin, 1) : p.ratePerMin;
            return `<span class="rp-io-pill out">${ico} ${rate}/min</span>`;
          }).join('');
          return `
            <button
              type="button"
              class="ds-refb-card ds-refb-recipe-card ${idx === st.activeIndex ? 'is-selected' : ''}"
              onclick="pickRecipeFromModal('${r.id}')"
            >
              <span class="ds-refb-icon">${renderIcon44(mainProd || mObj, '📜')}</span>
              <span class="ds-refb-body">
                <span class="ds-refb-top">
                  <span class="ds-refb-title">${r.isAlternate ? '<span class="ds-refb-alt">ALT</span>' : ''}${escSummary(r.cleanName || r.name)}</span>
                </span>
                <span class="ds-refb-flow">
                  <span class="rp-opt-side">${ingsHtml}</span>
                  <span class="rp-arrow">→</span>
                  <span class="rp-opt-side">${prodsHtml}</span>
                </span>
                ${mObj ? `<span class="ds-refb-foot">${typeof renderEntityIcon === 'function' ? renderEntityIcon(mObj, 15) : ''}<span>${escSummary(mObj.name)}</span></span>` : ''}
              </span>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `).join('') : (machines.length === 0 && logistics.length === 0 && extractors.length === 0 && generators.length === 0
    ? DS.emptyState('Nenhum item encontrado para este filtro.')
    : '');

  resultsSlot.innerHTML = `
    ${machinesHtml}
    ${extractorsHtml}
    ${logisticsHtml}
    ${generatorsHtml}
    ${recipesHtml}
  `;
}

// Teclado no modal Adicionar Máquina (Setas, Enter, ESC)
document.addEventListener('keydown', (e) => {
  const st = FactoryUIState.addMachineModal;
  if (!st.isOpen) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    closeAddMachineModal();
    return;
  }
  const { machines, extractors, logistics, generators, recipes } = getFilteredAddMachineOptions();
  const total = machines.length + extractors.length + logistics.length + generators.length + Math.min(80, recipes.length);
  if (total === 0) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    st.activeIndex = st.activeIndex < 0 ? 0 : (st.activeIndex + 1) % total;
    renderAddMachineModalResultsOnly();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    st.activeIndex = st.activeIndex <= 0 ? total - 1 : st.activeIndex - 1;
    renderAddMachineModalResultsOnly();
  } else if (e.key === 'Enter') {
    if (st.activeIndex < 0) return;
    e.preventDefault();
    let idx = st.activeIndex;
    if (idx < machines.length) { pickMachineFromModal(machines[idx].id); return; }
    idx -= machines.length;
    if (idx < extractors.length) { pickExtractorFromModal(extractors[idx].id); return; }
    idx -= extractors.length;
    if (idx < logistics.length) { pickLogisticsFromModal(logistics[idx].id); return; }
    idx -= logistics.length;
    if (idx < generators.length) { pickGeneratorFromModal(generators[idx].id); return; }
    idx -= generators.length;
    const r = recipes[idx];
    if (r) pickRecipeFromModal(r.id);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  applyCompactCardModeUI();
});
