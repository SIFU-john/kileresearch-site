// Post-build guardrails, run in CI:
//  - no inline <script> (other than JSON-LD data blocks), no inline <style>, no style="" or on*="" attributes
//  - no third-party origins in src/href of scripts, styles, fonts or images; the only allowed
//    third-party script is Turnstile, and only on the enquiry pages
//  - required files exist (RSS, sitemap, robots, OG images, Pagefind index, _headers, security.txt)
//  - _headers has a CSP, no HSTS (set in the Cloudflare dashboard) and the pages.dev noindex rule
//  - draft articles appear nowhere: pages, RSS, sitemap, search index
//  - every migrated article rendered its code blocks and tables
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { reportOnlyRefusal } from '../config/integrations.mjs';

const dist = 'dist';
const errors = [];
async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

let pages = 0;
for await (const file of walk(dist)) {
  if (!file.endsWith('.html')) continue;
  pages++;
  const html = await readFile(file, 'utf8');
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const attrs = m[1];
    if (/type="application\/ld\+json"/.test(attrs)) continue;
    if (!/\bsrc=/.test(attrs)) errors.push(`${file}: inline <script>`);
    const src = /src="([^"]+)"/.exec(attrs)?.[1];
    const enquiryPage = /[\\/](contact|consulting)[\\/]index\.html$/.test(file);
    const turnstile = src === 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    if (src && /^(https?:)?\/\//.test(src) && !(turnstile && enquiryPage)) errors.push(`${file}: third-party script ${src}`);
  }
  if (/<style\b/.test(html)) errors.push(`${file}: inline <style>`);
  if (/\sstyle="/.test(html)) errors.push(`${file}: style="" attribute`);
  if (/\son[a-z]+="/.test(html)) errors.push(`${file}: inline event handler`);
  for (const m of html.matchAll(/<link\b[^>]*href="((?:https?:)?\/\/[^"]+)"/g)) {
    if (!/rel="(canonical|alternate)"/.test(m[0])) errors.push(`${file}: third-party <link> ${m[1]}`);
  }
  for (const m of html.matchAll(/<img\b[^>]*src="((?:https?:)?\/\/[^"]+|data:[^"]+)"/g)) errors.push(`${file}: third-party or data: image ${m[1].slice(0, 60)}`);
}

const required = ['rss.xml', 'sitemap-index.xml', 'robots.txt', '404.html', '_headers', '_redirects', '.well-known/security.txt', 'og/default.png', 'pagefind/pagefind.js', 'theme.js', 'favicon.svg'];
for (const f of required) await stat(path.join(dist, f)).catch(() => errors.push(`missing ${f}`));

// Every font referenced by the CSS exists, with its licence alongside.
const fontCss = await readFile('src/styles/fonts.css', 'utf8');
for (const [, url] of fontCss.matchAll(/url\("([^"]+)"\)/g)) await stat(path.join(dist, url)).catch(() => errors.push(`missing font ${url}`));
for (const lic of ['OFL-InstrumentSans.txt', 'OFL-SourceSerif4.txt', 'OFL-JetBrainsMono.txt']) await stat(path.join(dist, 'fonts', lic)).catch(() => errors.push(`missing licence ${lic}`));

const headersFile = await readFile(path.join(dist, '_headers'), 'utf8').catch(() => '');
if (!/Content-Security-Policy(-Report-Only)?: default-src 'none'/.test(headersFile)) errors.push('_headers: missing CSP');
if (/Content-Security-Policy-Report-Only:/.test(headersFile)) {
  const refusal = reportOnlyRefusal({ ...process.env, CSP_MODE: 'report-only' });
  if (refusal) errors.push(`_headers: CSP is report-only but this is a production build (${refusal})`);
}
if (/Strict-Transport-Security/i.test(headersFile)) errors.push('_headers: HSTS must be set in the Cloudflare dashboard, not _headers');
if (!/https:\/\/:project\.pages\.dev\/\*\n  X-Robots-Tag: noindex/.test(headersFile)) errors.push('_headers: missing pages.dev noindex rule');
if (/unsafe-inline/.test(headersFile)) errors.push("_headers: 'unsafe-inline' is not allowed");

// Drafts: never built, never in RSS, sitemap or the search index.
const drafts = [];
for (const f of (await readdir('src/content/research')).filter((f) => /\.mdx?$/.test(f))) {
  if (/^draft: true/m.test(await readFile(`src/content/research/${f}`, 'utf8'))) drafts.push(f.replace(/\.mdx?$/, ''));
}
const feeds = [await readFile(path.join(dist, 'rss.xml'), 'utf8').catch(() => ''), await readFile(path.join(dist, 'sitemap-0.xml'), 'utf8').catch(() => '')];
const pfIndex = (await readdir(path.join(dist, 'pagefind', 'fragment')).catch(() => [])).length;
for (const slug of drafts) {
  if (await stat(path.join(dist, 'research', slug)).then(() => true, () => false)) errors.push(`draft ${slug} was built`);
  if (feeds.some((x) => x.includes(`/research/${slug}/`))) errors.push(`draft ${slug} is in RSS or sitemap`);
}
if (pfIndex === 0) errors.push('pagefind: no fragments indexed');

for (const slug of (await readdir('src/content/research')).filter((f) => /^[^_].*\.mdx?$/.test(f)).map((f) => f.replace(/\.mdx?$/, ''))) {
  const src = await readFile(`src/content/research/${slug}.md`, 'utf8').catch(() => '');
  if (/^draft: true/m.test(src)) continue;
  const html = await readFile(path.join(dist, 'research', slug, 'index.html'), 'utf8').catch(() => null);
  if (!html) { errors.push(`article ${slug} not built`); continue; }
  const fences = (src.match(/^\s*```/gm) ?? []).length / 2;
  const body = html.split('data-pagefind-body')[1]?.split('class="article-end')[0] ?? '';
  const pres = (body.match(/<pre\b/g) ?? []).length;
  if (pres !== fences) errors.push(`${slug}: expected ${fences} code blocks, found ${pres}`);
  const tables = (src.match(/^\|.*\|\s*\n\|[\s:|-]+\|/gm) ?? []).length;
  const htmlTables = (body.match(/<table\b/g) ?? []).length;
  if (htmlTables !== tables) errors.push(`${slug}: expected ${tables} tables, found ${htmlTables}`);
  const imgs = (src.match(/!\[[^\]]*\]\(/g) ?? []).length;
  const htmlImgs = (body.match(/<img\b/g) ?? []).length;
  if (htmlImgs < imgs) errors.push(`${slug}: expected ${imgs} images, found ${htmlImgs}`);
  if (!html.includes('"@type":"TechArticle"')) errors.push(`${slug}: missing JSON-LD`);
  if (!html.includes(`/og/${slug}.png`)) errors.push(`${slug}: missing og:image`);
}

if (errors.length) {
  console.error(`verify-dist: ${errors.length} problem(s)\n` + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log(`verify-dist: ${pages} pages OK (no inline scripts/styles, no third-party assets, all articles rendered)`);
