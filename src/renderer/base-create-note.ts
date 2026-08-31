const toolbar = document.querySelector<HTMLElement>('.bases-toolbar');
if (!toolbar) throw new Error('Base note action could not find the Bases toolbar.');

const anchor = toolbar.querySelector<HTMLElement>('[data-base-action="add-view"]');
const button = document.createElement('button');
button.type = 'button';
button.className = 'bases-tool';
button.textContent = '＋ Note';
button.title = 'Create a Markdown note in this vault';
anchor?.insertAdjacentElement('afterend', button);

const overlay = document.createElement('div');
overlay.className = 'bases-modal-backdrop hidden';
overlay.innerHTML = `
  <form class="bases-modal" novalidate>
    <div class="bases-modal-title">New note</div>
    <div class="bases-modal-description">Enter a vault-relative Markdown path.</div>
    <div class="bases-modal-field"><input class="bases-modal-input" type="text" value="Untitled.md" autocomplete="off"></div>
    <div class="bases-modal-actions">
      <button type="button" class="bases-modal-cancel">Cancel</button>
      <button type="submit" class="bases-modal-confirm">Create</button>
    </div>
  </form>`;
document.body.append(overlay);

const form = overlay.querySelector<HTMLFormElement>('form')!;
const input = overlay.querySelector<HTMLInputElement>('input')!;
const cancel = overlay.querySelector<HTMLButtonElement>('.bases-modal-cancel')!;
let open = false;

function close(): void { open = false; overlay.classList.add('hidden'); }
function show(): void {
  open = true;
  input.value = 'Untitled.md';
  overlay.classList.remove('hidden');
  requestAnimationFrame(() => { input.focus(); input.select(); });
}

button.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); show(); });
cancel.addEventListener('click', close);
overlay.addEventListener('pointerdown', event => { if (event.target === overlay) close(); });
document.addEventListener('keydown', event => { if (open && event.key === 'Escape') { event.preventDefault(); close(); } }, true);
form.addEventListener('submit', async event => {
  event.preventDefault();
  const raw = input.value.trim();
  if (!raw) return;
  const path = raw.toLowerCase().endsWith('.md') ? raw : `${raw}.md`;
  const status = document.querySelector<HTMLElement>('#status-left');
  try {
    await window.ivory.createMarkdown(path);
    close();
    if (status) status.textContent = `Created ${path}`;

    // Do not wait for chokidar's awaitWriteFinish cycle before Bases notices
    // a note that Ivory itself just created. This keeps the UI deterministic;
    // the filesystem watcher remains the eventual consistency fallback.
    window.dispatchEvent(new CustomEvent('ivory:base-note-created', { detail: { path } }));
    window.dispatchEvent(new CustomEvent('ivory:vault-changed', { detail: { type: 'add', path, source: 'ivory' } }));

    window.setTimeout(() => window.dispatchEvent(new CustomEvent('ivory:open-path', { detail: { path } })), 0);
  } catch (error) {
    if (status) status.textContent = `Create note failed: ${error instanceof Error ? error.message : String(error)}`;
  }
});
