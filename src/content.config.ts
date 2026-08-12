import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const guides = defineCollection({
  loader: glob({ base: './src/content/guides', pattern: '**/*.mdx' }),
  schema: z.object({
    title: z.string(),
    // Short, punchy version used on cards.
    cardTitle: z.string().optional(),
    description: z.string(),
    topic: z.enum(['home', 'devices', 'paperwork']),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    // Practical metadata shown in the guide header.
    timeNeeded: z.string(),
    difficulty: z.enum(['Easy', 'Moderate', 'Involved']),
    cost: z.string(),
    tools: z.array(z.string()).default([]),
    // Ordered list of what the animation shows. Doubles as the
    // reduced-motion fallback and as HowTo structured data.
    steps: z.array(
      z.object({
        title: z.string(),
        text: z.string(),
      })
    ),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    // Strips the page back to the interactive walkthrough alone: no spec
    // chips, no sidebar, no written-steps list, no FAQ block. For guides
    // where the interaction *is* the guide and prose would only get in
    // the way.
    bare: z.boolean().default(false),
  }),
});

export const collections = { guides };
