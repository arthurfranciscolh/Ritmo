# Ritmo — cronômetro de estudos

Site de estudos minimalista, em português, com cronômetro persistente, pastas, histórico editável e temas claro e escuro.

## Executar

Com Node.js 20 ou superior, entre nesta pasta e execute:

```powershell
cd C:\Users\arthu\Downloads\Estudo\Ritmo
npm start
```

Abra **http://localhost:3000**. Não é necessário instalar dependências para usar o site. Para parar o servidor, use Ctrl+C.

## Páginas

- **Cronômetro** (`index.html`): escolha uma pasta e clique em **Iniciar estudo**. O assunto opcional fica em **Adicionar assunto**. Durante a sessão, você pode pausar, retomar e encerrar; encerrar salva o tempo no histórico.
- **Histórico** (`historico.html`): consulte, filtre, edite ou exclua sessões concluídas.
- **Pastas** (`pastas.html`): crie e edite matérias, escolha cores e consulte o tempo dedicado a cada uma. **Estudar** seleciona a pasta e abre o cronômetro.
- **Estatísticas** (`estatisticas.html`): consulte os totais de hoje, da semana e de todo o período, além da distribuição por pasta.

A barra lateral abre páginas independentes; no celular, a navegação fica no topo. Ao sair do cronômetro durante uma sessão, um indicador mostra o tempo e oferece um link para voltar. A sessão continua ao navegar, atualizar, fechar a aba ou suspender o dispositivo. Os temas usam tons neutros, com grafite no modo escuro e detalhes em lilás.

Excluir uma pasta também exclui suas sessões, com confirmação. Uma pasta em uso só pode ser excluída após encerrar o cronômetro. Os totais consideram sessões concluídas; a semana começa na segunda-feira, no fuso local. A duração integral de uma sessão pertence à sua data de início, inclusive ao atravessar meia-noite.

## Tecnologia e armazenamento

HTML, CSS e JavaScript com módulos nativos, sem framework, dependências em execução ou etapa de compilação. `dist/` contém o site completo e pode ser servido por qualquer hospedagem estática. `views.js` compartilha o layout, `app.js` conecta as interações e `core.js` mantém os cálculos de tempo.

Os dados e o tema ficam em `localStorage`, na chave **`ritmo.study.v1`**, preservada nesta revisão. O cronômetro calcula diferenças entre horários registrados, em vez de somar intervalos. Alterações entre abas da mesma origem são sincronizadas; ações simultâneas seguem a última gravação.

Os dados ficam apenas neste navegador e endereço, sem conta ou sincronização entre dispositivos. Limpar os dados do site ou usar navegação privada pode apagar o histórico. A versão local e uma versão hospedada têm armazenamentos separados. O relógio depende da hora do dispositivo. Fontes do Google são opcionais: sem rede, a interface usa fontes do sistema.

## Verificação

```powershell
npm test
npm run check
```

Testes do cálculo de tempo, pausas, sessões longas, limites de semana e validação dos dados. A checagem de sintaxe cobre os três módulos.

A suíte adicional de interface usa jsdom 25 e executa os módulos reais em um DOM de teste, sem navegador e sem alterar dados reais. Para executá-la com uma instalação de jsdom já disponível:

```powershell
$env:RITMO_JSDOM_MODULE = 'C:\caminho\para\node_modules\jsdom'
npm run test:ui
```

Também funciona com `jsdom` instalado como ferramenta de desenvolvimento local. Ela cobre a separação das páginas, início/pausa/encerramento, continuidade da sessão, rascunhos, tema, edição do histórico, pastas vazias, proteção de pastas em uso, retorno pelo navegador, dados inválidos e escape de conteúdo. O Node pode emitir um aviso sobre a API experimental de módulos VM, usada somente nos testes. Esses testes não verificam a aparência visual do CSS.
