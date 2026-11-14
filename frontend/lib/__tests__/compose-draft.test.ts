import { describe, expect, it } from "vitest";
import {
  DRAFT_STORAGE_KEY,
  clearDraft,
  firstInvalidField,
  hasUnsavedWork,
  nextTitleForFile,
  readDraft,
  titleFromFileName,
  validateComposeFields,
  writeDraft,
  type ComposeDraft,
} from "../compose-draft";

/** Minimal in-memory Storage so the tests never touch the real localStorage. */
function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    entries: () => Array.from(map.entries()),
  };
}

const VALID_DRAFT: ComposeDraft = {
  title: "Server procurement",
  documentType: "memo",
  divisionId: "div-1",
  departmentId: "dept-2",
  referenceNumber: "NPA/MOPS/2026/045",
  recipientName: "The Managing Director",
  sensitivity: "internal",
  composeMode: true,
  editorHtml: "<p>Body</p>",
  selectedTemplateId: "tpl-1",
};

describe("validateComposeFields", () => {
  const base = {
    title: "Memo",
    referenceNumber: "",
    composeMode: true,
    hasContent: true,
    hasFile: false,
  };

  it("accepts a complete compose form", () => {
    expect(validateComposeFields(base)).toEqual({});
  });

  it("requires a title on create but not on a version upload", () => {
    expect(validateComposeFields({ ...base, title: "   " })).toEqual({ title: "Title is required" });
    expect(
      validateComposeFields({ ...base, title: "", requireTitle: false }),
    ).toEqual({});
  });

  it("rejects an over-long title and reference", () => {
    expect(validateComposeFields({ ...base, title: "x".repeat(501) }).title).toMatch(/less than 500/);
    expect(
      validateComposeFields({ ...base, referenceNumber: "x".repeat(101) }).referenceNumber,
    ).toMatch(/less than 100/);
  });

  it("asks for content when composing and for a file when uploading", () => {
    expect(validateComposeFields({ ...base, hasContent: false }).content).toBe(
      "Please enter document content",
    );
    expect(validateComposeFields({ ...base, composeMode: false }).file).toBe(
      "Please select a file to upload",
    );
  });
});

describe("firstInvalidField", () => {
  const base = {
    title: "Memo",
    referenceNumber: "",
    composeMode: true,
    hasContent: true,
    hasFile: false,
  };

  it("sends the user to the title first", () => {
    expect(firstInvalidField({ ...base, title: "", hasContent: false })).toBe("title");
  });

  it("then to the editor, the file, and the reference", () => {
    expect(firstInvalidField({ ...base, hasContent: false })).toBe("content");
    expect(firstInvalidField({ ...base, composeMode: false })).toBe("file");
    expect(firstInvalidField({ ...base, referenceNumber: "x".repeat(101) })).toBe(
      "referenceNumber",
    );
  });

  it("returns null when nothing blocks submission", () => {
    expect(firstInvalidField(base)).toBeNull();
  });
});

describe("hasUnsavedWork", () => {
  const empty = { title: "", editorHtml: "", hasFile: false, referenceNumber: "", recipientName: "" };

  it("is false for an untouched form", () => {
    expect(hasUnsavedWork(empty)).toBe(false);
  });

  it("is true for any typed field, content, or chosen file", () => {
    expect(hasUnsavedWork({ ...empty, title: "Memo" })).toBe(true);
    expect(hasUnsavedWork({ ...empty, editorHtml: "<p>x</p>" })).toBe(true);
    expect(hasUnsavedWork({ ...empty, hasFile: true })).toBe(true);
    expect(hasUnsavedWork({ ...empty, recipientName: "MD" })).toBe(true);
    expect(hasUnsavedWork({ ...empty, referenceNumber: "NPA/1" })).toBe(true);
  });
});

describe("file naming", () => {
  it("turns a filename into a readable title", () => {
    expect(titleFromFileName("server_procurement-2026.docx")).toBe("Server procurement 2026");
    expect(titleFromFileName(".hidden")).toBe(".hidden");
    expect(titleFromFileName("---")).toBe("");
  });

  it("keeps a title the user already typed", () => {
    expect(nextTitleForFile("Quarterly report", "ignored.docx")).toBe("Quarterly report");
    expect(nextTitleForFile("   ", "annual_plan.pdf")).toBe("Annual plan");
  });
});

describe("draft storage", () => {
  it("round-trips a draft, including org and template choices", () => {
    const storage = fakeStorage();
    expect(writeDraft(VALID_DRAFT, storage)).toBe(true);
    expect(readDraft(storage)).toEqual(VALID_DRAFT);
  });

  it("ignores corrupt or empty records instead of throwing", () => {
    const corrupt = fakeStorage({ [DRAFT_STORAGE_KEY]: "{not json" });
    expect(readDraft(corrupt)).toBeNull();

    const blank = fakeStorage({ [DRAFT_STORAGE_KEY]: JSON.stringify({ title: "", editorHtml: "" }) });
    expect(readDraft(blank)).toBeNull();
  });

  it("fills defaults for a partial legacy record", () => {
    const legacy = fakeStorage({
      [DRAFT_STORAGE_KEY]: JSON.stringify({ title: "Old draft", editorHtml: "<p>kept</p>" }),
    });
    const draft = readDraft(legacy);
    expect(draft).toMatchObject({
      title: "Old draft",
      editorHtml: "<p>kept</p>",
      referenceNumber: "",
      recipientName: "",
      composeMode: true,
      selectedTemplateId: null,
    });
  });

  it("clears the draft and tolerates missing storage", () => {
    const storage = fakeStorage();
    writeDraft(VALID_DRAFT, storage);
    clearDraft(storage);
    expect(readDraft(storage)).toBeNull();
    expect(readDraft(null)).toBeNull();
    expect(writeDraft(VALID_DRAFT, null)).toBe(false);
  });
});
