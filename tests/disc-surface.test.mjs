import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {MeshPhysicalMaterial,Texture,Mesh,Vector3,Raycaster} from '../dist/vendor/three.module.js';
import {discSurfaceConfig,applyDiscSurface,discSurfaceUrls} from '../dist/disc-surface.js';
import {projects} from '../dist/projects.js';
import {createBeveledDiscGeometry} from '../dist/disc-geometry.js';
import {discConfig} from '../dist/disc-config.js';
import {coverImagePlacement} from '../dist/project-media.js';

test('all project discs share the approved finish and retain their own printed color maps',()=>{
  assert.equal(discSurfaceConfig.projectId,projects[0].id);
  const bindings=[];
  for(const project of projects){
    const cover=new Texture(),original=new MeshPhysicalMaterial({map:cover,roughness:.45,metalness:.15});
    const normal=new Texture(),roughness=new Texture(),coatRoughness=new Texture();
    const study=applyDiscSurface(original,{normal,roughness,coatRoughness});
    assert.notEqual(study,original);assert.equal(study.map,original.map);
    assert.equal(study.color.getHex(),original.color.getHex());assert.equal(study.normalMap,normal);
    assert.equal(original.normalMap,null);assert.equal(original.roughnessMap,null);
    assert.equal(study.clearcoatNormalMap,normal);assert.equal(study.metalness,.3);
    assert.equal(study.roughness,.37);assert.equal(study.clearcoat,.8);
    assert.equal(study.normalScale.x,.23);assert.equal(study.clearcoatNormalScale.x,.22);
    bindings.push({id:project.id,texture:study.normalMap.uuid});
  }
  assert.equal(new Set(bindings.map(binding=>binding.texture)).size,projects.length);
});
test('every project has different ID-seeded creases, stable source assets and matching built maps',async()=>{
  const creaseLayouts=new Set(),normalHashes=new Set();
  for(const project of projects){
    const manifest=JSON.parse(await readFile(new URL(`../assets/disc-surfaces/${project.id}/manifest.json`,import.meta.url),'utf8'));
    assert.equal(manifest.projectId,project.id);
    assert.equal(manifest.seed,createHash('sha256').update(project.id).digest().readUInt32LE(0));
    assert.equal(manifest.colorArtworkModified,false);assert.equal(manifest.scratches.length,2);
    assert.equal(manifest.ringPitchPixels,8.5);assert.equal(manifest.grainCellPixels,4);
    assert.equal(manifest.creases.length,3);
    assert.ok(manifest.creases.every(c=>c.startRadius>c.endRadius&&c.startRadius<.97));
    assert.ok(manifest.scratches.every(s=>s.radius>.85&&s.radius<.97&&s.lengthDegrees<13));
    creaseLayouts.add(JSON.stringify(manifest.creases));
    for(const name of manifest.maps){
      const [source,built]=await Promise.all(['../assets/','../dist/assets/'].map(prefix=>readFile(new URL(`${prefix}disc-surfaces/${project.id}/${name}`,import.meta.url))));
      const hash=createHash('sha256').update(source).digest('hex');
      assert.equal(hash,createHash('sha256').update(built).digest('hex'));
      assert.equal(source.readUInt32BE(16),1024);assert.equal(source.readUInt32BE(20),1024);
      if(name==='normal.png')normalHashes.add(hash);
    }
    assert.ok(discSurfaceUrls(project.id).every(url=>url.includes(`/${project.id}/`)));
  }
  assert.equal(creaseLayouts.size,projects.length);assert.equal(normalHashes.size,projects.length);
});
test('rounded physical edge joins the front and back without changing the outer diameter',()=>{
  const bevel=createBeveledDiscGeometry({...discConfig,bevel:discConfig.studyBevel});
  const first=bevel.profile[0],last=bevel.profile.at(-1);
  assert.equal(first.radius,bevel.faceRadius);assert.equal(last.radius,bevel.faceRadius);
  assert.equal(first.z,-discConfig.thickness/2);assert.equal(last.z,discConfig.thickness/2);
  assert.equal(Math.max(...bevel.profile.map(p=>p.radius)),discConfig.radius);
  assert.ok(bevel.profile.length>12);
  const mesh=new Mesh(bevel.edge,new MeshPhysicalMaterial());mesh.updateMatrixWorld();
  const ray=new Raycaster(new Vector3(2,0,.01),new Vector3(-1,0,0));
  const hit=ray.intersectObject(mesh)[0];assert.ok(hit);assert.ok(hit.point.x>.99&&hit.point.x<1);
  const normals=bevel.edge.getAttribute('normal');assert.ok([...normals.array].every(Number.isFinite));
  bevel.edge.dispose();bevel.face.dispose();mesh.material.dispose();
});
test('UROP photo crop fills the cover while leaving the source image intact',async()=>{
  const project=projects[0];assert.ok(project.cover.endsWith('urop-cover.jpg'));
  const p=coverImagePlacement(1706,1279,1024,project.coverCrop);
  assert.ok(p.width>=1024&&p.height>=1024);assert.ok(p.x<=0&&p.x+p.width>=1024);
  const source=await readFile(new URL('../assets/projects/urop/urop-cover.jpg',import.meta.url));
  const built=await readFile(new URL('../dist/assets/projects/urop/urop-cover.jpg',import.meta.url));
  assert.equal(createHash('sha256').update(source).digest('hex'),createHash('sha256').update(built).digest('hex'));
});
