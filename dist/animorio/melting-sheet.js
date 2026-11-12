/* Adapted from Animorio: The melting sheet (user-supplied native edition).
   Noise, grid spacing, marching-squares stitching, pointer bite and timing are
   retained. The still is now project media; the scroll container is the existing
   detail page. All ticker, trigger, pointer and resize resources are disposable. */
import {InteractionScope} from '../interaction-scope.js';

export function createMeltingSheet({scene:scena,stage:palco,sheet:foglio,scroller,onProgress=()=>{},reducedMotion,introDelay=0}){
const gsap=window.gsap,ScrollTrigger=window.ScrollTrigger;
const RIDOTTO=reducedMotion??matchMedia('(prefers-reduced-motion: reduce)').matches;
gsap.registerPlugin(ScrollTrigger);
const PASSO = 14;        /* il lato di una cella della griglia, in px: più piccolo, bordo più fine e più conti */
const SCALA = 190;       /* quanto sono grandi le chiazze del rumore, in px */
const BANDA = 105;       /* quanto è larga la fascia in cui il bordo si sfalda, in px */
const ONDA = 1.7;        /* quanto il rumore sposta il bordo, in fasce */
const VITA = 0.12;       /* quanto in fretta il bordo cambia da solo, al secondo */
const MORSO = 2.4;       /* quanto è profondo il morso del puntatore, in fasce */
const RAGGIO = 80;       /* quanto è largo il morso, in px */
const DA = 0.8;          /* dove sta il bordo all'inizio dello scorrimento, in parte dell'altezza */
const A = -0.4;          /* e dove arriva alla fine: sotto zero il foglio se n'è andato del tutto */


function casuale(i, j, k) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function valore(x, y, z) {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const k = Math.floor(z);
  const fx = x - i;
  const fy = y - j;
  const fz = z - k;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const w = fz * fz * (3 - 2 * fz);
  const m = (a, b, t) => a + (b - a) * t;
  return m(
    m(m(casuale(i, j, k), casuale(i + 1, j, k), u), m(casuale(i, j + 1, k), casuale(i + 1, j + 1, k), u), v),
    m(m(casuale(i, j, k + 1), casuale(i + 1, j, k + 1), u), m(casuale(i, j + 1, k + 1), casuale(i + 1, j + 1, k + 1), u), v),
    w,
  );
}
/* tre ottave, fra −1 e 1: la prima fa le chiazze, le altre sfrangiano il bordo */
function rumore(x, y, t) {
  return (valore(x, y, t) * 0.6 + valore(x * 2.1 + 5.2, y * 2.1 + 1.3, t * 1.6) * 0.28 + valore(x * 4.3 + 9.1, y * 4.3 + 3.7, t * 2.3) * 0.12) * 2 - 1;
}

/* ---------------------------------------------------------------- il contorno */
let W = 0;
let H = 0;
let nx = 0;
let ny = 0;
let campo = null;
let puntiX = null;
let puntiY = null;
let vicinoA = null;
let vicinoB = null;
let visto = null;
let controlRegions = [];

function misura() {
  W = palco.clientWidth;
  H = palco.clientHeight;
  /* la griglia sborda di una cella per parte: l'anello di fuori è sempre "senza carta", così ogni contorno si chiude */
  nx = Math.ceil(W / PASSO) + 2;
  ny = Math.ceil(H / PASSO) + 2;
  const nodi = (nx + 1) * (ny + 1);
  campo = new Float32Array(nodi);
  puntiX = new Float32Array(nodi * 2);
  puntiY = new Float32Array(nodi * 2);
  vicinoA = new Int32Array(nodi * 2);
  vicinoB = new Int32Array(nodi * 2);
  visto = new Uint8Array(nodi * 2);
  const stageRect = palco.getBoundingClientRect();
  controlRegions = [...foglio.querySelectorAll('button, a, input, select, textarea, [role="button"]')].map(control => {
    const rect = control.getBoundingClientRect();
    return {left: rect.left - stageRect.left, right: rect.right - stageRect.left, top: rect.top - stageRect.top, bottom: rect.bottom - stageRect.top};
  });
}

let tempo = 0;
let livello = DA;
let morsoX = 0;
let morsoY = 0;
let morsoForza = 0;

function calcolaCampo() {
  const bordo = livello * H;
  const vicino = ONDA + MORSO + 0.5;
  const r2 = 2 * RAGGIO * RAGGIO;
  const lontano = RAGGIO * 3;
  for (let j = 0; j <= ny; j++) {
    const y = (j - 1) * PASSO;
    const base = (bordo - y) / BANDA;
    const riga = j * (nx + 1);
    /* lontano dalla fascia il segno lo decide solo il livello: niente rumore da calcolare */
    const conRumore = Math.abs(base) < vicino || (morsoForza > 0.001 && Math.abs(y - morsoY) < lontano);
    for (let i = 0; i <= nx; i++) {
      if (i === 0 || j === 0 || i === nx || j === ny) {
        campo[riga + i] = -1;
        continue;
      }
      if (!conRumore) {
        campo[riga + i] = base;
        continue;
      }
      const x = (i - 1) * PASSO;
      let v = base + rumore(x / SCALA, y / SCALA, tempo) * ONDA;
      if (morsoForza > 0.001) {
        const dx = x - morsoX;
        const dy = y - morsoY;
        if (Math.abs(dx) < lontano && Math.abs(dy) < lontano) v -= MORSO * morsoForza * Math.exp(-(dx * dx + dy * dy) / r2);
      }
      campo[riga + i] = v;
    }
  }
}

/* i quadrati in marcia: in ogni cella, dove il segno cambia, un segmento fra due lati; i punti stanno sui lati,
   dove l'interpolazione lineare dice che il campo vale zero. Ogni punto sta su un lato condiviso da due celle,
   quindi ha esattamente due vicini: seguendo i vicini si chiude ogni contorno */
function contorno() {
  vicinoA.fill(-1);
  vicinoB.fill(-1);
  visto.fill(0);
  const colonne = nx + 1;
  const orizzontale = (i, j) => (j * colonne + i) * 2;
  const verticale = (i, j) => (j * colonne + i) * 2 + 1;
  const punto = (chiave) => {
    if (vicinoA[chiave] !== -1 || vicinoB[chiave] !== -1) return;
    const n = chiave >> 1;
    const i = n % colonne;
    const j = (n - i) / colonne;
    const a = campo[n];
    if (chiave & 1) {
      const b = campo[n + colonne];
      const t = a / (a - b);
      puntiX[chiave] = (i - 1) * PASSO;
      puntiY[chiave] = (j - 1 + t) * PASSO;
    } else {
      const b = campo[n + 1];
      const t = a / (a - b);
      puntiX[chiave] = (i - 1 + t) * PASSO;
      puntiY[chiave] = (j - 1) * PASSO;
    }
  };
  const lega = (k1, k2) => {
    punto(k1);
    punto(k2);
    if (vicinoA[k1] === -1) vicinoA[k1] = k2; else vicinoB[k1] = k2;
    if (vicinoA[k2] === -1) vicinoA[k2] = k1; else vicinoB[k2] = k1;
  };
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = campo[j * colonne + i];
      const b = campo[j * colonne + i + 1];
      const c = campo[(j + 1) * colonne + i + 1];
      const d = campo[(j + 1) * colonne + i];
      const caso = (a > 0 ? 8 : 0) | (b > 0 ? 4 : 0) | (c > 0 ? 2 : 0) | (d > 0 ? 1 : 0);
      if (caso === 0 || caso === 15) continue;
      const su = orizzontale(i, j);
      const giu = orizzontale(i, j + 1);
      const sx = verticale(i, j);
      const dx = verticale(i + 1, j);
      const centro = (a + b + c + d) / 4 > 0;
      switch (caso) {
        case 1: case 14: lega(sx, giu); break;
        case 2: case 13: lega(giu, dx); break;
        case 3: case 12: lega(sx, dx); break;
        case 4: case 11: lega(su, dx); break;
        case 6: case 9: lega(su, giu); break;
        case 7: case 8: lega(sx, su); break;
        case 5:
          if (centro) { lega(sx, su); lega(giu, dx); } else { lega(su, dx); lega(sx, giu); }
          break;
        case 10:
          if (centro) { lega(su, dx); lega(sx, giu); } else { lega(sx, su); lega(giu, dx); }
          break;
        default: break;
      }
    }
  }
  /* si seguono i vicini e si scrive il percorso */
  const pezzi = [];
  const f = (n) => Math.round(n * 10) / 10;
  for (let k = 0; k < vicinoA.length; k++) {
    if (vicinoA[k] === -1 || visto[k]) continue;
    let prima = -1;
    let ora = k;
    const linea = [`M${f(puntiX[k])} ${f(puntiY[k])}`];
    let passi = 0;
    while (passi++ < 200000) {
      visto[ora] = 1;
      const dopo = vicinoA[ora] !== prima ? vicinoA[ora] : vicinoB[ora];
      if (dopo === -1 || dopo === k) break;
      linea.push(`${f(puntiX[dopo])} ${f(puntiY[dopo])}`);
      prima = ora;
      ora = dopo;
    }
    pezzi.push(`${linea.join(' L')}Z`);
  }
  return pezzi.join('');
}


