import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { NpaImage } from "@/lib/tiptap-image-kit";
import {
  canMoveSelectedImage,
  moveImageNode,
  moveSelectedImage,
  nearestBlockBoundary,
} from "@/lib/tiptap-image-nodeview";

function mount(content: string) {
  return new Editor({
    extensions: [StarterKit, NpaImage.configure({ inline: false, allowBase64: true })],
    content,
  });
}

function selectImage(editor: Editor) {
  let imagePos: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "image") {
      imagePos = pos;
      return false;
    }
    return true;
  });
  if (imagePos === null) throw new Error("no image");
  editor.commands.setNodeSelection(imagePos);
}

/** Block order as the document stores it (images show up as IMG). */
function blocks(editor: Editor): string[] {
  const order: string[] = [];
  editor.state.doc.forEach((node) => {
    order.push(node.type.name === "image" ? "IMG" : String(node.textContent));
  });
  return order;
}

describe("snapping a drop to a block edge", () => {
  it("picks the nearer edge of the paragraph under the pointer", () => {
    const editor = mount("<p>First paragraph</p><p>Second paragraph</p>");
    const doc = editor.state.doc;
    const paragraphEnd = doc.child(0).nodeSize;

    expect(nearestBlockBoundary(doc, 2)).toBe(0);
    expect(nearestBlockBoundary(doc, paragraphEnd - 1)).toBe(paragraphEnd);
    editor.destroy();
  });

  it("drops a dragged picture beside the paragraph instead of splitting it", () => {
    const editor = mount('<p>First paragraph</p><p>Second paragraph</p><img src="https://example.com/a.png">');
    let imagePos: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "image") {
        imagePos = pos;
        return false;
      }
      return true;
    });
    if (imagePos === null) throw new Error("no image");

    // Drop in the middle of "First paragraph".
    moveImageNode(editor, imagePos, 8);
    expect(blocks(editor).slice(0, 3)).toEqual(["IMG", "First paragraph", "Second paragraph"]);
    editor.destroy();
  });
});

describe("moving the selected picture", () => {
  it("moves a picture up past the block above it", () => {
    const editor = mount('<p>Above</p><img src="https://example.com/a.png"><p>Below</p>');
    selectImage(editor);

    expect(canMoveSelectedImage(editor, -1)).toBe(true);
    expect(moveSelectedImage(editor, -1)).toBe(true);
    expect(blocks(editor)).toEqual(["IMG", "Above", "Below"]);
    editor.destroy();
  });

  it("moves a picture down past the block below it", () => {
    const editor = mount('<p>Above</p><img src="https://example.com/a.png"><p>Below</p>');
    selectImage(editor);

    expect(canMoveSelectedImage(editor, 1)).toBe(true);
    expect(moveSelectedImage(editor, 1)).toBe(true);
    // The editor keeps a blank paragraph after a trailing picture so typing can
    // continue below it; that filler is not part of the move.
    expect(blocks(editor).slice(0, 3)).toEqual(["Above", "Below", "IMG"]);
    editor.destroy();
  });

  it("does not offer a move past the first or last block", () => {
    const editor = mount('<img src="https://example.com/a.png"><p>Only text</p>');
    selectImage(editor);
    expect(canMoveSelectedImage(editor, -1)).toBe(false);
    expect(moveSelectedImage(editor, -1)).toBe(false);
    expect(blocks(editor)).toEqual(["IMG", "Only text"]);

    moveSelectedImage(editor, 1);
    selectImage(editor);
    // Below the picture is only the editor's blank trailing paragraph.
    expect(canMoveSelectedImage(editor, 1)).toBe(false);
    expect(moveSelectedImage(editor, 1)).toBe(false);
    editor.destroy();
  });

  it("does nothing when the picture is not the selection", () => {
    const editor = mount('<p>Above</p><img src="https://example.com/a.png"><p>Below</p>');
    expect(canMoveSelectedImage(editor, 1)).toBe(false);
    expect(moveSelectedImage(editor, 1)).toBe(false);
    expect(blocks(editor)).toEqual(["Above", "IMG", "Below"]);
    editor.destroy();
  });
});
