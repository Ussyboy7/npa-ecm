"use client";

/**
 * Phase 2 TipTap engine — NPA document-composition parity with Legacy.
 * HTML in/out via sanitizeRichText; reuses PageSetupDialog / print HTML builders.
 */

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Link2,
  Image as ImageIcon,
  Table2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Undo2,
  Redo2,
  Printer,
  Search,
  PenLine,
  Plus,
  Minus,
  MoreHorizontal,
  Columns3,
  Rows3,
  Trash2,
  ClipboardPaste,
  RemoveFormatting,
  IndentIncrease,
  IndentDecrease,
  Baseline,
  PaintBucket,
  GripVertical,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { sanitizeRichText, sanitizePastedRichText } from "@/lib/sanitize-html";
import { buildDownloadUrl } from "@/lib/correspondence-url-utils";
import {
  blobToDataUrl,
  findClipboardImageBlob,
  rasterizeHtmlToPng,
  readClipboardAsPictureDataUrl,
  shouldPasteClipboardAsPicture,
} from "@/lib/paste-as-picture";

/** Resolve media-relative signature/image paths; pass through data/blob/http URLs. */
function resolveEditorImageSrc(url: string): string {
  const trimmed = url.trim();
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }
  return buildDownloadUrl(trimmed) ?? trimmed;
}
import {
  logEditorDiagnostic,
  safeErrorName,
} from "@/lib/editor-diagnostics";
import {
  collectTiptapFindMatches,
  replaceAllTiptapMatches,
  replaceTiptapMatch,
  selectTiptapMatch,
} from "@/lib/tiptap-find-replace";
import {
  Color,
  FontSize,
  FONT_FAMILIES,
  LINE_HEIGHTS,
  DOCUMENT_STYLES,
  nextFontSize,
  parseFontSizePt,
  formatFontSizePt,
  type DocumentStyleId,
} from "@/lib/tiptap-text-styles";
import {
  ParagraphLayout,
  PARAGRAPH_SPACING_PRESETS,
  PARAGRAPH_BORDER_PRESETS,
  TEXT_COLOR_SWATCHES,
  HIGHLIGHT_COLOR_SWATCHES,
  formatPx,
  getBlockMarginLeftPx,
  getBlockTextIndentPx,
  getBlockLineHeight,
  resolveSpacingPresetId,
  resolveBorderPresetId,
} from "@/lib/tiptap-paragraph-kit";
import {
  NpaImage,
  IMAGE_WIDTH_PRESETS,
  isImageSelected,
  getSelectedImageAttrs,
  type ImageFloat,
} from "@/lib/tiptap-image-kit";
import { NpaTable, NpaTableCell, NpaTableHeader, NpaTableRow } from "@/lib/tiptap-table-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import {
  PageSetupDialog,
  type PageSettings,
  getPageDimensions,
  buildComposePrintHtml,
} from "../PageSetupDialog";
import { Fragment, Slice, type Node as PMNode, type ResolvedPos } from "@tiptap/pm/model";
import { NodeSelection, type EditorState, type Transaction } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { TableMap, selectionCell } from "@tiptap/pm/tables";
import { bodyContentHeightPx, pageHeightPx } from "@/lib/compose-page-theater";
import {
  PAGE_SPACERS_META,
  PageBreaks,
  type PageSpacer,
} from "@/lib/editor-page-breaks";
import { EditorPageRuler } from "./EditorPageRuler";
import { HeaderFooterBand } from "./HeaderFooterBand";
import type { RichTextEditorProps } from "./types";

/** Visible gap between page sheets (Word's continuous page view). */
const PAGE_GAP_PX = 16;

/** Match NPA Word memo headers: ~1" margins on A4. */
const DEFAULT_PAGE_SETTINGS: PageSettings = {
  paperSize: "a4",
  orientation: "portrait",
  marginTop: 25,
  marginBottom: 25,
  marginLeft: 25,
  marginRight: 25,
};

function stripHtmlToPlainLength(html: string): { chars: number; words: number } {
  if (typeof window === "undefined") return { chars: 0, words: 0 };
  const temp = window.document.createElement("div");
  temp.innerHTML = html || "";
  const text = (temp.textContent || "").trim();
  return {
    chars: text.length,
    words: text ? text.split(/\s+/).filter(Boolean).length : 0,
  };
}

type PromptDialogState =
  | { type: "link"; value: string }
  | { type: "image"; value: string }
  | { type: "table"; rows: string; cols: string }
  | null;

/** Word-style ribbon cluster: controls on top, quiet label under. */
function RibbonGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const widthClass = {
    Clipboard: "basis-[7rem] grow",
    Font: "basis-full sm:basis-[min(36rem,100%)] grow",
    Paragraph: "basis-full sm:basis-[min(26rem,100%)] grow",
    Insert: "basis-full sm:basis-[min(14rem,100%)] grow",
    Picture: "basis-full sm:basis-[min(28rem,100%)] grow",
    Layout: "basis-[12rem] grow",
  }[label] ?? "basis-auto grow";

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5 border-r border-border/60 px-2.5 py-2 last:border-r-0", widthClass)}>
      <span className="px-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/75 leading-none">
        {label}
      </span>
      <div className="flex min-h-8 flex-wrap items-center gap-1">{children}</div>
    </div>
  );
}

function ColorSwatchPopover({
  label,
  icon,
  value,
  swatches,
  onPick,
  onClear,
  toolbarBtnClass,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  swatches: readonly string[];
  onPick: (color: string) => void;
  onClear: () => void;
  toolbarBtnClass: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(toolbarBtnClass, "flex-col gap-0.5 py-0.5")}
          aria-label={label}
          title={label}
        >
          {icon}
          <span
            className="block h-0.5 w-3.5 rounded-sm"
            style={{ backgroundColor: value || "transparent" }}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="grid grid-cols-4 gap-1.5">
          {swatches.map((color) => (
            <button
              key={color}
              type="button"
              className="h-6 w-6 rounded border border-border hover:ring-2 hover:ring-primary/40"
              style={{ backgroundColor: color }}
              aria-label={color}
              onClick={() => onPick(color)}
            />
          ))}
        </div>
        <button
          type="button"
          className="mt-2 w-full h-7 text-xs border rounded-md hover:bg-muted"
          onClick={onClear}
        >
          Clear
        </button>
      </PopoverContent>
    </Popover>
  );
}

/** -/+ stepper around a typed point size, shared by the ribbon and the strip. */
function FontSizeStepper({
  editor,
  current,
  draft,
  setDraft,
}: {
  editor: Editor;
  current: string;
  draft: string | null;
  setDraft: (value: string | null) => void;
}) {
  return (
    <div className="inline-flex h-8 items-center rounded-md border border-border bg-background overflow-hidden shrink-0">
      <button
        type="button"
        className="h-8 w-7 inline-flex items-center justify-center hover:bg-muted border-r border-border"
        aria-label="Decrease font size"
        title="Decrease font size (1pt)"
        onClick={() => {
          setDraft(null);
          editor
            .chain()
            .focus()
            .setFontSize(nextFontSize(current, -1))
            .run();
        }}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <Input
        type="text"
        inputMode="numeric"
        className="h-8 w-11 border-0 rounded-none px-1 text-xs text-center shadow-none focus-visible:ring-0"
        aria-label="Font size in points"
        title="Font size 1–72 pt"
        value={
          draft ??
          String(Math.round(parseFontSizePt(current)))
        }
        onFocus={(e) => {
          setDraft(String(Math.round(parseFontSizePt(current))));
          e.target.select();
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d.]/g, "");
          setDraft(raw);
        }}
        onBlur={() => {
          const n = Number.parseFloat(draft ?? "");
          const next = formatFontSizePt(Number.isFinite(n) ? n : 12);
          setDraft(null);
          editor.chain().focus().setFontSize(next).run();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setDraft(null);
            editor
              .chain()
              .focus()
              .setFontSize(nextFontSize(current, 1))
              .run();
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setDraft(null);
            editor
              .chain()
              .focus()
              .setFontSize(nextFontSize(current, -1))
              .run();
          }
        }}
      />
      <button
        type="button"
        className="h-8 w-7 inline-flex items-center justify-center hover:bg-muted border-l border-border"
        aria-label="Increase font size"
        title="Increase font size (1pt)"
        onClick={() => {
          setDraft(null);
          editor
            .chain()
            .focus()
            .setFontSize(nextFontSize(current, 1))
            .run();
        }}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
          </div>
  );
}

/** Hairline between tool clusters in the compact strip. */
function ToolbarDivider() {
  return <span aria-hidden className="mx-0.5 h-6 w-px shrink-0 bg-border" />;
}

function resolveDocumentStyleId(editor: Editor): DocumentStyleId {
  if (editor.isActive("heading", { level: 1 })) return "h1";
  if (editor.isActive("heading", { level: 2 })) return "h2";
  if (editor.isActive("heading", { level: 3 })) return "h3";

  const textStyle = editor.getAttributes("textStyle") as {
    fontFamily?: string | null;
    fontSize?: string | null;
    color?: string | null;
  };
  const blockStyle = (editor.getAttributes("paragraph").style as string | undefined) || "";
  const hasCustomTextStyle =
    editor.isActive("bold") ||
    editor.isActive("italic") ||
    editor.isActive("underline") ||
    editor.isActive("strike") ||
    editor.isActive("subscript") ||
    editor.isActive("superscript") ||
    Boolean(textStyle.color) ||
    Boolean(textStyle.fontSize && textStyle.fontSize !== "12pt") ||
    Boolean(textStyle.fontFamily && textStyle.fontFamily !== FONT_FAMILIES[0].value);
  const hasCustomBlockStyle =
    /text-align:\s*(?!left(?:;|$))[^;]+/i.test(blockStyle) ||
    /line-height:\s*(?!1\.15(?:;|$))[^;]+/i.test(blockStyle) ||
    /margin(?:-top|-bottom)?:\s*(?!0(?:px)?(?:;|$))[^;]+/i.test(blockStyle);

  return hasCustomTextStyle || hasCustomBlockStyle ? "custom" : "normal";
}

function applyDocumentStyle(editor: Editor, styleId: DocumentStyleId) {
  if (styleId === "custom") return;
  const style = DOCUMENT_STYLES.find((item) => item.id === styleId);
  if (!style) return;
  if ("level" in style) {
    editor
      .chain()
      .focus()
      .setHeading({ level: style.level })
      .setFontSize(style.fontSize)
      .setBold()
      .run();
    return;
  }
  editor
    .chain()
    .focus()
    .unsetBold()
    .unsetItalic()
    .unsetUnderline()
    .unsetStrike()
    .unsetHighlight()
    .unsetSubscript()
    .unsetSuperscript()
    .unsetColor()
    .unsetFontSize()
    .unsetFontFamily()
    .setParagraph()
    .updateAttributes("paragraph", { style: null })
    .setFontSize(style.fontSize)
    .run();
}

/** Width of the grip strip just outside a table (Word's column/row selectors). */
const TABLE_EDGE_PX = 6;

type TableEdgeKind = "row" | "column" | "table";

interface TableEdgeTarget {
  kind: TableEdgeKind;
  /** Cell the selection should start from. */
  cell: HTMLTableCellElement;
  /** Highlight box in paper coordinates. */
  box: { left: number; top: number; width: number; height: number };
}

/**
 * Word-like grips: hovering just above a table selects a column, just left of it
 * a row, and the corner selects the whole table.
 */
