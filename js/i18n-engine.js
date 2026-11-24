/**
 * Satisfactory+ — Motor Global de Tradução Completa (PT-BR / EN-US / ES-ES)
 * Consome data/i18n-bundle.js + nomes oficiais de SATISFACTORY_DATA / LIBRARY / MAP,
 * traduz nós de texto (inclusive maiúsculas/compostos/canvas/barra de status),
 * <option>, placeholders, tooltips laranja (#EA580C) e toasts.
 */
(function () {
  if (typeof window === 'undefined') return;

  function normSpace(s) {
    return String(s || '').replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
  }

  function isAllUpper(s) {
    const letters = s.replace(/[^A-Za-zÀ-ÿ]/g, '');
    return letters.length >= 2 && letters === letters.toUpperCase();
  }

  const _gameEnIndex = {};
  const _lowerEn = {};
  const _lowerEs = {};
  let _indexesBuilt = false;

  function ensureIndexes() {
    if (_indexesBuilt) return;
    _indexesBuilt = true;
    try {
      const gd = window.SATISFACTORY_DATA;
      if (gd && typeof gd === 'object') {
        for (const sec of ['items', 'machines', 'extractors', 'recipes', 'belts', 'pipes', 'generators', 'logistics']) {
          const obj = gd[sec];
          if (!obj || typeof obj !== 'object') continue;
          for (const v of Object.values(obj)) {
            if (v && v.name && v.nameEn) {
              const k = normSpace(v.name);
              const val = normSpace(v.nameEn);
              _gameEnIndex[k] = val;
              _lowerEn[k.toLowerCase()] = val;
              if (v.name.startsWith('Alternativa: ')) {
                const ck = normSpace(v.name.slice('Alternativa: '.length));
                const cv = normSpace(v.nameEn.replace(/^Alternate:\s*/i, ''));
                _gameEnIndex[ck] = cv;
                _lowerEn[ck.toLowerCase()] = cv;
              }
            }
          }
        }
      }
      const lib = window.SATISFACTORY_LIBRARY_EXTRA;
      if (lib && typeof lib === 'object') {
        for (const arr of Object.values(lib)) {
          if (!Array.isArray(arr)) continue;
          for (const e of arr) {
            if (e && e.name && e.nameEn) {
              const k = normSpace(e.name);
              _gameEnIndex[k] = normSpace(e.nameEn);
              _lowerEn[k.toLowerCase()] = normSpace(e.nameEn);
            }
          }
        }
      }
      const md = window.SATISFACTORY_MAP_DATA;
      if (md && Array.isArray(md.groups)) {
        for (const g of md.groups) {
          for (const c of (g.categories || [])) {
            if (c && c.title && c.enTitle) {
              const k = normSpace(c.title);
              _gameEnIndex[k] = normSpace(c.enTitle);
              _lowerEn[k.toLowerCase()] = normSpace(c.enTitle);
            }
          }
        }
      }
      const bundle = window.SPLUS_I18N_BUNDLE;
      if (bundle?.en) {
        for (const [k, v] of Object.entries(bundle.en)) {
          _lowerEn[k.toLowerCase()] = v;
        }
      }
      if (bundle?.es) {
        for (const [k, v] of Object.entries(bundle.es)) {
          _lowerEs[k.toLowerCase()] = v;
        }
      }
    } catch {}
  }

  function lookupExact(trimmed, lang) {
    ensureIndexes();
    const bundle = window.SPLUS_I18N_BUNDLE;
    const dict = lang === 'en-US' ? bundle?.en : (lang === 'es-ES' ? bundle?.es : null);
    if (dict && dict[trimmed]) return dict[trimmed];
    if (lang === 'en-US' && _gameEnIndex[trimmed]) return _gameEnIndex[trimmed];

    // Case-insensitive lookup (preserva CAIXA ALTA em títulos de canvas como SAÍDA, PRODUÇÃO FINAL)
    const lowerMap = lang === 'en-US' ? _lowerEn : (lang === 'es-ES' ? _lowerEs : null);
    if (lowerMap) {
      const hit = lowerMap[trimmed.toLowerCase()];
      if (hit) return isAllUpper(trimmed) ? hit.toUpperCase() : hit;
    }
    return null;
  }

  const PATTERN_MAP = [
    { re: /^(\d+)\s+itens fabricáveis$/i, en: '$1 craftable items', es: '$1 objetos fabricables' },
    { re: /^Passo\s+(\d+)\s+de\s+(\d+)$/i, en: 'Step $1 of $2', es: 'Paso $1 de $2' },
    { re: /^(\d+)\s+fragmentos?$/i, en: '$1 shard(s)', es: '$1 fragmento(s)' },
    { re: /^(\d+)\s+máquinas?$/i, en: '$1 machine(s)', es: '$1 máquina(s)' },
    { re: /^(\d+)\s+receitas?$/i, en: '$1 recipe(s)', es: '$1 receta(s)' },
    { re: /^(\d+)\s+itens?$/i, en: '$1 item(s)', es: '$1 objeto(s)' },
    { re: /^(\d+)\s+blocos?$/i, en: '$1 block(s)', es: '$1 bloque(s)' },
    { re: /^(\d+)\s+geradores?$/i, en: '$1 generator(s)', es: '$1 generador(es)' },
    { re: /^(\d+)\s+etapas?$/i, en: '$1 stage(s)', es: '$1 etapa(s)' },
    { re: /^Andar\s+(\d+)$/i, en: 'Floor $1', es: 'Piso $1' },
    { re: /^Etapa\s+(\d+)$/i, en: 'Stage $1', es: 'Etapa $1' },
    { re: /^Fase\s+(\d+)\s*[—–-]\s*(.+)$/i, en: 'Phase $1 — $2', es: 'Fase $1 — $2' },
    { re: /^Tier\s+(\d+)\s*\((.+)\)$/i, en: 'Tier $1 ($2)', es: 'Nivel $1 ($2)' },
    { re: /^Alternativa:\s*(.+)$/i, en: 'Alternate: $1', es: 'Alternativa: $1' },
    { re: /^N[óo]\s+de\s+(.+)$/i, en: '$1 Node', es: 'Nodo de $1' },
    { re: /^Esteira\s+v\.(\d+)$/i, en: 'Belt Mk.$1', es: 'Cinta v.$1' },
    { re: /^Tubula[çc][ãa]o\s+v\.(\d+)$/i, en: 'Pipeline Mk.$1', es: 'Tubería v.$1' },
    { re: /^(\d+)\s*[x×]\s+(.+)$/i, en: '$1x $2', es: '$1x $2' },
    { re: /^(.+?)\s+#(\d+)$/i, en: '$1 #$2', es: '$1 #$2' },
    { re: /^v\.(\d+)$/i, en: 'Mk.$1', es: 'v.$1' },
    { re: /^([\d.,]+)\s*un\/min$/i, en: '$1 u/min', es: '$1 u/min' },
    { re: /^([\d.,]+)\s*un$/i, en: '$1 u', es: '$1 u' }
  ];

  function translatePiece(trimmed, lang, depth = 0) {
    if (!trimmed || depth > 4) return trimmed;
    const direct = lookupExact(trimmed, lang);
    if (direct) return direct;

    // 1. Emoji / símbolo curto no início (ex: "💎 0 fragmentos", "🗺️ Mapa Real...")
    const emojiM = trimmed.match(/^([^\wÀ-ÿ]{1,5}\s+)(.+)$/);
    if (emojiM) {
      const trRest = translatePiece(emojiM[2].trim(), lang, depth + 1);
      if (trRest !== emojiM[2].trim()) return emojiM[1] + trRest;
    }

    // 2. Separadores compostos (" — ", " · ", " • ")
    for (const sep of [' — ', ' · ', ' • ']) {
      if (trimmed.includes(sep)) {
        const parts = trimmed.split(sep);
        let anyChanged = false;
        const mapped = parts.map((pt) => {
          const t = translatePiece(pt.trim(), lang, depth + 1);
          if (t !== pt.trim()) anyChanged = true;
          return t;
        });
        if (anyChanged) return mapped.join(sep);
      }
    }

    // 3. Padrões dinâmicos (Nó de X, Construtor #1, 1x Construtor, Esteira v.1, 0 fragmentos...)
    for (const p of PATTERN_MAP) {
      const m = trimmed.match(p.re);
      if (m) {
        let tpl = lang === 'en-US' ? p.en : p.es;
        const upper = isAllUpper(trimmed);
        for (let i = 1; i < m.length; i++) {
          const cap = m[i];
          const inner = /^[\d.,]+$/.test(cap) ? cap : translatePiece(cap.trim(), lang, depth + 1);
          tpl = tpl.replace(`$${i}`, inner);
        }
        return upper ? tpl.toUpperCase() : tpl;
      }
    }

    // 4. Padrão genérico "Rótulo (Valor)" — cobre barra inferior de status, Esteira v.1 (60/min), purezas, etc.
    const parenM = trimmed.match(/^(.+?)\s*\(([^()]+)\)$/);
    if (parenM) {
      const leftTr = translatePiece(parenM[1].trim(), lang, depth + 1);
      const rightTr = translatePiece(parenM[2].trim(), lang, depth + 1);
      if (leftTr !== parenM[1].trim() || rightTr !== parenM[2].trim()) {
        return `${leftTr} (${rightTr})`;
      }
    }

    return trimmed;
  }

  function translateString(orig, lang) {
    if (!orig || lang === 'pt-BR') return orig;
    if (lang !== 'en-US' && lang !== 'es-ES') return orig;

    const norm = normSpace(orig);
    if (!norm) return orig;

    const direct = lookupExact(norm, lang);
    if (direct) {
      const lead = orig.match(/^\s*/)[0];
      const trail = orig.match(/\s*$/)[0];
      return lead + direct + trail;
    }

    if (orig.includes('\n')) {
      const lines = orig.split('\n');
      let changed = false;
      const outLines = lines.map((ln) => {
        const t = normSpace(ln);
        if (!t) return ln;
        const tr = translatePiece(t, lang);
        if (tr !== t) {
          changed = true;
          const l = ln.match(/^\s*/)[0];
          const r = ln.match(/\s*$/)[0];
          return l + tr + r;
        }
        return ln;
      });
      if (changed) return outLines.join('\n');
    }

    const pieceTr = translatePiece(norm, lang);
    if (pieceTr !== norm) {
      const lead = orig.match(/^\s*/)[0];
      const trail = orig.match(/\s*$/)[0];
      return lead + pieceTr + trail;
    }

    return orig;
  }

  const _origTextMap = new WeakMap();
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA']);

  function shouldSkipNode(node) {
    let cur = node.nodeType === 3 ? node.parentElement : node;
    while (cur) {
      if (SKIP_TAGS.has(cur.tagName)) return true;
      if (cur.id === 'ceo-workspace-view') return true;
      if (cur.hasAttribute && (cur.hasAttribute('data-no-i18n') || cur.hasAttribute('data-lang'))) return true;
      if (cur.classList && (cur.classList.contains('top-lang-switcher') || cur.classList.contains('top-lang-btn'))) return true;
      cur = cur.parentElement;
    }
    return false;
  }

  function translateSubtree(root, lang) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      if (shouldSkipNode(node)) continue;
      let orig = _origTextMap.get(node);
      if (orig === undefined) {
        orig = node.nodeValue;
        _origTextMap.set(node, orig);
      } else if (lang === 'pt-BR') {
        if (node.nodeValue !== orig) node.nodeValue = orig;
        continue;
      }
      const nextVal = translateString(orig, lang);
      if (node.nodeValue !== nextVal) {
        node.nodeValue = nextVal;
      }
    }

    if (root.querySelectorAll) {
      root.querySelectorAll('input[placeholder], textarea[placeholder]').forEach((el) => {
        if (shouldSkipNode(el)) return;
        if (!el.dataset.i18nOrigPh) el.dataset.i18nOrigPh = el.placeholder;
        el.placeholder = lang === 'pt-BR' ? el.dataset.i18nOrigPh : translateString(el.dataset.i18nOrigPh, lang);
      });
    }
  }

  let _i18nRaf = null;
  let _isTranslating = false;

  function applyFullSiteI18n() {
    if (_isTranslating) return;
    _isTranslating = true;
    try {
      const lang = (typeof SettingsState === 'object' && SettingsState.prefs?.lang) || 'pt-BR';
      translateSubtree(document.body, lang);
    } finally {
      _isTranslating = false;
    }
  }

  function scheduleFullSiteI18n() {
    if (_i18nRaf) return;
    _i18nRaf = requestAnimationFrame(() => {
      _i18nRaf = null;
      const lang = (typeof SettingsState === 'object' && SettingsState.prefs?.lang) || 'pt-BR';
      if (lang !== 'pt-BR') applyFullSiteI18n();
    });
  }

  const origApplyI18n = window.applyI18nToDOM;
  window.applyI18nToDOM = function () {
    if (typeof origApplyI18n === 'function') origApplyI18n();
    applyFullSiteI18n();
  };
  window.translateSiteText = translateString;

  if (typeof window.showAccountToast === 'function') {
    const origToast = window.showAccountToast;
    window.showAccountToast = function (msg, type) {
      const lang = (typeof SettingsState === 'object' && SettingsState.prefs?.lang) || 'pt-BR';
      const translated = lang === 'pt-BR' ? msg : translateString(String(msg || ''), lang);
      return origToast(translated, type);
    };
  }

  function initCustomOrangeTooltips() {
    if (document.getElementById('splus-orange-tooltip')) return;
    const tipEl = document.createElement('div');
    tipEl.id = 'splus-orange-tooltip';
    tipEl.className = 'splus-tooltip';
    tipEl.setAttribute('role', 'tooltip');
    document.body.appendChild(tipEl);

    let showTimer = null;
    let activeTarget = null;

    function hideTip() {
      if (showTimer) { clearTimeout(showTimer); showTimer = null; }
      activeTarget = null;
      tipEl.classList.remove('is-visible');
    }

    function positionTip(el) {
      const rect = el.getBoundingClientRect();
      const tipRect = tipEl.getBoundingClientRect();
      const pad = 10;
      let left = rect.left + (rect.width - tipRect.width) / 2;
      let top = rect.top - tipRect.height - 8;

      if (el.closest('.spaces-hud-controls')) {
        left = rect.left - tipRect.width - 10;
        top = rect.top + (rect.height - tipRect.height) / 2;
      } else if (el.closest('.main-nav-rail')) {
        left = rect.right + 10;
        top = rect.top + (rect.height - tipRect.height) / 2;
      } else if (top < pad) {
        top = rect.bottom + 8;
      }

      if (left < pad) left = pad;
      if (left + tipRect.width > window.innerWidth - pad) {
        left = window.innerWidth - tipRect.width - pad;
      }
      if (top < pad) top = pad;
      if (top + tipRect.height > window.innerHeight - pad) {
        top = window.innerHeight - tipRect.height - pad;
      }

      tipEl.style.left = `${Math.round(left)}px`;
      tipEl.style.top = `${Math.round(top)}px`;
    }

    document.addEventListener('mouseover', (e) => {
      const target = e.target && e.target.closest
        ? e.target.closest('.spaces-hud-controls [title], .spaces-hud-controls [data-tip], .main-nav-rail [title], .main-nav-rail [data-tip], .top-right-floating-actions [title], .top-right-floating-actions [data-tip]')
        : null;
      if (!target) {
        if (activeTarget) hideTip();
        return;
      }
      if (target === activeTarget) return;

      if (target.hasAttribute('title')) {
        const rawT = target.getAttribute('title');
        if (rawT) target.setAttribute('data-tip', rawT);
        target.removeAttribute('title');
      }
      const rawTip = target.getAttribute('data-tip');
      if (!rawTip) return;

      hideTip();
      activeTarget = target;
      showTimer = setTimeout(() => {
        if (!activeTarget || !document.body.contains(activeTarget)) return;
        const lang = (typeof SettingsState === 'object' && SettingsState.prefs?.lang) || 'pt-BR';
        tipEl.textContent = translateString(rawTip, lang);
        tipEl.classList.add('is-visible');
        positionTip(activeTarget);
      }, 260);
    }, true);

    document.addEventListener('mouseout', (e) => {
      if (!activeTarget) return;
      if (!e.relatedTarget || !activeTarget.contains(e.relatedTarget)) {
        hideTip();
      }
    }, true);

    document.addEventListener('mousedown', hideTip, true);
    window.addEventListener('scroll', hideTip, true);
  }

  function boot() {
    initCustomOrangeTooltips();
    applyFullSiteI18n();
    const obs = new MutationObserver(() => {
      if (!_isTranslating) scheduleFullSiteI18n();
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
