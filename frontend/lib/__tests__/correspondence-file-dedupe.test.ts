import { describe, expect, it } from "vitest";
import type { DocumentRecord } from "@/lib/api/dms";
import type { CorrespondenceAttachment } from "@/lib/npa-structure";
import {
  isAutoPromotedAttachmentTwin,
  normalizeFileBaseName,
  visibleLinkedDocuments,
} from "@/lib/correspondence-file-dedupe";

const attachment = (fileName: string): CorrespondenceAttachment =>
  ({
    id: "att-1",
    fileName,
    fileType: "application/pdf",
    hasFile: true,
  }) as CorrespondenceAttachment;

const doc = (partial: Partial<DocumentRecord> & { id: string; title: string }): DocumentRecord =>
  ({
    versions: [],
    ...partial,
  }) as DocumentRecord;

describe("correspondence-file-dedupe", () => {
  it("normalizes basename without extension", () => {
    expect(normalizeFileBaseName("08012026-Project-Charter-ECMS-NPA.pdf")).toBe(
      "08012026-project-charter-ecms-npa",
    );
  });

  it("hides auto-promoted attachment-role twins that match uploads", () => {
    const twin = doc({
      id: "d1",
      title: "08012026-Project-Charter-ECMS-NPA",
      role: "attachment",
      versions: [
        {
          id: "v1",
          fileName: "08012026-Project-Charter-ECMS-NPA.pdf",
          versionNumber: 1,
        } as DocumentRecord["versions"][number],
      ],
    });
    const primary = doc({ id: "d2", title: "Memo body", role: "primary" });
    const attachments = [attachment("08012026-Project-Charter-ECMS-NPA.pdf")];

    expect(isAutoPromotedAttachmentTwin(twin, attachments)).toBe(true);
    expect(isAutoPromotedAttachmentTwin(primary, attachments)).toBe(false);
    expect(visibleLinkedDocuments([twin, primary], attachments)).toEqual([primary]);
  });

  it("keeps manually linked docs that are not attachment-role twins", () => {
    const linked = doc({
      id: "d3",
      title: "08012026-Project-Charter-ECMS-NPA",
      role: "primary",
    });
    const attachments = [attachment("08012026-Project-Charter-ECMS-NPA.pdf")];
    expect(visibleLinkedDocuments([linked], attachments)).toEqual([linked]);
  });
});
