"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
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
  Redo2,
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
import { PageSetupDialog, type PageSettings, getPageDimensions } from "./PageSetupDialog";

interface QuillEditorProps {
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

export function QuillEditor({
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
}: QuillEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [htmlValue, setHtmlValue] = useState(value);
  const [activeStates, setActiveStates] = useState<Record<string, boolean>>({});
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const [showTableTools, setShowTableTools] = useState(false);
  const [showTokenTools, setShowTokenTools] = useState(false);
  const [showPageSetupDialog, setShowPageSetupDialog] = useState(false);
  const [pageSettings, setPageSettings] = useState<PageSettings>(DEFAULT_PAGE_SETTINGS);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [imageWidth, setImageWidth] = useState<number>(0);
  const [imageHeight, setImageHeight] = useState<number>(0);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const aspectRatioRef = useRef(1);
  const initialContentSet = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !editorRef.current) return;
    if (!initialContentSet.current || value !== htmlValue) {
      initialContentSet.current = true;
      setHtmlValue(value ?? "");
      editorRef.current.innerHTML = value ?? "";
    }
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

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleImageClick = (e: Event) => {
      e.stopPropagation();
      const img = e.target as HTMLImageElement;
      setSelectedImage(img);
      setImageWidth(img.offsetWidth);
      setImageHeight(img.offsetHeight);
      aspectRatioRef.current = img.offsetWidth / img.offsetHeight;
    };

    const imgs = editor.querySelectorAll('img');
    imgs.forEach(img => {
      (img as HTMLElement).style.cursor = 'pointer';
      img.addEventListener('click', handleImageClick);
    });

