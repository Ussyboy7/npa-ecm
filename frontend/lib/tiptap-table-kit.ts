/**
 * Table cell/header attributes for align, width, borders, and fills.
 * TipTap merges per-attribute `style` renderHTML by overwrite — use one style bag.
 */
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";

const CELL_STYLE_ALLOW = new Set([
  "text-align",
  "vertical-align",
  "background-color",
  "color",
  "width",
  "min-width",
  "max-width",
  "border",
  "border-top",
  "border-right",
  "border-bottom",
  "border-left",
  "border-color",
  "border-width",
  "border-style",
  "font-weight",
  "font-style",
  "padding",
]);

function filterCellStyle(style: string): string {
  return style
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const prop = part.split(":")[0]?.trim().toLowerCase();
      return Boolean(prop && CELL_STYLE_ALLOW.has(prop));
    })
    .join("; ");
}

function parseCellStyle(element: HTMLElement): string | null {
  const fromAttr = element.getAttribute("style");
  const parts: string[] = [];
  if (fromAttr) {
    const filtered = filterCellStyle(fromAttr);
    if (filtered) parts.push(filtered);
  }

  const align = element.style.textAlign || element.getAttribute("align");
  const valign = element.style.verticalAlign || element.getAttribute("valign");
  const width = element.style.width || element.getAttribute("width");
  const bg = element.style.backgroundColor;
  const border = element.style.border;
  const fontWeight = element.style.fontWeight;

  const has = (prop: string) => parts.some((p) => p.toLowerCase().startsWith(`${prop}:`));

  if (align && !has("text-align")) parts.push(`text-align: ${align}`);
  if (valign && !has("vertical-align")) parts.push(`vertical-align: ${valign}`);
  if (bg && !has("background-color")) parts.push(`background-color: ${bg}`);
  if (border && !has("border")) parts.push(`border: ${border}`);
  if (fontWeight && !has("font-weight")) parts.push(`font-weight: ${fontWeight}`);
  if (width && !has("width")) {
    const w = /^\d+$/.test(width) ? `${width}px` : width;
    parts.push(`width: ${w}`);
  }

  const joined = parts.join("; ");
  return joined || null;
}

const cellStyleAttr = {
  style: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) => parseCellStyle(element),
    renderHTML: (attributes: { style?: string | null }) => {
      if (!attributes.style) return {};
      return { style: attributes.style };
    },
  },
};

export const NpaTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...cellStyleAttr,
    };
  },
});

export const NpaTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...cellStyleAttr,
    };
  },
});
