"use client";

import { useState } from "react";
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

/**
 * Build a print-ready HTML document for compose preview (modal iframe or popup).
 */
export function buildComposePrintHtml(
  html: string,
  settings: PageSettings,
  title = "Document",
  darkChrome = false,
): string {
  const dims = getPageDimensions(settings);
  const paperLabel = settings.paperSize.toUpperCase();
  const safeTitle = title.replace(/[<>&"]/g, "");
  const bodyHtml = html.trim()
    ? html
    : `<p style="color:${DOC_PAPER.muted};margin:0;">No content to preview. Add text in the editor first.</p>`;
  const { surroundBg, surroundColor } = getPrintPreviewChrome(darkChrome);

  const pageCss = `
    @page {
      size: ${paperLabel} ${settings.orientation};
      margin: ${settings.marginTop}mm ${settings.marginRight}mm ${settings.marginBottom}mm ${settings.marginLeft}mm;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: ${surroundBg};
      color: ${surroundColor};
      font-family: Verdana, Geneva, sans-serif;
      font-size: 12px;
      line-height: 1.5;
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
    }
    .sheet img { max-width: 100%; }
    .sheet table { width: 100%; border-collapse: collapse; }
    .sheet td, .sheet th { border: 1px solid ${DOC_PAPER.border}; padding: 8px; }
    .sheet ul { list-style: disc; padding-left: 1.5rem; }
    .sheet ol { list-style: decimal; padding-left: 1.5rem; }
    @media print {
      html, body { background: ${DOC_PAPER.background}; }
      .sheet {
        margin: 0;
        box-shadow: none;
        width: auto;
        min-height: auto;
        padding: 0;
      }
    }
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>${pageCss}</style>
</head>
<body>
  <div class="sheet">${bodyHtml}</div>
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
  onApply: (settings: PageSettings) => void;
}

export function PageSetupDialog({
  open,
  onOpenChange,
  settings,
  onApply,
}: PageSetupDialogProps) {
  const [draft, setDraft] = useState<PageSettings>(settings);

  const handleApply = () => {
    onApply(draft);
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
            Configure page size, orientation, and margins.
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
