import test from 'node:test';
import assert from 'node:assert/strict';
import {surfaceLayout} from '../samples/battery-cold-plate/surface-layout.js';
test('surface marks repeat for the same project and vary across IDs',()=>{
 assert.deepEqual(surfaceLayout('battery-cold-plate-material-study'),surfaceLayout('battery-cold-plate-material-study'));
 assert.notDeepEqual(surfaceLayout('battery-cold-plate-material-study'),surfaceLayout('other-project'));
});
test('the single crease is short and stays at the corner',()=>{
 for(const id of ['battery-cold-plate-material-study','one','two','three']){
  const {crease}=surfaceLayout(id);assert.ok(crease.x>.85&&crease.y<.15);assert.ok(crease.length<=.05);
 }
});
