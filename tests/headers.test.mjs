// Tests for config/security-headers.mjs: the CSP lists an origin only when its integration is on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderHeadersFile, buildCsp } from '../config/security-headers.mjs';

const full = {
  PUBLIC_BUTTONDOWN_USERNAME: 'kileresearch',
  PUBLIC_TURNSTILE_SITE_KEY: '0x4AAAAAAA-test',
  PUBLIC_CF_ANALYTICS_TOKEN: 'abc123',
};

test('nothing configured: strict baseline, no third-party origins, no HSTS', () => {
  const file = renderHeadersFile({});
  assert.doesNotMatch(file, /https:\/\/(?!:project)/);
  assert.doesNotMatch(file, /Strict-Transport-Security/);
  assert.doesNotMatch(file, /unsafe-inline/);
  assert.match(file, /https:\/\/:project\.pages\.dev\/\*\n  X-Robots-Tag: noindex/);
});

test('all integrations on: origins match KILA-43 security-headers-csp §2', () => {
  const base = buildCsp(full);
  assert.match(base, /script-src 'self' 'wasm-unsafe-eval' https:\/\/static\.cloudflareinsights\.com;/);
  assert.match(base, /connect-src 'self' https:\/\/cloudflareinsights\.com;/);
  assert.match(base, /form-action 'self' https:\/\/buttondown\.com;/);
  assert.doesNotMatch(base, /challenges\.cloudflare\.com/, 'Turnstile is scoped to the enquiry pages');
  const enquiry = buildCsp(full, { enquiry: true });
  assert.match(enquiry, /script-src [^;]*https:\/\/challenges\.cloudflare\.com/);
  assert.match(enquiry, /frame-src https:\/\/challenges\.cloudflare\.com/);
});

test('enquiry pages detach the inherited CSP before setting the wider one', () => {
  const file = renderHeadersFile(full);
  for (const p of ['/contact/*', '/consulting/*']) {
    assert.match(file, new RegExp(`${p.replace(/[*/]/g, '\\$&')}\\n  ! Content-Security-Policy\\n  Content-Security-Policy: .*challenges\\.cloudflare\\.com`));
  }
});

test('older buttondown.email embeds are supported through PUBLIC_BUTTONDOWN_HOST', () => {
  assert.match(buildCsp({ ...full, PUBLIC_BUTTONDOWN_HOST: 'https://buttondown.email' }), /form-action 'self' https:\/\/buttondown\.email;/);
});

test('report-only mode for previews', () => {
  const file = renderHeadersFile({ CSP_MODE: 'report-only' });
  assert.match(file, /Content-Security-Policy-Report-Only: /);
  assert.doesNotMatch(file, /^  Content-Security-Policy: /m);
});

test('every _headers line is under the 2,000 character limit', () => {
  for (const line of renderHeadersFile(full).split('\n')) assert.ok(line.length <= 2000);
});
