import {cp,mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {prepareVideoManifest} from './prepare-video-manifest.mjs';

await prepareVideoManifest();

// dist/ remains the authored portfolio frontend; package a copy at the
// conventional client path alongside a small server entry, without changing
// the approved imagery, precomputed disc maps, vendor bundles or font profile.
for(const directory of ['games','projects','disc-surfaces','opening']) {
  await cp(path.join('assets',directory),path.join('dist/assets',directory),{recursive:true});
}
await mkdir('dist/client',{recursive:true});
for(const entry of await readdir('dist',{withFileTypes:true})) {
  if(['client','server','.openai'].includes(entry.name))continue;
  await cp(path.join('dist',entry.name),path.join('dist/client',entry.name),{recursive:true});
}
await mkdir('dist/server/engine',{recursive:true});
for(const file of ['index.js','room-api.js','hosting-config.js','room-state.js','report-download.js','report-manifest.js','byte-range-response.js','project-video.js','video-manifest.js']) {
  let code=await readFile(path.join('worker',file),'utf8');
  if(file==='room-state.js')code=code.replace('../assets/games/battleship/BattleShip.js','./engine/BattleShip.js');
  await writeFile(path.join('dist/server',file),code);
}
for(const file of ['BattleShip.js','ramda.js'])await cp('assets/games/battleship/'+file,'dist/server/engine/'+file);
await cp('assets/games/battleship/vendor','dist/server/engine/vendor',{recursive:true});
await mkdir('dist/.openai',{recursive:true});
await cp('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Portfolio client and persistent Battleship room Worker built.');
