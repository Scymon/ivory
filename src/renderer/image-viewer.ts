const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i;
const NATIVE_EXPLORER_TYPES = /\.(md|canvas|png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i;

const workspaceBody = document.querySelector<HTMLElement>('.workspace-body');
const tabBar = document.querySelector<HTMLElement>('#tab-bar');
const fileTree = document.querySelector<HTMLElement>('#file-tree');
const editorHost = document.querySelector<HTMLElement>('#editor-host');
const readingHost = document.querySelector<HTMLElement>('#reading-host');
const welcome = document.querySelector<HTMLElement>('#welcome');
const statusLeft = document.querySelector<HTMLElement>('#status-left');
const statusRight = document.querySelector<HTMLElement>('#status-right');

if (!workspaceBody || !tabBar || !fileTree || !editorHost || !readingHost || !welcome || !statusLeft || !statusRight) {
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
let imageTab: HTMLButtonElement | null = null;
let zoom = 1;
let panX = 0;
let panY = 0;
let fitZoom = 1;

const leafName = (path: string) => path.split('/').pop() ?? path;

function promoteNativeFiles(): void {
  fileTree.querySelectorAll<HTMLButtonElement>('.tree-file.unsupported').forEach((button) => {
    const name = button.textContent?.trim() ?? '';
    if (NATIVE_EXPLORER_TYPES.test(name)) button.classList.remove('unsupported');
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
      else if (entry.name === name && IMAGE_EXTENSIONS.test(entry.path)) matches.push(entry.path);
    }
  };
  walk(snapshot.entries);
  return matches[0] ?? null;
}

function hideOtherViews(): void {
  editorHost.classList.add('hidden');
  readingHost.classList.add('hidden');
  welcome.classList.add('hidden');
  document.querySelector<HTMLElement>('.canvas-host')?.classList.add('hidden');
}

function showImageViewer(): void {
  hideOtherViews();
  host.classList.remove('hidden');
  imageTab?.classList.add('active');
  statusRight.textContent = 'Image';
}

function hideImageViewer(): void {
  host.classList.add('hidden');
  imageTab?.classList.remove('active');
}

function ensureTab(path: string): void {
  imageTab?.remove();
  imageTab = document.createElement('button');
  imageTab.className = 'tab active image-viewer-tab';
  imageTab.title = path;
  const label = document.createElement('span');
  label.textContent = leafName(path);
  const close = document.createElement('span');
  close.className = 'tab-close';
  close.textContent = '×';
  close.addEventListener('click', (event) => {
    event.stopPropagation();
    hideImageViewer();
    imageTab?.remove();
    imageTab = null;
    imagePath = null;
  });
  imageTab.append(label, close);
  imageTab.addEventListener('click', showImageViewer);
  tabBar.append(imageTab);
}

function applyTransform(): void {
  image.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
}

function fitImage(): void {
  if (!image.naturalWidth || !image.naturalHeight) return;
  const rect = stage.getBoundingClientRect();
  fitZoom = Math.min(1, Math.min((rect.width - 48) / image.naturalWidth, (rect.height - 48) / image.naturalHeight));
  zoom = fitZoom;
  panX = 0;
  panY = 0;
  applyTransform();
}

async function openImage(path: string): Promise<void> {
  imagePath = path;
  ensureTab(path);
  showImageViewer();
  image.alt = leafName(path);
  image.src = await window.ivory.getAssetUrl(path);
  image.onload = fitImage;
  statusLeft.textContent = path;
}

fileTree.addEventListener('click', async (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.tree-file');
  if (!button) return;
  const name = button.textContent?.trim() ?? '';
  if (!IMAGE_EXTENSIONS.test(name)) return;
  event.preventDefault();
  event.stopPropagation();
  const path = await resolveImagePathByName(name);
  if (path) await openImage(path);
}, true);

tabBar.addEventListener('click', (event) => {
  const tab = (event.target as HTMLElement).closest('.tab');
  if (tab && !tab.classList.contains('image-viewer-tab')) hideImageViewer();
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
