import rss from '@astrojs/rss';
import guides from '../data/learning.json';
import { SITE } from '../consts';

export async function GET(context) {
  return rss({
    title: `${SITE.name} - Australian money guides`,
    description: 'Plain-English Australian money guides, with worked examples, calculation assumptions and official sources.',
    site: context.site,
    items: guides.map((guide) => ({
      title: guide.title,
      description: guide.summary,
      pubDate: new Date(guide.datePublished ?? '2026-09-18T00:00:00+10:00'),
      link: `/learn/${guide.slug}/`,
    })),
    trailingSlash: true,
    customData: `<language>en-au</language>`,
  });
}
