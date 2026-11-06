import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.RITMO_PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless:true, ...(process.env.RITMO_BROWSER_PATH ? {executablePath:process.env.RITMO_BROWSER_PATH} : {})});
const baseURL = process.env.RITMO_URL || 'http://127.0.0.1:3000';
const key = 'ritmo.study.v1';
const errors = [];
const base = () => ({version:1, theme:'light', folders:[{id:'math',name:'Matemática',color:'#77994f'},{id:'code',name:'Programação',color:'#7595bd',symbol:'icon:code'}],sessions:[{id:'one',folderId:'math',description:'Álgebra',startedAt:new Date(Date.now()-3600000).toISOString(),duration:5400000}],active:null,selected:'math'});
let checks = 0;
async function fresh(file, data=base(), viewport={width:1440,height:1000}, contextOptions={}) {
  const context = await browser.newContext({viewport,...contextOptions});
  // External fonts are optional. Keep checks deterministic and offline.
  await context.route('https://fonts.googleapis.com/**',route=>route.abort());
  await context.route('https://fonts.gstatic.com/**',route=>route.abort());
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(baseURL);
  await page.evaluate(({key,data}) => localStorage.setItem(key, typeof data === 'string' ? data : JSON.stringify(data)),{key,data});
  await page.goto(`${baseURL}/${file}`);
  await page.locator('#page-title').waitFor();
  return {page,context};
}
const state = page => page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
async function check(name, run) { if(process.env.RITMO_CHECK && !name.includes(process.env.RITMO_CHECK)) return; await run(); checks++; console.log(`PASS ${name}`); }
async function noOverflow(page) {
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true,'page overflows viewport');
}
async function chooseHistoryDate(page, value) {
  if (!await page.locator('#history-date-panel').isVisible()) await page.locator('#toggle-history-date').click();
  const [year,month]=value.split('-');
  await page.locator('#history-calendar-year').fill(year);
  await page.locator('#history-calendar-year').press('Tab');
  await page.locator('#history-calendar-month').selectOption(String(Number(month)-1));
  await page.locator(`[data-history-day="${value}"]`).click();
}
await mkdir('artifacts/ui',{recursive:true});
try {
  await check('histórico por data: dia local, sessão, paginação e limpar',async()=>{
    const data=base();
    const record=(id,startedAt,folderId='math')=>({id,startedAt,folderId,description:id,duration:60000});
    data.sessions=[
      record('anterior','2026-11-05T02:59:59Z'),
      record('inicio','2026-11-05T03:00:00Z'),
      record('fim','2026-11-06T02:59:59Z'),
      record('seguinte','2026-11-06T03:00:00Z'),
      record('outra-sessao','2026-11-05T15:00:00Z','code'),
      ...Array.from({length:11},(_,i)=>record(`estudo-${i}`,'2026-11-05T12:00:00Z')),
    ];
    const {page,context}=await fresh('historico.html',data,undefined,{timezoneId:'America/Sao_Paulo'});
    try {
      const saved=await state(page);
      await page.locator('#show-more').click();
      assert.equal(await page.locator('#sessions tr').count(),16);
      await chooseHistoryDate(page,'2026-11-05');
      assert.equal(await page.locator('#history-count').innerText(),'14 registros');
      assert.equal(await page.locator('#sessions tr').count(),10);
      await page.locator('#show-more').click();
      assert.equal(await page.locator('#sessions tr').count(),14);
      assert.equal(await page.locator('[data-edit-session="inicio"]').count(),1);
      assert.equal(await page.locator('[data-edit-session="fim"]').count(),1);
      assert.equal(await page.locator('[data-edit-session="anterior"]').count(),0);
      assert.equal(await page.locator('[data-edit-session="seguinte"]').count(),0);
      await page.locator('#history-filter').selectOption('code');
      assert.equal(await page.locator('#history-count').innerText(),'1 registro');
      assert.equal(await page.locator('[data-edit-session="outra-sessao"]').count(),1);
      await chooseHistoryDate(page,'2040-02-29');
      assert.equal(await page.locator('#empty-history').isVisible(),true);
      assert.match(await page.locator('#empty-history').innerText(),/data/i);
      assert.equal(await page.locator('#show-more').isVisible(),false);
      await page.locator('#clear-history-date').click();
      assert.equal(await page.locator('#history-filter').inputValue(),'code');
      assert.equal(await page.locator('#sessions tr').count(),1);
      await page.locator('#history-filter').selectOption('');
      assert.equal(await page.locator('#history-count').innerText(),'16 registros');
      assert.equal(await page.locator('#sessions tr').count(),10);
      assert.deepEqual(await state(page),saved,'filters must not change saved data');
    } finally { await context.close(); }
  });
  await check('histórico por data: painel único acima do botão e teclado',async()=>{
    for(const width of [1440,390,320]) {
      const data=base();data.theme=width===1440?'dark':'light';
      const {page,context}=await fresh('historico.html',data,{width,height:900});
      try {
        const tableBefore=await page.locator('.table-wrap').boundingBox();
        await page.locator('#toggle-history-date').focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('#history-date').isVisible(),false,'extra date field must not appear');
        const panel=await page.locator('#history-date-panel').boundingBox();
        const button=await page.locator('#toggle-history-date').boundingBox();
        assert.ok(panel.y>=0 && panel.y+panel.height<=button.y-7,'calendar must appear above button');
        assert.ok(panel.x>=0 && panel.x+panel.width<=width,'calendar must fit viewport');
        assert.deepEqual(await page.locator('.table-wrap').boundingBox(),tableBefore,'opening calendar must not shift content');
        assert.equal(await page.locator('#history-date-panel [data-history-day]:focus').count(),1);
        await chooseHistoryDate(page,'2000-02-29');
        assert.equal(await page.locator('#history-date-panel').isVisible(),false,'selecting a day closes calendar');
        await page.locator('#toggle-history-date').click();
        await page.keyboard.press('ArrowRight');
        assert.equal(await page.locator('[data-history-day="2000-03-01"]').evaluate(el=>el===document.activeElement),true);
        await page.keyboard.press('ArrowLeft');
        await noOverflow(page);
        await page.screenshot({path:`artifacts/ui/history-date-${width}.png`,fullPage:true});
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#history-date-panel').isVisible(),false);
        assert.equal(await page.locator('#toggle-history-date').getAttribute('aria-expanded'),'false');
        assert.equal(await page.locator('#toggle-history-date').evaluate(el=>el===document.activeElement),true);
        assert.match(await page.locator('#toggle-history-date').innerText(),/29\/02\/2000/);
        await page.locator('#toggle-history-date').click();
        await page.locator('#page-title').click();
        assert.equal(await page.locator('#history-date-panel').isVisible(),false,'outside click closes calendar');
        await chooseHistoryDate(page,'2026-12-31');
        await page.locator('#toggle-history-date').click();
        await page.getByRole('button',{name:'Próximo mês',exact:true}).click();
        assert.equal(await page.locator('#history-calendar-year').inputValue(),'2027');
        assert.equal(await page.locator('#history-calendar-month').inputValue(),'0');
        await page.getByRole('button',{name:'Mês anterior',exact:true}).click();
        assert.equal(await page.locator('#history-calendar-year').inputValue(),'2026');
        assert.equal(await page.locator('#history-calendar-month').inputValue(),'11');
        await chooseHistoryDate(page,'2026-08-31');
        assert.match(await page.locator('#toggle-history-date').innerText(),/31\/08\/2026/);
        await page.locator('#toggle-history-date').click();
        await page.locator('#history-calendar-year').fill('2024');
        await page.getByRole('button',{name:/31 de agosto/}).click();
        assert.equal(await page.locator('#history-date-panel').isVisible(),false,'clicking a day immediately after editing year selects it');
        assert.match(await page.locator('#toggle-history-date').innerText(),/31\/08\/2024/);
        await page.locator('#clear-history-date').click();
        assert.equal(await page.locator('#history-count').innerText(),'1 registro');
      } finally { await context.close(); }
    }
  });
  await check('cronômetro: copy, navegação, início, pausa, retorno e registro',async()=>{
    const {page,context}=await fresh('index.html');
    assert.equal(await page.locator('#page-title').innerText(),'Comece a focar.');
    assert.equal(await page.locator('.tagline em').innerText(),'ritmo.');
    for (const phrase of ['Aprenda no seu tempo','Um passo de cada vez','Um pouco de foco faz a diferença','Pronto para começar','Pastas']) assert.equal((await page.locator('body').innerText()).includes(phrase),false);
    assert.equal(await page.locator('#timer-status').isVisible(),false);
    await page.locator('#toggle-timer').click();
    await page.waitForFunction(()=>document.querySelector('#clock').textContent!=='00:00:00');
    await page.locator('#toggle-timer').click();
    const paused=(await state(page)).active.accumulated;
    await page.locator('nav a[href="historico.html"]').click();
    await page.waitForURL('**/historico.html');
    await page.locator('#active-session').waitFor();
    assert.equal(await page.locator('#active-session').isVisible(),true);
    await page.locator('#active-session').click();
    await page.waitForURL('**/index.html');
    assert.equal((await state(page)).active.accumulated,paused);
    await page.locator('#finish-timer').click();
    assert.equal((await state(page)).sessions.length,2);
    await page.screenshot({path:'artifacts/ui/timer-desktop.png',fullPage:true});
    await context.close();
  });
  await check('exclusão, persistência, restauração e totais do histórico',async()=>{
    const {page,context}=await fresh('historico.html');
    await page.locator('[data-delete-session]').click();
    await page.locator('#save-modal').click();
    assert.equal((await state(page)).sessions.length,0);
    assert.equal((await state(page)).trash.length,1);
    await page.reload();
    await page.locator('#toggle-trash').click();
    assert.equal(await page.locator('#toggle-trash').getAttribute('aria-expanded'),'true');
    await page.screenshot({path:'artifacts/ui/trash-desktop.png',fullPage:true});
    await page.locator('[data-restore]').click();
    assert.equal((await state(page)).sessions.length,1);
    assert.equal((await state(page)).trash.length,0);
    await page.goto(`${baseURL}/estatisticas.html`);
    assert.equal(await page.locator('#all-total').innerText(),'1h 30min');
    await context.close();
  });
  await check('sessões: emoji Unicode, edição, exclusão em grupo e recuperação',async()=>{
    const {page,context}=await fresh('pastas.html');
    await page.locator('[data-edit-folder="math"]').click();
    await page.locator('#custom-emoji').fill('U+1F469 U+200D U+1F4BB');
    assert.equal(await page.locator('#emoji-preview').innerText(),'👩‍💻');
    await page.screenshot({path:'artifacts/ui/symbol-editor-desktop.png',fullPage:true});
    await page.locator('#save-modal').click();
    assert.equal((await state(page)).folders[0].symbol,'👩‍💻');
    await page.reload();
    assert.equal(await page.locator('.folder-card').first().locator('.session-symbol').innerText(),'👩‍💻');
    await page.locator('[data-edit-folder="math"]').click();
    await page.locator('#remove-folder').click();
    await page.locator('#save-modal').click();
    assert.equal((await state(page)).sessions.length,0);
    assert.equal((await state(page)).folders.length,1);
    await page.goto(`${baseURL}/historico.html`);
    await page.locator('#toggle-trash').click();
    await page.locator('[data-restore]').click();
    assert.equal((await state(page)).folders.length,2);
    assert.equal((await state(page)).sessions.length,1);
    await context.close();
  });
  await check('criar sessão, ícones disponíveis e validação de emoji',async()=>{
    const {page,context}=await fresh('pastas.html');
    await page.locator('#new-folder').click();
    await page.locator('#folder-name').fill('Física');
    await page.locator('#custom-emoji').fill('<img src=x>');
    await page.locator('#save-modal').click();
    assert.equal(await page.locator('#modal').isVisible(),true);
    assert.equal((await state(page)).folders.length,2);
    await page.locator('[data-symbol="icon:flask"]').click();
    await page.locator('#save-modal').click();
    assert.equal((await state(page)).folders[2].symbol,'icon:flask');
    await page.locator('[data-folder="math"]').click();
    await page.waitForURL('**/index.html');
    assert.equal(await page.locator('#timer-folder').inputValue(),'math');
    await context.close();
  });
  await check('edição de registro, filtro e escape de HTML',async()=>{
    const data=base();data.folders[0].name='<img src=x onerror=alert(1)>';
    const {page,context}=await fresh('historico.html',data);
    assert.equal(await page.locator('tbody img').count(),0);
    await page.locator('[data-edit-session]').click();
    await page.locator('#session-duration').fill('02:30:00');
    await page.locator('#save-modal').click();
    assert.equal((await state(page)).sessions[0].duration,9000000);
    await page.locator('#history-filter').selectOption('code');
    assert.equal(await page.locator('#sessions tr').count(),0);
    await context.close();
  });
  await check('expiração exata enquanto a página permanece aberta',async()=>{
    const data=base(), now=Date.now();
    data.trash=[{id:'expired',kind:'record',deletedAt:now-15*86400000+2000,folder:data.folders[0],sessions:[{...data.sessions[0],id:'old'}]}];
    const {page,context}=await fresh('historico.html',data);
    await page.clock.install({time:now});
    await page.reload();
    await page.locator('#toggle-trash').click();
    await page.clock.fastForward(3000);
    assert.equal(await page.locator('[data-restore]').count(),0);
    assert.equal((await state(page)).trash.length,0);
    await context.close();
  });
  await check('sem sessões, dados inválidos e armazenamento indisponível',async()=>{
    const empty=base();empty.folders=[];empty.sessions=[];
    let ui=await fresh('index.html',empty);
    assert.equal(await ui.page.locator('#toggle-timer').isDisabled(),true);
    assert.equal(await ui.page.locator('#create-first-folder').isVisible(),true);
    await ui.context.close();
    ui=await fresh('index.html','{invalid');
    assert.equal(await ui.page.locator('#toggle-timer').isDisabled(),true);
    await ui.page.locator('#theme').click();
    assert.equal(await ui.page.evaluate(key=>localStorage.getItem(key),key),'{invalid');
    await ui.context.close();
    ui=await fresh('historico.html');
    await ui.page.evaluate(()=>Storage.prototype.setItem=()=>{throw Error('QuotaExceededError');});
    await ui.page.locator('[data-delete-session]').click();await ui.page.locator('#save-modal').click();
    assert.equal(await ui.page.locator('#sessions tr').count(),1);
    assert.equal((await state(ui.page)).sessions.length,1);
    assert.equal(await ui.page.locator('#modal').isVisible(),true);
    await ui.context.close();
  });
  await check('repetir edição após falha de armazenamento salva o conteúdo',async()=>{
    for(const [route,button,field,value,read] of [
      ['pastas.html','[data-edit-folder="math"]','#folder-name','Matemática revisada',s=>s.folders[0].name],
      ['historico.html','[data-edit-session]','#session-description','Novo assunto',s=>s.sessions[0].description]
    ]) {
      const {page,context}=await fresh(route);
      await page.locator(button).click();await page.locator(field).fill(value);
      await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw Error('QuotaExceededError');};});
      await page.locator('#save-modal').click();
      assert.equal(await page.locator('#modal').isVisible(),true);
      await page.evaluate(()=>Storage.prototype.setItem=window.originalSetItem);
      await page.locator('#save-modal').click();
      assert.equal(read(await state(page)),value);
      await context.close();
    }
  });
  await check('estudo ativo bloqueia exclusão da sessão',async()=>{
    const data=base();data.active={folderId:'math',description:'',startedAt:new Date().toISOString(),accumulated:2000,runningSince:null};
    const {page,context}=await fresh('pastas.html',data);
    await page.locator('[data-edit-folder="math"]').click();await page.locator('#remove-folder').click();
    assert.match(await page.locator('#form-error').innerText(),/Encerre/);
    assert.equal((await state(page)).folders.length,2);
    await context.close();
  });
  await check('sincronização entre abas mantém a restauração e fecha editor obsoleto',async()=>{
    const {page,context}=await fresh('historico.html');
    const other=await context.newPage();await other.goto(`${baseURL}/historico.html`);
    await other.locator('[data-edit-session]').click();
    await page.locator('[data-delete-session]').click();await page.locator('#save-modal').click();
    await other.waitForFunction(()=>!document.querySelector('#modal').open && !document.querySelector('#sessions tr'));
    await other.locator('#toggle-trash').click();await other.locator('[data-restore]').click();
    await page.locator('#sessions tr').waitFor();
    assert.equal((await state(page)).sessions.length,1);
    await context.close();
  });
  await check('layouts desktop/mobile e temas, com navegação por teclado',async()=>{
    for(const width of [1440,390,320]) {
      const data=base();data.folders[0].symbol='🧠';
      data.theme=width===1440?'dark':'light';
      data.trash=[{id:'deleted',kind:'record',deletedAt:Date.now()-86400000,folder:data.folders[0],sessions:[data.sessions[0]]}];
      const {page,context}=await fresh('index.html',data,{width,height:width===1440?1000:844});
      await noOverflow(page);
      if(width!==320) await page.screenshot({path:`artifacts/ui/timer-${width}.png`,fullPage:true});
      for(const route of ['pastas.html','historico.html','estatisticas.html']) {
        await page.goto(`${baseURL}/${route}`);await noOverflow(page);
        if(route==='historico.html') {await page.locator('#toggle-trash').click();await noOverflow(page);}
        if(width!==320 && route!=='estatisticas.html') await page.screenshot({path:`artifacts/ui/${route.split('.')[0]}-${width}.png`,fullPage:true});
        if(route==='pastas.html') {
          await page.locator('[data-edit-folder="math"]').click();
          await noOverflow(page);
          assert.equal(await page.locator('#modal').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
          if(width===390) await page.screenshot({path:'artifacts/ui/symbol-editor-mobile.png',fullPage:true});
          await page.keyboard.press('Escape');
          assert.equal(await page.locator('#modal').isVisible(),false);
        }
      }
      await context.close();
    }
  });
  assert.deepEqual(errors,[],'browser runtime errors');
  console.log(`${checks} browser checks passed; no runtime errors.`);
} finally { await browser.close(); }
