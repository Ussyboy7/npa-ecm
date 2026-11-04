/**
 * Paste-as-picture helpers for the compose editor.
 * Excel "Copy as Picture" puts an image on the clipboard; normal cell copy is HTML.
 */

import { looksLikeExcelPaste, sanitizePastedRichText } from "@/lib/sanitize-html";

export function findClipboardImageBlob(data: DataTransfer | null): Blob | null {
  if (!data) return null;
  for (const item of Array.from(data.items || [])) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  for (const file of Array.from(data.files || [])) {
    if (file.type.startsWith("image/")) return file;
  }
  return null;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Unable to read image"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read image"));
    reader.readAsDataURL(blob);
  });
}

/** Render sanitized HTML to a PNG data URL (Excel/Word paste → picture). */
export async function rasterizeHtmlToPng(
  html: string,
  options?: { maxWidth?: number },
): Promise<string> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Rasterize requires a browser");
  }
  const maxWidth = options?.maxWidth ?? 960;
  const cleaned = sanitizePastedRichText(html);

  const measure = document.createElement("div");
  measure.style.cssText =
    "position:fixed;left:-10000px;top:0;background:#fff;color:#111;" +
    `width:${maxWidth}px;padding:8px;font:12px Verdana,Arial,sans-serif;`;
  measure.innerHTML = cleaned;
  document.body.appendChild(measure);

  const width = Math.min(maxWidth, Math.max(120, Math.ceil(measure.scrollWidth)));
  const height = Math.max(40, Math.ceil(measure.scrollHeight));

  const root = document.createElement("div");
  root.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  root.style.cssText =
    `width:${width}px;background:#fff;color:#111;padding:8px;` +
    "font:12px Verdana,Arial,sans-serif;box-sizing:border-box;";
  root.innerHTML = cleaned;
  const xhtml = new XMLSerializer().serializeToString(root);
  document.body.removeChild(measure);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject width="100%" height="100%">${xhtml}</foreignObject></svg>`;
  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to render clipboard HTML as image"));
    img.src = svgUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0);
  return canvas.toDataURL("image/png");
}

export type ClipboardPictureSource = "image" | "html";

/**
 * Resolve a PNG/JPEG/WebP data URL from the system clipboard (async Clipboard API).
 * Prefers a real image (Excel Copy as Picture), else rasterizes text/html.
 */
export async function readClipboardAsPictureDataUrl(): Promise<{
  dataUrl: string;
  source: ClipboardPictureSource;
}> {
  if (!navigator.clipboard?.read) {
    throw new Error("Clipboard read is not available in this browser");
  }
  const items = await navigator.clipboard.read();
  for (const item of items) {
    const imageType = item.types.find((type) => type.startsWith("image/"));
    if (imageType) {
      const blob = await item.getType(imageType);
      return { dataUrl: await blobToDataUrl(blob), source: "image" };
    }
  }
  for (const item of items) {
    if (!item.types.includes("text/html")) continue;
    const html = await (await item.getType("text/html")).text();
    if (!html.trim()) continue;
    return {
      dataUrl: await rasterizeHtmlToPng(html),
      source: "html",
    };
  }
  throw new Error("Clipboard has no image or HTML to paste as a picture");
}

/** True when paste should insert a picture instead of an editable Office table. */
export function shouldPasteClipboardAsPicture(args: {
  hasImage: boolean;
  html: string;
  altKey: boolean;
}): boolean {
  if (args.altKey && (args.hasImage || args.html.trim())) return true;
  if (!args.hasImage) return false;
  // Image-only / Copy as Picture — don't force Excel cell HTML over the bitmap.
  if (!args.html.trim()) return true;
  if (!looksLikeExcelPaste(args.html)) return true;
  return false;
}
