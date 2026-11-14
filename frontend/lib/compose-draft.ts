/**
 * Compose-draft rules for the document create flow.
 *
 * Kept free of React so the validation order, file naming, dirty check and
 * localStorage round-trip can be unit tested without mounting the dialog.
 */

export const DRAFT_STORAGE_KEY = 'dms_upload_draft';
export const MAX_TITLE_LENGTH = 500;
export const MAX_REFERENCE_LENGTH = 100;

export interface ComposeDraft {
  title: string;
  documentType?: string;
  divisionId?: string;
  departmentId?: string;
  referenceNumber: string;
  recipientName: string;
  sensitivity?: string;
  composeMode: boolean;
  editorHtml: string;
  selectedTemplateId: string | null;
}

/** Fields that can block submission, in the order the user should be sent to them. */
export type ComposeField = 'title' | 'content' | 'file' | 'referenceNumber';

export interface ComposeFieldInput {
  title: string;
  referenceNumber: string;
  composeMode: boolean;
  hasContent: boolean;
  hasFile: boolean;
  /** Version uploads do not rename the document, so their title is not required. */
  requireTitle?: boolean;
}

type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** `localStorage` in the browser, otherwise nothing (SSR, private mode). */
function defaultStorage(): DraftStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function writeDraft(draft: ComposeDraft, storage: DraftStorage | null = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

/** Reads the draft, discarding anything that isn't a usable draft object. */
export function readDraft(storage: DraftStorage | null = defaultStorage()): ComposeDraft | null {
  if (!storage) return null;
  let parsed: unknown;
  try {
    const raw = storage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const draft = parsed as Partial<ComposeDraft>;
  const title = typeof draft.title === 'string' ? draft.title : '';
  const editorHtml = typeof draft.editorHtml === 'string' ? draft.editorHtml : '';
  // An empty shell would only overwrite the form with blanks on next open.
  if (!title && !editorHtml) return null;
  return {
    title,
    documentType: typeof draft.documentType === 'string' ? draft.documentType : undefined,
    divisionId: typeof draft.divisionId === 'string' ? draft.divisionId : undefined,
    departmentId: typeof draft.departmentId === 'string' ? draft.departmentId : undefined,
    referenceNumber: typeof draft.referenceNumber === 'string' ? draft.referenceNumber : '',
    recipientName: typeof draft.recipientName === 'string' ? draft.recipientName : '',
    sensitivity: typeof draft.sensitivity === 'string' ? draft.sensitivity : undefined,
    composeMode: typeof draft.composeMode === 'boolean' ? draft.composeMode : true,
    editorHtml,
    selectedTemplateId:
      typeof draft.selectedTemplateId === 'string' ? draft.selectedTemplateId : null,
  };
}

export function clearDraft(storage: DraftStorage | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Ignore storage errors — a stale draft is harmless.
  }
}

/**
 * Title from a chosen file: drop the extension, turn separators into spaces and
 * capitalise the first letter. Returns '' when there is nothing usable.
 */
export function titleFromFileName(fileName: string): string {
  // Only strip an extension; a dotfile keeps its leading dot.
  const dot = fileName.lastIndexOf('.');
  const withoutExtension = dot > 0 ? fileName.slice(0, dot) : fileName;
  const base = withoutExtension
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!base) return '';
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/** Keep a title the user already typed; only fill a blank one. */
export function nextTitleForFile(currentTitle: string, fileName: string): string {
  return currentTitle.trim() ? currentTitle : titleFromFileName(fileName);
}

/** Field-level rules shared by the dialog and its tests. File type/size stay at the call site. */
export function validateComposeFields(input: ComposeFieldInput): Partial<Record<ComposeField, string>> {
  const errors: Partial<Record<ComposeField, string>> = {};
  const requireTitle = input.requireTitle !== false;

  if (requireTitle && !input.title.trim()) {
    errors.title = 'Title is required';
  } else if (requireTitle && input.title.length > MAX_TITLE_LENGTH) {
    errors.title = `Title must be less than ${MAX_TITLE_LENGTH} characters`;
  }

  if (input.referenceNumber.length > MAX_REFERENCE_LENGTH) {
    errors.referenceNumber = `Reference number must be less than ${MAX_REFERENCE_LENGTH} characters`;
  }

  if (input.composeMode && !input.hasContent) {
    errors.content = 'Please enter document content';
  }
  if (!input.composeMode && !input.hasFile) {
    errors.file = 'Please select a file to upload';
  }

  return errors;
}

/** Which error the page should scroll to, in reading order. */
export function firstInvalidField(input: ComposeFieldInput): ComposeField | null {
  if (input.requireTitle !== false && !input.title.trim()) return 'title';
  if (input.composeMode && !input.hasContent) return 'content';
  if (!input.composeMode && !input.hasFile) return 'file';
  if (input.referenceNumber.length > MAX_REFERENCE_LENGTH) return 'referenceNumber';
  return null;
}

/** True when leaving now would lose something the user typed or picked. */
export function hasUnsavedWork(input: {
  title: string;
  editorHtml: string;
  hasFile: boolean;
  referenceNumber: string;
  recipientName: string;
}): boolean {
  return Boolean(
    input.title.trim() ||
      input.editorHtml.trim() ||
      input.hasFile ||
      input.referenceNumber.trim() ||
      input.recipientName.trim(),
  );
}
