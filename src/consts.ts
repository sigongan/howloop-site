/**
 * Single source of truth for brand + site config.
 * Change the brand here and it propagates everywhere.
 */

export const SITE = {
  name: 'Howloop',
  wordmark: 'howloop',
  tagline: 'How-to, on loop.',
  description:
    'Short looping animations that show you exactly how to fix everyday problems — around the house and on your devices. Watch the loop, then do it.',
  url: 'https://howloop.how',
  domain: 'howloop.how',
  locale: 'en',
  email: 'hello@howloop.how',
  author: 'The Howloop team',
  // Paste your AdSense publisher ID here (e.g. 'ca-pub-1234567890123456').
  // Leave empty until AdSense is approved — no script is injected while it is empty.
  adsensePublisherId: '',
};

export type TopicId = 'home' | 'devices';

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
};

export const NAV = [
  { href: '/guides', label: 'All guides' },
  { href: '/topics/home', label: 'Around the house' },
  { href: '/topics/devices', label: 'Phones & Wi-Fi' },
  { href: '/about', label: 'About' },
];

export const FOOTER_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/editorial-policy', label: 'Editorial policy' },
  { href: '/privacy', label: 'Privacy policy' },
  { href: '/terms', label: 'Terms of use' },
];
