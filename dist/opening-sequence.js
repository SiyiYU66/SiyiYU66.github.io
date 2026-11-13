import * as THREE from './vendor/three.module.js';
import {openingLayout} from './opening-motion.js';
import {createOpeningFlaps} from './opening-flaps.js';
import {recordSurfaceCanvases} from './turntable-art.js';
import {addFilmGrain,createLocalGlow} from './night-room.js';
import {sampleOpeningHandoff,createOpeningDiscPose} from './opening-handoff.js';

// Uses the Projects renderer, camera and environment. No second WebGL context.
export function createOpeningSequence({root,scene,camera,artwork,getDestination,projectCount=1,isGalleryReady=()=>true,onGallery=()=>{},onHandoff,onComplete,review=false}){
  const overlay=document.createElement('div');overlay.className='opening-overlay';
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label','Siyi Yu — Portfolio opening');
  overlay.setAttribute('aria-modal','true');
  overlay.tabIndex=-1;
  overlay.innerHTML='<svg class="opening-score" aria-hidden="true"></svg><span class="opening-a11y">SIYI YU</span><button class="opening-skip">Skip intro ↗</button>';
  root.append(overlay);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let handoffStart=null,heldSpin=0,handoffRequested=false;
  const flaps=createOpeningFlaps(overlay,{reduced,review,onComplete(){handoffRequested=true;}});
  overlay.querySelector('.opening-score').remove();
  const group=new THREE.Group(),spin=new THREE.Group();group.add(spin);scene.add(group);
  const texture=new THREE.CanvasTexture(artwork);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
  const wear=recordSurfaceCanvases({pictureDisc:true,seed:0x51a17e});
  const normalMap=new THREE.CanvasTexture(wear.normal),roughnessMap=new THREE.CanvasTexture(wear.roughness);
  normalMap.colorSpace=roughnessMap.colorSpace=THREE.NoColorSpace;normalMap.anisotropy=roughnessMap.anisotropy=8;
  const vinylMaterial=new THREE.MeshPhysicalMaterial({map:texture,color:'#ded8cd',normalMap,normalScale:new THREE.Vector2(.2,.2),roughnessMap,roughness:.36,metalness:.08,clearcoat:.45,clearcoatRoughness:.23,clearcoatNormalMap:normalMap,clearcoatNormalScale:new THREE.Vector2(.17,.17),side:THREE.DoubleSide,transparent:true,forceSinglePass:true});
  addFilmGrain(vinylMaterial);
  const vinyl=new THREE.Mesh(new THREE.CircleGeometry(1,192),vinylMaterial);spin.add(vinyl);
  const edgeMaterial=new THREE.MeshStandardMaterial({color:'#181818',metalness:.55,roughness:.28,transparent:true});
  const edge=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.026,192,1,true).rotateX(Math.PI/2),edgeMaterial);spin.add(edge);
  // Stationary tonearm, deliberately independent of the rotating record.
  const arm=new THREE.Group();scene.add(arm);
  const armMaterial=new THREE.MeshStandardMaterial({color:'#aeb2b7',metalness:.95,roughness:.23,transparent:true});
  const armRod=new THREE.Mesh(new THREE.CylinderGeometry(.009,.009,1,12),armMaterial);arm.add(armRod);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.045,.12,.035),new THREE.MeshStandardMaterial({color:'#252627',roughness:.33,metalness:.4,transparent:true}));arm.add(head);
  const needle=new THREE.Mesh(new THREE.CylinderGeometry(.002,.002,.075,8),armMaterial);arm.add(needle);
  const needleGlow=createLocalGlow({size:.1,opacity:.17});scene.add(needleGlow);
  const pulse=new THREE.Mesh(new THREE.RingGeometry(.028,.035,48),new THREE.MeshBasicMaterial({color:'#fff6dc',transparent:true,opacity:0,depthWrite:false}));scene.add(pulse);
  const initialQuaternion=new THREE.Quaternion().setFromEuler(new THREE.Euler(.025,-.025,0));
  const applyDiscPose=createOpeningDiscPose();
  const materials=[vinylMaterial,edgeMaterial,armMaterial,head.material];
  const lamp=scene.userData.nightLamp,lampIntensity=lamp?.intensity,lampColor=lamp?.color.clone();
  // Opening-only soft warm fill preserves pencil contrast without clipping the paper.
  const ownsPortraitFill=!scene.userData.openingPortraitFill;
  const portraitFill=scene.userData.openingPortraitFill||new THREE.DirectionalLight('#fff0de',0);
  if(ownsPortraitFill){portraitFill.position.set(-1,1,5);scene.add(portraitFill);}
  portraitFill.intensity=.85;
  if(lamp)lamp.color.set('#fff0de');
  let start=performance.now(),done=false,handed=false,galleryStarted=false,layout;
  const pixelToWorld=(x,y,z=0)=>{
    const viewH=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*(camera.position.z-z);
    return new THREE.Vector3((x/layout.width-.5)*viewH*camera.aspect,(.5-y/layout.height)*viewH,z);
  };
  function finish(skipped=false){
    if(done)return;done=true;
    if(!galleryStarted){galleryStarted=true;onGallery();}
    if(!handed){handed=true;onHandoff();}
    document.body.dataset.openingPhase=skipped?'skipped':'complete';
    window.removeEventListener('keydown',key,true);overlay.removeEventListener('click',skip);
    flaps.destroy();scene.remove(group,arm,pulse,needleGlow);portraitFill.intensity=0;if(ownsPortraitFill)scene.remove(portraitFill);overlay.remove();if(lamp){lamp.intensity=lampIntensity;lamp.color.copy(lampColor);}
    group.traverse(o=>o.geometry?.dispose());arm.traverse(o=>o.geometry?.dispose());pulse.geometry.dispose();pulse.material.dispose();
    [...new Set(materials)].forEach(m=>m.dispose());texture.dispose();normalMap.dispose();roughnessMap.dispose();needleGlow.material.map.dispose();needleGlow.material.dispose();
    onComplete();
  }
  function skip(e){e.preventDefault();e.stopPropagation();finish(true);}
  function key(e){if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();finish(true);}}
  overlay.addEventListener('click',skip);window.addEventListener('keydown',key,true);
  overlay.focus({preventScroll:true});
  function update(){
    if(done)return {handoff:1,queueReveal:()=>1,complete:true};
    if(handoffRequested&&handoffStart===null&&isGalleryReady()){heldSpin=spin.rotation.z;handoffStart=performance.now();}
    layout=openingLayout(root.clientWidth,root.clientHeight);
    const time=(performance.now()-start)/1000;
    const elapsed=handoffStart===null?0:(performance.now()-handoffStart)/1000;
    const s=sampleOpeningHandoff(reduced&&handoffStart!==null?100:elapsed,projectCount);
    s.complete=handoffStart!==null&&s.complete;
    s.phase=handoffStart===null?flaps.phase:s.galleryReady?'gallery':'handoff';
    const source=pixelToWorld(layout.centre.x,layout.centre.y),radiusWorld=pixelToWorld(layout.centre.x+layout.radius,layout.centre.y).x-source.x;
    const dest=getDestination();
    applyDiscPose(group,{position:source,quaternion:initialQuaternion,scale:radiusWorld},dest,s);
    // ~3.4 degrees/second: the face stays in the upper half throughout reading.
    // Keep the exact photographed angle when the handoff begins; never unwind
    // the portrait back to zero or dissolve it over a different project cover.
    spin.rotation.z=reduced?0:handoffStart===null?-time*.06:heldSpin;
    portraitFill.intensity=.85*(1-s.pickup);
    const contact=pixelToWorld(layout.contact.x,layout.contact.y,.055);
    needleGlow.position.copy(contact);needleGlow.material.opacity=.17*s.armOpacity;needleGlow.visible=s.armOpacity>.001;
    armMaterial.opacity=head.material.opacity=s.armOpacity;
    const armTop=pixelToWorld(layout.contact.x+layout.radius*.37,layout.contact.y-layout.radius*.41,.10);
    const direction=new THREE.Vector3().subVectors(armTop,contact);
    armRod.position.copy(contact).add(armTop).multiplyScalar(.5);armRod.scale.y=direction.length();armRod.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
    head.position.copy(contact).add(new THREE.Vector3(.016,.045,.01));head.rotation.z=-.4;
    const needleLift=(1-Math.min(1,time/.12))*.045;
    needle.position.copy(contact).add(new THREE.Vector3(0,.012,needleLift));needle.rotation.x=Math.PI/2;
    arm.visible=s.armOpacity>.001;
    pulse.visible=false;
    flaps.element.style.opacity=String(s.boardOpacity);
    Object.assign(document.body.dataset,{openingPhase:s.phase,openingTime:time.toFixed(3),openingName:flaps.element.dataset.settled||'',openingHandoff:elapsed.toFixed(3),openingDiscScale:s.scale.toFixed(4)});
    if(s.galleryReady&&!galleryStarted){galleryStarted=true;if(lamp)lamp.color.copy(lampColor);onGallery();}
    if(s.informationReady&&!handed){handed=true;onHandoff();}
    if(s.complete)finish();
    return s;
  }
  update();
  return {update,finish,get done(){return done;},destroy(){finish(true);}};
}
