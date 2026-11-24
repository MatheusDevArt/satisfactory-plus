/**
 * Extrai TODAS as strings visíveis em português do Satisfactory+
 * (dados do jogo, biblioteca, mapa, tutorial, patch notes, placeholders e UI)
 * e gera data/i18n-bundle.js com traduções completas em EN-US e ES-ES,
 * priorizando os nomes oficiais em inglês (nameEn / enTitle) dos arquivos do jogo.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function normSpace(s) {
  return String(s || '').replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
}

function isLikelyUiText(s) {
  const t = normSpace(s);
  if (!t || t.length < 2 || t.length > 600) return false;
  if (!/[A-Za-zÀ-ÿ]/.test(t)) return false;
  // Ignorar código, seletores, URLs, templates não resolvidos, classes CSS
  if (/^https?:\/\//i.test(t)) return false;
  if (/^[a-z0-9_.-]+$/.test(t) && !/[À-ÿ]/.test(t) && t.includes('_')) return false;
  if (/^[.#]?[a-z0-9_-]+\s*\{/.test(t)) return false;
  if (t.includes('${') || t.includes('=>') || t.includes('function(') || t.includes('return ') || t.includes('const ') || t.includes('document.')) return false;
  if (/^#[0-9a-f]{3,8}$/i.test(t)) return false;
  if (/^\d+(\.\d+)?\s*(px|%|ms|s|MW|GW|MJ|m³|\/min|x|×)$/i.test(t)) return false;
  return true;
}

function collectAllStrings() {
  const allPt = new Set();
  const officialEn = {}; // pt -> official EN from game files

  const add = (raw, enOpt = null) => {
    const t = normSpace(raw);
    if (!isLikelyUiText(t)) return;
    allPt.add(t);
    if (enOpt && normSpace(enOpt)) {
      officialEn[t] = normSpace(enOpt);
    }
    // Também adicionar linhas individuais se for texto multilinha
    if (t.includes('\n')) {
      t.split('\n').forEach((line) => {
        const l = normSpace(line);
        if (isLikelyUiText(l)) allPt.add(l);
      });
    }
  };

  // 1) data/satisfactory-data.json
  const gameData = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/satisfactory-data.json'), 'utf8'));
  for (const sec of ['items', 'machines', 'extractors', 'recipes', 'belts', 'pipes', 'generators', 'logistics']) {
    const obj = gameData[sec] || {};
    for (const v of Object.values(obj)) {
      if (!v) continue;
      if (v.name) {
        add(v.name, v.nameEn);
        // Versão sem prefixo "Alternativa: "
        if (v.name.startsWith('Alternativa: ')) {
          const cleanPt = v.name.slice('Alternativa: '.length).trim();
          const cleanEn = v.nameEn ? v.nameEn.replace(/^Alternate:\s*/i, '').trim() : null;
          add(cleanPt, cleanEn);
        }
      }
      if (v.description) add(v.description);
      if (v.category) add(v.category);
    }
  }
  for (const ph of (gameData.spaceElevatorPhases || [])) {
    if (ph?.name) add(ph.name);
  }

  // 2) js/library-data.js
  try {
    const libCode = fs.readFileSync(path.join(ROOT, 'js/library-data.js'), 'utf8');
    const sandbox = { window: {} };
    vm.runInNewContext(libCode, sandbox);
    const extra = sandbox.window.SATISFACTORY_LIBRARY_EXTRA || {};
    for (const arr of Object.values(extra)) {
      if (!Array.isArray(arr)) continue;
      for (const entry of arr) {
        if (!entry) continue;
        if (entry.name) add(entry.name, entry.nameEn);
        for (const f of ['category', 'tier', 'slot', 'damage', 'behavior', 'habitat', 'hp', 'desc', 'drops', 'role', 'notes']) {
          if (typeof entry[f] === 'string') add(entry[f]);
        }
      }
    }
  } catch (e) {
    console.warn('library-data parse warn:', e.message);
  }

  // 3) js/map-data.js
  try {
    const mapCode = fs.readFileSync(path.join(ROOT, 'js/map-data.js'), 'utf8');
    const sandbox = { window: {} };
    vm.runInNewContext(mapCode, sandbox);
    const md = sandbox.window.SATISFACTORY_MAP_DATA || {};
    for (const g of (md.groups || [])) {
      if (g?.title) add(g.title);
      for (const c of (g.categories || [])) {
        if (c?.title) add(c.title, c.enTitle);
      }
    }
  } catch (e) {
    console.warn('map-data parse warn:', e.message);
  }

  // 4) data/patch-notes.json (7 mais recentes exibidas)
  const pn = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/patch-notes.json'), 'utf8'));
  for (const entry of pn.slice(0, 7)) {
    if (entry.title) add(entry.title);
    for (const it of (entry.items || [])) {
      if (it.tag) add(it.tag);
      if (it.text) add(it.text);
    }
  }

  // 5) Extração de HTML, placeholders, titles, labels e textos visíveis de index.html e JS de UI
  const uiFiles = [
    'index.html',
    'js/app.js',
    'js/tutorial.js',
    'js/patch-notes.js',
    'js/settings-i18n.js',
    'js/account-features.js',
    'js/factory-enhancements.js'
  ];

  for (const rel of uiFiles) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

    // Placeholders
    for (const m of src.matchAll(/placeholder="([^"${}]{2,160})"/g)) {
      add(m[1]);
    }
    // Titles & data-tip
    for (const m of src.matchAll(/(?:title|data-tip)="([^"${}]{2,160})"/g)) {
      add(m[1]);
    }
    // Texto entre tags HTML >Texto<
    for (const m of src.matchAll(/>([^<>${}]{2,280})</g)) {
      const candidate = normSpace(m[1]);
      if (candidate && /[A-Za-zÀ-ÿ]/.test(candidate) && !/^(&nbsp;|×|→|←|↑|↓|•|·)$/.test(candidate)) {
        // Ignorar textos curtos que parecem código JS
        if (!/[;{}()=]{2,}/.test(candidate) && !candidate.startsWith('//') && !candidate.startsWith('/*')) {
          add(candidate);
        }
      }
    }
    // Propriedades label / title / desc / text / chip / emptyMsg / subtitle em objetos JS
    for (const m of src.matchAll(/\b(?:label|title|subtitle|desc|description|text|chip|emptyMsg|hint|placeholder|heading)\s*:\s*['"]([^'"\\$]{2,320})['"]/g)) {
      add(m[1]);
    }
  }

  return { allPt: Array.from(allPt), officialEn };
}

