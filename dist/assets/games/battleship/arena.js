import {fitArena, gameScreen, needsLandscape} from './arena-layout.js';
import {createActionConfirmation} from './confirm-action.js';
import {createDiagnostics} from './diagnostics.js';

const surface = document.querySelector('.arena-shell');
const fitted = document.querySelector('.arena-fit');
const safe = document.querySelector('.arena-safe');
const frame = document.querySelector('#battle-screen');
const loading = document.querySelector('#arena-loading');
const full = document.querySelector('#arena-fullscreen');
const coarse = matchMedia('(pointer:coarse)');
const simulatedTouch = new URLSearchParams(location.search).get('device') === 'touch';
const standalone = new URLSearchParams(location.search).get('standalone') === '1';
const rotatePrompt = document.querySelector('#arena-rotate');
const query = new URLSearchParams(location.search);
let localStore; try { localStore = localStorage; } catch { localStore = {getItem(){return null;},setItem(){}}; }
const diagnostics = createDiagnostics(localStore);
const confirmation = createActionConfirmation();
let resizeFrame = 0, lastSize = '', frameMonitor, frameEvents;
const scheduleFit = () => { if (!resizeFrame) resizeFrame = requestAnimationFrame(() => { resizeFrame=0;fit(); }); };
// The child reads this before its first paint, including device-size QA.
document.documentElement.dataset.gameRenderProfile = coarse.matches || simulatedTouch ? 'mobile' : 'desktop';
let started = false;
function start() {
  if (started) return;
  started = true;
  frame.src = `./${gameScreen(new URLSearchParams(location.search).get('screen'))}.html`;
}
function fit() {
  const rect = safe.getBoundingClientRect();
  const key = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
  if (key === lastSize && started) return;
  lastSize = key;
  const waiting = needsLandscape(rect.width, rect.height, coarse.matches || simulatedTouch);
  rotatePrompt.hidden = !waiting;
  surface.inert = waiting;
  surface.style.visibility = waiting ? 'hidden' : 'visible';
  const layout = fitArena(rect.width, rect.height);
  fitted.style.setProperty('--arena-scale', layout.scale);
  fitted.style.setProperty('--arena-width', `${layout.width}px`);
  fitted.style.setProperty('--arena-height', `${layout.height}px`);
  surface.dataset.orientation = waiting ? 'waiting-for-landscape' : 'landscape';
  surface.dataset.input = simulatedTouch ? 'simulated-touch' : coarse.matches ? 'touch' : 'pointer';
  if (!waiting) start();
}
const observer = new ResizeObserver(scheduleFit);
observer.observe(safe);
window.addEventListener('resize', scheduleFit);
window.visualViewport?.addEventListener('resize', scheduleFit);

window.leaveBattleship = () => { try { frame.contentWindow?.leaveBattleship?.(); } catch {} };
function checkViewport() {
  // Inspect the real child viewport, not just the iframe's styled width.
  // This also makes device QA able to detect the Safari zoom regression.
  try {
    const child = frame.contentWindow;
    const root = frame.contentDocument.documentElement;
    frame.dataset.layoutViewport = `${child.innerWidth}x${child.innerHeight}`;
    frame.dataset.viewportValid = String(child.innerWidth === 1280 &&
      child.innerHeight === 720 && root.clientWidth === 1280 &&
      child.matchMedia('(min-width:901px)').matches);
  } catch {}
}
frame.addEventListener('load', () => {
  loading.hidden = true;
  try {
    if (frame.contentWindow.location.origin !== location.origin) return;
    const screen = gameScreen(frame.contentWindow.location.pathname);
    const params = new URLSearchParams({screen});
    if (simulatedTouch) params.set('device','touch');
    if (standalone) params.set('standalone','1');
    if (query.get('diagnostics') === '1') params.set('diagnostics','1');
    history.replaceState(null, '', `./arena.html?${params}`);
    diagnostics.record('screen',{screen,width:innerWidth,height:innerHeight,dpr:devicePixelRatio});
    frameMonitor?.disconnect(); frameEvents?.abort(); frameEvents = new AbortController();
    const options = {signal:frameEvents.signal};
    frame.contentDocument.addEventListener('keydown', escape, {...options,capture:true});
    frame.contentDocument.addEventListener('focusout', scheduleFit, options);
    frame.contentWindow.addEventListener('resize', checkViewport, options);
    frame.contentWindow.addEventListener('error',event=>diagnostics.record('script-error',{screen,message:event.message}),options);
    frame.contentWindow.addEventListener('unhandledrejection',event=>diagnostics.record('rejection',{screen,message:String(event.reason?.message||event.reason)}),options);
    let previousPhase = '';
    const recordPhase = () => {
      const body = frame.contentDocument.body;
      const phase = [...body.classList].filter(name=>/phase|placing|initializing|turn-p/.test(name)).join(' ') || screen;
      if (phase === previousPhase) return;
      previousPhase = phase;
      // A pixel estimate only, not a browser/GPU memory measurement.
      const images = new Map([...body.querySelectorAll('img')].map(img=>[img.currentSrc||img.src,img.naturalWidth*img.naturalHeight*4]));
      diagnostics.record('phase',{screen,phase,imageMiB:[...images.values()].reduce((a,b)=>a+b,0)/1048576});
    };
    frameMonitor = new MutationObserver(recordPhase);
    frameMonitor.observe(frame.contentDocument.body,{attributes:true,attributeFilter:['class']});
    recordPhase(); updateVisibility();
    requestAnimationFrame(checkViewport);
  } catch {}
});
fit();

