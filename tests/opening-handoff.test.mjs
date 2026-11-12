import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {sampleOpeningHandoff,openingHandoffTiming,createOpeningDiscPose} from '../dist/opening-handoff.js';
import {sampleProjectOpening,projectOpeningTiming} from '../dist/project-transition.js';
import {discConfig} from '../dist/disc-config.js';

test('cover exit uses the project-opening shrink curve and reveals no replacement until the portrait is nearly collapsed',()=>{
  assert.equal(openingHandoffTiming.disc,projectOpeningTiming.disc);
  for(let i=0;i<=100;i++)assert.equal(sampleOpeningHandoff(i/100*projectOpeningTiming.disc).scale,sampleProjectOpening(i/100).scale);
  const first=sampleOpeningHandoff(0,9),bridge=sampleOpeningHandoff(openingHandoffTiming.queueAt,9);
  assert.equal(first.scale,1);assert.equal(first.queueReveal(0),0);assert.equal(first.boardOpacity,1);
  assert.ok(bridge.scale<.01);assert.equal(bridge.queueReveal(0),0);
  assert.ok(sampleOpeningHandoff(openingHandoffTiming.queueAt+.03,9).queueReveal(0)>0);
});

test('the real Three.js portrait starts without a pose jump, turns through the existing left/frontal/opposite poses, and collapses at the gallery anchor',()=>{
  const apply=createOpeningDiscPose(),group=new THREE.Group();
  const source={position:new THREE.Vector3(0,-.85,0),quaternion:new THREE.Quaternion().setFromEuler(new THREE.Euler(.025,-.025,0)),scale:1.1};
  const destination={position:new THREE.Vector3(.35,-.12,0),quaternion:new THREE.Quaternion().setFromEuler(new THREE.Euler(discConfig.restRotation.x,discConfig.restRotation.y,0))};
  apply(group,source,destination,sampleOpeningHandoff(0));
  assert.ok(group.position.distanceTo(source.position)<1e-10);assert.ok(group.quaternion.angleTo(source.quaternion)<1e-7);assert.equal(group.scale.x,source.scale);
  for(const [progress,x,y] of [[.22,-.42,-.5],[.57,0,0],[.96,.42,.5]]){
    apply(group,source,destination,sampleOpeningHandoff(progress*projectOpeningTiming.disc));
    const angles=new THREE.Euler().setFromQuaternion(group.quaternion,'XYZ');
    assert.ok(Math.abs(angles.x-x)<1e-7);assert.ok(Math.abs(angles.y-y)<1e-7);
  }
  apply(group,source,destination,sampleOpeningHandoff(projectOpeningTiming.disc));
  assert.ok(group.position.distanceTo(destination.position)<1e-10);assert.equal(group.scale.x,0);assert.equal(group.visible,false);
});

test('portrait and incoming queue advance continuously at 60 Hz; all nine discs are fully restored before completion',()=>{
  let previous=sampleOpeningHandoff(0,9);
  for(let t=1/60;t<2;t+=1/60){
    const frame=sampleOpeningHandoff(t,9);
    assert.ok(frame.scale<=previous.scale&&previous.scale-frame.scale<.07);
    for(let i=0;i<9;i++){
      assert.ok(frame.queueReveal(i)>=previous.queueReveal(i));
      assert.ok(frame.queueReveal(i)-previous.queueReveal(i)<.06);
      if(frame.complete)assert.equal(frame.queueReveal(i),1);
    }
    previous=frame;
  }
  assert.equal(previous.complete,true);
  assert.equal(sampleOpeningHandoff(.5,9).informationReady,false);
  const info=sampleOpeningHandoff(openingHandoffTiming.informationAt,9);
  assert.equal(info.informationReady,true);assert.equal(info.galleryReady,true);
});
