/**
 * Canonical document delivery — view / download / print.
 *
 * All stored file previews and saves must go through these helpers.
 * Never fetch raw /media file_url for server-stored documents.
 */

import { apiFetch, hasTokens } from '@/lib/api-client';
import { ERROR_AUTHENTICATION_REQUIRED } from '@/lib/constants';
import {
  downloadDocumentVersion,
  fetchDocumentVersionContent,
  fetchDocumentVersionPrint,
} from '@/lib/dms-documents';
import {
  downloadCorrespondenceAttachment,
  fetchCorrespondenceAttachmentContent,
} from '@/lib/correspondence-url-utils';
import { downloadCaseCompletionPackage } from '@/lib/api/cases';

export type CanonicalDocRef =
  | { kind: 'dms-version'; versionId: string; fileName?: string }
  | { kind: 'corr-attachment'; attachmentId: string; fileName?: string }
  | { kind: 'case-package'; caseId: string; fileName?: string }
  | { kind: 'html'; html: string; fileName?: string };

export function canonicalDocLabel(ref: CanonicalDocRef): string {
  if (ref.kind === 'html') return ref.fileName?.trim() || 'Document';
  return ref.fileName?.trim() || 'document';
}

function assertAuth(): void {
  if (!hasTokens()) throw new Error(ERROR_AUTHENTICATION_REQUIRED);
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const saveBlob = new Blob([blob], { type: 'application/octet-stream' });
  const blobUrl = URL.createObjectURL(saveBlob);
  const link = window.document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  link.rel = 'noopener';
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 2_000);
}

/**
 * Print a PDF without opening it in the browser PDF viewer (no Download/Drive chrome).
 * Renders pages via pdf.js into a blank window, then invokes the system print dialog.
 */
async function openPrintBlob(blob: Blob): Promise<void> {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Allow pop-ups to print this document');
  }

  printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Print</title>
<style>
  html, body { margin: 0; padding: 0; background: #fff; }
  .page { page-break-after: always; text-align: center; }
  .page:last-child { page-break-after: auto; }
  img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
  @media print {
    .page { page-break-after: always; }
    .page:last-child { page-break-after: auto; }
  }
</style></head><body><p style="font:14px sans-serif;padding:24px;color:#666">Preparing print…</p></body></html>`);
  printWindow.document.close();

  try {
    const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;

    const data = await blob.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: data.slice(0) }).promise;
    const body = printWindow.document.body;
    body.replaceChildren();

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = printWindow.document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not available for print');
      await page.render({ canvasContext: ctx, viewport }).promise;

      const wrap = printWindow.document.createElement('div');
      wrap.className = 'page';
      const img = printWindow.document.createElement('img');
      img.src = canvas.toDataURL('image/png');
      img.alt = `Page ${pageNum}`;
      wrap.appendChild(img);
      body.appendChild(wrap);
    }

    await pdf.destroy();
    printWindow.focus();
    // Allow images to decode before print dialog.
    await new Promise<void>((resolve) => {
      window.setTimeout(() => resolve(), 250);
    });
    printWindow.print();
  } catch (err) {
    try {
      printWindow.close();
    } catch {
      // ignore
    }
    throw err instanceof Error ? err : new Error('Failed to prepare print preview');
  }
}

function openPrintHtml(html: string, title: string): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Allow pop-ups to print this document');
  }
  printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title></head><body>${html}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

/** Force-save a generated PDF blob (no browser PDF viewer). */
export function downloadPdfBlob(blob: Blob, fileName: string): void {
  const name = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  triggerBlobDownload(blob, name);
}

/** Print a PDF blob via canvas pages (no browser PDF chrome). */
export async function printPdfBlob(blob: Blob): Promise<void> {
  await openPrintBlob(blob);
}

/** Preview/inline bytes (logs view on DMS versions). */
export async function fetchCanonicalContent(ref: CanonicalDocRef): Promise<Blob> {
  assertAuth();
  switch (ref.kind) {
    case 'dms-version':
      return fetchDocumentVersionContent(ref.versionId);
    case 'corr-attachment':
      return fetchCorrespondenceAttachmentContent(ref.attachmentId);
    case 'case-package': {
      return apiFetch<Blob>(`/correspondence/cases/${ref.caseId}/completion-package/download/`, {
        responseType: 'blob',
      });
    }
    case 'html':
      return new Blob([ref.html], { type: 'text/html;charset=utf-8' });
    default: {
      const _exhaustive: never = ref;
      throw new Error(`Unsupported document ref: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

/** Print-ready bytes (logs print / attempted-print on DMS versions). */
export async function fetchCanonicalPrint(ref: CanonicalDocRef): Promise<Blob> {
  assertAuth();
  switch (ref.kind) {
    case 'dms-version':
      return fetchDocumentVersionPrint(ref.versionId);
    case 'corr-attachment':
      return apiFetch<Blob>(`/correspondence/attachments/${ref.attachmentId}/print/`, {
        responseType: 'blob',
      });
    case 'case-package':
      // Case packages reuse download stream; print accountability is via client print open.
      return fetchCanonicalContent(ref);
    case 'html':
      return fetchCanonicalContent(ref);
    default: {
      const _exhaustive: never = ref;
      throw new Error(`Unsupported document ref: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

/** Force a file save through DRM-aware download endpoints. */
export async function downloadCanonicalDocument(ref: CanonicalDocRef): Promise<void> {
  assertAuth();
  const fileName = canonicalDocLabel(ref);
  switch (ref.kind) {
    case 'dms-version':
      await downloadDocumentVersion(ref.versionId, fileName);
      return;
    case 'corr-attachment':
      await downloadCorrespondenceAttachment(ref.attachmentId, fileName);
      return;
    case 'case-package':
      await downloadCaseCompletionPackage(ref.caseId, fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
      return;
    case 'html': {
      const blob = await fetchCanonicalContent(ref);
      triggerBlobDownload(blob, fileName.endsWith('.html') ? fileName : `${fileName}.html`);
      return;
    }
    default: {
      const _exhaustive: never = ref;
      throw new Error(`Unsupported document ref: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

/** Load print stream and invoke the browser print dialog. */
export async function printCanonicalDocument(ref: CanonicalDocRef): Promise<void> {
  assertAuth();
  if (ref.kind === 'html') {
    openPrintHtml(ref.html, canonicalDocLabel(ref));
    return;
  }
  const blob = await fetchCanonicalPrint(ref);
  await openPrintBlob(blob);
}

export function isPdfFileName(fileName?: string | null, mime?: string | null): boolean {
  if (mime && mime.toLowerCase().includes('pdf')) return true;
  return Boolean(fileName?.toLowerCase().endsWith('.pdf'));
}

export function isImageFileName(fileName?: string | null, mime?: string | null): boolean {
  if (mime && mime.toLowerCase().startsWith('image/')) return true;
  return Boolean(fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i));
}

export function isDocxFileName(fileName?: string | null): boolean {
  return Boolean(fileName?.toLowerCase().endsWith('.docx'));
}
