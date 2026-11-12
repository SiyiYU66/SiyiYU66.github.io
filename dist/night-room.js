import * as THREE from './vendor/three.module.js';
import {RoomEnvironment} from './vendor/addons/environments/RoomEnvironment.js';

// Keep canonical room reflections separate from transient opening/transition passes.
export function createRoomThemeState(scene,{lightEnvironment,darkEnvironment=scene.environment,floor=null}={}){
  const lights=[];scene.traverse(o=>{if(o.isLight)lights.push({light:o,color:o.color.clone(),intensity:o.intensity});});
  const originalIntensity=scene.environmentIntensity;
  const floorColor=floor?.material.color.clone(),floorEmission=floor?.material.emissive.clone();
  const white=new THREE.Color('#ffffff');let current=null,night=darkEnvironment;
  function apply(light){
    scene.environment=light?lightEnvironment:night;
    scene.environmentIntensity=light?.42:originalIntensity;
    if(current===light)return;
    for(const entry of lights){entry.light.color.copy(light?white:entry.color);entry.light.intensity=light?(entry.light.isHemisphereLight?.7:entry.light.isSpotLight?entry.intensity*.3:entry.intensity*.8):entry.intensity;}
    if(floor){floor.material.color.copy(light?new THREE.Color('#deded9'):floorColor);floor.material.emissive.copy(light?new THREE.Color('#000'):floorEmission);}
    current=light;
  }
  return {apply,setEnvironment(environment){night=environment;}};
}
export function bindRoomTheme(scene,renderer,{floor=null,onRender=()=>{}}={}){
  if(!renderer.isWebGLRenderer||typeof document==='undefined'){const noop=()=>{};noop.setEnvironment=environment=>{scene.environment=environment;};return noop;}
  const room=new RoomEnvironment(),pm=new THREE.PMREMGenerator(renderer),target=pm.fromScene(room,.04);room.dispose();pm.dispose();
  const state=createRoomThemeState(scene,{lightEnvironment:target.texture,floor});
  const apply=()=>state.apply(document.documentElement.dataset.theme==='light');
  const previous=scene.onBeforeRender;scene.onBeforeRender=function(...args){apply();previous?.apply(this,args);};
  const observer=new MutationObserver(()=>{apply();onRender();});observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});apply();
  const dispose=()=>{observer.disconnect();scene.onBeforeRender=previous;target.dispose();};
  dispose.setEnvironment=environment=>{state.setEnvironment(environment);apply();};
  return dispose;
}

// One fixed, off-camera lamp. Environment panels are reflections of that same
// fixture, not a bright studio room. Text and project photographs bypass this.
export const nightRoom={background:'#171512',table:'#2b2620',cream:'#fff0d6',grain:.009};
export function createProjectsEnvironment(renderer){
  const room=new THREE.Scene();room.background=new THREE.Color('#181511');
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const c=canvas.getContext('2d');c.scale(1,.5);
  const gradient=c.createRadialGradient(256,256,12,256,256,250);
  gradient.addColorStop(0,'#fff9ee');gradient.addColorStop(.24,'#f2eee5');
  gradient.addColorStop(.55,'#b8b6b0');gradient.addColorStop(.8,'#5b5955');gradient.addColorStop(1,'#181511');
  c.fillStyle=gradient;c.fillRect(0,0,512,512);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({map,color:new THREE.Color(3.5,3.5,3.5),side:THREE.DoubleSide});
  // Match the reflected view vector of the EXISTING (-.42,-.5) queue pose.
  // The previous near-camera patch suited the upright intro, but missed these
  // tilted faces. This fixed, broad lampshade lobe stays in room coordinates.
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(2.4,1.15),material);
  panel.position.set(-2.7,2.55,1.4);panel.lookAt(0,0,0);room.add(panel);
  const pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromScene(room,.025);
  pmrem.dispose();panel.geometry.dispose();material.dispose();map.dispose();
  const environment=target.texture;environment.dispose=()=>target.dispose();return environment;
}
export function createNightEnvironment(renderer,{turntable=false}={}){
  const room=new THREE.Scene();room.background=new THREE.Color('#181511');
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
  const c=canvas.getContext('2d');c.scale(1,.5);
  const g=c.createRadialGradient(128,128,6,128,128,126);
  g.addColorStop(0,'#fff7e8');g.addColorStop(.26,'#ece1cd');g.addColorStop(.65,'#887b68');g.addColorStop(1,'#181511');
  c.fillStyle=g;c.fillRect(0,0,256,256);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.MeshBasicMaterial({map,color:new THREE.Color(2.9,2.9,2.9),side:THREE.DoubleSide});
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(2.1,1.35),mat);
  // Each camera sees the same small lampshade reflection from its own angle.
  // The opening mirror vector at the stylus points just right of the camera;
  // the horizontal platter reflects the lamp behind the raised About camera.
  panel.position.set(...(turntable?[-2.4,4.5,-3.5]:[1.1,.28,4.2]));panel.lookAt(0,0,0);room.add(panel);
  const pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromScene(room,.035);
  const environment=target.texture;pmrem.dispose();panel.geometry.dispose();mat.dispose();map.dispose();
  // PMREM render target owns its GPU storage; callers already dispose texture.
  const dispose=environment.dispose.bind(environment);environment.dispose=()=>{dispose();target.dispose();};
  return environment;
}
export function addNightLamp(scene,{position=[3,4,4.5],target=[.65,-.1,0],intensity=132,distance=18,angle=.36,penumbra=.85}={}){
  const lamp=new THREE.SpotLight(nightRoom.cream,intensity,distance,angle,penumbra,2);
  lamp.position.set(...position);lamp.target.position.set(...target);scene.add(lamp,lamp.target);
  scene.userData.nightLamp=lamp;return lamp;
}
export function addFilmGrain(material,{amount=nightRoom.grain}={}){
  // Review the unprocessed lighting with ?lighting-only=1. Static, pixel-fine
  // midtone grain exists only in 3D materials, never in the DOM/SVG type layer.
  if(typeof location!=='undefined'&&new URLSearchParams(location.search).has('lighting-only'))amount=0;
  const previous=material.onBeforeCompile;
  material.onBeforeCompile=function(shader,...rest){
    previous?.call(this,shader,...rest);
    shader.uniforms.nightGrain={value:amount};
    shader.fragmentShader='uniform float nightGrain;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>',`#include <dithering_fragment>
      float nightLuma=dot(gl_FragColor.rgb,vec3(.2126,.7152,.0722));
      float nightMid=smoothstep(.035,.22,nightLuma)*(1.-smoothstep(.62,.92,nightLuma));
      float nightNoise=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453)-.5;
      gl_FragColor.rgb+=vec3(nightNoise*nightGrain*nightMid);
    `);
  };
  material.customProgramCacheKey=()=>`listening-room-night-${amount}`;
  material.needsUpdate=true;return material;
}
export function createLocalGlow({color='#f7ddad',size=.12,opacity=.2}={}){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const c=canvas.getContext('2d'),g=c.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(255,255,255,.8)');g.addColorStop(.12,'rgba(255,255,255,.32)');g.addColorStop(.48,'rgba(255,255,255,.055)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,64,64);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map,color,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
  sprite.scale.setScalar(size);return sprite;
}

