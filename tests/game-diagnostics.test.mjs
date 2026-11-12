import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiagnostics} from '../assets/games/battleship/diagnostics.js';

test('local diagnostics stay bounded and omit player and authentication data',()=>{
  let stored;const storage={getItem:()=>stored||null,setItem:(_,v)=>{stored=v;}};
  const log=createDiagnostics(storage,()=>123);
  for(let i=0;i<100;i++)log.record('phase',{screen:'online',phase:'waiting',room:'ABCDEF',name:'Player',token:'secret'});
  const value=JSON.parse(log.report());
  assert.equal(value.events.length,30);
  assert.deepEqual(JSON.parse(stored),JSON.parse(log.report()));
  assert.doesNotMatch(stored,/ABCDEF|Player|secret/);
});
test('an interrupted previous tab is recorded as uncertain; normal navigation remains distinct',()=>{
  let stored;const storage={getItem:()=>stored||null,setItem:(_,v)=>{stored=v;}};
  createDiagnostics(storage,()=>1).record('screen',{screen:'online'});
  const next=createDiagnostics(storage,()=>2);
  assert.equal(JSON.parse(next.report()).previous.missingPageHide,true);
  next.record('pagehide');
  assert.equal(JSON.parse(createDiagnostics(storage,()=>3).report()).previous.missingPageHide,false);
  assert.doesNotThrow(()=>createDiagnostics({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}).record('boot'));
});
