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
  RemoveFormatting,
  IndentIncrease,
  IndentDecrease,
  Baseline,
  PaintBucket,
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
import {
  bodyContentHeightPx,
  estimateCurrentPage,
  estimatePageCount,
  pageBreakOffsetsPx,
  pageHeightPx,
} from "@/lib/compose-page-theater";
import { EditorPageRuler } from "./EditorPageRuler";
import { HeaderFooterBand } from "./HeaderFooterBand";
import type { RichTextEditorProps } from "./types";

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
  return (
    <div className="flex flex-col items-stretch gap-0.5 px-2 py-1.5 border-r border-border/70 last:border-r-0 min-w-0">
      <div className="flex flex-wrap items-center gap-1 min-h-8">{children}</div>
      <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground/80 text-center leading-none pt-0.5">
        {label}
      </span>
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

function resolveDocumentStyleId(editor: Editor): DocumentStyleId {
  if (editor.isActive("heading", { level: 1 })) return "h1";
  if (editor.isActive("heading", { level: 2 })) return "h2";
  if (editor.isActive("heading", { level: 3 })) return "h3";
  return "normal";
}

function applyDocumentStyle(editor: Editor, styleId: DocumentStyleId) {
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
  editor.chain().focus().setParagraph().setFontSize(style.fontSize).unsetBold().run();
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
}: RichTextEditorProps) {
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
          : { "aria-label": "Document editor" }),
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
    const el =
      bodyMeasureRef.current?.querySelector(".npa-tiptap-surface") as HTMLElement | null;
    const totalHeight = el?.scrollHeight ?? bodyContentHeightPx(pageSettings, true);
    const pages = estimatePageCount(totalHeight, pageSettings, true);
    setTotalPages(pages);
    setCurrentPage((p) => Math.min(p, pages));
  }, [htmlSnapshot, pageSettings, showPageSetup, headerText, footerText]);

  const breakOffsets = useMemo(
    () => (showPageSetup ? pageBreakOffsetsPx(totalPages, pageSettings, true) : []),
    [showPageSetup, totalPages, pageSettings],
  );

  const handlePaperScroll = () => {
    if (!showPageSetup || !paperScrollRef.current) return;
    const next = estimateCurrentPage(paperScrollRef.current.scrollTop, pageSettings, true);
    setCurrentPage(Math.min(next, totalPages));
  };

  const counts = useMemo(
    () => stripHtmlToPlainLength(htmlSnapshot || value || ""),
    [htmlSnapshot, value],
  );

  const toolbarBtn = (active: boolean) =>
    cn(
      "h-8 w-8 inline-flex items-center justify-center text-xs border rounded-md hover:bg-muted",
      active && "bg-muted border-border text-foreground",
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
        /* Memo To/Date tables: honor borderless Word-style layout */
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
        <div className="bg-muted/30 px-4 py-2 border-b border-border flex items-center justify-between">
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
        className="flex flex-wrap items-stretch border-b border-border bg-muted/15"
        role="toolbar"
        aria-label="Home"
      >
        <RibbonGroup label="Clipboard">
          <button
            type="button"
            className={toolbarBtn(false)}
            aria-label="Undo"
            title="Undo"
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={toolbarBtn(false)}
            aria-label="Redo"
            title="Redo"
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
                <SelectItem key={style.id} value={style.id} className="text-xs">
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
          <div className="inline-flex h-8 items-center rounded-md border border-border bg-background overflow-hidden shrink-0">
            <button
              type="button"
              className="h-8 w-7 inline-flex items-center justify-center hover:bg-muted border-r border-border"
              aria-label="Decrease font size"
              title="Decrease font size (1pt)"
              onClick={() => {
                setFontSizeDraft(null);
                editor
                  .chain()
                  .focus()
                  .setFontSize(nextFontSize(currentFontSize, -1))
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
                fontSizeDraft ??
                String(Math.round(parseFontSizePt(currentFontSize)))
              }
              onFocus={(e) => {
                setFontSizeDraft(String(Math.round(parseFontSizePt(currentFontSize))));
                e.target.select();
              }}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d.]/g, "");
                setFontSizeDraft(raw);
              }}
              onBlur={() => {
                const n = Number.parseFloat(fontSizeDraft ?? "");
                const next = formatFontSizePt(Number.isFinite(n) ? n : 12);
                setFontSizeDraft(null);
                editor.chain().focus().setFontSize(next).run();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  (e.target as HTMLInputElement).blur();
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setFontSizeDraft(null);
                  editor
                    .chain()
                    .focus()
                    .setFontSize(nextFontSize(currentFontSize, 1))
                    .run();
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setFontSizeDraft(null);
                  editor
                    .chain()
                    .focus()
                    .setFontSize(nextFontSize(currentFontSize, -1))
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
                setFontSizeDraft(null);
                editor
                  .chain()
                  .focus()
                  .setFontSize(nextFontSize(currentFontSize, 1))
                  .run();
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
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
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
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
            onValueChange={(value) => editor.chain().focus().setLineHeight(value).run()}
          >
            <SelectTrigger className="h-8 w-[5.5rem] text-xs" aria-label="Line spacing">
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
          <Select
            value={resolveSpacingPresetId(editor)}
            onValueChange={(value) => {
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
                <SelectItem key={item.id} value={item.id} className="text-xs">
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

        {!showHeader && showCharacterCount && (
          <span className="ml-auto self-center px-3 text-xs text-muted-foreground whitespace-nowrap" aria-live="polite">
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
        className="bg-muted/30 overflow-auto"
        style={{ maxHeight: "min(78vh, 960px)" }}
        onScroll={handlePaperScroll}
        onMouseDown={(e) => {
          // Clicking the gray surround / body exits header-footer edit mode.
          if (hfEditMode && !(e.target as HTMLElement).closest("[data-hf-band]")) {
            setHfEditMode(null);
          }
        }}
      >
        <div
          className={cn("mx-auto", showPageSetup ? "pt-3 pb-4 px-2" : "my-4")}
          style={{
            width: showPageSetup
              ? `calc(${pageDims.widthMm}mm + 20px)`
              : `${pageDims.widthMm}mm`,
            maxWidth: "100%",
          }}
        >
          {(() => {
            const stackH = Math.max(
              pageHeightPx(pageSettings) * totalPages,
              pageHeightPx(pageSettings),
            );
            const paper = (
              <div
                className={cn(
                  "doc-paper shadow-md border border-border/50 relative overflow-hidden",
                  showPageSetup && "rounded-br-sm border-l-0 sm:border-l",
                )}
                style={{
                  width: "100%",
                  minHeight: `${stackH}px`,
                }}
                onMouseDown={() => {
                  if (hfEditMode) setHfEditMode(null);
                }}
              >
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
                      const pageH = pageHeightPx(pageSettings);
                      const marginBottomPx = (pageSettings.marginBottom / 25.4) * 96;
                      // Pin into the bottom margin, close to the page edge (Word-like).
                      const bandH = Math.max(22, Math.min(36, marginBottomPx * 0.45));
                      const bottomInset = Math.max(8, Math.min(14, marginBottomPx * 0.2));
                      const top = (pageIndex + 1) * pageH - bottomInset - bandH;
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
                    {showPageSetup &&
                      breakOffsets.map((offset) => (
                        <div
                          key={offset}
                          className="pointer-events-none absolute left-0 right-0 z-10 flex items-center gap-2"
                          style={{ top: offset }}
                          aria-hidden
                        >
                          <div className="flex-1 border-t border-dashed border-primary/35" />
                          <span className="text-[9px] uppercase tracking-wide text-primary/50 bg-muted/80 px-1 rounded">
                            Page break
                          </span>
                          <div className="flex-1 border-t border-dashed border-primary/35" />
                        </div>
                      ))}
                    <EditorContent editor={editor} />
                  </div>
                </div>
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
