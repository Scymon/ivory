import { type Extension } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate, WidgetType } from '@codemirror/view';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export interface LivePreviewOptions {
  openWikiLink(target: string): void;
  resolveAsset(target: string): Promise<string | null>;
  readNote(target: string): Promise<string | null>;
}

class WikiLinkWidget extends WidgetType {
  constructor(private readonly target: string, private readonly label: string, private readonly open: (target: string) => void) { super(); }
  eq(other: WikiLinkWidget): boolean { return other.target === this.target && other.label === this.label; }
  toDOM(): HTMLElement {
    const anchor = document.createElement('a');
    anchor.className = 'cm-ivory-wikilink'; anchor.href = '#'; anchor.textContent = this.label;
    anchor.addEventListener('mousedown', (event) => event.preventDefault());
    anchor.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); this.open(this.target); });
    return anchor;
  }
  ignoreEvent(): boolean { return false; }
}

class CheckboxWidget extends WidgetType {
  constructor(private readonly checked: boolean, private readonly position: number) { super(); }
  eq(other: CheckboxWidget): boolean { return other.checked === this.checked && other.position === this.position; }
  toDOM(view: EditorView): HTMLElement {
    const input = document.createElement('input'); input.type = 'checkbox'; input.className = 'cm-ivory-checkbox'; input.checked = this.checked;
    input.addEventListener('mousedown', (event) => event.preventDefault());
    input.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); view.dispatch({ changes: { from: this.position + 1, to: this.position + 2, insert: this.checked ? ' ' : 'x' } }); });
    return input;
  }
  ignoreEvent(): boolean { return false; }
}

class EmbedWidget extends WidgetType {
  constructor(private readonly target: string, private readonly options: LivePreviewOptions) { super(); }
  eq(other: EmbedWidget): boolean { return other.target === this.target; }
  toDOM(): HTMLElement {
    const host = document.createElement('div'); host.className = 'cm-ivory-embed'; host.textContent = `Loading ${this.target}…`;
    void this.hydrate(host);
    return host;
  }
  private async hydrate(host: HTMLElement): Promise<void> {
    const lower = this.target.toLowerCase();
    const note = await this.options.readNote(this.target);
    if (note !== null) {
      const body = note.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/, '');
      host.classList.add('cm-ivory-note-embed');
      host.innerHTML = DOMPurify.sanitize(await marked.parse(body, { gfm: true }));
      return;
    }
    const url = await this.options.resolveAsset(this.target);
    host.replaceChildren();
    if (!url) { host.textContent = `Missing embed: ${this.target}`; host.classList.add('cm-ivory-embed-missing'); return; }
    if (/\.(png|jpe?g|gif|webp|svg|avif)$/i.test(lower)) {
      const image = document.createElement('img'); image.src = url; image.alt = this.target; image.className = 'cm-ivory-embed-image'; host.append(image); return;
    }
    if (/\.(mp3|wav|ogg|m4a|flac)$/i.test(lower)) {
      const audio = document.createElement('audio'); audio.src = url; audio.controls = true; host.append(audio); return;
    }
    if (/\.(mp4|webm|mov|m4v)$/i.test(lower)) {
      const video = document.createElement('video'); video.src = url; video.controls = true; video.className = 'cm-ivory-embed-video'; host.append(video); return;
    }
    if (/\.pdf$/i.test(lower)) {
      const frame = document.createElement('iframe'); frame.src = url; frame.className = 'cm-ivory-embed-pdf'; host.append(frame); return;
    }
    const link = document.createElement('a'); link.href = url; link.textContent = this.target; link.className = 'cm-ivory-wikilink'; host.append(link);
  }
  ignoreEvent(): boolean { return false; }
}

function selectionTouches(view: EditorView, from: number, to: number): boolean {
  return view.state.selection.ranges.some((range) => range.from <= to && range.to >= from);
}

