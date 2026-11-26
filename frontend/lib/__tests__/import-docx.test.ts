import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('mammoth', () => ({
  default: {
    convertToHtml: vi.fn(async () => ({
      value: '<p><strong>Imported memo</strong></p><table><tr><td>A</td></tr></table>',
      messages: [],
    })),
    images: {
      dataUri: {},
      imgElement: (fn: unknown) => fn,
    },
  },
}));

vi.mock('emf-converter', () => ({
  convertMetafileToDataUrl: vi.fn(async () => 'data:image/png;base64,AAA'),
}));

import mammoth from 'mammoth';
import { importDocxFileToHtml } from '../import-docx';

describe('importDocxFileToHtml', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-docx files', async () => {
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' });
    await expect(importDocxFileToHtml(file)).rejects.toThrow(/docx/i);
  });

  it('converts docx to sanitized HTML', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'memo.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const html = await importDocxFileToHtml(file);
    expect(html).toMatch(/Imported memo/i);
    expect(html.toLowerCase()).toContain('<table');
  });

  it('keeps tab-stop memo headers as spaced text, not a table', async () => {
    vi.mocked(mammoth.convertToHtml).mockResolvedValueOnce({
      value:
        '<p><strong>To:</strong> General Manager ICT\t<strong>Date:</strong> 1 June 2026</p>' +
        '<p><strong>From:</strong> Asst. General Manager\t<strong>Ref.:</strong> HQ/ICT/01</p>',
      messages: [],
    } as never);
    const file = new File([new Uint8Array([1, 2, 3])], 'memo.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const html = await importDocxFileToHtml(file);
    const text = html.replace(/&nbsp;/g, '\u00a0');

    expect(html).not.toContain('<table');
    expect(html).not.toContain('\t');
    expect(text).toContain(`General Manager ICT${'\u00a0'.repeat(8)}<strong>Date:</strong>`);
    expect(text).toContain(`Asst. General Manager${'\u00a0'.repeat(8)}<strong>Ref.:</strong>`);
  });
});
