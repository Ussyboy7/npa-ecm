"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Correspondence } from "@/lib/npa-structure";
import { formatDateShort } from "@/lib/datetime";

interface RelatedResponsesPanelProps {
  responses: NonNullable<Correspondence["relatedResponses"]>;
}

export function RelatedResponsesPanel({ responses }: RelatedResponsesPanelProps) {
  if (!responses.length) return null;

  return (
    <div className="rounded-xl border border-border/60">
      <div className="border-b border-border/60 p-3 pb-0">
        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <FileText className="h-3 w-3" />
          Related responses
        </p>
      </div>
      <ul className="divide-y divide-border/40 p-3 space-y-0">
        {responses.map((response) => (
          <li key={response.id}>
            <Link
              href={`/correspondence/${response.id}`}
              className="flex items-start justify-between gap-2 rounded-lg p-2 -mx-2 hover:bg-muted/40 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{response.subject}</p>
                <p className="text-xs text-muted-foreground">{response.reference_number}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant="outline" className="text-[10px] capitalize">
                  {response.status.replace(/-/g, " ")}
                </Badge>
                {response.created_at && (
                  <span className="text-[10px] text-muted-foreground">
                    {formatDateShort(response.created_at)}
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
