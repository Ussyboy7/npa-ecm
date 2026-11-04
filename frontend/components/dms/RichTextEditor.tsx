"use client";

/**
 * Public rich-text editor façade (Phase 5 — TipTap only).
 *
 * Call sites keep importing RichTextEditor. Internally this always mounts TipTap.
 * Legacy has been retired. Init failures show a read-only sanitized preview so
 * parent-held HTML is not discarded (reload to retry).
 */

import dynamic from "next/dynamic";
import { Component, type ErrorInfo, type ReactNode, useEffect, useRef } from "react";
import { resolveEditorEngine } from "@/lib/editor-engine";
import {
  logEditorDiagnostic,
  safeErrorName,
} from "@/lib/editor-diagnostics";
import { sanitizeRichText } from "@/lib/sanitize-html";
import type { RichTextEditorProps } from "./editor/types";

export type { RichTextEditorProps };

function EditorLoadingShell({ label }: { label: string }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="bg-muted/40 px-4 py-2 border-b border-border">
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="min-h-[260px] p-4 bg-background">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-5/6" />
        </div>
      </div>
    </div>
  );
}

function EditorFailureShell({ value }: { value?: string }) {
  const safe = sanitizeRichText(value || "");
  return (
    <div className="border border-destructive/40 rounded-lg overflow-hidden">
      <div className="bg-destructive/10 px-4 py-2 border-b border-destructive/30">
        <p className="text-sm text-destructive font-medium">Editor failed to load</p>
        <p className="text-xs text-muted-foreground mt-1">
          Your draft is preserved below as read-only. Reload the page to retry editing.
        </p>
      </div>
      <div
        className="min-h-[260px] p-4 bg-background prose prose-sm max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: safe || "<p></p>" }}
      />
    </div>
  );
}

const TiptapRichTextEditor = dynamic(
  () =>
    import("./editor/TiptapRichTextEditor").then((mod) => mod.TiptapRichTextEditor),
  {
    ssr: false,
    loading: () => <EditorLoadingShell label="Loading editor..." />,
  },
);

type TipTapBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
  onFailed: (error: Error) => void;
};

type TipTapBoundaryState = { failed: boolean };

class TipTapErrorBoundary extends Component<TipTapBoundaryProps, TipTapBoundaryState> {
  state: TipTapBoundaryState = { failed: false };

  static getDerivedStateFromError(): TipTapBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    this.props.onFailed(error);
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

export function RichTextEditor(props: RichTextEditorProps) {
  const loggedSelection = useRef(false);

  useEffect(() => {
    if (loggedSelection.current) return;
    loggedSelection.current = true;
    logEditorDiagnostic({
      event: "engine_selected",
      engine: resolveEditorEngine(),
      workflow: "rich_text_editor",
    });
  }, []);

  return (
    <TipTapErrorBoundary
      fallback={<EditorFailureShell value={props.value} />}
      onFailed={(error) => {
        logEditorDiagnostic({
          event: "engine_init_failed",
          engine: "tiptap",
          workflow: "rich_text_editor",
          errorName: safeErrorName(error),
          reason: "react_error_boundary",
        });
      }}
    >
      <TiptapRichTextEditor {...props} />
    </TipTapErrorBoundary>
  );
}
