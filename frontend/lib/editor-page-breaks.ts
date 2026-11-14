/**
 * In-flow page gaps for the compose editor.
 *
 * The paper is an estimated page theater, so nothing stops a paragraph or a
 * table from being drawn across the gap between two sheets. Instead of painting
 * over it, a spacer widget is inserted at a block boundary: the spacer occupies
 * the bottom margin + gap + top margin, so the following block starts exactly at
 * the next sheet's content top.
 *
 * Spacers are decorations, never document content — they are not saved, and the
 * print/HTML export never sees them.
 */
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

export interface PageSpacer {
  /** Total spacer height in px (bottom margin + page gap + top margin). */
  height: number;
  /** Page number the content after this spacer starts on. */
  page: number;
  /** Distance from the spacer top to the middle of the visible gap. */
  gapOffset: number;
}

export const PAGE_SPACERS_META = "npaPageSpacers";

const pageBreakPluginKey = new PluginKey<DecorationSet>("npaPageBreaks");

function createSpacerDom(spacer: PageSpacer): HTMLElement {
  const element = document.createElement("div");
  element.className = "npa-page-spacer";
  element.setAttribute("contenteditable", "false");
  element.setAttribute("aria-hidden", "true");
  element.setAttribute("data-page-break", String(spacer.page));
  // The spacer starts at the previous page's bottom margin; the visible gap is
  // lower down, so scroll tracking needs the offset to the gap itself.
  element.setAttribute("data-gap-offset", String(Math.round(spacer.gapOffset)));
  element.style.position = "relative";
  element.style.height = `${spacer.height}px`;
  element.style.pointerEvents = "none";

  const label = document.createElement("span");
  label.textContent = `Page ${spacer.page}`;
  label.style.position = "absolute";
  label.style.left = "0";
  label.style.top = `${spacer.gapOffset}px`;
  label.style.transform = "translateY(-50%)";
  label.style.padding = "2px 6px";
  label.style.borderRadius = "9999px";
  label.style.border = "1px solid hsl(var(--border))";
  label.style.background = "hsl(var(--background))";
  label.style.color = "hsl(var(--muted-foreground))";
  label.style.fontSize = "9px";
  label.style.fontWeight = "600";
  label.style.letterSpacing = "0.04em";
  label.style.textTransform = "uppercase";
  label.style.fontVariantNumeric = "tabular-nums";
  label.style.whiteSpace = "nowrap";

  element.appendChild(label);
  return element;
}

function buildDecorations(
  doc: ProseMirrorNode,
  spacers: Map<number, PageSpacer>,
): DecorationSet {
  const decorations: Decoration[] = [];
  for (const [position, spacer] of spacers) {
    const position0 = Math.max(0, Math.min(position, doc.content.size));
    decorations.push(
      Decoration.widget(position0, () => createSpacerDom(spacer), {
        side: 1,
        key: `npa-page-spacer-${position0}-${spacer.page}`,
      }),
    );
  }
  return DecorationSet.create(doc, decorations);
}

export const PageBreaks = Extension.create({
  name: "pageBreaks",
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: pageBreakPluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply(transaction, previous) {
            const spacers = transaction.getMeta(PAGE_SPACERS_META) as
              | Map<number, PageSpacer>
              | undefined;
            if (!spacers) return previous.map(transaction.mapping, transaction.doc);
            return buildDecorations(transaction.doc, spacers);
          },
        },
        props: {
          decorations(state) {
            return pageBreakPluginKey.getState(state) ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
