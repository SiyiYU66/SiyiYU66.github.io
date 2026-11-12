import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.js';
import {nextDiscPose,NextDiscDynamics,NextProjectGesture} from '../dist/detail-next-motion.js';
import {createDetailNextProject,placeNextDisc} from '../dist/detail-next-project.js';
import {discConfig} from '../dist/disc-config.js';
import {createDiscMarker} from '../dist/disc-marker.js';

test('detail title precedes its credit block and all metadata in document order',async()=>{
  const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
  const title=html.indexOf('id="detail-title"'),credit=html.indexOf('id="detail-credit"'),fields=html.indexOf('id="detail-fields"');
  assert.ok(title>0&&title<credit&&credit<fields);
  assert.ok(!html.includes('CONTINUE THE COLLECTION'));
});

test('the desktop cap rises with a subtle tilt correction and sinks below the viewport on departure',()=>{
  const rest=nextDiscPose(1280,720,0),raised=nextDiscPose(1280,720,1),exit=nextDiscPose(1280,720,1,1);
  assert.ok(rest.rise/720>.23&&rest.rise/720<.26);
  assert.ok(raised.rise/720>.32&&raised.rise/720<.36);
  assert.equal(rest.tiltX,discConfig.restRotation.x);
  assert.equal(rest.tiltY,discConfig.restRotation.y);
  assert.ok(raised.tiltX>rest.tiltX&&raised.tiltX-rest.tiltX<.09);
  assert.ok(raised.tiltY>rest.tiltY&&raised.tiltY-rest.tiltY<.12);
  assert.ok(exit.rise<0&&exit.radius<raised.radius/3);
});

test('Three.js projects the visible cap at the target height across desktop, mobile and exit poses',()=>{
  for(const [w,h] of [[1440,810],[390,844]])for(const [charge,departure] of [[0,0],[.4,0],[1,0],[1,.8],[1,1]]){
    const camera=new THREE.PerspectiveCamera(36,w/h,.1,50);camera.position.z=4.6;camera.updateMatrixWorld();
    const anchor=new THREE.Group(),pose=nextDiscPose(w,h,charge,departure);
    const units=2*Math.tan(36/360*Math.PI)*4.6/h;anchor.rotation.set(pose.tiltX,pose.tiltY,pose.tiltZ);
    placeNextDisc(anchor,camera,pose,w,h,units);
    let top=Infinity;
    for(let i=0;i<512;i++){
      const angle=i/512*Math.PI*2,p=new THREE.Vector3(Math.cos(angle),Math.sin(angle),0);
      anchor.localToWorld(p);p.project(camera);top=Math.min(top,(1-p.y)*h/2);
    }
    assert.ok(Math.abs(h-top-pose.rise)<.8);
  }
});

test('faster input spins the disc faster at the same charge; release restores idle without rewinding',()=>{
  const motion=new NextDiscDynamics(),slow=new NextDiscDynamics();let time=0;
  for(let i=0;i<60;i++){time+=1000/60;motion.update(1/60,time);}
  assert.ok(Math.abs(motion.angle-(-.28-discConfig.idleSpinRate))<1e-8);
  assert.equal(motion.gauge,0);
  for(let i=0;i<20;i++){
    time+=1000/60;
    if(i%3===0){motion.impulse(2.3,time,.7);slow.impulse(.35,time,.7);}
    motion.update(1/60,time);slow.update(1/60,time);
  }
  assert.ok(motion.velocity>slow.velocity&&slow.velocity>discConfig.idleSpinRate);
  assert.equal(motion.gauge,slow.gauge);assert.ok(motion.gauge>.6);
  const releaseAngle=motion.angle;motion.release();
  motion.update(1/60,time+=1000/60);assert.ok(motion.gauge<.7&&motion.gauge>0);
  for(let i=0;i<240;i++){time+=1000/60;motion.update(1/60,time);}
  assert.equal(motion.velocity,discConfig.idleSpinRate);assert.equal(motion.gauge,0);
  assert.ok(motion.angle<releaseAngle);
});