async function ask(action, title, message, confirmLabel) {
  if (confirmation.isOpen()) return false;
  const previousFocus = document.activeElement;
  diagnostics.record('confirmation-request',{reason:action});
  fitted.inert = true;
  const approved = await confirmation.request({title,message,confirmLabel});
  fitted.inert = false;
  if (!approved && previousFocus?.isConnected) { try { previousFocus.focus({preventScroll:true}); } catch {} }
  diagnostics.record(approved?'confirmation-approved':'confirmation-cancelled',{reason:action});
  return approved;
}
document.querySelector('#arena-restart').addEventListener('click', async () => {
  if (!await ask('restart','Restart the game?','Your current game will end. Any online room will be left.','Restart')) return;
  window.leaveBattleship();
  loading.hidden = false;
  frame.src = './index.html';
});
async function exit() {
  if (!await ask('exit','Leave the game?','Return to the portfolio? Your online connection will close when you leave this page.','Leave game')) return;
  diagnostics.record('leaving',{reason:'exit-confirmed'});
  if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch {} }
  if (parent !== window && !standalone) parent.postMessage({type:'battleship:exit'}, location.origin);
  else { window.leaveBattleship(); location.href = '/#project/battleship'; }
}
function escape(event) {
  if (event.defaultPrevented) return;
  if (event.key !== 'Escape' || document.fullscreenElement) return;
  if (confirmation.isOpen()) { event.preventDefault();event.stopPropagation();confirmation.cancel();return; }
  // Briefing dialogs retain their own Escape behavior.
  try { if (frame.contentDocument?.querySelector('#briefing-overlay.is-open,#battle-briefing-overlay.is-open')) return; } catch {}
  event.preventDefault();
  event.stopPropagation();
  exit();
}
document.addEventListener('keydown', escape, true);
window.addEventListener('message',async event=>{
  if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
  const data = event.data;
  if (data?.type !== 'battleship:request-navigation' || !['menu','leave-room'].includes(data.kind) || typeof data.requestId !== 'string' || data.requestId.length > 100) return;
  const approved = await ask(data.kind,data.kind==='menu'?'Return to the menu?':'Leave the room?',
    'Your current game will end. Any online room will be left.',data.kind==='menu'?'Return to menu':'Leave room');
  if (approved) diagnostics.record('leaving',{reason:data.kind});
  frame.contentWindow.postMessage({type:'battleship:navigation-answer',requestId:data.requestId,approved},location.origin);
});
const exitButton=document.querySelector('#arena-exit');
let exitArmed=0;
exitButton.addEventListener('pointerdown',()=>{exitArmed=performance.now()+1200;});
exitButton.addEventListener('pointercancel',()=>{exitArmed=0;});
exitButton.addEventListener('click',event=>{
  const keyboard=event.detail===0&&document.activeElement===exitButton;
  const pointer=exitArmed>performance.now();exitArmed=0;
  if(keyboard||pointer)exit();
});
document.querySelector('#rotate-back').addEventListener('click',exit);
full.hidden = !document.documentElement.requestFullscreen;
full.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch { full.hidden = true; }
});
document.addEventListener('fullscreenchange', () => {
  full.textContent = document.fullscreenElement ? 'Leave full screen ↙' : 'Full screen ↗';
  scheduleFit();
});
function updateVisibility() {
  const paused = document.hidden;
  try { frame.contentDocument.documentElement.dataset.gamePaused = String(paused); } catch {}
  diagnostics.record(paused?'hidden':'visible');
}
document.addEventListener('visibilitychange',updateVisibility);
window.addEventListener('pagehide',()=>{diagnostics.record('pagehide');cancelAnimationFrame(resizeFrame);resizeFrame=0;});
window.addEventListener('pageshow',event=>{if(event.persisted){diagnostics.record('visible');scheduleFit();}});
window.addEventListener('error',event=>diagnostics.record('host-error',{message:event.message}));
window.addEventListener('unhandledrejection',event=>diagnostics.record('host-rejection',{message:String(event.reason?.message||event.reason)}));
if (query.get('diagnostics') === '1') {
  const button = document.createElement('button');button.className='diagnostics-copy';button.textContent='Copy diagnostics';
  button.addEventListener('click',async()=>{
    try { await navigator.clipboard.writeText(diagnostics.report());button.textContent='Copied'; }
    catch { const area=document.createElement('textarea');area.className='diagnostics-report';area.value=diagnostics.report();area.readOnly=true;document.body.append(area);area.select(); }
  });
  document.body.append(button);
}
