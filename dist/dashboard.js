import {analyze, dayKey, localDayKey, toCSV} from './analytics.js';
import {clock, duration} from './core.js';

export const statsMarkup = `
  <section id="stats-dashboard" class="content-view dashboard" aria-labelledby="page-title">
    <div class="page-heading dashboard-heading"><div><h1 id="page-title">Seu foco, em perspectiva<span>.</span></h1><p>Encontre padrões. Entenda sua constância. Faça no seu ritmo.</p></div><button id="export-stats" class="secondary" type="button"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></svg> Exportar CSV</button></div>
    <div class="analytics-filters" aria-label="Filtros das estatísticas">
      <div class="period-presets" role="group" aria-label="Período"><button type="button" data-period="7" aria-pressed="false">7 dias</button><button type="button" data-period="30" aria-pressed="true">30 dias</button><button type="button" data-period="90" aria-pressed="false">90 dias</button><button type="button" data-period="all" aria-pressed="false">Todo o período</button><button type="button" data-period="custom" aria-pressed="false">Personalizado</button></div>
      <label class="analytics-session-filter" for="stats-folder">Sessão<select id="stats-folder"><option value="">Todas as sessões</option></select></label>
      <form id="stats-date-form" class="date-range-form" hidden><label for="stats-from">De<input type="date" id="stats-from" required></label><label for="stats-to">Até<input type="date" id="stats-to" required></label><button class="primary" type="submit">Aplicar período</button><p id="stats-date-error" class="field-error" role="alert"></p></form>
    </div>
    <div class="analytics-context"><p id="stats-range-label" role="status"></p><button id="reset-stats" class="text-button" hidden>Limpar filtros</button></div>
    <div class="analytics-kpis" aria-label="Indicadores do período">
      <article><h2>Tempo de foco</h2><strong id="all-total">0h 00min</strong><p id="stats-change"></p></article>
      <article><h2>Estudos concluídos</h2><strong id="stats-count">0</strong><p id="stats-record-average"></p></article>
      <article><h2>Média por dia</h2><strong id="stats-average">0min</strong><p>Inclui os dias sem estudo</p></article>
      <article><h2>Dias ativos</h2><strong id="stats-active-days">0 <span>/ 30</span></strong><p id="stats-consistency"></p></article>
    </div>
    <section id="stats-empty" class="analytics-empty" aria-labelledby="stats-empty-title" hidden><div><h2 id="stats-empty-title">Seu próximo estudo começa esta história.</h2><p id="stats-empty-text">Ao encerrar o cronômetro, seu tempo aparece aqui.</p></div><a href="index.html" class="primary">Começar a focar</a></section>
    <div class="analytics-main-grid">
      <section class="analytics-panel evolution-panel" aria-labelledby="evolution-title"><div class="analytics-panel-heading"><div><h2 id="evolution-title">Evolução do foco</h2><p id="trend-granularity">Tempo por dia</p></div><div class="chart-modes" role="group" aria-label="Métrica do gráfico"><button type="button" data-metric="total" aria-pressed="true">Tempo</button><button type="button" data-metric="count" aria-pressed="false">Estudos</button></div></div>
        <div id="trend-readout" class="chart-readout"></div><div class="trend-chart"><div id="trend-axis" class="trend-axis" aria-hidden="true"></div><div class="trend-plot"><div class="plot-guides" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div id="trend-bars" class="trend-bars" role="group" aria-label="Evolução do foco; selecione um intervalo para detalhar"></div></div></div><div id="trend-dates" class="trend-dates" aria-hidden="true"></div>
        <div class="chart-foot"><span>Selecione uma barra para ver os registros.</span><details class="chart-data"><summary>Ver dados</summary><div class="table-wrap"><table><caption class="sr-only">Dados da evolução do foco</caption><thead><tr><th>Período</th><th>Tempo</th><th>Estudos</th></tr></thead><tbody id="trend-table"></tbody></table></div></details></div>
      </section>
      <section class="analytics-panel allocation-panel" aria-labelledby="allocation-title"><div class="analytics-panel-heading"><div><h2 id="allocation-title">Onde seu tempo vai</h2><p>Participação de cada sessão</p></div></div><div id="distribution" class="session-ranking"></div><p class="chart-hint">Selecione uma sessão para filtrar o painel.</p></section>
    </div>
    <div class="analytics-secondary-grid">
      <section class="analytics-panel activity-panel" aria-labelledby="activity-title"><div class="analytics-panel-heading"><div><h2 id="activity-title">Seu calendário de foco</h2><p id="calendar-caption"></p></div><span id="streak-badge" class="streak-badge"></span></div><div class="calendar-layout"><div class="calendar-weekdays" aria-hidden="true"><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span><span>D</span></div><div id="activity-grid" class="activity-grid" role="group" aria-label="Dias de estudo; selecione um dia para detalhar"></div></div><div class="calendar-footer"><span id="calendar-readout">Selecione um dia para explorar.</span><span class="heat-legend" aria-label="Escala de intensidade, de menos a mais tempo">Menos <i data-level="0"></i><i data-level="1"></i><i data-level="2"></i><i data-level="3"></i><i data-level="4"></i> Mais</span></div></section>
      <section class="analytics-panel weekday-panel" aria-labelledby="weekday-title"><div class="analytics-panel-heading"><div><h2 id="weekday-title">Seu ritmo na semana</h2><p>Média de foco em cada dia da semana</p></div></div><div id="weekday-chart" class="weekday-chart" role="list" aria-label="Média de foco por dia da semana"></div><p class="chart-hint">A média considera todas as ocorrências de cada dia no período.</p></section>
    </div>
    <section class="analytics-insights" aria-labelledby="insights-title"><h2 id="insights-title">O que os dados mostram</h2><div id="stats-insights"></div></section>
    <section class="analytics-panel records-panel" aria-labelledby="records-title"><div class="analytics-panel-heading"><div><h2 id="records-title" tabindex="-1">Por trás dos números</h2><p id="records-description"></p></div><button id="clear-detail" class="secondary" hidden>Ver todo o período</button></div><div class="table-wrap"><table><caption class="sr-only">Registros usados nas estatísticas</caption><thead><tr><th scope="col">SESSÃO / ASSUNTO</th><th scope="col">INÍCIO</th><th scope="col">DURAÇÃO</th></tr></thead><tbody id="stats-records"></tbody></table></div><p id="stats-records-empty" class="records-empty" hidden>Nenhum estudo neste intervalo.</p><button id="stats-more" class="secondary" hidden>Mostrar mais registros</button></section>
    <details class="analytics-method"><summary>Como os números são calculados</summary><p>Apenas estudos concluídos e fora da lixeira entram na análise. O tempo integral de cada registro pertence à sua data de início, no fuso deste dispositivo. Dias sem estudo entram na média diária.</p><p>A comparação usa o período imediatamente anterior, com a mesma quantidade de dias e o mesmo filtro de sessão. Hoje ainda pode estar incompleto. Todo o período não tem comparação. Os dias da semana são comparados pela média, considerando inclusive suas ocorrências sem estudo.</p><p>O CSV contém os registros exibidos pelos filtros, incluindo o intervalo selecionado nos gráficos, quando houver. Tempo de foco mede dedicação registrada, não desempenho de aprendizagem.</p></details>
    <p id="analytics-announcement" class="sr-only" role="status"></p>
  </section>`;