test('equal-distance slow and fast gestures advance at the same distance, regardless of packet size',()=>{
  const options={eligible:true,height:720,source:'wheel'};
  const swipe=interval=>{
    const gate=new NextProjectGesture();
    const samples=Array.from({length:12},(_,i)=>gate.feed(43,i*interval,options));
    assert.deepEqual(samples.map(result=>result.triggered),[...Array(11).fill(false),true]);
    assert.equal(samples.at(-1).charge,1);
    assert.equal(gate.feed(100,12*interval,options).triggered,false);
    return samples;
  };
  const fast=swipe(16),slow=swipe(112);
  assert.deepEqual(fast.map(result=>result.charge),slow.map(result=>result.charge));
  assert.ok(fast[6].speed>slow[6].speed);
  const coalesced=new NextProjectGesture();
  assert.equal(coalesced.feed(516,0,options).triggered,true);
});

test('fast short pulses, separate strokes and the decaying tail cannot fill the dial',()=>{
  const options={eligible:true,height:720,source:'wheel'};
  const brief=new NextProjectGesture();
  [150,150,150].forEach((delta,i)=>assert.equal(brief.feed(delta,i*12,options).triggered,false));
  const separated=new NextProjectGesture();
  for(const start of [0,320]){
    [100,100,100].forEach((delta,i)=>assert.equal(separated.feed(delta,start+i*24,options).triggered,false));
  }
  const tail=new NextProjectGesture();
  [110,110,110,50,40,30,...Array(12).fill(20)].forEach((delta,i)=>{
    assert.equal(tail.feed(delta,i*32,options).triggered,false);
  });
});

test('incoming reading inertia is ineligible and a renewed intentional swipe can advance',()=>{
  const options={eligible:true,height:720,source:'wheel'},gate=new NextProjectGesture();
  assert.equal(gate.feed(120,0,{...options,eligible:false}).triggered,false);
  Array(11).fill(80).forEach((delta,i)=>assert.equal(gate.feed(delta,34+i*34,options).charge,0));
  Array(7).fill(80).forEach((delta,i)=>assert.equal(gate.feed(delta,570+i*34,options).triggered,i===6));
  const renewed=new NextProjectGesture();
  [[70,0],[50,30],[20,80],[8,110]].forEach(([d,t])=>assert.equal(renewed.feed(d,t,options).triggered,false));
  Array(7).fill(80).forEach((delta,i)=>assert.equal(renewed.feed(delta,150+i*34,options).triggered,i===6));
});

test('passive touch can start after a stationary hold and complete a deliberate swipe',()=>{
  const gate=new NextProjectGesture(),options={eligible:true,height:720,source:'touch'};
  gate.begin(true);Array(11).fill(49).forEach((delta,i)=>assert.equal(gate.feed(delta,200+i*34,options).triggered,i===10));
});

test('a single ink stroke grows from the left over the cap and retracts along the same curve',()=>{
  const marker=createDiscMarker({random:()=>.5}),angles=[];
  let paths=0;
  const context={beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){paths++;}};
  const projectPoint=(angle,r)=>{angles.push(angle);return [Math.cos(angle)*r,Math.sin(angle)*r];};
  marker.drawGauge(context,{progress:0,projectPoint});assert.equal(angles.length,0);
  marker.drawGauge(context,{progress:1,projectPoint});
  const start=angles[0],end=angles.at(-1);
  assert.equal(paths,1);
  assert.ok(start>Math.PI/2&&end<Math.PI/2);
  angles.length=0;
  marker.drawGauge(context,{progress:.25,projectPoint});
  assert.equal(angles[0],start);
  assert.ok(angles.at(-1)>Math.PI/2);
});

