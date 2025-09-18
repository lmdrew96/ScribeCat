import http from "http";
import { promises as fs } from "fs";
import path from "path";
import url from "url";

const root = path.resolve("web");
const port = 1420;
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

http
  .createServer(async (req, res) => {
    try {
      const pathname = url.parse(req.url).pathname || "/";
      if (pathname === "/health") {
        const payload = JSON.stringify({ ok: true, ts: new Date().toISOString() });
        res.writeHead(200, {
          "content-type": "application/json",
          "cache-control": "no-store",
          pragma: "no-cache",
        });
        return res.end(payload);
      }

      let filePath = path.normalize(path.join(root, pathname));
      if (!filePath.startsWith(root)) {
        res.writeHead(403);
        return res.end("forbidden");
      }

      try {
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
          filePath = path.join(filePath, "index.html");
        }
      } catch {}

      const data = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "content-type": mime[ext] || "application/octet-stream",
      });
      res.end(data);
    } catch {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("not found");
    }
  })
  .listen(port);
