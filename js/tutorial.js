/* ============================================================================
 * TUTORIAL INTERATIVO ILUSTRADO NATIVO — SATISFACTORY+ v2.5
 * 12 tópicos completos com diagramas vetoriais/componentes nativos,
 * ícones reais da interface e do jogo (renderEntityIcon), 100% adaptáveis
 * aos temas Claro e Escuro.
 * ========================================================================== */

function tutIcon(entityId, size = 28) {
  try {
    if (typeof Solver === 'object' && typeof renderEntityIcon === 'function') {
      const obj = Solver.getItem?.(entityId)
        || Solver.getMachine?.(entityId)
        || window.SATISFACTORY_DATA?.items?.[entityId]
        || window.SATISFACTORY_DATA?.machines?.[entityId]
        || window.SATISFACTORY_DATA?.extractors?.[entityId]
        || window.SATISFACTORY_DATA?.generators?.[entityId]
        || null;
      if (obj) return renderEntityIcon(obj, size);
    }
  } catch {}
  return '';
}

function tutEntity(entityId, title, sub, extraCls = '') {
  return `
    <div class="ti-entity ${extraCls}">
      ${tutIcon(entityId, 28)}
      <div style="min-width:0;">
        <b>${title}</b>
        ${sub ? `<small>${sub}</small>` : ''}
      </div>
    </div>
  `;
}

const TUTORIAL_GROUPS_META = [
  {
    id: 'start',
    label: 'Comece por aqui',
    color: '#EA580C',
    tint: 'rgba(234, 88, 12, 0.16)',
    topicIds: ['interface', 'configuracoes', 'conta']
  },
  {
    id: 'plan',
    label: 'Planeje sua fábrica',
    color: '#4C9AFF',
    tint: 'rgba(76, 154, 255, 0.16)',
    topicIds: ['producao', 'energia', 'oficina']
  },
  {
    id: 'explore',
    label: 'Explore e consulte',
    color: '#2DD4BF',
    tint: 'rgba(45, 212, 191, 0.16)',
    topicIds: ['mapa', 'receitas', 'biblioteca', 'calculadora']
  },
  {
    id: 'organize',
    label: 'Organize e participe',
    color: '#B07CFF',
    tint: 'rgba(176, 124, 255, 0.16)',
    topicIds: ['projetos', 'reportar']
  }
];

function getTutorialTopicSvg(topicId) {
  const map = {
    interface: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg>',
    configuracoes: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
    conta: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
    producao: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
    energia: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
    oficina: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>',
    mapa: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>',
    receitas: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>',
    biblioteca: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
    calculadora: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="16" y1="14" x2="16" y2="18"></line><path d="M16 10h.01"></path><path d="M12 10h.01"></path><path d="M8 10h.01"></path><path d="M12 14h.01"></path><path d="M8 14h.01"></path><path d="M12 18h.01"></path><path d="M8 18h.01"></path></svg>',
    projetos: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>',
    reportar: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>'
  };
  return map[topicId] || map.interface;
}

