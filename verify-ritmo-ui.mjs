import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SourceTextModule} from 'node:vm';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require = createRequire(import.meta.url);
const {JSDOM} = require(process.env.RITMO_JSDOM_MODULE);
const root = pathToFileURL(process.env.RITMO_TEST_ROOT + '/dist/');
const key = 'ritmo.study.v1';
const files = ['index.html','historico.html','pastas.html','estatisticas.html'];
const base = () => ({version:1, theme:'light', folders:[{id:'math',name:'Matemática',color:'#77994f'}], sessions:[],active:null,selected:'math'});
async function open(file='index.html', data=base()) {
  const html = await readFile(new URL(file,root),'utf8');
  const dom = new JSDOM(html,{url:'http://localhost/'+file,runScripts:'outside-only'});
  const w=dom.window, context=dom.getInternalVMContext();
  let time = Date.now(), tick;
  w.matchMedia=()=>({matches:false});
  w.structuredClone=structuredClone;
  w.setInterval=fn=>{tick=fn;return 1;};
  w.Date.now=()=>time;
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  if(data!==null) w.localStorage.setItem(key,typeof data==='string'?data:JSON.stringify(data));
  const cache = new Map();
  async function load(url) {
    if(cache.has(url.href))return cache.get(url.href);
    const module=new SourceTextModule(await readFile(url,'utf8'),{context,identifier:url.href});
    cache.set(url.href,module);
    await module.link((specifier,parent)=>load(new URL(specifier,parent.identifier)));
    return module;
  }
  await (await load(new URL('app.js',root))).evaluate();
  return {w, $:s=>w.document.querySelector(s), $$:s=>[...w.document.querySelectorAll(s)], state:()=>JSON.parse(w.localStorage.getItem(key)), advance:ms=>{time+=ms;tick();}, close:()=>w.close()};
}
function input(ui, selector, value) {const field=ui.$(selector);field.value=value;field.dispatchEvent(new ui.w.Event('input',{bubbles:true}));}
function submit(ui) {ui.$('#modal-form').dispatchEvent(new ui.w.Event('submit',{bubbles:true,cancelable:true}));}

test('cada página tem navegação real e somente seu conteúdo principal',async()=>{
  for(const [i,file] of files.entries()) {
    const ui=await open(file);
    try {
      assert.equal(ui.$$('h1').length,1);
      assert.deepEqual(ui.$$('nav a').map(a=>a.getAttribute('href')), files);
      assert.equal(ui.$('nav [aria-current="page"]').getAttribute('href'),file);
      assert.equal(!!ui.$('#clock'),i===0);
      assert.equal(!!ui.$('#sessions'),i===1);
      assert.equal(!!ui.$('#new-folder'),i===2);
      assert.equal(!!ui.$('#donut'),i===3);
    }finally {ui.close();}
  }
});

test('inicial oferece início sem exibir encerrar; iniciar permite pausar e encerrar',async()=>{
  const ui=await open();try {
    assert.equal(ui.$('#finish-timer').hidden,true);
    assert.equal(ui.$('#toggle-timer').disabled,false);
    ui.$('#toggle-timer').click();ui.advance(6000);
    assert.equal(ui.$('#clock').textContent,'00:00:06');
    assert.equal(ui.$('#finish-timer').hidden,false);
    ui.$('#toggle-timer').click();ui.advance(8000);
    assert.equal(ui.$('#clock').textContent,'00:00:06');
    ui.$('#toggle-timer').click();ui.advance(4000);
    ui.$('#finish-timer').click();
    assert.equal(ui.state().active,null);assert.equal(ui.state().sessions.length,1);
    assert.equal(ui.state().sessions[0].duration,10000);
    assert.equal(ui.$('#finish-timer').hidden,true);
  }finally{ui.close();}
});

test('sessão sobrevive à troca de página e mostra indicador nas páginas secundárias',async()=>{
  const state=base();state.active={folderId:'math',description:'Álgebra',startedAt:new Date(Date.now()-9000).toISOString(),accumulated:3000,runningSince:Date.now()-5000};
  for(const file of files){const ui=await open(file,state);try {
    assert.ok(ui.state().active);
    assert.equal(ui.$('#active-session').hidden,file==='index.html');
    assert.ok(ui.$('#mini-clock').textContent>='00:00:08');
    if(file==='index.html'){assert.equal(ui.$('#description').value,'Álgebra');assert.equal(ui.$('#timer-folder').disabled,true);}
  }finally{ui.close();}}
});

