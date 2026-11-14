import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import {
  ParagraphLayout,
  mergeBlockStyle,
  formatPx,
  getBlockLineHeight,
  resolveSpacingPresetId,
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

  it("resolves spacing presets from margin shorthand and marks custom spacing", () => {
    const none = createEditor('<p style="margin: 0px">None</p>');
    none.commands.selectAll();
    expect(resolveSpacingPresetId(none)).toBe("none");
    none.destroy();

    const custom = createEditor('<p style="margin: 12pt 0px 8pt">Custom</p>');
    custom.commands.selectAll();
    expect(resolveSpacingPresetId(custom)).toBe("custom");
    custom.destroy();
  });

  it("clears vertical shorthand spacing but preserves horizontal margins", () => {
    const editor = createEditor('<p style="margin: 12pt 5px 8pt 7px">Memo</p>');
    editor.commands.selectAll();
    editor.commands.setParagraphSpacing(null, null);
    const html = editor.getHTML();
    expect(html).not.toMatch(/margin(?:-top|-bottom)?:/);
    expect(html).toMatch(/margin-right:\s*5px/);
    expect(html).toMatch(/margin-left:\s*7px/);
    editor.destroy();
  });

  it("uses 1.15 for default line height and reports custom line heights", () => {
    const editor = createEditor('<p>Default</p><p style="line-height: 1.07">Custom</p>');
    editor.commands.setTextSelection(2);
    expect(getBlockLineHeight(editor)).toBe("1.15");
    editor.commands.setTextSelection(editor.state.doc.content.size - 2);
    expect(getBlockLineHeight(editor)).toBe("custom");
    editor.destroy();
  });
});
