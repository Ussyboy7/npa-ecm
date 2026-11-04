import { beforeEach, describe, expect, it, vi } from "vitest";

const logError = vi.fn();
const logWarn = vi.fn();

vi.mock("@/lib/client-logger", () => ({
  logError: (...args: unknown[]) => logError(...args),
  logWarn: (...args: unknown[]) => logWarn(...args),
}));

describe("logEditorDiagnostic", () => {
  beforeEach(() => {
    logError.mockClear();
    logWarn.mockClear();
  });

  it("logs failures via logError without document bodies", async () => {
    const { logEditorDiagnostic } = await import("@/lib/editor-diagnostics");
    logEditorDiagnostic({
      event: "sanitize_failed",
      engine: "tiptap",
      workflow: "tiptap_emit",
      errorName: "TypeError",
      reason: "unit_test",
    });
    expect(logError).toHaveBeenCalledTimes(1);
    const payload = logError.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.source).toBe("editor_diagnostic");
    expect(payload.event).toBe("sanitize_failed");
    expect(JSON.stringify(payload)).not.toMatch(/<p>|<table|patient|password/i);
  });

  it("logs selection via logWarn", async () => {
    const { logEditorDiagnostic } = await import("@/lib/editor-diagnostics");
    logEditorDiagnostic({
      event: "engine_selected",
      engine: "tiptap",
      workflow: "rich_text_editor",
    });
    expect(logWarn).toHaveBeenCalledTimes(1);
  });
});
