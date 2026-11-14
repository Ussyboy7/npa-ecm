"use client";

import { useEffect, useState } from "react";
import { Lock, Scan, Search, Upload } from "lucide-react";
import { QueuePageShell } from "@/components/shared/QueuePageShell";
import { StatStrip } from "@/components/shared/StatStrip";
import { CaptureJobsPanel } from "@/components/capture/CaptureJobsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/EmptyState";
import { useSidebarVisibility } from "@/hooks/use-sidebar-visibility";

interface CaptureStats {
  active: number;
  completed: number;
}

export default function CapturePage() {
  const visibility = useSidebarVisibility();
  const [query, setQuery] = useState("");
  const [stats, setStats] = useState<CaptureStats>({ active: 0, completed: 0 });

  useEffect(() => {
    const onStats = (e: Event) => setStats((e as CustomEvent).detail as CaptureStats);
    window.addEventListener("capture:stats", onStats as EventListener);
    return () => window.removeEventListener("capture:stats", onStats as EventListener);
  }, [setStats]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("capture:search", { detail: query }));
  }, [query]);

  if (!visibility.showContentCapture) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <EmptyState
          icon={<Lock className="h-12 w-12" />}
          title="Capture isn't available"
          message="Content capture is not enabled for your role. Contact an administrator if you need access."
        />
      </div>
    );
  }

  return (
    <QueuePageShell
      title="Capture"
      subtitle="Scan or batch upload paper, then track OCR processing here."
      actions={
        <>
          <Button size="compact" onClick={() => window.dispatchEvent(new CustomEvent("capture:scan"))}>
            <Scan className="h-4 w-4" /> Scan document
          </Button>
          <Button
            variant="secondary"
            size="compact"
            onClick={() => window.dispatchEvent(new CustomEvent("capture:batch"))}
          >
            <Upload className="h-4 w-4" /> Batch upload
          </Button>
        </>
      }
      stats={
        <StatStrip
          items={[
            { key: "active", label: "Active jobs", value: stats.active },
            { key: "completed", label: "Completed", value: stats.completed },
          ]}
        />
      }
    >
      <div className="rounded-xl bg-muted/30 p-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search capture jobs"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
              aria-label="Search capture jobs"
            />
          </div>
        </div>
      </div>

      <CaptureJobsPanel />
    </QueuePageShell>
  );
}
