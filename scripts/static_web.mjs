import http from 'http';
import fs from 'fs';
import path from 'path';

const root = path.resolve('web');

http.createServer((req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  let u = decodeURIComponent((req.url||'/').split('?')[0]);
  if (u === '/health') {
    res.writeHead(200, {'content-type':'application/json'});
    res.end(JSON.stringify({ok:true, ts:Date.now()}));
    return;
  }
  if (u === '/') u = '/index.html';
  const fp = path.join(root, u.replace(/^\/+/, ''));
  fs.readFile(fp, (e,b) => {
    if (e) { res.statusCode = 404; res.end('not found'); return; }
    res.statusCode = 200; res.end(b);
  });
}).listen(1420);
