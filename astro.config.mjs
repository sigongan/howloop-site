// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import {normaliseBuiltLinks} from './scripts/canonical-links.mjs';

export default defineConfig({
  site: 'https://howloop.how',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  vite: {
    plugins: [{
      name: 'howloop-static-preview',
      configResolved(config) {
        // Static, vanilla-JS pages do not need dependency prebundling.
        config.optimizeDeps.include = [];
        config.optimizeDeps.noDiscovery = true;
      },
    }],
  },
  integrations: [
    mdx(),
    sitemap({
      // The original household guides remain available as an explicit archive.
      // Search discovery now focuses on maintained financial tools and guides.
      filter: (page) => !/^\/(?:404(?:\.html)?|guides|topics|desk|trade)(?:\/|$)/.test(new URL(page).pathname),
      serialize: (item) => ({
        ...item,
        url: new URL(item.url).pathname === '/' ? item.url : item.url.replace(/\/?$/, '/'),
      }),
    }),
    { name: 'howloop-canonical-links', hooks: { 'astro:build:done': normaliseBuiltLinks } },
  ],
  build: {
    inlineStylesheets: 'auto',
  },
});
