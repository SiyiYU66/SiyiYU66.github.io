import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PerspectiveCamera,Group,Mesh,RingGeometry,MeshBasicMaterial,DoubleSide,Vector3} from '../dist/vendor/three.module.js';
import {createDiscPicker,discTapAction} from '../dist/disc-hit-test.js';
import {projects} from '../dist/projects.js';
import {updateDiscFloat,discMarkerVisible} from '../dist/disc-feedback.js';

test('tap-selected disc receives the existing marker after arrival even without hover',()=>{
  assert.equal(discMarkerVisible('A',null,'A',0,0),true);
  assert.equal(discMarkerVisible('A',null,'A',.4,0),false);
  assert.equal(discMarkerVisible('B','C',null,1,1),false);
  assert.equal(discMarkerVisible('B','B',null,1,1),true);
});
test('hover float follows vertical pointer position and settles back without drift',()=>{
  const make=()=>({lift:0,liftVelocity:0,depth:0,depthVelocity:0});
  const top=make(),bottom=make();
  for(let n=0;n<180;n++){
    updateDiscFloat(top,{hovered:true,y:.8,time:0},1/60);
    updateDiscFloat(bottom,{hovered:true,y:-.8,time:0},1/60);
  }
  assert.ok(top.lift-bottom.lift>.18&&top.lift-bottom.lift<.21);assert.ok(top.depth>.10&&top.depth<.12);
  for(let n=0;n<240;n++)updateDiscFloat(top,{hovered:false},1/60);
  assert.ok(Math.abs(top.lift)<.0001);assert.ok(Math.abs(top.depth)<.0001);
});
test('float remains bounded with slow frames and reduced motion adds no movement',()=>{
  const state={lift:0,liftVelocity:0,depth:0,depthVelocity:0};
  for(let n=0;n<120;n++)updateDiscFloat(state,{hovered:true,y:1,time:n*.064},.064);
  assert.ok(state.lift<.3&&state.lift>0);assert.ok(state.depth<.2);
  const reduced={lift:0,liftVelocity:0,depth:0,depthVelocity:0};
  updateDiscFloat(reduced,{hovered:true,y:1,reduced:true},.064);
  assert.equal(reduced.lift,0);assert.equal(reduced.depth,0);
});

function disc(id,x,z){
  const esterno=new Group(),inclina=new Group();esterno.position.set(x,0,z);esterno.add(inclina);
  const mesh=new Mesh(new RingGeometry(.075,1,96),new MeshBasicMaterial({side:DoubleSide}));inclina.add(mesh);
  const value={id,esterno,inclina,pickMeshes:[mesh]};mesh.userData.disc=value;return value;
}
const camera=()=>{const c=new PerspectiveCamera(36,1,.1,50);c.position.z=4.6;c.updateProjectionMatrix();c.updateMatrixWorld();return c;};
test('a side disc first selects; only a later independent tap on the settled centre opens',()=>{
  for(const side of ['A','C']){
    assert.equal(discTapAction({pressedId:side,releasedId:side,centredIdAtPress:'B'}),'select');
    // No time window: the next independent tap can happen at any later time.
    assert.equal(discTapAction({pressedId:side,releasedId:side,centredIdAtPress:side}),'open');
  }
  assert.equal(discTapAction({pressedId:'B',releasedId:'B',centredIdAtPress:'B'}),'open');
});
test('an in-flight disc cannot open on the tap that finishes centring it',()=>{
  assert.equal(discTapAction({pressedId:'A',releasedId:'A',centredIdAtPress:null}),'select');
});
test('drag, cancelled touch, empty space and mismatched release never open or select',()=>{
  const tap={pressedId:'A',releasedId:'A',centredIdAtPress:'A'};
  for(const overrides of [{dragged:true},{cancelled:true},{pressedId:null},{releasedId:null},{releasedId:'C'}]){
    assert.equal(discTapAction({...tap,...overrides}),'ignore');
  }
});
test('overlapping discs hit the closest real surface rather than the active index',()=>{
  const c=camera(),pick=createDiscPicker(c),front=disc('neighbour',0,0),back=disc('selected',0,-.4);
  assert.equal(pick(60,50,100,100,[back,front]).disc.id,'neighbour');
  front.esterno.visible=false;assert.equal(pick(60,50,100,100,[back,front]).disc.id,'selected');
});
test('a centre hole passes the hit through to a visible disc behind it',()=>{
  const c=camera(),pick=createDiscPicker(c),front=disc('front',0,0),back=disc('behind',.3,-.4);
  assert.equal(pick(50,50,100,100,[front,back]).disc.id,'behind');
  assert.equal(pick(50,50,100,100,[front]),null);
});
test('hover coordinates are local to the neighbour despite its offset and angle',()=>{
  const c=camera(),pick=createDiscPicker(c),item=disc('side',.7,-.2);item.esterno.rotation.y=-.4;item.esterno.updateWorldMatrix(true,true);
  const point=item.inclina.localToWorld(new Vector3(.4,.3,0)).project(c);
  const hit=pick((point.x+1)*50,(1-point.y)*50,100,100,[item]);
  assert.ok(Math.abs(hit.localX-.4)<1e-5);assert.ok(Math.abs(hit.localY-.3)<1e-5);
});
test('project information stays English and omits role from the interface and printed rim',async()=>{
  for(const p of projects)for(const key of ['name','overview','year','category']){assert.equal(typeof p[key],'string');assert.ok(p[key].length);assert.ok(!/\p{Script=Han}/u.test(p[key]));}
  assert.equal(projects[0].overview,'Crash-sensing software tested at JLR and 300 MADYMO impact simulations');
  const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
  const row=await readFile(new URL('../dist/animorio/row-of-discs.js',import.meta.url),'utf8');
  assert.doesNotMatch(html,/data-project-field="role"/);
  assert.doesNotMatch(row,/\.role\b|\.regia\b|data-regia/);
});
test('shipped interface, Canvas code and SVG artwork contain no Chinese characters',async()=>{
  async function inspect(directory){
    for(const item of await readdir(directory,{withFileTypes:true})){
      if(item.name==='vendor')continue;
      const target=new URL(item.name+(item.isDirectory()?'/':''),directory);
      if(item.isDirectory())await inspect(target);
      else if(/\.(js|html|svg|css|json)$/.test(item.name))assert.ok(!/\p{Script=Han}/u.test(await readFile(target,'utf8')),target.pathname);
    }
  }
  await inspect(new URL('../dist/',import.meta.url));
});
