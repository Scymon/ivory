# Ivory

Ivory is a structured personal and organizational knowledge environment built around local files, linked information, extensible plugins, and an opinionated structural core.

Ivory is an independent application. It is not an Obsidian fork. Ivory may provide practical compatibility with the Obsidian plugin ecosystem through a dedicated compatibility layer, but Obsidian compatibility must not dictate Ivory's internal architecture.

## Core idea

Obsidian provides an open field for knowledge. Ivory provides a structural pillar: a coherent core for organizing people, organizations, places, objects, concepts, projects, processes, events, sources, documents, questions, and the relationships between them.

Ivory should work for both personal and organizational knowledge. The core stays general; schemas and modules specialize it for particular uses.

## Architecture

Before making architectural changes, read the project contracts in this order:

1. [`docs/product/PRODUCT-VISION.md`](docs/product/PRODUCT-VISION.md)
2. [`docs/product/PRINCIPLES.md`](docs/product/PRINCIPLES.md)
3. [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md)
4. [`docs/architecture/CORE-PRIMITIVES.md`](docs/architecture/CORE-PRIMITIVES.md)
5. [`docs/architecture/PLUGIN-ARCHITECTURE.md`](docs/architecture/PLUGIN-ARCHITECTURE.md)
6. [`docs/compatibility/OBSIDIAN-COMPATIBILITY.md`](docs/compatibility/OBSIDIAN-COMPATIBILITY.md)
7. [`docs/compatibility/API-MATRIX.md`](docs/compatibility/API-MATRIX.md)

Contributors and coding agents must also read [`AGENTS.md`](AGENTS.md).

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

Ivory is at the architecture-definition stage. API support, plugin compatibility, implementation technologies, and product behavior should not be assumed until they are documented and tested.
