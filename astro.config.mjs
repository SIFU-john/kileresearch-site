// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import rehypeArticle from './src/lib/rehype-article.mjs';

// SITE_URL is a placeholder until the Board picks a domain. Canonical URLs, RSS,
// sitemap and OpenGraph tags all derive from it.
const site = process.env.SITE_URL ?? 'https://kile-research.example';

export default defineConfig({
  site,
  trailingSlash: 'always',
  integrations: [mdx(), sitemap({ filter: (page) => !page.includes('/404') })],
  markdown: {
    // Prism emits class names only. Shiki emits inline style="" attributes, which a
    // strict CSP (style-src 'self', no 'unsafe-inline') would block.
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
