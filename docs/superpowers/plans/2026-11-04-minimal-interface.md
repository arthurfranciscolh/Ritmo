# Ritmo: interface minimalista

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Dar destaque ao cronômetro e separar histórico, pastas e estatísticas em páginas próprias.

**Architecture:** HTMLs distintos com navegação nativa, apresentação compartilhada em `dist/views.js` e estado persistido na chave existente `ritmo.study.v1`. Manter `dist/core.js` e seus cálculos intactos. Não introduzir framework ou dependências.

**Tech Stack:** HTML, CSS, JavaScript nativo, Node.js para servidor e testes.

**Spec:** Solicitação do usuário e proposta confirmada na conversa: inicial focada no cronômetro, sidebar com páginas e tema escuro grafite.

## Constraints and decisions
- Preservar dados, edição de sessões e gerenciamento de pastas.
- Tema claro neutro e escuro grafite, com destaque lilás.
- Assunto opcional em disclosure; encerrar só aparece com sessão ativa.
- Links reais para `index.html`, `historico.html`, `pastas.html`, `estatisticas.html`, inclusive em telas pequenas.
- Trabalhar em cópia isolada: o projeto original está fora da raiz gravável e seus arquivos ainda não estão versionados. Aplicar somente arquivos revisados com autorização do sandbox.
- O Site registrado nunca foi publicado; este trabalho modifica o projeto local identificado pelo usuário, sem publicação remota.

## Tasks
- [x] Criar estrutura e navegação compartilhadas em `dist/views.js` e os quatro HTMLs. Verificar acesso direto, atualizar, voltar/avançar e ausência das outras áreas na inicial.
- [x] Adaptar `dist/app.js` à página atual e aos novos controles. Verificar início, pausa, retorno, encerramento, histórico e pastas, incluindo ausência de pastas e restauração por navegação do navegador.
- [x] Reescrever `dist/style.css` com responsividade, foco visível, contraste e temas neutros. Verificar visualmente claro/escuro e tela estreita.
- [x] Atualizar README; executar `npm test`, `npm run check` e teste HTTP das páginas. Revisar os arquivos e aplicar ao diretório original.

## Review focus
1. Sessão ativa ao trocar de página, voltar pelo navegador e atualizar.
2. Dados existentes e rascunho do assunto mantidos.
3. Lista vazia de pastas com caminho claro para criar uma.
4. Navegação acessível em celular e teclado.
5. Armazenamento indisponível não sobrescreve dados nem habilita início.

## Progress
- Baseline: quatro testes existentes passaram.

- Validação final: 4 testes de núcleo e 11 testes de interface passaram; sintaxe dos módulos e CSS verificados; as quatro páginas e seus recursos responderam HTTP 200.
- Revisão independente: corrigido editor aberto na restauração pelo cache do navegador, com teste observado falhar antes da correção e passar depois.
- Limitação: a ferramenta de uso do computador bloqueou a inspeção visual por não identificar com segurança a URL do Chrome. Responsividade foi revisada no CSS, sem screenshot.
- Aplicação ao projeto original: preparada; depende apenas da permissão de escrita fora do workspace.

