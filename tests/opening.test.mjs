import test from 'node:test';
import assert from 'node:assert/strict';
import {openingTiming,openingLetters,openingLayout,sampleOpening,shouldPlayOpening} from '../dist/opening-motion.js';

const near=(actual,expected,epsilon=1e-8)=>assert.ok(Math.abs(actual-expected)<epsilon,`${actual} should be close to ${expected}`);

test('desktop and mobile opening geometry shows three quarters of the record above the bottom edge',()=>{
  for(const [width,height] of [[1280,720],[390,844]]){
    const layout=openingLayout(width,height);
    near(layout.centre.x,width/2);
    near(layout.centre.y,height-layout.radius*.5);
    assert.ok(layout.radius>0&&layout.radius<=width/2);
    assert.ok(layout.centre.y-layout.radius>layout.nameY);
    // The initial record crosses the viewport boundary exactly at its diameter.
    near(height-layout.centre.y,layout.radius*.5);
    assert.ok(layout.contact.y<height&&layout.contact.x>width/2);
    assert.ok(Math.hypot(layout.contact.x-layout.centre.x,layout.contact.y-layout.centre.y)<layout.radius);
  }
});

test('six intentional notes emerge from one needle contact point in SIYI YU order',()=>{
  const layout=openingLayout(1280,720);
  assert.equal(openingLetters.join(''),'SIYIYU');
  assert.equal(openingTiming.beats.length,6);
  assert.equal(sampleOpening(0,layout).notes.filter(note=>note.visible).length,0);
  for(let index=0;index<6;index++){
    const frame=sampleOpening(openingTiming.beats[index],layout);
    assert.equal(frame.notes.length,6);
    const note=frame.notes[index];
    assert.equal(note.letter,openingLetters[index]);
    assert.equal(note.visible,true);
    assert.equal(note.landed,false);
    near(note.x,layout.contact.x);
    near(note.y,layout.contact.y);
    assert.equal(frame.notes.filter(value=>value.visible).length,index+1);
  }
});

test('notes fly to distinct left-to-right slots with a larger surname space and overlapping flights',()=>{
  const layout=openingLayout(1280,720);
  for(let index=1;index<layout.slots.length;index++)assert.ok(layout.slots[index]>layout.slots[index-1]);
  const wordGap=layout.slots[4]-layout.slots[3];
  for(const [a,b] of [[0,1],[1,2],[2,3],[4,5]])assert.ok(wordGap>layout.slots[b]-layout.slots[a]);
  const usualBeat=openingTiming.beats[1]-openingTiming.beats[0];
  near(usualBeat,.22);
  near(openingTiming.beats[4]-openingTiming.beats[3],usualBeat*1.5);
  const overlapping=sampleOpening(openingTiming.beats[1]+.01,layout).notes.filter(note=>note.visible&&!note.landed);
  assert.ok(overlapping.length>=2);
  const flying=sampleOpening(openingTiming.beats[0]+openingTiming.flight*.5,layout).notes[0];
  assert.ok(flying.y<layout.contact.y);
});

test('last U landing leaves all six letters fixed and readable throughout the hold',()=>{
  const layout=openingLayout(1280,720),lastLanding=openingTiming.beats.at(-1)+openingTiming.flight;
  const landed=sampleOpening(lastLanding+.0001,layout);
  const held=sampleOpening(lastLanding+openingTiming.hold-.0001,layout);
  for(const frame of [landed,held]){
    assert.equal(frame.notes.filter(note=>note.visible&&note.landed).length,6);
    assert.equal(frame.notes.map(note=>note.letter).join(''),'SIYIYU');
    assert.equal(frame.handoff,0);
    for(const note of frame.notes){
      near(note.x,layout.slots[note.index]);
      near(note.y,layout.nameY);
      assert.equal(note.morph,1);
    }
  }
  near(held.handoffAt-lastLanding,.7);
});

test('handoff follows the completed name and finishes at about 3.23 seconds',()=>{
  const layout=openingLayout(1280,720),duration=openingTiming.beats.at(-1)+openingTiming.flight+openingTiming.hold+openingTiming.handoff;
  near(duration,3.23);
  const moving=sampleOpening(duration-openingTiming.handoff/2,layout);
  assert.equal(moving.phase,'handoff');
  assert.ok(moving.handoff>0&&moving.handoff<1);
  assert.equal(moving.complete,false);
  const finished=sampleOpening(duration+.0001,layout);
  assert.equal(finished.complete,true);
  assert.equal(finished.phase,'complete');
  assert.equal(finished.handoff,1);
});

test('opening is first-session Projects only; deep routes bypass; reduced motion uses static information',()=>{
  assert.equal(shouldPlayOpening(),true);
  assert.equal(shouldPlayOpening({seen:true}),false);
  assert.equal(shouldPlayOpening({reducedMotion:true}),true);
  for(const hash of ['#removed-page','#project/between-spaces','#project/common-ground']){
    assert.equal(shouldPlayOpening({hash}),false);
    assert.equal(shouldPlayOpening({hash,review:true}),false);
  }
  assert.equal(shouldPlayOpening({seen:true,review:true}),true);
  assert.equal(shouldPlayOpening({seen:true,review:true,reducedMotion:true}),true);
});
