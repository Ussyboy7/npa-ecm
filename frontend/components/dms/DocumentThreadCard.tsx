"use client";

import { useState, useEffect } from "react";
import { logError } from "@/lib/client-logger";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ArrowUp, ArrowDown, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { formatDateShort } from "@/lib/correspondence-helpers";
import { apiFetch } from "@/lib/api-client";
import { fetchAllPaginated } from "@/lib/pagination-utils";
import { toast } from "@/components/ui/sonner";
import { isRecord } from "@/lib/type-utils";

interface DocumentThreadCardProps {
  documentId: string;
  parentDocumentId?: string | null;
}

interface ThreadDocument {
  id: string;
  title: string;
  reference_number: string;
  status: string;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    name: string;
  };
}

function ThreadRow({ doc, hint }: { doc: ThreadDocument; hint?: string }) {
  return (
    <Link
      href={`/dms/${doc.id}`}
      className="flex items-start gap-2 rounded-xl px-2.5 py-2 hover:bg-muted/50 transition-colors min-w-0"
    >
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="text-[13px] font-medium truncate">{doc.title}</p>
        <p className="text-[11px] text-muted-foreground truncate">
          {doc.reference_number}
          {doc.author ? ` · ${doc.author.name}` : ""}
          {hint ? ` · ${hint}` : ""}
        </p>
      </div>
      <Badge variant="outline" className="text-[10px] h-4 shrink-0 capitalize">
        {doc.status}
      </Badge>
    </Link>
  );
}

export const DocumentThreadCard = ({ documentId, parentDocumentId }: DocumentThreadCardProps) => {
  const [parentDocument, setParentDocument] = useState<ThreadDocument | null>(null);
  const [childDocuments, setChildDocuments] = useState<ThreadDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadThreadDocuments = async () => {
    try {
      setLoading(true);

      if (parentDocumentId) {
        try {
          const parent = await apiFetch<unknown>(`/dms/documents/${parentDocumentId}/`);
          if (isRecord(parent)) {
            setParentDocument({
              id: String(parent.id ?? ""),
              title: typeof parent.title === "string" ? parent.title : "Untitled",
              reference_number:
                typeof parent.reference_number === "string" ? parent.reference_number : "N/A",
              status: typeof parent.status === "string" ? parent.status : "draft",
              created_at:
                typeof parent.created_at === "string"
                  ? parent.created_at
                  : new Date().toISOString(),
              updated_at:
                typeof parent.updated_at === "string"
                  ? parent.updated_at
                  : new Date().toISOString(),
              author: isRecord(parent.author)
                ? {
                    id: String(parent.author.id ?? ""),
                    name: String(parent.author.name ?? "Unknown"),
                  }
                : undefined,
            });
          }
        } catch (error: unknown) {
          logError("Failed to load parent document:", error);
        }
      }

      try {
        const rows = await fetchAllPaginated<Record<string, unknown>>(
          `/dms/documents/?parent_document=${documentId}`,
        );
        const children = rows.filter(isRecord).map((doc) => ({
          id: String(doc.id ?? ""),
          title: typeof doc.title === "string" ? doc.title : "Untitled",
          reference_number:
            typeof doc.reference_number === "string" ? doc.reference_number : "N/A",
          status: typeof doc.status === "string" ? doc.status : "draft",
          created_at:
            typeof doc.created_at === "string" ? doc.created_at : new Date().toISOString(),
          updated_at:
            typeof doc.updated_at === "string" ? doc.updated_at : new Date().toISOString(),
          author: isRecord(doc.author)
            ? { id: String(doc.author.id ?? ""), name: String(doc.author.name ?? "Unknown") }
            : undefined,
        }));
        setChildDocuments(children);
      } catch (error: unknown) {
        logError("Failed to load child documents:", error);
      }
    } catch (error: unknown) {
      logError("Failed to load thread documents:", error);
      toast.error("Failed to load document thread");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (documentId) {
      void loadThreadDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, parentDocumentId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadThreadDocuments();
      toast.success("Document thread refreshed");
    } catch {
      toast.error("Failed to refresh document thread");
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading thread…
      </div>
    );
  }

  if (!parentDocument && childDocuments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 min-w-0">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="text-[13px] font-semibold tracking-tight flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-primary" />
          Thread
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => void handleRefresh()}
          disabled={isRefreshing}
          aria-label="Refresh document thread"
        >
          <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {parentDocument && (
        <div>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 px-0.5 mb-1">
            <ArrowUp className="h-3 w-3" />
            Parent
          </p>
          <ThreadRow doc={parentDocument} />
        </div>
      )}

      <div className="rounded-xl bg-primary/5 px-2.5 py-2 text-[11px] text-muted-foreground">
        You are here
      </div>

      {childDocuments.length > 0 && (
        <div>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 px-0.5 mb-1">
            <ArrowDown className="h-3 w-3" />
            Responses · {childDocuments.length}
          </p>
          <ul className="space-y-0.5 max-h-[220px] overflow-y-auto">
            {childDocuments.map((child) => (
              <li key={child.id}>
                <ThreadRow doc={child} hint={formatDateShort(child.created_at)} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
