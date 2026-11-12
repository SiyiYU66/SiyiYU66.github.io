// Mechanical coordinates are shared by the model and its contact tests.
export const turntableConfig={
  platter:{x:-.65,z:.05,top:.771,radius:1.46},
  record:{radius:1.35,hole:.045,thickness:.035,centreY:.7885,top:.806},
  arm:{pivot:[1.85,.99,-1.10],length:2.4,needleDrop:.14,tipHeight:.014,tipRadius:.004,restYaw:.1,restPitch:0,outerTrack:1.23,maxInwardYaw:.035},
  sleeve:{position:[-2.60,1.55,-2.30],rotation:[-.12,0,0],size:3.02,extractDistance:2.92},
  entry:{extractStart:.24,extractEnd:.94,alignEnd:1.54,dropStart:1.64,land:2.00,armStart:2.04},
  rpm:100/3
};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const c=turntableConfig,a=c.arm;
const verticalReach=Math.hypot(a.length,a.needleDrop);
export function pitchForNeedleHeight(y){return Math.asin(clamp((a.pivot[1]-y)/verticalReach,-1,1))-Math.atan2(a.needleDrop,a.length);}
export const contactPitch=pitchForNeedleHeight(c.record.top+.002);
export const liftedPitch=pitchForNeedleHeight(c.record.top+.242);
const horizontalReach=a.length*Math.cos(contactPitch)-a.needleDrop*Math.sin(contactPitch);
const dx=a.pivot[0]-c.platter.x,dz=a.pivot[2]-c.platter.z,distance=Math.hypot(dx,dz);
export const entryYaw=Math.asin((a.outerTrack*a.outerTrack-distance*distance-horizontalReach*horizontalReach)/(2*distance*horizontalReach))-Math.atan2(dz,dx);

export function needlePosition(yaw,pitch){
  const horizontal=a.length*Math.cos(pitch)-a.needleDrop*Math.sin(pitch);
  return {x:a.pivot[0]+horizontal*Math.sin(yaw),y:a.pivot[1]-a.needleDrop*Math.cos(pitch)-a.length*Math.sin(pitch),z:a.pivot[2]+horizontal*Math.cos(yaw)};
}
export function needleRadius(point){return Math.hypot(point.x-c.platter.x,point.z-c.platter.z);}

export function sampleRecordEntry(time){
  const e=c.entry,s=c.sleeve;
  const extracted=ease((time-e.extractStart)/(e.extractEnd-e.extractStart));
  // This is sleeve-local +X, transformed by the same Euler rotation as its opening.
  const slide=s.extractDistance*extracted;
  const out=[s.position[0]+slide*Math.cos(s.rotation[1]),s.position[1]+slide*Math.sin(s.rotation[0])*Math.sin(s.rotation[1]),s.position[2]-slide*Math.cos(s.rotation[0])*Math.sin(s.rotation[1])];
  const flight=ease((time-e.extractEnd)/(e.alignEnd-e.extractEnd));
  const above=[c.platter.x,1.64,c.platter.z];
  const position=out.map((v,i)=>mix(v,above[i],i===1?flight:ease(flight)));
  // Clear the rear edge of the wooden deck before travelling over the platter.
  position[1]+=1.1*Math.sin(flight*Math.PI);
  const drop=ease((time-e.dropStart)/(e.land-e.dropStart));
  if(time>=e.alignEnd){position[0]=above[0];position[2]=above[2];position[1]=mix(above[1],c.record.centreY,drop);}
  return {position,rotation:[mix(s.rotation[0],-Math.PI/2,flight),mix(s.rotation[1],0,flight),0],placed:time>=e.land,
    phase:time<e.extractStart?'sleeved':time<e.extractEnd?'extracting':time<e.alignEnd?'aligning':time<e.dropStart?'aligned':time<e.land?'lowering':'on-platter'};
}

