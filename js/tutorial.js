/* ============================================================================
 * TUTORIAL INTERATIVO DIDÁTICO — SATISFACTORY+ 1.0+
 * 13 passos visuais com prints reais, marcadores numerados em %, índice,
 * navegação por teclado/toque, lightbox e glossário.
 * ========================================================================== */

const TUTORIAL_SLIDES = [
  {
    id: 'como-usar',
    title: 'O que tem na tela principal?',
    oneLiner: 'A tela se divide em quatro áreas simples: painel à esquerda, área de trabalho, topo e barra inferior.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-01-inicio.webp',
        alt: 'Visão geral da interface do Satisfactory+ mostrando painel esquerdo, área de trabalho central, botões no topo direito e controles inferiores.',
        markers: [
          { n: 1, x: 16, y: 24 },
          { n: 2, x: 64, y: 50 },
          { n: 3, x: 83, y: 6 },
          { n: 4, x: 64, y: 95 }
        ]
      }
    ],
    legend: [
      '<strong>Painel esquerdo</strong>: abas da ferramenta, escolhas de itens e botão para gerar a linha.',
      '<strong>Área de trabalho</strong>: espaço central onde as máquinas e esteiras são desenhadas.',
      '<strong>Topo direito</strong>: direção do fluxo, <strong>Tutorial</strong>, <strong>Patch notes</strong>, <strong>Reportar</strong> e <strong>Entrar</strong>.',
      '<strong>Barra inferior</strong>: zoom, <strong>Visão 3D</strong>, agrupamento de máquinas e <strong>Centralizar</strong>.'
    ],
    tip: 'Use as setas do teclado (← →) para trocar de passo e clique em qualquer imagem para ampliar.'
  },
  {
    id: 'abas',
    title: 'Qual aba usar para cada tarefa?',
    oneLiner: 'Cada aba no painel esquerdo resolve uma parte diferente do planejamento da fábrica.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-02-abas.webp',
        alt: 'Barra de abas no topo do painel esquerdo com Produção, Energia, Livre, Mapa, Receitas, Biblioteca e Calculadora.',
        markers: [
          { n: 1, x: 15, y: 38 },
          { n: 2, x: 37, y: 38 },
          { n: 3, x: 61, y: 38 },
          { n: 4, x: 83, y: 38 },
          { n: 5, x: 42, y: 64 }
        ]
      }
    ],
    legend: [
      '<strong>🏭 Produção</strong>: calcula automaticamente toda a fábrica a partir de um item ou recurso.',
      '<strong>⚡ Energia</strong>: planeja geradores, combustível e consumo de água.',
      '<strong>🛠️ Livre</strong>: monte máquinas e esteiras manualmente do seu jeito.',
      '<strong>🗺️ Mapa</strong>: encontre nós de recurso no mapa do jogo e envie para a produção.',
      '<strong>📜 Receitas</strong>, <strong>📚 Biblioteca</strong> e <strong>🧮 Calculadora</strong>: consulte receitas, itens e faça contas rápidas.'
    ],
    tip: 'Ao entrar na sua conta, aparece também a aba <strong>📁 Projetos</strong> para abrir fábricas salvas.'
  },
  {
    id: 'primeira-linha',
    title: 'Como gerar sua primeira linha de produção?',
    oneLiner: 'Escolha o item que quer fabricar, digite quantos por minuto e clique para montar.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-03-primeira-linha.webp',
        alt: 'Painel lateral da aba Produção com Chapa de Ferro configurada para 30 por minuto e o botão Montar Linha de Produção.',
        markers: [
          { n: 1, x: 48, y: 36 },
          { n: 2, x: 48, y: 74 },
          { n: 3, x: 48, y: 89 }
        ]
      }
    ],
    legend: [
      'Clique em <strong>🎯 Começar com Produto Final</strong> e escolha o item (no exemplo, <strong>Chapa de Ferro</strong>).',
      'A <strong>Quantidade Desejada</strong> já vem preenchida com a produção base de 1 máquina a 100% (ex.: <strong>20/min</strong> em <strong>Chapa de Ferro</strong>).',
      'Clique no botão laranja <strong>⚡ Montar Linha de Produção</strong> para desenhar toda a fábrica.'
    ],
    tip: 'Você também pode começar pela mineradora usando <strong>⛏️ Começar com Recurso / Mineradora</strong>.',
    tryAction: { label: 'Experimentar em Produção', mode: 'production' }
  },
  {
    id: 'como-ler-fluxo',
    title: 'Como ler o fluxo da produção?',
    oneLiner: 'O material sempre anda da esquerda para a direita: quem produz fica antes de quem usa.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-04-fluxo.webp',
        alt: 'Fluxo de produção de Chapa de Ferro da esquerda para a direita mostrando Nó de Minério de Ferro, Fornalha, Construtor e Produto Final.',
        markers: [
          { n: 1, x: 34, y: 26 },
          { n: 2, x: 50, y: 28 },
          { n: 3, x: 66, y: 29 },
          { n: 4, x: 50, y: 70 },
          { n: 5, x: 34, y: 71 }
        ]
      }
    ],
    legend: [
      '<strong>Origem</strong>: o recurso sai do solo aqui e começa o caminho.',
      '<strong>Esteira</strong>: linha laranja que sai da direita e entra na esquerda da próxima máquina.',
      '<strong>Máquina produtora</strong>: transforma o material (ex.: <strong>FORNALHA #1</strong>).',
      '<strong>Etiqueta no meio</strong>: mostra a versão da esteira e a vazão (itens por minuto).',
      '<strong>Máquina seguinte</strong>: recebe o item e continua a produção.'
    ],
    tip: 'Prefere ler na vertical? Clique em <strong>⬇️ Cima ➔ Baixo</strong> no topo da tela.'
  },
  {
    id: 'etiquetas-esteiras',
    title: 'Como ler as etiquetas das esteiras e tubos?',
    oneLiner: 'Cada etiqueta mostra qual esteira usar e quantos itens passam por minuto (vazão).',
    scenes: [
      {
        src: './assets/tutorial/tutorial-05-etiquetas.webp',
        alt: 'Detalhe das etiquetas no meio das esteiras mostrando v.2 120/m, v.1 30/m e conector curto para a próxima coluna.',
        markers: [
          { n: 1, x: 31, y: 47 },
          { n: 2, x: 72, y: 37 },
          { n: 3, x: 31, y: 95 }
        ]
      }
    ],
    legend: [
      '<strong>v.2 · 120/m</strong>: use esteira versão 2; a <strong>vazão</strong> (quantos itens passam por minuto) é 120.',
      '<strong>v.1 · 30/m</strong>: esteira versão 1 já basta para 30 itens por minuto. Líquidos usam tubulação azul.',
      '<strong>→ FORNALHA #2</strong>: em linhas longas, a esteira é dividida; clique na etiqueta para pular até o destino.'
    ],
    tip: 'Passe o mouse em uma etiqueta curta (<strong>→</strong> ou <strong>←</strong>) para ver o caminho completo ligado a ela.'
  },
  {
    id: 'cards-maquina',
    title: 'Como entender cada card de máquina?',
    oneLiner: 'Cada card mostra o que entra, o que sai, a energia gasta e permite agrupar máquinas iguais.',
    scenes: [
      {
        label: 'Individual',
        src: './assets/tutorial/tutorial-06a-card-maquina.webp',
        alt: 'Card da Fornalha #1 mostrando clock e energia, seção Entrada com Minério de Ferro e seção Saída com Lingote de Ferro.',
        markers: [
          { n: 1, x: 32, y: 16 },
          { n: 2, x: 65, y: 49 },
          { n: 3, x: 50, y: 63 },
          { n: 4, x: 50, y: 78 }
        ]
      },
      {
        label: 'Agrupado',
        src: './assets/tutorial/tutorial-06b-agrupado.webp',
        alt: 'Fluxo de produção com máquinas iguais agrupadas em um único card usando o botão Todas Máquinas: NÃO.',
        markers: [
          { n: 1, x: 45, y: 24 },
          { n: 2, x: 52, y: 50 },
          { n: 3, x: 78, y: 95 }
        ]
      }
    ],
    legend: [
      '<strong>Nome e número</strong>: identifica qual máquina construir (ex.: <strong>FORNALHA #1</strong>).',
      '<strong>Clock e energia</strong>: velocidade de trabalho (<strong>100%</strong>) e consumo em megawatts (<strong>MW</strong>).',
      '<strong>ENTRADA</strong>: o que a máquina precisa receber por minuto para funcionar.',
      '<strong>SAÍDA</strong>: o que ela fabrica por minuto. Clique no card para trocar receita ou clock.'
    ],
    tip: 'Fábrica muito grande? Clique em <strong>🏭 Todas Máquinas: SIM</strong> embaixo para agrupar máquinas iguais em um card.'
  },
  {
    id: 'nos-recurso',
    title: 'O que são os Nós de recurso?',
    oneLiner: 'São os pontos no mapa de onde você extrai minérios, petróleo ou água.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-07-no-recurso.webp',
        alt: 'Card Nó de Minério de Ferro mostrando pureza Nó Normal, mineradora e taxa de extração de 120 un/min.',
        markers: [
          { n: 1, x: 35, y: 19 },
          { n: 2, x: 25, y: 27 },
          { n: 3, x: 50, y: 72 }
        ]
      }
    ],
    legend: [
      '<strong>Nó de [recurso]</strong>: indica o minério extraído do chão (para água, aparece apenas <strong>Água</strong>).',
      '<strong>Pureza do nó</strong>: Impuro, Normal ou Puro — define quanto a mineradora extrai por minuto.',
      '<strong>Taxa extraída</strong>: mostra apenas o recurso e quanto sai por minuto; nunca conta como excesso.'
    ],
    tip: 'Clique no card do nó para trocar o nível da mineradora, a pureza ou o clock.'
  },
  {
    id: 'produto-final',
    title: 'Como achar o Produto Final da linha?',
    oneLiner: 'O objetivo da sua fábrica sempre aparece destacado em um card laranja.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-08-produto-final.webp',
        alt: 'Card laranja destacado com cabeçalho Chapa de Ferro, etiqueta PRODUTO FINAL e quantidade entregue por minuto.',
        markers: [
          { n: 1, x: 64, y: 20 },
          { n: 2, x: 65, y: 58 },
          { n: 3, x: 50, y: 74 }
        ]
      }
    ],
    legend: [
      '<strong>Etiqueta PRODUTO FINAL</strong>: identifica de longe onde termina a linha de produção.',
      '<strong>Resumo de máquinas</strong>: mostra quantas máquinas fabricam esse item final.',
      '<strong>PRODUÇÃO FINAL</strong>: quantidade real entregue por minuto pela fábrica.'
    ],
    tip: 'Se você escolher mais de um produto na mesma fábrica, todos recebem o destaque laranja.'
  },
  {
    id: 'status-excesso',
    title: 'Como usar o Resumo da Fábrica e o Excesso?',
    oneLiner: 'Veja energia recomendada, materiais, entradas, saídas e aproveite itens em excesso.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-09-excesso.webp',
        alt: 'Painel esquerdo mostrando o Resumo da Fábrica com Energia, Excesso e botão Gerar nova linha de produção.',
        markers: [
          { n: 1, x: 50, y: 26 },
          { n: 2, x: 42, y: 46 },
          { n: 3, x: 50, y: 54 }
        ]
      }
    ],
    legend: [
      '<strong>Resumo da Fábrica</strong>: mostra energia (com gerador recomendado e folga %), construções e materiais usados.',
      '<strong>Excesso</strong>: mostra itens extras gerados que nenhuma máquina da linha usa (ex.: <strong>Resina de polímero</strong>).',
      '<strong>⚡ Gerar nova linha de produção</strong>: abre receitas que usam esse excesso já preenchido.'
    ],
    commonMistake: 'Erro comum: confundir excesso com recurso extraído — minérios e itens consumidos nunca são excesso.'
  },
  {
    id: 'modo-livre',
    title: 'Como montar tudo do zero no modo Livre?',
    oneLiner: 'Posicione máquinas, contêineres e logística e puxe as esteiras manualmente.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-10-modo-livre.webp',
        alt: 'Aba Livre com máquinas conectadas e barra inferior com Adicionar Máquina, Divisor, Unificador e Junção de Tubo.',
        markers: [
          { n: 1, x: 50, y: 45 },
          { n: 2, x: 50, y: 51 },
          { n: 3, x: 16, y: 95 }
        ]
      }
    ],
    legend: [
      '<strong>Porta de saída</strong>: arraste até outra máquina ou solte no vazio para abrir o modal <strong>Adicionar Máquina</strong> já filtrado pelo item.',
      '<strong>Etiqueta clicável</strong>: clique na etiqueta da esteira para trocar a versão ou remover a ligação.',
      '<strong>➕ Adicionar Máquina</strong>: adicione receitas, contêineres, tanques, divisores, Triturador SUPIMPA e Elevador Espacial.'
    ],
    tip: 'Segure <strong>Alt</strong> enquanto arrasta um card para duplicar a máquina rapidamente.',
    tryAction: { label: 'Experimentar no modo Livre', mode: 'free' }
  },
  {
    id: 'navegacao-foco',
    title: 'Como navegar e organizar a tela?',
    oneLiner: 'Dê zoom, centralize a fábrica, reorganize os cards e destaque o caminho de uma máquina.',
    scenes: [
      {
        label: 'Controles',
        src: './assets/tutorial/tutorial-11a-navegacao.webp',
        alt: 'Área de trabalho com controles de orientação no topo e barra inferior de zoom, Visão 3D, Todas Máquinas e Centralizar.',
        markers: [
          { n: 1, x: 50, y: 5 },
          { n: 2, x: 50, y: 95 },
          { n: 3, x: 63, y: 95 },
          { n: 4, x: 92, y: 95 }
        ]
      },
      {
        label: 'Modo Foco',
        src: './assets/tutorial/tutorial-11b-foco.webp',
        alt: 'Modo foco destacando apenas a Fornalha #1 e as máquinas diretamente ligadas a ela, suavizando o restante.',
        markers: [
          { n: 1, x: 35, y: 71 },
          { n: 2, x: 65, y: 29 }
        ]
      }
    ],
    legend: [
      '<strong>Direção</strong>: alterne entre <strong>⬇️ Cima ➔ Baixo</strong> e <strong>➡️ Esquerda ➔ Direita</strong>.',
      '<strong>Zoom</strong>: use <strong>➖</strong>, <strong>➕</strong> ou a rodinha do mouse; clique na porcentagem para voltar a <strong>100%</strong>.',
      '<strong>🏢 Visão 3D</strong>: organiza sua fábrica por andares verticais.',
      '<strong>🎯 Centralizar</strong>: enquadra toda a linha na tela. Arraste qualquer card para reposicionar.'
    ],
    tip: 'Passe o mouse sobre qualquer máquina para ativar o <strong>modo foco</strong> e ver só o caminho dela.'
  },
  {
    id: 'conta-projetos-reportar',
    title: 'Como salvar projetos, criar conta e reportar?',
    oneLiner: 'Use tudo sem cadastro; entre na conta para salvar fábricas na nuvem e enviar feedback.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-12-conta-projetos.webp',
        alt: 'Topo da ferramenta mostrando o botão Salvar no painel esquerdo e os botões Reportar e Entrar no canto superior direito.',
        markers: [
          { n: 1, x: 14, y: 69 },
          { n: 2, x: 88, y: 12 },
          { n: 3, x: 96, y: 12 }
        ]
      }
    ],
    legend: [
      '<strong>💾 Salvar</strong>: guarda a linha atual (receitas, posições e opções) na aba <strong>📁 Projetos</strong>.',
      '<strong>📣 Reportar</strong>: envie bugs, sugestões ou avaliações com até 7 imagens.',
      '<strong>👤 Entrar</strong>: crie sua conta só com usuário e senha para acessar seus projetos em qualquer lugar.'
    ],
    tip: 'Depois de abrir um projeto salvo, você pode escolher entre <strong>Atualizar projeto</strong> ou <strong>Salvar como novo</strong>.'
  },
  {
    id: 'patch-notes',
    title: 'Onde ver as novidades da ferramenta?',
    oneLiner: 'O botão Patch notes mostra as 7 últimas atualizações e melhorias do Satisfactory+.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-12-conta-projetos.webp',
        alt: 'Barra superior direita mostrando o botão Patch notes ao lado de Tutorial, Reportar e Entrar.',
        markers: [
          { n: 1, x: 82, y: 12 },
          { n: 2, x: 88, y: 12 }
        ]
      }
    ],
    legend: [
      '<strong>📋 Patch notes</strong>: abre a linha do tempo com as 7 últimas atualizações (Novo, Melhoria e Correção).',
      '<strong>Aviso automático</strong>: quando houver uma novidade que você ainda não viu, um card curto aparece uma única vez ao abrir o site.'
    ],
    tip: 'Você pode consultar o histórico completo das últimas atualizações a qualquer momento pelo botão no topo.'
  },
  {
    id: 'glossario',
    title: 'Glossário rápido',
    oneLiner: 'Todos os termos da ferramenta explicados em uma linha simples.',
    glossary: [
      { term: 'Vazão', desc: 'Quantos itens (un/min) ou líquidos (m³/min) passam por minuto.' },
      { term: 'Esteira e versão (v.1 a v.6)', desc: 'Transporta itens sólidos; versões maiores levam mais itens por minuto.' },
      { term: 'Tubulação (v.1 / v.2)', desc: 'Transporta líquidos e gases entre máquinas e bombas.' },
      { term: 'Nó de recurso', desc: 'Ponto no mapa de onde saem minérios, petróleo ou água.' },
      { term: 'Produto final', desc: 'Item principal que você escolheu fabricar, destacado em laranja.' },
      { term: 'Excesso', desc: 'Item extra gerado por uma receita que nenhuma outra máquina da linha usa.' },
      { term: 'Clock (Overclock / Underclock)', desc: 'Velocidade da máquina (1% a 250%); altera produção e energia.' },
      { term: 'Agrupar máquinas', desc: 'Junta máquinas iguais em um único card usando Todas Máquinas: NÃO.' },
      { term: 'Modo foco', desc: 'Destaca só a máquina sob o mouse e as conexões ligadas a ela.' },
      { term: 'Divisor / Unificador', desc: 'Divide uma esteira em várias saídas ou junta várias entradas em uma só.' }
    ]
  }
];

