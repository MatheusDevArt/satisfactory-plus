/* ============================================================================
 * TUTORIAL INTERATIVO DIDÁTICO — SATISFACTORY+ 1.0+
 * Tópicos por aba em cards com prints reais dedicados, passo a passo didático,
 * navegação por teclado/toque, lightbox e glossário oficial em PT-BR.
 * ========================================================================== */

const TUTORIAL_IMG_VERSION = '33';

const TUTORIAL_SLIDES = [
  /* ===================== 1. INTERFACE ===================== */
  {
    id: 'como-usar',
    title: 'Visão geral da interface',
    oneLiner: 'A tela se divide em quatro áreas simples: painel lateral esquerdo, área de trabalho central, topo e controles laterais/inferiores.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-01-inicio.webp',
        alt: 'Visão geral da interface do Satisfactory+ mostrando painel esquerdo, área de trabalho central, topo direito e barra vertical de ações.',
        markers: [
          { n: 1, x: 14, y: 30 },
          { n: 2, x: 58, y: 50 },
          { n: 3, x: 84, y: 5 },
          { n: 4, x: 97, y: 50 }
        ]
      }
    ],
    legend: [
      '<strong>Painel esquerdo</strong>: abas da ferramenta, configuração de itens/máquinas e botões compactos de <strong>Montar</strong>, <strong>Salvar</strong> e <strong>Limpar</strong>.',
      '<strong>Área de trabalho</strong>: espaço interativo onde as máquinas, esteiras e tubulações são montadas.',
      '<strong>Topo direito</strong>: direção do fluxo (<strong>→ ← ↓ ↑</strong>), <strong>Tutorial</strong>, <strong>Patch notes</strong>, <strong>Reportar</strong> e <strong>Entrar</strong>.',
      '<strong>Barra vertical direita</strong>: controles rápidos de zoom, <strong>Visão 3D</strong>, agrupar máquinas, modo compacto e centralizar.'
    ],
    tip: 'Use as setas do teclado (← →) para trocar de página e clique em qualquer print para ampliar em tela cheia.'
  },
  {
    id: 'abas',
    title: 'Para que serve cada aba?',
    oneLiner: 'Cada aba no topo do painel esquerdo resolve uma parte diferente do planejamento da sua fábrica.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-02-abas.webp',
        alt: 'Barra de abas no topo do painel esquerdo com Produção, Energia, Oficina, Mapa, Receitas, Biblioteca e Calculadora.',
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
      '<strong>🏭 Produção</strong>: calcula automaticamente toda a cadeia produtiva a partir de um produto final ou recurso.',
      '<strong>⚡ Energia</strong>: dimensiona usinas por meta de MW ou número de geradores, com combustível e água.',
      '<strong>🛠️ Oficina</strong>: espaço livre para posicionar máquinas, logística e conexões manualmente.',
      '<strong>🗺️ Mapa</strong>: mapa oficial de MASSAGE-2(A-B)b com jazigos, pureza e discos rígidos.',
      '<strong>📜 Receitas</strong>, <strong>📚 Biblioteca</strong> e <strong>🧮 Calculadora</strong>: consultas oficiais do jogo e suíte completa de cálculos.'
    ],
    tip: 'Ao entrar na sua conta, a aba <strong>📁 Projetos</strong> aparece automaticamente para abrir suas fábricas salvas na nuvem.'
  },

  /* ===================== 2. PRODUÇÃO ===================== */
  {
    id: 'primeira-linha',
    title: 'O que é a aba Produção e como montar sua linha',
    oneLiner: 'Escolha o item que deseja fabricar (ou o recurso de entrada), defina a taxa/min e clique em Montar.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-03-primeira-linha.webp',
        alt: 'Painel lateral da aba Produção com Chapa de Ferro configurada e botões Montar, Salvar e Limpar.'
      }
    ],
    legend: [
      '<strong>O que faz</strong>: resolve toda a árvore de receitas, calcula quantas máquinas de cada tipo você precisa e sugere a esteira/tubo ideal.',
      '<strong>Como escolher</strong>: clique em <strong>Produtos</strong>, <strong>Recursos</strong> ou <strong>Máquinas</strong> para abrir o seletor ampliado dividido por categorias.',
      '<strong>Ações rápidas</strong>: use <strong>Montar</strong> para desenhar a fábrica, <strong>Salvar</strong> para guardar na conta e <strong>Limpar</strong> para recomeçar.'
    ],
    tip: 'A taxa inicial já vem preenchida com a produção base de 1 máquina a 100% (ex.: 20/min em Chapa de Ferro).',
    tryAction: { label: 'Abrir aba Produção', mode: 'production' }
  },
  {
    id: 'como-ler-fluxo',
    title: 'Como ler o fluxo da linha montada?',
    oneLiner: 'O material percorre a linha na direção escolhida: quem produz fica antes de quem consome.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-04-fluxo.webp',
        alt: 'Fluxo de produção de Chapa de Ferro mostrando Nó de Minério de Ferro, Fornalha, Construtor e Produto Final.',
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
      '<strong>Origem</strong>: nó de recurso onde o minério, petróleo ou água entra na linha.',
      '<strong>Esteira / Tubo</strong>: conecta a saída (laranja para sólidos, azul para fluidos) à entrada seguinte.',
      '<strong>Máquina produtora</strong>: transforma o material (ex.: <strong>FORNALHA #1</strong>).',
      '<strong>Etiqueta central</strong>: mostra a versão da esteira/tubo e a vazão exata em <strong>/min</strong>.',
      '<strong>Etapa seguinte</strong>: recebe o item pronto e continua até o produto final.'
    ],
    tip: 'Altere a direção da fábrica nos 4 botões de seta (<strong>→ ← ↓ ↑</strong>) no topo ou envie a linha para a <strong>Oficina</strong> para editar livremente.'
  },
  {
    id: 'etiquetas-esteiras',
    title: 'Como ler as etiquetas das esteiras e tubulações?',
    oneLiner: 'Cada etiqueta informa a versão mínima recomendada e a vazão real por minuto.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-05-etiquetas.webp',
        alt: 'Detalhe das etiquetas no meio das esteiras mostrando v.2 120/m, v.1 30/m e conector curto.',
        markers: [
          { n: 1, x: 31, y: 47 },
          { n: 2, x: 72, y: 37 },
          { n: 3, x: 31, y: 95 }
        ]
      }
    ],
    legend: [
      '<strong>v.2 · 120/m</strong>: indica Esteira v.2 (capacidade 120/min) transportando 120 itens/min.',
      '<strong>v.1 · 30/m</strong>: Esteira v.1 já suporta 30/min. Líquidos e gases usam Tubulação azul (v.1 ou v.2).',
      '<strong>Etiqueta curta (→)</strong>: em fábricas grandes, clique na etiqueta para saltar direto ao destino.'
    ],
    tip: 'Passe o mouse sobre uma etiqueta ou máquina para destacar todo o caminho ligado a ela.'
  },
  {
    id: 'cards-maquina',
    title: 'Cards de máquina e agrupamento por tipo',
    oneLiner: 'Veja entradas, saídas, clock e energia no card, e agrupe máquinas iguais em fábricas grandes.',
    scenes: [
      {
        label: 'Individual',
        src: './assets/tutorial/tutorial-06a-card-maquina.webp',
        alt: 'Card da Fornalha #1 mostrando clock, energia, Entrada e Saída.',
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
        alt: 'Fluxo de produção com máquinas iguais agrupadas em um único card.'
      }
    ],
    legend: [
      '<strong>Nome e índice</strong>: identifica qual máquina construir (ex.: <strong>FORNALHA #1</strong>).',
      '<strong>Clock e energia</strong>: velocidade (<strong>100%</strong> a <strong>250%</strong>) e consumo real em <strong>MW</strong>.',
      '<strong>ENTRADA e SAÍDA</strong>: mostra exatamente o que entra e o que sai por minuto.',
      '<strong>Painel agrupado</strong>: na barra lateral, as etapas ficam classificadas por tipo de máquina para facilitar a leitura.'
    ],
    tip: 'Use o ícone de agrupamento na barra lateral direita para alternar entre todas as máquinas individuais ou um único card resumido.'
  },
  {
    id: 'nos-recurso',
    title: 'Nós de recurso e pureza',
    oneLiner: 'Configure o nível da mineradora, a pureza do nó e o overclock de extração.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-07-no-recurso.webp',
        alt: 'Card Nó de Minério de Ferro mostrando pureza Normal, mineradora e taxa de extração.',
        markers: [
          { n: 1, x: 35, y: 19 },
          { n: 2, x: 25, y: 27 },
          { n: 3, x: 50, y: 72 }
        ]
      }
    ],
    legend: [
      '<strong>Nó de recurso</strong>: representa a extração de minérios, petróleo bruto ou água.',
      '<strong>Pureza (Impuro / Normal / Puro)</strong>: define a taxa base da mineradora v.1, v.2 ou v.3.',
      '<strong>Taxa extraída</strong>: mostra exatamente quanto sai por minuto do nó.'
    ],
    tip: 'Clique no card do nó ou ajuste no painel esquerdo para trocar mineradora, pureza ou clock.'
  },
  {
    id: 'produto-final',
    title: 'Identificando o Produto Final',
    oneLiner: 'Os itens finais da sua fábrica sempre aparecem destacados com borda laranja.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-08-produto-final.webp',
        alt: 'Card destacado de Produto Final mostrando Chapa de Ferro e produção entregue por minuto.',
        markers: [
          { n: 1, x: 64, y: 20 },
          { n: 2, x: 65, y: 58 },
          { n: 3, x: 50, y: 74 }
        ]
      }
    ],
    legend: [
      '<strong>Etiqueta PRODUTO FINAL</strong>: marca o destino final da linha de produção.',
      '<strong>Contagem de máquinas</strong>: resume quantas máquinas entregam esse produto.',
      '<strong>PRODUÇÃO FINAL</strong>: exibe a taxa real entregue em <strong>/min</strong>.'
    ],
    tip: 'Você pode adicionar mais de um produto final na mesma linha — todos ficam destacados.'
  },
  {
    id: 'status-excesso',
    title: 'Resumo da Fábrica e aproveitamento de Excesso',
    oneLiner: 'Confira energia total, construções necessárias e reaproveite subprodutos em excesso.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-09-excesso.webp',
        alt: 'Painel esquerdo mostrando Resumo da Fábrica com Energia, Excesso e botão Gerar nova linha de produção.'
      }
    ],
    legend: [
      '<strong>Resumo da Fábrica</strong>: exibe consumo total em MW, construções necessárias e lista de materiais.',
      '<strong>Excesso (Subprodutos)</strong>: lista apenas itens extras gerados que nenhuma máquina da linha consome (ex.: Resina de polímero).',
      '<strong>Gerar nova linha</strong>: inicia uma nova linha já usando o excesso disponível.'
    ],
    commonMistake: 'Recursos extraídos do solo e itens totalmente consumidos na própria linha não aparecem como excesso.'
  },

  /* ===================== 3. ENERGIA ===================== */
  {
    id: 'energia-o-que-e',
    title: 'O que é a aba Energia?',
    oneLiner: 'Planeje usinas completas calculando geradores, combustível, água e energia líquida automaticamente.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-13-energia.webp',
        alt: 'Aba Energia com 8 Geradores a Carvão montados no canvas, painel lateral e barra de status na base.'
      }
    ],
    legend: [
      '<strong>Dois modos de cálculo</strong>: escolha <strong>Por Energia (MW)</strong> para atingir uma meta ou <strong>Por Geradores</strong> para definir quantas usinas vai construir.',
      '<strong>Combustível e Água</strong>: calcula automaticamente o consumo de combustível (/min) e quantas <strong>Bombas d\'água</strong> são necessárias.',
      '<strong>Fluxo visual completo</strong>: desenha a extração de combustível, água, tubulações e geradores no canvas, com resumo neutro na base.'
    ],
    tip: 'Ideal para montar usinas de Carvão, Combustível, Turbo Combustível, Combustível de Foguete ou Nuclear.',
    tryAction: { label: 'Abrir aba Energia', mode: 'power' }
  },
  {
    id: 'energia-como-usar',
    title: 'Como configurar sua usina passo a passo',
    oneLiner: 'Escolha o tipo de gerador, selecione o combustível, ajuste o clock e clique em Montar.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-13-energia.webp',
        alt: 'Configuração de Gerador a Carvão com Carvão e 8 geradores na aba Energia.'
      }
    ],
    legend: [
      '<strong>1. Escolha o Gerador</strong>: Carvão, Combustível, Nuclear, Queimador de Biomassa ou Aumentador de Energia Alienígena.',
      '<strong>2. Combustível e Quantidade/MW</strong>: informe a meta (ex.: 600 MW ou 8 Geradores a Carvão) e o combustível usado.',
      '<strong>3. Overclock e Montar</strong>: ajuste o clock (%) se quiser menos máquinas e clique em <strong>Montar</strong> (ou <strong>Salvar</strong> para guardar na sua conta).'
    ],
    tip: 'Ao aumentar o clock de geradores, a geração de energia e o consumo de combustível/água escalam proporcionalmente no Satisfactory 1.0+.'
  },

  /* ===================== 4. OFICINA ===================== */
  {
    id: 'oficina-o-que-e',
    title: 'O que é a aba Oficina?',
    oneLiner: 'Monte fábricas do zero posicionando máquinas, extratores, logística, armazenamento e energia do seu jeito.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-10-modo-livre.webp',
        alt: 'Aba Oficina em tela cheia mostrando os 4 blocos de categoria no painel esquerdo, busca por nome e máquinas conectadas no canvas.'
      }
    ],
    legend: [
      '<strong>4 categorias rápidas</strong>: no painel esquerdo, clique em <strong>Máquinas</strong>, <strong>Receitas</strong>, <strong>Logística & Armazenamento</strong> ou <strong>Energia</strong> para abrir o catálogo ampliado.',
      '<strong>Busca direta</strong>: digite o nome de qualquer máquina, receita ou construção no campo de busca do painel.',
      '<strong>Lista agrupada</strong>: todas as construções adicionadas aparecem classificadas por tipo de máquina, com ajuste compacto de <strong>Nº Máquinas</strong> e <strong>Andar (3D)</strong>.'
    ],
    tip: 'Você pode abrir qualquer linha da aba <strong>Produção</strong> direto na <strong>Oficina</strong> para adicionar divisores, contêineres e ajustes manuais.',
    tryAction: { label: 'Abrir aba Oficina', mode: 'free' }
  },
  {
    id: 'oficina-conexoes-atalhos',
    title: 'Conexões, edição de esteiras e atalhos na Oficina',
    oneLiner: 'Puxe das portas para conectar, clique nas esteiras para editar e use Shift/Espaço para controlar seleção e câmera.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-10-modo-livre.webp',
        alt: 'Máquinas e conexões na aba Oficina com portas laranja de sólidos e barra lateral de ações.'
      }
    ],
    legend: [
      '<strong>Portas laranja e azul</strong>: arraste de uma saída até uma entrada compatível. Sólidos usam portas <strong>laranja</strong>; líquidos/gases usam <strong>azul</strong>. Ligações incompatíveis são bloqueadas com aviso.',
      '<strong>Editar esteiras e tubos</strong>: clique diretamente sobre qualquer esteira/tubo ou sua etiqueta para trocar a versão (v.1–v.6), inserir divisor no meio ou remover.',
      '<strong>Duplicar e Overclock global</strong>: use o botão duplicar no card (ou botão direito), <strong>Ctrl+C / Ctrl+V</strong>, e o raio <strong>⚡</strong> na barra direita para alterar o overclock de tudo.',
      '<strong>Mouse preciso</strong>: segure <strong>Espaço + arrastar</strong> para mover a câmera e <strong>Shift + arrastar</strong> no fundo para selecionar vários cards de uma vez.'
    ],
    tip: 'Segurar <strong>Alt</strong> ao arrastar um card também cria uma cópia instantânea na posição solta.'
  },
  {
    id: 'navegacao-foco',
    title: 'Navegação, Visão 3D e Modo Foco',
    oneLiner: 'Aproxime, centralize, organize andares em 3D e destaque apenas o caminho de uma máquina.',
    scenes: [
      {
        label: 'Controles',
        src: './assets/tutorial/tutorial-11a-navegacao.webp',
        alt: 'Área de trabalho com controles de direção no topo e barra vertical direita de zoom, Visão 3D, agrupamento e centralizar.'
      },
      {
        label: 'Modo Foco',
        src: './assets/tutorial/tutorial-11b-foco.webp',
        alt: 'Modo foco destacando a máquina sob o cursor e suavizando o restante da linha.'
      }
    ],
    legend: [
      '<strong>Direção do fluxo</strong>: alterne no topo entre <strong>→</strong>, <strong>←</strong>, <strong>↓</strong> e <strong>↑</strong>.',
      '<strong>Barra vertical direita</strong>: controle zoom (ou use a rodinha do mouse), ative <strong>Visão 3D</strong> por andares, modo compacto e <strong>Centralizar</strong>.',
      '<strong>Modo Foco</strong>: passe o mouse sobre qualquer máquina para iluminar apenas o que entra e sai dela.'
    ],
    tip: 'No modo <strong>Visão 3D</strong>, use as setas <strong>‹ ›</strong> de Andar no painel esquerdo da Oficina para empilhar fábricas em vários pavimentos.'
  },

  /* ===================== 5. MAPA ===================== */
  {
    id: 'mapa-o-que-e',
    title: 'O que é a aba Mapa?',
    oneLiner: 'Explore o mapa interativo oficial de MASSAGE-2(A-B)b com todos os jazigos, purezas e discos rígidos.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-14-mapa.webp',
        alt: 'Aba Mapa mostrando o mapa interativo de Satisfactory e os filtros de jazigos na barra lateral.'
      }
    ],
    legend: [
      '<strong>Dados oficiais</strong>: reúne mais de 2.500 pontos reais do jogo, incluindo minérios, petróleo, água, gêiseres, poços de recurso e destroços.',
      '<strong>Pureza visível</strong>: cada jazigo indica se é <strong>Impuro</strong>, <strong>Normal</strong> ou <strong>Puro</strong>.',
      '<strong>Navegação fluida</strong>: arraste para explorar o mapa e use a rodinha do mouse para aproximar regiões específicas.'
    ],
    tryAction: { label: 'Abrir aba Mapa', mode: 'map' }
  },
  {
    id: 'mapa-como-usar',
    title: 'Como filtrar recursos e planejar extrações no Mapa',
    oneLiner: 'Ative apenas os recursos que procura e clique nos marcadores para ver detalhes do ponto.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-14-mapa.webp',
        alt: 'Filtros laterais do Mapa por categoria de recurso, pureza e pontos de interesse.'
      }
    ],
    legend: [
      '<strong>1. Filtre na barra lateral</strong>: marque apenas os recursos desejados (ex.: Ferro, Carvão, Petróleo bruto, Urânio ou Discos Rígidos).',
      '<strong>2. Busque por nome</strong>: use a busca no topo do painel para localizar rapidamente qualquer camada.',
      '<strong>3. Leve para sua fábrica</strong>: verifique a pureza dos nós próximos e configure exatamente a mesma extração em <strong>Produção</strong> ou <strong>Energia</strong>.'
    ],
    tip: 'Combine a consulta de nós puros no Mapa com a calculadora de Recursos para saber exatamente quantas máquinas aquele local suporta.'
  },

  /* ===================== 6. RECEITAS ===================== */
  {
    id: 'receitas-o-que-e',
    title: 'O que é a aba Receitas?',
    oneLiner: 'Consulte todas as receitas padrão e alternativas (ALT) do Satisfactory 1.0+ em um só lugar.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-15-receitas.webp',
        alt: 'Aba Receitas listando receitas padrão e alternativas com filtros por máquina e ingredientes.'
      }
    ],
    legend: [
      '<strong>Catálogo completo</strong>: todas as receitas oficiais com taxas reais por minuto, máquina necessária e selo <strong>ALT</strong> para receitas de Disco Rígido.',
      '<strong>Filtros rápidos</strong>: filtre por máquina (Construtor, Montadora, Refinaria, Misturador etc.), tipo (Padrão/ALT) ou busque pelo nome do item.',
      '<strong>Favoritos</strong>: marque suas receitas preferidas para encontrá-las instantaneamente.'
    ],
    tryAction: { label: 'Abrir aba Receitas', mode: 'recipes' }
  },
  {
    id: 'receitas-como-usar',
    title: 'Como comparar receitas e enviar para Produção',
    oneLiner: 'Compare custos lado a lado para escolher a receita mais eficiente antes de construir.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-15-receitas.webp',
        alt: 'Lista e filtros da aba Receitas com detalhes de entrada e saída por minuto.'
      }
    ],
    legend: [
      '<strong>1. Busque o item</strong>: digite o nome do produto (em português ou inglês) para listar todas as formas de fabricá-lo.',
      '<strong>2. Compare entradas e saídas</strong>: veja a diferença de recursos brutos, subprodutos e máquina entre a receita padrão e as <strong>ALT</strong>.',
      '<strong>3. Monte direto</strong>: clique no botão de abrir em <strong>Produção</strong> para já gerar a linha usando a receita escolhida.'
    ],
    tip: 'Receitas alternativas como <em>Parafuso Fundido</em> ou <em>Combustível Diluído</em> economizam dezenas de máquinas e recursos.'
  },

  /* ===================== 7. BIBLIOTECA ===================== */
  {
    id: 'biblioteca-o-que-e',
    title: 'O que é a aba Biblioteca?',
    oneLiner: 'Enciclopédia visual do jogo dividida por categorias coloridas com todos os itens, máquinas e construções.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-16-biblioteca.webp',
        alt: 'Aba Biblioteca com categorias coloridas à esquerda e grade visual de itens e máquinas.'
      }
    ],
    legend: [
      '<strong>Organização por categorias</strong>: navegue por Recursos, Lingotes, Peças, Fluídos, Máquinas, Logística, Energia, Equipamentos e mais.',
      '<strong>Busca bilíngue</strong>: pesquise pelo nome oficial em português ou inglês.',
      '<strong>Favoritos e Recentes</strong>: mantenha seus itens mais consultados sempre no topo.'
    ],
    tryAction: { label: 'Abrir aba Biblioteca', mode: 'library' }
  },
  {
    id: 'biblioteca-como-usar',
    title: 'Como consultar detalhes de qualquer item',
    oneLiner: 'Clique em qualquer card da Biblioteca para ver todas as receitas que produzem ou consomem o item.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-16-biblioteca.webp',
        alt: 'Grade de itens na aba Biblioteca pronta para consulta detalhada.'
      }
    ],
    legend: [
      '<strong>1. Escolha a categoria</strong>: clique em uma categoria no painel esquerdo ou use a busca.',
      '<strong>2. Abra o card de detalhes</strong>: veja pilha máxima, pontos no Triturador SUPIMPA, receitas que fabricam e receitas que usam o item.',
      '<strong>3. Planeje em 1 clique</strong>: a partir do detalhe do item, salte direto para montar a produção dele.'
    ],
    tip: 'Ótima para descobrir rapidamente para que serve um item novo ou onde usar um subproduto.'
  },

  /* ===================== 8. CALCULADORA ===================== */
  {
    id: 'calculadora-geral-recursos',
    title: 'Aba Calculadora — Numérica, Recursos, Produção e Energia',
    oneLiner: 'Faça contas rápidas com o teclado físico e calcule fábricas inteiras com overclock individual por máquina.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-17-calculadora.webp',
        alt: 'Aba Calculadora mostrando o menu lateral de ferramentas e a calculadora interativa.'
      }
    ],
    legend: [
      '<strong>Calculadora</strong>: funciona como calculadora normal com suporte total ao teclado físico (<code>0–9</code>, <code>+ - * / %</code>, <code>Enter</code>, <code>Backspace</code>, <code>Esc</code>) e histórico.',
      '<strong>Recursos</strong>: escolha produto, receita e quantidade desejada (/min) para ver máquinas por tipo, recursos brutos, energia, excesso e ajustar <strong>overclock por tipo de máquina</strong>.',
      '<strong>Produção</strong>: informe quantidade de máquinas, receita e clock para descobrir a saída exata/min.',
      '<strong>Energia</strong>: calcule rapidamente MW gerados, combustível e água sem precisar abrir o canvas.'
    ],
    tryAction: { label: 'Abrir aba Calculadora', mode: 'calculator' }
  },
  {
    id: 'calculadora-logistica-supimpa',
    title: 'Aba Calculadora — Logística, SUPIMPA e Elevador Espacial',
    oneLiner: 'Dimensione esteiras da linha atual, calcule pontos do Triturador SUPIMPA e acompanhe as 5 fases do jogo.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-17-calculadora.webp',
        alt: 'Menu lateral da aba Calculadora com Logística, Triturador SUPIMPA e Elevador Espacial.'
      }
    ],
    legend: [
      '<strong>Logística</strong>: lê automaticamente a linha montada em <strong>Produção</strong> ou <strong>Oficina</strong> (ou permite cálculo avulso) para informar esteiras, divisores e unificadores necessários.',
      '<strong>Triturador SUPIMPA</strong>: selecione qualquer item do jogo e a vazão/min para ver os pontos/min oficiais e o tempo para gerar cupons.',
      '<strong>Elevador Espacial</strong>: acompanhe o progresso completo das 5 fases oficiais do Satisfactory 1.0 e o tempo restante na sua taxa atual.'
    ],
    tip: 'Use a opção <strong>Recursos</strong> com overclock por tipo de máquina quando quiser acelerar só as Mineradoras ou só os Construtores.'
  },

  /* ===================== 9. PROJETOS E CONTA ===================== */
  {
    id: 'projetos-passo-1-salvar',
    title: 'Passo 1 — Como entrar na conta e salvar um projeto',
    oneLiner: 'Crie sua conta grátis (só usuário e senha) e clique em Salvar na barra lateral para guardar sua fábrica.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-12-conta-projetos.webp',
        alt: 'Interface mostrando o botão Salvar na barra lateral esquerda e Entrar no topo direito.'
      }
    ],
    legend: [
      '<strong>1. Clique em 👤 Entrar</strong> no topo direito para fazer login ou criar uma conta apenas com usuário e senha.',
      '<strong>2. Monte sua fábrica</strong> em <strong>Produção</strong>, <strong>Energia</strong> ou <strong>Oficina</strong>.',
      '<strong>3. Clique em 💾 Salvar</strong> na barra lateral esquerda e dê um nome ao projeto — tudo fica salvo na nuvem (máquinas, receitas, posições e clock).'
    ],
    tip: 'Você pode usar toda a ferramenta sem conta; a conta serve para guardar projetos na nuvem e enviar reports.'
  },
  {
    id: 'projetos-passo-2-gerenciar',
    title: 'Passo 2 — Onde ficam seus Projetos Salvos e o que fazer',
    oneLiner: 'Acesse a aba Projetos no painel esquerdo para abrir, renomear, atualizar ou excluir qualquer fábrica salva.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-18-projetos-salvos.webp',
        alt: 'Aba Projetos listando projetos salvos de Produção, Energia e Oficina com botões de abrir, renomear e excluir.'
      }
    ],
    legend: [
      '<strong>Onde encontrar</strong>: após entrar na conta, clique na aba <strong>📁 Projetos</strong> no painel lateral esquerdo.',
      '<strong>Abrir no espaço</strong>: clique em <strong>Abrir</strong> para carregar a fábrica exatamente na aba onde ela foi salva (Produção, Energia ou Oficina).',
      '<strong>Atualizar ou Salvar como novo</strong>: ao editar um projeto aberto e clicar em <strong>Salvar</strong>, escolha entre atualizar o existente ou criar uma nova cópia.',
      '<strong>Organizar</strong>: use os botões do card para <strong>Renomear</strong> ou <strong>Excluir</strong> projetos antigos.'
    ],
    tip: 'Seus projetos ficam sincronizados na sua conta e podem ser abertos em qualquer navegador.'
  },
  {
    id: 'patch-notes',
    title: 'Passo 3 — Reportar bugs/sugestões e ver Patch Notes',
    oneLiner: 'Envie feedback com prints pelo botão Reportar e acompanhe todas as novidades em Patch Notes.',
    scenes: [
      {
        src: './assets/tutorial/tutorial-12-conta-projetos.webp',
        alt: 'Barra superior direita mostrando os botões Patch notes, Reportar e Entrar.'
      }
    ],
    legend: [
      '<strong>📣 Reportar</strong>: envie bugs, sugestões ou avaliações anexando até 7 imagens e acompanhe o status.',
      '<strong>📋 Patch notes</strong>: abre o histórico com as atualizações mais recentes (Novo, Melhoria e Correção).',
      '<strong>Aviso automático</strong>: sempre que houver uma novidade que você ainda não viu, um resumo aparece uma única vez ao abrir o site.'
    ],
    tip: 'Consulte o histórico de atualizações a qualquer momento pelo botão <strong>Patch notes</strong> no topo direito.'
  },

  /* ===================== 10. ATALHOS E GLOSSÁRIO ===================== */
  {
    id: 'glossario',
    title: 'Atalhos rápidos e Glossário oficial',
    oneLiner: 'Comandos de teclado/mouse e os termos oficiais do jogo explicados de forma direta.',
    glossary: [
      { term: 'Espaço + arrastar', desc: 'Move a câmera (pan) no canvas em Produção, Energia e Oficina.' },
      { term: 'Shift + arrastar (Oficina)', desc: 'Abre a caixa de seleção múltipla para selecionar vários cards de uma vez.' },
      { term: 'Ctrl+C / Ctrl+V', desc: 'Copia e cola as máquinas selecionadas na Oficina.' },
      { term: 'Alt + arrastar card', desc: 'Duplica rapidamente uma máquina na posição onde você soltar.' },
      { term: 'Backspace / Delete', desc: 'Remove os cards ou conexões selecionados na Oficina.' },
      { term: 'Rodinha do mouse', desc: 'Aproxima ou afasta o zoom no canvas e no Mapa.' },
      { term: 'Vazão (/min)', desc: 'Quantidade de itens sólidos (un/min) ou fluidos (m³/min) por minuto.' },
      { term: 'Esteira (v.1 a v.6)', desc: 'Transporta sólidos (60, 120, 270, 480, 780 e 1200 itens/min).' },
      { term: 'Tubulação (v.1 / v.2)', desc: 'Transporta líquidos e gases (300 m³/min na v.1 e 600 m³/min na v.2).' },
      { term: 'Overclock (1% a 250%)', desc: 'Ajusta a velocidade da máquina usando Fragmentos de Energia.' },
      { term: 'Excesso', desc: 'Subproduto gerado pela linha que nenhuma outra máquina consome.' },
      { term: 'Modo Foco', desc: 'Passar o mouse sobre um card destaca apenas as conexões ligadas a ele.' }
    ]
  }
];

