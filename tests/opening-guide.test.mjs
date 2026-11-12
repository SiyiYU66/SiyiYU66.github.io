import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpeningGuide} from '../dist/opening-guide.js';
import {openingLayout} from '../dist/opening-motion.js';

function harness(){
  let now=0,serial=0;const events=[],calls=[];
  const guide=createOpeningGuide({schedule(delay,fn){const event={at:now+delay,fn,id:serial++,cancelled:false};events.push(event);return ()=>event.cancelled=true;},onPortfolio(){calls.push(['portfolio',now]);},onComplete(){calls.push(['complete',now]);}});
  function advance(amount){const end=now+amount;while(true){const e=events.filter(e=>!e.cancelled&&e.at<=end).sort((a,b)=>a.at-b.at||a.id-b.id)[0];if(!e)break;e.cancelled=true;now=e.at;e.fn();}now=end;}
  return {guide,calls,advance};
}
test('idle fallback starts after name lands; exit starts after portfolio lands',()=>{
  const h=harness();h.advance(10);assert.deepEqual(h.calls,[]);
  h.guide.settled('name');h.advance(1.99);assert.deepEqual(h.calls,[]);
  h.advance(.01);assert.equal(h.calls[0][0],'portfolio');
  h.advance(3);assert.equal(h.calls.length,1); // No exit while flaps are in flight.
  h.guide.settled('portfolio');h.advance(1.99);assert.equal(h.calls.length,1);
  h.advance(.01);assert.equal(h.calls[1][0],'complete');
});
test('manual input wins over the idle timer without postponing the exit',()=>{
  const h=harness();h.guide.settled('name');h.advance(.4);h.guide.requestPortfolio();
  h.guide.requestPortfolio();assert.equal(h.calls.length,1);
  h.guide.settled('portfolio');h.advance(1);h.guide.settled('portfolio');h.guide.requestPortfolio();
  h.advance(1);assert.equal(h.calls.length,2);assert.equal(h.guide.phase,'complete');
});
test('early input and skip cannot leave a stale advance or completion callback',()=>{
  const h=harness();h.guide.requestPortfolio();h.guide.settled('name');h.advance(5);assert.equal(h.calls.length,1);
  h.guide.settled('portfolio');h.guide.destroy();h.advance(5);assert.equal(h.calls.length,1);
  h.guide.requestPortfolio();assert.equal(h.calls.length,1);
});
test('opening vinyl is 0.6 of the previous size and shows three quarters',()=>{
  for(const [w,h] of [[1280,720],[390,844]]){
    const layout=openingLayout(w,h);assert.equal(layout.radius,Math.min(w*.43,h*.59)*.6);
    assert.equal(layout.centre.y,h-layout.radius*.5);assert.equal(layout.centre.x,w/2);
  }
});
