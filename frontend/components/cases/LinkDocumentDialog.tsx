"use client";

import { useState, useEffect } from "react";
import { useAbortController } from '@/hooks/use-abort-controller';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { linkDocumentToCase } from "@/lib/api/cases";
import { apiFetch } from "@/lib/api-client";
import { logError } from "@/lib/client-logger";
import { toast } from "@/components/ui/sonner";
import { Search, Loader2, FileText } from "lucide-react";
import { formatDateShort } from "@/lib/correspondence-helpers";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationControls } from "@/components/shared/PaginationControls";

interface DocumentItem {
  id: string;
  title: string;
  documentType?: string;
  status?: string;
  createdAt?: string;
}

interface LinkDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  caseNumber: string;
  onLinked?: () => void;
}

export function LinkDocumentDialog({
  open,
  onOpenChange,
  caseId,
  caseNumber,
  onLinked,
}: LinkDocumentDialogProps) {
  const { getSignal } = useAbortController();
  const [searchQuery, setSearchQuery] = useState("");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [linking, setLinking] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Get already linked document IDs
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());
  
  // Pagination
  const pagination = usePagination({
    initialPage: 1,
    totalCount: totalCount,
  });

  useEffect(() => {
    if (open) {
      fetchDocuments();
      fetchLinkedIds();
    } else {
      // Reset state when dialog closes
      setSearchQuery("");
      setSelectedIds(new Set());
      setNotes("");
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, caseId]);

  const fetchLinkedIds = async () => {
    
    try {
      const signal = getSignal();
      const response = await apiFetch<Record<string, unknown>>(`/correspondence/cases/${caseId}/`, {
        signal,
      });
      const linked = ((response.documents as Record<string, unknown>[]) || []).map((link: Record<string, unknown>) =>
        link.document_id || link.documentId
      ).filter(Boolean);
      setLinkedIds(new Set(linked as string[]));
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      // Ignore errors, just proceed
    }
  };

  const fetchDocuments = async () => {
    if (!caseId) {
      setLoading(false);
      return;
    }
    
    const signal = getSignal();
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      params.append('page', String(pagination.page));
      params.append('page_size', String(pagination.pageSize));
      params.append('ordering', '-created_at');

      const response = await apiFetch<{ results: unknown[]; count: number }>(`/dms/documents/?${params.toString()}`, {
        signal,
      });
      
      if (signal.aborted) return;
      
      const items = ((response.results as Record<string, unknown>[]) || []).map((item: Record<string, unknown>) => ({
        id: item.id as string as string,
        title: (item.title as string as string) || '',
        documentType: item.document_type as string,
        status: item.status as string as string,
        createdAt: item.created_at as string,
      }));
      setDocuments(items);
      setTotalCount(response.count as number || 0);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      logError("Failed to fetch documents", err);
      toast.error("Failed to load documents");
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (open && searchQuery) {
      const timer = setTimeout(() => {
        pagination.goToFirstPage();
      }, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, open]);
  
  useEffect(() => {
    if (open) {
      fetchDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.pageSize, searchQuery, open]);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleLink = async () => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one document");
      return;
    }
    
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.error("You must be online to link documents");
      return;
    }

    setLinking(true);
    try {
      const promises = Array.from(selectedIds).map((id) =>
        linkDocumentToCase(caseId, id, notes)
      );

      await Promise.all(promises);
      toast.success(`Successfully linked ${selectedIds.size} document(s) to case ${caseNumber}`);
      onLinked?.();
      onOpenChange(false);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      logError("Failed to link documents", err);
      toast.error("Failed to link documents");
    } finally {
      setLinking(false);
    }
  };

  const availableItems = documents.filter(item => !linkedIds.has(item.id as string));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" height="fill">
        <DialogHeader>
          <DialogTitle>Link Documents to Case</DialogTitle>
          <DialogDescription>
            Search and select documents to link to case {caseNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title, reference, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="Search documents"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-link-notes">Notes (optional)</Label>
            <Textarea
              id="doc-link-notes"
              placeholder="Add notes about why this document is linked to the case..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              aria-label="Link notes"
            />
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <Label className="mb-2">
              Select Documents ({selectedIds.size} selected)
            </Label>
            <ScrollArea className="flex-1 border rounded-md">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : availableItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {searchQuery ? "No documents found" : "No documents available"}
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {availableItems.map((item) => {
                    const isSelected = selectedIds.has(item.id as string);
                    return (
                      <div
                        key={item.id as string}
                        className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/5 border-primary" : "hover:bg-muted/50"
                        }`}
                        onClick={() => toggleSelection(item.id as string)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelection(item.id as string)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium text-sm">{item.title as string}</span>
                            {item.documentType && (
                              <Badge variant="outline" className="text-xs">
                                {item.documentType}
                              </Badge>
                            )}
                            {item.status as string && (
                              <Badge variant="secondary" className="text-xs">
                                {item.status as string}
                              </Badge>
                            )}
                          </div>
                          {item.createdAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Created: {formatDateShort(item.createdAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
            
            {/* Pagination */}
            {totalCount > pagination.pageSize && (
              <div className="border-t pt-4 mt-4">
                <PaginationControls
                  pagination={pagination}
                  showPageSizeSelector={false}
                  showGoToPage={false}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            aria-label="Cancel linking"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleLink} 
            aria-label={`Link ${selectedIds.size} document(s)`}
          >
            {linking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Linking...
              </>
            ) : (
              <>
                Link {selectedIds.size > 0 ? `${selectedIds.size} ` : ""}Document{selectedIds.size !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

