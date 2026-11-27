// Third-party integrations, configured by environment variables at build time. This file is
// plain JS so both the Astro build (pages) and the Node scripts (headers, local server) read
// the same values. Anything unset is switched off, and its origin stays out of the CSP.
//
//   PUBLIC_BUTTONDOWN_USERNAME  Buttondown newsletter username. Unset -> newsletter shows the mailto fallback.
//   PUBLIC_BUTTONDOWN_HOST      Host of Buttondown's embed form action. Copy it from the generated embed code.
//                               Default https://buttondown.com (older embeds use https://buttondown.email).
//   PUBLIC_CONTACT_PROVIDER     "pages-function" (default: POST to our /api/contact Function),
//                               "formspree" (Option B, needs PUBLIC_FORMSPREE_FORM_ID) or "none" (mailto only).
//   PUBLIC_TURNSTILE_SITE_KEY   Cloudflare Turnstile site key for the enquiry form (public by design).
//   PUBLIC_CF_ANALYTICS_TOKEN   Cloudflare Web Analytics site token (public by design). Unset -> no analytics.
//   CSP_MODE                    "enforce" (default) or "report-only" (use on preview deployments first).

const clean = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

export function integrations(env = process.env) {
  const buttondownUser = clean(env.PUBLIC_BUTTONDOWN_USERNAME);
  const buttondownHost = new URL(clean(env.PUBLIC_BUTTONDOWN_HOST) ?? 'https://buttondown.com').origin;
  const contactProvider = clean(env.PUBLIC_CONTACT_PROVIDER) ?? 'pages-function';
  if (!['pages-function', 'formspree', 'none'].includes(contactProvider)) {
    throw new Error(`PUBLIC_CONTACT_PROVIDER must be pages-function, formspree or none (got "${contactProvider}")`);
  }
  const formspreeId = clean(env.PUBLIC_FORMSPREE_FORM_ID);
  if (buttondownUser && !/^[A-Za-z0-9_-]+$/.test(buttondownUser)) throw new Error('PUBLIC_BUTTONDOWN_USERNAME has unexpected characters');
  if (formspreeId && !/^[A-Za-z0-9]+$/.test(formspreeId)) throw new Error('PUBLIC_FORMSPREE_FORM_ID has unexpected characters');

  const newsletter = buttondownUser
    ? { configured: true, action: `${buttondownHost}/api/emails/embed-subscribe/${buttondownUser}`, origin: buttondownHost, subscribeUrl: `${buttondownHost}/${buttondownUser}` }
    : { configured: false };

  let contact;
  if (contactProvider === 'pages-function') contact = { provider: contactProvider, action: '/api/contact', sameOrigin: true };
  else if (contactProvider === 'formspree' && formspreeId) contact = { provider: contactProvider, action: `https://formspree.io/f/${formspreeId}`, origin: 'https://formspree.io', sameOrigin: false };
  else contact = { provider: 'none' };

  // Turnstile protects our own Function only; Formspree has its own spam filtering.
  const turnstileSiteKey = contact.provider === 'pages-function' ? clean(env.PUBLIC_TURNSTILE_SITE_KEY) : undefined;
  const analyticsToken = clean(env.PUBLIC_CF_ANALYTICS_TOKEN);
  const cspMode = clean(env.CSP_MODE) === 'report-only' ? 'report-only' : 'enforce';

  return { newsletter, contact, turnstileSiteKey, analyticsToken, cspMode };
}

/** The live site's host. Builds for it must enforce the CSP. */
export const PRODUCTION_HOST = 'kileresearch.ai';

/**
 * KILA-43 GB-04: report-only CSP is for previews only. Returns why it is refused, or null.
 * A build counts as production when Cloudflare builds the production branch (CF_PAGES_BRANCH,
 * PRODUCTION_BRANCH defaults to "main") or when SITE_URL is the live apex/www (the default).
 */
export function reportOnlyRefusal(env = process.env) {
  if (integrations(env).cspMode !== 'report-only') return null;
  const branch = clean(env.CF_PAGES_BRANCH);
  if (branch && branch === (clean(env.PRODUCTION_BRANCH) ?? 'main')) return `CSP_MODE=report-only on the production branch "${branch}"`;
  const host = new URL(clean(env.SITE_URL) ?? `https://${PRODUCTION_HOST}`).hostname.replace(/^www\./, '');
  if (host === PRODUCTION_HOST) return `CSP_MODE=report-only with SITE_URL on the production host ${host} (set SITE_URL to the preview URL)`;
  return null;
}

/** Pages that render the enquiry form, so Turnstile's origins are only allowed there. */
export const enquiryPaths = ['/contact/*', '/consulting/*'];
