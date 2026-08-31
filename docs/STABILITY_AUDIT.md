# Ivory Stability & Performance Audit

Status: active hardening pass

## Critical findings

### 1. Renderer modules were not true singletons

Previously each renderer feature was built as an independent esbuild bundle. Shared modules such as `tab-system.ts` and `workspace-router.ts` could therefore be bundled more than once, producing separate module-level state while manipulating the same DOM.

Symptoms:
- tabs disappearing or being recreated
- repeated activation paths
- multiple observers/listeners acting on the same workspace
- behavior degrading over time rather than failing immediately

Fix:
- all renderer entry points now compile in one esbuild graph
- ESM code splitting shares common chunks
- stateful shared modules now execute once per renderer process

Rule going forward:
> Any module that owns application state must exist in one renderer graph and must not be independently bundled into multiple copies.

---

### 2. Tab MutationObserver was too broad

The shared tab system observed child changes plus `class` and `title` attribute mutations. Active-tab switching itself changes classes, causing the observer to wake up for ordinary selection operations.

Fix:
- observer now watches structural child changes only
- normalization is microtask-coalesced
- class writes are skipped when the class is already correct

Rule:
> Observers watch the smallest mutation surface necessary.

---

### 3. Vault snapshots were rescanning the directory tree on content edits

`getVaultSnapshot()` previously rebuilt the complete directory tree every time it was called, even when only the contents of an existing Markdown file changed.

Fix:
- main process now caches the vault structure
- normal `change` events do not invalidate the structure cache
- add/remove/rename/folder changes invalidate it
- search reuses the cached structure

Rule:
> File content changes and vault structure changes are different event classes.

---

### 4. New Base notes waited on filesystem watcher latency

A note created from a Base existed on disk before the Base row index necessarily refreshed. The UI therefore depended on Chokidar's `awaitWriteFinish` delay.

Fix:
- `+ Note` now dispatches an immediate internal structural-change event after successful creation
- filesystem watching remains the eventual consistency fallback

Rule:
> Operations initiated by Ivory update Ivory state synchronously after the write succeeds; watchers are for external changes and reconciliation.

---

## High-priority remaining work

### A. Consolidate Markdown metadata indexing

Current problem:
- the Markdown editor owns a `noteIndex`
- Bases independently scans and parses Markdown files
- vault-change handling can therefore reread the same notes multiple times

Target architecture:

```
filesystem
   ↓
vault change bus
   ↓
metadata index (one owner)
   ↓
Markdown / Bases / Links / Search / future plugins
```

Required behavior:
- initial vault open: build metadata index once
- `.md` content change: reread and reparse only that path
- `.md` add: insert one record
- `.md` delete: remove one record
- rename: move one record
- consumers subscribe to index changes instead of rescanning the vault

---

### B. Finish migration away from legacy tab ownership

Current mixed ownership still exists:
- Markdown has legacy `renderTabs()` behavior
- Canvas still has local `canvasTab` ownership
- shared `tab-system.ts` currently normalizes around legacy code

Target:
- `tab-system.ts` is the only module that creates/removes/activates tabs
- every surface registers `{path, kind, activate, close}`
- no feature directly clears or rebuilds `#tab-bar`
- remove legacy normalization and reopen guard once migration is complete

---

### C. One workspace surface controller

Target:
- one controller owns which surface is visible
- Markdown, Canvas, Image, Base expose lifecycle methods only
- feature modules do not independently hide each other's DOM

Desired state:

```
workspace.activate({ kind, path })
```

rather than each feature manually calling `classList.add('hidden')` on other features.

---

### D. Incremental Base rendering

Current Base rendering frequently rebuilds complete DOM collections.

Optimize after metadata index consolidation:
- update one affected row when one note changes
- preserve scroll position and focused cell
- avoid full `replaceChildren()` when only a value changed
- cancel/sequence async refreshes so stale rebuilds cannot overwrite newer state

---

### E. Remove prompt replay bridge

`base-prompt-bridge.ts` currently replays legacy Base handlers by temporarily replacing `window.prompt`.

It works as a compatibility bridge but should not be permanent.

Target:
- Base functions accept explicit values
- native Ivory modal calls those functions directly
- no monkey-patching `window.prompt`

---

## Performance rules

1. One owner for each kind of state.
2. No full-vault scan for a single-file content edit.
3. No full tab-bar rebuild for a single tab activation.
4. No watcher used as the primary response to an operation Ivory initiated itself.
5. Async rebuilds must be coalesced or versioned so older work cannot overwrite newer state.
6. Shared parsing/rendering engines are reused rather than reimplemented per surface.
7. DOM replacement is reserved for structural changes; value changes should be incremental.
8. Feature modules do not directly manipulate unrelated feature surfaces.

## Hardening order

1. Shared renderer singleton build — DONE
2. Reduce tab observer churn — DONE
3. Cache vault structure — DONE
4. Immediate Base note refresh signal — DONE
5. Shared incremental metadata index — NEXT
6. Migrate Markdown tabs to shared tab system
7. Migrate Canvas tabs to shared tab system
8. Remove reopen/normalization compatibility layers
9. Centralize workspace lifecycle
10. Incremental Base row rendering
