const tabBar = document.querySelector<HTMLElement>('#tab-bar');
const welcome = document.querySelector<HTMLElement>('#welcome');
const editorHost = document.querySelector<HTMLElement>('#editor-host');
const readingHost = document.querySelector<HTMLElement>('#reading-host');
const propertiesPanel = document.querySelector<HTMLElement>('#properties-panel');
const linksPanel = document.querySelector<HTMLElement>('#links-panel');
const statusRight = document.querySelector<HTMLElement>('#status-right');
if (!tabBar || !welcome || !editorHost || !readingHost) throw new Error('Welcome tab could not find the Ivory workspace.');

const welcomeTab = document.createElement('button');
welcomeTab.type = 'button';
welcomeTab.className = 'tab welcome-tab';
welcomeTab.dataset.tabKind = 'welcome';
welcomeTab.dataset.tabPath = '__ivory_welcome__';
welcomeTab.title = 'Welcome';
welcomeTab.textContent = 'Welcome';

function ensureMounted(): void {
  const other = [...tabBar.querySelectorAll<HTMLElement>('.welcome-tab')].find(tab => tab !== welcomeTab);
  other?.remove();
  if (!welcomeTab.isConnected) tabBar.prepend(welcomeTab);
  else if (tabBar.firstElementChild !== welcomeTab) tabBar.prepend(welcomeTab);
}

function showWelcome(): void {
  ensureMounted();
  document.querySelectorAll<HTMLElement>('#tab-bar .tab').forEach(tab => tab.classList.toggle('active', tab === welcomeTab));
  editorHost.classList.add('hidden');
  readingHost.classList.add('hidden');
  document.querySelector<HTMLElement>('.canvas-host')?.classList.add('hidden');
  document.querySelector<HTMLElement>('.image-viewer-host')?.classList.add('hidden');
  document.querySelector<HTMLElement>('.bases-host')?.classList.add('hidden');
  welcome.classList.remove('hidden');
  if (propertiesPanel) propertiesPanel.innerHTML = '<div class="empty-state">Open a note to inspect its properties.</div>';
  if (linksPanel) linksPanel.innerHTML = '<div class="empty-state">Open a note to inspect its links.</div>';
  if (statusRight) statusRight.textContent = 'Ivory';
}

welcomeTab.addEventListener('click', event => {
  event.preventDefault();
  event.stopPropagation();
  showWelcome();
});

const observer = new MutationObserver(() => ensureMounted());
observer.observe(tabBar, { childList: true });
ensureMounted();

window.addEventListener('ivory:show-welcome', showWelcome);
