"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { logError } from '@/lib/client-logger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DocumentRecord, queryDocuments } from '@/lib/api/dms';
import { formatDate } from '@/lib/datetime';
import { AlertTriangle, Loader2, RefreshCw, Search } from 'lucide-react';
import { useOrganizationCatalogs } from '@/hooks/use-organization-catalogs';
import { cn } from '@/lib/utils';

interface LinkDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkedDocumentIds?: string[];
  onSave: (documentIds: string[]) => void;
  divisionId?: string;
  departmentId?: string;
  subject?: string;
}

// 36px pill with a 44px pointer target: the pseudo-element adds the touch
// area without adding layout height.
const compactFooterButton =
  "relative h-9 after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']";

export const LinkDocumentDialog = ({
  open,
  onOpenChange,
  linkedDocumentIds,
  onSave,
  divisionId,
  departmentId,
  subject,
}: LinkDocumentDialogProps) => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(linkedDocumentIds ?? []);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // Debounced searches can resolve out of order; only the newest one may
  // write to the list or its error state.
  const requestSeq = useRef(0);
  const { divisions, departments } = useOrganizationCatalogs('divisions', 'departments');

  const loadDocuments = useCallback(async (queryValue: string): Promise<boolean> => {
    const requestId = requestSeq.current + 1;
    requestSeq.current = requestId;
    setLoading(true);
    try {
      const response = await queryDocuments({
        page: 1,
        pageSize: 50,
        search: queryValue.trim() || undefined,
        ordering: '-updated_at',
      });
      if (requestId !== requestSeq.current) return false;
      setDocuments(response.results);
      setLoadError(false);
      return true;
    } catch (error: unknown) {
      if (requestId !== requestSeq.current) return false;
      // Keep whatever is already listed: a failed fetch must not read as
      // "there are no documents to link".
      logError('Failed to load documents for linking', error);
      setLoadError(true);
      return false;
    } finally {
      if (requestId === requestSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setSelectedIds(linkedDocumentIds ?? []);
  }, [open, linkedDocumentIds]);

  useEffect(() => {
    if (open) setLoadError(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      void loadDocuments(searchQuery);
    }, 250);
    return () => clearTimeout(handle);
  }, [open, searchQuery, loadDocuments]);

  const retryLoad = useCallback(() => {
    void loadDocuments(searchQuery);
  }, [loadDocuments, searchQuery]);

  const recommendedIds = useMemo(() => {
    return documents
      .filter((doc) => {
        if (divisionId && doc.divisionId === divisionId) return true;
        if (departmentId && doc.departmentId === departmentId) return true;
        if (subject) {
          const keywords = subject.toLowerCase().split(/\s+/).filter(Boolean);
          if (keywords.length) {
            const haystack = `${doc.title} ${doc.description ?? ''} ${(doc.tags ?? []).join(' ')}`.toLowerCase();
            if (keywords.some((keyword) => haystack.includes(keyword))) {
              return true;
            }
          }
        }
        return false;
      })
      .map((doc) => doc.id);
  }, [documents, divisionId, departmentId, subject]);

  // The quick-pick chips are gone, so keep suggestions in view here instead.
  // The list carries no visible sort label, and sort() is stable, so matches
  // rise to the top without disturbing the recency order otherwise.
  const orderedDocuments = useMemo(() => {
    if (recommendedIds.length === 0) return documents;
    const suggested = new Set(recommendedIds);
    return [...documents].sort(
      (a, b) => Number(suggested.has(b.id)) - Number(suggested.has(a.id)),
    );
  }, [documents, recommendedIds]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((docId) => docId !== id) : [...prev, id]));
  };

  const handleConfirm = () => {
    onSave(selectedIds);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="flex max-h-[95vh] flex-col">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>Link documents</DialogTitle>
          <DialogDescription>
            Select DMS documents to associate with this correspondence.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search documents"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-11 rounded-xl border-border/60 bg-muted/30 pl-9 text-[13px] sm:h-10"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-xl border border-border/60">
            {loadError && documents.length > 0 && (
              <div
                role="alert"
                className="m-3 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/[0.04] px-3 py-2.5"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-destructive" />
                <p className="min-w-0 flex-1 text-[12px] leading-snug text-muted-foreground">
                  Couldn&apos;t refresh documents. Showing the last loaded results.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-11 px-2 text-xs font-medium text-primary hover:bg-primary/5 hover:text-primary sm:h-8"
                  onClick={retryLoad}
                  disabled={loading}
                >
                  {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {loading ? 'Retrying...' : 'Retry'}
                </Button>
              </div>
            )}
            {loadError && documents.length === 0 ? (
              <div role="alert" className="p-4">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground">
                      Couldn&apos;t load documents
                    </p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                      Documents may still be available to link. Retry to check.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 h-11 w-full gap-1.5 px-3 text-xs sm:h-9 sm:w-auto"
                  onClick={retryLoad}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {loading ? 'Retrying...' : 'Retry'}
                </Button>
              </div>
            ) : loading && documents.length === 0 ? (
              <div className="flex min-h-40 items-center justify-center gap-2 text-[13px] text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading documents...
              </div>
            ) : orderedDocuments.length === 0 ? (
              <div className="flex min-h-40 flex-col items-center justify-center gap-1 px-4 text-center">
                <p className="text-[13px] font-medium text-foreground">
                  {searchQuery ? 'No matching documents' : 'No documents available'}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {searchQuery
                    ? `Nothing matches "${searchQuery}". Try a different search.`
                    : 'There are no documents available to link yet.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {orderedDocuments.map((doc) => {
                  const latest = doc.versions[0];
                  const isSelected = selectedIds.includes(doc.id);
                  const isRecommended = recommendedIds.includes(doc.id);
                  const optionId = `link-document-option-${doc.id}`;
                  const divisionName = doc.divisionId
                    ? divisions.find((division) => division.id === doc.divisionId)?.name ??
                      'Unknown division'
                    : 'Unassigned';
                  const departmentName = doc.departmentId
                    ? departments.find((department) => department.id === doc.departmentId)?.name ??
                      'Unknown department'
                    : '';

                  return (
                    <div
                      key={doc.id}
                      className={cn(
                        'flex items-start gap-3 px-3 py-3 transition-colors',
                        isSelected ? 'bg-primary/[0.04]' : 'hover:bg-muted/40',
                      )}
                    >
                      <Checkbox
                        id={optionId}
                        checked={isSelected}
                        onCheckedChange={() => toggleSelection(doc.id)}
                        className="mt-0.5 shrink-0"
                      />
                      <label htmlFor={optionId} className="min-w-0 flex-1 cursor-pointer">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span className="font-mono text-[12px] font-medium text-foreground">
                            {doc.referenceNumber ?? 'No reference'}
                          </span>
                          <span className="capitalize">{doc.documentType}</span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize">{doc.status}</span>
                          {isRecommended && <span className="text-primary">Suggested</span>}
                        </span>
                        <span
                          className="mt-1 break-words text-[14px] font-medium leading-snug line-clamp-2"
                          title={doc.title}
                        >
                          {doc.title}
                        </span>
                        {doc.description && (
                          <span className="mt-0.5 break-words text-[12px] leading-snug text-muted-foreground line-clamp-2">
                            {doc.description}
                          </span>
                        )}
                        <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                          {divisionName}
                          {departmentName ? ` · ${departmentName}` : ''}
                        </span>
                        {latest && (
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">
                            Updated {formatDate(doc.updatedAt)} · v{latest.versionNumber}
                          </span>
                        )}
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-row items-center justify-between gap-3 border-t border-border/60 pt-4 sm:justify-between">
          <p className="min-w-0 truncate text-[11px] text-muted-foreground">
            {selectedIds.length === 0
              ? 'No documents selected'
              : `${selectedIds.length} document${selectedIds.length === 1 ? '' : 's'} selected`}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              className={cn(compactFooterButton, 'px-3 text-xs')}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className={cn(compactFooterButton, 'rounded-full px-4 text-xs')}
              onClick={handleConfirm}
            >
              Save links
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
