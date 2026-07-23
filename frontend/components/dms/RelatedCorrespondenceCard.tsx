"use client";

import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { formatDateShort } from "@/lib/correspondence-helpers";
import type { Correspondence, Minute, User } from "@/lib/npa-structure";

interface RelatedCorrespondenceCardProps {
  relatedCorrespondence: Array<{
    correspondence: Correspondence;
    minutes: Minute[];
    linkNotes?: string;
  }>;
  userLookup: Map<string, User>;
}

export const RelatedCorrespondenceCard = ({
  relatedCorrespondence,
  userLookup,
}: RelatedCorrespondenceCardProps) => {
  return (
    <div className="space-y-2 min-w-0 overflow-hidden">
      <p className="text-[13px] font-semibold tracking-tight px-0.5">
        Linked
        <span className="ml-1.5 text-[11px] font-normal text-muted-foreground tabular-nums">
          {relatedCorrespondence.length}
        </span>
      </p>
      <ul className="space-y-1">
        {relatedCorrespondence.map(({ correspondence, minutes, linkNotes }) => {
          const createdBy = userLookup.get(correspondence.createdById ?? "");
          return (
            <li key={correspondence.id}>
              <Link
                href={`/correspondence/${correspondence.id}`}
                className="flex items-start gap-2 rounded-xl px-2.5 py-2 hover:bg-muted/50 transition-colors min-w-0 overflow-hidden"
              >
                <div className="min-w-0 flex-1 overflow-hidden space-y-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[12px] font-semibold text-primary truncate">
                      {correspondence.referenceNumber || "N/A"}
                    </span>
                    <Badge variant="outline" className="text-[10px] h-4 shrink-0 capitalize">
                      {correspondence.status?.replace("-", " ") || "Unknown"}
                    </Badge>
                  </div>
                  <p
                    className="text-[13px] font-medium leading-snug break-words line-clamp-2"
                    title={correspondence.subject}
                  >
                    {correspondence.subject}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {createdBy ? `by ${createdBy.name}` : ""}
                    {createdBy && correspondence.receivedDate ? " · " : ""}
                    {correspondence.receivedDate
                      ? formatDateShort(correspondence.receivedDate)
                      : ""}
                    {minutes.length > 0
                      ? ` · ${minutes.length} ${minutes.length === 1 ? "min" : "mins"}`
                      : ""}
                    {linkNotes ? ` · ${linkNotes}` : ""}
                  </p>
                </div>
                <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
