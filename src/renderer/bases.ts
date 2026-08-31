import yaml from 'js-yaml';
import type { VaultEntry } from '../shared/desktop-api.js';
import { parseNote, parsePropertyInput, replaceFrontmatter } from './metadata.js';
import { isBaseFile } from './file-types.js';
import { activateIvoryTab, hasIvoryTab, registerIvoryTab } from './tab-system.js';

type SortDirection = 'asc' | 'desc';
interface BaseSort { property?: string; direction?: SortDirection; }
interface BaseView { type?: string; name?: string; order?: string[]; groupBy?: string | { property?: string }; filters?: unknown; sort?: BaseSort[] | string[]; }
interface BaseDocument { filters?: unknown; properties?: Record<string, { displayName?: string } | string | null>; formulas?: Record<string, string>; views?: BaseView[]; }
interface BaseRow { path: string; name: string; properties: Record<string, unknown>; tags: string[]; }
interface BaseSession { path: string; document: BaseDocument; rows: BaseRow[]; activeViewIndex: number; query: string; sortKey: string | null; sortDirection: SortDirection; }

const workspaceBody = document.querySelector<HTMLElement>('.workspace-body');
const fileTree = document.querySelector<HTMLElement>('#file-tree');
const editorHost = document.querySelector<HTMLElement>('#editor-host');
const readingHost = document.querySelector<HTMLElement>('#reading-host');
const welcome = document.querySelector<HTMLElement>('#welcome');
const statusLeft = document.querySelector<HTMLElement>('#status-left');
const statusRight = document.querySelector<HTMLElement>('#status-right');
const propertiesPanel = document.querySelector<HTMLElement>('#properties-panel');
const linksPanel = document.querySelector<HTMLElement>('#links-panel');
if (!workspaceBody || !fileTree || !editorHost || !readingHost || !welcome || !statusLeft || !statusRight) throw new Error('Bases bootstrap could not find the Ivory workspace.');

const host = document.createElement('section');
host.className = 'bases-host hidden';
host.innerHTML = `
  <header class="bases-toolbar">
    <div class="bases-title"></div>
    <div class="bases-view-tabs"></div>
    <button type="button" class="bases-tool" data-base-action="add-view">＋ View</button>
    <div class="bases-spacer"></div>
    <button type="button" class="bases-tool" data-base-action="add-property">＋ Property</button>
    <button type="button" class="bases-tool" data-base-action="sort">Sort</button>
    <button type="button" class="bases-tool" data-base-action="group">Group</button>
    <input class="bases-search" type="search" placeholder="Filter rows…" aria-label="Filter rows">
    <div class="bases-count"></div>
  </header>
  <div class="bases-table-wrap">
    <table class="bases-table"><thead></thead><tbody></tbody></table>
    <div class="bases-empty hidden">No rows match this view.</div>
  </div>`;
workspaceBody.append(host);

const toolbar = host.querySelector<HTMLElement>('.bases-toolbar')!;
const titleEl = host.querySelector<HTMLElement>('.bases-title')!;
const viewTabs = host.querySelector<HTMLElement>('.bases-view-tabs')!;
const countEl = host.querySelector<HTMLElement>('.bases-count')!;
const table = host.querySelector<HTMLTableElement>('.bases-table')!;
const searchInput = host.querySelector<HTMLInputElement>('.bases-search')!;
const emptyEl = host.querySelector<HTMLElement>('.bases-empty')!;
const sessions = new Map<string, BaseSession>();
let activeBasePath: string | null = null;
const leafName = (path: string) => path.split('/').pop() ?? path;