    return () => {
      imgs.forEach(img => {
        img.removeEventListener('click', handleImageClick);
      });
    };
  }, [htmlValue]);

  const characterCount = useMemo(() => {
    if (typeof window === "undefined") return 0;
    const temp = window.document.createElement("div");
    temp.innerHTML = htmlValue || "";
    return (temp.textContent || "").trim().length;
  }, [htmlValue]);

  const emitChange = useCallback((nextHtml: string) => {
    setHtmlValue(nextHtml);
    onChange?.(nextHtml, { html: nextHtml, editor: "fallback-contenteditable" });
  }, [onChange]);

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
      return;
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
  };

  const applyCommand = (command: string) => {
    if (!editorRef.current) return;
    ensureSelectionInEditor();
    document.execCommand(command);
    emitChange(editorRef.current.innerHTML);
    refreshActiveStates();
  };

  const applyCommandWithValue = (command: string, value: string) => {
    if (!editorRef.current) return;
    ensureSelectionInEditor();
    if (command === "fontSize") {
      const sizeMap: Record<string, string> = {
        "1": "8px", "2": "10px", "3": "12px", "4": "14px",
        "5": "18px", "6": "24px", "7": "32px",
        "8": "20px", "9": "28px", "10": "36px", "11": "48px",
      };
      const px = sizeMap[value] || `${value}px`;
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (range.collapsed) return;
        const span = document.createElement("span");
        span.style.fontSize = px;
        range.surroundContents(span);
      }
    } else {
      document.execCommand(command, false, value);
    }
    emitChange(editorRef.current.innerHTML);
    refreshActiveStates();
  };

  const handleInput = () => {
    if (!editorRef.current) return;
    emitChange(editorRef.current.innerHTML);
    refreshActiveStates();
  };

  const handleInsertToken = (token: string) => {
    if (!editorRef.current) return;
    ensureSelectionInEditor();
    document.execCommand("insertText", false, token);
    emitChange(editorRef.current.innerHTML);
    refreshActiveStates();
  };

  const applyBlock = (block: string) => {
    applyCommandWithValue("formatBlock", block);
  };

  const insertLink = () => {
    if (!editorRef.current) return;
    const url = window.prompt("Enter URL (https://...)");
    if (!url) return;
    applyCommandWithValue("createLink", url);
  };

  const insertImage = () => {
    if (!editorRef.current) return;
    const url = window.prompt("Enter image URL (https://...)");
    if (!url) return;
    applyCommandWithValue("insertImage", url);
  };

  const insertSignature = () => {
    if (!editorRef.current || !signatureImageUrl) return;
    ensureSelectionInEditor();
    document.execCommand("insertHTML", false, `<img src="${signatureImageUrl}" style="max-height:80px;" alt="Signature" />`);
    emitChange(editorRef.current.innerHTML);
    refreshActiveStates();
  };

  const insertTable = () => {
    if (!editorRef.current) return;
    ensureSelectionInEditor();
    const rowsInput = window.prompt("Number of rows", "2");
    const colsInput = window.prompt("Number of columns", "2");
    const rows = Math.max(1, Math.min(20, Number(rowsInput) || 2));
    const cols = Math.max(1, Math.min(10, Number(colsInput) || 2));

    const bodyRows = Array.from({ length: rows })
      .map((_, rowIndex) => {
        const colsHtml = Array.from({ length: cols })
          .map((__, colIndex) => `<td style="border:1px solid #d1d5db; padding:8px;">Cell ${rowIndex + 1}.${colIndex + 1}</td>`)
          .join("");
        return `<tr>${colsHtml}</tr>`;
      })
      .join("");

    const tableHtml = `<table style="width:100%; border-collapse:collapse; margin:8px 0;"><tbody>${bodyRows}</tbody></table>`;
    document.execCommand("insertHTML", false, tableHtml);
    emitChange(editorRef.current.innerHTML);
    refreshActiveStates();
  };

  const getCurrentCell = (): HTMLTableCellElement | null => {
    if (!editorRef.current) return null;
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

  const startResize = useCallback((e: React.MouseEvent, position: string) => {
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

      if (position === 'se') {
        newW = startW + dx;
        newH = lockAspectRatio ? newW / ratio : startH + dy;
      } else if (position === 'sw') {
        newW = startW - dx;
        newH = lockAspectRatio ? newW / ratio : startH + dy;
      } else if (position === 'ne') {
        newW = startW + dx;
        newH = lockAspectRatio ? newW / ratio : startH - dy;
      } else if (position === 'nw') {
        newW = startW - dx;
        newH = lockAspectRatio ? newW / ratio : startH - dy;
      }

      newW = Math.max(50, newW);
      newH = Math.max(50, newH);

      selectedImage.style.width = `${newW}px`;
      selectedImage.style.height = `${newH}px`;
      setImageWidth(Math.round(newW));
      setImageHeight(Math.round(newH));
      emitChange(editorRef.current?.innerHTML || '');
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [selectedImage, lockAspectRatio, emitChange]);

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
    emitChange(editorRef.current?.innerHTML ?? "");
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
      insertLink();
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
  };

  useEffect(() => {
    if (!mounted) return;
    const onSelectionChange = () => refreshActiveStates();
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [mounted]);

  const toolbarBtnClass = "h-8 w-8 inline-flex items-center justify-center text-xs border rounded-md hover:bg-muted";
  const toolbarSelectClass = "h-7 px-2 text-xs border rounded bg-background";
  const groupClass = "flex items-center gap-1 rounded-md border border-border bg-background p-1";
  const toolbarButtonClass = (active: boolean) =>
    cn(toolbarBtnClass, active && "bg-primary/15 border-primary text-primary");
  const iconSize = 14;

  const pageSetupLabel = useMemo(() => {
    const paper = pageSettings.paperSize.toUpperCase();
    const orient = pageSettings.orientation === "portrait" ? "Portrait" : "Landscape";
    return `${paper} ${orient}`;
  }, [pageSettings]);

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
          <span className="text-sm text-muted-foreground">Quill Editor</span>
          <div className="flex items-center gap-3">
            {showPageSetup && (
              <span className="text-xs text-muted-foreground">
                {pageSetupLabel} · Page {currentPage} of {totalPages}
              </span>
            )}
            {showCharacterCount && (
              <span className="text-xs text-muted-foreground">
                {characterCount} characters
              </span>
            )}
          </div>
        </div>
      )}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="px-3 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
          <div className={groupClass}>
            <button type="button" onClick={() => applyCommand("undo")} className={toolbarBtnClass} title="Undo">
              <Undo2 size={iconSize} />
            </button>
            <button type="button" onClick={() => applyCommand("redo")} className={toolbarBtnClass} title="Redo">
              <Redo2 size={iconSize} />
            </button>
            <button type="button" onClick={() => applyCommand("removeFormat")} className={toolbarBtnClass} title="Clear formatting">
              <Eraser size={iconSize} />
            </button>
          </div>

          <div className={groupClass}>
            <select aria-label="Block style" defaultValue="p" onChange={(e) => applyBlock(e.target.value)} className={toolbarSelectClass}>
              <option value="p">Paragraph</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
              <option value="blockquote">Quote</option>
              <option value="pre">Code Block</option>
            </select>
            <select aria-label="Font family" defaultValue="Verdana" onChange={(e) => applyCommandWithValue("fontName", e.target.value)} className={toolbarSelectClass}>
              <option value="Verdana">Verdana</option>
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times</option>
              <option value="Georgia">Georgia</option>
              <option value="Courier New">Courier</option>
            </select>
            <select aria-label="Font size" defaultValue="3" onChange={(e) => applyCommandWithValue("fontSize", e.target.value)} className={toolbarSelectClass}>
              <option value="1">8</option>
              <option value="2">10</option>
              <option value="3">12</option>
              <option value="4">14</option>
              <option value="8">20</option>
              <option value="5">18</option>
              <option value="6">24</option>
              <option value="9">28</option>
              <option value="7">32</option>
              <option value="10">36</option>
              <option value="11">48</option>
            </select>
            <select aria-label="Line spacing" defaultValue="1.5" onChange={(e) => applyLineHeight(e.target.value)} className={toolbarSelectClass}>
              <option value="0">0</option>
              <option value="0.5">0.5</option>
              <option value="0.75">0.75</option>
              <option value="1">1.0</option>
              <option value="1.15">1.15</option>
              <option value="1.5">1.5</option>
              <option value="2">2.0</option>
              <option value="2.5">2.5</option>
              <option value="3">3.0</option>
            </select>
          </div>

          <div className={groupClass}>
            <button type="button" onClick={() => applyCommand("bold")} className={toolbarButtonClass(Boolean(activeStates.bold))} title="Bold">
              <Bold size={iconSize} />
            </button>
            <button type="button" onClick={() => applyCommand("italic")} className={toolbarButtonClass(Boolean(activeStates.italic))} title="Italic">
              <Italic size={iconSize} />
            </button>
            <button type="button" onClick={() => applyCommand("underline")} className={toolbarButtonClass(Boolean(activeStates.underline))} title="Underline">
              <Underline size={iconSize} />
            </button>
            <button type="button" onClick={() => applyCommand("strikeThrough")} className={toolbarButtonClass(Boolean(activeStates.strikeThrough))} title="Strikethrough">
              <Strikethrough size={iconSize} />
            </button>
          </div>

          <div className={groupClass}>
            <button type="button" onClick={() => applyCommand("justifyLeft")} className={toolbarButtonClass(Boolean(activeStates.justifyLeft))} title="Align left">
              <AlignLeft size={iconSize} />
            </button>
            <button type="button" onClick={() => applyCommand("justifyCenter")} className={toolbarButtonClass(Boolean(activeStates.justifyCenter))} title="Align center">
              <AlignCenter size={iconSize} />
            </button>
            <button type="button" onClick={() => applyCommand("justifyRight")} className={toolbarButtonClass(Boolean(activeStates.justifyRight))} title="Align right">
              <AlignRight size={iconSize} />
            </button>
            <button type="button" onClick={() => applyCommand("justifyFull")} className={toolbarButtonClass(Boolean(activeStates.justifyFull))} title="Justify">
              <AlignJustify size={iconSize} />
            </button>
          </div>

          <div className={groupClass}>
            <button type="button" onClick={() => applyCommand("insertOrderedList")} className={toolbarButtonClass(Boolean(activeStates.insertOrderedList))} title="Numbered list">
              <ListOrdered size={iconSize} />
            </button>
            <button type="button" onClick={() => applyCommand("insertUnorderedList")} className={toolbarButtonClass(Boolean(activeStates.insertUnorderedList))} title="Bullet list">
              <List size={iconSize} />
            </button>
            <button type="button" onClick={insertTable} className={toolbarBtnClass} title="Insert table">
              <Table2 size={iconSize} />
            </button>
            <button
              type="button"
              onClick={() => setShowTableTools((prev) => !prev)}
              className={cn("px-2 py-1 text-xs border rounded-md hover:bg-muted", showTableTools && "bg-muted")}
              title="Toggle table tools"
            >
              Table Tools
            </button>
          </div>

          {showPageSetup && (
            <div className={groupClass}>
              <button
                type="button"
                onClick={() => setShowPageSetupDialog(true)}
                className={cn("px-2 py-1 text-xs border rounded-md hover:bg-muted")}
                title="Page setup"
              >
                Page Setup
              </button>
            </div>
          )}

          <div className={groupClass}>
            <label className={cn(toolbarBtnClass, "relative cursor-pointer")} title="Text color">
              <Type size={iconSize} />
              <span className="absolute bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded bg-foreground/80" />
              <input
                type="color"
                aria-label="Text color"
                defaultValue="#111827"
                onChange={(e) => applyCommandWithValue("foreColor", e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
            <label className={cn(toolbarBtnClass, "relative cursor-pointer")} title="Highlight color">
              <Highlighter size={iconSize} />
              <span className="absolute bottom-1 left-1/2 h-1 w-4 -translate-x-1/2 rounded bg-yellow-300" />
              <input
                type="color"
                aria-label="Highlight color"
                defaultValue="#fff59d"
                onChange={(e) => applyCommandWithValue("hiliteColor", e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
          </div>

          <div className={groupClass}>
            <button type="button" onClick={insertLink} className={toolbarBtnClass} title="Insert link">
              <Link2 size={iconSize} />
            </button>
            <button type="button" onClick={() => applyCommand("unlink")} className={toolbarBtnClass} title="Remove link">
              <Unlink2 size={iconSize} />
            </button>
            {signatureImageUrl && (
              <button type="button" onClick={insertSignature} className="h-8 px-2 inline-flex items-center justify-center text-xs border rounded-md hover:bg-muted whitespace-nowrap" title="Insert signature">
                Signature
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAdvancedTools((prev) => !prev)}
              className={cn("px-2 py-1 text-xs border rounded-md hover:bg-muted", showAdvancedTools && "bg-muted")}
              title="Toggle advanced tools"
            >
              Advanced
            </button>
          </div>

          {tokens.length > 0 && (
            <div className={groupClass}>
              <button
                type="button"
                onClick={() => setShowTokenTools((prev) => !prev)}
                className={cn("px-2 py-1 text-xs border rounded-md hover:bg-muted", showTokenTools && "bg-muted")}
              >
                Tokens
              </button>
            </div>
          )}
          </div>
        </div>

        {(showAdvancedTools || showTableTools || showTokenTools) && (
          <div className="px-3 pb-2 space-y-2 border-t border-border bg-muted/20">
            {showAdvancedTools && (
              <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-background p-2">
                <button type="button" onClick={() => applyCommand("subscript")} className={toolbarButtonClass(Boolean(activeStates.subscript))} title="Subscript">
                  <Subscript size={iconSize} />
                </button>
                <button type="button" onClick={() => applyCommand("superscript")} className={toolbarButtonClass(Boolean(activeStates.superscript))} title="Superscript">
                  <Superscript size={iconSize} />
                </button>
                <button type="button" onClick={() => applyCommand("outdent")} className={toolbarBtnClass} title="Outdent">
                  <IndentDecrease size={iconSize} />
                </button>
                <button type="button" onClick={() => applyCommand("indent")} className={toolbarBtnClass} title="Indent">
                  <IndentIncrease size={iconSize} />
                </button>
                <button type="button" onClick={insertImage} className={toolbarBtnClass} title="Insert image">
                  <ImageIcon size={iconSize} />
                </button>
                <button type="button" onClick={() => applyCommand("insertHorizontalRule")} className={toolbarBtnClass} title="Insert horizontal rule">
                  ―
                </button>
                <button type="button" onClick={() => applyCommand("removeFormat")} className={toolbarBtnClass} title="Clear formatting">
                  <Eraser size={iconSize} />
                </button>
              </div>
            )}

            {showTableTools && (
              <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-background p-2">
                <button type="button" onClick={addRowBelow} className="px-2 py-1 text-xs border rounded hover:bg-muted" title="Add row below">
                  +Row
                </button>
                <button type="button" onClick={addColumnRight} className="px-2 py-1 text-xs border rounded hover:bg-muted" title="Add column right">
                  +Col
                </button>
                <button type="button" onClick={deleteCurrentRow} className="px-2 py-1 text-xs border rounded hover:bg-muted" title="Delete current row">
                  -Row
                </button>
                <button type="button" onClick={deleteCurrentColumn} className="px-2 py-1 text-xs border rounded hover:bg-muted" title="Delete current column">
                  -Col
                </button>
                <button type="button" onClick={() => resizeCurrentTable(10)} className="px-2 py-1 text-xs border rounded hover:bg-muted" title="Increase table width">
                  Wider
                </button>
                <button type="button" onClick={() => resizeCurrentTable(-10)} className="px-2 py-1 text-xs border rounded hover:bg-muted" title="Decrease table width">
                  Narrow
                </button>
                <button type="button" onClick={deleteCurrentTable} className="px-2 py-1 text-xs border rounded hover:bg-muted" title="Delete current table">
                  Del Tbl
                </button>
              </div>
            )}

            {showTokenTools && tokens.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-background p-2">
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
      <div className="bg-muted/20 p-4 relative">
        <div
          ref={editorRef}
          className={cn(
            "bg-white outline-none shadow-sm border border-border/50 mx-auto",
            "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
            "[&_li]:my-1 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2",
          )}
          style={{
            maxWidth: `${pageDims.contentWidthPx}px`,
            minHeight: `${pageDims.contentHeightPx}px`,
            padding: `${(pageSettings.marginTop / 25.4) * 96}px ${(pageSettings.marginRight / 25.4) * 96}px ${(pageSettings.marginBottom / 25.4) * 96}px ${(pageSettings.marginLeft / 25.4) * 96}px`,
            fontFamily: "Verdana, Geneva, sans-serif",
            fontSize: "12px",
            lineHeight: "1.5",
          }}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          onInput={handleInput}
          onKeyDown={onEditorKeyDown}
          onBlur={() => setTimeout(() => setSelectedImage(null), 150)}
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
        {selectedImage && (
          <div
            style={{
              position: 'absolute',
              left: selectedImage.offsetLeft - 2,
              top: selectedImage.offsetTop - 2,
              width: selectedImage.offsetWidth + 4,
              height: selectedImage.offsetHeight + 4,
              border: '2px solid #3b82f6',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            {(['nw', 'ne', 'sw', 'se'] as const).map(pos => (
              <div
                key={pos}
                className="absolute w-3 h-3 bg-white border-2 border-blue-500 pointer-events-auto"
                style={{
                  ...(pos.includes('n') ? { top: -6 } : { bottom: -6 }),
                  ...(pos.includes('w') ? { left: -6 } : { right: -6 }),
                  cursor: pos === 'nw' || pos === 'se' ? 'nwse-resize' : 'nesw-resize',
                }}
                onMouseDown={(e) => startResize(e, pos)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedImage && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-t border-border text-xs flex-wrap">
          <span className="text-muted-foreground font-medium mr-1">Image:</span>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">W:</span>
            <input
              type="number"
              value={imageWidth}
              onChange={(e) => handleWidthChange(e.target.value)}
              className="w-16 h-6 px-1 text-xs border rounded bg-background"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">H:</span>
            <input
              type="number"
              value={imageHeight}
              onChange={(e) => handleHeightChange(e.target.value)}
              className="w-16 h-6 px-1 text-xs border rounded bg-background"
            />
          </div>
          <div className="flex items-center gap-0.5 ml-1">
            <button
              type="button"
              onClick={() => setAlignment('left')}
              className={toolbarBtnClass}
              title="Align left"
            >
              <AlignLeft size={12} />
            </button>
            <button
              type="button"
              onClick={() => setAlignment('center')}
              className={toolbarBtnClass}
              title="Align center"
            >
              <AlignCenter size={12} />
            </button>
            <button
              type="button"
              onClick={() => setAlignment('right')}
              className={toolbarBtnClass}
              title="Align right"
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
    </div>
  );
}
