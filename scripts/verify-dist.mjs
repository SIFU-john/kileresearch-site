// Post-build guardrails, run in CI:
//  - no inline <script> (other than JSON-LD data blocks), no inline <style>, no style="" or on*="" attributes
//  - no third-party origins in src/href of scripts, styles, fonts or images
//  - required files exist (RSS, sitemap, robots, OG images, Pagefind index, host headers)
//  - every migrated article rendered its code blocks and tables
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

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
    if (src && /^(https?:)?\/\//.test(src)) errors.push(`${file}: third-party script ${src}`);
  }
  if (/<style\b/.test(html)) errors.push(`${file}: inline <style>`);
  if (/\sstyle="/.test(html)) errors.push(`${file}: style="" attribute`);
  if (/\son[a-z]+="/.test(html)) errors.push(`${file}: inline event handler`);
  for (const m of html.matchAll(/<link\b[^>]*href="((?:https?:)?\/\/[^"]+)"/g)) {
    if (!/rel="(canonical|alternate)"/.test(m[0])) errors.push(`${file}: third-party <link> ${m[1]}`);
  }
  for (const m of html.matchAll(/<img\b[^>]*src="((?:https?:)?\/\/[^"]+)"/g)) errors.push(`${file}: third-party image ${m[1]}`);
}

const required = ['rss.xml', 'sitemap-index.xml', 'robots.txt', '404.html', '_headers', 'og/default.png', 'pagefind/pagefind.js', 'fonts/InstrumentSans-Variable.woff2'];
for (const f of required) await stat(path.join(dist, f)).catch(() => errors.push(`missing ${f}`));

for (const slug of (await readdir('src/content/research')).filter((f) => /^[^_].*\.mdx?$/.test(f)).map((f) => f.replace(/\.mdx?$/, ''))) {
  const src = await readFile(`src/content/research/${slug}.md`, 'utf8').catch(() => '');
  if (/^draft: true/m.test(src)) continue;
  const html = await readFile(path.join(dist, 'research', slug, 'index.html'), 'utf8').catch(() => null);
  if (!html) { errors.push(`article ${slug} not built`); continue; }
  const fences = (src.match(/^\s*```/gm) ?? []).length / 2;
  const pres = (html.match(/<pre\b/g) ?? []).length;
  if (pres !== fences) errors.push(`${slug}: expected ${fences} code blocks, found ${pres}`);
  const tables = (src.match(/^\|.*\|\s*\n\|[\s:|-]+\|/gm) ?? []).length;
  const htmlTables = (html.match(/<table\b/g) ?? []).length;
  if (htmlTables !== tables) errors.push(`${slug}: expected ${tables} tables, found ${htmlTables}`);
  const imgs = (src.match(/!\[[^\]]*\]\(/g) ?? []).length;
  const htmlImgs = (html.split('data-pagefind-body')[1]?.match(/<img\b/g) ?? []).length;
  if (htmlImgs < imgs) errors.push(`${slug}: expected ${imgs} images, found ${htmlImgs}`);
  if (!html.includes('"@type":"TechArticle"')) errors.push(`${slug}: missing JSON-LD`);
  if (!html.includes(`/og/${slug}.png`)) errors.push(`${slug}: missing og:image`);
}

if (errors.length) {
  console.error(`verify-dist: ${errors.length} problem(s)\n` + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log(`verify-dist: ${pages} pages OK (no inline scripts/styles, no third-party assets, all articles rendered)`);
