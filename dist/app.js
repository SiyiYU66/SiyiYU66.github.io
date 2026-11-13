import {projects} from './projects.js';
import {mountGamePlayer} from './game-player.js';
import {mountThemeToggle} from './theme.js';
mountThemeToggle();
import {createRowOfDiscs} from './animorio/row-of-discs.js';
import {createMeltingSheet} from './animorio/melting-sheet.js';
import {projectOpeningTiming} from './project-transition.js';
import {projectCover,projectHero,discThumbnail,preloadProjectCovers,ensureProjectCover} from './project-media.js';
import {renderProjectCaseStudy} from './project-case-study.js';
import {mountProjectReveals} from './project-reveals.js';
import {DemoAudio} from './audio.js';
import {loadTypography} from './typography.js';
import {createProjectInfo} from './project-info.js';
import {shouldPlayOpening} from './opening-motion.js';

const $=id=>document.getElementById(id),gsap=window.gsap;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const introReview=['127.0.0.1','localhost'].includes(location.hostname)&&new URLSearchParams(location.search).has('intro-review');
const introReplay=new URLSearchParams(location.search).get('replay-opening')==='1';
let seenOpening=false;try{seenOpening=!!sessionStorage.getItem('lr-opening-seen');}catch{}
let openingInProgress=shouldPlayOpening({hash:location.hash,seen:seenOpening,reducedMotion:reduced,review:introReview||introReplay});
if(!openingInProgress)document.documentElement.classList.remove('opening-pending');
// Honour skip even while fonts/photographs are still loading.
const skipPendingOpening=e=>{
  if(e.target?.closest?.('#theme-toggle'))return;
  if(!openingInProgress||document.body.classList.contains('opening-active')||(e.type==='keydown'&&e.key!=='Escape'))return;
  openingInProgress=false;document.documentElement.classList.remove('opening-pending');
  try{sessionStorage.setItem('lr-opening-seen','1');}catch{}
  e.preventDefault();e.stopImmediatePropagation();
};
window.addEventListener('click',skipPendingOpening,true);window.addEventListener('keydown',skipPendingOpening,true);
const surfaceReview=['127.0.0.1','localhost'].includes(location.hostname)&&new URLSearchParams(location.search).has('surface-review');
const freezeReview=['127.0.0.1','localhost'].includes(location.hostname)&&new URLSearchParams(location.search).has('freeze-disc');
// Only the opening's fonts are required before the shared renderer starts.
// Project photographs and maps prepare together, in visible-first order.
await loadTypography();
const projectInfo=createProjectInfo({root:$('metadata'),gsap,reducedMotion:reduced});
const byId=new Map(projects.map(p=>[p.id,p]));
const legacy=Math.round(Number(sessionStorage.getItem('lr-position')||0));
const remembered=sessionStorage.getItem('lr-selected-project')||projects[legacy]?.id;
const state={page:'home',selectedId:byId.has(remembered)?remembered:projects[0].id,filter:'all',ids:projects.map(p=>p.id)};
const root=$('scene'),detail=$('detail'),home=$('room-ui');
let row=null,melting=null,transition=null,nextFooter=null,disposeCaseStudy=null,disposeProjectReveals=null;
let openRequest=0;
let standaloneGameLaunched=false;
window.addEventListener('listening-room:standalone-game',()=>{
  standaloneGameLaunched=true;
  nextFooter?.deactivate();
  melting?.destroy();melting=null;
  transition?.kill();transition=null;
  row?.destroy();row=null;
});
window.addEventListener('pageshow',event=>{if(event.persisted&&standaloneGameLaunched)location.reload();});
function stopCaseStudy(){
  disposeGame?.();disposeGame=null;
  disposeProjectReveals?.();disposeProjectReveals=null;
  disposeCaseStudy?.();disposeCaseStudy=null;
}
let disposeGame=null;

