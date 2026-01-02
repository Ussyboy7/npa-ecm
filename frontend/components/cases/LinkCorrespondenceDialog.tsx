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
import { linkCorrespondenceToCase } from "@/lib/api/cases";
import { apiFetch } from "@/lib/api-client";
import { logError } from "@/lib/client-logger";
import { toast } from "sonner";
import { Search, Loader2, Mail } from "lucide-react";
import { formatDateShort } from "@/lib/correspondence-helpers";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationControls } from "@/components/shared/PaginationControls";

interface CorrespondenceItem {
  id: string;
  referenceNumber: string;
  subject: string;
  status: string;
  priority: string;
  receivedDate?: string;
}

interface LinkCorrespondenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  caseNumber: string;
  onLinked?: () => void;
}

export function LinkCorrespondenceDialog({
  open,
  onOpenChange,
  caseId,
  caseNumber,
  onLinked,
}: LinkCorrespondenceDialogProps) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [correspondence, setCorrespondence] = useState<CorrespondenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [linking, setLinking] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Get already linked correspondence IDs
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());
  
  // Pagination
  const pagination = usePagination({
    initialPage: 1,
    initialPageSize: 20,
    totalCount: totalCount,
  });

  useEffect(() => {
    if (open) {
      fetchCorrespondence();
      fetchLinkedIds();
    } else {
      // Reset state when dialog closes
      setSearchQuery("");
      setSelectedIds(new Set());
      setNotes("");
      setIsPrimary(false);
    }
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [open, caseId]);

  const fetchLinkedIds = async () => {
    
    try {
      abortControllerRef.current = new AbortController();
      const response = await apiFetch<Record<string, unknown>>(`/correspondence/cases/${caseId}/`, {
        signal: abortControllerRef.current.signal,
      });
      const linked = (response.correspondence || []).map((link: Record<string, unknown>) => 
        link.correspondence_id || link.correspondence?.id
      ).filter(Boolean);
      setLinkedIds(new Set(linked));
    } catch (err: Record<string, unknown>) {
      if (err.name === 'AbortError') return;
      // Ignore errors, just proceed
    }
  };

  const fetchCorrespondence = async () => {
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
      params.append('ordering', '-received_date');

      const response = await apiFetch<{ results: unknown[]; count: number }>(`/correspondence/items/?${params.toString()}`, {
        signal,
      });
      
      if (signal.aborted) return;
      
      const items = (response.results || []).map((item: Record<string, unknown>) => ({
        id: item.id,
        referenceNumber: item.reference_number || '',
        subject: item.subject || '',
        status: item.status || 'pending',
        priority: item.priority || 'medium',
        receivedDate: item.received_date,
      }));
      setCorrespondence(items);
      setTotalCount(response.count || 0);
    } catch (err: Record<string, unknown>) {
      if (err.name === 'AbortError') return;
      logError("Failed to fetch correspondence", err);
      toast.error("Failed to load correspondence");
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
  }, [searchQuery, open]);
  
  useEffect(() => {
    if (open) {
      fetchCorrespondence();
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
      toast.error("Please select at least one correspondence item");
      return;
    }
    
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.error("You must be online to link correspondence");
      return;
    }

    setLinking(true);
    try {
      const promises = Array.from(selectedIds).map((id, index) =>
        linkCorrespondenceToCase(
          caseId,
          id,
          isPrimary && index === 0, // Only first selected is primary if checkbox is checked
          notes
        )
      );

      await Promise.all(promises);
      toast.success(`Successfully linked ${selectedIds.size} correspondence item(s) to case ${caseNumber}`);
      onLinked?.();
      onOpenChange(false);
    } catch (err: Record<string, unknown>) {
      if (err.name === 'AbortError') return;
      logError("Failed to link correspondence", err);
      toast.error("Failed to link correspondence");
    } finally {
      setLinking(false);
    }
  };

  const availableItems = correspondence.filter(item => !linkedIds.has(item.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[80vh] flex flex-col overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Link Correspondence to Case</DialogTitle>
          <DialogDescription>
            Search and select correspondence items to link to case {caseNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by reference number, subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="Search correspondence"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is-primary"
              checked={isPrimary}
              onCheckedChange={(checked) => setIsPrimary(checked === true)}
              aria-label="Mark first selected as primary correspondence"
            />
            <Label htmlFor="is-primary" className="text-sm font-normal cursor-pointer">
              Mark first selected as primary correspondence
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="link-notes">Notes (optional)</Label>
            <Textarea
              id="link-notes"
              placeholder="Add notes about why this correspondence is linked to the case..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              aria-label="Link notes"
            />
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <Label className="mb-2">
              Select Correspondence ({selectedIds.size} selected)
            </Label>
            <ScrollArea className="flex-1 border rounded-md">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : availableItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {searchQuery ? "No correspondence found" : "No correspondence available"}
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {availableItems.map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/5 border-primary" : "hover:bg-muted/50"
                        }`}
                        onClick={() => toggleSelection(item.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelection(item.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-mono text-sm font-medium">
                              {item.referenceNumber}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {item.status}
                            </Badge>
                            <Badge variant={item.priority === "urgent" ? "destructive" : "secondary"} className="text-xs">
                              {item.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-foreground truncate">{item.subject}</p>
                          {item.receivedDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Received: {formatDateShort(item.receivedDate)}
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
            aria-label={`Link ${selectedIds.size} correspondence item(s)`}
          >
            {linking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Linking...
              </>
            ) : (
              <>
                Link {selectedIds.size > 0 ? `${selectedIds.size} ` : ""}Item{selectedIds.size !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

