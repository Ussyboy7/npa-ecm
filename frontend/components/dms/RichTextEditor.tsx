"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  Eraser,
  Highlighter,
  Image as ImageIcon,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Printer,
  Redo2,
  Search,
  Strikethrough,
  Subscript,
  Superscript,
  Table2,
  Underline,
  Unlink2,
  Undo2,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitizeRichText, sanitizePastedRichText } from "@/lib/sanitize-html";
import { PageSetupDialog, type PageSettings, getPageDimensions, buildComposePrintHtml } from "./PageSetupDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";

export interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string, json: unknown) => void;
  placeholder?: string;
  className?: string;
  tokens?: { label: string; value: string }[];
  showCharacterCount?: boolean;
  showHeader?: boolean;
  signatureImageUrl?: string;
  showPageSetup?: boolean;
  showPageNumbers?: boolean;
}

const DEFAULT_PAGE_SETTINGS: PageSettings = {
  paperSize: "a4",
  orientation: "portrait",
  marginTop: 15,
  marginBottom: 15,
  marginLeft: 15,
  marginRight: 15,
};

const FONT_FAMILIES = ["Verdana", "Arial", "Times New Roman", "Georgia", "Courier New"] as const;
const LINE_HEIGHT_OPTIONS = ["1", "1.15", "1.5", "2", "2.5", "3"] as const;
const DEFAULT_TEXT_COLOR = "#111827";

type ToolbarMeta = {
  block: string;
  fontName: string;
  fontSize: string;
  lineHeight: string;
  foreColor: string;
  inTable: boolean;
};

const DEFAULT_TOOLBAR_META: ToolbarMeta = {
  block: "p",
  fontName: "Verdana",
  fontSize: "12",
  lineHeight: "1.5",
  foreColor: DEFAULT_TEXT_COLOR,
  inTable: false,
};

function normalizeFormatBlock(raw: string): string {
  const value = raw.replace(/[<>]/g, "").toLowerCase().trim();
  if (["h1", "h2", "h3", "blockquote", "pre", "p", "div"].includes(value)) {
    return value === "div" ? "p" : value;
  }
  return "p";
}

