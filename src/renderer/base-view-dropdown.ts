const host = document.querySelector<HTMLElement>('.bases-host');
const toolbar = document.querySelector<HTMLElement>('.bases-toolbar');
const legacyTabs = document.querySelector<HTMLElement>('.bases-view-tabs');
if (!host || !toolbar || !legacyTabs) throw new Error('Base view dropdown could not find the Bases toolbar.');

const wrap = document.createElement('div');
wrap.className = 'bases-view-selector';
wrap.innerHTML = `
  <button type="button" class="bases-view-trigger" aria-haspopup="menu" aria-expanded="false">
    <span class="bases-view-icon">▦</span>
    <span class="bases-view-current">View</span>
    <span class="bases-view-chevron">⌄</span>
  </button>
  <div class="bases-view-menu hidden" role="menu"></div>`;
legacyTabs.insertAdjacentElement('beforebegin', wrap);
legacyTabs.classList.add('bases-view-tabs-hidden');

const trigger = wrap.querySelector<HTMLButtonElement>('.bases-view-trigger')!;
const current = wrap.querySelector<HTMLElement>('.bases-view-current')!;
const icon = wrap.querySelector<HTMLElement>('.bases-view-icon')!;
const menu = wrap.querySelector<HTMLElement>('.bases-view-menu')!;

const iconFor = (type: string) => type === 'card' ? '▦' : type === 'list' ? '☷' : '▤';

function legacyButtons(): HTMLButtonElement[] {
  return [...legacyTabs.querySelectorAll<HTMLButtonElement>('.bases-view-tab')];
}

function syncTrigger(): void {
  const buttons = legacyButtons();
  const active = buttons.find(button => button.classList.contains('active')) ?? buttons[0];
  if (!active) {
    current.textContent = 'View';
    icon.textContent = '▤';
    return;
  }
  current.textContent = active.textContent?.trim() || 'View';
  icon.textContent = iconFor(active.dataset.viewType || 'table');
}

function closeMenu(): void {
  menu.classList.add('hidden');
  trigger.setAttribute('aria-expanded', 'false');
}

function openMenu(): void {
  menu.replaceChildren();
  const buttons = legacyButtons();
  for (const source of buttons) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `bases-view-option${source.classList.contains('active') ? ' active' : ''}`;
    item.setAttribute('role', 'menuitem');
    item.innerHTML = `<span class="bases-view-option-icon">${iconFor(source.dataset.viewType || 'table')}</span><span class="bases-view-option-label"></span><span class="bases-view-option-check">${source.classList.contains('active') ? '✓' : ''}</span>`;
    item.querySelector<HTMLElement>('.bases-view-option-label')!.textContent = source.textContent?.trim() || 'View';
    item.addEventListener('click', () => {
      closeMenu();
      source.click();
      queueMicrotask(syncTrigger);
    });
    item.addEventListener('contextmenu', event => {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      source.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, clientX: event.clientX, clientY: event.clientY }));
    });
    menu.append(item);
  }
  if (!buttons.length) {
    const empty = document.createElement('div');
    empty.className = 'bases-view-menu-empty';
    empty.textContent = 'No views';
    menu.append(empty);
  }
  menu.classList.remove('hidden');
  trigger.setAttribute('aria-expanded', 'true');
}

trigger.addEventListener('click', event => {
  event.preventDefault();
  event.stopPropagation();
  if (menu.classList.contains('hidden')) openMenu();
  else closeMenu();
});

document.addEventListener('pointerdown', event => {
  if (!wrap.contains(event.target as Node)) closeMenu();
}, true);
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
window.addEventListener('blur', closeMenu);

const observer = new MutationObserver(() => syncTrigger());
observer.observe(legacyTabs, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-view-type'] });
syncTrigger();