function buildDecorations(view: EditorView, options: LivePreviewOptions): DecorationSet {
  const text = view.state.doc.toString();
  const ranges: ReturnType<Decoration['range']>[] = [];
  const add = (from: number, to: number, decoration: Decoration) => ranges.push(decoration.range(from, to));

  const frontmatter = text.match(/^---\s*\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/);
  if (frontmatter && !selectionTouches(view, 0, frontmatter[0].length)) add(0, frontmatter[0].length, Decoration.replace({ block: true }));

  for (const match of text.matchAll(/^```[^\n]*\r?\n[\s\S]*?^```\s*$/gm)) {
    const from = match.index!; const to = from + match[0].length;
    const first = view.state.doc.lineAt(from); const last = view.state.doc.lineAt(Math.max(from, to - 1));
    for (let n = first.number; n <= last.number; n += 1) add(view.state.doc.line(n).from, view.state.doc.line(n).from, Decoration.line({ class: 'cm-ivory-codeblock' }));
    if (!selectionTouches(view, from, to)) {
      add(first.from, first.to, Decoration.replace({}));
      add(last.from, last.to, Decoration.replace({}));
    }
  }

  for (const match of text.matchAll(/^#{1,6}\s+/gm)) {
    const from = match.index!; const to = from + match[0].length; const level = Math.min(6, match[0].trim().length);
    if (!selectionTouches(view, from, to)) add(from, to, Decoration.replace({}));
    const line = view.state.doc.lineAt(from);
    add(line.from, line.from, Decoration.line({ class: `cm-ivory-heading cm-ivory-heading-${level}` }));
  }

  for (const match of text.matchAll(/^>\s?/gm)) {
    const from = match.index!; const to = from + match[0].length;
    if (!selectionTouches(view, from, to)) add(from, to, Decoration.replace({}));
    const line = view.state.doc.lineAt(from);
    add(line.from, line.from, Decoration.line({ class: 'cm-ivory-blockquote' }));
  }

  for (const match of text.matchAll(/^>\s*\[!([\w-]+)\][+-]?\s*(.*)$/gmi)) {
    const line = view.state.doc.lineAt(match.index!);
    add(line.from, line.from, Decoration.line({ class: `cm-ivory-callout cm-ivory-callout-${match[1].toLowerCase()}` }));
  }

  for (const match of text.matchAll(/^\s*[-*+]\s+(\[[ xX]\])\s+/gm)) {
    const markerOffset = match[0].indexOf(match[1]); const from = match.index! + markerOffset; const to = from + match[1].length;
    if (!selectionTouches(view, from, to)) add(from, to, Decoration.replace({ widget: new CheckboxWidget(match[1].toLowerCase() === '[x]', from) }));
  }

  for (const match of text.matchAll(/^\s*\|.*\|\s*$/gm)) {
    const line = view.state.doc.lineAt(match.index!);
    add(line.from, line.from, Decoration.line({ class: /^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/.test(match[0]) ? 'cm-ivory-table-separator' : 'cm-ivory-table-row' }));
  }

  for (const match of text.matchAll(/!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
    const from = match.index!; const to = from + match[0].length;
    if (!selectionTouches(view, from, to)) add(from, to, Decoration.replace({ widget: new EmbedWidget(match[1].trim(), options) }));
  }

  for (const match of text.matchAll(/(?<!!)\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g)) {
    const from = match.index!; const to = from + match[0].length;
    if (!selectionTouches(view, from, to)) add(from, to, Decoration.replace({ widget: new WikiLinkWidget(match[1].trim(), (match[2] || match[1]).trim(), options.openWikiLink) }));
  }

  for (const match of text.matchAll(/`([^`\n]+)`/g)) {
    const from = match.index!; const to = from + match[0].length; if (selectionTouches(view, from, to)) continue;
    add(from, from + 1, Decoration.replace({})); add(from + 1, to - 1, Decoration.mark({ class: 'cm-ivory-inline-code' })); add(to - 1, to, Decoration.replace({}));
  }
  for (const match of text.matchAll(/~~([^\n~]+)~~/g)) {
    const from = match.index!; const to = from + match[0].length; if (selectionTouches(view, from, to)) continue;
    add(from, from + 2, Decoration.replace({})); add(from + 2, to - 2, Decoration.mark({ class: 'cm-ivory-strike' })); add(to - 2, to, Decoration.replace({}));
  }
  for (const match of text.matchAll(/\*\*([^\n*]+)\*\*/g)) {
    const from = match.index!; const to = from + match[0].length; if (selectionTouches(view, from, to)) continue;
    add(from, from + 2, Decoration.replace({})); add(from + 2, to - 2, Decoration.mark({ class: 'cm-ivory-strong' })); add(to - 2, to, Decoration.replace({}));
  }
  for (const match of text.matchAll(/(?<!\*)\*([^\n*]+)\*(?!\*)/g)) {
    const from = match.index!; const to = from + match[0].length; if (selectionTouches(view, from, to)) continue;
    add(from, from + 1, Decoration.replace({})); add(from + 1, to - 1, Decoration.mark({ class: 'cm-ivory-em' })); add(to - 1, to, Decoration.replace({}));
  }
  for (const match of text.matchAll(/(^|\s)(#[\p{L}\p{N}_/-]+)/gu)) {
    const from = match.index! + match[1].length; add(from, from + match[2].length, Decoration.mark({ class: 'cm-ivory-tag' }));
  }

  return Decoration.set(ranges, true);
}

export function ivoryLivePreview(options: LivePreviewOptions): Extension {
  return ViewPlugin.fromClass(class {
    decorations: DecorationSet;
    constructor(view: EditorView) { this.decorations = buildDecorations(view, options); }
    update(update: ViewUpdate) { if (update.docChanged || update.selectionSet || update.viewportChanged) this.decorations = buildDecorations(update.view, options); }
  }, { decorations: (value) => value.decorations });
}
