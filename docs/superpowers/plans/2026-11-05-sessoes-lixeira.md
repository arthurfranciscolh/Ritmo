# Ritmo: sessões, lixeira e identidade

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Aplicar o pedido do usuário: simplificar o cronômetro, personalizar sessões, recuperar exclusões por 15 dias e criar uma marca própria.

**Architecture:** Preservar HTML/CSS/JS nativo, os IDs existentes e a chave `ritmo.study.v1`. Estender o estado com lixeira opcional e símbolos opcionais, compatíveis com dados antigos. Manter `pastas.html` como URL compatível, com apresentação “Sessões”.

**Tech Stack:** JavaScript nativo, SVG, CSS, testes Node e DOM.

**Spec:** Pedido detalhado do usuário nesta conversa. Decisões de implementação: chamar estudos concluídos de registros para diferenciá-los das sessões; aceitar emojis e códigos Unicode; guardar snapshots das sessões excluídas; expirar 15 × 24 horas após exclusão, com limpeza ao abrir ou usar o site; usar “inatingível” como correção ortográfica da frase solicitada.

## Tasks
- [x] Testar exclusão de registros e sessões, restauração independente, expiração e compatibilidade. Implementar em `dist/trash.js`, validar estado em `dist/core.js`.
- [x] Testar conversão de emoji Unicode e rejeição de texto/HTML. Implementar em `dist/symbols.js` e integrar seletor acessível em `dist/app.js`.
- [x] Atualizar textos e histórico com lixeira em `dist/views.js` e `dist/app.js`; criar marca SVG e estilos responsivos em `dist/style.css`.
- [x] Rodar testes Node, testes no navegador, sintaxe e verificação visual. Atualizar README com retenção e símbolos.

## Review focus
- Dados antigos sem lixeira ou ícone continuam funcionando.
- Exclusão de sessão preserva seus registros, sem alterar o cronômetro em uso.
- Restauração fora de ordem não duplica registros nem perde referências.
- Armazenamento indisponível reverte mutações; expiração é verificada antes de restaurar.
- Emoji composto, código inválido, nomes longos, tema escuro e telas estreitas.

## Evidence
- `npm test`: 10/10 testes passando; os seis testes novos foram observados falhar antes da implementação.
- `npm run check`: cinco módulos válidos; `git diff --check`: sem erros de whitespace.
- `node scripts/verify-browser.mjs`: 11/11 cenários passando no Chrome headless, sem erros de execução. Playwright externo, nenhum pacote adicionado ao site.
- Capturas em `artifacts/ui/`, com revisão em 1440 e 390 px, e verificação de overflow adicional em 320 px. Temas claro/escuro e editor de símbolos incluídos.
- A suíte DOM antiga depende de jsdom indisponível neste ambiente; os fluxos foram verificados no navegador real pela suíte nova.
- Correção adicional: repetição de edição após falha ao salvar usava objeto antigo após rollback. Teste de reprodução falhou, correção passou para sessões e registros.
- Paleta, tipografia, estrutura de navegação e tokens existentes preservados. A marca agora usa monograma SVG; ícones de sessão usam o mesmo peso visual da interface.
- Revisão independente aprovada: nenhum problema crítico, importante ou observação menor relevante. Revisor executou testes de núcleo e sintaxe e inspecionou código e capturas.
