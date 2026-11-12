// User-supplied Animorio four-half UI, random intermediate letters, stagger and
// bounce retained. The enlarged board uses a two-second automatic reading guide.
export const flapWords=[' SIYI YU ','PORTFOLIO'];
import {createOpeningGuide} from './opening-guide.js';
export function createOpeningFlaps(host,{reduced=false,onComplete=()=>{}}={}){
const gsap=window.gsap,timelines=new Set();let destroyed=false,initial=null,guide=null,targetWord=0;
/* ---- values to change ---- */
const WORDS = [' SIYI YU ', 'PORTFOLIO', 'PORTFOLIO'];   /* at rest, under the pointer, after a press */
const FLAP = 0.1;               /* the seconds of a quick flap, falling and landing */
const LAND = 0.3;               /* the seconds of the last flap of a tile, which lands with a little bounce */
const SPIN = [1, 4];            /* how many letters a tile runs through before its own: the fewest and the most */
const STAGGER = 0.045;          /* the seconds between one tile and the next */

const REDUCED = reduced;
const board=document.createElement('button');board.type='button';board.className='opening-flap-board';board.innerHTML='<span class=board__tiles data-tiles aria-hidden=true></span>';host.append(board);document.querySelector('#opening-preflight .opening-flap-board')?.remove();
const row = board.querySelector('[data-tiles]');
const said=document.createElement('span');said.className='opening-a11y';said.setAttribute('role','status');host.append(said);
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const size = Math.max(...WORDS.map((w) => w.length));
const words = WORDS.map((w) => w.toUpperCase().padEnd(size, ' '));
const sentence = (w) => w.trim().charAt(0).toUpperCase() + w.trim().slice(1).toLowerCase();
board.style.setProperty('--count', String(size));
board.setAttribute('aria-label', sentence(WORDS[0]));

/* ---------------------------------------------------------------- the tiles */
function part(cls) {
  const el = document.createElement('span');
  el.className = cls;
  el.innerHTML = '<span class="char"></span><span class="shade"></span>';
  return el;
}
function write(p, c, lit) {
  const ch = p.firstElementChild;
  ch.textContent = c === ' ' ? '' : c;
  ch.classList.toggle('is-lit', lit);
}
const shade = (p) => p.lastElementChild;
const tiles = Array.from({ length: size }, () => {
  const el = document.createElement('span');
  el.className = 'tile';
  const t = {
    top: part('half half--top'),
    bottom: part('half half--bottom'),
    flapTop: part('flap flap--top'),
    flapBottom: part('flap flap--bottom'),
    shown: ' ',
    lit: false,
    target: ' ',
    targetLit: false,
    extra: 0,
    busy: false,
    wait: null,
  };
  el.append(t.top, t.bottom, t.flapTop, t.flapBottom);
  row.appendChild(el);
  return t;
});

/* one flap: the upper flap with the old letter falls, then the lower flap with the new one lands */
function flap(t, c, lit, last) {
  const from = t.shown;
  const fromLit = t.lit;
  if (REDUCED) {
    [t.top, t.bottom, t.flapTop, t.flapBottom].forEach((p) => write(p, c, lit));
    t.shown = c;
    t.lit = lit;
    return;
  }
  t.busy = true;
  gsap.set(t.flapBottom, { rotationX: 90 });
  gsap.set(t.flapTop, { rotationX: 0 });
  write(t.top, c, lit);
  write(t.flapBottom, c, lit);
  write(t.flapTop, from, fromLit);
  write(t.bottom, from, fromLit);
  const half = (last ? LAND : FLAP) / 2;
  const timeline=gsap.timeline({
    onComplete: () => {
      if(destroyed)return;
      timelines.delete(timeline);
      t.shown = c;
      t.lit = lit;
      write(t.flapTop, c, lit);
      write(t.bottom, c, lit);
      gsap.set(t.flapTop, { rotationX: 0 });
      gsap.set([t.top, t.bottom, t.flapTop, t.flapBottom].map(shade), { opacity: 0 });
      t.busy = false;
      settle(t);
    },
  });timelines.add(timeline);
  timeline
    .fromTo(t.flapTop, { rotationX: 0 }, { rotationX: -90, duration: half, ease: 'power2.in' }, 0)
    .fromTo(shade(t.flapTop), { opacity: 0 }, { opacity: 0.55, duration: half, ease: 'power1.in' }, 0)
    .fromTo(shade(t.top), { opacity: 0.4 }, { opacity: 0, duration: half * 1.6, ease: 'power1.out' }, 0)
    .fromTo(shade(t.bottom), { opacity: 0 }, { opacity: 0.4, duration: half, ease: 'power1.in' }, 0)
    .fromTo(t.flapBottom, { rotationX: 90 }, { rotationX: 0, duration: half, ease: last ? 'back.out(2.4)' : 'power2.out' }, half)
    .fromTo(shade(t.flapBottom), { opacity: 0.55 }, { opacity: 0, duration: half, ease: 'power1.out' }, half)
    .to(shade(t.bottom), { opacity: 0, duration: half * 0.6 }, half);
}

/* what a tile does next: a few letters on the way, then its own, landing slower */
function settle(t) {
  if (destroyed||t.busy) return;
  if (t.extra > 0) {
    t.extra -= 1;
    let c;
    do c = LETTERS[Math.floor(Math.random() * LETTERS.length)]; while (c === t.shown || c === t.target);
    flap(t, c, t.targetLit, false);
  } else if (t.shown !== t.target || t.lit !== t.targetLit) {
    flap(t, t.target, t.targetLit, true);
  } else {
    checkSettled();
  }
}
function checkSettled(){
  if(destroyed||!guide)return;
  if(tiles.every((t,i)=>!t.wait&&!t.busy&&t.extra===0&&t.shown===words[targetWord][i]&&t.lit===(targetWord>0))){
    const word=targetWord===0?'name':'portfolio';
    if(board.dataset.settled!==word){board.dataset.settled=word;board.dataset.settledAt=String(performance.now());}
    guide.settled(word);
  }
}

/* a word for the whole row: each tile starts after its turn in the wave (from the left, or from the right going
   back), and one that is turning takes the new letter at the end of its flap */
function show(k, fromEnd = false, spins = SPIN) {
  targetWord=k;board.dataset.target=k===0?'name':'portfolio';board.dataset.targetAt=String(performance.now());
  if (REDUCED) gsap.fromTo(row, { opacity: 0.35 }, { opacity: 1, duration: 0.25, overwrite: true });
  tiles.forEach((t, i) => {
    const c = words[k][i];
    const lit = k > 0;
    const n = spins[0] + Math.floor(Math.random() * (spins[1] - spins[0] + 1));
    t.wait?.kill();
    t.wait = gsap.delayedCall(REDUCED ? 0 : (fromEnd ? size - 1 - i : i) * STAGGER, () => {
      t.wait = null;
      t.target = c;
      t.targetLit = lit;
      t.extra = c === t.shown && lit === t.lit ? 0 : n;
      settle(t);
    });
  });
}

/* ---------------------------------------------------------------- the pointer, the keyboard and the press */
let pointerIn = false;
let focusIn = false;
const on = () => pointerIn || focusIn;
const rest = () => { if(on())guide.requestPortfolio(); };
guide=createOpeningGuide({schedule(seconds,callback){const timer=gsap.delayedCall(seconds,()=>{if(!destroyed)callback();});return ()=>timer.kill();},
  onPortfolio(){initial?.kill();if(REDUCED)guide.settled('portfolio');else show(1);},onComplete});
board.addEventListener('pointerenter', (e) => {
  if (e.pointerType !== 'mouse') return;
  pointerIn = true;
  rest();
});
board.addEventListener('pointerleave', (e) => {
  if (e.pointerType !== 'mouse') return;
  pointerIn = false;
  rest();
});
board.addEventListener('focus', () => {
  focusIn = board.matches(':focus-visible');
  rest();
});
board.addEventListener('blur', () => {
  focusIn = false;
  rest();
});
board.addEventListener('pointerdown', () => {
  if (!REDUCED) gsap.to(board, { scale: 0.97, duration: 0.1, ease: 'power2.out', overwrite: 'auto' });
});
const release = () => {
  if (!REDUCED) gsap.to(board, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
};
board.addEventListener('pointerup', release);
board.addEventListener('pointercancel', release);
board.addEventListener('click', (e) => {
  e.stopPropagation();
  /* a press from the keyboard (or a script) has no pointer to let go of: the case gives a little knock by itself */
  if (e.detail === 0 && !REDUCED) gsap.fromTo(board, { scale: 0.97 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
  guide.requestPortfolio();
  said.textContent = sentence(WORDS[2]);
});

/* ---------------------------------------------------------------- the board comes alive: blank tiles turn to the first word */
tiles.forEach((t) => [t.top, t.bottom, t.flapTop, t.flapBottom].forEach((p) => write(p, ' ', false)));
if (REDUCED){row.replaceChildren();row.textContent='SIYI YU · PORTFOLIO';board.classList.add('is-static');guide.requestPortfolio();board.addEventListener('click',e=>{e.stopImmediatePropagation();guide.destroy();onComplete();},{capture:true});}
else initial=gsap.delayedCall(0.35, () => {if(!destroyed&&guide.phase==='name-entering')show(0);});

return {element:board,get phase(){return guide.phase;},destroy(){destroyed=true;guide.destroy();initial?.kill();tiles.forEach(t=>t.wait?.kill());timelines.forEach(t=>t.kill());gsap.killTweensOf(board);board.remove();said.remove();}};
}
