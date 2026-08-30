# Ivory

Ivory is a structured personal and organizational knowledge environment built around local files, linked information, extensible plugins, and an opinionated structural core.

Ivory is an independent application. It is not an Obsidian fork. Ivory is being independently engineered to begin from the functional baseline of the current Obsidian desktop application, then extend that baseline with Ivory's own structural knowledge model.

## V0 target: current Obsidian desktop parity

Ivory V0 is the current Obsidian desktop feature set, re-engineered independently as Ivory.

The acceptance target is practical replacement: an existing Obsidian user should be able to open an ordinary local vault in Ivory and use the major current desktop workflows without first learning a fundamentally different notes application.

V0 therefore includes the current functional families of Obsidian desktop, including:

- local vaults, files, folders, attachments, file explorer, recovery, and filesystem operations;
- Markdown editing, Source mode, Live Preview-style editing, Reading View, embeds, callouts, tables, math, code, media, and image interactions;
- Properties/frontmatter and property management;
- Bases (`.base`) as database-like views over files and properties, including current-style views, queries, filters, sorting, grouping, formulas, summaries, editing, and navigation;
- Canvas as a spatial/infinite-canvas environment for notes, cards, files, groups, and connections;
- wikilinks, Markdown links, backlinks, outgoing links, tags, embeds, and related navigation;
- vault search and current-style search/filter behavior;
- global/local graph functionality;
- tabs, splits, panes, sidebars, ribbon, pop-out windows, history, workspaces, and workspace navigation;
- command palette, commands, hotkeys, context menus, keyboard navigation, drag/drop, and Vim-style editing support where applicable;
- current core features/plugins such as Bookmarks, Outline, Page Preview, Templates, Daily Notes, Unique Note Creator, Slides, Audio Recorder, Note Composer, and similar built-in capabilities;
- themes, CSS snippets, appearance controls, settings, plugin settings, and current-style settings search/navigation;
- URI/deep-link integration and CLI capabilities;
- a plugin runtime and practical Obsidian plugin compatibility as explicitly implemented and tested.

V0 parity is a moving reference target until the project pins a specific Obsidian version for a release. The compatibility and feature matrices must record the version against which behavior is being compared.

Hosted services such as Obsidian Sync and Publish, and full mobile parity, are separate product/service targets unless explicitly brought into a V0 release scope.

## Core idea

Obsidian provides an open field for knowledge. Ivory begins with that level of general-purpose capability, then provides a structural pillar: a coherent core for organizing people, organizations, places, objects, concepts, projects, processes, events, sources, documents, questions, and the relationships between them.

Ivory should work for both personal and organizational knowledge. The structural core stays general; schemas and modules specialize it for particular uses.

## Architecture

Before making architectural changes, read the project contracts in this order:

1. [`docs/product/PRODUCT-VISION.md`](docs/product/PRODUCT-VISION.md)
2. [`docs/product/PRINCIPLES.md`](docs/product/PRINCIPLES.md)
3. [`docs/product/V0-OBSIDIAN-PARITY.md`](docs/product/V0-OBSIDIAN-PARITY.md)
4. [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md)
5. [`docs/architecture/CORE-PRIMITIVES.md`](docs/architecture/CORE-PRIMITIVES.md)
6. [`docs/architecture/PLUGIN-ARCHITECTURE.md`](docs/architecture/PLUGIN-ARCHITECTURE.md)
7. [`docs/compatibility/OBSIDIAN-COMPATIBILITY.md`](docs/compatibility/OBSIDIAN-COMPATIBILITY.md)
8. [`docs/compatibility/API-MATRIX.md`](docs/compatibility/API-MATRIX.md)

Contributors and coding agents must also read [`AGENTS.md`](AGENTS.md).

## Terminology

**Bases** means the database-like feature analogous to Obsidian Bases. Do not use "Base" as a synonym for Ivory Core, foundation, or architecture layer.

## Non-negotiable boundary

```text
Ivory Core
    |
    +-- Ivory Native Plugin API
    |
    +-- Compatibility Boundary
            |
            +-- Obsidian Compatibility API
                    |
                    +-- Compatible Obsidian plugins
```

Ivory Core must never depend on Obsidian internals. Compatibility translates between an external API contract and Ivory's native systems.

## Status

Ivory is at the architecture-definition stage. The V0 product target is current Obsidian desktop functional parity; exact implementation technologies and compatibility support remain to be documented and tested.