test('rascunho do assunto e tema são preservados ao navegar',async()=>{
  const ui=await open();let saved;
  try {input(ui,'#description','Integrais');ui.$('#theme').click();saved=ui.state();assert.equal(saved.theme,'dark');assert.equal(saved.draft,'Integrais');}finally{ui.close();}
  const next=await open('index.html',saved);try {assert.equal(next.$('#description').value,'Integrais');assert.equal(next.$('#subject-details').open,true);assert.equal(next.w.document.body.dataset.theme,'dark');}finally{next.close();}
});

test('histórico edita sessão existente e estatísticas refletem o novo tempo',async()=>{
  const state=base();state.sessions=[{id:'one',folderId:'math',description:'Teste',duration:60000,startedAt:new Date(Date.now()-3600000).toISOString()}];
  const ui=await open('historico.html',state);let saved;
  try {
    assert.equal(ui.$$('#sessions tr').length,1);ui.$('[data-edit-session]').click();
    input(ui,'#session-duration','01:30:00');input(ui,'#session-description','Revisão');submit(ui);
    saved=ui.state();assert.equal(saved.sessions[0].duration,5400000);assert.equal(saved.sessions[0].description,'Revisão');assert.equal(ui.$('#modal').open,false);
  }finally{ui.close();}
  const stats=await open('estatisticas.html',saved);try {assert.equal(stats.$('#all-total').textContent,'1h 30min');assert.match(stats.$('#distribution').textContent,/1h 30min/);}finally{stats.close();}
});

test('sem pastas desabilita início e oferece navegação para criar uma',async()=>{
  const state=base();state.folders=[];state.selected=null;
  const ui=await open('index.html',state);try {assert.equal(ui.$('#toggle-timer').disabled,true);assert.equal(ui.$('#create-first-folder').hidden,false);}finally{ui.close();}
  const folders=await open('pastas.html',state);try {
    assert.equal(folders.$('#empty-folders').hidden,false);folders.$('#new-folder').click();input(folders,'#folder-name','Física');submit(folders);
    assert.equal(folders.state().folders.length,1);assert.equal(folders.state().folders[0].name,'Física');assert.equal(folders.$('#empty-folders').hidden,true);
  }finally{folders.close();}
});

test('pasta da sessão ativa não pode ser excluída',async()=>{
  const state=base();state.active={folderId:'math',description:'',startedAt:new Date().toISOString(),accumulated:2000,runningSince:null};
  const ui=await open('pastas.html',state);try {
    ui.$('[data-edit-folder]').click();ui.$('#remove-folder').click();
    assert.match(ui.$('#form-error').textContent,/Encerre a sessão/);assert.equal(ui.state().folders.length,1);assert.ok(ui.state().active);
  }finally{ui.close();}
});

test('voltar pelo cache do navegador relê sessão atualizada em outra página',async()=>{
  const state=base();state.active={folderId:'math',description:'',startedAt:new Date().toISOString(),accumulated:2000,runningSince:null};
  const ui=await open('index.html',state);try {
    assert.equal(ui.$('#finish-timer').hidden,false);
    const updated=ui.state();updated.active=null;ui.w.localStorage.setItem(key,JSON.stringify(updated));
    ui.w.dispatchEvent(new ui.w.PageTransitionEvent('pageshow',{persisted:true}));
    assert.equal(ui.$('#finish-timer').hidden,true);assert.equal(ui.$('#clock').textContent,'00:00:00');
  }finally{ui.close();}
});

test('dados inválidos bloqueiam início e não são sobrescritos',async()=>{
  const raw='{invalid';const ui=await open('index.html',raw);try {
    assert.equal(ui.$('#toggle-timer').disabled,true);ui.$('#theme').click();assert.equal(ui.w.localStorage.getItem(key),raw);
  }finally{ui.close();}
});

test('nomes e assuntos salvos são tratados como texto, não HTML',async()=>{
  const state=base();state.folders[0].name='<img src=x onerror=alert(1)>';state.sessions=[{id:'one',folderId:'math',description:'<script>alert(2)</script>',duration:3000,startedAt:new Date().toISOString()}];
  for(const file of ['pastas.html','historico.html','estatisticas.html']) {const ui=await open(file,state);try {
    assert.equal(ui.$('main img'),null);assert.equal(ui.$('main script'),null);assert.ok(ui.$('main').textContent.includes('<img src=x onerror=alert(1)>'));
  }finally{ui.close();}}
});

test('voltar à página fecha editores vinculados ao estado antigo',async()=>{
  const ui=await open('pastas.html');try {
    ui.$('[data-edit-folder]').click();assert.equal(ui.$('#modal').open,true);
    ui.w.dispatchEvent(new ui.w.PageTransitionEvent('pageshow',{persisted:true}));
    assert.equal(ui.$('#modal').open,false);
    ui.$('[data-edit-folder]').click();input(ui,'#folder-name','Álgebra');submit(ui);
    assert.equal(ui.state().folders[0].name,'Álgebra');
  }finally{ui.close();}
});
