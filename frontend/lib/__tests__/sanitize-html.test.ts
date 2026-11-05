import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { NpaTableCell, NpaTableHeader } from '../tiptap-table-kit';
import {
  cleanOfficeHtml,
  looksLikeExcelPaste,
  looksLikeOfficePaste,
  sanitizePastedRichText,
} from '../sanitize-html';

const REALISTIC_EXCEL = readFileSync(
  path.join(__dirname, 'fixtures/excel-clipboard-realistic.html'),
  'utf-8',
);

function tipTapTableStats(html: string) {
  const editor = new Editor({
    extensions: [StarterKit, Table, TableRow, NpaTableHeader, NpaTableCell],
    content: html,
  });
  const out = editor.getHTML();
  editor.destroy();
  const rows = (out.match(/<tr\b/gi) || []).length;
  const cells = (out.match(/<t[dh]\b/gi) || []).length;
  return { out, rows, cells };
}

describe('Office paste cleanup', () => {
  it('detects Word/Office clipboard markers', () => {
    expect(looksLikeOfficePaste('<p class="MsoNormal">Hello</p>')).toBe(true);
    expect(looksLikeOfficePaste('<p style="mso-margin-top-alt:0">Hello</p>')).toBe(true);
    expect(looksLikeOfficePaste('<p>Hello</p>')).toBe(false);
  });

  it('detects Excel clipboard markers and keeps table border styles', () => {
    const excel = `
      <html xmlns:x="urn:schemas-microsoft-com:office:excel">
      <table>
        <tr><td style="border:1px solid #000; background-color:#ffff00; mso-number-format:General">100</td></tr>
      </table>
      </html>
    `;
    expect(looksLikeExcelPaste(excel)).toBe(true);
    expect(looksLikeOfficePaste(excel)).toBe(true);
    const cleaned = sanitizePastedRichText(excel);
    expect(cleaned).toMatch(/<table/i);
    expect(cleaned).toMatch(/100/);
    expect(cleaned).toMatch(/border/i);
    expect(cleaned).not.toMatch(/mso-number-format/i);
  });

  it('strips Word conditional comments, namespaces, and Mso classes', () => {
    const input = `
      <!--[if gte mso 9]><xml><w:WordDocument></w:WordDocument></xml><![endif]-->
      <p class="MsoNormal" style="mso-margin-top-alt:auto; color:red; text-align:center">
        <b>Title</b><o:p></o:p>
      </p>
      <p class="MsoNormal">&nbsp;</p>
    `;
    const cleaned = cleanOfficeHtml(input);
    expect(cleaned).not.toMatch(/mso-/i);
    expect(cleaned).not.toMatch(/MsoNormal/i);
    expect(cleaned).not.toMatch(/<o:p/i);
    expect(cleaned).not.toMatch(/WordDocument/i);
    expect(cleaned).toMatch(/text-align:\s*center/i);
    // Authoring colors are kept (Excel white-on-navy headers need `color`).
    expect(cleaned).toMatch(/color:\s*red/i);
    expect(cleaned).toMatch(/<strong>Title<\/strong>/i);
  });

  it('sanitizes pasted Word HTML for editor insert', () => {
    const input = `<p class="MsoNormal" style="mso-fareast-font-family:Times">Safe <script>alert(1)</script>text</p>`;
    const result = sanitizePastedRichText(input);
    expect(result).not.toMatch(/script/i);
    expect(result).not.toMatch(/MsoNormal/i);
    expect(result).toMatch(/Safe/i);
    expect(result).toMatch(/text/i);
  });

  it('keeps indent and picture wrap theater styles from Word-like paste', () => {
    const input = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office">
      <body>
        <p class="MsoNormal" style="margin-left:36px;text-indent:18px;margin-top:8px">Indented</p>
        <img src="cid:x" style="float:left;width:50%;margin-right:0.75rem" alt="pic" />
      </body>
      </html>`;
    const cleaned = sanitizePastedRichText(input);
    expect(cleaned).toMatch(/margin-left:\s*36px/i);
    expect(cleaned).toMatch(/text-indent:\s*18px/i);
    expect(cleaned).toMatch(/float:\s*left/i);
    expect(cleaned).toMatch(/width:\s*50%/i);
  });

  it('realistic Excel clipboard keeps grid + class-driven borders after TipTap load', () => {
    expect(looksLikeExcelPaste(REALISTIC_EXCEL)).toBe(true);

    const cleaned = sanitizePastedRichText(REALISTIC_EXCEL);
    expect(cleaned).toMatch(/Concrete works/);
    expect(cleaned).toMatch(/18020000/);
    // Excel puts borders on .xl* classes in <style>; paste must inline them
    // before stripping the stylesheet, or TipTap shows a borderless mess.
    expect(cleaned).toMatch(/border/i);
    expect(cleaned).toMatch(/background/i);
    expect(cleaned).not.toMatch(/mso-/i);
    expect(cleaned).not.toMatch(/class=/i);

    const { out, rows, cells } = tipTapTableStats(cleaned);
    expect(rows).toBe(4);
    // 4+4+4+2 (last row colspan=3 + amount) = 14 cells in source; TipTap may
    // expand colspan into logical cells — require at least one full grid row.
    expect(cells).toBeGreaterThanOrEqual(10);
    expect(out).toMatch(/Concrete works/);
    expect(out).toMatch(/18020000/);
    // Cell fills/borders must survive TipTap schema round-trip (not only sanitize).
    expect(out).toMatch(/background-color/i);
    expect(out).toMatch(/border/i);
  });
});
