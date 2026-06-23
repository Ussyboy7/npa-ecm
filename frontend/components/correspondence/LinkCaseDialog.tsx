"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCases, linkCorrespondenceToCase, linkDocumentToCase, linkFormToCase, createCase } from "@/lib/api/cases";
import type { Case } from "@/lib/npa-structure";
import type { DocumentRecord } from "@/lib/dms-storage";
import { logError } from "@/lib/client-logger";
import { toast } from "sonner";
import { Search, Plus, FolderTree, Loader2, Info, ChevronRight, Calendar } from "lucide-react";
import { useMemo, useCallback } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateShort } from "@/lib/correspondence-helpers";

interface LinkCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  correspondenceId?: string;
  documentId?: string;
  formDocumentId?: string;
  document?: DocumentRecord | null; // Pass document to check already linked cases
  onLinked?: () => void;
}

export function LinkCaseDialog({
  open,
  onOpenChange,
  correspondenceId,
  documentId,
  formDocumentId,
  document,
  onLinked,
}: LinkCaseDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [previewCase, setPreviewCase] = useState<Case | null>(null);
  const [notes, setNotes] = useState("");
  const [creatingNew, setCreatingNew] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState("");
  const [newCaseDescription, setNewCaseDescription] = useState("");
  const [newCaseType, setNewCaseType] = useState<Case["caseType"]>("general");
  const [linking, setLinking] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Get already linked case IDs
  const linkedCaseIds = useMemo(() => {
    if (!document?.case_links) return new Set<string>();
    return new Set(document.case_links.map((link) => link.case.id));
  }, [document?.case_links]);

  useEffect(() => {
    if (open) {
      setPage(1);
      fetchCases(1);
    } else {
      // Reset state when dialog closes
      setSearchQuery("");
      setSelectedCase(null);
      setPreviewCase(null);
      setNotes("");
      setCreatingNew(false);
      setNewCaseTitle("");
      setNewCaseDescription("");
      setPage(1);
      setHasMore(false);
      setTotalCount(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('last_case_type');
      if (saved && ['general', 'complaint', 'request', 'inquiry', 'project', 'legal', 'audit'].includes(saved)) {
        setNewCaseType(saved as Case["caseType"]);
      }
    }
  }, []);

  const fetchCases = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    setLoading(true);
    try {
      const response = await getCases({
        page: pageNum,
        pageSize: 20,
        search: searchQuery.trim() || undefined,
        ordering: "-opened_at",
      });
      if (append) {
        setCases((prev) => [...prev, ...response.results]);
      } else {
        setCases(response.results);
      }
      setHasMore(response.results.length === 20 && (pageNum * 20) < (response.count as number || 0));
      setTotalCount(response.count as number || 0);
    } catch (err) {
      logError("Failed to fetch cases", err);
      toast.error("Failed to load cases");
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  // Improved search debouncing (200ms instead of 300ms)
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setPage(1);
      fetchCases(1, false);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, open, fetchCases]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCases(nextPage, true);
  }, [hasMore, loading, page, fetchCases]);

  const handleLink = async () => {
    if (!selectedCase) {
      toast.error("Please select a case");
      return;
    }

    setLinking(true);
    try {
      if (correspondenceId) {
        await linkCorrespondenceToCase(selectedCase.id, correspondenceId, false, notes);
        toast.success("Correspondence linked to case");
      } else if (documentId) {
        await linkDocumentToCase(selectedCase.id, documentId, notes);
        toast.success("Document linked to case");
      } else if (formDocumentId) {
        await linkFormToCase(selectedCase.id, formDocumentId, notes);
        toast.success("Form linked to case");
      }
      onLinked?.();
      onOpenChange(false);
    } catch (err) {
      logError("Failed to link to case", err);
      toast.error("Failed to link to case");
    } finally {
      setLinking(false);
    }
  };

  const handleCreateAndLink = async () => {
    if (!newCaseTitle.trim()) {
      toast.error("Please enter a case title");
      return;
    }

    setLinking(true);
    try {
      // Save case type to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('last_case_type', newCaseType);
      }
      
      const newCase = await createCase({
        title: newCaseTitle,
        description: newCaseDescription,
        caseType: newCaseType,
        priority: "medium",
      });
      
      // Link to the new case
      if (correspondenceId) {
        await linkCorrespondenceToCase(newCase.id, correspondenceId, false, notes);
        toast.success("Case created and correspondence linked");
      } else if (documentId) {
        await linkDocumentToCase(newCase.id, documentId, notes);
        toast.success("Case created and document linked");
      } else if (formDocumentId) {
        await linkFormToCase(newCase.id, formDocumentId, notes);
        toast.success("Case created and form linked");
      }
      onLinked?.();
      onOpenChange(false);
    } catch (err) {
      logError("Failed to create case", err);
      toast.error("Failed to create case");
    } finally {
      setLinking(false);
    }
  };

  const getStatusBadgeClass = (status: Case["status"]) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "resolved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "closed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      default:
        return "bg-muted text-foreground";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Link to Case</DialogTitle>
          <DialogDescription>
            {correspondenceId && "Link this correspondence to an existing case or create a new one."}
            {documentId && "Link this document to an existing case or create a new one."}
            {formDocumentId && "Link this form to an existing case or create a new one."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-6 py-4">
            {/* Toggle between existing and new */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={!creatingNew ? "default" : "outline"}
                size="sm"
                onClick={() => setCreatingNew(false)}
              >
                Select Existing
              </Button>
              <Button
                type="button"
                variant={creatingNew ? "default" : "outline"}
                size="sm"
                onClick={() => setCreatingNew(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New
              </Button>
            </div>

            {!creatingNew ? (
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search cases..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>

                {/* Cases List */}
                <div className="border rounded-md">
                  <ScrollArea className="h-[300px]">
                    {loading && cases.length === 0 ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : cases.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FolderTree className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No cases found</p>
                        {searchQuery && (
                          <p className="text-xs mt-1">Try a different search term</p>
                        )}
                      </div>
                    ) : (
                      <div className="p-2 space-y-2">
                        {cases.map((caseItem) => {
                          const isLinked = linkedCaseIds.has(caseItem.id);
                          const isSelected = selectedCase?.id === caseItem.id;
                          return (
                            <div
                              key={caseItem.id}
                              className={`p-3 border rounded-md transition-colors ${
                                isLinked
                                  ? "opacity-60 cursor-not-allowed bg-muted/30"
                                  : isSelected
                                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 cursor-pointer"
                                    : "hover:bg-muted/50 cursor-pointer"
                              }`}
                              onClick={() => !isLinked && setSelectedCase(caseItem)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <FolderTree className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <span className="font-mono text-sm font-medium">
                                      {caseItem.caseNumber}
                                    </span>
                                    <Badge className={getStatusBadgeClass(caseItem.status)}>
                                      {caseItem.status.replace("_", " ").toUpperCase()}
                                    </Badge>
                                    {isLinked && (
                                      <Badge variant="outline" className="text-xs">
                                        Already Linked
                                      </Badge>
                                    )}
                                    {caseItem.caseType && (
                                      <Badge variant="secondary" className="text-xs capitalize">
                                        {caseItem.caseType}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm font-medium truncate">{caseItem.title}</p>
                                  {caseItem.description && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                      {caseItem.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                    {caseItem.openedAt && (
                                      <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>Opened {formatDateShort(caseItem.openedAt)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 flex-shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewCase(caseItem);
                                      }}
                                    >
                                      <Info className="h-4 w-4" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80" align="end">
                                    <div className="space-y-3">
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Case Number</p>
                                        <p className="text-sm font-mono">{caseItem.caseNumber}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Title</p>
                                        <p className="text-sm">{caseItem.title}</p>
                                      </div>
                                      {caseItem.description && (
                                        <div>
                                          <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                                          <p className="text-sm text-muted-foreground">{caseItem.description}</p>
                                        </div>
                                      )}
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <p className="text-xs font-medium text-muted-foreground mb-1">Type</p>
                                          <Badge variant="secondary" className="text-xs capitalize">
                                            {caseItem.caseType || 'General'}
                                          </Badge>
                                        </div>
                                        <div>
                                          <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
                                          <Badge className={getStatusBadgeClass(caseItem.status)}>
                                            {caseItem.status.replace("_", " ").toUpperCase()}
                                          </Badge>
                                        </div>
                                      </div>
                                      {caseItem.openedAt && (
                                        <div>
                                          <p className="text-xs font-medium text-muted-foreground mb-1">Opened</p>
                                          <p className="text-sm">{formatDateShort(caseItem.openedAt)}</p>
                                        </div>
                                      )}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                          );
                        })}
                        {hasMore && (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={loadMore}
                            disabled={loading}
                          >
                            {loading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              <>
                                Load More ({totalCount - cases.length} remaining)
                                <ChevronRight className="h-4 w-4 ml-2" />
                              </>
                            )}
                          </Button>
                        )}
                        {totalCount > 0 && (
                          <p className="text-xs text-center text-muted-foreground py-2">
                            Showing {cases.length} of {totalCount} cases
                          </p>
                        )}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newCaseTitle">
                    Case Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="newCaseTitle"
                    placeholder="Enter case title"
                    value={newCaseTitle}
                    onChange={(e) => setNewCaseTitle(e.target.value)}
                    maxLength={500}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newCaseDescription">Description</Label>
                  <Textarea
                    id="newCaseDescription"
                    placeholder="Enter case description (optional)"
                    value={newCaseDescription}
                    onChange={(e) => setNewCaseDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newCaseType">Case Type</Label>
                  <Select
                    value={newCaseType}
                    onValueChange={(value) => setNewCaseType(value as Case["caseType"])}
                  >
                    <SelectTrigger id="newCaseType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="complaint">Complaint</SelectItem>
                      <SelectItem value="request">Request</SelectItem>
                      <SelectItem value="inquiry">Inquiry</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                      <SelectItem value="audit">Audit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Notes Section - Always visible */}
            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="notes" className="text-sm font-medium">
                Notes (optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Add notes about this link"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Add any additional context or notes about linking this item to the case.
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={linking} className="w-full sm:w-auto">
            Cancel
          </Button>
          {!creatingNew ? (
            <Button onClick={handleLink} disabled={!selectedCase || linking} className="w-full sm:w-auto">
              {linking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span className="hidden sm:inline">Linking...</span>
                  <span className="sm:hidden">Linking...</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Link to Case</span>
                  <span className="sm:hidden">Link</span>
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleCreateAndLink} disabled={!newCaseTitle.trim() || linking} className="w-full sm:w-auto">
              {linking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span className="hidden sm:inline">Creating...</span>
                  <span className="sm:hidden">Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Create & Link</span>
                  <span className="sm:hidden">Create</span>
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

