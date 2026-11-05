import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color, FontSize, nextFontSize } from "@/lib/tiptap-text-styles";
import { ParagraphLayout } from "@/lib/tiptap-paragraph-kit";

function createEditor(html: string) {
  return new Editor({
    extensions: [StarterKit, TextStyle, FontSize, Color, ParagraphLayout],
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

  it("sets line height on paragraph via layout kit", () => {
    const editor = createEditor("<p>Memo</p>");
    editor.commands.selectAll();
    editor.commands.setLineHeight("2");
    expect(editor.getHTML()).toMatch(/line-height:\s*2/);
    editor.destroy();
  });

  it("steps font size by 1pt for any size from 1–72", () => {
    expect(nextFontSize("12pt", 1)).toBe("13pt");
    expect(nextFontSize("12pt", -1)).toBe("11pt");
    expect(nextFontSize("13pt", 1)).toBe("14pt");
    expect(nextFontSize("1pt", -1)).toBe("1pt");
    expect(nextFontSize("72pt", 1)).toBe("72pt");
    expect(nextFontSize("16px", 1)).toBe("13pt"); // 16px ≈ 12pt → 13pt
  });

  it("sets text color on text style mark", () => {
    const editor = createEditor("<p>Memo</p>");
    editor.commands.selectAll();
    editor.commands.setColor("#c00000");
    expect(editor.getHTML()).toMatch(/color:\s*(#c00000|rgb\(\s*192,\s*0,\s*0\s*\))/i);
    editor.destroy();
  });
});
