import { describe, expect, it } from "vitest";
import { sanitizeRichText } from "@/lib/sanitize-html";

/**
 * Phase 1 HTML contract checks: sanitized HTML remains the persistence format.
 * Full TipTap Editor mount tests require jsdom + TipTap; round-trip of fixture
 * HTML through sanitize mirrors the emit path both engines use.
 */

const MEMO_FIXTURE = `
<p><strong>NIGERIAN PORTS AUTHORITY</strong></p>
<p>Office Memorandum</p>
<ul><li>Item one</li><li>Item two</li></ul>
<table><tbody>
<tr><td>Col A</td><td>Col B</td></tr>
<tr><td>1</td><td>2</td></tr>
</tbody></table>
<p><img src="https://example.com/sig.png" alt="Signature" /></p>
`.trim();

describe("tiptap html persistence contract", () => {
  it("sanitizes memo fixture without stripping core structure", () => {
    const cleaned = sanitizeRichText(MEMO_FIXTURE);
    expect(cleaned).toContain("<strong>");
    expect(cleaned).toContain("<ul>");
    expect(cleaned).toContain("<table>");
    expect(cleaned).toContain("<img");
    expect(cleaned.toLowerCase()).not.toContain("<script");
  });

  it("idempotent sanitize does not thrash stable HTML", () => {
    const once = sanitizeRichText(MEMO_FIXTURE);
    const twice = sanitizeRichText(once);
    expect(twice).toBe(once);
  });

  it("strips script tags from hostile HTML before persistence", () => {
    const cleaned = sanitizeRichText(`<p>Safe</p><script>alert(1)</script>`);
    expect(cleaned).toContain("Safe");
    expect(cleaned.toLowerCase()).not.toContain("script");
  });
});
