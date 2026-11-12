// Local-only review controls mounted on the real Projects page, not another scene.
export function mountDiscReview(row,root){
  row.select('between-spaces',{immediate:true});
  const panel=document.createElement('aside');panel.setAttribute('aria-label','Disc surface comparison');
  Object.assign(panel.style,{position:'fixed',left:'36px',bottom:'104px',zIndex:15,display:'flex',gap:'14px',alignItems:'center',font:'11px var(--sans)',background:'#211e19ed',padding:'12px',border:'1px solid #645a4d'});
  const label=document.createElement('span');label.textContent='SURFACE STUDY / AFTER';label.style.fontSize='9px';
  const before=document.createElement('button'),after=document.createElement('button'),sweep=document.createElement('button');
  before.textContent='Before';after.textContent='After';sweep.textContent='Slow pointer sweep';
  const set=value=>{row.setSurfaceEnabled(value);label.textContent=`SURFACE STUDY / ${value?'AFTER':'BEFORE'}`;before.setAttribute('aria-pressed',String(!value));after.setAttribute('aria-pressed',String(value));};
  before.onclick=()=>set(false);after.onclick=()=>set(true);sweep.onclick=()=>row.startPointerStudy();set(true);
  panel.append(label,before,after,sweep);document.body.append(panel);
  for(const [mode,title] of [['previous','Previous light'],['studio','White-mode reflection'],['night','Refined light']]){
    const button=document.createElement('button');button.textContent=title;button.onclick=()=>row.setLightingStudy(mode);panel.append(button);
  }
  const pointer=document.createElement('div');pointer.setAttribute('aria-hidden','true');
  Object.assign(pointer.style,{position:'fixed',width:'10px',height:'10px',border:'1px solid #151515',borderRadius:'50%',background:'#ffffffa0',pointerEvents:'none',zIndex:16,display:'none'});
  document.body.append(pointer);
  const note=document.createElement('span');note.textContent='AUTO POINTER STUDY';Object.assign(note.style,{position:'fixed',right:'36px',bottom:'104px',font:'9px var(--sans)',display:'none',zIndex:16});document.body.append(note);
  function frame(){const running=root.dataset.reviewSweep==='running'&&document.body.dataset.page==='home';pointer.style.display=note.style.display=running?'block':'none';pointer.style.left=`${Number(root.dataset.reviewPointerX)-5}px`;pointer.style.top=`${Number(root.dataset.reviewPointerY)-5}px`;requestAnimationFrame(frame);}requestAnimationFrame(frame);
}
