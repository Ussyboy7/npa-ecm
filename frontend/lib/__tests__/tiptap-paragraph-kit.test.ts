import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import {
  ParagraphLayout,
  mergeBlockStyle,
  formatPx,
  INDENT_STEP_PX,
} from "@/lib/tiptap-paragraph-kit";

function createEditor(html: string) {
  return new Editor({
    extensions: [StarterKit, ParagraphLayout],
    content: html,
  });
}

describe("tiptap paragraph kit", () => {
  it("merges block style patches", () => {
    expect(mergeBlockStyle("margin-left: 36px", { "margin-top": "8px" })).toContain(
      "margin-left: 36px",
    );
    expect(mergeBlockStyle("margin-left: 36px", { "margin-left": null })).toBeNull();
    expect(formatPx(INDENT_STEP_PX)).toBe("36px");
  });

  it("sets line height via style bag", () => {
    const editor = createEditor("<p>Memo</p>");
    editor.commands.selectAll();
    editor.commands.setLineHeight("2");
    expect(editor.getHTML()).toMatch(/line-height:\s*2/);
    editor.destroy();
  });

  it("increases paragraph indent", () => {
    const editor = createEditor("<p>Memo</p>");
    editor.commands.selectAll();
    editor.commands.increaseIndent();
    expect(editor.getHTML()).toMatch(/margin-left:\s*36px/);
    editor.destroy();
  });
});
