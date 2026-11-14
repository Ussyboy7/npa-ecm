import { describe, expect, it } from "vitest";
import { applyWordFormatting } from "../word-format-import";
import { readZipTextEntry } from "../docx-zip";

const DOCUMENT_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="240" w:after="120" w:line="360" w:lineRule="auto"/>
        <w:ind w:left="720" w:firstLine="360"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:sz w:val="28"/>
          <w:color w:val="1F4E79"/>
          <w:b/>
        </w:rPr>
        <w:t>NIGERIAN PORTS AUTHORITY</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>Memo body starts </w:t></w:r>
      <w:r><w:rPr><w:sz w:val="22"/><w:color w:val="C00000"/></w:rPr><w:t>in red</w:t></w:r>
      <w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t> and ends.</w:t></w:r>
    </w:p>
    <w:tbl>
      <w:tr>
        <w:tc>
          <w:p>
            <w:pPr><w:jc w:val="right"/></w:pPr>
            <w:r><w:t>Ref: NPA/2024</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`;

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
        <w:sz w:val="22"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:jc w:val="left"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="32"/></w:rPr>
  </w:style>
</w:styles>`;

const MAMMOTH_HTML = [
  "<p><strong>NIGERIAN PORTS AUTHORITY</strong></p>",
  "<p>Memo body starts <span>in red</span> and ends.</p>",
  "<table><tr><td><p>Ref: NPA/2024</p></td></tr></table>",
].join("");

function styleOf(element: Element): Record<string, string> {
  const map: Record<string, string> = {};
  for (const part of (element.getAttribute("style") || "").split(";")) {
    const index = part.indexOf(":");
    if (index < 0) continue;
    map[part.slice(0, index).trim()] = part.slice(index + 1).trim();
  }
  return map;
}

describe("applyWordFormatting", () => {
  it("restores paragraph alignment, spacing, indents and run fonts from the docx", () => {
    const result = applyWordFormatting(MAMMOTH_HTML, {
      documentXml: DOCUMENT_XML,
      stylesXml: STYLES_XML,
    });
    const doc = new DOMParser().parseFromString(result, "text/html");
    const paragraphs = Array.from(doc.querySelectorAll("p"));

    const title = styleOf(paragraphs[0]);
    expect(title["text-align"]).toBe("center");
    expect(title["margin-top"]).toBe("12pt");
    expect(title["margin-bottom"]).toBe("6pt");
    expect(title["line-height"]).toBe("1.5");
    expect(title["margin-left"]).toBe("36pt");
    expect(title["text-indent"]).toBe("18pt");
    // Single-run paragraph carries its Word font and size directly.
    expect(title["font-family"]).toBe('"Times New Roman"');
    expect(title["font-size"]).toBe("14pt");

    const body = styleOf(paragraphs[1]);
    expect(body["text-align"]).toBe("justify");
    expect(body["font-family"]).toBe("Calibri");
    expect(body["font-size"]).toBe("11pt");
    expect(body["line-height"]).toBe("1.079");

    const red = Array.from(paragraphs[1].querySelectorAll("span[style]")).find((span) =>
      (span.textContent || "").includes("in red"),
    );
    expect(red).toBeTruthy();
    expect(styleOf(red!)).toMatchObject({ color: "#C00000" });
    expect(result).toContain("and ends.");

    // Table paragraphs are paired too.
    const ref = styleOf(doc.querySelector("td p")!);
    expect(ref["text-align"]).toBe("right");
  });

  it("leaves HTML untouched when the Word part is not parseable", () => {
    const result = applyWordFormatting(MAMMOTH_HTML, { documentXml: "<not-xml" });
    expect(result).toBe(MAMMOTH_HTML);
  });

  it("ignores paragraphs that do not exist in the converted HTML", () => {
    const result = applyWordFormatting("<p>Something else</p>", {
      documentXml: DOCUMENT_XML,
      stylesXml: STYLES_XML,
    });
    expect(result).toBe("<p>Something else</p>");
  });
});

/** Stored (uncompressed) ZIP, enough to exercise the docx part reader. */
function buildStoredZip(entries: Record<string, string>): ArrayBuffer {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const [name, content] of Object.entries(entries)) {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);
    chunks.push(local);

    const entry = new Uint8Array(46 + nameBytes.length);
    const entryView = new DataView(entry.buffer);
    entryView.setUint32(0, 0x02014b50, true);
    entryView.setUint16(4, 20, true);
    entryView.setUint16(10, 0, true);
    entryView.setUint32(20, data.length, true);
    entryView.setUint32(24, data.length, true);
    entryView.setUint16(28, nameBytes.length, true);
    entryView.setUint32(42, offset, true);
    entry.set(nameBytes, 46);
    central.push(entry);

    offset += local.length;
  }

  const centralSize = central.reduce((sum, entry) => sum + entry.length, 0);
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(8, central.length, true);
  eocdView.setUint16(10, central.length, true);
  eocdView.setUint32(12, centralSize, true);
  eocdView.setUint32(16, offset, true);

  const total = offset + centralSize + eocd.length;
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const chunk of [...chunks, ...central, eocd]) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  return out.buffer;
}

describe("readZipTextEntry", () => {
  it("reads a docx part by name", async () => {
    const zip = buildStoredZip({
      "word/document.xml": "<w:document>hello</w:document>",
      "word/styles.xml": "<w:styles/>",
    });
    await expect(readZipTextEntry(zip, "word/document.xml")).resolves.toBe(
      "<w:document>hello</w:document>",
    );
    await expect(readZipTextEntry(zip, "word/styles.xml")).resolves.toBe("<w:styles/>");
  });

  it("returns null for missing parts and non-zip input", async () => {
    const zip = buildStoredZip({ "word/document.xml": "<x/>" });
    await expect(readZipTextEntry(zip, "word/theme.xml")).resolves.toBeNull();
    await expect(readZipTextEntry(new Uint8Array([1, 2, 3]).buffer, "word/document.xml"))
      .resolves.toBeNull();
  });
});
