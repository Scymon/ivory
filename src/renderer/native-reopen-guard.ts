import { activateIvoryTab } from './tab-system.js';

const fileTree = document.querySelector<HTMLElement>('#file-tree');
const tabBar = document.querySelector<HTMLElement>('#tab-bar');

if (!fileTree || !tabBar) throw new Error('Native reopen guard could not find Ivory navigation.');

const leafName = (path: string) => path.split('/').pop() ?? path;

fileTree.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.tree-file');
  if (!button) return;

  const name = button.textContent?.trim() ?? '';
  if (!/\.(canvas|base)$/i.test(name)) return;

  const existing = [...tabBar.querySelectorAll<HTMLElement>('.tab')].find((tab) => {
    const kind = tab.dataset.tabKind;
    if (kind !== 'canvas' && kind !== 'base' && !tab.classList.contains('canvas-tab')) return false;
    const path = tab.dataset.tabPath || tab.getAttribute('title') || '';
    return leafName(path) === name;
  });

  if (!existing) return;

  const path = existing.dataset.tabPath || existing.getAttribute('title');
  if (!path) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  void activateIvoryTab(path);
}, true);
