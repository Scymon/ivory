import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import type { VaultEntry } from '../shared/desktop-api.js';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Ivory root element not found.');

let editor: EditorView | null = null;
let activeFile: string | null = null;
let saveTimer: number | null = null;

app.innerHTML = `
  <main class="ivory-shell">
    <aside class="ribbon" aria-label="Ivory ribbon">
      <div class="mark">I</div>
      <button id="open-vault" class="icon-button" title="Open vault">⌂</button>
      <div class="ribbon-spacer"></div>
      <button class="icon-button" title="Settings" disabled>⚙</button>
    </aside>
    <section class="sidebar">
      <header class="sidebar-header">
        <strong id="vault-name">No vault</strong>
        <button id="open-vault-secondary" class="text-button">Open</button>
      </header>
      <div id="file-tree" class="file-tree">
        <div class="empty-state">Open a local vault to begin.</div>
      </div>
    </section>
    <section class="workspace">
      <header class="tab-bar">
        <div id="active-tab" class="tab active">Welcome</div>
      </header>
      <div class="workspace-body">
        <div id="welcome" class="welcome">
          <div class="welcome-mark">IVORY</div>
          <h1>Your knowledge, locally.</h1>
          <p>Open a vault, choose a Markdown file, and start writing.</p>
          <button id="welcome-open" class="primary-button">Open vault</button>
        </div>
        <div id="editor-host" class="editor-host hidden"></div>
      </div>
      <footer class="status-bar">
        <span id="status-left">Ready</span>
        <span id="status-right">Markdown</span>
      </footer>
    </section>
  </main>
`;

const vaultName = document.querySelector<HTMLElement>('#vault-name')!;
const fileTree = document.querySelector<HTMLElement>('#file-tree')!;
const activeTab = document.querySelector<HTMLElement>('#active-tab')!;
const welcome = document.querySelector<HTMLElement>('#welcome')!;
const editorHost = document.querySelector<HTMLElement>('#editor-host')!;
const statusLeft = document.querySelector<HTMLElement>('#status-left')!;

function renderTree(entries: VaultEntry[], container: HTMLElement): void {
  container.replaceChildren();

  for (const entry of entries) {
    if (entry.kind === 'folder') {
      const details = document.createElement('details');
      details.className = 'tree-folder';
      details.open = true;

      const summary = document.createElement('summary');
      summary.textContent = entry.name;
      details.append(summary);

      const children = document.createElement('div');
      children.className = 'tree-children';
      renderTree(entry.children ?? [], children);
      details.append(children);
      container.append(details);
      continue;
    }

    const button = document.createElement('button');
    button.className = 'tree-file';
    button.textContent = entry.name;
    button.dataset.path = entry.path;
    if (!entry.name.toLowerCase().endsWith('.md')) button.disabled = true;
    button.addEventListener('click', () => openMarkdown(entry.path));
    container.append(button);
  }
}

async function chooseVault(): Promise<void> {
  statusLeft.textContent = 'Opening vault…';
  const result = await window.ivory.chooseVault();
  if (!result) {
    statusLeft.textContent = 'Ready';
    return;
  }

  vaultName.textContent = result.name;
  renderTree(result.entries, fileTree);
  statusLeft.textContent = result.root;
}

async function openMarkdown(relativePath: string): Promise<void> {
  const content = await window.ivory.readTextFile(relativePath);
  activeFile = relativePath;
  activeTab.textContent = relativePath.split('/').pop() ?? relativePath;
  welcome.classList.add('hidden');
  editorHost.classList.remove('hidden');

  editor?.destroy();
  editorHost.replaceChildren();

  editor = new EditorView({
    parent: editorHost,
    state: EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        history(),
        markdown(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (!update.docChanged || !activeFile) return;
          statusLeft.textContent = 'Editing…';
          if (saveTimer !== null) window.clearTimeout(saveTimer);
          const path = activeFile;
          const next = update.state.doc.toString();
          saveTimer = window.setTimeout(async () => {
            await window.ivory.writeTextFile(path, next);
            statusLeft.textContent = 'Saved';
          }, 450);
        }),
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto', fontFamily: 'var(--font-text)' },
          '.cm-content': { maxWidth: '820px', margin: '0 auto', padding: '48px 56px 30vh' },
          '.cm-gutters': { background: 'transparent', border: 'none', color: 'var(--text-faint)' },
          '.cm-activeLine, .cm-activeLineGutter': { background: 'transparent' },
          '&.cm-focused': { outline: 'none' }
        })
      ]
    })
  });
}

for (const selector of ['#open-vault', '#open-vault-secondary', '#welcome-open']) {
  document.querySelector(selector)?.addEventListener('click', chooseVault);
}
