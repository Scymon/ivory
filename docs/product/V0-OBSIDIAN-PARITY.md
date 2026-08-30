# Ivory V0 — Obsidian Desktop Parity Contract

## Definition

Ivory V0 is an independently engineered Ivory application whose baseline target is practical functional parity with the current Obsidian desktop application.

V0 is not a stripped-down MVP and is not merely Markdown editing plus a few knowledge features. It is the general-purpose environment on which Ivory-specific structure will be built.

## Acceptance principle

A knowledgeable Obsidian desktop user should be able to open an ordinary local vault in Ivory and perform the major workflows they currently rely on without first depending on Ivory-specific features.

Parity means equivalent categories of capability and sufficiently familiar user-observable behavior. It does not mean copying source code, proprietary assets, branding, or private implementation details.

## Reference-version rule

"Current Obsidian" is a moving development target. Every Ivory V0 milestone and release candidate must pin and record a specific Obsidian desktop version as its parity reference.

When Obsidian changes during V0 development:

1. record the upstream feature/change;
2. classify it as parity-relevant, service/mobile-only, or out of scope;
3. update the feature/compatibility matrices;
4. implement independently when required for the pinned target or deliberately defer it to the next parity target.

Ivory releases must never claim parity against an undefined version.

## V0 feature families

### 1. Local vault and filesystem

- Create/open local vaults.
- Files, folders, Markdown documents, attachments, and supported media.
- Create, rename, move, delete, recover, reveal, and navigate resources.
- File explorer behavior, drag/drop, sorting, and relevant context actions.
- Detect and respond to external filesystem changes.
- Preserve ordinary user-authored files as directly accessible local data.

### 2. Markdown authoring and rendering

- Markdown source editing.
- Live Preview-style editing where rendered styling and Markdown authoring coexist.
- Reading/rendered view.
- Headings, emphasis, lists, task lists, tables, code, code blocks, math, footnotes, blockquotes, callouts, embeds, media, and supported Markdown extensions.
- Find/replace, selection, editing commands, keyboard behavior, and relevant editor preferences.
- Image/media viewing and current-style interactions where parity requires them.

### 3. Links and embedded knowledge

- Wikilinks and ordinary Markdown links.
- Heading/block links where supported by the parity reference.
- Backlinks and outgoing links.
- Embedded notes/files/media.
- Link creation, following, updating, and relevant rename behavior.
- Unlinked/reference discovery where present in the parity reference.

### 4. Properties

- YAML/frontmatter persistence.
- Visual Properties interface.
- Current property types and editing behavior.
- Property naming/management and vault-wide property awareness where applicable.
- Properties remain usable from Markdown rather than becoming Ivory-only opaque data.

### 5. Bases

`Bases` is reserved for the database-like feature analogous to Obsidian Bases.

V0 should reproduce the current category of Bases capability for the pinned parity version, including as applicable:

- `.base` resources;
- queries over notes/files/properties;
- filters;
- sorting;
- grouping;
- formulas;
- summaries/aggregations;
- current supported view types such as table/list/card-style views;
- property display and direct editing of underlying note data;
- navigation/opening of source notes;
- embedding/integration with the rest of the workspace;
- documented extension/API behavior when required by plugin parity.

### 6. Canvas

- Infinite/spatial canvas interaction.
- Text/cards.
- Notes/files/media/web resources where supported by the parity reference.
- Connections/edges.
- Groups.
- Movement, resizing, selection, zooming, panning, navigation, and persistence.
- Embedding/integration with notes and Bases where applicable.

### 7. Search and navigation

- Vault-wide search.
- Current search operators/filter semantics required by the pinned reference.
- Search-result navigation and context.
- Quick switching/navigation.
- History and forward/back behavior.
- Outline, tags, bookmarks, page preview, and related navigation capabilities.

### 8. Graph

