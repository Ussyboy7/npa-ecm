import { describe, expect, it } from 'vitest';
import { shouldPasteClipboardAsPicture } from '../paste-as-picture';

describe('shouldPasteClipboardAsPicture', () => {
  const excelHtml =
    '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><table><tr><td>1</td></tr></table></html>';

  it('uses picture for image-only clipboard (Excel Copy as Picture)', () => {
    expect(
      shouldPasteClipboardAsPicture({ hasImage: true, html: '', altKey: false }),
    ).toBe(true);
  });

  it('keeps editable Excel table on normal paste when only HTML is present', () => {
    expect(
      shouldPasteClipboardAsPicture({ hasImage: false, html: excelHtml, altKey: false }),
    ).toBe(false);
  });

  it('forces picture when Alt is held with Excel HTML', () => {
    expect(
      shouldPasteClipboardAsPicture({ hasImage: false, html: excelHtml, altKey: true }),
    ).toBe(true);
  });

  it('prefers picture for non-Excel HTML that also has an image', () => {
    expect(
      shouldPasteClipboardAsPicture({
        hasImage: true,
        html: '<p>caption</p>',
        altKey: false,
      }),
    ).toBe(true);
  });
});
