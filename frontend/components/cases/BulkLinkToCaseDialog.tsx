"use client";

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, FolderTree, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { logError } from '@/lib/client-logger';
import { getCases, linkDocumentToCase, linkFormToCase, type Case } from '@/lib/api/cases';
import { useDebounce } from '@/hooks/use-debounce';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface BulkLinkToCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemIds: string[];
  itemType: 'document' | 'form';
  onLinked: () => void;
}

export function BulkLinkToCaseDialog({
  open,
  onOpenChange,
  itemIds,
  itemType,
  onLinked,
}: BulkLinkToCaseDialogProps) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkedCount, setLinkedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (open) {
      void loadCases();
    } else {
      // Reset state when dialog closes
      setSearchQuery('');
      setSelectedCaseId('');
      setNotes('');
      setLinkedCount(0);
      setFailedCount(0);
    }
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [open]);

  useEffect(() => {
    if (open && debouncedSearch) {
      void loadCases(debouncedSearch);
    } else if (open) {
      void loadCases();
    }
  }, [debouncedSearch, open]);

  const loadCases = async (search?: string) => {
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
      const response = await getCases({
        search,
        pageSize: 50,
        ordering: '-opened_at',
        signal,
      });
      
      if (signal.aborted) return;
      
      setCases(response.results);
    } catch (error: Record<string, unknown>) {
      if (error.name === 'AbortError') return;
      logError('Failed to load cases', error);
      toast.error('Failed to load cases');
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  };

  const handleLink = async () => {
    if (!selectedCaseId || itemIds.length === 0) {
      toast.error('Please select a case');
      return;
    }
    
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.error('You must be online to link items');
      return;
    }

    setLinking(true);
    setLinkedCount(0);
    setFailedCount(0);

    try {
      let successCount = 0;
      let failCount = 0;

      for (const itemId of itemIds) {
        try {
          if (itemType === 'document') {
            await linkDocumentToCase(selectedCaseId, itemId, notes || undefined);
          } else {
            await linkFormToCase(selectedCaseId, itemId, notes || undefined);
          }
          successCount++;
          setLinkedCount(successCount);
        } catch (error: Record<string, unknown>) {
          if (error.name === 'AbortError') return;
          failCount++;
          setFailedCount(failCount);
          logError(`Failed to link ${itemType} ${itemId} to case`, error);
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully linked ${successCount} ${itemType}(s) to case`);
      }
      if (failCount > 0) {
        toast.warning(`Failed to link ${failCount} ${itemType}(s)`);
      }

      if (successCount > 0) {
        onLinked();
        onOpenChange(false);
      }
    } catch (error: Record<string, unknown>) {
      if (error.name === 'AbortError') return;
      logError('Bulk link failed', error);
      toast.error('Failed to link items to case');
    } finally {
      setLinking(false);
    }
  };

  const selectedCase = cases.find(c => c.id === selectedCaseId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Link {itemIds.length} {itemType}(s) to Case
          </DialogTitle>
          <DialogDescription>
            Select a case to link the selected {itemType}s to. All items will be linked with the same notes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You are currently offline. Linking requires an internet connection.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Search input */}
          <div className="space-y-2">
            <Label htmlFor="case-search">Search Cases</Label>
            <Input
              id="case-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by case number, title..."
              aria-label="Search cases"
            />
          </div>

          {/* Case selection */}
          <div className="space-y-2">
            <Label>Select Case</Label>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a case..." />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    {cases.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No cases found
                      </div>
                    ) : (
                      cases.map((caseItem) => (
                        <SelectItem key={caseItem.id} value={caseItem.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">{caseItem.caseNumber}</span>
                            <span className="truncate">{caseItem.title}</span>
                            <Badge variant="outline" className="ml-auto">
                              {caseItem.status}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </ScrollArea>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Selected case info */}
          {selectedCase && (
            <div className="p-3 bg-muted rounded-md space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium">{selectedCase.caseNumber}</span>
                <Badge variant="outline">{selectedCase.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{selectedCase.title}</p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="link-notes">Notes (optional)</Label>
            <Textarea
              id="link-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about linking these items..."
              rows={3}
              aria-label="Link notes"
            />
          </div>

          {/* Progress indicator */}
          {linking && (
            <div className="p-3 bg-muted rounded-md space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Linking items...</span>
                <span>
                  {linkedCount + failedCount} / {itemIds.length}
                </span>
              </div>
              <div className="flex items-center gap-4">
                {linkedCount > 0 && (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{linkedCount} linked</span>
                  </div>
                )}
                {failedCount > 0 && (
                  <div className="flex items-center gap-1 text-destructive">
                    <XCircle className="h-4 w-4" />
                    <span>{failedCount} failed</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={linking}
            aria-label="Cancel linking"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleLink} 
            aria-label={`Link ${itemIds.length} ${itemType}(s) to case`}
          >
            {linking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Linking...
              </>
            ) : (
              `Link ${itemIds.length} ${itemType}(s)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

