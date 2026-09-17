/**
 * Single source of truth for brand + site config.
 * Change the brand here and it propagates everywhere.
 */

export const SITE = {
  name: 'Howloop',
  wordmark: 'howloop',
  tagline: 'Clear numbers. Better money moves.',
  description:
    'Free Australian financial calculators and plain-English money guides for saving, planning and buying a home.',
  url: 'https://howloop.how',
  domain: 'howloop.how',
  locale: 'en-AU',
  email: 'hello@howloop.how',
  author: 'Howloop',
  // Paste your AdSense publisher ID here (e.g. 'ca-pub-1234567890123456').
  // Leave empty until AdSense is approved — no script is injected while it is empty.
  adsensePublisherId: import.meta.env.PUBLIC_ADSENSE_PUBLISHER_ID ?? '',
};

export type TopicId = 'home' | 'devices' | 'paperwork';

export const TOPICS: Record<
  TopicId,
  { id: TopicId; label: string; blurb: string }
> = {
  home: {
    id: 'home',
    label: 'Around the house',
    blurb:
      'Drains, toilets, walls, stuck things. The repeat offenders that cost you a call-out fee if you let them win.',
  },
  devices: {
    id: 'devices',
    label: 'Phones & Wi-Fi',
    blurb:
      'Slow connections, full storage, dying batteries. The digital chores that come back every few months.',
  },
  paperwork: {
    id: 'paperwork',
    label: 'Paperwork',
    blurb:
      'Government forms, ID numbers, registrations. The admin that only ever gets done once you know which box applies to you.',
  },
};

export const NAV = [
  { href: '/start', label: 'Start here' },
  { href: '/calculators', label: 'Calculators' },
  { href: '/learn', label: 'Money guides' },
  { href: '/banks', label: 'Bank explorer' },
];

export const FOOTER_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/editorial-policy', label: 'Editorial policy' },
  { href: '/privacy', label: 'Privacy policy' },
  { href: '/terms', label: 'Terms of use' },
];
