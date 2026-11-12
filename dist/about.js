import {createTurntable} from './turntable.js';
import {createTurntableArt} from './turntable-art.js';
import {profile,loadProfileMedia} from './profile.js';

export async function createAboutPage({canInteract,onFrame=()=>{},reducedMotion=false}){
  const $=id=>document.getElementById(id),play=$('portrait-play'),cv=$('view-cv'),dialog=$('cv-dialog');
  let media={photo:null,cvAvailable:false};
  // The profile and CV are usable independently of the record sequence.
  $('about-name').textContent=profile.name;
  const copy=$('about-metadata');copy.querySelector('[data-regia]').textContent=profile.degree;copy.querySelector('[data-anno]').textContent=profile.university;copy.querySelector('[data-con]').textContent=profile.introduction;
  cv.href=profile.cv;
  cv.addEventListener('click',event=>{if(!media.cvAvailable){event.preventDefault();dialog.showModal();}});
  $('cv-dialog-close').addEventListener('click',()=>dialog.close());$('cv-dialog-done').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  $('experience-list').replaceChildren(...profile.experience.map(item=>{
    const row=document.createElement('div'),name=document.createElement('h3'),role=document.createElement('p');row.className='experience-row';name.textContent=item.organization;role.textContent=item.role;row.append(name,role);return row;
  }));
  media=await loadProfileMedia();
  $('portrait-status').textContent=media.photo?'PORTRAIT / SIYI YU':'PORTRAIT / TO FOLLOW';
  $('cv-availability').textContent=media.cvAvailable?'PDF':'PDF · COMING SOON';
  $('about-record').setAttribute('aria-label','Interactive walnut turntable with a Siyi Yu picture disc. Use Play or click the record or body to control visual playback.');
  const statuses={rest:'Paused · Record at rest',lifting:'Lifting the tonearm','swinging-in':'Moving to the outer groove','lowering-needle':'Lowering the needle',playing:'33 ⅓ RPM · Visual playback','swinging-out':'Returning the tonearm','settling-on-rest':'Settling on the arm rest'};
  const entering={sleeved:'Side A / A personal record',extracting:'Sliding the picture disc from its sleeve',aligning:'Aligning with the spindle',aligned:'Ready to lower',lowering:'Lowering onto the spindle'};
  let lastStatus='';
  const table=createTurntable({root:$('about-record'),artwork:createTurntableArt(media.photo),canInteract,reducedMotion,
    onState(state){
      const label=state.playing?'Ⅱ Pause':'▶ Play';if(play.textContent!==label)play.textContent=label;
      if(play.getAttribute('aria-pressed')!==String(state.playing))play.setAttribute('aria-pressed',String(state.playing));
      const ariaLabel=state.playing?'Pause turntable':'Play turntable';if(play.getAttribute('aria-label')!==ariaLabel)play.setAttribute('aria-label',ariaLabel);
      const status=state.placed?(state.armPhase==='rest'&&state.rotationRate>0?'Slowing to rest':statuses[state.armPhase]):entering[state.entryPhase];
      if(status!==lastStatus){$('turntable-status').textContent=status;lastStatus=status;}
      onFrame(state);
    }
  });
  play.disabled=false;
  play.addEventListener('click',()=>{if(canInteract())table.toggle();});
  return {
    activate(){table.activate();},
    deactivate(){table.setPlaying(false);table.deactivate();if(dialog.open)dialog.close();},
    get diagnostics(){return {...table.diagnostics,photoAvailable:!!media.photo,cvAvailable:media.cvAvailable};},
    destroy(){table.destroy();}
  };
}
