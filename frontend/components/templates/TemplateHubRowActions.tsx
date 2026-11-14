"use client";

import type { ReactNode } from "react";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface TemplateHubRowAction {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  destructive?: boolean;
}

export function TemplateHubRowActions({
  actions,
  label = "Row actions",
}: {
  actions: TemplateHubRowAction[];
  label?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          aria-label={label}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
        {actions.map((action, index) => (
          <DropdownMenuItem
            key={`${action.label}-${index}`}
            className={cn(action.destructive && "text-destructive")}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              action.onSelect();
            }}
          >
            {action.icon ? (
              <span className="mr-2 flex h-4 w-4 items-center justify-center">{action.icon}</span>
            ) : null}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
