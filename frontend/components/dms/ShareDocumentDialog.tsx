"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { logError, logWarn } from '@/lib/client-logger';
import { fetchAllCatalogPaginated } from '@/lib/pagination-utils';
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { DocumentRecord, DocumentPermission, PermissionAccess } from "@/lib/dms-storage";
import type { User } from "@/lib/npa-structure";
import { shareDocument, apiFetch, hasTokens } from "@/lib/dms-storage";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Search, Users, Building2, Users2, AlertTriangle, Loader2, X, FileText, Trash2, History, FolderKanban, CheckCircle2, ArrowLeft, Shield, Mail, Send } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { getActivityLogsForObject, type ActivityLog } from "@/lib/audit-storage";
import { fetchWorkspaces, type DocumentWorkspace } from "@/lib/dms-storage";
import { filterUsersBySearch } from "@/lib/routing-utils";
import { CorrespondenceRoutingView } from "./CorrespondenceRoutingView";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

interface ShareDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentRecord | null;
  currentUserId?: string;
  onShared?: (updated?: DocumentRecord) => void;
  initialView?: 'share' | 'permissions'; // Control which view opens initially
}

const MAX_NOTE_LENGTH = 500;
const RECENT_RECIPIENTS_KEY = 'dms_recent_recipients';

interface RecentRecipients {
  users: string[];
  divisions: string[];
  departments: string[];
  directorates: string[];
}