function footerHarness(){
  const oldResize=globalThis.ResizeObserver,oldRatio=globalThis.devicePixelRatio,oldWidth=globalThis.innerWidth;
  const oldPerformance=Object.getOwnPropertyDescriptor(globalThis,'performance');let clock=0,strokes=0;
  Object.defineProperty(globalThis,'performance',{value:{now:()=>clock},configurable:true});
  globalThis.ResizeObserver=class {observe(){}disconnect(){}};
  globalThis.devicePixelRatio=1;globalThis.innerWidth=1280;
  class Element extends EventTarget{
    constructor(){super();this.children=[];this.dataset={};this.clientWidth=1280;this.clientHeight=720;this.offsetTop=0;this.offsetHeight=720;this.scrollTop=0;this.style={setProperty(){}};this.classList=new Set();this.classList.remove=this.classList.delete;}
    append(...nodes){for(const node of nodes){if(node.parentNode)node.parentNode.children=node.parentNode.children.filter(x=>x!==node);this.children.push(node);node.parentNode=this;}}
    getBoundingClientRect(){return {top:0,bottom:720,left:0,width:1280,height:720};}
  }
  const parent=new Element(),host=new Element(),section=new Element(),stage=new Element(),scroller=new Element(),button=new Element();
  section.offsetTop=3000;scroller.scrollHeight=3720;
  section.getBoundingClientRect=()=>({top:3000-scroller.scrollTop,bottom:3720-scroller.scrollTop,width:1280});
  const context={setTransform(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){strokes++;}};
  const canvas=new Element(),markerCanvas=new Element();markerCanvas.getContext=()=>context;parent.append(canvas,markerCanvas);
  const material=new THREE.MeshPhysicalMaterial({normalMap:new THREE.Texture()});let disposed=false;
  material.addEventListener('dispose',()=>{disposed=true;});
  const renderer={setPixelRatio(v){this.ratio=v;},getPixelRatio(){return this.ratio;},setSize(){},render(){},clear(){}};
  const ticks=new Set(),advances=[],gsap={ticker:{add(fn){ticks.add(fn);},remove(fn){ticks.delete(fn);}}};
  const footer=createDetailNextProject({section,stage,host,button,scroller,homeRoot:parent,renderer,canvas,markerCanvas,environment:null,gsap,
    onAdvance:id=>advances.push(id),
    copyProject(){const g=new THREE.Group();g.add(new THREE.Mesh(new THREE.CircleGeometry(1),material));return g;}});
  const dispatch=(type,props={},target=button)=>{const e=new Event(type,{cancelable:true});Object.defineProperty(e,'timeStamp',{value:clock});Object.assign(e,props);target.dispatchEvent(e);return e;};
  function advance(milliseconds){
    const end=clock+milliseconds;
    while(clock<end){const dt=Math.min(16,end-clock);clock+=dt;[...ticks].forEach(fn=>fn(clock/1000,dt));}
  }
  const scrollBy=delta=>{scroller.scrollTop=Math.max(0,Math.min(3000,scroller.scrollTop+delta));dispatch('scroll',{},scroller);};
  const wheel=(delta,elapsed=32)=>{advance(elapsed);dispatch('wheel',{deltaY:delta,deltaX:0,deltaMode:0,ctrlKey:false},scroller);scrollBy(delta);};
  return {footer,parent,host,section,stage,scroller,button,canvas,markerCanvas,material,ticks,advances,
    dispatch,advance,scrollBy,wheel,get strokes(){return strokes;},get disposed(){return disposed;},
    enter(){scroller.scrollTop=3000;footer.setProject('slow-forms');footer.activate();},
    close(){footer.destroy();globalThis.ResizeObserver=oldResize;globalThis.devicePixelRatio=oldRatio;globalThis.innerWidth=oldWidth;Object.defineProperty(globalThis,'performance',oldPerformance);}
  };
}

