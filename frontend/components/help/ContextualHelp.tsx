"use client";

import { ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ContextualHelpProps {
  title: string;
  description: string;
  placement?: {
    align?: "start" | "center" | "end";
    side?: "top" | "right" | "bottom" | "left";
  };
  steps?: string[];
  footer?: ReactNode;
  className?: string;
}

export const ContextualHelp = ({
  title,
  description,
  placement,
  steps,
  footer,
  className,
}: ContextualHelpProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn("h-8 w-8 text-muted-foreground", className)}
          aria-label={`Learn more about ${title}`}
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 space-y-3 text-sm leading-relaxed"
        align={placement?.align ?? "end"}
        side={placement?.side ?? "bottom"}
      >
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {steps && steps.length > 0 && (
          <ol className="space-y-1 pl-4 text-xs text-muted-foreground list-decimal">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        )}
        {footer && <div className="pt-1">{footer}</div>}
      </PopoverContent>
    </Popover>
  );
};

