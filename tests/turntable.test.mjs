import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,Euler,Quaternion,ConeGeometry} from '../dist/vendor/three.module.js';
import {TurntableMotion,turntableConfig as c,sampleRecordEntry,needlePosition,needleRadius,entryYaw,contactPitch} from '../dist/turntable-motion.js';
const advance=(motion,seconds)=>{for(let t=0;t<seconds;t+=1/120)motion.update(1/120);return motion.diagnostics;};

test('the record fully clears the sleeve before rotating flat or approaching the spindle',()=>{
  const before=sampleRecordEntry(c.entry.extractEnd-.001),released=sampleRecordEntry(c.entry.extractEnd);
  assert.equal(before.phase,'extracting');assert.deepEqual(before.rotation,c.sleeve.rotation);
  const local=new Vector3(...released.position).sub(new Vector3(...c.sleeve.position));
  local.applyQuaternion(new Quaternion().setFromEuler(new Euler(...c.sleeve.rotation)).invert());
  assert.ok(Math.abs(local.x-c.sleeve.extractDistance)<1e-10);assert.ok(Math.abs(local.y)+Math.abs(local.z)<1e-10);
  assert.ok(c.sleeve.extractDistance-c.record.radius>c.sleeve.size/2);
  const aligned=sampleRecordEntry(c.entry.alignEnd);
  assert.equal(aligned.position[0],c.platter.x);assert.equal(aligned.position[2],c.platter.z);assert.equal(aligned.rotation[0],-Math.PI/2);
  const halfway=sampleRecordEntry((c.entry.dropStart+c.entry.land)/2);
  assert.equal(halfway.position[0],c.platter.x);assert.equal(halfway.position[2],c.platter.z);
  assert.ok(halfway.position[1]>c.record.centreY);
});

test('actual Three.js arm transforms put the stylus just above the outer groove',()=>{
  const physical=new Vector3(0,-c.arm.needleDrop,c.arm.length).applyEuler(new Euler(contactPitch,0,0)).applyEuler(new Euler(0,entryYaw,0)).add(new Vector3(...c.arm.pivot));
  const point=needlePosition(entryYaw,contactPitch);
  assert.ok(physical.distanceTo(new Vector3(point.x,point.y,point.z))<1e-10);
  assert.ok(Math.abs(point.y-c.record.top-.002)<1e-10);
  assert.ok(Math.abs(needleRadius(point)-c.arm.outerTrack)<1e-10);
});

test('the placed record rests exactly on the mat and clears the spindle',()=>{
  assert.ok(Math.abs(c.record.centreY-c.record.thickness/2-c.platter.top)<1e-12);
  assert.ok(Math.abs(c.record.centreY+c.record.thickness/2-c.record.top)<1e-12);
  assert.ok(c.record.hole>.032+.005);
});

test('the whole diamond tip stays above the record rather than intersecting it',()=>{
  const geometry=new ConeGeometry(c.arm.tipRadius,c.arm.tipHeight,12).rotateZ(Math.PI).translate(0,c.arm.tipHeight/2,0);
  const positions=geometry.getAttribute('position');
  for(let n=0;n<positions.count;n++){
    const point=new Vector3().fromBufferAttribute(positions,n).add(new Vector3(0,-c.arm.needleDrop,c.arm.length)).applyEuler(new Euler(contactPitch,0,0)).applyEuler(new Euler(0,entryYaw,0)).add(new Vector3(...c.arm.pivot));
    assert.ok(point.y>=c.record.top+.00199);
  }
  geometry.dispose();
});

test('the extraction and flight arc clear the rear wooden edge',()=>{
  for(let time=0;time<c.entry.dropStart;time+=.008){
    const pose=sampleRecordEntry(time);
    for(let n=0;n<80;n++){
      const point=new Vector3(Math.cos(n*Math.PI/40)*c.record.radius,Math.sin(n*Math.PI/40)*c.record.radius,0).applyEuler(new Euler(...pose.rotation)).add(new Vector3(...pose.position));
      assert.ok(!(Math.abs(point.x)<2.775&&Math.abs(point.z)<1.925&&point.y<.54&&point.y>.1),`wood intersection at ${time}`);
    }
  }
});

test('entrance starts empty and finishes with a rotating record and lowered needle in about three seconds',()=>{
  const motion=new TurntableMotion();assert.equal(motion.record.phase,'sleeved');assert.equal(motion.rotationRate,0);assert.equal(motion.armPhase,'rest');
  const phases=new Set();for(let t=0;t<3.2;t+=1/120){motion.update(1/120);phases.add(motion.armPhase);if(!motion.record.placed)assert.equal(motion.rotationRate,0);}
  for(const phase of ['lifting','swinging-in','lowering-needle','playing'])assert.ok(phases.has(phase),phase);
  assert.equal(motion.diagnostics.contact,true);assert.ok(motion.rotationRate>3);
});

test('pause lifts before swinging and preserves the stopped record angle; play reuses the placed record',()=>{
  const motion=new TurntableMotion();advance(motion,4);motion.setPlaying(false);
  assert.equal(motion.armPhase,'lifting');const originalYaw=motion.yaw;advance(motion,.1);assert.equal(motion.yaw,originalYaw);
  advance(motion,2.5);assert.equal(motion.armPhase,'rest');assert.equal(motion.rotationRate,0);
  const angle=motion.angle;advance(motion,.5);assert.equal(motion.angle,angle);
  motion.setPlaying(true);assert.equal(motion.record.placed,true);assert.equal(motion.angle,angle);advance(motion,1.5);
  assert.equal(motion.armPhase,'playing');assert.equal(motion.record.phase,'on-platter');
});

test('rapid interrupted commands finish in the final requested state without dragging the needle',()=>{
  for(const last of [true,false]){
    const motion=new TurntableMotion();advance(motion,3.4);
    for(const intent of [false,true,false,true,false,last]){motion.setPlaying(intent);for(let t=0;t<.11;t+=1/120){motion.update(1/120);assert.ok(motion.diagnostics.needle.y>=c.record.top+.0019);}}
    advance(motion,3);assert.equal(motion.desiredPlaying,last);assert.equal(motion.armPhase,last?'playing':'rest');
    assert.equal(motion.diagnostics.contact,last);assert.equal(motion.rotationRate>0,last);
  }
});

test('slow inward travel stays in the outer groove band and never reaches the photo label',()=>{
  const motion=new TurntableMotion();advance(motion,4);const initial=motion.diagnostics.needleRadius;
  for(let i=0;i<24000;i++){motion.update(.025);const state=motion.diagnostics;assert.ok(state.needleRadius>1.14&&state.needleRadius<1.231);assert.ok(state.needle.y>=c.record.top);}
  assert.ok(motion.diagnostics.needleRadius<initial);
});

test('reduced-motion entrance is fully placed, stationary and parked until explicit Play',()=>{
  const motion=new TurntableMotion({reducedMotion:true});advance(motion,5);
  assert.equal(motion.record.placed,true);assert.equal(motion.angle,0);assert.equal(motion.rotationRate,0);assert.equal(motion.armPhase,'rest');
  motion.setPlaying(true);advance(motion,1.5);assert.equal(motion.diagnostics.contact,true);assert.ok(motion.rotationRate>0);
});
