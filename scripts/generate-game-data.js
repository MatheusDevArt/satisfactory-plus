/**
 * Script reproduzível para ler SOMENTE PARA LEITURA os arquivos oficiais do jogo
 * (CommunityResources/Docs/pt-BR.json e en-US.json) e gerar:
 *   - data/satisfactory-data.js (consumido pelo site publicado, sem depender da pasta do jogo)
 *
 * Uso: npm run dados:gerar
 */

const fs = require('fs');
const path = require('path');

const GAME_DIR = process.env.SATISFACTORY_GAME_DIR || 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Satisfactory';
const DOCS_DIR = path.join(GAME_DIR, 'CommunityResources', 'Docs');
const PT_PATH = path.join(DOCS_DIR, 'pt-BR.json');
const EN_PATH = path.join(DOCS_DIR, 'en-US.json');
const OUT_JS_PATH = path.resolve(__dirname, '..', 'data', 'satisfactory-data.js');

function readDocsJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo oficial do jogo não encontrado: ${filePath}`);
  }
  const buf = fs.readFileSync(filePath);
  const text = (buf[0] === 0xff && buf[1] === 0xfe)
    ? buf.toString('utf16le').replace(/^\uFEFF/, '')
    : buf.toString('utf8').replace(/^\uFEFF/, '');
  return JSON.parse(text);
}

function indexByNativeClass(docs) {
  const map = {};
  for (const entry of docs) {
    const nc = (entry.NativeClass || '').split('.').pop().replace(/'$/, '');
    map[nc] = entry.Classes || [];
  }
  return map;
}

function parseItemAmounts(str) {
  if (!str || typeof str !== 'string') return [];
  const out = [];
  const re = /ItemClass="[^"]*\.([A-Za-z0-9_]+)'",Amount=(\d+)/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    out.push({ item: m[1], amount: Number(m[2]) });
  }
  return out;
}

function parseProducedIn(str) {
  if (!str || typeof str !== 'string') return [];
  const out = [];
  const re = /\.([A-Za-z0-9_]+)(?:"|')/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    out.push(m[1]);
  }
  return out;
}

function round4(n) {
  return Math.round(Number(n) * 10000) / 10000;
}

function run() {
  // Carrega dados atuais apenas para preservar wikiImage/wikiImageFallback e gerar relatório de divergências
  const oldRaw = fs.readFileSync(OUT_JS_PATH, 'utf8').replace(/^\uFEFF/, '');
  const oldData = JSON.parse(oldRaw.replace(/^window\.SATISFACTORY_DATA\s*=\s*/, '').replace(/;\s*$/, ''));

  const ptDocs = readDocsJson(PT_PATH);
  const enDocs = readDocsJson(EN_PATH);
  const ptMap = indexByNativeClass(ptDocs);
  const enMap = indexByNativeClass(enDocs);

  // Mapa rápido EN por ClassName
  const enByClass = {};
  for (const list of Object.values(enMap)) {
    for (const obj of list) {
      if (obj.ClassName) enByClass[obj.ClassName] = obj;
    }
  }

  // Mapa rápido PT de todos os itens
  const itemClasses = [
    'FGResourceDescriptor',
    'FGItemDescriptor',
    'FGItemDescriptorBiomass',
    'FGItemDescriptorNuclearFuel',
    'FGItemDescriptorPowerBoosterFuel',
    'FGConsumableDescriptor',
    'FGAmmoTypeProjectile',
    'FGAmmoTypeSpreadshot',
    'FGAmmoTypeInstantHit',
    'FGEquipmentDescriptor',
    'FGPowerShardDescriptor'
  ];
  const ptItemsByClass = {};
  for (const nc of itemClasses) {
    for (const it of (ptMap[nc] || [])) {
      ptItemsByClass[it.ClassName] = { ...it, _nativeClass: nc };
    }
  }

  const diffs = [];

  // 1. Atualiza items (sincronizando nomes PT-BR, EN, form, energyMj, sinkPoints, radioactive, stackSize)
  const newItems = {};
  for (const [id, oldItem] of Object.entries(oldData.items || {})) {
    const pt = ptItemsByClass[id];
    const en = enByClass[id];
    if (!pt) {
      newItems[id] = { ...oldItem };
      diffs.push(`[Item não encontrado no Docs] ${id} (${oldItem.name})`);
      continue;
    }
    const formRaw = String(pt.mForm || '').replace(/^RF_/, '') || oldItem.form;
    const isFluid = formRaw === 'LIQUID' || formRaw === 'GAS';
    const energyMj = round4(Number(pt.mEnergyValue || 0) * (isFluid ? 1000 : 1));
    const sinkPoints = Number(pt.mResourceSinkPoints ?? oldItem.sinkPoints ?? 0);
    const radioactive = round4(Number(pt.mRadioactiveDecay ?? oldItem.radioactive ?? 0));
    const nextItem = {
      ...oldItem,
      name: pt.mDisplayName || oldItem.name,
      nameEn: en?.mDisplayName || oldItem.nameEn,
      description: pt.mDescription || oldItem.description,
      abbrev: pt.mAbbreviatedDisplayName || oldItem.abbrev,
      form: formRaw,
      unit: isFluid ? 'm³' : 'un',
      isFluid,
      isRawResource: pt._nativeClass === 'FGResourceDescriptor',
      energyMj,
      sinkPoints,
      radioactive
    };
    if (nextItem.name !== oldItem.name) diffs.push(`[Item nome] ${id}: "${oldItem.name}" -> "${nextItem.name}"`);
    if (nextItem.energyMj !== oldItem.energyMj) diffs.push(`[Item energia MJ] ${id}: ${oldItem.energyMj} -> ${nextItem.energyMj}`);
    if (nextItem.sinkPoints !== oldItem.sinkPoints) diffs.push(`[Item sinkPoints] ${id}: ${oldItem.sinkPoints} -> ${nextItem.sinkPoints}`);
    newItems[id] = nextItem;
  }

  // 2. Atualiza máquinas (Manufacturers + VariablePower) com somersloop & overclock oficiais
  const ptMachinesByClass = {};
  for (const nc of ['FGBuildableManufacturer', 'FGBuildableManufacturerVariablePower']) {
    for (const m of (ptMap[nc] || [])) ptMachinesByClass[m.ClassName] = m;
  }
  const newMachines = {};
  for (const [id, oldM] of Object.entries(oldData.machines || {})) {
    const pt = ptMachinesByClass[id];
    const en = enByClass[id];
    if (!pt) {
      newMachines[id] = { ...oldM };
      continue;
    }
    const powerMw = round4(Number(pt.mPowerConsumption || 0));
    const minPowerMw = pt.mEstimatedMininumPowerConsumption !== undefined ? round4(Number(pt.mEstimatedMininumPowerConsumption)) : undefined;
    const maxPowerMw = pt.mEstimatedMaximumPowerConsumption !== undefined ? round4(Number(pt.mEstimatedMaximumPowerConsumption)) : undefined;
    const somersloopSlots = Number(pt.mProductionShardSlotSize || 0);
    const somersloopBoost = round4(Number(pt.mProductionShardBoostMultiplier || 0));
    const powerExponent = round4(Number(pt.mPowerConsumptionExponent || 1.321929));
    const nextM = {
      ...oldM,
      name: pt.mDisplayName || oldM.name,
      nameEn: en?.mDisplayName || oldM.nameEn,
      description: pt.mDescription || oldM.description,
      powerMw: powerMw > 0 ? powerMw : (oldM.powerMw || 0),
      ...(minPowerMw !== undefined ? { minPowerMw } : {}),
      ...(maxPowerMw !== undefined ? { maxPowerMw } : {}),
      somersloopSlots,
      somersloopBoost,
      powerExponent,
      minClockPercent: 1,
      maxClockPercent: 250
    };
    if (nextM.name !== oldM.name) diffs.push(`[Máquina nome] ${id}: "${oldM.name}" -> "${nextM.name}"`);
    if (nextM.powerMw !== oldM.powerMw) diffs.push(`[Máquina MW] ${id}: ${oldM.powerMw} -> ${nextM.powerMw}`);
    newMachines[id] = nextM;
  }

  // 3. Atualiza extratores (Mineradoras, Extrator de Petróleo, Bomba d'água, Poço de Recursos)
  const ptExtByClass = {};
  for (const nc of ['FGBuildableResourceExtractor', 'FGBuildableWaterPump', 'FGBuildableFrackingExtractor']) {
    for (const ex of (ptMap[nc] || [])) ptExtByClass[ex.ClassName] = ex;
  }
  const newExtractors = {};
  for (const [id, oldE] of Object.entries(oldData.extractors || {})) {
    const pt = ptExtByClass[id];
    const en = enByClass[id];
    if (!pt) {
      newExtractors[id] = { ...oldE };
      continue;
    }
    const cycle = Number(pt.mExtractCycleTime || 1);
    let perCycle = Number(pt.mItemsPerCycle || 1);
    const isFluidExt = id === 'Build_OilPump_C' || id === 'Build_WaterPump_C' || id === 'Build_FrackingExtractor_C';
    if (isFluidExt && perCycle >= 100) perCycle = perCycle / 1000;
    const baseRatePerMin = round4((perCycle / cycle) * 60);
    const powerMw = round4(Number(pt.mPowerConsumption || oldE.powerMw || 0));
    const nextE = {
      ...oldE,
      name: pt.mDisplayName || oldE.name,
      nameEn: en?.mDisplayName || oldE.nameEn,
      description: pt.mDescription || oldE.description,
      baseRatePerMin: baseRatePerMin > 0 ? baseRatePerMin : oldE.baseRatePerMin,
      powerMw,
      powerExponent: round4(Number(pt.mPowerConsumptionExponent || 1.321929)),
      minClockPercent: 1,
      maxClockPercent: 250
    };
    if (nextE.baseRatePerMin !== oldE.baseRatePerMin) {
      diffs.push(`[Extrator taxa base] ${id}: ${oldE.baseRatePerMin} -> ${nextE.baseRatePerMin}`);
    }
    if (nextE.powerMw !== oldE.powerMw) {
      diffs.push(`[Extrator MW] ${id}: ${oldE.powerMw} -> ${nextE.powerMw}`);
    }
    newExtractors[id] = nextE;
  }

  // 4. Atualiza receitas (duração, ingredientes, produtos, taxas por minuto e nomes oficiais)
  const ptRecipesByClass = {};
  for (const r of (ptMap.FGRecipe || [])) ptRecipesByClass[r.ClassName] = r;

  const newRecipes = {};
  for (const [id, oldR] of Object.entries(oldData.recipes || {})) {
    const pt = ptRecipesByClass[id];
    const en = enByClass[id];
    if (!pt) {
      newRecipes[id] = { ...oldR };
      diffs.push(`[Receita removida/não encontrada no Docs] ${id} (${oldR.name})`);
      continue;
    }
    const duration = round4(Number(pt.mManufactoringDuration || oldR.duration || 1));
    const cyclesPerMin = round4(60 / duration);

    const mapIO = (list) => list.map(({ item, amount }) => {
      const itObj = newItems[item] || oldData.items[item];
      const realAmount = (itObj && itObj.isFluid && amount >= 100) ? round4(amount / 1000) : amount;
      return {
        item,
        amount: realAmount,
        ratePerMin: round4(realAmount * cyclesPerMin)
      };
    });

    const parsedIng = parseItemAmounts(pt.mIngredients);
    const parsedProd = parseItemAmounts(pt.mProduct);
    const ingredients = parsedIng.length > 0 ? mapIO(parsedIng) : oldR.ingredients;
    const products = parsedProd.length > 0 ? mapIO(parsedProd) : oldR.products;

    const ptName = pt.mDisplayName || oldR.name;
    const enName = en?.mDisplayName || oldR.nameEn;
    const cleanName = ptName.replace(/^Alternativa:\s*/i, '').trim();
    const cleanNameEn = enName.replace(/^Alternate:\s*/i, '').trim();

    if (duration !== oldR.duration) {
      diffs.push(`[Receita duração] ${id} (${ptName}): ${oldR.duration}s -> ${duration}s`);
    }
    if (JSON.stringify(ingredients) !== JSON.stringify(oldR.ingredients)) {
      diffs.push(`[Receita ingredientes] ${id} (${ptName}): atualizado conforme Docs oficial`);
    }
    if (JSON.stringify(products) !== JSON.stringify(oldR.products)) {
      diffs.push(`[Receita produtos] ${id} (${ptName}): atualizado conforme Docs oficial`);
    }

    newRecipes[id] = {
      ...oldR,
      name: ptName,
      cleanName,
      nameEn: enName,
      cleanNameEn,
      duration,
      cyclesPerMin,
      ingredients,
      products
    };
  }

  // 5. Atualiza esteiras (ordenadas v.1 -> v.6) e tubulações (v.1 -> v.2)
  const ptBeltsByClass = {};
  for (const b of (ptMap.FGBuildableConveyorBelt || [])) ptBeltsByClass[b.ClassName] = b;
  const newBelts = (oldData.belts || []).map((oldB) => {
    const pt = ptBeltsByClass[oldB.id];
    const en = enByClass[oldB.id];
    if (!pt) return oldB;
    const ratePerMin = round4(Number(pt.mSpeed || 0) / 2);
    if (ratePerMin !== oldB.ratePerMin) diffs.push(`[Esteira vazão] ${oldB.id}: ${oldB.ratePerMin} -> ${ratePerMin}`);
    return {
      ...oldB,
      name: pt.mDisplayName || oldB.name,
      nameEn: en?.mDisplayName || oldB.nameEn,
      ratePerMin
    };
  }).sort((a, b) => a.ratePerMin - b.ratePerMin);

  const ptPipesByClass = {};
  for (const p of (ptMap.FGBuildablePipeline || [])) ptPipesByClass[p.ClassName] = p;
  const newPipes = (oldData.pipes || []).map((oldP) => {
    const pt = ptPipesByClass[oldP.id];
    const en = enByClass[oldP.id];
    if (!pt) return oldP;
    const ratePerMin = round4(Number(pt.mFlowLimit || 0) * 60);
    if (ratePerMin !== oldP.ratePerMin) diffs.push(`[Tubulação vazão] ${oldP.id}: ${oldP.ratePerMin} -> ${ratePerMin}`);
    return {
      ...oldP,
      name: pt.mDisplayName || oldP.name,
      nameEn: en?.mDisplayName || oldP.nameEn,
      ratePerMin
    };
  }).sort((a, b) => a.ratePerMin - b.ratePerMin);

  // 6. Atualiza geradores (MW, água e combustíveis oficiais)
  const ptGenByClass = {};
  for (const nc of ['FGBuildableGeneratorFuel', 'FGBuildableGeneratorNuclear']) {
    for (const g of (ptMap[nc] || [])) ptGenByClass[g.ClassName] = g;
  }
  const newGenerators = {};
  for (const [id, oldG] of Object.entries(oldData.generators || {})) {
    const pt = ptGenByClass[id];
    const en = enByClass[id];
    if (!pt) {
      newGenerators[id] = { ...oldG };
      continue;
    }
    const powerProductionMw = round4(Number(pt.mPowerProduction || oldG.powerProductionMw));
    const waterPerMin = round4(Number(pt.mSupplementalToPowerRatio || 0) * powerProductionMw * 60 / 1000);
    // mSupplementalToPowerRatio no Coal = 10 -> 10 * 75 * 60 / 1000 = 45 m³/min!
    // No Nuclear = 1.6 -> 1.6 * 2500 * 60 / 1000 = 240 m³/min!
    if (powerProductionMw !== oldG.powerProductionMw) {
      diffs.push(`[Gerador MW] ${id}: ${oldG.powerProductionMw} -> ${powerProductionMw}`);
    }
    if (waterPerMin !== oldG.waterPerMin) {
      diffs.push(`[Gerador Água/min] ${id}: ${oldG.waterPerMin} -> ${waterPerMin}`);
    }
    const updatedFuels = (oldG.fuels || []).map((f) => {
      const fuelItem = newItems[f.item];
      if (!fuelItem || !fuelItem.energyMj || fuelItem.energyMj <= 0) return f;
      const burnTimeSec = round4(fuelItem.energyMj / powerProductionMw);
      const ratePerMin = round4(60 / burnTimeSec);
      if (Math.abs(ratePerMin - f.ratePerMin) > 0.01) {
        diffs.push(`[Gerador combustível] ${id}/${f.item}: ${f.ratePerMin}/m -> ${ratePerMin}/m`);
      }
      return { ...f, burnTimeSec, ratePerMin, waterPerMin };
    });
    newGenerators[id] = {
      ...oldG,
      name: pt.mDisplayName || oldG.name,
      nameEn: en?.mDisplayName || oldG.nameEn,
      description: pt.mDescription || oldG.description,
      powerProductionMw,
      waterPerMin,
      fuels: updatedFuels
    };
  }

  const finalData = {
    version: '1.0+ (CL-517554)',
    gameBuild: '++FactoryGame+rel-main-multiplayer-patch-CL-517554',
    generatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    rules: {
      purityMultipliers: { impure: 0.5, normal: 1.0, pure: 2.0 },
      clockMinPercent: 1,
      clockMaxPercent: 250,
      powerExponent: 1.321929
    },
    items: newItems,
    machines: newMachines,
    extractors: newExtractors,
    recipes: newRecipes,
    belts: newBelts,
    pipes: newPipes,
    generators: newGenerators
  };

  fs.writeFileSync(OUT_JS_PATH, `window.SATISFACTORY_DATA = ${JSON.stringify(finalData)};\n`, 'utf8');
  console.log(`DADOS_GERADOS_OK: ${OUT_JS_PATH}`);
  console.log(`Build: ${finalData.gameBuild}`);
  console.log(`Totais: ${Object.keys(newItems).length} itens, ${Object.keys(newMachines).length} máquinas, ${Object.keys(newExtractors).length} extratores, ${Object.keys(newRecipes).length} receitas, ${newBelts.length} esteiras, ${newPipes.length} tubos, ${Object.keys(newGenerators).length} geradores.`);
  console.log(`Divergências corrigidas (${diffs.length}):`);
  for (const d of diffs) console.log('  -', d);
}

run();
