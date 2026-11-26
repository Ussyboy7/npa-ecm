/**
 * Word-style picture chrome: grips on the left, right and bottom corners resize
 * the picture, and dragging the picture itself moves it in the memo.
 *
 * The grips only exist in the editing view. The node's `renderHTML` still emits
 * a plain `<img>`, so saved HTML, print/PDF, snippets and the searchable text
 * are unchanged.
 */
import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";

export type ImageResizeEdge = "left" | "right" | "bottom-left" | "bottom-right";

export const IMAGE_RESIZE_EDGES: ImageResizeEdge[] = [
  "left",
  "right",
  "bottom-left",
  "bottom-right",
];

/** Word keeps the picture smaller than this rather than letting it vanish. */
const MIN_WIDTH_PX = 48;
const MIN_HEIGHT_PX = 32;
/** A press has to travel this far before it becomes a move. */
const MOVE_THRESHOLD_PX = 4;

export function isCornerEdge(edge: ImageResizeEdge): boolean {
  return edge === "bottom-left" || edge === "bottom-right";
}

/** Grips that hold the picture's right edge still while the left edge moves. */
export function holdsRightEdge(edge: ImageResizeEdge): boolean {
  return edge === "left" || edge === "bottom-left";
}

export interface ResizeInput {
  edge: ImageResizeEdge;
  startWidth: number;
  startHeight: number;
  /** Pointer travel since the grip was grabbed. */
  dx: number;
  dy: number;
  /** Shift: stretch freely instead of holding the picture's aspect ratio. */
  freehand: boolean;
  /** The text column the picture has to fit in. */
  maxWidth: number;
}

export interface ResizeResult {
  width: number;
  /** null means "auto" — the browser keeps the picture's aspect ratio. */
  height: number | null;
}

/**
 * Resize from the grabbed edge: side grips change width only and the picture
 * keeps its aspect ratio; corner grips do the same unless Shift is held, when
 * the pointer's vertical travel sets the height too (Word's free stretch).
 */
export function computeResizedSize(input: ResizeInput): ResizeResult {
  const direction = holdsRightEdge(input.edge) ? -1 : 1;
  const width = clampWidth(input.startWidth + direction * input.dx, input.maxWidth);

  if (!input.freehand || !isCornerEdge(input.edge)) {
    return { width, height: null };
  }
  return {
    width,
    height: Math.max(MIN_HEIGHT_PX, Math.round(input.startHeight + input.dy)),
  };
}

function clampWidth(width: number, maxWidth: number): number {
  const ceiling = Math.max(MIN_WIDTH_PX, Math.round(maxWidth));
  return Math.max(MIN_WIDTH_PX, Math.min(Math.round(width), ceiling));
}

/** Split an inline style attribute into declarations, keeping their order. */
export function parseStyleDeclarations(style: string | null | undefined): Map<string, string> {
  const declarations = new Map<string, string>();
  for (const part of (style || "").split(";")) {
    const index = part.indexOf(":");
    if (index < 0) continue;
    const property = part.slice(0, index).trim().toLowerCase();
    const value = part.slice(index + 1).trim();
    if (property && value) declarations.set(property, value);
  }
  return declarations;
}

export function serializeStyleDeclarations(declarations: Map<string, string>): string | null {
  if (declarations.size === 0) return null;
  return Array.from(declarations.entries())
    .map(([property, value]) => `${property}: ${value}`)
    .join("; ");
}

/** Node position, or null when the picture is being torn down. */
function resolvePos(getPos: () => number | undefined): number | null {
  const pos = getPos();
  return typeof pos === "number" ? pos : null;
}

/**
 * Nearest place a whole block can sit: before or after the paragraph the
 * pointer is over, never inside its text. Inserting mid-paragraph would split
 * one paragraph into two and leave the memo in pieces.
 */
export function nearestBlockBoundary(doc: PMNode, pos: number): number {
  const $pos = doc.resolve(pos);
  // Nested content (table cells, list items) keeps ProseMirror's own choice.
  if ($pos.depth !== 1) return pos;
  const blockStart = $pos.before(1);
  const block = doc.nodeAt(blockStart);
  if (!block) return pos;
  return pos - blockStart <= block.nodeSize / 2 ? blockStart : blockStart + block.nodeSize;
}

/**
 * Move the picture to the block boundary nearest `toPos`, the same way the
 * table grip moves a table. One transaction, so one undo step.
 */
