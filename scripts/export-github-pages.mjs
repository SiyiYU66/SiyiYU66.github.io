import {cp,mkdir,readFile,writeFile,lstat,rm,realpath,unlink} from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import path from 'node:path';
import {reports} from '../worker/report-manifest.js';
import {projectVideos} from '../worker/video-manifest.js';
import {pagesOrigin,roomServiceOrigin} from '../worker/hosting-config.js';

// Pages serves static files. Materialise the Worker-only download/video routes,
// preserving every original byte, and keep online rooms on the existing service.
const root=await realpath(process.cwd()), output=path.resolve(root,'.pages-output');
if(path.dirname(output)!==root||path.basename(output)!=='.pages-output')throw new Error('Unexpected export directory.');
const previous=await lstat(output).catch(error=>{if(error.code!=='ENOENT')throw error;return null;});
if(previous?.isSymbolicLink())throw new Error('Refusing to replace a linked export directory.');
if(previous)await rm(output,{recursive:true});
await cp(path.join(root,'dist/client'),output,{recursive:true});
for(const relative of ['.openai','server'])await rm(path.join(output,relative),{recursive:true,force:true});
const exportedPath=url=>{
  const target=path.resolve(output,'.'+url);
  if(!target.startsWith(output+path.sep))throw new Error('Asset leaves the static export.');
  return target;
};
async function materialise(url,entry,removeParts=false){
  const destination=exportedPath(url),hash=createHash('sha256');let size=0;
  await mkdir(path.dirname(destination),{recursive:true});
  async function* bytes(){
    for(const part of entry.parts){
      let partSize=0;
      for await(const chunk of createReadStream(exportedPath(part.path))){hash.update(chunk);size+=chunk.length;partSize+=chunk.length;yield chunk;}
      if(partSize!==part.size)throw new Error('Incorrect asset part: '+part.path);
    }
  }
  await pipeline(Readable.from(bytes()),createWriteStream(destination));
  if(size!==entry.size||hash.digest('hex')!==entry.sha256)throw new Error('Asset verification failed: '+url);
  if(removeParts)for(const part of entry.parts)await unlink(exportedPath(part.path));
}
for(const [url,entry] of Object.entries(reports))await materialise(url,entry,true);
for(const [url,entry] of Object.entries(projectVideos))await materialise(url,entry);
const clientPath=exportedPath('/assets/games/battleship/room-client.js');
const code=await readFile(clientPath,'utf8'),marker="const apiRoot = '/api/battleship';";
if(code.split(marker).length!==2)throw new Error('The room service configuration marker is missing or ambiguous.');
await writeFile(clientPath,code.replace(marker,`const apiRoot = '${roomServiceOrigin}/api/battleship';`));
await writeFile(path.join(output,'.nojekyll'),'');
console.log(`Static portfolio prepared for ${pagesOrigin}/ in ${output}. Original reports verified; online service retained.`);
