import test from 'node:test';
import assert from 'node:assert/strict';
import {InteractionScope,WheelGesture} from '../dist/interaction-scope.js';
import {projects} from '../dist/projects.js';

test('one long trackpad gesture cannot run through multiple discs',()=>{
  const gate=new WheelGesture();let steps=0;
  for(let t=0;t<1500;t+=25)steps+=gate.feed(20,t);
  assert.equal(steps,1);assert.equal(gate.feed(100,2000),1);
  assert.equal(gate.feed(-100,2500),-1);
});
test('light wheel events accumulate without the former 60px delay',()=>{
  const gate=new WheelGesture();assert.equal(gate.feed(4,0),0);assert.equal(gate.feed(5,20),0);assert.equal(gate.feed(10,40),1);
  assert.equal(gate.feed(1,1200),0);assert.equal(gate.feed(1,1500),0);gate.reset();assert.equal(gate.feed(18,1501),1);
});

test('three deliberate swipes rearm even when their inertia tails overlap',()=>{
  const gate=new WheelGesture(),accepted=[];
  for(let swipe=0;swipe<3;swipe++)[4,10,28,42,28,14,5,1].forEach((delta,n)=>{
    if(gate.feed(delta,swipe*160+n*16))accepted.push(swipe);
  });
  assert.deepEqual(accepted,[0,1,2]);
});

test('reversing during a latched tail responds immediately, including at a boundary',()=>{
  const gate=new WheelGesture();let target=5;
  const step=gate.feed(30,0);target=Math.min(5,target+step);assert.equal(target,5);
  assert.equal(gate.feed(15,16),0);
  const reverse=gate.feed(-20,32);assert.equal(reverse,-1);target+=reverse;assert.equal(target,4);
  assert.equal(gate.feed(20,48),1);
  gate.reset();assert.equal(gate.feed(-20,49),-1);
});
test('repeated home/detail cycles leave exactly one active page listener',()=>{
  const target=new EventTarget();let home=0,detail=0;
  for(let i=0;i<12;i++){
    const row=new InteractionScope();row.on(target,'wheel',()=>home++);assert.equal(row.count,1);target.dispatchEvent(new Event('wheel'));
    row.close();row.close();assert.equal(row.count,0);
    const sheet=new InteractionScope();sheet.on(target,'wheel',()=>detail++);target.dispatchEvent(new Event('wheel'));sheet.close();target.dispatchEvent(new Event('wheel'));
  }
  assert.equal(home,12);assert.equal(detail,12);
});
test('stable project IDs survive reordered and filtered arrays',()=>{
  const ids=projects.map(p=>p.id);assert.equal(new Set(ids).size,projects.length);
  const chosen=projects[1],byId=new Map(projects.map(p=>[p.id,p]));
  const reordered=projects.filter(p=>p.demo).toReversed();assert.notEqual(reordered.indexOf(chosen),1);
  assert.equal(byId.get(chosen.id),chosen);assert.notEqual(byId.get(projects[2].id).art,chosen.art);
});