const TUTORIAL_TOPICS = [
  { id: 'interface', icon: '🧭', title: 'Interface', sub: 'Áreas da tela, abas e barras de controle', slideIds: ['como-usar', 'abas'] },
  { id: 'producao', icon: '🏭', title: 'Produção', sub: 'Montar linha, fluxo, esteiras, cards e excesso', slideIds: ['primeira-linha', 'como-ler-fluxo', 'etiquetas-esteiras', 'cards-maquina', 'nos-recurso', 'produto-final', 'status-excesso'] },
  { id: 'energia', icon: '⚡', title: 'Energia', sub: 'Usinas por MW ou geradores, combustível e água', slideIds: ['energia-o-que-e', 'energia-como-usar'] },
  { id: 'oficina', icon: '🛠️', title: 'Oficina', sub: 'Montagem livre, portas, atalhos e Visão 3D', slideIds: ['oficina-o-que-e', 'oficina-conexoes-atalhos', 'navegacao-foco'] },
  { id: 'mapa', icon: '🗺️', title: 'Mapa', sub: 'Jazigos oficiais, pureza, filtros e discos rígidos', slideIds: ['mapa-o-que-e', 'mapa-como-usar'] },
  { id: 'receitas', icon: '📜', title: 'Receitas', sub: 'Padrão, ALT, comparação e favoritos', slideIds: ['receitas-o-que-e', 'receitas-como-usar'] },
  { id: 'biblioteca', icon: '📚', title: 'Biblioteca', sub: 'Enciclopédia por categorias e detalhes oficiais', slideIds: ['biblioteca-o-que-e', 'biblioteca-como-usar'] },
  { id: 'calculadora', icon: '🧮', title: 'Calculadora', sub: 'Numérica, Recursos, Logística, SUPIMPA e Elevador', slideIds: ['calculadora-geral-recursos', 'calculadora-logistica-supimpa'] },
  { id: 'projetos-conta', icon: '📁', title: 'Projetos e Conta', sub: 'Salvar, abrir na aba Projetos, reports e novidades', slideIds: ['projetos-passo-1-salvar', 'projetos-passo-2-gerenciar', 'patch-notes'] },
  { id: 'atalhos-glossario', icon: '⌨️', title: 'Atalhos e Glossário', sub: 'Comandos rápidos e termos oficiais do jogo', slideIds: ['glossario'] }
];

