import { getCollection, type CollectionEntry } from 'astro:content';

export type Article = CollectionEntry<'research'>;

/** Drafts are visible in `npm run dev` and when SHOW_DRAFTS=1, never in a normal build. */
const showDrafts = import.meta.env.DEV || process.env['SHOW_DRAFTS'] === '1';

export async function getArticles(): Promise<Article[]> {
  const all = await getCollection('research', ({ data }) => showDrafts || !data.draft);
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || (b.data.series?.part ?? 0) - (a.data.series?.part ?? 0));
}

export const articleUrl = (a: Article) => `/research/${a.id}/`;
export const tagUrl = (tag: string) => `/research/tags/${tag}/`;
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
export const seriesUrl = (name: string) => `/research/series/${slugify(name)}/`;
export const tagLabel = (tag: string) => tag.replace(/-/g, ' ');

export function readingMinutes(article: Article) {
  if (article.data.readingTime) return article.data.readingTime;
  const body = article.body ?? '';
  const words = body
    .replace(/```[\s\S]*?```/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

/** Related = same series first (neighbouring parts), then shared tags, newest first. */
export function relatedArticles(current: Article, all: Article[], limit = 3): Article[] {
  const tags = new Set(current.data.tags);
  return all
    .filter((a) => a.id !== current.id)
    .map((a) => {
      const sameSeries = a.data.series && a.data.series.name === current.data.series?.name;
      const shared = a.data.tags.filter((t) => tags.has(t)).length;
      return { a, score: (sameSeries ? 10 : 0) + shared };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score || y.a.data.date.getTime() - x.a.data.date.getTime())
    .slice(0, limit)
    .map((x) => x.a);
}

export const formatDate = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
