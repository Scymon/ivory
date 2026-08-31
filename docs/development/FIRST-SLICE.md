# First Runnable Slice

The first implementation slice exists to prove the locked architecture with the smallest useful end-to-end workflow.

## Current slice

```text
Electron window
    -> secure preload/IPC bridge
    -> choose local vault
    -> scan/render file tree
    -> open Markdown file
    -> edit with CodeMirror 6
    -> debounce-save Markdown back to disk
```

## What this proves

- Electron main/renderer separation.
- Chromium + vanilla TypeScript/DOM/CSS renderer.
- Narrow preload bridge rather than renderer Node access.
- Local vault access without converting user files.
- Markdown as the persisted source.
- CodeMirror 6 as the editor engine.

## Intentionally not implemented yet

This is not an Obsidian-parity claim. It does not yet include Live Preview behavior, Reading View, Properties, links/backlinks, metadata indexing, tabs/splits, search, graph, Canvas, Bases, command palette, themes, plugins, file watching, full filesystem operations, or the rest of V0.

## Next implementation pressure

The next work should strengthen this vertical slice rather than jump randomly across V0:

1. establish a real vault/storage service with file watching and resource events;
2. add create/rename/move/delete and attachment handling;
3. establish the Ivory Editor API around CodeMirror;
4. implement Markdown rendering and then Live Preview behavior;
5. build metadata indexing for frontmatter, links, headings, blocks, and tags;
6. let Properties and knowledge navigation emerge from that metadata layer.
