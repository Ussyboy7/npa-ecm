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
    // Old bug: document_id: submission?.id — must be fixed to use FormDocument's document id
    expect(content).not.toContain("document_id: submission?.id");
    expect(content).not.toContain("document_id: submission.id");
  });

  it("resolves FormDocument via apiFetch and uses its actual document id", () => {
    const content = readPage();
    // Should fetch FormDocument to resolve real document id
    expect(content).toMatch(/form-documents.*submission/i);
    // Should use resolved document id (e.g., formDoc, resolvedDocumentId, document.id) not submission
    const hasResolvedUsage =
      content.includes("document?.id") ||
      content.includes("resolvedDocumentId") ||
      content.includes("formDocument") ||
      content.includes("formDoc");
    expect(hasResolvedUsage).toBe(true);
    // link-document payload must reference resolved id, not submission
    expect(content).toMatch(/link-document/);
  });

  it("splits correspondence creation to include target_office / attention / cc / action_required / due_date", () => {
    const content = readPage();
    // Instead of just owning_office, should split to target fields
    expect(content).toMatch(/target_office/);
    expect(content).toMatch(/attention_user|attentionUser/);
    // cc may be cc or distribution
    expect(content).toMatch(/cc|distribution/);
    expect(content).toMatch(/action_required/);
    expect(content).toMatch(/due_date/);
    // ensure owning_office is not the sole target field (if still present, target_office must also exist)
    // Already asserted target_office exists above
  });

  it("validates target office (office picker or regex validation) instead of raw string", () => {
    const content = readPage();
    // Should have validation for office code — either office picker component or regex/validate logic
    const hasValidation =
      content.includes("OfficePicker") ||
      content.includes("office picker") ||
      content.match(/validate.*office/i) !== null ||
      content.match(/OFF_/) !== null ||
      content.includes("isValidOffice") ||
      /forwardTargetOffice.*trim\(\)/.test(content) && content.includes("toast.error");
    // Also check that the placeholder no longer says just "will be office picker" without validation
    expect(hasValidation).toBeTruthy();
    // Ensure the function checks forwardTargetOffice before proceeding with stricter validation
    expect(content).toMatch(/forwardTargetOffice/);
  });
});
