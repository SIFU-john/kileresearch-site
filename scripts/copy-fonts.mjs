// Copies the self-hosted font files (SIL OFL 1.1) from the pinned @fontsource packages
// into public/fonts, with the package version in each file name. /fonts/* is served with
// an immutable cache header, so a font upgrade must change the URL. Run `npm run fonts`
// after upgrading those packages, then update src/styles/fonts.css to the new names.
import { copyFile, mkdir, readFile, readdir, rm } from 'node:fs/promises';

const pkgs = {
  instrument: '@fontsource-variable/instrument-sans',
  serif: '@fontsource-variable/source-serif-4',
  mono: '@fontsource/jetbrains-mono',
};
const ver = async (pkg) => 'v' + JSON.parse(await readFile(`node_modules/${pkg}/package.json`, 'utf8')).version.replaceAll('.', '-');
const v = Object.fromEntries(await Promise.all(Object.entries(pkgs).map(async ([k, p]) => [k, await ver(p)])));

const files = [
  [`${pkgs.instrument}/files/instrument-sans-latin-wght-normal.woff2`, `InstrumentSans-Variable.${v.instrument}.woff2`],
  [`${pkgs.instrument}/files/instrument-sans-latin-wght-italic.woff2`, `InstrumentSans-Variable-Italic.${v.instrument}.woff2`],
  [`${pkgs.serif}/files/source-serif-4-latin-wght-normal.woff2`, `SourceSerif4-Variable-Roman.${v.serif}.woff2`],
  [`${pkgs.serif}/files/source-serif-4-latin-wght-italic.woff2`, `SourceSerif4-Variable-Italic.${v.serif}.woff2`],
  [`${pkgs.mono}/files/jetbrains-mono-latin-400-normal.woff2`, `JetBrainsMono-Regular.${v.mono}.woff2`],
  [`${pkgs.instrument}/LICENSE`, 'OFL-InstrumentSans.txt'],
  [`${pkgs.serif}/LICENSE`, 'OFL-SourceSerif4.txt'],
  [`${pkgs.mono}/LICENSE`, 'OFL-JetBrainsMono.txt'],
];
await mkdir('public/fonts', { recursive: true });
for (const f of await readdir('public/fonts')) await rm(`public/fonts/${f}`);
for (const [from, to] of files) await copyFile(`node_modules/${from}`, `public/fonts/${to}`);
console.log(`copied ${files.length} files to public/fonts:\n  ${files.map((f) => f[1]).join('\n  ')}`);
