import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { preserveSpacing } from "../preserve-spacing";

const NBSP = "\u00a0";

const MEMO_HEADER = [
  '<p style="text-align:center"><strong>NIGERIAN PORTS AUTHORITY</strong></p>',
  // Mammoth emits a literal tab for each Word tab stop.
  '<p><strong>To:</strong> General Manager ICT\t<strong>Date:</strong> 22 June 2026</p>',
  '<p><strong>From:</strong> Asst. General Manager\t<strong>Ref.:</strong> HQ/ICT/01</p>',
  "<p>Body paragraph with ordinary spacing.</p>",
].join("");

function htmlOf(html: string): string {
  const editor = new Editor({ extensions: [StarterKit], content: html });
  const out = editor.getHTML();
  editor.destroy();
  return out;
}

/** Both ProseMirror and the DOM serializer write the gap as `&nbsp;`. */
const withNbspChars = (html: string) => html.replace(/&nbsp;/g, NBSP);

describe("editor whitespace behaviour", () => {
  it("collapses runs of spaces and tabs to one space when a document is loaded", () => {
    const out = htmlOf(
      '<p>To: A                     Date: B</p><p>From: C\tRef.: D</p>',
    );
    expect(out).toContain("To: A Date: B");
    expect(out).toContain("From: C Ref.: D");
  });

  it("keeps non-breaking spaces, so an encoded gap survives load and save", () => {
    const gap = NBSP.repeat(12);
    const out = withNbspChars(htmlOf(`<p>To: A${gap}Date: B</p>`));
    expect(out).toContain(`To: A${gap}Date: B`);
  });
});

describe("preserveSpacing", () => {
  it("encodes memo To/Date and From/Ref tab stops as collapsible-proof spaces", () => {
    const html = withNbspChars(preserveSpacing(MEMO_HEADER));

    expect(html).not.toContain("\t");
    expect(html).toContain(`General Manager ICT${NBSP.repeat(8)}<strong>Date:</strong>`);
    expect(html).toContain(`Asst. General Manager${NBSP.repeat(8)}<strong>Ref.:</strong>`);
    // Still plain paragraphs — no table is introduced.
    expect(html).not.toContain("<table");
  });

  it("keeps a typed run of spaces at its full width", () => {
    const gap = " ".repeat(33);
    const html = withNbspChars(
      preserveSpacing(`<p><strong>To:</strong> ICT${gap}<strong>Date:</strong> 1 June</p>`),
    );
    expect(html).toContain(`ICT${NBSP.repeat(33)}<strong>Date:</strong>`);
  });

  it("keeps spacing anywhere in the document, not just the memo header", () => {
    const html = withNbspChars(
      preserveSpacing(
        [
          "<p>Item     Amount</p>",
          "<p>Signature:  ....................    Date: ______</p>",
          "<ul><li>Nested    note</li></ul>",
          "<table><tbody><tr><td>Cell   text</td></tr></tbody></table>",
          "<p>Indented\tline</p>",
        ].join(""),
      ),
    );

    expect(html).toContain(`Item${NBSP.repeat(5)}Amount`);
    expect(html).toContain(`Signature:${NBSP.repeat(2)}....................${NBSP.repeat(4)}Date:`);
    expect(html).toContain(`Nested${NBSP.repeat(4)}note`);
    expect(html).toContain(`Cell${NBSP.repeat(3)}text`);
    expect(html).toContain(`Indented${NBSP.repeat(8)}line`);
    expect(html).not.toContain("\t");
  });

  it("leaves lone spaces, indentation between blocks and code untouched", () => {
    const html = preserveSpacing(
      '<p>To: a b</p>\n  <pre><code>if (a) {\n  b();\n}</code></pre><p>Date: c</p>',
    );
    expect(html).toBe(
      '<p>To: a b</p>\n  <pre><code>if (a) {\n  b();\n}</code></pre><p>Date: c</p>',
    );
  });

  it("is idempotent", () => {
    const once = preserveSpacing(MEMO_HEADER);
    expect(preserveSpacing(once)).toBe(once);
  });

  it("survives a full editor load and save, header and body alike", () => {
    const out = withNbspChars(
      htmlOf(preserveSpacing(`${MEMO_HEADER}<p>Total   1,234.00</p>`)),
    );
    expect(out).toContain(`General Manager ICT${NBSP.repeat(8)}<strong>Date:</strong>`);
    expect(out).toContain(`Total${NBSP.repeat(3)}1,234.00`);
  });
});
