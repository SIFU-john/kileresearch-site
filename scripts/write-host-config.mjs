// Post-build host files for Cloudflare Pages. Runs after `astro build`.
//  - dist/_headers from config/security-headers.mjs (the single source of truth)
//  - dist/.well-known/security.txt (RFC 9116) from SITE_URL, Expires = build date + 180 days
import { mkdir, writeFile } from 'node:fs/promises';
import { renderHeadersFile } from '../config/security-headers.mjs';
import { reportOnlyRefusal } from '../config/integrations.mjs';

// Never ship a production deploy without an enforced CSP (KILA-43 GB-04).
const refusal = reportOnlyRefusal();
if (refusal) throw new Error(`Refusing to build: ${refusal}`);

const file = renderHeadersFile();
for (const line of file.split('\n')) if (line.length > 2000) throw new Error("_headers line over Cloudflare's 2,000 character limit");
await writeFile('dist/_headers', file);

const origin = new URL(process.env.SITE_URL || 'https://kileresearch.ai');
const domain = origin.hostname.replace(/^www\./, '');
const expires = new Date(Date.now() + 180 * 864e5).toISOString().replace(/\.\d+Z$/, '.000Z');
await mkdir('dist/.well-known', { recursive: true });
await writeFile(
  'dist/.well-known/security.txt',
  [`Contact: mailto:security@${domain}`, `Expires: ${expires}`, 'Preferred-Languages: en', `Canonical: ${new URL('/.well-known/security.txt', origin).href}`, ''].join('\n'),
);
console.log('wrote dist/_headers and dist/.well-known/security.txt');