const TutorialState = {
  isOpen: false,
  step: 0,
  sceneIdx: 0,
  indexOpen: false,
  touchStartX: null,
  touchStartY: null
};

function openTutorialModal(startStep = 0) {
  TutorialState.isOpen = true;
  TutorialState.step = Math.max(0, Math.min(TUTORIAL_SLIDES.length - 1, Number(startStep) || 0));
  TutorialState.sceneIdx = 0;
  TutorialState.indexOpen = false;
  if (typeof AppState !== 'undefined' && AppState.tutorial) {
    AppState.tutorial.isOpen = true;
    AppState.tutorial.step = TutorialState.step;
  }
  const modal = document.getElementById('tutorial-modal');
  if (modal) modal.classList.remove('hidden');
  renderTutorialSlide();
}

function closeTutorialModal() {
  TutorialState.isOpen = false;
  TutorialState.indexOpen = false;
  if (typeof AppState !== 'undefined' && AppState.tutorial) {
    AppState.tutorial.isOpen = false;
  }
  const modal = document.getElementById('tutorial-modal');
  if (modal) modal.classList.add('hidden');
  if (typeof checkPendingPatchAutoCard === 'function') {
    checkPendingPatchAutoCard();
  }
}

function goToTutorialStep(idx) {
  TutorialState.step = Math.max(0, Math.min(TUTORIAL_SLIDES.length - 1, idx));
  TutorialState.sceneIdx = 0;
  TutorialState.indexOpen = false;
  if (typeof AppState !== 'undefined' && AppState.tutorial) {
    AppState.tutorial.step = TutorialState.step;
  }
  renderTutorialSlide();
}