function findTableEdgeTarget(
  surface: HTMLElement,
  paper: HTMLElement,
  clientX: number,
  clientY: number,
): TableEdgeTarget | null {
  const paperRect = paper.getBoundingClientRect();
  const originX = paperRect.left + paper.clientLeft;
  const originY = paperRect.top + paper.clientTop;
  const toBox = (element: Element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left - originX,
      top: rect.top - originY,
      width: rect.width,
      height: rect.height,
    };
  };

  for (const table of Array.from(surface.querySelectorAll<HTMLTableElement>("table"))) {
    const tableRect = table.getBoundingClientRect();
    const inColumns = clientX >= tableRect.left && clientX <= tableRect.right;
    const inRows = clientY >= tableRect.top && clientY <= tableRect.bottom;
    const above = clientY < tableRect.top && clientY >= tableRect.top - TABLE_EDGE_PX;
    const beside = clientX < tableRect.left && clientX >= tableRect.left - TABLE_EDGE_PX;

    if (above && beside) {
      const firstCell = table.rows[0]?.cells[0];
      if (firstCell) return { kind: "table", cell: firstCell, box: toBox(table) };
    }

    if (above && inColumns) {
      const headerRow = table.rows[0];
      for (const cell of Array.from(headerRow?.cells ?? [])) {
        const rect = cell.getBoundingClientRect();
        if (clientX >= rect.left && clientX <= rect.right) {
          return {
            kind: "column",
            cell,
            box: {
              left: rect.left - originX,
              top: tableRect.top - originY,
              width: rect.width,
              height: tableRect.height,
            },
          };
        }
      }
    }

    if (beside && inRows) {
      for (const row of Array.from(table.rows)) {
        const rect = row.getBoundingClientRect();
        if (clientY >= rect.top && clientY <= rect.bottom) {
          const firstCell = row.cells[0];
          if (firstCell) return { kind: "row", cell: firstCell, box: toBox(row) };
        }
      }
    }
  }

  return null;
}

/**
 * Column tracks for a table: explicit Word/`colwidth` values where present,
 * otherwise the average of the known tracks (or an even split).
 */
function tableColumnWidths(table: PMNode, map: TableMap, fallbackTotal: number): number[] {
  const widths = new Array<number>(map.width).fill(0);
  table.forEach((row) => {
    let column = 0;
    row.forEach((cell) => {
      const span = Math.max(1, Number(cell.attrs.colspan) || 1);
      const track: unknown[] = Array.isArray(cell.attrs.colwidth) ? cell.attrs.colwidth : [];
      for (let offset = 0; offset < span; offset += 1) {
        const value = Number(track[offset]) || 0;
        if (value > 0 && widths[column + offset] === 0) widths[column + offset] = value;
      }
      column += span;
    });
  });
  const known = widths.filter((width) => width > 0);
  const average = known.length
    ? Math.round(known.reduce((sum, width) => sum + width, 0) / known.length)
    : Math.round(fallbackTotal / Math.max(1, map.width));
  return widths.map((width) => (width > 0 ? width : average));
}

/** Rewrite a table's colwidths so its tracks sum to `targetWidth`. */
function applyTableFit(
  transaction: Transaction,
  doc: PMNode,
  tablePos: number,
  table: PMNode,
  targetWidth: number,
): boolean {
  const map = TableMap.get(table);
  if (!map.width || !map.height) return false;
  const current = tableColumnWidths(table, map, targetWidth);
  const total = current.reduce((sum, width) => sum + width, 0);
  if (!total) return false;

  const scale = targetWidth / total;
  const next = current.map((width) => Math.max(20, Math.round(width * scale)));
  let changed = false;

  // `forEach` offsets are relative to each node's content start, so the cell
  // node sits one token after the row's content plus one for the row itself.
  table.forEach((row, rowOffset) => {
    let column = 0;
    row.forEach((cell, cellOffset) => {
      const span = Math.max(1, Number(cell.attrs.colspan) || 1);
      const colwidth = next.slice(column, column + span);
      column += span;

      const cellPos = tablePos + 2 + rowOffset + cellOffset;
      const target = doc.nodeAt(cellPos);
      if (!target || target.type !== cell.type) return;
      const previous: unknown[] = Array.isArray(target.attrs.colwidth)
        ? target.attrs.colwidth
        : [];
      if (
        previous.length === colwidth.length &&
        previous.every((value, index) => Number(value) === colwidth[index])
      ) {
        return;
      }
      transaction.setNodeMarkup(cellPos, undefined, { ...target.attrs, colwidth });
      changed = true;
    });
  });
  return changed;
}

/** Scale every table to the page's text width (optionally only the ones that overflow). */
function fitTablesToPage(
  editor: Editor,
  targetWidth: number,
  onlyOverflowing: boolean,
  addToHistory = true,
): boolean {
  const { state, view } = editor;
  const transaction = state.tr;
  if (!addToHistory) transaction.setMeta("addToHistory", false);
  let changed = false;

  state.doc.descendants((node, pos) => {
    if (node.type.spec.tableRole !== "table") return true;
    const map = TableMap.get(node);
    if (!map.width) return false;
    const total = tableColumnWidths(node, map, targetWidth).reduce((sum, width) => sum + width, 0);
    if (onlyOverflowing && total <= targetWidth) return false;
    if (applyTableFit(transaction, state.doc, pos, node, targetWidth)) changed = true;
    return false;
  });

  if (!changed) return false;
  view.dispatch(transaction.scrollIntoView());
  return true;
}

/** Scale the table the caret is in to the page's text width. */
function fitTableAtSelection(editor: Editor, targetWidth: number) {
  const { state, view } = editor;
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.spec.tableRole !== "table") continue;
    const transaction = state.tr;
    if (!applyTableFit(transaction, state.doc, $from.before(depth), node, targetWidth)) return;
    view.dispatch(transaction);
    return;
  }
}

/** Absolute position of the table node that owns a rendered cell. */
function tablePositionFor(view: EditorView, cell: HTMLElement): number | null {
  const $inside = view.state.doc.resolve(view.posAtDOM(cell, 0));
  for (let depth = $inside.depth; depth > 0; depth -= 1) {
    if ($inside.node(depth).type.spec.tableRole === "table") return $inside.before(depth);
  }
  return null;
}

/** Move a top-level table to the block boundary closest to `hitPos`. */
function moveTable(view: EditorView, tablePos: number, hitPos: number) {
  const { state } = view;
  const table = state.doc.nodeAt(tablePos);
  if (!table || table.type.spec.tableRole !== "table") return;

  const transaction = state.tr.delete(tablePos, tablePos + table.nodeSize);
  const mapped = transaction.mapping.map(hitPos, -1);
  const boundaries: number[] = [];
  transaction.doc.forEach((node, offset) => {
    boundaries.push(offset, offset + node.nodeSize);
  });
  let insertAt = 0;
  for (const boundary of boundaries) {
    if (Math.abs(boundary - mapped) < Math.abs(insertAt - mapped)) insertAt = boundary;
  }
  transaction.insert(insertAt, table);
  transaction.setSelection(NodeSelection.create(transaction.doc, insertAt));
  view.dispatch(transaction.scrollIntoView());
  view.focus();
}

/**
 * Grip shown next to the table under the pointer; dragging it moves the table.
 * Box is in paper coordinates.
 */
function findTableGripBox(
  surface: HTMLElement,
  paper: HTMLElement,
  clientX: number,
  clientY: number,
): { left: number; top: number; cell: HTMLTableCellElement } | null {
  const paperRect = paper.getBoundingClientRect();
  const originX = paperRect.left + paper.clientLeft;
  const originY = paperRect.top + paper.clientTop;

  for (const table of Array.from(surface.querySelectorAll<HTMLTableElement>("table"))) {
    const rect = table.getBoundingClientRect();
    const inside =
      clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    const nearCorner =
      clientX >= rect.left - 40 &&
      clientX <= rect.left + 40 &&
      clientY >= rect.top - 40 &&
      clientY <= rect.top + 16;
    if (!inside && !nearCorner) continue;
    const cell = table.rows[0]?.cells[0];
    if (!cell) continue;
    const left = rect.left - originX - 24;
    return {
      left: left < 2 ? rect.left - originX + 2 : left,
      top: Math.max(2, rect.top - originY - 24),
      cell,
    };
  }
  return null;
}

/** Hover band (px) around a row divider that starts a row-height drag. */
const ROW_RESIZE_HIT_PX = 5;
/** Word will not draw a row shorter than this. */
const MIN_ROW_HEIGHT_PX = 16;

interface RowResizeTarget {
  row: HTMLTableRowElement;
  table: HTMLTableElement;
}

/**
 * The horizontal divider under a row. Word resizes the row above the rule, so
 * the pointer has to be inside the table's columns and within a few pixels of
 * one row's bottom edge.
 */
function findRowResizeTarget(
  surface: HTMLElement,
  clientX: number,
  clientY: number,
): RowResizeTarget | null {
  for (const table of Array.from(surface.querySelectorAll<HTMLTableElement>("table"))) {
    const rect = table.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right) continue;
    if (clientY < rect.top - ROW_RESIZE_HIT_PX || clientY > rect.bottom + ROW_RESIZE_HIT_PX) {
      continue;
    }
    for (const row of Array.from(table.rows)) {
      const rowRect = row.getBoundingClientRect();
      if (Math.abs(clientY - rowRect.bottom) <= ROW_RESIZE_HIT_PX) {
        return { row, table };
      }
    }
  }
  return null;
}

/** Position of a table row's node, from its rendered `<tr>`. */
function rowPositionFor(view: EditorView, row: HTMLTableRowElement): number | null {
  const $inside = view.state.doc.resolve(view.posAtDOM(row, 0));
  for (let depth = $inside.depth; depth > 0; depth -= 1) {
    if ($inside.node(depth).type.spec.tableRole === "row") return $inside.before(depth);
  }
  return null;
}

interface RowCellStyle {
  pos: number;
  style: string | null;
  /** Rendered padding before the drag, so only the vertical sides change. */
  paddingTop: number;
  paddingRight: number;
  paddingLeft: number;
}

/** One row-height drag, captured when the divider is grabbed. */
interface RowDragState {
  rowPos: number;
  startY: number;
  startHeight: number;
  originalHeight: number | null;
  originalStyles: RowCellStyle[];
  pending: number | null;
}

const cssPx = (value: number) => `${Math.round(value * 10) / 10}px`;

