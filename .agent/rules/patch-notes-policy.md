---
description: Política obrigatória de atualização dos Patch Notes do Satisfactory+
alwaysApply: true
---

# Regra de Atualização dos Patch Notes

Sempre que houver uma atualização relevante na ferramenta (nova funcionalidade, melhoria perceptível ou correção importante):

1. Adicionar uma nova entrada **no topo** de `data/patch-notes.json` (com `id` único, `date` em formato `DD/MM/AAAA`, `title` claro e `items` com tags `Novo`, `Melhoria` ou `Correção`).
2. Escrever em **português do Brasil**, linguagem simples voltada para o usuário final (sem jargão técnico interno).
3. Nunca inventar mudanças que não foram implementadas.
4. A interface exibe automaticamente apenas as **7 entradas mais recentes** e mostra o card de novidade uma única vez para cada novo `id`.
