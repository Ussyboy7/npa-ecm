import { buildDownloadUrl } from '@/lib/correspondence-url-utils';
import type { Correspondence } from '@/lib/npa-structure';
import type { DocumentRecord } from '@/lib/api/dms';

export type PreviewAttachmentSource = 'attachment' | 'completion-package';

export function getPrimaryLinkedDocument(linkedDocuments: DocumentRecord[]): DocumentRecord | undefined {
  return (
    linkedDocuments.find(d => d.role === 'primary') ??
    linkedDocuments.find(d => d.versions.length > 0) ??
    linkedDocuments[0]
  );
}

export function getCorrespondencePreviewContext(
  correspondence: Correspondence | null | undefined,
  linkedDocuments: DocumentRecord[],
  selectedAttachmentIndex: number | null,
  isCompleted: boolean,
) {
  const selectedAttachment =
    selectedAttachmentIndex !== null && correspondence?.attachments?.[selectedAttachmentIndex]
      ? correspondence.attachments[selectedAttachmentIndex]
      : null;

  const completionPackageUrl = buildDownloadUrl(correspondence?.completionPackage?.fileUrl ?? null) ?? null;
  const completionPackageFileName = completionPackageUrl
    ? completionPackageUrl.split('/').filter(Boolean).pop() ||
      `${correspondence?.referenceNumber || 'completion-package'}.pdf`
    : undefined;

  const primaryDoc = getPrimaryLinkedDocument(linkedDocuments);
  const linkedDocumentLatestVersion = primaryDoc?.versions?.[primaryDoc.versions.length - 1];
  const linkedDocumentPreviewUrl = buildDownloadUrl(linkedDocumentLatestVersion?.fileUrl);
  const linkedDocumentPreviewFileName = linkedDocumentLatestVersion?.fileName;

  const previewUrl = selectedAttachment
    ? buildDownloadUrl(selectedAttachment.fileUrl)
    : linkedDocumentPreviewUrl
      ? linkedDocumentPreviewUrl
      : isCompleted && completionPackageUrl
        ? completionPackageUrl
        : buildDownloadUrl(correspondence?.attachments?.[0]?.fileUrl);

  const previewFileName = selectedAttachment
    ? selectedAttachment.fileName
    : linkedDocumentPreviewFileName
      ? linkedDocumentPreviewFileName
      : isCompleted && completionPackageUrl
        ? completionPackageFileName
        : correspondence?.attachments?.[0]?.fileName;

  const source: PreviewAttachmentSource = selectedAttachment
    ? 'attachment'
    : !linkedDocumentPreviewUrl && isCompleted && completionPackageUrl
      ? 'completion-package'
      : 'attachment';

  return {
    selectedAttachment,
    completionPackageUrl,
    previewUrl: previewUrl ?? undefined,
    previewFileName,
    source,
  };
}

export function resolveCorrespondenceDmsAccessTarget(
  correspondence: Correspondence | null | undefined,
  linkedDocuments: DocumentRecord[],
  source: PreviewAttachmentSource,
): { documentId: string; sensitivity: string } | null {
  if (source === 'completion-package' && correspondence?.completionPackage?.documentId) {
    return { documentId: correspondence.completionPackage.documentId, sensitivity: 'internal' };
  }

  const linkedDoc = getPrimaryLinkedDocument(linkedDocuments);
  if (linkedDoc?.id) {
    return { documentId: linkedDoc.id, sensitivity: linkedDoc.sensitivity ?? 'internal' };
  }

  const linkedDocId = correspondence?.linkedDocumentIds?.[0];
  if (linkedDocId) {
    return { documentId: linkedDocId, sensitivity: 'internal' };
  }

  return null;
}
