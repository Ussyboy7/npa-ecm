"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { highlightText } from "@/lib/search-highlight";

interface SearchHighlightBannerProps {
  query: string;
  matchField?: string;
  onDismiss?: () => void;
}

function humanMatchField(field: string): string {
  if (!field) return "content";
  if (field === "ocr_text" || field.toLowerCase().includes("ocr")) return "extracted text (OCR)";
  if (field === "title") return "title";
  if (field === "subject") return "subject";
  if (field === "description" || field === "body") return "body";
  return field.replace(/_/g, " ");
}

/** Banner when arriving from Search with ?q=…&match=… */
export function SearchHighlightBanner({
  query,
  matchField = "",
  onDismiss,
}: SearchHighlightBannerProps) {
  if (!query) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm dark:border-amber-800/50 dark:bg-amber-950/40">
      <Search className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">
          Search match: {highlightText(query, query)}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Highlighted in {humanMatchField(matchField)}. Scroll to yellow marks to see where it was found.
        </p>
      </div>
      {onDismiss ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={onDismiss}
          aria-label="Dismiss search highlight"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
