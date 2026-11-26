// Build-time OpenGraph image renderer (1200x630 PNG). Satori lays out the card from a
// plain element tree; resvg rasterises it. Runs only at build, never in the browser.
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFile } from 'node:fs/promises';

const fontDir = 'node_modules/@fontsource/instrument-sans/files';
let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 600; style: 'normal' }[]> | undefined;
const loadFonts = () =>
  (fonts ??= Promise.all([
    readFile(`${fontDir}/instrument-sans-latin-400-normal.woff`).then((data) => ({ name: 'Instrument Sans', data, weight: 400 as const, style: 'normal' as const })),
    readFile(`${fontDir}/instrument-sans-latin-600-normal.woff`).then((data) => ({ name: 'Instrument Sans', data, weight: 600 as const, style: 'normal' as const })),
  ]));

type Node = { type: string; props: { style?: Record<string, unknown>; children?: (Node | string)[] | Node | string } };
const h = (type: string, style: Record<string, unknown>, ...children: (Node | string)[]): Node => ({ type, props: { style, children } });

export async function renderOg({ title, kicker, footer }: { title: string; kicker: string; footer: string }) {
  const tree = h(
    'div',
    { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '72px 80px', background: '#0B1220', color: '#E6EAF2', fontFamily: 'Instrument Sans' },
    h('div', { display: 'flex', alignItems: 'center', gap: '18px', fontSize: 34, fontWeight: 600, color: '#FFFFFF' },
      h('div', { width: 52, height: 52, borderRadius: 12, background: '#1F2A44', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        h('div', { width: 30, height: 5, borderRadius: 3, background: '#2DD4BF' })),
      'Kile Research'),
    h('div', { display: 'flex', flexDirection: 'column', gap: '24px' },
      h('div', { fontSize: 26, color: '#5EEAD4', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }, kicker),
      h('div', { fontSize: title.length > 60 ? 60 : 72, fontWeight: 600, lineHeight: 1.1, color: '#FFFFFF', letterSpacing: -1.5 }, title)),
    h('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 26, color: '#A3AEC4' },
      footer,
      h('div', { width: 260, height: 4, background: '#2DD4BF', borderRadius: 2 })),
  );
  const svg = await satori(tree as Parameters<typeof satori>[0], { width: 1200, height: 630, fonts: await loadFonts() });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}
