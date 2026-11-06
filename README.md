# Ritmo — cronômetro de estudos

Site de estudos minimalista, em português, com cronômetro persistente, sessões personalizáveis, histórico editável, lixeira e temas claro e escuro.

## Executar

Com Node.js 20 ou superior, entre nesta pasta e execute:

```powershell
cd C:\Users\arthu\Downloads\Estudo\Ritmo
npm start
```

Abra **http://localhost:3000**. Não é necessário instalar dependências para usar o site. Para parar o servidor, use Ctrl+C.

## Páginas

- **Cronômetro** (`index.html`): escolha uma sessão e clique em **Iniciar estudo**. O assunto opcional fica em **Adicionar assunto**. Você pode pausar, retomar e encerrar; encerrar salva um registro no histórico.
- **Histórico** (`historico.html`): consulte, filtre e edite registros concluídos. O controle de data fica abaixo da introdução e começa em **Hoje**, mostrando os registros desse dia. As setas avançam ou voltam um dia; o botão central mostra a data selecionada e abre um calendário abaixo dele, com seleção de mês, ano e dia. O filtro funciona em conjunto com a sessão escolhida. O painel fecha ao escolher um dia, clicar fora ou pressionar Escape. A data considera o início do estudo no fuso local; o botão **Limpar data** permite consultar todas as datas. Os filtros não alteram os dados salvos e reiniciam ao recarregar a página. Exclusões vão para a **Lixeira**, onde podem ser restauradas por 15 dias.
- **Sessões** (`pastas.html`): organize as matérias, escolha cores, ícones ou emojis e consulte o tempo de cada sessão. **Estudar** seleciona a sessão e abre o cronômetro. O endereço antigo foi mantido para preservar links.
- **Estatísticas** (`estatisticas.html`): painel interativo com filtros de 7, 30 ou 90 dias, todo o período ou datas personalizadas, e filtro por sessão. Consulte tempo de foco, quantidade de estudos, média diária, dias ativos e comparação com o período anterior. Explore a evolução temporal, participação por sessão, calendário de atividade, médias por dia da semana e destaques do período. Selecione barras ou dias para ver os registros correspondentes; selecione uma sessão no ranking para filtrar o painel. **Exportar CSV** baixa os registros do recorte atual, incluindo a seleção do gráfico.

A barra lateral abre páginas independentes; no celular, a navegação fica no topo. Ao sair do cronômetro durante uma sessão, um indicador mostra o tempo e oferece um link para voltar. A sessão continua ao navegar, atualizar, fechar a aba ou suspender o dispositivo. Os temas usam tons neutros, com grafite no modo escuro e detalhes em lilás.

Excluir uma sessão move também seus registros para a lixeira, com confirmação. Uma sessão em uso só pode ser excluída após encerrar o cronômetro. Restaurar recupera os registros e seus totais, recriando a sessão se necessário. Os itens expiram exatamente 15 × 24 horas após a exclusão; a limpeza ocorre ao abrir ou usar o site. Sem servidor de dados, não há tarefa executando enquanto o navegador está fechado. Os totais consideram estudos concluídos; a semana começa na segunda-feira, no fuso local. A duração integral de um registro pertence à sua data de início, inclusive ao atravessar meia-noite.

O editor oferece seis ícones, oito emojis e uma paleta de 12 cores, além de um seletor de cor personalizada. A seleção funciona pelo teclado e é preservada ao reabrir a sessão. Também aceita um emoji colado, sequências compostas (👩‍💻), códigos Unicode (`U+1F680`, `1F9E0`, `U+1F469 U+200D U+1F4BB`) e entidades numéricas (`&#x1F680;`, `&#128640;`). A prévia aparece antes de salvar; texto inválido não é interpretado como HTML. O desenho dos emojis depende do sistema operacional.

## Tecnologia e armazenamento

HTML, CSS e JavaScript com módulos nativos, sem framework, dependências em execução ou etapa de compilação. `dist/` contém o site completo e pode ser servido por qualquer hospedagem estática. `views.js` compartilha o layout, `app.js` conecta as interações, `core.js` mantém os cálculos e valida o estado, `trash.js` gerencia retenção e restauração e `symbols.js` converte os emojis. A marca da sidebar e o favicon usam o mesmo cronômetro SVG com símbolo de play no mostrador.

