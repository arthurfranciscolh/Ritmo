const DAY = 86400000;
const weekdayNames = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

// Calendar ordinals make local-day arithmetic independent of daylight saving time.
function ordinal(date) {
  const utc = new Date(0);
  utc.setUTCFullYear(date.getFullYear(), date.getMonth(), date.getDate());
  utc.setUTCHours(0,0,0,0);
  return Math.floor(utc.getTime() / DAY);
}
export function dayKey(day) { return new Date(day * DAY).toISOString().slice(0,10); }
export function localDayKey(date = new Date()) { return dayKey(ordinal(date)); }
function parseDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) throw Error('Informe as duas datas do período.');
  const [year,month,day] = value.split('-').map(Number);
  const date = new Date(0);date.setFullYear(year,month-1,day);date.setHours(0,0,0,0);
  if (date.getFullYear() !== year || date.getMonth() !== month-1 || date.getDate() !== day) throw Error('Informe uma data válida.');
  return ordinal(date);
}
function weekday(day) { return (new Date(day * DAY).getUTCDay() + 6) % 7; }

export function analyze(sessions, folders, filters = {}, now = new Date()) {
  const today = ordinal(now), known = new Set(folders.map(f => f.id));
  const entries = sessions.filter(s => known.has(s.folderId) && Number.isFinite(s.duration) && s.duration > 0 && Number.isFinite(Date.parse(s.startedAt)) && Date.parse(s.startedAt) <= now.getTime())
    .map(s => ({...s, day:ordinal(new Date(s.startedAt))}));
  const period = ['7','30','90','all','custom'].includes(filters.period) ? filters.period : '30';
  let start, end = today;
  if (period === 'custom') {
    start = parseDay(filters.from);end = parseDay(filters.to);
    if (start > end) throw Error('A data inicial deve vir antes da data final.');
    if (end > today) throw Error('Escolha uma data final até hoje.');
  } else if (period === 'all') start = entries.reduce((min,s) => Math.min(min,s.day),today);
  else start = today - Number(period) + 1;
  const length = end - start + 1;
  const scoped = entries.filter(s => !filters.folderId || s.folderId === filters.folderId);
  const records = scoped.filter(s => s.day >= start && s.day <= end).sort((a,b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  const total = records.reduce((sum,s) => sum+s.duration,0);
  const previousRecords = scoped.filter(s => s.day >= start-length && s.day < start);
  const previous = period === 'all' ? null : {total:previousRecords.reduce((sum,s) => sum+s.duration,0), count:previousRecords.length, from:dayKey(start-length), to:dayKey(start-1)};
  const byDay = new Map(), byFolder = new Map();
  for (const s of records) {
    const day = byDay.get(s.day) || {day:s.day,key:dayKey(s.day),total:0,count:0};
    day.total += s.duration;day.count++;byDay.set(s.day,day);
    const group = byFolder.get(s.folderId) || {total:0,count:0};
    group.total += s.duration;group.count++;byFolder.set(s.folderId,group);
  }
  const getDay = day => byDay.get(day) || {day,key:dayKey(day),total:0,count:0};
  // Bound chart/DOM size even when someone has years of history.
  const bucketSize = length <= 45 ? 1 : length <= 315 ? 7 : Math.ceil(length / 40);
  const buckets = Array.from({length:Math.ceil(length/bucketSize)},(_,i) => {
    const first = start+i*bucketSize, last = Math.min(end,first+bucketSize-1);
    return {start:first,end:last,from:dayKey(first),to:dayKey(last),total:0,count:0};
  });
  for (const s of records) { const bucket = buckets[Math.floor((s.day-start)/bucketSize)];bucket.total+=s.duration;bucket.count++; }
  const calendar = Array.from({length:Math.min(length,91)},(_,i) => getDay(Math.max(start,end-90)+i));
  const weekdays = weekdayNames.map((label,index) => {
    const first = start + (index-weekday(start)+7)%7;
    return {label,index,occurrences:first>end?0:Math.floor((end-first)/7)+1,total:0,count:0,average:0};
  });
  for (const s of records) { weekdays[weekday(s.day)].total+=s.duration;weekdays[weekday(s.day)].count++; }
  weekdays.forEach(d => { d.average=d.occurrences?d.total/d.occurrences:0; });
  let longestStreak=0, run=0, last=-Infinity;
  for (const day of [...byDay.keys()].sort((a,b)=>a-b)) { run=day===last+1?run+1:1;longestStreak=Math.max(longestStreak,run);last=day; }
  let currentStreak=0, cursor=end;
  if (end===today && !byDay.has(cursor)) cursor--;
  while(cursor>=start && byDay.has(cursor)) { currentStreak++;cursor--; }
  const distribution = folders.filter(f => byFolder.has(f.id)).map(f => ({...f,...byFolder.get(f.id),share:total ? byFolder.get(f.id).total/total*100 : 0})).sort((a,b)=>b.total-a.total || a.name.localeCompare(b.name));
  const bestDay = [...byDay.values()].sort((a,b)=>b.total-a.total || b.day-a.day)[0] || null;
  return {
    range:{from:dayKey(start),to:dayKey(end),start,end,days:length,period},records,total,count:records.length,
    dailyAverage:total/length,recordAverage:records.length?total/records.length:0,activeDays:byDay.size,
    consistency:byDay.size/length*100,previous,change:previous?.total ? (total-previous.total)/previous.total*100 : null,
    days:length<=91?calendar:[],calendar,buckets,bucketSize,weekdays,distribution,longestStreak,currentStreak,bestDay,
  };
}

export function toCSV(records, folders) {
  const names = new Map(folders.map(f => [f.id,f.name]));
  const cell = value => {
    let text = String(value);
    if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"','""')}"`;
  };
  const rows = [['Sessão','Assunto','Início (ISO com fuso UTC)','Data local','Duração (segundos)','Duração (minutos)'],
    ...records.map(s => [names.get(s.folderId) || '',s.description,s.startedAt,localDayKey(new Date(s.startedAt)),Math.round(s.duration/1000),(s.duration/60000).toFixed(2).replace('.',',')])];
  return '\uFEFF'+rows.map(row=>row.map(cell).join(';')).join('\r\n');
}
