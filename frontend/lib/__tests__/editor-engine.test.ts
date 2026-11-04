import { describe, expect, it } from "vitest";
import { resolveEditorEngine } from "@/lib/editor-engine";

describe("resolveEditorEngine (Phase 5 TipTap-only)", () => {
  it("always resolves to tip tap", () => {
    expect(resolveEditorEngine()).toBe("tiptap");
  });
});
