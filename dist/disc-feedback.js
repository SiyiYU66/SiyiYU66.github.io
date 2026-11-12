// Pointer feedback lives on the disc's local group, independently of the queue.
export function updateDiscFloat(state,{hovered,y=0,time=0,reduced=false},dt){
  const targetY=!reduced&&hovered ? .075+y*.12+Math.sin(time*2.2)*.008 : 0;
  const targetZ=!reduced&&hovered ? .11 : 0;
  // Substeps keep the damped spring stable on slower displays and resume frames.
  let remaining=Math.min(.064,Math.max(0,dt));
  while(remaining>0){
    const step=Math.min(remaining,1/120);remaining-=step;
    for(const [position,velocity,target] of [['lift','liftVelocity',targetY],['depth','depthVelocity',targetZ]]){
      state[velocity]+=(target-state[position])*100*step;
      state[velocity]*=Math.exp(-14*step);
      state[position]+=state[velocity]*step;
    }
  }
  return state;
}
export function discMarkerVisible(activeId,hoveredId,tapSelectedId,position,activeIndex){
  return Math.abs(position-activeIndex)<.08&&(hoveredId===activeId||tapSelectedId===activeId);
}