- Global graph.
- Local graph.
- Filtering and grouping/styling behavior required by the parity reference.
- Navigation from graph relationships into resources.

### 9. Workspace and desktop shell

- Familiar multi-pane desktop knowledge workspace.
- Tabs.
- Splits/tab groups.
- Left/right sidebars.
- Ribbon/tool areas.
- View/pane lifecycle.
- Pinned content where applicable.
- Pop-out windows where supported.
- Saved workspaces/layout behavior.
- Drag/drop between relevant surfaces.
- Menus and context menus.

Ivory should have its own branding and implementation while maintaining a familiar productivity model for migration and replacement.

### 10. Commands and interaction

- Command palette.
- Registered commands.
- Configurable hotkeys.
- Keyboard navigation.
- Slash commands where applicable.
- Vim-style editing option where required for parity.
- Current interaction conventions required by major workflows.

### 11. Core features

Track the pinned Obsidian version's current core features/plugins individually. The V0 parity matrix should include, where present in the reference version, functionality such as:

- Bookmarks;
- Canvas;
- Bases;
- Daily Notes;
- Templates;
- Unique Note Creator;
- Note Composer;
- Outline;
- Page Preview;
- Properties View;
- Backlinks;
- Outgoing Links;
- Tags;
- Graph View;
- Search;
- Slides;
- Audio Recorder;
- Workspaces;
- other current built-in desktop capabilities.

This list is illustrative, not a substitute for the pinned-version feature matrix.

### 12. Appearance and customization

- Light/dark appearance.
- Theme system.
- CSS snippets or an equivalent user customization surface where parity requires it.
- Font/interface/accent and related appearance controls.
- Interface scaling and platform-appropriate presentation.

### 13. Settings

- Application/vault settings surfaces.
- Searchable/navigable settings behavior where present in the parity reference.
- Core feature configuration.
- Editor/file/link/appearance/hotkey configuration.
- Plugin management/settings integration.

### 14. Plugin infrastructure

V0 includes a plugin runtime because practical Obsidian replacement depends on extensibility.

Ivory has two distinct plugin concerns:

1. Ivory-native plugins through the Ivory Plugin API.
2. Obsidian-plugin compatibility through the dedicated compatibility boundary.

Compatibility is tracked explicitly. A plugin is never assumed compatible merely because Ivory can load JavaScript.

See `../compatibility/OBSIDIAN-COMPATIBILITY.md` and `../compatibility/API-MATRIX.md`.

### 15. External/desktop integration

- URI/deep-link behavior required by the parity reference.
- CLI capabilities required by the pinned desktop reference.
- OS file/open/link integration.
- Print/PDF/export behavior where applicable.
- Web/external content handling where present in the parity reference.

## Explicitly separate scopes

Unless a release plan explicitly changes this contract, the following are separate from desktop V0 parity:

- reimplementation of Obsidian Sync as a hosted service;
- reimplementation of Obsidian Publish as a hosted service;
- complete iOS/Android mobile parity;
- copying Obsidian branding, proprietary assets, source code, or private implementation;
- guaranteed compatibility with every community plugin.

Ivory may later provide its own equivalent services and mobile applications.

## V0 completion test

V0 is ready to leave parity-building mode when all of the following are true:

1. The parity reference version is pinned.
2. The feature matrix for that version is complete.
3. Major desktop workflows are implemented end-to-end.
4. Ordinary compatible local vaults can be opened and used without destructive conversion.
5. Properties, Bases, Canvas, Markdown editing/rendering, links, search, graph, and workspace behavior are functional rather than mock surfaces.
6. Plugin infrastructure exists and compatibility claims are test-backed.
7. Known parity gaps are documented rather than silently ignored.
8. An experienced Obsidian user can reasonably use Ivory as their general-purpose desktop knowledge environment before enabling Ivory-specific structural systems.

After this baseline exists, Ivory-specific structure becomes the primary differentiating layer rather than a substitute for missing foundational functionality.
