const toolbar = document.querySelector<HTMLElement>('.bases-toolbar');
const host = document.querySelector<HTMLElement>('.bases-host');
if (!toolbar || !host) throw new Error('Base prompt bridge could not find the Bases surface.');

let replaying = false;
let queuedResponses: Array<string | null> = [];
const nativePrompt = window.prompt.bind(window);

const overlay = document.createElement('div');
overlay.className = 'bases-modal-backdrop hidden';
overlay.innerHTML = `
  <form class="bases-modal" novalidate>
    <div class="bases-modal-title"></div>
    <div class="bases-modal-description"></div>
    <div class="bases-modal-field"></div>
    <div class="bases-modal-actions">
      <button type="button" class="bases-modal-cancel">Cancel</button>
      <button type="submit" class="bases-modal-confirm">OK</button>
    </div>
  </form>`;
document.body.append(overlay);
const menu = document.createElement('div'); menu.className = 'bases-popover hidden'; document.body.append(menu);
const form = overlay.querySelector<HTMLFormElement>('.bases-modal')!;
const title = overlay.querySelector<HTMLElement>('.bases-modal-title')!;
const description = overlay.querySelector<HTMLElement>('.bases-modal-description')!;
const field = overlay.querySelector<HTMLElement>('.bases-modal-field')!;
const cancel = overlay.querySelector<HTMLButtonElement>('.bases-modal-cancel')!;
type Choice = { value: string; label: string };

