// Intro and playable arena share the existing detail route and its cleanup.
export function mountGamePlayer(detail,project){
  let panel=detail.querySelector('#embedded-game');
  if(!panel){panel=document.createElement('section');panel.id='embedded-game';panel.className='embedded-game';}
  // The shared title/melting hero remains first, followed by the playable story.
  detail.insertBefore(panel,detail.querySelector('#next-project-section'));
  panel.replaceChildren();
  const make=(tag,className,text)=>{const el=document.createElement(tag);el.className=className;if(text)el.textContent=text;return el;};
  const intro=make('section','game-intro'),hero=make('div','game-intro-hero'),copy=make('div','game-intro-copy');
  copy.append(make('p','micro','PLAYABLE PROJECT / DESIGNED & BUILT BY SIYI YU'),make('h2','game-project-title',project.name),make('h3','game-pitch','Read the water. Own the battle.'),make('p','game-intro-lede','A classic naval duel, rebuilt for deduction, deception and cinematic feedback. Outsmart an AI that hunts your fleet, challenge a friend beside you, or take the battle online.'));
  const play=make('button','game-start','Start in landscape ↗');play.setAttribute('aria-expanded','false');copy.append(play,make('p','game-play-note','Landscape play · PC + mobile online · No download'));
  hero.append(copy);
  const features=make('div','game-features');
  for(const [label,title,text] of [
    ['01 / ADAPTIVE AI','An opponent that hunts back.','Three difficulty levels. Hard mode searches efficiently, follows a hit and locks onto your ship’s direction.'],
    ['02 / TACTICAL DEPTH','Make information your weapon.','In two-player battles, Sonar scans a 3×3 area while Ghost Move lets your fleet escape and deceive. Every use costs a turn.'],
    ['03 / PLAY YOUR WAY','One screen. Two screens. One ocean.','Play solo, pass the device between friends, or connect with a room code. Reactive sound and visual feedback make every shot count.']
  ]){const item=make('section','game-feature');item.append(make('p','micro',label),make('h3','',title),make('p','',text));features.append(item);}
  intro.append(hero,features);
  const arena=make('section','game-arena');arena.setAttribute('aria-label','Play Battleship');
  arena.hidden=true;
  const frame=document.createElement('iframe');frame.title='Battleship playable game';frame.allow='fullscreen; autoplay';frame.allowFullscreen=true;frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-modals');frame.src='about:blank';let loaded=false;
  const gameUrl=new URL('./arena.html?release=20',new URL(project.game,location.href)).href;
  const load=()=>{if(loaded)return;loaded=true;frame.src=gameUrl;};
  arena.append(frame);panel.append(intro,arena);panel.hidden=false;document.body.classList.add('game-open');
  const story=detail.querySelector('#project-view'),storyWasHidden=story.hidden;story.hidden=true;
  play.addEventListener('click',()=>{
    const simulatedTouch=['127.0.0.1','localhost'].includes(location.hostname)&&new URLSearchParams(location.search).get('device')==='touch';
    if(matchMedia('(pointer:coarse)').matches||simulatedTouch){
      window.dispatchEvent(new Event('listening-room:standalone-game'));
      const directGame=new URL(gameUrl);directGame.searchParams.set('standalone','1');
      if(simulatedTouch)directGame.searchParams.set('device','touch');
      location.assign(directGame.href);return;
    }
    expand(true);
  });
  const leave=()=>{try{frame.contentWindow?.leaveBattleship?.();}catch{}};
  const expand=value=>{if(value)load();arena.hidden=!value;arena.classList.toggle('is-fullscreen',value);document.body.classList.toggle('game-expanded',value);play.setAttribute('aria-expanded',String(value));if(!value){play.textContent='Resume Battleship ↗';play.focus();}};
  const message=event=>{if(event.origin===location.origin&&event.source===frame.contentWindow&&event.data?.type==='battleship:exit')expand(false);};window.addEventListener('message',message);
  const escape=event=>{if(event.key==='Escape'&&arena.classList.contains('is-fullscreen')){expand(false);event.stopImmediatePropagation();}};document.addEventListener('keydown',escape,true);
  const entrance=window.gsap&&!matchMedia('(prefers-reduced-motion: reduce)').matches?window.gsap.fromTo([copy,...features.children],{opacity:0,y:18},{opacity:1,y:0,duration:.65,stagger:.07,ease:'power3.out'}):null;
  return ()=>{leave();entrance?.kill();document.removeEventListener('keydown',escape,true);window.removeEventListener('message',message);frame.src='about:blank';panel.replaceChildren();panel.hidden=true;document.body.classList.remove('game-open','game-expanded');story.hidden=storyWasHidden;};
}
