# Kile Research website

The home of Kile Research: reproducible, hands-on research on AI and LLM inference, plus consulting for small and mid-sized businesses. It replaces our Medium publication.

- **Stack:** [Astro](https://astro.build) 7 static site, TypeScript, Markdown/MDX content collections with a typed schema
- **Search:** [Pagefind](https://pagefind.app), built at compile time and fully self-hosted
- **JavaScript shipped:** none on most pages. Small bundled modules only for code-copy buttons, search and forms
- **Security:** no inline scripts or styles, strict CSP and security headers from one config file, self-hosted fonts, no trackers or third-party requests

---

## How to publish an article (no coding needed)

You only need a GitHub account with access to this repository. Everything happens in the browser.

1. **Start from the template.** Open [`src/content/research/`](src/content/research/) on GitHub, then click **Add file → Create new file**.
2. **Name the file** `NN-short-name.md`, for example `05-memory-bandwidth.md`. Use the part number, lowercase letters and hyphens. The file name becomes the web address: `/research/05-memory-bandwidth/`.
3. **Paste this header at the very top** and fill it in:

   ```markdown
   ---
   title: "Why AI Speed Is a Memory Problem, Not a Math Problem"
   description: "One or two sentences (50–200 characters) shown on cards, in search results and when the link is shared."
   date: 2026-11-09
   tags: [inference, memory, performance]
   series:
     name: "Beginner's Guide to Inference"
     week: 2
     part: 5
   author: kile-research
   repoPath: scripts/memory_bandwidth.py
   readingTime: 7
   draft: false
   ---
   ```

   - `tags`: 1–6 tags, lowercase, words joined with hyphens (`local-llm`, not `Local LLM`).
   - `repoPath`: the file or folder in the [KileResearch code repo](https://github.com/SIFU-john/KileResearch) that readers can run. It powers the **Reproduce this** button. Leave the line out if there is no code.
   - `readingTime` (optional): minutes, including following the steps. If you leave it out, it's estimated.
   - `updated: 2026-12-01` (optional): add this when you correct a published article.
   - `draft: true` keeps the article off the live site while you work on it.

4. **Write the article below the second `---`** in normal Markdown, following [STYLE.md](https://github.com/SIFU-john/KileResearch/blob/main/STYLE.md). **Don't** repeat the title or the byline: the page adds those for you. Start with your opening paragraph.
   - Links to other articles can use either form: `[Part 1](01-run-your-first-llm-locally.md)` or `[Part 1](/research/01-run-your-first-llm-locally/)`.
   - **Images:** upload them to `src/content/research/images/` and use `![Describe the image for screen readers](./images/my-chart.png)`. Alt text is required. Images are resized and compressed automatically. Unlike Medium, tables work as normal Markdown tables, so you don't need table images.
5. **Open a pull request.** At the bottom of the page choose **Create a new branch … and start a pull request**, then click **Propose new file** and **Create pull request**.
6. **Wait for the green ticks.** CI checks the header fields, builds the site, checks every link and runs Lighthouse. If something is red, open **Details**: the error names the file and the field to fix (for example, *description: must be at least 50 characters*).
7. **Ask for a review, then merge.** Once it's approved, click **Merge pull request**. The site rebuilds from `main`.

> **Deployment status:** hosting isn't connected yet (it needs CEO/Board approval for a domain and an AWS account). Until then, merging updates `main` and CI produces a ready-to-upload build artifact; it doesn't go live automatically. See [Deploying](#deploying).

To see your article before publishing, ask an engineer for a preview, or run the site locally (below).

---

## Run it locally

Requirements: Node.js 22.23.4+ (24 recommended, see `.nvmrc`) and npm.

```bash
npm ci                 # install exact versions from the lockfile
npm run dev            # http://localhost:4321, live reload, drafts visible
npm run build          # production build into dist/ (+ search index + header files)
npm run serve          # serve dist/ with the real security headers on http://localhost:4322
```

Quality checks (the same ones CI runs):

```bash
npm run check                    # TypeScript + content schema validation
node scripts/verify-dist.mjs     # no inline JS/CSS, no third-party assets, articles fully rendered
npm run links                    # internal link check
npm run links:external           # external links too (network needed)
npx lhci autorun --config=lighthouserc.mobile.cjs   # Lighthouse, mobile (asserts ≥95 everywhere)
npx lhci autorun --config=lighthouserc.cjs          # Lighthouse, desktop
```

`SHOW_DRAFTS=1 npm run build` includes drafts, such as `zz-kitchen-sink.md`, a fixture that shows every element an article can use (headings, code, tables, images, callouts).

If you change a Markdown plugin and the output doesn't change, run `npm run clean`: Astro caches rendered content.

### Configuration

Copy `.env.example` to `.env` to override settings. Never commit `.env`.

| Variable | Default | Purpose |
|---|---|---|
| `SITE_URL` | `https://kile-research.example` | Canonical origin for links, sitemap, RSS and OpenGraph. **Placeholder until a domain is approved.** |
| `PUBLIC_CONTACT_EMAIL` | `hello@example.com` | mailto fallback address. **Placeholder.** |
| `PUBLIC_FORMS_PROVIDER` | `none` | `none` or `http-post` |
| `PUBLIC_CONTACT_ENDPOINT` / `PUBLIC_NEWSLETTER_ENDPOINT` | empty | Where `http-post` sends JSON. Their origins are added to the CSP automatically. |

---

## How it's built

```
src/
  content/research/      articles (Markdown/MDX) + images/
  content.config.ts      typed frontmatter schema (build fails on invalid fields)
  config/site.ts         name, nav, code repo, contact email
  config/authors.ts      author profiles (house style: "Kile Research" only)
  styles/tokens.css      KILA-32 design tokens, copied verbatim. Swap the file to update the design
  styles/global.css      site layer: dark mode, buttons, cards, forms, prose, tables
  styles/code.css        Prism syntax colours (AA contrast)
  components/            Header, Footer, ArticleCard, Toc, AuthorBox, ReproduceLink, Search, forms/…
  layouts/BaseLayout     <head>: SEO, canonical, OpenGraph, JSON-LD, RSS
  lib/forms/             provider-agnostic form adapter
  lib/rehype-article.mjs table/code wrappers, heading anchors, .md link rewriting
  lib/og.ts              build-time OpenGraph PNGs (satori + resvg)
  pages/                 /, /research/, /research/[slug]/, /research/tags/*, /research/series/*,
                         /consulting/, /about/, /contact/, /privacy/, 404, rss.xml, robots.txt, og/*.png
config/security-headers.mjs   single source of truth for CSP and security headers
scripts/                      serve, verify-dist, write-host-config, copy-fonts, migrate-articles
infra/                        generated CloudFront response-headers policy
```

### Design tokens

`src/styles/tokens.css` is the KILA-32 "Calm Signal" token file, unchanged. Components only use semantic tokens (`--color-text`, `--color-accent`, …), so Iris's KILA-42 article and consulting layouts can drop in by replacing the token file and the component styles. Dark mode follows the OS setting (`prefers-color-scheme`) using the tested ink-surface values, with no JS and no flash. The italic font face lives in `global.css` because tokens v0.1 doesn't define one.

### Forms and newsletter

Pages only talk to the `FormAdapter` interface in `src/lib/forms/types.ts`. Adapters live in `src/lib/forms/adapters.ts`:

- `none` (default): every submit returns `not-configured`. The form shows a friendly notice with a **pre-filled mailto link**, so nothing is lost.
- `http-post`: sends JSON to the configured endpoint. This works with most hosted form services or a small serverless function of our own.

To add a provider with a custom API, write a new adapter (about 20 lines), register it in `adapters`, and set `PUBLIC_FORMS_PROVIDER`. Forms include client-side validation with accessible error messages, a honeypot field for bots, and `credentials: 'omit'`.

### Security headers

`config/security-headers.mjs` defines every header once. `npm run build` writes:

- `dist/_headers` for Netlify or Cloudflare Pages
- `infra/cloudfront-response-headers-policy.json` for AWS CloudFront, our default (`aws cloudfront create-response-headers-policy --response-headers-policy-config file://infra/cloudfront-response-headers-policy.json`)

`npm run serve` and Lighthouse CI apply the same headers, so CSP breakage shows up locally and in CI.

Policy summary: `default-src 'none'`; scripts, styles, fonts and images from `'self'` only; `frame-ancestors 'none'`; `base-uri 'none'`; `object-src 'none'`; HSTS (2 years, preload); `nosniff`; `strict-origin-when-cross-origin`; a locked-down Permissions-Policy; COOP and CORP `same-origin`.

Exceptions, both deliberate:
- `script-src 'wasm-unsafe-eval'` is needed for Pagefind's WebAssembly search. It permits WebAssembly compilation only, not JavaScript `eval`.
- JSON-LD uses `<script type="application/ld+json">`. It's a non-executable data block, so CSP doesn't apply to it, and `<` is escaped.

Prism is used for syntax highlighting instead of Shiki because Shiki writes inline `style=""` attributes, which `style-src 'self'` would block.

### CI (`.github/workflows/ci.yml`)

On every PR and on push to `main`: `npm ci --ignore-scripts`, `npm audit` (runtime dependencies must be clean; dev tooling is reported), `astro check`, build, `verify-dist`, internal link check, Lighthouse CI (mobile and desktop, ≥ 95 in every category, LCP < 2.5 s, CLS < 0.1), and a gitleaks secret scan. External links are checked on `main` without blocking. Actions are pinned to commit SHAs, and dependencies are pinned exactly (`.npmrc save-exact`). Dependabot keeps both up to date.

---

## Deploying

**Not set up yet, on purpose.** Deploying to a public domain, buying a domain and creating hosting accounts all need CEO/Board approval. The intended setup on our default stack:

1. S3 bucket (private, Origin Access Control) + CloudFront, with the generated response-headers policy attached.
2. A GitHub Actions deploy job on `main` using OIDC to assume a least-privilege role (`s3:PutObject`/`DeleteObject` on the bucket and `cloudfront:CreateInvalidation`). No long-lived keys.
3. PR previews on a separate, `noindex` preview distribution.

`dist/` is a plain static folder, so Netlify or Cloudflare Pages also work (they read `dist/_headers`).

## Content migration

The four Week 1 articles were migrated from [SIFU-john/KileResearch](https://github.com/SIFU-john/KileResearch) with `node scripts/migrate-articles.mjs <checkout>`. It moves the title, byline, series, part and reading time into frontmatter, then drops the H1 and byline from the body. Publication dates were **inferred** from the hub README's Mon/Tue/Thu/Fri cadence (2, 3, 5 and 6 November 2026) and should be confirmed.

## License

Code and content: MIT, © 2026 Kile Research. Fonts: Instrument Sans and JetBrains Mono, SIL Open Font License 1.1 (see `public/fonts/`).
