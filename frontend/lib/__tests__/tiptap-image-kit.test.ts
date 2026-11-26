import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { NpaImage, insertPicture } from "@/lib/tiptap-image-kit";

function makeEditor() {
  return new Editor({
    extensions: [StarterKit, NpaImage.configure({ inline: false, allowBase64: true })],
    content: "",
  });
}

function imageSources(editor: Editor): string[] {
  const sources: string[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === "image") sources.push(String(node.attrs.src));
    return true;
  });
  return sources;
}

function selectFirstImage(editor: Editor) {
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

describe("tiptap image kit", () => {
  it("sets width and float wrap theater attrs", () => {
    const editor = new Editor({
      extensions: [
        StarterKit,
        NpaImage.configure({ inline: false, allowBase64: true }),
      ],
      content: "",
    });
    editor
      .chain()
      .focus()
      .setImage({ src: "data:image/png;base64,aa==", alt: "pic" })
      .run();
    selectFirstImage(editor);
    editor.commands.setImageWidth("50%");
    expect(editor.getHTML()).toMatch(/width:\s*50%/);
    selectFirstImage(editor);
    editor.commands.setImageFloat("left");
    expect(editor.getHTML()).toMatch(/float:\s*left/);
    selectFirstImage(editor);
    editor.commands.setImageAlign("center");
    expect(editor.getHTML()).toMatch(/margin-left:\s*auto/);
    editor.destroy();
  });

  it("adds a picture beside the selected one instead of replacing it", () => {
    const editor = makeEditor();
    insertPicture(editor, { src: "data:image/png;base64,aa==", alt: "Pasted picture" });
    // Inserting leaves the new picture selected; the next insert must still add.
    insertPicture(editor, { src: "https://example.com/second.png", alt: "" });
    expect(imageSources(editor)).toEqual([
      "data:image/png;base64,aa==",
      "https://example.com/second.png",
    ]);
    editor.destroy();
  });
});