const TutorialState = {
  isOpen: false,
  activeTopicId: null, // null = grade de tópicos
  step: 0,
  sceneIdx: 0,
  indexOpen: false,
  touchStartX: null,
  touchStartY: null
};

function getActiveTutorialSlides() {
  if (!TutorialState.activeTopicId) return TUTORIAL_SLIDES;
  const topic = TUTORIAL_TOPICS.find(t => t.id === TutorialState.activeTopicId);
  if (!topic) return TUTORIAL_SLIDES;
  const list = topic.slideIds.map(id => TUTORIAL_SLIDES.find(s => s.id === id)).filter(Boolean);
  return list.length > 0 ? list : TUTORIAL_SLIDES;
}

function openTutorialModal(startTopicOrStep = null) {
  TutorialState.isOpen = true;
  TutorialState.activeTopicId = (typeof startTopicOrStep === 'string') ? startTopicOrStep : null;
  TutorialState.step = 0;
  TutorialState.sceneIdx = 0;
  TutorialState.indexOpen = false;
  if (typeof AppState !== 'undefined' && AppState.tutorial) {
    AppState.tutorial.isOpen = true;
    AppState.tutorial.step = 0;
  }
  const modal = document.getElementById('tutorial-modal');
  if (modal) modal.classList.remove('hidden');
  renderTutorialSlide();
}

