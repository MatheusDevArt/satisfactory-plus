/* ============================================================================
 * MELHORIAS DE PRODUÇÃO, RESUMO DA FÁBRICA, MODAL ADICIONAR MÁQUINA,
 * LOGÍSTICA OFICIAL (CL-517554) E MODO DE CARD COMPACTO
 * ========================================================================== */

const FactoryUIState = {
  compactCards: false,
  powerMarginPercent: 10,
  showOtherGenerators: false,
  collapsedSections: {
    materiais: true
  },
  addMachineModal: {
    isOpen: false,
    search: '',
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
    btn.textContent = FactoryUIState.compactCards ? '🧩 Compacto: SIM' : '🧩 Compacto: NÃO';
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

function toggleSummarySection(secId) {
  FactoryUIState.collapsedSections[secId] = !FactoryUIState.collapsedSections[secId];
  if (typeof renderSidebarActionSection === 'function') renderSidebarActionSection();
}

function setSummaryPowerMargin(val) {
  const num = Math.max(0, Math.min(200, Number(val) || 0));
  FactoryUIState.powerMarginPercent = num;
  if (typeof renderSidebarActionSection === 'function') renderSidebarActionSection();
}

function toggleOtherGeneratorsList() {
  FactoryUIState.showOtherGenerators = !FactoryUIState.showOtherGenerators;
  if (typeof renderSidebarActionSection === 'function') renderSidebarActionSection();
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
    <div class="fs-row"><span>Consumo</span><strong class="${powerConsumed > 0 ? 'fs-neg' : ''}">-${fmt(powerConsumed, 1)} MW</strong></div>
    <div class="fs-row"><span>Geração</span><strong class="${powerGenerated > 0 ? 'fs-pos' : ''}">+${fmt(powerGenerated, 1)} MW</strong></div>
    <div class="fs-row"><span>Balanço</span><strong class="${balanceMw >= 0 ? 'fs-pos' : 'fs-neg'}">${balanceMw >= 0 ? '+' : ''}${fmt(balanceMw, 1)} MW</strong></div>
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

  return `
    <div class="fs-panel">
      ${renderSummarySectionHtml('visao', 'Visão geral', overviewBody)}
      ${renderSummarySectionHtml('energia', 'Energia', energyBody)}
      ${renderSummarySectionHtml('entradas', `Entradas (${inputsMap.size})`, inputsBody)}
      ${renderSummarySectionHtml('saidas', `Saídas (${outputsMap.size})`, outputsBody)}
      ${missingMap.size > 0 ? renderSummarySectionHtml('faltando', `Não produzido (${missingMap.size})`, missingBody) : ''}
      ${renderSummarySectionHtml('excesso', `Excesso (${excessList.length})`, excessBody)}
      ${renderSummarySectionHtml('construcoes', `Construções (${totalBuildings})`, buildingsBody)}
      ${renderSummarySectionHtml('materiais', `Materiais usados (${materialsMap.size})`, materialsBody)}
    </div>
  `;
}

/* ============================================================================
 * MODAL COMPLETO "ADICIONAR MÁQUINA" (MODO LIVRE)
 * ========================================================================== */

function openAddMachineModal(options = {}) {
  const st = FactoryUIState.addMachineModal;
  st.isOpen = true;
  st.search = '';
  st.filterItemId = options.filterItemId || null;
  st.fromNodeId = options.fromNodeId || null;
  st.worldPos = options.worldPos || null;
  st.activeIndex = 0;

  const modal = document.getElementById('add-machine-modal');
  if (modal) modal.classList.remove('hidden');
  renderAddMachineModalBody();
  setTimeout(() => {
    const inp = document.getElementById('am-search-input');
    if (inp) inp.focus();
  }, 40);
}

function closeAddMachineModal() {
  FactoryUIState.addMachineModal.isOpen = false;
  const modal = document.getElementById('add-machine-modal');
  if (modal) modal.classList.add('hidden');
}

function getFilteredAddMachineOptions() {
  const st = FactoryUIState.addMachineModal;
  const q = (st.search || '').trim().toLowerCase();
  const itemsDb = (window.SATISFACTORY_DATA && window.SATISFACTORY_DATA.items) || {};
  const machinesDb = (window.SATISFACTORY_DATA && window.SATISFACTORY_DATA.machines) || {};
  const logisticsDb = (window.SATISFACTORY_DATA && window.SATISFACTORY_DATA.logistics) || {};
  const recipesDb = (window.SATISFACTORY_DATA && window.SATISFACTORY_DATA.recipes) || {};

  const filterItem = st.filterItemId ? itemsDb[st.filterItemId] : null;
  const isFilterFluid = Boolean(filterItem && filterItem.isFluid);

  const logistics = Object.values(logisticsDb).filter((l) => {
    if (filterItem && l.isFluid !== isFilterFluid) return false;
    if (!q) return true;
    return (l.name || '').toLowerCase().includes(q) || (l.category || '').toLowerCase().includes(q);
  });

  const recipes = Object.values(recipesDb).filter((r) => {
    if (!r || !r.machine || !machinesDb[r.machine]) return false;
    if (st.filterItemId) {
      const accepts = (r.ingredients || []).some((ing) => ing.item === st.filterItemId);
      if (!accepts) return false;
    }
    if (!q) return true;
    const mName = (machinesDb[r.machine]?.name || '').toLowerCase();
    const rName = (r.cleanName || r.name || '').toLowerCase();
    const ioNames = [...(r.ingredients || []), ...(r.products || [])]
      .map((x) => (itemsDb[x.item]?.name || '').toLowerCase())
      .join(' ');
    return rName.includes(q) || mName.includes(q) || ioNames.includes(q);
  }).sort((a, b) => {
    if (Boolean(a.isAlternate) !== Boolean(b.isAlternate)) return a.isAlternate ? 1 : -1;
    return (a.cleanName || a.name).localeCompare(b.cleanName || b.name, 'pt-BR');
  });

  return { logistics, recipes, filterItem };
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

function renderAddMachineModalBody() {
  const body = document.getElementById('add-machine-body');
  if (!body) return;
  const st = FactoryUIState.addMachineModal;
  const itemsDb = (window.SATISFACTORY_DATA && window.SATISFACTORY_DATA.items) || {};
  const machinesDb = (window.SATISFACTORY_DATA && window.SATISFACTORY_DATA.machines) || {};
  const { logistics, recipes, filterItem } = getFilteredAddMachineOptions();

  const totalActions = logistics.length + recipes.length;
  if (st.activeIndex >= totalActions) st.activeIndex = Math.max(0, totalActions - 1);

  const filterChipHtml = filterItem ? `
    <div class="am-filter-chip">
      ${typeof renderEntityIcon === 'function' ? renderEntityIcon(filterItem, 18) : ''}
      <span>Conectando: ${escSummary(filterItem.name)}</span>
    </div>
  ` : '';

  const logisticsHtml = logistics.length > 0 ? `
    <div class="am-section-title">Logística e Armazenamento</div>
    <div class="am-logistics-grid">
      ${logistics.map((l, idx) => `
        <button
          type="button"
          class="am-log-btn ${idx === st.activeIndex ? 'is-active' : ''}"
          onclick="pickLogisticsFromModal('${l.id}')"
        >
          ${l.wikiImage ? `<img src="${l.wikiImage}" alt="${escSummary(l.name)}" loading="lazy" />` : '<span>📦</span>'}
          <span>${escSummary(l.name)}</span>
        </button>
      `).join('')}
    </div>
  ` : '';

  const recipesHtml = recipes.length > 0 ? `
    <div class="am-section-title">Receitas (${recipes.length})</div>
    <div class="am-recipes-list">
      ${recipes.slice(0, 60).map((r, rIdx) => {
        const globalIdx = logistics.length + rIdx;
        const mObj = machinesDb[r.machine];
        const mainProd = r.products?.[0] ? itemsDb[r.products[0].item] : null;
        const ingIcons = (r.ingredients || []).map((i) => {
          const it = itemsDb[i.item];
          return it && typeof renderEntityIcon === 'function' ? renderEntityIcon(it, 18) : '';
        }).join('');
        const prodIcons = (r.products || []).map((p) => {
          const it = itemsDb[p.item];
          return it && typeof renderEntityIcon === 'function' ? renderEntityIcon(it, 18) : '';
        }).join('');
        return `
          <button
            type="button"
            class="am-recipe-row ${globalIdx === st.activeIndex ? 'is-active' : ''}"
            onclick="pickRecipeFromModal('${r.id}')"
          >
            <div class="am-recipe-left">
              ${mainProd && typeof renderEntityIcon === 'function' ? renderEntityIcon(mainProd, 28) : ''}
              <div class="am-recipe-meta">
                <span class="am-recipe-name">
                  ${escSummary(r.cleanName || r.name)}
                  ${r.isAlternate ? '<span class="am-alt-badge">ALT</span>' : ''}
                </span>
                <span class="am-recipe-sub">${escSummary(mObj?.name || '')}</span>
              </div>
            </div>
            <div class="am-recipe-io">${ingIcons} <span>→</span> ${prodIcons}</div>
          </button>
        `;
      }).join('')}
    </div>
  ` : '<div class="picker-empty">Nenhuma receita compatível encontrada.</div>';

  body.innerHTML = `
    <input
      id="am-search-input"
      type="text"
      class="am-search-input"
      value="${escSummary(st.search)}"
      placeholder="Buscar receita, item ou construção..."
      oninput="FactoryUIState.addMachineModal.search = this.value; FactoryUIState.addMachineModal.activeIndex = 0; renderAddMachineModalBody();"
    />
    ${filterChipHtml}
    ${logisticsHtml}
    ${recipesHtml}
    <div class="am-footer">
      <span>${recipes.length} receita(s) · ${logistics.length} logística</span>
      <button type="button" class="btn-tutorial-nav" onclick="closeAddMachineModal()">Cancelar</button>
    </div>
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
  const { logistics, recipes } = getFilteredAddMachineOptions();
  const total = logistics.length + Math.min(60, recipes.length);
  if (total === 0) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    st.activeIndex = (st.activeIndex + 1) % total;
    renderAddMachineModalBody();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    st.activeIndex = (st.activeIndex - 1 + total) % total;
    renderAddMachineModalBody();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (st.activeIndex < logistics.length) {
      pickLogisticsFromModal(logistics[st.activeIndex].id);
    } else {
      const r = recipes[st.activeIndex - logistics.length];
      if (r) pickRecipeFromModal(r.id);
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  applyCompactCardModeUI();
});
