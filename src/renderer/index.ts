import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { SearchHit, VaultEntry, VaultSnapshot } from '../shared/desktop-api.js';
import { flattenMarkdown, parseNote, resolveWikiLink, type NoteMetadata } from './metadata.js';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Ivory root element not found.');

type ViewMode = 'source' | 'reading';
interface OpenTab { path: string; content: string; mode: ViewMode; }

let snapshot: VaultSnapshot | null = null;
let editor: EditorView | null = null;
let activeFile: string | null = null;
let saveTimer: number | null = null;
let refreshTimer: number | null = null;
const tabs = new Map<string, OpenTab>();
const noteIndex = new Map<string, NoteMetadata>();

app.innerHTML = `
  <main class="ivory-shell">
    <aside class="ribbon" aria-label="Ivory ribbon">
      <div class="mark">I</div>
      <button id="open-vault" class="icon-button" title="Open vault">⌂</button>
      <button id="toggle-search" class="icon-button" title="Search">⌕</button>
      <div class="ribbon-spacer"></div>
      <button class="icon-button" title="Settings" disabled>⚙</button>
    </aside>
    <section class="sidebar">
      <header class="sidebar-header">
        <strong id="vault-name">No vault</strong>
        <div class="header-actions">
          <button id="new-note" class="mini-button" title="New note">＋</button>
          <button id="new-folder" class="mini-button" title="New folder">▱</button>
          <button id="open-vault-secondary" class="text-button">Open</button>
        </div>
      </header>
      <section id="search-panel" class="search-panel hidden">
        <input id="search-input" class="search-input" placeholder="Search vault…" />
        <div id="search-results" class="search-results"></div>
      </section>
      <div id="file-tree" class="file-tree"><div class="empty-state">Open a local vault to begin.</div></div>
    </section>
    <section class="workspace">
      <header id="tab-bar" class="tab-bar"><div class="tab active welcome-tab">Welcome</div></header>
      <div class="workspace-body">
        <div id="welcome" class="welcome">
          <div class="welcome-mark">IVORY</div>
          <h1>Your knowledge, locally.</h1>
          <p>Open a vault, choose a Markdown file, and start writing.</p>
          <button id="welcome-open" class="primary-button">Open vault</button>
        </div>
        <div id="editor-host" class="editor-host hidden"></div>
        <article id="reading-host" class="reading-host hidden"></article>
      </div>
      <footer class="status-bar"><span id="status-left">Ready</span><span id="status-right">Markdown</span></footer>
    </section>
    <aside class="right-sidebar">
      <header class="right-header">
        <button class="right-tab active" data-panel="properties">Properties</button>
        <button class="right-tab" data-panel="links">Links</button>
      </header>
      <div id="properties-panel" class="right-panel"><div class="empty-state">Open a note to inspect its properties.</div></div>
      <div id="links-panel" class="right-panel hidden"><div class="empty-state">Open a note to inspect its links.</div></div>
    </aside>
  </main>
`;

const vaultName = document.querySelector<HTMLElement>('#vault-name')!;
const fileTree = document.querySelector<HTMLElement>('#file-tree')!;
const tabBar = document.querySelector<HTMLElement>('#tab-bar')!;
const welcome = document.querySelector<HTMLElement>('#welcome')!;
const editorHost = document.querySelector<HTMLElement>('#editor-host')!;
const readingHost = document.querySelector<HTMLElement>('#reading-host')!;
const statusLeft = document.querySelector<HTMLElement>('#status-left')!;
const statusRight = document.querySelector<HTMLElement>('#status-right')!;
const propertiesPanel = document.querySelector<HTMLElement>('#properties-panel')!;
const linksPanel = document.querySelector<HTMLElement>('#links-panel')!;
const searchPanel = document.querySelector<HTMLElement>('#search-panel')!;
const searchInput = document.querySelector<HTMLInputElement>('#search-input')!;
const searchResults = document.querySelector<HTMLElement>('#search-results')!;

function leafName(path: string): string { return path.split('/').pop() ?? path; }
function stem(path: string): string { return leafName(path).replace(/\.md$/i, ''); }