function diagnostics(){
  const r=row?.diagnostics,m=melting?.diagnostics;
  Object.assign(document.body.dataset,{page:state.page,currentProject:state.selectedId,rowEnabled:String(!!r?.enabled),rowListeners:String(r?.listeners||0),meltListeners:String(m?.listeners||0),meltTrigger:String(!!m?.trigger),scrollTriggers:String(window.ScrollTrigger?.getAll().length||0),browsePosition:(r?.position||0).toFixed(4),reveal:(m?.progress||0).toFixed(3)});
}
function selectionChanged(id){
  const p=byId.get(id);if(!p)return;
  if(state.selectedId!==id)openRequest++;
  state.selectedId=id;
  if(!openingInProgress)projectInfo.show(p);
  $('open-album').setAttribute('aria-label',`Open ${p.name}`);
  document.querySelectorAll('.index-row').forEach(el=>el.classList.toggle('selected',el.dataset.projectId===id));
  sessionStorage.setItem('lr-selected-project',id);diagnostics();
}
function onRowFrame(frame){
  const index=state.ids.indexOf(frame.id);
  $('counter').textContent=`${String(index+1).padStart(2,'0')} / ${String(state.ids.length).padStart(2,'0')}`;
  $('previous').disabled=frame.target<=0;$('next').disabled=frame.target>=state.ids.length-1;diagnostics();
}
function toggleIndex(force){const open=force??$('index-panel').hidden;$('index-panel').hidden=!open;$('index-toggle').setAttribute('aria-expanded',String(open));}
function renderIndex(){
  $('index-list').replaceChildren(...state.ids.map((id,index)=>{
    const p=byId.get(id),button=document.createElement('button');button.className='index-row';button.classList.toggle('selected',id===state.selectedId);button.dataset.projectId=id;
    const n=document.createElement('small'),name=document.createElement('span'),year=document.createElement('time');
    n.textContent=String(index+1).padStart(2,'0');name.textContent=p.name+(p.demo?' · DEMO':'');year.textContent=p.year;
    button.append(n,name,year);button.addEventListener('click',()=>{showProjects();row?.select(id);toggleIndex(false);});return button;
  }));
}
function showNextProject(next){
  const title = $('next-name');
  const name = next.discTitle || next.name;
  const words = name.trim().split(/\s+/);
  const split = Math.ceil(words.length / 2);
  const lines = words.length > 1 ? [words.slice(0, split).join(' '), words.slice(split).join(' ')] : [name];
  title.dataset.split = String(lines.length > 1);
  title.setAttribute('aria-label', name);
  title.replaceChildren(...lines.map(line => {
    const mask = document.createElement('span');
    mask.className = 'next-project-title-line';
    const text = document.createElement('span');
    text.textContent = line;
    mask.append(text);
    return mask;
  }));
  $('next-disc').src = discThumbnail(next);
  const button = $('next-project');
  button.dataset.projectId = next.id;
  button.setAttribute('aria-label', `Open next project: ${next.name}`);
  if(!row?.isProjectReady||row.isProjectReady(next.id))nextFooter?.setProject(next.id);
  else row.ensureProjectReady(next.id).then(()=>{
    if(button.dataset.projectId===next.id)nextFooter?.setProject(next.id);
  });
}

