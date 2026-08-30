# Ivory Core Primitives

## Status

This is the initial vocabulary for Ivory Core. It establishes concepts to design around; exact TypeScript interfaces and persistence formats remain implementation decisions until separately specified.

## Resource primitives

### Vault

A user-controlled knowledge repository and its associated Ivory configuration.

### Resource

A persisted item addressable within a vault.

### Document

A textual resource, commonly Markdown, capable of containing authored knowledge.

### Attachment

A non-document resource associated with the knowledge repository.

### Folder

A filesystem organizational container. Folder structure is useful but must not be the only representation of knowledge structure.

## Knowledge primitives

### Entity

An identifiable thing represented or known by Ivory. An entity may be backed by a document but is conceptually distinct from the file that represents it.

### Type

A declaration of what kind of entity something is and what structural expectations apply to it.

Initial universal domain concepts are expected to include concepts such as:

- Person
- Organization
- Place
- Object
- Concept
- Project
- Process
- Event
- Source
- Document
- Question

These are initial product concepts, not yet a permanently frozen ontology.

### Property

A named value associated with an entity or resource.

### Relation

A typed connection between identifiable things. Relations are first-class, navigable, and queryable.

Examples:

```text
Person --works_for--> Organization
Organization --provides--> Service
Event --occurs_at--> Place
Document --describes--> Process
Source --supports--> Concept
```

## Interaction primitives

### Workspace

The user's active arrangement of views and working context.

### View

A presentation of one or more resources, entities, queries, or tools.

### Command

A named executable action available to users and plugins.

## Retrieval primitives

### Index

Derived data used to efficiently discover resources, metadata, links, relations, and searchable content. Indexes should be rebuildable where practical.

### Query

A structured request over Ivory knowledge, metadata, resources, or relations.

## Extension primitives

### Plugin

An installable extension executed through a documented plugin API.

### Extension

A registered contribution to an Ivory subsystem, such as a view, command, editor extension, entity type, importer, publisher, or query function.

### Event

A published occurrence that allows decoupled subsystems and plugins to react to changes.

## Important distinction

**Entity is not synonymous with Markdown file.**

A Markdown document may represent an entity, multiple resources may contribute information about an entity, and future Ivory capabilities may represent entities that are not authored as standalone Markdown documents.

Likewise, **folder hierarchy is not synonymous with ontology.** Ivory's semantic structure must survive changes in physical file organization.
