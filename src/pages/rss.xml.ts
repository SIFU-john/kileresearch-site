import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { site } from '../config/site';
import { getArticles, articleUrl } from '../lib/content';

export async function GET(context: APIContext) {
  const articles = await getArticles();
  return rss({
    title: site.name,
    description: site.description,
    site: context.site!,
    items: articles.map((a) => ({
      title: a.data.title,
      description: a.data.description,
      pubDate: a.data.date,
      link: articleUrl(a),
      categories: a.data.tags,
      author: 'Kile Research',
    })),
    customData: `<language>en-gb</language>`,
    trailingSlash: true,
  });
}
