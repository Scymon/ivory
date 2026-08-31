# Ivory Runnable Slices

Implementation proceeds through complete vertical workflows rather than disconnected mock surfaces.

## Slice 1 — local Markdown editor

```text
Electron window
    -> secure preload/IPC bridge
    -> choose local vault
    -> scan/render file tree
    -> open Markdown file
    -> edit with CodeMirror 6
    -> debounce-save Markdown back to disk
```

This proved the locked Electron/Chromium/TypeScript/DOM/CodeMirror architecture.

## Slice 2 — working knowledge workspace

The second slice extends that foundation with:

- a watched local vault using filesystem change events;
- create note, create folder, rename/move, and delete operations;
- multiple open note tabs;
- Source and basic Reading views;
- YAML/frontmatter parsing and a Properties inspector;
- wikilink parsing;
- outgoing-link and backlink inspection;
- tag extraction;
- vault-wide text search;
- Markdown metadata indexing;
- clickable resolved wikilinks in Reading view;
- UI refresh when vault resources change externally.

This is still not an Obsidian-parity claim. The Reading view is intentionally basic, Properties are currently inspectable rather than fully editable through the property UI, and metadata/index/search behavior is an early native implementation.

## Next implementation pressure

Strengthen the editor and metadata model before moving into the large spatial/database systems:

1. establish a formal Ivory Editor API around CodeMirror;
2. implement Live Preview-style Markdown behavior rather than Source/Reading only;
3. make Properties editable and preserve frontmatter safely;
4. implement robust link resolution, heading/block references, embeds, rename-link updates, and unlinked mentions;
5. add command registry, command palette, hotkeys, quick switcher, history, outline, and bookmarks;
6. add workspace splits/panes and persisted layouts;
7. then build Graph, Canvas, and Bases against the same metadata/query substrate.