function renderTree(entries: VaultEntry[], container: HTMLElement): void {
  container.replaceChildren();
  for (const entry of entries) {
    if (entry.kind === 'folder') {
      const details = document.createElement('details');
      details.className = 'tree-folder';
      details.open = !entry.path.startsWith('.');
      const summary = document.createElement('summary');
      summary.textContent = entry.name;
      summary.addEventListener('contextmenu', (event) => resourceMenu(event, entry));
      details.append(summary);
      const children = document.createElement('div');
      children.className = 'tree-children';
      renderTree(entry.children ?? [], children);
      details.append(children);
      container.append(details);
      continue;
    }

    const button = document.createElement('button');
    button.className = `tree-file${entry.path === activeFile ? ' selected' : ''}`;
    button.textContent = entry.name;
    button.dataset.path = entry.path;
    const markdownFile = entry.name.toLowerCase().endsWith('.md');
    if (markdownFile) button.addEventListener('click', () => void openMarkdown(entry.path));
    else button.classList.add('unsupported');
    button.addEventListener('contextmenu', (event) => resourceMenu(event, entry));
    container.append(button);
  }
}

async function resourceMenu(event: MouseEvent, entry: VaultEntry): Promise<void> {
  event.preventDefault();
  const action = window.prompt(`Resource: ${entry.path}\nType R to rename or D to delete.`)?.trim().toLowerCase();
  if (action === 'r') {
    const next = window.prompt('Rename/move to:', entry.path)?.trim();
    if (next && next !== entry.path) await window.ivory.renameResource(entry.path, next);
  } else if (action === 'd' && window.confirm(`Delete ${entry.path}?`)) {
    await window.ivory.deleteResource(entry.path);
    if (tabs.has(entry.path)) closeTab(entry.path);
  }
}

async function setSnapshot(next: VaultSnapshot): Promise<void> {
  snapshot = next;
  vaultName.textContent = next.name;
  renderTree(next.entries, fileTree);
  await rebuildIndex();
}

async function refreshVault(): Promise<void> {
  const next = await window.ivory.getVaultSnapshot();
  if (next) await setSnapshot(next);
}

async function rebuildIndex(): Promise<void> {
  if (!snapshot) return;
  noteIndex.clear();
  const paths = flattenMarkdown(snapshot.entries);
  await Promise.all(paths.map(async (path) => {
    try { noteIndex.set(path, parseNote(path, await window.ivory.readTextFile(path))); } catch { /* external changes may race */ }
  }));
  renderInspector();
}

async function chooseVault(): Promise<void> {
  statusLeft.textContent = 'Opening vault…';
  const result = await window.ivory.chooseVault();
  if (!result) { statusLeft.textContent = 'Ready'; return; }
  tabs.clear();
  activeFile = null;
  await setSnapshot(result);
  renderTabs();
  showWelcome();
  statusLeft.textContent = result.root;
}

function renderTabs(): void {
  tabBar.replaceChildren();
  if (tabs.size === 0) {
    const welcomeTab = document.createElement('div');
    welcomeTab.className = 'tab active welcome-tab';
    welcomeTab.textContent = 'Welcome';
    tabBar.append(welcomeTab);
    return;
  }
  for (const tab of tabs.values()) {
    const element = document.createElement('button');
    element.className = `tab${tab.path === activeFile ? ' active' : ''}`;
    element.title = tab.path;
    const label = document.createElement('span');
    label.textContent = leafName(tab.path);
    const close = document.createElement('span');
    close.className = 'tab-close'; close.textContent = '×';
    close.addEventListener('click', (event) => { event.stopPropagation(); closeTab(tab.path); });
    element.append(label, close);
    element.addEventListener('click', () => void activateTab(tab.path));
    tabBar.append(element);
  }
}

function closeTab(path: string): void {
  tabs.delete(path);
  if (activeFile === path) {
    const next = [...tabs.keys()].at(-1) ?? null;
    activeFile = null;
    if (next) void activateTab(next); else showWelcome();
  }
  renderTabs();
}

async function openMarkdown(relativePath: string): Promise<void> {
  if (!tabs.has(relativePath)) tabs.set(relativePath, { path: relativePath, content: await window.ivory.readTextFile(relativePath), mode: 'source' });
  await activateTab(relativePath);
}

