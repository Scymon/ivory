# Obsidian Compatibility Contract

## Purpose

Ivory aims to provide practical compatibility with useful parts of the Obsidian plugin ecosystem without depending on Obsidian's private implementation.

Compatibility means independently implementing documented and observable contracts that a plugin expects, then translating those contracts into Ivory's native systems.

## What compatibility does not mean

Compatibility does not mean:

- Ivory is an Obsidian fork;
- Ivory contains Obsidian source code;
- Ivory reproduces Obsidian branding or proprietary assets;
- every Obsidian plugin works;
- every undocumented behavior will be reproduced;
- Ivory Core uses Obsidian's internal architecture.

## Compatibility levels

### Native

Plugin is written specifically for Ivory and uses the Ivory Plugin API.

### Compatible

The tested Obsidian plugin/version operates without modification for the tested behavior.

### Adapted

The plugin requires an Ivory-specific shim, configuration, patch, or adapter beyond the general compatibility surface.

### Partial

Important functionality works, but one or more plugin features are unavailable or behave differently.

### Unsupported

Required APIs or behaviors are not implemented or intentionally will not be supported.

## Initial compatibility targets

The initial investigation should evaluate public plugin-facing concepts such as:

- Plugin
- App
- Vault
- Workspace
- MetadataCache
- TAbstractFile
- TFile
- TFolder
- FileManager
- Component
- Events
- Command
- ItemView
- MarkdownView
- Modal
- Notice
- Setting
- Menu

Inclusion in this list is not a claim of support. Actual status belongs in `API-MATRIX.md`.

## Behavioral compatibility

Matching method names is insufficient. Compatibility tests should verify relevant observable behavior.

Example:

```text
Operation:
Create a Markdown file through the compatibility Vault API.

Potential expectations:
- a physical file is created;
- the returned value has expected TFile behavior;
- expected vault events are emitted;
- metadata/index state becomes consistent;
- subsequent compatible queries can discover the file.
```

Exact expectations must be derived from public contracts and controlled interoperability testing, then documented.

## Versioning

Compatibility is version-specific. A plugin's compatibility record should include at minimum:

- plugin name;
- plugin version tested;
- Ivory version tested;
- compatibility level;
- supported features;
- known failures or deviations.

## Compatibility boundary

All Obsidian-shaped API implementations belong in the compatibility package/layer.

```text
Obsidian plugin
      |
Obsidian compatibility API
      |
Adapters
      |
Ivory public interfaces
```

No dependency may point from Ivory Core back toward this layer.

## Claims

Ivory must not make broad public claims such as "supports Obsidian plugins" without qualification. Public compatibility claims should be backed by the compatibility registry/matrix and automated behavioral tests where feasible.
