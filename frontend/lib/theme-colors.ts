/**
 * Canonical color tokens for canvas, charts, and print HTML.
 * App chrome should use Tailwind semantic classes; use these when inline styles or
 * third-party APIs (Recharts, canvas, exported HTML) require explicit color strings.
 */

/** Matches `.doc-paper` in globals.css — always light regardless of app theme. */
export const DOC_PAPER = {
  background: "#ffffff",
  foreground: "#171717",
  link: "#1d4ed8",
  /** Table/cell borders on white paper */
  border: "hsl(218 20% 88%)",
  muted: "hsl(218 15% 45%)",
} as const;

/** Official seal canvas ink (NPA navy on white — matches :root --primary). */
export const SEAL_INK = "hsl(218 65% 25%)";
export const SEAL_INK_MUTED = "hsl(218 65% 45%)";
export const SEAL_PANEL_BG = "hsl(218 15% 95%)";
export const SEAL_SIGNATURE_BG = "hsl(218 15% 97%)";

/** qrcode requires hex, not hsl. */
export const SEAL_QR = {
  dark: "#163569",
  light: DOC_PAPER.background,
} as const;

/** Ink on the white signature pad surface. */
export const SIGNATURE_INK = DOC_PAPER.foreground;

/** Default text highlight swatch in the compose editor. */
export const EDITOR_HIGHLIGHT = "#fff59d";

/** HSL components matching globals.css :root tokens (fallback when DOM unavailable). */
export const THEME_HSL = {
  primary: "218 65% 25%",
  success: "145 65% 45%",
  warning: "35 90% 60%",
  destructive: "0 75% 55%",
  accent: "40 95% 55%",
  info: "210 85% 55%",
  foreground: "218 25% 15%",
  mutedForeground: "218 15% 45%",
  border: "218 20% 88%",
  background: "0 0% 100%",
  muted: "218 15% 95%",
} as const;

export type ThemeCssVariable =
  | "--primary"
  | "--success"
  | "--warning"
  | "--destructive"
  | "--accent"
  | "--info"
  | "--foreground"
  | "--muted-foreground"
  | "--border"
  | "--background"
  | "--muted";

/** Read a design-token HSL variable as `hsl(h s l)`. */
export function readThemeHsl(variable: ThemeCssVariable, fallback: string): string {
  if (typeof document === "undefined") return `hsl(${fallback})`;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value ? `hsl(${value})` : `hsl(${fallback})`;
}

export function getPriorityChartColor(priority: string): string {
  switch (priority.toLowerCase()) {
    case "urgent":
      return readThemeHsl("--destructive", THEME_HSL.destructive);
    case "high":
      return readThemeHsl("--accent", THEME_HSL.accent);
    case "medium":
      return readThemeHsl("--warning", THEME_HSL.warning);
    case "low":
      return readThemeHsl("--success", THEME_HSL.success);
    default:
      return readThemeHsl("--muted-foreground", THEME_HSL.mutedForeground);
  }
}

export function getComplianceChartColor(
  rate: number,
  thresholds: { good: number; warn: number; ok: number } = { good: 90, warn: 75, ok: 50 },
): string {
  if (rate >= thresholds.good) return readThemeHsl("--success", THEME_HSL.success);
  if (rate >= thresholds.warn) return readThemeHsl("--warning", THEME_HSL.warning);
  if (rate >= thresholds.ok) return readThemeHsl("--accent", THEME_HSL.accent);
  return readThemeHsl("--destructive", THEME_HSL.destructive);
}

export function getDivisionComplianceColor(rate: number): string {
  if (rate >= 85) return readThemeHsl("--success", THEME_HSL.success);
  if (rate >= 70) return readThemeHsl("--warning", THEME_HSL.warning);
  return readThemeHsl("--destructive", THEME_HSL.destructive);
}

/** Division heatmap tile — light + dark surface pairs. */
export function getHeatmapSurfaceClass(rate: number): string {
  if (rate >= 80) {
    return "border-green-200 bg-green-500/10 dark:border-green-800/40 dark:bg-green-950/30";
  }
  if (rate >= 60) {
    return "border-amber-200 bg-amber-500/10 dark:border-amber-800/40 dark:bg-amber-950/30";
  }
  return "border-red-200 bg-red-500/10 dark:border-red-800/40 dark:bg-red-950/30";
}

/** Minimal print/export HTML styles using doc-paper tokens. */
export function buildExportDocumentCss(): string {
  return `
    body {
      font-family: system-ui, -apple-system, sans-serif;
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
      background: ${DOC_PAPER.background};
      color: ${DOC_PAPER.foreground};
      line-height: 1.5;
    }
    table { width: 100%; border-collapse: collapse; }
    td, th {
      border: 1px solid ${DOC_PAPER.border};
      padding: 8px;
      text-align: left;
    }
    h1 { font-size: 1.25rem; }
  `.trim();
}

/** Compose print-preview surround chrome (sheet stays doc-paper white). */
export function getPrintPreviewChrome(darkChrome: boolean): { surroundBg: string; surroundColor: string } {
  if (darkChrome) {
    return {
      surroundBg: readThemeHsl("--background", "218 30% 8%"),
      surroundColor: readThemeHsl("--foreground", "218 15% 90%"),
    };
  }
  return {
    surroundBg: readThemeHsl("--muted", THEME_HSL.muted),
    surroundColor: readThemeHsl("--foreground", THEME_HSL.foreground),
  };
}
