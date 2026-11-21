// Satisfactory 1.0+ Solver Engine & Splitter/Belt Graph Builder (Database aligned with satisfactory.th.gl/db)
(function () {
  const DATA = window.SATISFACTORY_DATA;

  const PREFERRED_DEFAULTS = {
    'Desc_GenericBiomass_C': 'Recipe_Biomass_Wood_C',
    'Desc_LiquidFuel_C': 'Recipe_LiquidFuel_C',
    'Desc_FicsiteIngot_C': 'Recipe_FicsiteIngot_Iron_C',
    'Desc_Diamond_C': 'Recipe_Diamond_C',
    'Desc_DarkEnergy_C': 'Recipe_DarkEnergy_C',
    'Desc_QuantumEnergy_C': 'Recipe_QuantumEnergy_C',
    'Desc_PowerShard_C': 'Recipe_PowerCrystalShard_1_C',
    'Desc_AlienProtein_C': 'Recipe_Protein_Hog_C'
  };

  const recipesByProduct = {};
  const recipesByIngredient = {};
  const defaultRecipeForItem = {};

  function initIndexes() {
    if (Array.isArray(DATA.belts)) {
      DATA.belts.sort((a, b) => a.ratePerMin - b.ratePerMin);
    }
    if (Array.isArray(DATA.pipes)) {
      DATA.pipes.sort((a, b) => a.ratePerMin - b.ratePerMin);
    }
    Object.values(DATA.recipes).forEach((r) => {
      r.products.forEach((p) => {
        if (!recipesByProduct[p.item]) recipesByProduct[p.item] = [];
        recipesByProduct[p.item].push(r);
      });
      r.ingredients.forEach((ing) => {
        if (!recipesByIngredient[ing.item]) recipesByIngredient[ing.item] = [];
        recipesByIngredient[ing.item].push(r);
      });
    });

    Object.keys(recipesByProduct).forEach((itemId) => {
      if (PREFERRED_DEFAULTS[itemId] && DATA.recipes[PREFERRED_DEFAULTS[itemId]]) {
        defaultRecipeForItem[itemId] = PREFERRED_DEFAULTS[itemId];
        return;
      }
      const list = recipesByProduct[itemId];
      const sorted = [...list].sort((a, b) => {
        const score = (r) => {
          let s = 0;
          if (!r.isAlternate) s += 100;
          if (!r.isUnpackage) s += 50;
          if (!r.isPackage) s += 20;
          if (!r.isConverterOre) s += 40;
          if (r.primaryProduct === itemId) s += 30;
          if (!r.isFicsmas) s += 10;
          s -= (r.tier || 0);
          return s;
        };
        return score(b) - score(a);
      });
      if (sorted.length > 0) {
        defaultRecipeForItem[itemId] = sorted[0].id;
      }
    });
  }

  initIndexes();

  function getRecipesForItem(itemId) {
    const list = recipesByProduct[itemId] || [];
    return list.filter((r) => !r.isFicsmas && !r.isUnpackage);
  }

  function getChosenRecipeId(itemId, recipeOverrides = {}) {
    if (recipeOverrides && recipeOverrides[itemId] && DATA.recipes[recipeOverrides[itemId]]) {
      return recipeOverrides[itemId];
    }
    const item = DATA.items[itemId];
    if (!item) return null;
    if (item.isRawResource && (!recipeOverrides || !recipeOverrides[itemId])) {
      return null;
    }
    return defaultRecipeForItem[itemId] || null;
  }

  /**
   * Smart Minimum Conveyor Belt or Pipeline recommendation for a single line carrying `ratePerMin`.
   * Always picks the smallest belt/pipe tier that handles `ratePerMin` (e.g. 30/min -> v.1 (60), 120/min -> v.2 (120), 300/min -> v.4 (480)).
   */
  function getLogisticsInfo(ratePerMin, isFluid = false, maxBeltMkId = null) {
    if (ratePerMin <= 1e-6) {
      return {
        minTier: null,
        shortTier: '—',
        beltTag: '—',
        wireTag: '—',
        linesNeeded: 0,
        ratePerLine: 0,
        singleBeltMax: 0,
        totalCapacity: 0,
        spareCapacity: 0,
        label: 'Sem transporte',
        shortLabel: '—'
      };
    }

    const tiers = isFluid ? DATA.pipes : DATA.belts;
    let allowedTiers = tiers;
    if (!isFluid && maxBeltMkId) {
      const idx = tiers.findIndex((b) => b.id === maxBeltMkId);
      if (idx >= 0) allowedTiers = tiers.slice(0, idx + 1);
    }

    const highestAllowed = allowedTiers[allowedTiers.length - 1];
    const singleTier = allowedTiers.find((t) => t.ratePerMin >= ratePerMin - 1e-5);

    if (singleTier) {
      const spare = Math.max(0, singleTier.ratePerMin - ratePerMin);
      const vMatch = singleTier.name.match(/v\.(\d+)/i);
      const shortTier = isFluid
        ? `Tubo v.${vMatch ? vMatch[1] : '1'}`
        : `Esteira v.${vMatch ? vMatch[1] : '1'}`;
      return {
        minTier: singleTier,
        shortTier,
        beltTag: `${shortTier} (máx ${singleTier.ratePerMin}/m)`,
        wireTag: `${shortTier} (${singleTier.ratePerMin}/m)`,
        linesNeeded: 1,
        ratePerLine: ratePerMin,
        singleBeltMax: singleTier.ratePerMin,
        totalCapacity: singleTier.ratePerMin,
        spareCapacity: spare,
        exceedsSingleLine: false,
        label: `${shortTier} (máx ${singleTier.ratePerMin}/min)`,
        shortLabel: `${shortTier} (${singleTier.ratePerMin}/m)`
      };
    }

    const linesNeeded = Math.ceil((ratePerMin - 1e-5) / highestAllowed.ratePerMin);
    const ratePerLine = ratePerMin / linesNeeded;
    const perLineTier = allowedTiers.find((t) => t.ratePerMin >= ratePerLine - 1e-5) || highestAllowed;
    const vMatch = perLineTier.name.match(/v\.(\d+)/i);
    const baseShortTier = isFluid
      ? `Tubo v.${vMatch ? vMatch[1] : '2'}`
      : `Esteira v.${vMatch ? vMatch[1] : '6'}`;
    const shortTier = `${linesNeeded}× ${baseShortTier}`;
    const ratePerLineRounded = Math.round(ratePerLine * 10) / 10;
    const totalCapacity = linesNeeded * perLineTier.ratePerMin;
    const spare = Math.max(0, totalCapacity - ratePerMin);

    return {
      minTier: perLineTier,
      shortTier,
      beltTag: `${linesNeeded}× ${baseShortTier} (${ratePerLineRounded}/m cada • máx ${perLineTier.ratePerMin}/m)`,
      wireTag: `${linesNeeded}× ${baseShortTier} (${ratePerLineRounded}/m cada)`,
      linesNeeded,
      ratePerLine,
      singleBeltMax: perLineTier.ratePerMin,
      totalCapacity,
      spareCapacity: spare,
      exceedsSingleLine: true,
      label: `${linesNeeded}× ${baseShortTier} (${ratePerLineRounded}/min cada • máx ${perLineTier.ratePerMin}/min)`,
      shortLabel: `${linesNeeded}× ${baseShortTier}`
    };
  }

  function computeMachineStats(recipe, clockPercent = 100, sloops = 0) {
    const machine = DATA.machines[recipe.machine];
    const clampedClock = Math.max(1, Math.min(250, Number(clockPercent) || 100));
    const maxSloops = machine ? machine.sloopSlots : 0;
    const clampedSloops = Math.max(0, Math.min(maxSloops, Math.floor(Number(sloops) || 0)));

    const clockRatio = clampedClock / 100.0;
    const sloopBoost = clampedSloops * (machine ? machine.sloopMultiplier : 0);
    const inputMult = clockRatio;
    const outputMult = clockRatio * (1.0 + sloopBoost);

    const exp = machine ? machine.powerExponent : 1.321929;
    const powerMult = Math.pow(1.0 + sloopBoost, 2) * Math.pow(clockRatio, exp);

    const avgMwPerMachine = recipe.avgPowerMw * powerMult;

    let shardsPerMachine = 0;
    if (clampedClock > 200) shardsPerMachine = 3;
    else if (clampedClock > 150) shardsPerMachine = 2;
    else if (clampedClock > 100) shardsPerMachine = 1;

    return {
      machine,
      clockPercent: clampedClock,
      sloops: clampedSloops,
      maxSloops,
      sloopBoost,
      inputMult,
      outputMult,
      avgMwPerMachine,
      shardsPerMachine
    };
  }

  function computeExtractorStats(extractorId, purity = 1.0, clockPercent = 100, count = 1, maxBeltSpeed = 1200) {
    const ex = DATA.extractors[extractorId];
    if (!ex) return null;
    const intCount = Math.max(1, Math.round(Number(count) || 1));
    const clampedClock = Math.max(1, Math.min(250, Number(clockPercent) || 100));
    const clockRatio = clampedClock / 100.0;
    const purityMult = ex.supportsPurity ? Number(purity) || 1.0 : 1.0;

    const rawRatePerExtractor = ex.baseRatePerMin * purityMult * clockRatio;
    const capLimit = ex.isFluid ? 600 : maxBeltSpeed;
    const cappedRatePerExtractor = Math.min(rawRatePerExtractor, capLimit);
    const isBeltCapped = rawRatePerExtractor > capLimit + 1e-6;

    const powerPerExtractor = ex.basePowerMw * Math.pow(clockRatio, ex.powerExponent || 1.321929);

    return {
      extractor: ex,
      count: intCount,
      purity: purityMult,
      clockPercent: clampedClock,
      ratePerExtractor: cappedRatePerExtractor,
      totalRate: cappedRatePerExtractor * intCount,
      isBeltCapped,
      capLimit,
      powerPerExtractor,
      totalPowerMw: powerPerExtractor * intCount
    };
  }

  /**
   * PULL SOLVER (Do Produto Final -> Para as Máquinas Inteiras & Recursos)
   */
  function solvePullInteger(config) {
    const targets = config.targets || [];
    const recipeOverrides = config.recipeOverrides || {};
    const stepModifiers = config.stepModifiers || {};
    const maxBeltId = config.maxBeltId || 'Build_ConveyorBeltMk6_C';
    const extractorCfg = config.extractorConfig || {
      solidExtractor: 'Build_MinerMk2_C',
      solidPurity: 1.0,
      solidClock: 100
    };

    const demandByItem = {};
    const consumersOfItem = {};
    const depthMap = {};

    targets.forEach((t) => {
      if (!t.item || t.rate <= 0) return;
      demandByItem[t.item] = (demandByItem[t.item] || 0) + Number(t.rate);
      if (!consumersOfItem[t.item]) consumersOfItem[t.item] = [];
      consumersOfItem[t.item].push({
        toItemId: '__FINAL__',
        toItemName: 'Produto Final Desejado',
        rate: Number(t.rate)
      });
      depthMap[t.item] = 0;
    });

    function dfsOrder(itemId, depth) {
      if (depth > 20) return;
      depthMap[itemId] = Math.max(depthMap[itemId] || 0, depth);
      const recId = getChosenRecipeId(itemId, recipeOverrides);
      const rec = recId ? DATA.recipes[recId] : null;
      if (!rec) return;
      rec.ingredients.forEach((ing) => {
        dfsOrder(ing.item, depth + 1);
      });
    }
    targets.forEach((t) => {
      if (t.item) dfsOrder(t.item, 0);
    });

    const stages = [];
    const rawResourcesNeeded = {};
    const allExcessItems = [];
    const edges = [];

    const processed = new Set();
    let loopGuard = 0;

    while (loopGuard < 200) {
      loopGuard++;
      const candidates = Object.keys(demandByItem)
        .filter((id) => demandByItem[id] > 1e-7 && !processed.has(id))
        .sort((a, b) => (depthMap[a] || 0) - (depthMap[b] || 0));

      if (candidates.length === 0) break;

      const itemId = candidates[0];
      processed.add(itemId);

      const demandedRate = demandByItem[itemId];
      const itemObj = DATA.items[itemId];
      if (!itemObj) continue;

      const recId = getChosenRecipeId(itemId, recipeOverrides);
      const recipe = recId ? DATA.recipes[recId] : null;
      const curDepth = depthMap[itemId] || 0;

      if (!recipe || curDepth > 20) {
        rawResourcesNeeded[itemId] = (rawResourcesNeeded[itemId] || 0) + demandedRate;
        continue;
      }

      const mod = stepModifiers[itemId] || { clock: 100, sloops: 0, manualMachines: null };
      const mStats = computeMachineStats(recipe, mod.clock, mod.sloops);
      const prodEntry = recipe.products.find((p) => p.item === itemId) || recipe.products[0];
      const ratePerMachine = prodEntry.ratePerMin * mStats.outputMult;

      if (ratePerMachine <= 1e-9) {
        rawResourcesNeeded[itemId] = (rawResourcesNeeded[itemId] || 0) + demandedRate;
        continue;
      }

      const minIntMachinesNeeded = Math.max(1, Math.ceil((demandedRate / ratePerMachine) - 1e-6));
      const intMachines = mod.manualMachines && mod.manualMachines >= 1
        ? Math.round(mod.manualMachines)
        : minIntMachinesNeeded;

      const actualProducedRate = intMachines * ratePerMachine;
      const excessRate = Math.max(0, actualProducedRate - demandedRate);
      const deficitRate = Math.max(0, demandedRate - actualProducedRate);

      const byproducts = [];
      recipe.products.forEach((p) => {
        if (p.item !== itemId) {
          const byRate = intMachines * p.ratePerMin * mStats.outputMult;
          const byItem = DATA.items[p.item];
          byproducts.push({
            item: byItem,
            ratePerMin: byRate,
            logistics: getLogisticsInfo(byRate, byItem ? byItem.isFluid : false, maxBeltId)
          });
          allExcessItems.push({
            item: byItem,
            excessRate: byRate,
            sourceItemId: itemId,
            reason: `Excesso (subproduto) da receita "${recipe.cleanName}"`
          });
        }
      });

      const inputsConsumed = recipe.ingredients.map((ing) => {
        const ingItem = DATA.items[ing.item];
        const perMachineRate = ing.ratePerMin * mStats.inputMult;
        const totalIngRate = intMachines * perMachineRate;

        demandByItem[ing.item] = (demandByItem[ing.item] || 0) + totalIngRate;
        depthMap[ing.item] = Math.max(depthMap[ing.item] || 0, curDepth + 1);
        if (!consumersOfItem[ing.item]) consumersOfItem[ing.item] = [];
        consumersOfItem[ing.item].push({
          toItemId: itemId,
          toItemName: itemObj.name,
          machineName: mStats.machine.name,
          rate: totalIngRate
        });

        edges.push({
          fromItem: ing.item,
          toItem: itemId,
          item: ingItem,
          ratePerMin: totalIngRate,
          perMachineRate
        });

        return {
          item: ingItem,
          perMachineRate,
          ratePerMin: totalIngRate,
          perMachineLogistics: getLogisticsInfo(perMachineRate, ingItem ? ingItem.isFluid : false, maxBeltId),
          logistics: getLogisticsInfo(totalIngRate, ingItem ? ingItem.isFluid : false, maxBeltId)
        };
      });

      const totalPowerMw = intMachines * mStats.avgMwPerMachine;

      stages.push({
        itemId,
        item: itemObj,
        recipe,
        availableRecipes: getRecipesForItem(itemId),
        machine: mStats.machine,
        intMachines,
        minIntMachinesNeeded,
        clockPercent: mStats.clockPercent,
        sloops: mStats.sloops,
        maxSloops: mStats.maxSloops,
        ratePerMachine,
        demandedRate,
        actualProducedRate,
        excessRate,
        deficitRate,
        totalPowerMw,
        powerPerMachineMw: mStats.avgMwPerMachine,
        shardsNeeded: intMachines * mStats.shardsPerMachine,
        inputsConsumed,
        byproducts,
        consumers: consumersOfItem[itemId] || [],
        perMachineOutputLogistics: getLogisticsInfo(ratePerMachine, itemObj.isFluid, maxBeltId),
        outputLogistics: getLogisticsInfo(actualProducedRate, itemObj.isFluid, maxBeltId),
        depth: curDepth
      });
    }

    stages.sort((a, b) => b.depth - a.depth);

    const extractionPlan = [];
    let totalExtractionPowerMw = 0;
    let totalExtractorsInt = 0;
    const maxBeltSpeed = (DATA.belts.find((b) => b.id === maxBeltId) || { ratePerMin: 1200 }).ratePerMin;

    Object.entries(rawResourcesNeeded).forEach(([resId, rateNeeded]) => {
      if (rateNeeded <= 1e-6) return;
      const resItem = DATA.items[resId];
      if (!resItem) return;

      let exId = extractorCfg.solidExtractor || 'Build_MinerMk2_C';
      let purity = extractorCfg.solidPurity || 1.0;
      let clock = extractorCfg.solidClock || 100;

      if (resId === 'Desc_Water_C') {
        exId = 'Build_WaterPump_C';
        purity = 1.0;
      } else if (resId === 'Desc_LiquidOil_C') {
        exId = 'Build_OilPump_C';
      } else if (resId === 'Desc_NitrogenGas_C') {
        exId = 'Build_FrackingExtractor_C';
      } else if (!resItem.isRawResource) {
        extractionPlan.push({
          resource: resItem,
          rateNeeded,
          totalExtracted: rateNeeded,
          excessExtracted: 0,
          isCollectible: true,
          extractor: null,
          intExtractors: 1,
          ratePerExtractor: rateNeeded,
          powerPerExtractor: 0,
          powerMw: 0,
          perExtractorLogistics: getLogisticsInfo(rateNeeded, resItem.isFluid, maxBeltId),
          logistics: getLogisticsInfo(rateNeeded, resItem.isFluid, maxBeltId)
        });
        return;
      }

      const unitEx = computeExtractorStats(exId, purity, clock, 1, maxBeltSpeed);
      const ratePerEx = unitEx.ratePerExtractor;
      const intExtractors = Math.max(1, Math.ceil((rateNeeded / ratePerEx) - 1e-6));
      const totalExtracted = intExtractors * ratePerEx;
      const excessExtracted = Math.max(0, totalExtracted - rateNeeded);
      const exPower = intExtractors * unitEx.powerPerExtractor;

      totalExtractionPowerMw += exPower;
      totalExtractorsInt += intExtractors;

      extractionPlan.push({
        resource: resItem,
        rateNeeded,
        totalExtracted,
        excessExtracted,
        isCollectible: false,
        extractor: unitEx.extractor,
        purity,
        clockPercent: clock,
        ratePerExtractor: ratePerEx,
        powerPerExtractor: unitEx.powerPerExtractor,
        intExtractors,
        powerMw: exPower,
        perExtractorLogistics: getLogisticsInfo(ratePerEx, resItem.isFluid, maxBeltId),
        logistics: getLogisticsInfo(ratePerEx, resItem.isFluid, maxBeltId),
        consumers: consumersOfItem[resId] || []
      });
    });

    const totalBuildCost = {};
    function addCost(list, count) {
      if (!list || count <= 0) return;
      list.forEach((c) => {
        totalBuildCost[c.item] = (totalBuildCost[c.item] || 0) + c.amount * count;
      });
    }
    stages.forEach((st) => addCost(st.machine.buildCost, st.intMachines));
    extractionPlan.forEach((ex) => {
      if (ex.extractor) addCost(ex.extractor.buildCost, ex.intExtractors);
    });

    const buildCostList = Object.entries(totalBuildCost)
      .map(([id, amt]) => ({ item: DATA.items[id], amount: Math.ceil(amt) }))
      .filter((x) => x.item)
      .sort((a, b) => b.amount - a.amount);

    const totalFactoryPowerMw = stages.reduce((acc, s) => acc + s.totalPowerMw, 0);
    const totalMachinesInt = stages.reduce((acc, s) => acc + s.intMachines, 0);

    // Excesso: somente o que a linha produz (subprodutos) e não é o produto final nem é consumido por outra máquina da linha
    const targetItemIds = new Set(targets.map((t) => t.item).filter(Boolean));
    const consumedItemIds = new Set(Object.keys(demandByItem).filter((id) => !targetItemIds.has(id)));
    const excessMap = {};
    allExcessItems.forEach((ex) => {
      if (!ex.item || ex.excessRate <= 1e-4) return;
      if (targetItemIds.has(ex.item.id)) return;
      if (consumedItemIds.has(ex.item.id)) return;
      if (!excessMap[ex.item.id]) {
        excessMap[ex.item.id] = {
          item: ex.item,
          excessRate: 0,
          sourceItemId: ex.sourceItemId,
          reason: ex.reason
        };
      }
      excessMap[ex.item.id].excessRate += ex.excessRate;
    });
    const aggregatedExcessItems = Object.values(excessMap);

    return {
      stages,
      extractionPlan,
      allExcessItems: aggregatedExcessItems,
      edges,
      buildCostList,
      summary: {
        totalMachinesBuilt: totalMachinesInt,
        totalExtractorsBuilt: totalExtractorsInt,
        totalFactoryPowerMw,
        totalExtractionPowerMw,
        grandTotalPowerMw: totalFactoryPowerMw + totalExtractionPowerMw
      }
    };
  }

  /**
   * PUSH SOLVER (Da Entrada / Mineradoras -> Para o Produto com Máquinas Inteiras)
   */
  function solvePushInteger(config) {
    const availableInputs = config.availableInputs || {};
    const calculatedInputs = config.calculatedInputs || [];
    const targetItemId = config.targetItemId;
    const recipeOverrides = config.recipeOverrides || {};
    const stepModifiers = config.stepModifiers || {};
    const maxBeltId = config.maxBeltId || 'Build_ConveyorBeltMk6_C';

    if (!targetItemId || !DATA.items[targetItemId]) return null;

    const unitTree = probeUnitRequirements(targetItemId, availableInputs, recipeOverrides, stepModifiers);
    const reqEntries = Object.entries(unitTree.requiredBase).filter(([, amt]) => amt > 1e-8);

    const providedMatches = [];
    const missingInputs = [];

    reqEntries.forEach(([reqId, unitAmt]) => {
      const userAvail = availableInputs[reqId] || 0;
      if (userAvail > 1e-7) {
        providedMatches.push({
          itemId: reqId,
          item: DATA.items[reqId],
          unitAmt,
          available: userAvail,
          maxTargetRate: userAvail / unitAmt
        });
      } else {
        missingInputs.push({
          itemId: reqId,
          item: DATA.items[reqId],
          unitAmt
        });
      }
    });

    if (providedMatches.length === 0) {
      return {
        targetItem: DATA.items[targetItemId],
        notConnected: true,
        unitRequirements: reqEntries.map(([id, amt]) => ({ item: DATA.items[id], unitAmt: amt }))
      };
    }

    providedMatches.sort((a, b) => a.maxTargetRate - b.maxTargetRate);
    const bottleneck = providedMatches[0];
    const theoreticalMaxTargetRate = bottleneck.maxTargetRate;

    const pool = { ...availableInputs };
    const missingCompanionDetails = missingInputs.map((m) => {
      const reqRate = theoreticalMaxTargetRate * m.unitAmt;
      pool[m.itemId] = reqRate;
      return {
        item: m.item,
        unitAmt: m.unitAmt,
        requiredRate: reqRate,
        logistics: getLogisticsInfo(reqRate, m.item ? m.item.isFluid : false, maxBeltId)
      };
    });

    const stageOrder = unitTree.chronologicalItems;
    const itemConsumptionShares = {};
    stageOrder.forEach((stItemId) => {
      const recId = getChosenRecipeId(stItemId, recipeOverrides);
      const rec = recId ? DATA.recipes[recId] : null;
      if (!rec) return;
      const unitStageRuns = unitTree.unitStageRuns[stItemId] || 0;
      const mod = stepModifiers[stItemId] || { clock: 100, sloops: 0 };
      const mStats = computeMachineStats(rec, mod.clock, mod.sloops);
      rec.ingredients.forEach((ing) => {
        const flow = unitStageRuns * ing.ratePerMin * mStats.inputMult;
        if (!itemConsumptionShares[ing.item]) itemConsumptionShares[ing.item] = {};
        itemConsumptionShares[ing.item][stItemId] = (itemConsumptionShares[ing.item][stItemId] || 0) + flow;
      });
    });

    const stages = [];
    const allExcessItems = [];
    const edges = [];
    const producedInPool = { ...pool };
    const consumedFromPool = {};

    stageOrder.forEach((stItemId) => {
      const itemObj = DATA.items[stItemId];
      const recId = getChosenRecipeId(stItemId, recipeOverrides);
      const recipe = recId ? DATA.recipes[recId] : null;
      if (!recipe || !itemObj) return;

      const mod = stepModifiers[stItemId] || { clock: 100, sloops: 0, manualMachines: null };
      const mStats = computeMachineStats(recipe, mod.clock, mod.sloops);
      const prodEntry = recipe.products.find((p) => p.item === stItemId) || recipe.products[0];
      const ratePerMachine = prodEntry.ratePerMin * mStats.outputMult;

      let maxMachinesSupportedByInputs = Infinity;
      const allocatedInputs = {};

      recipe.ingredients.forEach((ing) => {
        const totalAvailOfIng = producedInPool[ing.item] || 0;
        const sharesMap = itemConsumptionShares[ing.item] || {};
        const totalShareWeight = Object.values(sharesMap).reduce((a, b) => a + b, 0);
        const myShareRatio = totalShareWeight > 0 ? (sharesMap[stItemId] || 0) / totalShareWeight : 1.0;

        const allocatedRate = totalAvailOfIng * myShareRatio;
        allocatedInputs[ing.item] = allocatedRate;

        const reqPerMachine = ing.ratePerMin * mStats.inputMult;
        if (reqPerMachine > 0) {
          maxMachinesSupportedByInputs = Math.min(maxMachinesSupportedByInputs, allocatedRate / reqPerMachine);
        }
      });

      if (!isFinite(maxMachinesSupportedByInputs)) maxMachinesSupportedByInputs = 1;

      const floorInt = Math.max(1, Math.floor(maxMachinesSupportedByInputs + 1e-5));
      const ceilInt = Math.max(1, Math.ceil(maxMachinesSupportedByInputs - 1e-5));

      const intMachines = mod.manualMachines && mod.manualMachines >= 1
        ? Math.round(mod.manualMachines)
        : ceilInt;

      const effectiveMachineRuns = Math.min(intMachines, maxMachinesSupportedByInputs);
      const fullCapacityOutputRate = intMachines * ratePerMachine;
      const actualProducedRate = effectiveMachineRuns * ratePerMachine;
      const spareMachineCapacity = Math.max(0, fullCapacityOutputRate - actualProducedRate);

      producedInPool[stItemId] = (producedInPool[stItemId] || 0) + actualProducedRate;

      const inputsConsumed = recipe.ingredients.map((ing) => {
        const ingItem = DATA.items[ing.item];
        const perMachineRate = ing.ratePerMin * mStats.inputMult;
        const consumedRate = effectiveMachineRuns * perMachineRate;
        const fullMachinesNeedRate = intMachines * perMachineRate;
        const allocatedRate = allocatedInputs[ing.item] || 0;
        const leftoverIngRate = Math.max(0, allocatedRate - consumedRate);

        consumedFromPool[ing.item] = (consumedFromPool[ing.item] || 0) + consumedRate;

        edges.push({
          fromItem: ing.item,
          toItem: stItemId,
          item: ingItem,
          ratePerMin: consumedRate,
          perMachineRate
        });

        return {
          item: ingItem,
          perMachineRate,
          ratePerMin: consumedRate,
          fullMachinesNeedRate,
          allocatedRate,
          leftoverIngRate,
          perMachineLogistics: getLogisticsInfo(perMachineRate, ingItem ? ingItem.isFluid : false, maxBeltId),
          logistics: getLogisticsInfo(consumedRate, ingItem ? ingItem.isFluid : false, maxBeltId)
        };
      });

      const byproducts = [];
      recipe.products.forEach((p) => {
        if (p.item !== stItemId) {
          const byRate = effectiveMachineRuns * p.ratePerMin * mStats.outputMult;
          const byItem = DATA.items[p.item];
          producedInPool[p.item] = (producedInPool[p.item] || 0) + byRate;
          byproducts.push({
            item: byItem,
            ratePerMin: byRate,
            logistics: getLogisticsInfo(byRate, byItem ? byItem.isFluid : false, maxBeltId)
          });
        }
      });

      stages.push({
        itemId: stItemId,
        item: itemObj,
        recipe,
        availableRecipes: getRecipesForItem(stItemId),
        machine: mStats.machine,
        intMachines,
        floorIntMachines: floorInt,
        ceilIntMachines: ceilInt,
        effectiveMachineRuns,
        clockPercent: mStats.clockPercent,
        effectiveUniformClock: intMachines > 0 ? (effectiveMachineRuns / intMachines) * mStats.clockPercent : mStats.clockPercent,
        sloops: mStats.sloops,
        maxSloops: mStats.maxSloops,
        ratePerMachine,
        actualProducedRate,
        fullCapacityOutputRate,
        spareMachineCapacity,
        excessRate: 0,
        totalPowerMw: intMachines * mStats.avgMwPerMachine,
        powerPerMachineMw: mStats.avgMwPerMachine,
        inputsConsumed,
        byproducts,
        perMachineOutputLogistics: getLogisticsInfo(ratePerMachine, itemObj.isFluid, maxBeltId),
        outputLogistics: getLogisticsInfo(actualProducedRate, itemObj.isFluid, maxBeltId),
        depth: unitTree.depthMap[stItemId] || 0
      });
    });

    const excessByItemMap = {};
    stages.forEach((st) => {
      const usedDownstream = st.itemId === targetItemId
        ? st.actualProducedRate
        : (consumedFromPool[st.itemId] || 0);
      st.demandedRate = usedDownstream;
      st.excessRate = Math.max(0, st.actualProducedRate - usedDownstream);

      st.byproducts.forEach((b) => {
        if (!b.item || b.item.id === targetItemId) return;
        const usedBy = consumedFromPool[b.item.id] || 0;
        if (usedBy > 1e-4) return;
        const netBy = Math.max(0, b.ratePerMin - usedBy);
        if (netBy > 1e-4) {
          if (!excessByItemMap[b.item.id]) {
            excessByItemMap[b.item.id] = {
              item: b.item,
              excessRate: 0,
              sourceItemId: st.itemId,
              reason: `Excesso (subproduto) da receita "${st.recipe.cleanName}"`
            };
          }
          excessByItemMap[b.item.id].excessRate += netBy;
        }
      });
    });
    allExcessItems.push(...Object.values(excessByItemMap));

    const inputUsage = Object.entries(availableInputs)
      .filter(([, avail]) => avail > 0)
      .map(([inId, avail]) => {
        const used = consumedFromPool[inId] || 0;
        const surplus = Math.max(0, avail - used);
        const it = DATA.items[inId];
        return {
          item: it,
          available: avail,
          used,
          surplus,
          utilizationPct: avail > 0 ? Math.min(100, (used / avail) * 100) : 0,
          isBottleneck: bottleneck && bottleneck.itemId === inId,
          logistics: getLogisticsInfo(avail, it ? it.isFluid : false, maxBeltId)
        };
      });

    // Build extractionPlan for push mode from user's configured inputs + any missing companions
    const extractionPlan = [];
    calculatedInputs.forEach((ci) => {
      if (!ci.item) return;
      const used = consumedFromPool[ci.item.id] || 0;
      const excess = Math.max(0, ci.rate - used);
      extractionPlan.push({
        resource: ci.item,
        rateNeeded: used,
        totalExtracted: ci.rate,
        excessExtracted: excess,
        isCollectible: ci.isDirect,
        extractor: ci.extractor || null,
        purity: ci.inp ? ci.inp.purity : 1.0,
        clockPercent: ci.inp ? ci.inp.clock : 100,
        ratePerExtractor: ci.ratePerNode || ci.rate,
        powerPerExtractor: ci.intCount > 0 ? ci.powerMw / ci.intCount : 0,
        intExtractors: ci.intCount || 1,
        powerMw: ci.powerMw || 0,
        perExtractorLogistics: getLogisticsInfo(ci.ratePerNode || ci.rate, ci.item.isFluid, maxBeltId),
        logistics: getLogisticsInfo(ci.ratePerNode || ci.rate, ci.item.isFluid, maxBeltId)
      });
    });

    const branchSplits = [];
    Object.keys(producedInPool).forEach((itemId) => {
      const outEdges = edges.filter((e) => e.fromItem === itemId && e.ratePerMin > 1e-5);
      if (outEdges.length > 1) {
        const totalFlow = outEdges.reduce((a, e) => a + e.ratePerMin, 0);
        branchSplits.push({
          inputItem: DATA.items[itemId],
          totalUsed: totalFlow,
          branches: outEdges.map((e) => ({
            toItem: DATA.items[e.toItem],
            ratePerMin: e.ratePerMin,
            sharePct: totalFlow > 0 ? (e.ratePerMin / totalFlow) * 100 : 0,
            logistics: getLogisticsInfo(e.ratePerMin, e.item ? e.item.isFluid : false, maxBeltId)
          }))
        });
      }
    });

    const totalBuildCost = {};
    stages.forEach((st) => {
      (st.machine.buildCost || []).forEach((c) => {
        totalBuildCost[c.item] = (totalBuildCost[c.item] || 0) + c.amount * st.intMachines;
      });
    });
    const buildCostList = Object.entries(totalBuildCost)
      .map(([id, amt]) => ({ item: DATA.items[id], amount: Math.ceil(amt) }))
      .filter((x) => x.item)
      .sort((a, b) => b.amount - a.amount);

    const finalStage = stages.find((s) => s.itemId === targetItemId);
    const finalOutputRate = finalStage ? finalStage.actualProducedRate : theoreticalMaxTargetRate;
    const totalFactoryPowerMw = stages.reduce((a, s) => a + s.totalPowerMw, 0);
    const totalMachinesBuilt = stages.reduce((a, s) => a + s.intMachines, 0);

    return {
      targetItem: DATA.items[targetItemId],
      finalOutputRate,
      finalOutputLogistics: getLogisticsInfo(finalOutputRate, DATA.items[targetItemId]?.isFluid, maxBeltId),
      bottleneckItem: bottleneck ? bottleneck.item : null,
      inputUsage,
      extractionPlan,
      missingCompanionDetails,
      branchSplits,
      stages,
      allExcessItems,
      edges,
      buildCostList,
      summary: {
        totalMachinesBuilt,
        totalFactoryPowerMw
      }
    };
  }

  function probeUnitRequirements(targetItemId, availableInputs, recipeOverrides, stepModifiers) {
    const demand = { [targetItemId]: 1.0 };
    const depthMap = { [targetItemId]: 0 };
    const requiredBase = {};
    const unitStageRuns = {};
    const visited = new Set();

    function assignMaxDepth(itemId, d) {
      if (d > 20) return;
      depthMap[itemId] = Math.max(depthMap[itemId] || 0, d);
      if (itemId !== targetItemId && availableInputs[itemId] > 0) return;
      const recId = getChosenRecipeId(itemId, recipeOverrides);
      const rec = recId ? DATA.recipes[recId] : null;
      if (!rec) return;
      rec.ingredients.forEach((ing) => assignMaxDepth(ing.item, d + 1));
    }
    assignMaxDepth(targetItemId, 0);

    let guard = 0;
    while (guard < 200) {
      guard++;
      const keys = Object.keys(demand)
        .filter((k) => demand[k] > 1e-9 && !visited.has(k))
        .sort((a, b) => (depthMap[a] || 0) - (depthMap[b] || 0));
      if (keys.length === 0) break;

      const itemId = keys[0];
      visited.add(itemId);
      const needed = demand[itemId];
      const curDepth = depthMap[itemId] || 0;

      if (itemId !== targetItemId && availableInputs[itemId] > 0) {
        requiredBase[itemId] = (requiredBase[itemId] || 0) + needed;
        continue;
      }

      const recId = getChosenRecipeId(itemId, recipeOverrides);
      const rec = recId ? DATA.recipes[recId] : null;
      if (!rec || curDepth > 20) {
        requiredBase[itemId] = (requiredBase[itemId] || 0) + needed;
        continue;
      }

      const mod = stepModifiers[itemId] || { clock: 100, sloops: 0 };
      const mStats = computeMachineStats(rec, mod.clock, mod.sloops);
      const prodEntry = rec.products.find((p) => p.item === itemId) || rec.products[0];
      const outPerMachine = prodEntry.ratePerMin * mStats.outputMult;
      if (outPerMachine <= 1e-9) {
        requiredBase[itemId] = (requiredBase[itemId] || 0) + needed;
        continue;
      }

      const runs = needed / outPerMachine;
      unitStageRuns[itemId] = (unitStageRuns[itemId] || 0) + runs;

      rec.ingredients.forEach((ing) => {
        const ingRate = runs * ing.ratePerMin * mStats.inputMult;
        demand[ing.item] = (demand[ing.item] || 0) + ingRate;
      });
    }

    const chronologicalItems = Object.keys(unitStageRuns).sort((a, b) => (depthMap[b] || 0) - (depthMap[a] || 0));
    return { requiredBase, unitStageRuns, depthMap, chronologicalItems };
  }

  function discoverCraftableItems(availableInputs, recipeOverrides = {}, stepModifiers = {}) {
    const hasAnyInput = Object.values(availableInputs).some((v) => v > 0);
    if (!hasAnyInput) return { fullySupported: [], needsOneCompanion: [] };

    const fullySupported = [];
    const needsOneCompanion = [];

    Object.values(DATA.items).forEach((item) => {
      if (item.isRawResource || item.category === 'FICSMAS') return;
      if (!recipesByProduct[item.id] || recipesByProduct[item.id].length === 0) return;

      const res = solvePushInteger({
        availableInputs,
        targetItemId: item.id,
        recipeOverrides,
        stepModifiers
      });

      if (!res || res.notConnected || res.finalOutputRate <= 0) return;

      if (res.missingCompanionDetails.length === 0) {
        fullySupported.push({
          item,
          maxRate: res.finalOutputRate,
          machinesBuilt: res.summary.totalMachinesBuilt,
          powerMw: res.summary.totalFactoryPowerMw
        });
      } else if (res.missingCompanionDetails.length === 1) {
        needsOneCompanion.push({
          item,
          potentialRate: res.finalOutputRate,
          missingInput: res.missingCompanionDetails[0],
          machinesBuilt: res.summary.totalMachinesBuilt,
          powerMw: res.summary.totalFactoryPowerMw
        });
      }
    });

    fullySupported.sort((a, b) => (b.item.sinkPoints || 0) - (a.item.sinkPoints || 0));
    needsOneCompanion.sort((a, b) => (b.item.sinkPoints || 0) - (a.item.sinkPoints || 0));

    return { fullySupported, needsOneCompanion };
  }

  /**
   * POWER GENERATION CALCULATOR
   * Supports:
   * - Standard Clock (%) OR direct user-configured `customFuelPerGen` (/min) & `customMwPerGen` (MW)
   * - Individual Miner / Extractor belt sizing (e.g. 3 Miners @ 300/min each -> Esteira v.4 (480/min) per miner, NOT a single v.6 belt!)
   */
  function solvePowerGeneration(config) {
    const calcMode = config.calcMode || 'from_fuel';
    const generatorId = config.generatorId || 'Build_GeneratorCoal_C';
    const fuelItemId = config.fuelItemId || 'Desc_Coal_C';
    const genClock = Math.max(1, Math.min(250, Number(config.genClock) || 100));
    const maxBeltId = config.maxBeltId || 'Build_ConveyorBeltMk6_C';

    const gen = DATA.generators[generatorId];
    if (!gen) return null;

    const fuelEntry = gen.fuels.find((f) => f.item === fuelItemId) || gen.fuels[0];
    const fuelItem = DATA.items[fuelEntry.item];
    const clockRatio = genClock / 100.0;

    // Allow user to override per-generator MW or fuel/min if they want custom values (or use clockRatio)
    const mwPerGenerator = config.customMwPerGen && config.customMwPerGen > 0
      ? Number(config.customMwPerGen)
      : gen.powerProductionMw * clockRatio;

    const fuelPerGenerator = config.customFuelPerGen && config.customFuelPerGen > 0
      ? Number(config.customFuelPerGen)
      : fuelEntry.ratePerMin * clockRatio;

    const effectiveRatio = fuelEntry.ratePerMin > 0 ? (fuelPerGenerator / fuelEntry.ratePerMin) : clockRatio;
    const waterPerGenerator = (fuelEntry.waterPerMin || 0) * effectiveRatio;
    const byprodPerGenerator = (fuelEntry.byproductRatePerMin || 0) * effectiveRatio;

    let intGenerators = 1;
    let availableFuelRate = 0;

    if (calcMode === 'from_fuel') {
      availableFuelRate = Math.max(0, Number(config.fuelRateAvailable) || 0);
      const exactSupported = fuelPerGenerator > 0 ? availableFuelRate / fuelPerGenerator : 0;
      intGenerators = exactSupported >= 1 ? Math.floor(exactSupported + 1e-6) : 1;
      if (config.manualGenerators && config.manualGenerators >= 1) {
        intGenerators = Math.round(config.manualGenerators);
      }
    } else if (calcMode === 'from_mw') {
      const targetMw = Math.max(1, Number(config.targetMw) || 300);
      intGenerators = Math.max(1, Math.ceil((targetMw / mwPerGenerator) - 1e-6));
      if (config.manualGenerators && config.manualGenerators >= 1) {
        intGenerators = Math.round(config.manualGenerators);
      }
      availableFuelRate = intGenerators * fuelPerGenerator;
    } else {
      intGenerators = Math.max(1, Math.round(Number(config.targetGenerators) || 4));
      if (config.manualGenerators && config.manualGenerators >= 1) {
        intGenerators = Math.round(config.manualGenerators);
      }
      availableFuelRate = intGenerators * fuelPerGenerator;
    }

    const totalFuelConsumed = intGenerators * fuelPerGenerator;
    const fuelExcess = Math.max(0, availableFuelRate - totalFuelConsumed);
    const fuelDeficit = Math.max(0, totalFuelConsumed - availableFuelRate);
    const totalGrossMw = intGenerators * mwPerGenerator;

    // Water requirement & Integer Water Extractors (configurable clock & count!)
    const totalWaterNeeded = intGenerators * waterPerGenerator;
    const waterPumpClock = Math.max(1, Math.min(250, Number(config.waterExtractorClock) || 100));
    const waterPumpStats = computeExtractorStats('Build_WaterPump_C', 1.0, waterPumpClock, 1);
    const waterRatePerPump = waterPumpStats ? waterPumpStats.ratePerExtractor : (120.0 * (waterPumpClock / 100.0));
    const powerPerWaterPump = waterPumpStats ? waterPumpStats.powerPerExtractor : (20.0 * Math.pow(waterPumpClock / 100.0, 1.321928));

    let intWaterPumps = totalWaterNeeded > 0 ? Math.max(1, Math.ceil((totalWaterNeeded / waterRatePerPump) - 1e-6)) : 0;
    if (totalWaterNeeded > 0 && config.manualWaterPumps && config.manualWaterPumps >= 1) {
      intWaterPumps = Math.round(config.manualWaterPumps);
    }
    const totalWaterExtracted = intWaterPumps * waterRatePerPump;
    const waterExcess = Math.max(0, totalWaterExtracted - totalWaterNeeded);
    const waterDeficit = Math.max(0, totalWaterNeeded - totalWaterExtracted);
    const waterPumpPowerMw = intWaterPumps * powerPerWaterPump;

    const byprodItem = fuelEntry.byproduct ? DATA.items[fuelEntry.byproduct] : null;
    const totalByproductRate = intGenerators * byprodPerGenerator;

    // Per-miner logistics (if extractorStats is provided, size belt per miner, not summed!)
    const exStats = config.extractorStats || null;
    const perMinerRate = exStats ? exStats.ratePerExtractor : totalFuelConsumed;
    const perMinerLogistics = getLogisticsInfo(perMinerRate, fuelItem ? fuelItem.isFluid : false, maxBeltId);
    const perGeneratorFuelLogistics = getLogisticsInfo(fuelPerGenerator, fuelItem ? fuelItem.isFluid : false, maxBeltId);

    return {
      generator: gen,
      fuelEntry,
      fuelItem,
      genClock,
      effectiveRatio,
      intGenerators,
      mwPerGenerator,
      totalGrossMw,
      netPowerMw: totalGrossMw - waterPumpPowerMw - (exStats ? exStats.totalPowerMw : 0),
      fuelPerGenerator,
      availableFuelRate,
      totalFuelConsumed,
      fuelExcess,
      fuelDeficit,
      extractorStats: exStats,
      perMinerLogistics,
      perGeneratorFuelLogistics,
      fuelLogistics: exStats ? perMinerLogistics : getLogisticsInfo(totalFuelConsumed, fuelItem ? fuelItem.isFluid : false, maxBeltId),
      waterPerGenerator,
      totalWaterNeeded,
      waterPumpClock,
      waterRatePerPump,
      powerPerWaterPump,
      intWaterPumps,
      totalWaterExtracted,
      waterExcess,
      waterDeficit,
      waterPumpPowerMw,
      waterLogistics: getLogisticsInfo(totalWaterNeeded, true, maxBeltId),
      byprodItem,
      totalByproductRate,
      byprodLogistics: byprodItem ? getLogisticsInfo(totalByproductRate, byprodItem.isFluid, maxBeltId) : null
    };
  }

  // Official logistics entities for Divisor / Unificador / Cruzamento de Tubo
  const SPLITTER_ENTITY = {
    id: 'Build_ConveyorAttachmentSplitter_C',
    name: 'Divisor de Esteira',
    icon: 'https://satisfactory.wiki.gg/images/thumb/4/41/Conveyor_Splitter.png/256px-Conveyor_Splitter.png'
  };
  const MERGER_ENTITY = {
    id: 'Build_ConveyorAttachmentMerger_C',
    name: 'Unificador de Esteira',
    icon: 'https://satisfactory.wiki.gg/images/thumb/a/aa/Conveyor_Merger.png/256px-Conveyor_Merger.png'
  };
  const PIPE_JUNCTION_ENTITY = {
    id: 'Build_PipelineJunction_Cross_C',
    name: 'Junção de Tubulação',
    icon: 'https://satisfactory.wiki.gg/images/Pipeline_Junction.png'
  };

  function gcd(a, b) {
    let x = Math.abs(Math.round(a));
    let y = Math.abs(Math.round(b));
    while (y !== 0) {
      const t = y;
      y = x % y;
      x = t;
    }
    return Math.max(1, x);
  }

  function chooseSplitFactor(n) {
    if (n <= 1) return 1;
    if (n === 2) return 2;
    if (n === 3) return 3;
    if (n === 4) return 2;
    if (n === 6) return 3; // User's exact example: 600 -> 1 Divisor (÷3: 3x 200) -> 3 Divisores (÷2: 6x 100)
    if (n % 3 === 0) return 3;
    if (n % 2 === 0) return 2;
    return 3;
  }

  function formatCompactWireLabel(logi, rate, isFluid = false) {
    const numStr = Math.abs(rate - Math.round(rate)) < 0.05 ? String(Math.round(rate)) : rate.toFixed(1);
    const unitSuffix = isFluid ? ' m³/m' : '/m';
    if (!logi || !logi.shortTier) return `${numStr}${unitSuffix}`;
    const vShort = logi.shortTier
      .replace(/^Esteira\s+/i, '')
      .replace(/^Tubo\s+/i, '')
      .replace(/Esteira\s+/gi, '')
      .replace(/Tubo\s+/gi, '');
    return `${vShort} · ${numStr}${unitSuffix}`;
  }

  /**
   * ============================================================================
   * INFINITE CANVAS GRAPH BUILDER ("SPACES DO MAGNIFIC" LAYOUT)
   * ============================================================================
   */
  function buildCanvasFlowGraph(mode, plan, maxBeltId = 'Build_ConveyorBeltMk6_C', expandIndividual = true) {
    const columns = [];
    const connections = [];

    if (!plan) return { columns: [], connections: [], edges: [] };

    // When expandIndividual is true, show individual cards up to a high safety cap (240)
    const MAX_INDIVIDUAL_CARDS = expandIndividual ? 24 : 1;

    // -------------------------------------------------------------------------
    // CASE A: POWER GENERATION GRAPH (Mineradoras & Bombas d'Água -> Divisores -> Geradores)
    // -------------------------------------------------------------------------
    if (mode === 'power') {
      const pwr = plan;
      const fuelItem = pwr.fuelItem;
      const gen = pwr.generator;
      const totalGens = pwr.intGenerators;

      const sourceNodes = [];
      const exCount = pwr.extractorStats ? pwr.extractorStats.count : 1;
      const ratePerEx = pwr.extractorStats ? pwr.extractorStats.ratePerExtractor : pwr.totalFuelConsumed;
      const exObj = pwr.extractorStats ? pwr.extractorStats.extractor : null;
      const showIndivEx = expandIndividual && exCount <= MAX_INDIVIDUAL_CARDS;
      const exCardsCount = showIndivEx ? exCount : 1;

      for (let i = 0; i < exCardsCount; i++) {
        const cardRate = showIndivEx ? ratePerEx : (ratePerEx * exCount);
        const cardPower = pwr.extractorStats
          ? (showIndivEx ? pwr.extractorStats.powerPerExtractor : pwr.extractorStats.totalPowerMw)
          : 0;
        const nodeTitleBase = fuelItem.id === 'Desc_Water_C' ? 'Água' : `Nó de ${fuelItem.name}`;

        sourceNodes.push({
          id: `pwr_src_${i}`,
          kind: 'extractor',
          realCount: exCount,
          perMachineRate: ratePerEx,
          topLabel: showIndivEx && exCount > 1 ? `${nodeTitleBase} #${i + 1}` : nodeTitleBase,
          badgeText: !showIndivEx && exCount > 1 ? `${exCount}x` : null,
          metaRight: pwr.extractorStats
            ? `${pwr.extractorStats.clockPercent}% • ⚡ ${cardPower.toFixed(1)} MW`
            : 'Entrada Direta',
          entity: exObj || fuelItem,
          recipePill: null,
          configMeta: {
            configType: 'power_fuel_source',
            title: nodeTitleBase,
            itemId: fuelItem.id
          },
          inputsList: [],
          outputsList: [],
          resourceExtractInfo: {
            item: fuelItem,
            rate: cardRate,
            unit: fuelItem.unit
          },
          outRate: cardRate,
          item: fuelItem
        });
      }

      if (pwr.intWaterPumps > 0) {
        const waterItem = DATA.items['Desc_Water_C'];
        const waterEx = DATA.extractors['Build_WaterPump_C'];
        const showIndivPumps = expandIndividual && pwr.intWaterPumps <= MAX_INDIVIDUAL_CARDS;
        const pumpCards = showIndivPumps ? pwr.intWaterPumps : 1;
        const perPumpRate = pwr.waterRatePerPump || 120;
        const perPumpMw = pwr.powerPerWaterPump || 20;
        const pumpClock = pwr.waterPumpClock || 100;

        for (let w = 0; w < pumpCards; w++) {
          const wRate = showIndivPumps ? perPumpRate : pwr.totalWaterExtracted;
          const wPower = showIndivPumps ? perPumpMw : pwr.waterPumpPowerMw;
          sourceNodes.push({
            id: `pwr_water_${w}`,
            kind: 'extractor',
            realCount: pwr.intWaterPumps,
            perMachineRate: perPumpRate,
            topLabel: showIndivPumps && pwr.intWaterPumps > 1
              ? `Água #${w + 1}`
              : `Água`,
            badgeText: !showIndivPumps && pwr.intWaterPumps > 1 ? `${pwr.intWaterPumps}x` : null,
            metaRight: `Clock ${pumpClock}% • ⚡ ${wPower.toFixed(1)} MW`,
            entity: waterEx,
            recipePill: null,
            configMeta: {
              configType: 'power_water_pump',
              title: "Água",
              itemId: 'Desc_Water_C'
            },
            inputsList: [],
            outputsList: [],
            resourceExtractInfo: {
              item: waterItem,
              rate: wRate,
              unit: 'm³'
            },
            surplusLine: null,
            outRate: wRate,
            item: waterItem
          });
        }
      }

      columns.push({
        id: 'col_pwr_sources',
        title: '1. Extração (Mineradoras & Água)',
        nodes: sourceNodes
      });

      const showIndividualGens = expandIndividual && totalGens <= MAX_INDIVIDUAL_CARDS;
      const genNodes = [];
      const waterItemObj = DATA.items['Desc_Water_C'];

      if (showIndividualGens) {
        for (let g = 0; g < totalGens; g++) {
          const inLogi = getLogisticsInfo(pwr.fuelPerGenerator, fuelItem.isFluid, maxBeltId);
          const wLogi = pwr.waterPerGenerator > 0 ? getLogisticsInfo(pwr.waterPerGenerator, true, maxBeltId) : null;
          const inputsList = [
            {
              item: fuelItem,
              rate: pwr.fuelPerGenerator,
              unit: fuelItem.unit,
              beltText: inLogi.beltTag
            }
          ];
          if (pwr.waterPerGenerator > 0 && waterItemObj) {
            inputsList.push({
              item: waterItemObj,
              rate: pwr.waterPerGenerator,
              unit: 'm³',
              beltText: wLogi.beltTag
            });
          }

          genNodes.push({
            id: `pwr_gen_${g}`,
            kind: 'generator',
            realCount: totalGens,
            perMachineRate: pwr.fuelPerGenerator,
            topLabel: `${gen.name.toUpperCase()} #${g + 1}`,
            metaRight: `Clock ${pwr.genClock}% • ⚡ +${pwr.mwPerGenerator.toFixed(1)} MW`,
            entity: gen,
            recipePill: null,
            configMeta: {
              configType: 'power_generator',
              title: gen.name,
              generatorId: gen.id
            },
            inputsList,
            outputsList: [
              {
                item: gen,
                customName: 'Energia Gerada',
                rate: pwr.mwPerGenerator,
                unit: 'MW',
                isPower: true,
                beltText: 'Cabo Elétrico'
              }
            ],
            inRate: pwr.fuelPerGenerator,
            outRate: pwr.mwPerGenerator
          });
        }
      } else {
        const totalInLogi = getLogisticsInfo(pwr.totalFuelConsumed, fuelItem.isFluid, maxBeltId);
        const perGenLogi = getLogisticsInfo(pwr.fuelPerGenerator, fuelItem.isFluid, maxBeltId);
        const inputsList = [
          {
            item: fuelItem,
            rate: pwr.totalFuelConsumed,
            unit: fuelItem.unit,
            beltText: `${totalInLogi.beltTag} (${pwr.fuelPerGenerator.toFixed(1)}/m • ${perGenLogi.shortTier} por usina)`
          }
        ];
        if (pwr.totalWaterNeeded > 0 && waterItemObj) {
          inputsList.push({
            item: waterItemObj,
            rate: pwr.totalWaterNeeded,
            unit: 'm³',
            beltText: `${pwr.waterLogistics.beltTag} (${pwr.waterPerGenerator.toFixed(1)} m³/m cada)`
          });
        }

        genNodes.push({
          id: `pwr_gen_group`,
          kind: 'generator',
          realCount: totalGens,
          perMachineRate: pwr.fuelPerGenerator,
          topLabel: gen.name.toUpperCase(),
          badgeText: `${totalGens}x`,
          metaRight: `Clock ${pwr.genClock}% • ⚡ +${pwr.totalGrossMw.toFixed(1)} MW`,
          entity: gen,
          recipePill: null,
          configMeta: {
            configType: 'power_generator',
            title: gen.name,
            generatorId: gen.id
          },
          inputsList,
          outputsList: [
            {
              item: gen,
              customName: 'Potência Bruta Total',
              rate: pwr.totalGrossMw,
              unit: 'MW',
              isPower: true,
              beltText: 'Rede Elétrica'
            }
          ],
          inRate: pwr.totalFuelConsumed,
          outRate: pwr.totalGrossMw
        });
      }

      const fuelSourceNodes = sourceNodes.filter((n) => n.id.startsWith('pwr_src_'));
      buildSplitterColumnsBetween(
        fuelSourceNodes,
        genNodes,
        fuelItem,
        maxBeltId,
        columns,
        connections,
        'pwr_split',
        pwr.totalFuelConsumed,
        pwr.fuelPerGenerator,
        exCount,
        totalGens,
        ratePerEx,
        expandIndividual
      );

      const waterSourceNodes = sourceNodes.filter((n) => n.id.startsWith('pwr_water_'));
      if (waterSourceNodes.length > 0 && genNodes.length > 0) {
        waterSourceNodes.forEach((wn, wIdx) => {
          const targetIdx = Math.min(genNodes.length - 1, Math.floor((wIdx / waterSourceNodes.length) * genNodes.length));
          const wLogi = getLogisticsInfo(wn.outRate, true, maxBeltId);
          connections.push({
            fromNodeId: wn.id,
            toNodeId: genNodes[targetIdx].id,
            rate: wn.outRate,
            unit: 'm³',
            item: DATA.items['Desc_Water_C'],
            logistics: wLogi,
            splitLabel: formatCompactWireLabel(wLogi, wn.outRate, true)
          });
        });
      }

      columns.push({
        id: 'col_pwr_gens',
        title: `2. Geradores Inteiros (${totalGens}x)`,
        nodes: genNodes
      });

      const summaryNodeId = 'pwr_final_summary';
      const finalNodes = [
        {
          id: summaryNodeId,
          kind: 'power_emblem',
          topLabel: '⚡ ENERGIA GERADA',
          grossMw: pwr.totalGrossMw,
          netMw: pwr.netPowerMw,
          totalGens,
          genName: gen.name
        }
      ];

      columns.push({
        id: 'col_pwr_out',
        title: '3. Resultado Energético',
        nodes: finalNodes
      });

      genNodes.forEach((gn) => {
        connections.push({
          fromNodeId: gn.id,
          toNodeId: summaryNodeId,
          rate: gn.outRate,
          unit: 'MW',
          item: null,
          isPowerLine: true,
          logistics: { shortTier: 'Cabo Elétrico', wireTag: 'Cabo Elétrico' },
          splitLabel: `⚡ ${gn.outRate.toFixed(1)} MW`
        });
      });

      const edges = connections.map((c) => ({
        from: c.fromNodeId,
        to: c.toNodeId,
        label: c.splitLabel,
        isPipe: c.item ? Boolean(c.item.isFluid) : false,
        isPowerLine: Boolean(c.isPowerLine),
        isExcessLine: false
      }));

      return { columns, connections, edges };
    }

    // -------------------------------------------------------------------------
    // CASE B: PRODUCTION GRAPH (PUSH OR PULL MODE)
    // -------------------------------------------------------------------------
    const nodeGroupsByItem = {};
    const stageMetaByItem = {};

    // 1. Column 0: Raw Extractors ("Nó de [recurso]" ou "Água")
    if (plan.extractionPlan && plan.extractionPlan.length > 0) {
      const extractorNodes = [];
      plan.extractionPlan.forEach((ex) => {
        const res = ex.resource;
        if (!res) return;
        const count = Math.max(1, ex.intExtractors || 1);
        const showIndiv = expandIndividual && count <= MAX_INDIVIDUAL_CARDS && !ex.isCollectible;
        const cardsCount = showIndiv ? count : 1;
        const itemNodes = [];

        for (let i = 0; i < cardsCount; i++) {
          const nodeRate = showIndiv ? ex.ratePerExtractor : ex.totalExtracted;
          const nodePower = showIndiv ? ex.powerPerExtractor : ex.powerMw;
          const purityLabel = ex.purity === 0.5 ? 'Impuro' : ex.purity === 2.0 ? 'Puro' : 'Normal';
          const nodeId = `ext_${res.id}_${i}`;
          const baseTitle = res.id === 'Desc_Water_C' ? 'Água' : `Nó de ${res.name}`;

          const nodeObj = {
            id: nodeId,
            kind: 'extractor',
            itemId: res.id,
            realCount: count,
            perMachineRate: ex.ratePerExtractor,
            topLabel: showIndiv && count > 1 ? `${baseTitle} #${i + 1}` : baseTitle,
            badgeText: !showIndiv && count > 1 ? `${count}x` : null,
            metaRight: ex.extractor ? `${ex.clockPercent || 100}% • ⚡ ${nodePower.toFixed(1)} MW` : 'Entrada Direta',
            entity: ex.extractor || res,
            recipePill: ex.extractor && res.id !== 'Desc_Water_C' ? `Nó ${purityLabel}` : null,
            configMeta: {
              configType: 'extractor',
              mode,
              itemId: res.id,
              title: baseTitle
            },
            inputsList: [],
            outputsList: [],
            resourceExtractInfo: {
              item: res,
              rate: nodeRate,
              unit: res.unit
            },
            excessText: null,
            outRate: nodeRate,
            item: res
          };

          extractorNodes.push(nodeObj);
          itemNodes.push(nodeObj);
        }

        nodeGroupsByItem[res.id] = itemNodes;
        stageMetaByItem[res.id] = {
          realCount: count,
          perMachineOutRate: ex.ratePerExtractor,
          totalOutRate: ex.totalExtracted
        };
      });

      if (extractorNodes.length > 0) {
        columns.push({
          id: 'col_extractors',
          title: '⛏️ Nós de Recurso',
          nodes: extractorNodes
        });
      }
    }

    // 2. Stages in chronological order (from Passo 1 to Passo Final)
    (plan.stages || []).forEach((st, stIdx) => {
      const count = Math.max(1, st.intMachines || 1);
      const showIndiv = expandIndividual && count <= MAX_INDIVIDUAL_CARDS;
      const cardsCount = showIndiv ? count : 1;
      const stageMachineNodes = [];

      const outRatePerCard = showIndiv ? st.ratePerMachine : st.actualProducedRate;
      const outLogiPerCard = getLogisticsInfo(outRatePerCard, st.item.isFluid, maxBeltId);
      const perMachOutLogi = getLogisticsInfo(st.ratePerMachine, st.item.isFluid, maxBeltId);
      const pwrPerCard = showIndiv ? st.powerPerMachineMw : st.totalPowerMw;

      const cardInputsList = st.inputsConsumed.map((inp) => {
        const r = showIndiv ? inp.perMachineRate : inp.ratePerMin;
        const lg = showIndiv ? inp.perMachineLogistics : inp.logistics;
        const perMachLg = inp.perMachineLogistics || getLogisticsInfo(inp.perMachineRate, inp.item?.isFluid, maxBeltId);
        return {
          item: inp.item,
          rate: r,
          unit: inp.item?.unit || 'un',
          beltText: showIndiv
            ? lg.beltTag
            : `${lg.beltTag} (${inp.perMachineRate.toFixed(1)}/m • ${perMachLg.shortTier} cada)`
        };
      });

      const cardOutputsList = [
        {
          item: st.item,
          rate: outRatePerCard,
          unit: st.item.unit,
          beltText: showIndiv
            ? outLogiPerCard.beltTag
            : `${outLogiPerCard.beltTag} (${st.ratePerMachine.toFixed(1)}/m • ${perMachOutLogi.shortTier} cada)`
        }
      ];

      for (let m = 0; m < cardsCount; m++) {
        const nodeId = `stg_${st.itemId}_${m}`;
        stageMachineNodes.push({
          id: nodeId,
          kind: 'machine',
          stageItemId: st.itemId,
          realCount: count,
          perMachineRate: st.ratePerMachine,
          machineIndex: m + 1,
          totalStageMachines: count,
          topLabel: showIndiv
            ? `${st.machine.name.toUpperCase()} #${m + 1}`
            : st.machine.name.toUpperCase(),
          badgeText: !showIndiv && count > 1 ? `${count}x` : null,
          metaRight: `${st.clockPercent}% • ⚡ ${pwrPerCard.toFixed(1)} MW`,
          entity: st.machine,
          recipePill: st.recipe.isAlternate ? `★ ${st.recipe.cleanName}` : null,
          configMeta: {
            configType: 'stage_machine',
            mode,
            itemId: st.itemId,
            title: `${st.machine.name} — ${st.item.name}`
          },
          inputsList: cardInputsList,
          outputsList: cardOutputsList,
          excessText: null,
          inRate: st.inputsConsumed[0] ? (showIndiv ? st.inputsConsumed[0].perMachineRate : st.inputsConsumed[0].ratePerMin) : 0,
          outRate: outRatePerCard,
          item: st.item
        });
      }

      st.inputsConsumed.forEach((inp, ingIdx) => {
        const ingId = inp.item?.id;
        if (!ingId) return;
        const upstreamNodes = nodeGroupsByItem[ingId] || [];
        const upstreamMeta = stageMetaByItem[ingId] || {
          realCount: upstreamNodes.length,
          perMachineOutRate: upstreamNodes[0] ? upstreamNodes[0].outRate : inp.ratePerMin
        };
        if (upstreamNodes.length > 0) {
          buildSplitterColumnsBetween(
            upstreamNodes,
            stageMachineNodes,
            inp.item,
            maxBeltId,
            columns,
            connections,
            `split_${stIdx}_${ingIdx}`,
            inp.ratePerMin,
            inp.perMachineRate,
            upstreamMeta.realCount,
            count,
            upstreamMeta.perMachineOutRate,
            expandIndividual
          );
        }
      });

      columns.push({
        id: `col_stage_${stIdx}`,
        title: `Etapa ${stIdx + 1}: ${st.item.name} (${count}x ${st.machine.name})`,
        stageData: st,
        nodes: stageMachineNodes
      });

      nodeGroupsByItem[st.itemId] = stageMachineNodes;
      stageMetaByItem[st.itemId] = {
        realCount: count,
        perMachineOutRate: st.ratePerMachine,
        totalOutRate: st.actualProducedRate
      };

      // Registra subprodutos produzidos nesta etapa para que etapas futuras possam puxar esteira deles
      if (st.recipe && Array.isArray(st.recipe.products)) {
        st.recipe.products.forEach((p) => {
          if (p.item && p.item !== st.itemId && !nodeGroupsByItem[p.item]) {
            nodeGroupsByItem[p.item] = stageMachineNodes;
            stageMetaByItem[p.item] = {
              realCount: count,
              perMachineOutRate: (p.ratePerMin || 0) * (st.clockPercent || 100) / 100,
              totalOutRate: ((p.ratePerMin || 0) * (st.clockPercent || 100) / 100) * count
            };
          }
        });
      }
    });

    // 3. Final Output Product Card(s) — todos os produtos finais recebem destaque laranja "PRODUTO FINAL"
    if (plan.stages && plan.stages.length > 0) {
      const finalTargetStages = (Array.isArray(plan.finalTargetIds) && plan.finalTargetIds.length > 0)
        ? plan.stages.filter((s) => plan.finalTargetIds.includes(s.itemId))
        : [plan.stages[plan.stages.length - 1]];

      const finalNodes = [];
      finalTargetStages.forEach((tStage) => {
        const finalItem = tStage.item;
        const finalRate = tStage.actualProducedRate;
        const finalNodeId = `final_prod_${finalItem.id}`;

        finalNodes.push({
          id: finalNodeId,
          kind: 'final_product',
          isFinalProduct: true,
          topLabel: 'PRODUTO FINAL',
          metaRight: `${tStage.intMachines}x ${tStage.machine.name}`,
          entity: finalItem,
          recipePill: 'PRODUTO FINAL',
          configMeta: {
            configType: 'stage_machine',
            mode,
            itemId: finalItem.id,
            title: `${tStage.machine.name} — ${finalItem.name}`
          },
          inputsList: [],
          outputsList: [
            {
              item: finalItem,
              rate: finalRate,
              unit: finalItem.unit
            }
          ],
          excessText: null
        });

        const lastMachineNodes = nodeGroupsByItem[finalItem.id] || [];
        lastMachineNodes.forEach((mn) => {
          const mLogi = getLogisticsInfo(mn.outRate, finalItem.isFluid, maxBeltId);
          connections.push({
            fromNodeId: mn.id,
            toNodeId: finalNodeId,
            rate: mn.outRate,
            unit: finalItem.unit,
            item: finalItem,
            logistics: mLogi,
            splitLabel: formatCompactWireLabel(mLogi, mn.outRate, finalItem.isFluid)
          });
        });
      });

      if (finalNodes.length > 0) {
        columns.push({
          id: 'col_final_output',
          title: '🎯 Produto Final',
          nodes: finalNodes
        });
      }
    }

    const edges = connections.map((c) => ({
      from: c.fromNodeId,
      to: c.toNodeId,
      label: c.splitLabel,
      itemId: c.item ? c.item.id : null,
      rate: Number(c.rate) || 0,
      isPipe: c.item ? Boolean(c.item.isFluid) : false,
      isPowerLine: Boolean(c.isPowerLine),
      isExcessLine: false
    }));

    const graph = { columns, connections, edges };
    if (typeof window !== 'undefined' && window.Solver && typeof window.Solver.validateGraphConnections === 'function') {
      graph.validation = window.Solver.validateGraphConnections(graph);
    }
    return graph;
  }

  /**
   * Builds accurate multi-level Splitter (`Divisor ÷2`, `Divisor ÷3`) and Merger (`Unificador 2➔1`, `Unificador 3➔1`)
   * columns between `sourceNodes` and `targetNodes` using the REAL machine counts (`realS`, `realT`)
   * and strictly respecting the 1200/min belt cap (600 m³/min pipe cap).
   */
  function buildSplitterColumnsBetween(
    sourceNodes,
    targetNodes,
    item,
    maxBeltId,
    columns,
    connections,
    idPrefix,
    totalStageFlow = null,
    perTargetMachineRate = null,
    realSourceCount = null,
    realTargetCount = null,
    perSourceMachineRate = null,
    expandIndividual = true
  ) {
    const S_cards = sourceNodes.length;
    const T_cards = targetNodes.length;
    if (S_cards === 0 || T_cards === 0) return;

    const isFluid = item ? Boolean(item.isFluid) : false;
    const unit = item ? item.unit : 'un';
    const maxSingleCap = isFluid ? 600 : 1200;

    const S_real = Math.max(1, Math.round(realSourceCount || sourceNodes[0].realCount || S_cards));
    const T_real = Math.max(1, Math.round(realTargetCount || targetNodes[0].realCount || T_cards));
    const tgtRate = perTargetMachineRate || targetNodes[0].perMachineRate || targetNodes[0].inRate || 30;
    const srcRate = perSourceMachineRate || sourceNodes[0].perMachineRate || sourceNodes[0].outRate || (tgtRate * T_real / S_real);
    const totalFlow = Math.max(totalStageFlow || (T_real * tgtRate), S_real * srcRate);

    const splitterEntity = isFluid ? PIPE_JUNCTION_ENTITY : SPLITTER_ENTITY;
    const mergerEntity = isFluid ? PIPE_JUNCTION_ENTITY : MERGER_ENTITY;

    // -------------------------------------------------------------------------
    // 0. Modo resumido (Todas as Máquinas: NÃO): exibe divisores/unificadores/junções
    //    agrupados em 1 card com selo ×N quando S_real > 1 ou T_real > 1
    // -------------------------------------------------------------------------
    if (!expandIndividual && S_cards === 1 && T_cards === 1) {
      const logi = getLogisticsInfo(totalFlow, isFluid, maxBeltId);
      const wireLabel = formatCompactWireLabel(logi, totalFlow, isFluid);
      const needMerger = S_real > 1 && S_real !== T_real;
      const needSplitter = T_real > 1 && S_real !== T_real;

      if (!needMerger && !needSplitter) {
        connections.push({
          fromNodeId: sourceNodes[0].id,
          toNodeId: targetNodes[0].id,
          rate: totalFlow,
          unit,
          item,
          logistics: logi,
          splitLabel: wireLabel
        });
        return;
      }

      let prevId = sourceNodes[0].id;
      const splitterOutPorts = isFluid ? (DATA.logistics?.Build_PipelineJunction_Cross_C?.outPorts || 2) : (DATA.logistics?.Build_ConveyorAttachmentSplitter_C?.outPorts || 3);
      const mergerInPorts = isFluid ? (DATA.logistics?.Build_PipelineJunction_Cross_C?.inPorts || 2) : (DATA.logistics?.Build_ConveyorAttachmentMerger_C?.inPorts || 3);

      if (needMerger) {
        const mCount = Math.max(1, Math.ceil((S_real - 1) / Math.max(1, mergerInPorts - 1)));
        const mId = `${idPrefix}_grp_merger`;
        const mNode = {
          id: mId,
          kind: isFluid ? 'pipe_junction' : 'merger',
          topLabel: isFluid ? 'Junção de Tubulação' : 'Unificador',
          badgeText: `×${mCount}`,
          entity: mergerEntity,
          inputsList: [{ item, rate: totalFlow, unit }],
          outputsList: [{ item, rate: totalFlow, unit }],
          outRate: totalFlow,
          accent: isFluid ? '#2563EB' : '#EA580C'
        };
        columns.push({ id: `col_${mId}`, title: mNode.topLabel, nodes: [mNode] });
        connections.push({ fromNodeId: prevId, toNodeId: mId, rate: totalFlow, unit, item, logistics: logi, splitLabel: wireLabel });
        prevId = mId;
      }

      if (needSplitter) {
        const sCount = Math.max(1, Math.ceil((T_real - 1) / Math.max(1, splitterOutPorts - 1)));
        const sId = `${idPrefix}_grp_splitter`;
        const sNode = {
          id: sId,
          kind: isFluid ? 'pipe_junction' : 'splitter',
          topLabel: isFluid ? 'Junção de Tubulação' : 'Divisor',
          badgeText: `×${sCount}`,
          entity: splitterEntity,
          inputsList: [{ item, rate: totalFlow, unit }],
          outputsList: [{ item, rate: totalFlow, unit }],
          outRate: totalFlow,
          accent: isFluid ? '#2563EB' : '#EA580C'
        };
        columns.push({ id: `col_${sId}`, title: sNode.topLabel, nodes: [sNode] });
        connections.push({ fromNodeId: prevId, toNodeId: sId, rate: totalFlow, unit, item, logistics: logi, splitLabel: wireLabel });
        prevId = sId;
      }

      connections.push({ fromNodeId: prevId, toNodeId: targetNodes[0].id, rate: totalFlow, unit, item, logistics: logi, splitLabel: wireLabel });
      return;
    }

    // -------------------------------------------------------------------------
    // 1. Direct 1-to-1 connection when S_real === T_real
    // -------------------------------------------------------------------------
    if (S_real === T_real) {
      if (S_cards === T_cards) {
        for (let i = 0; i < S_cards; i++) {
          const r = S_cards === 1 ? totalFlow : Math.max(tgtRate, srcRate);
          const logi = getLogisticsInfo(r, isFluid, maxBeltId);
          connections.push({
            fromNodeId: sourceNodes[i].id,
            toNodeId: targetNodes[i].id,
            rate: r,
            unit,
            item,
            logistics: logi,
            splitLabel: formatCompactWireLabel(logi, r, isFluid)
          });
        }
      } else {
        sourceNodes.forEach((sNode, idx) => {
          const tNode = targetNodes[Math.min(T_cards - 1, idx)];
          const logi = getLogisticsInfo(sNode.outRate, isFluid, maxBeltId);
          connections.push({
            fromNodeId: sNode.id,
            toNodeId: tNode.id,
            rate: sNode.outRate,
            unit,
            item,
            logistics: logi,
            splitLabel: formatCompactWireLabel(logi, sNode.outRate, isFluid)
          });
        });
      }
      return;
    }

    // -------------------------------------------------------------------------
    // 2.Compute exact Splitter / Merger stages from (S_real -> T_real)
    // -------------------------------------------------------------------------
    let g = gcd(S_real, T_real);
    let sSub = Math.round(S_real / g);
    let tSub = Math.round(T_real / g);

    // If sSub > 1 and merging sSub sources into 1 belt would exceed 1200/min, keep parallel trunks!
    while (sSub > 1 && (sSub * srcRate) > maxSingleCap + 1e-6) {
      if (sSub % 2 === 0 && tSub % 2 === 0) {
        sSub /= 2;
        tSub /= 2;
        g *= 2;
      } else {
        break;
      }
    }

    // Build level specifications for 1 trunk group (`sSub` sources -> `tSub` targets)
    // Each level has: { kind: 'splitter'|'merger', factor, countPerGroup, totalCount, inRatePerUnit, outRatePerBranch }
    const levelsSpec = [];

    if (sSub === 1 && tSub > 1) {
      // Pure Splitter Tree! (e.g. 1 Miner (600/m) -> 6 Machines (100/m): Level 1 = 1x ÷3 (200/m), Level 2 = 3x ÷2 (100/m))
      let rem = tSub;
      let currInRate = totalFlow / g;
      let branchesInGroup = 1;
      let guard = 0;
      while (rem > 1 && guard < 6) {
        guard++;
        const f = chooseSplitFactor(rem);
        const outRate = currInRate / f;
        levelsSpec.push({
          kind: 'splitter',
          factor: f,
          countPerGroup: branchesInGroup,
          totalCount: g * branchesInGroup,
          inRate: currInRate,
          outRate
        });
        branchesInGroup *= f;
        currInRate = outRate;
        rem = Math.ceil(rem / f);
      }
    } else if (tSub === 1 && sSub > 1) {
      // Pure Merger Tree! (only when combined rate <= 1200/min)
      let rem = sSub;
      let currInRate = srcRate;
      let guard = 0;
      while (rem > 1 && guard < 5) {
        guard++;
        const f = chooseSplitFactor(rem);
        const nextStreams = Math.ceil(rem / f);
        const outRate = Math.min(maxSingleCap, currInRate * f);
        levelsSpec.push({
          kind: 'merger',
          factor: f,
          countPerGroup: nextStreams,
          totalCount: g * nextStreams,
          inRate: currInRate,
          outRate
        });
        currInRate = outRate;
        rem = nextStreams;
      }
    } else {
      // General ratio (sSub sources -> tSub targets, e.g. 48 Construtors @ 37.5/m -> 180 Construtors @ 10/m: g=12 groups of 4 -> 15)
      const groupFlow = (sSub * srcRate);
      if (sSub > 1 && groupFlow <= maxSingleCap + 1e-6) {
        // First merge sSub sources into 1 trunk belt of `groupFlow`
        let remS = sSub;
        let currIn = srcRate;
        let guard = 0;
        while (remS > 1 && guard < 4) {
          guard++;
          const f = chooseSplitFactor(remS);
          const nextStreams = Math.ceil(remS / f);
          const outR = currIn * f;
          levelsSpec.push({
            kind: 'merger',
            factor: f,
            countPerGroup: nextStreams,
            totalCount: g * nextStreams,
            inRate: currIn,
            outRate: outR
          });
          currIn = outR;
          remS = nextStreams;
        }
        // Then split the trunk belt into `tSub` target machines
        let remT = tSub;
        let currSplitIn = groupFlow;
        let branches = 1;
        guard = 0;
        while (remT > 1 && guard < 5) {
          guard++;
          const f = chooseSplitFactor(remT);
          const outR = currSplitIn / f;
          levelsSpec.push({
            kind: 'splitter',
            factor: f,
            countPerGroup: branches,
            totalCount: g * branches,
            inRate: currSplitIn,
            outRate: outR
          });
          branches *= f;
          currSplitIn = outR;
          remT = Math.ceil(remT / f);
        }
      } else if (T_real > S_real) {
        // GroupFlow > 1200/min: split each source directly without merging beyond 1200/min
        const avgTargetsPerSource = Math.max(2, Math.ceil(T_real / S_real));
        let rem = avgTargetsPerSource;
        let currIn = srcRate;
        let branches = 1;
        let guard = 0;
        while (rem > 1 && guard < 5) {
          guard++;
          const f = chooseSplitFactor(rem);
          const outR = currIn / f;
          levelsSpec.push({
            kind: 'splitter',
            factor: f,
            countPerGroup: branches,
            totalCount: S_real * branches,
            inRate: currIn,
            outRate: outR
          });
          branches *= f;
          currIn = outR;
          rem = Math.ceil(rem / f);
        }
      }
    }

    if (levelsSpec.length === 0) {
      // Fallback direct connection
      sourceNodes.forEach((sNode, idx) => {
        const tNode = targetNodes[Math.min(T_cards - 1, idx)];
        const logi = getLogisticsInfo(sNode.outRate, isFluid, maxBeltId);
        connections.push({
          fromNodeId: sNode.id,
          toNodeId: tNode.id,
          rate: sNode.outRate,
          unit,
          item,
          logistics: logi,
          splitLabel: formatCompactWireLabel(logi, sNode.outRate, isFluid)
        });
      });
      return;
    }

    // -------------------------------------------------------------------------
    // 3. Instantiate columns for each splitter/merger level
    // -------------------------------------------------------------------------
    let prevColNodes = sourceNodes;

    levelsSpec.forEach((lvl, lvlIdx) => {
      const isSplitter = lvl.kind === 'splitter';
      const showIndivLvl = expandIndividual && lvl.totalCount <= 24 && (S_cards > 1 || T_cards > 1);
      const cardsInCol = showIndivLvl ? lvl.totalCount : 1;
      const colNodes = [];

      const inLogi = getLogisticsInfo(lvl.inRate, isFluid, maxBeltId);
      const outLogi = getLogisticsInfo(lvl.outRate, isFluid, maxBeltId);

      for (let c = 0; c < cardsInCol; c++) {
        const nodeId = `${idPrefix}_lvl${lvlIdx}_${c}`;
        const numberSuffix = showIndivLvl && lvl.totalCount > 1 ? ` #${c + 1}` : '';

        if (isSplitter) {
          colNodes.push({
            id: nodeId,
            kind: 'splitter',
            entity: splitterEntity,
            topLabel: `DIVISOR (÷${lvl.factor})${numberSuffix}`,
            badgeText: !showIndivLvl && lvl.totalCount > 1 ? `${lvl.totalCount}x` : null,
            recipePill: null,
            metaRight: null,
            inputsList: [
              {
                item,
                rate: lvl.inRate,
                unit
              }
            ],
            outputsList: [
              {
                item,
                rate: lvl.outRate,
                unit
              }
            ],
            inRate: lvl.inRate,
            outRate: lvl.outRate,
            item
          });
        } else {
          colNodes.push({
            id: nodeId,
            kind: 'merger',
            entity: mergerEntity,
            topLabel: `UNIFICADOR (${lvl.factor}➔1)${numberSuffix}`,
            badgeText: !showIndivLvl && lvl.totalCount > 1 ? `${lvl.totalCount}x` : null,
            recipePill: null,
            metaRight: null,
            inputsList: [
              {
                item,
                rate: lvl.inRate,
                unit
              }
            ],
            outputsList: [
              {
                item,
                rate: lvl.outRate,
                unit
              }
            ],
            inRate: lvl.inRate,
            outRate: lvl.outRate,
            item
          });
        }
      }

      // Connect `prevColNodes` -> `colNodes`
      const P = prevColNodes.length;
      const C = colNodes.length;
      if (C >= P) {
        for (let cIdx = 0; cIdx < C; cIdx++) {
          const pIdx = Math.min(P - 1, Math.floor((cIdx * P) / C));
          const wireRate = showIndivLvl ? lvl.inRate : totalFlow;
          const wLogi = getLogisticsInfo(lvl.inRate, isFluid, maxBeltId);
          connections.push({
            fromNodeId: prevColNodes[pIdx].id,
            toNodeId: colNodes[cIdx].id,
            rate: wireRate,
            unit,
            item,
            logistics: wLogi,
            splitLabel: showIndivLvl
              ? formatCompactWireLabel(wLogi, lvl.inRate, isFluid)
              : formatCompactWireLabel(wLogi, lvl.totalCount * lvl.inRate, isFluid)
          });
        }
      } else {
        for (let pIdx = 0; pIdx < P; pIdx++) {
          const cIdx = Math.min(C - 1, Math.floor((pIdx * C) / P));
          const wLogi = getLogisticsInfo(lvl.inRate, isFluid, maxBeltId);
          connections.push({
            fromNodeId: prevColNodes[pIdx].id,
            toNodeId: colNodes[cIdx].id,
            rate: lvl.inRate,
            unit,
            item,
            logistics: wLogi,
            splitLabel: formatCompactWireLabel(wLogi, lvl.inRate, isFluid)
          });
        }
      }

      const stepTitle = isSplitter
        ? `🔀 ${lvlIdx + 1}º Nível Divisor (${lvl.totalCount}x ÷${lvl.factor})`
        : `🔗 ${lvlIdx + 1}º Nível Unificador (${lvl.totalCount}x ${lvl.factor}➔1)`;

      columns.push({
        id: `col_${idPrefix}_lvl_${lvlIdx}`,
        title: stepTitle,
        nodes: colNodes
      });

      prevColNodes = colNodes;
    });

    // Connect last logistics column (`prevColNodes`) -> `targetNodes`
    const P_last = prevColNodes.length;
    const lastLvl = levelsSpec[levelsSpec.length - 1];
    const finalBranchRate = lastLvl ? lastLvl.outRate : tgtRate;
    const finalBranchLogi = getLogisticsInfo(finalBranchRate, isFluid, maxBeltId);

    if (T_cards >= P_last) {
      for (let tIdx = 0; tIdx < T_cards; tIdx++) {
        const pIdx = Math.min(P_last - 1, Math.floor((tIdx * P_last) / T_cards));
        connections.push({
          fromNodeId: prevColNodes[pIdx].id,
          toNodeId: targetNodes[tIdx].id,
          rate: finalBranchRate,
          unit,
          item,
          logistics: finalBranchLogi,
          splitLabel: T_cards > 1
            ? formatCompactWireLabel(finalBranchLogi, finalBranchRate, isFluid)
            : formatCompactWireLabel(finalBranchLogi, T_real * finalBranchRate, isFluid)
        });
      }
    } else {
      for (let pIdx = 0; pIdx < P_last; pIdx++) {
        const tIdx = Math.min(T_cards - 1, Math.floor((pIdx * T_cards) / P_last));
        connections.push({
          fromNodeId: prevColNodes[pIdx].id,
          toNodeId: targetNodes[tIdx].id,
          rate: finalBranchRate,
          unit,
          item,
          logistics: finalBranchLogi,
          splitLabel: formatCompactWireLabel(finalBranchLogi, finalBranchRate, isFluid)
        });
      }
    }
  }

  // Helper converters for AppState <-> SatisfactorySolver
  const PURITY_MAP = { impure: 0.5, normal: 1.0, pure: 2.0 };
  const MINER_MARK_MAP = {
    mk1: 'Build_MinerMk1_C',
    mk2: 'Build_MinerMk2_C',
    mk3: 'Build_MinerMk3_C'
  };

  function normalizeText(str) {
    if (!str) return '';
    return String(str)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function getExtractorIdForResource(itemId, minerMark = 'mk1') {
    if (itemId === 'Desc_Water_C') return 'Build_WaterPump_C';
    if (itemId === 'Desc_LiquidOil_C') return 'Build_OilPump_C';
    if (itemId === 'Desc_NitrogenGas_C') return 'Build_FrackingExtractor_C';
    return MINER_MARK_MAP[minerMark] || 'Build_MinerMk1_C';
  }

  function computeInputRate(inp) {
    if (!inp) return 0;
    const item = DATA.items[inp.itemId];
    if (!item) return 0;
    if (inp.mode === 'extractor' && item.isRawResource) {
      const exId = getExtractorIdForResource(inp.itemId, inp.minerMark || 'mk1');
      const purityMult = PURITY_MAP[inp.purity] || 1.0;
      const stats = computeExtractorStats(exId, purityMult, inp.clockPercent || 100, inp.extractorCount || 1);
      return stats ? stats.totalRate : 60;
    }
    return Number(inp.rate) || 60;
  }

  function buildStepModifiersFromSettings(stepSettings = {}) {
    const mods = {};
    Object.entries(stepSettings || {}).forEach(([itemId, cfg]) => {
      mods[itemId] = {
        clock: cfg.clockPercent || cfg.clock || 100,
        sloops: cfg.sloops || 0,
        manualMachines: cfg.customMachineCount || cfg.manualMachines || null
      };
    });
    return mods;
  }

  function mapStageForUI(st) {
    return {
      ...st,
      machineCount: st.intMachines,
      outputRate: st.actualProducedRate,
      availableRecipes: (st.availableRecipes || []).map((r) => ({
        ...r,
        producedIn: r.machine
      }))
    };
  }

  window.SatisfactorySolver = {
    recipesByProduct,
    recipesByIngredient,
    defaultRecipeForItem,
    getRecipesForItem,
    getChosenRecipeId,
    getLogisticsInfo,
    computeMachineStats,
    computeExtractorStats,
    solvePullInteger,
    solvePushInteger,
    discoverCraftableItems,
    solvePowerGeneration,
    buildCanvasFlowGraph
  };

  // Unified `window.Solver` API used by `js/app.js`
  window.Solver = {
    indexes: {
      recipesByProduct: {
        get: (itemId) => getRecipesForItem(itemId)
      }
    },

    getChosenRecipeId,

    getAllItems() {
      return Object.values(DATA.items).filter((it) => it.category !== 'FICSMAS');
    },

    getItem(itemId) {
      return DATA.items[itemId] || null;
    },

    getMachine(machineId) {
      const m = DATA.machines[machineId] || DATA.extractors[machineId] || DATA.generators[machineId] || null;
      if (!m) return null;
      const powerConsumption = m.isVariablePower
        ? ((Number(m.estMinPowerMw) || 0) + (Number(m.estMaxPowerMw) || 0)) / 2
        : (Number(m.basePowerMw) || 0);
      return {
        ...m,
        powerConsumption
      };
    },

    getPowerGenerators() {
      return Object.values(DATA.generators).map((g) => ({
        ...g,
        powerProduction: g.powerProductionMw,
        fuels: (g.fuels || []).map((f) => ({
          ...f,
          itemId: f.item
        }))
      }));
    },

    isRawResource(itemId) {
      const it = DATA.items[itemId];
      return Boolean(it && it.isRawResource);
    },

    normalizeText,

    computeInputRate,

    getRecommendedTransport(itemId, ratePerMin) {
      const it = DATA.items[itemId];
      const info = getLogisticsInfo(ratePerMin, it ? it.isFluid : false);
      return {
        ...info,
        singleTransport: {
          name: info.minTier ? info.minTier.name : info.shortTier,
          shortName: info.shortTier,
          ratePerMin: info.totalCapacity
        }
      };
    },

    discoverFromInputs(inputs, recipeOverrides = {}, stepSettings = {}) {
      const availableInputs = {};
      (inputs || []).forEach((inp) => {
        const r = computeInputRate(inp);
        availableInputs[inp.itemId] = (availableInputs[inp.itemId] || 0) + r;
      });
      const stepModifiers = buildStepModifiersFromSettings(stepSettings);
      const res = discoverCraftableItems(availableInputs, recipeOverrides, stepModifiers);
      return {
        craftableNow: (res.fullySupported || []).map((x) => ({
          item: x.item,
          maxOutputRate: x.maxRate,
          machinesBuilt: x.machinesBuilt,
          powerMw: x.powerMw
        })),
        almostCraftable: (res.needsOneCompanion || []).map((x) => ({
          item: x.item,
          maxOutputRate: x.potentialRate,
          missingRaw: x.missingInput ? [x.missingInput] : []
        }))
      };
    },

    calculatePushChain(inputs, targetItemId, recipeOverrides = {}, stepSettings = {}) {
      const availableInputs = {};
      const calculatedInputs = [];
      (inputs || []).forEach((inp) => {
        const item = DATA.items[inp.itemId];
        if (!item) return;
        const rate = computeInputRate(inp);
        availableInputs[inp.itemId] = (availableInputs[inp.itemId] || 0) + rate;

        if (inp.mode === 'extractor' && item.isRawResource) {
          const exId = getExtractorIdForResource(inp.itemId, inp.minerMark || 'mk1');
          const purityMult = PURITY_MAP[inp.purity] || 1.0;
          const exStats = computeExtractorStats(exId, purityMult, inp.clockPercent || 100, inp.extractorCount || 1);
          calculatedInputs.push({
            item,
            rate,
            isDirect: false,
            extractor: exStats ? exStats.extractor : null,
            ratePerNode: exStats ? exStats.ratePerExtractor : rate,
            intCount: exStats ? exStats.count : 1,
            powerMw: exStats ? exStats.totalPowerMw : 0,
            inp: {
              purity: purityMult,
              clock: inp.clockPercent || 100
            }
          });
        } else {
          calculatedInputs.push({
            item,
            rate,
            isDirect: true,
            extractor: null,
            ratePerNode: rate,
            intCount: 1,
            powerMw: 0,
            inp: { purity: 1.0, clock: 100 }
          });
        }
      });

      const stepModifiers = buildStepModifiersFromSettings(stepSettings);
      const rawPlan = solvePushInteger({
        availableInputs,
        calculatedInputs,
        targetItemId,
        recipeOverrides,
        stepModifiers
      });
      if (!rawPlan || rawPlan.notConnected) return null;

      const totalExtractionPowerMw = (rawPlan.extractionPlan || []).reduce((acc, ex) => acc + (ex.powerMw || 0), 0);
      const totalFactoryPowerMw = rawPlan.summary?.totalFactoryPowerMw || 0;
      const totalPowerMw = totalFactoryPowerMw + totalExtractionPowerMw;

      return {
        ...rawPlan,
        finalTargetIds: targetItemId ? [targetItemId] : [],
        outputRate: rawPlan.finalOutputRate,
        totalPowerMw,
        summary: {
          ...rawPlan.summary,
          totalExtractionPowerMw,
          grandTotalPowerMw: totalPowerMw
        },
        steps: (rawPlan.stages || []).map(mapStageForUI)
      };
    },

    getProductionMachines() {
      return Object.values(DATA.machines).map((m) => ({
        ...m,
        powerConsumption: m.isVariablePower
          ? ((Number(m.estMinPowerMw) || 0) + (Number(m.estMaxPowerMw) || 0)) / 2
          : (Number(m.basePowerMw) || 0)
      }));
    },

    getExtractors() {
      return Object.values(DATA.extractors).map((ex) => ({
        ...ex,
        powerConsumption: Number(ex.basePowerMw) || 0
      }));
    },

    getBeltsAndPipes() {
      return {
        belts: DATA.belts || [],
        pipes: DATA.pipes || []
      };
    },

    getRecipesByMachine(machineId) {
      return Object.values(DATA.recipes)
        .filter((r) => r.machine === machineId && !r.isFicsmas)
        .map((r) => ({
          ...r,
          cleanName: r.cleanName || r.name,
          producedIn: r.machine
        }));
    },

    getRecipe(recipeId) {
      const r = DATA.recipes[recipeId];
      if (!r) return null;
      return {
        ...r,
        cleanName: r.cleanName || r.name,
        producedIn: r.machine
      };
    },

    solveProductionChain({ targets = [], availableInputs = [], recipeOverrides = {}, stepSettings = {}, minerSettings = {} }) {
      const formattedTargets = (targets || []).map((t) => ({
        item: t.itemId || t.item,
        rate: Number(t.rate) || 10
      }));
      const stepModifiers = buildStepModifiersFromSettings(stepSettings);

      const rawPlan = solvePullInteger({
        targets: formattedTargets,
        recipeOverrides,
        stepModifiers
      });
      if (!rawPlan) return null;

      // Apply per-resource minerSettings (`v.1`/`v.2`/`v.3`, purity, clockPercent, customCount) for ALL extractors including Water & Oil!
      const updatedExtractionPlan = (rawPlan.extractionPlan || []).map((ex) => {
        const resId = ex.resource?.id;
        const mCfg = (resId && minerSettings[resId]) || { minerMark: 'mk2', purity: 'normal', clockPercent: 100, customCount: null };
        if (resId && ex.resource.isRawResource && !ex.isCollectible) {
          const exId = getExtractorIdForResource(resId, mCfg.minerMark || 'mk2');
          const purityMult = resId === 'Desc_Water_C' ? 1.0 : (PURITY_MAP[mCfg.purity] || 1.0);
          const clockPct = Math.max(1, Math.min(250, Number(mCfg.clockPercent) || 100));
          const unitEx = computeExtractorStats(exId, purityMult, clockPct, 1);
          if (unitEx) {
            const autoCount = Math.max(1, Math.ceil((ex.rateNeeded / unitEx.ratePerExtractor) - 1e-6));
            const intExtractors = (mCfg.customCount && mCfg.customCount >= 1) ? Math.round(mCfg.customCount) : autoCount;
            const totalExtracted = intExtractors * unitEx.ratePerExtractor;
            return {
              ...ex,
              extractor: unitEx.extractor,
              purity: purityMult,
              clockPercent: clockPct,
              ratePerExtractor: unitEx.ratePerExtractor,
              powerPerExtractor: unitEx.powerPerExtractor,
              intExtractors,
              autoExtractors: autoCount,
              totalExtracted,
              excessExtracted: Math.max(0, totalExtracted - ex.rateNeeded),
              powerMw: intExtractors * unitEx.powerPerExtractor,
              minerCfg: { ...mCfg, clockPercent: clockPct }
            };
          }
        }
        return { ...ex, minerCfg: mCfg };
      });

      rawPlan.extractionPlan = updatedExtractionPlan;

      const totalExtractionPowerMw = updatedExtractionPlan.reduce((acc, ex) => acc + (ex.powerMw || 0), 0);
      const totalExtractorsBuilt = updatedExtractionPlan.reduce((acc, ex) => acc + (ex.intExtractors || 0), 0);
      const totalFactoryPowerMw = rawPlan.summary?.totalFactoryPowerMw || 0;
      const totalPowerMw = totalFactoryPowerMw + totalExtractionPowerMw;

      return {
        ...rawPlan,
        finalTargetIds: formattedTargets.map((t) => t.item).filter(Boolean),
        totalPowerMw,
        summary: {
          ...rawPlan.summary,
          totalExtractorsBuilt,
          totalExtractionPowerMw,
          grandTotalPowerMw: totalPowerMw
        },
        steps: (rawPlan.stages || []).map(mapStageForUI),
        rawResources: updatedExtractionPlan.map((ex) => ({
          itemId: ex.resource.id,
          item: ex.resource,
          requiredRate: ex.rateNeeded,
          totalExtracted: ex.totalExtracted,
          ratePerExtractor: ex.ratePerExtractor,
          powerMw: ex.powerMw,
          minerCfg: ex.minerCfg || { minerMark: 'mk2', purity: 'normal', clockPercent: 100 },
          extractorPlan: {
            machineCount: ex.intExtractors,
            extractor: ex.extractor || ex.resource
          }
        }))
      };
    },

    calculatePowerPlan(cfg) {
      const modeMap = {
        by_fuel: 'from_fuel',
        by_mw: 'from_mw',
        by_generators: 'from_generators'
      };
      let extractorStats = null;
      if (cfg.fuelItemId && DATA.items[cfg.fuelItemId]?.isRawResource) {
        const exId = getExtractorIdForResource(cfg.fuelItemId, cfg.minerMark || 'mk2');
        const purityMult = PURITY_MAP[cfg.purity] || 1.0;
        extractorStats = computeExtractorStats(exId, purityMult, cfg.minerClock || 100, cfg.minerCount || 1);
      }

      const pwr = solvePowerGeneration({
        calcMode: modeMap[cfg.calcMode] || 'from_fuel',
        generatorId: cfg.generatorId,
        fuelItemId: cfg.fuelItemId,
        fuelRateAvailable: cfg.availableFuelRate,
        targetMw: cfg.targetMW,
        targetGenerators: cfg.generatorCount,
        manualGenerators: cfg.manualGenerators || null,
        genClock: cfg.clockPercent || 100,
        waterExtractorClock: cfg.waterExtractorClock || 100,
        manualWaterPumps: cfg.manualWaterPumps || null,
        extractorStats
      });
      if (!pwr) return null;

      return {
        ...pwr,
        totalMW: pwr.totalGrossMw,
        generatorCount: pwr.intGenerators
      };
    },

    buildCanvasFlowGraph(mode, plan, opts = {}) {
      const expandIndividual = opts && typeof opts.showAllMachines === 'boolean' ? opts.showAllMachines : true;
      return buildCanvasFlowGraph(mode, plan, 'Build_ConveyorBeltMk6_C', expandIndividual);
    },

    /**
     * ========================================================================
     * MODO 4: CONSTRUÇÃO LIVRE (SANDBOX + CHECK)
     * ========================================================================
     * Computes the exact rates of a single user-placed block in Free Mode.
     */
    computeFreeBlockStats(block) {
      if (!block) return null;
      const count = Math.max(1, Math.round(Number(block.count) || 1));
      const clock = Math.max(1, Math.min(250, Number(block.clockPercent) || 100));
      const beltTierId = block.beltTierId || 'Build_ConveyorBeltMk3_C';
      const pipeTierId = block.pipeTierId || 'Build_Pipeline_C';
      const chosenBelt = (DATA.belts || []).find((b) => b.id === beltTierId) || DATA.belts[2] || DATA.belts[0];
      const chosenPipe = (DATA.pipes || []).find((p) => p.id === pipeTierId) || DATA.pipes[0];

      if (block.blockType === 'extractor') {
        const item = DATA.items[block.itemId] || DATA.items['Desc_OreIron_C'];
        const exId = block.extractorId || getExtractorIdForResource(item.id, block.minerMark || 'mk2');
        const purityMult = item.id === 'Desc_Water_C' ? 1.0 : (PURITY_MAP[block.purity] || 1.0);
        const stats = computeExtractorStats(exId, purityMult, clock, count);
        const transportUsed = item.isFluid ? chosenPipe : chosenBelt;
        const idealLogi = getLogisticsInfo(stats.ratePerExtractor, item.isFluid);

        const purityLabels = { impure: 'Nó Impuro', normal: 'Nó Normal', pure: 'Nó Puro' };
        const puritySub = item.id === 'Desc_Water_C' ? 'Extração de Água' : (purityLabels[block.purity] || 'Nó Normal');
        const nodeTitle = item.id === 'Desc_Water_C' ? 'Água' : `Nó de ${item.name}`;

        return {
          blockId: block.id,
          blockType: 'extractor',
          entity: stats.extractor || item,
          title: nodeTitle,
          subtitle: puritySub,
          count,
          clockPercent: clock,
          powerPerMachineMw: stats.powerPerExtractor,
          totalPowerMw: stats.totalPowerMw,
          powerProducedMw: 0,
          transportUsed,
          inputs: [],
          outputs: [
            {
              item,
              perMachineRate: stats.ratePerExtractor,
              totalRate: stats.totalRate,
              unit: item.unit,
              transportUsed,
              idealLogi
            }
          ]
        };
      }

      if (block.blockType === 'machine') {
        const machine = DATA.machines[block.machineId] || Object.values(DATA.machines)[0];
        const machineRecipes = Object.values(DATA.recipes).filter((r) => r.machine === machine.id && !r.isFicsmas);
        const recipe = DATA.recipes[block.recipeId] || machineRecipes[0];
        if (!recipe) return null;

        const mStats = computeMachineStats(recipe, clock, block.sloops || 0);
        const inputs = (recipe.ingredients || []).map((ing) => {
          const itemObj = DATA.items[ing.item];
          const perMachineRate = ing.ratePerMin * mStats.inputMult;
          const tUsed = itemObj?.isFluid ? chosenPipe : chosenBelt;
          const idealLogi = getLogisticsInfo(perMachineRate, itemObj?.isFluid);
          return {
            item: itemObj,
            perMachineRate,
            totalRate: perMachineRate * count,
            unit: itemObj?.unit || 'un',
            transportUsed: tUsed,
            idealLogi
          };
        });
        const outputs = (recipe.products || []).map((prod) => {
          const itemObj = DATA.items[prod.item];
          const perMachineRate = prod.ratePerMin * mStats.outputMult;
          const tUsed = itemObj?.isFluid ? chosenPipe : chosenBelt;
          const idealLogi = getLogisticsInfo(perMachineRate, itemObj?.isFluid);
          return {
            item: itemObj,
            perMachineRate,
            totalRate: perMachineRate * count,
            unit: itemObj?.unit || 'un',
            transportUsed: tUsed,
            idealLogi
          };
        });

        const rName = recipe.cleanName || recipe.name;
        return {
          blockId: block.id,
          blockType: 'machine',
          entity: machine,
          recipe,
          cleanRecipeName: rName,
          title: machine.name,
          subtitle: rName,
          count,
          clockPercent: clock,
          sloops: mStats.sloops,
          powerPerMachineMw: mStats.avgMwPerMachine,
          totalPowerMw: mStats.avgMwPerMachine * count,
          powerProducedMw: 0,
          transportUsed: chosenBelt,
          inputs,
          outputs
        };
      }

      if (block.blockType === 'generator') {
        const gen = DATA.generators[block.generatorId] || DATA.generators['Build_GeneratorCoal_C'];
        const fuelEntry = gen.fuels.find((f) => f.item === block.fuelItemId) || gen.fuels[0];
        const fuelItem = DATA.items[fuelEntry.item];
        const ratio = clock / 100.0;
        const fuelPerGen = fuelEntry.ratePerMin * ratio;
        const waterPerGen = (fuelEntry.waterPerMin || 0) * ratio;
        const mwPerGen = gen.powerProductionMw * ratio;

        const inputs = [
          {
            item: fuelItem,
            perMachineRate: fuelPerGen,
            totalRate: fuelPerGen * count,
            unit: fuelItem?.unit || 'un',
            transportUsed: fuelItem?.isFluid ? chosenPipe : chosenBelt,
            idealLogi: getLogisticsInfo(fuelPerGen, fuelItem?.isFluid)
          }
        ];
        if (waterPerGen > 0 && DATA.items['Desc_Water_C']) {
          inputs.push({
            item: DATA.items['Desc_Water_C'],
            perMachineRate: waterPerGen,
            totalRate: waterPerGen * count,
            unit: 'm³',
            transportUsed: chosenPipe,
            idealLogi: getLogisticsInfo(waterPerGen, true)
          });
        }

        const outputs = [
          {
            item: gen,
            isPower: true,
            perMachineRate: mwPerGen,
            totalRate: mwPerGen * count,
            unit: 'MW',
            transportUsed: { name: 'Cabo Elétrico', ratePerMin: 999999 }
          }
        ];

        return {
          blockId: block.id,
          blockType: 'generator',
          entity: gen,
          fuelItem,
          title: gen.name,
          subtitle: `Combustível: ${fuelItem ? fuelItem.name : ''}`,
          count,
          clockPercent: clock,
          powerPerMachineMw: 0,
          totalPowerMw: 0,
          powerProducedMw: mwPerGen * count,
          mwPerGen,
          transportUsed: chosenBelt,
          inputs,
          outputs
        };
      }

      if (block.blockType === 'splitter') {
        const factor = Math.max(2, Math.min(3, Math.round(Number(block.splitFactor) || 2)));
        const inItem = block.itemId ? DATA.items[block.itemId] : null;
        const inRate = Number(block.manualRate) || 0;
        const outRate = inRate > 0 ? inRate / factor : 0;
        return {
          blockId: block.id,
          blockType: 'splitter',
          entity: SPLITTER_ENTITY,
          title: 'Divisor de Esteira',
          subtitle: `Divide 1 entrada em ${factor} saídas (÷${factor})`,
          count,
          clockPercent: 100,
          splitFactor: factor,
          powerPerMachineMw: 0,
          totalPowerMw: 0,
          powerProducedMw: 0,
          transportUsed: chosenBelt,
          inputs: inItem ? [{ item: inItem, perMachineRate: inRate, totalRate: inRate * count, unit: inItem.unit, transportUsed: chosenBelt, idealLogi: getLogisticsInfo(inRate, false) }] : [],
          outputs: inItem ? [{ item: inItem, perMachineRate: outRate, totalRate: outRate * count, unit: inItem.unit, transportUsed: chosenBelt, idealLogi: getLogisticsInfo(outRate, false) }] : []
        };
      }

      if (block.blockType === 'merger') {
        const inItem = block.itemId ? DATA.items[block.itemId] : null;
        const outRate = Number(block.manualRate) || 0;
        return {
          blockId: block.id,
          blockType: 'merger',
          entity: MERGER_ENTITY,
          title: 'Unificador de Esteira',
          subtitle: 'Une até 3 esteiras em 1 saída',
          count,
          clockPercent: 100,
          powerPerMachineMw: 0,
          totalPowerMw: 0,
          powerProducedMw: 0,
          transportUsed: chosenBelt,
          inputs: inItem ? [{ item: inItem, perMachineRate: outRate, totalRate: outRate * count, unit: inItem.unit, transportUsed: chosenBelt, idealLogi: getLogisticsInfo(outRate, false) }] : [],
          outputs: inItem ? [{ item: inItem, perMachineRate: outRate, totalRate: outRate * count, unit: inItem.unit, transportUsed: chosenBelt, idealLogi: getLogisticsInfo(outRate, false) }] : []
        };
      }

      if (block.blockType === 'pipe_junction') {
        const inItem = block.itemId ? DATA.items[block.itemId] : null;
        const outRate = Number(block.manualRate) || 0;
        return {
          blockId: block.id,
          blockType: 'pipe_junction',
          entity: PIPE_JUNCTION_ENTITY,
          title: 'Junção de Tubulação',
          subtitle: 'Divide / une tubos (até 4 conexões)',
          count,
          clockPercent: 100,
          powerPerMachineMw: 0,
          totalPowerMw: 0,
          powerProducedMw: 0,
          transportUsed: chosenPipe,
          inputs: inItem ? [{ item: inItem, perMachineRate: outRate, totalRate: outRate * count, unit: inItem.unit, transportUsed: chosenPipe, idealLogi: getLogisticsInfo(outRate, true) }] : [],
          outputs: inItem ? [{ item: inItem, perMachineRate: outRate, totalRate: outRate * count, unit: inItem.unit, transportUsed: chosenPipe, idealLogi: getLogisticsInfo(outRate, true) }] : []
        };
      }

      // Qualquer construção oficial de Logística, Armazenamento ou Destino Final (CL-517554)
      const logList = Object.values(DATA.logistics || {});
      const logObj = logList.find((l) => l.id === block.logisticsId || l.kind === block.blockType);
      if (logObj) {
        const inItem = block.itemId ? DATA.items[block.itemId] : null;
        const outRate = Number(block.manualRate) || 0;
        const tr = logObj.isFluid ? chosenPipe : chosenBelt;
        const portDesc = logObj.outPorts === 0
          ? `Destino final (${logObj.inPorts} entrada${logObj.inPorts > 1 ? 's' : ''})`
          : `${logObj.inPorts} ent. → ${logObj.outPorts} saí.`;
        return {
          blockId: block.id,
          blockType: logObj.kind,
          entity: { id: logObj.id, name: logObj.name, icon: logObj.wikiImage, wikiImage: logObj.wikiImage },
          title: logObj.name,
          subtitle: portDesc,
          count,
          clockPercent: 100,
          powerPerMachineMw: logObj.powerMw || 0,
          totalPowerMw: (logObj.powerMw || 0) * count,
          powerProducedMw: 0,
          transportUsed: tr,
          inputs: inItem ? [{ item: inItem, perMachineRate: outRate, totalRate: outRate * count, unit: inItem.unit, transportUsed: tr, idealLogi: getLogisticsInfo(outRate, logObj.isFluid) }] : [],
          outputs: (inItem && logObj.outPorts > 0) ? [{ item: inItem, perMachineRate: outRate, totalRate: outRate * count, unit: inItem.unit, transportUsed: tr, idealLogi: getLogisticsInfo(outRate, logObj.isFluid) }] : []
        };
      }

      return null;
    },

    getCompatibleRecipesForItem(itemId) {
      if (!itemId) return [];
      const recs = (recipesByIngredient[itemId] || [])
        .filter((r) => !r.isFicsmas && !r.isUnpackage)
        .map((r) => ({
          ...r,
          cleanName: r.cleanName || r.name,
          machineObj: DATA.machines[r.machine] || null
        }));
      return recs;
    },

    /**
     * Builds the canvas flow graph for Free Mode (`Construção Livre`).
     * Before clicking `Check`, cards show clean user-configured values without any intrusive alerts.
     * After clicking `Check`, cards display any diagnostic warnings attached to them.
     */
    buildFreeCanvasFlowGraph(freeState, expandIndividual = true) {
      const blocks = freeState?.blocks || [];
      if (blocks.length === 0) return { columns: [], connections: [], edges: [] };

      const checkActive = Boolean(freeState.checkPerformed && freeState.lastCheckReport);
      const blockAlertsMap = (checkActive && freeState.lastCheckReport?.blockAlerts) || {};

      // Group blocks into logical columns:
      // Col 0: Extractors, Col 1..N: Production stages topological/order, Last Col: Generators
      const columns = [];
      const connections = [];
      const producersByItem = {};

      const extractors = blocks.filter((b) => b.blockType === 'extractor');
      const machines = blocks.filter((b) => b.blockType === 'machine');
      const generators = blocks.filter((b) => b.blockType === 'generator');
      const logDb = Object.values(DATA.logistics || {});
      const isFinalDestType = (b) => {
        const l = logDb.find((x) => x.id === b.logisticsId || x.kind === b.blockType);
        return Boolean(l && l.outPorts === 0);
      };
      const isStorageType = (b) => {
        const l = logDb.find((x) => x.id === b.logisticsId || x.kind === b.blockType);
        return Boolean(l && l.category === 'Armazenamento');
      };
      const finalDestBlocks = blocks.filter((b) =>
        b.blockType !== 'extractor' && b.blockType !== 'machine' && b.blockType !== 'generator' && isFinalDestType(b)
      );
      const storageBlocks = blocks.filter((b) =>
        b.blockType !== 'extractor' && b.blockType !== 'machine' && b.blockType !== 'generator' && !isFinalDestType(b) && isStorageType(b)
      );
      const logistics = blocks.filter((b) =>
        b.blockType !== 'extractor' && b.blockType !== 'machine' && b.blockType !== 'generator' && !isFinalDestType(b) && !isStorageType(b)
      );
      const customEdges = freeState?.customEdges || [];

      const MAX_INDIV = expandIndividual ? 60 : 1;
      const titleCounter = {};

      function createNodesForBlock(block, colNodesList) {
        const st = window.Solver.computeFreeBlockStats(block);
        if (!st) return [];
        const showIndiv = expandIndividual && st.count <= MAX_INDIV;
        const cardCount = showIndiv ? st.count : 1;
        const created = [];
        const alerts = blockAlertsMap[block.id] || [];
        const alertSummary = checkActive && alerts.length > 0 ? alerts[0] : null;

        for (let i = 0; i < cardCount; i++) {
          titleCounter[st.title] = (titleCounter[st.title] || 0) + 1;
          const cardSeq = titleCounter[st.title];
          const nodeId = `free_${block.id}_${i}`;
          const pwr = showIndiv
            ? (st.blockType === 'generator' ? `+${st.mwPerGen.toFixed(1)} MW` : `${st.powerPerMachineMw.toFixed(1)} MW`)
            : (st.blockType === 'generator' ? `+${st.powerProducedMw.toFixed(1)} MW` : `${st.totalPowerMw.toFixed(1)} MW`);

          const inputsList = st.inputs.map((inp) => {
            const r = showIndiv ? inp.perMachineRate : inp.totalRate;
            const beltShort = inp.transportUsed?.name
              ? inp.transportUsed.name.replace('Esteira de transporte ', 'Esteira ').replace('Tubulação ', 'Tubulação ')
              : 'Esteira';
            return {
              item: inp.item,
              rate: r,
              unit: inp.unit,
              beltText: `${beltShort} (máx ${inp.transportUsed?.ratePerMin || 60}/m)`
            };
          });

          const outputsList = st.outputs.map((out) => {
            const r = showIndiv ? out.perMachineRate : out.totalRate;
            const beltShort = out.isPower
              ? 'Rede Elétrica'
              : (out.transportUsed?.name
                  ? out.transportUsed.name.replace('Esteira de transporte ', 'Esteira ')
                  : 'Esteira');
            return {
              item: out.item,
              rate: r,
              unit: out.unit,
              isPower: out.isPower,
              beltText: out.isPower ? 'Cabo Elétrico' : `${beltShort} (máx ${out.transportUsed?.ratePerMin || 60}/m)`
            };
          });

          const isExtractorBlock = st.blockType === 'extractor';
          const firstOut = st.outputs[0];
          const firstOutRate = firstOut ? (showIndiv ? firstOut.perMachineRate : firstOut.totalRate) : 0;

          const nodeObj = {
            id: nodeId,
            blockId: block.id,
            kind: st.blockType,
            realCount: st.count,
            perMachineRate: st.outputs[0] ? st.outputs[0].perMachineRate : 0,
            topLabel: showIndiv && st.count > 1
              ? `${st.title} #${cardSeq}`
              : st.title,
            badgeText: !showIndiv && st.count > 1 ? `${st.count}x` : null,
            metaRight: (st.blockType === 'splitter' || st.blockType === 'merger' || st.blockType === 'pipe_junction')
              ? null
              : `Clock ${st.clockPercent}% • ⚡ ${pwr}`,
            entity: st.entity,
            recipePill: (st.blockType === 'machine' && st.recipe?.isAlternate)
              ? `★ ${st.subtitle}`
              : (st.blockType === 'extractor' ? st.subtitle : null),
            configMeta: {
              configType: 'free_block',
              blockId: block.id,
              title: st.title
            },
            inputsList,
            outputsList: isExtractorBlock ? [] : outputsList,
            resourceExtractInfo: (isExtractorBlock && firstOut) ? {
              item: firstOut.item,
              rate: firstOutRate,
              unit: firstOut.unit
            } : null,
            surplusLine: null,
            outRate: firstOutRate,
            inRate: st.inputs[0] ? (showIndiv ? st.inputs[0].perMachineRate : st.inputs[0].totalRate) : 0,
            x: typeof block.x === 'number' ? block.x : null,
            y: typeof block.y === 'number' ? block.y : null,
            floor: Number(block.floor) || 1
          };

          colNodesList.push(nodeObj);
          created.push(nodeObj);
        }

        st.outputs.forEach((out) => {
          if (out.item && !out.isPower) {
            if (!producersByItem[out.item.id]) producersByItem[out.item.id] = [];
            producersByItem[out.item.id].push({
              block,
              stats: st,
              nodes: created,
              perMachineOutRate: out.perMachineRate,
              totalOutRate: out.totalRate
            });
          }
        });

        return { stats: st, nodes: created };
      }

      if (extractors.length > 0) {
        const extNodes = [];
        extractors.forEach((b) => createNodesForBlock(b, extNodes));
        columns.push({
          id: 'free_col_ext',
          title: '⛏️ Extratores & Fontes Adicionadas',
          nodes: extNodes
        });
      }

      // In Free Mode, NEVER create automatic connections or splitters — only user-drawn customEdges
      machines.forEach((b, idx) => {
        const machNodes = [];
        const res = createNodesForBlock(b, machNodes);
        if (res && res.stats) {
          columns.push({
            id: `free_col_mach_${b.id}`,
            title: `🏭 Etapa Livre ${idx + 1}: ${res.stats.count}x ${res.stats.title}`,
            nodes: machNodes
          });
        }
      });

      if (generators.length > 0) {
        const genNodes = [];
        generators.forEach((b) => {
          const singleGenList = [];
          createNodesForBlock(b, singleGenList);
          genNodes.push(...singleGenList);
        });

        columns.push({
          id: 'free_col_gens',
          title: '⚡ Usinas / Geradores Adicionados',
          nodes: genNodes
        });
      }

      if (logistics.length > 0) {
        const logiNodes = [];
        logistics.forEach((b) => createNodesForBlock(b, logiNodes));
        columns.push({
          id: 'free_col_logistics',
          title: '🔀 Divisores & Logística',
          nodes: logiNodes
        });
      }

      if (storageBlocks.length > 0) {
        const storNodes = [];
        storageBlocks.forEach((b) => createNodesForBlock(b, storNodes));
        columns.push({
          id: 'free_col_storage',
          title: '📦 Armazenamento',
          nodes: storNodes
        });
      }

      if (finalDestBlocks.length > 0) {
        const destNodes = [];
        finalDestBlocks.forEach((b) => {
          const created = createNodesForBlock(b, destNodes);
          (created?.nodes || []).forEach((n) => {
            n.outPorts = 0;
          });
        });
        columns.push({
          id: 'free_col_destinations',
          title: '🎯 Destinos Finais',
          nodes: destNodes
        });
      }

      // Render user-drawn custom connections with LIVE flow propagation & physical belt limits
      const allCreatedNodes = columns.flatMap((c) => c.nodes);
      const nodeById = {};
      allCreatedNodes.forEach((n) => {
        nodeById[n.id] = n;
        const firstOut = (n.outputsList || []).find(o => o.item && !o.isPower) || n.resourceExtractInfo;
        n._liveOutItem = firstOut ? firstOut.item : null;
        n._liveOutRate = firstOut ? (Number(firstOut.rate) || 0) : 0;
        n._liveInItem = null;
        n._liveInRate = 0;
      });

      // Resolve valid edge endpoints
      const resolvedEdges = [];
      const outgoingByNode = {};
      customEdges.forEach((ce) => {
        const fromNode = ce.fromNodeId && nodeById[ce.fromNodeId]
          ? nodeById[ce.fromNodeId]
          : allCreatedNodes.find((n) => n.blockId === ce.fromBlockId);
        const toNode = ce.toNodeId && nodeById[ce.toNodeId]
          ? nodeById[ce.toNodeId]
          : allCreatedNodes.find((n) => n.blockId === ce.toBlockId);
        if (!fromNode || !toNode) return;
        const already = resolvedEdges.some((re) => re.fromNode.id === fromNode.id && re.toNode.id === toNode.id);
        if (already) return;
        const entry = { ce, fromNode, toNode, item: null, rawRate: 0, actualRate: 0, beltObj: null, isBottlenecked: false };
        resolvedEdges.push(entry);
        if (!outgoingByNode[fromNode.id]) outgoingByNode[fromNode.id] = [];
        outgoingByNode[fromNode.id].push(entry);
      });

      const resolveEdgeTransport = (ce, fromBlock, item) => {
        const isFluid = Boolean(item?.isFluid);
        const list = isFluid ? (DATA.pipes || []) : (DATA.belts || []);
        const fallbackId = isFluid ? (fromBlock?.pipeTierId || 'Build_Pipeline_C') : (fromBlock?.beltTierId || 'Build_ConveyorBeltMk3_C');
        const chosenId = ce.beltTierId || fallbackId;
        return list.find(x => x.id === chosenId) || list[0] || { id: chosenId, name: isFluid ? 'Tubulação' : 'Esteira', ratePerMin: isFluid ? 300 : 270 };
      };

      const PASSTHROUGH_KINDS = new Set([
        'splitter', 'smart_splitter', 'programmable_splitter',
        'merger', 'priority_merger',
        'pipe_junction', 'pipe_pump_mk1', 'pipe_pump_mk2',
        'storage_mk1', 'storage_mk2', 'fluid_buffer_mk1', 'fluid_buffer_mk2',
        'awesome_sink', 'dimensional_depot', 'space_elevator'
      ]);
      const DIVIDING_KINDS = new Set([
        'splitter', 'smart_splitter', 'programmable_splitter', 'pipe_junction',
        'storage_mk1', 'storage_mk2', 'fluid_buffer_mk1', 'fluid_buffer_mk2'
      ]);

      // Multi-pass propagation so Splitter -> Merger -> Storage -> Machine chains compute live rates
      for (let pass = 0; pass < 6; pass++) {
        allCreatedNodes.forEach((n) => {
          if (PASSTHROUGH_KINDS.has(n.kind)) {
            n._liveInRate = 0;
          }
        });

        resolvedEdges.forEach((re) => {
          const fn = re.fromNode;
          const tn = re.toNode;
          const outCount = (outgoingByNode[fn.id] || []).length || 1;
          let srcItem = fn._liveOutItem;
          let srcRate = fn._liveOutRate;

          if (PASSTHROUGH_KINDS.has(fn.kind)) {
            srcItem = fn._liveInItem || fn._liveOutItem;
            srcRate = fn._liveInRate / outCount;
          } else {
            srcRate = fn._liveOutRate / outCount;
          }

          if (!srcItem && re.ce.itemId) srcItem = DATA.items[re.ce.itemId] || null;
          if (!srcItem && tn.inputsList?.[0]?.item) srcItem = tn.inputsList[0].item;

          const fromBlock = blocks.find(b => b.id === fn.blockId);
          const beltObj = resolveEdgeTransport(re.ce, fromBlock, srcItem);
          const beltCap = beltObj?.ratePerMin || 60;
          const actualRate = Math.min(srcRate, beltCap);

          re.item = srcItem;
          re.rawRate = srcRate;
          re.actualRate = actualRate;
          re.beltObj = beltObj;
          re.isBottlenecked = srcRate > beltCap + 1e-4;

          if (PASSTHROUGH_KINDS.has(tn.kind)) {
            if (srcItem && !tn._liveInItem) tn._liveInItem = srcItem;
            tn._liveInRate += actualRate;
          }
        });
      }

      // Update Splitter, Merger, Storage, Pipe Junction & Destination cards to show the live flowing item & rate
      allCreatedNodes.forEach((n) => {
        if (PASSTHROUGH_KINDS.has(n.kind) && n._liveInItem) {
          const item = n._liveInItem;
          const inRate = n._liveInRate;
          const outCount = (outgoingByNode[n.id] || []).length || 1;
          const outRate = DIVIDING_KINDS.has(n.kind) ? (inRate / outCount) : inRate;
          const unit = item.unit || 'un';
          n.inputsList = [{
            item,
            rate: inRate,
            unit,
            beltText: 'Entrada Conectada'
          }];
          if (n.outPorts !== 0) {
            n.outputsList = [{
              item,
              rate: outRate,
              unit,
              beltText: (n.kind === 'merger' || n.kind === 'priority_merger') ? 'Saída Unificada' : `${outCount} saída(s) ativa(s)`
            }];
          } else {
            n.outputsList = [];
          }
        }
      });

      resolvedEdges.forEach((re) => {
        const item = re.item;
        const unit = item?.isFluid ? ' m³/m' : '/m';
        const beltShort = re.beltObj?.name
          ? re.beltObj.name.replace(/^Esteira de transporte\s+/i, '').replace(/^Tubulação\s+/i, '')
          : 'v.1';
        const numStr = Math.abs(re.actualRate - Math.round(re.actualRate)) < 0.05
          ? String(Math.round(re.actualRate))
          : re.actualRate.toFixed(1);
        const capWarn = re.isBottlenecked
          ? ` ⚠️ Máx ${re.beltObj.ratePerMin}/m`
          : '';
        const label = `${beltShort} · ${numStr}${unit}${capWarn}`;

        connections.push({
          edgeId: re.ce.id,
          fromNodeId: re.fromNode.id,
          toNodeId: re.toNode.id,
          item,
          beltTierId: re.beltObj?.id || re.ce.beltTierId || null,
          splitLabel: label,
          isPowerLine: false,
          isExcessLine: false,
          isCustom: true
        });
      });

      const edges = connections.map((c) => ({
        edgeId: c.edgeId || null,
        from: c.fromNodeId,
        to: c.toNodeId,
        label: c.splitLabel,
        beltTierId: c.beltTierId || null,
        isPipe: c.item ? Boolean(c.item.isFluid) : false,
        isPowerLine: Boolean(c.isPowerLine),
        isExcessLine: Boolean(c.isExcessLine),
        isCustom: Boolean(c.isCustom)
      }));

      return { columns, connections, edges };
    },

    /**
     * Validação automática de conexões do grafo:
     * Verifica que toda entrada de toda máquina possui ao menos uma esteira/tubo
     * conectada a um fornecedor válido e que não existem arestas órfãs.
     */
    validateGraphConnections(graph) {
      const nodeMap = new Map();
      (graph?.columns || []).forEach((col) => {
        (col.nodes || []).forEach((n) => nodeMap.set(n.id, n));
      });
      const incomingByNode = new Map();
      const orphanEdges = [];
      (graph?.edges || []).forEach((e) => {
        if (!nodeMap.has(e.from) || !nodeMap.has(e.to)) {
          orphanEdges.push(e);
          return;
        }
        if (!incomingByNode.has(e.to)) incomingByNode.set(e.to, []);
        incomingByNode.get(e.to).push(e);
      });

      const missingInputsByNode = {};
      nodeMap.forEach((node, nodeId) => {
        node._missingInputs = [];
        if (node.kind === 'extractor' || node.kind === 'power_emblem') return;
        const incoming = incomingByNode.get(nodeId) || [];
        const requiredInputs = (node.inputsList || []).filter((i) => i && i.item && Number(i.rate) > 0);
        if (node.kind === 'final_product') {
          if (incoming.length === 0) {
            node._missingInputs = ['Produto final sem conexão'];
            missingInputsByNode[nodeId] = node._missingInputs;
          }
          return;
        }
        requiredInputs.forEach((inp) => {
          const hasSupplier = incoming.some((e) => !e.itemId || e.itemId === inp.item.id);
          if (!hasSupplier) {
            node._missingInputs.push(inp.item.name || inp.item.id);
          }
        });
        if (node._missingInputs.length > 0) {
          missingInputsByNode[nodeId] = node._missingInputs;
        }
      });

      const missingCount = Object.keys(missingInputsByNode).length;
      return {
        valid: missingCount === 0 && orphanEdges.length === 0,
        missingCount,
        missingInputsByNode,
        orphanEdges,
        totalNodes: nodeMap.size,
        totalEdges: (graph?.edges || []).length
      };
    },

    /**
     * Runs the comprehensive diagnostic (`Check`) on a Free Mode project.
     * Detects:
     * 1. Resource & intermediate deficits (and exact number of machines/extractors to add)
     * 2. Surpluses / leftover items
     * 3. Belt / Pipe capacity conflicts & upgrade recommendations (including >1200/min Mk.6 limit and splitter counts)
     * 4. Recipe efficiency recommendations (better alternate recipes available for the items being produced)
     * 5. Power balance (Generated MW vs Consumed MW)
     */
    analyzeFreeProject(freeState) {
      const blocks = freeState?.blocks || [];
      const deficits = [];
      const surpluses = [];
      const beltIssues = [];
      const recipeTips = [];
      const splitterTips = [];
      const blockAlerts = {};

      const addBlockAlert = (blockId, msg) => {
        if (!blockAlerts[blockId]) blockAlerts[blockId] = [];
        blockAlerts[blockId].push(msg);
      };

      let totalPowerConsumedMw = 0;
      let totalPowerProducedMw = 0;

      const producedByItem = {};
      const extractedByItem = {};
      const consumedByItem = {};
      const blockStatsList = [];

      blocks.forEach((b) => {
        const st = window.Solver.computeFreeBlockStats(b);
        if (!st) return;
        blockStatsList.push({ block: b, stats: st });

        totalPowerConsumedMw += st.totalPowerMw || 0;
        totalPowerProducedMw += st.powerProducedMw || 0;

        // Check belt / pipe capacity on each output and input
        st.outputs.forEach((out) => {
          if (out.isPower || !out.item) return;
          producedByItem[out.item.id] = (producedByItem[out.item.id] || 0) + out.totalRate;
          if (st.blockType === 'extractor') {
            extractedByItem[out.item.id] = (extractedByItem[out.item.id] || 0) + out.totalRate;
          }

          const cap = out.transportUsed?.ratePerMin || 60;
          const maxCapInGame = out.item.isFluid ? 600 : 1200;
          const ideal = out.idealLogi;

          // Per-machine output vs chosen belt
          if (out.perMachineRate > maxCapInGame + 1e-4) {
            const msg = `⚠️ Taxa por máquina (${out.perMachineRate.toFixed(1)}/m de ${out.item.name}) excede o limite físico máximo do jogo (${maxCapInGame}/m)! Reduza o overclock.`;
            beltIssues.push({ severity: 'error', blockTitle: st.title, message: msg });
            addBlockAlert(b.id, msg);
          } else if (out.perMachineRate > cap + 1e-4) {
            const msg = `🔴 Esteira insuficiente em ${st.title}: cada máquina gera ${out.perMachineRate.toFixed(1)}/m de ${out.item.name}, mas a ${out.transportUsed.name} suporta apenas ${cap}/m. Melhore para ${ideal.shortTier} (máx ${ideal.singleBeltMax}/m).`;
            beltIssues.push({ severity: 'error', blockTitle: st.title, message: msg });
            addBlockAlert(b.id, `Melhore p/ ${ideal.shortTier} (${out.perMachineRate.toFixed(1)}/m > ${cap}/m)`);
          }

          // Total stage output if grouped onto a single belt
          if (st.count > 1 && out.totalRate > cap + 1e-4) {
            const totalLogi = getLogisticsInfo(out.totalRate, out.item.isFluid);
            if (out.totalRate > maxCapInGame + 1e-4) {
              beltIssues.push({
                severity: 'warn',
                blockTitle: `${st.count}x ${st.title}`,
                message: `🟣 Saída total de ${out.totalRate.toFixed(1)}/m de ${out.item.name} ultrapassa 1x ${totalLogi.shortTier} (máx ${maxCapInGame}/m). Use pelo menos ${totalLogi.linesNeeded} linhas paralelas (${totalLogi.beltTag}).`
              });
            } else {
              beltIssues.push({
                severity: 'warn',
                blockTitle: `${st.count}x ${st.title}`,
                message: `🟣 Se unificar as ${st.count}x ${st.title} (${out.totalRate.toFixed(1)}/m de ${out.item.name}), a ${out.transportUsed.name} (${cap}/m) não dará conta. Use ${totalLogi.shortTier} (máx ${totalLogi.singleBeltMax}/m) após o Unificador.`
              });
            }
          }
        });

        st.inputs.forEach((inp) => {
          if (!inp.item) return;
          consumedByItem[inp.item.id] = (consumedByItem[inp.item.id] || 0) + inp.totalRate;

          const cap = inp.transportUsed?.ratePerMin || 60;
          const ideal = inp.idealLogi;
          if (inp.perMachineRate > cap + 1e-4) {
            const msg = `🔴 Entrada bloqueada em ${st.title}: consome ${inp.perMachineRate.toFixed(1)}/m de ${inp.item.name} por máquina, mas a ${inp.transportUsed.name} limita a ${cap}/m. Melhore para ${ideal.shortTier}.`;
            beltIssues.push({ severity: 'error', blockTitle: st.title, message: msg });
            addBlockAlert(b.id, `Entrada requer ${ideal.shortTier}`);
          }
        });

        // Check recipe efficiency (Compare chosen recipe with alternate recipes for the same primary output)
        if (st.blockType === 'machine' && st.recipe) {
          const primaryOut = st.recipe.products[0];
          if (primaryOut) {
            const allRecs = getRecipesForItem(primaryOut.item);
            if (allRecs.length > 1) {
              const currentOutPerMin = primaryOut.ratePerMin || 30;

              // Find recipe with highest output rate per machine
              const bestSpeedRec = [...allRecs].sort((a, b) => {
                const pA = a.products.find((p) => p.item === primaryOut.item) || a.products[0];
                const pB = b.products.find((p) => p.item === primaryOut.item) || b.products[0];
                return (pB.ratePerMin || 0) - (pA.ratePerMin || 0);
              })[0];

              if (bestSpeedRec && bestSpeedRec.id !== st.recipe.id) {
                const bestProd = bestSpeedRec.products.find((p) => p.item === primaryOut.item) || bestSpeedRec.products[0];
                const bestRate = bestProd.ratePerMin || 30;
                const bestMachName = DATA.machines[bestSpeedRec.machine]?.name || 'Máquina';
                const bestRecName = bestSpeedRec.cleanName || bestSpeedRec.name;
                if (bestRate > currentOutPerMin * 1.15) {
                  const neededWithBest = Math.ceil((st.outputs[0].totalRate / (bestRate * (st.clockPercent / 100))) - 1e-6);
                  recipeTips.push({
                    item: DATA.items[primaryOut.item],
                    currentRecipe: st.cleanRecipeName,
                    suggestedRecipe: bestRecName,
                    machineName: bestMachName,
                    message: `💡 Para produzir ${DATA.items[primaryOut.item]?.name}, a receita "${bestRecName}" (${bestMachName}) produz ${bestRate.toFixed(1)}/min por máquina a 100% (vs ${currentOutPerMin.toFixed(1)}/min na receita atual), reduzindo de ${st.count} para ~${neededWithBest} máquina(s)!`
                  });
                }
              }
            }
          }
        }
      });

      // Validate user-drawn customEdges (belt limits & item compatibility)
      const liveGraph = this.buildFreeCanvasFlowGraph(freeState, true);
      (liveGraph.connections || []).forEach((conn) => {
        if (!conn.isCustom || !conn.item) return;
        const fromBlockId = String(conn.fromNodeId || '').replace(/^free_/, '').replace(/_\d+$/, '');
        const toBlockId = String(conn.toNodeId || '').replace(/^free_/, '').replace(/_\d+$/, '');
        const toEntry = blockStatsList.find((x) => x.block.id === toBlockId);
        const fromEntry = blockStatsList.find((x) => x.block.id === fromBlockId);
        if (toEntry && toEntry.block.blockType !== 'splitter' && toEntry.block.blockType !== 'merger') {
          const acceptedIds = (toEntry.stats.inputs || []).map((i) => i.item?.id).filter(Boolean);
          if (acceptedIds.length > 0 && !acceptedIds.includes(conn.item.id)) {
            const expectedNames = (toEntry.stats.inputs || []).map((i) => i.item?.name).filter(Boolean).join(' ou ');
            const msg = `⚠️ Conexão incompatível: ${fromEntry?.stats?.title || 'Origem'} envia ${conn.item.name}, mas ${toEntry.stats.title} consome ${expectedNames}.`;
            beltIssues.push({ severity: 'error', blockTitle: toEntry.stats.title, message: msg });
            addBlockAlert(toBlockId, `Recebe ${conn.item.name}, precisa de ${expectedNames}`);
          }
        }
        if (conn.splitLabel && conn.splitLabel.includes('⚠️ Máx')) {
          const msg = `🔴 Gargalo na conexão de ${conn.item.name}: ${conn.splitLabel.replace('⚠️ ', '')}.`;
          beltIssues.push({ severity: 'error', blockTitle: fromEntry?.stats?.title || 'Conexão', message: msg });
          if (fromBlockId) addBlockAlert(fromBlockId, 'Esteira da conexão abaixo da vazão');
        }
      });

      // Compare all items produced vs consumed
      const allItemIds = new Set([...Object.keys(producedByItem), ...Object.keys(consumedByItem)]);
      allItemIds.forEach((itemId) => {
        const item = DATA.items[itemId];
        if (!item) return;
        const prod = producedByItem[itemId] || 0;
        const cons = consumedByItem[itemId] || 0;
        const diff = prod - cons;

        if (diff < -0.05) {
          const missing = Math.abs(diff);
          let suggestion = '';
          if (item.isRawResource) {
            const exId = getExtractorIdForResource(itemId, 'mk2');
            const exStats = computeExtractorStats(exId, 1.0, 100, 1);
            const neededEx = exStats ? Math.ceil(missing / exStats.ratePerExtractor) : 1;
            suggestion = `Adicione +${neededEx}x ${exStats?.extractor?.name || 'Extrator'} (100% Normal) ou aumente o overclock da extração atual.`;
          } else {
            const defRecId = defaultRecipeForItem[itemId];
            const rec = DATA.recipes[defRecId];
            if (rec) {
              const mStats = computeMachineStats(rec, 100, 0);
              const outRate = (rec.products[0]?.ratePerMin || 30) * mStats.outputMult;
              const neededMach = Math.ceil(missing / outRate);
              const mName = DATA.machines[rec.machine]?.name || 'Máquina';
              suggestion = `Adicione +${neededMach}x ${mName} com a receita "${rec.cleanName || rec.name}" (ou aumente o overclock das máquinas de ${item.name}).`;
            }
          }

          deficits.push({
            item,
            produced: prod,
            consumed: cons,
            deficitRate: missing,
            suggestion
          });

          // Attach alert to consumers of this item
          blockStatsList.forEach(({ block, stats }) => {
            if (stats.inputs.some((i) => i.item?.id === itemId)) {
              addBlockAlert(block.id, `🔴 Falta ${missing.toFixed(1)}/m de ${item.name}`);
            }
          });
        } else if (diff > 0.05) {
          // Recurso extraído (nós de recurso) nunca conta como excesso
          if ((extractedByItem[itemId] || 0) >= prod - 1e-4) return;
          const consumersExist = cons > 0.01;
          let extraConsumerNote = '';
          const consumerBlock = blockStatsList.find(({ stats }) => stats.inputs.some((i) => i.item?.id === itemId));
          if (consumerBlock) {
            const inpEntry = consumerBlock.stats.inputs.find((i) => i.item?.id === itemId);
            if (inpEntry && inpEntry.perMachineRate > 0) {
              const extraSupportable = Math.floor((diff + 1e-6) / inpEntry.perMachineRate);
              if (extraSupportable >= 1) {
                extraConsumerNote = `Sustenta +${extraSupportable}x ${consumerBlock.stats.title} adicional(is)!`;
              }
            }
          }

          surpluses.push({
            item,
            produced: prod,
            consumed: cons,
            surplusRate: diff,
            isFinalOutput: !consumersExist,
            extraConsumerNote
          });
        }
      });

      const isHealthy = deficits.length === 0 && beltIssues.filter((x) => x.severity === 'error').length === 0;

      return {
        timestamp: Date.now(),
        isHealthy,
        totalBlocks: blocks.length,
        totalPowerConsumedMw,
        totalPowerProducedMw,
        netPowerMw: totalPowerProducedMw - totalPowerConsumedMw,
        deficits,
        surpluses,
        beltIssues,
        recipeTips,
        splitterTips,
        blockAlerts
      };
    }
  };

  function blockBeltOrDefault(block) {
    return block.beltTierId || 'Build_ConveyorBeltMk6_C';
  }
})();
