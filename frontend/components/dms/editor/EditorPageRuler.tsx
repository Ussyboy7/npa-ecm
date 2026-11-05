"use client";

/**
 * Word-like rulers: horizontal (top) + vertical (side).
 * - Side: drag top/bottom markers to resize page margins.
 * - Top: drag left/right edge markers to resize page margins;
 *   triangles adjust paragraph left / first-line indent.
 */
import { useCallback, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { PageSettings } from "../PageSetupDialog";
import { getPageDimensions } from "../PageSetupDialog";
import { pageHeightPx } from "@/lib/compose-page-theater";

type EditorPageRulerProps = {
  pageSettings: PageSettings;
  /** Paragraph left indent (px), not page margin. */
  marginLeftPx: number;
  textIndentPx: number;
  onMarginLeftPx: (px: number) => void;
  onTextIndentPx: (px: number) => void;
  onMarginTopMm: (mm: number) => void;
  onMarginBottomMm: (mm: number) => void;
  onMarginLeftMm: (mm: number) => void;
  onMarginRightMm: (mm: number) => void;
  children: ReactNode;
  paperHeightPx: number;
  className?: string;
};

const MM_TO_PX = 96 / 25.4;
const SIDE_RULER_W = 20;
const MIN_MARGIN_MM = 8;
const MIN_BODY_MM = 40;

function clampMarginMm(mm: number, otherMarginMm: number, pageSpanMm: number): number {
  const max = Math.max(MIN_MARGIN_MM, pageSpanMm - otherMarginMm - MIN_BODY_MM);
  return Math.min(max, Math.max(MIN_MARGIN_MM, Math.round(mm)));
}

export function EditorPageRuler({
  pageSettings,
  marginLeftPx,
  textIndentPx,
  onMarginLeftPx,
  onTextIndentPx,
  onMarginTopMm,
  onMarginBottomMm,
  onMarginLeftMm,
  onMarginRightMm,
  children,
  paperHeightPx,
  className,
}: EditorPageRulerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const vTrackRef = useRef<HTMLDivElement>(null);
  const dims = getPageDimensions(pageSettings);
  const pageWidthPx = (dims.widthMm / 25.4) * 96;
  const onePageH = pageHeightPx(pageSettings);
  const leftMarginPx = pageSettings.marginLeft * MM_TO_PX;
  const rightMarginPx = pageSettings.marginRight * MM_TO_PX;
  const topMarginPx = pageSettings.marginTop * MM_TO_PX;
  const bottomMarginPx = pageSettings.marginBottom * MM_TO_PX;
  const contentWidthPx = Math.max(40, pageWidthPx - leftMarginPx - rightMarginPx);

  const hTickCount = Math.max(4, Math.round(dims.widthMm / 10));
  const vTickCount = Math.max(4, Math.round(dims.heightMm / 10));

  const clientXToPagePx = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      return Math.max(0, Math.min(pageWidthPx, ((clientX - rect.left) / rect.width) * pageWidthPx));
    },
    [pageWidthPx],
  );

  const clientXToContentPx = useCallback(
    (clientX: number) => {
      return Math.max(0, Math.min(contentWidthPx, clientXToPagePx(clientX) - leftMarginPx));
    },
    [clientXToPagePx, contentWidthPx, leftMarginPx],
  );

  const startPageHDrag = (kind: "pageLeft" | "pageRight") => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const onMove = (ev: PointerEvent) => {
      const x = clientXToPagePx(ev.clientX);
      if (kind === "pageLeft") {
        const mm = x / MM_TO_PX;
        onMarginLeftMm(clampMarginMm(mm, pageSettings.marginRight, dims.widthMm));
      } else {
        const fromRightPx = pageWidthPx - x;
        const mm = fromRightPx / MM_TO_PX;
        onMarginRightMm(clampMarginMm(mm, pageSettings.marginLeft, dims.widthMm));
      }
    };
    const onUp = (ev: PointerEvent) => {
      target.releasePointerCapture(ev.pointerId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const startIndentDrag = (kind: "left" | "first") => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const onMove = (ev: PointerEvent) => {
      const px = Math.round(clientXToContentPx(ev.clientX) / 18) * 18;
      if (kind === "left") onMarginLeftPx(px);
      else onTextIndentPx(px - marginLeftPx);
    };
    const onUp = (ev: PointerEvent) => {
      target.releasePointerCapture(ev.pointerId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const startVDrag = (kind: "top" | "bottom") => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const onMove = (ev: PointerEvent) => {
      const el = vTrackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const yInFirstPage = Math.max(0, Math.min(onePageH, ev.clientY - rect.top));
      if (kind === "top") {
        const mm = yInFirstPage / MM_TO_PX;
        onMarginTopMm(clampMarginMm(mm, pageSettings.marginBottom, dims.heightMm));
      } else {
        const fromBottomPx = onePageH - yInFirstPage;
        const mm = fromBottomPx / MM_TO_PX;
        onMarginBottomMm(clampMarginMm(mm, pageSettings.marginTop, dims.heightMm));
      }
    };
    const onUp = (ev: PointerEvent) => {
      target.releasePointerCapture(ev.pointerId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const leftMarker = leftMarginPx + marginLeftPx;
  const firstMarker = leftMarginPx + marginLeftPx + textIndentPx;
  const rightEdgePx = pageWidthPx - rightMarginPx;

  return (
    <div className={cn("w-full select-none", className)} data-ruler="frame">
      <div className="flex items-stretch">
        <div
          className="shrink-0 border border-border/60 border-b-0 bg-muted/50 rounded-tl-sm"
          style={{ width: SIDE_RULER_W, height: 20 }}
          aria-hidden
        />
        <div
          ref={trackRef}
          className="relative h-5 flex-1 bg-muted/40 border border-border/60 border-b-0 border-l-0 rounded-tr-sm overflow-hidden hidden sm:block"
          data-ruler="horizontal"
          aria-hidden
        >
          <div
            className="absolute inset-y-0 bg-background/80"
            style={{
              left: `${(leftMarginPx / pageWidthPx) * 100}%`,
              right: `${(rightMarginPx / pageWidthPx) * 100}%`,
            }}
          />
          {Array.from({ length: hTickCount + 1 }, (_, i) => {
            const pct = (i / hTickCount) * 100;
            const major = i % 5 === 0;
            return (
              <div
                key={`h-${i}`}
                className={cn(
                  "absolute bottom-0 w-px bg-muted-foreground/40",
                  major ? "h-2.5" : "h-1.5",
                )}
                style={{ left: `${pct}%` }}
              />
            );
          })}
          {/* Page left / right margin handles (grey ↔ white edges) */}
          <button
            type="button"
            className="absolute inset-y-0 z-20 w-1.5 -translate-x-1/2 cursor-ew-resize bg-primary/70 hover:bg-primary rounded-sm"
            style={{ left: `${(leftMarginPx / pageWidthPx) * 100}%` }}
            title="Drag to resize left page margin"
            aria-label="Resize left page margin"
            onPointerDown={startPageHDrag("pageLeft")}
          />
          <button
            type="button"
            className="absolute inset-y-0 z-20 w-1.5 -translate-x-1/2 cursor-ew-resize bg-amber-600/80 hover:bg-amber-600 rounded-sm"
            style={{ left: `${(rightEdgePx / pageWidthPx) * 100}%` }}
            title="Drag to resize right page margin"
            aria-label="Resize right page margin"
            onPointerDown={startPageHDrag("pageRight")}
          />
          {/* Paragraph indent triangles (inside the content band) */}
          <button
            type="button"
            className="absolute top-0 z-10 h-0 w-0 border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent border-t-primary cursor-ew-resize"
            style={{ left: `${(leftMarker / pageWidthPx) * 100}%`, transform: "translateX(-50%)" }}
            title="Left indent"
            aria-label="Left indent"
            onPointerDown={startIndentDrag("left")}
          />
          <button
            type="button"
            className="absolute bottom-0 z-10 h-0 w-0 border-l-[5px] border-r-[5px] border-b-[7px] border-l-transparent border-r-transparent border-b-amber-600 cursor-ew-resize"
            style={{ left: `${(firstMarker / pageWidthPx) * 100}%`, transform: "translateX(-50%)" }}
            title="First-line indent"
            aria-label="First-line indent"
            onPointerDown={startIndentDrag("first")}
          />
        </div>
      </div>

      <div className="flex items-stretch">
        <div
          ref={vTrackRef}
          className="relative shrink-0 bg-muted/40 border border-border/60 border-t-0 rounded-bl-sm overflow-hidden hidden sm:block"
          style={{ width: SIDE_RULER_W, height: paperHeightPx }}
          data-ruler="vertical"
          aria-hidden
        >
          {Array.from({ length: Math.max(1, Math.round(paperHeightPx / onePageH)) }, (_, page) => {
            const pageTop = page * onePageH;
            return (
              <div
                key={`page-${page}`}
                className="absolute left-0 right-0"
                style={{ top: pageTop, height: onePageH }}
              >
                <div
                  className="absolute left-0 right-0 bg-background/80"
                  style={{
                    top: `${(topMarginPx / onePageH) * 100}%`,
                    bottom: `${(bottomMarginPx / onePageH) * 100}%`,
                  }}
                />
                {Array.from({ length: vTickCount + 1 }, (_, i) => {
                  const pct = (i / vTickCount) * 100;
                  const major = i % 5 === 0;
                  return (
                    <div
                      key={`v-${page}-${i}`}
                      className={cn(
                        "absolute right-0 h-px bg-muted-foreground/40",
                        major ? "w-2.5" : "w-1.5",
                      )}
                      style={{ top: `${pct}%` }}
                    />
                  );
                })}
                {page === 0 && (
                  <>
                    <button
                      type="button"
                      className="absolute left-1/2 z-20 h-0 w-0 -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-primary cursor-ns-resize"
                      style={{ top: topMarginPx, transform: "translate(-50%, -2px)" }}
                      title="Drag to resize header / top margin"
                      aria-label="Resize header margin"
                      onPointerDown={startVDrag("top")}
                    />
                    <button
                      type="button"
                      className="absolute left-1/2 z-20 h-0 w-0 -translate-x-1/2 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-amber-600 cursor-ns-resize"
                      style={{
                        top: onePageH - bottomMarginPx,
                        transform: "translate(-50%, -6px)",
                      }}
                      title="Drag to resize footer / bottom margin"
                      aria-label="Resize footer margin"
                      onPointerDown={startVDrag("bottom")}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
