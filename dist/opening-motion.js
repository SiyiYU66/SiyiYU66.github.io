// Seconds; six intentional beats, with an extra half-beat before the surname.
export const openingTiming={beats:[.12,.34,.56,.78,1.11,1.33],flight:.5,hold:.7,handoff:.7};
export const openingLetters=[...'SIYIYU'];
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export function openingLayout(width,height,glyphWidths=null){
  const radius=Math.min(width*.43,height*.59)*.6,fontSize=Math.min(width*.117,122);
  // Width-aware typesetting avoids collisions between wide Y/S and narrow I.
  const widths=glyphWidths||[.62,.3,.68,.3,.68,.74].map(v=>v*fontSize);
  const tracking=fontSize*.025,space=fontSize*.28;
  let cursor=width/2-(widths.reduce((sum,w)=>sum+w,0)+tracking*5+space)/2;
  const slots=widths.map((w,i)=>{const x=cursor+w/2;cursor+=w+tracking+(i===3?space:0);return x;});
  return {width,height,radius,fontSize,centre:{x:width/2,y:height-radius*.5},
    contact:{x:width/2+radius*.64,y:height-radius*1.265},
    slots,nameY:height*.31};
}
export function sampleOpening(time,layout){
  const lastLanding=openingTiming.beats.at(-1)+openingTiming.flight;
  const handoffAt=lastLanding+openingTiming.hold;
  const handoff=smooth((time-handoffAt)/openingTiming.handoff);
  const notes=openingLetters.map((letter,index)=>{
    const age=time-openingTiming.beats[index],p=clamp(age/openingTiming.flight);
    // Shared origin, lifted control point, then a quiet, level landing.
    const start=layout.contact,end={x:layout.slots[index],y:layout.nameY};
    const control={x:start.x+(end.x-start.x)*.3,y:Math.min(end.y,start.y)-layout.height*.15};
    const q=1-p;
    return {letter,index,age,p,visible:age>=0,landed:p===1,
      x:q*q*start.x+2*q*p*control.x+p*p*end.x,
      y:q*q*start.y+2*q*p*control.y+p*p*end.y,
      morph:smooth((p-.68)/.32),pulse:age>=0&&age<.13?Math.sin(age/.13*Math.PI):0};
  });
  return {time,notes,lastLanding,handoffAt,handoff,
    complete:time>=handoffAt+openingTiming.handoff,
    phase:time<handoffAt?'name':handoff<1?'handoff':'complete'};
}
export function shouldPlayOpening({hash='',seen=false,reducedMotion=false,review=false}={}){
  return !hash&&(review||!seen);
}
