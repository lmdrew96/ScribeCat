import http from "http"; import fs from "fs"; import path from "path"; import url from "url";
const port=parseInt(process.env.PORT||"1420",10);
const root=path.resolve("web");
const mime={".html":"text/html",".css":"text/css",".js":"application/javascript",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".svg":"image/svg+xml",".ico":"image/x-icon",".ttf":"font/ttf",".otf":"font/otf",".woff":"font/woff",".woff2":"font/woff2",".txt":"text/plain"};
const server=http.createServer((req,res)=>{try{const u=url.parse(req.url).pathname||"/";let p=path.join(root,u.replace(/^\/+/,""));if(u==="/"||fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(root,"index.html");if(!fs.existsSync(p)){res.writeHead(404);res.end("not found");return}const ext=path.extname(p).toLowerCase();res.writeHead(200,{"Content-Type":mime[ext]||"application/octet-stream","Cache-Control":"no-store"});fs.createReadStream(p).pipe(res)}catch(e){res.writeHead(500);res.end("err")}});
server.listen(port,()=>console.log(`static web at http://localhost:${port}`));
