import http from "http"; import { promises as fs } from "fs"; import path from "path"; import url from "url";
const root = path.resolve("web"); const port = 1420;
const mime = { ".html":"text/html; charset=utf-8",".js":"application/javascript",".css":"text/css",".json":"application/json",".png":"image/png",".svg":"image/svg+xml",".txt":"text/plain; charset=utf-8" };
const server = http.createServer(async (req,res) => {
  try {
    const u = url.parse(req.url).pathname || "/";
    let p = path.normalize(path.join(root, u));
    if (!p.startsWith(root)) { res.writeHead(403); return res.end("forbidden"); }
    try { const s = await fs.stat(p); if (s.isDirectory()) p = path.join(p,"index.html"); } catch {}
    const data = await fs.readFile(p);
    const ext = path.extname(p).toLowerCase(); res.writeHead(200, { "content-type": mime[ext] || "application/octet-stream" }); res.end(data);
  } catch (e) { res.writeHead(404, { "content-type":"text/plain; charset=utf-8" }); res.end("not found"); }
});
server.listen(port, () => console.log(`static web at http://localhost:${port}`));
