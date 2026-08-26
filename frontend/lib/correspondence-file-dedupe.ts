import type { DocumentRecord } from "@/lib/api/dms";
import type { CorrespondenceAttachment } from "@/lib/npa-structure";

/** Basename without extension, lowercased, for twin matching. */
export function normalizeFileBaseName(name: string | null | undefined): string {
  if (!name) return "";
  const base = name.trim().split(/[/\\]/).pop() || name.trim();
  return base.replace(/\.[^.]+$/, "").toLowerCase();
}

/**
 * Auto-promoted registration uploads use DMS role "attachment" and a title/file
 * name derived from the CorrespondenceAttachment. Hide those twins in the UI.
 */
export function isAutoPromotedAttachmentTwin(
  doc: DocumentRecord,
  attachments: CorrespondenceAttachment[],
): boolean {
  if (!attachments.length) return false;
  if (doc.role !== "attachment") return false;

  const latest = doc.versions?.[doc.versions.length - 1];
  const docKeys = new Set(
    [doc.title, latest?.fileName]
      .map((n) => normalizeFileBaseName(n))
      .filter(Boolean),
  );
  if (docKeys.size === 0) return false;

  return attachments.some((att) => {
    const key = normalizeFileBaseName(att.fileName);
    return Boolean(key && docKeys.has(key));
  });
}

/** Linked docs shown in Manage files (excludes upload auto-twins). */
export function visibleLinkedDocuments(
  linkedDocuments: DocumentRecord[],
  attachments: CorrespondenceAttachment[],
): DocumentRecord[] {
  return linkedDocuments.filter((doc) => !isAutoPromotedAttachmentTwin(doc, attachments));
}

export function findAttachmentMatchingDocument(
  doc: DocumentRecord | null | undefined,
  attachments: CorrespondenceAttachment[],
): CorrespondenceAttachment | null {
  if (!doc || !attachments.length) return null;
  const latest = doc.versions?.[doc.versions.length - 1];
  const docKeys = new Set(
    [doc.title, latest?.fileName]
      .map((n) => normalizeFileBaseName(n))
      .filter(Boolean),
  );
  if (docKeys.size === 0) return null;
  return (
    attachments.find((att) => {
      const key = normalizeFileBaseName(att.fileName);
      return Boolean(key && docKeys.has(key));
    }) ?? null
  );
}
