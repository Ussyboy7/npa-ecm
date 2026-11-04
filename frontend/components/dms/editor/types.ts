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
}
