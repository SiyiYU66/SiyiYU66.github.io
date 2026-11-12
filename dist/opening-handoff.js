import {projectOpeningTiming,sampleProjectOpening} from './project-transition.js';
import * as THREE from './vendor/three.module.js';

const clamp=v=>Math.max(0,Math.min(1,v));
const ease=v=>{const t=clamp(v);return t*t*t*(t*(t*6-15)+10);};
// The portrait uses the same shrink/opposite-lean clock as opening a project.
// Reveal the collection only once that portrait is almost physically collapsed.
export const openingHandoffTiming=Object.freeze({disc:projectOpeningTiming.disc,queueAt:.98,queueDuration:.60,stagger:.028,informationAt:1.05});
export function sampleOpeningHandoff(time,count=1){
  const t=Math.max(0,time),p=clamp(t/openingHandoffTiming.disc),disc=sampleProjectOpening(p);
  const duration=openingHandoffTiming.queueAt+openingHandoffTiming.queueDuration+Math.max(0,count-1)*openingHandoffTiming.stagger;
  return {
    time:t,duration,handoff:clamp(t/duration),complete:t>=duration,
    // First pick up the nearly frontal portrait into the collection's left lean;
    // then turn through frontal into the matching right lean before it vanishes.
    pickup:ease(p/.22),frontal:ease((p-.22)/.35),opposite:disc.opposite,
    centre:disc.center,scale:disc.scale,
    boardOpacity:1-ease(t/.24),armOpacity:1-ease(t/.28),
    galleryReady:t>=openingHandoffTiming.queueAt,informationReady:t>=openingHandoffTiming.informationAt,
    queueReveal:index=>ease((t-openingHandoffTiming.queueAt-index*openingHandoffTiming.stagger)/openingHandoffTiming.queueDuration)
  };
}

export function createOpeningDiscPose(){
  const angles=new THREE.Euler(),left=new THREE.Quaternion(),right=new THREE.Quaternion(),front=new THREE.Quaternion();
  return (group,source,destination,frame)=>{
    angles.setFromQuaternion(destination.quaternion,'XYZ');
    left.setFromEuler(new THREE.Euler(angles.x,angles.y,0));
    right.setFromEuler(new THREE.Euler(-angles.x,-angles.y,0));
    group.position.copy(source.position).lerp(destination.position,frame.centre);
    group.quaternion.copy(source.quaternion).slerp(left,frame.pickup).slerp(front,frame.frontal).slerp(right,frame.opposite);
    group.scale.setScalar(source.scale*frame.scale);
    group.visible=frame.scale>.00001;
  };
}
