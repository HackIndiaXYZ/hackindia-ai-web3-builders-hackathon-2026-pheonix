import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5173;

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  // Proxy /api requests to Flask backend
  if (req.url.startsWith("/api")) {
    const backendPort = process.env.BACKEND_PORT || 5000;
    const proxyReq = http.request(
      {
        hostname: "127.0.0.1",
        port: backendPort,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, host: `127.0.0.1:${backendPort}` },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      }
    );
    proxyReq.on("error", () => {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `Backend unreachable on port ${backendPort}` }));
    });
    req.pipe(proxyReq, { end: true });
    return;
  }

  // Normalize URL
  let reqPath = req.url.split("?")[0];
  if (reqPath === "/") reqPath = "/index.html";

  const filePath = path.join(__dirname, reqPath);

  // Security check: keep inside __dirname
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA if not an asset
      if (!path.extname(reqPath)) {
        const indexPath = path.join(__dirname, "index.html");
        res.writeHead(200, { "Content-Type": "text/html" });
        return fs.createReadStream(indexPath).pipe(res);
      }
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("404 Not Found");
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n======================================================`);
  console.log(` TitleLock Explorer is running at:`);
  console.log(` > Local:    http://localhost:${PORT}/`);
  console.log(` > Network:  http://127.0.0.1:${PORT}/`);
  console.log(`======================================================\n`);
});
