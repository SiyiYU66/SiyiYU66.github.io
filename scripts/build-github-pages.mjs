import {cp,mkdir,readdir} from 'node:fs/promises';
import path from 'node:path';
import {prepareVideoManifest} from './prepare-video-manifest.mjs';

// Static frontend build: no Sites identity, runtime database or credentials.
await prepareVideoManifest();
for(const directory of ['games','projects','disc-surfaces','opening'])await cp(path.join('assets',directory),path.join('dist/assets',directory),{recursive:true});
await mkdir('dist/client',{recursive:true});
for(const entry of await readdir('dist',{withFileTypes:true})){
  if(['client','server','.openai'].includes(entry.name))continue;
  await cp(path.join('dist',entry.name),path.join('dist/client',entry.name),{recursive:true});
}
console.log('Static Listening Room client built.');