function openTutorialTopic(topicId) {
  TutorialState.activeTopicId = topicId;
  TutorialState.step = 0;
  TutorialState.sceneIdx = 0;
  TutorialState.indexOpen = false;
  renderTutorialSlide();
}

function backToTutorialTopics() {
  TutorialState.activeTopicId = null;
  TutorialState.step = 0;
  TutorialState.sceneIdx = 0;
  TutorialState.indexOpen = false;
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
  const slides = getActiveTutorialSlides();
  TutorialState.step = Math.max(0, Math.min(slides.length - 1, idx));
  TutorialState.sceneIdx = 0;
  TutorialState.indexOpen = false;
  renderTutorialSlide();
}

function nextTutorialStep() {
  if (!TutorialState.activeTopicId) return;
  const slides = getActiveTutorialSlides();
  if (TutorialState.step < slides.length - 1) {
    goToTutorialStep(TutorialState.step + 1);
  } else {
    backToTutorialTopics();
  }
}

function prevTutorialStep() {
  if (!TutorialState.activeTopicId) return;
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

  // Tela inicial: grade de tópicos em cards definidos
  if (!TutorialState.activeTopicId) {
    body.innerHTML = `
      <div class="tut-card-header">
        <h4 class="tut-slide-title">Escolha um tópico</h4>
        <p class="tut-one-liner">Cada aba possui seu guia passo a passo com prints reais da ferramenta.</p>
      </div>
      <div class="tut-topics-grid">
        ${TUTORIAL_TOPICS.map((t) => {
          const count = t.slideIds.length;
          const label = count === 1 ? '1 página' : `${count} páginas`;
          return `
            <button type="button" class="tut-topic-card" onclick="openTutorialTopic('${t.id}')">
              <div class="tut-topic-head">
                <span class="tut-topic-icon-box" aria-hidden="true">${t.icon}</span>
                <span class="tut-topic-pages">${label}</span>
              </div>
              <strong class="tut-topic-title">${t.title}</strong>
              <span class="tut-topic-sub">${t.sub}</span>
            </button>
          `;
        }).join('')}
      </div>
    `;
    footer.innerHTML = `
      <span></span>
      <button type="button" class="btn-tutorial-nav primary" onclick="closeTutorialModal()">Fechar</button>
    `;
    return;
  }

  const activeSlides = getActiveTutorialSlides();
  const idx = Math.max(0, Math.min(activeSlides.length - 1, TutorialState.step));
  const slide = activeSlides[idx];
  const isFirst = idx === 0;
  const isLast = idx === activeSlides.length - 1;
  const scenes = slide.scenes || [];
  const activeScene = scenes[TutorialState.sceneIdx] || scenes[0] || null;

  const indexDrawerHtml = TutorialState.indexOpen ? `
    <div class="tut-index-drawer" role="navigation" aria-label="Índice do tutorial">
      <div class="tut-index-head">
        <strong>Ir direto para uma página</strong>
        <button type="button" class="tut-index-close" onclick="toggleTutorialIndex()" aria-label="Fechar índice">✕</button>
      </div>
      <div class="tut-index-list">
        ${activeSlides.map((s, i) => `
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
        <div class="tut-figure-box" onclick="openImageLightbox('${activeScene.src}?v=${TUTORIAL_IMG_VERSION}')" title="Clique para ampliar a imagem">
          <img
            src="${activeScene.src}?v=${TUTORIAL_IMG_VERSION}"
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
        <button type="button" class="tut-back-btn" onclick="backToTutorialTopics()">← Tópicos</button>
        <span class="tutorial-step-counter">Página ${idx + 1} de ${activeSlides.length}</span>
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
    <div class="tutorial-dots" role="tablist" aria-label="Páginas do tópico">
      ${activeSlides.map((s, i) => `
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
      ${isLast ? 'Voltar aos tópicos' : 'Próximo ➡'}
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
