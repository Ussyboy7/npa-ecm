import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontSize, LineHeight } from "@/lib/tiptap-text-styles";

function createEditor(html: string) {
  return new Editor({
    extensions: [StarterKit, TextStyle, FontSize, LineHeight],
    content: html,
  });
}

describe("tiptap text styles", () => {
  it("sets font size on text style mark", () => {
    const editor = createEditor("<p>Memo</p>");
    editor.commands.selectAll();
    editor.commands.setFontSize("16px");
    expect(editor.getHTML()).toContain("font-size: 16px");
    editor.destroy();
  });

  it("sets line height on paragraph", () => {
    const editor = createEditor("<p>Memo</p>");
    editor.commands.selectAll();
    editor.commands.setLineHeight("2");
    expect(editor.getHTML()).toMatch(/line-height:\s*2/);
    editor.destroy();
  });
});
