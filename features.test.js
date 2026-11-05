import test from 'node:test';
import assert from 'node:assert/strict';
import * as trash from './dist/trash.js';
import * as symbols from './dist/symbols.js';
import {validState, periodTotals} from './dist/core.js';

const now = Date.parse('2026-11-05T12:00:00Z');
const day = 86400000;
const record = id => ({id, folderId:'math', description:'Álgebra', duration:60000, startedAt:'2026-11-04T12:00:00Z'});
const base = () => ({version:1, folders:[{id:'math',name:'Matemática',color:'#77994f'}], sessions:[record('a'),record('b')],active:null,selected:'math'});

test('exclusão de registro sai dos totais e pode ser restaurada uma única vez', () => {
  const state = base();
  assert.equal(typeof trash.deleteRecord, 'function');
  trash.deleteRecord(state, 'a', now);
  assert.equal(state.sessions.length,1);
  assert.equal(periodTotals(state.sessions).total,60000);
  assert.equal(state.trash.length,1);
  assert.equal(trash.restoreItem(state,state.trash[0].id,now+day),true);
  assert.equal(state.sessions.length,2);
  assert.equal(state.trash.length,0);
  assert.equal(validState(state),true);
});

test('excluir sessão preserva seus registros e restauração fora de ordem não duplica', () => {
  const state = base();
  assert.equal(typeof trash.deleteGroup,'function');
  trash.deleteRecord(state,'a',now);
  const first = state.trash[0].id;
  trash.deleteGroup(state,'math',now+1000);
  const second = state.trash.find(x=>x.id!==first).id;
  assert.equal(state.folders.length,0);
  assert.equal(state.sessions.length,0);
  assert.equal(state.selected,null);
  assert.equal(validState(state),true);
  trash.restoreItem(state,first,now+2000);
  state.folders[0].name='Álgebra';
  trash.restoreItem(state,second,now+3000);
  assert.equal(state.folders.length,1);
  assert.equal(state.folders[0].name,'Álgebra');
  assert.equal(new Set(state.sessions.map(x=>x.id)).size,2);
  assert.equal(trash.restoreItem(state,second,now+3000),false);
});

test('retenção termina exatamente após 15 dias, inclusive em restauração direta', () => {
  const state=base();
  assert.equal(typeof trash.pruneTrash,'function');
  trash.deleteRecord(state,'a',now);
  const id=state.trash[0].id;
  trash.pruneTrash(state,now+15*day-1);
  assert.equal(state.trash.length,1);
  assert.equal(trash.restoreItem(state,id,now+15*day),false);
  assert.equal(state.trash.length,0);
  assert.equal(state.sessions.length,1);
});

test('sessão ativa é protegida; restauração resolve nomes em uso e preserva símbolos', () => {
  const state=base();
  assert.equal(typeof trash.deleteGroup,'function');
  state.folders[0].symbol='🧠';
  state.active={folderId:'math'};
  assert.equal(trash.deleteGroup(state,'math',now),false);
  assert.equal(state.folders.length,1);
  state.active=null;
  trash.deleteGroup(state,'math',now);
  state.folders.push({id:'other',name:'Matemática',color:'#77994f'});
  trash.restoreItem(state,state.trash[0].id,now);
  assert.equal(new Set(state.folders.map(f=>f.name)).size,2);
  assert.equal(state.folders.find(f=>f.id==='math').symbol,'🧠');
});

test('estado antigo é válido; lixeira malformada não sobrescreve dados existentes', () => {
  const state=base();
  assert.equal(validState(state),true);
  state.trash=[{id:'bad',kind:'record',deletedAt:now,folder:state.folders[0],sessions:[{...record('a'),duration:-1}]}];
  assert.equal(validState(state),false);
});

test('emoji aceita Unicode, entidades e sequências compostas sem interpretar HTML', () => {
  assert.equal(typeof symbols.parseEmoji,'function');
  for(const [input,expected] of [['U+1F680','🚀'],['1F9E0','🧠'],['0x1F4DA','📚'],['&#x1F680;','🚀'],['&#128640;','🚀'],['U+1F469 U+200D U+1F4BB','👩‍💻'],['👨‍👩‍👧‍👦','👨‍👩‍👧‍👦'],['🇧🇷','🇧🇷'],['1️⃣','1️⃣'],['👍🏽','👍🏽']]) {
    assert.equal(symbols.parseEmoji(input),expected,input);
  }
  for(const input of ['<img src=x>','texto','🚀🧠','U+110000','U+D800','123','']) assert.equal(symbols.parseEmoji(input),null,input);
});
