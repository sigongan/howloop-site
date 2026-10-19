import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {renderFruitSymbol} from '../web/scene/fruit-icons.js';

export const lessonIds = ['lemon', 'apple', 'watermelon', 'orange', 'pear'];

// Observation prompts are Howloop activities, not claims about tests with children.
export const lessonActivities = {
  lemon: {
    title: 'Lemon: a little world of layers',
    description: 'Explore a lemon’s peel, white pith, juicy segments and seeds with a simple grown-up-guided observation activity.',
    intro: 'A lemon has more than a yellow outside. Look closely and you can find a pale layer and little sections inside. Use the play model first, then compare it with a real lemon if a grown-up has one.',
    goal: 'Tell the peel, white pith and juicy segments apart.',
    activities: [
      ['Follow the outline', 'Turn the model slowly. Trace its outline in the air. Does it look the same from every side?'],
      ['Find the white layer', 'Ask a grown-up to show a cut lemon. Point to the yellow peel, then the white pith underneath. Which layer surrounds the juicy middle?'],
      ['Count and compare', 'Count the segments you can see. Look for real seeds with a grown-up. Is their number the same as the five seeds in our game?'],
    ],
    notice: 'The white pith is part of the peel; it is different from the juicy segments. Lemons can vary in shape and seed count, so your lemon does not need to match our picture.',
    question: 'If you point to something white inside a lemon, have you necessarily found a seed? Explain what else it could be.',
    sources: [
      ['UF/IFAS: Lemon Growing in the Florida Home Landscape', 'https://ask.ifas.ufl.edu/publication/HS402'],
      ['UF/IFAS: Citrus Fruit Pigments', 'https://ask.ifas.ufl.edu/publication/HS1472'],
    ],
  },
  apple: {
    title: 'Apple: find the centre',
    description: 'Discover apple skin, flesh and the seed-holding core through a short observation activity for children and grown-ups.',
    intro: 'An apple’s thin skin covers a much larger area of flesh. Its seeds are tucked near the centre. Explore the outside before opening the model, then see what changes when you can look inside.',
    goal: 'Find the core and explain how it differs from the flesh.',
    activities: [
      ['Look from both ends', 'Turn the apple to find its stem and the opposite end. Draw an imaginary line between them through the middle.'],
      ['Make a prediction', 'Before opening it, point to where you think the seeds will be. Open the model and compare their position with your prediction.'],
      ['Map a real apple', 'A grown-up can cut a washed apple. On paper, draw its outside edge, flesh and core. Mark any seeds you can see without taking them out.'],
    ],
    notice: 'The core is a region in the middle, not a loose object floating inside. Real apples can have different skin colours and different numbers of seeds.',
    question: 'How would you help someone find an apple seed: look near the skin or look near the centre? What did you notice?',
    sources: [
      ['University of Maryland Extension: Growing Apple and Pear Trees', 'https://extension.umd.edu/resource/growing-apple-and-pear-trees-home-garden'],
      ['University of Minnesota: Flowers to Fruit', 'https://fruit.umn.edu/content/flowers-to-fruit'],
    ],
  },
  watermelon: {
    title: 'Watermelon: a vine on the ground',
    description: 'Learn why watermelons grow on spreading vines, then compare rind, flesh and seeds in a child-friendly observation activity.',
    intro: 'The watermelon in our garden starts on the ground for a reason: its plant has long, spreading vines. Its green outside also looks very different from the juicy flesh you discover when you open it.',
    goal: 'Distinguish a spreading vine from a fruit tree and name the rind.',
    activities: [
      ['Follow the vine', 'In the garden picture, trace a vine with your finger. Find a leaf, a flower and a watermelon along the ground.'],
      ['Compare growing places', 'Switch to the apple tree, then return to watermelon. Where is each fruit growing? Draw a tall tree and a low, spreading vine.'],
      ['Spot the boundary', 'Open the watermelon model. Follow the edge where the rind meets the flesh. With a grown-up, compare that edge with a real slice or food picture.'],
    ],
    notice: 'Watermelon fruit grows on a vine rather than hanging from a tree. Rind surrounds the flesh. Some varieties have many mature seeds; seedless types can have soft, undeveloped seed coats.',
    question: 'If you were drawing a watermelon plant, would you put its fruit high in a tree or beside a vine on the ground? Why?',
    sources: [
      ['Iowa State University: Growing Watermelon in the Home Garden', 'https://yardandgarden.extension.iastate.edu/how-to/growing-watermelon-home-garden'],
      ['University of Maryland Extension: Growing Melons', 'https://extension.umd.edu/resource/growing-melons-home-garden'],
    ],
  },
  orange: {
    title: 'Orange: round outside, sections inside',
    description: 'Compare orange and lemon shapes and discover peel, white pith and juicy segments with three short observation prompts.',
    intro: 'An orange and a lemon are different fruits, but both belong to the citrus group. They give us a useful comparison: look at the whole fruit, then investigate the layers and sections inside.',
    goal: 'Recognise a shared citrus structure while noticing differences.',
    activities: [
      ['Compare two outlines', 'Turn the orange, then the lemon. Draw their outlines next to each other. Which model looks rounder? Check a real fruit if one is available.'],
      ['Build a layer map', 'Ask a grown-up to prepare an orange. Point from outside to inside: coloured peel, white pith, then juicy segments. Draw these as nested shapes.'],
      ['Look for tiny sections', 'Examine one prepared segment with a grown-up. Can you see the smaller juice-filled parts inside it? Compare them with the simpler game picture.'],
    ],
    notice: 'The white pith is not a seed. A segment contains many small juice-filled parts. Real oranges also vary: some have seeds, and some varieties have pink or red flesh.',
    question: 'What is one feature an orange shares with a lemon, and one difference you can describe without tasting either fruit?',
    sources: [
      ['UF/IFAS: Citrus Culture in the Home Landscape', 'https://ask.ifas.ufl.edu/publication/HS132'],
      ['UF/IFAS: Citrus Fruit Pigments', 'https://ask.ifas.ufl.edu/publication/HS1472'],
      ['UF/IFAS: Blood Orange Fruit Structure and Colour', 'https://ask.ifas.ufl.edu/publication/HS1494'],
    ],
  },
  pear: {
    title: 'Pear: different shapes, a familiar core',
    description: 'Explore a pear’s outline, flesh and core, then discover why not every real pear has the same shape as a drawing.',
    intro: 'Our pear character has a narrow top and a wide bottom. That is one familiar pear shape, but it is not a rule for every pear. Some real pears are much rounder. Looking carefully helps us see beyond the drawing.',
    goal: 'Describe shape precisely and find a pear’s seed-holding core.',
    activities: [
      ['Describe, then draw', 'Turn the pear and point to its widest part. Draw its outline. Use words such as narrow, wide, rounded and curved instead of just saying “pear-shaped.”'],
      ['Compare with an apple', 'Open the pear and apple models. Where are their seeds? Which features do they share even though their outside shapes differ?'],
      ['Try another variety', 'With a grown-up, look at a real pear or pictures of two named pear varieties. Compare their shapes and skin colours. Keep both drawings; neither needs to match our character.'],
    ],
    notice: 'Pears have a core containing seeds, like apples. European and Asian pear varieties can look quite different. A round fruit can still be a pear.',
    question: 'Someone says every pear must have a skinny top. What could you look at together to check that idea?',
    sources: [
      ['University of Minnesota Extension: Growing Pears', 'https://extension.umn.edu/fruit/growing-pears'],
      ['University of Maryland Extension: Growing Apple and Pear Trees', 'https://extension.umd.edu/resource/growing-apple-and-pear-trees-home-garden'],
    ],
  },
};

