import {readFile,mkdir,writeFile,cp} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const manifest=JSON.parse(await readFile('hosting/source-assets.json','utf8'));
const origin='https://listening-room-portfolio-lenovo-1102.deanslist1.chatgpt.site';
const root=process.cwd();
function target(relative){
  if(!/^(assets|dist\/assets)\//.test(relative))throw new Error('Unexpected asset destination.');
  const resolved=path.resolve(root,relative);
  if(!resolved.startsWith(root+path.sep))throw new Error('Asset leaves the repository.');
  return resolved;
}
let next=0,done=0;
async function materialise(entry){
  const url=new URL(entry.url,origin);
  if(url.origin!==origin||!url.pathname.startsWith('/assets/'))throw new Error('Unexpected asset origin.');
  let bytes,lastError;
  for(let attempt=0;attempt<3;attempt++){
    try{
      const response=await fetch(url,{signal:AbortSignal.timeout(45000)});
      if(!response.ok)throw new Error('HTTP '+response.status);
      bytes=Buffer.from(await response.arrayBuffer());
      if(bytes.length!==entry.size||createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw new Error('Asset checksum differs from the verified portfolio.');
      lastError=null;break;
    }catch(error){lastError=error;}
  }
  if(lastError)throw new Error(entry.url+': '+lastError.message);
  const first=target(entry.paths[0]);await mkdir(path.dirname(first),{recursive:true});await writeFile(first,bytes);
  for(const relative of entry.paths.slice(1)){const destination=target(relative);await mkdir(path.dirname(destination),{recursive:true});await cp(first,destination);}
  done++;if(done%50===0||done===manifest.assets.length)console.log(`Verified original assets: ${done}/${manifest.assets.length}`);
}
await Promise.all(Array.from({length:8},async()=>{while(next<manifest.assets.length){const index=next++;await materialise(manifest.assets[index]);}}));
console.log('Portfolio source restored with original asset bytes.');
