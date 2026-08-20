import { describe, expect, it } from 'vitest';
import {
  cleanOfficeHtml,
  looksLikeOfficePaste,
  sanitizePastedRichText,
} from '../sanitize-html';

describe('Office paste cleanup', () => {
  it('detects Word/Office clipboard markers', () => {
    expect(looksLikeOfficePaste('<p class="MsoNormal">Hello</p>')).toBe(true);
    expect(looksLikeOfficePaste('<p style="mso-margin-top-alt:0">Hello</p>')).toBe(true);
    expect(looksLikeOfficePaste('<p>Hello</p>')).toBe(false);
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
    expect(cleaned).not.toMatch(/color:\s*red/i);
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
});