test('footer borrows one renderer, preserves ID and surface maps, and releases input/canvas on every exit',()=>{
  const h=footerHarness(),{footer,parent,host,section,scroller,canvas,markerCanvas,material,ticks}=h;
  try{
    for(const id of ['slow-forms','a-quiet-place','between-spaces']){
      scroller.scrollTop=0;footer.setProject(id);footer.activate();assert.equal(ticks.size,0);
      scroller.scrollTop=3000;scroller.dispatchEvent(new Event('scroll'));
      assert.equal(canvas.parentNode,host);assert.equal(ticks.size,1);
      [...ticks][0](1,16);
      assert.equal(footer.transitionSource('missing-id'),null);
      const source=footer.transitionSource(id);
      assert.equal(source.perno.children[0].children[0].material,material);
      assert.ok(source.perno.position.y<0);
      h.dispatch('pointerdown',{clientX:10,clientY:10,pointerType:'touch'});
      h.dispatch('pointermove',{clientX:11,clientY:45,pointerType:'touch'});
      assert.equal(footer.canOpen({detail:1}),false);assert.equal(footer.canOpen({detail:0}),true);
      footer.deactivate();assert.equal(ticks.size,0);assert.equal(canvas.parentNode,parent);
      assert.equal(markerCanvas.parentNode,parent);assert.equal(footer.diagnostics.listeners,0);
      scroller.dispatchEvent(new Event('scroll'));assert.equal(ticks.size,0);
    }
    assert.equal(h.disposed,false);
  }finally{h.close();}
});

test('a short wheel swipe lifts the disc, then height, tilt and ink return to idle at the same scroll position',()=>{
  const h=footerHarness();try{
    h.enter();h.advance(1000);assert.equal(h.strokes,0);
    const restingHeight=h.section.dataset.screenExposure;
    assert.equal(h.section.dataset.tiltY,'-0.5000');
    h.wheel(60,16);h.wheel(45,32);h.wheel(18,32);
    h.advance(32);
    assert.ok(h.footer.diagnostics.velocity>discConfig.idleSpinRate);assert.equal(h.footer.diagnostics.queued,false);
    assert.ok(Number(h.section.dataset.screenExposure)>Number(restingHeight));
    assert.ok(h.strokes>0);
    assert.equal(h.scroller.scrollTop,3000);
    h.advance(4000);
    assert.equal(h.section.dataset.screenExposure,restingHeight);
    assert.equal(h.section.dataset.gaugeProgress,'0.0000');assert.equal(h.section.dataset.tiltY,'-0.5000');
    assert.equal(h.footer.diagnostics.velocity,discConfig.idleSpinRate);
    const angle=Number(h.section.dataset.angle),strokes=h.strokes;h.advance(1000);
    assert.ok(Number(h.section.dataset.angle)<angle);assert.equal(h.strokes,strokes);
    assert.equal(h.advances.length,0);
  }finally{h.close();}
});

test('light repeated wheel pulses keep drawing without flicker or a sharp tilt',()=>{
  const h=footerHarness();try{
    h.enter();
    const restTilt=Number(h.section.dataset.tiltY);
    let previousGauge=0;
    for(let frame=0;frame<34;frame++){
      if(frame%7===0)h.wheel(12,16);
      else h.advance(16);
      const gauge=h.footer.diagnostics.gauge;
      assert.ok(gauge>=previousGauge-.0001);
      assert.ok(gauge-previousGauge<.03);
      assert.ok(Math.abs(Number(h.section.dataset.tiltY)-restTilt)<.025);
      previousGauge=gauge;
    }
    assert.ok(previousGauge>.02);
    assert.equal(h.footer.diagnostics.queued,false);
  }finally{h.close();}
});

test('a completed stroke is held before the disc sinks out of view and advances once',()=>{
  const h=footerHarness();try{
    h.enter();for(let pulse=0;pulse<7;pulse++)h.wheel(80,34);
    assert.equal(h.footer.diagnostics.queued,true);assert.equal(h.advances.length,0);
    h.advance(180);assert.equal(h.stage.classList.has('is-leaving'),false);
    for(let frame=0;frame<40&&!h.stage.classList.has('is-leaving');frame++)h.advance(16);
    assert.equal(h.stage.classList.has('is-leaving'),true);
    assert.ok(Number(h.section.dataset.gaugeProgress)>=.98);
    h.advance(330);
    assert.ok(Number(h.section.dataset.screenExposure)<.26);assert.equal(h.advances.length,0);
    h.advance(220);assert.deepEqual(h.advances,['slow-forms']);
    h.wheel(80,16);h.advance(300);assert.equal(h.advances.length,1);
  }finally{h.close();}
});

