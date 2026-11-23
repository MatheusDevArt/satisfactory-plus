/* ============================================================================
 * SATISFACTORY+ — SHARED DESIGN SYSTEM (PART 0)
 * Componentes reutilizáveis: SectionCard, ListRow, ModalPicker, FilterChips.
 * Cor primária única: #EA580C (sem outros tons de laranja, sem glow laranja).
 * ========================================================================== */

(function (global) {
  'use strict';

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * 1. SectionCard: container com chip laranja (#EA580C) + título + conteúdo.
   */
  function sectionCard({
    id = '',
    chip = '',
    title = '',
    count = null,
    actionsHtml = '',
    bodyHtml = '',
    extraClass = ''
  } = {}) {
    const idAttr = id ? ` id="${esc(id)}"` : '';
    const chipHtml = chip ? `<span class="ds-chip-label">${esc(chip)}</span>` : '';
    const countHtml = count !== null && count !== undefined
      ? `<span class="ds-section-count">${esc(count)}</span>`
      : '';
    const actionsWrap = actionsHtml
      ? `<div class="ds-section-actions">${actionsHtml}</div>`
      : '';
    const headerHtml = (chip || title || actionsHtml || countHtml)
      ? `<div class="ds-section-header">
           <div class="ds-section-heading">
             ${chipHtml}
             ${title ? `<h4 class="ds-section-title">${esc(title)}</h4>` : ''}
             ${countHtml}
           </div>
           ${actionsWrap}
         </div>`
      : '';
    return `
      <section${idAttr} class="ds-section-card ${extraClass}">
        ${headerHtml}
        <div class="ds-section-body">${bodyHtml}</div>
      </section>
    `;
  }

  /**
   * 2. ListRow: ícone à ESQUERDA, nome em negrito, info secundária abaixo ou à direita.
   * Estados: hover neutro, selecionado com preenchimento sólido #EA580C e texto branco.
   */
  function listRow({
    iconHtml = '',
    title = '',
    subtitle = '',
    badgeHtml = '',
    rightHtml = '',
    selected = false,
    onClick = '',
    extraClass = '',
    attrs = '',
    tag = 'button',
    titleAttr = ''
  } = {}) {
    const isBtn = tag === 'button';
    const typeAttr = isBtn ? ' type="button"' : '';
    const clickAttr = onClick ? ` onclick="${onClick}"` : '';
    const tAttr = titleAttr ? ` title="${esc(titleAttr)}"` : '';
    const selClass = selected ? ' is-selected' : '';
    return `
      <${tag}${typeAttr} class="ds-list-row${selClass} ${extraClass}"${clickAttr}${tAttr}${attrs ? ' ' + attrs : ''}>
        ${iconHtml ? `<span class="ds-list-row-icon">${iconHtml}</span>` : ''}
        <span class="ds-list-row-main">
          <span class="ds-list-row-title">${title}</span>
          ${subtitle ? `<span class="ds-list-row-sub">${subtitle}</span>` : ''}
        </span>
        ${(badgeHtml || rightHtml) ? `<span class="ds-list-row-right">${badgeHtml}${rightHtml}</span>` : ''}
      </${tag}>
    `;
  }

  /**
   * 4. FilterChips: pílulas de filtro, selecionado = preenchimento sólido #EA580C.
   */
  function filterChips({
    chips = [],
    activeKey = '',
    onSelectExpr = '',
    ariaLabel = 'Filtros',
    extraClass = ''
  } = {}) {
    return `
      <div class="ds-filter-chips ${extraClass}" role="tablist" aria-label="${esc(ariaLabel)}">
        ${chips.map((c) => {
          const isActive = c.key === activeKey;
          const safeKey = String(c.key).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          const onclick = onSelectExpr ? onSelectExpr.replace(/__KEY__/g, `'${safeKey}'`) : '';
          const countHtml = c.count !== undefined && c.count !== null
            ? `<span class="ds-chip-count">${esc(c.count)}</span>`
            : '';
          return `
            <button
              type="button"
              role="tab"
              aria-selected="${isActive ? 'true' : 'false'}"
              class="ds-chip${isActive ? ' active' : ''}"
              onclick="${onclick}"
            >${c.icon ? `<span class="ds-chip-ico">${c.icon}</span>` : ''}<span>${esc(c.label)}</span>${countHtml}</button>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * 3. ModalPicker helpers: cabeçalho de grupo com contador e estado vazio.
   */
  function modalGroupHeader({ title = '', count = null, iconHtml = '' } = {}) {
    return `
      <div class="ds-modal-group-header">
        <div class="ds-modal-group-title">
          ${iconHtml ? `<span class="ds-modal-group-ico">${iconHtml}</span>` : ''}
          <span>${esc(title)}</span>
        </div>
        ${count !== null && count !== undefined ? `<span class="ds-modal-group-count">${esc(count)}</span>` : ''}
      </div>
    `;
  }

  function emptyState(text = 'Nenhum item encontrado.') {
    return `<div class="ds-empty-state">${esc(text)}</div>`;
  }

  /**
   * OptionRow (Referência A — lista de categorias da aba Produção):
   * Largura total, arredondada, barra colorida na borda esquerda, bolinha colorida,
   * ícone, nome em negrito e contagem/seta à direita. Selecionado = preenchimento #EA580C.
   */
  function optionRow({
    color = '#2563EB',
    iconHtml = '',
    title = '',
    subtitle = '',
    count = null,
    countAttr = '',
    arrow = false,
    rightHtml = '',
    selected = false,
    onClick = '',
    extraClass = '',
    attrs = '',
    tag = 'button',
    compact = false
  } = {}) {
    const isBtn = tag === 'button';
    const typeAttr = isBtn ? ' type="button"' : '';
    const clickAttr = onClick ? ` onclick="${onClick}"` : '';
    const selClass = selected ? ' is-selected active' : '';
    const cmpClass = compact ? ' is-compact' : '';
    const cntHtml = count !== null && count !== undefined
      ? `<span class="ds-opt-cnt"${countAttr ? ' ' + countAttr : ''}>${esc(count)}</span>`
      : '';
    const arrowHtml = arrow ? `<span class="ds-opt-arrow" aria-hidden="true">›</span>` : '';
    return `
      <${tag}${typeAttr} class="ds-opt-row${selClass}${cmpClass} ${extraClass}" style="--opt-color:${esc(color)};"${clickAttr}${attrs ? ' ' + attrs : ''}>
        <span class="ds-opt-dot" style="background:${esc(color)};"></span>
        ${iconHtml ? `<span class="ds-opt-icon">${iconHtml}</span>` : ''}
        <span class="ds-opt-text">
          <span class="ds-opt-name">${title}</span>
          ${subtitle ? `<span class="ds-opt-sub">${subtitle}</span>` : ''}
        </span>
        ${rightHtml}
        ${cntHtml}
        ${arrowHtml}
      </${tag}>
    `;
  }

  /* --- Item 7: Ordenação por progressão do jogo (básicos primeiro -> avançados por último) --- */
  const CATEGORY_PROGRESSION = {
    'Recursos Primários (Mapa)': 1,
    'Recursos Brutos': 1,
    'Lingotes': 2,
    'Peças & Componentes': 3,
    'Biomassa': 4,
    'Fluidos & Refinaria': 5,
    'Eletrônicos & Motores': 6,
    'Equipamentos': 7,
    'Elevador Espacial': 8,
    'Nuclear': 9,
    'Quântico & Alienígena': 10,
    'Máquinas de Extração': 11,
    'Máquinas de Produção': 12
  };

  function getCategoryProgressionRank(cat) {
    return CATEGORY_PROGRESSION[cat] || 50;
  }

  function getMachineProgressionRank(entity) {
    const id = String(entity?.id || '');
    const n = String(entity?.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    // Extratores
    if (id === 'Build_MinerMk1_C' || n.includes('mineradora v.1')) return 1;
    if (id === 'Build_MinerMk2_C' || n.includes('mineradora v.2')) return 2;
    if (id === 'Build_MinerMk3_C' || n.includes('mineradora v.3')) return 3;
    if (id === 'Build_WaterPump_C' || n.includes('bomba d')) return 4;
    if (id === 'Build_OilPump_C' || n.includes('petroleo')) return 5;
    if (id.includes('Fracking') || n.includes('poco')) return 6;
    // Produção
    if (id === 'Build_SmelterMk1_C' || n.includes('fornalha')) return 10;
    if (id === 'Build_ConstructorMk1_C' || n.includes('construtor')) return 11;
    if (id === 'Build_FoundryMk1_C' || n.includes('fundicao')) return 12;
    if (id === 'Build_AssemblerMk1_C' || n.includes('montadora')) return 13;
    if (id === 'Build_OilRefinery_C' || n.includes('refinaria')) return 14;
    if (id === 'Build_Packager_C' || n.includes('envasadora')) return 15;
    if (id === 'Build_ManufacturerMk1_C' || n.includes('fabricante')) return 16;
    if (id === 'Build_Blender_C' || n.includes('misturador')) return 17;
    if (id === 'Build_HadronCollider_C' || n.includes('acelerador')) return 18;
    if (id === 'Build_Converter_C' || n.includes('conversor')) return 19;
    if (id === 'Build_QuantumEncoder_C' || n.includes('codificador')) return 20;
    // Geradores
    if (n.includes('biomassa')) return 30;
    if (n.includes('carvao')) return 31;
    if (n.includes('combustivel')) return 32;
    if (n.includes('geoterm')) return 33;
    if (n.includes('nuclear')) return 34;
    if (n.includes('alien')) return 35;
    return 99;
  }

  function sortItemsByProgression(items) {
    return [...(items || [])].sort((a, b) => {
      const catDiff = getCategoryProgressionRank(a.category) - getCategoryProgressionRank(b.category);
      if (catDiff !== 0) return catDiff;
      if (Boolean(a.isRawResource) !== Boolean(b.isRawResource)) return a.isRawResource ? -1 : 1;
      const ptsA = Number(a.sinkPoints || 0);
      const ptsB = Number(b.sinkPoints || 0);
      const rankA = ptsA > 0 ? ptsA : 9999999;
      const rankB = ptsB > 0 ? ptsB : 9999999;
      if (rankA !== rankB) return rankA - rankB;
      return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
    });
  }

  /* --- Item 1: Ícones dos itens individuais que cada máquina produz (sem receitas alternativas) --- */
  function renderMachineProducedItemsHtml(machineEntity, maxIcons = 12) {
    const data = global.SATISFACTORY_DATA || {};
    const itemsDb = data.items || {};
    const recipesDb = data.recipes || {};
    const producedMap = new Map();

    if (Array.isArray(machineEntity?.allowedResources) && machineEntity.allowedResources.length > 0) {
      machineEntity.allowedResources.forEach((itemId) => {
        const it = itemsDb[itemId];
        if (it && !producedMap.has(it.id)) producedMap.set(it.id, it);
      });
    } else if (machineEntity?.id === 'Build_WaterPump_C' && itemsDb.Desc_Water_C) {
      producedMap.set('Desc_Water_C', itemsDb.Desc_Water_C);
    } else if (machineEntity?.id === 'Build_OilPump_C' && itemsDb.Desc_LiquidOil_C) {
      producedMap.set('Desc_LiquidOil_C', itemsDb.Desc_LiquidOil_C);
    } else if (machineEntity?.id) {
      const mId = machineEntity.id;
      const stdRecs = Object.values(recipesDb).filter(
        (r) => r && (r.machine === mId || r.producedIn === mId) && !r.isAlternate && !r.isFicsmas
      );
      const src = stdRecs.length > 0
        ? stdRecs
        : Object.values(recipesDb).filter((r) => r && (r.machine === mId || r.producedIn === mId) && !r.isFicsmas);
      src.forEach((r) => {
        (r.products || []).forEach((p) => {
          const it = itemsDb[p.item];
          if (it && !producedMap.has(it.id)) producedMap.set(it.id, it);
        });
      });
    }

    const list = sortItemsByProgression(Array.from(producedMap.values()));
    if (list.length === 0) return '';
    const shown = list.slice(0, maxIcons);
    const extra = list.length - shown.length;
    const renderIco = typeof global.renderEntityIcon === 'function'
      ? (it) => `<span title="${esc(it.name)}">${global.renderEntityIcon(it, 20)}</span>`
      : (it) => (it.wikiImage ? `<img src="${it.wikiImage}" alt="${esc(it.name)}" title="${esc(it.name)}" width="20" height="20" />` : '');
    return `
      <span class="ds-mach-prods-strip">
        ${shown.map(renderIco).join('')}
        ${extra > 0 ? `<span class="ds-mach-prod-more">+${extra}</span>` : ''}
      </span>
    `;
  }

  /* --- Item 6: Contêiner próprio para filtros de receitas (distinto das abas principais) --- */
  function recipeFilterBox({
    chips = [],
    activeKey = '',
    onSelectExpr = '',
    ariaLabel = 'Filtros de receitas',
    extraClass = ''
  } = {}) {
    return `
      <div class="ds-recipe-filter-box ${extraClass}" role="group" aria-label="${esc(ariaLabel)}">
        <div class="ds-recipe-filter-list">
          ${chips.map((c) => {
            const isActive = c.key === activeKey;
            const safeKey = String(c.key).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            const onclick = onSelectExpr ? onSelectExpr.replace(/__KEY__/g, `'${safeKey}'`) : '';
            const countHtml = c.count !== undefined && c.count !== null
              ? `<span class="ds-rf-count">${esc(c.count)}</span>`
              : '';
            const checkHtml = isActive ? `<span class="ds-rf-check" aria-hidden="true">✓</span>` : '';
            return `
              <button
                type="button"
                aria-pressed="${isActive ? 'true' : 'false'}"
                class="ds-rf-chip${isActive ? ' active' : ''}"
                onclick="${onclick}"
              >${checkHtml}<span>${esc(c.label)}</span>${countHtml}</button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  /* --- Item 10: Componente único NumberStepper (‹ valor › com repetir ao segurar e clicar no valor para digitar) --- */
  let _stepperHoldTimer = null;
  let _stepperHoldInterval = null;

  function stopStepperHold() {
    if (_stepperHoldTimer) { clearTimeout(_stepperHoldTimer); _stepperHoldTimer = null; }
    if (_stepperHoldInterval) { clearInterval(_stepperHoldInterval); _stepperHoldInterval = null; }
  }

  function stepNumberControl(btnEl, delta) {
    const wrap = btnEl?.closest?.('.ds-number-stepper');
    if (!wrap || wrap.classList.contains('is-disabled')) return;
    const inp = wrap.querySelector('.ds-stepper-input');
    if (!inp || inp.disabled) return;
    const min = Number(inp.dataset.min ?? 1);
    const max = Number(inp.dataset.max ?? 999999);
    const step = Number(inp.dataset.step ?? 1) || 1;
    const rawCur = parseFloat(String(inp.value).replace(/[^\d.-]/g, ''));
    const cur = Number.isFinite(rawCur) ? rawCur : min;
    let next = cur + delta * step;
    if (Number.isFinite(min)) next = Math.max(min, next);
    if (Number.isFinite(max)) next = Math.min(max, next);
    next = Math.round(next * 1000) / 1000;
    const suffix = inp.dataset.suffix || '';
    inp.value = `${next}${suffix}`;
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function startStepperHold(btnEl, delta) {
    stopStepperHold();
    stepNumberControl(btnEl, delta);
    _stepperHoldTimer = setTimeout(() => {
      _stepperHoldInterval = setInterval(() => {
        if (!document.body.contains(btnEl)) { stopStepperHold(); return; }
        stepNumberControl(btnEl, delta);
      }, 85);
    }, 340);
  }

  document.addEventListener('pointerup', stopStepperHold);
  document.addEventListener('pointercancel', stopStepperHold);

  function numberStepper({
    id = '',
    value = 1,
    min = 1,
    max = 999999,
    step = 1,
    suffix = '',
    onChangeExpr = '',
    disabled = false,
    extraClass = ''
  } = {}) {
    const idAttr = id ? ` id="${esc(id)}"` : '';
    const numVal = value === '' || value === null || value === undefined ? min : value;
    const dispVal = `${numVal}${suffix}`;
    const safeChange = onChangeExpr
      ? onChangeExpr.replace(/__VAL__/g, `Math.max(${min}, Math.min(${max}, parseFloat(String(this.value).replace(/[^0-9.-]/g,''))||${min}))`).replace(/this\.value/g, `(String(this.value).replace(/[^0-9.-]/g,'')||'${min}')`)
      : '';
    return `
      <div class="ds-number-stepper floor-stepper-row ${disabled ? 'is-disabled' : ''} ${extraClass}">
        <button
          type="button"
          class="oc-step-btn ds-step-btn"
          ${disabled ? 'disabled' : ''}
          onpointerdown="if(event.button===0){event.preventDefault();DS.startStepperHold(this,-1);}"
          onpointerleave="DS.stopStepperHold()"
          aria-label="Diminuir"
        >‹</button>
        <input
          ${idAttr}
          type="text"
          inputmode="decimal"
          class="ds-stepper-input floor-stepper-val sidebar-input"
          value="${esc(dispVal)}"
          data-min="${esc(min)}"
          data-max="${esc(max)}"
          data-step="${esc(step)}"
          data-suffix="${esc(suffix)}"
          ${disabled ? 'disabled readonly' : ''}
          onfocus="if(!this.disabled && this.dataset.suffix){this.value=String(this.value).replace(this.dataset.suffix,'');this.select();}"
          onblur="if(this.dataset.suffix && !String(this.value).endsWith(this.dataset.suffix)){var n=parseFloat(String(this.value).replace(/[^0-9.-]/g,''))||Number(this.dataset.min||1);this.value=n+this.dataset.suffix;}"
          onchange="${safeChange}"
        />
        <button
          type="button"
          class="oc-step-btn ds-step-btn"
          ${disabled ? 'disabled' : ''}
          onpointerdown="if(event.button===0){event.preventDefault();DS.startStepperHold(this,1);}"
          onpointerleave="DS.stopStepperHold()"
          aria-label="Aumentar"
        >›</button>
      </div>
    `;
  }

  /* --- Item 1: Card quadrado pequeno com a imagem da máquina preenchendo o card e informações sobrepostas --- */
  function squareImageCard({
    entity = null,
    title = '',
    badge = '×1',
    rateText = '',
    selected = false,
    stageColor = '#0D9488',
    onClick = '',
    extraAttrs = ''
  } = {}) {
    const primaryUrl = entity?.wikiImage || entity?.icon || '';
    const fallbackUrl = entity?.wikiImageFallback || '';
    const initials = String(title || '?').replace(/^(Minério de|Lingote de|Extrator de|Elevador de)\s+/i, '').trim().slice(0, 2).toUpperCase();
    const bgHtml = primaryUrl
      ? `<img class="ds-sq-bg-img" src="${esc(primaryUrl)}" alt="${esc(title)}" referrerpolicy="no-referrer" onerror="if(this.dataset.triedFallback!=='1' && '${esc(fallbackUrl)}'){this.dataset.triedFallback='1';this.src='${esc(fallbackUrl)}';}else{this.style.display='none';this.nextElementSibling.style.display='flex';}" /><span class="ds-sq-bg-fallback" style="display:none;">${esc(initials)}</span>`
      : `<span class="ds-sq-bg-fallback">${esc(initials)}</span>`;
    return `
      <button
        type="button"
        class="ds-sq-card ds-sq-img-card ${selected ? 'is-selected' : ''}"
        style="--stage-c:${esc(stageColor)};"
        ${onClick ? `onclick="${onClick}"` : ''}
        ${extraAttrs}
        title="${esc(title)}${rateText ? ' — ' + esc(rateText) : ''}"
      >
        ${bgHtml}
        <span class="ds-sq-scrim" aria-hidden="true"></span>
        <span class="ds-sq-badge">${esc(badge)}</span>
        <span class="ds-sq-overlay-info">
          <span class="ds-sq-title">${esc(title)}</span>
          ${rateText ? `<span class="ds-sq-rate">${esc(rateText)}</span>` : ''}
        </span>
      </button>
    `;
  }

  /* --- Item 3: Fechar qualquer modal sobreposto com ESC ou clique fora dos cards/controles --- */
  function closeTopmostModal() {
    const ids = [
      'image-lightbox-modal',
      'recipe-picker-modal',
      'calc-picker-modal',
      'picker-modal',
      'add-machine-modal',
      'machine-inspector-modal',
      'excess-recipe-modal',
      'save-project-modal',
      'report-modal',
      'auth-modal',
      'settings-modal',
      'patch-notes-modal',
      'patch-auto-modal',
      'tutorial-modal'
    ];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el && !el.classList.contains('hidden')) {
        if (id === 'picker-modal' && typeof global.closePickerModal === 'function') global.closePickerModal();
        else if (id === 'add-machine-modal' && typeof global.closeAddMachineModal === 'function') global.closeAddMachineModal();
        else if (id === 'tutorial-modal' && typeof global.closeTutorialModal === 'function') global.closeTutorialModal();
        else if (id === 'machine-inspector-modal' && typeof global.closeMachineInspector === 'function') global.closeMachineInspector();
        else if (id === 'excess-recipe-modal' && typeof global.closeExcessRecipeModal === 'function') global.closeExcessRecipeModal();
        else if (id === 'auth-modal' && typeof global.closeAuthModal === 'function') global.closeAuthModal();
        else if (id === 'report-modal' && typeof global.closeReportModal === 'function') global.closeReportModal();
        else if (id === 'save-project-modal' && typeof global.closeSaveProjectModal === 'function') global.closeSaveProjectModal();
        else if (id === 'patch-notes-modal' && typeof global.closePatchNotesModal === 'function') global.closePatchNotesModal();
        else if (id === 'patch-auto-modal' && typeof global.closePatchAutoCard === 'function') global.closePatchAutoCard(true);
        else if (id === 'image-lightbox-modal' && typeof global.closeImageLightbox === 'function') global.closeImageLightbox();
        else el.classList.add('hidden');
        return true;
      }
    }
    return false;
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (closeTopmostModal()) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }, true);

  document.addEventListener('click', (e) => {
    const backdrop = e.target.closest?.('.modal-backdrop:not(.hidden)');
    if (!backdrop) return;
    const picker = backdrop.querySelector('.ds-modal-picker');
    if (!picker) return;
    // Fecha se clicou no backdrop ou em área vazia dentro do container transparente do modal
    if (e.target === backdrop || e.target === picker || e.target.classList.contains('ds-modal-scroll') || e.target.classList.contains('ds-modal-list') || e.target.classList.contains('ds-modal-group')) {
      closeTopmostModal();
    }
  });

  global.DS = {
    esc,
    sectionCard,
    listRow,
    optionRow,
    filterChips,
    recipeFilterBox,
    numberStepper,
    startStepperHold,
    stopStepperHold,
    stepNumberControl,
    squareImageCard,
    modalGroupHeader,
    emptyState,
    getCategoryProgressionRank,
    getMachineProgressionRank,
    sortItemsByProgression,
    renderMachineProducedItemsHtml,
    closeTopmostModal
  };
})(window);
