# Ivory Architecture Contract

## Purpose

This document defines the high-level boundaries of Ivory. It is a contract: implementations may change, but these boundaries should not change casually.

## Primary rule

**Ivory is independently implemented. No part of Ivory Core depends on Obsidian internals. Obsidian compatibility exists only through an adapter boundary.**

## Major layers

```text
Ivory Desktop Application
|
+-- UI / Workspace
|   +-- windows
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

A change that alters subsystem ownership, dependency direction, public plugin contracts, vault representation, or compatibility guarantees must update the relevant documentation in the same change.
