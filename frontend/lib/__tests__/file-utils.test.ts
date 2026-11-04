import { describe, expect, it } from 'vitest';
import { resolveUploadMimeType, validateFileType } from '../file-utils';

describe('validateFileType', () => {
  it('accepts docx/xlsx when browser reports empty MIME (macOS quirk)', () => {
    const docx = new File([new Uint8Array([1])], 'memo.docx', { type: '' });
    const xlsx = new File([new Uint8Array([1])], 'boq.xlsx', { type: '' });
    expect(validateFileType(docx)).toEqual({ valid: true });
    expect(validateFileType(xlsx)).toEqual({ valid: true });
  });

  it('accepts application/octet-stream Office files by extension', () => {
    const docx = new File([new Uint8Array([1])], 'memo.docx', {
      type: 'application/octet-stream',
    });
    expect(validateFileType(docx)).toEqual({ valid: true });
  });

  it('rejects disallowed extensions', () => {
    const exe = new File([new Uint8Array([1])], 'virus.exe', { type: '' });
    expect(validateFileType(exe).valid).toBe(false);
  });
});

describe('resolveUploadMimeType', () => {
  it('fills Office MIME when File.type is blank', () => {
    const docx = new File([new Uint8Array([1])], 'memo.docx', { type: '' });
    expect(resolveUploadMimeType(docx)).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    const xlsx = new File([new Uint8Array([1])], 'boq.xlsx', { type: '' });
    expect(resolveUploadMimeType(xlsx)).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });
});
