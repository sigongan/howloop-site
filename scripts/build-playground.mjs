// Builds the archived children's fruit playground for local use only.
// It is NOT deployed: howloop.how serves the article site built by scripts/build.mjs.
// Usage: npm run build:playground && npm run dev:playground
import {cp, mkdir, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {buildLessonPages} from '../playground/lessons.mjs';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'dist-playground');
await rm(out, {recursive: true, force: true});
await mkdir(out, {recursive: true});
await cp(path.join(root, 'playground'), out, {recursive: true});
await rm(path.join(out, 'lessons.mjs'), {force: true});
await cp(path.join(root, 'shared'), path.join(out, 'content'), {recursive: true});
await buildLessonPages({contentDir: path.join(root, 'shared'), outputDir: out});
await writeFile(path.join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
console.log('Built the archived fruit playground into dist-playground/ (local preview only).');
