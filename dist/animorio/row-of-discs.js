/* Adapted from Animorio: The row of discs (user-supplied native edition).
   The native camera, row angle, springs and marker are retained. Adaptations:
   project media/IDs, scoped input, all-disc raycast hover, connected disc edges,
   renewed-impulse wheel handling and an external portfolio information card. */
import * as THREE from '../vendor/three.module.js';
import {createNightEnvironment,createProjectsEnvironment,addNightLamp,addFilmGrain,bindRoomTheme} from '../night-room.js';
import {RoomEnvironment} from '../vendor/addons/environments/RoomEnvironment.js';
import {InteractionScope,WheelGesture} from '../interaction-scope.js';
import {createDiscPicker,discTapAction} from '../disc-hit-test.js';
import {canvasFont} from '../typography.js';
import {discConfig} from '../disc-config.js';
import {updateDiscFloat,discMarkerVisible} from '../disc-feedback.js';
import {discSurfaceConfig,loadDiscSurface,applyDiscSurface} from '../disc-surface.js';
import {createBeveledDiscGeometry} from '../disc-geometry.js';
import {createOpeningSequence} from '../opening-sequence.js';
import {loadOpeningArt} from '../opening-art.js';
import {createProjectTransition} from '../project-transition.js';
import {createDetailNextProject} from '../detail-next-project.js';
import {copyDiscRenderTree} from '../disc-render-copy.js';
import {createDiscMarker} from '../disc-marker.js';