function fillDetail(id){
  stopCaseStudy();
  const p=byId.get(id);detail.dataset.projectId=id;$('detail-title').textContent=p.discTitle||p.name;
  $('detail-credit').replaceChildren();
  for(const [label,value,href] of (p.credits||[['BY','SIYI YU']]).filter(([label])=>label.toUpperCase()!=='ROLE')){
    const item=document.createElement('span'),key=document.createElement('small'),text=document.createElement(href?'a':'span');
    key.textContent=label;text.textContent=value;
    if(href){
      text.href=href;text.target='_blank';text.rel='noopener noreferrer';text.className='detail-credit-link';
      text.setAttribute('aria-label',`${value} (opens in a new tab)`);
      const arrow=document.createElement('span');arrow.textContent=' ↗';arrow.setAttribute('aria-hidden','true');text.append(arrow);
    }
    item.append(key,text);$('detail-credit').append(item);
  }
  $('detail-fields').replaceChildren(...[['YEAR',p.year],['DISCIPLINE',p.category],['COLLECTION',p.collection?.toUpperCase()||(p.demo?'ARCHIVE STUDY / DEMO':'ORIGINAL CONCEPT')]].map(([k,v])=>{const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=v;const rule=document.createElement('span');rule.className='detail-field-rule';rule.setAttribute('aria-hidden','true');div.append(dt,dd,rule);return div;}));
  const hero=$('hero-image');hero.src=projectHero(p);hero.alt=p.heroAlt||`${p.name} project artwork`;hero.dataset.projectId=id;hero.dataset.fit=p.heroFit||'cover';hero.style.objectPosition=p.heroPosition||'50% 50%';hero.style.backgroundColor=p.heroBackground||'';
  $('image-caption').textContent=p.name.toUpperCase();$('image-id').textContent=`LISTENING ROOM / ${p.caseStudy?'CASE STUDY':id.toUpperCase()}`;
  $('story-title').textContent=p.headline;$('project-lede').textContent=p.lede;$('track-title').textContent=p.track||'';
  const story=$('story-sections');
  story.classList.toggle('case-study',!!p.caseStudy);$('project-view').classList.toggle('has-case-study',!!p.caseStudy);
  if(p.caseStudy)disposeCaseStudy=renderProjectCaseStudy(story,p.caseStudy,{scroller:detail,reducedMotion:reduced});
  else story.replaceChildren(...p.sections.map(([tag,title,text],i)=>{const section=document.createElement('section'),label=document.createElement('span'),h=document.createElement('h3'),body=document.createElement('p');section.className='story-section';label.className='micro';label.textContent=`0${i+1} / ${tag}`;h.textContent=title;body.textContent=text;section.append(label,h,body);return section;}));
  $('detail-disclaimer').textContent=p.demo?'Visual study / Demo placeholder. Full project notes to follow.':`${p.collection||'Original concept study'} · ${p.year}`;
  document.querySelector('.track-area').hidden=p.demo||!p.track;
  disposeProjectReveals=mountProjectReveals({root:$('project-view'),scroller:detail,gsap,reducedMotion:reduced});
  showNextProject(projects[(projects.findIndex(p=>p.id===id)+1)%projects.length]);
  if(p.game)disposeGame=mountGamePlayer(detail,p);
}
// Keep the existing open/close + full project story flow. The row's callback
// passes a stable project ID; array positions never identify detail content.
function openAlbum(id=state.selectedId,pushHistory=true,scrollAdvance=false){
  if(!byId.has(id)||!row)return;
  const request=++openRequest;
  if(row.isProjectReady&&!row.isProjectReady(id)){const page=state.page;row.ensureProjectReady(id).then(()=>{if(request===openRequest&&state.page===page)openAlbum(id,pushHistory,scrollAdvance);});return;}
  if(state.page==='detail'&&detail.dataset.projectId===id)return;
  const fromGallery=state.page==='home';
  const footerSource=state.page==='detail'&&!scrollAdvance?nextFooter?.transitionSource(id):null;
  nextFooter?.deactivate();
  transition?.kill();melting?.destroy();melting=null;row.deactivate();
  // Deep links also centre their project, so returning restores the opened disc.
  // A regular gallery click is already centred by the select-then-open rule.
  if(!fromGallery||state.selectedId!==id)row.select(id,{immediate:true});
  state.page='detail';toggleIndex(false);fillDetail(id);
  detail.hidden=false;detail.classList.toggle('scroll-advance-entering',scrollAdvance);detail.scrollTo({top:0,behavior:'instant'});home.inert=true;document.body.classList.add('detail-open');$('close-panel').hidden=false;
  const carryDisc=fromGallery||footerSource;
  if(carryDisc){root.hidden=false;gsap.set(root,{opacity:1});}
  const flip=carryDisc?row.playProjectTransition?.(id,{sourceModel:footerSource}):null;
  const animatedCarry=!!flip&&!reduced;
  melting=createMeltingSheet({scene:$('reveal-stage'),stage:$('melt-stage'),sheet:$('info-cover'),scroller:detail,reducedMotion:reduced,introDelay:animatedCarry?projectOpeningTiming.melt:0,onProgress:()=>diagnostics()});
  root.classList.toggle('project-transition-layer',!!flip&&!reduced);
  const scrollArrival = scrollAdvance && !reduced;
  const titleAt = reduced ? 0 : scrollArrival ? .16 : animatedCarry ? projectOpeningTiming.title : 0;
  const rulesAt = reduced ? 0 : scrollArrival ? .23 : animatedCarry ? projectOpeningTiming.rules : .08;
  const creditsAt = reduced ? 0 : scrollArrival ? .28 : animatedCarry ? projectOpeningTiming.credits : .12;
  transition=gsap.timeline().to(home,{opacity:0,duration:reduced?0:.18,overwrite:true},0)
    .fromTo(detail,{opacity:scrollArrival?1:0},{opacity:1,duration:reduced||scrollArrival?0:.28,overwrite:true},animatedCarry?.12:0);
  if(flip)transition.add(flip,0);
  transition.fromTo($('detail-title'),{yPercent:110},{yPercent:0,duration:reduced?0:.38,ease:'power3.out'},titleAt)
    .fromTo(document.querySelectorAll('.detail-field-rule'),{scaleX:0},{scaleX:1,duration:reduced?0:.38,stagger:reduced?0:.06,ease:'power3.out'},rulesAt)
    .fromTo($('detail-credit'),{'--credit-rule-progress':0},{'--credit-rule-progress':1,duration:reduced?0:.38,ease:'power3.out'},rulesAt)
    .fromTo(document.querySelectorAll('#detail-credit>span,#detail-fields>div'),{opacity:0,y:8},{opacity:1,y:0,duration:reduced?0:.26,stagger:reduced?0:.055,ease:'power2.out'},creditsAt)
    .fromTo($('read-story'),{autoAlpha:0},{autoAlpha:1,duration:reduced?0:.24,ease:'power2.out'},reduced?0:creditsAt+.12)
    .add(()=>{if(state.page==='detail'){root.hidden=true;root.classList.remove('project-transition-layer');detail.classList.remove('scroll-advance-entering');if(scrollAdvance)detail.scrollTo({top:0,behavior:'instant'});$('close-panel').focus({preventScroll:true});melting?.refresh();nextFooter?.activate();diagnostics();}});
  transition.eventCallback('onInterrupt',()=>{flip?.kill();detail.classList.remove('scroll-advance-entering');});
  if(pushHistory)history.pushState({projectId:id},'',`#project/${id}`);
  document.title=`${byId.get(id).name} — Listening Room`;diagnostics();
}
function closeAlbum(changeHistory=true){
  if(state.page!=='detail')return;
  showProjects(changeHistory);
}
function showProjects(changeHistory=true){
  openRequest++;
  if(state.page==='home')return;
  stopCaseStudy();
  nextFooter?.deactivate();
  transition?.kill();melting?.destroy();melting=null;
  detail.classList.remove('scroll-advance-entering');
  root.classList.remove('project-transition-layer');
  state.page='home';detail.hidden=true;detail.scrollTo({top:0,behavior:'instant'});root.hidden=false;home.hidden=false;home.inert=false;
  document.body.classList.remove('detail-open');$('close-panel').hidden=true;
  gsap.set(detail,{opacity:1});gsap.set([root,home],{opacity:1});
  if(!state.ids.includes(state.selectedId))setFilter('all');
  row.select(state.selectedId,{immediate:true});row.activate();
  transition=gsap.fromTo([root,home],{opacity:0},{opacity:1,duration:reduced?0:.35,overwrite:true});
  if(changeHistory)history.replaceState(null,'',location.pathname+location.search);
  document.title='Listening Room — Project Archive';$('open-album').focus({preventScroll:true});diagnostics();
}
function setFilter(filter){
  state.filter=filter;state.ids=projects.filter(p=>filter==='all'||p.demo).map(p=>p.id);
  row?.setProjects(state.ids,state.selectedId);renderIndex();
  document.querySelectorAll('[data-filter]').forEach(b=>{const active=b.dataset.filter===filter;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
}
$('open-album').addEventListener('click',()=>openAlbum());$('close-panel').addEventListener('click',()=>closeAlbum());
$('previous').addEventListener('click',()=>row?.step(-1));$('next').addEventListener('click',()=>row?.step(1));
$('index-toggle').addEventListener('click',()=>toggleIndex());
document.addEventListener('pointerdown',e=>{if(!$('index-panel').hidden&&!e.target.closest('#index-panel,#index-toggle'))toggleIndex(false);});
$('nav-projects').addEventListener('click',()=>showProjects());
document.querySelector('.wordmark').addEventListener('click',e=>{e.preventDefault();showProjects();});
$('next-project').addEventListener('click',e=>{if(!nextFooter||nextFooter.canOpen(e))openAlbum($('next-project').dataset.projectId);});
$('read-story').addEventListener('click',()=>{
  const destination=byId.get(detail.dataset.projectId)?.game?$('embedded-game'):$('project-view');
  detail.scrollTo({top:destination.offsetTop,behavior:reduced?'instant':'smooth'});
});
window.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('index-panel').hidden)toggleIndex(false);else if(state.page==='detail')closeAlbum();}});
window.addEventListener('popstate',()=>{row?.finishOpening?.();const id=location.hash.replace('#project/','');if(byId.has(id))openAlbum(id,false);else{showProjects(false);if(location.hash)history.replaceState(null,'',location.pathname+location.search);}});

