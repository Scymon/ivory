export type IvoryTabKind = 'markdown' | 'canvas' | 'image' | 'base' | 'welcome';

export interface IvoryTabRegistration {
  path: string;
  label?: string;
  kind: IvoryTabKind;
  activate(): void | Promise<void>;
  close?(): void | Promise<void>;
}

interface TabRecord extends IvoryTabRegistration {
  element: HTMLButtonElement;
}

const tabBar = document.querySelector<HTMLElement>('#tab-bar');
if (!tabBar) throw new Error('Ivory tab system could not find #tab-bar.');

const records = new Map<string, TabRecord>();
const persistentLegacy = new Set<HTMLElement>();
let activePath: string | null = null;
let normalizing = false;

const leafName = (path: string) => path.split('/').pop() ?? path;

function setOnlyActive(element: HTMLElement | null): void {
  tabBar.querySelectorAll<HTMLElement>('.tab').forEach(tab => tab.classList.toggle('active', tab === element));
}

function legacyPath(element: HTMLElement): string | null {
  return element.dataset.tabPath || element.getAttribute('title') || null;
}

function rememberLegacyNativeTabs(): void {
  tabBar.querySelectorAll<HTMLElement>('.canvas-tab, .image-viewer-tab, [data-tab-kind="base"], [data-tab-kind="image"], [data-tab-kind="canvas"]').forEach(tab => {
    persistentLegacy.add(tab);
  });
}

function restoreDetachedTabs(): void {
  for (const record of records.values()) {
    if (!record.element.isConnected) tabBar.append(record.element);
  }
  for (const tab of [...persistentLegacy]) {
    if (!tab.isConnected && !records.has(legacyPath(tab) ?? '')) tabBar.append(tab);
  }
}

function normalizeLegacyTabs(): void {
  if (normalizing) return;
  normalizing = true;
  try {
    rememberLegacyNativeTabs();
    restoreDetachedTabs();
    const seen = new Map<string, HTMLElement>();
    for (const tab of [...tabBar.querySelectorAll<HTMLElement>('.tab')]) {
      if (tab.classList.contains('welcome-tab')) continue;
      const path = legacyPath(tab);
      if (!path) continue;
      tab.dataset.tabPath = path;
      const existing = seen.get(path);
      if (existing && existing !== tab) {
        const registered = records.get(path);
        const keep = registered?.element ?? existing;
        const discard = keep === existing ? tab : existing;
        if (discard.classList.contains('active')) keep.classList.add('active');
        discard.remove();
        seen.set(path, keep);
        continue;
      }
      seen.set(path, tab);
    }
    restoreDetachedTabs();
    const active = tabBar.querySelector<HTMLElement>('.tab.active:not(.welcome-tab)');
    if (active) {
      activePath = legacyPath(active);
      setOnlyActive(active);
    }
  } finally {
    normalizing = false;
  }
}

const observer = new MutationObserver(normalizeLegacyTabs);
observer.observe(tabBar, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'title'] });
normalizeLegacyTabs();

export function registerIvoryTab(registration: IvoryTabRegistration): void {
  const old = records.get(registration.path);
  if (old) {
    Object.assign(old, registration);
    const label = old.element.querySelector<HTMLElement>('.ivory-tab-label') ?? old.element.firstElementChild as HTMLElement | null;
    if (label) label.textContent = registration.label ?? leafName(registration.path);
    old.element.dataset.tabKind = registration.kind;
    return;
  }

  const existing = [...tabBar.querySelectorAll<HTMLButtonElement>('.tab')].find(tab => legacyPath(tab) === registration.path);
  const element = existing ?? document.createElement('button');
  element.classList.add('tab');
  element.dataset.tabPath = registration.path;
  element.dataset.tabKind = registration.kind;
  element.title = registration.path;

  if (!existing) {
    const label = document.createElement('span');
    label.className = 'ivory-tab-label';
    label.textContent = registration.label ?? leafName(registration.path);
    const close = document.createElement('span');
    close.className = 'tab-close';
    close.textContent = '×';
    close.addEventListener('click', event => {
      event.stopPropagation();
      void closeIvoryTab(registration.path);
    });
    element.append(label, close);
    tabBar.append(element);
  } else {
    const first = element.firstElementChild as HTMLElement | null;
    if (first) first.classList.add('ivory-tab-label');
    persistentLegacy.delete(element);
  }

  element.addEventListener('click', () => void activateIvoryTab(registration.path));
  records.set(registration.path, { ...registration, element });
  normalizeLegacyTabs();
}

export async function activateIvoryTab(path: string): Promise<void> {
  const record = records.get(path);
  if (!record) {
    const existing = [...tabBar.querySelectorAll<HTMLElement>('.tab')].find(tab => legacyPath(tab) === path);
    if (existing) {
      activePath = path;
      setOnlyActive(existing);
      existing.click();
    }
    return;
  }
  activePath = path;
  setOnlyActive(record.element);
  await record.activate();
  window.dispatchEvent(new CustomEvent('ivory:tab-activated', { detail: { path, kind: record.kind } }));
}

export async function closeIvoryTab(path: string): Promise<void> {
  const record = records.get(path);
  if (!record) return;
  const wasActive = activePath === path;
  if (record.close) await record.close();
  persistentLegacy.delete(record.element);
  record.element.remove();
  records.delete(path);
  if (!wasActive) return;
  activePath = null;
  const next = [...records.values()].at(-1);
  if (next) await activateIvoryTab(next.path);
  else {
    const legacy = [...tabBar.querySelectorAll<HTMLElement>('.tab:not(.welcome-tab)')].at(-1);
    if (legacy) legacy.click();
    else window.dispatchEvent(new CustomEvent('ivory:show-welcome'));
  }
}

export function activeIvoryTabPath(): string | null {
  return activePath;
}

export function syncIvoryTabs(): void {
  normalizeLegacyTabs();
}
