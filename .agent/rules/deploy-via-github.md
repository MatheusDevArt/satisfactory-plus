---
description: Política obrigatória de publicação via repositório GitHub — NUNCA fazer commit/push/deploy sem autorização explícita do usuário
alwaysApply: true
---

# Regra de Publicação via GitHub

- **AUTORIZAÇÃO OBRIGATÓRIA ANTES DE PUBLICAR:** **NUNCA** executar `git commit`, `git push` ou qualquer deploy automaticamente. Sempre aplicar e testar as alterações **apenas localmente**, apresentar o resumo ao usuário e **aguardar autorização explícita** (ex.: "autorizado", "pode subir", "pode dar push") antes de publicar.
- Uma autorização dada anteriormente vale **apenas para aquele lote específico** e **nunca** autoriza commits/pushes futuros em mensagens seguintes.
- Quando autorizado, publicar alterações do **Satisfactory+** fazendo `git commit` e `git push origin main` no repositório GitHub (`MatheusDevArt/satisfactory-plus`).
- Nunca fazer deploy manual direto via API/CLI da Vercel: a Vercel está conectada ao repositório e publica automaticamente a cada push na branch `main`.
- Antes de cada push autorizado, atualizar os query params de versão (`?v=...`) em `index.html` sempre que arquivos CSS ou JS forem modificados.
