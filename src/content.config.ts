import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { authors } from './config/authors';

const research = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/research' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().min(1).max(120),
        description: z.string().min(50).max(200),
        date: z.coerce.date(),
        updated: z.coerce.date().optional(),
        tags: z.array(z.string().regex(/^[a-z0-9-]+$/, 'tags are lowercase-with-hyphens')).min(1).max(6),
        series: z
          .object({
            name: z.string(),
            week: z.number().int().positive().optional(),
            /** Part number within the series ("seriesPart" in the design spec). */
            part: z.number().int().positive(),
          })
          .optional(),
        author: z.enum(Object.keys(authors) as [keyof typeof authors, ...(keyof typeof authors)[]]).default('kile-research'),
        /** Leave unset: our site is the original. Set only if an article was first published elsewhere. */
        canonical: z.url().optional(),
        /** Path inside the research code repo, e.g. scripts/benchmark.py or a folder. */
        repoPath: z.string().optional(),
        /** Optional cover/social image, relative to the article file. */
        cover: image().optional(),
        coverAlt: z.string().optional(),
        /** Reader level, shown as text in the meta row and on cards. */
        level: z.enum(['beginner', 'intermediate']).optional(),
        /** "Tested with" list for the Reproduce card. Only real values from the author; never examples. */
        tested: z.array(z.object({ label: z.string().min(1), value: z.string().min(1) })).optional(),
        /** Optional custom social image (1200x630, relative to the article). Default: generated /og/{slug}.png. */
        ogImage: image().optional(),
        /** URL of the syndicated copy on Medium. Shows a plain "Also on Medium" link. Canonical stays ours. */
        mediumUrl: z.url().refine((u) => /^https:\/\/([a-z0-9-]+\.)?medium\.com\//.test(u), 'mediumUrl must be an https://medium.com/ URL').optional(),
        /** Editorial reading estimate in minutes (includes following the steps). Computed if omitted. */
        readingTime: z.number().int().positive().optional(),
        draft: z.boolean().default(false),
      })
      .refine((d) => !d.cover || d.coverAlt, { message: 'coverAlt is required when cover is set', path: ['coverAlt'] })
      .refine((d) => !d.updated || d.updated >= d.date, { message: 'updated must be on or after date', path: ['updated'] }),
});

export const collections = { research };
