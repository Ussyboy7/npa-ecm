"use client";

/**
 * Client-side DRM watermark for HTML / Word / OCR / image / PDF canvas previews.
 * Uses a repeating SVG background so marks stay inside the preview bounds
 * (flex+rotate tiles previously painted off-screen).
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function watermarkDataUri(label: string): string {
  const safe = escapeXml(label.toUpperCase());
  const len = Math.max(label.length, 1);
  // Long phrases (e.g. STRICTLY CONFIDENTIAL) need a smaller face + wider tile
  // or rotation clips the ends → "RICTLY CONFIDENTI".
  const fontSize = len > 18 ? 28 : len > 12 ? 34 : 40;
  const letterSpacing = len > 18 ? 2 : len > 12 ? 4 : 6;
  // Bold Verdana runs wide; underestimating width clips rotated ends.
  const approxTextWidth = len * fontSize * 0.82 + Math.max(0, len - 1) * letterSpacing;
  const textHeight = fontSize * 1.35;
  const rad = (28 * Math.PI) / 180;
  const bbW = approxTextWidth * Math.cos(rad) + textHeight * Math.sin(rad);
  const bbH = approxTextWidth * Math.sin(rad) + textHeight * Math.cos(rad);
  const tileW = Math.ceil(bbW + 180);
  const tileH = Math.ceil(bbH + 180);
  const cx = tileW / 2;
  const cy = tileH / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tileW}" height="${tileH}" viewBox="0 0 ${tileW} ${tileH}">
  <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle"
    fill="rgba(55,65,81,0.32)" font-family="Verdana,Arial,sans-serif"
    font-size="${fontSize}" font-weight="700" letter-spacing="${letterSpacing}"
    transform="rotate(-28 ${cx} ${cy})">${safe}</text>
</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function DrmWatermarkOverlay({
  text,
  className,
}: {
  text?: string | null;
  className?: string;
}) {
  const label = (text || "").trim();
  if (!label) return null;

  return (
    <div
      data-drm-watermark={label}
      aria-hidden="true"
      className={
        className ??
        "pointer-events-none absolute inset-0 z-20 overflow-hidden select-none"
      }
      style={{
        backgroundImage: watermarkDataUri(label),
        backgroundRepeat: "repeat",
        backgroundPosition: "center center",
      }}
    />
  );
}