async function translateBatchGtx(texts, targetLang) {
  // Usa marcador único para traduzir em lote sem misturar linhas
  const SEP = '\n[[[SPLUS_SEP]]]\n';
  const joined = texts.join(SEP);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=pt&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(joined)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const full = Array.isArray(data?.[0]) ? data[0].map((s) => (Array.isArray(s) ? s[0] : '')).join('') : '';
  const parts = full.split(/\s*\[\[\[SPLUS_SEP\]\]\]\s*/);
  if (parts.length === texts.length) {
    return parts.map((p, i) => normSpace(p) || texts[i]);
  }
  // Fallback item a item se o separador desalinhar
  const out = [];
  for (const t of texts) {
    try {
      const u1 = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=pt&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(t)}`;
      const r1 = await fetch(u1, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (r1.ok) {
        const d1 = await r1.json();
        const s1 = Array.isArray(d1?.[0]) ? d1[0].map((x) => (Array.isArray(x) ? x[0] : '')).join('') : t;
        out.push(normSpace(s1) || t);
      } else {
        out.push(t);
      }
    } catch {
      out.push(t);
    }
  }
  return out;
}

async function translateAll(list, targetLang, overrides = {}) {
  const result = {};
  const toTranslate = [];
  for (const s of list) {
    if (overrides[s]) {
      result[s] = overrides[s];
    } else {
      toTranslate.push(s);
    }
  }

  // Agrupa em lotes de ~1400 chars
  const batches = [];
  let cur = [];
  let curLen = 0;
  for (const s of toTranslate) {
    if (cur.length >= 25 || curLen + s.length > 1400) {
      if (cur.length > 0) batches.push(cur);
      cur = [];
      curLen = 0;
    }
    cur.push(s);
    curLen += s.length + 18;
  }
  if (cur.length > 0) batches.push(cur);

  console.log(`[${targetLang}] Total: ${list.length}, overrides: ${Object.keys(overrides).length}, translating ${toTranslate.length} in ${batches.length} batches...`);

  // Processa 4 lotes por vez para rapidez sem rate limit
  for (let i = 0; i < batches.length; i += 4) {
    const slice = batches.slice(i, i + 4);
    const settled = await Promise.all(slice.map(async (batch) => {
      try {
        return { batch, translated: await translateBatchGtx(batch, targetLang) };
      } catch (err) {
        console.warn(`[${targetLang}] batch retry after error:`, err.message);
        await new Promise((r) => setTimeout(r, 800));
        try {
          return { batch, translated: await translateBatchGtx(batch, targetLang) };
        } catch {
          return { batch, translated: batch };
        }
      }
    }));
    for (const { batch, translated } of settled) {
      batch.forEach((orig, idx) => {
        const tr = translated[idx];
        if (tr && tr !== orig) result[orig] = tr;
      });
    }
  }

  return result;
}

(async () => {
  const { allPt, officialEn } = collectAllStrings();
  console.log(`Extracted ${allPt.length} unique Portuguese strings (${Object.keys(officialEn).length} official EN game names).`);

  // Overrides manuais críticos para termos do Satisfactory+
  const manualEn = {
    ...officialEn,
    'Produção': 'Production',
    'PRODUÇÃO': 'PRODUCTION',
    'Energia': 'Power',
    'ENERGIA': 'POWER',
    'Oficina': 'Workshop',
    'OFICINA': 'WORKSHOP',
    'Mapa': 'Map',
    'MAPA': 'MAP',
    'Receitas': 'Recipes',
    'RECEITAS': 'RECIPES',
    'Biblioteca': 'Library',
    'BIBLIOTECA': 'LIBRARY',
    'Calculadora': 'Calculator',
    'CALCULADORA': 'CALCULATOR',
    'Projetos': 'Projects',
    'PROJETOS': 'PROJECTS',
    'Configurações': 'Settings',
    'Escuro': 'Dark',
    'Claro': 'Light',
    'Montar': 'Build',
    'Limpar': 'Clear',
    'Salvar': 'Save',
    'Ativa overclock em todas as máquinas': 'Enables overclock on all machines',
    'Alterar direção da linha': 'Change flow direction',
    'Tudo que você precisa para montar suas fábricas': 'Everything you need to build your factories',
    'Criado por Matheus Pinheiro': 'Created by Matheus Pinheiro'
  };

  const manualEs = {
    'Produção': 'Producción',
    'PRODUÇÃO': 'PRODUCCIÓN',
    'Energia': 'Energía',
    'ENERGIA': 'ENERGÍA',
    'Oficina': 'Taller',
    'OFICINA': 'TALLER',
    'Mapa': 'Mapa',
    'MAPA': 'MAPA',
    'Receitas': 'Recetas',
    'RECEITAS': 'RECETAS',
    'Biblioteca': 'Biblioteca',
    'BIBLIOTECA': 'BIBLIOTECA',
    'Calculadora': 'Calculadora',
    'CALCULADORA': 'CALCULADORA',
    'Projetos': 'Proyectos',
    'PROJETOS': 'PROYECTOS',
    'Configurações': 'Ajustes',
    'Escuro': 'Oscuro',
    'Claro': 'Claro',
    'Montar': 'Montar',
    'Limpar': 'Limpiar',
    'Salvar': 'Guardar',
    'Ativa overclock em todas as máquinas': 'Activa overclock en todas las máquinas',
    'Alterar direção da linha': 'Cambiar dirección de la línea',
    'Tudo que você precisa para montar suas fábricas': 'Todo lo que necesitas para montar tus fábricas',
    'Criado por Matheus Pinheiro': 'Creado por Matheus Pinheiro'
  };

  const [enMap, esMap] = await Promise.all([
    translateAll(allPt, 'en', manualEn),
    translateAll(allPt, 'es', manualEs)
  ]);

  const outPath = path.join(ROOT, 'data/i18n-bundle.js');
  const content = `// Auto-generated full-site i18n bundle for Satisfactory+ (EN-US & ES-ES)\nwindow.SPLUS_I18N_BUNDLE = ${JSON.stringify({ en: enMap, es: esMap })};\n`;
  fs.writeFileSync(outPath, content, 'utf8');
  console.log(`Saved ${outPath} (${(Buffer.byteLength(content, 'utf8') / 1024).toFixed(1)} KB) — EN: ${Object.keys(enMap).length}, ES: ${Object.keys(esMap).length}`);
})();