const time=seconds=>`${Math.floor(seconds/60).toString().padStart(2,'0')}:${Math.floor(seconds%60).toString().padStart(2,'0')}`;
const audio=new DemoAudio(({playing,loading,position,duration,error})=>{
  $('play-button').textContent=loading?'…':playing?'Ⅱ':'▶';$('play-button').disabled=loading;$('play-button').setAttribute('aria-label',playing?'Pause audio preview':'Play audio preview');
  $('sound-toggle').setAttribute('aria-pressed',String(playing));$('sound-label').textContent=playing?'on':'off';
  $('player-status').textContent=error?'Audio unavailable. Please try again.':loading?'Preparing the original ambient preview…':playing?'Finding a place · Now playing':'Original ambient preview · Play to listen';
  $('player-time').textContent=`${time(position)} / ${time(duration)}`;$('seek').value=position;$('seek').setAttribute('aria-valuetext',`${time(position)} of ${time(duration)}`);
});
for(const id of ['play-button','sound-toggle','track-open'])$(id).addEventListener('click',()=>audio.toggle());
$('seek').addEventListener('input',e=>audio.seek(Number(e.target.value)));
window.addEventListener('pagehide',()=>{audio.pause();stopCaseStudy();nextFooter?.deactivate();row?.finishOpening?.();row?.deactivate();melting?.destroy();});

