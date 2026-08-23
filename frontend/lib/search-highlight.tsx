import React from "react";

const MARK_CLASS = "bg-yellow-200 dark:bg-yellow-800/80 text-foreground px-0.5 rounded search-hit";

/**
 * Highlights matching text in a plain string (React nodes).
 */
export function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim() || !text) {
    return text;
  }

  const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        if (part.toLowerCase() === query.toLowerCase()) {
          return (
            <mark key={index} className={MARK_CLASS}>
              {part}
            </mark>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
}

/**
 * Inject &lt;mark&gt; around query matches in HTML without touching tags.
 */
export function highlightHtml(html: string, query: string): string {
  if (!query.trim() || !html) return html;
  const escaped = escapeRegExp(query);
  const regex = new RegExp(`(${escaped})`, "gi");
  return html.replace(/(<[^>]+>)|([^<]+)/g, (match, tag: string | undefined, text: string | undefined) => {
    if (tag) return tag;
    if (!text) return match;
    return text.replace(regex, `<mark class="${MARK_CLASS}">$1</mark>`);
  });
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Query params carried from Search → detail pages. */
export const SEARCH_Q_PARAM = "q";
export const SEARCH_MATCH_PARAM = "match";

export function buildSearchHighlightParams(
  query: string,
  matchField?: string | null,
): string {
  const params = new URLSearchParams();
  const q = query.trim();
  if (q) params.set(SEARCH_Q_PARAM, q);
  const match = (matchField || "").trim();
  if (match) params.set(SEARCH_MATCH_PARAM, match);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function readSearchHighlight(
  searchParams: URLSearchParams | { get: (key: string) => string | null },
): { query: string; matchField: string } {
  return {
    query: (searchParams.get(SEARCH_Q_PARAM) || "").trim(),
    matchField: (searchParams.get(SEARCH_MATCH_PARAM) || "").trim(),
  };
}

export function isOcrMatchField(matchField: string): boolean {
  const f = matchField.toLowerCase();
  return f === "ocr_text" || f === "ocr" || f.includes("ocr");
}