function modalValue(label: string, initial = '', detail = '', choices?: Choice[]): Promise<string | null> {
  return new Promise(resolve => {
    title.textContent = label; description.textContent = detail; description.classList.toggle('hidden', !detail); field.replaceChildren();
    let control: HTMLInputElement | HTMLSelectElement;
    if (choices?.length) { const select = document.createElement('select'); select.className = 'bases-modal-select'; for (const choice of choices) { const option = document.createElement('option'); option.value = choice.value; option.textContent = choice.label; select.append(option); } select.value = choices.some(choice => choice.value === initial) ? initial : choices[0].value; control = select; }
    else { const input = document.createElement('input'); input.className = 'bases-modal-input'; input.type = 'text'; input.autocomplete = 'off'; input.value = initial; control = input; }
    field.append(control); overlay.classList.remove('hidden'); requestAnimationFrame(() => { control.focus(); if (control instanceof HTMLInputElement) control.select(); });
    const finish = (value: string | null) => { overlay.classList.add('hidden'); form.removeEventListener('submit', submit); cancel.removeEventListener('click', cancelClick); overlay.removeEventListener('pointerdown', backdropClick); document.removeEventListener('keydown', keydown, true); resolve(value); };
    const submit = (event: SubmitEvent) => { event.preventDefault(); finish(control.value); }; const cancelClick = () => finish(null); const backdropClick = (event: PointerEvent) => { if (event.target === overlay) finish(null); }; const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); finish(null); } };
    form.addEventListener('submit', submit); cancel.addEventListener('click', cancelClick); overlay.addEventListener('pointerdown', backdropClick); document.addEventListener('keydown', keydown, true);
  });
}
function visibleColumns(): Choice[] { return [...host.querySelectorAll<HTMLButtonElement>('.bases-column-header')].map(button => ({ value: button.textContent?.replace(/[↑↓]$/, '').trim() ?? '', label: button.textContent?.replace(/[↑↓]$/, '').trim() ?? '' })).filter(choice => choice.value); }
function replayClick(button: HTMLButtonElement, responses: Array<string | null>): void { queuedResponses = [...responses]; replaying = true; const oldPrompt = window.prompt; window.prompt = ((_message?: string, _default?: string) => queuedResponses.shift() ?? null) as typeof window.prompt; try { button.click(); } finally { window.prompt = oldPrompt || nativePrompt; queuedResponses = []; replaying = false; } }
function replayContext(target: HTMLElement, responses: Array<string | null>): void { queuedResponses = [...responses]; replaying = true; const oldPrompt = window.prompt; window.prompt = ((_message?: string, _default?: string) => queuedResponses.shift() ?? null) as typeof window.prompt; try { target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 })); } finally { window.prompt = oldPrompt || nativePrompt; queuedResponses = []; replaying = false; } }
async function handleAction(button: HTMLButtonElement): Promise<void> {
  const action = button.dataset.baseAction;
  if (action === 'add-view') { const type = await modalValue('View type', 'table', 'Choose how this Base should display its notes.', [{ value: 'table', label: 'Table' }, { value: 'card', label: 'Card' }, { value: 'list', label: 'List' }]); if (type === null) return; const defaultName = type === 'card' ? 'Cards' : type === 'list' ? 'List' : 'Table'; const name = await modalValue('New view', defaultName, 'Name this Base view.'); if (name === null || !name.trim()) return; replayClick(button, [name.trim(), type]); return; }
  if (action === 'add-property') { const property = await modalValue('New property', '', 'Enter the Markdown property name.'); if (property === null || !property.trim()) return; const display = await modalValue('Display name', property.trim(), 'Optional label shown in this Base.'); if (display === null) return; replayClick(button, [property.trim(), display.trim()]); return; }
  if (action === 'sort') { const choices = [{ value: '', label: 'No sorting' }, ...visibleColumns()]; const property = await modalValue('Sort rows', '', 'Choose a visible column.', choices); if (property === null) return; if (!property) { replayClick(button, ['']); return; } const direction = await modalValue('Sort direction', 'asc', '', [{ value: 'asc', label: 'Ascending' }, { value: 'desc', label: 'Descending' }]); if (direction === null) return; replayClick(button, [property, direction]); return; }
  if (action === 'group') { const choices = [{ value: '', label: 'No grouping' }, ...visibleColumns()]; const property = await modalValue('Group rows', '', 'Choose a visible column.', choices); if (property === null) return; replayClick(button, [property]); }
}
function closeMenu(): void { menu.classList.add('hidden'); menu.replaceChildren(); }
function openMenu(x: number, y: number, items: Array<{ label: string; danger?: boolean; run(): void | Promise<void> }>): void { menu.replaceChildren(); for (const item of items) { const button = document.createElement('button'); button.type = 'button'; button.className = `bases-popover-item${item.danger ? ' danger' : ''}`; button.textContent = item.label; button.addEventListener('click', () => { closeMenu(); void item.run(); }); menu.append(button); } menu.style.left = `${x}px`; menu.style.top = `${y}px`; menu.classList.remove('hidden'); const rect = menu.getBoundingClientRect(); if (rect.right > window.innerWidth - 6) menu.style.left = `${Math.max(6, window.innerWidth - rect.width - 6)}px`; if (rect.bottom > window.innerHeight - 6) menu.style.top = `${Math.max(6, window.innerHeight - rect.height - 6)}px`; }
toolbar.addEventListener('click', event => { if (replaying) return; const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-base-action]'); if (!button) return; event.preventDefault(); event.stopImmediatePropagation(); void handleAction(button); }, true);
host.addEventListener('contextmenu', event => { if (replaying) return; const view = (event.target as HTMLElement).closest<HTMLButtonElement>('.bases-view-tab'); if (view) { event.preventDefault(); event.stopImmediatePropagation(); openMenu(event.clientX, event.clientY, [{ label: 'Rename view…', run: async () => { const name = await modalValue('Rename view', view.textContent?.trim() || 'Table'); if (name?.trim()) replayContext(view, ['r', name.trim()]); } }, { label: 'Delete view', danger: true, run: () => replayContext(view, ['d']) }]); return; } const column = (event.target as HTMLElement).closest<HTMLButtonElement>('.bases-column-header'); if (column) { event.preventDefault(); event.stopImmediatePropagation(); openMenu(event.clientX, event.clientY, [{ label: 'Rename display…', run: async () => { const name = await modalValue('Column display name', column.textContent?.replace(/[↑↓]$/, '').trim() || ''); if (name?.trim()) replayContext(column, ['r', name.trim()]); } }, { label: 'Hide column', run: () => replayContext(column, ['h']) }]); } }, true);
document.addEventListener('pointerdown', event => { if (!menu.classList.contains('hidden') && !menu.contains(event.target as Node)) closeMenu(); }, true); window.addEventListener('blur', closeMenu); document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
