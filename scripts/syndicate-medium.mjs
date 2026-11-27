// "Syndicate to Medium" export. Turns built articles into Medium-ready HTML whose canonical
// link points back to our site, so search engines treat kileresearch.ai as the original.
//
//   npm run build && npm run syndicate:medium              # every published article
//   npm run build && npm run syndicate:medium -- 03-measure-inference-speed
//
// Output: syndication/medium/<slug>.html (git-ignored). Open the file in a browser, copy the
// article, paste it into a new Medium story, then set Story settings > Advanced settings >
// "This story was originally published elsewhere" to the canonical URL printed at the top.
// Once the site is live, Medium's own "Import a story" (medium.com/p/import) with the article
// URL is simpler and sets the canonical automatically. See README "Syndicate to Medium".
//
// Medium has no tables, two heading levels and no syntax highlighting, so tables become
// monospaced text, h4+ become bold paragraphs and code becomes plain <pre>.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const site = new URL(process.env.SITE_URL || 'https://kileresearch.ai');
const domain = site.hostname.replace(/^www\./, '');
const outDir = 'syndication/medium';
const only = process.argv.slice(2);

const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const encode = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const stripTags = (s) => s.replace(/<[^>]+>/g, '');

function tableToText(tableHtml) {
  const rows = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((r) => [...r[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => decode(stripTags(c[1])).trim()));
  const widths = rows[0]?.map((_, i) => Math.max(...rows.map((r) => (r[i] ?? '').length))) ?? [];
  const line = (r) => r.map((c, i) => c.padEnd(widths[i])).join(' | ');
  const text = rows.map((r, i) => (i === 0 ? `${line(r)}\n${widths.map((w) => '-'.repeat(w)).join('-|-')}` : line(r))).join('\n');
  return `<pre>${encode(text)}</pre>`;
}

function toMedium(body, canonical) {
  let html = body;
  html = html.replace(/<a class="heading-anchor"[^>]*>[\s\S]*?<\/a>/g, '');
  html = html.replace(/<div class="heading-wrap">([\s\S]*?)<\/div>/g, '$1');
  html = html.replace(/<div class="code-head">[\s\S]*?<\/div>/g, '');
  html = html.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/g, (_, inner) => `<pre>${encode(decode(stripTags(inner)))}</pre>`);
  html = html.replace(/<div class="code-block"[^>]*>\s*(<pre>[\s\S]*?<\/pre>)\s*<\/div>/g, '$1');
  html = html.replace(/<div class="table-wrap[^"]*"[^>]*>\s*(<table[\s\S]*?<\/table>)\s*<\/div>/g, (_, t) => tableToText(t));
  html = html.replace(/<svg[\s\S]*?<\/svg>/g, '');
  html = html.replace(/<div class="callout[^"]*"[^>]*>\s*<p class="callout__label"[^>]*>([\s\S]*?)<\/p>([\s\S]*?)<\/div>/g, (_, label, inner) => `<blockquote><p><strong>${stripTags(label).trim()}</strong></p>${inner}</blockquote>`);
  html = html.replace(/<h[4-6][^>]*>([\s\S]*?)<\/h[4-6]>/g, '<p><strong>$1</strong></p>');
  html = html.replace(/\s(?:id|class|tabindex|role|aria-[a-z]+|data-[a-z-]+|loading|decoding)="[^"]*"/g, '');
  // Absolute URLs for links and images, so nothing breaks off-site.
  html = html.replace(/\s(href|src)="(\/[^"]*)"/g, (_, attr, p) => ` ${attr}="${new URL(p, site).href}"`);
  html = html.replace(/\shref="#([^"]*)"/g, (_, h) => ` href="${canonical}#${h}"`);
  const footer = `<hr><p><em>Originally published at <a href="${canonical}">${domain}</a>, where you'll also find the code to reproduce it.</em></p>`;
  return html.trim() + '\n' + footer;
}

const slugs = (await readdir('dist/research', { withFileTypes: true }).catch(() => {
  console.error('dist/research not found. Run `npm run build` first.');
  process.exit(1);
}))
  .filter((e) => e.isDirectory() && !['tags', 'series'].includes(e.name))
  .map((e) => e.name)
  .filter((s) => !only.length || only.includes(s));

await mkdir(outDir, { recursive: true });
for (const slug of slugs) {
  const page = await readFile(path.join('dist/research', slug, 'index.html'), 'utf8');
  const title = decode(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(page)?.[1] ?? slug);
  const lede = /<p class="lede"[^>]*>([\s\S]*?)<\/p>/.exec(page)?.[1] ?? '';
  const canonical = /<link rel="canonical" href="([^"]+)"/.exec(page)?.[1] ?? new URL(`/research/${slug}/`, site).href;
  const body = page.split('data-pagefind-body')[1]?.replace(/^[^>]*>/, '').split('<footer class="article-end')[0]?.replace(/<\/div>\s*$/, '') ?? '';
  const doc = `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><title>${encode(title)} (Medium export)</title>
<link rel="canonical" href="${canonical}">
<style>body{font:18px/1.6 Georgia,serif;max-width:46rem;margin:2rem auto;padding:0 1rem}pre{background:#f2f3f5;padding:1rem;overflow:auto;font:14px/1.5 monospace}.note{font:14px/1.5 system-ui;background:#fff7e8;border:1px solid #8a4b00;padding:1rem;margin-bottom:2rem}</style>
</head><body>
<div class="note"><strong>Medium export, not for publishing as-is.</strong><br>
Canonical URL (paste into Medium: Story settings &gt; Advanced settings &gt; "originally published elsewhere"):<br>
<code>${canonical}</code><br>Copy everything below the line into a new Medium story. Set the subtitle to the lede.</div>
<hr>
<h1>${encode(title)}</h1>
<p><em>${lede}</em></p>
${toMedium(body, canonical)}
</body></html>
`;
  await writeFile(path.join(outDir, `${slug}.html`), doc);
  console.log(`${outDir}/${slug}.html  canonical: ${canonical}`);
}
