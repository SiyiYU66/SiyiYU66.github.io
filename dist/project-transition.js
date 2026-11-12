import * as THREE from './vendor/three.module.js';
import {copyDiscRenderTree} from './disc-render-copy.js';

// Seconds, measured against the supplied A24 capture. The image remains readable
// before its final collapse; the page and the carried mesh share this clock.
export const projectOpeningTiming=Object.freeze({disc:1.02,title:.60,rules:.69,credits:.76,melt:.86});
const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=value=>{const t=clamp(value);return t*t*t*(t*(t*6-15)+10);};
export function sampleProjectOpening(progress){
  const p=clamp(progress);
  return {
    center:smooth((p-.08)/.60),
    face:smooth(p/.57),
    opposite:smooth((p-.57)/.39),
    scale:(1-.025*smooth(p/.48))*(1-smooth((p-.48)/.51)),
    neighbour:index=>1-smooth((p-.055-index*.018)/.32)
  };
}

// The clicked mesh is carried in world space; no duplicate texture or second
// renderer. Its start pose includes the gallery tilt and the last pointer tilt.
export function createProjectTransition({scene,camera,model,others,renderer,gsap,reduced=false,onCleanup=()=>{}}){
  model.perno.updateWorldMatrix(true,false);
  const anchor=new THREE.Group(),disc=copyDiscRenderTree(model.perno);
  model.perno.matrixWorld.decompose(anchor.position,anchor.quaternion,anchor.scale);
  disc.position.set(0,0,0);disc.quaternion.identity();disc.scale.setScalar(1);anchor.add(disc);scene.add(anchor);
  const start=anchor.position.clone(),scale=anchor.scale.clone(),sourceVisible=model.esterno.visible;
  const angles=new THREE.Euler().setFromQuaternion(anchor.quaternion,'XYZ');
  const face=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,angles.z,'XYZ'));
  const end=new THREE.Quaternion().setFromEuler(new THREE.Euler(-angles.x,-angles.y,angles.z,'XYZ'));
  const original=anchor.quaternion.clone(),motion={p:0};
  const saved=others.map(d=>({d,visible:d.esterno.visible,scale:d.esterno.scale.clone()}));
  model.esterno.visible=false;
  const target=new THREE.Vector3(0,-.15,0);
  let cleaned=false;
  const cleanup=()=>{if(cleaned)return;cleaned=true;scene.remove(anchor);model.esterno.visible=sourceVisible;saved.forEach(({d,visible,scale})=>{d.esterno.visible=visible;d.esterno.scale.copy(scale);});onCleanup();};
  renderer.render(scene,camera);
  const timeline=gsap.timeline({onComplete:cleanup,onInterrupt:cleanup});
  timeline.to(motion,{p:1,duration:reduced?0:projectOpeningTiming.disc,ease:'none',onUpdate(){
    const pose=sampleProjectOpening(motion.p);
    anchor.position.copy(start).lerp(target,pose.center);
    // The reference carries the printed face through a frontal pose into a
    // matching opposite lean. It does not expose the silver back for a full turn.
    anchor.quaternion.copy(original).slerp(face,pose.face).slerp(end,pose.opposite);
    anchor.scale.copy(scale).multiplyScalar(pose.scale);
    saved.forEach(({d,visible,scale},index)=>{const size=pose.neighbour(index);d.esterno.scale.copy(scale).multiplyScalar(size);d.esterno.visible=visible&&size>.0001;});
    renderer.render(scene,camera);
  }});
  return timeline;
}
