// Lighthouse CI: audits the built site served with production security headers
// (scripts/serve.mjs), so CSP violations show up as best-practices failures.
const base = 'http://localhost:4322';
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'node scripts/serve.mjs',
      startServerReadyPattern: 'serving dist',
      url: ['/', '/research/', '/research/03-measure-inference-speed/', '/research/04-quantization-explained/', '/consulting/', '/contact/', '/about/'].map((p) => base + p),
      numberOfRuns: 3,
      settings: {},
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.95 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-byte-weight': ['warn', { maxNumericValue: 400000 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci/reports-mobile' },
  },
};
