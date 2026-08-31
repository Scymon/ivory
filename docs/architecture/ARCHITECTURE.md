# Ivory Architecture Contract

## Purpose

This document defines the high-level boundaries of Ivory. It is a contract: implementations may change, but these boundaries should not change casually.

## Primary rule

**Ivory is independently implemented. No part of Ivory Core depends on Obsidian internals. Obsidian compatibility exists only through an adapter boundary.**

## Locked application stack

Ivory Desktop uses:

- **Electron** as the desktop application shell;
- **Chromium** as the renderer/runtime environment;
- **TypeScript** as the primary application and plugin/API language;
- **Vanilla DOM/CSS** for the main application UI layer rather than React or another large component framework;
- **CodeMirror 6** as the Markdown editor engine.

These are deliberate architectural choices, not placeholders. Electron/Chromium/TypeScript keep Ivory in a JavaScript/DOM environment suited to the V0 desktop-parity goal and later Obsidian plugin compatibility. A lean DOM/CSS UI layer keeps the application close to the browser platform and avoids introducing a framework abstraction that is not required by the product. CodeMirror 6 provides the editor substrate on which Ivory will independently implement its Markdown authoring behavior, including Source-style editing, Live Preview-style editing, editor extensions, and interactive Markdown features.

A future change away from this locked stack is an architecture change and must be explicitly documented rather than introduced incrementally.

## UI layer rule

Ivory's primary UI should be built with TypeScript, DOM APIs, and CSS, using small internal abstractions only where they reduce repetition or clarify lifecycle/state ownership.

Do not introduce React, Vue, Svelte, or another full UI framework into the core desktop renderer merely for convenience. If a future feature or isolated surface has a compelling reason to use another rendering library, it must remain bounded and must not redefine the application architecture.

The goal is not to imitate Obsidian's private implementation, but to remain architecturally lean and close to the same general Electron/Chromium/DOM environment that plugin authors interact with.

## Editor boundary

CodeMirror 6 is an implementation engine, not Ivory's public editor contract.

Ivory should expose its own editor abstractions so that Core, workspace behavior, native plugins, and compatibility adapters do not casually depend on private CodeMirror implementation details.

```text
Markdown file
     |
Ivory Editor API
     |
Ivory Markdown behavior
     |
CodeMirror 6
```

The Ivory Markdown layer may use CodeMirror extensions for syntax parsing, decorations, widgets, selections, transactions, keymaps, and other editing behavior.

V0 editor work includes the independently implemented behavior needed for the pinned Obsidian parity target, such as:

- Markdown source editing;
- Live Preview-style editing;
- Reading/rendered view integration;
- selection-aware syntax presentation;
- wikilinks and internal links;
- embeds;
- callouts;
- Properties/frontmatter interaction;
- Markdown tables;
- task/checkbox interaction;
- code and code blocks;
- math;
- images/media and relevant interactions;
- editor extension points required by Ivory-native plugins and supported compatibility behavior.

Obsidian compatibility adapters may translate expected editor-facing behavior into Ivory's editor APIs and CodeMirror-backed capabilities, but Obsidian-shaped editor contracts must remain outside Ivory Core.

## Electron process boundary

Ivory should maintain a clear Electron process model:

```text
Electron Main Process
|
+-- application lifecycle
+-- native windows
+-- filesystem / OS capabilities
+-- native menus / dialogs
+-- IPC coordination
|
+-- secure preload / bridge
        |
        +-- documented Ivory desktop capabilities
                |
                v
Chromium Renderer
|
+-- Vanilla TypeScript / DOM / CSS UI
+-- Ivory UI / Workspace
+-- CodeMirror-backed Editor
+-- Canvas
+-- Bases
+-- Graph
+-- Search / navigation surfaces
+-- Plugin-facing UI runtime where permitted
```

Renderer code must not gain unrestricted Node.js/OS access merely for convenience. Native capabilities should cross a deliberate bridge so that later plugin execution and security boundaries remain tractable.

## Major layers

```text
Ivory Desktop Application (Electron)
|
+-- Desktop / Native Layer
|   +-- lifecycle
|   +-- windows
|   +-- OS integration
|   +-- native filesystem capabilities
|   +-- IPC / preload bridge
|
+-- UI / Workspace (Chromium renderer)
|   +-- vanilla TypeScript / DOM / CSS
|   +-- panes
|   +-- tabs
|   +-- views
|   +-- menus
|   +-- commands
|
+-- Ivory Core
|   +-- documents/resources
|   +-- entities
|   +-- types
|   +-- properties
|   +-- relations
|   +-- metadata
|   +-- search/query
|   +-- events
|
+-- Vault / Storage
|   +-- filesystem resources
|   +-- Markdown
|   +-- folders
|   +-- attachments
|   +-- persistence
|   +-- file watching
|
+-- Editor
|   +-- Ivory Editor API
|   +-- Markdown behavior
|   +-- CodeMirror 6 engine
|   +-- rendered views
|   +-- editor extensions
|
+-- Ivory Native Plugin API
|
+-- Compatibility Boundary
|   +-- Obsidian API adapters
|
+-- Plugin Runtime
```

## Ownership rules

### Desktop layer owns native capability

Electron Main and explicitly exposed bridge APIs own OS-level access. Renderer/UI code should request native operations through documented desktop interfaces rather than reaching directly into Electron/Node internals.

### Storage owns persistence

Core components do not directly manipulate the operating-system filesystem. Storage exposes explicit resource operations.

### Core owns meaning

Storage can know that a file exists. Core and metadata systems determine what that resource represents, its properties, its relationships, and how it participates in Ivory's knowledge model.

### Workspace owns presentation state

Core knowledge does not depend on whether a resource is displayed in a tab, pane, window, canvas, or another view.

### Editor owns editing behavior

CodeMirror 6 powers editing, but the knowledge model must not depend directly on CodeMirror internals. Ivory owns the editor behavior and public editor contract.

### Plugin APIs own extension boundaries

Plugins interact with documented interfaces. Internal classes are not automatically public plugin APIs.

### Compatibility owns foreign contracts

Obsidian-shaped classes, names, methods, event semantics, and compatibility behaviors remain outside Ivory Core.

## Dependency direction

Dependencies should point inward toward native Ivory abstractions.

```text
Obsidian Plugin
      |
Compatibility Adapter
      |
Ivory Public Interfaces
      |
Ivory Core / Workspace / Storage / Editor
```

The reverse direction is forbidden. Ivory Core must not import or require the Obsidian compatibility layer.

## Data portability

A vault is an ordinary filesystem directory wherever practical. Markdown remains readable outside Ivory. Ivory-owned application metadata should use documented structures, expected initially under `.ivory/`.

Ivory must distinguish between:

1. user-authored knowledge that should remain portable;
2. derived indexes/caches that can be rebuilt;
3. application configuration;
4. plugin state.

These categories should not be casually mixed.

## Architecture changes

A change that alters the locked application/editor/UI stack, Electron process boundary, subsystem ownership, dependency direction, public plugin contracts, vault representation, or compatibility guarantees must update the relevant documentation in the same change.
