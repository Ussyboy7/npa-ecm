import DOMPurify, { type Config as DomPurifyConfig } from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param html - The HTML string to sanitize
 * @param options - Optional DOMPurify configuration
 * @returns Sanitized HTML string
 */
export const sanitizeHtml = (html: string, options?: Partial<DomPurifyConfig>): string => {
  if (typeof window === 'undefined') {
    // Server-side: return as-is (will be sanitized on client)
    return html;
  }

  const defaultOptions: DomPurifyConfig = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'img', 'table', 'thead',
      'tbody', 'tr', 'th', 'td', 'div', 'span', 'hr', 'sub', 'sup'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id', 'style', 'width', 'height',
      'colspan', 'rowspan', 'align', 'valign'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false,
    ...options,
  };

  const result = DOMPurify.sanitize(html, defaultOptions);
  return typeof result === 'string' ? result : String(result);
};

/**
 * Sanitizes HTML for rich text editor content
 * Allows more formatting options
 */
export const sanitizeRichText = (html: string): string => {
  return sanitizeHtml(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'img', 'table', 'thead',
      'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col', 'div', 'span', 'hr',
      'sub', 'sup', 'strike', 'b', 'i', 'small', 'mark', 'del', 'ins',
      'section', 'header', 'footer', 'main', 'nav', 'font',
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id', 'style', 'width', 'height',
      'colspan', 'rowspan', 'colwidth', 'align', 'valign', 'target', 'rel',
      'data-indent', 'data-color',
      'face', 'size', 'color',
    ],
  });
};

/**
 * Strip authoring colors/backgrounds so rich HTML can inherit theme text
 * (Legacy memo HTML often ships black text that is invisible on dark surfaces).
 */
