/**
 * Shared type scale for correspondence detail (header / preview / thread / action).
 * Prefer these over ad-hoc utility stacks so the page reads as one system.
 */
export const corrType = {
  /** Panel chrome titles (Document, Thread, Action) */
  panelTitle: 'text-[13px] font-semibold tracking-tight text-foreground',
  /** Page reference number */
  pageTitle: 'text-base md:text-xl font-semibold tracking-tight text-foreground',
  /** Subject line under reference */
  subject: 'text-sm md:text-[15px] font-medium tracking-tight text-foreground leading-snug',
  /** File name in preview chrome */
  fileTitle: 'text-[13px] font-medium tracking-tight text-foreground',
  /** Minute author / empty-state titles */
  itemTitle: 'text-[13px] font-semibold tracking-tight text-foreground',
  /** Thread body / preview meta lines */
  body: 'text-[13px] leading-relaxed text-foreground',
  /** Secondary meta (sender, dates, counts) */
  meta: 'text-xs text-muted-foreground',
  /** Fine captions, progress hints */
  caption: 'text-[11px] leading-snug text-muted-foreground',
  /** Quiet section labels (More, Also) */
  sectionLabel:
    'text-[11px] font-medium tracking-wide text-muted-foreground/80',
} as const;
