# Padrões Visuais e de Interação da Interface

1. **Item selecionado / ativo:** Todo botão, aba, chip, filtro ou item de lista selecionado no site inteiro deve usar preenchimento sólido `#EA580C` com texto e ícones em branco (`#ffffff`), mantendo hover/focus neutros.
2. **Painel de status:** O painel de resumo/status da fábrica (`#factory-status-footer`) deve permanecer SEMPRE na parte inferior da área de trabalho em todos os modos (Produção, Energia e Livre) — nunca dentro da barra lateral.
3. **Barra lateral do Modo Livre:** As 6 categorias de filtro (`Todos`, `Máquinas`, `Receitas`, `Logística`, `Armazenamento`, `Energia`) devem ser exibidas em lista vertical de 1 item por linha.
4. **Feedback de conexões:** Durante o arraste de uma ligação no Modo Livre, apenas a borda do card sob o ponteiro muda de cor (verde se compatível, vermelha se incompatível), sem anéis extras ou deslocamento de layout. Conexões inválidas exibem a notificação centralizada `"Conexão incompatível"`.
5. **Overclock:** Todo ajuste de Overclock/Clock no site deve usar o componente unificado de slider (`renderOverclockSliderHtml`, 1%–250%, botões `−/+`, atalhos 100/150/200/250% e contador de Power Shards), nunca `<input type="number">` avulso.
6. **Digitação sem perda de foco:** Nenhum campo de busca ou número pode ser recriado durante `oninput`; atualizações parciais devem re-renderizar apenas a área de resultados.
