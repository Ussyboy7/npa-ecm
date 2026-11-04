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
});
