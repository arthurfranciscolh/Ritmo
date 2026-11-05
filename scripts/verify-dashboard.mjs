import assert from 'node:assert/strict';
import {mkdir, readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RITMO_PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,...(process.env.RITMO_BROWSER_PATH?{executablePath:process.env.RITMO_BROWSER_PATH}:{})});
const url=process.env.RITMO_URL || 'http://127.0.0.1:3000';
const key='ritmo.study.v1', errors=[];
const folders=[{id:'math',name:'Matemática',color:'#77994f',symbol:'🧠'},{id:'code',name:'Programação',color:'#7595bd',symbol:'icon:code'},{id:'english',name:'Inglês',color:'#b28bc0',symbol:'📚'}];
const date=(ago,hour=9)=>{const d=new Date();d.setDate(d.getDate()-ago);d.setHours(hour,0,0,0);return d;};
const localKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const sessions=[];
for(let ago=1;ago<110;ago++) {
  if(ago%6===0)continue;
  for(let i=0;i<(ago%3===0?2:1);i++)sessions.push({id:`${ago}-${i}`,folderId:folders[(ago+i)%3].id,description:['Revisão de funções','Exercícios e prática','Leitura e anotações'][(ago+i)%3],duration:(20+(ago*7+i*15)%100)*60000,startedAt:date(ago,9+i*6).toISOString()});
}
const seed=()=>({version:1,theme:'light',folders:structuredClone(folders),sessions:structuredClone(sessions),active:null,selected:'math',trash:[]});
let checks=0;
async function check(name,fn){await fn();checks++;console.log(`PASS ${name}`);}
async function open(data=seed(),width=1440) {
 const context=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true});
 await context.route('https://fonts.googleapis.com/**',route=>route.abort());
 await context.route('https://fonts.gstatic.com/**',route=>route.abort());
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.evaluate(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key,data});
 await page.goto(`${url}/estatisticas.html`);await page.locator('#stats-dashboard').waitFor();
 return {page,context};
}
const state=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
await mkdir('artifacts/stats',{recursive:true});
try {
 await check('filtros sincronizam indicadores, gráficos e registros sem mudar dados',async()=>{
  const {page,context}=await open();const original=await state(page);
  assert.equal(await page.locator('[data-bucket]').count(),30);
  await page.locator('[data-period="7"]').click();
  assert.equal(await page.locator('[data-bucket]').count(),7);
  const expected=original.sessions.filter(s=>new Date(s.startedAt)>=new Date(date(6).setHours(0,0,0,0))).length;
  assert.equal(Number(await page.locator('#stats-count').innerText()),expected);
  await page.locator('#stats-folder').selectOption('math');
  assert.equal(await page.locator('[data-stats-folder]').count(),1);
  for(const row of await page.locator('#stats-records .record-name').allTextContents())assert.ok(row.includes('Matemática'));
  await page.locator('[data-metric="count"]').click();assert.equal(await page.locator('[data-metric="count"]').getAttribute('aria-pressed'),'true');
  assert.ok((await page.locator('#trend-axis span').allTextContents()).every(label=>Number.isInteger(Number(label.replace(',','.')))),'study counts must have integer axis labels');
  await page.locator('#reset-stats').click();assert.equal(await page.locator('#stats-folder').inputValue(),'');
  assert.deepEqual(await state(page),original);
  await context.close();
 });
 await check('ranking filtra, barras e calendário detalham registros pelo teclado',async()=>{
  const {page,context}=await open();
  await page.locator('[data-stats-folder="code"]').click();assert.equal(await page.locator('#stats-folder').inputValue(),'code');
  await page.locator('#reset-stats').click();
  const bar=page.locator('[data-bucket]').nth(28);await bar.focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('#clear-detail').isVisible(),true);
  assert.ok((await page.locator('#records-description').innerText()).includes('registro'));
  await page.locator('#clear-detail').click();
  const day=page.locator('[data-day]').nth(28);await day.focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('#clear-detail').isVisible(),true);
  const expected=seed().sessions.filter(s=>localKey(new Date(s.startedAt))===localKey(date(1))).length;
  assert.equal(await page.locator('#stats-records tr').count(),expected);
  await context.close();
 });
 await check('datas personalizadas, validação, comparação e CSV do recorte',async()=>{
  const {page,context}=await open();
  await page.locator('[data-period="custom"]').click();
  await page.locator('#stats-from').fill(localKey(date(1)));await page.locator('#stats-to').fill(localKey(date(4)));
  await page.locator('#stats-date-form button').click();assert.match(await page.locator('#stats-date-error').innerText(),/inicial/);
  await page.locator('#stats-from').fill(localKey(date(4)));await page.locator('#stats-to').fill(localKey(date(1)));
  await page.locator('#stats-date-form button').click();assert.equal(await page.locator('[data-bucket]').count(),4);
  await page.locator('#stats-folder').selectOption('code');
  const downloadPromise=page.waitForEvent('download');await page.locator('#export-stats').click();const download=await downloadPromise;
  const csv=await readFile(await download.path(),'utf8');assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('Programação'));assert.equal(csv.includes('Matemática'),false);
  const count=Number(await page.locator('#stats-count').innerText());assert.equal(csv.split('\r\n').length,count+1);
  assert.deepEqual(await state(page),seed());
  await context.close();
 });
 await check('90 dias e todo período agrupam sem perder totais',async()=>{
  const {page,context}=await open();await page.locator('[data-period="90"]').click();
  assert.equal(await page.locator('[data-bucket]').count(),13);assert.equal(await page.locator('[data-day]').count(),90);
  await page.locator('[data-period="all"]').click();assert.equal(Number(await page.locator('#stats-count').innerText()),sessions.length);
  assert.equal(await page.locator('[data-day]').count(),91);
  assert.equal(await page.locator('#stats-change').innerText(),'Todo o histórico disponível');
  await page.locator('.chart-data summary').click();assert.equal(await page.locator('#trend-table tr').count(),await page.locator('[data-bucket]').count());
  await context.close();
 });
 await check('sem registros, um registro, nomes longos e conteúdo HTML são seguros',async()=>{
  const empty=seed();empty.sessions=[];let ui=await open(empty);
  assert.equal(await ui.page.locator('#stats-empty').isVisible(),true);assert.equal(await ui.page.locator('#export-stats').isDisabled(),true);
  await ui.page.screenshot({path:'artifacts/stats/empty-desktop.png',fullPage:true});await ui.context.close();
  const data=seed();data.sessions=[{...sessions[0],duration:60000}];data.folders.find(f=>f.id===sessions[0].folderId).name='<img src=x onerror=alert(1)> Sessão com um nome longo para testar';
  ui=await open(data,390);assert.equal(await ui.page.locator('#stats-count').innerText(),'1');
  assert.equal(await ui.page.locator('#stats-dashboard img').count(),0);
  assert.match(await ui.page.locator('#trend-axis').innerText(),/1min/);
  assert.equal(await ui.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await ui.context.close();
 });
 await check('atualizações entre abas refletem no painel e preservam filtros',async()=>{
  const {page,context}=await open();await page.locator('#stats-folder').selectOption('math');
  const other=await context.newPage();await other.goto(url);
  const data=seed();data.sessions=[];
  await other.evaluate(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key,data});
  await page.waitForFunction(()=>document.querySelector('#stats-count').textContent==='0');
  assert.equal(await page.locator('#stats-folder').inputValue(),'math');await context.close();
 });
 await check('layout claro/escuro desktop e mobile, sem overflow',async()=>{
  for(const width of [1440,1024,390,320]) {
   const data=seed();data.theme=width===1024||width===390?'dark':'light';const {page,context}=await open(data,width);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`overflow ${width}`);
   await page.screenshot({path:`artifacts/stats/dashboard-${width}.png`,fullPage:true});
   await page.locator('[data-period="90"]').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`overflow 90d ${width}`);
   if(width===1440||width===390)await page.screenshot({path:`artifacts/stats/activity-90-${width}.png`,fullPage:true});
   await context.close();
  }
 });
 assert.deepEqual(errors,[]);console.log(`${checks} dashboard scenarios passed; no browser runtime errors.`);
}finally{await browser.close();}
