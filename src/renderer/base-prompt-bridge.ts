const toolbar = document.querySelector<HTMLElement>('.bases-toolbar');
if (!toolbar) throw new Error('Base prompt bridge could not find .bases-toolbar.');

let replaying = false;
let queuedResponses: Array<string | null> = [];
const nativePrompt = window.prompt.bind(window);

const overlay = document.createElement('div');
overlay.className = 'bases-modal-backdrop hidden';
overlay.innerHTML = `
  <form class="bases-modal" novalidate>
    <div class="bases-modal-title"></div>
    <div class="bases-modal-description"></div>
    <input class="bases-modal-input" type="text" autocomplete="off" />
    <div class="bases-modal-actions">
      <button type="button" class="bases-modal-cancel">Cancel</button>
      <button type="submit" class="bases-modal-confirm">OK</button>
    </div>
  </form>`;
document.body.append(overlay);

const form = overlay.querySelector<HTMLFormElement>('.bases-modal')!;
const title = overlay.querySelector<HTMLElement>('.bases-modal-title')!;
const description = overlay.querySelector<HTMLElement>('.bases-modal-description')!;
const input = overlay.querySelector<HTMLInputElement>('.bases-modal-input')!;
const cancel = overlay.querySelector<HTMLButtonElement>('.bases-modal-cancel')!;

function ask(label: string, initial = '', detail = ''): Promise<string | null> {
  return new Promise(resolve => {
    title.textContent = label;
    description.textContent = detail;
    description.classList.toggle('hidden', !detail);
    input.value = initial;
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => { input.focus(); input.select(); });

    const finish = (value: string | null) => {
      overlay.classList.add('hidden');
      form.removeEventListener('submit', submit);
      cancel.removeEventListener('click', cancelClick);
      overlay.removeEventListener('pointerdown', backdropClick);
      document.removeEventListener('keydown', keydown, true);
      resolve(value);
    };
    const submit = (event: SubmitEvent) => { event.preventDefault(); finish(input.value); };
    const cancelClick = () => finish(null);
    const backdropClick = (event: PointerEvent) => { if (event.target === overlay) finish(null); };
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); finish(null); } };
    form.addEventListener('submit', submit);
    cancel.addEventListener('click', cancelClick);
    overlay.addEventListener('pointerdown', backdropClick);
    document.addEventListener('keydown', keydown, true);
  });
}

function replay(button: HTMLButtonElement, responses: Array<string | null>): void {
  queuedResponses = [...responses];
  replaying = true;
  const oldPrompt = window.prompt;
  window.prompt = ((_message?: string, _default?: string) => queuedResponses.shift() ?? null) as typeof window.prompt;
  try { button.click(); }
  finally {
    window.prompt = oldPrompt || nativePrompt;
    queuedResponses = [];
    replaying = false;
  }
}

async function handleAction(button: HTMLButtonElement): Promise<void> {
  const action = button.dataset.baseAction;
  if (action === 'add-view') {
    const name = await ask('New view', 'Table', 'Name this Base view.');
    if (name === null || !name.trim()) return;
    replay(button, [name.trim()]);
    return;
  }
  if (action === 'add-property') {
    const property = await ask('New property', '', 'Enter the Markdown property name.');
    if (property === null || !property.trim()) return;
    const display = await ask('Display name', property.trim(), 'Optional label shown in this Base.');
    if (display === null) return;
    replay(button, [property.trim(), display.trim()]);
    return;
  }
  if (action === 'sort') {
    const property = await ask('Sort by property', '', 'Use a visible property name. Leave blank to clear sorting.');
    if (property === null) return;
    if (!property.trim()) { replay(button, ['']); return; }
    const direction = await ask('Sort direction', 'asc', 'Enter asc or desc.');
    if (direction === null) return;
    replay(button, [property.trim(), direction.trim() || 'asc']);
    return;
  }
  if (action === 'group') {
    const property = await ask('Group by property', '', 'Use a visible property name. Leave blank to clear grouping.');
    if (property === null) return;
    replay(button, [property.trim()]);
  }
}

toolbar.addEventListener('click', event => {
  if (replaying) return;
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-base-action]');
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void handleAction(button);
}, true);
