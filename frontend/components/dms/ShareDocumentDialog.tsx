"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { logError } from '@/lib/client-logger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useOrganizationCatalogs } from "@/hooks/use-organization-catalogs";
import { usePaginatedUserSearch } from "@/hooks/use-paginated-user-search";
import type { DocumentRecord, DocumentPermission, PermissionAccess } from "@/lib/api/dms";
import { shareDocument, apiFetch, hasTokens, canShareDocument } from "@/lib/api/dms";
import {
  describeClassification,
  gradeReachesSensitivity,
} from "@/lib/classification-policy";
import { useClassificationPolicy } from "@/hooks/use-classification-policy";
import { toast } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { Search, Users, AlertTriangle, Loader2, FileText, CheckCircle2, Shield, Send } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ModalErrorBoundary } from '@/components/shared/ModalErrorBoundary';
import {
  CorrespondenceRoutingView,
  type CorrespondenceRoutingHandle,
  type CorrespondenceRoutingState,
} from "./CorrespondenceRoutingView";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

interface ShareDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentRecord | null;
  currentUserId?: string;
  onShared?: (updated?: DocumentRecord) => void;
}

/** Access choices, ordered least to most powerful. */
const ACCESS_LEVELS: { value: PermissionAccess; label: string }[] = [
  { value: 'read', label: 'Read' },
  { value: 'write', label: 'Write' },
  { value: 'admin', label: 'Admin' },
];
const ShareDocumentDialogContent = ({
  open,
  onOpenChange,
  document,
  currentUserId,
  onShared,
}: ShareDocumentDialogProps) => {
  const { divisions, officeMemberships: _officeMemberships } = useOrganizationCatalogs('divisions');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("share");
  const [accessLevel, setAccessLevel] = useState<PermissionAccess>("read");
  const [existingPermissions, setExistingPermissions] = useState<DocumentPermission[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [shareProgress, setShareProgress] = useState(0);
  const submittingRef = useRef(false);

  const [showSensitivityWarning, setShowSensitivityWarning] = useState(false);
  const [pendingShareAction, setPendingShareAction] = useState<(() => Promise<void>) | null>(null);

  const [correspondenceState, setCorrespondenceState] = useState<CorrespondenceRoutingState>({
    canSubmit: false,
    isSubmitting: false,
    summary: '',
  });
  const handleCorrespondenceState = useCallback(
    (state: CorrespondenceRoutingState) => setCorrespondenceState(state),
    [],
  );
  const correspondenceRef = useRef<CorrespondenceRoutingHandle>(null);
  const wasOpenRef = useRef(false);
  const {
    query: directSharePersonSearch,
    setQuery: setDirectSharePersonSearch,
    users: correspondenceFilteredUsers,
    userById: personSelectionLookup,
    totalCount: directShareUserCount,
    loading: loadingDirectShareUsers,
    loadingMore: loadingMoreDirectShareUsers,
    error: directShareUserError,
    hasMore: hasMoreDirectShareUsers,
    loadMore: loadMoreDirectShareUsers,
  } = usePaginatedUserSearch({
    enabled: open,
    pageSize: 50,
    excludeUserIds: currentUserId ? [currentUserId] : [],
  });
  
  // Selection state
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  // Every open starts on direct share.
  useEffect(() => {
    setActiveTab('share');
  }, [open]);

  // Fetch existing permissions
  useEffect(() => {
    if (!open || !document?.id) return;
    
    const fetchPermissions = async () => {
      try {
        if (!hasTokens()) return;
        const payload = await apiFetch<unknown>(`/dms/permissions/?document=${document.id}`);
        const rows = Array.isArray(payload)
          ? payload
          : isRecord(payload) && Array.isArray(payload.results)
            ? payload.results
            : [];
        const permissions: DocumentPermission[] = rows.filter(isRecord).map((p) => ({
          id: String(p.id ?? ''),
          access: ((typeof p.access === 'string' ? p.access : 'read') as PermissionAccess) ?? 'read',
          directorateIds: Array.isArray(p.directorate_ids) ? p.directorate_ids.map(String) : [],
          divisionIds: Array.isArray(p.division_ids) ? p.division_ids.map(String) : [],
          departmentIds: Array.isArray(p.department_ids) ? p.department_ids.map(String) : [],
          officeIds: Array.isArray(p.office_ids) ? p.office_ids.map(String) : [],
          gradeLevels: Array.isArray(p.grade_levels) ? p.grade_levels.map(String) : [],
          userIds: Array.isArray(p.user_ids) ? p.user_ids.map(String) : [],
          createdAt: typeof p.created_at === 'string' ? p.created_at : undefined,
          updatedAt: typeof p.updated_at === 'string' ? p.updated_at : undefined,
        }));
        setExistingPermissions(permissions);
      } catch (error: unknown) {
        logError('Failed to fetch document permissions', error);
      }
    };
    
    void fetchPermissions();
  }, [open, document?.id]);

  useEffect(() => {
    // Reset state only on open -> closed transition to avoid unnecessary update churn.
    if (wasOpenRef.current && !open) {
      setSelectedUserIds(new Set());
      setActiveTab("share");
      setAccessLevel("read");
      setShareProgress(0);
      setShowDuplicateWarning(false);
      setShowSensitivityWarning(false);
      setPendingShareAction(null);
    }
    wasOpenRef.current = open;
  }, [open]);

  const handleToggleDirectSharePerson = useCallback((userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }, []);

  const handleToggleAllDirectSharePeople = useCallback(() => {
    const filteredIds = correspondenceFilteredUsers.map((user) => user.id);
    setSelectedUserIds((prev) => {
      const allSelected = filteredIds.length > 0 && filteredIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        filteredIds.forEach((id) => next.delete(id));
      } else {
        filteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [correspondenceFilteredUsers]);

  // Check if recipient already has access
  const hasExistingAccess = useCallback((
    userId?: string,
    divisionId?: string,
    departmentId?: string,
    directorateId?: string
  ): { hasAccess: boolean; accessLevel?: PermissionAccess } => {
    for (const perm of existingPermissions) {
      if (userId && perm.userIds.includes(userId)) {
        return { hasAccess: true, accessLevel: perm.access };
      }
      if (divisionId && perm.divisionIds.includes(divisionId)) {
        return { hasAccess: true, accessLevel: perm.access };
      }
      if (departmentId && perm.departmentIds.includes(departmentId)) {
        return { hasAccess: true, accessLevel: perm.access };
      }
      if (directorateId) {
        if (perm.directorateIds.includes(directorateId)) {
          return { hasAccess: true, accessLevel: perm.access };
        }
        const dirDivisions = divisions.filter((d) => d.directorateId === directorateId);
        if (dirDivisions.some((d) => perm.divisionIds.includes(d.id))) {
          return { hasAccess: true, accessLevel: perm.access };
        }
      }
    }
    return { hasAccess: false };
  }, [existingPermissions, divisions]);

  // Count duplicates before submission
  const countDuplicatesForTargets = useCallback((userIds: string[]): number => {
    return userIds.filter((id) => hasExistingAccess(id).hasAccess).length;
  }, [hasExistingAccess]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!document) return;

    // Correspondence tab: submit only via CorrespondenceRoutingView (avoids duplicate buttons & stale parent state)
    if (activeTab === 'correspondence') {
      return;
    }

    // Check for sensitive document warning
    if ((document.sensitivity === 'restricted' || document.sensitivity === 'confidential') && !showSensitivityWarning) {
      setPendingShareAction(async () => {
        const { userIds } = shareTargets();

        if (userIds.length === 0) {
          toast.error('Select at least one person');
          return;
        }

        const dupCount = countDuplicatesForTargets(userIds);
        if (dupCount > 0) {
          setDuplicateCount(dupCount);
          setShowDuplicateWarning(true);
          return;
        }
        await performShare(userIds);
      });
      setShowSensitivityWarning(true);
      return;
    }

    const { userIds } = shareTargets();

    if (userIds.length === 0) {
      toast.error('Select at least one person');
      return;
    }

    // Check for duplicates
    const dupCount = countDuplicatesForTargets(userIds);
    if (dupCount > 0) {
      setDuplicateCount(dupCount);
      setShowDuplicateWarning(true);
      return;
    }

    await performShare(userIds);
  };

  const shareTargets = () => ({ userIds: Array.from(selectedUserIds) });

  const performShare = async (userIds: string[]) => {
    if (!document) return;
    if (!canShareDocument(document)) {
      toast.error(document.drmRights?.message || "Sharing blocked by DRM policy");
      return;
    }

    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setShareProgress(10);
    
    try {
      setShareProgress(30);
      
      // Share with the selected people and offices via permissions
      let updated: DocumentRecord | undefined;
      if (userIds.length > 0) {
        updated = await shareDocument(document.id, {
          userIds,
          access: accessLevel,
        });
      }
      
      setShareProgress(100);
      
      toast.success("Document shared", {
        description: `Access level: ${accessLevel}. ${userIds.length} person(s)`,
      });
      
      if (updated) {
      onShared?.(updated);
      } else {
        // Refresh document if we didn't get an updated version
        const refreshed = await apiFetch<DocumentRecord>(`/dms/documents/${document.id}/`);
        onShared?.(refreshed);
      }
      onOpenChange(false);
    } catch (error: unknown) {
      logError('Failed to share document', error);
      const errorDescription = error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.';
      toast.error('Unable to share document', {
        description: errorDescription,
        duration: 6000,
      });
    } finally {
      setIsSubmitting(false);
      setShareProgress(0);
      submittingRef.current = false;
    }
  };

  const totalSelected = selectedUserIds.size;

  // Who the share is going to, by name, for the footer summary.
  const recipientSummary = useMemo(() => {
    const names = Array.from(selectedUserIds).map(
      (id) => personSelectionLookup.get(id)?.name ?? 'Unknown person',
    );

    if (names.length === 0) return '';
    if (names.length <= 2) return names.join(', ');
    return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
  }, [selectedUserIds, personSelectionLookup]);

  // A grant never lifts the classification, so a recipient below the grade
  // would be given a permission that opens nothing. Name them before sending
  // instead of letting the share silently achieve nothing. The clearance rule
  // is the served policy, not a client copy of the grade lists.
  const classificationPolicy = useClassificationPolicy();
  const classificationRule = document && classificationPolicy
    ? classificationPolicy[document.sensitivity]
    : null;

  const sensitivityBlockedRecipients = useMemo(() => {
    if (!classificationRule) return [];
    const blocked: { id: string; name: string; grade: string }[] = [];
    selectedUserIds.forEach((id) => {
      const person = personSelectionLookup.get(id);
      if (person && !gradeReachesSensitivity(classificationRule, person.gradeLevel)) {
        blocked.push({ id, name: person.name, grade: person.gradeLevel });
      }
    });
    return blocked;
  }, [classificationRule, personSelectionLookup, selectedUserIds]);

  const blockedRecipientLabel = useMemo(() => {
    const names = sensitivityBlockedRecipients.map((person) =>
      person.grade ? `${person.name} (${person.grade})` : person.name,
    );
    if (names.length <= 3) return names.join(', ');
    return `${names.slice(0, 3).join(', ')} +${names.length - 3} more`;
  }, [sensitivityBlockedRecipients]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const form = window.document.querySelector('form');
        if (form && !isSubmitting) {
          form.requestSubmit();
        }
      }
      // Esc to close
      if (e.key === 'Escape' && !showDuplicateWarning) {
        onOpenChange(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isSubmitting, showDuplicateWarning, onOpenChange]);

  const shareBlocked = Boolean(document && !canShareDocument(document));

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size={shareBlocked ? "md" : "2xl"}
        height={shareBlocked ? "auto" : "screen"}
        density="flush"
        className="overflow-x-hidden"
      >
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b shrink-0">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0 space-y-1">
              <DialogTitle className="flex items-center gap-2 min-w-0">
                <Shield className="h-5 w-5 text-primary shrink-0" />
                <span className="truncate">Share {document?.title ?? 'document'}</span>
              </DialogTitle>
              <DialogDescription className="flex items-center gap-1.5 flex-wrap text-xs">
                {shareBlocked ? (
                  "Sharing is disabled for this document"
                ) : (
                  <>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {document?.status}
                    </Badge>
                    {document?.sensitivity && (
                      <Badge
                        variant={
                          document.sensitivity === 'restricted' || document.sensitivity === 'confidential'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="text-[10px] capitalize"
                      >
                        {document.sensitivity}
                      </Badge>
                    )}
                    {document?.effectiveRights?.view_only && (
                      <span className="text-muted-foreground">· view-only, no download or print</span>
                    )}
                  </>
                )}
              </DialogDescription>
            </div>
            {!shareBlocked && (
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 text-xs text-muted-foreground"
                  onClick={() => {
                    setActiveTab(activeTab === 'share' ? 'correspondence' : 'share');
                  }}
                  disabled={isSubmitting}
                >
                  {activeTab === 'share' ? 'Send via correspondence' : 'Back to direct share'}
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {shareBlocked && document ? (
          <div className="space-y-4 px-4 sm:px-6 py-4 overflow-x-hidden">
            <Alert className="border-amber-500/40 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm break-words">
                Sharing is blocked by DRM policy
                {document.drmRights?.policy_name || document.effectiveRights?.policy_name
                  ? ` (${document.drmRights?.policy_name || document.effectiveRights?.policy_name})`
                  : ""}
                .
              </AlertDescription>
            </Alert>
            <div className="rounded-xl border border-border/60 bg-muted/50 p-4">
              <div className="flex items-start gap-3 min-w-0">
                <FileText className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="font-semibold text-sm truncate">{document.title}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {document.status}
                    </Badge>
                    {document.sensitivity && (
                      <Badge
                        variant={
                          document.sensitivity === "restricted" || document.sensitivity === "confidential"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-[10px] capitalize"
                      >
                        {document.sensitivity}
                      </Badge>
                    )}
                  </div>
                  {document.effectiveRights && (
                    <p className="text-xs text-muted-foreground">
                      Download: {document.effectiveRights.can_download ? "Allowed" : "Blocked"}
                      {" · "}
                      Print: {document.effectiveRights.can_print ? "Allowed" : "Blocked"}
                      {document.effectiveRights.view_only ? " · View only" : ""}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {document && (
          <div className="space-y-5 px-4 sm:px-6 py-4 min-w-0">
            {/* Sharing form: who + access, one screen, no extra steps. */}
            <form id="share-form" onSubmit={handleSubmit} className="min-w-0">
              <div className="space-y-5">
              {/* Access applies to everyone selected below; correspondence ignores it. */}
              {activeTab === 'share' && (
              <div className="space-y-2 min-w-0">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <Label className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    Access
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {accessLevel === 'read'
                      ? 'View and comment only'
                      : accessLevel === 'write'
                        ? 'Edit metadata, content and versions'
                        : 'Edit, share and archive'}
                  </p>
                </div>
                <div
                  role="group"
                  aria-label="Access level"
                  className="inline-flex gap-1 rounded-lg border border-border/70 p-1"
                >
                  {ACCESS_LEVELS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={accessLevel === option.value}
                      className={
                        accessLevel === option.value
                          ? 'rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground'
                          : 'rounded-md px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted'
                      }
                      onClick={() => setAccessLevel(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              )}

              {activeTab === 'share' && <Separator />}

              {/* Share Content - Conditional based on activeTab */}
              {activeTab === 'share' && (
                <>
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <Label className="text-sm font-semibold">Share To *</Label>
                          <Badge variant={totalSelected > 0 ? 'default' : 'outline'} className="text-xs">
                            {totalSelected > 0 ? `${totalSelected} selected` : '0 recipients'}
                          </Badge>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs text-muted-foreground">Select Person</Label>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs px-2"
                                    onClick={handleToggleAllDirectSharePeople}
                                  >
                                    {correspondenceFilteredUsers.length > 0 &&
                                    correspondenceFilteredUsers.every((user) => selectedUserIds.has(user.id))
                                      ? 'Clear'
                                      : hasMoreDirectShareUsers ? 'Select shown' : 'Select all'}
                                  </Button>
                                </div>
                                {(directShareUserCount > 8 || directSharePersonSearch.trim().length > 0) && (
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                      value={directSharePersonSearch}
                                      onChange={(e) => setDirectSharePersonSearch(e.target.value)}
                                      placeholder="Search person by name, email, role..."
                                      className="pl-9 h-9"
                                    />
                                  </div>
                                )}
                                <ScrollArea className="h-[min(272px,32vh)] border rounded-md p-2">
                                  <div className="space-y-1.5 min-w-0 pr-2">
                                    {loadingDirectShareUsers && correspondenceFilteredUsers.length === 0 ? (
                                      <div className="p-3 text-xs text-muted-foreground flex items-center gap-2">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Loading users...
                                      </div>
                                    ) : correspondenceFilteredUsers.length === 0 ? (
                                      <div className="p-3 text-xs text-muted-foreground">
                                        {directShareUserError ?? 'No matching users found.'}
                                      </div>
                                    ) : (
                                      correspondenceFilteredUsers.map((user) => {
                                        const selected = selectedUserIds.has(user.id);
                                        return (
                                          <div
                                            key={user.id}
                                            role="button"
                                            tabIndex={0}
                                            className={`w-full max-w-full text-left flex items-start gap-2 p-2 rounded border min-w-0 ${selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'}`}
                                            onClick={() => handleToggleDirectSharePerson(user.id)}
                                            onKeyDown={(event) => {
                                              if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                handleToggleDirectSharePerson(user.id);
                                              }
                                            }}
                                          >
                                            <span
                                              className={`mt-0.5 h-4 w-4 rounded-sm border flex items-center justify-center flex-shrink-0 ${
                                                selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background'
                                              }`}
                                              aria-hidden="true"
                                            >
                                              {selected ? <CheckCircle2 className="h-3 w-3" /> : null}
                                            </span>
                                            <div className="min-w-0 flex-1 overflow-hidden">
                                              <p className="text-sm font-medium truncate">{user.name}</p>
                                              <p className="text-xs text-muted-foreground truncate">
                                                {user.email} • {user.gradeLevel || user.systemRole || 'User'}
                                              </p>
                                            </div>
                                          </div>
                                        );
                                      })
                                    )}
                                    {hasMoreDirectShareUsers ? (
                                      <div className="pt-2">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="w-full"
                                          onClick={loadMoreDirectShareUsers}
                                          disabled={loadingMoreDirectShareUsers}
                                        >
                                          {loadingMoreDirectShareUsers ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                                          ) : null}
                                          Load more users
                                        </Button>
                                      </div>
                                    ) : null}
                                  </div>
                                </ScrollArea>
                              </div>
                              {sensitivityBlockedRecipients.length > 0 && (
                                <Alert variant="destructive">
                                  <AlertTriangle className="h-4 w-4" />
                                  <AlertDescription className="text-xs">
                                    {sensitivityBlockedRecipients.length === 1
                                      ? '1 selected person cannot open this document: '
                                      : `${sensitivityBlockedRecipients.length} selected people cannot open this document: `}
                                    <span className="font-medium">{blockedRecipientLabel}</span>.
                                    {' '}
                                    {classificationRule?.label ?? document.sensitivity} documents:{' '}
                                    {classificationRule ? describeClassification(classificationRule) : ''}.
                                    Sharing with them would grant no access.
                                  </AlertDescription>
                                </Alert>
                              )}
</div>
                      </div>
                    </div>
                </>
              )}

              {/* Correspondence Content */}
              {activeTab === 'correspondence' && document && (
                <CorrespondenceRoutingView
                  ref={correspondenceRef}
                  document={document}
                  onStateChange={handleCorrespondenceState}
                  onComplete={() => {
                    onOpenChange(false);
                    onShared?.(document);
                  }}
                />
              )}
              {/* Progress Indicator */}
              {shareProgress > 0 && shareProgress < 100 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${shareProgress}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{Math.round(shareProgress)}%</span>
                  </div>
                </div>
              )}
            </div>
            </form>
          </div>
        )}
        </div>
        )}

        <DialogFooter className="flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t px-4 sm:px-6 py-3 shrink-0">
          {shareBlocked ? (
            <>
              <div className="text-xs text-muted-foreground">
                Change the DRM policy to allow sharing.
              </div>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </>
          ) : (
            <>
              <div className="min-w-0 w-full sm:w-auto sm:flex-1">
                {activeTab === 'correspondence' ? (
                  <p className="truncate text-xs text-muted-foreground">
                    <span className="text-foreground">
                      {correspondenceState.summary || 'Choose the receiving office'}
                    </span>
                  </p>
                ) : totalSelected > 0 ? (
                  <p className="truncate text-xs text-muted-foreground">
                    <span className="text-foreground">{recipientSummary}</span>
                    {' · '}
                    <span className="capitalize">{accessLevel}</span> access
                  </p>
                ) : (
                  <p className="truncate text-xs text-muted-foreground">Select recipients above</p>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting || correspondenceState.isSubmitting}
                >
                  Cancel
                </Button>
                {activeTab === 'correspondence' ? (
                  <Button
                    type="button"
                    onClick={() => correspondenceRef.current?.submit()}
                    disabled={
                      !correspondenceState.canSubmit ||
                      correspondenceState.isSubmitting ||
                      !document
                    }
                    className="bg-gradient-primary hover:opacity-90 transition-opacity gap-2"
                  >
                    {correspondenceState.isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send via Correspondence
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    form="share-form"
                    disabled={
                      isSubmitting ||
                      totalSelected === 0 ||
                      !canShareDocument(document)
                    }
                    className="bg-gradient-primary hover:opacity-90 transition-opacity gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sharing...
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4" />
                        Share Document
                      </>
                    )}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Sensitivity Warning */}
    <AlertDialog open={showSensitivityWarning} onOpenChange={setShowSensitivityWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Share {document?.sensitivity === 'restricted' ? 'Restricted' : 'Confidential'} Document?</AlertDialogTitle>
          <AlertDialogDescription>
            This document is marked as <strong>{document?.sensitivity}</strong>. Sharing it may expose sensitive information.
            Please ensure all recipients have appropriate clearance and authorization to access this document.
          </AlertDialogDescription>
          {document && (document.sensitivity === 'restricted' || document.sensitivity === 'confidential') && (
            <Alert variant="destructive" className="mt-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                This action will be logged for security and compliance purposes.
              </AlertDescription>
            </Alert>
          )}
          {sensitivityBlockedRecipients.length > 0 && document && (
            <Alert variant="destructive" className="mt-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <span className="font-medium">{blockedRecipientLabel}</span> cannot reach{' '}
                {(classificationRule?.label ?? document.sensitivity).toLowerCase()} documents, so
                this share will open nothing for them.
              </AlertDescription>
            </Alert>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => {
            setShowSensitivityWarning(false);
            setPendingShareAction(null);
          }}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              setShowSensitivityWarning(false);
              if (pendingShareAction) {
                await pendingShareAction();
                setPendingShareAction(null);
              }
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Share Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Duplicate Warning */}
    <AlertDialog open={showDuplicateWarning} onOpenChange={setShowDuplicateWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Duplicate Access Detected</AlertDialogTitle>
          <AlertDialogDescription>
            {duplicateCount} of your selected recipients already have access to this document.
            Continuing will create duplicate permissions. Do you want to proceed anyway?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setShowDuplicateWarning(false)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setShowDuplicateWarning(false);
              const { userIds } = shareTargets();
              void performShare(userIds);
            }}
          >
            Continue Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export const ShareDocumentDialog = React.memo((props: ShareDocumentDialogProps) => (
  <ModalErrorBoundary onClose={() => props.onOpenChange?.(false)}>
    <ShareDocumentDialogContent {...props} />
  </ModalErrorBoundary>
));
ShareDocumentDialog.displayName = 'ShareDocumentDialog';
