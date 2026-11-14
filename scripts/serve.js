// Mahalliy statik server: faqat sayt uchun kerakli fayllarni beradi (.env, .git, cache/, nuqtali fayllar ochilmaydi).
// Ishga tushirish: npm run dev  ->  http://localhost:8080/  (sayt)  va  http://localhost:8080/web/  (Mini App)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';

const ROOT = process.cwd();
const ALLOWED_DIRS = ['web', 'core', 'site'];      // butun papka
const ROOT_FILES = ['index.html'];                  // ildizdagi fayllar
const DOCS_JSON = /^docs[/\\][^/\\]+\.json$/;       // docs/ dan faqat JSON (sayt pilot natijasini o'qiydi)
const PORT = Number(process.env.PORT) || 8080;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
};

function allowed(rel) {
  const parts = rel.split(sep);
  if (parts.some((p) => p.startsWith('.') || p === '')) return false;
  if (parts.length === 1) return ROOT_FILES.includes(rel);
  return ALLOWED_DIRS.includes(parts[0]) || DOCS_JSON.test(rel);
}

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path.endsWith('/')) path += 'index.html';
  const rel = normalize(path).replace(/^[/\\]+/, '');
  if (!allowed(rel)) { res.writeHead(404); return res.end('not found'); }
  try {
    const body = await readFile(join(ROOT, rel));
    res.writeHead(200, { 'Content-Type': TYPES[extname(rel)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('not found');
  }
}).listen(PORT, () => console.log(`Field Shift UZ: http://localhost:${PORT}/  (Mini App: /web/)`));
