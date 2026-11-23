# Satisfactory+ — Log de Versões

> **Regra de versionamento**: A versão oficial exibida na barra lateral (`#app-version-label`) **só deve ser incrementada quando houver publicação/push oficial autorizado para o repositório**. Ao realizar cada push oficial, atualizar este arquivo com a nova versão, data e resumo das alterações.

## Versão Atual em Produção (Último Push Oficial)
- **Versão**: `v2.6`
- **Data**: 2026-11-23
- **Próxima versão alvo**: `v2.7` (somente quando autorizado novo push)

---

## Histórico de Versões Publicadas

### `v2.6` — 2026-11-23
- **Blindagem de Segurança Full-Stack**: autenticação e checagem de propriedade no proxy de anexos (`/api/media`), eliminação de XSS em ações de cards de Projetos, parser aritmético seguro sem `Function()`/`eval()` na Calculadora, cabeçalhos HTTP de segurança em `vercel.json` (HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`), proteção CSRF reforçada, rate-limit distribuído via Redis e atualização de `@vercel/blob` para `2.4.0` (0 vulnerabilidades no `npm audit`).
- **Performance & Estabilidade**: substituição de `KEYS` por `SCAN` iterativo no adaptador Redis, validação estrita de sessões/cookies e script de checagem pré-deploy (`npm run check`).
- **UX & Correções**: arraste do canvas com o **botão do meio do mouse (scroll click)** em Produção, Energia e Oficina, correção das imagens do *Carrinho de Fábrica™* e *Carrinho Dourado de Fábrica™* em Receitas/Biblioteca, padronização final de `#EA580C` e acessibilidade.
- **Painel Executivo Privado (CEO)**: painel interno exclusivo da conta fundadora com métricas em tempo real, origem por país/estado (UF) e gestão de usuários.

### `v2.5` — 2026-11-23
- **Nova Barra Lateral de Navegação (`#main-nav-rail`)**: abas verticais com ícones SVG limpos, logo/título/versão centralizados, modo recolhido e arte industrial ao pôr do sol no rodapé acima de Configurações.
- **Simplificação Padrão de Logística**: consolidação automática de Divisores, Unificadores, Junções de Tubulação e Elevadores/Bombas paralelos com selo `×N`, mantendo todas as esteiras e tubulações reais intactas e eliminando gargalos em megafábricas.
- **Cadeia Completa de Energia + Andares 3D**: geração da cadeia produtiva completa da extração até os geradores, distribuição dinâmica de etapas em múltiplos andares sem quebrar etapas e barra de status inferior também na aba Energia.
- **Redesign do Modal de Configurações**: layout vertical com navegação lateral (*Geral*, *Preferências*, *Conta e segurança*, *Perfil*), i18n (PT-BR / EN-US / ES-ES), pergunta de segurança criada livremente pelo usuário e **exclusão permanente de conta com verificação dupla (5s + senha)**.
- **Redesign dos Cards Compactados no Spaces**: cards de `236px` com ícone circular original do jogo, selo `×N`, chips de fluxo e variante laranja para Item Final.
- **Aba Projetos v2**: novo layout com cota visual, filtros/busca, **compartilhamento entre contas via código `SP-XXXXXXXX`** e **exportação de imagem PNG compactada com ficha técnica completa**.
- **Tutorial Ilustrado Nativo (12 tópicos · 50 passos)**: substituídos prints estáticos por diagramas vetoriais/componentes nativos com os ícones reais da interface e do jogo, 100% adaptáveis aos temas Claro e Escuro.
- **Melhorias gerais de UX**: superfície neutra global `#101117`, scrollbars finas (6px), transição da Home em efeito cortina, taxa padrão real ao selecionar item na Produção, card compacto de item sem borda externa, Calculadora Normal com visor único ampliado (`44px`), botões de download em linha única no topo de Reports e status bar com hover/pin.

### `v2.4` — 2026-11-22 (`8c61e30`)
- Correções de overclocking (mantém taxa alvo e reduz máquinas), ajuste da visão inicial do canvas, calculadora normal ampliada, divisores/containers/elevadores de esteira e melhorias nos seletores globais.
