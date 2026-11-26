// Cloudflare Pages Function: POST /api/contact (KILA-43 `provider-comparison` Option A).
// Receives the enquiry form as a plain urlencoded POST (works without JS), checks it, verifies
// Turnstile server-side and emails it to a role inbox through an Email Routing send_email
// binding. Always answers with a 303 to a static page, so the browser never re-POSTs.
//
// Server-side configuration (Pages > Settings > Variables and Secrets / Bindings, never PUBLIC_*):
//   TURNSTILE_SECRET  (secret)   Turnstile secret key
//   ALLOWED_ORIGINS   (text)     comma list, e.g. "https://kileresearch.ai,https://*.kile-research.pages.dev"
//   CONTACT_FROM      (text)     sender on the Email Routing zone, e.g. "forms@kileresearch.ai"
//   CONTACT_TO        (text)     verified Email Routing destination address
//   CONTACT_EMAIL     (binding)  send_email binding
// If any of these is missing the Function is "not configured": it reads nothing and redirects
// to /contact/unavailable/, which shows the mailto fallback.
//
// Privacy: logs record the outcome only. Never names, emails, message bodies or IPs.

const LIMITS = { name: 100, email: 254, company: 150, message: 2000 };
const SERVICES = {
  adoption: 'AI adoption assessment',
  'private-llm': 'Local/private LLM deployment',
  cost: 'Inference cost optimisation',
  security: 'AI Security Review',
  'not-sure': 'Not sure yet',
};
const MAX_BODY = 16 * 1024;
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const BASE_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'X-Frame-Options': 'DENY',
};

const log = (outcome) => console.log(JSON.stringify({ event: 'contact_form', outcome }));
const redirect = (path, outcome) => {
  log(outcome);
  return new Response(null, { status: 303, headers: { ...BASE_HEADERS, Location: path } });
};
const plain = (status, text, extra = {}) => new Response(text, { status, headers: { ...BASE_HEADERS, 'Content-Type': 'text/plain; charset=utf-8', ...extra } });

/** Remove CR, LF and other control characters: for anything that goes into an email header. */
export const headerSafe = (s) => String(s).replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').trim();
/** Keep newlines and tabs in free text, drop other control characters. */
const bodySafe = (s) => String(s).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim();

function originAllowed(origin, allowList) {
  if (!origin) return false;
  return allowList.some((entry) => {
    if (!entry.includes('*')) return entry === origin;
    // "https://*.project.pages.dev": exactly one extra DNS label.
    const [scheme, host] = entry.split('://*.');
    const m = /^([a-z]+):\/\/([a-z0-9-]+)\.(.+)$/i.exec(origin);
    return Boolean(m && `${m[1]}` === scheme && m[3] === host);
  });
}

export function isConfigured(env) {
  return Boolean(env.TURNSTILE_SECRET && env.ALLOWED_ORIGINS && env.CONTACT_FROM && env.CONTACT_TO && env.CONTACT_EMAIL);
}

/** Validate and normalise the allow-listed fields. Returns { ok, data } or { ok: false }. */
export function parseFields(params) {
  const get = (k) => (params.get(k) ?? '').trim();
  const data = {
    name: headerSafe(get('name')),
    email: headerSafe(get('email')),
    company: headerSafe(get('company')),
    service: get('service') || 'not-sure',
    message: bodySafe(get('message')),
  };
  const ok =
    data.name.length >= 1 && data.name.length <= LIMITS.name &&
    data.email.length <= LIMITS.email && EMAIL_RE.test(data.email) &&
    data.company.length <= LIMITS.company &&
    data.message.length <= LIMITS.message &&
    (data.message.match(/https?:\/\/|www\./gi) ?? []).length <= 3 &&
    Object.hasOwn(SERVICES, data.service);
  return ok ? { ok: true, data } : { ok: false };
}

