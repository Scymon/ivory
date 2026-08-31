import './workspace-router.js';
import { isImageFile, isNativeExplorerFile } from './file-types.js';
import { activateIvoryTab, registerIvoryTab } from './tab-system.js';

const workspaceBody = document.querySelector<HTMLElement>('.workspace-body');
const fileTree = document.querySelector<HTMLElement>('#file-tree');
const statusLeft = document.querySelector<HTMLElement>('#status-left');
const statusRight = document.querySelector<HTMLElement>('#status-right');

if (!workspaceBody || !fileTree || !statusLeft || !statusRight) {
  throw new Error('Image viewer bootstrap could not find the Ivory workspace.');
}

const host = document.createElement('section');
host.className = 'image-viewer-host hidden';
host.innerHTML = `
  <div class="image-viewer-toolbar">
    <button type="button" data-image-action="zoom-out" title="Zoom out">−</button>
    <span class="image-viewer-zoom">100%</span>
    <button type="button" data-image-action="zoom-in" title="Zoom in">＋</button>
    <button type="button" data-image-action="fit" title="Fit image">Fit</button>
    <button type="button" data-image-action="actual" title="Actual size">100%</button>
  </div>
  <div class="image-viewer-stage" tabindex="0">
    <img class="image-viewer-image" alt="" draggable="false" />
  </div>
`;
workspaceBody.append(host);

const stage = host.querySelector<HTMLElement>('.image-viewer-stage')!;
const image = host.querySelector<HTMLImageElement>('.image-viewer-image')!;
const zoomLabel = host.querySelector<HTMLElement>('.image-viewer-zoom')!;

let imagePath: string | null = null;
let zoom = 1;
let panX = 0;
let panY = 0;

const leafName = (path: string) => path.split('/').pop() ?? path;

function promoteNativeFiles(): void {
  fileTree.querySelectorAll<HTMLButtonElement>('.tree-file.unsupported').forEach((button) => {
    const path = button.dataset.path ?? button.textContent?.trim() ?? '';
    if (isNativeExplorerFile(path)) button.classList.remove('unsupported');
  });
}

const treeObserver = new MutationObserver(promoteNativeFiles);
treeObserver.observe(fileTree, { childList: true, subtree: true });
promoteNativeFiles();

async function resolveImagePathByName(name: string): Promise<string | null> {
  const snapshot = await window.ivory.getVaultSnapshot();
  if (!snapshot) return null;
  const matches: string[] = [];
  const walk = (entries: typeof snapshot.entries) => {
    for (const entry of entries) {
      if (entry.kind === 'folder') walk(entry.children ?? []);
      else if (entry.name === name && isImageFile(entry.path)) matches.push(entry.path);
    }
  };
  walk(snapshot.entries);
  return matches[0] ?? null;
}

function applyTransform(): void {
  image.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
}

function fitImage(): void {
  if (!image.naturalWidth || !image.naturalHeight) return;
  const rect = stage.getBoundingClientRect();
  zoom = Math.min(1, Math.min((rect.width - 48) / image.naturalWidth, (rect.height - 48) / image.naturalHeight));
  panX = 0;
  panY = 0;
  applyTransform();
}

async function showImage(path: string): Promise<void> {
  imagePath = path;
  window.dispatchEvent(new Event('ivory:show-image'));
  host.classList.remove('hidden');
  statusRight.textContent = 'Image';
  statusLeft.textContent = path;
  image.alt = leafName(path);
  const url = await window.ivory.getAssetUrl(path);
  if (image.src !== url) {
    image.onload = fitImage;
    image.src = url;
  } else {
    applyTransform();
  }
}

async function openImage(path: string): Promise<void> {
  registerIvoryTab({
    path,
    label: leafName(path),
    kind: 'image',
    activate: () => showImage(path),
    close: () => {
      if (imagePath === path) {
        imagePath = null;
        host.classList.add('hidden');
        image.removeAttribute('src');
      }
    }
  });
  await activateIvoryTab(path);
}

fileTree.addEventListener('click', async (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.tree-file');
  if (!button) return;
  const candidate = button.dataset.path ?? button.textContent?.trim() ?? '';
  if (!isImageFile(candidate)) return;
  event.preventDefault();
  event.stopPropagation();
  const path = button.dataset.path || await resolveImagePathByName(candidate);
  if (path) await openImage(path);
}, true);

let pan: { startX: number; startY: number; panX: number; panY: number } | null = null;
stage.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  stage.setPointerCapture(event.pointerId);
  pan = { startX: event.clientX, startY: event.clientY, panX, panY };
  stage.classList.add('panning');
});
stage.addEventListener('pointermove', (event) => {
  if (!pan) return;
  panX = pan.panX + event.clientX - pan.startX;
  panY = pan.panY + event.clientY - pan.startY;
  applyTransform();
});
stage.addEventListener('pointerup', () => { pan = null; stage.classList.remove('panning'); });
stage.addEventListener('pointercancel', () => { pan = null; stage.classList.remove('panning'); });
stage.addEventListener('wheel', (event) => {
  event.preventDefault();
  zoom = Math.min(8, Math.max(.05, zoom * (event.deltaY < 0 ? 1.12 : .89)));
  applyTransform();
}, { passive: false });

host.querySelector('[data-image-action="zoom-in"]')?.addEventListener('click', () => { zoom = Math.min(8, zoom * 1.2); applyTransform(); });
host.querySelector('[data-image-action="zoom-out"]')?.addEventListener('click', () => { zoom = Math.max(.05, zoom / 1.2); applyTransform(); });
host.querySelector('[data-image-action="fit"]')?.addEventListener('click', fitImage);
host.querySelector('[data-image-action="actual"]')?.addEventListener('click', () => { zoom = 1; panX = 0; panY = 0; applyTransform(); });
