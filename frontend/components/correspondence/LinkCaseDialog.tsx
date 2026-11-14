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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCases, linkCorrespondenceToCase, linkDocumentToCase, linkFormToCase, createCase } from "@/lib/api/cases";
import { DEFAULT_LIST_PAGE_SIZE } from "@/lib/pagination-constants";
import type { Case } from "@/lib/npa-structure";
import type { DocumentRecord } from "@/lib/api/dms";
import { logError } from "@/lib/client-logger";
import { toast } from "@/components/ui/sonner";
import { Search, Plus, Briefcase, Loader2 } from "lucide-react";
import { useMemo, useCallback } from "react";
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
    } else {
      // Reset state when dialog closes
      setSearchQuery("");
      setSelectedCase(null);
      setNotes("");
      setCreatingNew(false);
      setNewCaseTitle("");
      setNewCaseDescription("");
      setPage(1);
      setHasMore(false);
      setTotalCount(0);
    }
  }, [open]);

  const fetchCases = useCallback(
    async (pageNum: number = 1, append: boolean = false, query: string = "") => {
    setLoading(true);
    try {
      const response = await getCases({
        page: pageNum,
        pageSize: DEFAULT_LIST_PAGE_SIZE,
        search: query.trim() || undefined,
        ordering: "-opened_at",
        // Linking is an org-wide filing action; the endpoint defaults to
        // "personal", which hid most cases from this picker.
        scope: "all",
      });
      if (append) {
        setCases((prev) => [...prev, ...response.results]);
      } else {
        setCases(response.results);
      }
      const total = response.count as number || 0;
      setHasMore(
        response.results.length === DEFAULT_LIST_PAGE_SIZE
          && pageNum * DEFAULT_LIST_PAGE_SIZE < total,
      );
      setTotalCount(total);
    } catch (err) {
      logError("Failed to fetch cases", err);
      toast.error("Failed to load cases");
    } finally {
        setLoading(false);
      }
    },
    [],
  );

  // One debounced loader owns the list, so opening can't fetch twice.
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setPage(1);
      void fetchCases(1, false, searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, open, fetchCases]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    void fetchCases(nextPage, true, searchQuery);
  }, [hasMore, loading, page, fetchCases, searchQuery]);

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

  const linkActionLabel = documentId
    ? "Link document"
    : correspondenceId
      ? "Link correspondence"
      : formDocumentId
        ? "Link form"
        : "Link";

  const getStatusBadgeClass = (status: Case["status"]) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "resolved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "closed":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-foreground";
    }
  };

  const linkedCount = linkedCaseIds.size;

  const summaryText = creatingNew
    ? "A new case is created and linked in one step."
    : selectedCase
      ? `${selectedCase.caseNumber} selected`
      : totalCount > 0
        ? `Showing ${cases.length} of ${totalCount} cases`
        : "No cases match the search";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" height="fill" density="flush">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b shrink-0 pr-12">
          <DialogTitle className="flex items-center gap-2 min-w-0">
            <Briefcase className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate">Link to Case</span>
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span>
              {correspondenceId && "Link this correspondence to an existing case or create a new one."}
              {documentId && "Link this document to an existing case or create a new one."}
              {formDocumentId && "Link this form to an existing case or create a new one."}
            </span>
            {linkedCount > 0 ? (
              <Badge variant="outline" className="text-[10px]">
                {linkedCount} already linked
              </Badge>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 sm:px-6 py-4">
          <div
            role="group"
            aria-label="Link an existing case or create a new one"
            className="inline-flex w-fit shrink-0 gap-1 rounded-lg border border-border/70 p-1"
          >
            {[
              { create: false, label: "Select existing" },
              { create: true, label: "Create new" },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                aria-pressed={creatingNew === option.create}
                disabled={linking}
                className={
                  creatingNew === option.create
                    ? "rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
                    : "rounded-md px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                }
                onClick={() => setCreatingNew(option.create)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {!creatingNew ? (
            <>
              <div className="relative shrink-0">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search cases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-9"
                />
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-muted/30 p-2">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
                  {loading && cases.length === 0 ? (
                    <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading cases...
                    </div>
                  ) : cases.length === 0 ? (
                    <div className="p-3 text-xs text-muted-foreground">
                      {searchQuery
                        ? `No cases match "${searchQuery}". Try a different search term.`
                        : "No cases available to link."}
                    </div>
                  ) : (
                    <RadioGroup
                      aria-label="Cases"
                      className="gap-1 pr-2"
                      value={selectedCase?.id ?? ""}
                      onValueChange={(caseId) => {
                        setSelectedCase(cases.find((item) => item.id === caseId) ?? null);
                      }}
                    >
                      {cases.map((caseItem) => {
                        const isLinked = linkedCaseIds.has(caseItem.id);
                        const isSelected = selectedCase?.id === caseItem.id;
                        const optionId = `link-case-option-${caseItem.id}`;
                        return (
                          <div
                            key={caseItem.id}
                            className={`flex items-start gap-2.5 rounded-lg border p-2 transition-colors ${
                              isLinked
                                ? "border-border bg-background/50 opacity-60"
                                : isSelected
                                  ? "border-primary bg-primary/5"
                                  : "border-border bg-background hover:bg-muted/50"
                            }`}
                          >
                            <RadioGroupItem
                              id={optionId}
                              value={caseItem.id}
                              disabled={isLinked}
                              className="mt-0.5 shrink-0"
                            />
                            <label
                              htmlFor={optionId}
                              className={`min-w-0 flex-1 ${isLinked ? "cursor-not-allowed" : "cursor-pointer"}`}
                            >
                              <span className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono text-xs font-medium">
                                  {caseItem.caseNumber}
                                </span>
                                <Badge
                                  className={`h-4 px-1.5 py-0 text-[10px] leading-none ${getStatusBadgeClass(caseItem.status)}`}
                                >
                                  <span className="capitalize">
                                    {caseItem.status.replace("_", " ")}
                                  </span>
                                </Badge>
                                {isLinked && (
                                  <Badge
                                    variant="outline"
                                    className="h-4 px-1.5 py-0 text-[10px] leading-none"
                                  >
                                    Already linked
                                  </Badge>
                                )}
                                {caseItem.caseType && (
                                  <Badge
                                    variant="secondary"
                                    className="h-4 px-1.5 py-0 text-[10px] capitalize leading-none"
                                  >
                                    {caseItem.caseType}
                                  </Badge>
                                )}
                              </span>
                              <span className="mt-0.5 block truncate text-sm font-medium">
                                {caseItem.title}
                              </span>
                              {(caseItem.description || caseItem.openedAt) && (
                                <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                                  {caseItem.description && (
                                    <span className="truncate">{caseItem.description}</span>
                                  )}
                                  {caseItem.description && caseItem.openedAt && (
                                    <span aria-hidden="true">·</span>
                                  )}
                                  {caseItem.openedAt && (
                                    <span className="shrink-0">
                                      Opened {formatDateShort(caseItem.openedAt)}
                                    </span>
                                  )}
                                </span>
                              )}
                            </label>
                          </div>
                        );
                      })}

                      {hasMore && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={loadMore}
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                              Loading...
                            </>
                          ) : (                              `Load more (${totalCount - cases.length} remaining)`
                            )}
                        </Button>
                      )}
                    </RadioGroup>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
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
            </div>
          )}

          <div className="shrink-0 space-y-1.5">
            <Label htmlFor="link-case-notes" className="text-xs font-medium">
              Notes (optional)
            </Label>
            <Textarea
              id="link-case-notes"
              placeholder="Add notes about this link"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="min-h-0 resize-none"
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-3 border-t px-4 py-3 shrink-0 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="w-full min-w-0 truncate text-xs text-muted-foreground sm:w-auto sm:flex-1">
            {summaryText}
          </p>
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={linking}>
              Cancel
            </Button>
            {!creatingNew ? (
              <Button onClick={handleLink} disabled={!selectedCase || linking}>
                {linking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Linking...
                  </>
                ) : (
                  linkActionLabel
                )}
              </Button>
            ) : (
              <Button onClick={handleCreateAndLink} disabled={!newCaseTitle.trim() || linking}>
                {linking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create &amp; Link
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
