# Ivory Post-its

Loose future-feature ideas that should be preserved without expanding the current implementation scope.

## CRAZY IDEA — Encrypted Vault Layer

**Status:** Later / not V0 scope

Add an optional security layer that can encrypt Ivory/Markdown knowledge at different scopes:

- encrypt an individual Markdown file;
- encrypt selected files or folders;
- encrypt an entire vault.

The user should be able to unlock protected knowledge through Ivory while the underlying protected data remains encrypted at rest.

### Questions for later

- Per-file keys vs. vault-level key hierarchy.
- Whether filenames, folder structure, Properties, links, indexes, and attachments are also encrypted.
- How search, backlinks, Bases, Canvas, plugins, sync, backups, and external editors behave around locked content.
- Whether an unlocked vault is decrypted only in memory or temporarily materialized.
- Recovery-key / password-loss model.
- Shared/business vault permissions and multiple-user key management.
- Compatibility implications for ordinary Markdown portability and Obsidian plugins.

**Do not let this feature complicate V0 parity architecture prematurely. Preserve the idea and revisit it as a dedicated security architecture later.**
