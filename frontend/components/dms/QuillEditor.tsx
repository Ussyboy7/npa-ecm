"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
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

interface QuillEditorProps {
  value?: string;
  onChange?: (html: string, json: unknown) => void;
  placeholder?: string;
  className?: string;
  tokens?: { label: string; value: string }[];
  showCharacterCount?: boolean;
  showHeader?: boolean;
}

export function QuillEditor({
  value = "",
  onChange,
  placeholder = "Start typing...",
  className,
  tokens = [],
  showCharacterCount = true,
  showHeader = true,
}: QuillEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [htmlValue, setHtmlValue] = useState(value);
  const [activeStates, setActiveStates] = useState<Record<string, boolean>>({});
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const [showTableTools, setShowTableTools] = useState(false);
  const [showTokenTools, setShowTokenTools] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !editorRef.current) return;
    if (value !== htmlValue) {
      setHtmlValue(value || "");
      editorRef.current.innerHTML = value || "";
    }
  }, [value, mounted, htmlValue]);

  const characterCount = useMemo(() => {
    if (typeof window === "undefined") return 0;
    const temp = window.document.createElement("div");
    temp.innerHTML = htmlValue || "";
    return (temp.textContent || "").trim().length;
  }, [htmlValue]);

  const emitChange = (nextHtml: string) => {
    setHtmlValue(nextHtml);
    onChange?.(nextHtml, { html: nextHtml, editor: "fallback-contenteditable" });
  };

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
    document.execCommand(command, false, value);
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
          {showCharacterCount && (
            <span className="text-xs text-muted-foreground">
              {characterCount} characters
            </span>
          )}
        </div>
      )}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="px-3 py-2 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
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
            <select aria-label="Font family" defaultValue="Arial" onChange={(e) => applyCommandWithValue("fontName", e.target.value)} className={toolbarSelectClass}>
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
              <option value="Courier New">Courier</option>
            </select>
            <select aria-label="Font size" defaultValue="3" onChange={(e) => applyCommandWithValue("fontSize", e.target.value)} className={toolbarSelectClass}>
              <option value="1">8</option>
              <option value="2">10</option>
              <option value="3">12</option>
              <option value="4">14</option>
              <option value="5">18</option>
              <option value="6">24</option>
              <option value="7">32</option>
            </select>
            <select aria-label="Line spacing" defaultValue="1.5" onChange={(e) => applyLineHeight(e.target.value)} className={toolbarSelectClass}>
              <option value="1">1.0</option>
              <option value="1.15">1.15</option>
              <option value="1.5">1.5</option>
              <option value="2">2.0</option>
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
      <div
        ref={editorRef}
        className={cn(
          "min-h-[260px] p-4 outline-none",
          "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
          "[&_li]:my-1 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2",
        )}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={handleInput}
        onKeyDown={onEditorKeyDown}
      />
    </div>
  );
}
