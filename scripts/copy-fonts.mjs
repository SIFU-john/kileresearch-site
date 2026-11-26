// Copies the self-hosted font files (SIL OFL 1.1) from the pinned @fontsource
// packages into public/fonts. Run `npm run fonts` after upgrading those packages.
import { copyFile, mkdir } from 'node:fs/promises';

const files = [
  ['@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2', 'InstrumentSans-Variable.woff2'],
  ['@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-italic.woff2', 'InstrumentSans-Variable-Italic.woff2'],
  ['@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2', 'JetBrainsMono-Regular.woff2'],
  ['@fontsource-variable/instrument-sans/LICENSE', 'OFL-InstrumentSans.txt'],
  ['@fontsource/jetbrains-mono/LICENSE', 'OFL-JetBrainsMono.txt'],
];
await mkdir('public/fonts', { recursive: true });
for (const [from, to] of files) await copyFile(`node_modules/${from}`, `public/fonts/${to}`);
console.log(`copied ${files.length} files to public/fonts`);
