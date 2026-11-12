import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('../animorio-original');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    const requested=decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':'');
    const file=path.resolve(root,'.'+requested);
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    const body=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(body);
  }catch{res.writeHead(404).end('Not found');}
}).listen(4174,'127.0.0.1',()=>console.log('Original demos: http://127.0.0.1:4174/row-of-discs/row-of-discs/ and http://127.0.0.1:4174/melting-sheet/melting-sheet/'));