const TUTORIAL_TOPICS = [
  /* =========================================================================
   * 1. INTERFACE GERAL (5 passos)
   * ======================================================================= */
  {
    id: 'interface',
    chip: 'GERAL',
    title: 'Interface geral',
    desc: 'As 4 zonas fixas da tela, barra lateral, topo direito, controles do Spaces e barra de status.',
    slides: [
      {
        id: 'iface-overview',
        stepTag: 'VISÃO GERAL',
        title: 'As 4 zonas fixas da interface',
        desc: 'Independente da aba aberta, o Satisfactory+ mantém sempre esta estrutura base para facilitar a navegação.',
        renderDiagram: () => `
          <div class="ti-wf-app">
            <div class="ti-wf-rail hl">
              <span class="ti-wf-badge" style="top:5px;right:-10px;background:#EA580C">1</span>
              <div class="ti-wf-brand">
                <img src="./assets/logo-splus.jpg" alt="S+" />
                <b>Satisfactory+</b>
                <small>v2.5</small>
              </div>
              <div class="ti-wf-tab on">Produção</div>
              <div class="ti-wf-tab">Energia</div>
              <div class="ti-wf-tab">Oficina</div>
              <div class="ti-wf-tab">Mapa</div>
              <div style="height:1px;background:var(--border-card);margin:2px 4px"></div>
              <div class="ti-wf-tab">Receitas</div>
              <div class="ti-wf-tab">Biblioteca</div>
              <div class="ti-wf-tab">Calculadora</div>
              <div class="ti-wf-tab">Projetos</div>
              <div class="ti-wf-tab" style="margin-top:auto;background:rgba(148,163,184,0.12)">Configurações</div>
            </div>
            <div class="ti-wf-main">
              <div class="ti-wf-topbar">
                <span class="ti-wf-badge" style="left:-24px;top:50%;transform:translateY(-50%);background:#2563EB">3</span>
                <span class="ti-pill" style="padding:3px 6px;font-size:9px">→ ← ↓ ↑</span>
                <span class="ti-pill" style="padding:3px 6px;font-size:9px">Tutorial</span>
                <span class="ti-pill" style="padding:3px 6px;font-size:9px">Patch notes</span>
                <span class="ti-pill" style="padding:3px 6px;font-size:9px">Reportar</span>
                <span class="ti-pill" style="padding:3px 6px;font-size:9px">Entrar</span>
              </div>
              <div class="ti-wf-center">
                <span class="ti-wf-badge" style="top:8px;left:8px;background:#0d9488">2</span>
                <strong>Spaces (Espaço Infinito)</strong>
                <span>Área central livre onde fluxogramas, mapa e ferramentas aparecem</span>
              </div>
              <div class="ti-wf-hud">
                <span class="ti-wf-badge" style="left:-24px;top:50%;transform:translateY(-50%);background:#7c3aed">4</span>
                <div class="ti-wf-hbtn">+</div>
                <div class="ti-wf-hbtn" style="font-size:7.5px">100%</div>
                <div class="ti-wf-hbtn">−</div>
                <div class="ti-wf-hbtn on">⊞</div>
                <div class="ti-wf-hbtn">⊡</div>
                <div class="ti-wf-hbtn">⚡</div>
              </div>
              <div class="ti-wf-status">
                <span>Visão geral</span><span>·</span><span>Energia</span><span>·</span><span>Logística</span><span>·</span><span>Construções</span>
              </div>
            </div>
          </div>
        `,
        blocks: [
          { color: '#EA580C', heading: '1 · Barra lateral esquerda', text: 'Troca entre todas as abas, alterna o tema Claro/Escuro, recolhe painéis e abre as Configurações.' },
          { color: '#2DD4BF', heading: '2 · Spaces (área central)', text: 'Espaço infinito com zoom e arraste livre para visualizar fábricas, mapa e ferramentas.' },
          { color: '#4C9AFF', heading: '3 · Barra superior direita', text: 'Direção do fluxo, Tutorial, Patch notes, Reportar e login da conta.' },
          { color: '#B07CFF', heading: '4 · Barra vertical direita', text: 'Zoom, visão 3D, agrupamento, cards compactos, centralizar e overclock global.' }
        ],
        tip: 'Use as setas ← e → do teclado para avançar ou voltar rapidamente entre os passos.'
      },
      {
        id: 'iface-sidebar',
        stepTag: 'BARRA LATERAL',
        title: 'Navegação, tema e modo recolhido',
        desc: 'A barra vertical esquerda concentra o retorno à Home, troca de tema, recolhimento de painéis e o botão de Configurações.',
        renderDiagram: () => `
          <div class="ti-row-2">
            <div class="ti-card accent">
              <span class="ti-step"><i>1</i> Expandida (padrão)</span>
              <div class="ti-entity">
                <img src="./assets/logo-splus.jpg" alt="Satisfactory+" style="border-radius:7px" />
                <div><b>Satisfactory+ · v2.5</b><small>Clique na logo para voltar à Home</small></div>
              </div>
              <div class="ti-pill-row">
                <span class="ti-pill">☀ Claro / Escuro</span>
                <span class="ti-pill">⇤ Recolher abas</span>
                <span class="ti-pill">◀ Ocultar painel</span>
              </div>
              <div class="ti-kv"><span>Abas principais</span><strong>Planejamento + Consulta</strong></div>
              <div class="ti-kv"><span>Rodapé da barra</span><strong>⚙ Configurações</strong></div>
            </div>
            <div class="ti-card teal">
              <span class="ti-step teal"><i>2</i> Recolhida (mais espaço)</span>
              <div class="ti-note">Clique em <strong>⇤</strong> para encolher a barra de abas para apenas ícones (58px) ou em <strong>◀</strong> para ocultar o painel de configuração.</div>
              <div class="ti-kv"><span>Barra de abas</span><strong>186px → 58px</strong></div>
              <div class="ti-kv"><span>Painel lateral</span><strong>Oculto (botão flutuante)</strong></div>
              <div class="ti-pill-row">
                <span class="ti-pill teal">Mais área útil no Spaces</span>
              </div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Voltar para a Home', text: 'Clicar na logo Satisfactory+ reabre a tela inicial. Logo abaixo aparece sempre a versão atual.' },
          { heading: 'Tema e espaço extra', text: 'Alterne entre Modo Claro e Escuro em um clique e recolha os painéis sempre que quiser visualizar fábricas grandes.' },
          { heading: 'Configurações', text: 'Fica no rodapé da barra lateral e abre idioma, preferências, segurança da conta e perfil.' }
        ]
      },
      {
        id: 'iface-topbar',
        stepTag: 'TOPO DIREITO',
        title: 'Barra superior direita',
        desc: 'Ações globais sempre disponíveis no canto superior direito da tela.',
        renderDiagram: () => `
          <div class="ti-stack">
            <div class="ti-card blue">
              <span class="ti-step blue"><i>1</i> Direção do fluxo no Spaces</span>
              <div class="ti-pill-row">
                <span class="ti-pill on">→ Esquerda p/ Direita</span>
                <span class="ti-pill">← Direita p/ Esquerda</span>
                <span class="ti-pill">↓ Cima p/ Baixo</span>
                <span class="ti-pill">↑ Baixo p/ Cima</span>
              </div>
              <div class="ti-note">Gira instantaneamente a orientação de montagem de qualquer linha no canvas.</div>
            </div>
            <div class="ti-row-3">
              <div class="ti-card">
                <span class="ti-step"><i>2</i> Tutorial &amp; Patch</span>
                <div class="ti-pill-row"><span class="ti-pill on">Tutorial</span><span class="ti-pill">Patch notes</span></div>
                <div class="ti-note">Reabre este guia ou mostra o histórico de novidades da versão.</div>
              </div>
              <div class="ti-card">
                <span class="ti-step purple"><i>3</i> Reportar</span>
                <div class="ti-pill-row"><span class="ti-pill">⚑ Reportar</span></div>
                <div class="ti-note">Envia bugs, sugestões ou avaliações com até 7 imagens.</div>
              </div>
              <div class="ti-card">
                <span class="ti-step teal"><i>4</i> Conta</span>
                <div class="ti-pill-row"><span class="ti-pill teal">Entrar / Perfil</span></div>
                <div class="ti-note">Acessa sua conta para salvar e compartilhar projetos na nuvem.</div>
              </div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Notificação visual', text: 'Um ponto laranja aparece em Patch notes quando há atualização nova e em Reportar quando o administrador responder seu chamado.' },
          { heading: 'Sempre acessível', text: 'Você pode abrir o Tutorial, consultar Patch notes ou girar o fluxo sem perder o que está montando.' }
        ]
      },
      {
        id: 'iface-hud',
        stepTag: 'CONTROLES DO SPACES',
        title: 'Barra vertical direita',
        desc: 'Centralizada na borda direita da tela, controla câmera, nível de detalhe e overclock sem sair do canvas.',
        renderDiagram: () => `
          <div class="ti-row-3">
            <div class="ti-card">
              <span class="ti-step"><i>1</i> Câmera e Zoom</span>
              <div class="ti-pill-row">
                <span class="ti-pill">+</span>
                <span class="ti-pill on">100%</span>
                <span class="ti-pill">−</span>
              </div>
              <div class="ti-note">Aproxima, afasta ou clica na porcentagem para resetar o zoom. A roda do mouse também controla o zoom.</div>
            </div>
            <div class="ti-card blue">
              <span class="ti-step blue"><i>2</i> Visualização</span>
              <div class="ti-kv"><span>Andares 3D</span><strong>Divide por etapas</strong></div>
              <div class="ti-kv"><span>Todas Máquinas</span><strong>Individual / Agrupado</strong></div>
              <div class="ti-kv"><span>Cards Compactos</span><strong>Layout 236px leve</strong></div>
            </div>
            <div class="ti-card purple">
              <span class="ti-step purple"><i>3</i> Ações rápidas</span>
              <div class="ti-kv"><span>🎯 Centralizar</span><strong>Enquadra toda linha</strong></div>
              <div class="ti-kv"><span>⚡ Overclock</span><strong>100% · 150% · 200% · 250%</strong></div>
              <div class="ti-note">Mantém sua meta final e reduz automaticamente o nº de máquinas.</div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Cards Compactos', text: 'Reduz o tamanho de todos os cards para uma versão limpa com ícone circular, selo ×N e chips de fluxo — ideal para fábricas grandes.' },
          { heading: 'Sem perder seu zoom', text: 'Alternar 3D, Cards Compactos ou Overclock mantém sua posição atual no canvas sem resetar a câmera.' }
        ]
      },
      {
        id: 'iface-status',
        stepTag: 'RESUMO EM TEMPO REAL',
        title: 'Barra de status inferior',
        desc: 'Exibe automaticamente os totais da fábrica aberta no Spaces (máquinas, energia, logística, entradas, saídas e excessos).',
        renderDiagram: () => `
          <div class="ti-stack">
            <div class="ti-card accent">
              <span class="ti-step"><i>1</i> Interação rápida (Hover vs Clique)</span>
              <div class="ti-row-2">
                <div class="ti-kv"><span>Passar o mouse</span><strong>Abre para espiar</strong></div>
                <div class="ti-kv"><span>Clicar na aba</span><strong>Fixa aberto na tela</strong></div>
              </div>
            </div>
            <div class="ti-card">
              <span class="ti-step teal"><i>2</i> Categorias disponíveis na barra</span>
              <div class="ti-pill-row">
                <span class="ti-pill on">Visão geral</span>
                <span class="ti-pill">Energia (MW)</span>
                <span class="ti-pill">Logística (esteiras / divisores)</span>
                <span class="ti-pill">Entradas</span>
                <span class="ti-pill">Saídas</span>
                <span class="ti-pill">Excesso</span>
                <span class="ti-pill">Construções</span>
                <span class="ti-pill">Materiais</span>
              </div>
              <div class="ti-note">Todos os números recalculam em tempo real sempre que você altera uma receita, meta ou overclock.</div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Visão completa de logística', text: 'Mesmo com divisores, unificadores e junções consolidados no canvas (×N), a aba Logística soma a quantidade real total necessária para construir no jogo.' },
          { heading: 'Funciona em Produção, Energia e Oficina', text: 'A barra inferior acompanha qualquer linha ou usina aberta no Spaces.' }
        ]
      }
    ]
  },

  /* =========================================================================
   * 2. CONFIGURAÇÕES (4 passos)
   * ======================================================================= */
  {
    id: 'configuracoes',
    chip: 'SISTEMA',
    title: 'Configurações',
    desc: 'Idioma, tema, preferências do canvas, segurança da conta, exclusão e perfil.',
    slides: [
      {
        id: 'cfg-geral',
        stepTag: 'ABA GERAL',
        title: 'Idioma, tema e direção padrão',
        desc: 'No rodapé da barra lateral, clique em Configurações para ajustar o comportamento padrão do site.',
        renderDiagram: () => `
          <div class="ti-stack">
            <div class="ti-card">
              <span class="ti-step"><i>1</i> Idioma da ferramenta</span>
              <div class="ti-row-3">
                <div class="ti-pill on" style="justify-content:center">PT-BR · Português</div>
                <div class="ti-pill" style="justify-content:center">EN-US · English</div>
                <div class="ti-pill" style="justify-content:center">ES-ES · Español</div>
              </div>
            </div>
            <div class="ti-row-2">
              <div class="ti-card">
                <span class="ti-step blue"><i>2</i> Tema visual</span>
                <div class="ti-pill-row">
                  <span class="ti-pill on">Escuro (#101117)</span>
                  <span class="ti-pill">Claro</span>
                  <span class="ti-pill">Automático</span>
                </div>
              </div>
              <div class="ti-card">
                <span class="ti-step teal"><i>3</i> Direção padrão</span>
                <div class="ti-pill-row">
                  <span class="ti-pill on">Esquerda → Direita</span>
                  <span class="ti-pill">Cima → Baixo</span>
                </div>
              </div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Salvo automaticamente', text: 'Suas escolhas ficam salvas no navegador e sincronizadas na sua conta quando estiver logado.' },
          { heading: 'Restaurar padrões', text: 'O botão no rodapé do modal volta todas as preferências para a configuração original de fábrica.' }
        ]
      },
      {
        id: 'cfg-prefs',
        stepTag: 'PREFERÊNCIAS',
        title: 'Canvas e Interface',
        desc: 'Personalize a grade do Spaces, alinhamento na Oficina, animações e formatação de energia.',
        renderDiagram: () => `
          <div class="ti-row-2">
            <div class="ti-card accent">
              <span class="ti-step"><i>1</i> Canvas</span>
              <div class="ti-kv"><span>Grade de pontos</span><strong style="color:#EA580C">ON</strong></div>
              <div class="ti-kv"><span>Alinhar à grade (Oficina)</span><strong style="color:#EA580C">ON</strong></div>
              <div class="ti-kv"><span>Todas as máquinas padrão</span><strong style="color:#EA580C">ON</strong></div>
            </div>
            <div class="ti-card blue">
              <span class="ti-step blue"><i>2</i> Interface</span>
              <div class="ti-kv"><span>Barra lateral minimizada</span><strong>OFF</strong></div>
              <div class="ti-kv"><span>Reduzir animações</span><strong>OFF</strong></div>
              <div class="ti-kv"><span>Formatar em MW e GW</span><strong style="color:#EA580C">ON</strong></div>
              <div class="ti-kv"><span>Patch notes ao atualizar</span><strong style="color:#EA580C">ON</strong></div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Reduzir animações', text: 'Desativa transições e a animação das esteiras — útil em notebooks mais simples ou fábricas gigantes.' },
          { heading: 'Formatar em MW e GW', text: 'Converte automaticamente valores altos (ex.: 15.000 MW → 15 GW) para facilitar a leitura.' }
        ]
      },
      {
        id: 'cfg-seguranca',
        stepTag: 'CONTA E SEGURANÇA',
        title: 'Pergunta secreta e exclusão de conta',
        desc: 'Configure sua própria pergunta de recuperação (sem precisar de e-mail) ou exclua sua conta com verificação dupla.',
        renderDiagram: () => `
          <div class="ti-stack">
            <div class="ti-card blue">
              <span class="ti-step blue"><i>1</i> Recuperação sem e-mail</span>
              <div class="ti-kv"><span>Sua pergunta (livre)</span><strong>Você cria a pergunta</strong></div>
              <div class="ti-kv"><span>Resposta secreta</span><strong>Hash SHA-256 seguro</strong></div>
            </div>
            <div class="ti-card danger">
              <span class="ti-step danger"><i>2</i> Zona de perigo — Deletar conta</span>
              <div class="ti-flow-3">
                <div class="ti-pill danger" style="justify-content:center">Deletar conta</div>
                <div class="ti-arrow" style="color:#ef4444">→</div>
                <div class="ti-pill" style="justify-content:center">Espera 5s + Senha</div>
                <div class="ti-arrow" style="color:#ef4444">→</div>
                <div class="ti-pill danger" style="justify-content:center">Exclusão total</div>
              </div>
              <div class="ti-note">Remove conta, projetos e sessões do banco de dados após confirmação dupla de 5 segundos.</div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Pergunta criada por você', text: 'Não existe lista fixa: escreva a pergunta que quiser e sua resposta secreta. Ela é normalizada (sem acentos/maiúsculas) antes de gerar o hash.' },
          { heading: 'Proteção contra clique acidental', text: 'O botão de confirmar exclusão fica travado por 5 segundos e exige sua senha atual.' }
        ]
      },
      {
        id: 'cfg-perfil',
        stepTag: 'PERFIL',
        title: 'Perfil opcional do pioneiro',
        desc: 'Campos totalmente opcionais (Sexo, Idade e País) que você pode preencher ou deixar em branco quando preferir.',
        renderDiagram: () => `
          <div class="ti-card">
            <span class="ti-step teal"><i>i</i> Informações opcionais</span>
            <div class="ti-row-3">
              <div class="ti-kv"><span>Sexo</span><strong>Opcional</strong></div>
              <div class="ti-kv"><span>Idade</span><strong>Opcional</strong></div>
              <div class="ti-kv"><span>País</span><strong>Opcional</strong></div>
            </div>
            <div class="ti-note">Nenhum dado pessoal sensível é obrigatório para usar 100% dos recursos do Satisfactory+.</div>
          </div>
        `,
        blocks: [
          { heading: 'Privacidade primeiro', text: 'Sua conta funciona apenas com nome de usuário e senha — sem exigir e-mail nem dados pessoais.' }
        ]
      }
    ]
  },

  /* =========================================================================
   * 3. CONTA E LOGIN (3 passos)
   * ======================================================================= */
  {
    id: 'conta',
    chip: 'CONTA',
    title: 'Conta e login',
    desc: 'Crie sua conta grátis para salvar fábricas na nuvem, compartilhar e sincronizar preferências.',
    slides: [
      {
        id: 'acc-why',
        stepTag: 'BENEFÍCIOS',
        title: 'Por que criar uma conta?',
        desc: 'Você pode usar quase tudo sem login, mas com conta gratuita desbloqueia recursos de nuvem.',
        renderDiagram: () => `
          <div class="ti-row-3">
            <div class="ti-card accent">
              <span class="ti-step"><i>1</i> Nuvem</span>
              <div class="ti-note">Salve até 50 projetos de Produção e Oficina e acesse de qualquer dispositivo.</div>
            </div>
            <div class="ti-card blue">
              <span class="ti-step blue"><i>2</i> Compartilhar</span>
              <div class="ti-note">Gere códigos <strong>SP-XXXXXXXX</strong> para enviar fábricas para outros jogadores.</div>
            </div>
            <div class="ti-card teal">
              <span class="ti-step teal"><i>3</i> Sincronizar</span>
              <div class="ti-note">Tema, idioma, favoritos da Biblioteca e histórico da Calculadora ficam salvos.</div>
            </div>
          </div>
        `,
        blocks: [
          { heading: '100% gratuito e sem e-mail', text: 'Basta escolher um nome de usuário, senha e opcionalmente sua pergunta de recuperação.' }
        ]
      },
      {
        id: 'acc-flow',
        stepTag: 'ACESSO',
        title: 'Criar conta e entrar',
        desc: 'Clique em Entrar no canto superior direito para acessar sua conta ou criar uma nova em segundos.',
        renderDiagram: () => `
          <div class="ti-flow-3">
            <div class="ti-card">
              <span class="ti-step"><i>1</i> Topo direito</span>
              <div class="ti-pill on" style="justify-content:center">Entrar</div>
            </div>
            <div class="ti-arrow">→</div>
            <div class="ti-card">
              <span class="ti-step blue"><i>2</i> Credenciais</span>
              <div class="ti-kv"><span>Usuário</span><strong>pioneiro</strong></div>
              <div class="ti-kv"><span>Senha</span><strong>••••••••</strong></div>
            </div>
            <div class="ti-arrow">→</div>
            <div class="ti-card teal">
              <span class="ti-step teal"><i>3</i> Liberado</span>
              <div class="ti-pill teal" style="justify-content:center">Aba Projetos ativa</div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Aba Projetos desbloqueada', text: 'Assim que entrar, a aba Projetos aparece na barra lateral esquerda e o botão Salvar fica disponível nas linhas montadas.' }
        ]
      },
      {
        id: 'acc-recover',
        stepTag: 'RECUPERAÇÃO',
        title: 'Esqueci minha senha (sem e-mail)',
        desc: 'Se esquecer sua senha, use a pergunta de segurança que você mesmo cadastrou.',
        renderDiagram: () => `
          <div class="ti-flow-3">
            <div class="ti-card">
              <span class="ti-step"><i>1</i> Usuário</span>
              <div class="ti-note">Clique em <strong>Esqueci minha senha</strong> e informe seu nome de usuário.</div>
            </div>
            <div class="ti-arrow">→</div>
            <div class="ti-card blue">
              <span class="ti-step blue"><i>2</i> Pergunta</span>
              <div class="ti-note">O sistema exibe a <strong>sua pergunta</strong> cadastrada e valida sua resposta secreta.</div>
            </div>
            <div class="ti-arrow">→</div>
            <div class="ti-card teal">
              <span class="ti-step teal"><i>3</i> Nova senha</span>
              <div class="ti-note">Defina uma nova senha e entre imediatamente com sessão renovada.</div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Cadastre em Configurações', text: 'Recomendamos configurar sua pergunta logo após criar a conta em Configurações → Conta e segurança.' }
        ]
      }
    ]
  },

  /* =========================================================================
   * 4. PRODUÇÃO (6 passos)
   * ======================================================================= */
  {
    id: 'producao',
    chip: 'PRODUÇÃO',
    title: 'Produção',
    desc: 'Monte linhas completas do recurso ao item final com receitas, overclock e 3D.',
    slides: [
      {
        id: 'prod-overview',
        stepTag: 'VISÃO GERAL',
        title: 'Do item desejado à fábrica pronta',
        desc: 'A aba Produção calcula automaticamente toda a cadeia produtiva: extração, receitas intermediárias, máquinas inteiras, esteiras, tubos e energia.',
        renderDiagram: () => `
          <div class="ti-stack">
            <div class="ti-flow-3">
              <div class="ti-card">
                <span class="ti-step"><i>1</i> Escolha o item</span>
                ${tutEntity('Desc_IronPlateReinforced_C', 'Chapa Reforçada', 'Meta: 10 un/min')}
              </div>
              <div class="ti-arrow">→</div>
              <div class="ti-card">
                <span class="ti-step"><i>2</i> Ajuste a receita</span>
                ${tutEntity('Build_AssemblerMk1_C', 'Padrão ou ALT', 'Compara entradas/saídas')}
              </div>
              <div class="ti-arrow">→</div>
              <div class="ti-card accent">
                <span class="ti-step"><i>3</i> Gere a linha</span>
                <div class="ti-btn-orange">⚡ Montar</div>
              </div>
            </div>
            <div class="ti-card">
              <span class="ti-step teal"><i>4</i> Fluxograma automático no Spaces</span>
              <div class="ti-flow-4">
                ${tutEntity('Build_MinerMk2_C', 'Mineradora', '×1 · 120/m')}
                <div class="ti-wire"></div>
                ${tutEntity('Build_SmelterMk1_C', 'Fornalha', '×4 · Lingote')}
                <div class="ti-wire"></div>
                ${tutEntity('Build_ConstructorMk1_C', 'Construtor', '×8 · Peças')}
                <div class="ti-wire"></div>
                ${tutEntity('Desc_IronPlateReinforced_C', 'Item Final', '10 un/min', 'final')}
              </div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Cálculo em máquinas inteiras', text: 'Todas as etapas respeitam máquinas inteiras e capacidades reais de esteiras (v.1 a v.6) e tubulações (v.1 e v.2).' },
          { heading: 'Múltiplos itens finais', text: 'Use "+ Item" para fabricar mais de um produto na mesma fábrica compartilhando etapas em comum.' }
        ]
      },
      {
        id: 'prod-target',
        stepTag: 'PASSO 1',
        title: 'Escolher item e meta por minuto',
        desc: 'Selecione qualquer item fabricável no seletor por categoria e defina quantas unidades/min deseja.',
        renderDiagram: () => `
          <div class="ti-stack">
            <div class="ti-card accent">
              <span class="ti-step"><i>1</i> Card compacto do item</span>
              <div class="ti-row-2" style="align-items:center">
                ${tutEntity('Desc_ModularFrameHeavy_C', 'Armação Pesada', 'Taxa base automática: 2/min')}
                <div class="ti-pill-row" style="justify-content:flex-end">
                  <span class="ti-pill">‹</span>
                  <span class="ti-pill on" style="min-width:68px;justify-content:center;font-family:var(--font-mono)">10</span>
                  <span class="ti-pill">›</span>
                </div>
              </div>
            </div>
            <div class="ti-card">
              <span class="ti-step blue"><i>2</i> Taxa inicial inteligente</span>
              <div class="ti-row-3">
                ${tutEntity('Desc_IronPlate_C', 'Chapa de Ferro', 'Padrão: 20/min')}
                ${tutEntity('Desc_IronScrew_C', 'Parafuso', 'Padrão: 40/min')}
                ${tutEntity('Desc_IronPlateReinforced_C', 'Chapa Reforçada', 'Padrão: 5/min')}
              </div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Preenchimento automático real', text: 'Ao selecionar um item, a meta inicial já vem com a produção mínima exata de 1 máquina a 100% na receita principal.' },
          { heading: 'Troca rápida', text: 'Clique no ícone ou nome do item no card para substituí-lo sem precisar remover e adicionar de novo.' }
        ]
      },
      {
        id: 'prod-recipes',
        stepTag: 'PASSO 2',
        title: 'Receitas Padrão e Alternativas (ALT)',
        desc: 'Clique na receita de qualquer item ou etapa para comparar alternativas e otimizar seus recursos.',
        renderDiagram: () => `
          <div class="ti-row-2">
            <div class="ti-card accent">
              <span class="ti-step"><i>P</i> Receita Padrão</span>
              ${tutEntity('Desc_IronPlateReinforced_C', 'Chapa de Ferro reforçada', '5/min · Montadora · 15 MW')}
              <div class="ti-note">Chapa de Ferro (30/m) + Parafuso (60/m)</div>
            </div>
            <div class="ti-card blue">
              <span class="ti-step blue"><i>ALT</i> Receita Alternativa</span>
              ${tutEntity('Desc_IronPlateReinforced_C', 'Chapa costurada', '5.6/min · Sem Parafusos!')}
              <div class="ti-note">Chapa de Ferro (18.8/m) + Fio (37.5/m)</div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Recálculo em cascata', text: 'Trocar uma receita intermediária (ex.: Lingote de Ferro Puro na Refinaria) atualiza automaticamente toda a árvore anterior.' }
        ]
      },
      {
        id: 'prod-stages',
        stepTag: 'PASSO 3',
        title: 'Etapas, extração e overclock',
        desc: 'A barra lateral organiza todas as máquinas por etapa com atalhos E1, E2, E3... para focar no canvas.',
        renderDiagram: () => `
          <div class="ti-stack">
            <div class="ti-card">
              <span class="ti-step"><i>1</i> Extração configurável</span>
              <div class="ti-row-2">
                ${tutEntity('Build_MinerMk2_C', 'Mineradora v.1 / v.2 / v.3', 'Pureza: Impuro · Normal · Puro')}
                <div class="ti-kv"><span>Overclock</span><strong style="color:#EA580C">100% → 250%</strong></div>
              </div>
            </div>
            <div class="ti-card blue">
              <span class="ti-step blue"><i>2</i> Overclock reduz máquinas</span>
              <div class="ti-flow-3">
                <div class="ti-kv"><span>A 100%</span><strong>10 máquinas</strong></div>
                <div class="ti-arrow">→</div>
                <div class="ti-kv"><span>A 200%</span><strong style="color:#2dd4bf">5 máquinas</strong></div>
                <div class="ti-arrow">→</div>
                <div class="ti-kv"><span>Meta final</span><strong>Mantida igual!</strong></div>
              </div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Quantidade automática', text: 'Na aba Produção o número de máquinas é sempre calculado pela meta definida — aplicar overclock mantém a meta e reduz máquinas e conexões.' },
          { heading: 'Foco direto', text: 'Clique em "Ver" em qualquer etapa (ou em um card da lista) para centralizar e destacar aquela etapa no Spaces.' }
        ]
      },
      {
        id: 'prod-flow',
        stepTag: 'PASSO 4',
        title: 'Ler o fluxograma e logística simplificada',
        desc: 'Cada item tem uma cor exclusiva nas esteiras e divisores/unificadores equivalentes são consolidados com selo ×N.',
        renderDiagram: () => `
          <div class="ti-stack">
            <div class="ti-card">
              <span class="ti-step"><i>1</i> Logística consolidada (alta performance)</span>
              <div class="ti-flow-3">
                ${tutEntity('Build_MinerMk2_C', 'Mineradoras', '×3 · 360/m')}
                <div class="ti-wire"></div>
                ${tutEntity('Build_ConveyorAttachmentSplitter_C', 'Divisor de Esteira', '×6 consolidado')}
                <div class="ti-wire"></div>
                ${tutEntity('Build_SmelterMk1_C', 'Fornalhas', '×12 · 30/m cada')}
              </div>
            </div>
            <div class="ti-row-2">
              <div class="ti-kv"><span style="color:#EA580C">● Porta Laranja</span><strong>Esteira (Sólidos)</strong></div>
              <div class="ti-kv"><span style="color:#3b82f6">● Porta Azul</span><strong>Tubulação (Fluidos)</strong></div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Sem travamentos em megafábricas', text: 'Divisores, unificadores e junções paralelos são agrupados com selo ×N mantendo todas as esteiras reais entre as máquinas.' },
          { heading: 'Destaque de caminho', text: 'Passe o mouse em um card ou clique em uma esteira para iluminar todo o caminho de entrada e saída.' }
        ]
      },
      {
        id: 'prod-3d',
        stepTag: 'PASSO 5 · MODOS',
        title: 'Visão 3D em andares e Cards Compactos',
        desc: 'Organize fábricas grandes em múltiplos andares automáticos (com Elevadores e Bombas) ou ative os Cards Compactos.',
        renderDiagram: () => `
          <div class="ti-row-2">
            <div class="ti-card blue">
              <span class="ti-step blue"><i>3D</i> Fábrica em Andares</span>
              <div class="ti-kv"><span>1º Andar</span><strong>Extração + Lingotes</strong></div>
              <div class="ti-kv"><span>2º Andar</span><strong>Peças + Montagem</strong></div>
              <div class="ti-pill-row">
                <span class="ti-pill blue">Elevador v.1–v.6 auto</span>
                <span class="ti-pill blue">Bomba v.1/v.2 auto</span>
              </div>
            </div>
            <div class="ti-card accent">
              <span class="ti-step"><i>⊡</i> Cards Compactados</span>
              ${tutEntity('Build_Refinery_C', 'Refinaria ×68', 'Combustível · 2.720 m³/m')}
              ${tutEntity('Desc_TurboFuel_C', 'Turbocombustível', 'FINAL', 'final')}
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Sem quebrar etapas', text: 'A distribuição em andares 3D respeita etapas inteiras e gera automaticamente elevadores de esteira e bombas entre andares.' }
        ],
        tryAction: { label: 'Abrir aba Produção', mode: 'production' }
      }
    ]
  },

  /* =========================================================================
   * 5. ENERGIA (4 passos)
   * ======================================================================= */
  {
    id: 'energia',
    chip: 'ENERGIA',
    title: 'Energia',
    desc: 'Dimensione usinas completas da extração de recursos até os geradores.',
    slides: [
      {
        id: 'pwr-modes',
        stepTag: 'VISÃO GERAL',
        title: '3 formas de dimensionar sua usina',
        desc: 'Escolha como prefere planejar e o solver calcula geradores, combustível, água, refino e energia líquida.',
        renderDiagram: () => `
          <div class="ti-row-3">
            <div class="ti-card accent">
              <span class="ti-step"><i>1</i> Por energia (MW)</span>
              <div class="ti-kv"><span>Meta</span><strong>10.000 MW</strong></div>
              <div class="ti-note">Calcula quantos geradores e toda a cadeia para atingir os MW desejados.</div>
            </div>
            <div class="ti-card blue">
              <span class="ti-step blue"><i>2</i> Por geradores</span>
              <div class="ti-kv"><span>Quantidade</span><strong>40 geradores</strong></div>
              <div class="ti-note">Informe quantos geradores quer construir e veja toda a produção de combustível necessária.</div>
            </div>
            <div class="ti-card teal">
              <span class="ti-step teal"><i>3</i> Por combustível</span>
              <div class="ti-kv"><span>Disponível</span><strong>600 m³/min</strong></div>
              <div class="ti-note">Informe quanto combustível você tem e descubra quantos geradores ele sustenta.</div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Energia Bruta vs Líquida', text: 'O painel calcula a geração bruta dos geradores e desconta o consumo de bombas, mineradoras e refinarias para mostrar a energia líquida real.' }
        ]
      },
      {
        id: 'pwr-gens',
        stepTag: 'GERADORES',
        title: 'Geradores e combustíveis suportados',
        desc: 'Selecione o gerador e o combustível compatível com taxas exatas da versão 1.0+.',
        renderDiagram: () => `
          <div class="ti-row-2">
            ${tutEntity('Build_GeneratorBiomass_Automated_C', 'Incinerador de Biomassa', '30 MW · Folhas, Madeira, Biocombustível')}
            ${tutEntity('Build_GeneratorCoal_C', 'Gerador a Carvão', '75 MW · Carvão + Água (45 m³/m)')}
            ${tutEntity('Build_GeneratorFuel_C', 'Gerador a Combustível', '250 MW · Combustível, Turbo, Foguete, Ionizado')}
            ${tutEntity('Build_GeneratorNuclear_C', 'Usina Nuclear', '2.500 MW · Urânio, Plutônio, Ficsônio + Água')}
          </div>
        `,
        blocks: [
          { heading: 'Compatibilidade automática', text: 'Ao trocar de gerador, a lista de combustíveis se atualiza automaticamente mostrando o consumo exato por minuto de cada opção.' }
        ]
      },
      {
        id: 'pwr-chain',
        stepTag: 'CADEIA COMPLETA',
        title: 'Da extração até o gerador no Spaces',
        desc: 'O fluxograma da aba Energia não mostra só os geradores: ele monta toda a cadeia produtiva do combustível.',
        renderDiagram: () => `
          <div class="ti-card">
            <span class="ti-step"><i>⚡</i> Fluxo completo de uma usina a Combustível</span>
            <div class="ti-flow-4">
              ${tutEntity('Build_OilPump_C', 'Extrator de Petróleo', 'Petróleo Bruto')}
              <div class="ti-wire fluid"></div>
              ${tutEntity('Build_Refinery_C', 'Refinaria', 'Combustível')}
              <div class="ti-wire fluid"></div>
              ${tutEntity('Build_GeneratorFuel_C', 'Gerador Combustível', '250 MW cada')}
              <div class="ti-wire"></div>
              <div class="ti-entity final"><div><b>Energia Gerada</b><small>Bruta &amp; Líquida MW</small></div></div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Receitas configuráveis', text: 'Você pode trocar receitas de refino (ex.: Combustível Diluído no Misturador) e ajustar overclock em cada etapa da usina.' }
        ]
      },
      {
        id: 'pwr-3d',
        stepTag: 'ESCALA',
        title: 'Usinas grandes em andares 3D',
        desc: 'Ao ativar a visão 3D em usinas com dezenas de geradores, as etapas são distribuídas automaticamente entre os andares.',
        renderDiagram: () => `
          <div class="ti-row-2">
            <div class="ti-card">
              <span class="ti-step"><i>1º</i> Andar Inferior</span>
              <div class="ti-note">Extratores, bombas d'água e refinarias de combustível.</div>
            </div>
            <div class="ti-card blue">
              <span class="ti-step blue"><i>2º</i> Andar Superior</span>
              <div class="ti-note">Geradores organizados em sub-grade compacta com junções consolidadas (×N).</div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Controle de andares', text: 'Escolha quantos andares deseja (2, 3, 4...) e filtre qual andar quer inspecionar.' }
        ],
        tryAction: { label: 'Abrir aba Energia', mode: 'power' }
      }
    ]
  },

  /* =========================================================================
   * 6. OFICINA (5 passos)
   * ======================================================================= */
  {
    id: 'oficina',
    chip: 'OFICINA',
    title: 'Oficina',
    desc: 'Monte fábricas manualmente bloco a bloco, conecte portas e valide o equilíbrio.',
    slides: [
      {
        id: 'free-overview',
        stepTag: 'MODO LIVRE',
        title: 'O que é a aba Oficina?',
        desc: 'Um ambiente livre para montar sua própria fábrica do zero ou importar uma linha pronta da aba Produção para ajustar manualmente.',
        renderDiagram: () => `
          <div class="ti-flow-3">
            <div class="ti-card">
              <span class="ti-step"><i>1</i> Adicione blocos</span>
              <div class="ti-note">Máquinas, mineradoras, geradores, divisores, containers e tanques.</div>
            </div>
            <div class="ti-arrow">→</div>
            <div class="ti-card blue">
              <span class="ti-step blue"><i>2</i> Conecte portas</span>
              <div class="ti-note">Arraste de uma porta de saída até uma entrada compatível.</div>
            </div>
            <div class="ti-arrow">→</div>
            <div class="ti-card teal">
              <span class="ti-step teal"><i>3</i> Valide (Check)</span>
              <div class="ti-note">Detecta gargalos de esteira, déficits de itens e saldo de energia.</div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Controle manual total', text: 'Diferente da Produção, na Oficina você define manualmente a quantidade de máquinas, receitas, posições e cada conexão.' }
        ]
      },
      {
        id: 'free-add',
        stepTag: 'ADICIONAR BLOCOS',
        title: 'Modal "+ Adicionar" por categoria',
        desc: 'Clique em "+ Adicionar" para escolher máquinas, logística, armazenamentos ou geradores ordenados dos mais básicos aos avançados.',
        renderDiagram: () => `
          <div class="ti-row-2">
            ${tutEntity('Build_ConstructorMk1_C', 'Máquinas de Produção', 'Construtor, Fornalha, Montadora...')}
            ${tutEntity('Build_ConveyorAttachmentSplitterSmart_C', 'Logística & Divisores', 'Divisor Inteligente, Unificador, Elevador')}
            ${tutEntity('Build_StorageContainerMk1_C', 'Armazenamento', 'Container (24/48 slots), Tanque (400/2400 m³)')}
            ${tutEntity('Build_GeneratorFuel_C', 'Energia & Extração', 'Mineradoras, Bombas e Geradores')}
          </div>
        `,
        blocks: [
          { heading: 'Divisor Inteligente funcional', text: 'Configure regras reais para as saídas Esquerda, Centro e Direita (item específico, Qualquer ou Transbordamento).' },
          { heading: 'Fechar rápido', text: 'Pressione ESC ou clique fora do modal para fechar o seletor a qualquer momento.' }
        ]
      },
      {
        id: 'free-connect',
        stepTag: 'CONEXÕES',
        title: 'Conectar esteiras e tubulações',
        desc: 'Arraste a partir de qualquer bolinha de saída até a entrada do bloco seguinte.',
        renderDiagram: () => `
          <div class="ti-stack">
            <div class="ti-card">
              <span class="ti-step"><i>1</i> Sólidos (Esteiras v.1 a v.6)</span>
              <div class="ti-flow-3">
                ${tutEntity('Build_SmelterMk1_C', 'Fornalha', 'Saída Laranja ●')}
                <div class="ti-wire"></div>
                <div class="ti-pill on" style="justify-content:center">v.1 · 30/m</div>
                <div class="ti-wire"></div>
                ${tutEntity('Build_ConstructorMk1_C', 'Construtor', '● Entrada Laranja')}
              </div>
            </div>
            <div class="ti-card blue">
              <span class="ti-step blue"><i>2</i> Fluidos (Tubulações v.1 e v.2)</span>
              <div class="ti-flow-3">
                ${tutEntity('Build_WaterPump_C', 'Extrator de Água', 'Saída Azul ●')}
                <div class="ti-wire fluid"></div>
                <div class="ti-pill blue" style="justify-content:center">Tub. v.1 · 120 m³/m</div>
                <div class="ti-wire fluid"></div>
                ${tutEntity('Build_GeneratorCoal_C', 'Gerador a Carvão', '● Entrada Azul')}
              </div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Validação visual ao arrastar', text: 'Enquanto arrasta a conexão, a borda do card de destino fica verde se for compatível ou vermelha se houver incompatibilidade (ex.: fluido em esteira).' }
        ]
      },
      {
        id: 'free-check',
        stepTag: 'DIAGNÓSTICO',
        title: 'Validar a fábrica com "Check"',
        desc: 'O botão Check analisa toda a sua montagem e aponta exatamente o que falta ou está sobrando.',
        renderDiagram: () => `
          <div class="ti-row-2">
            <div class="ti-card danger">
              <span class="ti-step danger"><i>!</i> Déficits e Gargalos</span>
              <div class="ti-note">Informa exatamente quantas máquinas faltam ou qual esteira precisa subir de versão (ex.: v.2 → v.3).</div>
            </div>
            <div class="ti-card teal">
              <span class="ti-step teal"><i>✓</i> Sobras e Energia</span>
              <div class="ti-note">Mostra sobras aproveitáveis e o balanço entre energia gerada e consumida em MW.</div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Dicas de receitas', text: 'O diagnóstico também avisa se houver uma receita alternativa mais eficiente para algum item da sua linha.' }
        ]
      },
      {
        id: 'free-shortcuts',
        stepTag: 'PRODUTIVIDADE',
        title: 'Atalhos e importação da Produção',
        desc: 'Acelere a montagem com atalhos de teclado e clique direito no canvas.',
        renderDiagram: () => `
          <div class="ti-row-2">
            <div class="ti-card">
              <span class="ti-step"><i>⌨</i> Atalhos úteis</span>
              <div class="ti-kv"><span>Alt + Arrastar card</span><strong>Duplica bloco</strong></div>
              <div class="ti-kv"><span>Shift + Arrastar fundo</span><strong>Seleção múltipla</strong></div>
              <div class="ti-kv"><span>Botão direito</span><strong>Menu rápido criar</strong></div>
            </div>
            <div class="ti-card accent">
              <span class="ti-step"><i>↗</i> Trazer da Produção</span>
              <div class="ti-note">Na aba Produção, clique em <strong>Editar na Oficina</strong> para trazer toda a linha calculada pronta para customizar manualmente.</div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Alinhamento à grade', text: 'Ative ou desative o snap-to-grid em Configurações → Preferências.' }
        ],
        tryAction: { label: 'Abrir Oficina', mode: 'free' }
      }
    ]
  },

  /* =========================================================================
   * 7. MAPA (3 passos)
   * ======================================================================= */
  {
    id: 'mapa',
    chip: 'MAPA',
    title: 'Mapa',
    desc: 'Explore MASSAGE-2(A-B)b com jazigos por pureza, discos rígidos e colecionáveis.',
    slides: [
      {
        id: 'map-overview',
        stepTag: 'VISÃO GERAL',
        title: 'Mapa interativo 1.0+ completo',
        desc: 'Navegue pelo planeta MASSAGE-2(A-B)b com zoom suave para localizar exatamente onde construir sua próxima fábrica.',
        renderDiagram: () => `
          <div class="ti-card teal">
            <span class="ti-step teal"><i>🗺</i> MASSAGE-2(A-B)b</span>
            <div class="ti-row-3">
              <div class="ti-kv"><span>Jazigos</span><strong>Minérios &amp; Fluidos</strong></div>
              <div class="ti-kv"><span>Pureza</span><strong>Impuro · Normal · Puro</strong></div>
              <div class="ti-kv"><span>Exploração</span><strong>Discos · Lesmas · Esferas</strong></div>
            </div>
            <div class="ti-note">Clique em qualquer marcador no mapa para ver coordenadas, pureza e tipo exato do recurso.</div>
          </div>
        `,
        blocks: [
          { heading: 'Planeje próximo aos recursos', text: 'Use o mapa para encontrar clusters de Ferro, Carvão, Petróleo ou Bauxita antes de dimensionar sua fábrica na aba Produção.' }
        ]
      },
      {
        id: 'map-filters',
        stepTag: 'FILTROS',
        title: 'Filtrar jazigos e colecionáveis',
        desc: 'Use o painel esquerdo da aba Mapa para ligar ou desligar recursos, purezas e itens colecionáveis.',
        renderDiagram: () => `
          <div class="ti-row-2">
            <div class="ti-card">
              <span class="ti-step"><i>1</i> Recursos por pureza</span>
              <div class="ti-pill-row">
                <span class="ti-pill danger">Impuro (0.5×)</span>
                <span class="ti-pill on">Normal (1×)</span>
                <span class="ti-pill green">Puro (2×)</span>
              </div>
              <div class="ti-row-2" style="margin-top:4px">
                ${tutEntity('Desc_OreIron_C', 'Ferro', 'Nós no mapa')}
                ${tutEntity('Desc_LiquidOil_C', 'Petróleo', 'Poços & Nós')}
              </div>
            </div>
            <div class="ti-card purple">
              <span class="ti-step purple"><i>2</i> Colecionáveis</span>
              <div class="ti-kv"><span>Discos Rígidos</span><strong>Receitas ALT</strong></div>
              <div class="ti-kv"><span>Lesmas de Energia</span><strong>Azul · Amarela · Roxa</strong></div>
              <div class="ti-kv"><span>Artefatos</span><strong>Esfera Mercer · Loop</strong></div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Limpar filtros rápido', text: 'Ative apenas o recurso que você procura no momento para deixar o mapa limpo e objetivo.' }
        ]
      },
      {
        id: 'map-nav',
        stepTag: 'NAVEGAÇÃO',
        title: 'Zoom, camadas e marcação',
        desc: 'Arraste o mapa livremente e alterne camadas para inspecionar relevo e localização exata.',
        renderDiagram: () => `
          <div class="ti-row-2">
            <div class="ti-kv"><span>Arrastar mapa</span><strong>Mover câmera</strong></div>
            <div class="ti-kv"><span>Scroll / + −</span><strong>Aproximar detalhes</strong></div>
          </div>
        `,
        blocks: [
          { heading: 'Sempre em sincronia', text: 'Trocar para o Mapa e voltar para Produção preserva intacta toda a fábrica que você estava montando.' }
        ],
        tryAction: { label: 'Abrir Mapa', mode: 'map' }
      }
    ]
  },

  /* =========================================================================
   * 8. RECEITAS (3 passos)
   * ======================================================================= */
  {
    id: 'receitas',
    chip: 'RECEITAS',
    title: 'Receitas',
    desc: 'Consulte todas as receitas padrão e alternativas (ALT) com taxas por minuto.',
    slides: [
      {
        id: 'rec-overview',
        stepTag: 'CONSULTA',
        title: 'Catálogo completo de receitas 1.0+',
        desc: 'Compare entradas, saídas por minuto, máquina usada e energia de todas as receitas padrão e alternativas.',
        renderDiagram: () => `
          <div class="ti-card">
            <span class="ti-step"><i>1</i> Exemplo de comparação</span>
            <div class="ti-flow-3">
              ${tutEntity('Desc_SteelIngot_C', 'Lingote de Aço', '45/m')}
              <div class="ti-arrow">+</div>
              ${tutEntity('Desc_Cement_C', 'Concreto', '15/m')}
              <div class="ti-arrow">→</div>
              ${tutEntity('Desc_SteelPlateReinforced_C', 'Viga Industrial', '6/m · Montadora', 'final')}
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Busca instantânea', text: 'Digite o nome do produto, de um ingrediente ou da máquina para filtrar na hora.' }
        ]
      },
      {
        id: 'rec-filters',
        stepTag: 'FILTROS',
        title: 'Filtrar por tipo, categoria e máquina',
        desc: 'Isolar apenas receitas Padrão ou apenas Alternativas (ALT) facilita decidir qual disco rígido escolher no jogo.',
        renderDiagram: () => `
          <div class="ti-card">
            <span class="ti-step blue"><i>⚙</i> Filtros combináveis</span>
            <div class="ti-pill-row">
              <span class="ti-pill on">Todas</span>
              <span class="ti-pill">Padrão</span>
              <span class="ti-pill blue">ALT</span>
              <span class="ti-pill">Lingotes</span>
              <span class="ti-pill">Fluidos &amp; Refinaria</span>
              <span class="ti-pill">Nuclear</span>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Visualização em cards ou tabela', text: 'Alterne entre grade visual ou tabela comparativa para analisar taxas lado a lado.' }
        ]
      },
      {
        id: 'rec-compare',
        stepTag: 'ANÁLISE',
        title: 'Detalhes de ciclo, energia e subprodutos',
        desc: 'Cada receita exibe claramente ingredientes, produtos principais, subprodutos (como Resíduo de Óleo Pesado) e consumo em MW.',
        renderDiagram: () => `
          <div class="ti-row-3">
            <div class="ti-kv"><span>Ciclo</span><strong>Segundos</strong></div>
            <div class="ti-kv"><span>Vazão</span><strong>un/min ou m³/min</strong></div>
            <div class="ti-kv"><span>Consumo</span><strong>MW base</strong></div>
          </div>
        `,
        blocks: [
          { heading: 'Planejamento rápido', text: 'Ideal para tirar dúvidas durante a gameplay sem sair do planejador.' }
        ],
        tryAction: { label: 'Abrir Receitas', mode: 'recipes' }
      }
    ]
  },

  /* =========================================================================
   * 9. BIBLIOTECA (3 passos)
   * ======================================================================= */
  {
    id: 'biblioteca',
    chip: 'BIBLIOTECA',
    title: 'Biblioteca',
    desc: 'Enciclopédia completa de recursos, itens, máquinas, logística, energia e fauna.',
    slides: [
      {
        id: 'lib-overview',
        stepTag: 'ENCICLOPÉDIA',
        title: 'Tudo sobre o Satisfactory 1.0+',
        desc: 'Consulte fichas técnicas de itens, máquinas, geradores, veículos, equipamentos e fauna do planeta.',
        renderDiagram: () => `
          <div class="ti-row-3">
            ${tutEntity('Desc_OreIron_C', 'Recursos & Itens', 'Pilha, pontos SUPIMPA')}
            ${tutEntity('Build_ManufacturerMk1_C', 'Máquinas', 'Consumo MW, receitas')}
            ${tutEntity('Build_ConveyorBeltMk6_C', 'Logística', 'Esteiras, tubos, silos')}
          </div>
        `,
        blocks: [
          { heading: 'Dados oficiais 1.0+', text: 'Inclui todos os itens e máquinas da fase final (Matéria Quântica, Ficsônio, Esteira v.6 e mais).' }
        ]
      },
      {
        id: 'lib-favs',
        stepTag: 'ORGANIZAÇÃO',
        title: 'Categorias, favoritos e recentes',
        desc: 'Favorite os itens que você mais consulta para acessá-los em um clique — sincronizado na sua conta.',
        renderDiagram: () => `
          <div class="ti-card">
            <span class="ti-step teal"><i>★</i> Acesso rápido</span>
            <div class="ti-pill-row">
              <span class="ti-pill on">★ Favoritos</span>
              <span class="ti-pill">Recentes</span>
              <span class="ti-pill">Recursos</span>
              <span class="ti-pill">Máquinas</span>
              <span class="ti-pill">Energia</span>
              <span class="ti-pill">Equipamentos</span>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Busca global', text: 'Procure por qualquer nome em português para abrir a ficha em segundos.' }
        ]
      },
      {
        id: 'lib-detail',
        stepTag: 'FICHA TÉCNICA',
        title: 'Inspecionar onde o item é usado',
        desc: 'Ao clicar em um item, veja como ele é fabricado, em quais receitas entra como ingrediente e quantos pontos vale no Triturador SUPIMPA.',
        renderDiagram: () => `
          <div class="ti-row-2">
            <div class="ti-kv"><span>Tamanho da pilha</span><strong>100 / 200 / 500</strong></div>
            <div class="ti-kv"><span>Pontos SUPIMPA</span><strong>Valor exato</strong></div>
            <div class="ti-kv"><span>Produzido em</span><strong>Receitas Padrão &amp; ALT</strong></div>
            <div class="ti-kv"><span>Usado em</span><strong>Lista de receitas</strong></div>
          </div>
        `,
        blocks: [
          { heading: 'Navegação encadeada', text: 'Clique em qualquer ingrediente ou máquina dentro da ficha para pular direto para a ficha dele.' }
        ],
        tryAction: { label: 'Abrir Biblioteca', mode: 'library' }
      }
    ]
  },

  /* =========================================================================
   * 10. CALCULADORA (7 passos — visão geral + 1 passo dedicado para cada ferramenta!)
   * ======================================================================= */
  {
    id: 'calculadora',
    chip: 'CALCULADORA',
    title: 'Calculadora',
    desc: 'Visão geral + guia individual de cada uma das 6 ferramentas de cálculo rápido.',
    slides: [
      {
        id: 'calc-overview',
        stepTag: 'VISÃO GERAL',
        title: '6 calculadoras rápidas em um só lugar',
        desc: 'Para contas pontuais sem precisar montar uma fábrica inteira no Spaces, escolha uma das 6 ferramentas no menu lateral.',
        renderDiagram: () => `
          <div class="ti-row-3">
            <div class="ti-card accent"><span class="ti-step"><i>1</i> Normal</span><div class="ti-note">Contas matemáticas rápidas com histórico.</div></div>
            <div class="ti-card teal"><span class="ti-step teal"><i>2</i> Recursos</span><div class="ti-note">Minérios/fluidos brutos para uma meta.</div></div>
            <div class="ti-card blue"><span class="ti-step blue"><i>3</i> Produção</span><div class="ti-note">Máquinas e MW para fabricar um item.</div></div>
            <div class="ti-card"><span class="ti-step"><i>4</i> Energia</span><div class="ti-note">Geradores, combustível e água p/ X MW.</div></div>
            <div class="ti-card purple"><span class="ti-step purple"><i>5</i> SUPIMPA</span><div class="ti-note">Pontos/min e tempo por cupom.</div></div>
            <div class="ti-card"><span class="ti-step teal"><i>6</i> Elevador</span><div class="ti-note">Progresso das 5 fases oficiais 1.0.</div></div>
          </div>
        `,
        blocks: [
          { heading: 'Fixar cálculos recentes', text: 'Salve cálculos frequentes na barra de recentes/fixados para reabrir com 1 clique.' }
        ]
      },
      {
        id: 'calc-numeric',
        stepTag: 'FERRAMENTA 1 · NORMAL',
        title: 'Calculadora Normal',
        desc: 'Calculadora clássica rápida com teclado completo, visor ampliado e histórico de contas ao lado.',
        renderDiagram: () => `
          <div class="ti-row-2">
            <div class="ti-card accent">
              <span class="ti-step"><i>1</i> Visor único grande</span>
              <div style="padding:12px 14px;border-radius:10px;background:rgba(148,163,184,0.08);text-align:right;font-family:var(--font-mono);font-size:28px;font-weight:900;color:var(--text-main)">25*4</div>
              <div class="ti-arrow">↓ Enter ou =</div>
              <div style="padding:12px 14px;border-radius:10px;background:rgba(234,88,12,0.14);border:1px solid #EA580C;text-align:right;font-family:var(--font-mono);font-size:28px;font-weight:900;color:#EA580C">100</div>
            </div>
            <div class="ti-card">
              <span class="ti-step blue"><i>2</i> Histórico ao lado</span>
              <div class="ti-kv"><span>25*4</span><strong>= 100</strong></div>
              <div class="ti-kv"><span>780/15</span><strong>= 52</strong></div>
              <div class="ti-kv"><span>250*16</span><strong>= 4.000</strong></div>
              <div class="ti-note">Todas as contas ficam salvas no card da direita com rolagem interna.</div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Comportamento natural', text: 'Digite sua operação no teclado ou pelos botões e pressione Enter (ou =): o visor substitui a conta pelo resultado para você continuar calculando.' }
        ]
      },
      {
        id: 'calc-resources',
        stepTag: 'FERRAMENTA 2 · RECURSOS',
        title: 'Calculadora de Recursos',
        desc: 'Descubra instantaneamente quanto de cada recurso bruto (minério, água, petróleo, gás) sua meta exige.',
        renderDiagram: () => `
          <div class="ti-flow-3">
            <div class="ti-card">
              <span class="ti-step"><i>1</i> Escolha o item</span>
              ${tutEntity('Desc_Computer_C', 'Computador', 'Meta: 5 un/min')}
            </div>
            <div class="ti-arrow">→</div>
            <div class="ti-card teal">
              <span class="ti-step teal"><i>2</i> Recursos brutos</span>
              ${tutEntity('Desc_OreCopper_C', 'Minério de Cobre', 'Total/min exato')}
              ${tutEntity('Desc_LiquidOil_C', 'Petróleo Bruto', 'Total m³/min')}
            </div>
            <div class="ti-arrow">→</div>
            <div class="ti-card accent">
              <span class="ti-step"><i>3</i> Atalho</span>
              <div class="ti-btn-orange">Abrir na Produção</div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Do cálculo direto ao fluxograma', text: 'Se quiser construir o que calculou, clique em "Abrir na Produção" para gerar o fluxograma completo automaticamente.' }
        ]
      },
      {
        id: 'calc-production',
        stepTag: 'FERRAMENTA 3 · PRODUÇÃO',
        title: 'Calculadora de Produção',
        desc: 'Calcula rapidamente quantas máquinas, ingredientes por minuto e consumo em MW uma receita precisa.',
        renderDiagram: () => `
          <div class="ti-row-2">
            <div class="ti-card">
              <span class="ti-step"><i>1</i> Entradas</span>
              ${tutEntity('Desc_Motor_C', 'Motor', 'Receita + Meta/min + Overclock')}
            </div>
            <div class="ti-card blue">
              <span class="ti-step blue"><i>2</i> Resultado imediato</span>
              <div class="ti-kv"><span>Máquinas</span><strong>Inteiras + exatas</strong></div>
              <div class="ti-kv"><span>Ingredientes</span><strong>Taxa/min por item</strong></div>
              <div class="ti-kv"><span>Energia</span><strong>Consumo total MW</strong></div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Compare overclock na hora', text: 'Mova o controle de overclock para ver o impacto imediato na quantidade de máquinas e no consumo de energia.' }
        ]
      },
      {
        id: 'calc-energy',
        stepTag: 'FERRAMENTA 4 · ENERGIA',
        title: 'Calculadora de Energia',
        desc: 'Estime rapidamente quantos geradores, combustível e bombas d’água são necessários para uma meta em MW.',
        renderDiagram: () => `
          <div class="ti-flow-3">
            <div class="ti-card">
              <span class="ti-step"><i>1</i> Configure</span>
              ${tutEntity('Build_GeneratorFuel_C', 'Gerador Combustível', 'Meta: 5.000 MW')}
            </div>
            <div class="ti-arrow">→</div>
            <div class="ti-card blue">
              <span class="ti-step blue"><i>2</i> Dimensionamento</span>
              <div class="ti-kv"><span>Geradores</span><strong>20 unidades</strong></div>
              <div class="ti-kv"><span>Combustível</span><strong>400 m³/min</strong></div>
            </div>
            <div class="ti-arrow">→</div>
            <div class="ti-card accent">
              <span class="ti-step"><i>3</i> Usina completa</span>
              <div class="ti-btn-orange">Abrir na Energia</div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Integração direta', text: 'Clique em "Abrir na Energia" para levar o resultado direto para o planejador visual de usinas.' }
        ]
      },
      {
        id: 'calc-sink',
        stepTag: 'FERRAMENTA 5 · SUPIMPA',
        title: 'Calculadora do Triturador SUPIMPA',
        desc: 'Calcule quantos pontos por minuto um item gera no Triturador SUPIMPA e estime o tempo para conseguir seus cupons.',
        renderDiagram: () => `
          <div class="ti-row-2">
            <div class="ti-card purple">
              <span class="ti-step purple"><i>1</i> Item e taxa/min</span>
              ${tutEntity('Desc_SpaceElevatorPart_5_C', 'Escolha qualquer item', 'Taxa enviada/min')}
            </div>
            <div class="ti-card">
              <span class="ti-step"><i>2</i> Rendimento</span>
              <div class="ti-kv"><span>Pontos/unidade</span><strong>Tabela oficial 1.0</strong></div>
              <div class="ti-kv"><span>Pontos/min</span><strong>Taxa × Valor</strong></div>
              <div class="ti-kv"><span>Cupons estimados</span><strong>Tempo por cupom</strong></div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Aproveite excessos', text: 'Ideal para decidir quais sobras da fábrica valem mais a pena enviar para o Triturador SUPIMPA.' }
        ]
      },
      {
        id: 'calc-elevator',
        stepTag: 'FERRAMENTA 6 · ELEVADOR ESPACIAL',
        title: 'Checklist do Elevador Espacial (Fases 1 a 5)',
        desc: 'Acompanhe o progresso oficial das 5 fases do Projeto Montagem, informando o que já entregou e quanto falta.',
        renderDiagram: () => `
          <div class="ti-card">
            <span class="ti-step teal"><i>🚀</i> Fases 1 a 5 (Satisfactory 1.0)</span>
            <div class="ti-kv"><span>Fase 1 — Revestimento Inteligente</span><strong>100%</strong></div>
            <div class="ti-bar-track"><i style="width:100%"></i></div>
            <div class="ti-kv"><span>Fase 2 — Estrutura Versátil + Fiação</span><strong>65%</strong></div>
            <div class="ti-bar-track"><i style="width:65%"></i></div>
            <div class="ti-kv"><span>Fase 3 a 5 — Peças avançadas 1.0</span><strong>Acompanhe o que falta</strong></div>
          </div>
        `,
        blocks: [
          { heading: 'Progresso salvo', text: 'Digite o que você já entregou no jogo e veja automaticamente o restante necessário e o percentual concluído de cada fase.' }
        ],
        tryAction: { label: 'Abrir Calculadora', mode: 'calculator' }
      }
    ]
  },

  /* =========================================================================
   * 11. PROJETOS (4 passos)
   * ======================================================================= */
  {
    id: 'projetos',
    chip: 'PROJETOS',
    title: 'Projetos',
    desc: 'Salve fábricas na nuvem, organize, compartilhe por código e baixe em PNG.',
    slides: [
      {
        id: 'prj-save',
        stepTag: 'SALVAR',
        title: 'Salvar fábricas na nuvem',
        desc: 'Com sua conta conectada, clique em Salvar em qualquer linha montada (Produção ou Oficina) para guardá-la na aba Projetos.',
        renderDiagram: () => `
          <div class="ti-flow-3">
            <div class="ti-card">
              <span class="ti-step"><i>1</i> Monte a linha</span>
              <div class="ti-note">Produção ou Oficina pronta no Spaces.</div>
            </div>
            <div class="ti-arrow">→</div>
            <div class="ti-card accent">
              <span class="ti-step"><i>2</i> Clique em Salvar</span>
              <div class="ti-btn-orange">Salvar Projeto</div>
            </div>
            <div class="ti-arrow">→</div>
            <div class="ti-card purple">
              <span class="ti-step purple"><i>3</i> Nomeie e confirme</span>
              <div class="ti-note">Fica salvo na nuvem com data e resumo automático.</div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Até 50 projetos por conta', text: 'A barra de armazenamento no topo da aba Projetos mostra quantos espaços você já utilizou.' }
        ]
      },
      {
        id: 'prj-manage',
        stepTag: 'ORGANIZAR',
        title: 'Filtrar, buscar, renomear e excluir',
        desc: 'Gerencie todas as suas fábricas salvas em um painel limpo com busca e filtros por modo.',
        renderDiagram: () => `
          <div class="ti-stack">
            <div class="ti-card">
              <span class="ti-step"><i>1</i> Filtros e busca</span>
              <div class="ti-pill-row">
                <span class="ti-pill on">Todos</span>
                <span class="ti-pill">Produção</span>
                <span class="ti-pill">Oficina</span>
                <span class="ti-pill" style="margin-left:auto">🔍 Buscar projeto...</span>
              </div>
            </div>
            <div class="ti-card purple">
              <span class="ti-step purple"><i>2</i> Ações em cada card</span>
              <div class="ti-pill-row">
                <span class="ti-pill on">▶ Abrir</span>
                <span class="ti-pill blue">↗ Compartilhar</span>
                <span class="ti-pill teal">↓ Baixar PNG</span>
                <span class="ti-pill">✎ Renomear</span>
                <span class="ti-pill danger">🗑 Excluir</span>
              </div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Atualização rápida', text: 'Ao reabrir um projeto no Spaces, você pode editá-lo e salvar por cima sem precisar criar duplicatas.' }
        ]
      },
      {
        id: 'prj-share',
        stepTag: 'COMPARTILHAR',
        title: 'Compartilhar projetos entre contas',
        desc: 'Envie qualquer fábrica sua para amigos usando um código curto — sem alterar seu projeto original.',
        renderDiagram: () => `
          <div class="ti-flow-3">
            <div class="ti-card blue">
              <span class="ti-step blue"><i>1</i> Gerar código</span>
              <div class="ti-code">SP-A7K9M2X4</div>
            </div>
            <div class="ti-arrow">→</div>
            <div class="ti-card">
              <span class="ti-step"><i>2</i> Enviar ao amigo</span>
              <div class="ti-note">Clique em <strong>Copiar</strong> e mande o código no Discord ou chat.</div>
            </div>
            <div class="ti-arrow">→</div>
            <div class="ti-card teal">
              <span class="ti-step teal"><i>3</i> Importar código</span>
              <div class="ti-note">Na aba Projetos, ele clica em <strong>Importar código</strong> e recebe uma cópia editável.</div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Cópia independente', text: 'Quem importa pode editar, renomear ou adaptar a fábrica à vontade sem afetar o projeto da sua conta.' }
        ]
      },
      {
        id: 'prj-png',
        stepTag: 'EXPORTAR IMAGEM',
        title: 'Baixar PNG compactado com ficha técnica',
        desc: 'Exporte uma imagem em alta resolução com todo o fluxograma compactado e o resumo técnico ao lado.',
        renderDiagram: () => `
          <div class="ti-card teal">
            <span class="ti-step teal"><i>↓</i> Estrutura da imagem PNG gerada</span>
            <div class="ti-row-2" style="align-items:stretch">
              <div class="ti-card" style="justify-content:center">
                <div class="ti-flow-3">
                  <div class="ti-pill" style="justify-content:center">Extração</div>
                  <div class="ti-wire"></div>
                  <div class="ti-pill" style="justify-content:center">Etapas ×N</div>
                  <div class="ti-wire"></div>
                  <div class="ti-pill on" style="justify-content:center">Final</div>
                </div>
                <div class="ti-note" style="text-align:center;margin-top:6px">Fluxograma completo obrigatoriamente na visão compactada</div>
              </div>
              <div class="ti-card">
                <span class="ti-step"><i>i</i> Ficha Técnica</span>
                <div class="ti-kv"><span>Máquinas por tipo</span><strong>×N</strong></div>
                <div class="ti-kv"><span>Energia estimada</span><strong>MW</strong></div>
                <div class="ti-kv"><span>Conexões &amp; Divisores</span><strong>Total</strong></div>
                <div class="ti-kv"><span>Entradas &amp; Saídas</span><strong>un/min</strong></div>
              </div>
            </div>
          </div>
        `,
        blocks: [
          { heading: 'Pronto para compartilhar', text: 'Ideal para mandar no Discord, salvar como guia no segundo monitor ou documentar suas megafábricas.' }
        ],
        tryAction: { label: 'Abrir Projetos', mode: 'projects' }
      }
    ]
  },

  /* =========================================================================
   * 12. REPORTAR (3 passos)
   * ======================================================================= */
  {
    id: 'reportar',
    chip: 'FEEDBACK',
    title: 'Reportar',
    desc: 'Envie bugs, sugestões ou avaliações com até 7 imagens e acompanhe a resposta.',
    slides: [
      {
        id: 'rep-open',
        stepTag: 'PASSO 1',
        title: 'Abrir e escolher o tipo de envio',
        desc: 'Clique em Reportar no canto superior direito para enviar feedback direto para o desenvolvedor.',
        renderDiagram: () => `
          <div class="ti-row-3">
            <div class="ti-card danger"><span class="ti-step danger"><i>!</i> Bug</span><div class="ti-note">Relate algum erro de cálculo, visual ou comportamento inesperado.</div></div>
            <div class="ti-card blue"><span class="ti-step blue"><i>★</i> Sugestão</span><div class="ti-note">Proponha novas funções, melhorias de layout ou atalhos.</div></div>
            <div class="ti-card teal"><span class="ti-step teal"><i>♥</i> Avaliação</span><div class="ti-note">Conte o que achou da ferramenta e o que mais ajuda no seu jogo.</div></div>
          </div>
        `,
        blocks: [
          { heading: 'Direto da tela onde você está', text: 'Não precisa sair do seu projeto para enviar um report.' }
        ]
      },
      {
        id: 'rep-attach',
        stepTag: 'PASSO 2',
        title: 'Descrever e anexar até 7 imagens',
        desc: 'Explique o que aconteceu e, se quiser, anexe prints (até 7 imagens) para facilitar a reprodução.',
        renderDiagram: () => `
          <div class="ti-flow-3">
            <div class="ti-card"><span class="ti-step"><i>1</i> Assunto</span><div class="ti-note">Título curto resumindo o tema.</div></div>
            <div class="ti-arrow">→</div>
            <div class="ti-card"><span class="ti-step blue"><i>2</i> Detalhes + Prints</span><div class="ti-note">Descrição clara + até 7 imagens opcionais.</div></div>
            <div class="ti-arrow">→</div>
            <div class="ti-card accent"><span class="ti-step"><i>3</i> Enviar</span><div class="ti-btn-orange">Enviar Report</div></div>
          </div>
        `,
        blocks: [
          { heading: 'Anexos otimizados', text: 'As imagens são enviadas com segurança para ajudar a identificar exatamente o ponto relatado.' }
        ]
      },
      {
        id: 'rep-track',
        stepTag: 'PASSO 3',
        title: 'Acompanhar status e resposta',
        desc: 'Na aba "Meus Reports" dentro do modal, veja o andamento e a resposta do administrador.',
        renderDiagram: () => `
          <div class="ti-card">
            <span class="ti-step teal"><i>✓</i> Acompanhamento</span>
            <div class="ti-pill-row">
              <span class="ti-pill">Aberto</span>
              <span class="ti-arrow" style="font-size:14px">→</span>
              <span class="ti-pill blue">Em análise</span>
              <span class="ti-arrow" style="font-size:14px">→</span>
              <span class="ti-pill green">Resolvido</span>
            </div>
            <div class="ti-note">Quando houver resposta nova, um ponto laranja aparece no botão <strong>Reportar</strong> no topo direito.</div>
          </div>
        `,
        blocks: [
          { heading: 'Retorno transparente', text: 'Acompanhe todas as suas solicitações em um só lugar.' }
        ]
      }
    ]
  }
];

