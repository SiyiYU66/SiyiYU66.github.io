import test from 'node:test';
import assert from 'node:assert/strict';
import {mountCaseVideos} from '../dist/case-video.js';

function setup(){
  const document=new EventTarget();document.hidden=false;
  const videos=[{pauses:0,pause(){this.pauses++;}},{pauses:0,pause(){this.pauses++;}}];
  let observer;
  class Observer{
    constructor(callback){this.callback=callback;this.observed=[];this.disconnected=false;observer=this;}
    observe(video){this.observed.push(video);}
    disconnect(){this.disconnected=true;}
  }
  const dispose=mountCaseVideos(videos,{Observer,visibilityTarget:document});
  return {videos,document,observer,dispose};
}

test('offscreen or background case videos pause without automatic playback',()=>{
  const h=setup();assert.deepEqual(h.observer.observed,h.videos);
  h.observer.callback([{target:h.videos[0],isIntersecting:false},{target:h.videos[1],isIntersecting:true}]);
  assert.deepEqual(h.videos.map(v=>v.pauses),[1,0]);
  h.document.hidden=true;h.document.dispatchEvent(new Event('visibilitychange'));
  assert.deepEqual(h.videos.map(v=>v.pauses),[2,1]);
  h.document.hidden=false;h.document.dispatchEvent(new Event('visibilitychange'));
  assert.deepEqual(h.videos.map(v=>v.pauses),[2,1]);h.dispose();
});

test('leaving a project disposes the video observer and visibility listener exactly once',()=>{
  const h=setup();h.dispose();h.dispose();
  assert.ok(h.observer.disconnected);
  assert.deepEqual(h.videos.map(v=>v.pauses),[1,1]);
  h.document.hidden=true;h.document.dispatchEvent(new Event('visibilitychange'));
  assert.deepEqual(h.videos.map(v=>v.pauses),[1,1]);
  assert.doesNotThrow(()=>mountCaseVideos([],{Observer:null,visibilityTarget:null})());
});