const escape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));

export function renderLesson(content) {
  const id = content.id;
  if (!lessonIds.includes(id)) throw new RangeError(`Unknown lesson: ${id}`);
  const lesson = lessonActivities[id];
  const copy = content.languages.en;
  if (copy.facts.length !== 3 || copy.story.length !== 4) throw new Error(`Incomplete learning content: ${id}`);
  const canonical = `https://howloop.how/learn/${id}/`;
  const facts = copy.facts.map(fact => `<li><strong>${escape(fact.title)}.</strong> ${escape(fact.text)}</li>`).join('\n');
  const story = copy.story.map(step => `<li><strong>${escape(step.title)}.</strong> ${escape(step.text)}</li>`).join('\n');
  const activities = lesson.activities.map(([title, text]) => `<li><h3>${escape(title)}</h3><p>${escape(text)}</p></li>`).join('\n');
  const related = lessonIds.filter(other => other !== id).map(other => `<a class="pill" href="/learn/${other}/">${escape(other[0].toUpperCase() + other.slice(1))}</a>`).join('\n');
  const sources = lesson.sources.map(([title, url]) => `<li><a href="${escape(url)}">${escape(title)}</a></li>`).join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(lesson.title)} — Howloop</title><meta name="description" content="${escape(lesson.description)}"><link rel="canonical" href="${canonical}">
