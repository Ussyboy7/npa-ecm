/**
 * Re-apply Word's own paragraph/run formatting to imported .docx HTML.
 *
 * mammoth deliberately converts semantics only (headings, bold, lists) and drops
 * fonts, sizes, colours, alignment, spacing, indents and shading. Without this
 * pass an imported memo looks nothing like the file the user wrote.
 *
 * The Word body and mammoth's HTML are two views of the same paragraph sequence,
 * so paragraphs are paired by text before their formatting is layered back on.
 */
import type { WordFormattingSources } from "./word-xml";
import {
  childNamed,
  collectStyleBlocks,
  halfPointsToPt,
  isOff,
  mergeStyleAttribute,
  normalizeHexColor,
  normalizeWordText,
  styleChain,
  twipsToPt,
  wordAttr,
} from "./word-xml";

export type { WordFormattingSources } from "./word-xml";

type RunFormat = {
  fontFamily?: string;
  fontSizePt?: number;
  color?: string;
  background?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  caps?: boolean;
};

type RunSegment = {
  start: number;
  length: number;
  format: RunFormat;
};

type ParagraphFormat = {
  align?: string;
  beforePt?: number;
  afterPt?: number;
  lineHeight?: string;
  marginLeftPt?: number;
  firstLinePt?: number;
  background?: string;
};

type WordParagraph = {
  text: string;
  format: ParagraphFormat;
  runs: RunSegment[];
};

const HIGHLIGHT_COLORS: Record<string, string> = {
  black: "#000000",
  blue: "#0000ff",
  cyan: "#00ffff",
  darkBlue: "#000080",
  darkCyan: "#008080",
  darkGray: "#808080",
  darkGreen: "#008000",
  darkMagenta: "#800080",
  darkRed: "#800000",
  darkYellow: "#808000",
  green: "#00ff00",
  lightGray: "#c0c0c0",
  magenta: "#ff00ff",
  red: "#ff0000",
  white: "#ffffff",
  yellow: "#ffff00",
};

function cssFontFamily(name: string | null): string | undefined {
  if (!name) return undefined;
  const first = name.split(",")[0].trim();
  if (!first) return undefined;
  return /\s/.test(first) ? `"${first}"` : first;
}

function mergeRunFormat(base: RunFormat, rPr: Element | null): RunFormat {
  if (!rPr) return base;
  const next: RunFormat = { ...base };

  const fonts = childNamed(rPr, "rFonts");
  const family = cssFontFamily(wordAttr(fonts, "ascii") || wordAttr(fonts, "hAnsi"));
  if (family) next.fontFamily = family;

  const size = halfPointsToPt(wordAttr(childNamed(rPr, "sz"), "val"));
  if (size) next.fontSizePt = size;

  const color = normalizeHexColor(wordAttr(childNamed(rPr, "color"), "val"));
  if (color) next.color = color;

  const highlight = wordAttr(childNamed(rPr, "highlight"), "val");
  if (highlight && HIGHLIGHT_COLORS[highlight]) next.background = HIGHLIGHT_COLORS[highlight];

  const shading = normalizeHexColor(wordAttr(childNamed(rPr, "shd"), "fill"));
  if (shading) next.background = shading;

  const bold = childNamed(rPr, "b");
  if (bold) next.bold = !isOff(bold);
  const italic = childNamed(rPr, "i");
  if (italic) next.italic = !isOff(italic);
  const underline = childNamed(rPr, "u");
  if (underline) next.underline = !isOff(underline);
  const strike = childNamed(rPr, "strike");
  if (strike) next.strike = !isOff(strike);
  const caps = childNamed(rPr, "caps");
  if (caps) next.caps = !isOff(caps);

  return next;
}

