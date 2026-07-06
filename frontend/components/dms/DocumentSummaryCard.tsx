"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generateDocumentSummary } from "@/lib/dms-operations";
import type { DocumentRecord } from "@/lib/dms-storage";

interface DocumentSummaryCardProps {
  document: DocumentRecord;
  onSummaryGenerated?: (summary: string) => void;
}

export function DocumentSummaryCard({ document, onSummaryGenerated }: DocumentSummaryCardProps) {
  const existingSummary = document.versions?.[document.versions.length - 1]?.summary;
  const [summary, setSummary] = useState(existingSummary || "");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateDocumentSummary(document.id);
      setSummary(result.summary);
      onSummaryGenerated?.(result.summary);
      toast.success("Document summary generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate summary");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Summary
        </CardTitle>
        <CardDescription className="text-xs">
          Extractive or LLM summary of the latest document version
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {summary ? (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{summary}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No summary yet. Generate one to preview key points from document text or OCR content.
          </p>
        )}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => void handleGenerate()} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 mr-2" />
                {summary ? "Regenerate" : "Generate Summary"}
              </>
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Requires text in the latest version. Configure OPENAI_API_KEY or ANTHROPIC_API_KEY for
          LLM summaries; otherwise an extractive summary is used.
        </p>
      </CardContent>
    </Card>
  );
}
