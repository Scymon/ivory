# Shared Markdown Rendering Contract

Ivory has one Markdown behavior system.

Normal Markdown notes, Canvas text nodes, embedded notes, and future Markdown-bearing surfaces must reuse the same semantic parsing/decoration behavior rather than creating parallel implementations.

## Source of truth

- `src/renderer/live-preview.ts` owns Ivory Live Preview behavior and semantic CodeMirror decorations/widgets.
- `src/renderer/styles.css` owns the shared visual treatment for those semantic decoration classes.
- `src/renderer/canvas-markdown.ts` embeds that same Live Preview system into Canvas text nodes.
- Canvas-specific CSS may define only containment, sizing, scrolling, and interaction boundaries for the embedded editor. It must not fork heading/link/task/tag/callout/etc. styling.

```text
Markdown source
      |
      v
Ivory Live Preview
      |
      +---- Normal note editor
      |
      +---- Canvas text node
      |
      +---- future Markdown surfaces
```

A Markdown feature should therefore be implemented once in the shared Markdown layer and become available to every compatible Ivory surface.

## File type registry

Native explorer support is centralized in `src/renderer/file-types.ts`. New first-class Ivory file types should be registered there rather than independently hard-coded into each viewer.
