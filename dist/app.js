import {elapsed, clock, duration, periodTotals, validState} from './core.js';
import {mountPage, pages, icon} from './views.js';

const $ = selector => document.querySelector(selector);
const KEY = 'ritmo.study.v1';
const page = Object.hasOwn(pages, document.body.dataset.page) ? document.body.dataset.page : 'timer';
const colors = ['#77994f', '#7595bd', '#b28bc0', '#d2a45f', '#c78078', '#65a49a'];
const initial = () => ({
  version: 1,
  folders: [
    {id: crypto.randomUUID(), name: 'Matemática', color: colors[0]},
    {id: crypto.randomUUID(), name: 'Programação', color: colors[1]},
    {id: crypto.randomUUID(), name: 'Lógica', color: colors[2]},
  ],
  sessions: [], active: null, selected: null,
  theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
});
let state = initial(), storageBroken = false, limit = 10, toastTimer, submitModal;
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
  fn();
  if (!persist()) { state = before; render(); return false; }
  render();
  return true;
}
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const folder = id => state.folders.find(f => f.id === id);
function options(selected, all = false) {
  return (all ? '<option value="">Todas as pastas</option>' : '') + state.folders.map(f => `<option value="${escape(f.id)}" ${selected === f.id ? 'selected' : ''}>${escape(f.name)}</option>`).join('');
}
function render() {
  const dark = state.theme === 'dark';
  document.body.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]').content = dark ? '#18181c' : '#f8f7f5';
  $('#theme').innerHTML = `${icon(dark ? 'sun' : 'moon')}<span>${dark ? 'Modo claro' : 'Modo escuro'}</span>`;
  $('#today-label').textContent = new Intl.DateTimeFormat('pt-BR', {day: 'numeric', month: 'long'}).format(new Date());
  const totals = periodTotals(state.sessions);
  if (page === 'timer') {
    $('#timer-folder').innerHTML = state.folders.length ? options(state.active?.folderId || state.selected) : '<option value="">Nenhuma pasta criada</option>';
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
  }
  if (page === 'stats') renderStats(totals);
  tick();
}
function renderFolders() {
  $('#empty-folders').hidden = state.folders.length > 0;
  $('#folder-list').innerHTML = state.folders.map(f => {
    const sessions = state.sessions.filter(s => s.folderId === f.id);
    const total = sessions.reduce((sum, s) => sum + s.duration, 0);
    return `<article class="folder-card panel" style="--folder-color:${f.color}"><div class="folder-card-top">${icon('folder')}<button class="icon-button" data-edit-folder="${escape(f.id)}" aria-label="Editar pasta ${escape(f.name)}">${icon('edit')}</button></div><h2>${escape(f.name)}</h2><p>${sessions.length} ${sessions.length === 1 ? 'sessão concluída' : 'sessões concluídas'}</p><div class="folder-card-bottom"><strong>${duration(total)}</strong><button class="folder-pick" data-folder="${escape(f.id)}" aria-label="Estudar ${escape(f.name)}">Estudar ${icon('arrow')}</button></div></article>`;
  }).join('');
}
function renderStats(totals) {
  $('#today-total').textContent = duration(totals.today);
  $('#week-total').textContent = duration(totals.week);
  $('#all-total').textContent = duration(totals.total);
  $('#session-count').textContent = `${state.sessions.length} ${state.sessions.length === 1 ? 'sessão concluída' : 'sessões concluídas'}`;
  $('#donut-total').textContent = duration(totals.total).replace(' 00min', '');
  let offset = 0;
  const segments = [];
  $('#distribution').innerHTML = state.folders.map(f => {
    const ms = state.sessions.filter(s => s.folderId === f.id).reduce((sum, s) => sum + s.duration, 0);
    const end = offset + (totals.total ? ms / totals.total * 100 : 0);
    segments.push(`${f.color} ${offset}% ${end}%`);
    offset = end;
    return `<div class="distribution-row"><span><i class="color-dot" style="background:${f.color}"></i>${escape(f.name)}</span><strong>${duration(ms)}</strong></div>`;
  }).join('') || '<p class="distribution-note">Crie uma pasta para organizar seus estudos.</p><a class="text-link" href="pastas.html">Ir para pastas</a>';
  $('#donut').style.background = totals.total ? `conic-gradient(${segments.join(',')})` : 'var(--line)';
}
function renderHistory() {
  const filter = $('#history-filter').value;
  const sessions = state.sessions.filter(s => !filter || s.folderId === filter).sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  $('#sessions').innerHTML = sessions.slice(0, limit).map(s => {
    const f = folder(s.folderId), date = new Date(s.startedAt);
    return `<tr><td><span class="color-dot" style="background:${f.color}"></span>${escape(f.name)}<small>${escape(s.description || 'Sessão de estudo')}</small></td><td>${date.toLocaleDateString('pt-BR', {day:'2-digit', month:'short', year:'numeric'})}<small>${date.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</small></td><td>${clock(s.duration)}</td><td><div class="row-actions"><button class="icon-button" data-edit-session="${escape(s.id)}" aria-label="Editar sessão de ${escape(f.name)}">${icon('edit')}</button><button class="icon-button danger" data-delete-session="${escape(s.id)}" aria-label="Excluir sessão de ${escape(f.name)}">${icon('close')}</button></div></td></tr>`;
  }).join('');
  $('#empty-history').hidden = sessions.length > 0;
  $('#empty-history h2').textContent = filter ? 'Nenhuma sessão nesta pasta.' : 'Seu primeiro estudo começa agora.';
  $('#history-count').textContent = `${sessions.length} ${sessions.length === 1 ? 'sessão registrada' : 'sessões registradas'}`;
  $('#show-more').hidden = sessions.length <= limit;
}
function tick() {
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
    $('#timer-status').textContent = active ? (running ? 'Em foco' : 'Em pausa') : 'Pronto para começar';
    $('#timer-status').classList.toggle('running', !!running);
    $('#clock-hint').textContent = active ? (running ? 'Uma coisa de cada vez.' : 'Respire. Seu tempo está guardado.') : 'Um pouco de foco faz a diferença.';
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
    })) { $('#subject-details').open = false; toast('Sessão salva no histórico. Bom estudo!'); }
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
  $('#history-filter').onchange = () => { limit = 10; renderHistory(); };
  $('#show-more').onclick = () => { limit += 10; renderHistory(); };
}
function modal(title,html,callback,save='Salvar'){ $('#modal-title').textContent=title;$('#modal-fields').innerHTML=html;$('#form-error').textContent='';$('#save-modal').textContent=save;$('#save-modal').classList.toggle('danger',save==='Excluir');submitModal=callback;$('#modal').showModal();}
$('#modal-form').onsubmit=e=>{e.preventDefault();try{if(submitModal()!==false)$('#modal').close();}catch(error){$('#form-error').textContent=error.message;}};
$('#close-modal').onclick=$('#cancel-modal').onclick=()=>$('#modal').close();
function editFolder(id){const f=folder(id);modal(f?'Editar pasta':'Uma nova área de aprendizado',`<label for="folder-name">Nome da pasta</label><input id="folder-name" maxlength="50" required value="${escape(f?.name||'')}" placeholder="Ex.: Inglês"><label>Cor da pasta</label><div class="swatches">${colors.map((c,i)=>`<label><input type="radio" name="color" value="${c}" ${(f?.color||colors[0])===c?'checked':''} aria-label="Cor ${['verde','azul','lilás','dourada','rosa','turquesa'][i]}"><span class="color-dot" style="background:${c}"></span></label>`).join('')}</div>${f?'<button type="button" id="remove-folder" class="text-button danger" style="margin-top:24px">Excluir esta pasta…</button>':''}`,()=>{const name=$('#folder-name').value.trim();if(!name)throw Error('Digite um nome para a pasta.');if(state.folders.some(x=>x.id!==id&&x.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw Error('Já existe uma pasta com esse nome.');return change(()=>{const color=$('input[name="color"]:checked').value;if(f)Object.assign(f,{name,color});else state.folders.push({id:crypto.randomUUID(),name,color});});});
 if(f)$('#remove-folder').onclick=()=>{if(state.active?.folderId===id){$('#form-error').textContent='Encerre a sessão desta pasta antes de excluí-la.';return;}$('#modal').close();const count=state.sessions.filter(s=>s.folderId===id).length;modal('Excluir pasta?',`<p>A pasta <strong>${escape(f.name)}</strong> e suas <strong>${count} sessões</strong> serão excluídas. Essa ação não pode ser desfeita.</p>`,()=>change(()=>{state.folders=state.folders.filter(x=>x.id!==id);state.sessions=state.sessions.filter(x=>x.folderId!==id);if(state.selected===id)state.selected=null;}),'Excluir');};
}
if ($('#new-folder')) $('#new-folder').onclick=()=>editFolder();
if ($('#folder-list')) $('#folder-list').onclick=e=>{const edit=e.target.closest('[data-edit-folder]'),pick=e.target.closest('[data-folder]');if(edit)editFolder(edit.dataset.editFolder);if(pick){if(state.active){toast('Encerre a sessão atual para estudar em outra pasta.');return;}if(change(()=>state.selected=pick.dataset.folder)) location.href='index.html';}};
function localDateValue(iso){const d=new Date(iso);const z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;}
if ($('#sessions')) $('#sessions').onclick=e=>{const edit=e.target.closest('[data-edit-session]'),remove=e.target.closest('[data-delete-session]');if(edit){const s=state.sessions.find(x=>x.id===edit.dataset.editSession);modal('Editar sessão',`<label for="session-folder">Pasta</label><select id="session-folder">${options(s.folderId)}</select><label for="session-description">Assunto (opcional)</label><input id="session-description" maxlength="200" value="${escape(s.description)}"><label for="session-date">Data e hora de início</label><input type="datetime-local" id="session-date" required value="${localDateValue(s.startedAt)}"><label for="session-duration">Duração (horas:minutos:segundos)</label><input id="session-duration" required value="${clock(s.duration)}" pattern="[0-9]+:[0-5][0-9]:[0-5][0-9]" placeholder="01:30:00">`,()=>{const parts=$('#session-duration').value.split(':').map(Number),ms=(parts[0]*3600+parts[1]*60+parts[2])*1000;const date=new Date($('#session-date').value);if(!Number.isFinite(ms)||ms<1000||!Number.isFinite(date.getTime()))throw Error('Informe uma data e duração válidas, de pelo menos um segundo.');if(date>Date.now())throw Error('A sessão não pode começar no futuro.');return change(()=>Object.assign(s,{folderId:$('#session-folder').value,description:$('#session-description').value.trim(),startedAt:date.toISOString(),duration:ms}));});}if(remove){const id=remove.dataset.deleteSession;modal('Excluir sessão?','<p>Esta sessão será removida do histórico e dos totais. Essa ação não pode ser desfeita.</p>',()=>change(()=>state.sessions=state.sessions.filter(s=>s.id!==id)),'Excluir');}};
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


