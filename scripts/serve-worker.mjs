import http from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {Readable} from 'node:stream';
import path from 'node:path';
import {roomApi} from '../worker/room-api.js';
import {reportDownload} from '../worker/report-download.js';
import {isProjectVideo,projectVideo} from '../worker/project-video.js';
import {sqliteD1} from './sqlite-d1.mjs';

const root=path.resolve('dist/client'),env={DB:sqliteD1()};
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.woff2':'font/woff2','.otf':'font/otf','.mp4':'video/mp4','.mp3':'audio/mpeg','.wav':'audio/wav','.pdf':'application/pdf'};
env.ASSETS={async fetch(request){
  const filename=path.resolve(root,'.'+decodeURIComponent(new URL(request.url).pathname));
  if(!filename.startsWith(root+path.sep))return new Response(null,{status:403});
  try{
    const info=await stat(filename);
    return new Response(Readable.toWeb(createReadStream(filename)),{headers:{'Content-Length':String(info.size)}});
  }catch{return new Response(null,{status:404});}
}};
const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://'+req.headers.host);
    if(url.pathname==='/__preview/game-layout') {res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});res.end(await readFile('scripts/arena-preview.html'));return;}
    if(url.pathname.startsWith('/downloads/')||isProjectVideo(url.pathname)){
      const handle=isProjectVideo(url.pathname)?projectVideo:reportDownload;
      const response=await handle(new Request(url,{method:req.method,headers:req.headers}),env);
      res.writeHead(response.status,Object.fromEntries(response.headers));
      if(!response.body){res.end();return;}
      const stream=Readable.fromWeb(response.body);
      res.on('close',()=>stream.destroy());
      stream.on('error',()=>res.destroy());
      stream.pipe(res);return;
    }
    if(url.pathname.startsWith('/api/battleship/')) {
      const chunks=[];for await(const chunk of req){chunks.push(chunk);if(chunks.reduce((n,b)=>n+b.length,0)>16384){res.writeHead(413).end();return;}}
      const request=new Request(url,{method:req.method,headers:req.headers,...(chunks.length?{body:Buffer.concat(chunks)}:{})});
      const response=await roomApi(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
    }
    const pathname=decodeURIComponent(url.pathname),filename=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(filename!==root&&!filename.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    const body=await readFile(filename);res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(body);
  }catch{res.writeHead(404).end('Not found');}
});
server.listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