function flatten(entries: VaultEntry[]): string[] {
  const result: string[] = [];
  for (const entry of entries) entry.kind === 'folder' ? result.push(...flatten(entry.children ?? [])) : result.push(entry.path);
  return result;
}
function hideOtherViews(): void {
  editorHost.classList.add('hidden');
  readingHost.classList.add('hidden');
  welcome.classList.add('hidden');
  document.querySelector<HTMLElement>('.canvas-host')?.classList.add('hidden');
  document.querySelector<HTMLElement>('.image-viewer-host')?.classList.add('hidden');
}
function hideBase(): void { host.classList.add('hidden'); }
function currentSession(): BaseSession | null {
  if (activeBasePath && sessions.has(activeBasePath)) return sessions.get(activeBasePath)!;
  const activeTab = document.querySelector<HTMLElement>('.tab.active[data-tab-kind="base"]');
  const path = activeTab?.dataset.tabPath || activeTab?.getAttribute('title') || null;
  if (path && sessions.has(path)) {
    activeBasePath = path;
    return sessions.get(path)!;
  }
  return null;
}
function ensureViews(session: BaseSession): BaseView[] {
  if (!session.document.views?.length) session.document.views = [{ type: 'table', name: 'Table', order: ['file.name'] }];
  return session.document.views;
}
function currentView(session: BaseSession): BaseView { return ensureViews(session)[session.activeViewIndex] ?? ensureViews(session)[0]; }
function propertyKey(key: string): string { return key.replace(/^property\./, '').replace(/^note\./, ''); }
function canonicalProperty(name: string): string {
  const clean = name.trim().replace(/^property\./, '');
  return clean.startsWith('file.') ? clean : `property.${clean}`;
}
async function saveBaseDefinition(session: BaseSession): Promise<void> {
  try {
    await window.ivory.writeTextFile(session.path, yaml.dump(session.document, { noRefs: true, lineWidth: -1, sortKeys: false }).trimEnd() + '\n');
    statusLeft.textContent = `Saved ${session.path}`;
  } catch (error) {
    statusLeft.textContent = `Base save failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}
function showBase(path: string): void {
  const session = sessions.get(path);
  if (!session) return;
  activeBasePath = path;
  hideOtherViews();
  host.classList.remove('hidden');
  statusRight.textContent = 'Base';
  searchInput.value = session.query;
  renderBase(session);
  if (propertiesPanel) propertiesPanel.innerHTML = `<div class="empty-state">Base · ${session.rows.length} indexed notes</div>`;
  if (linksPanel) linksPanel.innerHTML = '<div class="empty-state">Rows are backed by Markdown properties in the vault.</div>';
}

async function buildRows(): Promise<BaseRow[]> {
  const snapshot = await window.ivory.getVaultSnapshot();
  if (!snapshot) return [];
  const paths = flatten(snapshot.entries).filter(path => path.toLowerCase().endsWith('.md'));
  const result: BaseRow[] = [];
  await Promise.all(paths.map(async path => {
    try {
      const metadata = parseNote(path, await window.ivory.readTextFile(path));
      result.push({ path, name: metadata.name, properties: metadata.frontmatter, tags: metadata.tags });
    } catch {}
  }));
  return result.sort((a, b) => a.path.localeCompare(b.path));
}
function propertyValue(row: BaseRow, key: string): unknown {
  if (key === 'file.name') return row.name;
  if (key === 'file.path') return row.path;
  if (key === 'file.tags') return row.tags;
  return row.properties[propertyKey(key)];
}
function displayName(document: BaseDocument, key: string): string {
  const config = document.properties?.[key] ?? document.properties?.[propertyKey(key)];
  if (config && typeof config === 'object' && config.displayName) return config.displayName;
  if (typeof config === 'string') return config;
  if (key === 'file.name') return 'Name';
  if (key === 'file.path') return 'Path';
  if (key === 'file.tags') return 'Tags';
  return propertyKey(key);
}
function valueText(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
function matchesExpression(row: BaseRow, expression: string): boolean {
  const text = expression.trim();
  const hasTag = text.match(/^file\.hasTag\(["'](.+?)["']\)$/);
  if (hasTag) return row.tags.includes(hasTag[1].replace(/^#/, ''));
  const contains = text.match(/^(?:property\.)?([\w-]+)\.contains\(["'](.*)["']\)$/);
  if (contains) return valueText(row.properties[contains[1]]).toLocaleLowerCase().includes(contains[2].toLocaleLowerCase());
  const comparison = text.match(/^(file\.(?:name|path)|(?:property\.)?[\w-]+)\s*(==|!=|>=|<=|>|<)\s*(?:["'](.*)["']|(-?\d+(?:\.\d+)?))$/);
  if (!comparison) return true;
  const left = propertyValue(row, comparison[1]);
  const rawRight = comparison[3] ?? comparison[4] ?? '';
  const right = comparison[4] !== undefined ? Number(rawRight) : rawRight;
  if (comparison[2] === '==') return String(left ?? '') === String(right);
  if (comparison[2] === '!=') return String(left ?? '') !== String(right);
  const a = Number(left), b = Number(right);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return true;
  if (comparison[2] === '>') return a > b;
  if (comparison[2] === '<') return a < b;
  if (comparison[2] === '>=') return a >= b;
  if (comparison[2] === '<=') return a <= b;
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
function matchesQuery(row: BaseRow, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  return [row.name, row.path, ...row.tags, ...Object.values(row.properties).map(valueText)].some(value => String(value).toLocaleLowerCase().includes(needle));
}
function columnsFor(session: BaseSession, filtered: BaseRow[]): string[] {
  const view = currentView(session);
  if (Array.isArray(view.order) && view.order.length) return view.order;
  const keys = new Set<string>(['file.name']);
  for (const row of filtered) Object.keys(row.properties).forEach(key => keys.add(`property.${key}`));
  return [...keys].slice(0, 24);
}
function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return valueText(a).localeCompare(valueText(b), undefined, { numeric: true, sensitivity: 'base' });
}
function declaredSort(view: BaseView): { key: string; direction: SortDirection } | null {
  const first = view.sort?.[0];
  if (!first) return null;
  if (typeof first === 'string') {
    const match = first.match(/^(.+?)\s+(ASC|DESC)$/i);
    return { key: match?.[1] ?? first, direction: match?.[2]?.toLowerCase() === 'desc' ? 'desc' : 'asc' };
  }
  if (first.property) return { key: first.property, direction: first.direction === 'desc' ? 'desc' : 'asc' };
  return null;
}
function groupKey(view: BaseView): string | null {
  if (typeof view.groupBy === 'string') return view.groupBy;
  if (view.groupBy && typeof view.groupBy === 'object') return view.groupBy.property ?? null;
  return null;
}
function renderViews(session: BaseSession): void {
  viewTabs.replaceChildren();
  ensureViews(session).forEach((view, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `bases-view-tab${index === session.activeViewIndex ? ' active' : ''}`;
    button.textContent = view.name || view.type || `View ${index + 1}`;
    button.addEventListener('click', () => { session.activeViewIndex = index; session.sortKey = null; renderBase(session); });
    button.addEventListener('contextmenu', event => {
      event.preventDefault();
      const action = window.prompt('View: R rename, D delete')?.trim().toLowerCase();
      if (action === 'r') {
        const name = window.prompt('View name:', view.name || 'Table')?.trim();
        if (name) { view.name = name; void saveBaseDefinition(session); renderBase(session); }
      } else if (action === 'd' && ensureViews(session).length > 1) {
        session.document.views = ensureViews(session).filter((_, i) => i !== index);
        session.activeViewIndex = Math.max(0, Math.min(session.activeViewIndex, (session.document.views?.length ?? 1) - 1));
        void saveBaseDefinition(session); renderBase(session);
      }
    });
    viewTabs.append(button);
  });
}
async function updateCell(session: BaseSession, row: BaseRow, column: string, raw: string, previous: unknown): Promise<void> {
  if (column.startsWith('file.')) return;
  const key = propertyKey(column);
  try {
    const source = await window.ivory.readTextFile(row.path);
    const metadata = parseNote(row.path, source);
    const value = parsePropertyInput(raw, previous);
    metadata.frontmatter[key] = value;
    const next = replaceFrontmatter(source, metadata.frontmatter);
    await window.ivory.writeTextFile(row.path, next);
    row.properties[key] = value;
    window.dispatchEvent(new CustomEvent('ivory:markdown-updated', { detail: { path: row.path, content: next } }));
    statusLeft.textContent = `Saved ${row.path}`;
    renderBase(session);
  } catch (error) {
    statusLeft.textContent = `Property save failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}
function renderEditableCell(session: BaseSession, row: BaseRow, column: string, value: unknown): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'bases-cell-editor';
  if (typeof value === 'boolean') {
    const input = document.createElement('input');
    input.type = 'checkbox'; input.checked = value;
    input.addEventListener('change', () => void updateCell(session, row, column, String(input.checked), value));
    wrap.append(input); return wrap;
  }
  const input = document.createElement('input');
  input.type = typeof value === 'number' ? 'number' : 'text';
  input.value = valueText(value); input.placeholder = '—';
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') input.blur();
    if (event.key === 'Escape') { input.value = valueText(value); input.blur(); }
  });
  input.addEventListener('change', () => void updateCell(session, row, column, input.value, value));
  wrap.append(input); return wrap;
}
function appendDataRow(session: BaseSession, tbody: HTMLTableSectionElement, row: BaseRow, columns: string[]): void {
  const tr = document.createElement('tr'); tr.dataset.path = row.path;
  for (const column of columns) {
    const td = document.createElement('td'); const value = propertyValue(row, column);
    if (column === 'file.name') {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'bases-file-link'; button.textContent = valueText(value);
      button.addEventListener('click', () => window.dispatchEvent(new CustomEvent('ivory:open-path', { detail: { path: row.path } })));
      td.append(button);
    } else if (column === 'file.path') { td.className = 'bases-muted-cell'; td.textContent = row.path; }
    else if (column === 'file.tags') {
      const tags = document.createElement('div'); tags.className = 'bases-tags';
      for (const tag of row.tags) { const chip = document.createElement('span'); chip.textContent = `#${tag}`; tags.append(chip); }
      td.append(tags);
    } else td.append(renderEditableCell(session, row, column, value));
    tr.append(td);
  }
  tbody.append(tr);
}
function configureColumn(session: BaseSession, column: string): void {
  if (column.startsWith('file.')) return;
  const action = window.prompt('Column: R rename display, H hide')?.trim().toLowerCase();
  const view = currentView(session);
  if (action === 'h') {
    view.order = (view.order ?? columnsFor(session, session.rows)).filter(key => key !== column);
    void saveBaseDefinition(session); renderBase(session); return;
  }
  if (action === 'r') {
    const name = window.prompt('Display name:', displayName(session.document, column))?.trim();
    if (!name) return;
    session.document.properties ??= {};
    session.document.properties[column] = { displayName: name };
    void saveBaseDefinition(session); renderBase(session);
  }
}
function renderBase(session: BaseSession): void {
  if (activeBasePath !== session.path) return;
  const view = currentView(session);
  let filtered = session.rows.filter(row => matchesFilter(row, session.document.filters) && matchesFilter(row, view.filters) && matchesQuery(row, session.query));
  const declared = declaredSort(view);
  const sortKey = session.sortKey ?? declared?.key ?? null;
  const sortDirection = session.sortKey ? session.sortDirection : (declared?.direction ?? 'asc');
  if (sortKey) filtered = [...filtered].sort((a, b) => compareValues(propertyValue(a, sortKey), propertyValue(b, sortKey)) * (sortDirection === 'desc' ? -1 : 1));
  const columns = columnsFor(session, filtered);
  titleEl.textContent = leafName(session.path);
  countEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'row' : 'rows'}`;
  searchInput.value = session.query;
  renderViews(session);
  const thead = table.tHead ?? table.createTHead();
  const tbody = table.tBodies[0] ?? table.createTBody();
  thead.replaceChildren(); tbody.replaceChildren();
  const header = document.createElement('tr');
  for (const column of columns) {
    const th = document.createElement('th');
    const button = document.createElement('button'); button.type = 'button';
    button.className = `bases-column-header${sortKey === column ? ' sorted' : ''}`;
    button.textContent = displayName(session.document, column);
    if (sortKey === column) { const indicator = document.createElement('span'); indicator.textContent = sortDirection === 'desc' ? '↓' : '↑'; button.append(indicator); }
    button.title = 'Click to sort · right-click for column options';
    button.addEventListener('click', () => {
      if (session.sortKey === column) session.sortDirection = session.sortDirection === 'asc' ? 'desc' : 'asc';
      else { session.sortKey = column; session.sortDirection = 'asc'; }
      renderBase(session);
    });
    button.addEventListener('contextmenu', event => { event.preventDefault(); configureColumn(session, column); });
    th.append(button); header.append(th);
  }
  thead.append(header);
  const groupedBy = groupKey(view);
  if (groupedBy) {
    const groups = new Map<string, BaseRow[]>();
    for (const row of filtered) {
      const label = valueText(propertyValue(row, groupedBy)) || 'Empty';
      const list = groups.get(label) ?? []; list.push(row); groups.set(label, list);
    }
    for (const [label, groupRows] of groups) {
      const group = document.createElement('tr'); group.className = 'bases-group-row';
      const cell = document.createElement('td'); cell.colSpan = Math.max(1, columns.length); cell.textContent = `${label}  ·  ${groupRows.length}`;
      group.append(cell); tbody.append(group);
      for (const row of groupRows) appendDataRow(session, tbody, row, columns);
    }
  } else for (const row of filtered) appendDataRow(session, tbody, row, columns);
  emptyEl.classList.toggle('hidden', filtered.length > 0);
  table.classList.toggle('hidden', filtered.length === 0);
}
async function addProperty(session: BaseSession): Promise<void> {
  const raw = window.prompt('Property name:')?.trim(); if (!raw) return;
  const column = canonicalProperty(raw); const view = currentView(session);
  view.order ??= columnsFor(session, session.rows);
  if (!view.order.includes(column)) view.order.push(column);
  session.document.properties ??= {};
  if (!(column in session.document.properties)) {
    const display = window.prompt('Display name (optional):', propertyKey(column))?.trim();
    session.document.properties[column] = display && display !== propertyKey(column) ? { displayName: display } : null;
  }
  await saveBaseDefinition(session); renderBase(session);
}
async function addView(session: BaseSession): Promise<void> {
  const name = window.prompt('View name:', 'Table')?.trim(); if (!name) return;
  const current = currentView(session);
  ensureViews(session).push({ type: 'table', name, order: [...(current.order ?? columnsFor(session, session.rows))] });
  session.activeViewIndex = ensureViews(session).length - 1;
  await saveBaseDefinition(session); renderBase(session);
}
async function configureSort(session: BaseSession): Promise<void> {
  const columns = columnsFor(session, session.rows); const current = declaredSort(currentView(session));
  const raw = window.prompt(`Sort property:\n${columns.join('\n')}\n\nLeave blank to clear.`, current?.key ?? '')?.trim();
  if (raw === undefined) return;
  const view = currentView(session);
  if (!raw) { delete view.sort; session.sortKey = null; }
  else {
    const key = canonicalProperty(raw);
    const direction = (window.prompt('Direction: asc or desc', current?.direction ?? 'asc')?.trim().toLowerCase() === 'desc' ? 'desc' : 'asc') as SortDirection;
    view.sort = [{ property: key, direction }]; session.sortKey = null;
  }
  await saveBaseDefinition(session); renderBase(session);
}
async function configureGroup(session: BaseSession): Promise<void> {
  const columns = columnsFor(session, session.rows); const current = groupKey(currentView(session));
  const raw = window.prompt(`Group property:\n${columns.join('\n')}\n\nLeave blank to clear.`, current ?? '')?.trim();
  if (raw === undefined) return;
  const view = currentView(session);
  if (!raw) delete view.groupBy; else view.groupBy = canonicalProperty(raw);
  await saveBaseDefinition(session); renderBase(session);
}
async function openBase(path: string): Promise<void> {
  if (hasIvoryTab(path)) { await activateIvoryTab(path); return; }
  try {
    const parsed = yaml.load(await window.ivory.readTextFile(path));
    const session: BaseSession = { path, document: parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as BaseDocument : {}, rows: await buildRows(), activeViewIndex: 0, query: '', sortKey: null, sortDirection: 'asc' };
    ensureViews(session); sessions.set(path, session);
    registerIvoryTab({ path, label: leafName(path), kind: 'base', activate: () => showBase(path), close: () => { sessions.delete(path); if (activeBasePath === path) { activeBasePath = null; hideBase(); } } });
    await activateIvoryTab(path); statusLeft.textContent = path;
  } catch (error) { statusLeft.textContent = `Base error: ${error instanceof Error ? error.message : String(error)}`; }
}
async function resolveByName(name: string): Promise<string | null> {
  const snapshot = await window.ivory.getVaultSnapshot(); if (!snapshot) return null;
  return flatten(snapshot.entries).find(path => leafName(path) === name && isBaseFile(path)) ?? null;
}

searchInput.addEventListener('input', () => { const session = currentSession(); if (!session) return; session.query = searchInput.value; renderBase(session); });
toolbar.addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-base-action]');
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  const session = currentSession();
  if (!session) { statusLeft.textContent = 'No active Base session'; return; }
  const action = button.dataset.baseAction;
  if (action === 'add-property') void addProperty(session);
  else if (action === 'add-view') void addView(session);
  else if (action === 'sort') void configureSort(session);
  else if (action === 'group') void configureGroup(session);
});
fileTree.addEventListener('click', async event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.tree-file'); if (!button) return;
  const path = button.dataset.path || button.textContent?.trim() || ''; if (!isBaseFile(path)) return;
  event.preventDefault(); event.stopPropagation();
  const resolved = button.dataset.path || await resolveByName(path); if (resolved) await openBase(resolved);
}, true);
window.addEventListener('ivory:show-base', () => { if (activeBasePath) showBase(activeBasePath); });
window.addEventListener('ivory:hide-base', hideBase);
window.ivory.onVaultChange(change => {
  if (!change.path.toLowerCase().endsWith('.md')) return;
  window.setTimeout(async () => {
    const rebuilt = await buildRows();
    for (const session of sessions.values()) session.rows = rebuilt.map(row => ({ ...row, properties: { ...row.properties }, tags: [...row.tags] }));
    const active = currentSession(); if (active) renderBase(active);
  }, 220);
});
