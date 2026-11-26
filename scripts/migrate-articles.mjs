// One-off migration: converts the Medium-era sources in SIFU-john/KileResearch
// into content-collection entries with typed frontmatter.
// Usage: node scripts/migrate-articles.mjs <path-to-KileResearch-checkout>
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const src = process.argv[2];
if (!src) throw new Error('Pass the path to a KileResearch checkout');

// Facts that are not in the source files. Publication dates are inferred from the
// hub README cadence (Mon/Tue/Thu/Fri, Week 2 starts Mon 9 Nov 2026). Confirm before launch.
const meta = {
  '01-run-your-first-llm-locally': {
    date: '2026-11-02',
    description: 'Download a small open model, chat with it in the terminal and call it from Python. No GPU, no cloud account, no cost.',
    tags: ['inference', 'ollama', 'local-llm', 'python'],
    repoPath: 'scripts/hello_llm.py',
  },
  '02-tokens-explained': {
    date: '2026-11-03',
    description: 'Models read tokens, not words. Count them yourself, see why they drive cost and speed, and find your model’s context window.',
    tags: ['inference', 'tokens', 'context-window', 'python'],
    repoPath: 'scripts/count_tokens.py',
  },
  '03-measure-inference-speed': {
    date: '2026-11-05',
    description: 'Benchmark time to first token, tokens per second and cold starts with a short standard-library Python script.',
    tags: ['inference', 'benchmarking', 'performance', 'python'],
    repoPath: 'scripts/benchmark.py',
  },
  '04-quantization-explained': {
    date: '2026-11-06',
    description: 'Run the same model at three precision levels, measure size, speed and quality, and pick a quantization level with data.',
    tags: ['inference', 'quantization', 'performance', 'benchmarking'],
    repoPath: 'scripts/benchmark.py',
  },
};

const files = (await readdir(path.join(src, 'articles'))).filter((f) => f.endsWith('.md'));
for (const file of files) {
  const slug = file.replace(/\.md$/, '');
  const m = meta[slug];
  if (!m) throw new Error(`No metadata for ${slug}`);
  const lines = (await readFile(path.join(src, 'articles', file), 'utf8')).split('\n');

  const title = lines[0].replace(/^#\s+/, '').trim();
  const byline = lines.find((l) => l.startsWith('*Kile Research ·')) ?? '';
  const week = Number(/Week (\d+)/.exec(byline)?.[1]);
  const part = Number(/Part (\d+)/.exec(byline)?.[1]);
  const minutes = Number(/~(\d+) min read/.exec(byline)?.[1]);

  // Drop the H1, byline and the first horizontal rule: the layout renders those.
  let i = 1;
  while (i < lines.length && (lines[i].trim() === '' || lines[i] === byline || lines[i].trim() === '---')) i++;
  const body = lines.slice(i).join('\n').trimEnd() + '\n';

  const fm = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify(m.description)}`,
    `date: ${m.date}`,
    `tags: [${m.tags.join(', ')}]`,
    'series:',
    `  name: "Beginner's Guide to Inference"`,
    `  week: ${week}`,
    `  part: ${part}`,
    'author: kile-research',
    `repoPath: ${m.repoPath}`,
    ...(minutes ? [`readingTime: ${minutes}`] : []),
    'draft: false',
    '---',
    '',
  ].join('\n');
  await writeFile(path.join('src/content/research', file), fm + body);
  console.log(`migrated ${slug}`);
}
