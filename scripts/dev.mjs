// 로컬 개발 서버: public/ 정적 파일 + netlify/functions 를 같은 포트에서 실행 (netlify-cli 없이)
// 사용: npm run dev  → http://localhost:8888
import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

process.env.LOCAL_DEV = '1';
process.env.SITE_URL ||= 'http://localhost:8888';
try { for (const line of (await fs.readFile('.env', 'utf8')).split('\n')) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, ''); } } catch {}

const PUBLIC = path.resolve('public'), FN = path.resolve('netlify/functions');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.pdf': 'application/pdf', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const redirects = Object.fromEntries((await fs.readFile(path.join(PUBLIC, '_redirects'), 'utf8')).split('\n').filter(Boolean).map(l => l.trim().split(/\s+/)));
const fns = {};
for (const f of await fs.readdir(FN)) if (f.endsWith('.mjs')) fns[f.replace(/\.mjs$/, '')] = (await import(pathToFileURL(path.join(FN, f)))).default;

http.createServer(async (req, res) => {
  const url = new URL(req.url, process.env.SITE_URL);
  const m = url.pathname.match(/^\/\.netlify\/functions\/([\w-]+)/);
  if (m && fns[m[1]]) {
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const headers = new Headers(); for (const [k, v] of Object.entries(req.headers)) headers.set(k, Array.isArray(v) ? v.join(',') : v);
    const r = await fns[m[1]](new Request(url, { method: req.method, headers, body, duplex: 'half' }));
    const out = {}; r.headers.forEach((v, k) => { if (k !== 'set-cookie') out[k] = v; });
    const cookies = r.headers.getSetCookie?.() || []; if (cookies.length) out['set-cookie'] = cookies;
    res.writeHead(r.status, out); res.end(Buffer.from(await r.arrayBuffer())); return;
  }
  let p = redirects[url.pathname] || url.pathname; if (p.endsWith('/')) p += 'index.html';
  const file = path.join(PUBLIC, path.normalize(p));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); res.end(); return; }
  try { const data = await fs.readFile(file); res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' }); res.end(data); }
  catch { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('Not found'); }
}).listen(Number(process.env.PORT) || 8888, () => console.log('dev server → ' + process.env.SITE_URL));
