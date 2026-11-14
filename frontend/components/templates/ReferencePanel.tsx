"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReferenceSchemesPanel } from "@/components/templates/ReferenceSchemesPanel";
import { ReferenceRegisterPanel } from "@/components/templates/ReferenceRegisterPanel";

type ReferenceView = "schemes" | "issued";

export function ReferencePanel({
  onStatsChange,
}: {
  onStatsChange?: (stats: { total: number; active: number; classifications: number }) => void;
}) {
  const [view, setView] = useState<ReferenceView>("schemes");

  return (
    <div className="space-y-4">
      <div
        className="inline-flex w-fit items-center gap-1 rounded-xl border border-border/60 bg-card/60 p-1"
        role="tablist"
        aria-label="Reference view"
      >
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={cn(
            "h-7 rounded-lg px-3 text-xs",
            view === "schemes" ? "bg-muted text-foreground" : "text-muted-foreground"
          )}
          role="tab"
          aria-selected={view === "schemes"}
          onClick={() => setView("schemes")}
        >
          Schemes
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={cn(
            "h-7 rounded-lg px-3 text-xs",
            view === "issued" ? "bg-muted text-foreground" : "text-muted-foreground"
          )}
          role="tab"
          aria-selected={view === "issued"}
          onClick={() => setView("issued")}
        >
          Issued numbers
        </Button>
      </div>

      {view === "schemes" ? (
        <ReferenceSchemesPanel onStatsChange={onStatsChange} />
      ) : (
        <ReferenceRegisterPanel />
      )}
    </div>
  );
}
