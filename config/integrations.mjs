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

/** Pages that render the enquiry form, so Turnstile's origins are only allowed there. */
export const enquiryPaths = ['/contact/*', '/consulting/*'];
