# Obsidian Compatibility API Matrix

## Status legend

- `NOT INVESTIGATED` — behavior and implementation requirements have not been mapped.
- `PLANNED` — selected for implementation but not complete.
- `PARTIAL` — some documented/tested behavior is implemented.
- `SUPPORTED` — declared compatibility surface is implemented and tested.
- `UNSUPPORTED` — intentionally not supported or not feasible under the current architecture.

**Nothing in this matrix is supported merely because it is listed.**

## Initial surface

| API / Concept | Status | Ivory target | Notes |
|---|---|---|---|
| `Plugin` | NOT INVESTIGATED | Plugin runtime | Lifecycle and registration contract |
| `App` | NOT INVESTIGATED | Application service facade | Compatibility entry point |
| `Vault` | NOT INVESTIGATED | Vault / resources | High-priority compatibility surface |
| `TAbstractFile` | NOT INVESTIGATED | Resource adapter | File/folder compatibility representation |
| `TFile` | NOT INVESTIGATED | Document/resource adapter | |
| `TFolder` | NOT INVESTIGATED | Folder/resource adapter | |
| `Workspace` | NOT INVESTIGATED | Workspace | Views, leaves, active state, events |
| `MetadataCache` | NOT INVESTIGATED | Metadata / index | Links, frontmatter, cache behavior |
| `FileManager` | NOT INVESTIGATED | Resource operations | Rename/link/frontmatter-related behavior |
| `Component` | NOT INVESTIGATED | Lifecycle system | |
| `Events` | NOT INVESTIGATED | Event bus | Event ordering/semantics require tests |
| Commands | NOT INVESTIGATED | Command registry | |
| `ItemView` | NOT INVESTIGATED | View system | |
| `MarkdownView` | NOT INVESTIGATED | Editor/view system | |
| `Modal` | NOT INVESTIGATED | UI service | |
| `Notice` | NOT INVESTIGATED | Notification service | |
| `Setting` | NOT INVESTIGATED | Settings UI | |
| `Menu` | NOT INVESTIGATED | Menu service | |

## Vault behavior breakdown

| Behavior | Status | Test required |
|---|---|---|
| read | NOT INVESTIGATED | yes |
| cachedRead | NOT INVESTIGATED | yes |
| create | NOT INVESTIGATED | yes |
| modify | NOT INVESTIGATED | yes |
| delete | NOT INVESTIGATED | yes |
| rename | NOT INVESTIGATED | yes |
| getMarkdownFiles | NOT INVESTIGATED | yes |
| create event | NOT INVESTIGATED | yes |
| modify event | NOT INVESTIGATED | yes |
| delete event | NOT INVESTIGATED | yes |
| rename event | NOT INVESTIGATED | yes |

## Plugin compatibility registry

No plugins have been tested yet.

| Plugin | Plugin version | Ivory version | Level | Notes |
|---|---|---|---|---|
| — | — | — | — | — |

## Maintenance rule

Any implementation that changes compatibility behavior must update this matrix and its corresponding tests. `SUPPORTED` must never be used without a defined tested behavior surface.
