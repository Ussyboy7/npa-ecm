"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText } from "lucide-react";
import { DOC_PAPER, getPrintPreviewChrome } from "@/lib/theme-colors";

export type PaperSize = "a4" | "letter" | "legal";
export type PageOrientation = "portrait" | "landscape";

export interface PageSettings {
  paperSize: PaperSize;
  orientation: PageOrientation;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

export const PAPER_DIMENSIONS: Record<PaperSize, { widthMm: number; heightMm: number; widthIn: string; heightIn: string }> = {
  a4: { widthMm: 210, heightMm: 297, widthIn: '8.27"', heightIn: '11.69"' },
  letter: { widthMm: 216, heightMm: 279, widthIn: '8.5"', heightIn: '11"' },
  legal: { widthMm: 216, heightMm: 356, widthIn: '8.5"', heightIn: '14"' },
};

export const getPageDimensions = (settings: PageSettings) => {
  const paper = PAPER_DIMENSIONS[settings.paperSize];
  const isLandscape = settings.orientation === "landscape";
  const contentWidth = (isLandscape ? paper.heightMm : paper.widthMm) - settings.marginLeft - settings.marginRight;
  const contentHeight = (isLandscape ? paper.widthMm : paper.heightMm) - settings.marginTop - settings.marginBottom;
  return {
    widthMm: isLandscape ? paper.heightMm : paper.widthMm,
    heightMm: isLandscape ? paper.widthMm : paper.heightMm,
    contentWidthMm: contentWidth,
    contentHeightMm: contentHeight,
    contentWidthPx: Math.round((contentWidth / 25.4) * 96),
    contentHeightPx: Math.round((contentHeight / 25.4) * 96),
  };
};

export type ComposePrintChrome = {
  /** Plain text; escaped into the sheet header band. */
  headerText?: string;
  /** Plain text; escaped into the sheet footer band. */
  footerText?: string;
  /** Show page label in the footer (explicit text — CSS counters are unreliable). */
  showPageNumbers?: boolean;
  /** Estimated / known page count for the page label. */
  pageCount?: number;
};

/**
 * Build a print-ready HTML document matching the compose editor sheet.
 * Tip: in the system print dialog, turn off “Headers and footers” so the browser
 * does not add date/URL/title around the page.
 */
export function buildComposePrintHtml(
  html: string,
  settings: PageSettings,
  title = "Document",
  darkChrome = false,
  chrome: ComposePrintChrome = {},
): string {
  const dims = getPageDimensions(settings);
  const paperLabel = settings.paperSize.toUpperCase();
  // Keep title short/blank-ish so Chrome’s optional print header is less noisy.
  const safeTitle = (title || "Document").replace(/[<>&"]/g, "");
  const bodyHtml = html.trim()
    ? html
    : `<p style="color:${DOC_PAPER.muted};margin:0;">No content to preview. Add text in the editor first.</p>`;
  const { surroundBg, surroundColor } = getPrintPreviewChrome(darkChrome);

  const headerRaw = (chrome.headerText || "").trim();
  const footerRaw = (chrome.footerText || "").trim();
  const showPageNumbers = chrome.showPageNumbers === true;
  const pageCount = Math.max(1, Math.floor(chrome.pageCount || 1));
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const headerHtml = headerRaw ? escape(headerRaw) : "";
  const footerHtml = footerRaw ? escape(footerRaw) : "";
  const hasHeader = Boolean(headerHtml);
  const hasFooter = Boolean(footerHtml) || showPageNumbers;
  const pageLabel = showPageNumbers ? `Page 1 of ${pageCount}` : "";

  // Margins on the sheet (@page margin 0). Header/footer are absolutely pinned
  // into the top/bottom margin zones so the page label stays at the page bottom.
  const footerBottomMm = Math.max(6, Math.min(12, settings.marginBottom * 0.35));
  const headerTopMm = Math.max(6, Math.min(12, settings.marginTop * 0.35));
  const pageCss = `
    @page {
      size: ${paperLabel} ${settings.orientation};
      margin: 0;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: ${surroundBg};
      color: ${surroundColor};
      font-family: Verdana, Geneva, sans-serif;
      font-size: 12pt;
      line-height: 1.15;
    }
    .sheet {
      box-sizing: border-box;
      width: ${dims.widthMm}mm;
      min-height: ${dims.heightMm}mm;
      margin: 16px auto;
      padding: ${settings.marginTop}mm ${settings.marginRight}mm ${settings.marginBottom}mm ${settings.marginLeft}mm;
      background: ${DOC_PAPER.background};
      color: ${DOC_PAPER.foreground};
      box-shadow: 0 1px 4px rgba(0,0,0,0.12);
      position: relative;
    }
    .doc-header, .doc-footer {
      font-size: 9pt;
      color: ${DOC_PAPER.muted};
      line-height: 1.2;
      position: absolute;
      left: ${settings.marginLeft}mm;
      right: ${settings.marginRight}mm;
      white-space: pre-wrap;
      box-sizing: border-box;
    }
    .doc-header {
      top: ${headerTopMm}mm;
    }
    .doc-body {
      position: relative;
      z-index: 1;
    }
    .doc-footer {
      bottom: ${footerBottomMm}mm;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-end;
    }
    .doc-footer .page-num { white-space: nowrap; flex-shrink: 0; margin-left: auto; }
    .sheet img { max-width: 100%; height: auto; }
    .sheet p { margin: 0; }
    .sheet table { width: 100%; border-collapse: collapse; }
    .sheet td, .sheet th { border: 1px solid ${DOC_PAPER.border}; padding: 8px; vertical-align: top; }
    .sheet table[style*="border: none"] td,
    .sheet table[style*="border:none"] td,
    .sheet table[style*="border: none"] th,
    .sheet table[style*="border:none"] th,
    .sheet td[style*="border: none"],
    .sheet td[style*="border:none"],
    .sheet th[style*="border: none"],
    .sheet th[style*="border:none"] {
      border: none !important;
      background: transparent;
      padding-left: 0;
      padding-right: 0;
    }
    .sheet ul { list-style: disc; padding-left: 1.5rem; }
    .sheet ol { list-style: decimal; padding-left: 1.5rem; }
    @media print {
      html, body { background: ${DOC_PAPER.background} !important; }
      .sheet {
        margin: 0;
        box-shadow: none;
        width: ${dims.widthMm}mm;
        min-height: ${dims.heightMm}mm;
        padding: ${settings.marginTop}mm ${settings.marginRight}mm ${settings.marginBottom}mm ${settings.marginLeft}mm;
      }
    }
  `;

  const headerBlock = hasHeader ? `<div class="doc-header">${headerHtml}</div>` : "";
  const footerBlock = hasFooter
    ? `<div class="doc-footer"><span class="footer-text">${footerHtml}</span>${
        showPageNumbers
          ? `<span class="page-num" aria-label="Page number">${escape(pageLabel)}</span>`
          : ""
      }</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>${pageCss}</style>
</head>
<body>
  <div class="sheet">
    ${headerBlock}
    <div class="doc-body">${bodyHtml}</div>
    ${footerBlock}
  </div>
</body>
</html>`;
}

/**
 * Open compose print preview in a new tab (fallback). Prefer the in-app modal.
 */
export function openComposePrintPreview(
  html: string,
  settings: PageSettings,
  title = "Document",
): void {
  const fullHtml = buildComposePrintHtml(
    html,
    settings,
    title,
    typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );
  const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const previewWindow = window.open(url, "_blank");
  if (!previewWindow) {
    URL.revokeObjectURL(url);
    throw new Error("Allow pop-ups to open print preview");
  }
  previewWindow.focus();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

interface PageSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: PageSettings;
  showPageNumbers?: boolean;
  onApply: (settings: PageSettings, extras?: { showPageNumbers: boolean }) => void;
}

export function PageSetupDialog({
  open,
  onOpenChange,
  settings,
  showPageNumbers = true,
  onApply,
}: PageSetupDialogProps) {
  const [draft, setDraft] = useState<PageSettings>(settings);
  const [draftPageNumbers, setDraftPageNumbers] = useState(showPageNumbers);

  useEffect(() => {
    if (!open) return;
    setDraft(settings);
    setDraftPageNumbers(showPageNumbers);
  }, [open, settings, showPageNumbers]);

  const handleApply = () => {
    onApply(draft, { showPageNumbers: draftPageNumbers });
    onOpenChange(false);
  };

  const dims = getPageDimensions(draft);
  const paper = PAPER_DIMENSIONS[draft.paperSize];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Page Setup
          </DialogTitle>
          <DialogDescription>
            Configure page size, orientation, margins, and page numbers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Paper Size</Label>
              <Select
                value={draft.paperSize}
                onValueChange={(v) => setDraft({ ...draft, paperSize: v as PaperSize })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4">A4 (210 × 297 mm)</SelectItem>
                  <SelectItem value="letter">Letter (8.5 × 11 in)</SelectItem>
                  <SelectItem value="legal">Legal (8.5 × 14 in)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Orientation</Label>
              <Select
                value={draft.orientation}
                onValueChange={(v) => setDraft({ ...draft, orientation: v as PageOrientation })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="landscape">Landscape</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {(["marginTop", "marginBottom", "marginLeft", "marginRight"] as const).map((key) => (
              <div key={key} className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">
                  {key === "marginTop" ? "Top" : key === "marginBottom" ? "Bottom" : key === "marginLeft" ? "Left" : "Right"} (mm)
                </Label>
                <Select
                  value={String(draft[key])}
                  onValueChange={(v) => setDraft({ ...draft, [key]: Number(v) })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 5, 10, 12.7, 15, 20, 25].map((mm) => (
                      <SelectItem key={mm} value={String(mm)}>{mm} mm</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <label className="flex items-start gap-2 rounded border border-border/60 bg-muted/30 px-3 py-2 cursor-pointer">
            <Checkbox
              checked={draftPageNumbers}
              onCheckedChange={(v) => setDraftPageNumbers(v === true)}
              className="mt-0.5"
              aria-label="Show page numbers"
            />
            <span className="space-y-0.5">
              <span className="block text-xs font-medium text-foreground">Show page numbers</span>
              <span className="block text-[11px] text-muted-foreground leading-snug">
                Prints “Page 1 of N” in the bottom-right. Uncheck to hide.
              </span>
            </span>
          </label>

          <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 space-y-1">
            <p><strong>Paper:</strong> {paper.widthIn} × {paper.heightIn} ({draft.paperSize.toUpperCase()})</p>
            <p><strong>Content area:</strong> {dims.contentWidthPx} × {dims.contentHeightPx} px</p>
            <p><strong>Margins:</strong> T {draft.marginTop} / B {draft.marginBottom} / L {draft.marginLeft} / R {draft.marginRight} mm</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
