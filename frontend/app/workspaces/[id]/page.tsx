"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, Users, Search } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { mapWorkspace } from "@/lib/dms-types";
import type { DocumentWorkspace } from "@/lib/dms-storage";
import type { DocumentRecord } from "@/lib/dms-storage";
import { queryDocumentsExtended } from "@/lib/dms-operations";
import { formatDateShort } from "@/lib/correspondence-helpers";
import Link from "next/link";

export default function WorkspaceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<DocumentWorkspace | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingWs, setLoadingWs] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadWorkspace = useCallback(async () => {
    if (!params?.id) return;
    setLoadingWs(true);
    try {
      const payload = await apiFetch<Record<string, unknown>>(`/dms/workspaces/${params.id}/`);
      setWorkspace(mapWorkspace(payload));
    } catch (_err) {
      setError("Failed to load workspace.");
    } finally {
      setLoadingWs(false);
    }
  }, [params?.id]);

  const loadDocuments = useCallback(async () => {
    if (!params?.id) return;
    setLoadingDocs(true);
    try {
      const result = await queryDocumentsExtended({
        workspaceId: params.id,
        pageSize: 50,
        search: debouncedQuery || undefined,
      });
      setDocuments(result.results);
      setTotalCount(result.count);
    } catch (_err) {
      toast.error("Failed to load documents");
    } finally {
      setLoadingDocs(false);
    }
  }, [params?.id, searchQuery]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  if (loadingWs) {
    return (
      <DashboardLayout>
        <LoadingState message="Loading workspace..." />
      </DashboardLayout>
    );
  }

  if (error || !workspace) {
    return (
      <DashboardLayout>
        <ErrorState message={error ?? "Workspace not found"} onRetry={loadWorkspace} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col flex-1 min-h-0">
        <div className="border-b">
          <div className="flex items-center gap-3 p-4 sm:p-6">
            <Button variant="ghost" size="icon" onClick={() => router.push("/workspaces")} className="h-8 w-8 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: workspace.color || "#2563eb" }} />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold truncate">{workspace.name}</h1>
              {workspace.description && (
                <p className="text-sm text-muted-foreground truncate">{workspace.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="gap-1.5 text-xs">
                <FileText className="h-3 w-3" />
                {totalCount} {totalCount === 1 ? "document" : "documents"}
              </Badge>
              {workspace.memberIds.length > 0 && (
                <Badge variant="outline" className="gap-1.5 text-xs">
                  <Users className="h-3 w-3" />
                  {workspace.memberIds.length} {workspace.memberIds.length === 1 ? "member" : "members"}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') loadDocuments(); }}
                placeholder="Search documents in workspace..."
                className="pl-9 h-9"
              />
            </div>
            <Button variant="outline" size="sm" className="h-9" onClick={loadDocuments}>
              Search
            </Button>
          </div>

          {loadingDocs ? (
            <LoadingState message="Loading documents..." />
          ) : documents.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-8 w-8" />}
              title={searchQuery ? "No matching documents" : "No documents in this workspace"}
              message={
                searchQuery
                  ? "Try a different search term."
                  : "Documents added to this workspace will appear here."
              }
            />
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <Link key={doc.id} href={`/dms/${doc.id}`} className="block">
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{doc.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {doc.referenceNumber && <>{doc.referenceNumber} · </>}
                            {doc.status} · {doc.sensitivity}
                            {doc.updatedAt && <> · Updated {formatDateShort(doc.updatedAt)}</>}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                          {doc.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
