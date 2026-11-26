// Single source of truth for HTTP security headers.
// scripts/write-host-config.mjs turns this into host-specific files after each build:
//   dist/_headers                                   (Netlify / Cloudflare Pages format)
//   infra/cloudfront-response-headers-policy.json   (AWS CloudFront, our default host)
// scripts/serve.mjs applies the same headers locally, so Lighthouse CI tests the real CSP.

/** Extra origins the browser may POST form data to (from the forms adapter config). */
function formOrigins(env) {
  return ['PUBLIC_CONTACT_ENDPOINT', 'PUBLIC_NEWSLETTER_ENDPOINT']
    .map((k) => env[k])
    .filter(Boolean)
    .map((u) => new URL(u).origin);
}

export function buildCsp(env = process.env) {
  const forms = formOrigins(env);
  const directives = {
    'default-src': ["'none'"],
    // 'wasm-unsafe-eval' is required by Pagefind's WebAssembly search index.
    // It allows WebAssembly compilation only; JavaScript eval() stays blocked.
    'script-src': ["'self'", "'wasm-unsafe-eval'"],
    'style-src': ["'self'"],
    'img-src': ["'self'", 'data:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'", ...forms],
    'form-action': ["'self'", ...forms],
    'manifest-src': ["'self'"],
    'base-uri': ["'none'"],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
    'upgrade-insecure-requests': [],
  };
  return Object.entries(directives)
    .map(([k, v]) => [k, ...v].join(' '))
    .join('; ');
}

export function securityHeaders(env = process.env) {
  return {
    'Content-Security-Policy': buildCsp(env),
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy':
      'accelerometer=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), usb=(), interest-cohort=(), browsing-topics=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'X-Permitted-Cross-Domain-Policies': 'none',
  };
}

/** Cache rules by path prefix. Hashed build assets are immutable. */
export const cacheRules = [
  { pattern: '/_astro/*', value: 'public, max-age=31536000, immutable' },
  { pattern: '/fonts/*', value: 'public, max-age=31536000, immutable' },
  { pattern: '/pagefind/*', value: 'public, max-age=3600' },
  { pattern: '/*', value: 'public, max-age=0, must-revalidate' },
];
