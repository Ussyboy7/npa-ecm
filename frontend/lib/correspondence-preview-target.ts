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

function versionHasPreview(version: { id?: string; hasFile?: boolean; contentHtml?: string | null } | undefined): boolean {
  if (!version?.id) return false;
  return Boolean(version.hasFile || (version.contentHtml && version.contentHtml.trim() !== ''));
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

  const hasCompletionPackage = Boolean(
    correspondence?.completionPackage?.versionId || correspondence?.completionPackage?.documentId,
  );
  const completionPackageFileName = hasCompletionPackage
    ? `${correspondence?.referenceNumber || 'completion-package'}.pdf`
    : undefined;

  const primaryDoc = getPrimaryLinkedDocument(linkedDocuments);
  const linkedDocumentLatestVersion = primaryDoc?.versions?.[primaryDoc.versions.length - 1];
  const linkedHasPreview = versionHasPreview(linkedDocumentLatestVersion);
  const linkedDocumentPreviewFileName = linkedDocumentLatestVersion?.fileName;

  const firstAttachment = correspondence?.attachments?.[0];
  const firstAttachmentHasFile = Boolean(firstAttachment?.hasFile || firstAttachment?.id);

  const previewFileName = selectedAttachment
    ? selectedAttachment.fileName
    : linkedHasPreview
      ? linkedDocumentPreviewFileName
      : isCompleted && hasCompletionPackage
        ? completionPackageFileName
        : firstAttachment?.fileName;

  const source: PreviewAttachmentSource = selectedAttachment
    ? 'attachment'
    : !linkedHasPreview && isCompleted && hasCompletionPackage
      ? 'completion-package'
      : 'attachment';

  return {
    selectedAttachment,
    hasCompletionPackage,
    previewFileName,
    source,
    attachmentId:
      selectedAttachment?.id ??
      (!linkedHasPreview && !(isCompleted && hasCompletionPackage) && firstAttachmentHasFile
        ? firstAttachment?.id
        : undefined),
    documentVersionId:
      !selectedAttachment && linkedDocumentLatestVersion?.id
        ? linkedDocumentLatestVersion.id
        : source === 'completion-package'
          ? correspondence?.completionPackage?.versionId
          : undefined,
    completionDocumentId: correspondence?.completionPackage?.documentId,
    completionVersionId: correspondence?.completionPackage?.versionId,
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
