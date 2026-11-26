// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import rehypeArticle from './src/lib/rehype-article.mjs';

// Make .env values visible to config/integrations.mjs (read via process.env, shared with the
// Node scripts). Real environment variables win over .env.
for (const [k, v] of Object.entries(loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), ''))) process.env[k] ??= v;

// The canonical origin: the single source for canonical, Open Graph, RSS, sitemap and JSON-LD URLs.
// The apex is canonical; www redirects to it at the Cloudflare edge (docs/cloudflare-pages.md).
const site = process.env.SITE_URL || 'https://kileresearch.ai';

export default defineConfig({
  site,
  trailingSlash: 'always',
  integrations: [
    mdx(),
    sitemap({ filter: (page) => !/\/(404|contact\/(thanks|unavailable|error))\/?$/.test(page) }),
  ],
  markdown: {
    // Prism emits class names only. Shiki (including its css-variables theme) emits inline
    // style="" attributes, which the strict CSP (style-src 'self', no 'unsafe-inline') blocks.
    syntaxHighlight: 'prism',
    processor: unified({ rehypePlugins: [rehypeArticle] }),
  },
  build: {
    // Never inline CSS or JS into HTML, so the CSP needs no 'unsafe-inline' or hashes.
    inlineStylesheets: 'never',
    format: 'directory',
  },
  vite: {
    build: { assetsInlineLimit: 0 },
  },
  devToolbar: { enabled: false },
});