function nextTutorialStep() {
  if (TutorialState.step < TUTORIAL_SLIDES.length - 1) {
    goToTutorialStep(TutorialState.step + 1);
  } else {
    closeTutorialModal();
  }
}

function prevTutorialStep() {
  if (TutorialState.step > 0) {
    goToTutorialStep(TutorialState.step - 1);
  }
}

function setTutorialScene(sceneIdx) {
  TutorialState.sceneIdx = sceneIdx;
  renderTutorialSlide();
}

function toggleTutorialIndex() {
  TutorialState.indexOpen = !TutorialState.indexOpen;
  renderTutorialSlide();
}

function highlightTutorialMarker(num, active) {
  document.querySelectorAll(`.tut-marker[data-marker="${num}"]`).forEach((el) => {
    el.classList.toggle('is-highlighted', !!active);
  });
  document.querySelectorAll(`.tut-legend-item[data-marker="${num}"]`).forEach((el) => {
    el.classList.toggle('is-highlighted', !!active);
  });
}

function executeTutorialTryAction(mode) {
  closeTutorialModal();
  if (mode && typeof switchMode === 'function') {
    switchMode(mode);
  }
}

function renderTutorialSlide() {
  const body = document.getElementById('tutorial-body');
  const footer = document.getElementById('tutorial-footer');
  if (!body || !footer) return;

  const idx = TutorialState.step;
  const slide = TUTORIAL_SLIDES[idx];
  const isFirst = idx === 0;
  const isLast = idx === TUTORIAL_SLIDES.length - 1;
  const scenes = slide.scenes || [];
  const activeScene = scenes[TutorialState.sceneIdx] || scenes[0] || null;

  const indexDrawerHtml = TutorialState.indexOpen ? `
    <div class="tut-index-drawer" role="navigation" aria-label="Índice do tutorial">
      <div class="tut-index-head">
        <strong>Ir direto para um tópico</strong>
        <button type="button" class="tut-index-close" onclick="toggleTutorialIndex()" aria-label="Fechar índice">✕</button>
      </div>
      <div class="tut-index-list">
        ${TUTORIAL_SLIDES.map((s, i) => `
          <button type="button" class="tut-index-btn ${i === idx ? 'active' : ''}" onclick="goToTutorialStep(${i})">
            <span class="tut-index-num">${i + 1}</span>
            <span>${s.title}</span>
          </button>
        `).join('')}
      </div>
    </div>
  ` : '';

  let contentHtml = '';

  if (slide.glossary) {
    contentHtml = `
      <div class="tut-glossary-grid">
        ${slide.glossary.map((g) => `
          <div class="tut-glossary-card">
            <strong>${g.term}</strong>
            <span>${g.desc}</span>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    const sceneTabsHtml = scenes.length > 1 ? `
      <div class="tut-scene-tabs" role="tablist">
        ${scenes.map((sc, sIdx) => `
          <button type="button" class="tut-scene-tab ${sIdx === TutorialState.sceneIdx ? 'active' : ''}" onclick="setTutorialScene(${sIdx})">
            ${sc.label || `Passo ${sIdx + 1}`}
          </button>
        `).join('')}
      </div>
    ` : '';

    const mediaHtml = activeScene ? `
      <div class="tut-media-col">
        ${sceneTabsHtml}
        <div class="tut-figure-box" onclick="openImageLightbox('${activeScene.src}')" title="Clique para ampliar a imagem">
          <img
            src="${activeScene.src}"
            alt="${activeScene.alt}"
            loading="lazy"
            decoding="async"
            class="tut-figure-img"
          />
          <div class="tut-markers-layer" aria-hidden="true">
            ${(activeScene.markers || []).map((m) => `
              <span
                class="tut-marker"
                data-marker="${m.n}"
                style="left:${m.x}%; top:${m.y}%;"
                onmouseenter="highlightTutorialMarker(${m.n}, true)"
                onmouseleave="highlightTutorialMarker(${m.n}, false)"
              >${m.n}</span>
            `).join('')}
          </div>
          <span class="tut-zoom-badge">🔍 Ampliar</span>
        </div>
      </div>
    ` : '';

    const legendHtml = (slide.legend && slide.legend.length > 0) ? `
      <ol class="tut-legend-list">
        ${slide.legend.map((text, lIdx) => `
          <li
            class="tut-legend-item"
            data-marker="${lIdx + 1}"
            onmouseenter="highlightTutorialMarker(${lIdx + 1}, true)"
            onmouseleave="highlightTutorialMarker(${lIdx + 1}, false)"
          >
            <span class="tut-legend-num">${lIdx + 1}</span>
            <span class="tut-legend-text">${text}</span>
          </li>
        `).join('')}
      </ol>
    ` : '';

    const tipHtml = slide.tip ? `
      <div class="tut-callout tut-callout-tip">
        <strong>💡 Dica:</strong> ${slide.tip}
      </div>
    ` : '';

    const mistakeHtml = slide.commonMistake ? `
      <div class="tut-callout tut-callout-warn">
        <strong>⚠️</strong> ${slide.commonMistake}
      </div>
    ` : '';

    const tryBtnHtml = slide.tryAction ? `
      <div class="tut-try-row">
        <button type="button" class="btn-tutorial-try" onclick="executeTutorialTryAction('${slide.tryAction.mode}')">
          ▶ ${slide.tryAction.label}
        </button>
      </div>
    ` : '';

    contentHtml = `
      <div class="tut-split-layout">
        ${mediaHtml}
        <div class="tut-text-col">
          ${legendHtml}
          ${tipHtml}
          ${mistakeHtml}
          ${tryBtnHtml}
        </div>
      </div>
    `;
  }

  body.innerHTML = `
    ${indexDrawerHtml}
    <div class="tut-card-header">
      <div class="tut-header-top-row">
        <span class="tutorial-step-counter">Passo ${idx + 1} de ${TUTORIAL_SLIDES.length}</span>
        <button type="button" class="tut-index-toggle" onclick="toggleTutorialIndex()">
          ☰ Índice
        </button>
      </div>
      <h4 class="tut-slide-title">${slide.title}</h4>
      <p class="tut-one-liner"><strong>Em uma frase:</strong> ${slide.oneLiner}</p>
    </div>
    ${contentHtml}
  `;

  footer.innerHTML = `
    <button type="button" class="btn-tutorial-nav" onclick="prevTutorialStep()" ${isFirst ? 'disabled' : ''}>
      ⬅ Anterior
    </button>
    <div class="tutorial-dots" role="tablist" aria-label="Passos do tutorial">
      ${TUTORIAL_SLIDES.map((s, i) => `
        <button
          type="button"
          class="tutorial-dot ${i === idx ? 'active' : ''}"
          onclick="goToTutorialStep(${i})"
          title="${i + 1}. ${s.title}"
          aria-label="${i + 1}. ${s.title}"
        ></button>
      `).join('')}
    </div>
    <button type="button" class="btn-tutorial-nav primary" onclick="nextTutorialStep()">
      ${isLast ? 'Concluir ✅' : 'Próximo ➡'}
    </button>
  `;
}