// Sub-pixel depth softness for the photographed machine only. The DOM type is
// composited later by the browser and never enters this render target.
export function createNeedleFocus(renderer,camera){
  if(new URLSearchParams(location.search).has('lighting-only'))return null;
  const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});
  target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
  const uniforms={picture:{value:target.texture},depth:{value:target.depthTexture},pixel:{value:new THREE.Vector2(1,1)},nearPlane:{value:camera.near},farPlane:{value:camera.far},focus:{value:15}};
  const material=new THREE.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D picture;uniform sampler2D depth;uniform vec2 pixel;uniform float nearPlane;uniform float farPlane;uniform float focus;varying vec2 vUv;
      void main(){
        float d=texture2D(depth,vUv).x;
        float viewDepth=mix(nearPlane,farPlane,d);
        float radius=smoothstep(.45,3.3,abs(viewDepth-focus))*.72;
        vec4 centre=texture2D(picture,vUv),sum=centre*4.;
        sum+=texture2D(picture,vUv+vec2(pixel.x,0.)*radius);
        sum+=texture2D(picture,vUv-vec2(pixel.x,0.)*radius);
        sum+=texture2D(picture,vUv+vec2(0.,pixel.y)*radius);
        sum+=texture2D(picture,vUv-vec2(0.,pixel.y)*radius);
        sum+=texture2D(picture,vUv+pixel*radius*.707);
        sum+=texture2D(picture,vUv-pixel*radius*.707);
        sum+=texture2D(picture,vUv+vec2(pixel.x,-pixel.y)*radius*.707);
        sum+=texture2D(picture,vUv+vec2(-pixel.x,pixel.y)*radius*.707);
        gl_FragColor=sum/12.;
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
  const quadScene=new THREE.Scene(),geometry=new THREE.PlaneGeometry(2,2);quadScene.add(new THREE.Mesh(geometry,material));
  const quadCamera=new THREE.Camera(),size=new THREE.Vector2(),focusPoint=new THREE.Vector3();
  return {render(scene,point){
    renderer.getDrawingBufferSize(size);
    if(target.width!==size.x||target.height!==size.y)target.setSize(size.x,size.y);
    uniforms.pixel.value.set(1/size.x,1/size.y);
    camera.updateMatrixWorld();focusPoint.copy(point).applyMatrix4(camera.matrixWorldInverse);uniforms.focus.value=-focusPoint.z;
    renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(quadScene,quadCamera);
  },dispose(){target.dispose();geometry.dispose();material.dispose();}};
}
