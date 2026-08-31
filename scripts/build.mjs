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

// IMPORTANT: every renderer entrypoint is compiled in ONE esbuild graph.
// This allows code splitting to preserve singleton module state for shared
// modules such as tab-system.ts and workspace-router.ts. Building each file
// independently duplicates their module-level Maps, observers, and listeners.
const renderer = {
  bundle: true,
  sourcemap: true,
  platform: 'browser',
  format: 'esm',
  target: 'chrome138',
  splitting: true,
  outdir: 'dist',
  entryNames: '[name]',
  chunkNames: 'chunks/[name]-[hash]',
  entryPoints: {
    renderer: 'src/renderer/index.ts',
    'workspace-router': 'src/renderer/workspace-router.ts',
    'welcome-tab': 'src/renderer/welcome-tab.ts',
    'native-reopen-guard': 'src/renderer/native-reopen-guard.ts',
    'document-sync': 'src/renderer/document-sync.ts',
    'open-path': 'src/renderer/open-path.ts',
    canvas: 'src/renderer/canvas.ts',
    'canvas-markdown': 'src/renderer/canvas-markdown.ts',
    'image-viewer': 'src/renderer/image-viewer.ts',
    bases: 'src/renderer/bases.ts',
    'base-view-dropdown': 'src/renderer/base-view-dropdown.ts',
    'base-prompt-bridge': 'src/renderer/base-prompt-bridge.ts',
    'base-create-note': 'src/renderer/base-create-note.ts'
  }
};

await mkdir('dist', { recursive: true });
await cp('src/renderer/index.html', 'dist/index.html');
await cp('src/renderer/styles.css', 'dist/styles.css');
await cp('src/renderer/canvas.css', 'dist/canvas.css');
await cp('src/renderer/image-viewer.css', 'dist/image-viewer.css');
await cp('src/renderer/bases.css', 'dist/bases.css');

const configs = [main, preload, renderer];

if (watch) {
  const contexts = await Promise.all(configs.map((config) => context(config)));
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  console.log('Ivory build watcher running.');
} else {
  await Promise.all(configs.map((config) => build(config)));
}
