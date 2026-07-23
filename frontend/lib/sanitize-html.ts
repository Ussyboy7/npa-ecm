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
 * Sanitizes plain text (removes all HTML)
 */
export const sanitizeText = (text: string): string => {
  if (typeof window === 'undefined') {
    return text;
  }
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
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


