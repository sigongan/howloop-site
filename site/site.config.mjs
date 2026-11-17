// Site-wide settings for howloop.how.
export const site = {
  name: 'Howloop',
  url: 'https://howloop.how',
  tagline: 'Kitchen science, explained by a working chef',
  description: 'Howloop explains the science behind everyday cooking — eggs, meat, vegetables, browning, sauces and seasoning — in plain English, from a professional chef’s point of view.',
  author: {
    name: 'Jess Baek',
    role: 'Chef',
    url: '/about/',
  },
  email: 'hello@howloop.how',
  youtube: 'https://www.youtube.com/@TheNerdBites',
  adsensePublisher: 'ca-pub-9777958537717885',
  locale: 'en-AU',
};

// Each topic needs real introductory text and at least three articles (checked at build time).
export const categories = [
  {
    id: 'eggs',
    name: 'Eggs',
    title: 'Egg science',
    intro: [
      'An egg is a small, self-contained lesson in protein chemistry. The white and the yolk are made of different proteins that set at different temperatures, which is why a few degrees separate a runny yolk from a chalky one.',
      'These guides explain what happens inside an egg as it heats, why some eggs peel cleanly and others tear, where the grey-green ring comes from, and how to keep a custard silky instead of scrambled.',
    ],
  },
  {
    id: 'meat',
    name: 'Meat',
    title: 'Meat science',
    intro: [
      'Most of what makes meat juicy or dry, tender or tough comes down to two things: how muscle proteins squeeze out water as they heat, and how the connective tissue around them behaves over time.',
      'Here we test the rules every cook has heard — rest your steak, sear to seal in juices, brine your chicken — against what the evidence actually shows, and explain what to do instead.',
    ],
  },
  {
    id: 'fruit-and-veg',
    name: 'Fruit & Veg',
    title: 'Fruit and vegetable science',
    intro: [
      'Plants are full of enzymes, pigments and acids that stay neatly separated until a knife or a pot gets involved. Cutting, chilling and cooking set off reactions that change colour, flavour and texture.',
      'These articles cover why cut apples brown, why onions sting, why green vegetables turn grey and how to store potatoes — with practical fixes that work in a home kitchen as well as a restaurant one.',
    ],
  },
  {
    id: 'heat',
    name: 'Heat & Browning',
    title: 'Heat, browning and texture',
    intro: [
      'Heat does more than make food hot. It drives the browning reactions behind toast, crusts and roasted coffee, turns a hard kernel into popcorn, and keeps cooking food after it leaves the pan.',
      'Learn how the Maillard reaction differs from caramelisation, why bread goes stale faster in the fridge, and how to plan for carryover cooking so meat lands exactly where you want it.',
    ],
  },
  {
    id: 'sauces-and-seasoning',
    name: 'Sauces & Seasoning',
    title: 'Sauces, salt and seasoning',
    intro: [
      'Good seasoning and a stable sauce are where professional cooking often feels most different from home cooking. Both rest on simple chemistry: how salt dissolves and diffuses, and how fat and water can be persuaded to mix.',
      'Find out why sauces split and how to rescue them, how much salt pasta water really needs, whether pink salt is worth the price, and what the evidence says about MSG.',
    ],
  },
];
