import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {run_battle_countdown} from '../assets/games/battleship/countdown.js';

const root = new URL('../assets/games/battleship/', import.meta.url);
const read = file => readFile(new URL(file,root));

test('all ten runtime ships fit the decoded-memory budget without modifying their masters', async () => {
  const entries = JSON.parse(await read('assets/ui/manifest.json'));
  assert.equal(entries.length,10);
  let pixels = 0;
  for (const entry of entries) {
    const png = await read('assets/' + entry.web);
    assert.equal(png.subarray(1,4).toString(),'PNG');
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
    assert.ok(width <= 768 && height <= 432);
    assert.equal(width / height,entry.sourceWidth / entry.sourceHeight);
    assert.equal(png[25],6,'RGBA transparency must survive resizing');
    pixels += width * height;
    assert.equal(createHash('sha256').update(await read('assets/' + entry.source)).digest('hex'),entry.sourceSHA256);
    assert.deepEqual(await readFile(new URL('../dist/assets/games/battleship/assets/' + entry.web,import.meta.url)),png);
  }
  assert.ok(pixels * 4 <= 13 * 1024 * 1024,'both fleets must decode below 13 MiB together');
  for (const file of ['Human_VS_BOT.js','Human_VS_Human.js','Human_VS_BOT.html','Human_VS_Human.html','Human_VS_Human.css']) {
    const code = (await read(file)).toString();
    assert.doesNotMatch(code,/\.\/assets\/player[12]\//,'live pages must not load the full-resolution masters');
    assert.doesNotMatch(code,/"\.\/assets\/"\s*\+\s*player_folder/);
  }
});

test('mobile countdown releases all surfaces before deployment allocates ships; desktop retains its crossfade', () => {
  const prior = Object.fromEntries(['document','setInterval','clearInterval','setTimeout'].map(k=>[k,globalThis[k]]));
  try {
    for (const mobile of [true,false]) {
      const timers = [], added = []; let interval;
      const node = () => ({className:'',children:[],removed:false,classList:{add(){},remove(){}},append(...children){this.children.push(...children);},remove(){this.removed=true;},getBoundingClientRect(){return {};}});
      globalThis.document = {documentElement:{dataset:{renderProfile:mobile?'mobile':'desktop'}},createElement:node,body:{append(el){added.push(el);}}};
      globalThis.setInterval = fn => {interval=fn;return 1;};
      globalThis.clearInterval = () => {};
      globalThis.setTimeout = fn => {timers.push(fn);return timers.length;};
      let entered = 0;
      run_battle_countdown(()=>{entered++;assert.equal(added[0].removed,mobile);});
      assert.equal(added[0].children.filter(n=>n.className.startsWith('cd-layer ')).length,mobile?0:5);
      interval(); interval(); interval(); timers.shift()();
      assert.equal(entered,1);
      if (!mobile) {assert.equal(timers.length,1);timers.shift()();assert.equal(added[0].removed,true);}
    }
  } finally {for (const [key,value] of Object.entries(prior)) globalThis[key]=value;}
});
