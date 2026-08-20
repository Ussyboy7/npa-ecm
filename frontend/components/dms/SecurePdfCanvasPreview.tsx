"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

interface SecurePdfCanvasPreviewProps {
  data: ArrayBuffer;
  className?: string;
  minHeightClassName?: string;
}

/**
 * Renders a PDF to canvas pages (no blob iframe / browser PDF chrome).
 * Used for all in-app PDF previews so Download / Print / Drive toolbar
 * cannot bypass audited app actions.
 * Re-renders on container resize (e.g. entering fullscreen) so pages fill width.
 */
export function SecurePdfCanvasPreview({
  data,
  className,
  minHeightClassName = "min-h-[240px]",
}: SecurePdfCanvasPreviewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [renderWidth, setRenderWidth] = useState(0);

  // Track available width so fullscreen / layout changes re-scale pages.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const width = Math.floor(entries[0]?.contentRect.width ?? 0);
      if (width >= 160) {
        setRenderWidth((prev) => (Math.abs(prev - width) < 8 ? prev : width));
      }
    });
    observer.observe(root);
    setRenderWidth(Math.max(Math.floor(root.clientWidth), 320));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container || renderWidth < 160) return;

    const render = async () => {
      setLoading(true);
      setError(null);
      container.replaceChildren();

      try {
        const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        // pdf.js transfers the buffer to the worker (detaches it). Always clone so
        // React Strict Mode remounts / re-renders can load the same source again.
        const copy = data.slice(0);
        const task = pdfjs.getDocument({ data: copy });
        const pdf = await task.promise;
        if (cancelled) {
          await pdf.destroy();
          return;
        }

        setPageCount(pdf.numPages);
        const containerWidth = Math.max(renderWidth, 320);
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
          const page = await pdf.getPage(pageNum);
          if (cancelled) {
            await pdf.destroy();
            return;
          }
          const baseViewport = page.getViewport({ scale: 1 });
          const fitScale = Math.max((containerWidth - 24) / baseViewport.width, 0.5);
          const viewport = page.getViewport({ scale: fitScale * dpr });
          const canvas = window.document.createElement("canvas");
          const cssWidth = Math.floor(viewport.width / dpr);
          const cssHeight = Math.floor(viewport.height / dpr);
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = `${cssWidth}px`;
          canvas.style.height = `${cssHeight}px`;
          canvas.className = "mx-auto mb-3 block doc-paper shadow-sm";
          canvas.setAttribute("aria-label", `Page ${pageNum} of ${pdf.numPages}`);
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas not available");
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          await page.render({ canvasContext: ctx, viewport }).promise;
          container.appendChild(canvas);
        }
        await pdf.destroy();
        if (!cancelled) setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to render PDF preview");
        setLoading(false);
      }
    };

    void render();
    return () => {
      cancelled = true;
      container.replaceChildren();
    };
  }, [data, renderWidth]);

  return (
    <div ref={rootRef} className={`relative w-full ${minHeightClassName} ${className ?? ""}`}>
      {loading ? (
        <div className={`absolute inset-0 flex items-center justify-center ${minHeightClassName}`}>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : null}
      {error ? (
        <div className={`flex flex-col items-center justify-center gap-2 p-8 text-center ${minHeightClassName}`}>
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : null}
      <div
        ref={containerRef}
        className={`w-full overflow-visible p-2 ${loading || error ? "invisible" : ""}`}
        data-page-count={pageCount || undefined}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
