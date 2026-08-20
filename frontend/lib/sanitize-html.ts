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
      'colspan', 'rowspan', 'align', 'valign', 'target', 'rel', 'data-indent', 'data-color',
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
  'text-decoration',
  'font-size',
]);

export const looksLikeOfficePaste = (html: string): boolean => OFFICE_PASTE_RE.test(html);

function cleanStyleAttribute(style: string): string {
  return style
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const prop = part.split(':')[0]?.trim().toLowerCase();
      return Boolean(prop && PASTE_STYLE_ALLOW.has(prop));
    })
    .join('; ');
}

function unwrapElement(el: Element): void {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

/**
 * Strip Microsoft Word / Office junk before rich-text sanitize.
 * Safe to run on non-Office HTML (light structural cleanup only when Office markers are absent).
 */
export const cleanOfficeHtml = (html: string): string => {
  if (!html.trim() || typeof window === 'undefined') return html;

  let cleaned = html
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?(?:o|w|m|v|x):\w+[^>]*>/gi, '')
    .replace(/<xml[\s\S]*?<\/xml>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  const doc = new DOMParser().parseFromString(cleaned, 'text/html');
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
      if (aggressive || /mso-/i.test(style)) {
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
