// Tests for functions/api/contact.js (run: npm test). Pure Node, no Cloudflare runtime needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handle, headerSafe, buildMessage, parseFields, quotedPrintable } from '../functions/api/contact.js';

const ORIGIN = 'https://kileresearch.ai';
const env = (over = {}) => {
  const sent = [];
  return {
    sent,
    TURNSTILE_SECRET: 'test-secret',
    ALLOWED_ORIGINS: `${ORIGIN},https://*.kile-research.pages.dev`,
    CONTACT_FROM: 'forms@kileresearch.ai',
    CONTACT_TO: 'hello@kileresearch.ai',
    CONTACT_EMAIL: { send: async (m) => sent.push(m) },
    ...over,
  };
};
class EmailMessage { constructor(from, to, raw) { Object.assign(this, { from, to, raw }); } }
const okFetch = async () => ({ json: async () => ({ success: true, hostname: 'kileresearch.ai', action: 'contact' }) });
const badFetch = async () => ({ json: async () => ({ success: false }) });
const valid = { name: 'Ada', email: 'ada@example.com', company: 'Acme', service: 'cost', message: 'Hello\nthere', 'cf-turnstile-response': 'tok' };
const post = (fields, headers = {}) =>
  new Request('https://kileresearch.ai/api/contact', {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
    body: new URLSearchParams(fields).toString(),
  });
const deps = { fetch: okFetch, EmailMessage };
const loc = (r) => r.headers.get('Location');

test('rejects non-POST with 405 and no-store', async () => {
  const r = await handle(new Request('https://kileresearch.ai/api/contact'), env(), deps);
  assert.equal(r.status, 405);
  assert.equal(r.headers.get('Cache-Control'), 'no-store');
  assert.equal(r.headers.get('X-Content-Type-Options'), 'nosniff');
});

test('unconfigured -> 303 to the mailto fallback page', async () => {
  const r = await handle(post(valid), { }, deps);
  assert.equal(r.status, 303);
  assert.equal(loc(r), '/contact/unavailable/');
});

test('valid enquiry is sent and redirects to thanks', async () => {
  const e = env();
  const r = await handle(post(valid), e, deps);
  assert.equal(r.status, 303);
  assert.equal(loc(r), '/contact/thanks/');
  assert.equal(e.sent.length, 1);
  assert.match(e.sent[0].raw, /Subject: Website enquiry: Inference cost optimisation\r\n/);
  assert.match(e.sent[0].raw, /Reply-To: <ada@example.com>\r\n/);
  assert.match(e.sent[0].raw, /Content-Type: text\/plain; charset=utf-8/);
});

test('wrong or missing Origin is refused', async () => {
  for (const o of ['https://evil.example', '']) {
    const e = env();
    const r = await handle(post(valid, { Origin: o }), e, deps);
    assert.equal(loc(r), '/contact/error/');
    assert.equal(e.sent.length, 0);
  }
});

test('preview origin wildcard matches exactly one label', async () => {
  const e = env();
  assert.equal(loc(await handle(post(valid, { Origin: 'https://abc123.kile-research.pages.dev' }), e, deps)), '/contact/thanks/');
  assert.equal(loc(await handle(post(valid, { Origin: 'https://a.b.kile-research.pages.dev' }), e, deps)), '/contact/error/');
});

test('honeypot filled -> thanks, nothing sent', async () => {
  const e = env();
  const r = await handle(post({ ...valid, website: 'http://spam' }), e, deps);
  assert.equal(loc(r), '/contact/thanks/');
  assert.equal(e.sent.length, 0);
});

test('length caps and allow-list are enforced', async () => {
  for (const bad of [{ name: 'x'.repeat(101) }, { company: 'x'.repeat(151) }, { message: 'x'.repeat(2001) }, { email: 'not-an-email' }, { service: 'free-money' }, { name: '' }, { message: 'a http://1 b https://2 c www.3 d http://4' }]) {
    const e = env();
    const r = await handle(post({ ...valid, ...bad }), e, deps);
    assert.equal(loc(r), '/contact/error/?reason=invalid', JSON.stringify(bad).slice(0, 40));
    assert.equal(e.sent.length, 0);
  }
});

test('JSON or multipart bodies are refused', async () => {
  const r = await handle(post(valid, { 'Content-Type': 'application/json' }), env(), deps);
  assert.equal(loc(r), '/contact/error/');
});

