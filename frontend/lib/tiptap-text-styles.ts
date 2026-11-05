/**
 * TipTap TextStyle helpers: font size + line height (not in TipTap core packs).
 */
import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
    color: {
      setColor: (color: string) => ReturnType;
      unsetColor: () => ReturnType;
    };
    lineHeight: {
      setLineHeight: (lineHeight: string) => ReturnType;
      unsetLineHeight: () => ReturnType;
    };
  }
}

export const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              element.style.fontSize?.replace(/['"]+/g, "") || null,
            renderHTML: (attributes: { fontSize?: string | null }) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

/** Text color on TextStyle (avoids a separate @tiptap/extension-color dep). */
export const Color = Extension.create({
  name: "color",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          color: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              element.style.color?.replace(/['"]+/g, "") || null,
            renderHTML: (attributes: { color?: string | null }) => {
              if (!attributes.color) return {};
              return { style: `color: ${attributes.color}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setColor:
        (color: string) =>
        ({ chain }) =>
          chain().setMark("textStyle", { color }).run(),
      unsetColor:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { color: null }).removeEmptyTextStyle().run(),
    };
  },
});

export const LineHeight = Extension.create({
  name: "lineHeight",
  addOptions() {
    return { types: ["paragraph", "heading"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.lineHeight || null,
            renderHTML: (attributes: { lineHeight?: string | null }) => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ commands }) =>
          this.options.types.every((type: string) =>
            commands.updateAttributes(type, { lineHeight }),
          ),
      unsetLineHeight:
        () =>
        ({ commands }) =>
          this.options.types.every((type: string) =>
            commands.resetAttributes(type, "lineHeight"),
          ),
    };
  },
});

export const FONT_FAMILIES = [
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Times New Roman", value: '"Times New Roman", Times, serif' },
  { label: "Georgia", value: "Georgia, serif" },
] as const;

/** Common sizes for optional suggestions (any 1–72pt value is allowed). */
export const FONT_SIZES = [
  "1pt",
  "8pt",
  "9pt",
  "10pt",
  "11pt",
  "12pt",
  "14pt",
  "16pt",
  "18pt",
  "20pt",
  "22pt",
  "24pt",
  "28pt",
  "36pt",
  "48pt",
  "72pt",
] as const;

export const FONT_SIZE_MIN_PT = 1;
export const FONT_SIZE_MAX_PT = 72;
export const FONT_SIZE_STEP_PT = 1;

export const LINE_HEIGHTS = [
  { label: "Single", value: "1" },
  { label: "1.15", value: "1.15" },
  { label: "1.5", value: "1.5" },
  { label: "Double", value: "2" },
] as const;

/** Word-like paragraph styles for the compose toolbar. */
export const DOCUMENT_STYLES = [
  { id: "normal", label: "Normal", fontSize: "12pt" },
  { id: "h1", label: "Heading 1", level: 1 as const, fontSize: "16pt" },
  { id: "h2", label: "Heading 2", level: 2 as const, fontSize: "14pt" },
  { id: "h3", label: "Heading 3", level: 3 as const, fontSize: "12pt" },
] as const;

export type DocumentStyleId = (typeof DOCUMENT_STYLES)[number]["id"];

/** Parse CSS font-size to points (approx: 1px ≈ 0.75pt). */
export function parseFontSizePt(current: string | null | undefined): number {
  if (!current) return 12;
  const n = Number.parseFloat(current);
  if (!Number.isFinite(n) || n <= 0) return 12;
  if (/px\s*$/i.test(current)) return Math.round(n * 0.75 * 10) / 10;
  return n;
}

export function formatFontSizePt(pt: number): string {
  const clamped = Math.min(
    FONT_SIZE_MAX_PT,
    Math.max(FONT_SIZE_MIN_PT, Math.round(pt * 10) / 10),
  );
  return Number.isInteger(clamped) ? `${clamped}pt` : `${clamped}pt`;
}

/** Step font size by 1pt (any size — not locked to the suggestion list). */
export function nextFontSize(current: string, direction: 1 | -1): string {
  const pt = parseFontSizePt(current);
  return formatFontSizePt(pt + direction * FONT_SIZE_STEP_PT);
}
