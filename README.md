# Kile Research website

The home of Kile Research (`kileresearch.ai`): practical, reproducible research on AI and LLM inference, plus consulting for small businesses. It replaces our Medium publication; Medium stays as a syndication channel that links back here.

- **Stack:** [Astro](https://astro.build) 7 static site, TypeScript, Markdown/MDX content collections with a typed schema
- **Hosting:** Cloudflare Pages (static files + one Pages Function for the enquiry form). Setup: [docs/cloudflare-pages.md](docs/cloudflare-pages.md)
- **Search:** [Pagefind](https://pagefind.app), built at compile time, fully self-hosted
- **Design:** KILA-32 "Calm Signal" tokens + KILA-42 Kile Research tokens, light and dark themes
- **Security:** no inline scripts or styles, strict CSP generated from one config file, self-hosted fonts, no trackers, no cookies

---

## How to publish an article (no coding needed)

You only need a GitHub account with access to this repository. Everything happens in the browser.

1. **Start a new file.** Open [`src/content/research/`](src/content/research/) on GitHub, then click **Add file → Create new file**.
2. **Name the file** `NN-short-name.md`, for example `05-memory-bandwidth.md`: lowercase letters and hyphens. The file name becomes the web address: `kileresearch.ai/research/05-memory-bandwidth/`.
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
   level: beginner
   repoPath: scripts/memory_bandwidth.py
   draft: false
   ---
   ```

   - `tags`: 1–6 tags, lowercase, words joined with hyphens (`local-llm`, not `Local LLM`).
   - `level`: `beginner` or `intermediate` (optional).
   - `repoPath`: the file or folder in the [KileResearch code repo](https://github.com/SIFU-john/KileResearch) readers can run. It powers **Reproduce this**. Leave it out if there's no code.
   - `tested` (optional, only real values): a "Tested with" list, e.g. `tested: [{ label: "Hardware", value: "M2 MacBook Air, 16 GB" }]`.
   - `readingTime` (optional): minutes. If you leave it out it's worked out for you.
   - `updated: 2026-12-01` (optional): add this when you correct a published article.
   - `mediumUrl` (optional): the Medium copy's URL, once syndicated. It adds a small "Also on Medium" link.
   - `draft: true` keeps the article off the live site, RSS, sitemap and search while you work on it.

4. **Write the article below the second `---`** in normal Markdown, following [STYLE.md](https://github.com/SIFU-john/KileResearch/blob/main/STYLE.md). Don't repeat the title or byline; start with your opening paragraph.
   - Links to other articles: `[Part 1](01-run-your-first-llm-locally.md)` or `[Part 1](/research/01-run-your-first-llm-locally/)`.
   - **Callouts:** start a quote with a bold label: `> **Tip:** ...`, `> **Note:** ...`, `> **Heads-up:** ...` (warning) or `> **Caution:** ...`. GitHub style `> [!TIP]` works too.
   - **Images:** upload to `src/content/research/images/` and write `![Describe the image](./images/my-chart.png "Figure 1. Optional caption")`. Alt text is required. Tables work as normal Markdown tables.
5. **Open a pull request.** Choose **Create a new branch … and start a pull request**, then **Propose new file** and **Create pull request**.
6. **Wait for the green ticks.** CI checks the header fields, builds the site, checks links, scans for secrets and runs Lighthouse. If something is red, open **Details**: the error names the file and field (e.g. *description: must be at least 50 characters*).
7. **Ask for a review, then merge.** Once Cloudflare Pages is connected, merging to `main` deploys automatically; every pull request also gets its own private preview link.

> **Deployment status:** not live. The Cloudflare account, project and domain need a named human and user approval (see [docs/cloudflare-pages.md](docs/cloudflare-pages.md)). Until then, CI produces a ready-to-deploy `dist` artifact.

### Syndicate to Medium

Our site is always the original; Medium copies point their canonical link back here.

- **Once the site is live (preferred):** on Medium, go to *Import a story* (`medium.com/p/import`) and paste the article URL, e.g. `https://kileresearch.ai/research/03-measure-inference-speed/`. Medium imports it and sets the canonical link for you.
- **Before that, or if the import mangles code:** run `npm run build && npm run syndicate:medium` (or `... -- 03-measure-inference-speed` for one article). Open `syndication/medium/<slug>.html` in a browser, copy the article into a new Medium story, then set **Story settings → Advanced settings → "This story was originally published elsewhere"** to the canonical URL shown at the top of the file. The export makes links absolute, turns tables into monospaced text (Medium has no tables) and adds "Originally published at kileresearch.ai, with code to reproduce it."
- Then add `mediumUrl:` to the article's header so our page shows "Also on Medium".

---

## Run it locally

Requirements: Node.js 24 (see `.nvmrc`) and npm.

```bash
npm ci                 # install exact versions from the lockfile
npm run dev            # http://localhost:4321, live reload, drafts visible
npm run build          # production build into dist/ (+ search index, _headers, security.txt)
npm run preview        # serve dist/ like Cloudflare Pages would, with dist/_headers, on http://localhost:4322
```

`npm run preview` applies `dist/_headers` exactly (including `! Header` detach rules) and answers `POST /api/contact` like the *unconfigured* Function (303 → `/contact/unavailable/`). To run the real Function locally: `npx wrangler pages dev dist` (needs a `.dev.vars` file with the server-side variables).

Quality checks (the same ones CI runs):

```bash
npm run check                    # TypeScript + content schema validation
npm test                         # contact Function + security header tests (node:test)
node scripts/verify-dist.mjs     # no inline JS/CSS, no third-party assets, no drafts leaked, articles fully rendered
npm run links                    # internal link check
npx lhci autorun --config=lighthouserc.mobile.cjs   # Lighthouse, mobile (asserts ≥95 everywhere, LCP < 2.5 s)
npx lhci autorun --config=lighthouserc.cjs          # Lighthouse, desktop
npm run headers                  # print the _headers file for the current env
```

`SHOW_DRAFTS=1 npm run build` includes drafts, such as `zz-kitchen-sink.md`, a fixture with every element an article can use. If Markdown output doesn't change after editing a plugin, run `npm run clean`.

### Configuration

Copy `.env.example` to `.env` locally; in Cloudflare Pages set the same names under **Settings → Variables and Secrets**. Anything unset is switched off and its origin stays out of the CSP.

| Variable | Default | Purpose |
|---|---|---|
| `SITE_URL` | `https://kileresearch.ai` | Canonical origin: canonical, Open Graph, RSS, sitemap, JSON-LD and security.txt all derive from it |
| `PUBLIC_CONTACT_EMAIL` | `hello@kileresearch.ai` | mailto fallback. **Stub** until email is set up on the domain |
| `PUBLIC_BUTTONDOWN_USERNAME` | unset | Buttondown newsletter. Unset → panels show a mailto fallback |
| `PUBLIC_BUTTONDOWN_HOST` | `https://buttondown.com` | Host of the embed form action. Copy it from Buttondown's embed code |
| `PUBLIC_CONTACT_PROVIDER` | `pages-function` | `pages-function`, `formspree` (+ `PUBLIC_FORMSPREE_FORM_ID`) or `none` |
| `PUBLIC_TURNSTILE_SITE_KEY` | unset | Turnstile on the enquiry form (contact + consulting pages only) |
| `PUBLIC_CF_ANALYTICS_TOKEN` | unset | Cloudflare Web Analytics, loaded by `/js/analytics.js`, skipped when the browser sends GPC |
| `CSP_MODE` | `enforce` | `report-only` sends `Content-Security-Policy-Report-Only` (use on previews first) |
| `PUBLIC_MEDIUM_PROFILE` | unset | Adds "Also on Medium" to the footer |

Server-side variables for the Function (`TURNSTILE_SECRET`, `ALLOWED_ORIGINS`, `CONTACT_FROM`, `CONTACT_TO`, `CONTACT_EMAIL` binding) are in [docs/cloudflare-pages.md](docs/cloudflare-pages.md). Never prefix a secret with `PUBLIC_`: those are baked into the HTML.

---

## How it's built

```
config/security-headers.mjs   single source of truth for headers/CSP -> dist/_headers
config/integrations.mjs       env -> which integrations are on (shared by Astro and Node scripts)
functions/api/contact.js      Pages Function: enquiry form -> Turnstile -> email (Email Routing)
public/theme.js               theme preference (reads localStorage; writes only on click)
public/js/analytics.js        GPC-aware Cloudflare Web Analytics loader
src/content/research/         articles (Markdown/MDX) + images
src/content.config.ts         typed frontmatter schema
src/config/                   site, services, authors, fonts, content flags
src/styles/                   tokens.css (KILA-32), kile-research.tokens.css (KILA-42), site CSS
src/lib/rehype-article.mjs    code blocks, tables, callouts, figures, heading anchors, link rewriting
scripts/                      host config, local server, dist checks, fonts, Medium export
tests/                        node:test suites
```

- **Design tokens:** `src/styles/tokens.css` and `src/styles/kile-research.tokens.css` are copies of the design files with only `@font-face` removed (fonts are declared in `fonts.css` with versioned file names). Update by re-copying.
- **Syntax highlighting:** Prism (class names only). Shiki, including its `css-variables` theme, writes `style=""` on every token, which the CSP forbids. Prism classes map to the same `--code-*` tokens as the design's Shiki bridge.
- **Fonts:** Instrument Sans, Source Serif 4 and JetBrains Mono, WOFF2, self-hosted in `public/fonts/` with their OFL licences. File names carry the package version because `/fonts/*` is cached immutably. `npm run fonts` regenerates them.
- **Forms:** plain HTML POSTs that work without JavaScript. The enquiry form posts to `/api/contact`; JS adds validation, an error summary and an in-page result. The newsletter is Buttondown's embed form (no iframe, no script).
- **Content flags:** consulting claims that need a business decision are behind `contentFlags` in `src/config/site.ts`.

### Security headers

`config/security-headers.mjs` generates `dist/_headers` on every build (KILA-43 `security-headers-csp` rev 3): CSP, nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options, COOP/CORP, cache rules, and `X-Robots-Tag: noindex` for `*.pages.dev`. Turnstile's origins are allowed only on `/contact/*` and `/consulting/*`, using `! Content-Security-Policy` to detach the site-wide policy. **HSTS is deliberately not in `_headers`**: it is set once in the Cloudflare dashboard with a staged ramp.

### CI (`.github/workflows/ci.yml`)

Build, type-check, unit tests, `npm audit --omit=dev --audit-level=high` (fails the build), verify-dist, internal links, gitleaks on the repo and on `dist/`, and Lighthouse CI (mobile + desktop, ≥95 in every category). Actions are pinned to commit SHAs, the workflow token is `contents: read`, and Dependabot watches npm and Actions.

---

## Stubs and open items

| Item | Status | Owner |
|---|---|---|
| Consulting copy, FAQ answers, "How it works" durations, reply time `[n]` | Placeholder | Chris (copy), CEO |
| Prices | "Price on request — pending Board approval" | Board |
| "Your data stays yours…", "Fixed-scope projects or month-to-month…" | Hidden behind `contentFlags` | CEO |
| Newsletter cadence `[week/month]`, double opt-in wording | Placeholder | Account owner |
| `hello@` / `security@kileresearch.ai` | Not set up yet | Board (email layout, KILA-43) |
| Privacy notice, accessibility statement | Drafts, need legal review / Gate A results | Sentinel, lawyer, Iris |
| Author bio and links | Placeholder | Author |
| Logo mark, favicon | Draft artwork (KILA-42) | Iris |
| Cloudflare project, domain, Buttondown, Turnstile, Email Routing | Not created (needs user approval) | Named human |

## License

To be confirmed by the Board. Article text and code: see the [KileResearch repo](https://github.com/SIFU-john/KileResearch).
