import yaml from 'js-yaml';
import { parseNote } from './metadata.js';
import { isBaseFile } from './file-types.js';
import { activateIvoryTab, registerIvoryTab } from './tab-system.js';

interface BaseView {
  type?: string;
  name?: string;
  order?: string[];
  groupBy?: string;
  filters?: unknown;
}

interface BaseDocument {
  filters?: unknown;
  properties?: Record<string, { displayName?: string } | string | null>;
  formulas?: Record<string, string>;
  views?: BaseView[];
}

interface BaseRow {
  path: string;
  name: string;
  properties: Record<string, unknown>;
  tags: string[];
}

const workspaceBody = document.querySelector<HTMLElement>('.workspace-body');
const fileTree = document.querySelector<HTMLElement>('#file-tree');
const editorHost = document.querySelector<HTMLElement>('#editor-host');
const readingHost = document.querySelector<HTMLElement>('#reading-host');
const welcome = document.querySelector<HTMLElement>('#welcome');
const statusLeft = document.querySelector<HTMLElement>('#status-left');
const statusRight = document.querySelector<HTMLElement>('#status-right');
const propertiesPanel = document.querySelector<HTMLElement>('#properties-panel');
const linksPanel = document.querySelector<HTMLElement>('#links-panel');

if (!workspaceBody || !fileTree || !editorHost || !readingHost || !welcome || !statusLeft || !statusRight) {
  throw new Error('Bases bootstrap could not find the Ivory workspace.');
}

const host = document.createElement('section');
host.className = 'bases-host hidden';
host.innerHTML = `
  <header class="bases-toolbar">
    <div class="bases-title"></div>
    <div class="bases-view-tabs"></div>
    <div class="bases-count"></div>
  </header>
  <div class="bases-table-wrap">
    <table class="bases-table"><thead></thead><tbody></tbody></table>
  </div>
`;
workspaceBody.append(host);

const titleEl = host.querySelector<HTMLElement>('.bases-title')!;
const viewTabs = host.querySelector<HTMLElement>('.bases-view-tabs')!;
const countEl = host.querySelector<HTMLElement>('.bases-count')!;
const table = host.querySelector<HTMLTableElement>('.bases-table')!;

let basePath: string | null = null;
let baseDocument: BaseDocument = {};
let rows: BaseRow[] = [];
let activeViewIndex = 0;

const leafName = (path: string) => path.split('/').pop() ?? path;

function hideOtherViews(): void {
  editorHost.classList.add('hidden');
  readingHost.classList.add('hidden');
  welcome.classList.add('hidden');
  document.querySelector<HTMLElement>('.canvas-host')?.classList.add('hidden');
  document.querySelector<HTMLElement>('.image-viewer-host')?.classList.add('hidden');
}

function showBase(): void {
  hideOtherViews();
  host.classList.remove('hidden');
  statusRight.textContent = 'Base';
  if (propertiesPanel) propertiesPanel.innerHTML = `<div class="empty-state">Base · ${rows.length} rows</div>`;
  if (linksPanel) linksPanel.innerHTML = '<div class="empty-state">Base relationships will be added as the query engine grows.</div>';
}

function hideBase(): void { host.classList.add('hidden'); }

function flatten(entries: Awaited<ReturnType<typeof window.ivory.getVaultSnapshot>> extends infer S ? S extends { entries: infer E } ? E : never : never): string[] {
  const result: string[] = [];
  for (const entry of entries as any[]) {
    if (entry.kind === 'folder') result.push(...flatten(entry.children ?? []));
    else result.push(entry.path);
  }
  return result;
}

async function buildRows(): Promise<BaseRow[]> {
  const snapshot = await window.ivory.getVaultSnapshot();
  if (!snapshot) return [];
  const paths = flatten(snapshot.entries).filter(path => path.toLowerCase().endsWith('.md'));
  const result: BaseRow[] = [];
  await Promise.all(paths.map(async path => {
    try {
      const source = await window.ivory.readTextFile(path);
      const metadata = parseNote(path, source);
      result.push({ path, name: metadata.name, properties: metadata.frontmatter, tags: metadata.tags });
    } catch { /* ignore unreadable note */ }
  }));
  return result.sort((a, b) => a.path.localeCompare(b.path));
}

function propertyValue(row: BaseRow, key: string): unknown {
  if (key === 'file.name') return row.name;
  if (key === 'file.path') return row.path;
  if (key === 'file.tags') return row.tags;
  const clean = key.replace(/^property\./, '').replace(/^note\./, '');
  return row.properties[clean];
}