function getTutorialTopicById(topicId) {
  return TUTORIAL_TOPICS.find(t => t.id === topicId) || TUTORIAL_TOPICS[0];
}

function getTutorialGroupForTopic(topicId) {
  return TUTORIAL_GROUPS_META.find(g => g.topicIds.includes(topicId)) || TUTORIAL_GROUPS_META[0];
}

function openTutorialModal(startTopicId = null) {
  AppState.tutorial.isOpen = true;
  if (startTopicId) {
    AppState.tutorial.view = 'topic';
    AppState.tutorial.topicId = startTopicId;
    AppState.tutorial.step = 0;
  } else {
    AppState.tutorial.view = 'home';
    AppState.tutorial.topicId = null;
    AppState.tutorial.step = 0;
  }
  const modal = document.getElementById('tutorial-modal');
  if (modal) modal.classList.remove('hidden');
  renderTutorialSlide();
}

function closeTutorialModal() {
  AppState.tutorial.isOpen = false;
  const modal = document.getElementById('tutorial-modal');
  if (modal) modal.classList.add('hidden');
}

function openTutorialTopic(topicId) {
  AppState.tutorial.view = 'topic';
  AppState.tutorial.topicId = topicId;
  AppState.tutorial.step = 0;
  renderTutorialSlide();
}

