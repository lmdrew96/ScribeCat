import http from "http";
import { createReadStream, statSync, existsSync } from "fs";
import { extname, join, normalize } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = normalize(join(__filename, "..", "..", "web"));
const PORT = 1420;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".htm":  "text/html; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".mjs":  "text/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map":  "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".webp": "image/webp",
  ".ico":  "image/x-icon",
  ".txt":  "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
  ".eot":  "application/vnd.ms-fontobject",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

function contentTypeFor(path) {
  const ext = extname(path).toLowerCase();
  return MIME[ext] || "application/octet-stream";
}

function sendJSON(res, code, payload) {
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
  });
  res.end(JSON.stringify(payload));
}

function send404(res) {
  sendJSON(res, 404, { ok: false, error: "not_found" });
}

const server = http.createServer((req, res) => {
  try {
    // CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,HEAD,OPTIONS",
        "access-control-allow-headers": "content-type",
      });
      res.end();
      return;
    }

    // Health endpoint for status checks
    if (req.url && req.url.startsWith("/health")) {
      return sendJSON(res, 200, { ok: true, ts: new Date().toISOString() });
    }

    // Map URL → file path
    const urlPath = (req.url || "/").split("?")[0];
    let path = normalize(join(ROOT, urlPath));
    if (!path.startsWith(ROOT)) return send404(res); // path traversal guard

    // Default to index.html for root or trailing slash
    if (urlPath.endsWith("/") || urlPath === "/") {
      path = join(path, "index.html");
    }

    if (!existsSync(path)) return send404(res);

    // Static file stream
    const stat = statSync(path);
    if (!stat.isFile()) return send404(res);

    const type = contentTypeFor(path);
    res.writeHead(200, {
      "content-type": type,
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    });
    createReadStream(path).pipe(res);
  } catch (e) {
    sendJSON(res, 500, { ok: false, error: e?.message || "server_error" });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Static dev server on http://localhost:${PORT}`);
});