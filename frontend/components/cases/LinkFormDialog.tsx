"use client";

import { useState, useEffect, useRef } from "react";
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
import { linkFormToCase } from "@/lib/api/cases";
import { apiFetch } from "@/lib/api-client";
import { logError } from "@/lib/client-logger";
import { toast } from "sonner";
import { Search, Loader2, FileCheck } from "lucide-react";
import { formatDateShort } from "@/lib/correspondence-helpers";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationControls } from "@/components/shared/PaginationControls";

interface FormItem {
  id: string;
  title: string;
  templateName?: string;
  status?: string;
  createdAt?: string;
}

interface LinkFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  caseNumber: string;
  onLinked?: () => void;
}

export function LinkFormDialog({
  open,
  onOpenChange,
  caseId,
  caseNumber,
  onLinked,
}: LinkFormDialogProps) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [forms, setForms] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [linking, setLinking] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Get already linked form IDs
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());
  
  // Pagination
  const pagination = usePagination({
    initialPage: 1,
    initialPageSize: 20,
    totalCount: totalCount,
  });

  useEffect(() => {
    if (open) {
      fetchForms();
      fetchLinkedIds();
    } else {
      // Reset state when dialog closes
      setSearchQuery("");
      setSelectedIds(new Set());
      setNotes("");
    }
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, caseId]);

  const fetchLinkedIds = async () => {
    
    try {
      abortControllerRef.current = new AbortController();
      const response = await apiFetch<Record<string, unknown>>(`/correspondence/cases/${caseId}/`, {
        signal: abortControllerRef.current.signal,
      });
      const linked = ((response.forms as any[]) || []).map((link: Record<string, unknown>) =>
        link.form_document_id || link.formDocumentId
      ).filter(Boolean);
      setLinkedIds(new Set(linked as string[]));
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      // Ignore errors, just proceed
    }
  };

  const fetchForms = async () => {
    if (!caseId) {
      setLoading(false);
      return;
    }
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      params.append('page', String(pagination.page));
      params.append('page_size', String(pagination.pageSize));
      params.append('ordering', '-created_at');

      // Fetch form documents from DMS
      const response = await apiFetch<{ results: unknown[]; count: number }>(`/dms/form-documents/?${params.toString()}`, {
        signal,
      });
      
      if (signal.aborted) return;
      
      const items = ((response.results as any[]) || []).map((item: Record<string, unknown>) => ({
        id: item.id as string as string,
        title: (item.title as string as string) || ((item.document as any)?.title as string) || '',
        templateName: ((item.template as any)?.name as string) || (item.template_name as string),
        status: (item.status as string as string) || ((item.document as any)?.status as string),
        createdAt: (item.created_at as string) || ((item.document as any)?.created_at as string),
      }));
      setForms(items);
      setTotalCount(response.count as number || 0);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      logError("Failed to fetch forms", err);
      toast.error("Failed to load forms");
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
      fetchForms();
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
      toast.error("Please select at least one form");
      return;
    }
    
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.error("You must be online to link forms");
      return;
    }

    setLinking(true);
    try {
      const promises = Array.from(selectedIds).map((id) =>
        linkFormToCase(caseId, id, notes)
      );

      await Promise.all(promises);
      toast.success(`Successfully linked ${selectedIds.size} form(s) to case ${caseNumber}`);
      onLinked?.();
      onOpenChange(false);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      logError("Failed to link forms", err);
      toast.error("Failed to link forms");
    } finally {
      setLinking(false);
    }
  };

  const availableItems = forms.filter(item => !linkedIds.has(item.id as string));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[80vh] flex flex-col overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Link Forms to Case</DialogTitle>
          <DialogDescription>
            Search and select forms to link to case {caseNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title, template name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="Search forms"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="form-link-notes">Notes (optional)</Label>
            <Textarea
              id="form-link-notes"
              placeholder="Add notes about why this form is linked to the case..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              aria-label="Link notes"
            />
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <Label className="mb-2">
              Select Forms ({selectedIds.size} selected)
            </Label>
            <ScrollArea className="flex-1 border rounded-md">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : availableItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {searchQuery ? "No forms found" : "No forms available"}
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
                            <FileCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium text-sm">{item.title as string}</span>
                            {item.templateName && (
                              <Badge variant="outline" className="text-xs">
                                {item.templateName}
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
            aria-label={`Link ${selectedIds.size} form(s)`}
          >
            {linking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Linking...
              </>
            ) : (
              <>
                Link {selectedIds.size > 0 ? `${selectedIds.size} ` : ""}Form{selectedIds.size !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

