const paths = {
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5M9 2h6M12 2v3m6 1 2 2"/>',
  history: '<path d="M3 11a9 9 0 1 1 2.5 7M3 4v7h7M12 7v5l3 2"/>',
  folder: '<path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>',
  chart: '<path d="M4 3v17h17M9 15v-4m5 4V7m5 8V4"/>',
  moon: '<path d="M20.9 13a9 9 0 0 1-9.9-9.9A9 9 0 1 0 20.9 13Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  play: '<path d="m9 5 10 7-10 7V5Z"/>',
  pause: '<path d="M9 5v14m6-14v14"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15v5Z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};
export function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.timer}</svg>`;
}
export const pages = {
  timer: {label: 'Cronômetro', href: 'index.html', icon: 'timer'},
  history: {label: 'Histórico', href: 'historico.html', icon: 'history'},
  folders: {label: 'Pastas', href: 'pastas.html', icon: 'folder'},
  stats: {label: 'Estatísticas', href: 'estatisticas.html', icon: 'chart'},
};
const views = {
  timer: `
    <section class="timer-view" aria-labelledby="page-title">
      <div class="timer-intro"><p class="eyebrow">SEU TEMPO, SEU RITMO</p><h1 id="page-title">Um tempo para aprender<span>.</span></h1><p>Escolha uma matéria. Deixe o resto para depois.</p></div>
      <div class="timer-workspace">
        <span id="timer-status" class="pill" role="status">Pronto para começar</span>
        <div class="clock-area"><div id="clock" role="timer" aria-label="Tempo da sessão">00:00:00</div><p id="clock-hint">Um pouco de foco faz a diferença.</p></div>
        <div class="session-fields">
          <label for="timer-folder">Pasta de estudo</label><div class="select-wrap">${icon('folder')}<select id="timer-folder"></select></div>
          <a id="create-first-folder" href="pastas.html" class="empty-folder-link" hidden>Criar minha primeira pasta ${icon('arrow')}</a>
          <details id="subject-details"><summary>Adicionar assunto <span>opcional</span></summary><label for="description" class="sr-only">Assunto do estudo</label><input id="description" maxlength="200" placeholder="O que você vai estudar?"></details>
        </div>
        <div class="timer-actions"><button id="toggle-timer" class="primary">${icon('play')} Iniciar estudo</button><button id="finish-timer" class="secondary" hidden>${icon('stop')} Encerrar</button></div>
        <p class="timer-footnote">${icon('check')} Seu tempo continua mesmo se você sair desta página.</p>
      </div>
      <div class="today-summary"><span>Seu foco hoje</span><strong id="today-total">0h 00min</strong><span class="summary-note">Um passo de cada vez.</span></div>
    </section>`,
  history: `
    <section class="content-view" aria-labelledby="page-title">
      <div class="page-heading"><div><p class="eyebrow">CADA SESSÃO CONTA</p><h1 id="page-title">Seu histórico<span>.</span></h1><p>Revisite o tempo que você dedicou a aprender.</p></div></div>
      <div class="section-toolbar"><span id="history-count"></span><label class="filter-label" for="history-filter">Pasta<select id="history-filter"><option value="">Todas as pastas</option></select></label></div>
      <div class="table-wrap"><table><caption class="sr-only">Sessões de estudo concluídas</caption><thead><tr><th scope="col">PASTA / ASSUNTO</th><th scope="col">DATA</th><th scope="col">DURAÇÃO</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead><tbody id="sessions"></tbody></table><div id="empty-history" class="empty">${icon('history')}<h2>Seu primeiro estudo começa agora.</h2><p>As sessões concluídas aparecerão aqui.</p><a href="index.html" class="text-link">Ir para o cronômetro ${icon('arrow')}</a></div></div>
      <div class="history-footer"><button id="show-more" class="secondary" hidden>Mostrar mais sessões</button></div>
    </section>`,
  folders: `
    <section class="content-view" aria-labelledby="page-title">
      <div class="page-heading"><div><p class="eyebrow">UM LUGAR PARA CADA MATÉRIA</p><h1 id="page-title">Suas pastas<span>.</span></h1><p>Organize o que você estuda, do seu jeito.</p></div><button id="new-folder" class="primary">${icon('plus')} Nova pasta</button></div>
      <div id="folder-list" class="folder-grid"></div>
      <div id="empty-folders" class="empty panel" hidden>${icon('folder')}<h2>O que você quer aprender?</h2><p>Crie sua primeira pasta no botão “Nova pasta”.</p></div>
    </section>`,
  stats: `
    <section class="content-view" aria-labelledby="page-title">
      <div class="page-heading"><div><p class="eyebrow">SEU TEMPO EM PERSPECTIVA</p><h1 id="page-title">Pequenos passos, progresso<span>.</span></h1><p>Acompanhe sua dedicação, uma sessão de cada vez.</p></div></div>
      <div class="stats" aria-label="Resumo de estudos"><article><span>Estudado hoje</span><strong id="today-total">0h 00min</strong><small>Sessões concluídas hoje</small></article><article><span>Nesta semana</span><strong id="week-total">0h 00min</strong><small>De segunda a domingo</small></article><article><span>Tempo total</span><strong id="all-total">0h 00min</strong><small id="session-count">0 sessões concluídas</small></article></div>
      <article class="distribution-card panel"><div class="card-heading"><h2>Tempo por pasta</h2><span>Todo o período</span></div><div class="distribution-content"><div class="donut" id="donut"><div><strong id="donut-total">0h</strong><span>de dedicação</span></div></div><div id="distribution"></div></div><p class="distribution-note">Seus totais são atualizados ao encerrar uma sessão.</p></article>
    </section>`,
};
export function mountPage(page) {
  document.body.innerHTML = `
    <a class="skip-link" href="#main">Pular para o conteúdo</a>
    <aside class="sidebar"><a href="index.html" class="brand" aria-label="Ritmo — cronômetro"><span class="brand-icon">${icon('timer')}</span>ritmo<span class="brand-dot">.</span></a><p class="tagline">Seu tempo de aprender.</p>
      <div class="nav-label">MEU ESPAÇO</div><nav aria-label="Navegação principal">${Object.entries(pages).map(([id, item]) => `<a class="nav-link ${id === page ? 'active' : ''}" href="${item.href}" ${id === page ? 'aria-current="page"' : ''}>${icon(item.icon)}<span>${item.label}</span>${id === page ? '<span class="nav-dot" aria-hidden="true"></span>' : ''}</a>`).join('')}</nav>
      <a id="active-session" class="active-session" href="index.html" hidden><span id="active-session-label">Sessão em andamento</span><strong id="mini-clock">00:00:00</strong><span>Voltar ao cronômetro ${icon('arrow')}</span></a>
      <div class="sidebar-bottom"><button id="theme" class="theme-button">${icon('moon')}<span>Modo escuro</span></button><p class="local-note">${icon('check')} Salvo neste navegador</p></div>
    </aside>
    <main id="main" tabindex="-1"><header class="topbar"><div class="breadcrumb">Meu espaço <span>/</span> <strong>${pages[page].label}</strong></div><span id="today-label"></span></header>${views[page]}<footer><span>Aprenda no seu tempo.</span><span class="footer-brand">ritmo.</span></footer></main>
    <dialog id="modal" aria-labelledby="modal-title"><form id="modal-form"><div class="modal-heading"><h2 id="modal-title"></h2><button type="button" id="close-modal" class="icon-button" aria-label="Fechar">${icon('close')}</button></div><div id="modal-fields"></div><p id="form-error" role="alert"></p><div class="modal-actions"><button type="button" id="cancel-modal" class="secondary">Cancelar</button><button id="save-modal" class="primary" type="submit">Salvar</button></div></form></dialog><div id="toast" role="status" hidden></div>`;
}
