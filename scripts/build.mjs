import { build, context } from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';

const watch = process.argv.includes('--watch');

const nodeShared = {
  bundle: true,
  sourcemap: true,
  platform: 'node',
  target: 'node22',
  external: ['electron']
};

const main = {
  ...nodeShared,
  format: 'esm',
  entryPoints: ['src/main/main.ts'],
  outfile: 'dist/main.js'
};

const preload = {
  ...nodeShared,
  format: 'cjs',
  entryPoints: ['src/preload/preload.ts'],
  outfile: 'dist/preload.cjs'
};

const renderer = {
  bundle: true,
  sourcemap: true,
  platform: 'browser',
  format: 'esm',
  target: 'chrome138',
  entryPoints: ['src/renderer/index.ts'],
  outfile: 'dist/renderer.js'
};

await mkdir('dist', { recursive: true });
await cp('src/renderer/index.html', 'dist/index.html');
await cp('src/renderer/styles.css', 'dist/styles.css');

const configs = [main, preload, renderer];

if (watch) {
  const contexts = await Promise.all(configs.map((config) => context(config)));
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  console.log('Ivory build watcher running.');
} else {
  await Promise.all(configs.map((config) => build(config)));
}
