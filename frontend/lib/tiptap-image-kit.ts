/**
 * Image attrs for Word-feel size / align / wrap theater (CSS float, not absolute position).
 */
import Image from "@tiptap/extension-image";
import type { CommandProps, Editor } from "@tiptap/core";

export type ImageFloat = "none" | "left" | "right";
export type ImageAlign = "left" | "center" | "right";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    npaImage: {
      setImageWidth: (width: string | null) => ReturnType;
      setImageFloat: (float: ImageFloat) => ReturnType;
      setImageAlign: (align: ImageAlign) => ReturnType;
    };
  }
}

function mergeImgStyle(
  existing: string | null | undefined,
  patch: Record<string, string | null>,
): string | null {
  const map = new Map<string, string>();
  for (const part of (existing || "").split(";")) {
    const idx = part.indexOf(":");
    if (idx < 0) continue;
    const prop = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();
    if (prop && value) map.set(prop, value);
  }
  for (const [prop, value] of Object.entries(patch)) {
    if (value === null || value === "") map.delete(prop);
    else map.set(prop, value);
  }
  if (map.size === 0) return null;
  return Array.from(map.entries())
    .map(([prop, value]) => `${prop}: ${value}`)
    .join("; ");
}

export const IMAGE_WIDTH_PRESETS = [
  { id: "25", label: "25%", width: "25%" },
  { id: "50", label: "50%", width: "50%" },
  { id: "75", label: "75%", width: "75%" },
  { id: "100", label: "100%", width: "100%" },
] as const;

export function isImageSelected(editor: Editor): boolean {
  return editor.isActive("image");
}

export function getSelectedImageAttrs(editor: Editor): {
  style: string;
  width: string | null;
  float: ImageFloat;
  align: ImageAlign;
} {
  const attrs = editor.getAttributes("image") as { style?: string };
  const style = attrs.style || "";
  const width = style.match(/(?:^|;)\s*width:\s*([^;]+)/i)?.[1]?.trim() || null;
  const floatMatch = style.match(/float:\s*(left|right)/i)?.[1] as ImageFloat | undefined;
  const float: ImageFloat = floatMatch || "none";
  let align: ImageAlign = "left";
  if (/margin-left:\s*auto/i.test(style) && /margin-right:\s*auto/i.test(style)) {
    align = "center";
  } else if (/margin-left:\s*auto/i.test(style) || /float:\s*right/i.test(style)) {
    align = "right";
  } else if (/float:\s*left/i.test(style)) {
    align = "left";
  }
  return { style, width, float, align };
}

export const NpaImage = Image.extend({
  name: "image",
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("style"),
        renderHTML: (attributes: { style?: string | null }) => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        },
      },
    };
  },
  addCommands() {
    return {
      ...this.parent?.(),
      setImageWidth:
        (width: string | null) =>
        ({ editor, commands }: CommandProps) => {
          if (!editor.isActive("image")) return false;
          const current = (editor.getAttributes("image").style as string | undefined) || null;
          const style = mergeImgStyle(current, {
            width,
            height: width ? "auto" : null,
            "max-width": width ? "100%" : null,
          });
          return commands.updateAttributes("image", { style });
        },
      setImageFloat:
        (float: ImageFloat) =>
        ({ editor, commands }: CommandProps) => {
          if (!editor.isActive("image")) return false;
          const current = (editor.getAttributes("image").style as string | undefined) || null;
          if (float === "none") {
            const style = mergeImgStyle(current, {
              float: null,
              display: null,
              "margin-left": null,
              "margin-right": null,
            });
            return commands.updateAttributes("image", { style });
          }
          const style = mergeImgStyle(current, {
            float,
            display: "inline",
            "margin-left": float === "right" ? "0.75rem" : "0",
            "margin-right": float === "left" ? "0.75rem" : "0",
          });
          return commands.updateAttributes("image", { style });
        },
      setImageAlign:
        (align: ImageAlign) =>
        ({ editor, commands }: CommandProps) => {
          if (!editor.isActive("image")) return false;
          const current = (editor.getAttributes("image").style as string | undefined) || null;
          if (align === "center") {
            const style = mergeImgStyle(current, {
              float: null,
              display: "block",
              "margin-left": "auto",
              "margin-right": "auto",
            });
            return commands.updateAttributes("image", { style });
          }
          if (align === "right") {
            const style = mergeImgStyle(current, {
              float: null,
              display: "block",
              "margin-left": "auto",
              "margin-right": "0",
            });
            return commands.updateAttributes("image", { style });
          }
          const style = mergeImgStyle(current, {
            float: null,
            display: "block",
            "margin-left": "0",
            "margin-right": "auto",
          });
          return commands.updateAttributes("image", { style });
        },
    };
  },
});
