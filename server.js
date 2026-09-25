import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('public');
http.createServer((req,res)=>{const p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!p.startsWith(root+path.sep)&&p!==root){res.writeHead(403).end();return}const file=p===root?path.join(root,'index.html'):p;fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(b)})}).listen(4173,'127.0.0.1',()=>console.log('http://127.0.0.1:4173'));