function matchesExpression(row: BaseRow, expression: string): boolean {
  const hasTag = expression.match(/^file\.hasTag\(["'](.+?)["']\)$/);
  if (hasTag) return row.tags.includes(hasTag[1].replace(/^#/, ''));
  const comparison = expression.match(/^(?:property\.)?([\w-]+)\s*(==|!=)\s*["'](.*)["']$/);
  if (comparison) {
    const value = String(row.properties[comparison[1]] ?? '');
    return comparison[2] === '==' ? value === comparison[3] : value !== comparison[3];
  }
  return true;
}

function matchesFilter(row: BaseRow, filter: unknown): boolean {
  if (!filter) return true;
  if (typeof filter === 'string') return matchesExpression(row, filter);
  if (Array.isArray(filter)) return filter.every(item => matchesFilter(row, item));
  if (typeof filter !== 'object') return true;
  const object = filter as Record<string, unknown>;
  if (Array.isArray(object.and)) return object.and.every(item => matchesFilter(row, item));
  if (Array.isArray(object.or)) return object.or.some(item => matchesFilter(row, item));
  if (object.not !== undefined) return !matchesFilter(row, object.not);
  return true;
}

function displayName(key: string): string {
  const config = baseDocument.properties?.[key];
  if (config && typeof config === 'object' && config.displayName) return config.displayName;
  if (typeof config === 'string') return config;
  return key === 'file.name' ? 'Name' : key === 'file.path' ? 'Path' : key.replace(/^property\./, '');
}

function valueText(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function currentView(): BaseView {
  return baseDocument.views?.[activeViewIndex] ?? { type: 'table', name: 'Table' };
}

function columnsFor(view: BaseView, filtered: BaseRow[]): string[] {
  if (Array.isArray(view.order) && view.order.length) return view.order;
  const keys = new Set<string>(['file.name']);
  for (const row of filtered) Object.keys(row.properties).forEach(key => keys.add(`property.${key}`));
  return [...keys].slice(0, 10);
}

function renderViews(): void {
  viewTabs.replaceChildren();
  const views = baseDocument.views?.length ? baseDocument.views : [{ type: 'table', name: 'Table' }];
  views.forEach((view, index) => {
    const button = document.createElement('button');
    button.className = `bases-view-tab${index === activeViewIndex ? ' active' : ''}`;
    button.textContent = view.name || view.type || `View ${index + 1}`;
    button.addEventListener('click', () => { activeViewIndex = index; renderBase(); });
    viewTabs.append(button);
  });
}

function renderBase(): void {
  const view = currentView();
  const filtered = rows.filter(row => matchesFilter(row, baseDocument.filters) && matchesFilter(row, view.filters));
  const columns = columnsFor(view, filtered);
  titleEl.textContent = basePath ? leafName(basePath) : 'Base';
  countEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'row' : 'rows'}`;
  renderViews();
  const thead = table.tHead ?? table.createTHead();
  const tbody = table.tBodies[0] ?? table.createTBody();
  thead.replaceChildren(); tbody.replaceChildren();
  const header = document.createElement('tr');
  for (const column of columns) { const th = document.createElement('th'); th.textContent = displayName(column); header.append(th); }
  thead.append(header);
  for (const row of filtered) {
    const tr = document.createElement('tr');
    tr.dataset.path = row.path;
    for (const column of columns) {
      const td = document.createElement('td');
      const value = propertyValue(row, column);
      if (column === 'file.name') {
        const button = document.createElement('button');
        button.className = 'bases-file-link';
        button.textContent = valueText(value);
        button.addEventListener('click', () => window.dispatchEvent(new CustomEvent('ivory:open-path', { detail: { path: row.path } })));
        td.append(button);
      } else td.textContent = valueText(value);
      tr.append(td);
    }
    tbody.append(tr);
  }
}

async function openBase(path: string): Promise<void> {
  basePath = path;
  activeViewIndex = 0;
  try {
    const source = await window.ivory.readTextFile(path);
    const parsed = yaml.load(source);
    baseDocument = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as BaseDocument : {};
    rows = await buildRows();
    registerIvoryTab({
      path,
      label: leafName(path),
      kind: 'base',
      activate: () => { basePath = path; showBase(); renderBase(); },
      close: () => { if (basePath === path) { basePath = null; hideBase(); } }
    });
    await activateIvoryTab(path);
    renderBase();
    statusLeft.textContent = path;
  } catch (error) {
    statusLeft.textContent = `Base error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function resolveByName(name: string): Promise<string | null> {
  const snapshot = await window.ivory.getVaultSnapshot();
  if (!snapshot) return null;
  return flatten(snapshot.entries).find(path => leafName(path) === name && isBaseFile(path)) ?? null;
}

fileTree.addEventListener('click', async event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.tree-file');
  if (!button) return;
  const path = button.dataset.path || button.textContent?.trim() || '';
  if (!isBaseFile(path)) return;
  event.preventDefault(); event.stopPropagation();
  const resolved = button.dataset.path || await resolveByName(path);
  if (resolved) await openBase(resolved);
}, true);

window.addEventListener('ivory:show-base', () => { if (basePath) { showBase(); renderBase(); } });
window.addEventListener('ivory:hide-base', hideBase);
