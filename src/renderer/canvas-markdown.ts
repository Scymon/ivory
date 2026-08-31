import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { ivoryLivePreview } from './live-preview.js';

const editors = new WeakMap<HTMLTextAreaElement, EditorView>();
const IMAGE_OR_FILE = /\.[a-z0-9]{2,5}$/i;

const leafName = (path: string) => path.split('/').pop() ?? path;

async function flattenVaultFiles(): Promise<string[]> {
  const snapshot = await window.ivory.getVaultSnapshot();
  if (!snapshot) return [];
  const result: string[] = [];
  const walk = (entries: typeof snapshot.entries) => {
    for (const entry of entries) {
      if (entry.kind === 'folder') walk(entry.children ?? []);
      else result.push(entry.path);
    }
  };
  walk(snapshot.entries);
  return result;
}

async function resolveResource(target: string): Promise<string | null> {
  const files = await flattenVaultFiles();
  const clean = target.split('#')[0].replace(/\\/g, '/').replace(/^\.\//, '');
  const normalized = clean.toLowerCase();
  const withMd = IMAGE_OR_FILE.test(clean) ? clean : `${clean}.md`;
  return files.find((file) => file.toLowerCase() === normalized)
    ?? files.find((file) => file.toLowerCase() === withMd.toLowerCase())
    ?? files.find((file) => leafName(file).toLowerCase() === leafName(clean).toLowerCase())
    ?? files.find((file) => leafName(file).toLowerCase() === leafName(withMd).toLowerCase())
    ?? null;
}

async function resolveAsset(target: string): Promise<string | null> {
  const path = await resolveResource(target);
  return path ? window.ivory.getAssetUrl(path) : null;
}

async function readNote(target: string): Promise<string | null> {
  const path = await resolveResource(target);
  if (!path?.toLowerCase().endsWith('.md')) return null;
  try { return await window.ivory.readTextFile(path); } catch { return null; }
}

function openWikiLink(target: string): void {
  void resolveResource(target).then((path) => {
    if (!path) return;
    const name = leafName(path);
    const button = [...document.querySelectorAll<HTMLButtonElement>('.tree-file')]
      .find((item) => item.textContent?.trim() === name);
    button?.click();
  });
}

function enhance(textarea: HTMLTextAreaElement): void {
  if (editors.has(textarea) || textarea.dataset.ivoryCanvasEnhanced === 'true') return;
  textarea.dataset.ivoryCanvasEnhanced = 'true';

  const host = document.createElement('div');
  host.className = 'canvas-markdown-editor';
  textarea.insertAdjacentElement('afterend', host);
  textarea.classList.add('canvas-source-proxy');

  const editor = new EditorView({
    parent: host,
    state: EditorState.create({
      doc: textarea.value,
      extensions: [
        history(),
        markdown(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.lineWrapping,
        ivoryLivePreview({ openWikiLink, resolveAsset, readNote }),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          textarea.value = update.state.doc.toString();
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }),
        EditorView.theme({
          '&': { height: '100%', background: 'transparent' },
          '.cm-scroller': { overflow: 'auto', fontFamily: 'var(--font-text)' },
          '.cm-content': { padding: '0', minHeight: '100%' },
          '.cm-gutters': { display: 'none' },
          '.cm-activeLine': { background: 'transparent' },
          '&.cm-focused': { outline: 'none' }
        })
      ]
    })
  });
  editors.set(textarea, editor);
}

function scan(): void {
  document.querySelectorAll<HTMLTextAreaElement>('.canvas-node-text textarea').forEach(enhance);
}

const observer = new MutationObserver(scan);
observer.observe(document.body, { childList: true, subtree: true });
scan();
