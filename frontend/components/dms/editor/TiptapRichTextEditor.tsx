"use client";

/**
 * Phase 2 TipTap engine — NPA document-composition parity with Legacy.
 * HTML in/out via sanitizeRichText; reuses PageSetupDialog / print HTML builders.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
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
  Heading1,
  Heading2,
  Heading3,
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
  Columns3,
  Rows3,
  Trash2,
  ClipboardPaste,
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
  FontSize,
  LineHeight,
  FONT_FAMILIES,
  FONT_SIZES,
  LINE_HEIGHTS,
} from "@/lib/tiptap-text-styles";
import { NpaTableCell, NpaTableHeader } from "@/lib/tiptap-table-kit";
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
import type { RichTextEditorProps } from "./types";

const DEFAULT_PAGE_SETTINGS: PageSettings = {
  paperSize: "a4",
  orientation: "portrait",
  marginTop: 15,
  marginBottom: 15,
  marginLeft: 15,
  marginRight: 15,
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
  showPageNumbers = true,
}: RichTextEditorProps) {
  const { resolvedTheme } = useTheme();
  const labelId = useId();
  const isFocusedRef = useRef(false);
  const lastEmittedHtml = useRef(value ?? "");
  const editorRef = useRef<Editor | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const printFrameRef = useRef<HTMLIFrameElement>(null);
  const findIndexRef = useRef(0);

  const [htmlSnapshot, setHtmlSnapshot] = useState(value ?? "");
  const [pageSettings, setPageSettings] = useState<PageSettings>(DEFAULT_PAGE_SETTINGS);
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
  const [promptDialog, setPromptDialog] = useState<PromptDialogState>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
      FontFamily,
      FontSize,
      LineHeight,
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
      Image.configure({
        inline: false,
        // Signature uploads and drawn pads are data URLs; without this TipTap
        // rejects <img src="data:…"> and insertContent falls back to raw HTML text.
        allowBase64: true,
      }),
      Placeholder.configure({ placeholder }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "npa-tiptap-table",
        },
      }),
      TableRow,
      NpaTableHeader,
      NpaTableCell,
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
          : { "aria-label": "Rich text editor (TipTap)" }),
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
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
          event.preventDefault();
          setShowFindReplace(true);
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
    onUpdate: ({ editor: ed }) => {
      emitChange(ed.getHTML());
    },
  });

  useEffect(() => {
    editorRef.current = editor;
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

  useEffect(() => {
    if (!showPageSetup) return;
    const pageHeight = Math.max(pageDims.contentHeightPx, 1);
    // Approximate pages from rendered HTML length / page height heuristic via DOM after paint.
    const el = document.querySelector(".npa-tiptap-surface") as HTMLElement | null;
    const totalHeight = el?.scrollHeight ?? pageHeight;
    const pages = Math.max(1, Math.ceil(totalHeight / pageHeight));
    setTotalPages(pages);
    setCurrentPage((p) => Math.min(p, pages));
  }, [htmlSnapshot, pageDims, showPageSetup]);

  const counts = useMemo(
    () => stripHtmlToPlainLength(htmlSnapshot || value || ""),
    [htmlSnapshot, value],
  );

  const toolbarBtn = (active: boolean) =>
    cn(
      "h-8 w-8 inline-flex items-center justify-center text-xs border rounded-md hover:bg-muted",
      active && "bg-muted border-border text-foreground",
    );
  const groupClass = "flex items-center gap-1 rounded-md border border-border bg-background p-1";

  const handlePrintPreview = () => {
    try {
      const raw = editor?.getHTML() || htmlSnapshot || "";
      setPrintPreviewHtml(
        buildComposePrintHtml(
          sanitizeRichText(raw),
          pageSettings,
          "Compose preview",
          resolvedTheme === "dark",
        ),
      );
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
    const frameWindow = printFrameRef.current?.contentWindow;
    if (!frameWindow) {
      toast.error("Print preview is still loading");
      return;
    }
    frameWindow.focus();
    frameWindow.print();
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
  const currentFontFamily =
    (editor.getAttributes("textStyle").fontFamily as string | undefined) || FONT_FAMILIES[0].value;
  const currentFontSize =
    (editor.getAttributes("textStyle").fontSize as string | undefined) || "12px";
  const currentLineHeight =
    (editor.getAttributes("paragraph").lineHeight as string | undefined) ||
    (editor.getAttributes("heading").lineHeight as string | undefined) ||
    "1.5";

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

  return (
    <div className={cn("border border-border rounded-lg overflow-hidden", className)}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .npa-tiptap-surface table.npa-tiptap-table,
        .npa-tiptap-surface table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 0.5rem 0;
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
        .npa-tiptap-surface th {
          font-weight: 600;
          background: hsl(var(--muted) / 0.4);
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
        <div className="bg-muted/30 px-4 py-2 border-b border-border flex items-center justify-between">
          <span id={labelId} className="text-sm text-muted-foreground">
            Rich text editor (TipTap)
          </span>
          {showCharacterCount && (
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {counts.words} words · {counts.chars} characters
            </span>
          )}
        </div>
      )}

      <div
        className="flex flex-wrap items-center gap-1.5 p-2 border-b border-border bg-muted/20"
        role="toolbar"
        aria-label="Formatting"
      >
        <div className={groupClass}>
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
          <button
            type="button"
            className={toolbarBtn(editor.isActive("highlight"))}
            aria-label="Highlight"
            aria-pressed={editor.isActive("highlight")}
            onClick={() => editor.chain().focus().toggleHighlight({ color: "#fff59d" }).run()}
          >
            <Highlighter className="h-3.5 w-3.5" />
          </button>
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
        </div>

        <div className={groupClass}>
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
          <Select
            value={currentFontSize}
            onValueChange={(value) => editor.chain().focus().setFontSize(value).run()}
          >
            <SelectTrigger className="h-8 w-[4.5rem] text-xs" aria-label="Font size">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((size) => (
                <SelectItem key={size} value={size} className="text-xs">
                  {size.replace("px", "")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={currentLineHeight}
            onValueChange={(value) => editor.chain().focus().setLineHeight(value).run()}
          >
            <SelectTrigger className="h-8 w-[5.5rem] text-xs" aria-label="Line height">
              <SelectValue placeholder="Line" />
            </SelectTrigger>
            <SelectContent>
              {LINE_HEIGHTS.map((item) => (
                <SelectItem key={item.value} value={item.value} className="text-xs">
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={groupClass}>
          <button
            type="button"
            className={toolbarBtn(editor.isActive("heading", { level: 1 }))}
            aria-label="Heading 1"
            aria-pressed={editor.isActive("heading", { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            <Heading1 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={toolbarBtn(editor.isActive("heading", { level: 2 }))}
            aria-label="Heading 2"
            aria-pressed={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={toolbarBtn(editor.isActive("heading", { level: 3 }))}
            aria-label="Heading 3"
            aria-pressed={editor.isActive("heading", { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <Heading3 className="h-3.5 w-3.5" />
          </button>
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
        </div>

        <div className={groupClass}>
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
        </div>

        <div className={groupClass}>
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
        </div>

        <div className={groupClass}>
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
          <button
            type="button"
            className={toolbarBtn(false)}
            aria-label="Undo"
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={toolbarBtn(false)}
            aria-label="Redo"
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {tokens.length > 0 && (
          <div className={groupClass}>
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
          </div>
        )}

        {!showHeader && showCharacterCount && (
          <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap" aria-live="polite">
            {counts.words} words · {counts.chars} characters
          </span>
        )}
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
        className="bg-muted/30 overflow-auto"
        style={{ maxHeight: "min(70vh, 720px)" }}
      >
        <div
          className="mx-auto my-4 bg-background shadow-sm border border-border/60"
          style={{
            width: `${pageDims.widthMm}mm`,
            minHeight: `${Math.max(pageDims.contentHeightPx, 420)}px`,
            maxWidth: "100%",
          }}
        >
          <div
            style={{
              minHeight: `${Math.max(pageDims.contentHeightPx, 420)}px`,
              padding: `${(pageSettings.marginTop / 25.4) * 96}px ${(pageSettings.marginRight / 25.4) * 96}px ${(pageSettings.marginBottom / 25.4) * 96}px ${(pageSettings.marginLeft / 25.4) * 96}px`,
              fontFamily: "Verdana, Geneva, sans-serif",
              fontSize: "12px",
              lineHeight: "1.5",
            }}
          >
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {showPageSetup && (
        <div className="flex items-center justify-between px-4 py-1 border-t border-border bg-muted/20 text-[10px] text-muted-foreground">
          <span>
            {pageSettings.paperSize.toUpperCase()} · {pageSettings.orientation} · Margins: T
            {pageSettings.marginTop} B{pageSettings.marginBottom} L{pageSettings.marginLeft} R
            {pageSettings.marginRight} mm
          </span>
          {showPageNumbers && (
            <span>
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
          onApply={setPageSettings}
        />
      )}

      <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
        <DialogContent size="2xl" height="screen" density="flush" className="flex flex-col">
          <DialogHeader className="px-4 py-3 border-b shrink-0 space-y-1">
            <DialogTitle>Print preview</DialogTitle>
            <DialogDescription>
              {pageSettings.paperSize.toUpperCase()} · {pageSettings.orientation}. Use Print / Save
              PDF for the system dialog.
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
