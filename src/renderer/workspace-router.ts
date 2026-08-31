import { getFileType } from './file-types.js';

const fileTree = document.querySelector<HTMLElement>('#file-tree');
const tabBar = document.querySelector<HTMLElement>('#tab-bar');
const editorHost = document.querySelector<HTMLElement>('#editor-host');
const readingHost = document.querySelector<HTMLElement>('#reading-host');
const welcome = document.querySelector<HTMLElement>('#welcome');

if (!fileTree || !tabBar || !editorHost || !readingHost || !welcome) {
  throw new Error('Workspace router could not find the Ivory workspace.');
}

function canvasHost(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.canvas-host');
}

function imageHost(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.image-viewer-host');
}

function deactivateCanvas(): void {
  canvasHost()?.classList.add('hidden');
  document.querySelector<HTMLElement>('.canvas-tab')?.classList.remove('active');
}

function deactivateImage(): void {
  imageHost()?.classList.add('hidden');
  document.querySelector<HTMLElement>('.image-viewer-tab')?.classList.remove('active');
}

function prepareMarkdown(): void {
  deactivateCanvas();
  deactivateImage();
}

function prepareCanvas(): void {
  deactivateImage();
  editorHost.classList.add('hidden');
  readingHost.classList.add('hidden');
  welcome.classList.add('hidden');
}

function prepareImage(): void {
  deactivateCanvas();
  editorHost.classList.add('hidden');
  readingHost.classList.add('hidden');
  welcome.classList.add('hidden');
}

fileTree.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.tree-file');
  if (!button) return;
  const path = button.dataset.path || button.textContent?.trim() || '';
  const type = getFileType(path);
  if (type?.kind === 'markdown') prepareMarkdown();
  else if (type?.kind === 'canvas') prepareCanvas();
  else if (type?.kind === 'image') prepareImage();
}, true);

tabBar.addEventListener('click', (event) => {
  const tab = (event.target as HTMLElement).closest<HTMLElement>('.tab');
  if (!tab) return;
  if (tab.classList.contains('canvas-tab')) {
    prepareCanvas();
    return;
  }
  if (tab.classList.contains('image-viewer-tab')) {
    prepareImage();
    return;
  }
  if (!tab.classList.contains('welcome-tab')) prepareMarkdown();
}, true);

window.addEventListener('ivory:show-markdown', prepareMarkdown);
window.addEventListener('ivory:show-canvas', prepareCanvas);
window.addEventListener('ivory:show-image', prepareImage);
