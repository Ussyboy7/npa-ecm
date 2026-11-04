import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { NpaTableCell, NpaTableHeader } from '../tiptap-table-kit';
import { sanitizePastedRichText } from '../sanitize-html';

const BOQ = readFileSync(
  path.join(__dirname, 'fixtures/excel-clipboard-boq-merged.html'),
  'utf-8',
);

describe('BOQ excel paste (merged title + spacer cols)', () => {
  it('strips empty leading spacers and keeps readable TipTap column widths', () => {
    const cleaned = sanitizePastedRichText(BOQ);

    expect(cleaned).toMatch(/BILL OF QUANTITIES/);
    expect(cleaned).toMatch(/1\.1/);
    expect(cleaned).toMatch(/color:\s*(#fff|white|rgb\(255)/i);
    // Leading empty spacer cells must be gone
    expect(cleaned).not.toMatch(/<td[^>]*colspan="2"[^>]*>\s*<p><br><\/p>\s*<\/td>/i);

    const editor = new Editor({
      extensions: [
        StarterKit,
        Table.configure({ resizable: false }),
        TableRow,
        NpaTableHeader,
        NpaTableCell,
      ],
      content: cleaned,
    });
    const out = editor.getHTML();
    editor.destroy();

    // First row should be the title spanning content cols — no empty spacer pair.
    const firstRow = out.match(/<tr[\s\S]*?<\/tr>/i)?.[0] || '';
    expect(firstRow).toMatch(/BILL OF QUANTITIES/);
    expect(firstRow).not.toMatch(/colspan="2"/i);

    // TipTap colgroup widths must stay usable (no 25px crushed columns).
    const colWidths = [...out.matchAll(/<col[^>]*style="[^"]*width:\s*([\d.]+)px/gi)].map((m) =>
      Number(m[1]),
    );
    expect(colWidths.length).toBeGreaterThanOrEqual(6);
    expect(Math.min(...colWidths)).toBeGreaterThanOrEqual(40);
  });
});