<meta name="theme-color" content="#f9f6e9"><link rel="icon" type="image/x-icon" sizes="32x32 48x48 96x96" href="/favicon.ico"><link rel="icon" type="image/png" sizes="96x96" href="/favicon.png"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="stylesheet" href="/styles.css">
<meta property="og:title" content="${escape(lesson.title)} — Howloop"><meta property="og:description" content="${escape(lesson.description)}"><meta property="og:url" content="${canonical}"><meta property="og:type" content="article"><meta property="og:site_name" content="Howloop"></head>
<body><a class="skip" href="#lesson">Skip to the lesson</a>
<header class="site-header"><a class="brand" href="/" aria-label="Howloop home"><img src="/lemon-logo.svg" width="58" height="58" alt=""><span>howloop<span class="brand-dot">.</span><small>A little food playground</small></span></a><nav aria-label="Site navigation"><a class="adult-link" href="/#learn">Food lessons</a><a class="adult-link" href="/privacy.html">Privacy</a></nav></header>
<main class="lesson-page" id="lesson"><article>
<header class="lesson-hero"><svg viewBox="0 0 50 50" role="img" aria-label="${escape(copy.fruit)} play character">${renderFruitSymbol(id)}</svg><p class="eyebrow">LOOK · WONDER · DISCOVER</p><h1>${escape(lesson.title)}</h1><p class="lesson-meta">English lesson · Ages 5+ with a grown-up · By Howloop</p><p class="lesson-lead">${escape(lesson.intro)}</p><a class="pill lesson-play" href="/?fruit=${id}#playground">Play with ${escape(copy.fruit.toLowerCase())} →</a></header>
<section class="lesson-card"><h2>Our little discovery</h2><p>${escape(lesson.goal)}</p><h3>${escape(copy.factsTitle)}</h3><ul>${facts}</ul><p>${escape(copy.origin)}</p></section>
<section class="lesson-card"><h2>${escape(copy.storyTitle)}</h2><ol>${story}</ol><p>Shaking a tree in the playground is pretend play, not a real harvesting instruction.</p></section>
<section class="lesson-card"><h2>Three ways to look closer</h2><p>You can point, draw or talk. You do not need to taste anything.</p><ol class="lesson-activities">${activities}</ol></section>
<section class="lesson-card"><h2>What to notice</h2><p>${escape(lesson.notice)}</p><h3>Wonder together</h3><p>${escape(lesson.question)}</p></section>
<aside class="lesson-card"><h2>A note for grown-ups</h2><p>Howloop creates original illustrated play models and observation prompts. Each model has five findable seeds for counting; it is not an anatomy diagram. ${escape(copy.modelNote)}</p><p>For real fruit, a grown-up handles washing, cutting and small loose seeds. Watching or drawing is enough. Our lessons are AI-assisted and have not received independent expert review or a child usability study.</p><h3>Learning sources</h3><p>The university sources below support the growing and fruit-structure explanations. The activities are Howloop’s own suggested prompts.</p><ul class="lesson-sources">${sources}</ul><p>Parents and educators can send corrections to <a href="mailto:hello@howloop.how">hello@howloop.how</a>. Please do not include a child’s personal information.</p></aside>
<nav class="lesson-nav" aria-label="More food lessons"><h2>Another little discovery</h2>${related}</nav>
</article></main><footer><a href="/">Back to the playground</a> · <a href="/privacy.html">Privacy</a></footer></body></html>\n`;
}

export async function buildLessonPages({contentDir, outputDir}) {
  const urls = [];
  for (const id of lessonIds) {
    const content = JSON.parse(await readFile(path.join(contentDir, `${id}.json`), 'utf8'));
    if (content.id !== id) throw new Error(`Lesson content identity mismatch: ${id}`);
    const directory = path.join(outputDir, 'learn', id);
    await mkdir(directory, {recursive: true});
    await writeFile(path.join(directory, 'index.html'), renderLesson(content));
    urls.push(`https://howloop.how/learn/${id}/`);
  }
  return urls;
}
