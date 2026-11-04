/**
 * Editor engine identity after Legacy retirement (Phase 5).
 * RichTextEditor always mounts TipTap. NEXT_PUBLIC_EDITOR_ENGINE is ignored.
 */

export type EditorEngine = "tiptap";

export function resolveEditorEngine(): EditorEngine {
  return "tiptap";
}
