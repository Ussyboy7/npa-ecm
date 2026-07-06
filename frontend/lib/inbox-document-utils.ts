import type { DocumentRecord } from '@/lib/dms-types';

function permissionForUser(doc: DocumentRecord, userId: string) {
  const userIdStr = String(userId);
  return doc.permissions.find((p) => p.userIds.some((id) => String(id) === userIdStr));
}

/** Documents that need more than passive read-only access belong in My Inbox. */
export function documentNeedsInboxAction(doc: DocumentRecord, userId: string): boolean {
  const permission = permissionForUser(doc, userId);
  const access = permission?.access;

  if (access === 'write' || access === 'admin') return true;

  const signatureStatus = doc.form_document?.signature_workflow?.status?.toLowerCase();
  if (signatureStatus && !['completed', 'signed', 'cancelled'].includes(signatureStatus)) {
    return true;
  }

  // Shared drafts need review even when permission is read-only.
  if (doc.status === 'draft') return true;

  return false;
}

export function filterInboxActionDocuments(docs: DocumentRecord[], userId: string) {
  return docs.filter((doc) => documentNeedsInboxAction(doc, userId));
}
