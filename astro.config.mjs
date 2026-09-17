// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://howloop.how',
  trailingSlash: 'ignore',
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
      filter: (page) => !page.includes('/404'),
    }),
  ],
  build: {
    inlineStylesheets: 'auto',
  },
});
