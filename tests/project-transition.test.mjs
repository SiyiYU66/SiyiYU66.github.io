import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createProjectTransition,sampleProjectOpening,projectOpeningTiming} from '../dist/project-transition.js';

function setup(){
  const scene=new THREE.Scene(),queue=new THREE.Group();queue.rotation.set(-.42,-.5,0);scene.add(queue);
  const esterno=new THREE.Group(),perno=new THREE.Group();queue.add(esterno);esterno.add(perno);
  const geometry=new THREE.CircleGeometry(1),material=new THREE.MeshStandardMaterial();
  perno.add(new THREE.Mesh(geometry,material));
  perno.children[0].userData.disc={perno}; // Real gallery raycast ownership is circular.
  const neighbour=new THREE.Group();neighbour.position.y=-.05;neighbour.scale.set(.8,.9,1);queue.add(neighbour);
  scene.updateMatrixWorld(true);
  const before=new THREE.Vector3();perno.getWorldPosition(before);
  const gsap={timeline(options){return {to(target,tween){this.sample=p=>{target.p=p;tween.onUpdate();};return this;},kill(){options.onInterrupt();},complete(){options.onComplete();}};}};
  let renders=0;
  const timeline=createProjectTransition({scene,camera:new THREE.PerspectiveCamera(),model:{esterno,perno},others:[{esterno:neighbour}],renderer:{render(){renders++;}},gsap});
  return {scene,queue,esterno,perno,neighbour,geometry,material,timeline,before,get renders(){return renders;}};
}
test('project transition starts at the exact clicked world pose and reuses its printed material',()=>{
  const h=setup(),anchor=h.scene.children.find(c=>c!==h.queue);
  h.timeline.sample(0);
  assert.ok(anchor.position.distanceTo(h.before)<1e-8);
  assert.equal(anchor.children[0].children[0].material,h.material);
  const start=new THREE.Euler().setFromQuaternion(anchor.quaternion);
  assert.ok(Math.abs(start.y+.5)<1e-8);
  h.timeline.sample(.4);
  assert.ok(anchor.scale.x>.97,'printed face stays readable during the first half');
  assert.ok(h.neighbour.scale.x<.01,'neighbours recede before the selected disc');
  h.timeline.sample(.57);
  assert.ok(anchor.scale.x>.9,'frontal pose precedes rapid collapse');
  assert.ok(Math.abs(new THREE.Euler().setFromQuaternion(anchor.quaternion).y)<1e-8);
  h.timeline.sample(.96);
  const end=new THREE.Euler().setFromQuaternion(anchor.quaternion);
  assert.ok(Math.abs(end.y-.5)<1e-8);assert.ok(Math.abs(end.x-.42)<1e-8);
  assert.ok(anchor.scale.x<.01);assert.equal(h.renders,5);
});
test('reference timing keeps a continuous hold, frontal turn and opposite lean',()=>{
  assert.equal(projectOpeningTiming.disc,1.02);
  assert.ok(projectOpeningTiming.title<projectOpeningTiming.rules&&projectOpeningTiming.rules<projectOpeningTiming.credits);
  let previousScale=1;
  for(let n=0;n<=100;n++){
    const pose=sampleProjectOpening(n/100);
    assert.ok(pose.scale<=previousScale+1e-10&&pose.scale>=0);
    if(n>0)assert.ok(previousScale-pose.scale<.04,'no scale discontinuity');
    previousScale=pose.scale;
  }
  assert.equal(sampleProjectOpening(0).scale,1);
  assert.equal(sampleProjectOpening(1).scale,0);
  assert.equal(sampleProjectOpening(.96).opposite,1);
});
test('interrupted and completed transitions restore neighbours without disposing shared assets',()=>{
  for(const stop of ['kill','complete']){
    const h=setup();let disposed=false;h.material.addEventListener('dispose',()=>{disposed=true;});
    h.timeline.sample(.5);assert.equal(h.neighbour.visible,false);
    h.timeline[stop]();assert.equal(h.scene.children.length,1);
    assert.equal(h.esterno.visible,true);assert.equal(h.neighbour.visible,true);
    assert.equal(h.neighbour.position.y,-.05);assert.equal(disposed,false);
    assert.deepEqual(h.neighbour.scale.toArray(),[.8,.9,1]);
  }
});
