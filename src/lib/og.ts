// Build-time Open Graph image (1200x630 PNG), following KILA-42 brand-application rev 2
// "Domain in brand applications": mono overline top left, title in Instrument Sans SemiBold
// (64px max, up to 3 lines), lock-up bottom left, the domain in mono bottom right, 48px safe
// margin, paper or ink variant. Satori lays it out and resvg rasterises it; runs only at build.
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFile } from 'node:fs/promises';

type Font = { name: string; data: Buffer; weight: 400 | 600; style: 'normal' };
let fonts: Promise<Font[]> | undefined;
const font = (file: string, name: string, weight: 400 | 600) => readFile(`node_modules/${file}`).then((data) => ({ name, data, weight, style: 'normal' as const }));
const loadFonts = () =>
  (fonts ??= Promise.all([
    font('@fontsource/instrument-sans/files/instrument-sans-latin-400-normal.woff', 'Instrument Sans', 400),
    font('@fontsource/instrument-sans/files/instrument-sans-latin-600-normal.woff', 'Instrument Sans', 600),
    font('@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff', 'JetBrains Mono', 400),
  ]));

const PALETTE = {
  paper: { bg: '#FAF9F6', title: '#0B1220', muted: '#55627A', mark: '#0B1220', research: '#55627A', accent: '#0E6F66' },
  ink: { bg: '#0B1220', title: '#F6F7F9', muted: '#A3AEC4', mark: '#F6F7F9', research: '#A3AEC4', accent: '#2DD4BF' },
} as const;

type Node = { type: string; props: Record<string, unknown> & { style?: Record<string, unknown>; children?: unknown } };
const h = (type: string, style: Record<string, unknown>, ...children: (Node | string)[]): Node => ({ type, props: { style, children } });

function mark(color: string): Node {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="1" y="1" width="30" height="30" rx="7" fill="none" stroke="${color}" stroke-width="2"/><path d="M7 20 H14 M18 20 L22 13" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/><circle cx="24" cy="10.5" r="2.25" fill="${color}"/></svg>`;
  return { type: 'img', props: { src: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`, width: 48, height: 48 } };
}

/** Title size: 64px, stepping down so long titles stay within 3 lines. */
const titleSize = (t: string) => (t.length <= 60 ? 64 : t.length <= 80 ? 56 : 48);

export async function renderOg({ title, overline, domain, variant }: { title: string; overline: string; domain: string; variant: 'paper' | 'ink' }) {
  const c = PALETTE[variant];
  const tree = h(
    'div',
    { width: 1200, height: 630, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 48, background: c.bg, fontFamily: 'Instrument Sans' },
    h('div', { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 24, letterSpacing: 2, textTransform: 'uppercase', color: c.muted }, overline),
    h(
      'div',
      { display: 'flex', flexDirection: 'column', gap: 28 },
      h('div', { display: 'flex', width: 120, height: 4, background: c.accent, borderRadius: 2 }),
      h('div', { display: 'block', fontSize: titleSize(title), fontWeight: 600, lineHeight: 1.12, letterSpacing: -1.2, color: c.title, maxWidth: 1040, lineClamp: 3 }, title),
    ),
    h(
      'div',
      { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
      h('div', { display: 'flex', alignItems: 'center', gap: 16, fontSize: 36, letterSpacing: -0.7 },
        mark(c.mark),
        h('div', { display: 'flex', gap: 10 }, h('span', { fontWeight: 600, color: c.title }, 'Kile'), h('span', { fontWeight: 400, color: c.research }, 'Research'))),
      h('div', { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 24, color: c.muted }, domain),
    ),
  );
  const svg = await satori(tree as Parameters<typeof satori>[0], { width: 1200, height: 630, fonts: await loadFonts() });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}
