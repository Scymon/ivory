# Ivory Architecture Contract

## Purpose

This document defines the high-level boundaries of Ivory. It is a contract: implementations may change, but these boundaries should not change casually.

## Primary rule

**Ivory is independently implemented. No part of Ivory Core depends on Obsidian internals. Obsidian compatibility exists only through an adapter boundary.**

## Locked application stack

Ivory Desktop uses:

- **Electron** as the desktop application shell;
- **Chromium** as the renderer/runtime environment;
- **TypeScript** as the primary application and plugin/API language.

This is a deliberate architectural choice, not a placeholder. It keeps Ivory in a JavaScript/DOM environment that is well suited to the V0 desktop-parity goal and the later Obsidian plugin compatibility layer.

A future change away from Electron/Chromium/TypeScript is an architecture change and must be explicitly documented rather than introduced incrementally.

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
+-- Ivory UI / Workspace
+-- Editor
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
|   +-- Markdown editing
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

The knowledge model must not depend on one particular editor implementation.

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
Ivory Core / Workspace / Storage
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

A change that alters the locked desktop stack, Electron process boundary, subsystem ownership, dependency direction, public plugin contracts, vault representation, or compatibility guarantees must update the relevant documentation in the same change.
