/**
 * Table cell/header attributes for align, width, borders, and fills.
 * TipTap merges per-attribute `style` renderHTML by overwrite — use one style bag.
 */
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";

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

/**
 * Imported Word memo tables are often borderless. That has to survive a round
 * trip, so it is carried as a data attribute rather than inferred from a style
 * string some engines rewrite (`border: none` → `border: medium`).
 */
const tableStyleAttr = {
  style: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) => {
      const style = (element.getAttribute("style") || "")
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .filter((part) => !/^width\s*:\s*100%$/i.test(part))
        .join("; ");
      return style || null;
    },
    renderHTML: (attributes: { style?: string | null }) =>
      attributes.style ? { style: attributes.style } : {},
  },
  borderless: {
    default: false,
    parseHTML: (element: HTMLElement) =>
      element.hasAttribute("data-borderless") ||
      /(^|;)\s*border\s*:\s*(none|0)/i.test(element.getAttribute("style") || ""),
    renderHTML: (attributes: { borderless?: boolean }) =>
      attributes.borderless ? { "data-borderless": "true" } : {},
  },
};

export const NpaTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...tableStyleAttr,
    };
  },
});

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

/** CSS length (Word writes pt/in/cm/mm) to pixels, for imported row heights. */
function cssLengthToPx(value: string): number {
  const match = /^(\d*\.?\d+)\s*(px|pt|in|cm|mm|pc)?$/i.exec(value.trim());
  if (!match) return 0;
  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  switch ((match[2] || "px").toLowerCase()) {
    case "pt":
      return Math.round((amount * 96) / 72);
    case "in":
      return Math.round(amount * 96);
    case "cm":
      return Math.round((amount * 96) / 2.54);
    case "mm":
      return Math.round((amount * 96) / 25.4);
    case "pc":
      return Math.round(amount * 16);
    default:
      return Math.round(amount);
  }
}

/**
 * Row height set by dragging the divider under a row. It is a minimum height:
 * a row still grows to fit its text, exactly like Word's "at least" sizing.
 */
export const NpaTableRow = TableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      rowHeight: {
        default: null as number | null,
        parseHTML: (element: HTMLElement) => {
          const stored = Number.parseFloat(element.getAttribute("data-row-height") || "");
          if (Number.isFinite(stored) && stored > 0) return Math.round(stored);
          const fromStyle = cssLengthToPx(element.style.height || element.getAttribute("height") || "");
          return fromStyle > 0 ? fromStyle : null;
        },
        renderHTML: (attributes: { rowHeight?: number | null }) => {
          if (!attributes.rowHeight) return {};
          return {
            "data-row-height": String(attributes.rowHeight),
            style: `height: ${attributes.rowHeight}px`,
          };
        },
      },
    };
  },
});
