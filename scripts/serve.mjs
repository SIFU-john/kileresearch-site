// Local stand-in for Cloudflare Pages, serving dist/ for previews and Lighthouse CI:
//   - applies dist/_headers exactly as written (path rules, splats, "! Header" detach)
//   - applies simple rules from dist/_redirects
//   - POST /api/contact answers like the unconfigured Pages Function (303 -> /contact/unavailable/),
//     because Functions don't run here. Use `npx wrangler pages dev dist` to run the real Function.
// `npm run preview` -> http://localhost:4322
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
const port = Number(process.env.PORT ?? 4322);
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript',
  '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json',
  '.pf_meta': 'application/octet-stream', '.pf_fragment': 'application/octet-stream', '.pf_index': 'application/octet-stream', '.pagefind': 'application/octet-stream',
};

/** Parse Cloudflare Pages _headers into [{ re, set: [[k, v]], detach: [k] }]. Absolute-URL rules are skipped. */
function parseHeaders(text) {
  const rules = [];
  let cur = null;
  for (const raw of text.split('\n')) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) {
      const pattern = raw.trim();
      cur = /^https?:/.test(pattern) ? null : { re: new RegExp('^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/:\w+/g, '[^/]+') + '$'), set: [], detach: [] };
      if (cur) rules.push(cur);
      continue;
    }
    if (!cur) continue;
    const line = raw.trim();
    if (line.startsWith('!')) cur.detach.push(line.slice(1).trim().toLowerCase());
    else {
      const i = line.indexOf(':');
      cur.set.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
    }
  }
  return rules;
}

function headersFor(rules, urlPath) {
  const out = new Map();
  for (const r of rules) {
    if (!r.re.test(urlPath)) continue;
    for (const d of r.detach) out.delete(d);
    for (const [k, v] of r.set) {
      const key = k.toLowerCase();
      out.set(key, out.has(key) ? [out.get(key)[0], `${out.get(key)[1]}, ${v}`] : [k, v]);
    }
  }
  return Object.fromEntries([...out.values()]);
}

function parseRedirects(text) {
  return text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => {
    const [from, to, code = '301'] = l.split(/\s+/);
    return { from, to, code: Number(code) };
  });
}

const headerRules = parseHeaders(await readFile(path.join(root, '_headers'), 'utf8'));
const redirects = parseRedirects(await readFile(path.join(root, '_redirects'), 'utf8').catch(() => ''));

async function resolve(urlPath) {
  const clean = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  let file = path.join(root, clean);
  if (!file.startsWith(root)) return null;
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    await stat(file);
    return file;
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  const urlPath = (req.url ?? '/').split('?')[0];
  if (urlPath === '/api/contact') {
    // Mirror of the Function's own headers when it is not configured.
    if (req.method !== 'POST') { res.writeHead(405, { Allow: 'POST', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); return res.end(); }
    req.resume();
    res.writeHead(303, { Location: '/contact/unavailable/', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    return res.end();
  }
  const redirect = redirects.find((r) => r.from === urlPath);
  if (redirect) { res.writeHead(redirect.code, { Location: redirect.to }); return res.end(); }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end(); }
  const file = await resolve(urlPath);
  const target = file ?? path.join(root, '404.html');
  const body = await readFile(target);
  res.writeHead(file ? 200 : 404, {
    'Cache-Control': 'public, max-age=0, must-revalidate',
    ...headersFor(headerRules, file ? urlPath : '/404.html'),
    'Content-Type': types[path.extname(target)] ?? 'application/octet-stream',
  });
  res.end(req.method === 'HEAD' ? undefined : body);
}).listen(port, () => console.log(`serving dist/ with dist/_headers on http://localhost:${port}`));