export class TurntableMotion{
  constructor({reducedMotion=false}={}){this.reducedMotion=reducedMotion;this.reset();}
  reset(){
    this.time=this.reducedMotion?3.2:0;this.desiredPlaying=!this.reducedMotion;this.angle=0;this.rotationRate=0;this.playedSeconds=0;
    this.yaw=a.restYaw;this.pitch=a.restPitch;this.armPhase='rest';this.stage=null;this.ready=false;
    this.record=sampleRecordEntry(this.time);
  }
  get trackYaw(){return entryYaw-Math.min(a.maxInwardYaw,this.playedSeconds*.0002);}
  setPlaying(value){
    value=!!value;if(value===this.desiredPlaying)return;
    this.desiredPlaying=value;
    if(this.ready)this.reconcile();
  }
  toggle(){this.setPlaying(!this.desiredPlaying);}
  startStage(name,yaw,pitch,duration){this.armPhase=name;this.stage={name,fromYaw:this.yaw,fromPitch:this.pitch,toYaw:yaw,toPitch:pitch,duration,time:0};}
  reconcile(){
    if(this.armPhase==='lifting')return; // Finish lifting, then use the latest intent.
    if(Math.abs(this.pitch-liftedPitch)>.0001)this.startStage('lifting',this.yaw,liftedPitch,.18);
    else this.swing();
  }
  swing(){
    const destination=this.desiredPlaying?this.trackYaw:a.restYaw;
    const duration=Math.max(.12,.42*Math.abs(destination-this.yaw)/Math.abs(entryYaw-a.restYaw));
    this.startStage(this.desiredPlaying?'swinging-in':'swinging-out',destination,liftedPitch,duration);
  }
  finishStage(){
    const name=this.stage.name;this.stage=null;
    if(name==='lifting')this.swing();
    else if(name==='swinging-in'||name==='swinging-out'){
      const destination=this.desiredPlaying?this.trackYaw:a.restYaw;
      if(Math.abs(this.yaw-destination)>.0002){this.swing();return;}
      this.startStage(this.desiredPlaying?'lowering-needle':'settling-on-rest',this.yaw,this.desiredPlaying?contactPitch:a.restPitch,.24);
    }else this.armPhase=this.desiredPlaying?'playing':'rest';
  }
  update(dt){
    dt=clamp(dt,0,.05);this.time+=dt;this.record=sampleRecordEntry(this.time);
    if(!this.ready&&this.time>=c.entry.armStart){this.ready=true;if(this.desiredPlaying)this.reconcile();}
    const target=this.record.placed&&this.desiredPlaying?c.rpm*Math.PI*2/60:0;
    const oldRate=this.rotationRate;
    this.rotationRate+=(target-this.rotationRate)*(1-Math.exp(-(target?2.7:4.2)*dt));
    if(Math.abs(this.rotationRate-target)<.001)this.rotationRate=target;
    this.angle-=(oldRate+this.rotationRate)*.5*dt;
    if(this.stage){
      const stage=this.stage;stage.time+=dt;const t=ease(stage.time/stage.duration);
      this.yaw=mix(stage.fromYaw,stage.toYaw,t);this.pitch=mix(stage.fromPitch,stage.toPitch,t);
      if(stage.time>=stage.duration){this.yaw=stage.toYaw;this.pitch=stage.toPitch;this.finishStage();}
    }else if(this.armPhase==='playing'){
      this.playedSeconds+=dt;this.yaw=this.trackYaw;this.pitch=contactPitch;
    }
    return this.diagnostics;
  }
  get diagnostics(){
    const needle=needlePosition(this.yaw,this.pitch);
    return {playing:this.desiredPlaying,angle:this.angle,rotationRate:this.rotationRate,entryPhase:this.record.phase,placed:this.record.placed,armPhase:this.armPhase,
      yaw:this.yaw,pitch:this.pitch,needle,needleRadius:needleRadius(needle),contact:this.armPhase==='playing'&&this.desiredPlaying&&this.record.placed};
  }
}
