import http from 'node:http';
import {attachBattleship} from './battleship-server.mjs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {fontAssetStatus,personalFontStatus} from './font-assets.mjs';
const root = path.resolve('dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.json': 'application/json', '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
types['.avif'] = 'image/avif';
types['.webp'] = 'image/webp';
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if(pathname==='/__preview/disc-review.js'){
      res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-cache'});res.end(await readFile(new URL('./disc-review.js',import.meta.url)));return;
    }
    if(pathname.startsWith('/__preview/battery-cold-plate/')){
      const sampleRoot=path.resolve('samples/battery-cold-plate');
      const name=pathname.slice('/__preview/battery-cold-plate/'.length)||'index.html';
      const file=path.resolve(sampleRoot,name);
      if(!file.startsWith(sampleRoot+path.sep)){res.writeHead(403).end();return;}
      const body=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(body);return;
    }
    if(pathname.startsWith('/__preview/fonts/')){
      const name=pathname.slice('/__preview/fonts/'.length);
      if(!['PPEiko-Medium.otf','PPNeueMontrealText-Book.otf','PPMuseum-Regular.otf'].includes(name)){res.writeHead(404).end();return;}
      const body=await readFile(path.resolve('assets/fonts/personal-preview',name));
      res.writeHead(200,{'Content-Type':'font/otf','Cache-Control':'no-cache'});res.end(body);return;
    }
    if(pathname==='/font-status.json'){
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
      res.end(JSON.stringify({...await fontAssetStatus(root),personalPreview:await personalFontStatus()}));return;
    }
    if (pathname === '/__preview/mobile') {
      const body = await readFile(new URL('./mobile-preview.html', import.meta.url));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(body); return;
    }
    if(pathname==='/__preview/typography'){
      const html=await readFile(path.join(root,'index.html'),'utf8');
      const metadata=html.match(/<section id="metadata"[\s\S]*?<\/section>/)[0];
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});
      res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="/"><title>Listening Room — Typography specimen</title><link rel="stylesheet" href="style.css"></head><body><main class="home-ui">${metadata}<p class="browse-note">Typography specimen / Between Spaces<br>Live project data is unchanged.</p></main><script src="vendor/gsap.min.js"></script><script type="module" src="/__preview/typography.js"></script></body></html>`);return;
    }
    if(pathname==='/__preview/typography.js'){
      res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-cache'});
      res.end(`import {loadTypography} from '/typography.js';import {createProjectInfo} from '/project-info.js';await loadTypography();createProjectInfo({root:document.getElementById('metadata'),gsap:window.gsap}).show({id:'type-specimen',name:'Between Spaces',overview:'A digital concept exploring everyday spaces',year:'2026',category:'Digital Product Design',role:'Independent Designer'});`);return;
    }
    const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch { res.writeHead(404).end('Not found'); }
});
attachBattleship(server);
server.listen(4173, '127.0.0.1', () => console.log('Local: http://127.0.0.1:4173'));
