import * as THREE from './vendor/three.module.js';
import {InteractionScope} from './interaction-scope.js';
import {TurntableMotion,turntableConfig,needlePosition,entryYaw,contactPitch} from './turntable-motion.js';
import {woodCanvas,brushedCanvas,badgeCanvas,recordSurfaceCanvases} from './turntable-art.js';
import {createNightEnvironment,addNightLamp,addFilmGrain,createLocalGlow,createNeedleFocus,bindRoomTheme} from './night-room.js';

export function createTurntable({root,artwork,canInteract=()=>true,onState=()=>{},reducedMotion=false}){
  const config=turntableConfig,canvas=root.querySelector('canvas'),gsap=window.gsap;
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-7,7,4,-4,.1,60);
  camera.position.set(7.5,11.5,12);camera.lookAt(0,1.3,0);
  const geometries=new Set(),materials=new Set(),textures=new Set();
  function geometry(g){geometries.add(g);return g;}
  function material(m){materials.add(m);return m;}
  function texture(canvas){const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;textures.add(t);return t;}
  function mesh(parent,g,m,position=[0,0,0]){const object=new THREE.Mesh(geometry(g),m);object.position.set(...position);object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;}
  function box(parent,w,h,d,m,p){return mesh(parent,new THREE.BoxGeometry(w,h,d),m,p);}
  function cylinder(parent,r,h,m,p,rTop=r){return mesh(parent,new THREE.CylinderGeometry(rTop,r,h,96,1),m,p);}
  const metal=material(new THREE.MeshPhysicalMaterial({color:'#c7cdd1',metalness:.95,roughness:.24,clearcoat:.45}));
  const chrome=material(new THREE.MeshPhysicalMaterial({color:'#e2e7e9',metalness:1,roughness:.16,clearcoat:.6}));
  const dark=material(new THREE.MeshStandardMaterial({color:'#201e1a',metalness:.35,roughness:.52}));
  const rubber=material(new THREE.MeshStandardMaterial({color:'#151412',roughness:.94}));
  const brass=material(new THREE.MeshPhysicalMaterial({color:'#baab8d',metalness:.8,roughness:.26}));
  const paper=material(new THREE.MeshStandardMaterial({color:'#dad8c7',roughness:.93}));
  const grainTexture=texture(woodCanvas());grainTexture.wrapS=grainTexture.wrapT=THREE.RepeatWrapping;grainTexture.repeat.set(.35,.35);
  const wood=material(new THREE.MeshPhysicalMaterial({map:grainTexture,roughness:.48,metalness:0,clearcoat:.24,clearcoatRoughness:.4}));
  const brushed=material(new THREE.MeshPhysicalMaterial({map:texture(brushedCanvas()),color:'#d5dce0',metalness:1,roughness:.3,clearcoat:.3}));
  [metal,chrome,dark,rubber,brass,paper,wood,brushed].forEach(m=>addFilmGrain(m,{amount:.009}));
  const machine=new THREE.Group();scene.add(machine);

  function roundedPlinth(){
    const b=.045,w=5.55-2*b,d=3.85-2*b,r=.11;
    const shape=new THREE.Shape();shape.moveTo(-w/2+r,-d/2);shape.lineTo(w/2-r,-d/2);shape.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);shape.lineTo(w/2,d/2-r);shape.quadraticCurveTo(w/2,d/2,w/2-r,d/2);shape.lineTo(-w/2+r,d/2);shape.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);shape.lineTo(-w/2,-d/2+r);shape.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);
    const body=mesh(machine,new THREE.ExtrudeGeometry(shape,{depth:.44-2*b,steps:1,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:4,curveSegments:8}),wood,[0,.10+b,0]);
    body.rotation.x=-Math.PI/2;return body;
  }
  roundedPlinth();
  for(const x of [-2.18,2.18])for(const z of [-1.39,1.39])cylinder(machine,.22,.15,rubber,[x,.085,z]);
  const badge=mesh(machine,new THREE.PlaneGeometry(2.8,.35),material(new THREE.MeshBasicMaterial({map:texture(badgeCanvas()),transparent:true,depthWrite:false})),[-.75,.30,1.927]);badge.castShadow=false;
  const ledMaterial=material(new THREE.MeshBasicMaterial({color:'#5d4227'}));
  mesh(machine,new THREE.SphereGeometry(.032,12,8),ledMaterial,[2.14,.31,1.932]);
  const powerGlow=createLocalGlow({color:'#e9a646',size:.19,opacity:0});powerGlow.position.set(2.14,.31,1.95);machine.add(powerGlow);
  materials.add(powerGlow.material);textures.add(powerGlow.material.map);
  cylinder(machine,.19,.035,dark,[-2.11,.56,1.27]);cylinder(machine,.135,.075,metal,[-2.11,.61,1.27]);
  cylinder(machine,.06,.018,brass,[-2.11,.656,1.27]);

  const p=config.platter;
  cylinder(machine,1.50,.065,dark,[p.x,.585,p.z]);
  const rotor=new THREE.Group();rotor.position.set(p.x,0,p.z);machine.add(rotor);
  cylinder(rotor,p.radius,.145,brushed,[0,.6725,0]);
  cylinder(rotor,1.365,.026,rubber,[0,.758,0]);
  for(const y of [.64,.70]){
    const ticks=new THREE.InstancedMesh(geometry(new THREE.BoxGeometry(.021,.019,.008)),dark,108);ticks.castShadow=true;rotor.add(ticks);
    const helper=new THREE.Object3D();
    for(let n=0;n<108;n++){const t=n*Math.PI*2/108;helper.position.set(Math.sin(t)*(p.radius+.002),y,Math.cos(t)*(p.radius+.002));helper.rotation.y=t;helper.updateMatrix();ticks.setMatrixAt(n,helper.matrix);}
  }
  // The spindle belongs to the fixed chassis, never to the rotating platter.
  cylinder(machine,.032,.204,chrome,[p.x,.873,p.z]);
  mesh(machine,new THREE.SphereGeometry(.032,16,12),chrome,[p.x,.975,p.z]);

  const sleeve=new THREE.Group();sleeve.position.set(...config.sleeve.position);sleeve.rotation.set(...config.sleeve.rotation);scene.add(sleeve);
  const sleeveFace=material(new THREE.MeshStandardMaterial({map:texture(artwork.sleeve),roughness:.84}));
  addFilmGrain(sleeveFace,{amount:.008});
  const coverSides=[paper,paper,paper,paper,sleeveFace,paper];
  box(sleeve,config.sleeve.size,config.sleeve.size,.018,coverSides,[0,0,.066]);
  box(sleeve,config.sleeve.size,config.sleeve.size,.018,paper,[0,0,-.066]);
  box(sleeve,config.sleeve.size,.018,.15,paper,[0,config.sleeve.size/2,0]);
  box(sleeve,config.sleeve.size,.018,.15,paper,[0,-config.sleeve.size/2,0]);
  box(sleeve,.018,config.sleeve.size,.15,paper,[-config.sleeve.size/2,0,0]);
  sleeve.traverse(object=>{if(object.isMesh){object.castShadow=false;object.receiveShadow=false;}});
  // The +X side is genuinely open. The disc exits between the two paper faces.

  const recordPose=new THREE.Group(),recordSpin=new THREE.Group();recordPose.add(recordSpin);scene.add(recordPose);
  const rec=config.record;
  const surface=recordSurfaceCanvases(),normalMap=texture(surface.normal),roughnessMap=texture(surface.roughness);
  normalMap.colorSpace=roughnessMap.colorSpace=THREE.NoColorSpace;
  const face=material(new THREE.MeshPhysicalMaterial({map:texture(artwork.record),normalMap,normalScale:new THREE.Vector2(.19,.19),roughnessMap,metalness:.10,roughness:.38,clearcoat:.72,clearcoatRoughness:.17,clearcoatNormalMap:normalMap,clearcoatNormalScale:new THREE.Vector2(.16,.16)}));
  addFilmGrain(face,{amount:.009});
  mesh(recordSpin,new THREE.RingGeometry(rec.hole,rec.radius,192),face,[0,0,rec.thickness/2]);
  const reverse=mesh(recordSpin,new THREE.RingGeometry(rec.hole,rec.radius,192),dark,[0,0,-rec.thickness/2]);reverse.rotation.y=Math.PI;
  const edge=mesh(recordSpin,new THREE.CylinderGeometry(rec.radius,rec.radius,rec.thickness,192,1,true),dark);edge.rotation.x=Math.PI/2;
  const bore=mesh(recordSpin,new THREE.CylinderGeometry(rec.hole,rec.hole,rec.thickness,48,1,true),material(new THREE.MeshStandardMaterial({color:'#161a1c',roughness:.45,side:THREE.DoubleSide})));bore.rotation.x=Math.PI/2;

  const a=config.arm;
  box(machine,.56,.025,.62,brushed,[a.pivot[0],.556,a.pivot[2]]);
  cylinder(machine,.19,.09,dark,[a.pivot[0],.61,a.pivot[2]]);
  cylinder(machine,.13,.22,metal,[a.pivot[0],.765,a.pivot[2]]);
  cylinder(machine,.155,.045,chrome,[a.pivot[0],.897,a.pivot[2]]);
  const gimbal=mesh(machine,new THREE.TorusGeometry(.14,.025,10,36),chrome,[a.pivot[0],.972,a.pivot[2]]);gimbal.rotation.y=Math.PI/2;
  const armYaw=new THREE.Group();armYaw.position.set(...a.pivot);machine.add(armYaw);
  const armPitch=new THREE.Group();armYaw.add(armPitch);
  const tube=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.028,.008,.7),new THREE.Vector3(-.02,0,1.55),new THREE.Vector3(0,0,2.18)]);
  mesh(armPitch,new THREE.TubeGeometry(tube,60,.027,12,false),chrome);
  const counterweight=cylinder(armPitch,.135,.28,dark,[0,0,-.29]);counterweight.rotation.x=Math.PI/2;
  const counterRing=cylinder(armPitch,.139,.035,brushed,[0,0,-.39]);counterRing.rotation.x=Math.PI/2;
  box(armPitch,.155,.046,.34,dark,[0,0,2.20]);
  box(armPitch,.091,.09,.13,dark,[0,-.064,2.34]);
  const liftTab=box(armPitch,.23,.015,.045,chrome,[.11,.024,2.16]);liftTab.rotation.z=-.12;
  function rodBetween(parent,from,to,r,mat){
    const f=new THREE.Vector3(...from),t=new THREE.Vector3(...to),difference=t.clone().sub(f);
    const rod=mesh(parent,new THREE.CylinderGeometry(r,r,difference.length(),10),mat,f.clone().add(t).multiplyScalar(.5).toArray());rod.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),difference.normalize());return rod;
  }
  rodBetween(armPitch,[0,-.105,2.34],[0,-a.needleDrop+a.tipHeight*.85,a.length],.004,brass);
  // The mesh origin is the actual lowest diamond apex, not a sphere centre.
  const diamond=new THREE.ConeGeometry(a.tipRadius,a.tipHeight,12).rotateZ(Math.PI).translate(0,a.tipHeight/2,0);
  const stylusTip=mesh(armPitch,diamond,brass,[0,-a.needleDrop,a.length]);
  const tipGlow=createLocalGlow({color:'#fff0cf',size:.085,opacity:.15});
  tipGlow.position.set(0,-a.needleDrop+a.tipHeight*.4,a.length);armPitch.add(tipGlow);
  materials.add(tipGlow.material);textures.add(tipGlow.material.map);
  const restX=a.pivot[0]+1.95*Math.sin(a.restYaw),restZ=a.pivot[2]+1.95*Math.cos(a.restYaw);
  cylinder(machine,.085,.05,dark,[restX,.572,restZ]);cylinder(machine,.032,.34,metal,[restX,.76,restZ]);
  box(machine,.16,.025,.09,rubber,[restX,.944,restZ]);
  box(machine,.025,.09,.09,dark,[restX-.073,.98,restZ]);box(machine,.025,.09,.09,dark,[restX+.073,.98,restZ]);
  // Small exposed screw heads help anchor the fixed pivot and rest to the deck.
  for(const [x,z] of [[a.pivot[0]-.2,a.pivot[2]-.23],[a.pivot[0]+.2,a.pivot[2]+.23]])cylinder(machine,.027,.012,chrome,[x,.577,z]);

  const floor=mesh(scene,new THREE.PlaneGeometry(40,40),material(new THREE.MeshStandardMaterial({color:'#2b2620',roughness:1,metalness:0,envMapIntensity:.18,emissive:'#4a4034',emissiveIntensity:.3})),[0,.001,0]);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
  addFilmGrain(floor.material,{amount:.007});
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=256;const sc=shadowCanvas.getContext('2d');const fade=sc.createRadialGradient(128,128,20,128,128,128);fade.addColorStop(0,'#00000038');fade.addColorStop(.55,'#00000020');fade.addColorStop(1,'#00000000');sc.fillStyle=fade;sc.fillRect(0,0,256,256);
  const contact=mesh(scene,new THREE.PlaneGeometry(7.0,5.5),material(new THREE.MeshBasicMaterial({map:texture(shadowCanvas),transparent:true,depthWrite:false})),[0,.005,.25]);contact.rotation.x=-Math.PI/2;contact.castShadow=false;
  const environment=createNightEnvironment(renderer,{turntable:true});scene.environment=environment;scene.environmentIntensity=.75;
  scene.add(new THREE.HemisphereLight('#e4dfd5','#29251f',.28));
  const groove=needlePosition(entryYaw,contactPitch);
  const focusPass=createNeedleFocus(renderer,camera),focusPoint=new THREE.Vector3(groove.x,groove.y,groove.z);
  const key=addNightLamp(scene,{position:[5.5,8.5,3.5],target:[groove.x,groove.y,groove.z],intensity:640,distance:22,angle:.56,penumbra:.85});
  key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.near=.5;key.shadow.camera.far=25;key.shadow.bias=-.00025;key.shadow.normalBias=.018;key.shadow.radius=5;key.shadow.blurSamples=8;
  key.shadow.autoUpdate=false;
  // A dim neutral bounce reveals the front walnut edge without a second pool.
  const bounce=new THREE.DirectionalLight('#b9b3a8',.3);bounce.position.set(-4,3,5);scene.add(bounce);

  const motion=new TurntableMotion({reducedMotion}),raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  let enabled=false,scope=null,gesture=null,destroyed=false,shadowElapsed=1;
  const worldTip=new THREE.Vector3();
  function resize(){
    const w=Math.max(1,root.clientWidth),h=Math.max(1,root.clientHeight),mobile=w<=700;
    const height=mobile?8.1:7.9,width=height*w/h;
    camera.left=-width*(mobile ? .5 : .70);camera.right=width*(mobile ? .5 : .30);camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(1.8,devicePixelRatio||1));renderer.setSize(w,h,false);render(0);
  }
  function hit(event){
    const r=canvas.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,1-(event.clientY-r.top)/r.height*2);
    scene.updateMatrixWorld(true);camera.updateMatrixWorld();raycaster.setFromCamera(pointer,camera);
    return raycaster.intersectObjects([machine,recordPose],true).length>0;
  }
  function notify(){
    const state=motion.diagnostics;stylusTip.getWorldPosition(worldTip);
    const clearance=worldTip.y-rec.top,radius=Math.hypot(worldTip.x-p.x,worldTip.z-p.z);
    Object.assign(root.dataset,{entryPhase:state.entryPhase,armPhase:state.armPhase,playing:String(state.playing),rotationRate:state.rotationRate.toFixed(5),angle:state.angle.toFixed(5),needleRadius:radius.toFixed(5),needleHeight:worldTip.y.toFixed(5),needleClearance:clearance.toFixed(5),needleContact:String(state.contact),needleX:worldTip.x.toFixed(5),needleZ:worldTip.z.toFixed(5)});
    onState({...state,needleRadius:radius,needleClearance:clearance});
  }
  function render(dt){
    if(dt)motion.update(dt);
    const pose=motion.record;recordPose.position.set(...pose.position);recordPose.rotation.set(...pose.rotation);
    recordSpin.rotation.z=motion.angle;rotor.rotation.y=motion.angle;
    armYaw.rotation.y=motion.yaw;armPitch.rotation.x=motion.pitch;
    const powered=motion.desiredPlaying&&motion.record.placed;
    ledMaterial.color.set(powered?'#edb05c':'#5d4227');powerGlow.material.opacity=powered?.22:.015;
    tipGlow.material.opacity=motion.diagnostics.contact?.14:.035;
    shadowElapsed+=dt;
    if(!pose.placed||motion.stage||shadowElapsed>.5){key.shadow.needsUpdate=true;shadowElapsed=0;}
    if(focusPass)focusPass.render(scene,focusPoint);else renderer.render(scene,camera);notify();
  }
  function frame(_time,delta){
    // A settled paused deck needs no repeated GPU work. Explicit interaction
    // or resizing still renders immediately; moving mechanisms keep ticking.
    if(!motion.desiredPlaying&&motion.record.placed&&motion.armPhase==='rest'&&motion.rotationRate===0)return;
    render(Math.min(delta/1000,.05));
  }
  function setPlaying(value){motion.setPlaying(value);render(0);}
  const disposeTheme=bindRoomTheme(scene,renderer,{floor,onRender:()=>{if(enabled)render(0);}});
  function toggle(){setPlaying(!motion.desiredPlaying);}
  const observer=new ResizeObserver(()=>{if(enabled)resize();});observer.observe(root);
  function activate(){
    if(enabled||destroyed)return;enabled=true;motion.reset();scope=new InteractionScope();
    scope.on(canvas,'pointerdown',event=>{if(!canInteract()||event.button!==0)return;gesture={id:event.pointerId,x:event.clientX,y:event.clientY,time:event.timeStamp,onModel:hit(event),moved:false};},{passive:true});
    scope.on(canvas,'pointermove',event=>{if(gesture&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>8)gesture.moved=true;if(event.pointerType==='mouse')canvas.style.cursor=canInteract()&&hit(event)?'pointer':'';},{passive:true});
    scope.on(canvas,'pointerup',event=>{const start=gesture;gesture=null;if(start&&start.id===event.pointerId&&start.onModel&&!start.moved&&Math.hypot(event.clientX-start.x,event.clientY-start.y)<=8&&event.timeStamp-start.time<800&&canInteract()&&hit(event))toggle();},{passive:true});
    scope.on(canvas,'pointercancel',()=>{gesture=null;},{passive:true});scope.on(canvas,'pointerleave',()=>{gesture=null;canvas.style.cursor='';},{passive:true});
    resize();gsap.ticker.add(frame);root.querySelector('[data-attesa]').classList.add('via');root.querySelector('[data-attesa]').setAttribute('aria-hidden','true');
  }
  function deactivate(){if(!enabled)return;enabled=false;gesture=null;scope.close();gsap.ticker.remove(frame);canvas.style.cursor='';}
  return {activate,deactivate,setPlaying,toggle,
    get diagnostics(){return {...motion.diagnostics,enabled,listeners:scope?.count||0};},
    destroy(){if(destroyed)return;deactivate();destroyed=true;disposeTheme();observer.disconnect();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());environment.dispose();focusPass?.dispose();renderer.dispose();}
  };
}