export const stripInlineColorStyles = (html: string): string => {
  if (!html) return html;
  return html
    .replace(/\s*(?:color|background|background-color)\s*:\s*[^;"']+;?/gi, '')
    .replace(/\s*style\s*=\s*(["'])\s*\1/gi, '')
    .replace(/\s*color\s*=\s*(["'])[^"']*\1/gi, '');
};

/** Sanitize + neutralize hard-coded colors for themed UI surfaces. */
export const sanitizeThemedHtml = (html: string): string => {
  return sanitizeRichText(stripInlineColorStyles(html));
};

const OFFICE_PASTE_RE =
  /class\s*=\s*["']?Mso|mso-|xmlns:o\s*=|Microsoft\s+Word|urn:schemas-microsoft-com|w:WordDocument/i;

/** Style properties kept after Office paste cleanup (institutional memos, not Word chrome). */
const PASTE_STYLE_ALLOW = new Set([
  'text-align',
  'font-weight',
  'font-style',
  'font-family',
  'text-decoration',
  'font-size',
  'line-height',
  // Excel header rows are often white-on-navy; dropping color makes them unreadable.
  'color',
  // Tables / Excel BOQ paste — keep structure without Word theme chrome
  'width',
  'min-width',
  'max-width',
  'height',
  'vertical-align',
  'border',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'border-collapse',
  'border-color',
  'border-width',
  'border-style',
  'background-color',
  'padding',
  'padding-bottom',
  // Word-feel Phase 2: indent, spacing, picture wrap theater
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'text-indent',
  'float',
  'display',
]);

const EXCEL_PASTE_RE =
  /Excel\.Sheet|urn:schemas-microsoft-com:office:excel|xmlns:x=|ProgId="Excel\.Sheet"/i;

export const looksLikeOfficePaste = (html: string): boolean =>
  OFFICE_PASTE_RE.test(html) || EXCEL_PASTE_RE.test(html);

export const looksLikeExcelPaste = (html: string): boolean => EXCEL_PASTE_RE.test(html);

/** Normalize one CSS declaration for Office paste (Excel class rules + inline). */
function normalizePasteDeclaration(
  propRaw: string,
  valueRaw: string,
): { prop: string; value: string } | null {
  let prop = propRaw.trim().toLowerCase();
  let value = valueRaw.trim();
  if (!prop || !value || prop.startsWith('mso-')) return null;

  // Excel uses `background:#hex` shorthand; keep as background-color for TipTap attrs.
  if (prop === 'background' && !/url\(/i.test(value)) {
    prop = 'background-color';
    value = value.split(/\s+/)[0] || value;
  }

  if (!PASTE_STYLE_ALLOW.has(prop)) return null;

  // Excel "general" alignment is not CSS.
  if (prop === 'text-align' && /^general$/i.test(value)) return null;
  // Default Excel chrome — drop so editor theme borders can show through when absent.
  if ((prop === 'border' || prop.startsWith('border-')) && /^none$/i.test(value)) return null;
  if (prop === 'background-color' && /^(white|#fff(?:fff)?|transparent)$/i.test(value)) {
    return null;
  }

  value = value.replace(/windowtext/gi, '#000000');
  value = value.replace(/(\d+(?:\.\d+)?)pt\b/gi, (_, n: string) => {
    const px = Math.max(1, Math.round(Number.parseFloat(n) * 1.333));
    return `${px}px`;
  });

  return { prop, value };
}

function cleanStyleAttribute(style: string): string {
  return style
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const idx = part.indexOf(':');
      if (idx < 0) return '';
      const normalized = normalizePasteDeclaration(part.slice(0, idx), part.slice(idx + 1));
      return normalized ? `${normalized.prop}: ${normalized.value}` : '';
    })
    .filter(Boolean)
    .join('; ');
}

/**
 * Excel clipboard HTML puts cell borders/fills on `.xlNN` classes inside <style>.
 * Resolve those onto elements as inline styles before the stylesheet is stripped.
 */
function extractClassStyleMap(cssText: string): Map<string, string> {
  const map = new Map<string, string>();
  const css = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
  const ruleRe = /\.([A-Za-z_][\w-]*)\s*\{([^}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = ruleRe.exec(css))) {
    const className = match[1];
    const decls: string[] = [];
    for (const part of match[2].split(';')) {
      const idx = part.indexOf(':');
      if (idx < 0) continue;
      const normalized = normalizePasteDeclaration(part.slice(0, idx), part.slice(idx + 1));
      if (normalized) decls.push(`${normalized.prop}: ${normalized.value}`);
    }
    if (!decls.length) continue;
    const prev = map.get(className);
    map.set(className, prev ? `${prev}; ${decls.join('; ')}` : decls.join('; '));
  }
  return map;
}

function applyClassStylesFromMap(root: ParentNode, classMap: Map<string, string>): void {
  if (!classMap.size) return;
  root.querySelectorAll('[class]').forEach((el) => {
    const names = (el.getAttribute('class') || '').split(/\s+/).filter(Boolean);
    const fromClass: string[] = [];
    for (const name of names) {
      const styles = classMap.get(name);
      if (styles) fromClass.push(styles);
    }
    if (!fromClass.length) return;
    const existing = el.getAttribute('style') || '';
    // Class styles first; inline styles win on conflict when appended after.
    el.setAttribute('style', [...fromClass, existing].filter(Boolean).join('; '));
  });
}

function unwrapElement(el: Element): void {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

function cellHasVisibleText(cell: Element): boolean {
  return Boolean((cell.textContent || '').replace(/\u00a0/g, ' ').trim());
}

function rowCells(row: Element): Element[] {
  return Array.from(row.children).filter((el) => /^(TD|TH)$/i.test(el.tagName));
}

function cellColSpan(cell: Element): number {
  const span = Number.parseInt(cell.getAttribute('colspan') || '1', 10);
  return Number.isFinite(span) && span > 0 ? span : 1;
}

function parseCssPx(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const px = raw.trim().match(/^([\d.]+)px$/i);
  if (px) return Math.round(Number.parseFloat(px[1]));
  const num = raw.trim().match(/^([\d.]+)$/);
  if (num) return Math.round(Number.parseFloat(num[1]));
  return null;
}

function readColElementWidth(col: Element): number | null {
  return (
    parseCssPx(col.getAttribute('width')) ||
    parseCssPx(col.getAttribute('style')?.match(/width\s*:\s*([^;]+)/i)?.[1]) ||
    null
  );
}

/**
 * Excel selections left of column A still emit empty leading spacer cells.
 * TipTap builds column widths from the first row only — a colspan title with one
 * tiny width (or spacers) crushes the grid into vertical single-glyph columns.
 */
function stripUniformEmptyEdgeColumns(table: Element): number {
  let stripped = 0;
  const rows = () => Array.from(table.querySelectorAll('tr'));

  const stripLeading = () => {
    const list = rows();
    if (!list.length) return false;
    const firsts = list.map((row) => rowCells(row)[0] || null);
    if (firsts.some((cell) => !cell)) return false;
    if (!firsts.every((cell) => cell && !cellHasVisibleText(cell))) return false;
    const span0 = cellColSpan(firsts[0]!);
    if (!firsts.every((cell) => cell && cellColSpan(cell) === span0)) return false;
    firsts.forEach((cell) => cell?.remove());
    const cols = table.querySelectorAll('col');
    for (let i = 0; i < span0 && cols[0]; i += 1) cols[0].remove();
    stripped += span0;
    return true;
  };

  const stripTrailing = () => {
    const list = rows();
    if (!list.length) return false;
    const lasts = list.map((row) => {
      const cells = rowCells(row);
      return cells[cells.length - 1] || null;
    });
    if (lasts.some((cell) => !cell)) return false;
    if (!lasts.every((cell) => cell && !cellHasVisibleText(cell))) return false;
    const span0 = cellColSpan(lasts[0]!);
    if (!lasts.every((cell) => cell && cellColSpan(cell) === span0)) return false;
    lasts.forEach((cell) => cell?.remove());
    const cols = table.querySelectorAll('col');
    for (let i = 0; i < span0 && cols.length; i += 1) cols[cols.length - 1]?.remove();
    stripped += span0;
    return true;
  };

  while (stripLeading()) {
    /* keep stripping */
  }
  while (stripTrailing()) {
    /* keep stripping */
  }
  return stripped;
}

function countTableColumns(table: Element): number {
  let max = 0;
  table.querySelectorAll('tr').forEach((row) => {
    const total = rowCells(row).reduce((sum, cell) => sum + cellColSpan(cell), 0);
    if (total > max) max = total;
  });
  return max;
}

function removeWidthFromCellStyle(cell: Element): void {
  cell.removeAttribute('width');
  const style = cell.getAttribute('style');
  if (!style) return;
  const next = style
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !/^width\s*:/i.test(part))
    .join('; ');
  if (next) cell.setAttribute('style', next);
  else cell.removeAttribute('style');
}

/** TipTap reads comma-separated `colwidth` on the first row (length must match colspan). */
function applyTipTapColwidths(table: Element): void {
  const colCount = countTableColumns(table);
  if (colCount < 1) return;

  const colEls = Array.from(table.querySelectorAll('col'));
  const rawWidths = colEls.map((col) => readColElementWidth(col));
  const fallback = Math.max(56, Math.round(640 / colCount));
  const widths: number[] = [];
  for (let i = 0; i < colCount; i += 1) {
    // Excel often emits ~30–40px for Qty/Unit; floor so TipTap doesn't glyph-wrap.
    const raw = rawWidths[i];
    widths.push(raw && raw >= 24 ? Math.max(raw, 56) : fallback);
  }

  // Prefer the densest row (usually column headers) as the width authority when present.
  const rows = Array.from(table.querySelectorAll('tr'));
  const firstRow = rows[0];
  if (!firstRow) return;

  let colIdx = 0;
  rowCells(firstRow).forEach((cell) => {
    const span = cellColSpan(cell);
    const slice = widths.slice(colIdx, colIdx + span);
    while (slice.length < span) slice.push(fallback);
    cell.setAttribute('colwidth', slice.join(','));
    removeWidthFromCellStyle(cell);
    colIdx += span;
  });

  // Clear misleading single widths on other rows (TipTap only uses first-row colwidth).
  rows.slice(1).forEach((row) => {
    rowCells(row).forEach((cell) => removeWidthFromCellStyle(cell));
  });

  table.removeAttribute('width');
  const tableStyle = table.getAttribute('style') || '';
  const withoutWidth = tableStyle
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !/^width\s*:/i.test(part))
    .join('; ');
  table.setAttribute(
    'style',
    [withoutWidth, 'width: 100%', 'border-collapse: collapse'].filter(Boolean).join('; '),
  );
}

/** TipTap tables need block cell content + sane colwidth; Excel needs spacer-col cleanup. */
function normalizePastedTables(doc: Document): void {
  doc.querySelectorAll('table').forEach((table) => {
    stripUniformEmptyEdgeColumns(table);
    applyTipTapColwidths(table);

    // Drop fully empty separator rows Excel inserts between title and headers.
    table.querySelectorAll('tr').forEach((row) => {
      const cells = rowCells(row);
      if (cells.length && cells.every((cell) => !cellHasVisibleText(cell))) {
        row.remove();
      }
    });

    table.querySelectorAll('th, td').forEach((cell) => {
      const hasBlock = Array.from(cell.children).some((child) =>
        /^(P|DIV|UL|OL|TABLE|H[1-6]|PRE|BLOCKQUOTE)$/i.test(child.tagName),
      );
      if (hasBlock) return;
      const p = doc.createElement('p');
      while (cell.firstChild) p.appendChild(cell.firstChild);
      if (!(p.textContent || '').replace(/\u00a0/g, ' ').trim() && !p.querySelector('br, img')) {
        p.appendChild(doc.createElement('br'));
      }
      cell.appendChild(p);
    });
  });
}

/**
 * Strip Microsoft Word / Office junk before rich-text sanitize.
 * Safe to run on non-Office HTML (light structural cleanup only when Office markers are absent).
 */
export const cleanOfficeHtml = (html: string): string => {
  if (!html.trim() || typeof window === 'undefined') return html;

  // Keep <style> long enough to resolve Excel .xl* class rules onto cells.
  const cleaned = html
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?(?:o|w|m|v|x):\w+[^>]*>/gi, '')
    .replace(/<xml[\s\S]*?<\/xml>/gi, '');

  const doc = new DOMParser().parseFromString(cleaned, 'text/html');
  const styleText = Array.from(doc.querySelectorAll('style'))
    .map((el) => el.textContent || '')
    .join('\n');
  const classMap = extractClassStyleMap(styleText);
  applyClassStylesFromMap(doc.body, classMap);

  doc.querySelectorAll('style, script, meta, link, title, xml').forEach((el) => el.remove());

  const aggressive = looksLikeOfficePaste(html);
  const elements = Array.from(doc.body.querySelectorAll('*'));

  for (const el of elements) {
    if (aggressive) {
      el.removeAttribute('class');
      el.removeAttribute('id');
      el.removeAttribute('lang');
      el.removeAttribute('face');
      el.removeAttribute('size');
      el.removeAttribute('color');
    } else {
      const className = el.getAttribute('class') || '';
      if (/\bMso/i.test(className)) {
        el.removeAttribute('class');
      }
    }

    const style = el.getAttribute('style');
    if (style) {
      if (aggressive || /mso-/i.test(style) || classMap.size > 0) {
        const kept = cleanStyleAttribute(style);
        if (kept) el.setAttribute('style', kept);
        else el.removeAttribute('style');
      }
    }

    const tag = el.tagName.toLowerCase();
    if (tag === 'b') {
      const strong = doc.createElement('strong');
      while (el.firstChild) strong.appendChild(el.firstChild);
      el.replaceWith(strong);
    } else if (tag === 'i') {
      const em = doc.createElement('em');
      while (el.firstChild) em.appendChild(el.firstChild);
      el.replaceWith(em);
    }
  }

  normalizePastedTables(doc);

  // Unwrap empty spans left by Word after style stripping.
  doc.body.querySelectorAll('span').forEach((span) => {
    if (!span.attributes.length) unwrapElement(span);
  });

  // Drop empty paragraphs Word inserts between blocks.
  doc.body.querySelectorAll('p').forEach((p) => {
    const text = (p.textContent || '').replace(/\u00a0/g, ' ').trim();
    if (!text && !p.querySelector('img, table, br')) p.remove();
  });

  return doc.body.innerHTML;
};

/**
 * Paste pipeline for the compose editor: Office cleanup when needed, then DOMPurify.
 */
export const sanitizePastedRichText = (html: string): string => {
  return sanitizeRichText(cleanOfficeHtml(html));
};
