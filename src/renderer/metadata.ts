import yaml from 'js-yaml';
import type { VaultEntry } from '../shared/desktop-api.js';

export interface NoteMetadata {
  path: string;
  name: string;
  frontmatter: Record<string, unknown>;
  links: string[];
  tags: string[];
  headings: string[];
}

export function parseNote(path: string, source: string): NoteMetadata {
  let body = source;
  let frontmatter: Record<string, unknown> = {};
  const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  if (match) {
    body = source.slice(match[0].length);
    try {
      const parsed = yaml.load(match[1]);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) frontmatter = parsed as Record<string, unknown>;
    } catch {
      frontmatter = {};
    }
  }

  const links = [...body.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g)].map((item) => item[1].trim());
  const inlineTags = [...body.matchAll(/(^|\s)#([\p{L}\p{N}_/-]+)/gu)].map((item) => item[2]);
  const propertyTags = Array.isArray(frontmatter.tags)
    ? frontmatter.tags.map(String)
    : typeof frontmatter.tags === 'string'
      ? frontmatter.tags.split(/[ ,]+/).filter(Boolean)
      : [];
  const headings = [...body.matchAll(/^#{1,6}\s+(.+)$/gm)].map((item) => item[1].trim());

  return {
    path,
    name: path.split('/').pop()?.replace(/\.md$/i, '') ?? path,
    frontmatter,
    links: [...new Set(links)],
    tags: [...new Set([...inlineTags, ...propertyTags])],
    headings
  };
}

export function flattenMarkdown(entries: VaultEntry[]): string[] {
  const paths: string[] = [];
  for (const entry of entries) {
    if (entry.kind === 'folder') paths.push(...flattenMarkdown(entry.children ?? []));
    else if (entry.path.toLowerCase().endsWith('.md')) paths.push(entry.path);
  }
  return paths;
}

export function resolveWikiLink(target: string, notes: Map<string, NoteMetadata>): string | null {
  const normalized = target.replace(/\\/g, '/').replace(/\.md$/i, '').toLocaleLowerCase();
  for (const note of notes.values()) {
    const pathNoExtension = note.path.replace(/\.md$/i, '').toLocaleLowerCase();
    if (pathNoExtension === normalized || note.name.toLocaleLowerCase() === normalized) return note.path;
  }
  return null;
}
