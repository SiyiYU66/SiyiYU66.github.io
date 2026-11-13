// Native modal focus/inert behavior keeps the portrait separate from browsing.
// Closing never changes the route, selected disc or detail scroll position.
export function mountProfileDialog({trigger,dialog,closeButton,reducedMotion=false,onOpen=()=>{}}){
  let motion=null,closing=false,press=null;
  const setExpanded=value=>trigger.setAttribute('aria-expanded',String(value));
  function close(){
    if(!dialog.open||closing)return;
    closing=true;press=null;motion?.cancel();
    const finish=()=>{motion?.cancel();motion=null;dialog.close();closing=false;};
    if(reducedMotion||!dialog.animate){finish();return;}
    motion=dialog.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-6px)'}],{duration:150,easing:'ease-in'});
    motion.finished.then(finish,()=>{});
  }
  function open(){
    if(dialog.open)return;
    onOpen();motion?.cancel();closing=false;setExpanded(true);dialog.showModal();dialog.scrollTop=0;
    if(!reducedMotion&&dialog.animate)motion=dialog.animate([{opacity:0,transform:'translateY(12px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:260,easing:'cubic-bezier(.22,1,.36,1)'});
  }
  const outside=event=>{
    const r=dialog.getBoundingClientRect();
    return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;
  };
  trigger.addEventListener('click',open);
  closeButton.addEventListener('click',close);
  dialog.addEventListener('pointerdown',event=>{press=event.button===0?{x:event.clientX,y:event.clientY,outside:outside(event)}:null;});
  dialog.addEventListener('pointercancel',()=>{press=null;});
  dialog.addEventListener('click',event=>{
    if(event.target===dialog&&press?.outside&&outside(event)&&Math.hypot(event.clientX-press.x,event.clientY-press.y)<8)close();
    press=null;
  });
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}
  });
  dialog.addEventListener('close',()=>{
    motion?.cancel();motion=null;closing=false;press=null;setExpanded(false);
    trigger.focus({preventScroll:true});
  });
  return {open,close};
}
