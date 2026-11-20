---
description: Política obrigatória de publicação via repositório GitHub (nunca deploy manual direto na Vercel)
alwaysApply: true
---

# Regra de Publicação via GitHub

- Sempre publicar alterações do **Satisfactory+** fazendo `git commit` e `git push origin main` no repositório GitHub (`MatheusDevArt/satisfactory-plus`).
- Nunca fazer deploy manual direto via API/CLI da Vercel: a Vercel está conectada ao repositório e publica automaticamente a cada push na branch `main`.
- Antes de cada push, atualizar os query params de versão (`?v=...`) em `index.html` sempre que arquivos CSS ou JS forem modificados.
