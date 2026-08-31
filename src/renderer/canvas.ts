interface CanvasNodeBase {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

interface TextCanvasNode extends CanvasNodeBase { type: 'text'; text: string; }
interface FileCanvasNode extends CanvasNodeBase { type: 'file'; file: string; subpath?: string; }
interface LinkCanvasNode extends CanvasNodeBase { type: 'link'; url: string; }
interface GroupCanvasNode extends CanvasNodeBase { type: 'group'; label?: string; }
type CanvasNode = TextCanvasNode | FileCanvasNode | LinkCanvasNode | GroupCanvasNode;

interface CanvasEdge {
  id: string;
  fromNode: string;
  fromSide?: 'top' | 'right' | 'bottom' | 'left';
  fromEnd?: 'none' | 'arrow';
  toNode: string;
  toSide?: 'top' | 'right' | 'bottom' | 'left';
  toEnd?: 'none' | 'arrow';
  color?: string;
  label?: string;
}

interface CanvasDocument { nodes: CanvasNode[]; edges: CanvasEdge[]; }

const workspaceBody = document.querySelector<HTMLElement>('.workspace-body');
const tabBar = document.querySelector<HTMLElement>('#tab-bar');
const statusLeft = document.querySelector<HTMLElement>('#status-left');
const statusRight = document.querySelector<HTMLElement>('#status-right');
const editorHost = document.querySelector<HTMLElement>('#editor-host');
const readingHost = document.querySelector<HTMLElement>('#reading-host');
const welcome = document.querySelector<HTMLElement>('#welcome');
const fileTree = document.querySelector<HTMLElement>('#file-tree');

if (!workspaceBody || !tabBar || !statusLeft || !statusRight || !editorHost || !readingHost || !welcome || !fileTree) {
  throw new Error('Canvas bootstrap could not find the Ivory workspace.');
}

const host = document.createElement('section');
host.className = 'canvas-host hidden';
host.innerHTML = `
  <div class="canvas-toolbar">
    <button type="button" data-canvas-action="zoom-out" title="Zoom out">−</button>
    <span class="canvas-zoom">100%</span>
    <button type="button" data-canvas-action="zoom-in" title="Zoom in">＋</button>
    <button type="button" data-canvas-action="fit" title="Fit content">Fit</button>
  </div>
  <div class="canvas-empty hidden">
    <strong>Empty canvas</strong>
    <span>Double-click anywhere to create a text card.</span>
  </div>
  <div class="canvas-viewport" tabindex="0">
    <svg class="canvas-edges" aria-hidden="true"></svg>
    <div class="canvas-world"></div>
  </div>
`;
workspaceBody.append(host);

const viewport = host.querySelector<HTMLElement>('.canvas-viewport')!;
const world = host.querySelector<HTMLElement>('.canvas-world')!;
const edgeSvg = host.querySelector<SVGSVGElement>('.canvas-edges')!;
const zoomLabel = host.querySelector<HTMLElement>('.canvas-zoom')!;
const emptyHint = host.querySelector<HTMLElement>('.canvas-empty')!;

let canvasPath: string | null = null;
let documentState: CanvasDocument = { nodes: [], edges: [] };
let panX = 0;
let panY = 0;
let zoom = 1;
let saveTimer: number | null = null;
let canvasTab: HTMLButtonElement | null = null;
let selectedNodeId: string | null = null;

function leafName(path: string): string { return path.split('/').pop() ?? path; }
function nextId(): string { return crypto.randomUUID().replace(/-/g, '').slice(0, 16); }

async function resolveCanvasPathByName(name: string): Promise<string | null> {
  const snapshot = await window.ivory.getVaultSnapshot();
  if (!snapshot) return null;
  const matches: string[] = [];
  const walk = (entries: typeof snapshot.entries) => {
    for (const entry of entries) {
      if (entry.kind === 'folder') walk(entry.children ?? []);
      else if (entry.path.toLowerCase().endsWith('.canvas') && entry.name === name) matches.push(entry.path);
    }
  };
  walk(snapshot.entries);
  return matches[0] ?? null;
}

function hideCanvas(): void {
  host.classList.add('hidden');
  canvasTab?.classList.remove('active');
}

function showCanvas(): void {
  editorHost.classList.add('hidden');
  readingHost.classList.add('hidden');
  welcome.classList.add('hidden');
  host.classList.remove('hidden');
  canvasTab?.classList.add('active');
  statusRight.textContent = 'Canvas';
  viewport.focus({ preventScroll: true });
}

function ensureCanvasTab(path: string): void {
  canvasTab?.remove();
  canvasTab = document.createElement('button');
  canvasTab.className = 'tab active canvas-tab';
  canvasTab.title = path;
  const label = document.createElement('span'); label.textContent = leafName(path);
  const close = document.createElement('span'); close.className = 'tab-close'; close.textContent = '×';
  close.addEventListener('click', (event) => { event.stopPropagation(); hideCanvas(); canvasTab?.remove(); canvasTab = null; canvasPath = null; selectedNodeId = null; });
  canvasTab.append(label, close);
  canvasTab.addEventListener('click', () => showCanvas());
  tabBar.append(canvasTab);
}

function scheduleSave(): void {
  if (!canvasPath) return;
  statusLeft.textContent = 'Canvas editing…';
  if (saveTimer !== null) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(async () => {
    if (!canvasPath) return;
    await window.ivory.writeTextFile(canvasPath, JSON.stringify(documentState, null, 2));
    statusLeft.textContent = 'Canvas saved';
  }, 300);
}

function transformPoint(x: number, y: number): { x: number; y: number } {
  return { x: (x - panX) / zoom, y: (y - panY) / zoom };
}

function viewportPoint(event: MouseEvent | PointerEvent): { x: number; y: number } {
  const rect = viewport.getBoundingClientRect();
  return transformPoint(event.clientX - rect.left, event.clientY - rect.top);
}

function applyTransform(): void {
  world.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  edgeSvg.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
}

function nodeCenter(node: CanvasNode): { x: number; y: number } {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

function updateCanvasSummary(): void {
  emptyHint.classList.toggle('hidden', documentState.nodes.length > 0);
  const properties = document.querySelector<HTMLElement>('#properties-panel');
  const links = document.querySelector<HTMLElement>('#links-panel');
  if (properties) properties.innerHTML = `<div class="empty-state">Canvas · ${documentState.nodes.length} nodes · ${documentState.edges.length} edges</div>`;
  if (links) links.innerHTML = '<div class="empty-state">Canvas edge inspection will be added in the next pass.</div>';
}

function renderEdges(): void {
  edgeSvg.replaceChildren();
  edgeSvg.setAttribute('viewBox', '-100000 -100000 200000 200000');
  for (const edge of documentState.edges ?? []) {
    const from = documentState.nodes.find((node) => node.id === edge.fromNode);
    const to = documentState.nodes.find((node) => node.id === edge.toNode);
    if (!from || !to) continue;
    const a = nodeCenter(from); const b = nodeCenter(to);
    const dx = Math.max(50, Math.abs(b.x - a.x) * .35);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`);
    path.setAttribute('class', 'canvas-edge');
    edgeSvg.append(path);
  }
}

function selectNode(id: string | null): void {
  selectedNodeId = id;
  world.querySelectorAll<HTMLElement>('.canvas-node').forEach((node) => node.classList.toggle('selected', node.dataset.nodeId === id));
}

function renderNode(node: CanvasNode): HTMLElement {
  const element = document.createElement('article');
  element.className = `canvas-node canvas-node-${node.type}${selectedNodeId === node.id ? ' selected' : ''}`;
  element.dataset.nodeId = node.id;
  element.style.left = `${node.x}px`; element.style.top = `${node.y}px`;
  element.style.width = `${node.width}px`; element.style.height = `${node.height}px`;

  const isText = node.type === 'text';
  let dragHandle: HTMLElement = element;

  if (!isText) {
    const header = document.createElement('div'); header.className = 'canvas-node-header';
    const title = document.createElement('span'); title.textContent = node.type === 'file' ? leafName(node.file) : node.type === 'link' ? 'Link' : (node.label || 'Group');
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'canvas-node-delete'; remove.textContent = '×'; remove.title = 'Delete node';
    remove.addEventListener('click', (event) => { event.stopPropagation(); documentState.nodes = documentState.nodes.filter((item) => item.id !== node.id); documentState.edges = documentState.edges.filter((edge) => edge.fromNode !== node.id && edge.toNode !== node.id); selectedNodeId = null; renderCanvas(); scheduleSave(); });
    header.append(title, remove); element.append(header); dragHandle = header;
  }

  const body = document.createElement('div'); body.className = 'canvas-node-body';
  if (node.type === 'text') {
    const textarea = document.createElement('textarea');
    textarea.value = node.text ?? '';
    textarea.placeholder = 'Type something…';
    textarea.spellcheck = true;
    textarea.addEventListener('input', () => { node.text = textarea.value; scheduleSave(); });
    textarea.addEventListener('pointerdown', (event) => event.stopPropagation());
    body.append(textarea);
  } else if (node.type === 'file') {
    const button = document.createElement('button'); button.className = 'canvas-file-card'; button.textContent = node.file; button.title = node.file;
    body.append(button);
  } else if (node.type === 'link') {
    const anchor = document.createElement('a'); anchor.href = node.url; anchor.textContent = node.url; anchor.target = '_blank'; body.append(anchor);
  } else body.textContent = node.label ?? '';
  element.append(body);
  element.addEventListener('pointerdown', () => selectNode(node.id));

  let drag: { startX: number; startY: number; nodeX: number; nodeY: number } | null = null;
  dragHandle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button,textarea,input,a')) return;
    event.preventDefault(); event.stopPropagation(); dragHandle.setPointerCapture(event.pointerId);
    selectNode(node.id);
    drag = { startX: event.clientX, startY: event.clientY, nodeX: node.x, nodeY: node.y };
    element.classList.add('dragging');
  });
  dragHandle.addEventListener('pointermove', (event) => {
    if (!drag) return;
    node.x = drag.nodeX + (event.clientX - drag.startX) / zoom;
    node.y = drag.nodeY + (event.clientY - drag.startY) / zoom;
    element.style.left = `${node.x}px`; element.style.top = `${node.y}px`; renderEdges();
  });
  dragHandle.addEventListener('pointerup', () => { if (!drag) return; drag = null; element.classList.remove('dragging'); scheduleSave(); });
  return element;
}

function renderCanvas(): void {
  world.replaceChildren();
  for (const node of documentState.nodes ?? []) world.append(renderNode(node));
  renderEdges();
  applyTransform();
  updateCanvasSummary();
}

function createTextNode(point?: { x: number; y: number }): void {
  if (!canvasPath) return;
  const rect = viewport.getBoundingClientRect();
  const center = point ?? transformPoint(rect.width / 2, rect.height / 2);
  const node: TextCanvasNode = { id: nextId(), type: 'text', text: '', x: center.x - 140, y: center.y - 90, width: 280, height: 180 };
  documentState.nodes.push(node); selectedNodeId = node.id; renderCanvas(); scheduleSave();
  requestAnimationFrame(() => world.querySelector<HTMLTextAreaElement>(`[data-node-id="${node.id}"] textarea`)?.focus());
}

function fitCanvas(): void {
  if (!documentState.nodes.length) { panX = 0; panY = 0; zoom = 1; applyTransform(); return; }
  const minX = Math.min(...documentState.nodes.map((n) => n.x)); const minY = Math.min(...documentState.nodes.map((n) => n.y));
  const maxX = Math.max(...documentState.nodes.map((n) => n.x + n.width)); const maxY = Math.max(...documentState.nodes.map((n) => n.y + n.height));
  const rect = viewport.getBoundingClientRect(); const contentW = Math.max(1, maxX - minX); const contentH = Math.max(1, maxY - minY);
  zoom = Math.min(1.4, Math.max(.2, Math.min((rect.width - 120) / contentW, (rect.height - 120) / contentH)));
  panX = rect.width / 2 - (minX + contentW / 2) * zoom; panY = rect.height / 2 - (minY + contentH / 2) * zoom; applyTransform();
}

async function openCanvas(path: string): Promise<void> {
  try {
    const raw = await window.ivory.readTextFile(path);
    const parsed = JSON.parse(raw || '{"nodes":[],"edges":[]}') as CanvasDocument;
    documentState = { nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [], edges: Array.isArray(parsed.edges) ? parsed.edges : [] };
    canvasPath = path; selectedNodeId = null; ensureCanvasTab(path); showCanvas(); renderCanvas(); requestAnimationFrame(() => fitCanvas()); statusLeft.textContent = path;
  } catch (error) { statusLeft.textContent = `Canvas error: ${error instanceof Error ? error.message : String(error)}`; }
}

fileTree.addEventListener('click', async (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.tree-file'); if (!button) return;
  const name = button.textContent?.trim() ?? '';
  if (name.toLowerCase().endsWith('.canvas')) { event.preventDefault(); event.stopPropagation(); const path = await resolveCanvasPathByName(name); if (path) await openCanvas(path); }
  else if (name.toLowerCase().endsWith('.md')) hideCanvas();
}, true);

tabBar.addEventListener('click', (event) => { const tab = (event.target as HTMLElement).closest('.tab'); if (tab && !tab.classList.contains('canvas-tab')) hideCanvas(); }, true);

let pan: { x: number; y: number; panX: number; panY: number } | null = null;
viewport.addEventListener('pointerdown', (event) => {
  if ((event.target as HTMLElement).closest('.canvas-node') || event.button !== 0) return;
  selectNode(null); viewport.setPointerCapture(event.pointerId); pan = { x: event.clientX, y: event.clientY, panX, panY }; viewport.classList.add('panning');
});
viewport.addEventListener('pointermove', (event) => { if (!pan) return; panX = pan.panX + event.clientX - pan.x; panY = pan.panY + event.clientY - pan.y; applyTransform(); });
viewport.addEventListener('pointerup', () => { pan = null; viewport.classList.remove('panning'); });
viewport.addEventListener('dblclick', (event) => {
  if ((event.target as HTMLElement).closest('.canvas-node')) return;
  createTextNode(viewportPoint(event));
});
viewport.addEventListener('wheel', (event) => {
  event.preventDefault();
  const rect = viewport.getBoundingClientRect(); const mouseX = event.clientX - rect.left; const mouseY = event.clientY - rect.top;
  const before = transformPoint(mouseX, mouseY);
  zoom = Math.min(3, Math.max(.15, zoom * (event.deltaY < 0 ? 1.1 : .9)));
  panX = mouseX - before.x * zoom; panY = mouseY - before.y * zoom; applyTransform();
}, { passive: false });
viewport.addEventListener('keydown', (event) => {
  if (!selectedNodeId || (event.target as HTMLElement).matches('textarea,input')) return;
  if (event.key !== 'Delete' && event.key !== 'Backspace') return;
  event.preventDefault();
  documentState.nodes = documentState.nodes.filter((node) => node.id !== selectedNodeId);
  documentState.edges = documentState.edges.filter((edge) => edge.fromNode !== selectedNodeId && edge.toNode !== selectedNodeId);
  selectedNodeId = null; renderCanvas(); scheduleSave();
});

host.querySelector('[data-canvas-action="zoom-in"]')?.addEventListener('click', () => { zoom = Math.min(3, zoom * 1.15); applyTransform(); });
host.querySelector('[data-canvas-action="zoom-out"]')?.addEventListener('click', () => { zoom = Math.max(.15, zoom / 1.15); applyTransform(); });
host.querySelector('[data-canvas-action="fit"]')?.addEventListener('click', fitCanvas);
