/**
 * Shared OOXML helpers for restoring Word formatting on imported .docx files.
 * Attribute lookups ignore namespace prefixes so both transitional and strict
 * WordprocessingML parts resolve the same way.
 */

export interface WordFormattingSources {
  documentXml: string;
  stylesXml?: string | null;
}

export interface StyleBlock {
  rPr: Element | null;
  pPr: Element | null;
  tblPr: Element | null;
  basedOn: string | null;
  /** The raw `w:style` element, for parts (conditional table formats) not extracted here. */
  element: Element | null;
}

export interface WordStyleMap {
  defaults: StyleBlock;
  byId: Map<string, StyleBlock>;
}

const EMPTY_STYLE_BLOCK: StyleBlock = {
  rPr: null,
  pPr: null,
  tblPr: null,
  basedOn: null,
  element: null,
};

export function wordAttr(element: Element | null, local: string): string | null {
  if (!element) return null;
  for (const attribute of Array.from(element.attributes)) {
    if (attribute.localName === local) return attribute.value;
  }
  return null;
}

export function childNamed(element: Element | null, local: string): Element | null {
  if (!element) return null;
  return Array.from(element.children).find((child) => child.localName === local) ?? null;
}

export function isOff(element: Element): boolean {
  const value = (wordAttr(element, "val") || "").toLowerCase();
  return value === "0" || value === "false" || value === "off" || value === "none";
}

/** Word lengths are twips (1/1440in); CSS at 96dpi is 1/15 of a twip in px. */
export function pxFromTwips(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return undefined;
  return Math.max(0, Math.round(value / 15));
}

export function twipsToPt(twips: string | null): number | undefined {
  if (!twips) return undefined;
  const value = Number.parseFloat(twips);
  if (!Number.isFinite(value)) return undefined;
  return Math.round((value / 20) * 100) / 100;
}

export function halfPointsToPt(halfPoints: string | null): number | undefined {
  if (!halfPoints) return undefined;
  const value = Number.parseFloat(halfPoints);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return Math.round((value / 2) * 100) / 100;
}

export function normalizeHexColor(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const value = raw.trim();
  if (!value || value.toLowerCase() === "auto") return undefined;
  return value.startsWith("#") ? value : `#${value}`;
}

/** docDefaults + named styles, so un-styled content keeps Word's own look. */
export function collectStyleBlocks(stylesXml: string | null | undefined): WordStyleMap {
  if (!stylesXml) return { defaults: EMPTY_STYLE_BLOCK, byId: new Map() };

  const parsed = new DOMParser().parseFromString(stylesXml, "application/xml");
  if (parsed.querySelector("parsererror")) {
    return { defaults: EMPTY_STYLE_BLOCK, byId: new Map() };
  }

  const docDefaults = Array.from(parsed.getElementsByTagName("*")).find(
    (element) => element.localName === "docDefaults",
  );
  const defaults: StyleBlock = {
    rPr: childNamed(childNamed(docDefaults ?? null, "rPrDefault"), "rPr"),
    pPr: childNamed(childNamed(docDefaults ?? null, "pPrDefault"), "pPr"),
    tblPr: null,
    basedOn: null,
    element: null,
  };

  const byId = new Map<string, StyleBlock>();
  for (const style of Array.from(parsed.getElementsByTagName("*"))) {
    if (style.localName !== "style") continue;
    const id = wordAttr(style, "styleId");
    if (!id) continue;
    byId.set(id, {
      rPr: childNamed(style, "rPr"),
      pPr: childNamed(style, "pPr"),
      tblPr: childNamed(style, "tblPr"),
      basedOn: wordAttr(childNamed(style, "basedOn"), "val"),
      element: style,
    });
  }

  return { defaults, byId };
}

/** Whitespace-insensitive text, used to pair Word blocks with converted HTML. */
export function normalizeWordText(value: string): string {
  return value.replace(/[\s\u00a0]+/g, "");
}

/** Merge CSS declarations into an element's existing inline style. */
export function mergeStyleAttribute(
  element: Element,
  entries: Array<[string, string | null | undefined]>,
): void {
  const map = new Map<string, string>();
  for (const part of (element.getAttribute("style") || "").split(";")) {
    const index = part.indexOf(":");
    if (index < 0) continue;
    const property = part.slice(0, index).trim().toLowerCase();
    const value = part.slice(index + 1).trim();
    if (property && value) map.set(property, value);
  }
  for (const [property, value] of entries) {
    if (!value) map.delete(property);
    else map.set(property, value);
  }
  if (!map.size) {
    element.removeAttribute("style");
    return;
  }
  element.setAttribute(
    "style",
    Array.from(map.entries())
      .map(([property, value]) => `${property}: ${value}`)
      .join("; "),
  );
}

/** Base-first inheritance chain for a style id (Word's `basedOn`). */
export function styleChain(styleId: string | null, byId: Map<string, StyleBlock>): StyleBlock[] {
  const chain: StyleBlock[] = [];
  const seen = new Set<string>();
  let current = styleId;
  while (current && byId.has(current) && !seen.has(current)) {
    seen.add(current);
    const block = byId.get(current)!;
    chain.unshift(block);
    current = block.basedOn;
  }
  return chain;
}
