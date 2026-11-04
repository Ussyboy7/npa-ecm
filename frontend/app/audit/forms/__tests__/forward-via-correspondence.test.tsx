import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const PAGE_PATH = resolve(__dirname, "../[submissionId]/page.tsx");

function readPage() {
  return readFileSync(PAGE_PATH, "utf-8");
}

describe("forward-via-correspondence", () => {
  it("does not use submission.id as document_id for link-document", () => {
    const content = readPage();
    expect(content).not.toContain("document_id: submission?.id");
    expect(content).not.toContain("document_id: submission.id");
  });

  it("resolves FormDocument via apiFetch and uses its actual document id", () => {
    const content = readPage();
    expect(content).toMatch(/form-documents.*submission/i);
    const hasResolvedUsage =
      content.includes("document?.id") ||
      content.includes("resolvedDocumentId") ||
      content.includes("formDocument") ||
      content.includes("formDoc");
    expect(hasResolvedUsage).toBe(true);
    expect(content).toMatch(/action:\s*["']REFER["']/);
  });

  it("uses shared AuditRouteDialog and REFER payload fields", () => {
    const content = readPage();
    expect(content).toMatch(/AuditRouteDialog/);
    expect(content).toMatch(/target_office/);
    expect(content).toMatch(/parallel_recipients/);
    expect(content).toMatch(/attention_user|attentionUserId/);
    expect(content).toMatch(/cc|ccUserIds/);
    expect(content).toMatch(/action_required/);
    expect(content).toMatch(/due_date/);
  });
});
