import type { Editor } from "@tiptap/react";

export type FindMatch = { from: number; to: number };

/**
 * Collect text matches in the TipTap/ProseMirror document (absolute positions).
 */
export function collectTiptapFindMatches(
  editor: Editor,
  query: string,
  matchCase: boolean,
): FindMatch[] {
  const needle = query.trim();
  if (!needle) return [];

  const matches: FindMatch[] = [];
  const hayNeedle = matchCase ? needle : needle.toLowerCase();

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const hay = matchCase ? node.text : node.text.toLowerCase();
    let start = 0;
    while (start < hay.length) {
      const idx = hay.indexOf(hayNeedle, start);
      if (idx === -1) break;
      matches.push({ from: pos + idx, to: pos + idx + needle.length });
      start = idx + Math.max(needle.length, 1);
    }
  });

  return matches;
}

export function selectTiptapMatch(editor: Editor, match: FindMatch): void {
  editor.chain().focus().setTextSelection({ from: match.from, to: match.to }).run();
}

export function replaceTiptapMatch(editor: Editor, match: FindMatch, replacement: string): void {
  editor
    .chain()
    .focus()
    .insertContentAt({ from: match.from, to: match.to }, replacement)
    .run();
}

/** Replace all matches from the end so earlier positions stay valid. */
export function replaceAllTiptapMatches(
  editor: Editor,
  query: string,
  replacement: string,
  matchCase: boolean,
): number {
  const matches = collectTiptapFindMatches(editor, query, matchCase);
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const match = matches[i];
    if (!match) continue;
    replaceTiptapMatch(editor, match, replacement);
  }
  return matches.length;
}
