/**
 * Shared type scale for Apple-density product UI (detail + lists).
 * Prefer these over ad-hoc text-3xl / text-2xl page chrome.
 */
export const appType = {
  /** List / queue page H1 */
  pageTitleList: "text-xl md:text-2xl font-semibold tracking-tight text-foreground",
  /** Detail page primary identity line */
  pageTitle: "text-base md:text-xl font-semibold tracking-tight text-foreground",
  /** Detail subject / secondary identity */
  subject: "text-sm md:text-[15px] font-medium tracking-tight text-foreground leading-snug",
  /** Quiet page subtitle under H1 */
  pageSubtitle: "text-sm text-muted-foreground mt-1",
  /** Panel / section title in rails and cards */
  panelTitle: "text-[13px] font-semibold tracking-tight text-foreground",
  /** List row / file title */
  itemTitle: "text-[13px] font-semibold tracking-tight text-foreground",
  fileTitle: "text-[13px] font-medium tracking-tight text-foreground",
  listTitle: "text-sm font-semibold tracking-tight text-foreground leading-snug",
  body: "text-[13px] leading-relaxed text-foreground",
  meta: "text-xs text-muted-foreground",
  caption: "text-[11px] leading-snug text-muted-foreground",
  sectionLabel: "text-[11px] font-medium tracking-wide text-muted-foreground/80",
  /** Compact metric value in StatStrip */
  statValue: "text-base font-semibold tabular-nums tracking-tight text-foreground",
  statLabel: "text-[11px] text-muted-foreground",
} as const;

/** @deprecated Prefer appType — alias kept for detail-page imports */
export const detailType = appType;

/** @deprecated Use appType / detailType */
export const corrType = appType;
