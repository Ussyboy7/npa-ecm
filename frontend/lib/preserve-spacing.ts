/**
 * Authors lay out documents with tab stops and typed runs of spaces (memo
 * To/Date and From/Ref rows, indented lines, aligned figures). Mammoth emits
 * each Word tab as a literal "\t", and ProseMirror's DOM parser collapses every
 * run of spaces and tabs into a single space, so that spacing snaps back to one
 * space as soon as the document is opened in the editor and saved.
 *
 * The spacing stays ordinary, editable paragraph text — no table, no wrapper
 * element: gaps are stored as non-breaking spaces, which the parser leaves
 * alone, so whatever the author spaces out survives load, editing and save and
 * can still be adjusted (or deleted) by hand anywhere in the document.
 */

const TAB_WIDTH = 8;
export const NBSP = "\u00a0";

/** Code keeps literal whitespace — NBSP would break copy/paste out of the editor. */
const LITERAL_WHITESPACE = "pre, code, script, style, textarea";

/** Encode tabs and space runs in one text node as non-breaking spaces. */
function encodeGaps(root: Element): boolean {
  const ownerDocument = root.ownerDocument;
  if (!ownerDocument) return false;

  let changed = false;
  const walker = ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    const data = text.data;
    // Indentation between blocks is not content; NBSP there would become visible.
    if (!data.trim()) continue;
    if (text.parentElement?.closest(LITERAL_WHITESPACE)) continue;

    const next = data
      .replace(/\t/g, NBSP.repeat(TAB_WIDTH))
      .replace(/ {2,}/g, (run) => NBSP.repeat(run.length));
    if (next === data) continue;
    text.data = next;
    changed = true;
  }

  return changed;
}

/**
 * Keep tab stops and typed space runs at their full width through the editor.
 * Only text nodes change, and the result is stable when applied again.
 */
export function preserveSpacing(html: string): string {
  if (!html.trim() || typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html;
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  return encodeGaps(doc.body) ? doc.body.innerHTML : html;
}
