import { mkdir, copyFile, writeFile, stat, cp, unlink } from 'node:fs/promises';
import {profileAssetStatus} from './profile-assets.mjs';
import {fontAssetStatus} from './font-assets.mjs';
import {fontConfig} from '../dist/typography.js';
// Precomputed disc data maps are source assets. Builds copy, never regenerate.
await cp('assets/disc-surfaces','dist/assets/disc-surfaces',{recursive:true});
await cp('assets/projects','dist/assets/projects',{recursive:true});
await cp('assets/games','dist/assets/games',{recursive:true});
await cp('assets/opening','dist/assets/opening',{recursive:true});
// Only fonts with web licenses belong here. Personal-use trials are served
// directly from ignored source files by the loopback preview, never copied.
await mkdir('dist/assets/fonts',{recursive:true});
for(const role of ['title','interface','label']){
  const name=fontConfig[role].file.split('/').pop();
  try{if((await stat(`assets/fonts/licensed/${name}`)).isFile())await copyFile(`assets/fonts/licensed/${name}`,`dist/assets/fonts/${name}`);}catch(error){if(error.code!=='ENOENT')throw error;}
}
await mkdir('dist/vendor', { recursive: true });
for (const name of ['three.module.js', 'three.core.js']) {
  await copyFile(`node_modules/three/build/${name}`, `dist/vendor/${name}`);
}
await copyFile('node_modules/three/LICENSE', 'dist/vendor/THREE-LICENSE.txt');
await mkdir('dist/vendor/addons/environments', {recursive:true});
await copyFile('node_modules/three/examples/jsm/environments/RoomEnvironment.js','dist/vendor/addons/environments/RoomEnvironment.js');
for(const name of ['gsap.min.js','ScrollTrigger.min.js']){
  await copyFile(`node_modules/gsap/dist/${name}`,`dist/vendor/${name}`);
}
await writeFile('dist/vendor/GSAP-NOTICE.txt','GSAP 3.15.0 and ScrollTrigger. Copyright GSAP / GreenSock.\nStandard license: https://gsap.com/standard-license\nOriginal notices are retained in both distributed library files.\n');
await mkdir('dist/vendor/fonts',{recursive:true});
await copyFile('node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2','dist/vendor/fonts/instrument-serif-latin-400-normal.woff2');
await copyFile('node_modules/@fontsource-variable/mona-sans/files/mona-sans-latin-wght-normal.woff2','dist/vendor/fonts/mona-sans-latin-wght-normal.woff2');
for(const [name,folder] of [['INSTRUMENT-SERIF','@fontsource/instrument-serif'],['MONA-SANS','@fontsource-variable/mona-sans']])await copyFile(`node_modules/${folder}/LICENSE`,`dist/vendor/fonts/${name}-LICENSE.txt`);
await writeFile('dist/asset-status.json',JSON.stringify(await profileAssetStatus(),null,2));
// Explicit owner-only evaluation build; never enabled by the normal/public build.
const fontStatus=await fontAssetStatus();
const evaluationFiles={title:'PPEiko-Medium.otf',interface:'PPNeueMontrealText-Book.otf',label:'PPMuseum-Regular.otf'};
const privateEvaluation=process.argv.includes('--private-font-preview');
await mkdir('dist/assets/fonts/private-evaluation',{recursive:true});
for(const [role,name] of Object.entries(evaluationFiles)){
  const output=`dist/assets/fonts/private-evaluation/${name}`;
  if(privateEvaluation){
    await copyFile(`assets/fonts/personal-preview/${name}`,output);
    (fontStatus.privateEvaluation??={})[role]=`./assets/fonts/private-evaluation/${name}`;
  }else{try{await unlink(output);}catch(e){if(e.code!=='ENOENT')throw e;}}
}
await writeFile('dist/font-status.json',JSON.stringify(fontStatus,null,2));
console.log('Demo-matched Three.js, GSAP, RoomEnvironment, fonts and profile asset status bundled locally.');

await copyFile('assets/fonts/oswald-latin-wght-normal.woff2','dist/assets/fonts/oswald-latin-wght-normal.woff2');
await mkdir('dist/licenses',{recursive:true});
await copyFile('assets/fonts/OSWALD-LICENSE.txt','dist/licenses/OSWALD-LICENSE.txt');
