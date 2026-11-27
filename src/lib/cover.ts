// Generated cover art (editorial redesign, KILA-41). Each article gets an abstract, deterministic
// SVG built at compile time and served as a same-origin file (/covers/{slug}.svg), so it is
// covered by `img-src 'self'` and needs no third-party images. Only presentation attributes are
// used (no style attributes or scripts), and only gradients, no filters, so covers stay cheap
// to paint on mobile. Covers are decorative: always render them with alt="".

export interface Palette { name: string; bg: string; blobs: [string, string, string]; line: string }

/** Vivid, painterly palettes in the spirit of the Noter reference. Order matters: covers cycle through it. */
export const palettes: Palette[] = [
  { name: 'rose', bg: '#FCD9EA', blobs: ['#FF3E9A', '#FF9BCB', '#E0006F'], line: '#FFFFFF' },
  { name: 'tide', bg: '#0FA3B1', blobs: ['#7FE7EE', '#E9FCFF', '#0B6E7A'], line: '#E9FCFF' },
  { name: 'nebula', bg: '#0B0F2A', blobs: ['#2B3BFF', '#8FA2FF', '#5C2BD9'], line: '#C9D2FF' },
  { name: 'moss', bg: '#3F4A0A', blobs: ['#C9E100', '#7A9A00', '#E8F57A'], line: '#F2FAB0' },
  { name: 'dusk', bg: '#F2A679', blobs: ['#5B3FD1', '#1A1F6E', '#FFC9A3'], line: '#FFE4D1' },
  { name: 'glacier', bg: '#B9D4FF', blobs: ['#E9F1FF', '#5B8CFF', '#FFFFFF'], line: '#FFFFFF' },
];

/** Small seeded PRNG (mulberry32) so the same slug always gives the same picture. */
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);
const r1 = (n: number) => Math.round(n * 10) / 10;

export const COVER_W = 1200;
export const COVER_H = 800;

export function coverSvg(slug: string, palette: Palette): string {
  const rand = rng(hash(slug));
  const [a, b, c] = palette.blobs;
  const W = COVER_W, H = COVER_H;

  // Soft colour fields: radial gradients that fade to transparent read like blurred paint.
  const blobs = [a, b, c, a, b].map((color, i) => {
    const cx = r1(W * (0.1 + rand() * 0.8));
    const cy = r1(H * (0.1 + rand() * 0.8));
    const rx = r1(W * (0.28 + rand() * 0.3));
    const ry = r1(H * (0.3 + rand() * 0.35));
    return { id: `g${i}`, color, cx, cy, rx, ry, op: (0.55 + rand() * 0.4).toFixed(2) };
  });

  // Flowing contour lines give texture without a noise filter.
  const lines: string[] = [];
  const count = 14 + Math.floor(rand() * 8);
  const amp = 40 + rand() * 90;
  const freq = 1 + rand() * 1.5;
  const tilt = (rand() - 0.5) * 220;
  const phase = rand() * Math.PI * 2;
  for (let i = 0; i < count; i++) {
    const y0 = (H / count) * i + (rand() - 0.5) * 20;
    const pts: string[] = [];
    for (let x = -50; x <= W + 50; x += 50) {
      const y = y0 + Math.sin((x / W) * Math.PI * 2 * freq + phase + i * 0.18) * amp + (x / W) * tilt;
      pts.push(`${x},${r1(y)}`);
    }
    lines.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${palette.line}" stroke-width="${r1(1 + rand() * 2.5)}" stroke-opacity="${(0.08 + rand() * 0.22).toFixed(2)}" stroke-linejoin="round"/>`);
  }

  const defs = blobs
    .map((g) => `<radialGradient id="${g.id}" gradientUnits="userSpaceOnUse" cx="${g.cx}" cy="${g.cy}" r="${Math.max(g.rx, g.ry)}" gradientTransform="translate(${g.cx} ${g.cy}) scale(${r1(g.rx / Math.max(g.rx, g.ry))} ${r1(g.ry / Math.max(g.rx, g.ry))}) translate(${-g.cx} ${-g.cy})"><stop offset="0" stop-color="${g.color}" stop-opacity="${g.op}"/><stop offset="0.55" stop-color="${g.color}" stop-opacity="${(+g.op * 0.45).toFixed(2)}"/><stop offset="1" stop-color="${g.color}" stop-opacity="0"/></radialGradient>`)
    .join('');
  const fields = blobs.map((g) => `<rect width="${W}" height="${H}" fill="url(#${g.id})"/>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs><rect width="${W}" height="${H}" fill="${palette.bg}"/>${fields}<g>${lines.join('')}</g></svg>`;
}

export const coverUrl = (slug: string) => `/covers/${slug}.svg`;
