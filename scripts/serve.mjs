// Minimal static server for dist/ that sends the production security headers.
// Used by Lighthouse CI and for local checks: `npm run serve` -> http://localhost:4322
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { securityHeaders, cacheRules } from '../config/security-headers.mjs';

const root = path.resolve('dist');
const port = Number(process.env.PORT ?? 4322);
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json',
  '.pf_meta': 'application/octet-stream', '.pf_fragment': 'application/octet-stream', '.pf_index': 'application/octet-stream', '.pagefind': 'application/octet-stream',
};
const headers = securityHeaders();
// Local server is plain HTTP; HSTS is ignored by browsers over HTTP, so leaving it on is harmless.

async function resolve(urlPath) {
  const clean = path.normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
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
  const file = await resolve(req.url ?? '/');
  const target = file ?? path.join(root, '404.html');
  const body = await readFile(target);
  const rule = cacheRules.find((r) => r.pattern === '/*' || (req.url ?? '').startsWith(r.pattern.replace('*', '')));
  res.writeHead(file ? 200 : 404, {
    ...headers,
    'Content-Type': types[path.extname(target)] ?? 'application/octet-stream',
    'Cache-Control': rule.value,
  });
  res.end(body);
}).listen(port, () => console.log(`serving dist/ with security headers on http://localhost:${port}`));
