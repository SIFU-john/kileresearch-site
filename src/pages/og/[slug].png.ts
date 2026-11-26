import type { APIContext } from 'astro';
import { renderOg } from '../../lib/og';
import { getArticles, type Article } from '../../lib/content';
import { displayDomain } from '../../config/site';

export async function getStaticPaths() {
  const articles = await getArticles();
  const series = [...new Set(articles.flatMap((a) => (a.data.series ? [a.data.series.name] : [])))];
  return [
    { params: { slug: 'default' }, props: { article: undefined, variant: 'ink' as const } },
    // Variant alternates by series (brand-application rev 2), never at random.
    ...articles.map((article) => ({
      params: { slug: article.id },
      props: { article, variant: (article.data.series ? series.indexOf(article.data.series.name) % 2 === 0 : true) ? ('paper' as const) : ('ink' as const) },
    })),
  ];
}

export async function GET({ props, site }: APIContext<{ article: Article | undefined; variant: 'paper' | 'ink' }>) {
  const a = props.article;
  const domain = displayDomain(site);
  const png = await renderOg(
    a
      ? { title: a.data.title, overline: a.data.series ? `${a.data.series.name} · Part ${a.data.series.part}` : 'Kile Research', domain, variant: props.variant }
      : { title: 'Run, measure and understand AI models yourself.', overline: 'Kile Research', domain, variant: props.variant },
  );
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
}
