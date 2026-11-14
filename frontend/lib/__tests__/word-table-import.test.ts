import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TableRow } from "@tiptap/extension-table-row";
import { NpaTable, NpaTableCell, NpaTableHeader, NpaTableRow } from "../tiptap-table-kit";
import { applyWordTableFormatting } from "../word-table-import";
import { sanitizePastedRichText } from "../sanitize-html";

function tableXml(
  options: { borders?: string; grid?: string; extra?: string; cellShading?: boolean } = {},
): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:tbl>
      <w:tblPr>
        ${options.extra ?? ""}
        ${options.borders ?? ""}
      </w:tblPr>
      <w:tblGrid>${options.grid ?? '<w:gridCol w:w="1800"/><w:gridCol w:w="5400"/>'}</w:tblGrid>
      <w:tr>
        <w:tc><w:tcPr>${options.cellShading ? '<w:shd w:val="clear" w:fill="D9E2F3"/>' : ""}</w:tcPr><w:p><w:r><w:t>To:</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>The Managing Director</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Date:</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>14 July 2023</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`;
}

const MAMMOTH_TABLE = `<table><tr><td><p>To:</p></td><td><p>The Managing Director</p></td></tr><tr><td><p>Date:</p></td><td><p>14 July 2023</p></td></tr></table>`;

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

function styleOf(element: Element | null): Record<string, string> {
  const map: Record<string, string> = {};
  for (const part of (element?.getAttribute("style") || "").split(";")) {
    const index = part.indexOf(":");
    if (index < 0) continue;
    map[part.slice(0, index).trim()] = part.slice(index + 1).trim();
  }
  return map;
}

describe("applyWordTableFormatting", () => {
  it("keeps a borderless Word memo table borderless and adds its column widths", () => {
    const html = applyWordTableFormatting(MAMMOTH_TABLE, { documentXml: tableXml() });
    const doc = parse(html);
    const table = doc.querySelector("table")!;

    expect(styleOf(table).border).toBe("none");
    expect(styleOf(table)["border-collapse"]).toBe("collapse");
    expect(table.getAttribute("data-borderless")).toBe("true");

    const cols = Array.from(table.querySelectorAll("col")).map((col) => styleOf(col).width);
    expect(cols).toEqual(["120px", "360px"]);
    // Borderless tables keep their original cell styling untouched.
    expect(styleOf(doc.querySelector("td"))).toEqual({});
  });

  it("carries Word's table rules onto individual cells", () => {
    const borders = `<w:tblBorders>
      <w:top w:val="single" w:sz="8" w:color="000000"/>
      <w:left w:val="single" w:sz="8" w:color="000000"/>
      <w:bottom w:val="single" w:sz="8" w:color="000000"/>
      <w:right w:val="single" w:sz="8" w:color="000000"/>
      <w:insideH w:val="single" w:sz="4" w:color="auto"/>
      <w:insideV w:val="single" w:sz="4" w:color="auto"/>
    </w:tblBorders>`;
    const html = applyWordTableFormatting(MAMMOTH_TABLE, {
      documentXml: tableXml({ borders }),
    });
    const doc = parse(html);
    const table = doc.querySelector("table")!;
    expect(styleOf(table).border).toBeUndefined();
    expect(table.hasAttribute("data-borderless")).toBe(false);

    const firstRow = table.querySelectorAll("tr")[0];
    const [firstCell, secondCell] = Array.from(firstRow.children);
    const first = styleOf(firstCell);
    const second = styleOf(secondCell);

    // Outer rules on the edges, Word's inside rules between them.
    expect(first["border-top"]).toBe("1px solid #000000");
    expect(first["border-left"]).toBe("1px solid #000000");
    expect(first["border-right"]).toBe("1px solid #000000");
    expect(second["border-right"]).toBe("1px solid #000000");
    expect(styleOf(table.querySelectorAll("tr")[1].children[0])["border-bottom"]).toBe(
      "1px solid #000000",
    );
  });

  it("applies cell shading, vertical alignment and table alignment", () => {
    const extra = `<w:jc w:val="center"/>`;
    const html = applyWordTableFormatting(MAMMOTH_TABLE, {
      documentXml: tableXml({ extra }),
    });
    const table = parse(html).querySelector("table")!;
    const style = styleOf(table);
    expect(style["margin-left"]).toBe("auto");
    expect(style["margin-right"]).toBe("auto");
  });

  it("resolves borders declared by a Word table style", () => {
    const html = applyWordTableFormatting(MAMMOTH_TABLE, {
      documentXml: tableXml({ extra: '<w:tblStyle w:val="TableGrid"/>' }),
      stylesXml: `<?xml version="1.0"?>
        <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:style w:type="table" w:styleId="TableGrid">
            <w:tblPr><w:tblBorders>
              <w:top w:val="single" w:sz="4" w:color="auto"/>
              <w:insideH w:val="single" w:sz="4" w:color="auto"/>
            </w:tblBorders></w:tblPr>
          </w:style>
        </w:styles>`,
    });
    const doc = parse(html);
    expect(styleOf(doc.querySelector("table")).border).toBeUndefined();
    expect(styleOf(doc.querySelector("td"))["border-top"]).toBe("1px solid #000000");
  });

  it("carries Word's cell padding, including per-cell overrides", () => {
    const cellMargins = `<w:tblCellMar>
      <w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/>
      <w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/>
    </w:tblCellMar>`;
    const withOverride = tableXml({ extra: cellMargins }).replace(
      '<w:tc><w:tcPr></w:tcPr><w:p><w:r><w:t>To:</w:t></w:r></w:p></w:tc>',
      '<w:tc><w:tcPr><w:tcMar><w:left w:w="216" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:r><w:t>To:</w:t></w:r></w:p></w:tc>',
    );

    const doc = parse(
      applyWordTableFormatting(MAMMOTH_TABLE, { documentXml: withOverride }),
    );
    const cells = Array.from(doc.querySelectorAll("td"));
    // 108 twips ≈ 7px; the cell's own w:tcMar wins where it sets a side.
    expect(styleOf(cells[0]).padding).toBe("0px 7px 0px 14px");
    expect(styleOf(cells[1]).padding).toBe("0px 7px 0px 7px");
  });

  it("applies the table style's header row and banded row formatting", () => {
    const documentXml = `<?xml version="1.0"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
        <w:tbl>
          <w:tblPr>
            <w:tblStyle w:val="Banded"/>
            <w:tblLook w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0"/>
          </w:tblPr>
          <w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/></w:tblGrid>
          <w:tr><w:tc><w:p><w:r><w:t>Ref</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Subject</w:t></w:r></w:p></w:tc></w:tr>
          <w:tr><w:tc><w:p><w:r><w:t>A</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>One</w:t></w:r></w:p></w:tc></w:tr>
          <w:tr><w:tc><w:p><w:r><w:t>B</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Two</w:t></w:r></w:p></w:tc></w:tr>
        </w:tbl>
      </w:body></w:document>`;
    const stylesXml = `<?xml version="1.0"?>
      <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:style w:type="table" w:styleId="Banded">
          <w:tblPr><w:tblBorders>
            <w:insideH w:val="single" w:sz="4" w:color="auto"/>
          </w:tblBorders></w:tblPr>
          <w:tblStylePr w:type="firstRow">
            <w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr>
            <w:tcPr><w:shd w:val="clear" w:fill="1F4E79"/></w:tcPr>
          </w:tblStylePr>
          <w:tblStylePr w:type="band1Horz">
            <w:tcPr><w:shd w:val="clear" w:fill="F2F2F2"/></w:tcPr>
          </w:tblStylePr>
        </w:style>
      </w:styles>`;

    const html = applyWordTableFormatting(
      `<table><tr><td><p>Ref</p></td><td><p>Subject</p></td></tr><tr><td><p>A</p></td><td><p>One</p></td></tr><tr><td><p>B</p></td><td><p>Two</p></td></tr></table>`,
      { documentXml, stylesXml },
    );
    const rows = Array.from(parse(html).querySelectorAll("tr"));
    const header = styleOf(rows[0].children[0]);
    expect(header["background-color"]).toBe("#1F4E79");
    expect(header["font-weight"]).toBe("700");
    expect(header.color).toBe("#FFFFFF");

    // Body rows alternate, starting with band 1.
    expect(styleOf(rows[1].children[0])["background-color"]).toBe("#F2F2F2");
    expect(styleOf(rows[2].children[0])["background-color"]).toBeUndefined();
    // Word's inside rule still separates the rows.
    expect(styleOf(rows[1].children[0])["border-top"]).toBe("1px solid #000000");
  });

  it("keeps direct cell shading over the table style's banding", () => {
    const documentXml = tableXml({ cellShading: true, extra: '<w:tblStyle w:val="Banded"/>' });
    const stylesXml = `<?xml version="1.0"?>
      <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:style w:type="table" w:styleId="Banded">
          <w:tblStylePr w:type="band1Horz">
            <w:tcPr><w:shd w:val="clear" w:fill="F2F2F2"/></w:tcPr>
          </w:tblStylePr>
        </w:style>
      </w:styles>`;
    const doc = parse(
      applyWordTableFormatting(MAMMOTH_TABLE, { documentXml, stylesXml }),
    );
    expect(styleOf(doc.querySelector("td"))["background-color"]).toBe("#D9E2F3");
  });

  it("scales an over-wide grid to the page content width, keeping proportions", () => {
    const grid = '<w:gridCol w:w="9000"/><w:gridCol w:w="3000"/>';
    const doc = parse(
      applyWordTableFormatting(MAMMOTH_TABLE, { documentXml: tableXml({ grid }) }),
    );
    const widths = Array.from(doc.querySelectorAll("col")).map((col) =>
      Number.parseFloat(styleOf(col).width),
    );
    // 600px + 200px would overflow an A4 text column; 3:1 ratio is preserved.
    // A4 text width at 25mm margins, so imported grids never spill past the page.
    expect(widths.reduce((sum, width) => sum + width, 0)).toBeLessThanOrEqual(604);
    expect(widths[0] / widths[1]).toBeCloseTo(3, 1);
  });

  it("leaves unrelated tables untouched", () => {
    const html = applyWordTableFormatting("<table><tr><td>Other</td></tr></table>", {
      documentXml: tableXml(),
    });
    const table = parse(html).querySelector("table")!;
    expect(table.getAttribute("style")).toBeNull();
    expect(table.querySelector("colgroup")).toBeNull();
    expect(parse(html).querySelector("td")!.getAttribute("style")).toBeNull();
  });
});

describe("imported Word tables in TipTap", () => {
  const SAMPLE = `<table data-borderless="true" style="border-collapse: collapse; border: none">
    <colgroup><col style="width: 120px"><col style="width: 360px"></colgroup>
    <tr><td colwidth="120"><p>To:</p></td><td colwidth="360"><p>The Managing Director</p></td></tr>
  </table>`;

  it("keeps the table style and column widths through load and emit", () => {
    const cleaned = sanitizePastedRichText(SAMPLE);
    const editor = new Editor({
      extensions: [StarterKit, NpaTable, TableRow, NpaTableHeader, NpaTableCell],
      content: cleaned,
    });
    const out = editor.getHTML();
    editor.destroy();

    expect(out).toMatch(/<table[^>]*data-borderless="true"/);
    expect(out).not.toMatch(/<table[^>]*width:\s*100%/);
    expect(out).toMatch(/<col[^>]*width:\s*120px/);
    expect(out).toContain('colwidth="120"');
  });

  it("keeps a dragged row height through save and reload", () => {
    const saved = sanitizePastedRichText(
      `<table data-borderless="true" style="border-collapse: collapse">
        <tr data-row-height="64" style="height: 64px"><td colwidth="120"><p>Header</p></td></tr>
        <tr><td colwidth="120"><p>Body</p></td></tr>
      </table>`,
    );
    const rowHeights = (html: string) => {
      const editor = new Editor({
        extensions: [StarterKit, NpaTable, NpaTableRow, NpaTableHeader, NpaTableCell],
        content: html,
      });
      const out = editor.getHTML();
      editor.destroy();
      return out;
    };

    const out = rowHeights(saved);
    expect(out).toMatch(/<tr[^>]*data-row-height="64"/);
    expect(out).toMatch(/<tr[^>]*height:\s*64px/);
    // Reloading the emitted HTML keeps the height instead of resetting it.
    expect(rowHeights(out)).toMatch(/<tr[^>]*data-row-height="64"/);
  });

  it("keeps a tightened cell padding shorthand from a row drag", () => {
    const editor = new Editor({
      extensions: [StarterKit, NpaTable, NpaTableRow, NpaTableHeader, NpaTableCell],
      content: `<table><tr><td style="padding: 0px 8px"><p>Row</p></td></tr></table>`,
    });
    const out = editor.getHTML();
    editor.destroy();

    expect(out).toMatch(/padding:\s*0px 8px/);
  });

  it("converts a Word point row height to pixels", () => {
    const editor = new Editor({
      extensions: [StarterKit, NpaTable, NpaTableRow, NpaTableHeader, NpaTableCell],
      content: `<table><tr style="height: 36pt"><td><p>Row</p></td></tr></table>`,
    });
    const out = editor.getHTML();
    editor.destroy();

    expect(out).toMatch(/<tr[^>]*data-row-height="48"/);
  });

  it("drops legacy full-width styling so saved tables remain resizable", () => {
    const editor = new Editor({
      extensions: [StarterKit, NpaTable, TableRow, NpaTableHeader, NpaTableCell],
      content: `<table style="width: 100%; border-collapse: collapse"><tr><td colwidth="120"><p>Item</p></td></tr></table>`,
    });
    const out = editor.getHTML();
    editor.destroy();

    expect(out).not.toMatch(/<table[^>]*width:\s*100%/);
    expect(out).toContain('colwidth="120"');
  });
});
