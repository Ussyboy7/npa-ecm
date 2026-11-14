/**
 * Shared public props for RichTextEditor (TipTap).
 * Call sites import these via `@/components/dms/RichTextEditor`.
 */

export interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string, json: unknown) => void;
  placeholder?: string;
  className?: string;
  tokens?: { label: string; value: string }[];
  showCharacterCount?: boolean;
  showHeader?: boolean;
  signatureImageUrl?: string;
  showPageSetup?: boolean;
  showPageNumbers?: boolean;
  /** Let the paper grow with its content instead of scrolling inside a fixed box. */
  autoGrow?: boolean;
  /**
   * Replace the wrapping ribbon with the compact strip of primary tools plus
   * the "More" popover. Defaults to `autoGrow`, so a growing page never has to
   * scroll its toolbar sideways.
   */
  compactToolbar?: boolean;
}
