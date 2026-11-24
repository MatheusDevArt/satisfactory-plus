/**
 * Satisfactory+ — Motor Global de Tradução (PT-BR / EN-US / ES-ES)
 * e Tooltip Laranja Personalizado (#EA580C).
 */
(function () {
  if (typeof window === 'undefined') return;

  // ===========================================================================
  // 1. DICIONÁRIO EXATO (PT-BR -> [EN-US, ES-ES])
  // ===========================================================================
  const EXACT_MAP = {
    // Home & Navegação
    'Tudo que você precisa para montar suas fábricas': ['Everything you need to build your factories', 'Todo lo que necesitas para montar tus fábricas'],
    'Criado por Matheus Pinheiro': ['Created by Matheus Pinheiro', 'Creado por Matheus Pinheiro'],
    'Descubra': ['Discover', 'Descubre'],
    'Planeje': ['Plan', 'Planifica'],
    'Crie': ['Create', 'Crea'],
    'Produção': ['Production', 'Producción'],
    'PRODUÇÃO': ['PRODUCTION', 'PRODUCCIÓN'],
    'Energia': ['Power', 'Energía'],
    'ENERGIA': ['POWER', 'ENERGÍA'],
    'Oficina': ['Workshop', 'Taller'],
    'OFICINA': ['WORKSHOP', 'TALLER'],
    'Mapa': ['Map', 'Mapa'],
    'MAPA': ['MAP', 'MAPA'],
    'Receitas': ['Recipes', 'Recetas'],
    'RECEITAS': ['RECIPES', 'RECETAS'],
    'Biblioteca': ['Library', 'Biblioteca'],
    'BIBLIOTECA': ['LIBRARY', 'BIBLIOTECA'],
    'Calculadora': ['Calculator', 'Calculadora'],
    'CALCULADORA': ['CALCULATOR', 'CALCULADORA'],
    'Projetos': ['Projects', 'Proyectos'],
    'PROJETOS': ['PROJECTS', 'PROYECTOS'],
    'Configurações': ['Settings', 'Ajustes'],
    'Escuro': ['Dark', 'Oscuro'],
    'Claro': ['Light', 'Claro'],
    'Tutorial': ['Tutorial', 'Tutorial'],
    'Patch notes': ['Patch notes', 'Notas de versión'],
    'Reportar': ['Report', 'Reportar'],
    'Entrar': ['Sign in', 'Iniciar sesión'],
    'Sair': ['Sign out', 'Cerrar sesión'],
    'Criar conta': ['Create account', 'Crear cuenta'],
    'Minha conta': ['My account', 'Mi cuenta'],

    // Tooltips HUD e Barra Lateral
    'Aumentar zoom': ['Zoom in', 'Acercar'],
    'Diminuir zoom': ['Zoom out', 'Alejar'],
    'Resetar zoom': ['Reset zoom', 'Restablecer zoom'],
    'Visão 3D': ['3D View', 'Vista 3D'],
    'Mostrar todas as máquinas': ['Show all machines', 'Mostrar todas las máquinas'],
    'Cards compactos': ['Compact cards', 'Tarjetas compactas'],
    'Centralizar fluxo': ['Center flow', 'Centrar flujo'],
    'Ativa overclock em todas as máquinas': ['Enables overclock on all machines', 'Activa overclock en todas las máquinas'],
    'Alterar direção da linha': ['Change flow direction', 'Cambiar dirección de la línea'],
    'Minimizar barra de navegação': ['Minimize navigation bar', 'Minimizar barra de navegación'],
    'Ocultar painel de controle': ['Hide control panel', 'Ocultar panel de control'],
    'Expandir barra de navegação e painel': ['Expand navigation bar and panel', 'Expandir barra de navegación y panel'],
    'Voltar para a tela Home': ['Back to Home screen', 'Volver a la pantalla inicial'],
    'Alternar entre Modo Claro e Modo Escuro': ['Switch Light / Dark mode', 'Cambiar modo Claro / Oscuro'],
    'Abrir Tutorial Interativo da Ferramenta': ['Open interactive tutorial', 'Abrir tutorial interactivo'],
    'Ver últimas atualizações e melhorias': ['View latest updates', 'Ver últimas actualizaciones'],
    'Reportar bug, enviar sugestão ou avaliação': ['Report a bug or suggestion', 'Reportar error o sugerencia'],
    'Entrar ou criar uma conta': ['Sign in or create an account', 'Iniciar sesión o crear cuenta'],
    '▶ Abrir Painel': ['▶ Open Panel', '▶ Abrir Panel'],

    // Produção & Oficina & Energia
    'Montar': ['Build', 'Montar'],
    '⚡ Montar': ['⚡ Build', '⚡ Montar'],
    'Montar Linha': ['Build Line', 'Montar Línea'],
    'Limpar': ['Clear', 'Limpiar'],
    'Salvar': ['Save', 'Guardar'],
    '💾 Salvar': ['💾 Save', '💾 Guardar'],
    'Cancelar': ['Cancel', 'Cancelar'],
    'Fechar': ['Close', 'Cerrar'],
    'Confirmar': ['Confirm', 'Confirmar'],
    'Excluir': ['Delete', 'Eliminar'],
    'Remover': ['Remove', 'Quitar'],
    'Adicionar': ['Add', 'Añadir'],
    '+ Adicionar': ['+ Add', '+ Añadir'],
    'Duplicar': ['Duplicate', 'Duplicar'],
    'Editar': ['Edit', 'Editar'],
    'Abrir': ['Open', 'Abrir'],
    'Renomear': ['Rename', 'Renombrar'],
    'Compartilhar': ['Share', 'Compartir'],
    'Importar': ['Import', 'Importar'],
    'Copiar': ['Copy', 'Copiar'],
    'Voltar': ['Back', 'Volver'],
    'Anterior': ['Previous', 'Anterior'],
    'Próximo': ['Next', 'Siguiente'],
    'Concluir': ['Finish', 'Finalizar'],
    'Escolha um item': ['Choose an item', 'Elige un objeto'],
    'Escolher Produto Final': ['Choose Final Product', 'Elegir Producto Final'],
    'Buscar qualquer item': ['Search any item', 'Buscar cualquier objeto'],
    'Buscar item...': ['Search item...', 'Buscar objeto...'],
    'Buscar receita...': ['Search recipe...', 'Buscar receta...'],
    'Buscar máquina...': ['Search machine...', 'Buscar máquina...'],
    'Recursos Brutos': ['Raw Resources', 'Recursos Brutos'],
    'Lingotes': ['Ingots', 'Lingotes'],
    'Peças & Componentes': ['Parts & Components', 'Piezas y Componentes'],
    'Biomassa': ['Biomass', 'Biomasa'],
    'Eletrônicos & Motores': ['Electronics & Motors', 'Electrónica y Motores'],
    'Fluidos & Refinaria': ['Fluids & Refinery', 'Fluidos y Refinería'],
    'Equipamentos': ['Equipment', 'Equipamiento'],
    'Elevador Espacial': ['Space Elevator', 'Ascensor Espacial'],
    'Nuclear': ['Nuclear', 'Nuclear'],
    'Material Alienígena': ['Alien Tech', 'Material Alienígena'],
    'Produto Final': ['Final Product', 'Producto Final'],
    'Produtos Finais': ['Final Products', 'Productos Finales'],
    'Receita': ['Recipe', 'Receta'],
    'Receita Padrão': ['Default Recipe', 'Receta Estándar'],
    'Receita Alternativa': ['Alternate Recipe', 'Receta Alternativa'],
    'Alternativas': ['Alternates', 'Alternativas'],
    'Todas': ['All', 'Todas'],
    'Todos': ['All', 'Todos'],
    'Padrão': ['Default', 'Estándar'],
    'Máquinas por Tipo': ['Machines by Type', 'Máquinas por Tipo'],
    'Extração': ['Extraction', 'Extracción'],
    'Máquinas de produção': ['Production machines', 'Máquinas de producción'],
    'Esteiras': ['Conveyor Belts', 'Cintas transportadoras'],
    'Divisores / Unificadores': ['Splitters / Mergers', 'Divisores / Unificadores'],
    'Conexões / Tubos': ['Pipes / Junctions', 'Tuberías / Uniones'],
    'Informações da Máquina': ['Machine Info', 'Información de la Máquina'],
    'Entradas': ['Inputs', 'Entradas'],
    'Saídas': ['Outputs', 'Salidas'],
    'Ingredientes': ['Ingredients', 'Ingredientes'],
    'Produtos': ['Products', 'Productos'],
    'Consumo de Energia': ['Power Consumption', 'Consumo de Energía'],
    'Geração de Energia': ['Power Generation', 'Generación de Energía'],
    'Fragmentos de Energia': ['Power Shards', 'Fragmentos de Energía'],
    'Por energia (MW)': ['By power (MW)', 'Por energía (MW)'],
    'Por geradores': ['By generators', 'Por generadores'],
    'Por combustível': ['By fuel', 'Por combustible'],
    'Combustível': ['Fuel', 'Combustible'],
    'Geradores': ['Generators', 'Generadores'],
    'Gerador': ['Generator', 'Generador'],
    'Adicionar Máquina': ['Add Machine', 'Añadir Máquina'],
    'Verificar': ['Check', 'Verificar'],
    'Diagnóstico': ['Diagnostics', 'Diagnóstico'],
    'Divisor': ['Splitter', 'Divisor'],
    'Unificador': ['Merger', 'Unificador'],
    'Junção': ['Junction', 'Unión'],
    'Contêiner': ['Container', 'Contenedor'],

    // Calculadora
    'Ferramentas': ['Tools', 'Herramientas'],
    'Operações Rápidas': ['Quick Operations', 'Operaciones Rápidas'],
    'Histórico de Contas': ['Calculation History', 'Historial de Cálculos'],
    'RESULTADOS': ['RESULTS', 'RESULTADOS'],
    'Numérica': ['Numeric', 'Numérica'],
    'Recursos': ['Resources', 'Recursos'],
    'Logística': ['Logistics', 'Logística'],

    // Mapa & Biblioteca & Receitas
    'Filtros': ['Filters', 'Filtros'],
    'Nós de Recursos': ['Resource Nodes', 'Nodos de Recursos'],
    'Puro': ['Pure', 'Puro'],
    'Normal': ['Normal', 'Normal'],
    'Impuro': ['Impure', 'Impuro'],
    'Mostrar tudo': ['Show all', 'Mostrar todo'],
    'Limpar filtros': ['Clear filters', 'Limpiar filtros'],
    'Categorias': ['Categories', 'Categorías'],
    'Detalhes': ['Details', 'Detalles'],
    'Itens': ['Items', 'Objetos'],
    'Construções': ['Buildings', 'Edificios'],
    'Máquinas': ['Machines', 'Máquinas'],
    'Receitas que produzem': ['Produced by recipes', 'Recetas que producen'],
    'Usado em': ['Used in', 'Usado en'],

    // Configurações
    'Geral': ['General', 'General'],
    'Preferências': ['Preferences', 'Preferencias'],
    'Conta': ['Account', 'Cuenta'],
    'Idioma': ['Language', 'Idioma'],
    'Idioma da Ferramenta': ['Interface Language', 'Idioma de la Herramienta'],
    'Mostrar grade de pontos': ['Show dot grid', 'Mostrar cuadrícula de puntos'],
    'Exibe pontos de referência no fundo do canvas': ['Shows reference dots on the canvas background', 'Muestra puntos de referencia en el fondo del lienzo'],
    'Alinhar à grade na Oficina': ['Snap to grid in Workshop', 'Ajustar a la cuadrícula en Taller'],
    'Encaixa blocos automaticamente na grade ao mover': ['Automatically snaps blocks to the grid when moving', 'Encaja bloques automáticamente en la cuadrícula al mover'],
    'Expande cada máquina individualmente ao gerar linhas': ['Expands each machine individually when building lines', 'Expande cada máquina individualmente al generar líneas'],
    'Iniciar com a barra lateral minimizada': ['Start with sidebar minimized', 'Iniciar con barra lateral minimizada'],
    'Abre o planejador com mais área livre no canvas': ['Opens the planner with more free canvas area', 'Abre el planificador con más espacio libre en el lienzo'],
    'Reduzir animações': ['Reduce animations', 'Reducir animaciones'],
    'Desativa transições e animação das esteiras': ['Disables transitions and conveyor belt animations', 'Desactiva transiciones y animaciones de cintas'],
    'Formatar energia em MW e GW': ['Format power in MW and GW', 'Formatear energía en MW y GW'],
    'Converte automaticamente valores grandes de energia': ['Automatically converts large power values', 'Convierte automáticamente valores grandes de energía'],
    'Mostrar patch notes ao atualizar': ['Show patch notes on update', 'Mostrar notas de versión al actualizar'],
    'Exibe as novidades quando uma nova versão for publicada': ['Shows updates when a new version is published', 'Muestra novedades cuando se publica una nueva versión'],
    'Pergunta de segurança ativa': ['Security question active', 'Pregunta de seguridad activa'],
    'Pergunta de segurança pendente': ['Security question pending', 'Pregunta de seguridad pendiente'],
    'Sua pergunta de segurança': ['Your security question', 'Tu pregunta de seguridad'],
    'Sua resposta secreta': ['Your secret answer', 'Tu respuesta secreta'],
    'Confirme sua senha': ['Confirm your password', 'Confirma tu contraseña'],
    'Salvar pergunta': ['Save question', 'Guardar pregunta'],

    // Conta, Projetos & Reports
    'Usuário': ['Username', 'Usuario'],
    'Senha': ['Password', 'Contraseña'],
    'Confirmar senha': ['Confirm password', 'Confirmar contraseña'],
    'Esqueci minha senha': ['Forgot password', 'Olvidé mi contraseña'],
    'Meus Projetos': ['My Projects', 'Mis Proyectos'],
    'Salvar Projeto': ['Save Project', 'Guardar Proyecto'],
    'Nenhum projeto salvo ainda.': ['No saved projects yet.', 'Aún no hay proyectos guardados.'],
    'Meus Reports': ['My Reports', 'Mis Reportes'],
    'Enviar Report': ['Submit Report', 'Enviar Reporte'],
    'Sugestão': ['Suggestion', 'Sugerencia'],
    'Melhoria': ['Improvement', 'Mejora'],
    'Dúvida': ['Question', 'Duda'],
    'Título': ['Title', 'Título'],
    'Mensagem': ['Message', 'Mensaje'],
    'Enviar': ['Send', 'Enviar'],
    'Novo': ['New', 'Nuevo'],
    'Lido': ['Read', 'Leído'],
    'Resolvido': ['Resolved', 'Resuelto'],
    'Correção': ['Fix', 'Corrección'],
    'Novidades & Atualizações': ['What\'s New & Updates', 'Novedades y Actualizaciones'],
    '📖 Tutorial — Satisfactory+': ['📖 Tutorial — Satisfactory+', '📖 Tutorial — Satisfactory+']
  };

  // ===========================================================================
  // 2. PADRÕES DINÂMICOS (com números/variáveis)
  // ===========================================================================
  const PATTERN_MAP = [
    { re: /^(\d+)\s+itens fabricáveis$/i, en: '$1 craftable items', es: '$1 objetos fabricables' },
    { re: /^Passo\s+(\d+)\s+de\s+(\d+)$/i, en: 'Step $1 of $2', es: 'Paso $1 de $2' },
    { re: /^(\d+)\s+fragmentos?$/i, en: '$1 shard(s)', es: '$1 fragmento(s)' },
    { re: /^(\d+)\s+máquinas?$/i, en: '$1 machine(s)', es: '$1 máquina(s)' },
    { re: /^(\d+)\s+receitas?$/i, en: '$1 recipe(s)', es: '$1 receta(s)' },
    { re: /^(\d+)\s+itens?$/i, en: '$1 item(s)', es: '$1 objeto(s)' },
    { re: /^Andar\s+(\d+)$/i, en: 'Floor $1', es: 'Piso $1' },
    { re: /^Etapa\s+(\d+)$/i, en: 'Stage $1', es: 'Etapa $1' }
  ];

  // ===========================================================================
  // 3. GLOSSÁRIO PARA TEXTOS LONGOS (Tutorial, Patch Notes, descrições)
  // ===========================================================================
  const PHRASE_REPLACEMENTS = {
    'en-US': [
      ['Barra de navegação', 'Navigation bar'],
      ['barra de navegação', 'navigation bar'],
      ['barra lateral', 'sidebar'],
      ['Barra lateral', 'Sidebar'],
      ['linha de produção', 'production line'],
      ['Linha de produção', 'Production line'],
      ['produto final', 'final product'],
      ['Produto final', 'Final product'],
      ['Todas as máquinas', 'All machines'],
      ['todas as máquinas', 'all machines'],
      ['Esteiras', 'Conveyor belts'],
      ['esteiras', 'conveyor belts'],
      ['tubulações', 'pipelines'],
      ['Tubulações', 'Pipelines'],
      ['divisores', 'splitters'],
      ['unificadores', 'mergers'],
      ['Fragmentos de Energia', 'Power Shards'],
      ['modo escuro', 'dark mode'],
      ['modo claro', 'light mode'],
      ['botão do meio do mouse', 'middle mouse button'],
      ['clique em', 'click on'],
      ['Clique em', 'Click on'],
      ['Escolha', 'Choose'],
      ['escolha', 'choose'],
      ['Selecione', 'Select'],
      ['selecione', 'select'],
      ['Digite', 'Type'],
      ['digite', 'type'],
      ['Adicione', 'Add'],
      ['adicione', 'add'],
      ['Salve', 'Save'],
      ['salve', 'save'],
      ['projetos salvos', 'saved projects'],
      ['mapa interativo', 'interactive map'],
      ['Mapa interativo', 'Interactive map'],
      ['receitas alternativas', 'alternate recipes'],
      ['Receitas alternativas', 'Alternate recipes'],
      ['Configurações', 'Settings'],
      ['configurações', 'settings'],
      ['Calculadora', 'Calculator'],
      ['Biblioteca', 'Library'],
      ['Oficina', 'Workshop'],
      ['Produção', 'Production'],
      ['Energia', 'Power'],
      ['Receitas', 'Recipes'],
      ['Projetos', 'Projects'],
      ['Máquinas', 'Machines'],
      ['máquinas', 'machines'],
      ['máquina', 'machine'],
      ['geradores', 'generators'],
      ['combustível', 'fuel'],
      ['atualizações', 'updates'],
      ['melhorias', 'improvements'],
      ['correções', 'fixes'],
      ['Agora você pode', 'Now you can'],
      ['agora você pode', 'now you can'],
      ['para ver', 'to view'],
      ['para abrir', 'to open'],
      ['para salvar', 'to save'],
      ['para limpar', 'to clear'],
      ['no canto superior direito', 'in the top-right corner'],
      ['no canto inferior', 'at the bottom'],
      ['na nuvem', 'in the cloud']
    ],
    'es-ES': [
      ['Barra de navegação', 'Barra de navegación'],
      ['barra de navegação', 'barra de navegación'],
      ['linha de produção', 'línea de producción'],
      ['Linha de produção', 'Línea de producción'],
      ['produto final', 'producto final'],
      ['Produto final', 'Producto final'],
      ['Esteiras', 'Cintas'],
      ['esteiras', 'cintas'],
      ['tubulações', 'tuberías'],
      ['Tubulações', 'Tuberías'],
      ['Fragmentos de Energia', 'Fragmentos de Energía'],
      ['botão do meio do mouse', 'botón central del ratón'],
      ['clique em', 'haz clic en'],
      ['Clique em', 'Haz clic en'],
      ['Escolha', 'Elige'],
      ['escolha', 'elige'],
      ['Selecione', 'Selecciona'],
      ['selecione', 'selecciona'],
      ['Digite', 'Escribe'],
      ['digite', 'escribe'],
      ['Adicione', 'Añade'],
      ['adicione', 'añade'],
      ['Salve', 'Guarda'],
      ['salve', 'guarda'],
      ['projetos salvos', 'proyectos guardados'],
      ['mapa interativo', 'mapa interactivo'],
      ['receitas alternativas', 'recetas alternativas'],
      ['Configurações', 'Ajustes'],
      ['configurações', 'ajustes'],
      ['Oficina', 'Taller'],
      ['Produção', 'Producción'],
      ['Energia', 'Energía'],
      ['Receitas', 'Recetas'],
      ['Projetos', 'Proyectos'],
      ['combustível', 'combustible'],
      ['atualizações', 'actualizaciones'],
      ['melhorias', 'mejoras'],
      ['correções', 'correcciones'],
      ['Agora você pode', 'Ahora puedes'],
      ['agora você pode', 'ahora puedes'],
      ['no canto superior direito', 'en la esquina superior derecha'],
      ['na nuvem', 'en la nube']
    ]
  };

  function translateString(orig, lang) {
    if (!orig || lang === 'pt-BR') return orig;
    const idx = lang === 'en-US' ? 0 : (lang === 'es-ES' ? 1 : -1);
    if (idx < 0) return orig;

    const trimmed = orig.trim();
    if (!trimmed) return orig;

    // 1. Exact match
    if (EXACT_MAP[trimmed]) {
      const lead = orig.match(/^\s*/)[0];
      const trail = orig.match(/\s*$/)[0];
      return lead + EXACT_MAP[trimmed][idx] + trail;
    }

    // 2. Dynamic pattern match
    for (const p of PATTERN_MAP) {
      if (p.re.test(trimmed)) {
        const lead = orig.match(/^\s*/)[0];
        const trail = orig.match(/\s*$/)[0];
        const repl = idx === 0 ? p.en : p.es;
        return lead + trimmed.replace(p.re, repl) + trail;
      }
    }

    // 3. Phrase replacements for longer text (tutorial, patch notes, descriptions)
    if (trimmed.length >= 12) {
      const pairs = PHRASE_REPLACEMENTS[lang];
      if (pairs) {
        let out = orig;
        let changed = false;
        for (const [pt, tr] of pairs) {
          if (out.includes(pt)) {
            out = out.split(pt).join(tr);
            changed = true;
          }
        }
        if (changed) return out;
      }
    }

    return orig;
  }

  const _origTextMap = new WeakMap();
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA', 'OPTION']);

  function shouldSkipNode(node) {
    let cur = node.nodeType === 3 ? node.parentElement : node;
    while (cur) {
      if (SKIP_TAGS.has(cur.tagName)) return true;
      if (cur.id === 'ceo-workspace-view') return true;
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

    // Placeholders & custom tooltips
    if (root.querySelectorAll) {
      root.querySelectorAll('input[placeholder], textarea[placeholder]').forEach((el) => {
        if (shouldSkipNode(el)) return;
        if (!el.dataset.i18nOrigPh) el.dataset.i18nOrigPh = el.placeholder;
        el.placeholder = translateString(el.dataset.i18nOrigPh, lang);
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

  // Hook into applyI18nToDOM so every language change translates the whole site
  const origApplyI18n = window.applyI18nToDOM;
  window.applyI18nToDOM = function () {
    if (typeof origApplyI18n === 'function') origApplyI18n();
    applyFullSiteI18n();
  };
  window.translateSiteText = translateString;

  // ===========================================================================
  // 4. TOOLTIP LARANJA PERSONALIZADO (#EA580C) — SUBSTITUI TOOLTIP NATIVO FEIO
  // ===========================================================================
  function initCustomOrangeTooltips() {
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

      // Se estiver na barra vertical direita, mostrar à esquerda do ícone
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

      // Move native title to data-tip so browser never renders the black native tooltip
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
