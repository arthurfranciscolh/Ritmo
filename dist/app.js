import {elapsed, clock, duration, periodTotals, validState} from './core.js';
import {mountPage, pages, icon} from './views.js';
import {RETENTION, pruneTrash, deleteRecord, deleteGroup, restoreItem} from './trash.js';
import {iconChoices, emojiChoices, parseEmoji, validSymbol} from './symbols.js';
import {createDashboard} from './dashboard.js';
import {localDayKey} from './analytics.js';
import {createHistoryCalendar} from './history-calendar.js';

const $ = selector => document.querySelector(selector);
const KEY = 'ritmo.study.v1';
const page = Object.hasOwn(pages, document.body.dataset.page) ? document.body.dataset.page : 'timer';
const colors = ['#77994f', '#7595bd', '#b28bc0', '#d2a45f', '#c78078', '#65a49a', '#7463ba', '#d77949', '#bd648f', '#589faa', '#a39843', '#7d8294'];
const colorNames = ['Verde', 'Azul', 'Lilás', 'Dourado', 'Rosa', 'Turquesa', 'Violeta', 'Laranja', 'Magenta', 'Petróleo', 'Oliva', 'Ardósia'];
const initial = () => ({
  version: 1,
  folders: [
    {id: crypto.randomUUID(), name: 'Matemática', color: colors[0], symbol:'icon:target'},
    {id: crypto.randomUUID(), name: 'Programação', color: colors[1], symbol:'icon:code'},
    {id: crypto.randomUUID(), name: 'Lógica', color: colors[2], symbol:'icon:brain'},
  ],
  sessions: [], trash: [], active: null, selected: null,
  theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
});
let state = initial(), storageBroken = false, limit = 10, toastTimer, submitModal, nextExpiry = Infinity;
function readState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!validState(parsed)) throw Error('invalid');
      state = parsed;
    } else {
      state = initial();
    }
    storageBroken = false;
  } catch { storageBroken = true; }
}
readState();
mountPage(page);
const dashboard = page === 'stats' ? createDashboard(() => state) : null;

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').hidden = true, 5500);
}
function persist() {
  if (storageBroken) { toast('Não foi possível acessar os dados salvos. Recarregue a página antes de continuar.'); return false; }
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
  catch { toast('Não foi possível salvar. Verifique o espaço e as permissões do navegador.'); return false; }
}
function change(fn) {
  const before = structuredClone(state);
  pruneTrash(state);
  fn();
  if (!persist()) { state = before; render(); return false; }
  render();
  return true;
}
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const folder = id => state.folders.find(f => f.id === id);
function symbolMarkup(f) {
  const symbol = validSymbol(f?.symbol) ? f.symbol : 'icon:book';
  return `<span class="session-symbol" aria-hidden="true">${symbol.startsWith('icon:') ? icon(symbol.slice(5)) : escape(symbol)}</span>`;
}
function options(selected, all = false) {
  return (all ? '<option value="">Todas as sessões</option>' : '') + state.folders.map(f => `<option value="${escape(f.id)}" ${selected === f.id ? 'selected' : ''}>${escape(f.name)}</option>`).join('');
}
function render() {
  if (pruneTrash(state)) persist();
  nextExpiry = (state.trash || []).reduce((next, t) => Math.min(next, t.deletedAt + RETENTION), Infinity);
  const dark = state.theme === 'dark';
  document.body.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]').content = dark ? '#18181c' : '#f8f7f5';
  $('#theme').innerHTML = `${icon(dark ? 'sun' : 'moon')}<span>${dark ? 'Modo claro' : 'Modo escuro'}</span>`;
  $('#today-label').textContent = new Intl.DateTimeFormat('pt-BR', {day: 'numeric', month: 'long'}).format(new Date());
  const totals = periodTotals(state.sessions);
  if (page === 'timer') {
    $('#timer-folder').innerHTML = state.folders.length ? options(state.active?.folderId || state.selected) : '<option value="">Nenhuma sessão criada</option>';
    $('#timer-symbol').innerHTML = symbolMarkup(folder($('#timer-folder').value));
    $('#timer-folder').disabled = !!state.active || !state.folders.length;
    $('#description').value = state.active ? state.active.description : (state.draft || '');
    if ($('#description').value) $('#subject-details').open = true;
    $('#create-first-folder').hidden = state.folders.length > 0;
    $('#today-total').textContent = duration(totals.today);
  }
  if (page === 'folders') renderFolders();
  if (page === 'history') {
    const filter = $('#history-filter').value;
    $('#history-filter').innerHTML = options(filter, true);
    renderHistory();
    renderTrash();
  }
  if (dashboard) dashboard.render();
  tick();
}
function renderFolders() {
  $('#empty-folders').hidden = state.folders.length > 0;
  $('#folder-list').innerHTML = state.folders.map(f => {
    const sessions = state.sessions.filter(s => s.folderId === f.id);
    const total = sessions.reduce((sum, s) => sum + s.duration, 0);
    return `<article class="folder-card panel" style="--folder-color:${f.color}"><div class="folder-card-top">${symbolMarkup(f)}<button class="icon-button" data-edit-folder="${escape(f.id)}" aria-label="Editar sessão ${escape(f.name)}">${icon('edit')}</button></div><h2>${escape(f.name)}</h2><p>${sessions.length} ${sessions.length === 1 ? 'registro de estudo' : 'registros de estudo'}</p><div class="folder-card-bottom"><strong>${duration(total)}</strong><button class="folder-pick" data-folder="${escape(f.id)}" aria-label="Estudar ${escape(f.name)}">Estudar ${icon('arrow')}</button></div></article>`;
  }).join('');
}
function renderHistory() {
  const filter = $('#history-filter').value;
  const selectedDate = $('#history-date').value;
  const sessions = state.sessions.filter(s => (!filter || s.folderId === filter) && (!selectedDate || localDayKey(new Date(s.startedAt)) === selectedDate)).sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  const formattedDate = selectedDate.split('-').reverse().join('/');
  const dateLabel = selectedDate ? (selectedDate === localDayKey(new Date()) ? 'Hoje' : formattedDate) : 'Todas as datas';
  $('#history-date-label').textContent = dateLabel;
  $('#toggle-history-date').setAttribute('aria-label', selectedDate ? `Alterar data do histórico: ${dateLabel === 'Hoje' ? 'Hoje, ' : ''}${formattedDate}` : 'Filtrar histórico por data');
  $('#toggle-history-date').classList.toggle('date-selected', !!selectedDate);
  $('#clear-history-date').hidden = !selectedDate;
  $('#previous-history-day').disabled = selectedDate === '0001-01-01';
  $('#next-history-day').disabled = selectedDate === '9999-12-31';
  $('#sessions').innerHTML = sessions.slice(0, limit).map(s => {
    const f = folder(s.folderId), date = new Date(s.startedAt);
    return `<tr><td><span class="record-name">${symbolMarkup(f)}${escape(f.name)}</span><small>${escape(s.description || 'Registro de estudo')}</small></td><td>${date.toLocaleDateString('pt-BR', {day:'2-digit', month:'short', year:'numeric'})}<small>${date.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</small></td><td>${clock(s.duration)}</td><td><div class="row-actions"><button class="icon-button" data-edit-session="${escape(s.id)}" aria-label="Editar registro de ${escape(f.name)}">${icon('edit')}</button><button class="icon-button danger" data-delete-session="${escape(s.id)}" aria-label="Excluir registro de ${escape(f.name)}">${icon('trash')}</button></div></td></tr>`;
  }).join('');
  $('#empty-history').hidden = sessions.length > 0;
  $('#empty-history h2').textContent = selectedDate ? 'Nenhum registro nesta data.' : filter ? 'Nenhum registro nesta sessão.' : 'Seu primeiro estudo começa agora.';
  $('#empty-history p').textContent = selectedDate ? (filter ? 'Escolha outra data ou sessão para consultar seus estudos.' : 'Escolha outra data ou limpe o filtro para ver os demais estudos.') : 'Os estudos concluídos aparecerão aqui.';
  $('#empty-history .text-link').hidden = !!selectedDate;
  $('#history-count').textContent = `${sessions.length} ${sessions.length === 1 ? 'registro' : 'registros'}`;
  $('#show-more').hidden = sessions.length <= limit;
}
function renderTrash() {
  const items = [...(state.trash || [])].sort((a,b) => b.deletedAt - a.deletedAt);
  $('#trash-count').textContent = items.length;
  $('#empty-trash').hidden = items.length > 0;
  $('#trash-list').innerHTML = items.map(item => {
    const expires = new Date(item.deletedAt + RETENTION);
    const remaining = Math.ceil((expires.getTime() - Date.now()) / 86400000);
    const record = item.sessions[0];
    const detail = item.kind === 'group' ? `Sessão · ${item.sessions.length} ${item.sessions.length === 1 ? 'registro' : 'registros'}` : `${record.description || 'Registro de estudo'} · ${clock(record.duration)} · ${new Date(record.startedAt).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}`;
    return `<article class="trash-item">${symbolMarkup(item.folder)}<div class="trash-description"><h3>${escape(item.folder.name)}</h3><p>${escape(detail)}</p><small>Expira em ${remaining} ${remaining === 1 ? 'dia' : 'dias'} · <time datetime="${expires.toISOString()}">${expires.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}</time></small></div><button class="secondary" data-restore="${escape(item.id)}" aria-label="Restaurar ${escape(item.folder.name)}">${icon('restore')} Restaurar</button></article>`;
  }).join('');
}
function tick() {
  if (Date.now() >= nextExpiry) { render(); return; }
  const active = state.active, running = active && active.runningSince !== null;
  const time = clock(elapsed(active));
  $('#active-session').hidden = !active || page === 'timer';
  $('#mini-clock').textContent = time;
  $('#active-session-label').textContent = running ? 'Sessão em andamento' : 'Sessão em pausa';
  if (page === 'timer') {
    $('#clock').textContent = time;
    const label = active ? (running ? 'Pausar' : 'Retomar estudo') : 'Iniciar estudo';
    if ($('#toggle-timer').dataset.label !== label) {
      $('#toggle-timer').innerHTML = `${icon(running ? 'pause' : 'play')} ${label}`;
      $('#toggle-timer').dataset.label = label;
    }
    $('#toggle-timer').disabled = !state.folders.length || storageBroken;
    $('#finish-timer').hidden = !active;
    $('#finish-timer').disabled = !active || storageBroken;
    $('#timer-status').hidden = !active;
    $('#timer-status').textContent = active ? (running ? 'Em foco' : 'Em pausa') : '';
    $('#timer-status').classList.toggle('running', !!running);
  }
  document.title = running ? `${time} · Ritmo` : `${pages[page].label} · Ritmo`;
}
if (page === 'timer') {
  $('#toggle-timer').onclick = () => {
    const selected = $('#timer-folder').value, description = $('#description').value;
    change(() => {
      const now = Date.now();
      if (!state.active) state.active = {folderId: selected, description, startedAt: new Date(now).toISOString(), accumulated: 0, runningSince: now};
      else if (state.active.runningSince !== null) { state.active.accumulated = elapsed(state.active, now); state.active.runningSince = null; }
      else state.active.runningSince = now;
    });
  };
  $('#finish-timer').onclick = () => {
    if (!state.active) return;
    const ms = elapsed(state.active);
    if (ms < 1000) { toast('Estude por pelo menos um segundo para salvar a sessão.'); return; }
    if (change(() => {
      const active = state.active;
      state.sessions.push({id: crypto.randomUUID(), folderId: active.folderId, description: active.description, startedAt: active.startedAt, duration: ms});
      state.selected = active.folderId;
      state.active = null;
      state.draft = '';
    })) { $('#subject-details').open = false; toast('Estudo salvo no histórico. Bom estudo!'); }
  };
  $('#description').addEventListener('input', () => {
    if (state.active) {
      const previous = state.active.description;
      state.active.description = $('#description').value;
      if (!persist()) state.active.description = previous;
    } else {
      const previous = state.draft;
      state.draft = $('#description').value;
      if (!persist()) state.draft = previous;
    }
  });
  $('#timer-folder').onchange = () => { const value = $('#timer-folder').value; change(() => state.selected = value); };
}
$('#theme').onclick = () => change(() => state.theme = state.theme === 'dark' ? 'light' : 'dark');
if (page === 'history') {
  $('#toggle-trash').onclick = () => {
    const open = $('#trash-panel').hidden;
    $('#trash-panel').hidden = !open;
    $('#toggle-trash').setAttribute('aria-expanded', String(open));
    render();
  };
  $('#trash-list').onclick = e => {
    const button = e.target.closest('[data-restore]');
    if (!button) return;
    let restored = false;
    if (change(() => { restored = restoreItem(state, button.dataset.restore); })) {
      toast(restored ? 'Item restaurado. O tempo voltou aos seus totais.' : 'O prazo de 15 dias deste item terminou.');
      (document.querySelector('[data-restore]') || $('#toggle-trash')).focus();
    }
  };
  $('#history-filter').onchange = () => { limit = 10; renderHistory(); };
  createHistoryCalendar(() => { limit = 10; renderHistory(); });
  $('#show-more').onclick = () => { limit += 10; renderHistory(); };
}
function modal(title,html,callback,save='Salvar'){ $('#modal-title').textContent=title;$('#modal-fields').innerHTML=html;$('#form-error').textContent='';$('#save-modal').textContent=save;$('#save-modal').classList.toggle('danger',save==='Excluir');submitModal=callback;$('#modal').showModal();}
$('#modal-form').onsubmit=e=>{e.preventDefault();try{if(submitModal()!==false)$('#modal').close();}catch(error){$('#form-error').textContent=error.message;}};
$('#close-modal').onclick=$('#cancel-modal').onclick=()=>$('#modal').close();
function editFolder(id) {
  const f = folder(id);
  let selectedSymbol = validSymbol(f?.symbol) ? f.symbol : 'icon:book';
  const choices = [...iconChoices.map(([name,label]) => [`icon:${name}`,label]), ...emojiChoices];
  modal(f ? 'Editar sessão' : 'Nova sessão', `
    <label for="folder-name">Nome da sessão</label><input id="folder-name" maxlength="50" required value="${escape(f?.name || '')}" placeholder="Ex.: Inglês">
    <fieldset class="symbol-fieldset"><legend>Ícone da sessão</legend><div class="symbol-options">${choices.map(([value,label]) => `<button type="button" class="symbol-choice" data-symbol="${escape(value)}" aria-label="${label}" aria-pressed="${selectedSymbol === value}">${symbolMarkup({symbol:value})}</button>`).join('')}</div></fieldset>
    <label for="custom-emoji">Seu próprio emoji</label><div class="emoji-input-row"><input id="custom-emoji" maxlength="200" placeholder="Cole um emoji ou U+1F680" aria-describedby="emoji-help emoji-error" value="${selectedSymbol.startsWith('icon:') ? '' : escape(selectedSymbol)}"><span id="emoji-preview" class="emoji-preview" aria-label="Prévia do ícone">${symbolMarkup({symbol:selectedSymbol})}</span></div>
    <p id="emoji-help" class="field-help">Cole qualquer emoji ou seu código Unicode. Ex.: 🧠, U+1F9E0 ou U+1F469 U+200D U+1F4BB.</p><p id="emoji-error" class="field-error" role="status"></p>
    <fieldset class="symbol-fieldset color-fieldset"><legend>Cor da sessão</legend><div class="swatches">${colors.map((c,i) => `<label class="color-swatch" title="${colorNames[i]}"><input type="radio" name="color" value="${c}" ${(f?.color || colors[0]).toLowerCase() === c ? 'checked' : ''} aria-label="${colorNames[i]}"><span class="swatch-disc" style="--swatch-color:${c}" aria-hidden="true">${icon('check')}</span></label>`).join('')}</div><div class="custom-color-row"><label for="session-color">Cor personalizada</label><span id="selected-color-value">${f?.color || colors[0]}</span><input type="color" id="session-color" value="${f?.color || colors[0]}" aria-describedby="color-help"></div><p id="color-help" class="field-help">Escolha uma cor da paleta ou crie a sua.</p></fieldset>
    ${f ? '<button type="button" id="remove-folder" class="text-button danger">Excluir esta sessão…</button>' : ''}`, () => {
      const name = $('#folder-name').value.trim();
      if (!name) throw Error('Digite um nome para a sessão.');
      if (state.folders.some(x => x.id !== id && x.name.toLocaleLowerCase() === name.toLocaleLowerCase())) throw Error('Já existe uma sessão com esse nome.');
      const custom = $('#custom-emoji').value.trim();
      if (custom && !parseEmoji(custom)) throw Error('Cole um único emoji ou um código Unicode válido, como U+1F680.');
      const symbol = custom ? parseEmoji(custom) : selectedSymbol;
      return change(() => {
        const color = $('#session-color').value;
        if (f) Object.assign(folder(id), {name,color,symbol});
        else state.folders.push({id:crypto.randomUUID(),name,color,symbol});
      });
    });
  function updateColor() {
    const color = $('#session-color').value;
    document.querySelectorAll('input[name="color"]').forEach(input => { input.checked = input.value === color; });
    $('#selected-color-value').textContent = color.toUpperCase();
    $('#emoji-preview').style.setProperty('--preview-color', color);
  }
  $('.swatches').onchange = e => {
    if (!e.target.matches('input[name="color"]')) return;
    $('#session-color').value = e.target.value;
    updateColor();
  };
  $('#session-color').oninput = updateColor;
  updateColor();
  function preview(value) {
    $('#emoji-preview').innerHTML = value ? symbolMarkup({symbol:value}) : icon('close');
    document.querySelectorAll('[data-symbol]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.symbol === value)));
  }
  $('.symbol-options').onclick = e => {
    const button = e.target.closest('[data-symbol]');
    if (!button) return;
    selectedSymbol = button.dataset.symbol;
    $('#custom-emoji').value = selectedSymbol.startsWith('icon:') ? '' : selectedSymbol;
    $('#custom-emoji').removeAttribute('aria-invalid');
    $('#emoji-error').textContent = '';
    preview(selectedSymbol);
  };
  $('#custom-emoji').oninput = () => {
    const input = $('#custom-emoji').value.trim(), parsed = parseEmoji(input);
    $('#custom-emoji').setAttribute('aria-invalid', String(!!input && !parsed));
    $('#emoji-error').textContent = input && !parsed ? 'Use um único emoji ou código válido, como U+1F680.' : '';
    preview(input ? parsed : selectedSymbol);
  };
  if (f) $('#remove-folder').onclick = () => {
    if (state.active?.folderId === id) { $('#form-error').textContent = 'Encerre a sessão de estudo em andamento antes de excluí-la.'; return; }
    $('#modal').close();
    const count = state.sessions.filter(s => s.folderId === id).length;
    modal('Mover sessão para a lixeira?', `<p>A sessão <strong>${escape(f.name)}</strong> e seus <strong>${count} registros</strong> sairão dos totais. Você pode restaurar tudo pela lixeira do histórico em até 15 dias.</p>`, () => {
      const saved = change(() => deleteGroup(state,id));
      if (saved) toast('Sessão movida para a lixeira do histórico por 15 dias.');
      return saved;
    }, 'Mover para lixeira');
  };
}
if ($('#new-folder')) $('#new-folder').onclick=()=>editFolder();
if ($('#folder-list')) $('#folder-list').onclick=e=>{const edit=e.target.closest('[data-edit-folder]'),pick=e.target.closest('[data-folder]');if(edit)editFolder(edit.dataset.editFolder);if(pick){if(state.active){toast('Encerre o estudo atual para escolher outra sessão.');return;}if(change(()=>state.selected=pick.dataset.folder)) location.href='index.html';}};
function localDateValue(iso){const d=new Date(iso);const z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;}
if ($('#sessions')) $('#sessions').onclick = e => {
  const edit = e.target.closest('[data-edit-session]'), remove = e.target.closest('[data-delete-session]');
  if (edit) {
    const s = state.sessions.find(x => x.id === edit.dataset.editSession);
    modal('Editar registro', `<label for="session-folder">Sessão</label><select id="session-folder">${options(s.folderId)}</select><label for="session-description">Assunto (opcional)</label><input id="session-description" maxlength="200" value="${escape(s.description)}"><label for="session-date">Data e hora de início</label><input type="datetime-local" id="session-date" required value="${localDateValue(s.startedAt)}"><label for="session-duration">Duração (horas:minutos:segundos)</label><input id="session-duration" required value="${clock(s.duration)}" pattern="[0-9]+:[0-5][0-9]:[0-5][0-9]" placeholder="01:30:00">`, () => {
      const parts = $('#session-duration').value.split(':').map(Number), ms = (parts[0]*3600+parts[1]*60+parts[2])*1000;
      const date = new Date($('#session-date').value);
      if (!Number.isFinite(ms) || ms < 1000 || !Number.isFinite(date.getTime())) throw Error('Informe uma data e duração válidas, de pelo menos um segundo.');
      if (date > Date.now()) throw Error('O estudo não pode começar no futuro.');
      return change(() => Object.assign(state.sessions.find(x => x.id === s.id), {folderId:$('#session-folder').value,description:$('#session-description').value.trim(),startedAt:date.toISOString(),duration:ms}));
    });
  }
  if (remove) {
    modal('Mover registro para a lixeira?', '<p>Este registro sairá do histórico e dos totais. Você pode restaurá-lo pela lixeira em até 15 dias.</p>', () => {
      const saved = change(() => deleteRecord(state,remove.dataset.deleteSession));
      if (saved) toast('Registro guardado na lixeira por 15 dias.');
      return saved;
    }, 'Mover para lixeira');
  }
};
window.addEventListener('storage',e=>{if(e.key===KEY){try{const incoming=JSON.parse(e.newValue);if(validState(incoming)){state=incoming;storageBroken=false;$('#modal').close();render();}else{storageBroken=true;tick();toast('Os dados mudaram em outra aba. Recarregue para continuar.');}}catch{storageBroken=true;tick();}}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
window.addEventListener('pageshow', e => {
  if (e.persisted) {
    $('#modal').close();
    submitModal = null;
    readState();
    render();
  }
});
render();setInterval(tick,250);
if(storageBroken)toast('Não foi possível ler seus dados. Eles não foram sobrescritos. Verifique o armazenamento do navegador.');


