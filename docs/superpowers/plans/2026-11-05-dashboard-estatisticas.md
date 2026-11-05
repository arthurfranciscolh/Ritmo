# Dashboard de estatísticas do Ritmo

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transformar Estatísticas em um painel de análise interativo dos registros reais de estudo.

**Architecture:** `analytics.js` faz cálculos puros e exportação CSV; `dashboard.js` contém a apresentação e os controles do painel; `app.js` entrega o estado atualizado. Sem bibliotecas externas, sem alterar o esquema de armazenamento. Trabalhar no checkout limpo da branch solicitada `muda-estatísticas`.

**Tech Stack:** JavaScript nativo, HTML/CSS, SVG/elementos semânticos para gráficos, Node e Playwright para validação.

**Spec:** Solicitação do usuário de reestruturar completamente Estatísticas com dashboards, gráficos e interatividade. Decisões delegadas: período padrão de 30 dias; presets de 7/30/90 dias, todo o período e datas personalizadas; filtro por sessão; comparação com janela anterior de igual duração; tempo total, quantidade de estudos, média diária e dias ativos; evolução temporal, ranking por sessão, calendário de atividade, padrão por dia da semana, destaques descritivos, detalhamento dos registros e exportação CSV.

## Regras da análise
- Apenas registros concluídos e fora da lixeira; datas futuras ignoradas.
- Datas no fuso local, dias sem estudo entram nas médias. Duração integral atribuída à data de início, como no restante do site.
- Comparação anterior usa o mesmo filtro e quantidade de dias; janela atual pode incluir hoje ainda incompleto. Sem percentual quando a base anterior é zero. Todo o período não tem comparação.
- Calendário mostra os últimos 91 dias do intervalo; série temporal agrupa intervalos grandes sem desenhar milhares de elementos.
- Sequência de dias consecutivos medida dentro do intervalo, sem confundir esforço com aprendizagem.
- Dados demonstrativos apenas nos testes, nunca gravados no navegador do usuário.

## Tasks
- [x] Escrever testes de limites de data, médias, comparação, filtro, sequência, agrupamento, ausência de dados e CSV; implementar `dist/analytics.js`.
- [x] Criar dashboard e filtros em `dist/dashboard.js` e `dist/dashboard.css`, integrando `views.js`, `app.js` e `estatisticas.html`.
- [x] Testar interações com dados sintéticos em contexto isolado, exportação, tema, estados vazios, teclado e layouts desktop/mobile.
- [x] Executar regressões, revisão independente e atualizar README.

## Review focus
- Comparação com base zero e janelas de mês/ano diferentes.
- Sem dados, um só registro, períodos longos, sessão removida e nomes longos/HTML.
- Filtro aplicado de forma consistente nos gráficos, registros e CSV.
- Navegação por teclado e celular sem depender de hover.
- Preservação de dados e atualização após alterações em outra aba.

## Validação final
- Branch confirmada: `muda-estatísticas`; checkout estava limpo no início, trabalho realizado diretamente na branch solicitada.
- `npm test`: 20/20 testes aprovados. Os sete testes iniciais da análise falharam antes da implementação; foram acrescentados casos de ano bissexto, média semanal e estudos atravessando meia-noite.
- `npm run check`: sete módulos sem erros de sintaxe. `git diff --check` sem erros de whitespace.
- `scripts/verify-dashboard.mjs`: 7/7 cenários aprovados, sem erros no console, incluindo CSV baixado e verificado, preservação do estado e navegação por teclado.
- `scripts/verify-browser.mjs`: 11/11 cenários de regressão aprovados.
- Inspeção visual em 1440, 1024, 390 e 320 pixels, incluindo temas claro/escuro, 90 dias e ausência de dados. Capturas em `artifacts/stats/`; usam dados sintéticos isolados.
- Revisão independente: nenhum problema crítico. Identificou arredondamento indevido do eixo para estudos curtos e estado desatualizado do botão de limpar filtros. Ambos corrigidos; escala agora adapta segundos/minutos/horas, contagem usa inteiros, e teste de eixo inteiro foi observado falhar antes da correção. Suítes completas passaram após os ajustes.
- Sem dependências de execução novas, migração, publicação ou alteração do esquema de dados. Filtros são locais à página. A suíte DOM antiga foi atualizada para identificar o dashboard, mas não executada porque jsdom não está instalado; a integração foi validada no navegador real.