async function activateTab(path: string): Promise<void> {
  const tab = tabs.get(path);
  if (!tab) return;
  activeFile = path;
  welcome.classList.add('hidden');
  renderTabs();
  if (snapshot) renderTree(snapshot.entries, fileTree);
  await showTab(tab);
  renderInspector();
}

async function showTab(tab: OpenTab): Promise<void> {
  editor?.destroy(); editor = null;
  editorHost.replaceChildren(); readingHost.replaceChildren();
  if (tab.mode === 'reading') {
    editorHost.classList.add('hidden'); readingHost.classList.remove('hidden');
    await renderReading(tab);
  } else {
    readingHost.classList.add('hidden'); editorHost.classList.remove('hidden');
    renderEditor(tab);
  }
  statusRight.replaceChildren();
  const toggle = document.createElement('button');
  toggle.className = 'status-button';
  toggle.textContent = tab.mode === 'source' ? 'Source' : 'Reading';
  toggle.title = 'Toggle Source / Reading view';
  toggle.addEventListener('click', async () => {
    tab.mode = tab.mode === 'source' ? 'reading' : 'source';
    if (editor && tab.mode === 'reading') tab.content = editor.state.doc.toString();
    await showTab(tab);
  });
  statusRight.append(toggle);
}

function renderEditor(tab: OpenTab): void {
  editor = new EditorView({
    parent: editorHost,
    state: EditorState.create({
      doc: tab.content,
      extensions: [
        history(), markdown(), keymap.of([...defaultKeymap, ...historyKeymap]), EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          tab.content = update.state.doc.toString();
          statusLeft.textContent = 'Editing…';
          renderInspector(tab.content);
          if (saveTimer !== null) window.clearTimeout(saveTimer);
          const path = tab.path;
          saveTimer = window.setTimeout(async () => {
            await window.ivory.writeTextFile(path, tab.content);
            noteIndex.set(path, parseNote(path, tab.content));
            statusLeft.textContent = 'Saved';
          }, 400);
        }),
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto', fontFamily: 'var(--font-text)' },
          '.cm-content': { maxWidth: '850px', margin: '0 auto', padding: '48px 56px 30vh' },
          '.cm-gutters': { display: 'none' },
          '.cm-activeLine': { background: 'transparent' },
          '&.cm-focused': { outline: 'none' }
        })
      ]
    })
  });
}

async function renderReading(tab: OpenTab): Promise<void> {
  const metadata = parseNote(tab.path, tab.content);
  const source = tab.content.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/, '');
  const withLinks = source.replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_match, target: string, label?: string) => {
    const resolved = resolveWikiLink(target.trim(), noteIndex);
    return resolved ? `[${label || target}](ivory://${encodeURIComponent(resolved)})` : `[[${label || target}]]`;
  });
  const html = await marked.parse(withLinks, { gfm: true, breaks: false });
  readingHost.innerHTML = DOMPurify.sanitize(html);
  readingHost.querySelectorAll<HTMLAnchorElement>('a[href^="ivory://"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      event.preventDefault();
      const target = decodeURIComponent(anchor.getAttribute('href')!.slice('ivory://'.length));
      void openMarkdown(target);
    });
  });
  noteIndex.set(tab.path, metadata);
}

function renderInspector(sourceOverride?: string): void {
  if (!activeFile) return;
  const tab = tabs.get(activeFile);
  const metadata = sourceOverride !== undefined ? parseNote(activeFile, sourceOverride) : (noteIndex.get(activeFile) ?? (tab ? parseNote(activeFile, tab.content) : null));
  if (!metadata) return;

  propertiesPanel.replaceChildren();
  const entries = Object.entries(metadata.frontmatter);
  if (entries.length === 0) propertiesPanel.innerHTML = '<div class="empty-state">No frontmatter properties.</div>';
  for (const [key, value] of entries) {
    const row = document.createElement('div'); row.className = 'property-row';
    const name = document.createElement('span'); name.className = 'property-name'; name.textContent = key;
    const content = document.createElement('span'); content.className = 'property-value'; content.textContent = Array.isArray(value) ? value.join(', ') : String(value ?? '');
    row.append(name, content); propertiesPanel.append(row);
  }

  linksPanel.replaceChildren();
  const section = (title: string, paths: string[]) => {
    const heading = document.createElement('h3'); heading.textContent = title; linksPanel.append(heading);
    if (paths.length === 0) { const empty = document.createElement('div'); empty.className = 'empty-state compact'; empty.textContent = 'None'; linksPanel.append(empty); return; }
    for (const path of paths) {
      const button = document.createElement('button'); button.className = 'link-item'; button.textContent = path;
      const resolved = resolveWikiLink(path, noteIndex) ?? path;
      if (noteIndex.has(resolved)) button.addEventListener('click', () => void openMarkdown(resolved));
      linksPanel.append(button);
    }
  };
  section('Outgoing links', metadata.links);
  const backlinks = [...noteIndex.values()].filter((note) => note.path !== activeFile && note.links.some((target) => resolveWikiLink(target, noteIndex) === activeFile)).map((note) => note.path);
  section('Backlinks', backlinks);
  if (metadata.tags.length) section('Tags', metadata.tags.map((tag) => `#${tag}`));
}