export function moveImageNode(editor: Editor, from: number, toPos: number): void {
  const { state, view } = editor;
  const node = state.doc.nodeAt(from);
  if (!node || node.type.name !== "image") return;

  const transaction = state.tr.delete(from, from + node.nodeSize);
  const mapped = transaction.mapping.map(toPos, 1);
  const snapped = nearestBlockBoundary(transaction.doc, mapped);
  // 0 is a real position: the top of the memo, before the first paragraph.
  const insertAt = Math.max(0, Math.min(snapped, transaction.doc.content.size));
  // Dropping the picture back inside its own place should not rewrite the memo.
  if (insertAt >= from && insertAt <= from + node.nodeSize) return;

  transaction.insert(insertAt, node);
  transaction.setSelection(
    NodeSelection.near(transaction.doc.resolve(Math.min(insertAt, transaction.doc.content.size))),
  );
  view.dispatch(transaction.scrollIntoView());
}

/** The selected picture, plus its place among its sibling blocks. */
function selectedImage(editor: Editor) {
  const { selection } = editor.state;
  if (!(selection instanceof NodeSelection) || selection.node.type.name !== "image") return null;
  const { $from } = selection;
  return {
    pos: selection.from,
    node: selection.node,
    parent: $from.parent,
    index: $from.index(),
  };
}

/** A paragraph with nothing in it — the editor's filler after a trailing picture. */
function isBlankParagraph(node: PMNode): boolean {
  return node.type.name === "paragraph" && node.content.size === 0;
}

/**
 * The block the picture would swap with, or null when there is nowhere to go:
 * past the first/last block, or into the blank paragraph the editor keeps
 * after a trailing picture (swapping with that would look like nothing moved).
 */
function resolveMove(editor: Editor, direction: -1 | 1) {
  const found = selectedImage(editor);
  if (!found) return null;
  const target = found.index + direction;
  if (target < 0 || target >= found.parent.childCount) return null;
  const neighbour = found.parent.child(target);
  if (isBlankParagraph(neighbour)) return null;
  return { ...found, neighbour, target };
}

/** True when the selected picture has a block above/below to swap with. */
export function canMoveSelectedImage(editor: Editor, direction: -1 | 1): boolean {
  return resolveMove(editor, direction) !== null;
}

/**
 * Move the selected picture one block up (-1) or down (1), the keyboard
 * equivalent of dragging its grip past a neighbouring block.
 *
 * The two blocks are swapped in place: deleting the picture and inserting it at
 * a text position would split the neighbouring paragraph and leave an empty one
 * behind every time the button was pressed.
 */
export function moveSelectedImage(editor: Editor, direction: -1 | 1): boolean {
  const move = resolveMove(editor, direction);
  if (!move) return false;
  const { pos, node, neighbour } = move;

  const start = direction === -1 ? pos - neighbour.nodeSize : pos;
  const end = direction === -1 ? pos + node.nodeSize : pos + node.nodeSize + neighbour.nodeSize;
  const ordered = direction === -1 ? [node, neighbour] : [neighbour, node];

  const { state, view } = editor;
  const transaction = state.tr.replaceWith(start, end, ordered);
  const imagePos = direction === -1 ? start : start + neighbour.nodeSize;
  transaction.setSelection(NodeSelection.create(transaction.doc, imagePos));
  view.dispatch(transaction.scrollIntoView());
  return true;
}

function createHandle(edge: ImageResizeEdge): HTMLSpanElement {
  const handle = document.createElement("span");
  handle.className = `npa-image-handle npa-image-handle-${edge}`;
  handle.dataset.edge = edge;
  handle.setAttribute("aria-hidden", "true");
  return handle;
}

export interface ImageNodeViewOptions {
  node: PMNode;
  editor: Editor;
  getPos: () => number | undefined;
}

