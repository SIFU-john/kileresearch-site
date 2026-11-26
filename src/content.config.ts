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
            part: z.number().int().positive(),
          })
          .optional(),
        author: z.enum(Object.keys(authors) as [keyof typeof authors, ...(keyof typeof authors)[]]).default('kile-research'),
        /** Set only when the canonical copy lives elsewhere (e.g. a syndicated original). */
        canonical: z.url().optional(),
        /** Path inside the research code repo, e.g. scripts/benchmark.py or a folder. */
        repoPath: z.string().optional(),
        /** Optional cover/social image, relative to the article file. */
        cover: image().optional(),
        coverAlt: z.string().optional(),
        /** Editorial reading estimate in minutes (includes following the steps). Computed if omitted. */
        readingTime: z.number().int().positive().optional(),
        draft: z.boolean().default(false),
      })
      .refine((d) => !d.cover || d.coverAlt, { message: 'coverAlt is required when cover is set', path: ['coverAlt'] })
      .refine((d) => !d.updated || d.updated >= d.date, { message: 'updated must be on or after date', path: ['updated'] }),
});

export const collections = { research };
