/**
 * Privacy-conscious TipTap editor operational diagnostics.
 * Never pass document bodies, patient data, credentials, or merge-token values.
 */

import { logError, logWarn } from "@/lib/client-logger";
import type { EditorEngine } from "@/lib/editor-engine";

export type EditorDiagnosticEvent =
  | "engine_selected"
  | "engine_init_failed"
  | "save_failed"
  | "sanitize_failed"
  | "print_preview_failed"
  | "pdf_failed";

export type EditorDiagnosticContext = {
  event: EditorDiagnosticEvent;
  engine?: EditorEngine;
  /** High-level workflow only, e.g. memo_compose | dms_compose | templates_hub */
  workflow?: string;
  /** Coarse document class only, e.g. memo | letter | template — never titles/bodies */
  documentKind?: string;
  reason?: string;
  /** Safe error name/message truncated; no HTML payloads */
  errorName?: string;
};

const APP_VERSION =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_VERSION) ||
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_BUILD_ID) ||
  "unknown";

function browserSummary(): string {
  if (typeof navigator === "undefined") return "ssr";
  const ua = navigator.userAgent || "";
  // Keep short product tokens only — avoid dumping full UA into structured args if huge
  if (ua.includes("Edg/")) return "edge";
  if (ua.includes("Chrome/")) return "chrome";
  if (ua.includes("Firefox/")) return "firefox";
  if (ua.includes("Safari/")) return "safari";
  return "other";
}

function truncate(value: string | undefined, max = 160): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  return cleaned.length > max ? `${cleaned.slice(0, max)}…` : cleaned;
}

/**
 * Emit a structured editor diagnostic via the existing client-logger pipeline.
 * Payload is intentionally metadata-only.
 */
export function logEditorDiagnostic(ctx: EditorDiagnosticContext): void {
  const payload = {
    source: "editor_diagnostic",
    event: ctx.event,
    engine: ctx.engine ?? null,
    workflow: truncate(ctx.workflow, 64) ?? null,
    documentKind: truncate(ctx.documentKind, 64) ?? null,
    reason: truncate(ctx.reason, 120) ?? null,
    errorName: truncate(ctx.errorName, 80) ?? null,
    appVersion: APP_VERSION,
    browser: browserSummary(),
  };

  const line = `[editor] ${ctx.event}`;
  if (
    ctx.event === "engine_init_failed" ||
    ctx.event === "save_failed" ||
    ctx.event === "sanitize_failed" ||
    ctx.event === "print_preview_failed" ||
    ctx.event === "pdf_failed"
  ) {
    logError(line, payload);
    return;
  }
  logWarn(line, payload);
}

export function safeErrorName(error: unknown): string {
  if (error instanceof Error) return truncate(error.name || "Error", 80) ?? "Error";
  return "UnknownError";
}