export function buildMessage({ from, to, data, domain, now = new Date(), id = crypto.randomUUID() }) {
  const headers = [
    `From: Kile Research website <${headerSafe(from)}>`,
    `To: <${headerSafe(to)}>`,
    `Reply-To: <${headerSafe(data.email)}>`,
    `Subject: Website enquiry: ${SERVICES[data.service]}`,
    `Date: ${now.toUTCString()}`,
    `Message-ID: <${id}@${headerSafe(domain)}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
  ];
  const body = [
    'New enquiry from the website contact form.',
    '',
    `Name:     ${data.name}`,
    `Email:    ${data.email}`,
    `Business: ${data.company || '(not given)'}`,
    `Service:  ${SERVICES[data.service]}`,
    '',
    'Message:',
    data.message || '(no message)',
    '',
    '--',
    'Reply to this email to answer the sender. Delete enquiries in line with the privacy notice.',
  ].join('\n');
  return headers.join('\r\n') + '\r\n\r\n' + body.replace(/\n/g, '\r\n') + '\r\n';
}

async function verifyTurnstile(token, env, ip, fetchImpl, allowedHosts) {
  if (!token || token.length > 2048) return false;
  const form = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token });
  if (ip) form.set('remoteip', ip);
  try {
    const res = await fetchImpl(SITEVERIFY, { method: 'POST', body: form });
    const out = await res.json();
    return out.success === true && (!out.hostname || allowedHosts.has(out.hostname) || [...allowedHosts].some((h) => h.startsWith('.') && out.hostname.endsWith(h)));
  } catch {
    return false;
  }
}

/** Core handler. `deps` lets tests inject fetch and the EmailMessage class. */
export async function handle(request, env, deps = {}) {
  if (request.method !== 'POST') return plain(405, 'Method not allowed', { Allow: 'POST' });
  if (!isConfigured(env)) return redirect('/contact/unavailable/', 'not_configured');

  const allowList = String(env.ALLOWED_ORIGINS).split(',').map((s) => s.trim()).filter(Boolean);
  if (!originAllowed(request.headers.get('Origin'), allowList)) return redirect('/contact/error/', 'bad_origin');

  const type = (request.headers.get('Content-Type') ?? '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/x-www-form-urlencoded') return redirect('/contact/error/', 'bad_content_type');
  const length = Number(request.headers.get('Content-Length') ?? 0);
  if (length > MAX_BODY) return redirect('/contact/error/', 'too_large');
  const raw = await request.text();
  if (raw.length > MAX_BODY) return redirect('/contact/error/', 'too_large');
  const params = new URLSearchParams(raw);

  // Honeypot: real people never fill it. Bots get the normal thank-you page.
  if ((params.get('website') ?? '').trim()) return redirect('/contact/thanks/', 'honeypot');

  const parsed = parseFields(params);
  if (!parsed.ok) return redirect('/contact/error/?reason=invalid', 'invalid');

  const allowedHosts = new Set(allowList.map((o) => (o.includes('*') ? '.' + o.split('://*.')[1] : new URL(o).hostname)));
  const human = await verifyTurnstile(params.get('cf-turnstile-response'), env, request.headers.get('CF-Connecting-IP'), deps.fetch ?? fetch, allowedHosts);
  if (!human) return redirect('/contact/error/?reason=verification', 'turnstile_failed');

  try {
    const EmailMessage = deps.EmailMessage ?? (await import('cloudflare:email')).EmailMessage;
    const from = headerSafe(env.CONTACT_FROM);
    const raw = buildMessage({ from, to: env.CONTACT_TO, data: parsed.data, domain: from.split('@')[1] ?? 'localhost' });
    await env.CONTACT_EMAIL.send(new EmailMessage(from, headerSafe(env.CONTACT_TO), raw));
  } catch {
    return redirect('/contact/error/?reason=send', 'send_failed');
  }
  return redirect('/contact/thanks/', 'sent');
}

export const onRequest = (context) => handle(context.request, context.env);
