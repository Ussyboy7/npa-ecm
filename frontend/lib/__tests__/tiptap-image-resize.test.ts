import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { NpaImage } from "@/lib/tiptap-image-kit";
import { computeResizedSize } from "@/lib/tiptap-image-nodeview";

const base = {
  startWidth: 200,
  startHeight: 100,
  dx: 0,
  dy: 0,
  freehand: false,
  maxWidth: 640,
};

describe("picture resize maths", () => {
  it("grows a picture from its right edge and keeps the aspect ratio", () => {
    expect(computeResizedSize({ ...base, edge: "right", dx: 50 })).toEqual({
      width: 250,
      height: null,
    });
  });

  it("resizes from the left edge by the same travel", () => {
    // Dragging the left grip leftwards widens the picture; the right edge stays.
    expect(computeResizedSize({ ...base, edge: "left", dx: -60 })).toEqual({
      width: 260,
      height: null,
    });
    expect(computeResizedSize({ ...base, edge: "left", dx: 40 })).toEqual({
      width: 160,
      height: null,
    });
  });

  it("holds the ratio on a corner grip unless Shift is held", () => {
    expect(computeResizedSize({ ...base, edge: "bottom-right", dx: 40, dy: 30 })).toEqual({
      width: 240,
      height: null,
    });
  });

  it("stretches freely on a corner grip with Shift", () => {
    expect(
      computeResizedSize({ ...base, edge: "bottom-right", dx: 40, dy: 30, freehand: true }),
    ).toEqual({ width: 240, height: 130 });
    expect(
      computeResizedSize({ ...base, edge: "bottom-left", dx: -40, dy: 20, freehand: true }),
    ).toEqual({ width: 240, height: 120 });
  });

  it("stays inside the text column and never collapses the picture", () => {
    expect(computeResizedSize({ ...base, edge: "right", dx: 900 }).width).toBe(640);
    expect(computeResizedSize({ ...base, edge: "left", dx: 500 }).width).toBe(48);
    expect(
      computeResizedSize({ ...base, edge: "bottom-right", dy: -500, freehand: true }).height,
    ).toBe(32);
  });
});

describe("picture node view", () => {
  function mount(content: string) {
    const element = document.createElement("div");
    document.body.appendChild(element);
    const editor = new Editor({
      element,
      extensions: [StarterKit, NpaImage.configure({ inline: false, allowBase64: true })],
      content,
    });
    return { editor, element };
  }

  it("puts a grip on each resizable edge of the picture", () => {
    const { editor, element } = mount(
      '<img src="https://example.com/pic.png" alt="Pasted picture">',
    );
    const edges = Array.from(element.querySelectorAll(".npa-image-handle")).map(
      (handle) => (handle as HTMLElement).dataset.edge,
    );
    expect(edges).toEqual(["left", "right", "bottom-left", "bottom-right"]);
    editor.destroy();
    element.remove();
  });

  it("keeps the grips out of the saved document", () => {
    const { editor, element } = mount(
      '<img src="https://example.com/pic.png" alt="Pasted picture" style="width: 50%; height: auto">',
    );
    expect(editor.getHTML()).not.toContain("npa-image-handle");
    expect(editor.getHTML()).toContain("width: 50%");
    editor.destroy();
    element.remove();
  });
});