function disegna(){calcolaCampo();const d=contorno();foglio.style.clipPath=d?`path(evenodd, "${d}")`:'path("M0 0Z")';}
const scope=new InteractionScope();let destroyed=false,meta=0,dentro=false,mx=0,my=0,visibile=true,rinvio=null;
misura();
if(RIDOTTO){foglio.style.clipPath='none';return {refresh(){},destroy(){scope.close();destroyed=true;foglio.style.clipPath='';},get diagnostics(){return {listeners:0,trigger:false,enabled:!destroyed,progress:0};}};}
const trigger=ScrollTrigger.create({trigger:scena,scroller,start:'top top',end:'bottom bottom',invalidateOnRefresh:true,onUpdate:s=>{meta=s.progress;}});
const segui=e=>{
  const r=palco.getBoundingClientRect();mx=e.clientX-r.left;my=e.clientY-r.top;
  // The dissolving edge must not erase a control just before its click lands.
  if(controlRegions.some(box=>mx>=box.left-RAGGIO&&mx<=box.right+RAGGIO&&my>=box.top-RAGGIO&&my<=box.bottom+RAGGIO)){
    const hadBite=morsoForza>0;dentro=false;morsoForza=0;if(hadBite)disegna();return;
  }
  if(!dentro){morsoX=mx;morsoY=my;}dentro=true;
};
scope.on(palco,'pointermove',segui);scope.on(palco,'pointerdown',segui);scope.on(palco,'pointerleave',()=>{dentro=false;});scope.on(palco,'pointercancel',()=>{dentro=false;});scope.on(palco,'pointerup',e=>{if(e.pointerType!=='mouse')dentro=false;});
const observer=new IntersectionObserver(v=>{visibile=v[0].isIntersecting;},{root:scroller});observer.observe(scena);
// Keep an unbroken sheet behind the carried disc. Its edge starts dissolving
// after the title arrives; intentional scrolling always takes control at once.
const startTime=performance.now(),delayed=introDelay>0;
const arrivo={v:delayed?.38:.14};
if(delayed)livello=DA+arrivo.v;
const arrival=gsap.to(arrivo,{v:0,duration:delayed?1.1:1.6,ease:'power3.out',delay:delayed?introDelay:.2});
const tick=(t,dt)=>{
  if(!visibile||destroyed)return;
  if(delayed&&meta===0&&performance.now()-startTime<introDelay*1000){foglio.style.clipPath='none';return;}
  if(delayed&&meta>0&&arrivo.v>0){arrival.kill();arrivo.v=0;}
  const s=Math.min(dt,64)/1000;tempo+=s*VITA;
  const facile=x=>x*x*(3-2*x),voluto=DA+(A-DA)*facile(meta)+arrivo.v;
  livello+=(voluto-livello)*(1-Math.exp(-7*s));
  morsoForza+=((dentro?1:0)-morsoForza)*(1-Math.exp(-(dentro?5:2.2)*s));
  morsoX+=(mx-morsoX)*(1-Math.exp(-9*s));morsoY+=(my-morsoY)*(1-Math.exp(-9*s));
  disegna();onProgress(meta,livello);
};
gsap.ticker.add(tick);if(delayed)foglio.style.clipPath='none';else disegna();
scope.on(window,'resize',()=>{clearTimeout(rinvio);rinvio=setTimeout(()=>{misura();trigger.refresh();},120);});
return {refresh(){misura();trigger.refresh();},get diagnostics(){return {enabled:!destroyed,listeners:scope.count,trigger:!destroyed,progress:meta};},destroy(){if(destroyed)return;destroyed=true;clearTimeout(rinvio);scope.close();observer.disconnect();trigger.kill();arrival.kill();gsap.ticker.remove(tick);foglio.style.clipPath='';}};
}
