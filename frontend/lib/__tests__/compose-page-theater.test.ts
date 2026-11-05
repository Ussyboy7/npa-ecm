import { describe, expect, it } from "vitest";
import {
  bodyContentHeightPx,
  estimatePageCount,
  escapePlainTextForHtml,
  pageBreakOffsetsPx,
} from "@/lib/compose-page-theater";
import type { PageSettings } from "@/components/dms/PageSetupDialog";
import { buildComposePrintHtml } from "@/components/dms/PageSetupDialog";

const PAGE: PageSettings = {
  paperSize: "a4",
  orientation: "portrait",
  marginTop: 25,
  marginBottom: 25,
  marginLeft: 25,
  marginRight: 25,
};

describe("compose page theater", () => {
  it("estimates pages and break offsets", () => {
    const per = bodyContentHeightPx(PAGE, true);
    expect(estimatePageCount(per * 2.2, PAGE, true)).toBe(3);
    expect(pageBreakOffsetsPx(3, PAGE, true)).toEqual([per, per * 2]);
    expect(pageBreakOffsetsPx(1, PAGE, true)).toEqual([]);
  });

  it("escapes header/footer plain text", () => {
    expect(escapePlainTextForHtml(`A <b> & "x"`)).toBe("A &lt;b&gt; &amp; &quot;x&quot;");
  });

  it("print HTML includes header, footer, and explicit page label", () => {
    const html = buildComposePrintHtml(
      "<p>Body memo</p>",
      PAGE,
      "Test",
      false,
      {
        headerText: "NPA Header",
        footerText: "Confidential",
        showPageNumbers: true,
        pageCount: 2,
      },
    );
    expect(html).toContain('class="doc-header"');
    expect(html).toContain("NPA Header");
    expect(html).toContain('class="doc-footer"');
    expect(html).toContain("Confidential");
    expect(html).toContain("Page 1 of 2");
    expect(html).not.toContain("counter(page)");
    expect(html).toContain("Body memo");
    // Margins on the sheet + zero @page margin — avoids a blank second page.
    expect(html).toContain("margin: 0;");
    expect(html).toContain("padding: 25mm 25mm 25mm 25mm");
  });

  it("omits empty header/footer chrome when not provided", () => {
    const html = buildComposePrintHtml("<p>Body</p>", PAGE, "T", false, {
      showPageNumbers: false,
    });
    expect(html).not.toContain('class="doc-header"');
    expect(html).not.toContain('class="doc-footer"');
    expect(html).toContain("Body");
  });

  it("page footer has no divider line", () => {
    const html = buildComposePrintHtml("<p>Body</p>", PAGE, "T", false, {
      showPageNumbers: true,
      pageCount: 1,
    });
    expect(html).toContain("Page 1 of 1");
    const footerCssStart = html.indexOf(".doc-footer {");
    const footerCss = html.slice(footerCssStart, footerCssStart + 220);
    expect(footerCss).not.toContain("border-top");
  });

  it("escapes script-like header text", () => {
    const html = buildComposePrintHtml("<p>x</p>", PAGE, "T", false, {
      headerText: `<script>alert(1)</script>`,
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
