import test from 'node:test';
import assert from 'node:assert/strict';
import * as analytics from './dist/analytics.js';
const hour=3600000;
const now=new Date(2026,10,5,12);
const folders=[{id:'math',name:'Matemática',color:'#77994f'},{id:'code',name:'Programação',color:'#7595bd'}];
const record=(day,minutes=60,folderId='math')=>({id:`${day}-${minutes}-${folderId}`,folderId,description:'Álgebra',duration:minutes*60000,startedAt:new Date(2026,10,day,10).toISOString()});

test('últimos 7 dias incluem hoje e zeros; comparação usa os 7 dias anteriores',()=>{
  assert.equal(typeof analytics.analyze,'function');
  const result=analytics.analyze([record(5),record(4,30),record(-2,120),record(6,180)],folders,{period:'7'},now);
  assert.equal(result.total,1.5*hour);
  assert.equal(result.count,2);
  assert.equal(result.range.days,7);
  assert.equal(result.days.length,7);
  assert.equal(result.activeDays,2);
  assert.equal(result.dailyAverage,1.5*hour/7);
  assert.equal(result.previous.total,2*hour);
  assert.equal(result.change,-25);
});
test('filtro de sessão é aplicado ao total, comparação e distribuição',()=>{
  assert.equal(typeof analytics.analyze,'function');
  const result=analytics.analyze([record(5),record(5,120,'code'),record(-2,30,'code')],folders,{period:'7',folderId:'code'},now);
  assert.equal(result.total,2*hour);assert.equal(result.previous.total,.5*hour);
  assert.equal(result.distribution.length,1);assert.equal(result.distribution[0].id,'code');
  assert.equal(result.distribution[0].share,100);assert.equal(result.change,300);
});
test('datas personalizadas são inclusivas e datas inválidas são rejeitadas',()=>{
  assert.equal(typeof analytics.analyze,'function');
  const filters={period:'custom',from:'2026-11-03',to:'2026-11-04'};
  const result=analytics.analyze([record(2),record(3),record(4),record(5)],folders,filters,now);
  assert.equal(result.count,2);assert.equal(result.range.days,2);
  for(const bad of [{from:'2026-02-30',to:'2026-11-04'},{from:'2026-11-05',to:'2026-11-03'},{from:'2026-11-04',to:'2026-11-06'}]) assert.throws(()=>analytics.analyze([],folders,{period:'custom',...bad},now));
});
test('zero anterior não gera infinito; vazio e todo período possuem resultados finitos',()=>{
  assert.equal(typeof analytics.analyze,'function');
  const result=analytics.analyze([record(5)],folders,{period:'7'},now);
  assert.equal(result.change,null);
  const empty=analytics.analyze([],folders,{period:'all'},now);
  assert.equal(empty.total,0);assert.equal(empty.dailyAverage,0);assert.equal(empty.longestStreak,0);
  assert.equal(empty.previous,null);assert.equal(empty.days.length,1);
});
test('sequência e médias por dia da semana respeitam dias sem estudos',()=>{
  assert.equal(typeof analytics.analyze,'function');
  const result=analytics.analyze([record(1),record(2),record(3),record(5)],folders,{period:'7'},now);
  assert.equal(result.longestStreak,3);
  assert.equal(result.currentStreak,1);
  assert.equal(result.weekdays.length,7);
  assert.equal(result.weekdays.reduce((sum,d)=>sum+d.occurrences,0),7);
  assert.equal(result.weekdays.find(d=>d.label==='Qua').average,0);
});
test('agrupamento preserva totais em períodos longos, calendário limitado a 91 dias',()=>{
  assert.equal(typeof analytics.analyze,'function');
  const result=analytics.analyze([record(-500,120),record(5,45)],folders,{period:'all'},now);
  assert.equal(result.total,2.75*hour);
  assert.ok(result.buckets.length<=45);
  assert.equal(result.buckets.reduce((sum,b)=>sum+b.total,0),result.total);
  assert.equal(result.calendar.length,91);
});
test('CSV exporta somente registros recebidos, escapa aspas e neutraliza fórmulas',()=>{
  assert.equal(typeof analytics.toCSV,'function');
  const csv=analytics.toCSV([{...record(5),description:'=SUM(1;2)\n"teste"'}],[{...folders[0],name:'@Matemática'}]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes("'@Matemática"));assert.ok(csv.includes("'=SUM"));
  assert.ok(csv.includes('""teste""'));assert.ok(csv.includes('3600'));
});

test('média por dia da semana usa todas as ocorrências, inclusive sem registros',()=>{
  const result=analytics.analyze([record(2,120)],folders,{period:'30'},now);
  const monday=result.weekdays.find(d=>d.label==='Seg');
  assert.equal(monday.occurrences,4);assert.equal(monday.average,30*60000);
});
test('duração atravessando meia-noite pertence ao início e futuros de hoje são excluídos',()=>{
  const crossing={...record(4,180),startedAt:new Date(2026,10,4,23).toISOString()};
  const future={...record(5),startedAt:new Date(2026,10,5,23).toISOString()};
  const result=analytics.analyze([crossing,future],folders,{period:'7'},now);
  assert.equal(result.count,1);assert.equal(result.days.find(d=>d.key==='2026-11-04').total,3*hour);
  assert.equal(result.days.find(d=>d.key==='2026-11-05').total,0);
});
test('ano bissexto e comparação entre meses mantêm a quantidade correta de dias',()=>{
  const result=analytics.analyze([],folders,{period:'custom',from:'2024-02-01',to:'2024-02-29'},new Date(2024,2,1));
  assert.equal(result.range.days,29);assert.equal(result.previous.from,'2024-01-03');assert.equal(result.previous.to,'2024-01-31');
});
