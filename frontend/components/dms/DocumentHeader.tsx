"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { DocumentRecord } from "@/lib/api/dms";
import { detailType } from "@/lib/detail-type";
import { cn } from "@/lib/utils";

interface DocumentHeaderProps {
  document: DocumentRecord;
  onUnlinkCase?: (caseId: string) => Promise<void>;
}

export const DocumentHeader = ({ document }: DocumentHeaderProps) => {
  const router = useRouter();

  const title = document.title || document.referenceNumber || "Document";
  const refLine =
    document.referenceNumber && document.referenceNumber !== document.title
      ? document.referenceNumber
      : null;

  return (
    <div className="border-b border-border/60 bg-background px-4 md:px-6 py-3 md:py-4 flex-shrink-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 md:gap-3 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 mt-0.5"
            onClick={() => router.push("/dms")}
            aria-label="Back to documents"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            {refLine ? (
              <>
                <h1 className={cn(detailType.pageTitle, "truncate")}>{refLine}</h1>
                <p className={cn(detailType.subject, "mt-1 truncate")}>{title}</p>
              </>
            ) : (
              <h1 className={cn(detailType.pageTitle, "truncate")}>{title}</h1>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
