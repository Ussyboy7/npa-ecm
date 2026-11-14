/**
 * Word-feel paragraph/heading layout: indent, spacing, borders, line-height.
 * Single `style` attribute bag (TipTap overwrites multi-attr style fragments).
 */
import { Extension } from "@tiptap/core";
import type { CommandProps, Editor } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    paragraphLayout: {
      setLineHeight: (lineHeight: string) => ReturnType;
      unsetLineHeight: () => ReturnType;
      setParagraphMarginLeft: (value: string | null) => ReturnType;
      setParagraphTextIndent: (value: string | null) => ReturnType;
      setParagraphSpacing: (before: string | null, after: string | null) => ReturnType;
      setParagraphBorderStyle: (style: string | null) => ReturnType;
      increaseIndent: () => ReturnType;
      decreaseIndent: () => ReturnType;
    };
  }
}

const BLOCK_TYPES = ["paragraph", "heading"] as const;

export const INDENT_STEP_PX = 36;
export const MAX_INDENT_PX = 288;

export function parsePx(value: string | null | undefined): number {
  if (!value) return 0;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatPx(n: number): string | null {
  if (n <= 0) return null;
  return `${Math.round(n)}px`;
}

export function mergeBlockStyle(
  existing: string | null | undefined,
  patch: Record<string, string | null>,
): string | null {
  const map = new Map<string, string>();
  for (const part of (existing || "").split(";")) {
    const idx = part.indexOf(":");
    if (idx < 0) continue;
    const prop = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();
    if (prop && value) map.set(prop, value);
  }
  for (const [prop, value] of Object.entries(patch)) {
    if (value === null || value === "") map.delete(prop);
    else map.set(prop, value);
  }
  if (map.size === 0) return null;
  return Array.from(map.entries())
    .map(([prop, value]) => `${prop}: ${value}`)
    .join("; ");
}

export const PARAGRAPH_SPACING_PRESETS = [
  { id: "none", label: "None", before: null, after: null },
  { id: "compact", label: "Compact", before: "0px", after: "4px" },
  { id: "normal", label: "Normal", before: "0px", after: "8px" },
  { id: "loose", label: "Loose", before: "8px", after: "16px" },
  { id: "custom", label: "Custom", before: null, after: null },
] as const;

export type ParagraphSpacingId = (typeof PARAGRAPH_SPACING_PRESETS)[number]["id"];

export const PARAGRAPH_BORDER_PRESETS = [
  { id: "none", label: "None", style: null as string | null },
  {
    id: "bottom",
    label: "Bottom",
    style: "border-bottom: 1px solid #333333; padding-bottom: 4px",
  },
  {
    id: "box",
    label: "Box",
    style: "border: 1px solid #333333; padding: 6px",
  },
  {
    id: "boxShade",
    label: "Box + shade",
    style: "border: 1px solid #333333; padding: 6px; background-color: #f5f5f5",
  },
] as const;

export type ParagraphBorderId = (typeof PARAGRAPH_BORDER_PRESETS)[number]["id"];

export const TEXT_COLOR_SWATCHES = [
  "#000000",
  "#1f4e79",
  "#c00000",
  "#548235",
  "#833c0c",
  "#7030a0",
  "#5b5b5b",
  "#0070c0",
] as const;

export const HIGHLIGHT_COLOR_SWATCHES = [
  "#fff59d",
  "#ffcdd2",
  "#c8e6c9",
  "#bbdefb",
  "#e1bee7",
  "#ffe0b2",
  "#f5f5f5",
] as const;

function activeBlockType(editor: Editor): "paragraph" | "heading" | null {
  if (editor.isActive("heading")) return "heading";
  if (editor.isActive("paragraph")) return "paragraph";
  return null;
}

function getBlockStyle(editor: Editor): string {
  const type = activeBlockType(editor);
  if (!type) return "";
  return (editor.getAttributes(type).style as string | undefined) || "";
}

function parseBlockMargins(style: string): {
  top: string | null;
  right: string | null;
  bottom: string | null;
  left: string | null;
} {
  const declarations = new Map<string, string>();
  for (const part of style.split(";")) {
    const idx = part.indexOf(":");
    if (idx < 0) continue;
    const property = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();
    if (property && value) declarations.set(property, value);
  }

  let [top, right, bottom, left]: Array<string | null> = [null, null, null, null];
  const shorthand = declarations.get("margin");
  if (shorthand) {
    const values: string[] = [];
    let depth = 0;
    let token = "";
    for (const char of shorthand.trim()) {
      if (char === "(" ) depth += 1;
      if (char === ")") depth = Math.max(0, depth - 1);
      if (/\s/.test(char) && depth === 0) {
        if (token) values.push(token);
        token = "";
      } else {
        token += char;
      }
    }
    if (token) values.push(token);
    if (values.length === 1) [top, right, bottom, left] = [values[0], values[0], values[0], values[0]];
    else if (values.length === 2) [top, right, bottom, left] = [values[0], values[1], values[0], values[1]];
    else if (values.length === 3) [top, right, bottom, left] = [values[0], values[1], values[2], values[1]];
    else if (values.length === 4) [top, right, bottom, left] = values as [string, string, string, string];
  }

  return {
    top: declarations.get("margin-top") ?? top,
    right: declarations.get("margin-right") ?? right,
    bottom: declarations.get("margin-bottom") ?? bottom,
    left: declarations.get("margin-left") ?? left,
  };
}

function normalizeSpacingValue(value: string | null): string | null {
  if (value === null) return null;
  const normalized = value.trim().toLowerCase();
  return /^[-+]?0(?:\.0+)?(?:[a-z%]+)?$/.test(normalized) ? "0px" : normalized;
}

export function resolveSpacingPresetId(editor: Editor): ParagraphSpacingId {
  const margins = parseBlockMargins(getBlockStyle(editor));
  const before = normalizeSpacingValue(margins.top) ?? "0px";
  const after = normalizeSpacingValue(margins.bottom) ?? "0px";
  const match = PARAGRAPH_SPACING_PRESETS.find(
    (preset) => preset.id !== "custom"
      && (normalizeSpacingValue(preset.before) ?? "0px") === before
      && (normalizeSpacingValue(preset.after) ?? "0px") === after,
  );
  return match?.id ?? "custom";
}

export function resolveBorderPresetId(editor: Editor): ParagraphBorderId {
  const style = getBlockStyle(editor);
  if (!style || (!/border/i.test(style) && !/background-color/i.test(style))) {
    return "none";
  }
  if (/border-bottom/i.test(style) && !/border:\s*/i.test(style)) return "bottom";
  if (/background-color/i.test(style) && /border:\s*/i.test(style)) return "boxShade";
  if (/border:\s*/i.test(style)) return "box";
  if (/border-bottom/i.test(style)) return "bottom";
  return "none";
}

export function getBlockMarginLeftPx(editor: Editor): number {
  return parsePx(getBlockStyle(editor).match(/margin-left:\s*([^;]+)/i)?.[1]);
}

export function getBlockTextIndentPx(editor: Editor): number {
  return parsePx(getBlockStyle(editor).match(/text-indent:\s*([^;]+)/i)?.[1]);
}

export function getBlockLineHeight(editor: Editor): string {
  const lineHeight = getBlockStyle(editor).match(/line-height:\s*([^;]+)/i)?.[1]?.trim();
  if (!lineHeight) return "1.15";
  return ["1", "1.15", "1.5", "2"].includes(lineHeight) ? lineHeight : "custom";
}

function updateActiveBlockStyle(
  editor: Editor,
  commands: CommandProps["commands"],
  patch: Record<string, string | null>,
): boolean {
  const type = activeBlockType(editor);
  if (!type) return false;
  const current = (editor.getAttributes(type).style as string | undefined) || null;
  const next = mergeBlockStyle(current, patch);
  return commands.updateAttributes(type, { style: next });
}

const BORDER_CLEAR: Record<string, string | null> = {
  border: null,
  "border-top": null,
  "border-right": null,
  "border-bottom": null,
  "border-left": null,
  "border-color": null,
  "border-width": null,
  "border-style": null,
  padding: null,
  "padding-bottom": null,
  "background-color": null,
};

export const ParagraphLayout = Extension.create({
  name: "paragraphLayout",
  addOptions() {
    return { types: [...BLOCK_TYPES] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          style: {
            default: null,
            parseHTML: (element: HTMLElement) => {
              const style = element.getAttribute("style");
              return style?.trim() || null;
            },
            renderHTML: (attributes: { style?: string | null }) => {
              if (!attributes.style) return {};
              return { style: attributes.style };
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
        ({ editor, commands }: CommandProps) =>
          updateActiveBlockStyle(editor, commands, { "line-height": lineHeight }),
      unsetLineHeight:
        () =>
        ({ editor, commands }: CommandProps) =>
          updateActiveBlockStyle(editor, commands, { "line-height": null }),
      setParagraphMarginLeft:
        (value: string | null) =>
        ({ editor, commands }: CommandProps) =>
          updateActiveBlockStyle(editor, commands, { "margin-left": value }),
      setParagraphTextIndent:
        (value: string | null) =>
        ({ editor, commands }: CommandProps) =>
          updateActiveBlockStyle(editor, commands, { "text-indent": value }),
      setParagraphSpacing:
        (before: string | null, after: string | null) =>
        ({ editor, commands }: CommandProps) => {
          const margins = parseBlockMargins(getBlockStyle(editor));
          return updateActiveBlockStyle(editor, commands, {
            margin: null,
            "margin-top": before,
            "margin-right": margins.right,
            "margin-bottom": after,
            "margin-left": margins.left,
          });
        },
      setParagraphBorderStyle:
        (styleBlob: string | null) =>
        ({ editor, commands }: CommandProps) => {
          const type = activeBlockType(editor);
          if (!type) return false;
          const current = (editor.getAttributes(type).style as string | undefined) || null;
          const cleared = mergeBlockStyle(current, BORDER_CLEAR);
          if (!styleBlob) {
            return commands.updateAttributes(type, { style: cleared });
          }
          const merged = [cleared, styleBlob].filter(Boolean).join("; ");
          return commands.updateAttributes(type, { style: merged });
        },
      increaseIndent:
        () =>
        ({ editor, commands }: CommandProps) => {
          if (editor.can().sinkListItem("listItem")) {
            return commands.sinkListItem("listItem");
          }
          const next = Math.min(MAX_INDENT_PX, getBlockMarginLeftPx(editor) + INDENT_STEP_PX);
          return updateActiveBlockStyle(editor, commands, { "margin-left": formatPx(next) });
        },
      decreaseIndent:
        () =>
        ({ editor, commands }: CommandProps) => {
          if (editor.can().liftListItem("listItem")) {
            return commands.liftListItem("listItem");
          }
          const next = Math.max(0, getBlockMarginLeftPx(editor) - INDENT_STEP_PX);
          return updateActiveBlockStyle(editor, commands, { "margin-left": formatPx(next) });
        },
    };
  },
});