function normalizeFontName(raw: string): string {
  const cleaned = raw.replace(/['"]/g, "").split(",")[0]?.trim() || "Verdana";
  const match = FONT_FAMILIES.find((f) => f.toLowerCase() === cleaned.toLowerCase());
  return match ?? cleaned;
}

function rgbToHex(color: string): string {
  if (!color) return DEFAULT_TEXT_COLOR;
  if (color.startsWith("#")) return color.length >= 7 ? color.slice(0, 7) : DEFAULT_TEXT_COLOR;
  const match = color.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!match) return DEFAULT_TEXT_COLOR;
  return (
    "#" +
    [match[1], match[2], match[3]]
      .map((n) => Number(n).toString(16).padStart(2, "0"))
      .join("")
  );
}

function findAncestorElement(node: Node | null, boundary: HTMLElement | null): HTMLElement | null {
  let current: Node | null = node;
  while (current && current !== boundary) {
    if (current instanceof HTMLElement) return current;
    current = current.parentNode;
  }
  return null;
}

type PromptDialogState =
  | { type: "link"; value: string }
  | { type: "image"; value: string }
  | { type: "table"; rows: string; cols: string }
  | null;

export function RichTextEditor({
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
  const editorRef = useRef<HTMLDivElement>(null);
  const editorShellRef = useRef<HTMLDivElement>(null);
  const isFocusedRef = useRef(false);
  const lastEmittedHtml = useRef(value ?? "");
  const labelId = useId();
  const [mounted, setMounted] = useState(false);
  const [htmlValue, setHtmlValue] = useState(value);
  const [activeStates, setActiveStates] = useState<Record<string, boolean>>({});
  const [toolbarMeta, setToolbarMeta] = useState<ToolbarMeta>(DEFAULT_TOOLBAR_META);
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const [showTableTools, setShowTableTools] = useState(false);
  const [showTokenTools, setShowTokenTools] = useState(false);
  const [showPageSetupDialog, setShowPageSetupDialog] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printPreviewHtml, setPrintPreviewHtml] = useState("");
  const printFrameRef = useRef<HTMLIFrameElement>(null);
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [findMatchCase, setFindMatchCase] = useState(false);
  const [findStatus, setFindStatus] = useState("");
  const findIndexRef = useRef(0);
  const refreshActiveStatesRef = useRef<() => void>(() => {});
  const savedSelectionRef = useRef<Range | null>(null);
  const [pageSettings, setPageSettings] = useState<PageSettings>(DEFAULT_PAGE_SETTINGS);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [promptDialog, setPromptDialog] = useState<PromptDialogState>(null);

  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [imageWidth, setImageWidth] = useState<number>(0);
  const [imageHeight, setImageHeight] = useState<number>(0);
  const [imageOverlay, setImageOverlay] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const aspectRatioRef = useRef(1);
  const [tableHandleOverlay, setTableHandleOverlay] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const activeTableCellRef = useRef<HTMLTableCellElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync external value only when the editor is not focused (avoids cursor fights).
  useEffect(() => {
    if (!mounted || !editorRef.current) return;
    const next = value ?? "";
    if (isFocusedRef.current) return;
    if (editorRef.current.innerHTML === next) {
      lastEmittedHtml.current = next;
      if (htmlValue !== next) setHtmlValue(next);
      return;
    }
    lastEmittedHtml.current = next;
    setHtmlValue(next);
    editorRef.current.innerHTML = next;
  }, [value, mounted, htmlValue]);

  const pageDims = useMemo(() => getPageDimensions(pageSettings), [pageSettings]);

  useEffect(() => {
    if (!mounted || !editorRef.current || !showPageSetup) return;
    const container = editorRef.current;
    const totalHeight = container.scrollHeight;
    const pageHeight = pageDims.contentHeightPx;
    const pages = Math.max(1, Math.ceil(totalHeight / pageHeight));
    setTotalPages(pages);
  }, [htmlValue, mounted, pageDims, showPageSetup]);

  const updateImageOverlay = useCallback((img: HTMLImageElement | null) => {
    if (!img || !editorShellRef.current) {
      setImageOverlay(null);
      return;
    }
    const shellRect = editorShellRef.current.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    setImageOverlay({
      left: imgRect.left - shellRect.left + editorShellRef.current.scrollLeft - 2,
      top: imgRect.top - shellRect.top + editorShellRef.current.scrollTop - 2,
      width: imgRect.width + 4,
      height: imgRect.height + 4,
    });
  }, []);

  const updateTableHandleOverlay = useCallback((cell: HTMLTableCellElement | null) => {
    activeTableCellRef.current = cell;
    if (!cell || !editorShellRef.current || !editorRef.current?.contains(cell)) {
      setTableHandleOverlay(null);
      return;
    }
    const shell = editorShellRef.current;
    const shellRect = shell.getBoundingClientRect();
    const rect = cell.getBoundingClientRect();
    setTableHandleOverlay({
      left: rect.left - shellRect.left + shell.scrollLeft,
      top: rect.top - shellRect.top + shell.scrollTop,
      width: rect.width,
      height: rect.height,
    });
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleImageClick = (e: Event) => {
      e.stopPropagation();
      const img = e.target as HTMLImageElement;
      setSelectedImage(img);
      setImageWidth(img.offsetWidth);
      setImageHeight(img.offsetHeight);
      aspectRatioRef.current = img.offsetWidth / img.offsetHeight || 1;
      updateImageOverlay(img);
    };

    const imgs = editor.querySelectorAll("img");
    imgs.forEach((img) => {
      (img as HTMLElement).style.cursor = "pointer";
      img.addEventListener("click", handleImageClick);
    });

    return () => {
      imgs.forEach((img) => {
        img.removeEventListener("click", handleImageClick);
      });
    };
  }, [htmlValue, updateImageOverlay]);

  useEffect(() => {
    if (!selectedImage) {
      setImageOverlay(null);
      return;
    }
    updateImageOverlay(selectedImage);
    const onScrollOrResize = () => updateImageOverlay(selectedImage);
    window.addEventListener("resize", onScrollOrResize);
    editorShellRef.current?.addEventListener("scroll", onScrollOrResize);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      editorShellRef.current?.removeEventListener("scroll", onScrollOrResize);
    };
  }, [selectedImage, htmlValue, updateImageOverlay]);

  useEffect(() => {
    if (!tableHandleOverlay) return;
    const onScrollOrResize = () => updateTableHandleOverlay(activeTableCellRef.current);
    window.addEventListener("resize", onScrollOrResize);
    editorShellRef.current?.addEventListener("scroll", onScrollOrResize);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      editorShellRef.current?.removeEventListener("scroll", onScrollOrResize);
    };
  }, [tableHandleOverlay, htmlValue, updateTableHandleOverlay]);

  const characterCount = useMemo(() => {
    if (typeof window === "undefined") return 0;
    const temp = window.document.createElement("div");
    temp.innerHTML = htmlValue || "";
    return (temp.textContent || "").trim().length;
  }, [htmlValue]);

  const wordCount = useMemo(() => {
    if (typeof window === "undefined") return 0;
    const temp = window.document.createElement("div");
    temp.innerHTML = htmlValue || "";
    const text = (temp.textContent || "").trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
  }, [htmlValue]);

  const emitChange = useCallback(
    (nextHtml: string) => {
      const cleaned = sanitizeRichText(nextHtml);
      lastEmittedHtml.current = cleaned;
      setHtmlValue(cleaned);
      onChange?.(cleaned, { html: cleaned, editor: "rich-text" });
    },
    [onChange],
  );

  const ensureSelectionInEditor = () => {
    if (!editorRef.current) return;
    const selection = window.getSelection();
    const anchorNode = selection?.anchorNode;
    if (anchorNode && editorRef.current.contains(anchorNode)) return;

    editorRef.current.focus();
    const range = document.createRange();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  const refreshActiveStates = () => {
    if (!editorRef.current) return;
    const selection = window.getSelection();
    if (!selection?.anchorNode || !editorRef.current.contains(selection.anchorNode)) {
      setActiveStates({});
      updateTableHandleOverlay(null);
      return;
    }
    if (selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    }

    setActiveStates({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      subscript: document.queryCommandState("subscript"),
      superscript: document.queryCommandState("superscript"),
      justifyLeft: document.queryCommandState("justifyLeft"),
      justifyCenter: document.queryCommandState("justifyCenter"),
      justifyRight: document.queryCommandState("justifyRight"),
      justifyFull: document.queryCommandState("justifyFull"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
    });

    let fontSize = DEFAULT_TOOLBAR_META.fontSize;
    let lineHeight = DEFAULT_TOOLBAR_META.lineHeight;
    let inTable = false;
    let node: Node | null = selection.anchorNode;
    while (node && node !== editorRef.current) {
      if (node instanceof HTMLElement) {
        if (node.tagName === "TABLE" || node.closest?.("table")) inTable = true;
        if (node.style.fontSize) {
          const match = node.style.fontSize.match(/(\d+(?:\.\d+)?)/);
          if (match) fontSize = String(Math.round(Number(match[1])));
        }
        if (node.style.lineHeight && node.style.lineHeight !== "normal") {
          lineHeight = node.style.lineHeight;
        }
      }
      node = node.parentNode;
    }

    const startEl = findAncestorElement(selection.anchorNode, editorRef.current);
    if (startEl) {
      const computed = window.getComputedStyle(startEl);
      if (!fontSize || fontSize === DEFAULT_TOOLBAR_META.fontSize) {
        const match = computed.fontSize.match(/(\d+(?:\.\d+)?)/);
        if (match) fontSize = String(Math.round(Number(match[1])));
      }
      if (lineHeight === DEFAULT_TOOLBAR_META.lineHeight && computed.lineHeight !== "normal") {
        const px = Number.parseFloat(computed.lineHeight);
        const fontPx = Number.parseFloat(computed.fontSize);
        if (px > 0 && fontPx > 0) {
          const ratio = Math.round((px / fontPx) * 100) / 100;
          const closest = LINE_HEIGHT_OPTIONS.reduce((best, option) =>
            Math.abs(Number(option) - ratio) < Math.abs(Number(best) - ratio) ? option : best,
          );
          lineHeight = closest;
        }
      }
    }

    const exact = Number(fontSize);
    const resolvedSize = Number.isFinite(exact) ? String(Math.round(exact)) : DEFAULT_TOOLBAR_META.fontSize;

    setToolbarMeta({
      block: normalizeFormatBlock(document.queryCommandValue("formatBlock") || "p"),
      fontName: normalizeFontName(document.queryCommandValue("fontName") || "Verdana"),
      fontSize: resolvedSize,
      lineHeight,
      foreColor: rgbToHex(document.queryCommandValue("foreColor") || DEFAULT_TEXT_COLOR),
      inTable,
    });
    setShowTableTools(inTable);

    let cell: HTMLTableCellElement | null = null;
    if (inTable && selection.anchorNode) {
      let node: Node | null = selection.anchorNode;
      while (node && node !== editorRef.current) {
        if (node instanceof HTMLTableCellElement) {
          cell = node;
          break;
        }
        node = node.parentNode;
      }
    }
    updateTableHandleOverlay(cell);
  };
  refreshActiveStatesRef.current = refreshActiveStates;

  const restoreSavedSelection = () => {
    const saved = savedSelectionRef.current;
    if (!saved || !editorRef.current) return false;
    try {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(saved);
      return true;
    } catch {
      return false;
    }
  };

  const prepareEditorCommand = () => {
    if (!editorRef.current) return false;
    editorRef.current.focus();
    restoreSavedSelection();
    ensureSelectionInEditor();
    return true;
  };

  const applyCommand = (command: string) => {
    if (!prepareEditorCommand()) return;
    document.execCommand(command);
    emitChange(editorRef.current!.innerHTML);
    refreshActiveStates();
  };

  const applyCommandWithValue = (command: string, value: string) => {
    if (!prepareEditorCommand()) return;
    document.execCommand(command, false, value);
    emitChange(editorRef.current!.innerHTML);
    refreshActiveStates();
  };

  const applyFontSize = (px: string) => {
    if (!editorRef.current) return;
    const parsed = Number(px);
    if (!Number.isFinite(parsed)) return;
    const size = Math.max(6, Math.min(96, Math.round(parsed)));
    const sizePx = String(size);

    if (!prepareEditorCommand()) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);

    const clearNestedFontSizes = (root: HTMLElement) => {
      root.querySelectorAll<HTMLElement>("*").forEach((el) => {
        if (!el.style.fontSize) return;
        el.style.removeProperty("font-size");
        if (!(el.getAttribute("style") || "").trim()) el.removeAttribute("style");
      });
    };

    if (range.collapsed) {
      let node: Node | null = selection.anchorNode;
      let updated = false;
      while (node && node !== editorRef.current) {
        if (node instanceof HTMLElement && node.tagName === "SPAN" && node.style.fontSize) {
          node.style.fontSize = `${sizePx}px`;
          updated = true;
          break;
        }
        if (node instanceof HTMLElement && /^(P|DIV|LI|H[1-6]|TD|TH|BLOCKQUOTE|PRE)$/i.test(node.tagName)) {
          clearNestedFontSizes(node);
          node.style.fontSize = `${sizePx}px`;
          updated = true;
          break;
        }
        node = node.parentNode;
      }
      if (!updated) {
        document.execCommand("formatBlock", false, "p");
        const again = window.getSelection();
        let blockNode: Node | null = again?.anchorNode ?? null;
        while (blockNode && blockNode !== editorRef.current) {
          if (blockNode instanceof HTMLElement && /^(P|DIV|LI)$/i.test(blockNode.tagName)) {
            blockNode.style.fontSize = `${sizePx}px`;
            break;
          }
          blockNode = blockNode.parentNode;
        }
      }
    } else {
      const working = range.cloneRange();
      const contents = working.extractContents();
      const span = document.createElement("span");
      span.style.fontSize = `${sizePx}px`;
      span.appendChild(contents);
      clearNestedFontSizes(span);
      working.insertNode(span);

      const next = document.createRange();
      next.selectNodeContents(span);
      selection.removeAllRanges();
      selection.addRange(next);
      savedSelectionRef.current = next.cloneRange();
    }

    emitChange(editorRef.current.innerHTML);
    setToolbarMeta((prev) => ({ ...prev, fontSize: sizePx }));
    refreshActiveStates();
  };

  const handleInput = () => {
    if (!editorRef.current) return;
    emitChange(editorRef.current.innerHTML);
    refreshActiveStates();
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    const payload = html?.trim()
      ? sanitizePastedRichText(html)
      : sanitizeRichText(`<p>${(text || "").replace(/\n/g, "<br>")}</p>`);
    ensureSelectionInEditor();
    document.execCommand("insertHTML", false, payload);
    if (editorRef.current) emitChange(editorRef.current.innerHTML);
    refreshActiveStates();
  };

  const collectFindRanges = useCallback(
    (query: string, matchCase: boolean): Range[] => {
      if (!editorRef.current || !query) return [];
      const ranges: Range[] = [];
      const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        const text = node.textContent || "";
        const haystack = matchCase ? text : text.toLowerCase();
        const needle = matchCase ? query : query.toLowerCase();
        let start = 0;
        while (start <= haystack.length - needle.length) {
          const idx = haystack.indexOf(needle, start);
          if (idx === -1) break;
          const range = document.createRange();
          range.setStart(node, idx);
          range.setEnd(node, idx + query.length);
          ranges.push(range);
          start = idx + needle.length;
        }
        node = walker.nextNode();
      }
      return ranges;
    },
    [],
  );

  const selectFindRange = (range: Range) => {
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    const node = range.startContainer.parentElement;
    node?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    editorRef.current?.focus();
  };

  const findNextMatch = useCallback(
    (fromStart = false) => {
      const query = findQuery.trim();
      if (!query) {
        setFindStatus("Enter text to find");
        return;
      }
      const ranges = collectFindRanges(query, findMatchCase);
      if (ranges.length === 0) {
        findIndexRef.current = 0;
        setFindStatus("No matches");
        return;
      }
      if (fromStart) findIndexRef.current = 0;
      else findIndexRef.current = findIndexRef.current % ranges.length;
      const range = ranges[findIndexRef.current];
      if (range) selectFindRange(range);
      setFindStatus(`${findIndexRef.current + 1} of ${ranges.length}`);
      findIndexRef.current = (findIndexRef.current + 1) % ranges.length;
    },
    [collectFindRanges, findMatchCase, findQuery],
  );

  const replaceCurrentMatch = useCallback(() => {
    const query = findQuery.trim();
    if (!query || !editorRef.current) return;
    const selection = window.getSelection();
    const selected = selection?.toString() ?? "";
    const matchesSelection = findMatchCase
      ? selected === query
      : selected.toLowerCase() === query.toLowerCase();

    if (matchesSelection && selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(replaceQuery));
      emitChange(editorRef.current.innerHTML);
    }
    findNextMatch();
  }, [emitChange, findMatchCase, findNextMatch, findQuery, replaceQuery]);

  const replaceAllMatches = useCallback(() => {
    const query = findQuery.trim();
    if (!query || !editorRef.current) return;
    const ranges = collectFindRanges(query, findMatchCase);
    if (ranges.length === 0) {
      setFindStatus("No matches");
      return;
    }
    // Replace from the end so earlier offsets stay valid within each text node.
    for (let i = ranges.length - 1; i >= 0; i -= 1) {
      const range = ranges[i];
      if (!range) continue;
      range.deleteContents();
      range.insertNode(document.createTextNode(replaceQuery));
    }
    emitChange(editorRef.current.innerHTML);
    findIndexRef.current = 0;
    setFindStatus(`Replaced ${ranges.length}`);
  }, [collectFindRanges, emitChange, findMatchCase, findQuery, replaceQuery]);

  const handlePrintPreview = () => {
    if (!editorRef.current) return;
    const raw = editorRef.current.innerHTML || htmlValue || "";
    setPrintPreviewHtml(buildComposePrintHtml(sanitizeRichText(raw), pageSettings, "Compose preview"));
    setShowPrintPreview(true);
  };

  const printFromPreviewModal = () => {
    const frame = printFrameRef.current;
    const frameWindow = frame?.contentWindow;
    if (!frameWindow) {
      toast.error("Print preview is still loading");
      return;
    }
    frameWindow.focus();
    frameWindow.print();
  };

  const handleInsertToken = (token: string) => {
    if (!editorRef.current) return;
    if (!prepareEditorCommand()) return;
    document.execCommand("insertText", false, token);
    emitChange(editorRef.current.innerHTML);
    refreshActiveStates();
  };

  const applyBlock = (block: string) => {
    applyCommandWithValue("formatBlock", block);
    setToolbarMeta((prev) => ({ ...prev, block: normalizeFormatBlock(block) }));
  };

  const insertSignature = () => {
    if (!editorRef.current || !signatureImageUrl) return;
    if (!prepareEditorCommand()) return;
    const safeSrc = sanitizeRichText(`<img src="${signatureImageUrl}" style="max-height:80px;" alt="Signature" />`);
    document.execCommand("insertHTML", false, safeSrc);
    emitChange(editorRef.current.innerHTML);
    refreshActiveStates();
  };

  const confirmPromptDialog = () => {
    if (!promptDialog || !editorRef.current) {
      setPromptDialog(null);
      return;
    }
    prepareEditorCommand();

    if (promptDialog.type === "link") {
      const url = promptDialog.value.trim();
      if (url) applyCommandWithValue("createLink", url);
    } else if (promptDialog.type === "image") {
      const url = promptDialog.value.trim();
      if (url) {
        document.execCommand(
          "insertHTML",
          false,
          sanitizeRichText(`<img src="${url}" alt="" style="max-width:100%;" />`),
        );
        emitChange(editorRef.current.innerHTML);
      }
    } else if (promptDialog.type === "table") {
      const rows = Math.max(1, Math.min(20, Number(promptDialog.rows) || 2));
      const cols = Math.max(1, Math.min(10, Number(promptDialog.cols) || 2));
      const bodyRows = Array.from({ length: rows })
        .map((_, rowIndex) => {
          const colsHtml = Array.from({ length: cols })
            .map(
              (__, colIndex) =>
                `<td style="border:1px solid #d1d5db; padding:8px;">Cell ${rowIndex + 1}.${colIndex + 1}</td>`,
            )
            .join("");
          return `<tr>${colsHtml}</tr>`;
        })
        .join("");
      const tableHtml = sanitizeRichText(
        `<table style="width:100%; border-collapse:collapse; table-layout:fixed; margin:8px 0;"><tbody>${bodyRows}</tbody></table>`,
      );
      document.execCommand("insertHTML", false, tableHtml);
      emitChange(editorRef.current.innerHTML);
      setShowTableTools(true);
    }

    refreshActiveStates();
    setPromptDialog(null);
  };

  const getCurrentCell = (): HTMLTableCellElement | null => {
    if (!editorRef.current) return null;
    prepareEditorCommand();
    const selection = window.getSelection();
    let node = selection?.anchorNode as Node | null;
    while (node && node !== editorRef.current) {
      if (node instanceof HTMLTableCellElement) return node;
      node = node.parentNode;
    }
    return null;
  };

  const getCurrentTable = (): HTMLTableElement | null => {
    const cell = getCurrentCell();
    return cell?.closest("table") ?? null;
  };

  const addRowBelow = () => {
    const cell = getCurrentCell();
    if (!cell) return;
    const row = cell.parentElement as HTMLTableRowElement | null;
    if (!row?.parentElement) return;
    const newRow = row.cloneNode(true) as HTMLTableRowElement;
    newRow.querySelectorAll("td,th").forEach((c) => (c.textContent = "New cell"));
    row.insertAdjacentElement("afterend", newRow);
    emitChange(editorRef.current?.innerHTML ?? "");
  };

  const addColumnRight = () => {
    const cell = getCurrentCell();
    if (!cell) return;
    const row = cell.parentElement as HTMLTableRowElement | null;
    const table = cell.closest("table");
    if (!row || !table) return;
    const index = Array.from(row.children).indexOf(cell);
    table.querySelectorAll("tr").forEach((tr) => {
      const cells = Array.from(tr.children);
      const refCell = cells[Math.min(index, cells.length - 1)];
      const newCell = document.createElement(refCell?.tagName?.toLowerCase() === "th" ? "th" : "td");
      newCell.textContent = "New cell";
      newCell.style.border = "1px solid #d1d5db";
      newCell.style.padding = "8px";
      refCell?.insertAdjacentElement("afterend", newCell);
    });
    emitChange(editorRef.current?.innerHTML ?? "");
  };

  const deleteCurrentRow = () => {
    const cell = getCurrentCell();
    const row = cell?.parentElement as HTMLTableRowElement | null;
    if (!row) return;
    row.remove();
    emitChange(editorRef.current?.innerHTML ?? "");
  };

  const deleteCurrentColumn = () => {
    const cell = getCurrentCell();
    if (!cell) return;
    const row = cell.parentElement as HTMLTableRowElement | null;
    const table = cell.closest("table");
    if (!row || !table) return;
    const index = Array.from(row.children).indexOf(cell);
    table.querySelectorAll("tr").forEach((tr) => {
      const target = tr.children[index];
      if (target) target.remove();
    });
    emitChange(editorRef.current?.innerHTML ?? "");
  };

  const deleteCurrentTable = () => {
    const table = getCurrentTable();
    if (!table) return;
    table.remove();
    emitChange(editorRef.current?.innerHTML ?? "");
  };

  const startResize = useCallback((e: ReactMouseEvent, position: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedImage) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = selectedImage.offsetWidth;
    const startH = selectedImage.offsetHeight;
    const ratio = aspectRatioRef.current;

    const handleMouseMove = (me: MouseEvent) => {
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;
      let newW = startW;
      let newH = startH;

      if (position === "se") {
        newW = startW + dx;
        newH = lockAspectRatio ? newW / ratio : startH + dy;
      } else if (position === "sw") {
        newW = startW - dx;
        newH = lockAspectRatio ? newW / ratio : startH + dy;
      } else if (position === "ne") {
        newW = startW + dx;
        newH = lockAspectRatio ? newW / ratio : startH - dy;
      } else if (position === "nw") {
        newW = startW - dx;
        newH = lockAspectRatio ? newW / ratio : startH - dy;
      }

      newW = Math.max(50, newW);
      newH = Math.max(50, newH);

      selectedImage.style.width = `${newW}px`;
      selectedImage.style.height = `${newH}px`;
      setImageWidth(Math.round(newW));
      setImageHeight(Math.round(newH));
      updateImageOverlay(selectedImage);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      emitChange(editorRef.current?.innerHTML || "");
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [selectedImage, lockAspectRatio, emitChange, updateImageOverlay]);

  const setAlignment = useCallback((align: 'left' | 'center' | 'right') => {
    if (!selectedImage) return;
    const wrapper = selectedImage.parentElement;
    if (wrapper && wrapper.tagName === 'DIV' && wrapper.getAttribute('data-image-wrapper')) {
      wrapper.style.textAlign = align;
    } else {
      const div = document.createElement('div');
      div.setAttribute('data-image-wrapper', 'true');
      div.style.textAlign = align;
      selectedImage.parentNode?.insertBefore(div, selectedImage);
      div.appendChild(selectedImage);
    }
    emitChange(editorRef.current?.innerHTML || '');
  }, [selectedImage, emitChange]);

  const handleWidthChange = (val: string) => {
    const w = parseInt(val) || 0;
    if (!selectedImage || w < 10) return;
    setImageWidth(w);
    selectedImage.style.width = `${w}px`;
    if (lockAspectRatio) {
      const h = Math.round(w / aspectRatioRef.current);
      selectedImage.style.height = `${h}px`;
      setImageHeight(h);
    }
    emitChange(editorRef.current?.innerHTML || '');
  };

  const handleHeightChange = (val: string) => {
    const h = parseInt(val) || 0;
    if (!selectedImage || h < 10) return;
    setImageHeight(h);
    selectedImage.style.height = `${h}px`;
    if (lockAspectRatio) {
      const w = Math.round(h * aspectRatioRef.current);
      selectedImage.style.width = `${w}px`;
      setImageWidth(w);
    }
    emitChange(editorRef.current?.innerHTML || '');
  };

  const removeSelectedImage = () => {
    if (!selectedImage) return;
    selectedImage.remove();
    setSelectedImage(null);
    emitChange(editorRef.current?.innerHTML || '');
  };

  const resizeCurrentTable = (deltaPercent: number) => {
    const table = getCurrentTable();
    if (!table) return;
    const currentWidth = Number.parseFloat((table.style.width || "100").replace("%", "")) || 100;
    const nextWidth = Math.max(30, Math.min(100, currentWidth + deltaPercent));
    table.style.width = `${nextWidth}%`;
    table.style.tableLayout = "fixed";
    emitChange(editorRef.current?.innerHTML ?? "");
  };

  const alignCurrentTable = (align: "left" | "center" | "right") => {
    const table = getCurrentTable();
    if (!table) return;
    table.style.display = "table";
    table.style.float = "none";
    table.style.tableLayout = "fixed";
    // Full-width tables can't show horizontal position — shrink if needed.
    if (!table.style.width || table.style.width === "100%") {
      table.style.width = "70%";
    }
    if (align === "left") {
      table.style.marginLeft = "0";
      table.style.marginRight = "auto";
    } else if (align === "center") {
      table.style.marginLeft = "auto";
      table.style.marginRight = "auto";
    } else {
      table.style.marginLeft = "auto";
      table.style.marginRight = "0";
    }
    emitChange(editorRef.current?.innerHTML ?? "");
  };

  const moveCurrentTable = (direction: "up" | "down") => {
    const table = getCurrentTable();
    if (!table?.parentNode) return;
    if (direction === "up") {
      const prev = table.previousSibling;
      if (!prev) return;
      table.parentNode.insertBefore(table, prev);
    } else {
      const next = table.nextSibling;
      if (!next) return;
      table.parentNode.insertBefore(next, table);
    }
    emitChange(editorRef.current?.innerHTML ?? "");
    refreshActiveStates();
  };

  const startTableMove = (table: HTMLTableElement) => {
    if (!editorRef.current) return;
    table.style.outline = "2px solid #3b82f6";
    table.style.opacity = "0.85";

    const onUp = (event: MouseEvent) => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("mousemove", onMove);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
      table.style.removeProperty("outline");
      table.style.removeProperty("opacity");

      if (!editorRef.current) return;
      const under = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
      if (!under || !editorRef.current.contains(under) || table.contains(under)) {
        emitChange(editorRef.current.innerHTML);
        return;
      }

      let block: HTMLElement | null = under;
      while (block && block.parentElement !== editorRef.current) {
        block = block.parentElement;
      }
      if (!block || block === table) {
        emitChange(editorRef.current.innerHTML);
        return;
      }

      const rect = block.getBoundingClientRect();
      const placeBefore = event.clientY < rect.top + rect.height / 2;
      if (placeBefore) {
        editorRef.current.insertBefore(table, block);
      } else {
        editorRef.current.insertBefore(table, block.nextSibling);
      }
      emitChange(editorRef.current.innerHTML);
      refreshActiveStates();
    };

    const onMove = () => {
      // Cursor feedback only; drop happens on mouseup.
    };

    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const startTableColumnResize = (cell: HTMLTableCellElement, startX: number) => {
    const table = cell.closest("table");
    const row = cell.parentElement as HTMLTableRowElement | null;
    if (!table || !row || !editorRef.current) return;

    table.style.tableLayout = "fixed";
    // Unlock from full-width so columns can actually change size.
    if (!table.style.width || table.style.width === "100%") {
      table.style.width = `${Math.round(table.getBoundingClientRect().width)}px`;
    }

    const colIndex = Array.from(row.children).indexOf(cell);
    if (colIndex < 0) return;

    // Snapshot every column width once so siblings don't jump.
    const firstRow = table.querySelector("tr");
    const colWidths =
      firstRow
        ? Array.from(firstRow.children).map((c) => Math.round((c as HTMLElement).getBoundingClientRect().width))
        : [];
    colWidths.forEach((width, index) => {
      table.querySelectorAll("tr").forEach((tr) => {
        const target = tr.children[index] as HTMLElement | undefined;
        if (!target) return;
        target.style.width = `${width}px`;
        target.style.minWidth = `${width}px`;
      });
    });

    const startWidth = colWidths[colIndex] ?? Math.round(cell.getBoundingClientRect().width);

    const onMove = (event: MouseEvent) => {
      const nextWidth = Math.max(48, Math.round(startWidth + (event.clientX - startX)));
      table.querySelectorAll("tr").forEach((tr) => {
        const target = tr.children[colIndex] as HTMLElement | undefined;
        if (!target) return;
        target.style.width = `${nextWidth}px`;
        target.style.minWidth = `${nextWidth}px`;
        target.style.maxWidth = `${nextWidth}px`;
      });
      updateTableHandleOverlay(cell);
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
      emitChange(editorRef.current?.innerHTML ?? "");
      updateTableHandleOverlay(cell);
      refreshActiveStates();
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const startTableRowResize = (cell: HTMLTableCellElement, startY: number) => {
    const row = cell.parentElement as HTMLTableRowElement | null;
    if (!row || !editorRef.current) return;

    const startHeight = row.getBoundingClientRect().height;

    const onMove = (event: MouseEvent) => {
      const nextHeight = Math.max(28, Math.round(startHeight + (event.clientY - startY)));
      row.style.height = `${nextHeight}px`;
      row.querySelectorAll<HTMLElement>("td,th").forEach((td) => {
        td.style.height = `${nextHeight}px`;
      });
      updateTableHandleOverlay(cell);
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
      emitChange(editorRef.current?.innerHTML ?? "");
      updateTableHandleOverlay(cell);
      refreshActiveStates();
    };

    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const startTableWidthResize = (table: HTMLTableElement, startX: number) => {
    if (!editorRef.current) return;
    table.style.tableLayout = "fixed";
    const startWidth = table.getBoundingClientRect().width;

    const onMove = (event: MouseEvent) => {
      const parentWidth = editorRef.current?.clientWidth || startWidth;
      const nextWidth = Math.max(120, Math.min(parentWidth, Math.round(startWidth + (event.clientX - startX))));
      table.style.width = `${nextWidth}px`;
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
      emitChange(editorRef.current?.innerHTML ?? "");
      refreshActiveStates();
    };

    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const startTableCornerResize = (
    cell: HTMLTableCellElement,
    startX: number,
    startY: number,
  ) => {
    const table = cell.closest("table");
    const row = cell.parentElement as HTMLTableRowElement | null;
    if (!table || !row || !editorRef.current) return;

    table.style.tableLayout = "fixed";
    if (!table.style.width || table.style.width === "100%") {
      table.style.width = `${Math.round(table.getBoundingClientRect().width)}px`;
    }

    const colIndex = Array.from(row.children).indexOf(cell);
    if (colIndex < 0) return;

    const firstRow = table.querySelector("tr");
    const colWidths =
      firstRow
        ? Array.from(firstRow.children).map((c) => Math.round((c as HTMLElement).getBoundingClientRect().width))
        : [];
    colWidths.forEach((width, index) => {
      table.querySelectorAll("tr").forEach((tr) => {
        const target = tr.children[index] as HTMLElement | undefined;
        if (!target) return;
        target.style.width = `${width}px`;
        target.style.minWidth = `${width}px`;
      });
    });

    const startWidth = colWidths[colIndex] ?? Math.round(cell.getBoundingClientRect().width);
    const startHeight = Math.round(row.getBoundingClientRect().height);

    const onMove = (event: MouseEvent) => {
      const nextWidth = Math.max(48, Math.round(startWidth + (event.clientX - startX)));
      const nextHeight = Math.max(28, Math.round(startHeight + (event.clientY - startY)));

      table.querySelectorAll("tr").forEach((tr) => {
        const target = tr.children[colIndex] as HTMLElement | undefined;
        if (!target) return;
        target.style.width = `${nextWidth}px`;
        target.style.minWidth = `${nextWidth}px`;
        target.style.maxWidth = `${nextWidth}px`;
      });

      row.style.height = `${nextHeight}px`;
      row.querySelectorAll<HTMLElement>("td,th").forEach((td) => {
        td.style.height = `${nextHeight}px`;
      });
      updateTableHandleOverlay(cell);
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
      emitChange(editorRef.current?.innerHTML ?? "");
      updateTableHandleOverlay(cell);
      refreshActiveStates();
    };

    document.body.style.cursor = "nwse-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const TABLE_EDGE_HIT_PX = 12;

  const onEditorMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !editorRef.current) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const table = target.closest("table") as HTMLTableElement | null;
    if (table && editorRef.current.contains(table)) {
      const tableRect = table.getBoundingClientRect();
      // Drag from the top strip of the table to reposition it in the document.
      const nearTop = event.clientY - tableRect.top <= TABLE_EDGE_HIT_PX;
      if (nearTop && event.clientX - tableRect.left > TABLE_EDGE_HIT_PX) {
        event.preventDefault();
        event.stopPropagation();
        startTableMove(table);
        return;
      }
      if (tableRect.right - event.clientX <= TABLE_EDGE_HIT_PX) {
        event.preventDefault();
        event.stopPropagation();
        startTableWidthResize(table, event.clientX);
        return;
      }
    }

    const cell = target.closest("td,th") as HTMLTableCellElement | null;
    if (cell && editorRef.current.contains(cell)) {
      const rect = cell.getBoundingClientRect();
      const distRight = rect.right - event.clientX;
      const distBottom = rect.bottom - event.clientY;
      const nearRight = distRight <= TABLE_EDGE_HIT_PX;
      const nearBottom = distBottom <= TABLE_EDGE_HIT_PX;

      if (nearRight || nearBottom) {
        event.preventDefault();
        event.stopPropagation();
        // Bottom-right corner: resize column + row together (diagonal).
        if (nearRight && nearBottom) {
          startTableCornerResize(cell, event.clientX, event.clientY);
        } else if (nearRight) {
          startTableColumnResize(cell, event.clientX);
        } else {
          startTableRowResize(cell, event.clientY);
        }
      }
    }
  };

  const onEditorMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!editorRef.current) return;
    const target = event.target as HTMLElement | null;
    if (!target) {
      editorRef.current.style.cursor = "";
      return;
    }

    const table = target.closest("table") as HTMLTableElement | null;
    if (table && editorRef.current.contains(table)) {
      const tableRect = table.getBoundingClientRect();
      if (event.clientY - tableRect.top <= TABLE_EDGE_HIT_PX && event.clientX - tableRect.left > TABLE_EDGE_HIT_PX) {
        editorRef.current.style.cursor = "grab";
        return;
      }
      if (tableRect.right - event.clientX <= TABLE_EDGE_HIT_PX) {
        editorRef.current.style.cursor = "ew-resize";
        return;
      }
    }

    const cell = target.closest("td,th") as HTMLTableCellElement | null;
    if (cell && editorRef.current.contains(cell)) {
      if (activeTableCellRef.current !== cell) {
        updateTableHandleOverlay(cell);
      }
      const rect = cell.getBoundingClientRect();
      const distRight = rect.right - event.clientX;
      const distBottom = rect.bottom - event.clientY;
      const nearRight = distRight <= TABLE_EDGE_HIT_PX;
      const nearBottom = distBottom <= TABLE_EDGE_HIT_PX;
      if (nearRight && nearBottom) {
        editorRef.current.style.cursor = "nwse-resize";
        return;
      }
      if (nearRight) {
        editorRef.current.style.cursor = "col-resize";
        return;
      }
      if (nearBottom) {
        editorRef.current.style.cursor = "row-resize";
        return;
      }
      editorRef.current.style.cursor = "";
      return;
    }

    const active = activeTableCellRef.current;
    if (active && editorRef.current.contains(active)) {
      const sel = window.getSelection();
      const stillSelected = Boolean(sel?.anchorNode && active.contains(sel.anchorNode));
      if (!stillSelected) updateTableHandleOverlay(null);
    }

    editorRef.current.style.cursor = "";
  };

  const onEditorKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const isMod = event.metaKey || event.ctrlKey;
    if (!isMod) return;
    const key = event.key.toLowerCase();

    if (key === "b") {
      event.preventDefault();
      applyCommand("bold");
      return;
    }
    if (key === "i") {
      event.preventDefault();
      applyCommand("italic");
      return;
    }
    if (key === "u") {
      event.preventDefault();
      applyCommand("underline");
      return;
    }
    if (key === "k") {
      event.preventDefault();
      setPromptDialog({ type: "link", value: "https://" });
      return;
    }
    if (key === "f" || key === "h") {
      event.preventDefault();
      setShowFindReplace(true);
      return;
    }
    if (key === "p" && showPageSetup) {
      event.preventDefault();
      handlePrintPreview();
      return;
    }
    if (key === "z" && !event.shiftKey) {
      event.preventDefault();
      applyCommand("undo");
      return;
    }
    if (key === "y" || (key === "z" && event.shiftKey)) {
      event.preventDefault();
      applyCommand("redo");
    }
  };

  const applyLineHeight = (lineHeight: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSavedSelection();
    ensureSelectionInEditor();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    let node = selection.anchorNode as Node | null;
    while (node && node !== editorRef.current) {
      if (node instanceof HTMLElement) {
        node.style.lineHeight = lineHeight;
        break;
      }
      node = node.parentNode;
    }
    emitChange(editorRef.current.innerHTML);
    setToolbarMeta((prev) => ({ ...prev, lineHeight }));
    refreshActiveStates();
  };

  useEffect(() => {
    if (!mounted) return;
    const onSelectionChange = () => refreshActiveStatesRef.current();
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [mounted]);

  const toolbarBtnClass =
    "h-8 w-8 inline-flex items-center justify-center text-xs border rounded-md hover:bg-muted";
  const toolbarSelectClass = "h-7 px-2 text-xs border rounded bg-background";
  const groupClass = "flex items-center gap-1 rounded-md border border-border bg-background p-1";
  const keepEditorSelection = {
    onMouseDown: (event: ReactMouseEvent<HTMLElement>) => {
      // Keep contentEditable selection when clicking toolbar buttons.
      event.preventDefault();
    },
  };
  const toolbarToggleProps = (active: boolean, label: string) => ({
    className: cn(toolbarBtnClass, active && "bg-muted border-border text-foreground"),
    title: label,
    "aria-label": label,
    "aria-pressed": active,
    ...keepEditorSelection,
  });
  const iconSize = 14;

  if (!mounted) {
    return (
      <div className={cn("border border-border rounded-lg overflow-hidden", className)}>
        <div className="bg-muted/40 px-4 py-2 border-b border-border">
          <span className="text-sm text-muted-foreground">Loading editor...</span>
        </div>
        <div className="min-h-[260px] p-4 bg-background">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("border border-border rounded-lg overflow-hidden", className)}>
      {showHeader && (
        <div className="bg-muted/30 px-4 py-2 border-b border-border flex items-center justify-between">
          <span id={labelId} className="text-sm text-muted-foreground">
            Rich text editor
          </span>
          {showCharacterCount && (
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {wordCount} words · {characterCount} characters
            </span>
          )}
        </div>
      )}
      <div
        role="toolbar"
        aria-label="Formatting"
        className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      >
        <div className="px-3 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
          <div className={groupClass}>
            <button type="button" onClick={() => applyCommand("undo")} {...keepEditorSelection} className={toolbarBtnClass} title="Undo" aria-label="Undo">
              <Undo2 size={iconSize} />
            </button>
            <button type="button" onClick={() => applyCommand("redo")} {...keepEditorSelection} className={toolbarBtnClass} title="Redo" aria-label="Redo">
              <Redo2 size={iconSize} />
            </button>
            <button type="button" onClick={() => applyCommand("removeFormat")} {...keepEditorSelection} className={toolbarBtnClass} title="Clear formatting" aria-label="Clear formatting">
              <Eraser size={iconSize} />
            </button>
          </div>

          <div className={groupClass}>
            <select
              aria-label="Block style"
              value={toolbarMeta.block}
              onChange={(e) => applyBlock(e.target.value)}
              className={toolbarSelectClass}
            >
              <option value="p">Paragraph</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
              <option value="blockquote">Quote</option>
              <option value="pre">Code Block</option>
            </select>
          </div>

          <div className={groupClass}>
            <button type="button" onClick={() => applyCommand("bold")} {...toolbarToggleProps(Boolean(activeStates.bold), "Bold")}>
              <Bold size={iconSize} />
            </button>
            <button type="button" onClick={() => applyCommand("italic")} {...toolbarToggleProps(Boolean(activeStates.italic), "Italic")}>
              <Italic size={iconSize} />
            </button>
            <button type="button" onClick={() => applyCommand("underline")} {...toolbarToggleProps(Boolean(activeStates.underline), "Underline")}>
              <Underline size={iconSize} />
            </button>
          </div>

          <div className={groupClass}>
            <button type="button" onClick={() => applyCommand("justifyLeft")} {...toolbarToggleProps(Boolean(activeStates.justifyLeft), "Align left")}>
              <AlignLeft size={iconSize} />
            </button>
            <button type="button" onClick={() => applyCommand("justifyCenter")} {...toolbarToggleProps(Boolean(activeStates.justifyCenter), "Align center")}>
              <AlignCenter size={iconSize} />
            </button>
            <button type="button" onClick={() => applyCommand("justifyRight")} {...toolbarToggleProps(Boolean(activeStates.justifyRight), "Align right")}>
              <AlignRight size={iconSize} />
            </button>
          </div>

          <div className={groupClass}>
            <button type="button" onClick={() => applyCommand("insertOrderedList")} {...toolbarToggleProps(Boolean(activeStates.insertOrderedList), "Numbered list")}>
              <ListOrdered size={iconSize} />
            </button>
            <button type="button" onClick={() => applyCommand("insertUnorderedList")} {...toolbarToggleProps(Boolean(activeStates.insertUnorderedList), "Bullet list")}>
              <List size={iconSize} />
            </button>
            <button
              type="button"
              onClick={() => setPromptDialog({ type: "table", rows: "2", cols: "2" })}
              {...keepEditorSelection}
              className={toolbarBtnClass}
              title="Insert table"
              aria-label="Insert table"
            >
              <Table2 size={iconSize} />
            </button>
          </div>

          <div className={groupClass}>
            <button
              type="button"
              onClick={() => setPromptDialog({ type: "link", value: "https://" })}
              {...keepEditorSelection}
              className={toolbarBtnClass}
              title="Insert link"
              aria-label="Insert link"
            >
              <Link2 size={iconSize} />
            </button>
            {signatureImageUrl && (
              <button type="button" onClick={insertSignature} {...keepEditorSelection} className="h-8 px-2 inline-flex items-center justify-center text-xs border rounded-md hover:bg-muted whitespace-nowrap" title="Insert signature" aria-label="Insert signature">
                Signature
              </button>
            )}
            {showPageSetup && (
              <button
                type="button"
                onClick={() => setShowPageSetupDialog(true)}
                {...keepEditorSelection}
                className="h-8 px-2 inline-flex items-center justify-center text-xs border rounded-md hover:bg-muted whitespace-nowrap"
                title="Page setup"
                aria-label="Page setup"
              >
                {pageSettings.paperSize.toUpperCase()} · {pageSettings.orientation === "portrait" ? "Portrait" : "Landscape"}
              </button>
            )}
            {showPageSetup && (
              <button
                type="button"
                onClick={handlePrintPreview}
                {...keepEditorSelection}
                className={toolbarBtnClass}
                title="Print / PDF preview"
                aria-label="Print / PDF preview"
              >
                <Printer size={iconSize} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowFindReplace(true)}
              {...keepEditorSelection}
              className={toolbarBtnClass}
              title="Find and replace (Ctrl+F)"
              aria-label="Find and replace"
            >
              <Search size={iconSize} />
            </button>
            <button
              type="button"
              onClick={() => setShowAdvancedTools((prev) => !prev)}
              {...keepEditorSelection}
              className={cn("h-8 px-2 inline-flex items-center text-xs border rounded-md hover:bg-muted", showAdvancedTools && "bg-muted")}
              title="More formatting tools"
              aria-label="More formatting tools"
              aria-pressed={showAdvancedTools}
            >
              More
            </button>
          </div>

          {tokens.length > 0 && (
            <div className={groupClass}>
              <button
                type="button"
                onClick={() => setShowTokenTools((prev) => !prev)}
                {...keepEditorSelection}
                className={cn("h-8 px-2 inline-flex items-center text-xs border rounded-md hover:bg-muted", showTokenTools && "bg-muted")}
                aria-pressed={showTokenTools}
                aria-label="Insert document fields"
                title="Insert fields like title, recipient, or date that fill from document details"
              >
                Fields
              </button>
            </div>
          )}

          {!showHeader && showCharacterCount && (
            <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap" aria-live="polite">
              {wordCount} words · {characterCount} characters
            </span>
          )}
          </div>
        </div>

        {(showAdvancedTools || showTableTools || showTokenTools) && (
          <div className="px-3 pb-2 space-y-2 border-t border-border bg-muted/20">
            {showAdvancedTools && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-background p-2">
                  <select
                    aria-label="Font family"
                    value={FONT_FAMILIES.includes(toolbarMeta.fontName as (typeof FONT_FAMILIES)[number]) ? toolbarMeta.fontName : "Verdana"}
                    onChange={(e) => {
                      applyCommandWithValue("fontName", e.target.value);
                      setToolbarMeta((prev) => ({ ...prev, fontName: e.target.value }));
                    }}
                    className={toolbarSelectClass}
                  >
                    {FONT_FAMILIES.map((family) => (
                      <option key={family} value={family}>
                        {family === "Times New Roman" ? "Times" : family}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={6}
                    max={96}
                    step={1}
                    value={toolbarMeta.fontSize}
                    onChange={(e) => {
                      const next = e.target.value;
                      setToolbarMeta((prev) => ({ ...prev, fontSize: next }));
                      if (next.trim() !== "") applyFontSize(next);
                    }}
                    onBlur={(e) => applyFontSize(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyFontSize((e.target as HTMLInputElement).value);
                      }
                    }}
                    className="h-7 w-16 px-1.5 text-xs border rounded bg-background"
                    aria-label="Font size in pixels"
                    title="Font size (px). Select text, then adjust."
                  />
                  <span className="text-[10px] text-muted-foreground pr-1">px</span>
                  <select
                    aria-label="Line spacing"
                    value={LINE_HEIGHT_OPTIONS.includes(toolbarMeta.lineHeight as (typeof LINE_HEIGHT_OPTIONS)[number]) ? toolbarMeta.lineHeight : "1.5"}
                    onChange={(e) => applyLineHeight(e.target.value)}
                    className={toolbarSelectClass}
                  >
                    <option value="1">1.0</option>
                    <option value="1.15">1.15</option>
                    <option value="1.5">1.5</option>
                    <option value="2">2.0</option>
                    <option value="2.5">2.5</option>
                    <option value="3">3.0</option>
                  </select>
                  <button type="button" onClick={() => applyCommand("strikeThrough")} {...toolbarToggleProps(Boolean(activeStates.strikeThrough), "Strikethrough")}>
                    <Strikethrough size={iconSize} />
                  </button>
                  <button type="button" onClick={() => applyCommand("justifyFull")} {...toolbarToggleProps(Boolean(activeStates.justifyFull), "Justify")}>
                    <AlignJustify size={iconSize} />
                  </button>
                  <label className={cn(toolbarBtnClass, "relative cursor-pointer")} title="Text color">
                    <Type size={iconSize} aria-hidden />
                    <span
                      className="absolute bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded"
                      style={{ backgroundColor: toolbarMeta.foreColor }}
                    />
                    <input
                      type="color"
                      aria-label="Text color"
                      value={toolbarMeta.foreColor}
                      onChange={(e) => {
                        applyCommandWithValue("foreColor", e.target.value);
                        setToolbarMeta((prev) => ({ ...prev, foreColor: e.target.value }));
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      applyCommandWithValue("foreColor", DEFAULT_TEXT_COLOR);
                      setToolbarMeta((prev) => ({ ...prev, foreColor: DEFAULT_TEXT_COLOR }));
                    }}
                    {...keepEditorSelection}
                    className="h-8 px-2 inline-flex items-center text-xs border rounded-md hover:bg-muted"
                    title="Reset text color"
                    aria-label="Reset text color"
                  >
                    Reset color
                  </button>
                  <label className={cn(toolbarBtnClass, "relative cursor-pointer")} title="Highlight color">
                    <Highlighter size={iconSize} aria-hidden />
                    <span className="absolute bottom-1 left-1/2 h-1 w-4 -translate-x-1/2 rounded bg-yellow-300" />
                    <input
                      type="color"
                      aria-label="Highlight color"
                      defaultValue="#fff59d"
                      onChange={(e) => applyCommandWithValue("hiliteColor", e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </label>
                  <button type="button" onClick={() => applyCommand("unlink")} {...keepEditorSelection} className={toolbarBtnClass} title="Remove link" aria-label="Remove link">
                    <Unlink2 size={iconSize} />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-background p-2">
                  <button type="button" onClick={() => applyCommand("subscript")} {...toolbarToggleProps(Boolean(activeStates.subscript), "Subscript")}>
                    <Subscript size={iconSize} />
                  </button>
                  <button type="button" onClick={() => applyCommand("superscript")} {...toolbarToggleProps(Boolean(activeStates.superscript), "Superscript")}>
                    <Superscript size={iconSize} />
                  </button>
                  <button type="button" onClick={() => applyCommand("outdent")} {...keepEditorSelection} className={toolbarBtnClass} title="Outdent" aria-label="Outdent">
                    <IndentDecrease size={iconSize} />
                  </button>
                  <button type="button" onClick={() => applyCommand("indent")} {...keepEditorSelection} className={toolbarBtnClass} title="Indent" aria-label="Indent">
                    <IndentIncrease size={iconSize} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPromptDialog({ type: "image", value: "https://" })}
                    {...keepEditorSelection}
                    className={toolbarBtnClass}
                    title="Insert image"
                    aria-label="Insert image"
                  >
                    <ImageIcon size={iconSize} />
                  </button>
                  <button type="button" onClick={() => applyCommand("insertHorizontalRule")} {...keepEditorSelection} className={toolbarBtnClass} title="Insert horizontal rule" aria-label="Insert horizontal rule">
                    ―
                  </button>
                </div>
              </div>
            )}

            {showTableTools && (
              <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-background p-2">
                <span className="px-1 text-[10px] uppercase tracking-wide text-muted-foreground">Table</span>
                <button type="button" onClick={() => alignCurrentTable("left")} {...keepEditorSelection} className="px-2 py-1 text-xs border rounded hover:bg-muted" title="Align table left" aria-label="Align table left">
                  <AlignLeft size={12} className="inline" /> Left
                </button>
                <button type="button" onClick={() => alignCurrentTable("center")} {...keepEditorSelection} className="px-2 py-1 text-xs border rounded hover:bg-muted" title="Align table center" aria-label="Align table center">
                  <AlignCenter size={12} className="inline" /> Center
                </button>
                <button type="button" onClick={() => alignCurrentTable("right")} {...keepEditorSelection} className="px-2 py-1 text-xs border rounded hover:bg-muted" title="Align table right" aria-label="Align table right">
                  <AlignRight size={12} className="inline" /> Right
                </button>
                <button type="button" onClick={() => moveCurrentTable("up")} {...keepEditorSelection} className="px-2 py-1 text-xs border rounded hover:bg-muted" title="Move table up" aria-label="Move table up">
                  <ArrowUp size={12} className="inline" /> Up
                </button>
                <button type="button" onClick={() => moveCurrentTable("down")} {...keepEditorSelection} className="px-2 py-1 text-xs border rounded hover:bg-muted" title="Move table down" aria-label="Move table down">
                  <ArrowDown size={12} className="inline" /> Down
                </button>
                <button type="button" onClick={addRowBelow} className="px-2 py-1 text-xs border rounded hover:bg-muted" title="Add row below" aria-label="Add row below">
                  +Row
                </button>
                <button type="button" onClick={addColumnRight} className="px-2 py-1 text-xs border rounded hover:bg-muted" title="Add column right" aria-label="Add column right">
                  +Col
                </button>
                <button type="button" onClick={deleteCurrentRow} className="px-2 py-1 text-xs border rounded hover:bg-muted" title="Delete current row" aria-label="Delete current row">
                  -Row
                </button>
                <button type="button" onClick={deleteCurrentColumn} className="px-2 py-1 text-xs border rounded hover:bg-muted" title="Delete current column" aria-label="Delete current column">
                  -Col
                </button>
                <button type="button" onClick={() => resizeCurrentTable(10)} className="px-2 py-1 text-xs border rounded hover:bg-muted" title="Increase table width" aria-label="Increase table width">
                  Wider
                </button>
                <button type="button" onClick={() => resizeCurrentTable(-10)} className="px-2 py-1 text-xs border rounded hover:bg-muted" title="Decrease table width" aria-label="Decrease table width">
                  Narrow
                </button>
                <button type="button" onClick={deleteCurrentTable} className="px-2 py-1 text-xs border rounded hover:bg-muted" title="Delete current table" aria-label="Delete current table">
                  Del Tbl
                </button>
                <span className="basis-full px-1 text-[10px] text-muted-foreground">
                  Resize: cell right edge = column, bottom = row, bottom-right corner = both. Move: top edge drag, or Up/Down / Left/Center/Right.
                </span>
              </div>
            )}

            {showTokenTools && tokens.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-background p-2">
                <span className="px-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Insert fields
                </span>
                {tokens.map((token) => (
                  <button
                    key={token.value}
                    type="button"
                    onClick={() => handleInsertToken(token.value)}
                    className="px-2 py-1 text-xs border rounded hover:bg-muted"
                  >
                    {token.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div ref={editorShellRef} className="relative overflow-auto bg-muted/30">
        <div
          ref={editorRef}
          className={cn(
            "w-full doc-paper outline-none focus:outline-none focus-visible:outline-none",
            "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
            "[&_li]:my-1 [&_table]:max-w-full [&_table]:border-collapse [&_td]:border [&_td]:border-neutral-300 [&_td]:p-2 [&_td]:relative [&_th]:border [&_th]:border-neutral-300 [&_th]:p-2 [&_th]:relative",
            "empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-400 empty:before:pointer-events-none",
          )}
          style={{
            minHeight: `${Math.max(pageDims.contentHeightPx, 420)}px`,
            padding: `${(pageSettings.marginTop / 25.4) * 96}px ${(pageSettings.marginRight / 25.4) * 96}px ${(pageSettings.marginBottom / 25.4) * 96}px ${(pageSettings.marginLeft / 25.4) * 96}px`,
            fontFamily: "Verdana, Geneva, sans-serif",
            fontSize: "12px",
            lineHeight: "1.5",
          }}
          contentEditable
          role="textbox"
          aria-multiline="true"
          aria-labelledby={showHeader ? labelId : undefined}
          aria-label={showHeader ? undefined : "Rich text editor"}
          suppressContentEditableWarning
          data-placeholder={placeholder}
          onInput={handleInput}
          onPaste={handlePaste}
          onKeyDown={onEditorKeyDown}
          onMouseDown={onEditorMouseDown}
          onMouseMove={onEditorMouseMove}
          onMouseLeave={() => {
            if (editorRef.current) editorRef.current.style.cursor = "";
          }}
          onFocus={() => {
            isFocusedRef.current = true;
          }}
          onBlur={() => {
            isFocusedRef.current = false;
            setTimeout(() => {
              setSelectedImage(null);
              setImageOverlay(null);
            }, 150);
          }}
          onClick={() => {
            if (!editorRef.current) return;
            const selection = window.getSelection();
            if (!selection?.rangeCount) return;
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const editorRect = editorRef.current.getBoundingClientRect();
            const relativeY = rect.top - editorRect.top;
            const page = Math.floor(relativeY / pageDims.contentHeightPx) + 1;
            setCurrentPage(Math.max(1, Math.min(page, totalPages)));
          }}
        />
        {imageOverlay && selectedImage && (
          <div
            style={{
              position: "absolute",
              left: imageOverlay.left,
              top: imageOverlay.top,
              width: imageOverlay.width,
              height: imageOverlay.height,
              border: "1px solid #a3a3a3",
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            {(["nw", "ne", "sw", "se"] as const).map((pos) => (
              <div
                key={pos}
                className="absolute w-3 h-3 border border-neutral-400 bg-background pointer-events-auto"
                style={{
                  ...(pos.includes("n") ? { top: -6 } : { bottom: -6 }),
                  ...(pos.includes("w") ? { left: -6 } : { right: -6 }),
                  cursor: pos === "nw" || pos === "se" ? "nwse-resize" : "nesw-resize",
                }}
                onMouseDown={(e) => startResize(e, pos)}
              />
            ))}
          </div>
        )}
        {tableHandleOverlay && activeTableCellRef.current && (
          <div
            aria-hidden
            className="pointer-events-none absolute z-20"
            style={{
              left: tableHandleOverlay.left,
              top: tableHandleOverlay.top,
              width: tableHandleOverlay.width,
              height: tableHandleOverlay.height,
            }}
          >
            {/* Column resize edge */}
            <div
              className="pointer-events-auto absolute top-0 bottom-3 w-1.5 rounded-full bg-primary/60 hover:bg-primary"
              style={{ right: -3, cursor: "col-resize" }}
              title="Drag to resize column"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const cell = activeTableCellRef.current;
                if (!cell) return;
                startTableColumnResize(cell, e.clientX);
              }}
            />
            {/* Row resize edge */}
            <div
              className="pointer-events-auto absolute left-0 right-3 h-1.5 rounded-full bg-primary/60 hover:bg-primary"
              style={{ bottom: -3, cursor: "row-resize" }}
              title="Drag to resize row"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const cell = activeTableCellRef.current;
                if (!cell) return;
                startTableRowResize(cell, e.clientY);
              }}
            />
            {/* Diagonal corner grip — large and obvious */}
            <div
              className="pointer-events-auto absolute flex h-4 w-4 items-center justify-center rounded-sm border-2 border-primary bg-background shadow-sm hover:bg-primary/10"
              style={{ right: -8, bottom: -8, cursor: "nwse-resize" }}
              title="Drag to resize column and row"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const cell = activeTableCellRef.current;
                if (!cell) return;
                startTableCornerResize(cell, e.clientX, e.clientY);
              }}
            >
              <span
                className="block h-2 w-2 border-b-2 border-r-2 border-primary"
                style={{ transform: "translate(1px, 1px)" }}
              />
            </div>
          </div>
        )}
      </div>

      {selectedImage && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-t border-border text-xs flex-wrap">
          <span className="text-muted-foreground font-medium mr-1">Image:</span>
          <div className="flex items-center gap-1">
            <label htmlFor="rte-image-width" className="text-muted-foreground">W:</label>
            <input
              id="rte-image-width"
              type="number"
              value={imageWidth}
              onChange={(e) => handleWidthChange(e.target.value)}
              className="w-16 h-6 px-1 text-xs border rounded bg-background"
            />
          </div>
          <div className="flex items-center gap-1">
            <label htmlFor="rte-image-height" className="text-muted-foreground">H:</label>
            <input
              id="rte-image-height"
              type="number"
              value={imageHeight}
              onChange={(e) => handleHeightChange(e.target.value)}
              className="w-16 h-6 px-1 text-xs border rounded bg-background"
            />
          </div>
          <div className="flex items-center gap-0.5 ml-1">
            <button
              type="button"
              onClick={() => setAlignment("left")}
              className={toolbarBtnClass}
              title="Align left"
              aria-label="Align image left"
            >
              <AlignLeft size={12} />
            </button>
            <button
              type="button"
              onClick={() => setAlignment("center")}
              className={toolbarBtnClass}
              title="Align center"
              aria-label="Align image center"
            >
              <AlignCenter size={12} />
            </button>
            <button
              type="button"
              onClick={() => setAlignment("right")}
              className={toolbarBtnClass}
              title="Align right"
              aria-label="Align image right"
            >
              <AlignRight size={12} />
            </button>
          </div>
          <label className="flex items-center gap-1 ml-1 cursor-pointer">
            <input
              type="checkbox"
              checked={lockAspectRatio}
              onChange={(e) => setLockAspectRatio(e.target.checked)}
              className="h-3 w-3"
            />
            <span className="text-muted-foreground">Lock ratio</span>
          </label>
          <button
            type="button"
            onClick={removeSelectedImage}
            className="ml-1 px-2 py-0.5 text-xs text-destructive border border-destructive/30 rounded hover:bg-destructive/10"
          >
            Remove
          </button>
        </div>
      )}

      {showPageSetup && (
        <div className="flex items-center justify-between px-4 py-1 border-t border-border bg-muted/20 text-[10px] text-muted-foreground">
          <span>{pageSettings.paperSize.toUpperCase()} · {pageSettings.orientation} · Margins: T{pageSettings.marginTop} B{pageSettings.marginBottom} L{pageSettings.marginLeft} R{pageSettings.marginRight} mm</span>
          {showPageNumbers && <span>Page {currentPage} of {totalPages}</span>}
        </div>
      )}

      {showPageSetupDialog && (
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
              {pageSettings.paperSize.toUpperCase()} · {pageSettings.orientation}. Use Print / Save PDF for the system dialog.
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
              <Label htmlFor="rte-find">Find</Label>
              <Input
                id="rte-find"
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
              <Label htmlFor="rte-replace">Replace with</Label>
              <Input
                id="rte-replace"
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

      <Dialog open={promptDialog !== null} onOpenChange={(open) => !open && setPromptDialog(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>
              {promptDialog?.type === "link" && "Insert link"}
              {promptDialog?.type === "image" && "Insert image"}
              {promptDialog?.type === "table" && "Insert table"}
            </DialogTitle>
            <DialogDescription>
              {promptDialog?.type === "link" && "Enter a URL for the selected text or insertion point."}
              {promptDialog?.type === "image" && "Enter an image URL to insert."}
              {promptDialog?.type === "table" && "Choose how many rows and columns to insert."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {promptDialog?.type === "link" && (
              <div className="space-y-2">
                <Label htmlFor="rte-link-url">URL</Label>
                <Input
                  id="rte-link-url"
                  value={promptDialog.value}
                  onChange={(e) => setPromptDialog({ type: "link", value: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      confirmPromptDialog();
                    }
                  }}
                  autoFocus
                />
              </div>
            )}
            {promptDialog?.type === "image" && (
              <div className="space-y-2">
                <Label htmlFor="rte-image-url">Image URL</Label>
                <Input
                  id="rte-image-url"
                  value={promptDialog.value}
                  onChange={(e) => setPromptDialog({ type: "image", value: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      confirmPromptDialog();
                    }
                  }}
                  autoFocus
                />
              </div>
            )}
            {promptDialog?.type === "table" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="rte-table-rows">Rows</Label>
                  <Input
                    id="rte-table-rows"
                    type="number"
                    min={1}
                    max={20}
                    value={promptDialog.rows}
                    onChange={(e) => setPromptDialog({ ...promptDialog, rows: e.target.value })}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rte-table-cols">Columns</Label>
                  <Input
                    id="rte-table-cols"
                    type="number"
                    min={1}
                    max={10}
                    value={promptDialog.cols}
                    onChange={(e) => setPromptDialog({ ...promptDialog, cols: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
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
