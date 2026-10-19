'use strict';
// Static server with Range + keep-alive off, so paused media downloads cannot exhaust the browser's 6-connection pool.
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.argv[2], PORT = +process.argv[3];
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
let N=0; const open=new Map(); setInterval(()=>{ if(open.size) console.log('OPEN', [...open.values()].join(' | ').slice(0,600)); },5000);
http.createServer((q, res) => {
  const id=++N; open.set(id, q.url.slice(0,80)); res.on('close',()=>open.delete(id));
  let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
  const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404, { Connection: 'close' }); return res.end(); }
  const size = fs.statSync(f).size, ty = T[path.extname(f)] || 'application/octet-stream';
  const m = /bytes=(\d*)-(\d*)/.exec(q.headers.range || '');
  if (m) { let a = m[1] ? +m[1] : size - +m[2], b = m[1] && m[2] ? +m[2] : size - 1; if (!m[1]) b = size - 1; b = Math.min(b, size - 1);
    res.writeHead(206, { 'Content-Type': ty, 'Content-Range': 'bytes ' + a + '-' + b + '/' + size, 'Content-Length': b - a + 1, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store', Connection: 'close' }); return fs.createReadStream(f, { start: a, end: b }).pipe(res); }
  res.writeHead(200, { 'Content-Type': ty, 'Content-Length': size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store', Connection: 'close' }); fs.createReadStream(f).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log('srv', PORT, ROOT));