export const ShareDocumentDialog = ({
  open,
  onOpenChange,
  document,
  currentUserId,
  onShared,
  initialView = 'share',
}: ShareDocumentDialogProps) => {
  const { users, directorates, divisions, departments, offices, officeMemberships: _officeMemberships } = useOrganization();
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDirectorateQuery, setSearchDirectorateQuery] = useState("");
  const [searchDivisionQuery, setSearchDivisionQuery] = useState("");
  const [searchDepartmentQuery, setSearchDepartmentQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("share");
  const [accessLevel, setAccessLevel] = useState<PermissionAccess>("read");
  const [existingPermissions, setExistingPermissions] = useState<DocumentPermission[]>([]);
  const [showShareAllConfirm, setShowShareAllConfirm] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [shareProgress, setShareProgress] = useState(0);
  const [editingPermissionId, setEditingPermissionId] = useState<string | null>(null);
  const [deletingPermissionId, setDeletingPermissionId] = useState<string | null>(null);
  const [showDeletePermissionConfirm, setShowDeletePermissionConfirm] = useState(false);
  const [permissionToDelete, setPermissionToDelete] = useState<string | null>(null);
  const [selectedSystemRoles, setSelectedSystemRoles] = useState<Set<string>>(new Set());
  const [showReviewStep, setShowReviewStep] = useState(false);
  const [showSensitivityWarning, setShowSensitivityWarning] = useState(false);
  const [pendingShareAction, setPendingShareAction] = useState<(() => Promise<void>) | null>(null);
  const [showPermissionsView, setShowPermissionsView] = useState(false);
  const [showHistoryView, setShowHistoryView] = useState(false);
  const [, setShareSection] = useState<'users' | 'org' | 'workspaces'>('users');
  
  // Share history and workspaces
  const [shareHistory, setShareHistory] = useState<ActivityLog[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [_workspaces, setWorkspaces] = useState<DocumentWorkspace[]>([]);
  const [, setIsLoadingWorkspaces] = useState(false);
  const [, setSelectedWorkspaceIds] = useState<Set<string>>(new Set());
  const [_searchWorkspaceQuery, setSearchWorkspaceQuery] = useState("");
  
  // Correspondence routing state
  const [_correspondenceRecipient, setCorrespondenceRecipient] = useState<string>('');
  const [_correspondenceTargetOfficeId, setCorrespondenceTargetOfficeId] = useState<string>('');
  const [correspondenceRouteType, setCorrespondenceRouteType] = useState<'person' | 'office'>('person');
  const [_correspondencePersonSearchQuery, setCorrespondencePersonSearchQuery] = useState('');
  const [correspondenceOfficeSearchQuery, setCorrespondenceOfficeSearchQuery] = useState('');
  const [correspondenceOfficeFilterDirectorate, setCorrespondenceOfficeFilterDirectorate] = useState<string>('all');
  const [correspondenceOfficeFilterDivision, setCorrespondenceOfficeFilterDivision] = useState<string>('all');
  const [_correspondencePurpose, setCorrespondencePurpose] = useState<'action' | 'information' | 'comment' | 'approval'>('action');
  const [_correspondenceNotes, setCorrespondenceNotes] = useState<string>('');
  const [correspondenceSubject, setCorrespondenceSubject] = useState<string>('');
  const [_correspondencePriority, setCorrespondencePriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [directShareSelectedOfficeIds, setDirectShareSelectedOfficeIds] = useState<Set<string>>(new Set());
  const [directSharePersonSearch, setDirectSharePersonSearch] = useState('');
  const [directShareOfficeSearch, setDirectShareOfficeSearch] = useState('');
  const [debouncedPersonSearch, setDebouncedPersonSearch] = useState('');
  const [debouncedOfficeSearch, setDebouncedOfficeSearch] = useState('');
  const [fallbackRecipientUsers, setFallbackRecipientUsers] = useState<User[]>([]);
  const [loadingFallbackRecipients, setLoadingFallbackRecipients] = useState(false);
  const [hasLoadedDirectShareUsers, setHasLoadedDirectShareUsers] = useState(false);
  const wasOpenRef = useRef(false);
  
  // Selection state
  const [shareToAll, setShareToAll] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [selectedDirectorateIds, setSelectedDirectorateIds] = useState<Set<string>>(new Set());
  const [selectedDivisionIds, setSelectedDivisionIds] = useState<Set<string>>(new Set());
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<Set<string>>(new Set());
  const [recentRecipients, setRecentRecipients] = useState<RecentRecipients>({
    users: [],
    divisions: [],
    departments: [],
    directorates: [],
  });

  // Set initial view when dialog opens
  useEffect(() => {
    if (open) {
      // Ensure we're on the share tab to show permissions view
      setActiveTab('share');
      if (initialView === 'permissions') {
        setShowPermissionsView(true);
      } else {
        setShowPermissionsView(false);
      }
    } else {
      // Reset when dialog closes
      setShowPermissionsView(false);
      setActiveTab('share');
    }
  }, [open, initialView]);

  // Fetch existing permissions
  useEffect(() => {
    if (!open || !document?.id) return;
    
    setIsLoadingPermissions(true);
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
          divisionIds: Array.isArray(p.division_ids) ? p.division_ids.map(String) : [],
          departmentIds: Array.isArray(p.department_ids) ? p.department_ids.map(String) : [],
          gradeLevels: Array.isArray(p.grade_levels) ? p.grade_levels.map(String) : [],
          userIds: Array.isArray(p.user_ids) ? p.user_ids.map(String) : [],
          createdAt: typeof p.created_at === 'string' ? p.created_at : undefined,
          updatedAt: typeof p.updated_at === 'string' ? p.updated_at : undefined,
        }));
        setExistingPermissions(permissions);
      } catch (error: unknown) {
        logError('Failed to fetch document permissions', error);
      } finally {
        setIsLoadingPermissions(false);
      }
    };
    
    void fetchPermissions();
  }, [open, document?.id]);

  // Fetch share history (audit logs)
  useEffect(() => {
    if (!open || !document?.id) return;
    
    setIsLoadingHistory(true);
    const fetchHistory = async () => {
      try {
        if (!hasTokens()) {
          setIsLoadingHistory(false);
          return;
        }
        const logs = await getActivityLogsForObject('document', document.id);
        // Filter for sharing-related actions
        const shareLogs = logs.filter(log => 
          log.action === 'document_shared' && log.module === 'dms'
        );
        setShareHistory(shareLogs);
      } catch (error: unknown) {
        // Silently handle - audit logs are not critical
        logWarn('Failed to fetch share history:', error);
        setShareHistory([]);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    
    void fetchHistory();
  }, [open, document?.id]);

  // Fetch workspaces
  useEffect(() => {
    if (!open) return;
    
    setIsLoadingWorkspaces(true);
    const fetchWorkspacesData = async () => {
      try {
        if (!hasTokens()) {
          setIsLoadingWorkspaces(false);
          return;
        }
        const spaces = await fetchWorkspaces();
        setWorkspaces(spaces);
      } catch (error: unknown) {
        // Silently handle - workspaces are optional
        logWarn('Failed to fetch workspaces:', error);
        setWorkspaces([]);
      } finally {
        setIsLoadingWorkspaces(false);
      }
    };
    
    void fetchWorkspacesData();
  }, [open]);

  // Load recent recipients
  useEffect(() => {
    if (!open) return;
    try {
      const saved = localStorage.getItem(RECENT_RECIPIENTS_KEY);
      if (saved) {
        setRecentRecipients(JSON.parse(saved));
      }
    } catch {
      // Ignore
    }
  }, [open]);

  // Save recent recipients
  const saveRecentRecipients = useCallback((updates: Partial<RecentRecipients>) => {
    try {
      const updated = { ...recentRecipients, ...updates };
      // Limit to last 10 per category
      Object.keys(updated).forEach((key) => {
        const k = key as keyof RecentRecipients;
        updated[k] = updated[k].slice(0, 10);
      });
      localStorage.setItem(RECENT_RECIPIENTS_KEY, JSON.stringify(updated));
      setRecentRecipients(updated);
    } catch {
      // Ignore
    }
  }, [recentRecipients]);

  useEffect(() => {
    // Reset state only on open -> closed transition to avoid unnecessary update churn.
    if (wasOpenRef.current && !open) {
      setNote("");
      setSearchQuery("");
      setSearchDirectorateQuery("");
      setSearchDivisionQuery("");
      setSearchDepartmentQuery("");
      setShareToAll(false);
      setSelectedUserIds(new Set());
      setSelectedDirectorateIds(new Set());
      setSelectedDivisionIds(new Set());
      setSelectedDepartmentIds(new Set());
      setSelectedSystemRoles(new Set());
      setActiveTab("share");
      setShareSection('users');
      setShowPermissionsView(false);
      setShowHistoryView(false);
      setAccessLevel("read");
      setShareProgress(0);
      setShowShareAllConfirm(false);
      setShowDuplicateWarning(false);
      setShowSensitivityWarning(false);
      setPendingShareAction(null);
      setShowDeletePermissionConfirm(false);
      setPermissionToDelete(null);
      setShowReviewStep(false);
      setSelectedWorkspaceIds(new Set());
      setSearchWorkspaceQuery("");
      setShareHistory([]);
      // Reset correspondence state
      setCorrespondenceRecipient('');
      setCorrespondenceTargetOfficeId('');
      setCorrespondenceRouteType('person');
      setCorrespondencePersonSearchQuery('');
      setCorrespondenceOfficeSearchQuery('');
      setCorrespondenceOfficeFilterDirectorate('all');
      setCorrespondenceOfficeFilterDivision('all');
      setCorrespondencePurpose('action');
      setCorrespondenceNotes('');
      setCorrespondenceSubject('');
      setCorrespondencePriority('medium');
      setDirectShareSelectedOfficeIds(new Set());
      setDirectSharePersonSearch('');
      setDirectShareOfficeSearch('');
      setDebouncedPersonSearch('');
      setDebouncedOfficeSearch('');
      setHasLoadedDirectShareUsers(false);
    }
    wasOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    // Auto-fill subject with document title when dialog opens.
    if (!open || !document?.title || correspondenceSubject) return;
    setCorrespondenceSubject(document.title);
  }, [open, document?.title, correspondenceSubject]);

  const shareableUsers = useMemo(
    () =>
      users
        .filter((user) => user.active && (!currentUserId || user.id !== currentUserId))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [users, currentUserId],
  );

  const filteredUsers = useMemo(() => {
    let filtered = shareableUsers;
    
    // Filter by system role
    if (selectedSystemRoles.size > 0) {
      filtered = filtered.filter((user) => 
        user.systemRole && selectedSystemRoles.has(user.systemRole)
      );
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
      filtered = filtered.filter((user) =>
      [user.name, user.email, user.systemRole]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
    }
    
    return filtered;
  }, [shareableUsers, searchQuery, selectedSystemRoles]);

  const filteredDirectorates = useMemo(() => {
    if (!searchDirectorateQuery.trim()) return directorates;
    const query = searchDirectorateQuery.toLowerCase();
    return directorates.filter((dir) =>
      dir.name.toLowerCase().includes(query)
    );
  }, [directorates, searchDirectorateQuery]);

  const filteredDivisions = useMemo(() => {
    if (!searchDivisionQuery.trim()) return divisions;
    const query = searchDivisionQuery.toLowerCase();
    return divisions.filter((div) =>
      div.name.toLowerCase().includes(query) ||
      directorates.find((d) => d.id === div.directorateId)?.name.toLowerCase().includes(query)
    );
  }, [divisions, searchDivisionQuery, directorates]);

  const filteredDepartments = useMemo(() => {
    if (!searchDepartmentQuery.trim()) return departments;
    const query = searchDepartmentQuery.toLowerCase();
    return departments.filter((dept) =>
      dept.name.toLowerCase().includes(query) ||
      divisions.find((d) => d.id === dept.divisionId)?.name.toLowerCase().includes(query)
    );
  }, [departments, searchDepartmentQuery, divisions]);

  // Filtered divisions for correspondence office filter
  const _correspondenceFilteredDivisions = useMemo(() => {
    if (correspondenceOfficeFilterDirectorate === 'all') return divisions;
    return divisions.filter(d => d.directorateId === correspondenceOfficeFilterDirectorate);
  }, [divisions, correspondenceOfficeFilterDirectorate]);

  // Filtered offices for correspondence
  const _correspondenceFilteredOffices = useMemo(() => {
    let result = offices.filter(o => o.isActive);
    
    if (correspondenceOfficeFilterDirectorate !== 'all') {
      result = result.filter(o => o.directorateId === correspondenceOfficeFilterDirectorate);
    }
    
    if (correspondenceOfficeFilterDivision !== 'all') {
      result = result.filter(o => o.divisionId === correspondenceOfficeFilterDivision);
    }
    
    if (correspondenceOfficeSearchQuery.trim()) {
      const query = correspondenceOfficeSearchQuery.toLowerCase();
      result = result.filter(o =>
        o.name.toLowerCase().includes(query) ||
        o.code?.toLowerCase().includes(query) ||
        o.officeType?.toLowerCase().includes(query)
      );
    }
    
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [offices, correspondenceOfficeFilterDirectorate, correspondenceOfficeFilterDivision, correspondenceOfficeSearchQuery]);

  // Filtered users for correspondence person selector
  const personSelectionPool = useMemo(() => {
    if (fallbackRecipientUsers.length > 0) return fallbackRecipientUsers;
    return shareableUsers;
  }, [shareableUsers, fallbackRecipientUsers]);
  const personSelectionLookup = useMemo(
    () => new Map(personSelectionPool.map((user) => [user.id, user])),
    [personSelectionPool]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedPersonSearch(directSharePersonSearch);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [directSharePersonSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedOfficeSearch(directShareOfficeSearch);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [directShareOfficeSearch]);

  const correspondenceFilteredUsers = useMemo(() => {
    return filterUsersBySearch(
      personSelectionPool,
      debouncedPersonSearch,
      { includeDivision: true, includeDepartment: true, includeEmail: true }
    );
  }, [personSelectionPool, debouncedPersonSearch]);

  const directShareFilteredOffices = useMemo(() => {
    const query = debouncedOfficeSearch.trim().toLowerCase();
    const activeOffices = offices.filter((office) => office.isActive);
    if (!query) return activeOffices.sort((a, b) => a.name.localeCompare(b.name));
    return activeOffices
      .filter((office) =>
        office.name.toLowerCase().includes(query) ||
        office.code.toLowerCase().includes(query) ||
        office.officeType.toLowerCase().includes(query)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [offices, debouncedOfficeSearch]);

  const directShareSelectedOffices = useMemo(
    () => offices.filter((office) => directShareSelectedOfficeIds.has(office.id)),
    [offices, directShareSelectedOfficeIds]
  );
  const directShareDerivedDivisionIds = useMemo(
    () => Array.from(new Set(directShareSelectedOffices.map((office) => office.divisionId).filter(Boolean) as string[])),
    [directShareSelectedOffices]
  );
  const directShareDerivedDepartmentIds = useMemo(
    () => Array.from(new Set(directShareSelectedOffices.map((office) => office.departmentId).filter(Boolean) as string[])),
    [directShareSelectedOffices]
  );

  useEffect(() => {
    if (!open || loadingFallbackRecipients || hasLoadedDirectShareUsers) {
      return;
    }

    if (shareableUsers.length > 0) {
      setHasLoadedDirectShareUsers(true);
      return;
    }

    setLoadingFallbackRecipients(true);
    void (async () => {
      try {
        const rows = await fetchAllCatalogPaginated<Record<string, unknown>>(
          '/accounts/users/?is_active=true&ordering=username',
        );

        const mapped = rows
          .filter(isRecord)
          .map((item) => {
            const firstName = typeof item.first_name === 'string' ? item.first_name : '';
            const lastName = typeof item.last_name === 'string' ? item.last_name : '';
            const fullName = `${firstName} ${lastName}`.trim();
            return {
              id: String(item.id ?? ''),
              name: fullName || String(item.username ?? item.email ?? 'Unknown User'),
              email: String(item.email ?? ''),
              employeeId: String(item.employee_id ?? item.employeeId ?? ''),
              gradeLevel: String(item.grade_level ?? item.gradeLevel ?? ''),
              systemRole: String(item.system_role ?? item.systemRole ?? ''),
              active: true,
            };
          })
          .filter((user) => Boolean(user.id) && (!currentUserId || user.id !== currentUserId));

        setFallbackRecipientUsers(mapped);
      } catch (error: unknown) {
        logWarn('Failed to fetch fallback recipients for direct share', error);
      } finally {
        setLoadingFallbackRecipients(false);
        setHasLoadedDirectShareUsers(true);
      }
    })();
  }, [open, loadingFallbackRecipients, hasLoadedDirectShareUsers, currentUserId, shareableUsers.length]);

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

  const handleToggleDirectShareOffice = useCallback((officeId: string) => {
    setDirectShareSelectedOfficeIds((prev) => {
      const next = new Set(prev);
      if (next.has(officeId)) {
        next.delete(officeId);
      } else {
        next.add(officeId);
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

  const handleToggleAllDirectShareOffices = useCallback(() => {
    const filteredIds = directShareFilteredOffices.map((office) => office.id);
    setDirectShareSelectedOfficeIds((prev) => {
      const allSelected = filteredIds.length > 0 && filteredIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        filteredIds.forEach((id) => next.delete(id));
      } else {
        filteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [directShareFilteredOffices]);

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
        const dirDivisions = divisions.filter((d) => d.directorateId === directorateId);
        if (dirDivisions.some((d) => perm.divisionIds.includes(d.id))) {
          return { hasAccess: true, accessLevel: perm.access };
        }
      }
    }
    return { hasAccess: false };
  }, [existingPermissions, divisions]);

  // Count duplicates before submission
  const countDuplicatesForTargets = useCallback((
    userIds: string[],
    divisionIds: string[],
    departmentIds: string[],
  ): number => {
    let count = 0;
    userIds.forEach((id) => {
      if (hasExistingAccess(id).hasAccess) count++;
    });
    divisionIds.forEach((id) => {
      if (hasExistingAccess(undefined, id).hasAccess) count++;
    });
    departmentIds.forEach((id) => {
      if (hasExistingAccess(undefined, undefined, id).hasAccess) count++;
    });
    return count;
  }, [hasExistingAccess]);

  const handleConfirmShareToAll = async () => {
    if (!document) return;
    setShowShareAllConfirm(false);
    setShareToAll(true);
    setIsSubmitting(true);
    setShareProgress(10);
    
    try {
      const updated = await shareDocument(document.id, {
        shareToAll: true,
        access: accessLevel,
        note: note.trim(),
      });
      setShareProgress(100);
      toast.success("Document shared with all users", {
        description: `Access level: ${accessLevel}`,
      });
      onShared?.(updated);
      onOpenChange(false);
    } catch (error: unknown) {
      logError('Failed to share document with all users', error);
      const errorDescription = error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.';
      toast.error('Unable to share document', {
        description: errorDescription,
        duration: 6000,
      });
    } finally {
      setIsSubmitting(false);
      setShareProgress(0);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!document) return;

    // Correspondence tab: submit only via CorrespondenceRoutingView (avoids duplicate buttons & stale parent state)
    if (activeTab === 'correspondence') {
      return;
    }

    // If already in review step, confirm and perform the share
    if (showReviewStep) {
      const userIds = correspondenceRouteType === 'person' ? Array.from(selectedUserIds) : [];
      const divisionIds = correspondenceRouteType === 'office' ? directShareDerivedDivisionIds : [];
      const departmentIds = correspondenceRouteType === 'office' ? directShareDerivedDepartmentIds : [];
      await performShare(userIds, divisionIds, departmentIds);
      return;
    }

    // Check for sensitive document warning
    if ((document.sensitivity === 'restricted' || document.sensitivity === 'confidential') && !showSensitivityWarning) {
      setPendingShareAction(async () => {
        const userIds = correspondenceRouteType === 'person' ? Array.from(selectedUserIds) : [];
        const divisionIds = correspondenceRouteType === 'office' ? directShareDerivedDivisionIds : [];
        const departmentIds = correspondenceRouteType === 'office' ? directShareDerivedDepartmentIds : [];

        if (correspondenceRouteType === 'person' && userIds.length === 0) {
          toast.error('Select at least one person');
          return;
        }
        if (correspondenceRouteType === 'office' && directShareSelectedOfficeIds.size === 0) {
          toast.error('Select at least one office');
          return;
        }
        if (correspondenceRouteType === 'office' && divisionIds.length === 0 && departmentIds.length === 0) {
          toast.error('Selected offices do not map to any division/department access');
          return;
        }
        const dupCount = countDuplicatesForTargets(userIds, divisionIds, departmentIds);
        if (dupCount > 0) {
          setDuplicateCount(dupCount);
          setShowDuplicateWarning(true);
          return;
        }
        await performShare(userIds, divisionIds, departmentIds);
      });
      setShowSensitivityWarning(true);
      return;
    }

    const userIds = correspondenceRouteType === 'person' ? Array.from(selectedUserIds) : [];
    const divisionIds = correspondenceRouteType === 'office' ? directShareDerivedDivisionIds : [];
    const departmentIds = correspondenceRouteType === 'office' ? directShareDerivedDepartmentIds : [];

    if (correspondenceRouteType === 'person' && userIds.length === 0) {
      toast.error('Select at least one person');
      return;
    }
    if (correspondenceRouteType === 'office' && directShareSelectedOfficeIds.size === 0) {
      toast.error('Select at least one office');
      return;
    }
    if (correspondenceRouteType === 'office' && divisionIds.length === 0 && departmentIds.length === 0) {
      toast.error('Selected offices do not map to any division/department access');
      return;
    }

    // Check for duplicates
    const dupCount = countDuplicatesForTargets(userIds, divisionIds, departmentIds);
    if (dupCount > 0) {
      setDuplicateCount(dupCount);
      setShowDuplicateWarning(true);
      return;
    }

    // Show review step before final submission
    setShowReviewStep(true);
  };

  const performShare = async (
    userIds: string[],
    divisionIds: string[],
    departmentIds: string[],
    workspaceIds: string[] = []
  ) => {
    if (!document) return;

    setIsSubmitting(true);
    setShareProgress(10);
    
    try {
      // Save to recent recipients
      if (userIds.length > 0) {
        saveRecentRecipients({ users: [...new Set([...recentRecipients.users, ...userIds])] });
      }
      if (divisionIds.length > 0) {
        saveRecentRecipients({ divisions: [...new Set([...recentRecipients.divisions, ...divisionIds])] });
      }
      if (departmentIds.length > 0) {
        saveRecentRecipients({ departments: [...new Set([...recentRecipients.departments, ...departmentIds])] });
      }
      
      setShareProgress(30);
      
      // Share with users, divisions, and departments via permissions
      let updated: DocumentRecord | undefined;
      if (userIds.length > 0 || divisionIds.length > 0 || departmentIds.length > 0) {
        updated = await shareDocument(document.id, {
          userIds,
          divisionIds,
          departmentIds,
          access: accessLevel,
          note: note.trim(),
        });
      }
      
      setShareProgress(60);
      
      // Add document to workspaces (if any selected)
      if (workspaceIds.length > 0) {
        try {
          const currentWorkspaceIds = document.workspaceIds || [];
          const newWorkspaceIds = Array.from(new Set([...currentWorkspaceIds, ...workspaceIds]));
          
          await apiFetch(`/dms/documents/${document.id}/`, {
            method: 'PATCH',
            body: JSON.stringify({
              workspace_ids: newWorkspaceIds,
            }),
          });
          
          // Refresh document to get updated workspaceIds
          updated = await apiFetch<DocumentRecord>(`/dms/documents/${document.id}/`);
        } catch (error: unknown) {
          logError('Failed to add document to workspaces', error);
          toast.error('Document shared, but failed to add to workspaces');
        }
      }
      
      setShareProgress(100);
      
      const recipientSummary = [];
      if (userIds.length > 0) recipientSummary.push(`${userIds.length} user(s)`);
      if (divisionIds.length > 0) recipientSummary.push(`${divisionIds.length} division(s)`);
      if (departmentIds.length > 0) recipientSummary.push(`${departmentIds.length} department(s)`);
      if (workspaceIds.length > 0) recipientSummary.push(`${workspaceIds.length} workspace(s)`);
      
      toast.success("Document shared", {
        description: `Access level: ${accessLevel}. ${recipientSummary.join(', ')}`,
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
    }
  };

  const toggleAllUsers = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map((u) => u.id)));
    }
  };

  const toggleAllDirectorates = () => {
    if (selectedDirectorateIds.size === filteredDirectorates.length) {
      setSelectedDirectorateIds(new Set());
    } else {
      setSelectedDirectorateIds(new Set(filteredDirectorates.map((d) => d.id)));
    }
  };

  const toggleAllDivisions = () => {
    if (selectedDivisionIds.size === filteredDivisions.length) {
      setSelectedDivisionIds(new Set());
    } else {
      setSelectedDivisionIds(new Set(filteredDivisions.map((d) => d.id)));
    }
  };

  const toggleAllDepartments = () => {
    if (selectedDepartmentIds.size === filteredDepartments.length) {
      setSelectedDepartmentIds(new Set());
    } else {
      setSelectedDepartmentIds(new Set(filteredDepartments.map((d) => d.id)));
    }
  };

  const totalSelected =
    correspondenceRouteType === 'person'
      ? selectedUserIds.size
      : directShareSelectedOfficeIds.size;

  // Detailed selection summary
  const selectionSummary = useMemo(() => {
    const divisionIds = correspondenceRouteType === 'office' ? directShareDerivedDivisionIds : [];
    const departmentIds = correspondenceRouteType === 'office' ? directShareDerivedDepartmentIds : [];
    return {
      users: selectedUserIds.size,
      divisions: divisionIds.length,
      departments: departmentIds.length,
      directorates: 0,
      workspaces: 0,
      total: totalSelected,
    };
  }, [selectedUserIds.size, correspondenceRouteType, directShareDerivedDivisionIds, directShareDerivedDepartmentIds, totalSelected]);

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
      if (e.key === 'Escape' && !showShareAllConfirm && !showDuplicateWarning) {
        onOpenChange(false);
      }
      // Ctrl+A in list to select all (with confirmation)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && activeTab !== 'all') {
        const target = e.target as HTMLElement;
        if (target.closest('[role="list"]') || target.closest('.space-y-2')) {
          e.preventDefault();
          // Trigger select all based on active tab
          if (activeTab === 'users') toggleAllUsers();
          else if (activeTab === 'division') toggleAllDivisions();
          else if (activeTab === 'department') toggleAllDepartments();
          else if (activeTab === 'directorate') toggleAllDirectorates();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isSubmitting, showShareAllConfirm, showDuplicateWarning, activeTab, onOpenChange]);

  // Get active user count for "Share to All"
  const activeUserCount = useMemo(() => {
    return users.filter((u) => u.active).length;
  }, [users]);

  // Delete permission
  const handleDeletePermission = async (permissionId: string) => {
    if (!document || !permissionId) return;
    
    setPermissionToDelete(null);
    setShowDeletePermissionConfirm(false);
    setDeletingPermissionId(permissionId);
    try {
      await apiFetch(`/dms/permissions/${permissionId}/`, {
        method: 'DELETE',
      });
      
      // Refresh permissions list
      const payload = await apiFetch<unknown>(`/dms/permissions/?document=${document.id}`);
      const rows = Array.isArray(payload)
        ? payload
        : isRecord(payload) && Array.isArray(payload.results)
          ? payload.results
          : [];
      const permissions: DocumentPermission[] = rows.filter(isRecord).map((p) => ({
        id: String(p.id ?? ''),
        access: ((typeof p.access === 'string' ? p.access : 'read') as PermissionAccess) ?? 'read',
        divisionIds: Array.isArray(p.division_ids) ? p.division_ids.map(String) : [],
        departmentIds: Array.isArray(p.department_ids) ? p.department_ids.map(String) : [],
        gradeLevels: Array.isArray(p.grade_levels) ? p.grade_levels.map(String) : [],
        userIds: Array.isArray(p.user_ids) ? p.user_ids.map(String) : [],
        createdAt: typeof p.created_at === 'string' ? p.created_at : undefined,
        updatedAt: typeof p.updated_at === 'string' ? p.updated_at : undefined,
      }));
      setExistingPermissions(permissions);
      
      toast.success("Permission removed", {
        description: "Access has been revoked",
      });
      
      // Refresh document
      if (onShared) {
        const updated = await apiFetch<DocumentRecord>(`/dms/documents/${document.id}/`);
        onShared(updated);
      }
    } catch (error: unknown) {
      logError('Failed to delete permission', error);
      toast.error('Failed to remove permission');
    } finally {
      setDeletingPermissionId(null);
    }
  };

  // Update permission access level
  const handleUpdatePermission = async (permissionId: string, newAccess: PermissionAccess) => {
    if (!document || !permissionId) return;
    
    setEditingPermissionId(permissionId);
    try {
      await apiFetch(`/dms/permissions/${permissionId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ access: newAccess }),
      });
      
      // Refresh permissions list
      const payload = await apiFetch<unknown>(`/dms/permissions/?document=${document.id}`);
      const rows = Array.isArray(payload)
        ? payload
        : isRecord(payload) && Array.isArray(payload.results)
          ? payload.results
          : [];
      const permissions: DocumentPermission[] = rows.filter(isRecord).map((p) => ({
        id: String(p.id ?? ''),
        access: ((typeof p.access === 'string' ? p.access : 'read') as PermissionAccess) ?? 'read',
        divisionIds: Array.isArray(p.division_ids) ? p.division_ids.map(String) : [],
        departmentIds: Array.isArray(p.department_ids) ? p.department_ids.map(String) : [],
        gradeLevels: Array.isArray(p.grade_levels) ? p.grade_levels.map(String) : [],
        userIds: Array.isArray(p.user_ids) ? p.user_ids.map(String) : [],
        createdAt: typeof p.created_at === 'string' ? p.created_at : undefined,
        updatedAt: typeof p.updated_at === 'string' ? p.updated_at : undefined,
      }));
      setExistingPermissions(permissions);
      
      toast.success("Permission updated", {
        description: `Access level changed to ${newAccess}`,
      });
      
      // Refresh document
      if (onShared) {
        const updated = await apiFetch<DocumentRecord>(`/dms/documents/${document.id}/`);
        onShared(updated);
      }
    } catch (error: unknown) {
      logError('Failed to update permission', error);
      toast.error('Failed to update permission');
    } finally {
      setEditingPermissionId(null);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] sm:w-full h-[95vh] sm:h-[90vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Share Document
            {existingPermissions.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {existingPermissions.length} permission{existingPermissions.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Share this document with users or offices
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
        {document && (
          <div className="space-y-6 px-4 sm:px-6 py-4">
            {/* Document Summary - Like Minute Modal */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm mb-1">{document.title}</p>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      <span>Status: {document.status}</span>
                      {document.sensitivity && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{document.sensitivity}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {document.status}
                    </Badge>
                    {(document.sensitivity === 'restricted' || document.sensitivity === 'confidential') && (
                      <Badge variant="destructive" className="text-[10px]">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {document.sensitivity}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Share Form (always rendered so footer submit button works on review step) */}
            <form id="share-form" onSubmit={handleSubmit}>
            {showReviewStep ? (
              /* Review Step Confirmation */
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReviewStep(false)}
                    className="h-7 px-2"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="text-sm font-medium">Review & Confirm</span>
                </div>

                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Access Level</p>
                        <Badge variant="outline" className="capitalize">{accessLevel}</Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Recipients</p>
                        <p className="text-sm font-medium">
                          {shareToAll ? `All ${activeUserCount} users` : 
                            `${selectionSummary.users + selectionSummary.directorates + selectionSummary.divisions + selectionSummary.departments + selectionSummary.workspaces} selected`}
                        </p>
                      </div>
                    </div>
                    
                    {!shareToAll && (
                      <div className="flex flex-wrap gap-2">
                        {selectionSummary.users > 0 && (
                          <Badge variant="secondary" className="gap-1">
                            <Users className="h-3 w-3" /> {selectionSummary.users} users
                          </Badge>
                        )}
                        {selectionSummary.directorates > 0 && (
                          <Badge variant="secondary" className="gap-1">
                            <Building2 className="h-3 w-3" /> {selectionSummary.directorates} directorates
                          </Badge>
                        )}
                        {selectionSummary.divisions > 0 && (
                          <Badge variant="secondary" className="gap-1">
                            <Building2 className="h-3 w-3" /> {selectionSummary.divisions} divisions
                          </Badge>
                        )}
                        {selectionSummary.departments > 0 && (
                          <Badge variant="secondary" className="gap-1">
                            <Users2 className="h-3 w-3" /> {selectionSummary.departments} depts
                          </Badge>
                        )}
                        {selectionSummary.workspaces > 0 && (
                          <Badge variant="secondary" className="gap-1">
                            <FolderKanban className="h-3 w-3" /> {selectionSummary.workspaces} workspaces
                          </Badge>
                        )}
                      </div>
                    )}

                    {note.trim() && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Message</p>
                        <p className="text-sm p-3 bg-muted/30 rounded-md">{note}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* Main Form Fields */
              <div className="space-y-6">
              {/* Access Level Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="access-level" className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    Access Level *
                  </Label>
                  <Select value={accessLevel} onValueChange={(v) => setAccessLevel(v as PermissionAccess)}>
                    <SelectTrigger id="access-level" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="read">Read Only</SelectItem>
                      <SelectItem value="write">Read & Write</SelectItem>
                      <SelectItem value="admin">Full Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {accessLevel !== 'read' && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {accessLevel === 'admin' ? 'Full control over document' : 'Can edit document'}
                    </p>
                  )}
                </div>
                
                {/* Existing Permissions Quick View */}
                {existingPermissions.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Current Permissions</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {existingPermissions.length} {existingPermissions.length === 1 ? 'rule' : 'rules'}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setShowPermissionsView(!showPermissionsView);
                          setShowHistoryView(false);
                        }}
                      >
                        <Shield className="h-3.5 w-3.5 mr-1.5" />
                        View All
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mode Selection - Like Minute Modal Action Type */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-muted-foreground" />
                  Share Method *
                </Label>
                <RadioGroup value={activeTab} onValueChange={setActiveTab}>
                  <div className="space-y-3">
                    {/* Direct Share Option */}
                    <div className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                      activeTab === 'share' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:bg-muted/50'
                    }`}>
                      <RadioGroupItem value="share" id="share-direct" className="mt-1" />
                      <div className="flex-1 space-y-1">
                        <Label htmlFor="share-direct" className="font-medium cursor-pointer flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-500" />
                          Direct Share
                          {totalSelected > 0 && (
                            <Badge variant="secondary" className="ml-2 text-xs">{totalSelected}</Badge>
                          )}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Share directly with users or offices. Grant immediate access to the document.
                        </p>
                      </div>
                    </div>
                    
                    {/* Correspondence Option */}
                    <div className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                      activeTab === 'correspondence' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:bg-muted/50'
                    }`}>
                      <RadioGroupItem value="correspondence" id="share-correspondence" className="mt-1" />
                      <div className="flex-1 space-y-1">
                        <Label htmlFor="share-correspondence" className="font-medium cursor-pointer flex items-center gap-2">
                          <Mail className="h-4 w-4 text-emerald-600" />
                          Send via Correspondence
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Send this document via correspondence workflow. The document will be linked to a new correspondence item and routed to the selected recipient.
                        </p>
                      </div>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              {/* Share Content - Conditional based on activeTab */}
              {activeTab === 'share' && (
                <>
                  {showPermissionsView ? (
                    /* Permissions View - Card-based like Minute Modal */
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <Label className="text-sm font-semibold">Document Permissions</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowPermissionsView(false)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Close
                          </Button>
                        </div>
                        {isLoadingPermissions ? (
                          <div className="py-8 text-center text-muted-foreground">
                            <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
                            <p className="text-sm">Loading permissions...</p>
                          </div>
                        ) : existingPermissions.length === 0 ? (
                          <div className="py-8 text-center text-muted-foreground">
                            <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm font-medium">No permissions set</p>
                            <p className="text-xs mt-1">Use the sections below to share this document and grant access.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {existingPermissions.map((perm) => {
                              const permUsers = perm.userIds.map(id => {
                                const user = personSelectionLookup.get(id);
                                return user?.name || 'Unknown';
                              }).filter(Boolean);
                              const permDivisions = perm.divisionIds.map(id => {
                                const div = divisions.find(d => d.id === id);
                                return div?.name || 'Unknown';
                              }).filter(Boolean);
                              const permDepartments = perm.departmentIds.map(id => {
                                const dept = departments.find(d => d.id === id);
                                return dept?.name || 'Unknown';
                              }).filter(Boolean);
                              
                              return (
                                <Card key={perm.id} className="bg-muted/30">
                                  <CardContent className="p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                          <Badge variant="outline" className="capitalize">
                                            {perm.access} access
                                          </Badge>
                                          {perm.createdAt && (
                                            <span className="text-xs text-muted-foreground">
                                              Created {new Date(perm.createdAt).toLocaleDateString()}
                                            </span>
                                          )}
                                        </div>
                                        <div className="grid gap-2 text-xs md:grid-cols-2">
                                          {permUsers.length > 0 && (
                                            <div>
                                              <p className="font-medium text-foreground mb-1">Users ({permUsers.length})</p>
                                              <p className="text-muted-foreground line-clamp-2">{permUsers.join(', ')}</p>
                                            </div>
                                          )}
                                          {permDivisions.length > 0 && (
                                            <div>
                                              <p className="font-medium text-foreground mb-1">Divisions ({permDivisions.length})</p>
                                              <p className="text-muted-foreground line-clamp-2">{permDivisions.join(', ')}</p>
                                            </div>
                                          )}
                                          {permDepartments.length > 0 && (
                                            <div>
                                              <p className="font-medium text-foreground mb-1">Departments ({permDepartments.length})</p>
                                              <p className="text-muted-foreground line-clamp-2">{permDepartments.join(', ')}</p>
                                            </div>
                                          )}
                                          {perm.gradeLevels.length > 0 && (
                                            <div>
                                              <p className="font-medium text-foreground mb-1">Grade Levels ({perm.gradeLevels.length})</p>
                                              <p className="text-muted-foreground">{perm.gradeLevels.join(', ')}</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        <Select
                                          value={perm.access}
                                          onValueChange={(value) => {
                                            if (perm.id) {
                                              void handleUpdatePermission(perm.id, value as PermissionAccess);
                                            }
                                          }}
                                          disabled={editingPermissionId === perm.id}
                                        >
                                          <SelectTrigger className="w-[120px] h-7 text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="read">Read Only</SelectItem>
                                            <SelectItem value="write">Read & Write</SelectItem>
                                            <SelectItem value="admin">Full Admin</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => {
                                            if (perm.id) {
                                              setPermissionToDelete(perm.id);
                                              setShowDeletePermissionConfirm(true);
                                            }
                                          }}
                                          disabled={deletingPermissionId === perm.id}
                                          aria-label="Delete permission"
                                        >
                                          {deletingPermissionId === perm.id ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          ) : (
                                            <Trash2 className="h-3.5 w-3.5" />
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ) : showHistoryView ? (
                    /* History View - Card-based like Minute Modal */
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <Label className="text-sm font-semibold">Share History</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowHistoryView(false)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Close
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {isLoadingHistory ? (
                            <div className="py-8 text-center text-muted-foreground">
                              <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
                              <p className="text-sm">Loading history...</p>
                            </div>
                          ) : shareHistory.length > 0 ? (
                            shareHistory.map((log) => (
                              <Card key={log.id} className="bg-background">
                                <CardContent className="p-3 space-y-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-medium flex-1">{log.description}</p>
                                    <Badge variant={log.success ? "secondary" : "destructive"} className="text-[10px]">
                                      {log.success ? "Success" : "Failed"}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {log.userName || log.userEmail || 'System'} • {new Date(log.timestamp).toLocaleString()}
                                  </p>
                                </CardContent>
                              </Card>
                            ))
                          ) : (
                            <div className="py-8 text-center text-muted-foreground">
                              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm font-medium">No share history</p>
                              <p className="text-xs">This document hasn't been shared yet.</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    /* Main Share View - Card-based like Minute Modal */
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <Label className="text-sm font-semibold">Share To *</Label>
                          <Badge variant={totalSelected > 0 ? 'default' : 'outline'} className="text-xs">
                            {totalSelected > 0 ? `${totalSelected} selected` : '0 recipients'}
                          </Badge>
                        </div>
                        <Card className="bg-muted/30">
                          <CardContent className="p-4 space-y-4">
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant={correspondenceRouteType === 'person' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => {
                                  setCorrespondenceRouteType('person');
                                  setDirectShareSelectedOfficeIds(new Set());
                                  setSelectedDivisionIds(new Set());
                                  setSelectedDepartmentIds(new Set());
                                }}
                              >
                                <Users className="h-3.5 w-3.5 mr-1.5" />
                                Person
                              </Button>
                              <Button
                                type="button"
                                variant={correspondenceRouteType === 'office' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => {
                                  setCorrespondenceRouteType('office');
                                  setSelectedUserIds(new Set());
                                }}
                              >
                                <Building2 className="h-3.5 w-3.5 mr-1.5" />
                                Office
                              </Button>
                            </div>

                            {correspondenceRouteType === 'person' ? (
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
                                      : 'Select all'}
                                  </Button>
                                </div>
                                <div className="relative">
                                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                  <Input
                                    value={directSharePersonSearch}
                                    onChange={(e) => setDirectSharePersonSearch(e.target.value)}
                                    placeholder="Search person by name, email, role..."
                                    className="pl-9 h-9"
                                  />
                                </div>
                                <ScrollArea className="h-[280px] border rounded-md p-2">
                                  <div className="space-y-1.5">
                                    {loadingFallbackRecipients && correspondenceFilteredUsers.length === 0 ? (
                                      <div className="p-3 text-xs text-muted-foreground flex items-center gap-2">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Loading users...
                                      </div>
                                    ) : correspondenceFilteredUsers.length === 0 ? (
                                      <div className="p-3 text-xs text-muted-foreground">
                                        No matching users found.
                                      </div>
                                    ) : (
                                      correspondenceFilteredUsers.map((user) => {
                                        const selected = selectedUserIds.has(user.id);
                                        return (
                                          <div
                                            key={user.id}
                                            role="button"
                                            tabIndex={0}
                                            className={`w-full text-left flex items-start gap-2 p-2 rounded border ${selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'}`}
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
                                            <div className="min-w-0">
                                              <p className="text-sm font-medium truncate">{user.name}</p>
                                              <p className="text-xs text-muted-foreground truncate">
                                                {user.email} • {user.gradeLevel || user.systemRole || 'User'}
                                              </p>
                                            </div>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </ScrollArea>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs text-muted-foreground">Select Office</Label>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs px-2"
                                    onClick={handleToggleAllDirectShareOffices}
                                  >
                                    {directShareFilteredOffices.length > 0 &&
                                    directShareFilteredOffices.every((office) => directShareSelectedOfficeIds.has(office.id))
                                      ? 'Clear'
                                      : 'Select all'}
                                  </Button>
                                </div>
                                <div className="relative">
                                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                  <Input
                                    value={directShareOfficeSearch}
                                    onChange={(e) => setDirectShareOfficeSearch(e.target.value)}
                                    placeholder="Search office..."
                                    className="pl-9 h-9"
                                  />
                                </div>
                                <ScrollArea className="h-[280px] border rounded-md p-2">
                                  <div className="space-y-1.5">
                                    {directShareFilteredOffices.length === 0 ? (
                                      <div className="p-3 text-xs text-muted-foreground">
                                        No matching offices found.
                                      </div>
                                    ) : (
                                      directShareFilteredOffices.map((office) => {
                                        const selected = directShareSelectedOfficeIds.has(office.id);
                                        return (
                                          <div
                                            key={office.id}
                                            role="button"
                                            tabIndex={0}
                                            className={`w-full text-left flex items-start gap-2 p-2 rounded border ${selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'}`}
                                            onClick={() => handleToggleDirectShareOffice(office.id)}
                                            onKeyDown={(event) => {
                                              if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                handleToggleDirectShareOffice(office.id);
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
                                            <div className="min-w-0">
                                              <p className="text-sm font-medium truncate">{office.name}</p>
                                              <p className="text-xs text-muted-foreground truncate">
                                                {office.officeType.toUpperCase()} {office.code ? `• ${office.code}` : ''}
                                              </p>
                                            </div>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </ScrollArea>
                                <p className="text-[11px] text-muted-foreground">
                                  Sharing to an office applies access by its mapped division/department.
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Correspondence Content */}
              {activeTab === 'correspondence' && document && (
                <CorrespondenceRoutingView
                  document={document}
                  onComplete={() => {
                    onOpenChange(false);
                    onShared?.(document);
                  }}
                />
              )}
              {/* Message Input - Only for share mode */}
              {activeTab === 'share' && (
                <div className="space-y-2">
                  <Label htmlFor="share-note" className="text-sm font-medium">
                    Message (Optional)
                  </Label>
                  <Textarea
                    id="share-note"
                    placeholder="Add a message to recipients..."
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    maxLength={MAX_NOTE_LENGTH}
                    className="resize-none text-sm"
                  />
                  {note.length > 0 && (
                    <p className="text-xs text-muted-foreground text-right">{note.length}/{MAX_NOTE_LENGTH}</p>
                  )}
                </div>
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
            )}
            </form>
          </div>
        )}
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t px-4 sm:px-6 py-3">
          <div className="text-xs text-muted-foreground">
            {activeTab === 'correspondence' ? (
              <span>Use <span className="font-medium text-foreground">Send via Correspondence</span> below the notes field.</span>
            ) : totalSelected > 0 ? (
              <span>
                {`${totalSelected} selected`}
                {' • '}<span className="capitalize">{accessLevel}</span> access
              </span>
            ) : (
              <span>Select recipients above</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            {activeTab !== 'correspondence' && (
              <Button
                type="submit"
                form="share-form"
                disabled={
                  isSubmitting ||
                  totalSelected === 0
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
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Share to All Confirmation */}
    <AlertDialog open={showShareAllConfirm} onOpenChange={setShowShareAllConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Share with All Users?</AlertDialogTitle>
          <AlertDialogDescription>
            This will grant <strong>{accessLevel}</strong> access to all {activeUserCount} active users in the system.
            {document?.sensitivity === 'restricted' || document?.sensitivity === 'confidential' ? (
              <Alert variant="destructive" className="mt-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  This document is {document.sensitivity}. Ensure all users have appropriate clearance.
                </AlertDescription>
              </Alert>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmShareToAll}>
            Share with All Users
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

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

    {/* Delete Permission Confirmation */}
    <AlertDialog open={showDeletePermissionConfirm} onOpenChange={setShowDeletePermissionConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Permission?</AlertDialogTitle>
          <AlertDialogDescription>
            This will revoke access for all users, divisions, and departments associated with this permission.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => {
            setShowDeletePermissionConfirm(false);
            setPermissionToDelete(null);
          }}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (permissionToDelete) {
                void handleDeletePermission(permissionToDelete);
              }
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Remove Permission
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
              const userIds = correspondenceRouteType === 'person' ? Array.from(selectedUserIds) : [];
              const divisionIds = correspondenceRouteType === 'office' ? directShareDerivedDivisionIds : [];
              const departmentIds = correspondenceRouteType === 'office' ? directShareDerivedDepartmentIds : [];
              void performShare(userIds, divisionIds, departmentIds);
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
