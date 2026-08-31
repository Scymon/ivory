type MenuAction = { label: string; shortcut?: string; action(): void | Promise<void>; danger?: boolean };
type MenuGroup = { label: string; items: MenuAction[] };

const logo = document.querySelector<HTMLElement>('.mark');
if (!logo) throw new Error('Ivory app menu could not find the logo.');

logo.setAttribute('role', 'button');
logo.setAttribute('tabindex', '0');
logo.setAttribute('aria-label', 'Ivory menu');
logo.setAttribute('aria-expanded', 'false');
logo.title = 'Ivory menu';

const menu = document.createElement('div');
menu.className = 'ivory-app-menu hidden';
menu.setAttribute('role', 'menu');
menu.innerHTML = `<div class="ivory-app-menu-groups"></div><div class="ivory-app-submenu"></div>`;
document.body.append(menu);

const groupsHost = menu.querySelector<HTMLElement>('.ivory-app-menu-groups')!;
const submenu = menu.querySelector<HTMLElement>('.ivory-app-submenu')!;
let openGroup: string | null = null;

function click(selector: string): void {
  document.querySelector<HTMLElement>(selector)?.click();
}

function edit(command: string): void {
  document.execCommand(command);
}

const groups: MenuGroup[] = [
  {
    label: 'File',
    items: [
      { label: 'New note', shortcut: 'Ctrl+N', action: () => click('#new-note') },
      { label: 'New folder', action: () => click('#new-folder') },
      { label: 'Open vault…', shortcut: 'Ctrl+O', action: () => click('#open-vault-secondary') }
    ]
  },
  {
    label: 'Edit',
    items: [
      { label: 'Undo', shortcut: 'Ctrl+Z', action: () => edit('undo') },
      { label: 'Redo', shortcut: 'Ctrl+Y', action: () => edit('redo') },
      { label: 'Cut', shortcut: 'Ctrl+X', action: () => edit('cut') },
      { label: 'Copy', shortcut: 'Ctrl+C', action: () => edit('copy') },
      { label: 'Paste', shortcut: 'Ctrl+V', action: () => edit('paste') },
      { label: 'Select all', shortcut: 'Ctrl+A', action: () => edit('selectAll') }
    ]
  },
  {
    label: 'View',
    items: [
      { label: 'Search vault', shortcut: 'Ctrl+Shift+F', action: () => click('#toggle-search') },
      { label: 'Reload Ivory', shortcut: 'Ctrl+R', action: () => window.location.reload() }
    ]
  },
  {
    label: 'Window',
    items: [
      { label: 'Minimize', action: () => window.ivory.windowControl('minimize') },
      { label: 'Maximize / restore', action: () => window.ivory.windowControl('toggle-maximize') },
      { label: 'Close', shortcut: 'Alt+F4', action: () => window.ivory.windowControl('close'), danger: true }
    ]
  },
  {
    label: 'Help',
    items: [
      { label: 'About Ivory', action: () => window.alert('Ivory\nLocal-first knowledge workspace.') }
    ]
  }
];

function closeMenu(): void {
  menu.classList.add('hidden');
  logo.setAttribute('aria-expanded', 'false');
  openGroup = null;
  submenu.replaceChildren();
  groupsHost.querySelectorAll('.active').forEach(node => node.classList.remove('active'));
}

function renderSubmenu(group: MenuGroup, trigger: HTMLElement): void {
  openGroup = group.label;
  groupsHost.querySelectorAll('.active').forEach(node => node.classList.remove('active'));
  trigger.classList.add('active');
  submenu.replaceChildren();
  submenu.classList.add('visible');

  for (const item of group.items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `ivory-app-menu-item${item.danger ? ' danger' : ''}`;
    const label = document.createElement('span');
    label.textContent = item.label;
    const shortcut = document.createElement('span');
    shortcut.className = 'ivory-app-menu-shortcut';
    shortcut.textContent = item.shortcut ?? '';
    button.append(label, shortcut);
    button.addEventListener('click', async () => {
      closeMenu();
      await item.action();
    });
    submenu.append(button);
  }
}

for (const group of groups) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ivory-app-menu-group';
  button.innerHTML = `<span>${group.label}</span><span class="ivory-app-menu-arrow">›</span>`;
  const open = () => renderSubmenu(group, button);
  button.addEventListener('mouseenter', () => { if (openGroup) open(); });
  button.addEventListener('click', open);
  groupsHost.append(button);
}

function openMenu(): void {
  const rect = logo.getBoundingClientRect();
  menu.style.left = `${Math.max(6, rect.right + 6)}px`;
  menu.style.top = `${Math.max(6, rect.top)}px`;
  menu.classList.remove('hidden');
  logo.setAttribute('aria-expanded', 'true');
  const first = groupsHost.querySelector<HTMLElement>('.ivory-app-menu-group');
  if (first) renderSubmenu(groups[0], first);
}

function toggleMenu(): void {
  if (menu.classList.contains('hidden')) openMenu(); else closeMenu();
}

logo.addEventListener('click', event => { event.stopPropagation(); toggleMenu(); });
logo.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleMenu(); }
  if (event.key === 'Escape') closeMenu();
});

document.addEventListener('pointerdown', event => {
  if (!menu.classList.contains('hidden') && !menu.contains(event.target as Node) && !logo.contains(event.target as Node)) closeMenu();
});
window.addEventListener('blur', closeMenu);
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