/** Rewrite a cell's padding with a tighter vertical band, keeping its sides. */
function withVerticalPadding(
  cell: RowCellStyle,
  paddingY: number | null,
): string | null {
  const kept = (cell.style || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    // One shorthand keeps the sides; longhands would fight it in the DOM.
    .filter((part) => !/^padding(-(top|right|bottom|left))?\s*:/i.test(part));
  if (paddingY !== null) {
    kept.push(
      `padding: ${cssPx(paddingY)} ${cssPx(cell.paddingRight)} ${cssPx(paddingY)} ${cssPx(cell.paddingLeft)}`,
    );
  }
  return kept.length ? kept.join("; ") : null;
}

/** Apply a row's minimum height and per-cell vertical padding in one step. */
function setRowGeometry(
  view: EditorView,
  rowPos: number,
  rowHeight: number | null,
  cellStyles: Map<number, string | null>,
  addToHistory: boolean,
): void {
  const row = view.state.doc.nodeAt(rowPos);
  if (!row || row.type.spec.tableRole !== "row") return;
  const transaction = view.state.tr;
  let changed = false;

  if ((row.attrs.rowHeight ?? null) !== rowHeight) {
    transaction.setNodeMarkup(rowPos, undefined, { ...row.attrs, rowHeight });
    changed = true;
  }
  for (const [pos, style] of cellStyles) {
    const cell = transaction.doc.nodeAt(pos);
    if (!cell) continue;
    if ((typeof cell.attrs.style === "string" ? cell.attrs.style : null) === style) continue;
    transaction.setNodeMarkup(pos, undefined, { ...cell.attrs, style });
    changed = true;
  }
  if (!changed) return;
  if (!addToHistory) transaction.setMeta("addToHistory", false);
  view.dispatch(transaction);
}

/**
 * Row height for a pointer position. Growing sets a minimum height; shrinking
 * first tightens the cells' vertical padding, which is what actually makes a
 * text-heavy row shorter, then stops at the text's own height.
 */
function applyRowDragHeight(
  view: EditorView,
  drag: RowDragState,
  heightPx: number,
  addToHistory: boolean,
): void {
  const rowHeight = heightPx > drag.startHeight + 0.5 ? Math.round(heightPx) : null;
  const shortfall = Math.max(0, drag.startHeight - heightPx);
  const styles = new Map<number, string | null>(
    drag.originalStyles.map((cell) => {
      const paddingY = Math.max(0, cell.paddingTop - shortfall / 2);
      const compact = paddingY < cell.paddingTop - 0.05;
      return [cell.pos, compact ? withVerticalPadding(cell, paddingY) : cell.style];
    }),
  );
  setRowGeometry(view, drag.rowPos, rowHeight, styles, addToHistory);
}

/** Put a dragged row back exactly as it was before the drag started. */
function revertRowDrag(view: EditorView, drag: RowDragState): void {
  setRowGeometry(
    view,
    drag.rowPos,
    drag.originalHeight,
    new Map(drag.originalStyles.map((cell) => [cell.pos, cell.style])),
    false,
  );
}

/** Position of a table cell's node, from its rendered DOM element. */
function cellPositionFor(view: EditorView, cell: HTMLElement): number | null {
  const $inside = view.state.doc.resolve(view.posAtDOM(cell, 0));
  for (let depth = $inside.depth; depth > 0; depth -= 1) {
    const role = $inside.node(depth).type.spec.tableRole;
    if (role === "cell" || role === "header_cell") return $inside.before(depth);
  }
  return null;
}

/**
 * Cell range for a row / column / whole table around the current cell.
 * `selectionCell` follows the head of a cell selection, so prefer the anchor:
 * that is where the user started selecting.
 */
function tableRangeSelection(kind: TableEdgeKind, state: EditorState, cellPos?: number) {
  let $cell: ResolvedPos | null = null;
  if (typeof cellPos === "number") {
    $cell = state.doc.resolve(cellPos);
  } else {
    const anchorCell = (state.selection as { $anchorCell?: ResolvedPos }).$anchorCell;
    $cell = anchorCell ?? selectionCell(state);
  }
  if (!$cell || !$cell.node(-1)?.type?.spec?.tableRole) return null;
  const table = $cell.node(-1);
  const map = TableMap.get(table);
  const tableStart = $cell.start(-1);
  const rect = map.findCell($cell.pos - tableStart);

  if (kind === "table") {
    return {
      anchorCell: tableStart + map.map[0],
      headCell: tableStart + map.map[map.map.length - 1],
    };
  }

  if (kind === "row") {
    const row = rect.top;
    return {
      anchorCell: tableStart + map.map[row * map.width],
      headCell: tableStart + map.map[row * map.width + map.width - 1],
    };
  }

  // Cell selections are rectangles, so a merged cell at either end would widen
  // the selection across neighbouring columns. Stay on cells that sit in this
  // column alone.
  const column = rect.left;
  let first = -1;
  let last = -1;
  for (let row = 0; row < map.height; row += 1) {
    const cellRect = map.findCell(map.map[row * map.width + column]);
    if (cellRect.left !== column || cellRect.right !== column + 1) continue;
    if (first < 0) first = row;
    last = row;
  }
  if (first < 0) {
    return {
      anchorCell: tableStart + map.map[column],
      headCell: tableStart + map.map[(map.height - 1) * map.width + column],
    };
  }
  return {
    anchorCell: tableStart + map.map[first * map.width + column],
    headCell: tableStart + map.map[last * map.width + column],
  };
}

export function TiptapRichTextEditor({
  value = "",
  onChange,
  placeholder = "Start typing...",
  className,
  tokens = [],
  showCharacterCount = true,
  showHeader = true,
  signatureImageUrl,
  showPageSetup = true,
  showPageNumbers: showPageNumbersProp = true,
  autoGrow = false,
  compactToolbar,
}: RichTextEditorProps) {
  // A growing page always gets the compact strip: a pinned ribbon that needs
  // sideways scrolling is unreachable. Other hosts can ask for it too, keeping
  // their own scroll box and page indicator.
  const showCompactToolbar = compactToolbar ?? autoGrow;
  const { resolvedTheme } = useTheme();
  const labelId = useId();
  const isFocusedRef = useRef(false);
  const lastEmittedHtml = useRef(value ?? "");
  const editorRef = useRef<Editor | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const printFrameRef = useRef<HTMLIFrameElement>(null);
  const paperScrollRef = useRef<HTMLDivElement>(null);
  const bodyMeasureRef = useRef<HTMLDivElement>(null);
  const findIndexRef = useRef(0);
  const lastSpacersSignature = useRef("");
  const draggedTableRef = useRef<{ pos: number } | null>(null);
  /** Row-divider drag starter, kept in a ref for the editor's mousedown hook. */
  const startRowDragRef = useRef<((target: RowResizeTarget, clientY: number) => void) | null>(null);
  /** Active drag on a row divider; heights are committed on release. */
  const rowDragRef = useRef<RowDragState | null>(null);

  const [htmlSnapshot, setHtmlSnapshot] = useState(value ?? "");
  const [pageSettings, setPageSettings] = useState<PageSettings>(DEFAULT_PAGE_SETTINGS);
  const [showPageNumbers, setShowPageNumbers] = useState(showPageNumbersProp);
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [hfEditMode, setHfEditMode] = useState<null | "header" | "footer">(null);
  /** Local draft while typing font size — avoids controlled input fighting mid-edit. */
  const [fontSizeDraft, setFontSizeDraft] = useState<string | null>(null);
  const [showPageSetupDialog, setShowPageSetupDialog] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printPreviewHtml, setPrintPreviewHtml] = useState("");
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [findMatchCase, setFindMatchCase] = useState(false);
  const [findStatus, setFindStatus] = useState("");
  const [showTokenTools, setShowTokenTools] = useState(false);
  const [showTableTools, setShowTableTools] = useState(false);
  /** Table grip currently highlighted at the edge of a table. */
  const [tableEdge, setTableEdge] = useState<TableEdgeTarget | null>(null);
  /** Drag handle for moving a whole table. */
  const [tableGrip, setTableGrip] = useState<{
    left: number;
    top: number;
    cell: HTMLTableCellElement;
  } | null>(null);
  const tablesFittedRef = useRef(false);
  const [promptDialog, setPromptDialog] = useState<PromptDialogState>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  /** Pages where a single block is taller than a sheet and still runs into the margin. */
  const [overflowPages, setOverflowPages] = useState<Set<number>>(new Set());

  const pageDims = useMemo(() => getPageDimensions(pageSettings), [pageSettings]);

  const emitChange = useCallback((nextHtml: string) => {
    try {
      const cleaned = sanitizeRichText(nextHtml);
      if (cleaned === lastEmittedHtml.current) return;
      lastEmittedHtml.current = cleaned;
      setHtmlSnapshot(cleaned);
      onChangeRef.current?.(cleaned, { html: cleaned, editor: "tiptap" });
    } catch (error) {
      logEditorDiagnostic({
        event: "sanitize_failed",
        engine: "tiptap",
        workflow: "tiptap_emit",
        errorName: safeErrorName(error),
      });
      throw error;
    }
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // TipTap 3 StarterKit ships Link/Underline — use our configured copies instead.
        link: false,
        underline: false,
      }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      ParagraphLayout,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer" },
      }),
      NpaImage.configure({
        inline: false,
        // Signature uploads and drawn pads are data URLs; without this TipTap
        // rejects <img src="data:…"> and insertContent falls back to raw HTML text.
        allowBase64: true,
      }),
      Placeholder.configure({ placeholder }),
      NpaTable.configure({
        resizable: true,
        // Wider hover target: the divider is otherwise a 5px needle.
        handleWidth: 10,
        HTMLAttributes: {
          class: "npa-tiptap-table",
        },
      }),
      NpaTableRow,
      NpaTableHeader,
      NpaTableCell,
      PageBreaks,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "npa-tiptap-surface outline-none prose prose-sm max-w-none focus:outline-none dark:prose-invert",
        role: "textbox",
        "aria-multiline": "true",
        ...(showHeader
          ? { "aria-labelledby": labelId }
          : { "aria-label": "Document editor" }),
      },
      // Dragging the rule under a row sets that row's height (Word-style).
      // Runs before ProseMirror's own handling so the caret stays put.
      handleDOMEvents: {
        mousedown: (view, event) => {
          if (event.button !== 0) return false;
          // The column divider keeps its own resize behaviour.
          const onColumnHandle = (event.target as HTMLElement | null)?.closest(
            ".column-resize-handle",
          );
          if (onColumnHandle) return false;
          const target = findRowResizeTarget(
            view.dom as HTMLElement,
            event.clientX,
            event.clientY,
          );
          if (!target) return false;
          event.preventDefault();
          startRowDragRef.current?.(target, event.clientY);
          return true;
        },
      },
      handlePaste: (_view, event) => {
        const html = event.clipboardData?.getData("text/html") || "";
        const text = event.clipboardData?.getData("text/plain") || "";
        const imageBlob = findClipboardImageBlob(event.clipboardData);
        // ClipboardEvent is typed as Event (no modifiers); browsers still expose altKey on paste.
        const altKey = Boolean((event as ClipboardEvent & { altKey?: boolean }).altKey);
        const pasteAsPicture = shouldPasteClipboardAsPicture({
          hasImage: Boolean(imageBlob),
          html,
          altKey,
        });

        if (pasteAsPicture && imageBlob) {
          event.preventDefault();
          void blobToDataUrl(imageBlob)
            .then((src) => {
              editorRef.current?.chain().focus().setImage({ src, alt: "Pasted picture" }).run();
            })
            .catch(() => toast.error("Could not paste clipboard image"));
          return true;
        }

        if (pasteAsPicture && html.trim()) {
          event.preventDefault();
          void rasterizeHtmlToPng(html)
            .then((src) => {
              editorRef.current?.chain().focus().setImage({ src, alt: "Pasted picture" }).run();
            })
            .catch(() =>
              toast.error("Could not paste as picture — try Excel Copy as Picture, then paste"),
            );
          return true;
        }

        if (!html.trim() && !text) return false;
        event.preventDefault();
        const payload = html.trim()
          ? sanitizePastedRichText(html)
          : sanitizeRichText(`<p>${text.replace(/\n/g, "<br>")}</p>`);
        editorRef.current?.commands.insertContent(payload);
        return true;
      },
      // Dropping the table grip moves the table to the nearest block boundary.
      handleDrop: (view, event) => {
        const dragged = draggedTableRef.current;
        draggedTableRef.current = null;
        if (!dragged) return false;
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        if (!coords) return false;
        event.preventDefault();
        moveTable(view, dragged.pos, coords.pos);
        return true;
      },
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
          event.preventDefault();
          setShowFindReplace(true);
          return true;
        }

        if (event.key === "Tab" && !event.altKey && !event.metaKey && !event.ctrlKey) {
          const activeEditor = editorRef.current;
          if (!activeEditor) return false;

          if (activeEditor.isActive("table")) {
            const moved = event.shiftKey
              ? activeEditor.commands.goToPreviousCell()
              : activeEditor.commands.goToNextCell();
            if (moved) {
              event.preventDefault();
              return true;
            }
            if (!event.shiftKey) {
              event.preventDefault();
              return activeEditor.chain().focus().addRowAfter().goToNextCell().run();
            }
            return false;
          }

          event.preventDefault();
          const indentCommands = activeEditor.commands as unknown as {
            increaseIndent: () => boolean;
            decreaseIndent: () => boolean;
          };
          if (event.shiftKey) indentCommands.decreaseIndent();
          else indentCommands.increaseIndent();
          return true;
        }

        return false;
      },
    },
    onFocus: () => {
      isFocusedRef.current = true;
    },
    onBlur: () => {
      isFocusedRef.current = false;
    },
    onUpdate: ({ editor: ed, transaction }) => {
      // Page spacers are decorations, not edits — don't emit them as a change.
      if (!transaction.docChanged) return;
      // A row drag emits once, when the height is committed on release.
      if (rowDragRef.current) return;
      emitChange(ed.getHTML());
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  /** Row-height drag: preview without history, commit once on release. */
  useEffect(() => {
    if (!editor) return;
    const view = editor.view;

    // Live preview is throttled: each dispatch re-sanitizes the whole document.
    let lastPreview = 0;
    const move = (event: MouseEvent) => {
      const drag = rowDragRef.current;
      if (!drag) return;
      const height = Math.max(MIN_ROW_HEIGHT_PX, drag.startHeight + (event.clientY - drag.startY));
      drag.pending = height;
      const now = Date.now();
      if (now - lastPreview < 60) return;
      lastPreview = now;
      applyRowDragHeight(view, drag, height, false);
    };

    const finish = () => {
      const drag = rowDragRef.current;
      if (!drag) return;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (drag.pending === null) {
        rowDragRef.current = null;
        return;
      }
      // Rewind while the drag is still live (no change event), then commit as
      // one history step, so a single undo restores the row as it was.
      revertRowDrag(view, drag);
      rowDragRef.current = null;
      applyRowDragHeight(view, drag, drag.pending, true);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", finish);
    window.addEventListener("blur", finish);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", finish);
      window.removeEventListener("blur", finish);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const next = value ?? "";
    if (isFocusedRef.current) return;
    if (next === lastEmittedHtml.current) return;
    const current = editor.getHTML();
    if (current === next) {
      lastEmittedHtml.current = next;
      setHtmlSnapshot(next);
      return;
    }
    lastEmittedHtml.current = next;
    setHtmlSnapshot(next);
    editor.commands.setContent(next || "", { emitUpdate: false });
  }, [value, editor]);

  /**
   * Paginate at block boundaries. Each page gap becomes real space in the flow,
   * so a table row is pushed onto the next sheet instead of being drawn across
   * the gap. Spacers are decorations — they never enter the document.
   */
  useEffect(() => {
    if (!editor) return;
    const view = editor.view;

    const applySpacers = (spacers: Map<number, PageSpacer>) => {
      const transaction = view.state.tr.setMeta(PAGE_SPACERS_META, spacers);
      transaction.setMeta("addToHistory", false);
      view.dispatch(transaction);
    };

    if (!showPageSetup) {
      applySpacers(new Map());
      setTotalPages(1);
      setCurrentPage(1);
      setOverflowPages(new Set());
      lastSpacersSignature.current = "";
      return;
    }

    const pageH = pageHeightPx(pageSettings);
    const pitch = pageH + PAGE_GAP_PX;
    const bodyH = bodyContentHeightPx(pageSettings, true);
    const marginTopPx = (pageSettings.marginTop / 25.4) * 96;

    const paginate = () => {
      const surface = view.dom as HTMLElement;

      const measure = () => {
        const surfaceTop = surface.getBoundingClientRect().top;
        const blocks: Array<{ pos: number; top: number; bottom: number }> = [];
        view.state.doc.forEach((_node, offset) => {
          const dom = view.nodeDOM(offset) as HTMLElement | null;
          if (!dom || typeof dom.getBoundingClientRect !== "function") return;
          const rect = dom.getBoundingClientRect();
          if (rect.height === 0 && rect.width === 0) return;
          blocks.push({
            pos: offset,
            top: rect.top - surfaceTop,
            bottom: rect.bottom - surfaceTop,
          });
        });
        return blocks;
      };

      const spacers = new Map<number, PageSpacer>();
      const overflow = new Set<number>();
      applySpacers(spacers);

      let page = 0;
      for (let guard = 0; guard < 200; guard += 1) {
        const boundary = page * pitch + bodyH;
        const nextStart = (page + 1) * pitch;
        if (boundary > surface.scrollHeight + pitch) break;

        const block = measure().find(
          (item) => item.bottom > boundary + 0.5 && item.top < nextStart - 0.5,
        );
        if (!block) {
          page += 1;
          continue;
        }

        if (block.bottom - block.top > bodyH) {
          // Taller than a sheet (a long table): it has to cross, so note the
          // pages whose footer area it may reach and move past it.
          const lastPage = Math.max(page, Math.floor((block.bottom - 1) / pitch));
          for (let index = page + 1; index <= lastPage + 1; index += 1) overflow.add(index);
          page = lastPage + 1;
          continue;
        }

        const gapTopInPaper = page * pitch + pageH;
        spacers.set(block.pos, {
          height: Math.max(PAGE_GAP_PX, nextStart - block.top),
          page: page + 2,
          gapOffset: gapTopInPaper + PAGE_GAP_PX / 2 - (block.top + marginTopPx),
        });
        applySpacers(new Map(spacers));
      }

      // Centre each page label on the real gap: the spacer starts inside the
      // previous page's bottom margin, so measure instead of trusting margins.
      const paper = surface.closest(".doc-paper") as HTMLElement | null;
      if (paper && spacers.size > 0) {
        const paperTop = paper.getBoundingClientRect().top;
        for (const element of Array.from(
          surface.querySelectorAll<HTMLElement>("[data-page-break]"),
        )) {
          const label = element.firstElementChild as HTMLElement | null;
          if (!label) continue;
          const pageIndex = Number(element.dataset.pageBreak) - 2;
          const gapCenter = pageIndex * pitch + pageH + PAGE_GAP_PX / 2;
          const spacerTop = element.getBoundingClientRect().top - paperTop;
          label.style.top = `${gapCenter - spacerTop}px`;
        }
      }

      let pages = 1;
      for (const spacer of spacers.values()) pages = Math.max(pages, spacer.page);
      for (const pageNumber of overflow) pages = Math.max(pages, pageNumber);

      const signature = Array.from(spacers.entries())
        .map(([pos, spacer]) => `${pos}:${spacer.height}:${spacer.page}`)
        .join("|");
      if (signature === lastSpacersSignature.current) return;
      lastSpacersSignature.current = signature;

      setOverflowPages(overflow);
      setTotalPages(pages);
      setCurrentPage((previous) => Math.min(previous, pages));
    };

    const timer = setTimeout(paginate, 120);
    return () => clearTimeout(timer);
  }, [editor, htmlSnapshot, pageSettings, showPageSetup]);

  /**
   * One-shot repair for documents imported before grids were fitted to the
   * page: shrink any table that is still wider than the text width. Waits for
   * the sheet width to settle and runs once, so a deliberate drag survives.
   */
  useEffect(() => {
    if (!editor || tablesFittedRef.current) return;
    const surface = editor.view.dom as HTMLElement;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const run = () => {
      if (tablesFittedRef.current) return;
      const width = Math.floor(surface.getBoundingClientRect().width);
      // Ignore transient widths while the panel is still laying out.
      if (width < 240) return;
      tablesFittedRef.current = true;
      fitTablesToPage(editor, width, true, false);
    };

    timer = setTimeout(run, 600);
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(run, 300);
          })
        : null;
    observer?.observe(surface);

    return () => {
      if (timer) clearTimeout(timer);
      observer?.disconnect();
    };
  }, [editor]);

  const handlePaperScroll = () => {
    if (!showPageSetup || !paperScrollRef.current) return;
    const container = paperScrollRef.current;
    // Read the page dividers instead of estimating, so the indicator always
    // agrees with the labelled break currently on screen.
    const viewportTop = container.getBoundingClientRect().top + 8;
    let page = 1;
    for (const divider of Array.from(container.querySelectorAll<HTMLElement>("[data-page-break]"))) {
      const gapTop =
        divider.getBoundingClientRect().top + (Number(divider.dataset.gapOffset) || 0);
      if (gapTop > viewportTop) break;
      page = Number(divider.dataset.pageBreak) || page;
    }
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  };

  const counts = useMemo(
    () => stripHtmlToPlainLength(htmlSnapshot || value || ""),
    [htmlSnapshot, value],
  );

  const toolbarBtn = (active: boolean) =>
    cn(
      "h-8 w-8 inline-flex shrink-0 items-center justify-center rounded-md border border-transparent text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-40 motion-reduce:transform-none",
      active && "bg-primary/10 border-primary/15 text-primary shadow-sm",
    );

  const buildEditorPrintHtml = useCallback(() => {
    const raw = editor?.getHTML() || htmlSnapshot || "";
    return buildComposePrintHtml(
      sanitizeRichText(raw),
      pageSettings,
      // Blank title → Chrome has nothing to put in its optional top header.
      "\u00a0",
      resolvedTheme === "dark",
      {
        headerText,
        footerText,
        showPageNumbers,
        pageCount: totalPages,
      },
    );
  }, [
    editor,
    htmlSnapshot,
    pageSettings,
    resolvedTheme,
    headerText,
    footerText,
    showPageNumbers,
    totalPages,
  ]);

  const handlePrintPreview = () => {
    try {
      setPrintPreviewHtml(buildEditorPrintHtml());
      setShowPrintPreview(true);
    } catch (error) {
      logEditorDiagnostic({
        event: "print_preview_failed",
        engine: "tiptap",
        workflow: "tiptap_print_preview",
        errorName: safeErrorName(error),
      });
      toast.error("Print preview failed");
    }
  };

  const printFromPreviewModal = () => {
    const frame = printFrameRef.current;
    const frameWindow = frame?.contentWindow;
    const frameDoc = frame?.contentDocument;
    if (!frameWindow || !frameDoc) {
      toast.error("Print preview is still loading");
      return;
    }
    // Refresh from editor so print matches current content; keep title blank.
    try {
      const html = buildEditorPrintHtml();
      setPrintPreviewHtml(html);
      frameDoc.open();
      frameDoc.write(html);
      frameDoc.close();
      frameDoc.title = "";
    } catch {
      // Fall through and print whatever is already in the iframe.
    }
    toast.message("Turn off “Headers and footers” in the print dialog", {
      description: "Otherwise Chrome adds date, title, URL, and its own page numbers.",
      duration: 7000,
    });
    window.setTimeout(() => {
      frameWindow.focus();
      frameWindow.print();
    }, 50);
  };

  const insertSignature = () => {
    if (!editor || !signatureImageUrl) return;
    editor
      .chain()
      .focus()
      .setImage({ src: resolveEditorImageSrc(signatureImageUrl), alt: "Signature" })
      .run();
  };

  const handleInsertToken = (token: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(token).run();
  };

  const findNextMatch = useCallback(
    (fromStart = false) => {
      if (!editor) return;
      const query = findQuery.trim();
      if (!query) {
        setFindStatus("Enter text to find");
        return;
      }
      const ranges = collectTiptapFindMatches(editor, query, findMatchCase);
      if (ranges.length === 0) {
        findIndexRef.current = 0;
        setFindStatus("No matches");
        return;
      }
      if (fromStart) findIndexRef.current = 0;
      else findIndexRef.current = findIndexRef.current % ranges.length;
      const range = ranges[findIndexRef.current];
      if (range) selectTiptapMatch(editor, range);
      setFindStatus(`${findIndexRef.current + 1} of ${ranges.length}`);
      findIndexRef.current = (findIndexRef.current + 1) % ranges.length;
    },
    [editor, findMatchCase, findQuery],
  );

  const replaceCurrentMatch = useCallback(() => {
    if (!editor) return;
    const query = findQuery.trim();
    if (!query) return;
    const { from, to } = editor.state.selection;
    const selected = editor.state.doc.textBetween(from, to, "");
    const matchesSelection = findMatchCase
      ? selected === query
      : selected.toLowerCase() === query.toLowerCase();
    if (matchesSelection) {
      replaceTiptapMatch(editor, { from, to }, replaceQuery);
    }
    findNextMatch();
  }, [editor, findMatchCase, findNextMatch, findQuery, replaceQuery]);

  const replaceAllMatches = useCallback(() => {
    if (!editor) return;
    const query = findQuery.trim();
    if (!query) return;
    const count = replaceAllTiptapMatches(editor, query, replaceQuery, findMatchCase);
    findIndexRef.current = 0;
    setFindStatus(count === 0 ? "No matches" : `Replaced ${count}`);
  }, [editor, findMatchCase, findQuery, replaceQuery]);

  const confirmPromptDialog = () => {
    if (!promptDialog || !editor) {
      setPromptDialog(null);
      return;
    }
    if (promptDialog.type === "link") {
      const url = promptDialog.value.trim();
      if (!url) {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
      } else {
        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      }
    } else if (promptDialog.type === "image") {
      const url = promptDialog.value.trim();
      if (url) {
        editor.chain().focus().setImage({ src: resolveEditorImageSrc(url), alt: "" }).run();
      }
    } else if (promptDialog.type === "table") {
      const rows = Math.min(20, Math.max(1, Number.parseInt(promptDialog.rows, 10) || 2));
      const cols = Math.min(10, Math.max(1, Number.parseInt(promptDialog.cols, 10) || 2));
      editor.chain().focus().insertTable({ rows, cols, withHeaderRow: false }).run();
      // New tables fill the text width, with real tracks so they can be dragged.
      const contentWidth = Math.floor(
        (editor.view.dom as HTMLElement).getBoundingClientRect().width,
      );
      fitTableAtSelection(editor, contentWidth > 0 ? contentWidth : pageDims.contentWidthPx);
      setShowTableTools(true);
    }
    setPromptDialog(null);
  };

  if (!editor) {
    return (
      <div className={cn("border border-border rounded-lg overflow-hidden", className)}>
        <div className="bg-muted/40 px-4 py-2 border-b border-border">
          <span className="text-sm text-muted-foreground">Loading TipTap editor...</span>
        </div>
        <div className="min-h-[260px] p-4 bg-background animate-pulse" />
      </div>
    );
  }

  const inTable = editor.isActive("table");

  /** Width of the page's text column as actually rendered. */
  const measuredContentWidth = () => {
    const width = Math.floor((editor.view.dom as HTMLElement).getBoundingClientRect().width);
    return width > 0 ? width : pageDims.contentWidthPx;
  };

  const fitCurrentTable = () => {
    fitTableAtSelection(editor, measuredContentWidth());
  };

  const selectTablePart = (kind: TableEdgeKind) => {
    const range = tableRangeSelection(kind, editor.state);
    if (!range) return;
    editor.chain().focus().setCellSelection(range).run();
  };

  const clearTableEdge = () => {
    if (tableEdge) {
      (editor.view.dom as HTMLElement).style.cursor = "";
      setTableEdge(null);
    }
    if (tableGrip) setTableGrip(null);
  };

  const startTableDrag = (event: React.DragEvent<HTMLDivElement>) => {
    if (!tableGrip) return;
    const { view } = editor;
    const tablePos = tablePositionFor(view, tableGrip.cell);
    if (tablePos === null) return;
    draggedTableRef.current = { pos: tablePos };
    // Tell ProseMirror a table is in flight so drops land as a block move.
    const table = view.state.doc.nodeAt(tablePos);
    if (!table) return;
    view.dragging = { slice: new Slice(Fragment.from(table), 0, 0), move: true };
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", "Table");
  };

  const startRowDrag = (target: RowResizeTarget, clientY: number) => {
    const { view } = editor;
    const rowPos = rowPositionFor(view, target.row);
    if (rowPos === null) return;
    const current = view.state.doc.nodeAt(rowPos);
    if (!current) return;
    const stored = current.attrs.rowHeight;
    const originalStyles: RowCellStyle[] = [];
    current.forEach((cell, offset) => {
      const domCell = target.row.cells[originalStyles.length];
      const computed = domCell ? window.getComputedStyle(domCell) : null;
      const px = (value: string | undefined) => (value ? Number.parseFloat(value) || 0 : 0);
      originalStyles.push({
        pos: rowPos + 1 + offset,
        style: typeof cell.attrs.style === "string" ? cell.attrs.style : null,
        paddingTop: px(computed?.paddingTop),
        paddingRight: px(computed?.paddingRight),
        paddingLeft: px(computed?.paddingLeft),
      });
    });
    rowDragRef.current = {
      rowPos,
      startY: clientY,
      startHeight: target.row.getBoundingClientRect().height,
      originalHeight: typeof stored === "number" ? stored : null,
      originalStyles,
      pending: null,
    };
    if (tableEdge) setTableEdge(null);
    setTableGrip(null);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  };
  startRowDragRef.current = startRowDrag;

  const handlePaperMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    const surface = editor.view.dom as HTMLElement;
    const paper = surface.closest(".doc-paper");
    if (!paper || rowDragRef.current) return;
    // Measured against the paper so grips still work in the gutter beside it
    // when a wide table runs past the page edge.
    const target = findTableEdgeTarget(surface, paper as HTMLElement, event.clientX, event.clientY);
    // A row divider sits inside the table, so it never competes with the grips.
    const rowResize = target ? null : findRowResizeTarget(surface, event.clientX, event.clientY);
    surface.style.cursor = rowResize ? "row-resize" : target ? "pointer" : "";
    setTableGrip(findTableGripBox(surface, paper as HTMLElement, event.clientX, event.clientY));
    setTableEdge((previous) =>
      previous && target && previous.cell === target.cell ? previous : target,
    );
  };

  const selectTableEdge = () => {
    if (!tableEdge) return;
    const { view, state } = editor;
    // Select from the gripped cell directly — moving the caret first would land
    // on whichever text position ProseMirror prefers near that element.
    const cellPos = cellPositionFor(view, tableEdge.cell);
    const range = cellPos === null ? null : tableRangeSelection(tableEdge.kind, state, cellPos);
    if (range) editor.chain().focus().setCellSelection(range).run();
    clearTableEdge();
  };

  const imageSelected = isImageSelected(editor);
  const imageAttrs = imageSelected ? getSelectedImageAttrs(editor) : null;
  const currentFontFamily =
    (editor.getAttributes("textStyle").fontFamily as string | undefined) || FONT_FAMILIES[0].value;
  const currentFontSize =
    (editor.getAttributes("textStyle").fontSize as string | undefined) || "12pt";
  const currentLineHeight = getBlockLineHeight(editor);
  const currentTextColor =
    (editor.getAttributes("textStyle").color as string | undefined) || "#000000";
  const currentHighlight =
    (editor.getAttributes("highlight").color as string | undefined) || "";
  const indentLeftPx = getBlockMarginLeftPx(editor);
  const indentFirstPx = getBlockTextIndentPx(editor);

  const setCellAttr = (attrs: Record<string, string | null>) => {
    const nodeType = editor.isActive("tableHeader") ? "tableHeader" : "tableCell";
    const cssKey: Record<string, string> = {
      textAlign: "text-align",
      verticalAlign: "vertical-align",
      width: "width",
      backgroundColor: "background-color",
    };
    const styleMap = new Map<string, string>();
    const current = (editor.getAttributes(nodeType).style as string | undefined) || "";
    for (const part of current.split(";")) {
      const idx = part.indexOf(":");
      if (idx < 0) continue;
      const prop = part.slice(0, idx).trim().toLowerCase();
      const value = part.slice(idx + 1).trim();
      if (prop && value) styleMap.set(prop, value);
    }
    for (const [key, value] of Object.entries(attrs)) {
      const prop = cssKey[key] || key;
      if (value === null || value === "") styleMap.delete(prop);
      else styleMap.set(prop, value);
    }
    const style =
      styleMap.size > 0
        ? Array.from(styleMap.entries())
            .map(([prop, value]) => `${prop}: ${value}`)
            .join("; ")
        : null;
    editor.chain().focus().updateAttributes(nodeType, { style }).run();
  };

  /** Ribbon clusters: the full ribbon, and the compact strip's popover. */
  const ribbonGroups = (
    <div className="flex w-full flex-wrap items-stretch">
        <RibbonGroup label="Clipboard">
          <button
            type="button"
            className={toolbarBtn(false)}
            aria-label="Undo"
            title="Undo"
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={toolbarBtn(false)}
            aria-label="Redo"
            title="Redo"
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={toolbarBtn(false)}
            aria-label="Paste as picture"
            title="Paste clipboard as a picture (Excel: Copy as Picture, or Alt+Paste)"
            onClick={() => {
              void readClipboardAsPictureDataUrl()
                .then(({ dataUrl }) => {
                  editor.chain().focus().setImage({ src: dataUrl, alt: "Pasted picture" }).run();
                  toast.success("Pasted as picture");
                })
                .catch(() =>
                  toast.error(
                    "Copy the BOQ in Excel first — use Copy as Picture, or copy cells then click Paste as picture",
                  ),
                );
            }}
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
          </button>
        </RibbonGroup>

        <RibbonGroup label="Font">
          <Select
            value={resolveDocumentStyleId(editor)}
            onValueChange={(value) => applyDocumentStyle(editor, value as DocumentStyleId)}
          >
            <SelectTrigger className="h-8 w-[7.5rem] text-xs" aria-label="Style">
              <SelectValue placeholder="Style" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_STYLES.map((style) => (
                <SelectItem key={style.id} value={style.id} className="text-xs" disabled={style.id === "custom"}>
                  {style.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={currentFontFamily}
            onValueChange={(value) => editor.chain().focus().setFontFamily(value).run()}
          >
            <SelectTrigger className="h-8 w-[9.5rem] text-xs" aria-label="Font family">
              <SelectValue placeholder="Font" />
            </SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map((font) => (
                <SelectItem key={font.value} value={font.value} className="text-xs">
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FontSizeStepper
            editor={editor}
            current={currentFontSize}
            draft={fontSizeDraft}
            setDraft={setFontSizeDraft}
          />
          <button
            type="button"
            className={toolbarBtn(editor.isActive("bold"))}
            aria-label="Bold"
            aria-pressed={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={toolbarBtn(editor.isActive("italic"))}
            aria-label="Italic"
            aria-pressed={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={toolbarBtn(editor.isActive("underline"))}
            aria-label="Underline"
            aria-pressed={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={toolbarBtn(editor.isActive("strike"))}
            aria-label="Strikethrough"
            aria-pressed={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </button>
          <ColorSwatchPopover
            label="Font color"
            icon={<Baseline className="h-3.5 w-3.5" />}
            value={currentTextColor}
            swatches={TEXT_COLOR_SWATCHES}
            toolbarBtnClass={toolbarBtn(Boolean(editor.getAttributes("textStyle").color))}
            onPick={(color) => editor.chain().focus().setColor(color).run()}
            onClear={() => editor.chain().focus().unsetColor().run()}
          />
          <ColorSwatchPopover
            label="Highlight"
            icon={<Highlighter className="h-3.5 w-3.5" />}
            value={currentHighlight || "#fff59d"}
            swatches={HIGHLIGHT_COLOR_SWATCHES}
            toolbarBtnClass={toolbarBtn(editor.isActive("highlight"))}
            onPick={(color) => editor.chain().focus().toggleHighlight({ color }).run()}
            onClear={() => editor.chain().focus().unsetHighlight().run()}
          />
          <button
            type="button"
            className={toolbarBtn(editor.isActive("subscript"))}
            aria-label="Subscript"
            aria-pressed={editor.isActive("subscript")}
            onClick={() => editor.chain().focus().toggleSubscript().run()}
          >
            <SubscriptIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={toolbarBtn(editor.isActive("superscript"))}
            aria-label="Superscript"
            aria-pressed={editor.isActive("superscript")}
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
          >
            <SuperscriptIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={toolbarBtn(false)}
            aria-label="Clear formatting"
            title="Clear formatting"
            onClick={() => editor.chain().focus().unsetAllMarks().run()}
          >
            <RemoveFormatting className="h-3.5 w-3.5" />
          </button>
        </RibbonGroup>

        <RibbonGroup label="Paragraph">
          <button
            type="button"
            className={toolbarBtn(editor.isActive("bulletList"))}
            aria-label="Bullet list"
            aria-pressed={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={toolbarBtn(editor.isActive("orderedList"))}
            aria-label="Numbered list"
            aria-pressed={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={toolbarBtn(false)}
            aria-label="Decrease indent"
            title="Decrease indent"
            onClick={() => editor.chain().focus().decreaseIndent().run()}
          >
            <IndentDecrease className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={toolbarBtn(false)}
            aria-label="Increase indent"
            title="Increase indent"
            onClick={() => editor.chain().focus().increaseIndent().run()}
          >
            <IndentIncrease className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={toolbarBtn(editor.isActive({ textAlign: "left" }))}
            aria-label="Align left"
            aria-pressed={editor.isActive({ textAlign: "left" })}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={toolbarBtn(editor.isActive({ textAlign: "center" }))}
            aria-label="Align center"
            aria-pressed={editor.isActive({ textAlign: "center" })}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={toolbarBtn(editor.isActive({ textAlign: "right" }))}
            aria-label="Align right"
            aria-pressed={editor.isActive({ textAlign: "right" })}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
          >
            <AlignRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={toolbarBtn(editor.isActive({ textAlign: "justify" }))}
            aria-label="Justify"
            aria-pressed={editor.isActive({ textAlign: "justify" })}
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          >
            <AlignJustify className="h-3.5 w-3.5" />
          </button>
          <Select
            value={currentLineHeight}
            onValueChange={(value) => {
              if (value !== "custom") editor.chain().focus().setLineHeight(value).run();
            }}
          >
            <SelectTrigger className="h-8 w-[5.5rem] text-xs" aria-label="Line spacing">
              <SelectValue placeholder="Line" />
            </SelectTrigger>
            <SelectContent>
              {LINE_HEIGHTS.map((item) => (
                <SelectItem key={item.value} value={item.value} className="text-xs" disabled={item.value === "custom"}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={resolveSpacingPresetId(editor)}
            onValueChange={(value) => {
              if (value === "custom") return;
              const preset = PARAGRAPH_SPACING_PRESETS.find((p) => p.id === value);
              if (!preset) return;
              editor
                .chain()
                .focus()
                .setParagraphSpacing(preset.before, preset.after)
                .run();
            }}
          >
            <SelectTrigger className="h-8 w-[6.5rem] text-xs" aria-label="Paragraph spacing">
              <SelectValue placeholder="Spacing" />
            </SelectTrigger>
            <SelectContent>
              {PARAGRAPH_SPACING_PRESETS.map((item) => (
                <SelectItem key={item.id} value={item.id} className="text-xs" disabled={item.id === "custom"}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={resolveBorderPresetId(editor)}
            onValueChange={(value) => {
              const preset = PARAGRAPH_BORDER_PRESETS.find((p) => p.id === value);
              if (!preset) return;
              editor.chain().focus().setParagraphBorderStyle(preset.style).run();
            }}
          >
            <SelectTrigger className="h-8 w-[7rem] text-xs" aria-label="Paragraph border">
              <SelectValue placeholder="Border" />
            </SelectTrigger>
            <SelectContent>
              {PARAGRAPH_BORDER_PRESETS.map((item) => (
                <SelectItem key={item.id} value={item.id} className="text-xs">
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </RibbonGroup>

        <RibbonGroup label="Insert">
          <button
            type="button"
            className={toolbarBtn(editor.isActive("link"))}
            aria-label="Insert link"
            onClick={() =>
              setPromptDialog({
                type: "link",
                value: (editor.getAttributes("link").href as string) || "https://",
              })
            }
          >
            <Link2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={toolbarBtn(false)}
            aria-label="Insert image"
            onClick={() => setPromptDialog({ type: "image", value: "https://" })}
          >
            <ImageIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={toolbarBtn(inTable)}
            aria-label="Insert table"
            onClick={() => setPromptDialog({ type: "table", rows: "2", cols: "2" })}
          >
            <Table2 className="h-3.5 w-3.5" />
          </button>
          {inTable && (
            <button
              type="button"
              className={cn(
                "h-8 px-2 inline-flex items-center text-xs border rounded-md hover:bg-muted",
                showTableTools && "bg-muted",
              )}
              aria-pressed={showTableTools}
              aria-label="Table tools"
              onClick={() => setShowTableTools((v) => !v)}
            >
              Table
            </button>
          )}
          {signatureImageUrl && (
            <button
              type="button"
              className="h-8 px-2 inline-flex items-center gap-1 text-xs border rounded-md hover:bg-muted whitespace-nowrap"
              title="Insert signature image (visual only — not a formal digital signature)"
              aria-label="Insert signature"
              onClick={insertSignature}
            >
              <PenLine className="h-3.5 w-3.5" />
              Signature
            </button>
          )}
          {tokens.length > 0 && (
            <button
              type="button"
              className={cn(
                "h-8 px-2 inline-flex items-center text-xs border rounded-md hover:bg-muted",
                showTokenTools && "bg-muted",
              )}
              aria-pressed={showTokenTools}
              aria-label="Insert document fields"
              title="Insert fields like title, recipient, or date"
              onClick={() => setShowTokenTools((v) => !v)}
            >
              Fields
            </button>
          )}
        </RibbonGroup>

        {imageSelected && (
          <RibbonGroup label="Picture">
            {IMAGE_WIDTH_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={cn(
                  "h-8 px-2 text-xs border rounded-md hover:bg-muted",
                  imageAttrs?.width === preset.width && "bg-muted",
                )}
                aria-label={`Image width ${preset.label}`}
                onClick={() => editor.chain().focus().setImageWidth(preset.width).run()}
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              className={toolbarBtn(imageAttrs?.align === "left" && imageAttrs.float === "none")}
              aria-label="Align image left"
              onClick={() => editor.chain().focus().setImageAlign("left").run()}
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className={toolbarBtn(imageAttrs?.align === "center")}
              aria-label="Align image center"
              onClick={() => editor.chain().focus().setImageAlign("center").run()}
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className={toolbarBtn(imageAttrs?.align === "right" && imageAttrs.float === "none")}
              aria-label="Align image right"
              onClick={() => editor.chain().focus().setImageAlign("right").run()}
            >
              <AlignRight className="h-3.5 w-3.5" />
            </button>
            <Select
              value={imageAttrs?.float || "none"}
              onValueChange={(value) =>
                editor.chain().focus().setImageFloat(value as ImageFloat).run()
              }
            >
              <SelectTrigger className="h-8 w-[7.5rem] text-xs" aria-label="Text wrap">
                <SelectValue placeholder="Wrap" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs">
                  In line
                </SelectItem>
                <SelectItem value="left" className="text-xs">
                  Square left
                </SelectItem>
                <SelectItem value="right" className="text-xs">
                  Square right
                </SelectItem>
              </SelectContent>
            </Select>
          </RibbonGroup>
        )}

        <RibbonGroup label="Layout">
          {showPageSetup && (
            <button
              type="button"
              className="h-8 px-2 inline-flex items-center text-xs border rounded-md hover:bg-muted whitespace-nowrap"
              aria-label="Page setup"
              onClick={() => setShowPageSetupDialog(true)}
            >
              {pageSettings.paperSize.toUpperCase()} ·{" "}
              {pageSettings.orientation === "portrait" ? "Portrait" : "Landscape"}
            </button>
          )}
          {showPageSetup && (
            <button
              type="button"
              className={toolbarBtn(false)}
              aria-label="Print / PDF preview"
              title="Print / PDF preview"
              onClick={handlePrintPreview}
            >
              <Printer className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            className={toolbarBtn(false)}
            aria-label="Find and replace"
            title="Find and replace (Ctrl/Cmd+F)"
            onClick={() => setShowFindReplace(true)}
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        </RibbonGroup>
    </div>
  );

  return (
    <div
      className={cn(
        // No overflow-hidden: it would make the sticky ribbon inert. Corners are
        // rounded on the first and last rows instead.
        "rounded-2xl border border-border/70 bg-background shadow-sm",
        className,
      )}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .npa-tiptap-surface table.npa-tiptap-table,
        .npa-tiptap-surface table {
          border-collapse: collapse;
          table-layout: fixed;
          /* The Word grid (colwidth tracks) drives the width, so a table can be
             narrowed by dragging instead of always filling the text width. */
          margin: 0.5rem 0;
          max-width: 100%;
          overflow: visible;
        }
        .npa-tiptap-surface td,
        .npa-tiptap-surface th {
          border: 1px solid hsl(var(--border));
          padding: 0.4rem 0.5rem;
          min-width: 2rem;
          vertical-align: top;
          position: relative;
          white-space: normal;
          word-break: break-word;
        }
        /* Memo To/Date tables: honor borderless Word-style layout */
        .npa-tiptap-surface table[data-borderless="true"] td,
        .npa-tiptap-surface table[data-borderless="true"] th {
          border: none !important;
          background: transparent;
          padding-left: 0;
          padding-right: 0;
        }
        .npa-tiptap-surface table[style*="border: none"] td,
        .npa-tiptap-surface table[style*="border:none"] td,
        .npa-tiptap-surface table[style*="border: none"] th,
        .npa-tiptap-surface table[style*="border:none"] th,
        .npa-tiptap-surface td[style*="border: none"],
        .npa-tiptap-surface td[style*="border:none"],
        .npa-tiptap-surface th[style*="border: none"],
        .npa-tiptap-surface th[style*="border:none"] {
          border: none !important;
          background: transparent;
          padding-left: 0;
          padding-right: 0;
        }
        .npa-tiptap-surface th {
          font-weight: 600;
          background: hsl(var(--muted) / 0.4);
        }
        /* Don't let Tailwind prose inflate headings over memo inline sizes */
        .npa-tiptap-surface.prose :where(h1, h2, h3, h4) {
          font-size: inherit;
          font-weight: inherit;
          line-height: inherit;
          margin: 0;
          color: inherit;
        }
        .npa-tiptap-surface.prose :where(p) {
          margin: 0;
        }
        /* ProseMirror CellSelection — without this, multi-cell drag looks broken */
        .npa-tiptap-surface td.selectedCell,
        .npa-tiptap-surface th.selectedCell {
          background: hsl(var(--primary) / 0.14);
          outline: 2px solid hsl(var(--primary) / 0.55);
          outline-offset: -2px;
          z-index: 1;
        }
        .npa-tiptap-surface .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: 0;
          width: 4px;
          background: hsl(var(--primary) / 0.35);
          cursor: col-resize;
          z-index: 2;
        }
        .npa-tiptap-surface.resize-cursor {
          cursor: col-resize;
        }
        .npa-tiptap-surface img {
          max-width: 100%;
          height: auto;
        }
        .npa-tiptap-surface img[alt="Signature"] {
          max-height: 80px;
          width: auto;
        }
        /* Picture wrap theater (CSS float — not Word absolute positioning) */
        .npa-tiptap-surface img.ProseMirror-selectednode {
          outline: 2px solid hsl(var(--primary) / 0.55);
          outline-offset: 2px;
        }
        .npa-tiptap-surface::after {
          content: "";
          display: table;
          clear: both;
        }
        .npa-tiptap-surface p.is-editor-empty:first-child::before {
          color: hsl(var(--muted-foreground));
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `,
        }}
      />

      {showHeader && (
        <div className="rounded-t-2xl bg-muted/30 px-4 py-2 border-b border-border flex items-center justify-between">
          <span id={labelId} className="text-sm text-muted-foreground">
            Document
          </span>
          {showCharacterCount && (
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {counts.words} words · {counts.chars} characters
            </span>
          )}
        </div>
      )}

      <div
        className={cn(
          // Pinned to the top of whatever scrolls (dialog body, compose page).
          // Above the paper's header/footer bands, table grips and page pill,
          // which are positioned inside the document and would otherwise paint
          // over the pinned ribbon.
          // Opaque: a translucent pinned bar shows the document ghosting through.
          "sticky top-0 z-50 border-b border-border/70 bg-background px-2 py-2",
          !showHeader && "rounded-t-2xl",
        )}
      >
        <div
          className="rounded-xl border border-border/70 bg-background shadow-sm"
          role="toolbar"
          aria-label="Document formatting tools"
        >
          {showCompactToolbar ? (
            /* One compact strip of the tools used while typing, with the full
               ribbon behind "More". Nothing here needs scrolling sideways. */
            <div className="flex flex-wrap items-center gap-1 p-1.5">
              <button
                type="button"
                className={toolbarBtn(false)}
                aria-label="Undo"
                title="Undo"
                disabled={!editor.can().undo()}
                onClick={() => editor.chain().focus().undo().run()}
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className={toolbarBtn(false)}
                aria-label="Redo"
                title="Redo"
                disabled={!editor.can().redo()}
                onClick={() => editor.chain().focus().redo().run()}
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>
              <ToolbarDivider />
              <FontSizeStepper
                editor={editor}
                current={currentFontSize}
                draft={fontSizeDraft}
                setDraft={setFontSizeDraft}
              />
              <ToolbarDivider />
              <button
                type="button"
                className={toolbarBtn(editor.isActive("bold"))}
                aria-label="Bold"
                aria-pressed={editor.isActive("bold")}
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className={toolbarBtn(editor.isActive("italic"))}
                aria-label="Italic"
                aria-pressed={editor.isActive("italic")}
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className={toolbarBtn(editor.isActive("underline"))}
                aria-label="Underline"
                aria-pressed={editor.isActive("underline")}
                onClick={() => editor.chain().focus().toggleUnderline().run()}
              >
                <UnderlineIcon className="h-3.5 w-3.5" />
              </button>
              <ToolbarDivider />
              <button
                type="button"
                className={toolbarBtn(editor.isActive("bulletList"))}
                aria-label="Bullet list"
                aria-pressed={editor.isActive("bulletList")}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className={toolbarBtn(editor.isActive("orderedList"))}
                aria-label="Numbered list"
                aria-pressed={editor.isActive("orderedList")}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
              >
                <ListOrdered className="h-3.5 w-3.5" />
              </button>
              <ToolbarDivider />
              <button
                type="button"
                className={toolbarBtn(editor.isActive({ textAlign: "left" }))}
                aria-label="Align left"
                aria-pressed={editor.isActive({ textAlign: "left" })}
                onClick={() => editor.chain().focus().setTextAlign("left").run()}
              >
                <AlignLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className={toolbarBtn(editor.isActive({ textAlign: "center" }))}
                aria-label="Align center"
                aria-pressed={editor.isActive({ textAlign: "center" })}
                onClick={() => editor.chain().focus().setTextAlign("center").run()}
              >
                <AlignCenter className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className={toolbarBtn(editor.isActive({ textAlign: "justify" }))}
                aria-label="Justify"
                aria-pressed={editor.isActive({ textAlign: "justify" })}
                onClick={() => editor.chain().focus().setTextAlign("justify").run()}
              >
                <AlignJustify className="h-3.5 w-3.5" />
              </button>
              <ToolbarDivider />
              <button
                type="button"
                className={toolbarBtn(editor.isActive("link"))}
                aria-label="Insert link"
                onClick={() =>
                  setPromptDialog({
                    type: "link",
                    value: (editor.getAttributes("link").href as string) || "https://",
                  })
                }
              >
                <Link2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className={toolbarBtn(inTable)}
                aria-label="Insert table"
                onClick={() => setPromptDialog({ type: "table", rows: "2", cols: "2" })}
              >
                <Table2 className="h-3.5 w-3.5" />
              </button>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(toolbarBtn(false), "ml-1 border-border/70")}
                    aria-label="All formatting tools"
                    title="All formatting tools"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  sideOffset={6}
                  className="z-[60] max-h-[min(70vh,26rem)] w-[min(94vw,44rem)] overflow-y-auto p-0"
                >
                  {ribbonGroups}
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            ribbonGroups
          )}
        </div>
      </div>

      {(showTokenTools || showTableTools) && (
        <div className="px-3 py-2 space-y-2 border-b border-border bg-muted/15">
          {showTokenTools && tokens.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tokens.map((token) => (
                <button
                  key={token.value}
                  type="button"
                  className="h-7 px-2 text-[11px] border rounded-md hover:bg-muted"
                  onClick={() => handleInsertToken(token.value)}
                >
                  {token.label}
                </button>
              ))}
            </div>
          )}
          {showTableTools && inTable && (
            <div className="flex flex-wrap gap-1">
              <span className="self-center pr-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                Select
              </span>
              <button
                type="button"
                className="h-7 px-2 inline-flex items-center gap-1 text-[11px] border rounded-md hover:bg-muted"
                title="Select the whole row (or hover the left edge of the table)"
                onClick={() => selectTablePart("row")}
              >
                <Rows3 className="h-3 w-3" /> Row
              </button>
              <button
                type="button"
                className="h-7 px-2 inline-flex items-center gap-1 text-[11px] border rounded-md hover:bg-muted"
                title="Select the whole column (or hover the top edge of the table)"
                onClick={() => selectTablePart("column")}
              >
                <Columns3 className="h-3 w-3" /> Column
              </button>
              <button
                type="button"
                className="h-7 px-2 inline-flex items-center gap-1 text-[11px] border rounded-md hover:bg-muted"
                title="Select all cells (or hover the table's top-left corner)"
                onClick={() => selectTablePart("table")}
              >
                <Table2 className="h-3 w-3" /> Table
              </button>
              <button
                type="button"
                className="h-7 px-2 inline-flex items-center gap-1 text-[11px] border rounded-md hover:bg-muted"
                title="Scale the table to the page's text width"
                onClick={fitCurrentTable}
              >
                Fit width
              </button>
              <span className="w-2" />
              <button
                type="button"
                className="h-7 px-2 inline-flex items-center gap-1 text-[11px] border rounded-md hover:bg-muted"
                onClick={() => editor.chain().focus().addRowBefore().run()}
              >
                <Plus className="h-3 w-3" /> Row above
              </button>
              <button
                type="button"
                className="h-7 px-2 inline-flex items-center gap-1 text-[11px] border rounded-md hover:bg-muted"
                onClick={() => editor.chain().focus().addRowAfter().run()}
              >
                <Rows3 className="h-3 w-3" /> Row below
              </button>
              <button
                type="button"
                className="h-7 px-2 inline-flex items-center gap-1 text-[11px] border rounded-md hover:bg-muted"
                onClick={() => editor.chain().focus().deleteRow().run()}
              >
                <Minus className="h-3 w-3" /> Delete row
              </button>
              <button
                type="button"
                className="h-7 px-2 inline-flex items-center gap-1 text-[11px] border rounded-md hover:bg-muted"
                onClick={() => editor.chain().focus().addColumnBefore().run()}
              >
                <Plus className="h-3 w-3" /> Col before
              </button>
              <button
                type="button"
                className="h-7 px-2 inline-flex items-center gap-1 text-[11px] border rounded-md hover:bg-muted"
                onClick={() => editor.chain().focus().addColumnAfter().run()}
              >
                <Columns3 className="h-3 w-3" /> Col after
              </button>
              <button
                type="button"
                className="h-7 px-2 inline-flex items-center gap-1 text-[11px] border rounded-md hover:bg-muted"
                onClick={() => editor.chain().focus().deleteColumn().run()}
              >
                <Minus className="h-3 w-3" /> Delete col
              </button>
              <button
                type="button"
                className="h-7 px-2 inline-flex items-center gap-1 text-[11px] border rounded-md hover:bg-muted"
                onClick={() => setCellAttr({ textAlign: "left" })}
              >
                Cell left
              </button>
              <button
                type="button"
                className="h-7 px-2 inline-flex items-center gap-1 text-[11px] border rounded-md hover:bg-muted"
                onClick={() => setCellAttr({ textAlign: "center" })}
              >
                Cell center
              </button>
              <button
                type="button"
                className="h-7 px-2 inline-flex items-center gap-1 text-[11px] border rounded-md hover:bg-muted"
                onClick={() => setCellAttr({ textAlign: "right" })}
              >
                Cell right
              </button>
              <button
                type="button"
                className="h-7 px-2 inline-flex items-center gap-1 text-[11px] border rounded-md hover:bg-muted"
                onClick={() => setCellAttr({ verticalAlign: "top" })}
              >
                V-top
              </button>
              <button
                type="button"
                className="h-7 px-2 inline-flex items-center gap-1 text-[11px] border rounded-md hover:bg-muted"
                onClick={() => setCellAttr({ verticalAlign: "middle" })}
              >
                V-mid
              </button>
              <button
                type="button"
                className="h-7 px-2 inline-flex items-center gap-1 text-[11px] border rounded-md hover:bg-muted"
                onClick={() => setCellAttr({ verticalAlign: "bottom" })}
              >
                V-bottom
              </button>
              <button
                type="button"
                className="h-7 px-2 inline-flex items-center gap-1 text-[11px] border rounded-md hover:bg-muted"
                onClick={() => setCellAttr({ width: "25%" })}
              >
                Width 25%
              </button>
              <button
                type="button"
                className="h-7 px-2 inline-flex items-center gap-1 text-[11px] border rounded-md hover:bg-muted"
                onClick={() => setCellAttr({ width: "50%" })}
              >
                Width 50%
              </button>
              <button
                type="button"
                className="h-7 px-2 inline-flex items-center gap-1 text-[11px] border rounded-md hover:bg-muted"
                onClick={() => setCellAttr({ width: null })}
              >
                Width auto
              </button>
              <button
                type="button"
                className="h-7 px-2 inline-flex items-center gap-1 text-[11px] border rounded-md hover:bg-muted"
                onClick={() => setCellAttr({ border: "1px solid #333333" })}
              >
                Cell border
              </button>
              <button
                type="button"
                className="h-7 px-2 inline-flex items-center gap-1 text-[11px] border rounded-md hover:bg-muted"
                onClick={() => setCellAttr({ border: "none" })}
              >
                No border
              </button>
              <button
                type="button"
                className="h-7 px-2 inline-flex items-center gap-1 text-[11px] border rounded-md hover:bg-muted"
                onClick={() => setCellAttr({ backgroundColor: "#f5f5f5" })}
              >
                <PaintBucket className="h-3 w-3" /> Shade
              </button>
              <button
                type="button"
                className="h-7 px-2 inline-flex items-center gap-1 text-[11px] border rounded-md hover:bg-muted disabled:opacity-40"
                title="Select several cells first (click and drag), then merge"
                disabled={!editor.can().mergeCells()}
                onClick={() => editor.chain().focus().mergeCells().run()}
              >
                Merge cells
              </button>
              <button
                type="button"
                className="h-7 px-2 inline-flex items-center gap-1 text-[11px] border rounded-md hover:bg-muted disabled:opacity-40"
                disabled={!editor.can().splitCell()}
                onClick={() => editor.chain().focus().splitCell().run()}
              >
                Split cell
              </button>
              <button
                type="button"
                className="h-7 px-2 inline-flex items-center gap-1 text-[11px] border rounded-md hover:bg-muted text-destructive"
                onClick={() => {
                  editor.chain().focus().deleteTable().run();
                  setShowTableTools(false);
                }}
              >
                <Trash2 className="h-3 w-3" /> Delete table
              </button>
            </div>
          )}
        </div>
      )}

      <div
        ref={paperScrollRef}
        className="rounded-b-2xl bg-muted/30 overflow-auto"
        // autoGrow leaves the page as the only scroller, so the ribbon pins
        // against one scroll surface instead of two stacked ones.
        style={autoGrow ? undefined : { maxHeight: "min(78vh, 960px)" }}
        onScroll={handlePaperScroll}
        onMouseDown={(e) => {
          // Clicking the gray surround / body exits header-footer edit mode.
          if (hfEditMode && !(e.target as HTMLElement).closest("[data-hf-band]")) {
            setHfEditMode(null);
          }
          // Clicking a table grip selects that row/column instead of dropping
          // the caret on the invisible edge.
          if (tableEdge) {
            e.preventDefault();
            e.stopPropagation();
            selectTableEdge();
          }
        }}
        onMouseMove={handlePaperMouseMove}
        onMouseLeave={clearTableEdge}
      >
        {showPageSetup && !autoGrow && (
          // Zero-height sticky row: the page indicator stays in view while scrolling.
          // With autoGrow the ribbon is the sticky element; a second one would
          // float over it once the page itself scrolls.
          <div className="pointer-events-none sticky top-1 z-40 flex h-0 justify-end pr-3">
            <span className="rounded-full border border-border/70 bg-background/95 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm tabular-nums">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        )}
        <div
          className={cn("mx-auto", showPageSetup ? "pt-3 pb-4 px-2" : "my-4")}
          style={{
            // Page mode keeps the true page size (1px = 1px like print), so
            // tables sized to the text width cannot spill past the margin. On a
            // narrow panel the sheet scrolls sideways instead of shrinking.
            width: showPageSetup
              ? `calc(${pageDims.widthMm}mm + 20px)`
              : `${pageDims.widthMm}mm`,
            ...(showPageSetup ? null : { maxWidth: "100%" }),
          }}
        >
          {(() => {
            const pageH = pageHeightPx(pageSettings);
            // Sheets are spaced apart like Word's continuous page view.
            const pitch = pageH + PAGE_GAP_PX;
            const stackH = Math.max(pitch * totalPages - PAGE_GAP_PX, pageH);
            const marginBottomPx = (pageSettings.marginBottom / 25.4) * 96;
            const bandH = Math.max(22, Math.min(36, marginBottomPx * 0.45));
            const bandInset = Math.max(8, Math.min(14, marginBottomPx * 0.2));
            const paper = (
              <div
                className={cn(
                  "doc-paper relative overflow-hidden",
                  !showPageSetup && "shadow-md border border-border/50",
                )}
                style={{
                  width: "100%",
                  minHeight: `${stackH}px`,
                  // Page mode paints its own sheets over the canvas, so the gap
                  // between pages shows through.
                  ...(showPageSetup ? { backgroundColor: "transparent" } : null),
                }}
                onMouseDown={() => {
                  if (hfEditMode) setHfEditMode(null);
                }}
              >
                {showPageSetup &&
                  Array.from({ length: totalPages }, (_, pageIndex) => (
                    <div
                      key={`sheet-${pageIndex}`}
                      aria-hidden
                      className="pointer-events-none absolute left-0 right-0 rounded-[2px] border border-border/50 bg-white shadow-sm"
                      style={{ top: pageIndex * pitch, height: pageH }}
                    />
                  ))}
                {showPageSetup && (
                  <>
                    <div
                      data-hf-band
                      className="absolute z-20"
                      style={{
                        top: 4,
                        left: `${(pageSettings.marginLeft / 25.4) * 96}px`,
                        right: `${(pageSettings.marginRight / 25.4) * 96}px`,
                        height: `${Math.max(28, (pageSettings.marginTop / 25.4) * 96 - 8)}px`,
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <HeaderFooterBand
                        kind="header"
                        value={headerText}
                        editing={hfEditMode === "header"}
                        onStartEdit={() => setHfEditMode("header")}
                        onChange={setHeaderText}
                        onEndEdit={() => setHfEditMode(null)}
                        className="h-full"
                      />
                    </div>
                    {Array.from({ length: totalPages }, (_, pageIndex) => {
                      // Pin into the bottom margin, close to the page edge (Word-like).
                      const bandTop = pageIndex * pitch + pageH - bandInset - bandH;
                      // Blocks paginate, but one taller than a sheet has to cross a
                      // boundary; printing the footer there would strike through it.
                      if (overflowPages.has(pageIndex + 1)) return null;
                      const top = bandTop;
                      const editable = pageIndex === 0;
                      const pageLabel = showPageNumbers
                        ? `Page ${pageIndex + 1} of ${totalPages}`
                        : "";
                      return (
                        <div
                          key={`footer-${pageIndex}`}
                          data-hf-band={editable ? true : undefined}
                          className="absolute z-20 flex items-end gap-2"
                          style={{
                            top,
                            left: `${(pageSettings.marginLeft / 25.4) * 96}px`,
                            right: `${(pageSettings.marginRight / 25.4) * 96}px`,
                            height: `${bandH}px`,
                          }}
                          onMouseDown={(e) => editable && e.stopPropagation()}
                        >
                          {editable ? (
                            <HeaderFooterBand
                              kind="footer"
                              value={footerText}
                              editing={hfEditMode === "footer"}
                              onStartEdit={() => setHfEditMode("footer")}
                              onChange={setFooterText}
                              onEndEdit={() => setHfEditMode(null)}
                              className="h-full flex-1 min-w-0"
                            />
                          ) : (
                            <div
                              className="flex-1 min-w-0 h-full px-1 py-0.5 text-[9pt] text-muted-foreground/50 line-clamp-2 whitespace-pre-wrap"
                              aria-hidden
                            >
                              {footerText.trim()}
                            </div>
                          )}
                          {pageLabel ? (
                            <span
                              className="shrink-0 self-end pb-0.5 pr-0.5 text-[9pt] text-muted-foreground tabular-nums"
                              aria-hidden={!editable}
                            >
                              {pageLabel}
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </>
                )}
                <div
                  style={{
                    minHeight: `${bodyContentHeightPx(pageSettings, showPageSetup) * totalPages}px`,
                    padding: `${(pageSettings.marginTop / 25.4) * 96}px ${(pageSettings.marginRight / 25.4) * 96}px ${(pageSettings.marginBottom / 25.4) * 96}px ${(pageSettings.marginLeft / 25.4) * 96}px`,
                    fontFamily: "Verdana, Geneva, sans-serif",
                    fontSize: "12pt",
                    lineHeight: "1.15",
                  }}
                  onMouseDown={() => {
                    if (hfEditMode) setHfEditMode(null);
                  }}
                >
                  <div ref={bodyMeasureRef} className="relative">
                    <EditorContent editor={editor} />
                  </div>
                </div>
                {tableEdge && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute z-30 rounded-[2px] bg-primary/15 ring-1 ring-inset ring-primary/50"
                    style={tableEdge.box}
                  />
                )}
                {tableGrip && (
                  <div
                    draggable
                    role="button"
                    aria-label="Move table"
                    title="Drag to move the table"
                    onMouseDown={(event) => event.stopPropagation()}
                    onDragStart={startTableDrag}
                    onDragEnd={() => {
                      draggedTableRef.current = null;
                    }}
                    className="absolute z-40 flex h-6 w-5 cursor-grab items-center justify-center rounded border border-border/70 bg-background/95 text-muted-foreground shadow-sm active:cursor-grabbing"
                    style={{ left: tableGrip.left, top: tableGrip.top }}
                  >
                    <GripVertical className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            );

            if (!showPageSetup) return paper;

            return (
              <EditorPageRuler
                pageSettings={pageSettings}
                marginLeftPx={indentLeftPx}
                textIndentPx={indentFirstPx}
                paperHeightPx={stackH}
                onMarginLeftPx={(px) =>
                  editor.chain().focus().setParagraphMarginLeft(formatPx(px)).run()
                }
                onTextIndentPx={(px) =>
                  editor.chain().focus().setParagraphTextIndent(formatPx(px)).run()
                }
                onMarginTopMm={(mm) =>
                  setPageSettings((prev) => ({ ...prev, marginTop: mm }))
                }
                onMarginBottomMm={(mm) =>
                  setPageSettings((prev) => ({ ...prev, marginBottom: mm }))
                }
                onMarginLeftMm={(mm) =>
                  setPageSettings((prev) => ({ ...prev, marginLeft: mm }))
                }
                onMarginRightMm={(mm) =>
                  setPageSettings((prev) => ({ ...prev, marginRight: mm }))
                }
              >
                {paper}
              </EditorPageRuler>
            );
          })()}
        </div>
      </div>

      {showPageSetup && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 border-t border-border/60 bg-background/90 text-[11px] text-muted-foreground">
          <span>
            {pageSettings.paperSize.toUpperCase()} · {pageSettings.orientation} · Margins: T
            {pageSettings.marginTop} B{pageSettings.marginBottom} L{pageSettings.marginLeft} R
            {pageSettings.marginRight} mm
          </span>
          <span className="ml-auto whitespace-nowrap tabular-nums" aria-live="polite">
            {counts.words} words · {counts.chars} characters
          </span>
          {showPageNumbers && (
            <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 font-medium text-foreground tabular-nums">
              Page {currentPage} of {totalPages}
            </span>
          )}
        </div>
      )}

      {showPageSetup && (
        <PageSetupDialog
          open={showPageSetupDialog}
          onOpenChange={setShowPageSetupDialog}
          settings={pageSettings}
          showPageNumbers={showPageNumbers}
          onApply={(next, extras) => {
            setPageSettings(next);
            if (extras && typeof extras.showPageNumbers === "boolean") {
              setShowPageNumbers(extras.showPageNumbers);
            }
          }}
        />
      )}

      <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
        <DialogContent size="2xl" height="screen" density="flush" className="flex flex-col">
          <DialogHeader className="px-4 py-3 border-b shrink-0 space-y-1">
            <DialogTitle>Print preview</DialogTitle>
            <DialogDescription>
              {pageSettings.paperSize.toUpperCase()} · {pageSettings.orientation}. Only the editor
              page should print. When the system dialog opens, turn off{" "}
              <strong>Headers and footers</strong> so Chrome does not add date, time, URL, or extra
              page numbers.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 bg-muted/40">
            <iframe
              ref={printFrameRef}
              title="Compose print preview"
              srcDoc={printPreviewHtml}
              className="h-full w-full border-0 bg-muted/40"
            />
          </div>
          <DialogFooter className="px-4 py-3 border-t shrink-0 sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setShowPrintPreview(false)}>
              Close
            </Button>
            <Button type="button" onClick={printFromPreviewModal} className="gap-2">
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showFindReplace}
        onOpenChange={(open) => {
          setShowFindReplace(open);
          if (!open) setFindStatus("");
        }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Find and replace</DialogTitle>
            <DialogDescription>
              Search the document body. Useful for long templates and memo drafts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-2">
              <Label htmlFor="tiptap-find">Find</Label>
              <Input
                id="tiptap-find"
                value={findQuery}
                onChange={(e) => {
                  setFindQuery(e.target.value);
                  findIndexRef.current = 0;
                  setFindStatus("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    findNextMatch();
                  }
                }}
                placeholder="Text to find"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tiptap-replace">Replace with</Label>
              <Input
                id="tiptap-replace"
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    replaceCurrentMatch();
                  }
                }}
                placeholder="Replacement text"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={findMatchCase}
                onCheckedChange={(checked) => {
                  setFindMatchCase(checked === true);
                  findIndexRef.current = 0;
                }}
              />
              Match case
            </label>
            {findStatus ? <p className="text-xs text-muted-foreground">{findStatus}</p> : null}
          </div>
          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            <Button type="button" variant="outline" onClick={() => findNextMatch()}>
              Find next
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={replaceCurrentMatch}>
                Replace
              </Button>
              <Button type="button" onClick={replaceAllMatches}>
                Replace all
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(promptDialog)} onOpenChange={(open) => !open && setPromptDialog(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>
              {promptDialog?.type === "link"
                ? "Insert link"
                : promptDialog?.type === "image"
                  ? "Insert image"
                  : "Insert table"}
            </DialogTitle>
            <DialogDescription>
              {promptDialog?.type === "table"
                ? "Choose how many rows and columns to insert."
                : "Enter a URL. Content is sanitized before insert."}
            </DialogDescription>
          </DialogHeader>
          {promptDialog?.type === "table" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="tiptap-rows">Rows</Label>
                <Input
                  id="tiptap-rows"
                  value={promptDialog.rows}
                  onChange={(e) =>
                    setPromptDialog({ ...promptDialog, rows: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tiptap-cols">Columns</Label>
                <Input
                  id="tiptap-cols"
                  value={promptDialog.cols}
                  onChange={(e) =>
                    setPromptDialog({ ...promptDialog, cols: e.target.value })
                  }
                />
              </div>
            </div>
          ) : promptDialog ? (
            <div className="space-y-2">
              <Label htmlFor="tiptap-url">URL</Label>
              <Input
                id="tiptap-url"
                value={promptDialog.value}
                onChange={(e) =>
                  setPromptDialog({ ...promptDialog, value: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmPromptDialog();
                  }
                }}
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPromptDialog(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmPromptDialog}>
              Insert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
