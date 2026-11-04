import { readFileSync, readdirSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import {
  sanitizeRichText,
  sanitizePastedRichText,
  cleanOfficeHtml,
} from "@/lib/sanitize-html";
import {
  buildComposePrintHtml,
  type PageSettings,
} from "@/components/dms/PageSetupDialog";

const FIXTURE_DIR = path.join(__dirname, "fixtures", "editor-acceptance");

const PAGE: PageSettings = {
  paperSize: "a4",
  orientation: "portrait",
  marginTop: 15,
  marginBottom: 15,
  marginLeft: 15,
  marginRight: 15,
};

const FIXTURES = readdirSync(FIXTURE_DIR)
  .filter((name) => name.endsWith(".html"))
  .sort()
  .map((name) => ({
    name,
    html: readFileSync(path.join(FIXTURE_DIR, name), "utf-8"),
  }));

function structuralSignals(html: string) {
  const lower = html.toLowerCase();
  return {
    hasTable: lower.includes("<table"),
    hasList: lower.includes("<ul") || lower.includes("<ol") || lower.includes("<li"),
    hasHeading: /<h[1-3]\b/.test(lower),
    hasImg: lower.includes("<img"),
    hasToken: /\{\{[a-z0-9_]+\}\}/i.test(html),
    text: html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  };
}

function createTiptapEditor(html: string) {
  return new Editor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Image,
      Table,
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: html,
  });
}

describe("editor acceptance corpus", () => {
  it("ships the eight NPA acceptance fixtures", () => {
    expect(FIXTURES.map((f) => f.name)).toEqual([
      "01-standard-memo.html",
      "02-official-letter.html",
      "03-word-tables.html",
      "04-excel-boq-memo.html",
      "05-merge-token-template.html",
      "06-signature-images.html",
      "07-long-submission.html",
      "08-legacy-created.html",
    ]);
  });

  describe.each(FIXTURES)("$name", ({ name, html }) => {
    const isOfficePaste = name.startsWith("03-") || name.startsWith("04-");

    it("sanitizes for persistence without losing core structure", () => {
      const cleaned = isOfficePaste
        ? sanitizePastedRichText(html)
        : sanitizeRichText(html);
      const before = structuralSignals(html);
      const after = structuralSignals(cleaned);

      expect(cleaned.toLowerCase()).not.toContain("<script");
      if (before.hasTable) expect(after.hasTable).toBe(true);
      if (before.hasList) expect(after.hasList).toBe(true);
      if (before.hasHeading) expect(after.hasHeading).toBe(true);
      if (before.hasImg) expect(after.hasImg).toBe(true);
      if (before.hasToken) expect(after.hasToken).toBe(true);
      // Meaningful text retained (not string-identical HTML)
      expect(after.text.length).toBeGreaterThan(20);
    });

    it("load → edit → save → reopen via TipTap HTML round-trip", () => {
      const incoming = isOfficePaste
        ? sanitizePastedRichText(html)
        : sanitizeRichText(html);
      const editor = createTiptapEditor(incoming);
      editor.commands.insertContentAt(editor.state.doc.content.size, "<p>Pilot edit marker</p>");
      const saved = sanitizeRichText(editor.getHTML());
      editor.destroy();

      const reopened = createTiptapEditor(saved);
      const reopenedHtml = sanitizeRichText(reopened.getHTML());
      reopened.destroy();

      const signals = structuralSignals(reopenedHtml);
      expect(reopenedHtml).toContain("Pilot edit marker");
      if (structuralSignals(incoming).hasTable) expect(signals.hasTable).toBe(true);
      if (structuralSignals(incoming).hasToken) expect(signals.hasToken).toBe(true);
      if (structuralSignals(incoming).hasImg) expect(signals.hasImg).toBe(true);
    });

    it("Legacy sanitize path keeps reopenable HTML (rollback contract)", () => {
      // TipTap-saved then Legacy-consumed: sanitize again as Legacy would on load/emit
      const tipTapSaved = sanitizeRichText(
        isOfficePaste ? sanitizePastedRichText(html) : html,
      );
      const legacyView = sanitizeRichText(tipTapSaved);
      expect(legacyView.length).toBeGreaterThan(0);
      expect(structuralSignals(legacyView).text.length).toBeGreaterThan(10);
    });

    it("compose print/PDF preview HTML retains sheet + body signals", () => {
      const body = isOfficePaste
        ? sanitizePastedRichText(html)
        : sanitizeRichText(html);
      const printHtml = buildComposePrintHtml(body, PAGE, name, false);
      expect(printHtml).toContain('class="sheet"');
      expect(printHtml).toContain("@page");
      const signals = structuralSignals(body);
      if (signals.hasTable) expect(printHtml.toLowerCase()).toContain("<table");
      if (signals.hasImg) expect(printHtml.toLowerCase()).toContain("<img");
      if (signals.hasToken) expect(printHtml).toMatch(/\{\{[a-z0-9_]+\}\}/i);
      // Meaningful body text survives into print HTML (not string-identical check)
      const token = signals.text.split(/\s+/).find((w) => w.length > 4);
      if (token) expect(printHtml).toContain(token);
    });
  });

  it("Word paste cleanup strips mso wrappers but keeps table cells", () => {
    const word = FIXTURES.find((f) => f.name.startsWith("03-"))!.html;
    const cleaned = cleanOfficeHtml(word);
    expect(cleaned.toLowerCase()).not.toContain("msonormal");
    expect(cleaned.toLowerCase()).toContain("<table");
    expect(cleaned).toContain("Jetty fender");
  });

  it("Excel BOQ paste keeps numeric schedule cells", () => {
    const excel = FIXTURES.find((f) => f.name.startsWith("04-"))!.html;
    const cleaned = sanitizePastedRichText(excel);
    expect(cleaned).toContain("18020000");
    expect(cleaned.toLowerCase()).toContain("<table");
  });
});
