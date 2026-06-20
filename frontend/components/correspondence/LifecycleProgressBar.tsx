"use client";

import { Check, Circle, Timer, Archive, Send, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface LifecycleStage {
  key: string;
  label: string;
  index: number;
  completed: boolean;
  timestamp?: string | null;
}

interface LifecycleProgressBarProps {
  stages: LifecycleStage[];
  currentStage: number;
  className?: string;
}

const stageIcons: Record<string, React.ReactNode> = {
  pending: <Circle className="h-4 w-4" />,
  in_progress: <Timer className="h-4 w-4" />,
  completed: <Check className="h-4 w-4" />,
  dispatched: <Send className="h-4 w-4" />,
  acknowledged: <FileCheck className="h-4 w-4" />,
  archived: <Archive className="h-4 w-4" />,
};

function formatTimestamp(ts: string | null | undefined): string | null {
  if (!ts) return null;
  try {
    const d = new Date(ts);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return null;
  }
}

export function LifecycleProgressBar({ stages, currentStage, className }: LifecycleProgressBarProps) {
  if (!stages || stages.length === 0) return null;

  const isWithdrawn = currentStage === -1;

  return (
    <div className={cn("w-full px-6 py-3 bg-muted/30 border-b", className)}>
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        {stages.map((stage, idx) => {
          const isCompleted = stage.completed;
          const isCurrent = stage.index === currentStage;
          const isFuture = stage.index > currentStage && currentStage >= 0;
          const isLast = idx === stages.length - 1;

          return (
            <div key={stage.key} className="flex items-center flex-1 min-w-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center gap-1 cursor-default">
                    <div
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full transition-colors",
                        isCompleted && "bg-primary text-primary-foreground",
                        isCurrent && !isCompleted && "bg-primary/20 text-primary border-2 border-primary",
                        isFuture && "bg-muted-foreground/10 text-muted-foreground/40",
                        isWithdrawn && "bg-destructive/10 text-destructive",
                      )}
                    >
                      {isCompleted ? <Check className="h-4 w-4" /> : stageIcons[stage.key] || <Circle className="h-4 w-4" />}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-medium whitespace-nowrap",
                        isCompleted && "text-primary",
                        isCurrent && !isCompleted && "text-primary",
                        isFuture && "text-muted-foreground/40",
                      )}
                    >
                      {stage.label}
                    </span>
                    {stage.timestamp && (
                      <span className="text-[9px] text-muted-foreground/60 -mt-0.5">
                        {formatTimestamp(stage.timestamp)}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs font-medium">{stage.label}</p>
                  {stage.timestamp && (
                    <p className="text-xs text-muted-foreground">{formatTimestamp(stage.timestamp)}</p>
                  )}
                </TooltipContent>
              </Tooltip>
              {!isLast && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 rounded",
                    isCompleted ? "bg-primary" : "bg-muted-foreground/20",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      {isWithdrawn && (
        <p className="text-xs text-destructive text-center mt-2">This correspondence has been withdrawn.</p>
      )}
    </div>
  );
}
