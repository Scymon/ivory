import { EditorView } from '@codemirror/view';

const tabBar = document.querySelector<HTMLElement>('#tab-bar');
const fileTree = document.querySelector<HTMLElement>('#file-tree');
const editorHost = document.querySelector<HTMLElement>('#editor-host');
const statusLeft = document.querySelector<HTMLElement>('#status-left');

if (!tabBar || !fileTree || !editorHost || !statusLeft) {
  throw new Error('Document sync could not find the Ivory workspace.');
}

const stalePaths = new Set<string>();
const leafName = (path: string) => path.split('/').pop() ?? path;

function normalize(value: string): string {
  return value.replace(/\\/g, '/').toLocaleLowerCase();
}

function markdownTabPath(element: HTMLElement | null): string | null {
  if (!element) return null;
  const path = element.dataset.tabPath || element.getAttribute('title');
  return path && path.toLowerCase().endsWith('.md') ? path : null;
}

async function resolveTreePath(button: HTMLButtonElement): Promise<string | null> {
  const direct = button.dataset.path;
  if (direct?.toLowerCase().endsWith('.md')) return direct;
  const name = button.textContent?.trim() ?? '';
  if (!name.toLowerCase().endsWith('.md')) return null;
  const snapshot = await window.ivory.getVaultSnapshot();
  if (!snapshot) return null;
  const matches: string[] = [];
  const walk = (entries: typeof snapshot.entries): void => {
    for (const entry of entries) {
      if (entry.kind === 'folder') walk(entry.children ?? []);
      else if (entry.name === name && entry.path.toLowerCase().endsWith('.md')) matches.push(entry.path);
    }
  };
  walk(snapshot.entries);
  return matches[0] ?? null;
}

async function refreshEditorFromDisk(path: string): Promise<void> {
  if (!stalePaths.has(normalize(path))) return;
  // Let the normal tab activation finish constructing the editor first.
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  const cm = editorHost.querySelector<HTMLElement>('.cm-editor');
  if (!cm || editorHost.classList.contains('hidden')) return;
  try {
    const source = await window.ivory.readTextFile(path);
    const view = EditorView.findFromDOM(cm);
    if (view.state.doc.toString() !== source) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: source } });
    }
    stalePaths.delete(normalize(path));
    statusLeft.textContent = `Reloaded ${path}`;
  } catch (error) {
    statusLeft.textContent = `Reload failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}

window.ivory.onVaultChange((change) => {
  if (!change.path.toLowerCase().endsWith('.md')) return;
  stalePaths.add(normalize(change.path));
});

tabBar.addEventListener('click', (event) => {
  const tab = (event.target as HTMLElement).closest<HTMLElement>('.tab');
  const path = markdownTabPath(tab);
  if (path) void refreshEditorFromDisk(path);
});

fileTree.addEventListener('click', async (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.tree-file');
  if (!button) return;
  const path = await resolveTreePath(button);
  if (path) void refreshEditorFromDisk(path);
});