test('reversal or leaving during the completed-dial hold cancels automatic navigation',()=>{
  for(const leave of [false,true]){
    const h=footerHarness();try{
      h.enter();for(let pulse=0;pulse<7;pulse++)h.wheel(80,34);
      if(leave)h.footer.deactivate();else h.wheel(-80,32);
    h.advance(700);assert.equal(h.advances.length,0);assert.equal(h.footer.diagnostics.queued,false);
      if(leave){assert.equal(h.canvas.parentNode,h.parent);assert.equal(h.ticks.size,0);}
    }finally{h.close();}
  }
});

test('native touch pan survives pointercancel; released inertial scroll does not keep adding force',()=>{
  const h=footerHarness();try{
    h.enter();h.dispatch('pointerdown',{clientX:100,clientY:600,pointerType:'touch'});
    h.dispatch('touchstart',{touches:[{clientX:100,clientY:600}]},h.scroller);
    h.advance(16);h.dispatch('touchmove',{touches:[{clientX:100,clientY:540}]},h.scroller);h.scrollBy(60);
    h.dispatch('pointercancel');h.advance(32);h.dispatch('touchmove',{touches:[{clientX:100,clientY:500}]},h.scroller);h.scrollBy(40);
    h.dispatch('touchend',{touches:[]},h.scroller);h.advance(16);let velocity=h.footer.diagnostics.velocity;
    for(let i=0;i<10;i++){h.advance(32);h.scrollBy(20);assert.ok(h.footer.diagnostics.velocity<=velocity);velocity=h.footer.diagnostics.velocity;}
    assert.equal(h.footer.canOpen({detail:1}),false);assert.equal(h.advances.length,0);
    h.advance(4000);assert.equal(h.section.dataset.gaugeProgress,'0.0000');assert.equal(h.section.dataset.screenExposure,'0.2460');
  }finally{h.close();}
});

test('a long touch pan advances despite native pointer cancellation',()=>{
  const h=footerHarness();try{
    h.enter();h.dispatch('pointerdown',{clientX:100,clientY:650,pointerType:'touch'});
    h.dispatch('touchstart',{touches:[{clientX:100,clientY:650}]},h.scroller);h.dispatch('pointercancel');
    for(let i=0;i<12;i++){
      const y=650-49*(i+1);
      h.advance(i===0?16:34);h.dispatch('touchmove',{touches:[{clientX:100,clientY:y}]},h.scroller);h.scrollBy(49);
    }
    h.dispatch('touchend',{touches:[]},h.scroller);h.advance(1000);assert.deepEqual(h.advances,['slow-forms']);
  }finally{h.close();}
});


test('footer captures downward wheel and touch force without moving the page; upward input remains readable',()=>{
  const h=footerHarness();try{
    h.enter();
    const down=h.dispatch('wheel',{deltaY:55,deltaX:0,deltaMode:0,ctrlKey:false},h.scroller);
    assert.equal(down.defaultPrevented,true);assert.equal(h.scroller.scrollTop,3000);
    h.advance(32);assert.ok(h.footer.diagnostics.velocity>discConfig.idleSpinRate);
    h.dispatch('touchstart',{touches:[{clientX:100,clientY:600}]},h.scroller);
    const touch=h.dispatch('touchmove',{touches:[{clientX:100,clientY:550}]},h.scroller);
    assert.equal(touch.defaultPrevented,true);assert.equal(h.scroller.scrollTop,3000);
    const up=h.dispatch('wheel',{deltaY:-60,deltaX:0,deltaMode:0,ctrlKey:false},h.scroller);
    assert.equal(up.defaultPrevented,false);assert.equal(h.footer.diagnostics.queued,false);
    h.scroller.scrollTop=2600;
    const reading=h.dispatch('wheel',{deltaY:55,deltaX:0,deltaMode:0,ctrlKey:false},h.scroller);
    assert.equal(reading.defaultPrevented,false);
  }finally{h.close();}
});