test('failed Turnstile -> error, nothing sent', async () => {
  const e = env();
  const r = await handle(post(valid), e, { ...deps, fetch: badFetch });
  assert.equal(loc(r), '/contact/error/?reason=verification');
  assert.equal(e.sent.length, 0);
});

test('Turnstile token for another hostname is refused', async () => {
  const e = env();
  const other = async () => ({ json: async () => ({ success: true, hostname: 'evil.example', action: 'contact' }) });
  assert.equal(loc(await handle(post(valid), e, { ...deps, fetch: other })), '/contact/error/?reason=verification');
});

test('CR/LF cannot inject email headers', async () => {
  assert.equal(headerSafe('a\r\nBcc: x@y.z'), 'a Bcc: x@y.z');
  const parsed = parseFields(new URLSearchParams({ ...valid, name: 'Eve\r\nBcc: victim@example.com' }));
  assert.ok(parsed.ok);
  const raw = buildMessage({ from: 'forms@kileresearch.ai', to: 'hello@kileresearch.ai', data: parsed.data, domain: 'kileresearch.ai' });
  const head = raw.split('\r\n\r\n')[0];
  assert.doesNotMatch(head, /^Bcc:/m);
  const e = env();
  await handle(post({ ...valid, email: 'a@b.co\r\nBcc: v@x.io' }), e, deps);
  assert.equal(e.sent.length, 0, 'email with CRLF fails validation');
});

test('send failure -> error page', async () => {
  const e = env({ CONTACT_EMAIL: { send: async () => { throw new Error('boom'); } } });
  assert.equal(loc(await handle(post(valid), e, deps)), '/contact/error/?reason=send');
});

test('logs contain outcomes only, never personal data', async () => {
  const lines = [];
  const orig = console.log;
  console.log = (s) => lines.push(String(s));
  try { await handle(post(valid), env(), deps); } finally { console.log = orig; }
  assert.deepEqual(lines, ['{"event":"contact_form","outcome":"sent"}']);
});

test('Turnstile success without a hostname or with the wrong action is refused (GB-02)', async () => {
  for (const out of [{ success: true, action: 'contact' }, { success: true, hostname: 'kileresearch.ai' }, { success: true, hostname: 'kileresearch.ai', action: 'login' }]) {
    const e = env();
    assert.equal(loc(await handle(post(valid), e, { ...deps, fetch: async () => ({ json: async () => out }) })), '/contact/error/?reason=verification');
    assert.equal(e.sent.length, 0);
  }
});

test('a 2000-character single-line message keeps every line within RFC 5322 limits (GB-01)', async () => {
  const e = env();
  const message = 'é ' + 'x'.repeat(1990) + ' =end';
  assert.equal(loc(await handle(post({ ...valid, message }), e, deps)), '/contact/thanks/');
  const raw = e.sent[0].raw;
  assert.match(raw, /Content-Transfer-Encoding: quoted-printable\r\n/);
  for (const line of raw.split('\r\n')) assert.ok(line.length <= 76, `line of ${line.length}`);
  assert.doesNotMatch(raw, /(?<!\r)\n/, 'bare LF');
});

test('quoted-printable round-trips UTF-8, "=" and trailing spaces', () => {
  const text = 'Grüße = 100%  \n' + 'y'.repeat(200) + '\t';
  const qp = quotedPrintable(text);
  const decoded = qp.replace(/=\r\n/g, '').split('\r\n').join('\n')
    .replace(/(?:=[0-9A-F]{2})+/g, (m) => new TextDecoder().decode(Uint8Array.from(m.slice(1).split('=').map((h) => parseInt(h, 16)))));
  assert.equal(decoded, text);
  for (const line of qp.split('\r\n')) assert.ok(line.length <= 76);
  assert.doesNotMatch(qp, /[ \t](?:\r\n|$)/, 'no trailing whitespace on encoded lines');
});

test('a body over 16 KB with no Content-Length is refused without buffering it all (GB-03)', async () => {
  const e = env();
  let pulled = 0;
  const chunk = new TextEncoder().encode('message=' + 'x'.repeat(4096));
  const body = new ReadableStream({ pull(c) { pulled++; if (pulled > 100) c.close(); else c.enqueue(chunk); } });
  const req = new Request('https://kileresearch.ai/api/contact', { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/x-www-form-urlencoded' }, body, duplex: 'half' });
  assert.equal(req.headers.get('Content-Length'), null);
  assert.equal(loc(await handle(req, e, deps)), '/contact/error/');
  assert.ok(pulled < 10, `read ${pulled} chunks`);
  assert.equal(e.sent.length, 0);
});