function showWelcome(): void {
  editor?.destroy(); editor = null; activeFile = null;
  editorHost.classList.add('hidden'); readingHost.classList.add('hidden'); welcome.classList.remove('hidden');
  renderTabs();
  propertiesPanel.innerHTML = '<div class="empty-state">Open a note to inspect its properties.</div>';
  linksPanel.innerHTML = '<div class="empty-state">Open a note to inspect its links.</div>';
  statusRight.textContent = 'Markdown';
}

async function createNote(): Promise<void> {
  if (!snapshot) return;
  const name = window.prompt('New note path:', 'Untitled.md')?.trim();
  if (!name) return;
  try { await window.ivory.createMarkdown(name); await refreshVault(); await openMarkdown(name.toLowerCase().endsWith('.md') ? name : `${name}.md`); }
  catch (error) { window.alert(error instanceof Error ? error.message : String(error)); }
}

async function createFolder(): Promise<void> {
  if (!snapshot) return;
  const name = window.prompt('New folder path:', 'New folder')?.trim();
  if (!name) return;
  try { await window.ivory.createFolder(name); await refreshVault(); }
  catch (error) { window.alert(error instanceof Error ? error.message : String(error)); }
}

async function runSearch(): Promise<void> {
  const query = searchInput.value.trim();
  if (!query) { searchResults.replaceChildren(); return; }
  const hits = await window.ivory.searchVault(query);
  renderSearchResults(hits);
}

function renderSearchResults(hits: SearchHit[]): void {
  searchResults.replaceChildren();
  if (hits.length === 0) { searchResults.innerHTML = '<div class="empty-state compact">No results.</div>'; return; }
  for (const hit of hits) {
    const button = document.createElement('button'); button.className = 'search-hit';
    const title = document.createElement('strong'); title.textContent = `${leafName(hit.path)} · ${hit.line}`;
    const preview = document.createElement('span'); preview.textContent = hit.preview;
    button.append(title, preview); button.addEventListener('click', () => void openMarkdown(hit.path)); searchResults.append(button);
  }
}

for (const selector of ['#open-vault', '#open-vault-secondary', '#welcome-open']) document.querySelector(selector)?.addEventListener('click', () => void chooseVault());
document.querySelector('#new-note')?.addEventListener('click', () => void createNote());
document.querySelector('#new-folder')?.addEventListener('click', () => void createFolder());
document.querySelector('#toggle-search')?.addEventListener('click', () => { searchPanel.classList.toggle('hidden'); if (!searchPanel.classList.contains('hidden')) searchInput.focus(); });
let searchTimer: number | null = null;
searchInput.addEventListener('input', () => { if (searchTimer !== null) window.clearTimeout(searchTimer); searchTimer = window.setTimeout(() => void runSearch(), 180); });

document.querySelectorAll<HTMLButtonElement>('.right-tab').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.right-tab').forEach((item) => item.classList.remove('active')); button.classList.add('active');
  const properties = button.dataset.panel === 'properties'; propertiesPanel.classList.toggle('hidden', !properties); linksPanel.classList.toggle('hidden', properties);
}));

window.ivory.onVaultChange((change) => {
  statusLeft.textContent = `Vault: ${change.type} ${change.path}`;
  if (refreshTimer !== null) window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => void refreshVault(), 220);
});
