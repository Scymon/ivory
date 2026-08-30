# Ivory Engineering Instructions

Before modifying Ivory, read the governing project documents linked from the root `README.md`.

## Non-negotiable architectural rules

1. Ivory is an independently implemented application, not an Obsidian fork.
2. Ivory Core must never depend on Obsidian internals.
3. Obsidian compatibility belongs exclusively behind the compatibility boundary.
4. Do not structure Ivory Core around Obsidian merely to simplify compatibility.
5. Native Ivory capabilities and the Ivory knowledge model take precedence over compatibility constraints.
6. User knowledge should remain portable, local, and directly accessible wherever practical.
7. Plugins interact with Ivory through documented public APIs rather than private implementation details.
8. Compatibility claims must be backed by behavioral tests.
9. Do not copy Obsidian source code, proprietary assets, branding, or undocumented implementation details.
10. Architectural changes require corresponding documentation updates.
11. Prefer small, explicit interfaces between subsystems over cross-layer access.
12. Do not silently broaden the meaning of "Obsidian compatible." Record supported behavior in the API matrix.

## Implementation rule

When a feature is needed by both Ivory and the compatibility layer, implement the capability natively in Ivory first, then adapt it outward. Do not implement an Obsidian-shaped feature inside Core solely because a compatibility plugin expects it.

## Data rule

Markdown and ordinary filesystem resources are first-class. Ivory-specific metadata should be stored in documented Ivory-owned structures without making user-authored knowledge unreadable outside Ivory.
