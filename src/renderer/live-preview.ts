import { RangeSetBuilder, StateField, type Extension } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate, WidgetType } from '@codemirror/view';

export interface LivePreviewOptions {
  openWikiLink(target: string): void;
}

class WikiLinkWidget extends WidgetType {
  constructor(private readonly target: string, private readonly label: string, private readonly open: (target: string) => void) { super(); }
  eq(other: WikiLinkWidget): boolean { return other.target === this.target && other.label === this.label; }
  toDOM(): HTMLElement {
    const anchor = document.createElement('a');
    anchor.className = 'cm-ivory-wikilink';
    anchor.href = '#';
    anchor.textContent = this.label;
    anchor.dataset.target = this.target;
    anchor.addEventListener('mousedown', (event) => event.preventDefault());
    anchor.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); this.open(this.target); });
    return anchor;
  }
  ignoreEvent(): boolean { return false; }
}

function selectionTouches(view: EditorView, from: number, to: number): boolean {
  return view.state.selection.ranges.some((range) => range.from <= to && range.to >= from);
}

function buildDecorations(view: EditorView, options: LivePreviewOptions): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const text = view.state.doc.toString();
  const candidates: Array<{ from: number; to: number; decoration: Decoration }> = [];

  const frontmatter = text.match(/^---\s*\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/);
  if (frontmatter && !selectionTouches(view, 0, frontmatter[0].length)) {
    candidates.push({ from: 0, to: frontmatter[0].length, decoration: Decoration.replace({ block: true }) });
  }

  for (const match of text.matchAll(/^#{1,6}\s+/gm)) {
    const from = match.index!;
    const to = from + match[0].length;
    const level = Math.min(6, match[0].trim().length);
    candidates.push({ from, to, decoration: Decoration.mark({ class: `cm-ivory-heading-marker cm-ivory-h${level}` }) });
    const line = view.state.doc.lineAt(from);
    candidates.push({ from: line.from, to: line.from, decoration: Decoration.line({ class: `cm-ivory-heading cm-ivory-heading-${level}` }) });
  }

  for (const match of text.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g)) {
    const from = match.index!;
    const to = from + match[0].length;
    if (selectionTouches(view, from, to)) continue;
    const target = match[1].trim();
    const label = (match[2] || match[1]).trim();
    candidates.push({ from, to, decoration: Decoration.replace({ widget: new WikiLinkWidget(target, label, options.openWikiLink) }) });
  }

  for (const match of text.matchAll(/\*\*([^\n*]+)\*\*/g)) {
    const from = match.index!;
    const to = from + match[0].length;
    if (selectionTouches(view, from, to)) continue;
    candidates.push({ from, to: from + 2, decoration: Decoration.replace({}) });
    candidates.push({ from: from + 2, to: to - 2, decoration: Decoration.mark({ class: 'cm-ivory-strong' }) });
    candidates.push({ from: to - 2, to, decoration: Decoration.replace({}) });
  }

  for (const match of text.matchAll(/(?<!\*)\*([^\n*]+)\*(?!\*)/g)) {
    const from = match.index!;
    const to = from + match[0].length;
    if (selectionTouches(view, from, to)) continue;
    candidates.push({ from, to: from + 1, decoration: Decoration.replace({}) });
    candidates.push({ from: from + 1, to: to - 1, decoration: Decoration.mark({ class: 'cm-ivory-em' }) });
    candidates.push({ from: to - 1, to, decoration: Decoration.replace({}) });
  }

  candidates.sort((a, b) => a.from - b.from || a.to - b.to);
  let lastTo = -1;
  for (const item of candidates) {
    if (item.from < lastTo && item.from !== item.to) continue;
    builder.add(item.from, item.to, item.decoration);
    if (item.to > item.from) lastTo = item.to;
  }
  return builder.finish();
}

export function ivoryLivePreview(options: LivePreviewOptions): Extension {
  const field = StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update: (value) => value,
    provide: (stateField) => EditorView.decorations.from(stateField)
  });

  const plugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet;
    constructor(view: EditorView) { this.decorations = buildDecorations(view, options); }
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) this.decorations = buildDecorations(update.view, options);
    }
  }, { decorations: (value) => value.decorations });

  return [field, plugin];
}