O dashboard usa `analytics.js` para cálculos e CSV e `dashboard.js`/`dashboard.css` para os controles e gráficos, sem dependências externas. Usa apenas registros concluídos, fora da lixeira e sem data futura. A média diária inclui dias sem estudo; as médias por dia da semana consideram todas as ocorrências desse dia. A comparação usa a janela imediatamente anterior de igual quantidade de dias, com o mesmo filtro de sessão, sem calcular percentual quando o total anterior é zero. O dia atual pode estar incompleto. Todo o período não tem comparação.

Gráficos de períodos longos são agregados em intervalos explicitamente indicados, mantendo os totais. O calendário mostra no máximo os últimos 91 dias do recorte, enquanto os indicadores e demais gráficos continuam usando todo o período. A maior sequência é calculada dentro do período. Os gráficos podem ser explorados pelo teclado; a série temporal também tem uma tabela em **Ver dados**. O CSV usa UTF-8 com BOM, separador `;`, início em ISO/UTC, data local e duração numérica, com proteção contra fórmulas em nomes e assuntos. Os filtros do painel não modificam os registros e são reiniciados ao recarregar a página.

Os dados e o tema ficam em `localStorage`, na chave **`ritmo.study.v1`**, preservada nesta revisão. O cronômetro calcula diferenças entre horários registrados, em vez de somar intervalos. Alterações entre abas da mesma origem são sincronizadas; ações simultâneas seguem a última gravação.

Os dados ficam apenas neste navegador e endereço, sem conta ou sincronização entre dispositivos. Limpar os dados do site ou usar navegação privada pode apagar o histórico. A versão local e uma versão hospedada têm armazenamentos separados. O relógio depende da hora do dispositivo. Fontes do Google são opcionais: sem rede, a interface usa fontes do sistema.

## Verificação

```powershell
npm test
npm run check
```

Testes do cálculo de tempo, pausas, estudos longos, limites de semana, validação dos dados, restauração, expiração, conversão de emojis e análise estatística (limites de período, anos bissextos, comparação, médias, sequências e CSV). A checagem de sintaxe cobre os sete módulos. Dados antigos sem lixeira ou símbolos continuam válidos.

A verificação em navegador real usa Playwright como ferramenta externa de desenvolvimento. Com o servidor ativo e Playwright/Chromium disponíveis, execute `npm run test:browser`. Opcionalmente, defina `RITMO_PLAYWRIGHT_MODULE` com o diretório do pacote Playwright e `RITMO_BROWSER_PATH` com o executável do Chrome/Chromium. `RITMO_URL` altera a URL testada. Os testes usam contextos isolados, sem acessar dados do navegador pessoal, e geram capturas em `artifacts/ui/`. Cobrem cronômetro, lixeira, símbolos, erro de armazenamento, sincronização entre abas e layouts em 1440, 390 e 320 pixels.

`npm run test:dashboard` usa a mesma configuração do Playwright para verificar filtros, gráficos, detalhamento, download CSV, estados vazios, atualização entre abas e preservação dos dados. Gera capturas em `artifacts/stats/` em 1440, 1024, 390 e 320 pixels, com dados sintéticos apenas nos contextos isolados dos testes.

A suíte adicional de interface usa jsdom 25 e executa os módulos reais em um DOM de teste, sem navegador e sem alterar dados reais. Para executá-la com uma instalação de jsdom já disponível:

```powershell
$env:RITMO_JSDOM_MODULE = 'C:\caminho\para\node_modules\jsdom'
npm run test:ui
```

Também funciona com `jsdom` instalado como ferramenta de desenvolvimento local. Ela cobre a separação das páginas, início/pausa/encerramento, continuidade da sessão, rascunhos, tema, edição do histórico, pastas vazias, proteção de pastas em uso, retorno pelo navegador, dados inválidos e escape de conteúdo. O Node pode emitir um aviso sobre a API experimental de módulos VM, usada somente nos testes. Esses testes não verificam a aparência visual do CSS.