function backToTutorialTopics() {
  AppState.tutorial.view = 'home';
  AppState.tutorial.topicId = null;
  AppState.tutorial.step = 0;
  renderTutorialSlide();
}

function nextTutorialSlide() {
  if (AppState.tutorial.view !== 'topic') return;
  const topic = getTutorialTopicById(AppState.tutorial.topicId);
  if (AppState.tutorial.step < topic.slides.length - 1) {
    AppState.tutorial.step++;
    renderTutorialSlide();
  }
}

function prevTutorialSlide() {
  if (AppState.tutorial.view !== 'topic') return;
  if (AppState.tutorial.step > 0) {
    AppState.tutorial.step--;
    renderTutorialSlide();
  }
}

function goToTutorialSlide(index) {
  if (AppState.tutorial.view !== 'topic') return;
  const topic = getTutorialTopicById(AppState.tutorial.topicId);
  if (index >= 0 && index < topic.slides.length) {
    AppState.tutorial.step = index;
    renderTutorialSlide();
  }
}

function runTutorialTryAction(mode) {
  closeTutorialModal();
  if (mode && typeof switchMode === 'function') {
    switchMode(mode);
  }
}

function renderTutorialSlide() {
  const titleEl = document.getElementById('tutorial-title');
  const bodyEl = document.getElementById('tutorial-body');
  const footerEl = document.getElementById('tutorial-footer');
  if (!bodyEl || !footerEl) return;

  const isTopicView = AppState.tutorial.view === 'topic' && AppState.tutorial.topicId;

  /* ===== TELA 1: GRADE DE 12 TÓPICOS EM 4 GRUPOS COLORIDOS ===== */
  if (!isTopicView) {
    if (titleEl) {
      titleEl.innerHTML = `
        <span class="tut-v2-head-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
        </span>
        <span class="tut-v2-head-txt">
          <strong>Guia passo a passo</strong>
          <small>Escolha um tópico. Guias ilustrados com os ícones e fluxos reais da ferramenta.</small>
        </span>
      `;
    }

    const groupsHtml = TUTORIAL_GROUPS_META.map(grp => {
      const grpTopics = grp.topicIds
        .map(id => TUTORIAL_TOPICS.find(t => t.id === id))
        .filter(Boolean);
      if (grpTopics.length === 0) return '';
      return `
        <section class="tut-v2-group" style="--tc:${grp.color}; --tt:${grp.tint};">
          <div class="tut-v2-ghead"><i></i><span>${grp.label}</span></div>
          <div class="tut-v2-ggrid">
            ${grpTopics.map(t => `
              <button type="button" class="tut-v2-tcard" onclick="openTutorialTopic('${t.id}')">
                <span class="tut-v2-tico">${getTutorialTopicSvg(t.id)}</span>
                <div class="tut-v2-tbody">
                  <div class="tut-v2-tname">${t.title}</div>
                  <div class="tut-v2-tdesc">${t.desc}</div>
                  <div class="tut-v2-tmeta">
                    <span class="tut-v2-bars">${t.slides.map(() => '<i></i>').join('')}</span>
                    <span>${t.slides.length} passos</span>
                  </div>
                </div>
              </button>
            `).join('')}
          </div>
        </section>
      `;
    }).join('');

    bodyEl.innerHTML = `<div class="tut-v2-groups-wrap">${groupsHtml}</div>`;
    const totalSteps = TUTORIAL_TOPICS.reduce((acc, t) => acc + t.slides.length, 0);
    footerEl.innerHTML = `
      <span class="tut-footer-hint">${TUTORIAL_TOPICS.length} tópicos · ${totalSteps} passos ilustrados</span>
      <button type="button" class="ds-btn-primary" onclick="closeTutorialModal()">Fechar</button>
    `;
    return;
  }

  /* ===== TELA 2: PASSO ILUSTRADO DO TÓPICO ===== */
  const topic = getTutorialTopicById(AppState.tutorial.topicId);
  const grp = getTutorialGroupForTopic(topic.id);
  const idx = Math.max(0, Math.min(AppState.tutorial.step || 0, topic.slides.length - 1));
  const slide = topic.slides[idx];
  const pct = Math.round(((idx + 1) / topic.slides.length) * 100);
  const diagramHtml = typeof slide.renderDiagram === 'function' ? slide.renderDiagram() : '';

  if (titleEl) {
    titleEl.innerHTML = `
      <button type="button" class="tut-v2-back-btn" onclick="backToTutorialTopics()">← Tópicos</button>
      <span class="tut-v2-tico is-sm" style="--tc:${grp.color}; --tt:${grp.tint};">${getTutorialTopicSvg(topic.id)}</span>
      <strong>${topic.title}</strong>
      <span class="tut-v2-step-cnt">Passo ${idx + 1} de ${topic.slides.length}</span>
    `;
  }

  bodyEl.innerHTML = `
    <div class="tut-v2-progress"><div style="width:${pct}%;"></div></div>
    <div class="tut-v2-step-layout">
      <aside class="tut-v2-rail" aria-label="Lista de passos">
        ${topic.slides.map((s, i) => `
          <button type="button" class="tut-v2-ri ${i === idx ? 'on' : (i < idx ? 'dn' : '')}" onclick="goToTutorialSlide(${i})">
            <b>${i < idx ? '✓' : (i + 1)}</b>
            <span>${s.title}</span>
          </button>
        `).join('')}
      </aside>

      <div class="tut-v2-stage">
        <div class="tut-ilus-stage">
          ${diagramHtml}
        </div>

        <div class="tut-v2-content">
          <span class="tut-v2-tag">${slide.stepTag || `Passo ${idx + 1}`}</span>
          <h4>${slide.title}</h4>
          <p class="tut-slide-desc">${slide.desc}</p>
          ${Array.isArray(slide.blocks) && slide.blocks.length > 0 ? `
            <div class="tut-v2-blocks">
              ${slide.blocks.map(b => `
                <div class="tut-v2-block" ${b.color ? `style="border-left-color:${b.color};"` : ''}>
                  <strong>${b.heading}</strong>
                  <p>${b.text}</p>
                </div>
              `).join('')}
            </div>
          ` : ''}
          ${slide.tip ? `<div class="tut-slide-tip"><strong>Dica:</strong> ${slide.tip}</div>` : ''}
          ${slide.tryAction ? `
            <div style="margin-top:8px;">
              <button type="button" class="ds-btn-primary" onclick="runTutorialTryAction('${slide.tryAction.mode}')">${slide.tryAction.label}</button>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  footerEl.innerHTML = `
    <button type="button" class="ds-btn-secondary" onclick="prevTutorialSlide()" ${idx === 0 ? 'disabled' : ''}>← Anterior</button>
    <span class="tut-footer-hint">Use ← e → no teclado para navegar</span>
    ${idx < topic.slides.length - 1
      ? `<button type="button" class="ds-btn-primary" onclick="nextTutorialSlide()">Próximo →</button>`
      : `<button type="button" class="ds-btn-primary" onclick="backToTutorialTopics()">Concluir ✓</button>`}
  `;
}

// Navegação por teclado (Esc, ←, →)
document.addEventListener('keydown', (e) => {
  if (!AppState.tutorial || !AppState.tutorial.isOpen) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    closeTutorialModal();
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    nextTutorialSlide();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    prevTutorialSlide();
  }
});
