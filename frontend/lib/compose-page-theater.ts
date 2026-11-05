/**
 * Page theater helpers for TipTap compose (estimated breaks — not a Word layout engine).
 */
import type { PageSettings } from "@/components/dms/PageSetupDialog";
import { getPageDimensions } from "@/components/dms/PageSetupDialog";

const MM_TO_PX = 96 / 25.4;

/** Reserved band height inside the paper for editable header/footer (px). */
export const HF_BAND_PX = 36;

export function escapePlainTextForHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Full page height in CSS px (paper edge to edge). */
export function pageHeightPx(settings: PageSettings): number {
  const dims = getPageDimensions(settings);
  return Math.round(dims.heightMm * MM_TO_PX);
}

/**
 * Body content area height per page (between page margins).
 * Header/footer bands sit inside the margin zones, so they do not shrink this.
 * `withHfBands` is kept for call-site compatibility.
 */
export function bodyContentHeightPx(settings: PageSettings, _withHfBands = false): number {
  const dims = getPageDimensions(settings);
  return Math.max(120, dims.contentHeightPx);
}

export function estimatePageCount(
  contentScrollHeightPx: number,
  settings: PageSettings,
  withHfBands: boolean,
): number {
  const perPage = bodyContentHeightPx(settings, withHfBands);
  return Math.max(1, Math.ceil(Math.max(contentScrollHeightPx, 1) / perPage));
}

/** Y offsets (px from top of body) for dashed page-break guides (between pages). */
export function pageBreakOffsetsPx(
  totalPages: number,
  settings: PageSettings,
  withHfBands: boolean,
): number[] {
  if (totalPages <= 1) return [];
  const perPage = bodyContentHeightPx(settings, withHfBands);
  const offsets: number[] = [];
  for (let i = 1; i < totalPages; i += 1) {
    offsets.push(i * perPage);
  }
  return offsets;
}

export function estimateCurrentPage(
  scrollTop: number,
  settings: PageSettings,
  withHfBands: boolean,
): number {
  const perPage = bodyContentHeightPx(settings, withHfBands);
  return Math.max(1, Math.floor(scrollTop / perPage) + 1);
}
