# Ivory Plugin Architecture

## Goals

Ivory supports two extension paths:

1. **Ivory-native plugins**, written against the Ivory Plugin API.
2. **Compatible Obsidian plugins**, executed through a dedicated compatibility layer where the required behavior has been implemented and tested.

These paths may share underlying Ivory capabilities but must not share architectural authority.

## Native path

```text
Ivory Plugin
    |
Ivory Plugin API
    |
Ivory Public Services
    |
Ivory Core / Workspace / Storage / Editor
```

The native API is the preferred long-term extension surface.

Potential native capabilities include:

```text
app.vault
app.resources
app.entities
app.types
app.relations
app.metadata
app.workspace
app.commands
app.query
app.events
```

Names are illustrative until the API is formally versioned.

## Compatibility path

```text
Obsidian Plugin
    |
Obsidian-Compatible API Surface
    |
Compatibility Adapters
    |
Ivory Public Services
    |
Ivory Native Systems
```

Adapters translate expected Obsidian behavior into native Ivory operations.

For example:

```text
plugin -> app.vault.getMarkdownFiles()
       -> ObsidianVaultAdapter
       -> Ivory vault/resource query
       -> compatibility-shaped result
```

## Core rule

When both plugin paths need the same capability, implement the capability in Ivory first and expose/adapt it outward.

Do not place Obsidian-shaped abstractions inside Core solely to satisfy compatibility.

## Plugin isolation

The runtime should eventually define explicit policies for:

- filesystem access;
- network access;
- process/system access;
- plugin storage;
- permissions;
- lifecycle;
- errors and crash isolation;
- API version negotiation.

These policies are not yet decided and must not be assumed.

## Native advantages

Ivory-native plugins should eventually be able to use capabilities that compatibility plugins cannot assume, including typed entities, schemas, relations, context models, structured sources, publishing, and other Ivory-specific systems.

Compatibility is therefore a migration and ecosystem bridge, not a ceiling on Ivory's plugin architecture.
