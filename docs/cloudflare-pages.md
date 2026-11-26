# Cloudflare Pages setup (not done yet: needs user approval)

Nothing here has been created. A **named human** creates the accounts, buys the domain and changes DNS, after user approval (KILA-41 constraints). Security hardening for the account, zone, registrar and email is in KILA-43 `cloudflare-domain-hardening` rev 2; follow it alongside this.

## 1. Project

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → this repository.
2. Build settings:
   - Framework preset: **None** (Astro preset also works)
   - Build command: `npm ci && npm run build`
   - Build output directory: `dist`
   - Root directory: `/`
   - Environment variable `NODE_VERSION` = `24`
3. Production branch: `main`. Preview deployments: on for pull requests. Optionally protect previews with **Cloudflare Access**.
4. The `functions/` directory is deployed automatically as Pages Functions (`/api/contact`).

Direct upload alternative (no Git integration): `npm run build && npx wrangler pages deploy dist --project-name <project>` with a **scoped API token** (Pages edit on this project only, never the Global API Key).

## 2. Variables and secrets (Settings → Variables and Secrets)

Set per environment (Production / Preview).

| Name | Type | Production | Preview |
|---|---|---|---|
| `SITE_URL` | text | `https://kileresearch.ai` | `https://kileresearch.ai` (canonicals always point to production) |
| `CSP_MODE` | text | `enforce` (after the preview soak) | `report-only` first, then `enforce` |
| `PUBLIC_BUTTONDOWN_USERNAME` | text | Buttondown username | same |
| `PUBLIC_BUTTONDOWN_HOST` | text | host from the embed code | same |
| `PUBLIC_TURNSTILE_SITE_KEY` | text | Turnstile site key | same (add the preview host to the widget's hostnames) |
| `PUBLIC_CF_ANALYTICS_TOKEN` | text | Web Analytics site token | leave unset |
| `TURNSTILE_SECRET` | **secret** | Turnstile secret key | same |
| `ALLOWED_ORIGINS` | text | `https://kileresearch.ai` | `https://*.<project>.pages.dev` |
| `CONTACT_FROM` | text | `forms@kileresearch.ai` (see §4) | same |
| `CONTACT_TO` | text | verified destination inbox | same |

Binding (Settings → Bindings): **Send email** named `CONTACT_EMAIL`, restricted to the `CONTACT_TO` destination.

If any Function variable or the binding is missing, the Function reads nothing and redirects to `/contact/unavailable/` (mailto fallback). That is the safe default.

## 3. Domain and redirects

1. Add `kileresearch.ai` as a zone (registrar steps and `.ai` specifics: KILA-43 hardening §2).
2. Pages project → **Custom domains** → add `kileresearch.ai` (apex, canonical) and `www.kileresearch.ai`.
3. **Rules → Redirect Rules**: `www.kileresearch.ai/*` → `https://kileresearch.ai/${1}`, **301**, preserve query string. (This is a Cloudflare rule, not `_redirects`.)
4. After go-live, add a **Bulk Redirect** from `<project>.pages.dev` to `https://kileresearch.ai` (the `_headers` file already sends `X-Robots-Tag: noindex` there).
5. **HSTS:** SSL/TLS → Edge Certificates → HSTS, staged ramp (5 min → 1 month → 1 year → preload only with Board sign-off). It is intentionally **not** in `_headers`.
6. **Turn off** Rocket Loader, Email Obfuscation, Zaraz, Auto Minify, Bot Fight Mode and Web Analytics auto-injection: they inject scripts or cookies and break the CSP or the GPC opt-out. Use a WAF rate-limit rule on `/api/contact` (about 5 POSTs per 10 minutes per IP).

## 4. Email Routing and the send binding

- Enable **Email Routing** on the `kileresearch.ai` zone and verify the destination inbox (`CONTACT_TO`).
- The send_email binding sends **from an address on the zone where Email Routing is enabled**. With the zone on the apex, `CONTACT_FROM` must be `<anything>@kileresearch.ai` (we use `forms@kileresearch.ai`). A subdomain sender such as `forms.kileresearch.ai` would need Email Routing set up on that subdomain too. **To confirm at setup:** the exact SPF/DMARC records Cloudflare adds for sending, and that the send_email binding is available to Pages Functions on the chosen plan. If it isn't, deploy a tiny Worker that owns the binding and call it from the Function through a service binding (the Function's email step is one call, so the change is small).
- The Function sends plain text only, with `Reply-To` set to the enquirer's validated address and all header values stripped of CR/LF.

## 5. Before go-live checklist

- [ ] Preview deployed with `CSP_MODE=report-only`; zero CSP violations in the console across Home, an article, Research search, Consulting (Turnstile), Contact (submit), newsletter POST.
- [ ] Switch to `CSP_MODE=enforce`; repeat.
- [ ] `curl -sI` on `/`, an article, `/research/`, `/contact/`, `/privacy/`, a 404 and `POST /api/contact` shows the expected headers (KILA-43 Gate B, B3).
- [ ] No `Set-Cookie` anywhere; with GPC on, no request to `cloudflareinsights.com`.
- [ ] Gate A (KILA-42) and Gate B (KILA-43) signed off; user approval to go live recorded on the task.
