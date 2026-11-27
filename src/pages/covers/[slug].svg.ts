import type { APIContext } from 'astro';
import { coverSvg, palettes, type Palette } from '../../lib/cover';
import { getArticles } from '../../lib/content';

export async function getStaticPaths() {
  // Oldest first, so an article keeps its palette when newer ones are published.
  const articles = (await getArticles()).toReversed();
  return [
    ...articles.map((a, i) => ({ params: { slug: a.id }, props: { palette: palettes[i % palettes.length]! } })),
    // Non-article artwork (home sidebar, consulting).
    { params: { slug: 'consulting' }, props: { palette: palettes.find((p) => p.name === 'dusk')! } },
    { params: { slug: 'about' }, props: { palette: palettes.find((p) => p.name === 'glacier')! } },
  ];
}

export function GET({ params, props }: APIContext<{ palette: Palette }>) {
  return new Response(coverSvg(params.slug!, props.palette), { headers: { 'Content-Type': 'image/svg+xml' } });
}
