"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { generateDocumentSummary } from "@/lib/dms-operations";
import type { DocumentRecord } from "@/lib/api/dms";

interface DocumentSummaryCardProps {
  document: DocumentRecord;
  onSummaryGenerated?: (summary: string) => void;
  compact?: boolean;
}

export function DocumentSummaryCard({ document, onSummaryGenerated, compact = false }: DocumentSummaryCardProps) {
  const existingSummary = document.versions?.[document.versions.length - 1]?.summary;
  const [summary, setSummary] = useState(existingSummary || "");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setSummary(existingSummary || "");
  }, [existingSummary, document.id]);

  const handleGenerate = async (openAfter = true) => {
    setLoading(true);
    try {
      const result = await generateDocumentSummary(document.id);
      setSummary(result.summary);
      onSummaryGenerated?.(result.summary);
      toast.success("Document summary generated");
      if (openAfter) setModalOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate summary");
    } finally {
      setLoading(false);
    }
  };

  const summaryModal = (
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      <DialogContent size="lg" height="fill" className="max-h-[min(70vh,640px)]">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Document summary
          </DialogTitle>
          <DialogDescription className="truncate">{document.title}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border border-border/50 bg-muted/20 px-3 py-3">
          {summary ? (
            <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
              {summary}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No summary yet. Generate one from the document text or OCR content.
            </p>
          )}
        </div>
        <DialogFooter className="shrink-0 gap-2 sm:justify-between">
          <p className="text-[10px] text-muted-foreground self-center hidden sm:block">
            Uses extractive summary unless an LLM API key is configured.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleGenerate(false)}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 mr-2" />
                {summary ? "Regenerate" : "Generate"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (compact) {
    return (
      <>
        <div className="rounded-xl bg-muted/30 px-3 py-2.5 space-y-2 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <p className="text-[13px] font-semibold tracking-tight flex items-center gap-1.5 min-w-0 truncate">
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
              Summary
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs shrink-0"
              onClick={() => void handleGenerate(true)}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : summary ? "Regen" : "Generate"}
            </Button>
          </div>
          {summary ? (
            <>
              <p className="text-xs text-muted-foreground break-words line-clamp-2">
                {summary}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs"
                onClick={() => setModalOpen(true)}
              >
                View full summary
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No summary yet.</p>
          )}
        </div>
        {summaryModal}
      </>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border/60">
        <div className="pb-2 pt-4 px-4 border-b border-border/60">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Summary
          </p>
          <p className="text-xs text-muted-foreground">
            Extractive or LLM summary of the latest document version
          </p>
        </div>
        <div className="px-4 pb-4 space-y-3">
          {summary ? (
            <>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                {summary}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
                  View full summary
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void handleGenerate(true)} disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Regenerate"
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                No summary yet. Generate one to preview key points from document text or OCR content.
              </p>
              <Button size="sm" variant="outline" onClick={() => void handleGenerate(true)} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 mr-2" />
                    Generate Summary
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
      {summaryModal}
    </>
  );
}