const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = value => new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(value);
function dateLabel(key, long = false) { return new Date(`${key}T12:00:00`).toLocaleDateString('pt-BR',long?{day:'numeric',month:'short',year:'numeric'}:{day:'2-digit',month:'2-digit'}); }
function spanLabel(from,to) { return from === to ? dateLabel(from,true) : `${dateLabel(from)} – ${dateLabel(to,true)}`; }
function compact(ms) { if(ms<=0)return '0min';if(ms<60000)return '< 1min';return ms<3600000?`${Math.floor(ms/60000)}min`:duration(ms); }
function scaleTop(value) { if(!value)return 1;const power=10**Math.floor(Math.log10(value));return [1,2,5,10].find(n=>n*power>=value)*power; }

export function createDashboard(getState) {
  const $ = selector => document.querySelector(selector);
  let filters = {period:'30',folderId:''}, metric='total', result, selected=null, limit=8;
  function selectedRecords() { return selected ? result.records.filter(s=>s.day>=selected.start && s.day<=selected.end) : result.records; }
  function renderRecords() {
    const records = selectedRecords(), groups = new Map(getState().folders.map(f=>[f.id,f]));
    $('#records-description').textContent = `${records.length} ${records.length===1?'registro':'registros'} · ${selected ? spanLabel(dayKey(selected.start),dayKey(selected.end)) : 'Todo o período selecionado'}`;
    $('#clear-detail').hidden=!selected;
    $('#reset-stats').hidden=filters.period==='30'&&!filters.folderId&&!selected;
    $('#stats-records').innerHTML=records.slice(0,limit).map(s=>`<tr><td><span class="record-name"><i class="color-dot" style="background:${groups.get(s.folderId).color}"></i>${escape(groups.get(s.folderId).name)}</span><small>${escape(s.description || 'Sem assunto')}</small></td><td>${dateLabel(localDayKey(new Date(s.startedAt)),true)}<small>${new Date(s.startedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</small></td><td>${clock(s.duration)}</td></tr>`).join('');
    $('#stats-records-empty').hidden=records.length>0;
    $('#stats-more').hidden=records.length<=limit;
    $('#export-stats').disabled=!records.length;
    $('#export-stats').title=selected?'Exportar os registros do intervalo selecionado':'Exportar os registros do período e sessão selecionados';
    document.querySelectorAll('[data-bucket]').forEach(button=>{const bucket=result.buckets[Number(button.dataset.bucket)];button.setAttribute('aria-pressed',String(!!selected && bucket.start===selected.start && bucket.end===selected.end));});
    document.querySelectorAll('[data-day]').forEach(button=>button.setAttribute('aria-pressed',String(!!selected && Number(button.dataset.day)>=selected.start && Number(button.dataset.day)<=selected.end)));
  }
  function selectInterval(start,end) {
    selected={start,end};limit=8;renderRecords();
    $('#analytics-announcement').textContent=`${selectedRecords().length} registros no intervalo selecionado.`;
    $('#records-title').focus({preventScroll:true});
    $('#records-title').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  }
  function renderTrend() {
    const longest=Math.max(0,...result.buckets.map(b=>b.total));
    const divisor=longest>=3600000?3600000:longest>=60000?60000:1000;
    const unit=metric==='count'?'':divisor===3600000?'h':divisor===60000?'min':'s';
    const value=b=>metric==='total'?b.total/divisor:b.count;
    let max=scaleTop(Math.max(0,...result.buckets.map(value)));
    const steps=metric==='count'?Math.min(4,max):4;
    if(metric==='count')max=Math.ceil(max/steps)*steps;
    $('#trend-granularity').textContent=result.bucketSize===1?'Por dia':result.bucketSize===7?'Agrupado em intervalos de 7 dias':`Agrupado em intervalos de até ${result.bucketSize} dias`;
    $('#trend-readout').textContent=`${metric==='total'?duration(result.total):`${result.count} estudos`} no período`;
    $('#trend-axis').innerHTML=Array.from({length:steps+1},(_,i)=>`<span>${new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3}).format(max*(steps-i)/steps)}${unit}</span>`).join('');
    $('.plot-guides').innerHTML='<i></i>'.repeat(steps+1);
    $('#trend-bars').innerHTML=result.buckets.map((bucket,index)=>{
      const label=`${spanLabel(bucket.from,bucket.to)}: ${compact(bucket.total)}, ${bucket.count} ${bucket.count===1?'estudo':'estudos'}`;
      return `<button type="button" class="trend-bar" data-bucket="${index}" aria-pressed="false" aria-label="${label}" title="${label}"><span class="trend-bar-fill" style="height:${value(bucket)?Math.max(1,value(bucket)/max*100):0}%"></span><span class="bar-zero" ${value(bucket)?'hidden':''}></span></button>`;
    }).join('');
    $('#trend-dates').innerHTML=[result.range.from,dayKey(Math.floor((result.range.start+result.range.end)/2)),result.range.to].map(key=>`<span>${dateLabel(key)}</span>`).join('');
    $('#trend-table').innerHTML=result.buckets.map(b=>`<tr><td>${spanLabel(b.from,b.to)}</td><td>${compact(b.total)}</td><td>${b.count}</td></tr>`).join('');
  }
  function renderCalendar() {
    const first=result.calendar[0].day;
    const padding=(new Date(first*86400000).getUTCDay()+6)%7;
    const max=Math.max(0,...result.calendar.map(d=>d.total));
    $('#activity-grid').style.setProperty('--weeks',Math.ceil((padding+result.calendar.length)/7));
    $('#calendar-caption').textContent=result.range.days>91?'Últimos 91 dias do período selecionado':spanLabel(result.range.from,result.range.to);
    $('#streak-badge').textContent=`${result.longestStreak} ${result.longestStreak===1?'dia seguido':'dias seguidos'} · recorde no período`;
    $('#activity-grid').innerHTML='<span class="heat-spacer" aria-hidden="true"></span>'.repeat(padding)+result.calendar.map(day=>{
      const level=day.total?Math.max(1,Math.ceil(day.total/max*4)):0;
      const label=`${dateLabel(day.key,true)}: ${compact(day.total)}, ${day.count} ${day.count===1?'estudo':'estudos'}`;
      return `<button type="button" class="heat-day" data-day="${day.day}" data-level="${level}" aria-label="${label}" title="${label}" aria-pressed="false"></button>`;
    }).join('');
    $('#calendar-readout').textContent='Selecione um dia para explorar.';
  }
  function render() {
    const state=getState();
    if(filters.folderId && !state.folders.some(f=>f.id===filters.folderId)) {filters.folderId='';selected=null;}
    result=analyze(state.sessions,state.folders,filters);
    if(selected && (selected.start<result.range.start || selected.end>result.range.end)) selected=null;
    $('#stats-folder').innerHTML='<option value="">Todas as sessões</option>'+state.folders.map(f=>`<option value="${escape(f.id)}" ${filters.folderId===f.id?'selected':''}>${escape(f.name)}</option>`).join('');
    document.querySelectorAll('[data-period]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.period===filters.period)));
    $('#stats-from').max=$('#stats-to').max=localDayKey();
    $('#stats-range-label').textContent=`${spanLabel(result.range.from,result.range.to)} · ${result.range.days} ${result.range.days===1?'dia':'dias'}${filters.folderId?` · ${state.folders.find(f=>f.id===filters.folderId).name}`:''}`;
    $('#reset-stats').hidden=filters.period==='30'&&!filters.folderId&&!selected;
    $('#all-total').textContent=duration(result.total);
    $('#stats-count').textContent=number(result.count);
    $('#stats-record-average').textContent=`${compact(result.recordAverage)} por estudo, em média`;
    $('#stats-average').textContent=compact(result.dailyAverage);
    $('#stats-active-days').innerHTML=`${result.activeDays} <span>/ ${number(result.range.days)}</span>`;
    $('#stats-consistency').textContent=`${number(result.consistency)}% dos dias com estudo`;
    const comparison=$('#stats-change');
    comparison.className=result.change>0?'delta-positive':result.change<0?'delta-negative':'';
    comparison.textContent=!result.previous?'Todo o histórico disponível':result.change===null?(result.total?'Sem foco registrado no período anterior':'Sem registros nos dois períodos'):`${result.change>0?'+':''}${number(result.change)}% vs. período anterior`;
    comparison.title=result.previous?`Anterior: ${spanLabel(result.previous.from,result.previous.to)} · ${duration(result.previous.total)}. Hoje pode estar incompleto.`:'';
    $('#stats-empty').hidden=!!result.count;
    $('#stats-empty-title').textContent=state.sessions.length?'Nenhum estudo neste recorte.':'Seu próximo estudo começa esta história.';
    $('#stats-empty-text').textContent=state.sessions.length?'Experimente outro período ou escolha todas as sessões.':'Ao encerrar o cronômetro, seu tempo aparece aqui.';
    renderTrend();
    $('#distribution').innerHTML=result.distribution.map((f,index)=>`<button type="button" class="ranking-row" data-stats-folder="${escape(f.id)}" aria-label="Filtrar sessão ${escape(f.name)}" aria-pressed="${filters.folderId===f.id}"><span class="ranking-position">${index+1}</span><span class="ranking-content"><span class="ranking-label"><strong>${escape(f.name)}</strong><span>${duration(f.total)}</span></span><span class="ranking-track"><span style="width:${f.share}%;background:${f.color}"></span></span><span class="ranking-meta">${f.count} ${f.count===1?'estudo':'estudos'}<span>${number(f.share)}%</span></span></span></button>`).join('') || '<p class="chart-empty">As sessões com estudos neste período aparecerão aqui.</p>';
    renderCalendar();
    const weekdayMax=Math.max(0,...result.weekdays.map(d=>d.average));
    $('#weekday-chart').innerHTML=result.weekdays.map(d=>`<div class="weekday-row" role="listitem" aria-label="${d.label}: média de ${compact(d.average)}, ${d.occurrences} ocorrências"><span>${d.label}</span><span class="weekday-track"><span style="width:${weekdayMax?d.average/weekdayMax*100:0}%"></span></span><strong>${compact(d.average)}</strong></div>`).join('');
    const top=result.distribution[0];
    $('#stats-insights').innerHTML=result.count?`<article><span>Seu maior dia</span><strong>${compact(result.bestDay.total)}</strong><p>${dateLabel(result.bestDay.key,true)}</p></article><article><span>Maior sequência</span><strong>${result.longestStreak} ${result.longestStreak===1?'dia':'dias'}</strong><p>Consecutivos com estudo no período</p></article><article><span>Mais tempo dedicado</span><strong>${escape(top.name)}</strong><p>${number(top.share)}% do foco em ${top.count} ${top.count===1?'estudo':'estudos'}</p></article>`:'<p class="chart-empty">Seus destaques aparecem quando houver estudos no período.</p>';
    renderRecords();
  }
  $('#stats-folder').onchange=()=>{filters.folderId=$('#stats-folder').value;selected=null;limit=8;render();};
  $('.period-presets').onclick=e=>{
    const button=e.target.closest('[data-period]');if(!button)return;
    if(button.dataset.period==='custom') {
      $('#stats-date-form').hidden=false;$('#stats-from').value=result.range.from;$('#stats-to').value=result.range.to;$('#stats-from').focus();return;
    }
    filters.period=button.dataset.period;selected=null;limit=8;$('#stats-date-form').hidden=true;$('#stats-date-error').textContent='';render();
  };
  $('#stats-date-form').onsubmit=e=>{
    e.preventDefault();const next={...filters,period:'custom',from:$('#stats-from').value,to:$('#stats-to').value};
    try {analyze(getState().sessions,getState().folders,next);filters=next;selected=null;limit=8;$('#stats-date-error').textContent='';render();}
    catch(error) {$('#stats-date-error').textContent=error.message;}
  };
  $('#reset-stats').onclick=()=>{filters={period:'30',folderId:''};selected=null;limit=8;$('#stats-date-form').hidden=true;$('#stats-date-error').textContent='';render();};
  $('.chart-modes').onclick=e=>{const button=e.target.closest('[data-metric]');if(!button)return;metric=button.dataset.metric;document.querySelectorAll('[data-metric]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderTrend();renderRecords();};
  $('#trend-bars').onclick=e=>{const button=e.target.closest('[data-bucket]');if(button){const b=result.buckets[Number(button.dataset.bucket)];selectInterval(b.start,b.end);}};
  const trendReadout=e=>{const b=e.target.closest('[data-bucket]');if(b)$('#trend-readout').textContent=b.getAttribute('aria-label');};
  $('#trend-bars').onpointerover=trendReadout;$('#trend-bars').onfocusin=trendReadout;
  $('#activity-grid').onclick=e=>{const button=e.target.closest('[data-day]');if(button)selectInterval(Number(button.dataset.day),Number(button.dataset.day));};
  const calendarReadout=e=>{const b=e.target.closest('[data-day]');if(b)$('#calendar-readout').textContent=b.getAttribute('aria-label');};
  $('#activity-grid').onpointerover=calendarReadout;$('#activity-grid').onfocusin=calendarReadout;
  $('#distribution').onclick=e=>{const button=e.target.closest('[data-stats-folder]');if(button){filters.folderId=filters.folderId===button.dataset.statsFolder?'':button.dataset.statsFolder;selected=null;limit=8;render();$('#stats-folder').focus({preventScroll:true});}};
  $('#clear-detail').onclick=()=>{selected=null;limit=8;renderRecords();$('#records-title').focus({preventScroll:true});};
  $('#stats-more').onclick=()=>{limit+=12;renderRecords();};
  $('#export-stats').onclick=()=>{
    const records=selectedRecords();if(!records.length)return;
    const blob=new Blob([toCSV(records,getState().folders)],{type:'text/csv;charset=utf-8;'}), url=URL.createObjectURL(blob), link=document.createElement('a');
    link.href=url;link.download=`ritmo-${selected?dayKey(selected.start):result.range.from}-${selected?dayKey(selected.end):result.range.to}.csv`;
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('#analytics-announcement').textContent=`CSV gerado com ${records.length} registros.`;
  };
  return {render};
}
