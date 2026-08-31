const fileTree = document.querySelector<HTMLElement>('#file-tree');
if (!fileTree) throw new Error('Open-path bridge could not find #file-tree.');

window.addEventListener('ivory:open-path', event => {
  const path = (event as CustomEvent<{ path?: string }>).detail?.path;
  if (!path) return;
  const leaf = path.split('/').pop() ?? path;
  const buttons = [...fileTree.querySelectorAll<HTMLButtonElement>('.tree-file')];
  const match = buttons.find(button => button.dataset.path === path) ?? buttons.find(button => button.textContent?.trim() === leaf);
  match?.click();
});
