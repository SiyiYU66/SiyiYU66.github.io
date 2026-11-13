import {readFile,writeFile,mkdir,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import wawoff2 from 'wawoff2';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const exists=file=>stat(file).then(()=>true,()=>false);

// Rebuild web formats from the checked-in masters. This only changes their
// encoding: full-resolution pixels, font outlines and metrics are verified.
export async function prepareWebAssets(){
  const proof={maps:[],images:[],fonts:[]};
  const roots=(await readdir('assets/disc-surfaces',{withFileTypes:true})).filter(entry=>entry.isDirectory()).map(entry=>entry.name);
  const maps=roots.flatMap(id=>['normal','roughness','coat-roughness'].map(name=>`assets/disc-surfaces/${id}/${name}.png`));
  const images=['assets/opening/siyi-yu-sketch.png','assets/projects/slow-forms/cover.png','assets/projects/a-quiet-place/cover.png'];
  for(const source of [...maps,...images]){
    const output=source.replace(/\.png$/,'.webp');
    if(!await exists(output))await sharp(source).webp({lossless:true,exact:true,effort:6}).toFile(output);
    const original=await sharp(source).ensureAlpha().raw().toBuffer();
    const decoded=await sharp(output).ensureAlpha().raw().toBuffer();
    if(!original.equals(decoded))throw Error('Lossless pixel check failed: '+source);
    const metadata=await sharp(source).metadata();
    (maps.includes(source)?proof.maps:proof.images).push({source,output,width:metadata.width,height:metadata.height,bytesBefore:(await stat(source)).size,bytesAfter:(await stat(output)).size,pixelSha256:hash(original),encodedSha256:hash(await readFile(output)),pixelsIdentical:true});
  }
  const fontRoot='dist/assets/fonts/private-evaluation';
  const fontTables=font=>{
    const out={};
    for(let i=0;i<font.readUInt16BE(4);i++){
      const p=12+i*16;
      out[font.toString('ascii',p,p+4)]=font.subarray(font.readUInt32BE(p+8),font.readUInt32BE(p+8)+font.readUInt32BE(p+12));
    }
    return out;
  };
  for(const name of ['PPEiko-Medium','PPNeueMontrealText-Book','PPMuseum-Regular']){
    const original=await readFile(path.join(fontRoot,name+'.otf'));
    const filename=path.join(fontRoot,name+'.woff2');
    const compressed=await exists(filename)?await readFile(filename):Buffer.from(await wawoff2.compress(original));
    const restored=Buffer.from(await wawoff2.decompress(compressed));
    const before=fontTables(original),after=fontTables(restored);
    for(const tag of ['CFF ','cmap','hmtx','GPOS','GSUB','name']){
      if(before[tag]&&!before[tag].equals(after[tag]))throw Error('Font outline or metric check failed: '+name+' '+tag);
    }
    await writeFile(filename,compressed);
    proof.fonts.push({name,bytesBefore:original.length,bytesAfter:compressed.length,outlinesAndMetricsIdentical:true,encodedSha256:hash(compressed)});
  }
  await mkdir('docs',{recursive:true});
  await writeFile('docs/lossless-web-assets.json',JSON.stringify(proof,null,2)+'\n');
  console.log(`Verified ${proof.maps.length} lossless surface maps, ${proof.images.length} images and ${proof.fonts.length} fonts.`);
  return proof;
}
