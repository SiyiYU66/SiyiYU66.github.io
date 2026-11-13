import {cp,mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build,transform} from 'esbuild';
import path from 'node:path';
import {prepareVideoManifest} from './prepare-video-manifest.mjs';
import {prepareWebAssets} from './prepare-web-assets.mjs';

// Static frontend build: no Sites identity, runtime database or credentials.
if(!process.argv.includes('--bundles-only')){
await prepareWebAssets();
await prepareVideoManifest();
for(const directory of ['games','projects','disc-surfaces','opening'])await cp(path.join('assets',directory),path.join('dist/assets',directory),{recursive:true});
await mkdir('dist/client',{recursive:true});
for(const entry of await readdir('dist',{withFileTypes:true})){
  if(['client','server','.openai'].includes(entry.name))continue;
  await cp(path.join('dist',entry.name),path.join('dist/client',entry.name),{recursive:true});
}
}
// Bundle the existing modules without changing geometry, material constants,
// motion curves or photographs. Lazy About Me becomes its own cached chunk.
const result=await build({entryPoints:{app:'dist/app.js'},outdir:'dist/client/compiled',bundle:true,splitting:true,format:'esm',minify:true,target:'es2022',entryNames:'[name]-[hash]',chunkNames:'shared-[hash]',metafile:true,legalComments:'eof',alias:{three:path.resolve('dist/vendor/three.module.js')},external:['/__preview/*']});
let html=await readFile('dist/index.html','utf8');
const outputs=Object.entries(result.metafile.outputs);
const entry=outputs.find(([,value])=>value.entryPoint==='dist/app.js');
if(!entry)throw Error('Missing bundled homepage entry.');
const publicPath=file=>'./'+path.relative('dist/client',file).replaceAll(path.sep,'/');
html=html.replace('src="./app.js"',`src="${publicPath(entry[0])}"`);
const preloads=entry[1].imports.filter(item=>item.kind==='import-statement'&&!item.external).map(item=>`<link rel="modulepreload" href="${publicPath(item.path)}">`).join('\n');
html=html.replace('</head>',preloads+'\n</head>');
const styles=[...html.matchAll(/<link rel="stylesheet" href="\.\/([^\"]+)">/g)];
const css=(await transform((await Promise.all(styles.map(match=>readFile(path.join('dist',match[1]),'utf8')))).join('\n'),{loader:'css',minify:true})).code;
const cssName='site-'+createHash('sha256').update(css).digest('hex').slice(0,12)+'.css';
await writeFile(path.join('dist/client',cssName),css);
let first=true;
html=html.replace(/<link rel="stylesheet" href="\.\/([^\"]+)">/g,()=>{if(!first)return '';first=false;return `<link rel="stylesheet" href="./${cssName}">`;});
await writeFile('dist/client/index.html',html);
await writeFile('dist/client/build-assets.json',JSON.stringify({entry:publicPath(entry[0]),css:cssName,entryBytes:entry[1].bytes,chunks:outputs.map(([file,value])=>({file:publicPath(file),bytes:value.bytes}))},null,2));
console.log('Static Listening Room built with fingerprinted scripts and styles.');
