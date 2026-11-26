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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { AlertTriangle, Search, Plus, Loader2, RefreshCw, ChevronDown } from "lucide-react";
import { useMemo, useCallback } from "react";
import { formatDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";

// 36px pill with a 44px pointer target: the pseudo-element adds the touch
// area without adding layout height.
const compactFooterButton =
  "relative h-9 after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']";

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
  const [loadError, setLoadError] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [notes, setNotes] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
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
      setLoadError(false);
    } else {
      // Reset state when dialog closes
      setSearchQuery("");
      setSelectedCase(null);
      setNotes("");
      setNotesOpen(false);
      setCreatingNew(false);
      setNewCaseTitle("");
      setNewCaseDescription("");
      setPage(1);
      setHasMore(false);
      setTotalCount(0);
      setLoadError(false);
    }
  }, [open]);

  const fetchCases = useCallback(
    async (pageNum: number = 1, append: boolean = false, query: string = ""): Promise<boolean> => {
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
          // A selection that is no longer listed would still be linked by the
          // footer action, so drop it when the results replace the list.
          setSelectedCase((current) =>
            current && response.results.some((item) => item.id === current.id) ? current : null,
          );
        }
        const total = response.count as number || 0;
        setHasMore(
          response.results.length === DEFAULT_LIST_PAGE_SIZE
            && pageNum * DEFAULT_LIST_PAGE_SIZE < total,
        );
        setTotalCount(total);
        setLoadError(false);
        return true;
      } catch (err) {
        // Keep the cases already on screen; a failed search must not read as
        // "there are no cases to link".
        logError("Failed to fetch cases", err);
        setLoadError(true);
        return false;
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
    // Only advance the cursor once the page arrives, so a failed append can be
    // retried instead of skipping to the page after it.
    void fetchCases(nextPage, true, searchQuery).then((ok) => {
      if (ok) setPage(nextPage);
    });
  }, [hasMore, loading, page, fetchCases, searchQuery]);

  const retryFetchCases = useCallback(() => {
    setPage(1);
    void fetchCases(1, false, searchQuery);
  }, [fetchCases, searchQuery]);

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

  const getStatusDotClass = (status: Case["status"]) => {
    switch (status) {
      case "open":
        return "bg-info";
      case "in_progress":
        return "bg-warning";
      case "resolved":
        return "bg-success";
      default:
        return "bg-muted-foreground/40";
    }
  };

  const dialogDescription = correspondenceId
    ? "Link this correspondence to an existing case or create a new one."
    : documentId
      ? "Link this document to an existing case or create a new one."
      : formDocumentId
        ? "Link this form to an existing case or create a new one."
        : "Link to an existing case or create a new one.";

  const linkedCount = linkedCaseIds.size;

  const summaryText = creatingNew
    ? "A new case is created and linked in one step."
    : selectedCase
      ? `${selectedCase.caseNumber} selected`
      : loadError && cases.length === 0
        ? "Couldn't load cases"
        : totalCount > 0
          ? `Showing ${cases.length} of ${totalCount} cases`
          : "No cases match the search";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="flex max-h-[95vh] flex-col">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>Link to case</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
          {linkedCount > 0 && (
            <p className="text-[11px] text-muted-foreground">{linkedCount} already linked</p>
          )}
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <SegmentedControl
            ariaLabel="Link an existing case or create a new one"
            value={creatingNew ? "create" : "existing"}
            onValueChange={(value) => {
              if (!linking) setCreatingNew(value === "create");
            }}
            tone="quiet"
            className={cn(
              "w-fit shrink-0 [&>button]:h-11 sm:[&>button]:h-9",
              linking && "pointer-events-none opacity-50",
            )}
            options={[
              { value: "existing", label: "Select existing" },
              { value: "create", label: "Create new", icon: Plus },
            ]}
          />

          {!creatingNew ? (
            <>
              <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search cases"
                  placeholder="Search cases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 rounded-xl border-border/60 bg-muted/30 pl-9 text-[13px] sm:h-10"
                />
              </div>

              <div
                className={cn(
                  "min-h-0 flex-1 overflow-y-auto overscroll-contain",
                  cases.length > 0 && "rounded-xl border border-border/60",
                )}
              >
                {loadError && cases.length > 0 && (
                  <div
                    role="alert"
                    className="m-3 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/[0.04] px-3 py-2.5"
                  >
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-destructive" />
                    <p className="min-w-0 flex-1 text-[12px] leading-snug text-muted-foreground">
                      Couldn&apos;t refresh cases. Showing the last loaded results.
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-11 px-2 text-xs font-medium text-primary hover:bg-primary/5 hover:text-primary sm:h-8"
                      onClick={retryFetchCases}
                      disabled={loading}
                    >
                      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {loading ? "Retrying..." : "Retry"}
                    </Button>
                  </div>
                )}
                {loadError && cases.length === 0 ? (
                  <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/[0.04] p-4">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-foreground">Couldn&apos;t load cases</p>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                          Cases may still be available to link. Retry to check.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 h-11 w-full gap-1.5 px-3 text-xs sm:h-9 sm:w-auto sm:px-3"
                      onClick={retryFetchCases}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      {loading ? "Retrying..." : "Retry"}
                    </Button>
                  </div>
                ) : loading && cases.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading cases...
                  </div>
                ) : cases.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-1 py-12 text-center">
                    <p className="text-[13px] font-medium text-foreground">
                      {searchQuery ? "No matching cases" : "No cases available"}
                    </p>
                    <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                      {searchQuery
                        ? `Nothing matches "${searchQuery}". Try a different search.`
                        : "There are no cases available to link yet."}
                    </p>
                  </div>
                ) : (
                    <RadioGroup
                      aria-label="Cases"
                      className="divide-y divide-border/60"
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
                            className={cn(
                              "flex min-w-0 items-start gap-3 px-3 py-3 transition-colors",
                              isLinked
                                ? "opacity-60"
                                : isSelected
                                  ? "bg-primary/[0.04]"
                                  : "hover:bg-muted/40",
                            )}
                          >
                            <RadioGroupItem
                              id={optionId}
                              value={caseItem.id}
                              disabled={isLinked}
                              className="mt-1 shrink-0"
                            />
                            <label
                              htmlFor={optionId}
                              className={`min-w-0 flex-1 ${isLinked ? "cursor-not-allowed" : "cursor-pointer"}`}
                            >
                              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                                <span className="font-mono text-[12px] font-medium text-foreground">
                                  {caseItem.caseNumber}
                                </span>
                                <span className="inline-flex items-center gap-1 capitalize">
                                  <span
                                    aria-hidden="true"
                                    className={cn(
                                      "h-1.5 w-1.5 rounded-full",
                                      getStatusDotClass(caseItem.status),
                                    )}
                                  />
                                  {caseItem.status.replace("_", " ")}
                                </span>
                                {caseItem.caseType && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="capitalize">{caseItem.caseType}</span>
                                  </>
                                )}
                                {isLinked && <span className="text-primary">Already linked</span>}
                              </span>
                              {caseItem.openedAt && (
                                <span className="mt-1 block text-[11px] text-muted-foreground">
                                  Opened {formatDate(caseItem.openedAt)}
                                </span>
                              )}
                              <span
                                className="mt-1 break-words text-[14px] font-medium leading-snug line-clamp-2"
                                title={caseItem.title}
                              >
                                {caseItem.title}
                              </span>
                              {caseItem.description && (
                                <span
                                  className="mt-0.5 break-words text-[12px] leading-snug text-muted-foreground line-clamp-2"
                                  title={caseItem.description}
                                >
                                  {caseItem.description}
                                </span>
                              )}
                            </label>
                          </div>
                        );
                      })}

                    </RadioGroup>
                  )}
                  {hasMore && !loadError && cases.length > 0 && (
                    <div className="border-t border-border/60 pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-muted-foreground hover:text-foreground"
                        onClick={loadMore}
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          `Load more (${totalCount - cases.length} remaining)`
                        )}
                      </Button>
                    </div>
                  )}
                </div>
            </>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="newCaseTitle" className="text-[13px] font-medium">
                    Case title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="newCaseTitle"
                    placeholder="A short, specific title"
                    value={newCaseTitle}
                    onChange={(e) => setNewCaseTitle(e.target.value)}
                    maxLength={500}
                    className="h-11 rounded-xl border-border/60 bg-muted/30 text-[13px] sm:h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newCaseDescription" className="text-[13px] font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="newCaseDescription"
                    placeholder="Add context for this case (optional)"
                    value={newCaseDescription}
                    onChange={(e) => setNewCaseDescription(e.target.value)}
                    rows={3}
                    className="min-h-[88px] resize-none rounded-xl border-border/60 bg-muted/30 text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newCaseType" className="text-[13px] font-medium">
                    Case type
                  </Label>
                  <Select
                    value={newCaseType}
                    onValueChange={(value) => setNewCaseType(value as Case["caseType"])}
                  >
                    <SelectTrigger
                      id="newCaseType"
                      className="h-11 rounded-xl border-border/60 bg-muted/30 text-[13px] sm:h-10"
                    >
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

          <Collapsible
            open={notesOpen}
            onOpenChange={setNotesOpen}
            className="shrink-0 border-t border-border/60 pt-2"
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="group/notes h-11 w-full justify-between px-2 text-xs font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground sm:h-8"
              >
                <span className="flex items-center gap-1.5">
                  Notes (optional)
                  {notes.trim() && !notesOpen ? (
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />
                  ) : null}
                </span>
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]/notes:rotate-180" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1.5 px-2 pb-2 pt-1 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1 duration-200 motion-reduce:animate-none">
              <Textarea
                id="link-case-notes"
                aria-label="Notes"
                placeholder="Add notes about this link"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="min-h-[64px] resize-none rounded-xl border-border/60 bg-muted/30 text-[13px]"
              />
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter className="shrink-0 flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="w-full min-w-0 truncate text-[11px] text-muted-foreground sm:w-auto sm:flex-1">
            {summaryText}
          </p>
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <Button
              variant="outline"
              className={cn(compactFooterButton, "px-3 text-xs")}
              onClick={() => onOpenChange(false)}
              disabled={linking}
            >
              Cancel
            </Button>
            {!creatingNew ? (
              <Button
                className={cn(compactFooterButton, "rounded-full px-4 text-xs")}
                onClick={handleLink}
                disabled={!selectedCase || linking}
              >
                {linking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Linking...
                  </>
                ) : (
                  linkActionLabel
                )}
              </Button>
            ) : (
              <Button
                className={cn(compactFooterButton, "rounded-full px-4 text-xs")}
                onClick={handleCreateAndLink}
                disabled={!newCaseTitle.trim() || linking}
              >
                {linking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create &amp; link
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