// Navegação por teclado (Setas e ESC) e deslize (swipe) no celular
document.addEventListener('keydown', (e) => {
  if (!TutorialState.isOpen) return;
  const lightbox = document.getElementById('image-lightbox-modal');
  if (lightbox && !lightbox.classList.contains('hidden')) {
    if (e.key === 'Escape') {
      if (typeof closeImageLightbox === 'function') closeImageLightbox();
    }
    return;
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    closeTutorialModal();
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    nextTutorialStep();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    prevTutorialStep();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('tutorial-modal');
  if (!modal) return;
  modal.addEventListener('touchstart', (e) => {
    if (!TutorialState.isOpen || !e.touches || e.touches.length !== 1) return;
    TutorialState.touchStartX = e.touches[0].clientX;
    TutorialState.touchStartY = e.touches[0].clientY;
  }, { passive: true });

  modal.addEventListener('touchend', (e) => {
    if (!TutorialState.isOpen || TutorialState.touchStartX === null || !e.changedTouches || !e.changedTouches.length) return;
    const dx = e.changedTouches[0].clientX - TutorialState.touchStartX;
    const dy = e.changedTouches[0].clientY - TutorialState.touchStartY;
    TutorialState.touchStartX = null;
    TutorialState.touchStartY = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      if (dx < 0) nextTutorialStep();
      else prevTutorialStep();
    }
  }, { passive: true });
});
