import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import {
  collectTiptapFindMatches,
  replaceAllTiptapMatches,
} from "@/lib/tiptap-find-replace";

function createEditor(html: string) {
  return new Editor({
    extensions: [StarterKit],
    content: html,
  });
}

describe("tiptap-find-replace", () => {
  it("finds case-insensitive matches across text nodes", () => {
    const editor = createEditor("<p>NPA memo for NPA staff</p>");
    const matches = collectTiptapFindMatches(editor, "npa", false);
    expect(matches).toHaveLength(2);
    editor.destroy();
  });

  it("respects match-case", () => {
    const editor = createEditor("<p>NPA memo for npa staff</p>");
    expect(collectTiptapFindMatches(editor, "NPA", true)).toHaveLength(1);
    editor.destroy();
  });

  it("replace-all updates document text", () => {
    const editor = createEditor("<p>alpha beta alpha</p>");
    const count = replaceAllTiptapMatches(editor, "alpha", "gamma", false);
    expect(count).toBe(2);
    expect(editor.getText()).toContain("gamma");
    expect(editor.getText()).not.toContain("alpha");
    editor.destroy();
  });
});
