// Shared by the two page adapters. An inactive page has no input listeners.
export class InteractionScope {
  constructor(){this.controller=new AbortController();this.count=0;this.closed=false;}
  on(target,type,handler,options={}){
    if(this.closed)throw new Error('Cannot bind a closed interaction scope');
    target.addEventListener(type,handler,{...options,signal:this.controller.signal});
    this.count++;
  }
  close(){if(this.closed)return;this.closed=true;this.controller.abort();this.count=0;}
}

// A trackpad tail must not advance the queue, but a renewed impulse or reversal
// must not wait for that tail to end. No animation or timer owns this state.
export class WheelGesture {
  constructor(){this.reset();}
  reset(){this.total=0;this.lastEvent=-Infinity;this.lastStep=-Infinity;this.consumed=false;this.direction=0;this.peak=0;this.valley=Infinity;this.reason='reset';}
  feed(delta,time){
    if(!Number.isFinite(delta)||!Number.isFinite(time)||Math.abs(delta)<.01){this.reason='empty';return 0;}
    const magnitude=Math.abs(delta),direction=Math.sign(delta),gap=time-this.lastEvent;
    const reversal=this.direction!==0&&direction!==this.direction;
    const renewed=this.consumed&&time-this.lastStep>=110&&this.valley<this.peak*.45&&magnitude>=Math.max(8,this.valley*2.4);
    if(gap>=110||reversal||renewed){
      this.total=0;this.consumed=false;this.peak=0;this.valley=Infinity;
      this.reason=reversal?'reversal':renewed?'renewed-impulse':'new-gesture';
    }else this.reason=this.consumed?'inertia-tail':'accumulating';
    this.lastEvent=time;this.direction=direction;
    this.peak=Math.max(this.peak,magnitude);
    if(this.consumed){this.valley=Math.min(this.valley,magnitude);return 0;}
    this.total+=delta;
    if(Math.abs(this.total)<18)return 0;
    const step=Math.sign(this.total);
    this.total=0;this.lastStep=time;this.consumed=true;this.valley=magnitude;
    this.reason='step';return step;
  }
}
