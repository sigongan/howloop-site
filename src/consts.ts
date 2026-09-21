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
  // Public account ID verified in the owner's AdSense dashboard.
  // Used for ownership metadata and ads.txt; this does not load advertising scripts.
  adsensePublisherId: import.meta.env.PUBLIC_ADSENSE_PUBLISHER_ID || 'ca-pub-9777958537717885',
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
  { id: 'savings', href: '/calculators/compound-interest/', label: 'Savings', icon: 'growth', hint: 'Grow your savings', matches: ['/calculators/compound-interest', '/calculators/savings-goal', '/calculators/emergency-fund', '/banks', '/compare/savings'] },
  { id: 'pay', href: '/calculators/salary/', label: 'Take-home pay', icon: 'wallet', hint: 'See pay after tax', matches: ['/calculators/salary'] },
  { id: 'home', href: '/calculators/mortgage/', label: 'Home loans', icon: 'home', hint: 'Plan your repayments', matches: ['/calculators/mortgage', '/calculators/lvr'] },
  { id: 'tax', href: '/tax-return/', label: 'Tax returns', icon: 'checklist', hint: 'Prepare your tax checklist', matches: ['/tax-return'] },
  { id: 'learn', href: '/learn/', label: 'Learn', icon: 'book', hint: 'Understand your money', matches: ['/learn', '/updates'] },
];

export const FOOTER_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/editorial-policy', label: 'Editorial policy' },
  { href: '/privacy', label: 'Privacy policy' },
  { href: '/terms', label: 'Terms of use' },
];
