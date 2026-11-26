import type { APIContext } from 'astro';
import { renderOg } from '../../lib/og';
import { getArticles, type Article } from '../../lib/content';
import { site } from '../../config/site';

export async function getStaticPaths() {
  const articles = await getArticles();
  return [
    { params: { slug: 'default' }, props: { article: undefined } },
    ...articles.map((article) => ({ params: { slug: article.id }, props: { article } })),
  ];
}

export async function GET({ props }: APIContext<{ article: Article | undefined }>) {
  const a = props.article;
  const png = await renderOg(
    a
      ? { title: a.data.title, kicker: a.data.series ? `${a.data.series.name} · Part ${a.data.series.part}` : 'Research', footer: 'Reproducible research on AI inference' }
      : { title: 'Learn how AI really runs. Measure it yourself.', kicker: 'Research & consulting', footer: site.tagline },
  );
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
}