function mergeParagraphFormat(base: ParagraphFormat, pPr: Element | null): ParagraphFormat {
  if (!pPr) return base;
  const next: ParagraphFormat = { ...base };

  const align = (wordAttr(childNamed(pPr, "jc"), "val") || "").toLowerCase();
  if (align === "center") next.align = "center";
  else if (align === "right" || align === "end") next.align = "right";
  else if (align === "both" || align === "distribute") next.align = "justify";
  else if (align === "left" || align === "start") next.align = "left";

  const spacing = childNamed(pPr, "spacing");
  if (spacing) {
    const before = twipsToPt(wordAttr(spacing, "before"));
    if (before !== undefined) next.beforePt = before;
    const after = twipsToPt(wordAttr(spacing, "after"));
    if (after !== undefined) next.afterPt = after;

    const line = Number.parseFloat(wordAttr(spacing, "line") || "");
    if (Number.isFinite(line) && line > 0) {
      const rule = (wordAttr(spacing, "lineRule") || "auto").toLowerCase();
      next.lineHeight =
        rule === "auto"
          ? String(Math.round((line / 240) * 1000) / 1000)
          : `${Math.round((line / 20) * 100) / 100}pt`;
    }
  }

  const ind = childNamed(pPr, "ind");
  if (ind) {
    const left = twipsToPt(wordAttr(ind, "left") ?? wordAttr(ind, "start"));
    if (left !== undefined) next.marginLeftPt = left;
    const firstLine = twipsToPt(wordAttr(ind, "firstLine"));
    const hanging = twipsToPt(wordAttr(ind, "hanging"));
    if (firstLine !== undefined) next.firstLinePt = firstLine;
    else if (hanging !== undefined) next.firstLinePt = -hanging;
  }

  const shading = normalizeHexColor(wordAttr(childNamed(pPr, "shd"), "fill"));
  if (shading) next.background = shading;

  return next;
}

function textOfRun(run: Element): string {
  let text = "";
  for (const child of Array.from(run.getElementsByTagName("*"))) {
    switch (child.localName) {
      case "t":
        text += child.textContent ?? "";
        break;
      case "noBreakHyphen":
        text += "\u2011";
        break;
      case "softHyphen":
        text += "\u00ad";
        break;
      default:
        break;
    }
  }
  return text;
}

function isInFallback(element: Element): boolean {
  let parent = element.parentElement;
  while (parent) {
    if (parent.localName === "Fallback") return true;
    parent = parent.parentElement;
  }
  return false;
}

function collectParagraphs(
  documentXml: string,
  stylesXml: string | null | undefined,
): WordParagraph[] {
  const parsed = new DOMParser().parseFromString(documentXml, "application/xml");
  if (parsed.querySelector("parsererror")) return [];

  const { defaults, byId } = collectStyleBlocks(stylesXml);
  const paragraphs: WordParagraph[] = [];

  for (const paragraph of Array.from(parsed.getElementsByTagName("*"))) {
    if (paragraph.localName !== "p") continue;
    if (isInFallback(paragraph)) continue;

    const pPr = childNamed(paragraph, "pPr");
    const paragraphStyleId = wordAttr(childNamed(pPr, "pStyle"), "val");
    const chain = styleChain(paragraphStyleId, byId);

    let paraFormat = mergeParagraphFormat({}, defaults.pPr);
    let paragraphRunBase = mergeRunFormat({}, defaults.rPr);
    for (const block of chain) {
      paraFormat = mergeParagraphFormat(paraFormat, block.pPr);
      paragraphRunBase = mergeRunFormat(paragraphRunBase, block.rPr);
    }
    paraFormat = mergeParagraphFormat(paraFormat, pPr);

    const runs: RunSegment[] = [];
    let text = "";
    for (const run of Array.from(paragraph.getElementsByTagName("*"))) {
      if (run.localName !== "r") continue;
      const runText = textOfRun(run);
      if (!runText) continue;
      const format = mergeRunFormat(paragraphRunBase, childNamed(run, "rPr"));
      runs.push({ start: text.length, length: runText.length, format });
      text += runText;
    }

    paragraphs.push({ text, format: paraFormat, runs });
  }

  return paragraphs;
}

function paragraphStyleEntries(format: ParagraphFormat): Array<[string, string | null]> {
  const entries: Array<[string, string | null]> = [];
  if (format.align) entries.push(["text-align", format.align]);
  if (format.beforePt !== undefined) {
    entries.push(["margin-top", format.beforePt > 0 ? `${format.beforePt}pt` : "0pt"]);
  }
  if (format.afterPt !== undefined) {
    entries.push(["margin-bottom", format.afterPt > 0 ? `${format.afterPt}pt` : "0pt"]);
  }
  if (format.lineHeight) entries.push(["line-height", format.lineHeight]);
  if (format.marginLeftPt !== undefined) {
    entries.push(["margin-left", format.marginLeftPt > 0 ? `${format.marginLeftPt}pt` : "0pt"]);
  }
  if (format.firstLinePt !== undefined) {
    entries.push(["text-indent", `${format.firstLinePt}pt`]);
  }
  if (format.background) entries.push(["background-color", format.background]);
  return entries;
}

function runStyleValue(format: RunFormat): string | null {
  const parts: string[] = [];
  if (format.fontFamily) parts.push(`font-family: ${format.fontFamily}`);
  if (format.fontSizePt) parts.push(`font-size: ${format.fontSizePt}pt`);
  if (format.color) parts.push(`color: ${format.color}`);
  if (format.background) parts.push(`background-color: ${format.background}`);
  if (format.caps) parts.push("text-transform: uppercase");
  return parts.length ? parts.join("; ") : null;
}

