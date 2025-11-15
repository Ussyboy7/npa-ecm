"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DocumentRecord,
  queryDocuments,
} from '@/lib/dms-storage';
import { type User } from '@/lib/npa-structure';
import { formatDate } from '@/lib/correspondence-helpers';
import { FileText, Hash, Layers, Filter, Calendar } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';

interface LinkDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkedDocumentIds?: string[];
  onSave: (documentIds: string[]) => void;
  divisionId?: string;
  departmentId?: string;
  subject?: string;
}

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
  const { divisions, departments } = useOrganization();

  const loadDocuments = useCallback(
    async (queryValue: string) => {
      setLoading(true);
      try {
        const response = await queryDocuments({
          page: 1,
          pageSize: 50,
          search: queryValue.trim() || undefined,
          ordering: '-updated_at',
        });
        setDocuments(response.results);
      } catch (error) {
        logError('Failed to load documents for linking', error);
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    setSelectedIds(linkedDocumentIds ?? []);
  }, [open, linkedDocumentIds]);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      void loadDocuments(searchQuery);
    }, 250);
    return () => clearTimeout(handle);
  }, [open, searchQuery, loadDocuments]);

  const filteredDocuments = documents;

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

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((docId) => docId !== id) : [...prev, id]));
  };

  const handleConfirm = () => {
    onSave(selectedIds);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Link Documents</DialogTitle>
          <DialogDescription>Select DMS documents to associate with this correspondence.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Search documents by title, reference, description, or tags"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />

          {recommendedIds.length > 0 && (
            <div className="text-xs text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Suggested documents based on division/subject:</p>
              <div className="flex flex-wrap gap-2">
                {recommendedIds.slice(0, 6).map((docId) => {
                  const doc = documents.find((item) => item.id === docId);
                  if (!doc) return null;
                  const selected = selectedIds.includes(docId);
                  return (
                    <Button
                      key={doc.id}
                      variant={selected ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs"
                      onClick={() => toggleSelection(doc.id)}
                    >
                      {doc.title}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <ScrollArea className="max-h-[360px] rounded-md border border-border">
            <div className="divide-y">
              {loading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Loading documents…</div>
              ) : filteredDocuments.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No documents found.</div>
              ) : (
                filteredDocuments.map((doc) => {
                  const latest = doc.versions[0];
                  const isSelected = selectedIds.includes(doc.id);
                  const isRecommended = recommendedIds.includes(doc.id);
                  return (
                    <label
                      key={doc.id}
                      className={`flex cursor-pointer flex-col gap-3 px-4 py-3 transition hover:bg-muted/40 ${
                        isSelected ? 'bg-muted/60' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelection(doc.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm text-foreground truncate">
                              {doc.title}
                            </span>
                            <Badge variant="outline" className="capitalize">
                              {doc.documentType}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {doc.status}
                            </Badge>
                            {isRecommended && (
                              <Badge variant="default" className="text-xs bg-primary/80">
                                Recommended
                              </Badge>
                            )}
                          </div>
                          {doc.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{doc.description}</p>
                          )}
                          <div className="grid gap-3 sm:grid-cols-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Hash className="h-3 w-3" />
                              <span>{doc.referenceNumber ?? 'No reference'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Layers className="h-3 w-3" />
                              <span>
                                {doc.divisionId
                                  ? divisions.find((division) => division.id === doc.divisionId)?.name ?? 'Unknown division'
                                  : 'Unassigned'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Filter className="h-3 w-3" />
                              <span>
                                {doc.departmentId
                                  ? departments.find((department) => department.id === doc.departmentId)?.name ?? 'Unknown department'
                                  : 'Unassigned'}
                              </span>
                            </div>
                          </div>
                          {latest && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              <span>
                                Updated {formatDate(doc.updatedAt)} · Version {latest.versionNumber}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Save Links
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
