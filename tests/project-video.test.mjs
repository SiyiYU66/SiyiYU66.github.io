import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import worker from '../worker/index.js';
import {projectVideo,isProjectVideo} from '../worker/project-video.js';
import {projectVideos} from '../worker/video-manifest.js';
import {prepareVideoManifest} from '../scripts/prepare-video-manifest.mjs';

const route='/media/balancing-segway.mp4',origin='https://listening-room.test';
const meta=projectVideos[route],original=await readFile('.'+meta.parts[0].path);
const request=(headers={},method='GET')=>new Request(origin+route,{headers,method});
function assets({missing=false}={}) {
  let reads=0,cancels=0;const paths=[];
  return {
    paths,get reads(){return reads;},get cancels(){return cancels;},
    ASSETS:{async fetch(req){
      paths.push(new URL(req.url).pathname);
      if(missing)return new Response(null,{status:404});
      assert.equal(new URL(req.url).pathname,meta.parts[0].path,'upstream must use the unchanged source path');
      let offset=0;
      return new Response(new ReadableStream({
        pull(controller){
          reads++;
          if(offset>=original.length){controller.close();return;}
          const end=Math.min(original.length,offset+4093);
          controller.enqueue(original.subarray(offset,end));offset=end;
        },cancel(){cancels++;}
      },{highWaterMark:0}));
    }}
  };
}

test('the virtual movie route returns original full bytes inline and leaves unrelated assets alone',async()=>{
  const env=assets(),response=await worker.fetch(request(),env);
  assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'video/mp4');
  assert.equal(response.headers.get('Content-Disposition'),'inline; filename="balancing.mp4"');
  assert.equal(response.headers.get('Accept-Ranges'),'bytes');assert.equal(+response.headers.get('Content-Length'),original.length);
  assert.equal(response.headers.get('ETag'),`"${meta.sha256}"`);assert.equal(response.headers.get('Content-Range'),null);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()),original);
  assert.equal(createHash('sha256').update(original).digest('hex'),meta.sha256);
  assert.equal(meta.size,original.length);assert.equal(isProjectVideo(route),true);
  assert.equal(isProjectVideo(meta.parts[0].path),false);assert.equal(isProjectVideo('/media/other.mp4'),false);
  const fallback=await worker.fetch(new Request(origin+'/media/other.mp4'),{ASSETS:{fetch:async()=>new Response('static fallback')}});
  assert.equal(await fallback.text(),'static fallback');
});

test('Safari probes, middle, open-ended tail, suffix and clipped ranges return exact 206 bytes',async()=>{
  const cases=[['bytes=0-1',0,1],['bytes=0-1023',0,1023],['bytes=5101-16057',5101,16057],
    [`bytes=${original.length-103}-`,original.length-103,original.length-1],['bytes=-99',original.length-99,original.length-1],
    [`bytes=${original.length-4}-${original.length+900}`,original.length-4,original.length-1]];
  for(const [Range,start,end] of cases){
    const env=assets(),response=await worker.fetch(request({Range}),env);
    assert.equal(response.status,206,Range);assert.equal(response.headers.get('Content-Range'),`bytes ${start}-${end}/${original.length}`);
    assert.equal(+response.headers.get('Content-Length'),end-start+1);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),original.subarray(start,end+1),Range);
    assert.equal(env.cancels,1,'stop reading the source immediately after the requested range');
    if(start===0)assert.ok(env.reads<3,'a tiny media probe must not read the whole file');
  }
});

test('HEAD reads no movie bytes and ignores Range while unsupported ranges return 416 without fetching assets',async()=>{
  for(const headers of [{},{Range:'bytes=0-1'},{Range:'bytes=999999999-'}]){
    const env=assets(),response=await projectVideo(request(headers,'HEAD'),env);
    assert.equal(response.status,200);assert.equal(response.body,null);assert.equal(env.paths.length,0);
    assert.equal(+response.headers.get('Content-Length'),original.length);assert.equal(response.headers.get('Content-Range'),null);
  }
  for(const Range of [`bytes=${original.length}-`,'bytes=8-2','bytes=-0','bytes=0-1,6-7','bytes=-','invalid']){
    const env=assets(),response=await projectVideo(request({Range}),env);
    assert.equal(response.status,416);assert.equal(response.headers.get('Content-Range'),`bytes */${original.length}`);
    assert.equal(env.paths.length,0);assert.equal(response.body,null);
  }
});

test('If-Range only permits partial data when its strong ETag matches the current movie',async()=>{
  const etag=`"${meta.sha256}"`;
  const valid=await projectVideo(request({Range:'bytes=0-1','If-Range':etag}),assets());
  assert.equal(valid.status,206);assert.deepEqual(Buffer.from(await valid.arrayBuffer()),original.subarray(0,2));
  for(const ifRange of ['"old-movie"','W/'+etag,'Thu, 01 Jan 1970 00:00:00 GMT']){
    const full=await projectVideo(request({Range:'bytes=0-1','If-Range':ifRange}),assets());
    assert.equal(full.status,200);assert.equal(full.headers.get('Content-Range'),null);
    assert.deepEqual(Buffer.from(await full.arrayBuffer()),original);
  }
});

test('cancelling playback cancels the source stream rather than buffering the remaining movie',async()=>{
  const env=assets(),response=await projectVideo(request(),env),reader=response.body.getReader();
  const first=await reader.read();assert.ok(first.value.length<=4093);
  await reader.cancel('viewer closed');assert.equal(env.cancels,1);
  assert.ok(env.reads<4);assert.ok(env.reads*4093<original.length);
});

test('unknown videos, write methods and missing source assets fail without falling back to an HTML movie response',async()=>{
  assert.equal((await projectVideo(new Request(origin+'/media/other.mp4'),assets())).status,404);
  const env=assets(),post=await projectVideo(request({},'POST'),env);
  assert.equal(post.status,405);assert.equal(post.headers.get('Allow'),'GET, HEAD');assert.equal(env.paths.length,0);
  const unavailable=await projectVideo(request(),assets({missing:true}));assert.equal(unavailable.status,503);
});

test('manifest preparation derives a fresh size and strong ETag after source replacement',async()=>{
  const base=tmpdir(),root=await mkdtemp(path.join(base,'listening-room-video-test-'));
  try{
    const source=path.join(root,meta.parts[0].path.slice(1));
    await mkdir(path.dirname(source),{recursive:true});await mkdir(path.join(root,'worker'));
    await writeFile(source,Buffer.from('first movie'));
    const first=await prepareVideoManifest(root);
    await writeFile(source,Buffer.from('replacement movie with different bytes'));
    const second=await prepareVideoManifest(root);
    assert.notEqual(first[route].size,second[route].size);assert.notEqual(first[route].sha256,second[route].sha256);
    assert.equal(second[route].size,(await readFile(source)).length);
    assert.equal(second[route].parts[0].path,meta.parts[0].path);
    assert.match(await readFile(path.join(root,'worker/video-manifest.js'),'utf8'),new RegExp(second[route].sha256));
  }finally{
    assert.equal(path.dirname(root),path.resolve(base));assert.ok(path.basename(root).startsWith('listening-room-video-test-'));
    await rm(root,{recursive:true,force:true});
  }
});
