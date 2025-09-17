import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
const PORT = Number(process.env.PORT)||8787;
const ROOT = path.resolve("web");
const MIME={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".gif":"image/gif",".svg":"image/svg+xml",".ico":"image/x-icon",".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf",".otf":"font/otf",".json":"application/json; charset=utf-8"};
function send(res,code,h,body){res.writeHead(code,h);res.end(body)}
function serve(res,file){const ext=path.extname(file).toLowerCase();const type=MIME[ext]||"application/octet-stream";fs.createReadStream(file).on("open",()=>res.writeHead(200,{"content-type":type})).on("error",()=>send(res,404,{"content-type":"application/json"},JSON.stringify({error:"not_found"}))).pipe(res)}
const srv=http.createServer((req,res)=>{const parsed=url.parse(req.url||"/");const p=decodeURIComponent(parsed.pathname||"/");
  if(p.startsWith("/api")) return send(res,200,{"content-type":"application/json"},JSON.stringify({ok:true,ts:Date.now()}));
  let file=path.join(ROOT,p);
  try{const st=fs.existsSync(file)?fs.statSync(file):null; if(st&&st.isDirectory()) file=path.join(file,"index.html"); if(!st||!fs.existsSync(file)) file=path.join(ROOT,"index.html"); return serve(res,file)}
  catch{ return send(res,500,{"content-type":"application/json"},JSON.stringify({error:"server_error"}))}
});
srv.listen(PORT,()=>console.log("Serving UI on http://localhost:"+PORT));