export async function createRowOfDiscs({root,info,projects,cover,onOpen=()=>{},onChange=()=>{},onFrame=()=>{},canInteract=()=>true,initialId,reducedMotion,browsing=true,autoRotate=true,cardValues=null,renderCard=null}){
const gsap=window.gsap;
const openingArtwork=loadOpeningArt();
const PASSO = discConfig.desktopSpacing;
const CURVA = 0.12;        /* quanto la fila si allontana ai lati */
const PICCOLI = 0.8;       /* quanto sono piccoli i dischi che non stanno davanti */
const MOLLA = 80;          /* quanto tira la molla che porta la fila sul disco scelto */
const FRENO = 11;          /* quanto la frena: con questi due c'è un piccolo rimbalzo */
const PIEGA = 0.11;        /* quanto i dischi si piegano mentre la fila corre */
const INCLINA = 0.29;      /* pointer tilt, shared by every visible disc */
const GIRA = discConfig.idleSpinRate;
const PENNARELLO = { giri: 2, punti: 30, trema: 0.03, fps: 10, entra: 0.45, esce: 0.3 };

const RIDOTTO = reducedMotion ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
const galleria=root;
// Load once per model collection. Opening/closing details only pauses this row;
// its project-keyed materials and texture instances remain untouched.
const surfaceMaps=new Map((await Promise.all(projects.filter(project=>!project.portrait).map(async project=>{
  try{return [project.id,await loadDiscSurface(project.id)];}
  catch(error){console.warn(`Surface maps unavailable: ${project.id}. Using original printed material.`,error);return null;}
}))).filter(Boolean));
Object.assign(root.dataset,{surfaceProjectId:discSurfaceConfig.projectId,surfaceProjectIds:[...surfaceMaps.keys()].join(','),surfaceEnabled:String(surfaceMaps.size>0),surfaceMapLoads:String(surfaceMaps.size*3),surfaceBindings:JSON.stringify([...surfaceMaps].map(([id,maps])=>({id,textureId:maps.normal.uuid,url:maps.normal.image.src})))});
const tela=root.querySelector('[data-tela]');
const segno=root.querySelector('[data-segno]');
const sg=segno.getContext('2d');
const TONDO=Math.PI*2;
const colors=['#bd4634','#b6bd86','#e5e2d8','#303c3a','#b1c5ca','#cbc2a8'];
const allProjects=projects.map(p=>({...p,titolo:p.name,anno:p.year,con:p.category,fondo:colors[p.art%colors.length],tinta:p.art===3?'#f2f2e9':'#191c19'}));
let FILM=allProjects.slice();
const timelines=new Map();
function scriviIntorno(g, testo, r, inizio) {
  let a = inizio;
  for (const ch of testo) {
    const w = g.measureText(ch).width;
    a += w / 2 / r;
    g.save();
    g.rotate(a);
    g.fillText(ch, 0, -r);
    g.restore();
    a += w / 2 / r;
  }
}


function copertina(f){
  const N=1024,m=N/2,c=document.createElement('canvas');c.width=c.height=N;
  const g=c.getContext('2d');
  g.drawImage(cover(f),0,0,N,N);
  if(f.portrait){
    g.fillStyle=f.photoPresent?'#f4f1e6':'#303d32';g.textAlign='center';g.textBaseline='alphabetic';g.save();g.translate(m,m);g.font=canvasFont(22,600);
    scriviIntorno(g,f.rim,N*.445,-2.5);g.restore();
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
  }
  if(f.cover){
    // Full-bleed project photograph; no opaque color block hides the image.
    const shade=g.createLinearGradient(0,0,0,N*.4);shade.addColorStop(0,'rgba(0,0,0,.33)');shade.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=shade;g.fillRect(0,0,N,N*.4);
    g.fillStyle=f.coverInk||'#f5f2e8';g.textAlign='left';g.textBaseline='alphabetic';
    g.shadowColor=f.coverInk?'transparent':'rgba(0,0,0,.45)';g.shadowBlur=4;g.shadowOffsetY=1;
    const title=f.discTitle||f.name;
    g.font=canvasFont(116,400,'title');
    const titleSize=116*Math.min(1,N*.66/g.measureText(title).width);
    g.font=canvasFont(titleSize,400,'title');g.fillText(title,N*.2,N*.24);
    g.font=canvasFont(18,400);g.fillText(f.discSubtitle||(f.demo?'LISTENING ROOM / ARCHIVE STUDY':f.category.toUpperCase()),N*.2,N*.28);
    g.save();g.translate(m,m);g.font=canvasFont(22,400);
    scriviIntorno(g,`${f.discTitle||f.name}     ${f.anno}     LISTENING ROOM`,N*.445,-1.9);g.restore();
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return texture;
  }
  g.fillStyle=f.fondo;g.fillRect(0,0,N,N*.38);
  g.fillStyle=f.tinta;g.textAlign='center';g.textBaseline='alphabetic';
  let fs=150;g.font=canvasFont(fs,400,'title');
  const w=g.measureText(f.titolo).width;if(w>N*.66)fs*=(N*.66)/w;
  g.font=canvasFont(fs,400,'title');g.fillText(f.titolo,m,N*.31);
  g.save();g.translate(m,m);g.font=canvasFont(25,600);g.globalAlpha=.8;
  scriviIntorno(g,'LISTENING ROOM     '+(f.demo?'ARCHIVE STUDY / DEMO':f.anno)+'     '+f.name.toUpperCase(),N*.44,-2.2);g.restore();
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
const R_BUCO = 0.075;      /* il buco */
const R_MOZZO = 0.165;     /* fin qui è plastica trasparente */
const R_ANELLO = 0.2;      /* poi un anello di metallo, poi la copertina */
const R_FUORI = discConfig.radius;
const SPESSORE = discConfig.thickness;
const geoMozzo = new THREE.RingGeometry(R_BUCO, R_MOZZO, 96, 1);
const geoAnello = new THREE.RingGeometry(R_MOZZO, R_ANELLO, 96, 1);
const geoForo = new THREE.CylinderGeometry(R_BUCO,R_BUCO,SPESSORE,96,1,true).rotateX(Math.PI/2);
const beveledDisc=createBeveledDiscGeometry({radius:R_FUORI,thickness:SPESSORE,bevel:discConfig.studyBevel,innerRadius:R_ANELLO});
const matRetro = new THREE.MeshPhysicalMaterial({
  color: '#35312c', metalness: 1, roughness: 0.25,
  iridescence: .35, iridescenceIOR: 1.45, iridescenceThicknessRange: [120, 1100],
  clearcoat: 0.35, clearcoatRoughness: 0.08,
});
const matBordo = new THREE.MeshPhysicalMaterial({ color: '#BFC6CC', metalness: 0.88, roughness: 0.18, clearcoat: 0.85 });
const matMozzo = new THREE.MeshPhysicalMaterial({ color: '#E9EEF2', roughness: 0.3, transparent: true, opacity: 0.34, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
const matAnello = new THREE.MeshPhysicalMaterial({ color: '#D9D9D9', metalness: 0.9, roughness: 0.18, clearcoat: 0.6, side: THREE.DoubleSide });
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=256;shadowCanvas.height=64;
const shadowContext=shadowCanvas.getContext('2d');shadowContext.scale(1,.25);
const shadowGradient=shadowContext.createRadialGradient(128,128,6,128,128,128);
shadowGradient.addColorStop(0,'rgba(0,0,0,.45)');shadowGradient.addColorStop(.38,'rgba(0,0,0,.22)');shadowGradient.addColorStop(1,'rgba(0,0,0,0)');
shadowContext.fillStyle=shadowGradient;shadowContext.fillRect(0,0,256,256);
const shadowTexture=new THREE.CanvasTexture(shadowCanvas),shadowGeometry=new THREE.PlaneGeometry(1.7,.24);

function disco(f) {
  const esterno = new THREE.Group();   /* posto nella fila, grandezza, piega */
  const inclina = new THREE.Group();   /* l'inclinazione verso il puntatore */
  const capovolgi = new THREE.Group(); /* il mezzo giro del clic, per vedere il retro */
  const perno = new THREE.Group();     /* il giro su sé stesso */
  esterno.add(inclina);
  const shadow=new THREE.Mesh(shadowGeometry,new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,opacity:.12,depthWrite:false}));
  shadow.position.set(0,-1.12,-.15);esterno.add(shadow);
  inclina.add(capovolgi);
  capovolgi.add(perno);
  const originalMaterial = new THREE.MeshPhysicalMaterial({
    map: copertina(f), roughness: 0.45, metalness: 0.15, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 0.55,
  });
  const maps=surfaceMaps.get(f.id);
  const surfaceMaterial=maps?applyDiscSurface(originalMaterial,maps):null;
  addFilmGrain(originalMaterial);if(surfaceMaterial)addFilmGrain(surfaceMaterial);
  const faceGeometry=beveledDisc.face;
  const fronte = new THREE.Mesh(faceGeometry,surfaceMaterial||originalMaterial);
  fronte.position.z = SPESSORE / 2;
  const retro = new THREE.Mesh(faceGeometry, matRetro);
  retro.rotation.y = Math.PI;
  retro.position.z = -SPESSORE / 2;
  perno.add(fronte,retro,new THREE.Mesh(beveledDisc.edge,matBordo),new THREE.Mesh(geoForo,matMozzo));
  for(const z of [-SPESSORE/2,SPESSORE/2]){
    const hub=new THREE.Mesh(geoMozzo,matMozzo),ring=new THREE.Mesh(geoAnello,matAnello);
    hub.position.z=ring.position.z=z;perno.add(hub,ring);
  }
  const disc={esterno,inclina,capovolgi,perno,shadow,fronte,originalMaterial,surfaceMaterial,pickMeshes:[...perno.children],girato:0,spinta:0,velSpinta:0,inX:0,inY:0,lift:0,liftVelocity:0,depth:0,depthVelocity:0};
  disc.pickMeshes.forEach(mesh=>{mesh.userData.disc=disc;});
  return disc;
}


const renderer=new THREE.WebGLRenderer({canvas:tela,antialias:true,alpha:true});
const scena = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
camera.position.set(0, 0, 4.6);
const fila = new THREE.Group();
fila.rotation.set(discConfig.restRotation.x,discConfig.restRotation.y,discConfig.restRotation.z);
scena.add(fila);
const dischi = [];
const pickDisc=createDiscPicker(camera);
let hoveredProjectId=null,hoverHit=null,markerProjectId=null,tapSelectedId=null;
let reviewSweep=null;
let opening=null;
const hitAt=(x,y)=>pickDisc(x,y,galleria.clientWidth,galleria.clientHeight,dischi);

let passo = PASSO;
let testa = 0;       /* la testa della fila: un numero continuo, 2,5 vuol dire a metà fra il terzo e il quarto */
let meta = 0;        /* il disco scelto */
let vel = 0;
let piega = 0;
let attivo = -1;

function misura() {
  const w = Math.max(1,galleria.clientWidth);
  const h = Math.max(1,galleria.clientHeight);
  const dpr = Math.min(1.6, devicePixelRatio || 1);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  /* in verticale la fila si rimpicciolisce finché il disco davanti ci sta in larghezza */
  fila.scale.setScalar(Math.min(1, camera.aspect * 1.3));
  passo = camera.aspect < 1 ? discConfig.portraitSpacing : PASSO;
  fila.position.set(camera.aspect > 1 ? 0.35 : 0, camera.aspect > 1 ? -0.12 : -0.2, 0);
  segno.width = Math.round(w * dpr);
  segno.height = Math.round(h * dpr);
  sg.setTransform(dpr, 0, 0, dpr, 0, 0);
}


const campi = {
  titolo: info.querySelector('[data-titolo]'),
  anno: info.querySelector('[data-anno]'),
  con: info.querySelector('[data-con]'),
};
function scheda(i, immediate = false) {
  if(renderCard){renderCard(FILM[i]);return;}
  const f = cardValues ? cardValues(FILM[i]) : FILM[i];
  Object.entries(campi).forEach(([k, el], n) => {
    const nuovo = String(f[k]);
    timelines.get(el)?.kill();
    if (RIDOTTO || immediate) { el.textContent = nuovo; gsap.set(el,{yPercent:0}); return; }
    const timeline = gsap.timeline()
      .to(el, { yPercent: -110, duration: 0.28, ease: 'power2.in', delay: n * 0.04 })
      .add(() => { el.textContent = nuovo; })
      .fromTo(el, { yPercent: 110 }, { yPercent: 0, duration: 0.6, ease: 'expo.out', immediateRender: false });
    timelines.set(el,timeline);
  });
}


function vai(i){meta=Math.max(0,Math.min(FILM.length-1,i));if(FILM[meta]?.id!==tapSelectedId)tapSelectedId=null;if(RIDOTTO)testa=meta;}
let traccia = 0;
let prossimoTremito = 0;
const discMarker=createDiscMarker();
function nuoviTremiti(){discMarker.reseed();}
nuoviTremiti();
const v3 = new THREE.Vector3();
/* un punto sul bordo del disco davanti, in pixel dello schermo */
function sulloSchermo(d, angolo, r) {
  v3.set(Math.cos(angolo) * r, Math.sin(angolo) * r, 0);
  d.inclina.localToWorld(v3);
  v3.project(camera);
  return [(v3.x + 1) * 0.5 * galleria.clientWidth, (1 - v3.y) * 0.5 * galleria.clientHeight];
}
function pennarello(d) {
  sg.clearRect(0, 0, galleria.clientWidth, galleria.clientHeight);
  if (traccia <= 0.001 || !d) return;
  discMarker.draw(sg,{strength:traccia,projectPoint:(angle,radius)=>sulloSchermo(d,angle,radius)});
}


let prima = 0;
function fotogramma(t, dtMs) {
  const dt = Math.min(dtMs, 64) / 1000;
  prima = testa;
  if (!trascina && !RIDOTTO) {
    vel += (meta - testa) * MOLLA * dt;
    vel *= Math.exp(-FRENO * dt);
    testa += vel * dt;
    if (Math.abs(meta - testa) < 0.0005 && Math.abs(vel) < 0.002) { testa = meta; vel = 0; }
  }
  const corsa = dt > 0 ? (testa - prima) / dt : 0;
  const voluta = RIDOTTO ? 0 : Math.max(-0.3, Math.min(0.3, Math.sign(corsa) * Math.sqrt(Math.abs(corsa)) * PIEGA));
  piega += (voluta - piega) * (1 - Math.exp(-8 * dt));
  const ora = Math.round(Math.max(0, Math.min(FILM.length - 1, testa)));
  if (ora !== attivo) {
    attivo = ora;
    scheda(ora);
    onChange(FILM[ora].id);
  }
  const targetRate=playing&&(!opening||opening.done)?GIRA:0;
  rotationRate+=(targetRate-rotationRate)*(1-Math.exp(-4*dt));
  if(Math.abs(rotationRate-targetRate)<.0001)rotationRate=targetRate;
  dischi.forEach((d, i) => {
    const m = i - testa;
    const davanti = Math.max(0, 1 - Math.abs(m));
    // Keep exposed neighbours legible, with the fixed lamp favouring the centre.
    const reflection=.62+.38*davanti;
    d.originalMaterial.envMapIntensity=.55*reflection;
    if(d.surfaceMaterial)d.surfaceMaterial.envMapIntensity=discSurfaceConfig.envMapIntensity*reflection;
    d.esterno.position.set(m * passo, -Math.abs(m) * 0.05 - Math.abs(piega) * 0.2, -m * m * CURVA - d.spinta);
    d.esterno.scale.setScalar(PICCOLI + (1 - PICCOLI) * davanti);
    d.esterno.rotation.z = -piega;
    /* la spinta del clic torna indietro con una molla */
    d.velSpinta += -d.spinta * 160 * dt;
    d.velSpinta *= Math.exp(-12 * dt);
    d.spinta += d.velSpinta * dt;
    d.perno.rotation.z -= rotationRate * dt * davanti;
  });
  // Selection and hover are independent. Each visible disc uses the same
  // spring response, driven by coordinates in its own unspun disc plane.
  if(reviewSweep&&canInteract()&&!trascina){
    const phase=(performance.now()-reviewSweep.start)/reviewSweep.duration;
    if(phase>=1){reviewSweep=null;puntatoreSopra=false;root.dataset.reviewSweep='complete';}
    else{
      const d=dischi[attivo];d.esterno.updateWorldMatrix(true,true);
      // Development-only pointer study: identical raycast/tilt/float path to a mouse.
      v3.set(-.72+1.44*(.5-.5*Math.cos(phase*Math.PI*2)),.3,SPESSORE/2);
      d.inclina.localToWorld(v3);v3.project(camera);
      sopraX=(v3.x+1)*galleria.clientWidth/2;sopraY=(1-v3.y)*galleria.clientHeight/2;puntatoreSopra=true;
      Object.assign(root.dataset,{reviewSweep:'running',reviewPointerX:String(sopraX),reviewPointerY:String(sopraY)});
    }
  }
  hoverHit=puntatoreSopra&&!trascina&&canInteract()?hitAt(sopraX,sopraY):null;
  hoveredProjectId=hoverHit?.disc.id||null;
  dischi.forEach(d=>{
    const hovered=hoveredProjectId===d.id;
    const vx=RIDOTTO||!hovered?0:hoverHit.localY*INCLINA;
    const vy=RIDOTTO||!hovered?0:hoverHit.localX*INCLINA;
    d.inX+=(vx-d.inX)*(1-Math.exp(-12*dt));
    d.inY+=(vy-d.inY)*(1-Math.exp(-12*dt));
    d.inclina.rotation.set(d.inX,d.inY,0);
    updateDiscFloat(d,{hovered,y:hovered?hoverHit.localY:0,time:t,reduced:RIDOTTO},dt);
    d.inclina.position.set(0,d.lift,d.depth);
    const elevation=Math.max(0,d.lift)+Math.max(0,d.depth)*.5;
    d.shadow.scale.set(1+elevation*.9,1+elevation*1.8,1);
    d.shadow.material.opacity=.12/(1+elevation*3);
  });
  if(opening&&!opening.done){
    const frame=opening.update();
    fila.visible=frame.queueReveal(0)>0;
    dischi.forEach((disc,index)=>{
      const reveal=frame.queueReveal(index);
      disc.esterno.visible=reveal>.00001;
      disc.esterno.position.y-=(1-reveal)*.20;
      disc.esterno.scale.multiplyScalar(reveal);
      if(index===0){
        // Arrive from the portrait's opposite lean and settle into the exact
        // existing gallery orientation. The steady composition stays untouched.
        const opposite=new THREE.Quaternion().setFromEuler(new THREE.Euler(-discConfig.restRotation.x,-discConfig.restRotation.y,0));
        const relative=fila.quaternion.clone().invert().multiply(opposite);
        disc.esterno.quaternion.copy(relative).slerp(new THREE.Quaternion(),reveal);
      }
    });
  }
  renderer.render(scena, camera);
  /* il pennarello: entra quando il puntatore sta sul disco davanti, e trema dieci volte al secondo */
  const d = dischi[attivo];
  const activeSurfaceTexture=d?.fronte.material.normalMap?.uuid||'';
  if(root.dataset.activeSurfaceTexture!==activeSurfaceTexture)root.dataset.activeSurfaceTexture=activeSurfaceTexture;
  if(markerProjectId!==d?.id){traccia=0;markerProjectId=d?.id;}
  const sopra = discMarkerVisible(d?.id,hoveredProjectId,tapSelectedId,testa,attivo);
  traccia += ((sopra ? 1 : 0) - traccia) * Math.min(1, dt / (sopra ? PENNARELLO.entra : PENNARELLO.esce) * 3);
  if (!RIDOTTO && t * 1000 >= prossimoTremito) {
    nuoviTremiti();
    prossimoTremito = t * 1000 + 1000 / PENNARELLO.fps;
  }
  pennarello(d);
  tela.style.cursor = hoverHit ? 'pointer' : '';
  Object.assign(root.dataset,{activeProjectId:FILM[attivo].id,targetPosition:String(meta),hoveredProjectId:hoveredProjectId||'',tapSelectedId:tapSelectedId||'',markerStrength:traccia.toFixed(4),discFeedback:JSON.stringify(dischi.map(d=>({id:d.id,x:Number(d.inX.toFixed(4)),y:Number(d.inY.toFixed(4)),lift:Number(d.lift.toFixed(4)),depth:Number(d.depth.toFixed(4))})))});
  onFrame({id:FILM[attivo].id,position:testa,target:meta,velocity:vel,listeners:scope?.count||0,angle:dischi[attivo].perno.rotation.z,rotationRate,playing});
}


let trascina=null,puntatoreSopra=false,sopraX=0,sopraY=0;
let scope=null,enabled=false,destroyed=false;
let playing=autoRotate&&!RIDOTTO,rotationRate=playing?GIRA:0;
const wheel=new WheelGesture();
const pixelPerDisco=()=>Math.max(160,galleria.clientWidth*.28);
let wheelEvents=0,wheelSteps=0;
function onWheel(e){
  wheelEvents++;root.dataset.wheelEvents=String(wheelEvents);
  if(!canInteract()||e.ctrlKey){root.dataset.wheelReason=e.ctrlKey?'browser-zoom':'inactive-page';return;}e.preventDefault();
  const raw=Math.abs(e.deltaY)>Math.abs(e.deltaX)?e.deltaY:e.deltaX;
  const step=wheel.feed(raw*(e.deltaMode===1?16:e.deltaMode===2?galleria.clientHeight:1),performance.now());
  if(step){const before=meta;vai(meta+step);if(before!==meta)wheelSteps++;root.dataset.wheelReason=before===meta?'boundary':'step';}
  else root.dataset.wheelReason=wheel.reason;
  Object.assign(root.dataset,{wheelSteps:String(wheelSteps),wheelDelta:raw.toFixed(2),wheelTarget:String(meta)});
}
function onDown(e){
  if(!canInteract()||e.button!==0||trascina)return;
  reviewSweep=null;root.dataset.reviewSweep='';
  const r=galleria.getBoundingClientRect();
  const centredIdAtPress=Math.abs(testa-meta)<.02&&Math.abs(vel)<.1?FILM[meta]?.id:null;
  trascina={id:e.pointerId,projectId:hitAt(e.clientX-r.left,e.clientY-r.top)?.disc.id,centredIdAtPress,x0:e.clientX,y0:e.clientY,testa0:testa,ultimoX:e.clientX,ultimoT:e.timeStamp,v:0,mosso:false};
  tela.setPointerCapture(e.pointerId);
}
function onMove(e){
  if(!canInteract())return;
  reviewSweep=null;root.dataset.reviewSweep='';
  const r=galleria.getBoundingClientRect();sopraX=e.clientX-r.left;sopraY=e.clientY-r.top;
  puntatoreSopra=e.pointerType==='mouse';
  if(!trascina||trascina.id!==e.pointerId)return;
  const dx=e.clientX-trascina.x0;
  if(Math.hypot(dx,e.clientY-trascina.y0)>6)trascina.mosso=true;
  testa=Math.max(-.4,Math.min(FILM.length-.6,trascina.testa0-dx/pixelPerDisco()));
  const dtp=Math.max(4,e.timeStamp-trascina.ultimoT);
  trascina.v=(e.clientX-trascina.ultimoX)/dtp;trascina.ultimoX=e.clientX;trascina.ultimoT=e.timeStamp;
}
function onUp(e,cancel=false){
  if(!trascina||trascina.id!==e.pointerId)return;
  const gesture=trascina;trascina=null;
  if(tela.hasPointerCapture(e.pointerId))tela.releasePointerCapture(e.pointerId);
  if(cancel){vai(Math.round(testa));vel=0;return;}
  if(gesture.mosso||Math.hypot(e.clientX-gesture.x0,e.clientY-gesture.y0)>6){
    if(e.timeStamp-gesture.ultimoT>100)gesture.v=0;
    const lancio=(-gesture.v*280)/pixelPerDisco();vai(Math.round(testa+lancio));vel=-gesture.v*1000/pixelPerDisco()*.5;
  }else if(gesture.projectId&&canInteract()){
    const r=galleria.getBoundingClientRect();
    const action=discTapAction({pressedId:gesture.projectId,releasedId:hitAt(e.clientX-r.left,e.clientY-r.top)?.disc.id,centredIdAtPress:gesture.centredIdAtPress});
    if(action==='select'){
      const index=FILM.findIndex(project=>project.id===gesture.projectId);
      if(index>=0){vai(index);tapSelectedId=gesture.projectId;}
      return;
    }
    if(action==='open')onOpen(gesture.projectId);
  }
}
function onKey(e){
  if(!canInteract()||e.target.closest('input,textarea,select,[contenteditable],#index-panel'))return;
  if(e.key==='ArrowRight'){e.preventDefault();vai(meta+1);}
  if(e.key==='ArrowLeft'){e.preventDefault();vai(meta-1);}
  if(e.key==='Home'){e.preventDefault();vai(0);}
  if(e.key==='End'){e.preventDefault();vai(FILM.length-1);}
}
function activate(){
  if(enabled||destroyed)return;enabled=true;wheel.reset();scope=new InteractionScope();
  if(browsing){scope.on(galleria,'wheel',onWheel,{passive:false});scope.on(tela,'pointerdown',onDown);scope.on(tela,'pointerup',e=>onUp(e));scope.on(tela,'pointercancel',e=>onUp(e,true));scope.on(window,'keydown',onKey);}
  scope.on(tela,'pointermove',onMove);
  scope.on(galleria,'pointerleave',()=>{puntatoreSopra=false;});
  scope.on(window,'blur',()=>{trascina=null;puntatoreSopra=false;hoverHit=null;hoveredProjectId=null;vai(Math.round(testa));vel=0;});
  misura();gsap.ticker.add(fotogramma);
}
function deactivate(){
  if(!enabled)return;enabled=false;scope.close();gsap.ticker.remove(fotogramma);trascina=null;vel=0;wheel.reset();
  reviewSweep=null;root.dataset.reviewSweep='';
  puntatoreSopra=false;hoverHit=null;hoveredProjectId=null;traccia=0;
  Object.assign(root.dataset,{hoveredProjectId:'',markerStrength:'0'});sg.clearRect(0,0,galleria.clientWidth,galleria.clientHeight);
}
function select(id,{immediate=false}={}){
  const index=FILM.findIndex(p=>p.id===id);if(index<0)return false;
  vai(index);if(immediate){testa=meta;vel=0;attivo=index;scheda(index,true);onChange(id);fotogramma(0,0);}return true;
}
const models=new Map();
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
const openingEnv=createNightEnvironment(renderer),env=createProjectsEnvironment(renderer);scena.environment=env;
let studioEnv=null;
addNightLamp(scena);
scena.add(new THREE.HemisphereLight('#eee6d8','#2b2620',.29));
const fill=new THREE.DirectionalLight('#eee8dd',.28);fill.position.set(-3,0,4);scena.add(fill);
// Keep the light layout stable across the opening and collection. Adding or
// removing a directional light at the bridge recompiles every printed shader.
const portraitFill=new THREE.DirectionalLight('#fff0de',0);portraitFill.position.set(-1,1,5);scena.add(portraitFill);
scena.userData.openingPortraitFill=portraitFill;
const disposeRoomTheme=bindRoomTheme(scena,renderer);
FILM.forEach(f=>{const d=disco(f);d.id=f.id;models.set(f.id,d);dischi.push(d);fila.add(d.esterno);});
const observer=new ResizeObserver(()=>{if(enabled)misura();});observer.observe(galleria);
misura();attivo=Math.max(0,FILM.findIndex(p=>p.id===initialId));
meta=attivo;testa=initialId||RIDOTTO?attivo:-2.4;vel=0;scheda(attivo,true);onChange(FILM[attivo].id);
root.querySelector('[data-attesa]').classList.add('via');root.querySelector('[data-attesa]').setAttribute('aria-hidden','true');
const introArtwork=await openingArtwork;
return {
  activate,deactivate,select,
  createNextProjectFooter(options){
    return createDetailNextProject({...options,homeRoot:root,renderer,canvas:tela,markerCanvas:segno,environment:openingEnv,gsap,reduced:RIDOTTO,
      copyProject(id){const model=models.get(id);return model?copyDiscRenderTree(model.perno):null;}});
  },
  playProjectTransition(id,{sourceModel=null}={}){
    const model=sourceModel||models.get(id);if(!model)return gsap.timeline();
    deactivate();misura();
    const wasVisible=fila.visible;
    if(sourceModel){fila.visible=false;disposeRoomTheme.setEnvironment(openingEnv);}
    return createProjectTransition({scene:scena,camera,model,others:sourceModel?[]:dischi.filter(d=>d!==model),renderer,gsap,reduced:RIDOTTO,
      onCleanup(){fila.visible=wasVisible;disposeRoomTheme.setEnvironment(env);}});
  },
  playOpening({onHandoff=()=>{},onComplete=()=>{},review=false}={}){
    opening?.finish(true);select(FILM[0].id,{immediate:true});
    fila.visible=false;rotationRate=0;disposeRoomTheme.setEnvironment(openingEnv);dischi.forEach(d=>{d.perno.rotation.z=0;});
    opening=createOpeningSequence({root,scene:scena,camera,review,artwork:introArtwork,projectCount:dischi.length,onGallery(){disposeRoomTheme.setEnvironment(env);},
      getDestination(){
        // Read the steady collection parent, not the temporarily scaled/turned
        // incoming mesh; otherwise its entrance would feed back into the exit.
        fila.updateWorldMatrix(true,true);
        return {position:fila.getWorldPosition(new THREE.Vector3()),quaternion:fila.getWorldQuaternion(new THREE.Quaternion()),scale:fila.getWorldScale(new THREE.Vector3()).x};
      },onHandoff,onComplete(){disposeRoomTheme.setEnvironment(env);fila.visible=true;dischi.forEach(d=>{d.esterno.visible=true;d.esterno.rotation.x=d.esterno.rotation.y=0;});onComplete();}});
  },
  setLightingStudy(mode){
    if(mode==='studio'&&!studioEnv){const pm=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();studioEnv=pm.fromScene(room,.04).texture;room.dispose();pm.dispose();}
    disposeRoomTheme.setEnvironment(mode==='studio'?studioEnv:mode==='previous'?openingEnv:env);
    root.dataset.lightingStudy=mode;
  },
  finishOpening(){opening?.finish(true);},
  setSurfaceEnabled(value){
    models.forEach(d=>{if(d.surfaceMaterial)d.fronte.material=value?d.surfaceMaterial:d.originalMaterial;});
    root.dataset.surfaceEnabled=String(!!value&&surfaceMaps.size>0);return surfaceMaps.size>0;
  },
  startPointerStudy(){if(canInteract()){reviewSweep={start:performance.now(),duration:8000};root.dataset.reviewSweep='running';}},
  setPlaying(value){playing=!!value;},
  replayEntrance(){
    meta=0;testa=RIDOTTO?0:-2.4;vel=0;attivo=0;
    if(!autoRotate){playing=false;rotationRate=0;}
    dischi.forEach(d=>{d.perno.rotation.z=0;d.inX=d.inY=0;});scheda(0,true);
    if(!RIDOTTO)Object.values(campi).forEach((el,n)=>{timelines.get(el)?.kill();const t=gsap.fromTo(el,{yPercent:110},{yPercent:0,duration:.6,ease:'expo.out',delay:n*.04});timelines.set(el,t);});
  },
  step:direction=>vai(meta+direction),
  setProjects(ids,preferredId){
    FILM=ids.map(id=>allProjects.find(p=>p.id===id)).filter(Boolean);
    models.forEach(d=>{d.esterno.visible=false;});dischi.length=0;
    FILM.forEach(p=>{const d=models.get(p.id);d.esterno.visible=true;dischi.push(d);});
    attivo=-1;select(FILM.some(p=>p.id===preferredId)?preferredId:FILM[0].id,{immediate:true});wheel.reset();
  },
  get selectedId(){return FILM[Math.max(0,attivo)]?.id;},
  get diagnostics(){return {enabled,listeners:scope?.count||0,position:testa,target:meta,selectedId:FILM[Math.max(0,attivo)]?.id,hoveredProjectId,markerStrength:traccia,playing,rotationRate,angle:dischi[Math.max(0,attivo)]?.perno.rotation.z||0};},
  destroy(){if(destroyed)return;disposeRoomTheme();opening?.finish(true);deactivate();destroyed=true;observer.disconnect();timelines.forEach(t=>t.kill());models.forEach(d=>d.esterno.traverse(o=>{if(o.material?.map){o.material.map.dispose();o.material.dispose();}}));models.forEach(d=>{if(d.originalMaterial!==d.fronte.material)d.originalMaterial.dispose();if(d.surfaceMaterial&&d.surfaceMaterial!==d.fronte.material)d.surfaceMaterial.dispose();});surfaceMaps.forEach(maps=>maps.dispose());surfaceMaps.clear();[geoMozzo,geoAnello,geoForo,shadowGeometry,beveledDisc.face,beveledDisc.edge].forEach(g=>g.dispose());[matRetro,matBordo,matMozzo,matAnello].forEach(m=>m.dispose());env.dispose();openingEnv.dispose();studioEnv?.dispose();renderer.dispose();}
};
}
