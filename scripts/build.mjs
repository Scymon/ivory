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

const browserShared = {
  bundle: true,
  sourcemap: true,
  platform: 'browser',
  format: 'esm',
  target: 'chrome138'
};

const main = { ...nodeShared, format: 'esm', entryPoints: ['src/main/main.ts'], outfile: 'dist/main.js' };
const preload = { ...nodeShared, format: 'cjs', entryPoints: ['src/preload/preload.ts'], outfile: 'dist/preload.cjs' };
const renderer = { ...browserShared, entryPoints: ['src/renderer/index.ts'], outfile: 'dist/renderer.js' };
const appMenu = { ...browserShared, entryPoints: ['src/renderer/app-menu.ts'], outfile: 'dist/app-menu.js' };
const workspaceRouter = { ...browserShared, entryPoints: ['src/renderer/workspace-router.ts'], outfile: 'dist/workspace-router.js' };
const openPath = { ...browserShared, entryPoints: ['src/renderer/open-path.ts'], outfile: 'dist/open-path.js' };
const canvas = { ...browserShared, entryPoints: ['src/renderer/canvas.ts'], outfile: 'dist/canvas.js' };
const canvasMarkdown = { ...browserShared, entryPoints: ['src/renderer/canvas-markdown.ts'], outfile: 'dist/canvas-markdown.js' };
const imageViewer = { ...browserShared, entryPoints: ['src/renderer/image-viewer.ts'], outfile: 'dist/image-viewer.js' };
const bases = { ...browserShared, entryPoints: ['src/renderer/bases.ts'], outfile: 'dist/bases.js' };

await mkdir('dist', { recursive: true });
await cp('src/renderer/index.html', 'dist/index.html');
await cp('src/renderer/styles.css', 'dist/styles.css');
await cp('src/renderer/app-menu.css', 'dist/app-menu.css');
await cp('src/renderer/canvas.css', 'dist/canvas.css');
await cp('src/renderer/image-viewer.css', 'dist/image-viewer.css');
await cp('src/renderer/bases.css', 'dist/bases.css');

const configs = [main, preload, renderer, appMenu, workspaceRouter, openPath, canvas, canvasMarkdown, imageViewer, bases];

if (watch) {
  const contexts = await Promise.all(configs.map((config) => context(config)));
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  console.log('Ivory build watcher running.');
} else {
  await Promise.all(configs.map((config) => build(config)));
}