renderIndex();
try{
  row=await createRowOfDiscs({root,info:$('metadata'),projects,cover:projectCover,coverReady:ensureProjectCover,prepareOpening:openingInProgress,initialId:openingInProgress?projects[0].id:byId.has(location.hash.replace('#project/',''))?location.hash.replace('#project/',''):remembered,reducedMotion:reduced,autoRotate:!surfaceReview&&!freezeReview,
    canInteract:()=>!openingInProgress&&state.page==='home'&&$('index-panel').hidden,renderCard:p=>{if(!openingInProgress)projectInfo.show(p);},onChange:selectionChanged,onOpen:id=>openAlbum(id),onFrame:onRowFrame});
  nextFooter=row.createNextProjectFooter({section:$('next-project-section'),stage:$('next-project-stage'),host:$('next-disc-stage'),button:$('next-project'),scroller:detail,onAdvance:id=>openAlbum(id,true,true)});
  row.activate();diagnostics();
  row.ready.then(()=>preloadProjectCovers(projects)).then(ids=>{document.body.dataset.coverProjects=ids.filter(Boolean).join(',');});
  const beginOpening=()=>{
    openingInProgress=true;
    try{sessionStorage.setItem('lr-opening-seen','1');}catch{}
    home.inert=true;document.querySelector('.navigation').inert=true;
    document.body.classList.add('opening-active');
    row.playOpening({review:introReview,onHandoff(){
      document.documentElement.classList.remove('opening-pending');document.body.classList.add('opening-handoff');
      projectInfo.show(byId.get(state.selectedId),{force:true});
    },onComplete(){
      openingInProgress=false;home.inert=false;document.querySelector('.navigation').inert=false;
      document.documentElement.classList.remove('opening-pending');document.body.classList.remove('opening-active','opening-handoff');diagnostics();
    }});
  };
  if(openingInProgress)beginOpening();
  if(introReview){
    const review=document.createElement('div');review.className='opening-review';
    review.innerHTML='<span>LOCAL PREVIEW</span><button type="button">Replay opening</button>';
    document.body.append(review);
    review.querySelector('button').addEventListener('click',()=>{if(!openingInProgress&&state.page==='home')beginOpening();});
  }
  if(surfaceReview){const {mountDiscReview}=await import('/__preview/disc-review.js');mountDiscReview(row,root);}
}catch(error){
  openingInProgress=false;document.documentElement.classList.remove('opening-pending');document.body.classList.remove('opening-active','opening-handoff');home.inert=false;document.querySelector('.navigation').inert=false;
  console.error('Disc gallery unavailable:',error);root.querySelector('[data-attesa]').textContent='3D preview unavailable. Browse and open projects through Index.';
  // Keep all existing project stories usable when WebGL is unavailable.
  row={select(id){selectionChanged(id);return true;},activate(){},deactivate(){},setProjects(){},step(direction){const i=state.ids.indexOf(state.selectedId);selectionChanged(state.ids[Math.max(0,Math.min(state.ids.length-1,i+direction))]);},get diagnostics(){return {enabled:false,listeners:0,position:state.ids.indexOf(state.selectedId),target:state.ids.indexOf(state.selectedId)};}};
  selectionChanged(state.selectedId);
  projectInfo.show(byId.get(state.selectedId),{immediate:true});
}
const initial=location.hash.replace('#project/','');
window.removeEventListener('click',skipPendingOpening,true);window.removeEventListener('keydown',skipPendingOpening,true);
if(byId.has(initial)){await row.ready;openAlbum(initial,false);}else if(location.hash)history.replaceState(null,'',location.pathname+location.search);
