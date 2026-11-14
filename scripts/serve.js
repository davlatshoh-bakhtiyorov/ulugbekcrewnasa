// Mahalliy statik server: faqat web/ va core/ papkalarini beradi (.env, .git, cache/ ochilmaydi).
// Ishga tushirish: npm run dev  ->  http://localhost:8080/
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';

const ROOT = process.cwd();
const ALLOWED = ['web', 'core'];
const PORT = Number(process.env.PORT) || 8080;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/' || path === '/index.html') { res.writeHead(302, { Location: '/web/' }); return res.end(); }
  if (path.endsWith('/')) path += 'index.html';
  const rel = normalize(path).replace(/^[/\\]+/, '');
  const parts = rel.split(sep);
  if (!ALLOWED.includes(parts[0]) || parts.some((p) => p.startsWith('.') || p === '')) {
    res.writeHead(404); return res.end('not found');
  }
  try {
    const body = await readFile(join(ROOT, rel));
    res.writeHead(200, { 'Content-Type': TYPES[extname(rel)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('not found');
  }
}).listen(PORT, () => console.log(`Field Shift UZ: http://localhost:${PORT}/`));