export function createImageNodeView({
  node,
  editor,
  getPos,
}: ImageNodeViewOptions): {
  dom: HTMLElement;
  update: (next: PMNode) => boolean;
  selectNode: () => void;
  deselectNode: () => void;
  stopEvent: (event: Event) => boolean;
  ignoreMutation: () => boolean;
  destroy: () => void;
} {
  const dom = document.createElement("div");
  dom.className = "npa-image-node";

  const grip = document.createElement("span");
  grip.className = "npa-image-grip";
  grip.title = "Drag picture to another position";
  grip.setAttribute("aria-hidden", "true");
  dom.appendChild(grip);

  const image = document.createElement("img");
  image.draggable = false;
  dom.appendChild(image);

  const handles = IMAGE_RESIZE_EDGES.map((edge) => createHandle(edge));
  handles.forEach((handle) => dom.appendChild(handle));

  let currentNode = node;
  let press: { x: number; y: number; pos: number } | null = null;
  let ghost: HTMLElement | null = null;
  let moving = false;

  /**
   * Size and alignment live on the wrapper so percentage widths resolve
   * against the text column (not the picture), and so the grips sit exactly
   * on the picture's edges.
   */
  const applyNode = (next: PMNode) => {
    currentNode = next;
    const declarations = parseStyleDeclarations(next.attrs.style as string | null);

    image.src = String(next.attrs.src ?? "");
    image.alt = String(next.attrs.alt ?? "");
    image.title = String(next.attrs.title ?? "");

    const width = declarations.get("width");
    const height = declarations.get("height");
    const freehandHeight = height && height !== "auto" ? height : null;

    dom.style.width = width ?? "fit-content";
    dom.style.maxWidth = "100%";
    dom.style.height = freehandHeight ?? "";

    image.style.width = width ? "100%" : "";
    image.style.height = freehandHeight ? "100%" : "auto";
    image.style.display = "block";

    const float = declarations.get("float");
    const centered =
      declarations.get("margin-left") === "auto" && declarations.get("margin-right") === "auto";
    const rightAligned = declarations.get("margin-left") === "auto" && !centered;
    dom.style.float = float === "left" || float === "right" ? float : "";
    dom.style.marginLeft = centered || rightAligned ? "auto" : "";
    dom.style.marginRight = centered ? "auto" : "";

    // A left-edge drag shifts the wrapper so the opposite edge stays put.
    const marginLeft = declarations.get("margin-left");
    if (marginLeft && marginLeft !== "auto") dom.style.marginLeft = marginLeft;
  };

  applyNode(node);

  const commitStyle = (style: string | null) => {
    const pos = resolvePos(getPos);
    if (pos === null) return;
    const current = editor.state.doc.nodeAt(pos);
    if (!current) return;
    if ((current.attrs.style ?? null) === style) return;
    const transaction = editor.state.tr.setNodeMarkup(pos, undefined, {
      ...current.attrs,
      style,
    });
    editor.view.dispatch(transaction);
  };

  const startResize = (edge: ImageResizeEdge) => (event: PointerEvent) => {
    if (event.button !== 0 || !editor.isEditable) return;
    event.preventDefault();
    event.stopPropagation();

    const startRect = dom.getBoundingClientRect();
    if (!startRect.width || !startRect.height) return;

    const startDeclarations = parseStyleDeclarations(currentNode.attrs.style as string | null);
    const surfaceWidth = (editor.view.dom as HTMLElement).getBoundingClientRect().width;
    const maxWidth = surfaceWidth > 0 ? surfaceWidth : startRect.width;
    const startMarginLeft = Number.parseFloat(startDeclarations.get("margin-left") || "0") || 0;
    // Centred, right-aligned and floating pictures keep their own anchor; only
    // a plain left-aligned picture can hold its right edge while it resizes.
    const canAnchor =
      !startDeclarations.has("float") && startDeclarations.get("margin-left") !== "auto";
    const anchorEdge = holdsRightEdge(edge) && canAnchor;

    const startX = event.clientX;
    const startY = event.clientY;
    let committed = false;
    let finalWidth = startRect.width;
    let finalHeight: number | null = null;

    const move = (pointer: PointerEvent) => {
      const size = computeResizedSize({
        edge,
        startWidth: startRect.width,
        startHeight: startRect.height,
        dx: pointer.clientX - startX,
        dy: pointer.clientY - startY,
        freehand: pointer.shiftKey,
        maxWidth,
      });
      finalWidth = size.width;
      finalHeight = size.height;
      committed = true;

      dom.style.width = `${size.width}px`;
      dom.style.height = size.height === null ? "" : `${size.height}px`;
      image.style.height = size.height === null ? "auto" : "100%";
      if (anchorEdge) {
        dom.style.marginLeft = `${Math.round(startMarginLeft + (startRect.width - size.width))}px`;
      }
    };

    const finish = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      if (!committed) return;

      // Shift can be released before the pointer; the last rendered shape wins.
      const declarations = new Map(startDeclarations);
      declarations.set("width", `${Math.round(finalWidth)}px`);
      declarations.set("height", finalHeight === null ? "auto" : `${Math.round(finalHeight)}px`);
      if (anchorEdge) {
        const shifted = Math.round(startMarginLeft + (startRect.width - finalWidth));
        if (shifted === 0) declarations.delete("margin-left");
        else declarations.set("margin-left", `${shifted}px`);
      }
      commitStyle(serializeStyleDeclarations(declarations));
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  };

  handles.forEach((handle) => {
    const edge = handle.dataset.edge as ImageResizeEdge;
    handle.addEventListener("pointerdown", startResize(edge));
  });

  const onPointerMove = (event: PointerEvent) => {
    if (!press) return;
    if (!moving && Math.hypot(event.clientX - press.x, event.clientY - press.y) < MOVE_THRESHOLD_PX) {
      return;
    }
    if (!moving) {
      moving = true;
      dom.classList.add("is-moving");
      window.getSelection()?.removeAllRanges();
      const rect = dom.getBoundingClientRect();
      ghost = document.createElement("div");
      ghost.className = "npa-image-ghost";
      ghost.style.width = `${rect.width}px`;
      ghost.style.height = `${rect.height}px`;
      ghost.style.left = `${rect.left}px`;
      ghost.style.top = `${rect.top}px`;
      document.body.appendChild(ghost);
    }
    event.preventDefault();
    if (ghost) {
      const width = Number.parseFloat(ghost.style.width) || 0;
      const height = Number.parseFloat(ghost.style.height) || 0;
      ghost.style.left = `${event.clientX - width / 2}px`;
      ghost.style.top = `${event.clientY - height / 2}px`;
    }
  };

  const stopMove = () => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    ghost?.remove();
    ghost = null;
    dom.classList.remove("is-moving");
  };

  const onPointerUp = (event: PointerEvent) => {
    const wasMoving = moving;
    const start = press;
    moving = false;
    press = null;
    stopMove();
    if (!wasMoving || !start) return;
    const coords = editor.view.posAtCoords({ left: event.clientX, top: event.clientY });
    if (!coords) return;
    moveImageNode(editor, start.pos, coords.pos);
  };

  /**
   * Clicking a picture selects it, so its grip and Picture tools are reachable.
   * ProseMirror answers the same click by placing the caret beside the picture,
   * so this runs on the next tick and re-reads the position (a drag may have
   * moved the picture first).
   */
  const selectPicture = () => {
    const pos = resolvePos(getPos);
    if (pos === null) return;
    const { state, view } = editor;
    if (state.selection instanceof NodeSelection && state.selection.from === pos) return;
    view.dispatch(state.tr.setSelection(NodeSelection.create(state.doc, pos)));
    view.focus();
  };

  const onPictureClick = () => {
    window.setTimeout(selectPicture, 0);
  };

  const onPointerDown = (event: PointerEvent) => {
    // The grip sits inside the picture, so its press also bubbles to the wrapper;
    // register the gesture once.
    if (event.button !== 0 || !editor.isEditable || press) return;
    const pos = resolvePos(getPos);
    if (pos === null) return;
    press = { x: event.clientX, y: event.clientY, pos };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  dom.addEventListener("pointerdown", onPointerDown);
  grip.addEventListener("pointerdown", onPointerDown);
  dom.addEventListener("click", onPictureClick);

  return {
    dom,
    update: (next: PMNode) => {
      if (next.type !== currentNode.type) return false;
      applyNode(next);
      return true;
    },
    selectNode: () => dom.classList.add("is-selected"),
    deselectNode: () => dom.classList.remove("is-selected"),
    // Grips own their pointer events; everything else stays with ProseMirror,
    // so a plain click still selects the picture.
    stopEvent: (event: Event) =>
      Boolean(
        (event.target as HTMLElement | null)?.closest?.(".npa-image-handle, .npa-image-grip"),
      ),
    ignoreMutation: () => true,
    destroy: () => {
      dom.removeEventListener("pointerdown", onPointerDown);
      grip.removeEventListener("pointerdown", onPointerDown);
      dom.removeEventListener("click", onPictureClick);
      stopMove();
    },
  };
}