/**
 * Apply run formatting by character range: Word runs and the rendered text nodes
 * describe the same characters, so each run's styling is re-wrapped in the HTML.
 */
function applyRunFormats(doc: Document, block: Element, runs: RunSegment[]): void {
  const styled = runs.filter((run) => run.length > 0 && runStyleValue(run.format));
  if (!styled.length) return;

  const walker = doc.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  const offsets: number[] = [];
  let total = 0;
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    textNodes.push(node);
    offsets.push(total);
    total += node.data.length;
  }
  if (!textNodes.length) return;

  for (let runIndex = styled.length - 1; runIndex >= 0; runIndex -= 1) {
    const run = styled[runIndex];
    const style = runStyleValue(run.format);
    if (!style) continue;
    const start = run.start;
    const end = run.start + run.length;
    const targets: Text[] = [];

    for (let nodeIndex = textNodes.length - 1; nodeIndex >= 0; nodeIndex -= 1) {
      const nodeStart = offsets[nodeIndex];
      const nodeEnd = nodeStart + textNodes[nodeIndex].data.length;
      if (nodeEnd <= start || nodeStart >= end) continue;

      let node = textNodes[nodeIndex];
      const localEnd = Math.min(node.data.length, end - nodeStart);
      const localStart = Math.max(0, start - nodeStart);
      if (localEnd < node.data.length) node.splitText(localEnd);
      if (localStart > 0) node = node.splitText(localStart);
      if (node.data.length) targets.unshift(node);
    }

    if (!targets.length) continue;
    const span = doc.createElement("span");
    span.setAttribute("style", style);
    targets[0].parentNode?.insertBefore(span, targets[0]);
    for (const node of targets) span.appendChild(node);
  }
}

function collectBlocks(doc: Document): Element[] {
  const blocks = Array.from(
    doc.body.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li"),
  );
  return blocks.filter((block) => {
    if (block.tagName.toLowerCase() !== "li") return true;
    // A list item that wraps real blocks is represented by those blocks instead.
    return !Array.from(block.children).some((child) =>
      /^(P|DIV|UL|OL|TABLE|H[1-6]|BLOCKQUOTE|PRE)$/i.test(child.tagName),
    );
  });
}

/**
 * Layer Word's fonts, sizes, colours, alignment, spacing and indents back onto
 * mammoth's semantic HTML. Returns the input unchanged when nothing matches.
 */
export function applyWordFormatting(html: string, sources: WordFormattingSources): string {
  if (!html.trim() || !sources.documentXml.trim()) return html;

  const paragraphs = collectParagraphs(sources.documentXml, sources.stylesXml);
  if (!paragraphs.length) return html;

  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocks = collectBlocks(doc);
  let paragraphIndex = 0;

  for (const block of blocks) {
    const blockText = normalizeWordText(block.textContent || "");
    if (!blockText) continue;

    // Paragraphs can be dropped or reordered by conversion (text boxes, fields),
    // so look a little ahead instead of assuming a strict 1:1 sequence.
    let match = -1;
    for (let index = paragraphIndex; index < Math.min(paragraphs.length, paragraphIndex + 12); index += 1) {
      if (normalizeWordText(paragraphs[index].text) === blockText) {
        match = index;
        break;
      }
    }
    if (match < 0) continue;
    paragraphIndex = match + 1;

    const paragraph = paragraphs[match];
    const entries = paragraphStyleEntries(paragraph.format);
    const formats = paragraph.runs.map((run) => ({ ...run.format }));

    // Formatting shared by every run belongs on the block, not repeated per span.
    const shared = <K extends keyof RunFormat>(key: K): RunFormat[K] | undefined => {
      const first = formats[0]?.[key];
      if (first === undefined || first === null) return undefined;
      if (!formats.every((format) => format[key] === first)) return undefined;
      for (const format of formats) delete format[key];
      return first;
    };

    const fontFamily = shared("fontFamily");
    if (fontFamily) entries.push(["font-family", fontFamily]);
    const fontSizePt = shared("fontSizePt");
    if (fontSizePt) entries.push(["font-size", `${fontSizePt}pt`]);
    const color = shared("color");
    if (color) entries.push(["color", color]);
    const background = shared("background");
    if (background) entries.push(["background-color", background]);

    mergeStyleAttribute(block, entries);

    if (paragraph.runs.length) {
      applyRunFormats(
        doc,
        block,
        paragraph.runs.map((run, index) => ({ ...run, format: formats[index] })),
      );
    }
  }

  return doc.body.innerHTML;
}
