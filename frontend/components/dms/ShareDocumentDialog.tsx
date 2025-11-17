"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { DocumentRecord, DocumentPermission, PermissionAccess } from "@/lib/dms-storage";
import { shareDocument, apiFetch, hasTokens } from "@/lib/dms-storage";
import { logError } from "@/lib/client-logger";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Search, Users, Building2, Users2, Globe, AlertTriangle, Loader2, X, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface ShareDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentRecord | null;
  currentUserId?: string;
  onShared?: (updated?: DocumentRecord) => void;
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
}: ShareDocumentDialogProps) => {
  const { users, directorates, divisions, departments } = useOrganization();
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDivisionQuery, setSearchDivisionQuery] = useState("");
  const [searchDepartmentQuery, setSearchDepartmentQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [accessLevel, setAccessLevel] = useState<PermissionAccess>("read");
  const [existingPermissions, setExistingPermissions] = useState<DocumentPermission[]>([]);
  const [showShareAllConfirm, setShowShareAllConfirm] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [shareProgress, setShareProgress] = useState(0);
  
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

  // Fetch existing permissions
  useEffect(() => {
    if (!open || !document) return;
    
    setIsLoadingPermissions(true);
    const fetchPermissions = async () => {
      try {
        if (!hasTokens()) return;
        const payload = await apiFetch<any>(`/dms/permissions/?document=${document.id}`);
        const results = Array.isArray(payload) ? payload : (payload?.results || []);
        const permissions: DocumentPermission[] = results.map((p: any) => ({
          id: String(p.id),
          access: p.access || 'read',
          divisionIds: (p.division_ids || []).map(String),
          departmentIds: (p.department_ids || []).map(String),
          gradeLevels: Array.isArray(p.grade_levels) ? p.grade_levels.map(String) : [],
          userIds: (p.user_ids || []).map(String),
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        }));
        setExistingPermissions(permissions);
      } catch (error) {
        logError('Failed to fetch document permissions', error);
      } finally {
        setIsLoadingPermissions(false);
      }
    };
    
    void fetchPermissions();
  }, [open, document]);

  // Load recent recipients
  useEffect(() => {
    if (!open) return;
    try {
      const saved = localStorage.getItem(RECENT_RECIPIENTS_KEY);
      if (saved) {
        setRecentRecipients(JSON.parse(saved));
      }
    } catch (err) {
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
    } catch (err) {
      // Ignore
    }
  }, [recentRecipients]);

  useEffect(() => {
    if (!open) {
      setNote("");
      setSearchQuery("");
      setSearchDivisionQuery("");
      setSearchDepartmentQuery("");
      setShareToAll(false);
      setSelectedUserIds(new Set());
      setSelectedDirectorateIds(new Set());
      setSelectedDivisionIds(new Set());
      setSelectedDepartmentIds(new Set());
      setActiveTab("all");
      setAccessLevel("read");
      setShareProgress(0);
      setShowShareAllConfirm(false);
      setShowDuplicateWarning(false);
    }
  }, [open]);

  const shareableUsers = useMemo(
    () =>
      users
        .filter((user) => user.active && (!currentUserId || user.id !== currentUserId))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [users, currentUserId],
  );

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return shareableUsers;
    const query = searchQuery.toLowerCase();
    return shareableUsers.filter((user) =>
      [user.name, user.email, user.systemRole]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [shareableUsers, searchQuery]);

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
  const countDuplicates = useCallback((): number => {
    let count = 0;
    selectedUserIds.forEach((id) => {
      if (hasExistingAccess(id).hasAccess) count++;
    });
    selectedDivisionIds.forEach((id) => {
      if (hasExistingAccess(undefined, id).hasAccess) count++;
    });
    selectedDepartmentIds.forEach((id) => {
      if (hasExistingAccess(undefined, undefined, id).hasAccess) count++;
    });
    selectedDirectorateIds.forEach((id) => {
      if (hasExistingAccess(undefined, undefined, undefined, id).hasAccess) count++;
    });
    return count;
  }, [selectedUserIds, selectedDivisionIds, selectedDepartmentIds, selectedDirectorateIds, hasExistingAccess]);

  // Group divisions by directorate
  const divisionsByDirectorate = useMemo(() => {
    const map = new Map<string, typeof divisions>();
    directorates.forEach((dir) => {
      const dirDivisions = divisions.filter((div) => div.directorateId === dir.id);
      if (dirDivisions.length > 0) {
        map.set(dir.id, dirDivisions);
      }
    });
    return map;
  }, [directorates, divisions]);

  // Group departments by division
  const departmentsByDivision = useMemo(() => {
    const map = new Map<string, typeof departments>();
    divisions.forEach((div) => {
      const divDepartments = departments.filter((dept) => dept.divisionId === div.id);
      if (divDepartments.length > 0) {
        map.set(div.id, divDepartments);
      }
    });
    return map;
  }, [divisions, departments]);

  // Get all division IDs for selected directorates
  const selectedDivisionIdsFromDirectorates = useMemo(() => {
    const ids = new Set<string>();
    selectedDirectorateIds.forEach((dirId) => {
      const dirDivisions = divisionsByDirectorate.get(dirId) || [];
      dirDivisions.forEach((div) => ids.add(div.id));
    });
    return ids;
  }, [selectedDirectorateIds, divisionsByDirectorate]);

  const handleShareToAllClick = () => {
    if (shareToAll) {
      setShareToAll(false);
      return;
    }
    // Show confirmation dialog
    setShowShareAllConfirm(true);
  };

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
      });
      setShareProgress(100);
      toast.success("Document shared with all users", {
        description: `Access level: ${accessLevel}`,
      });
      onShared?.(updated);
      onOpenChange(false);
    } catch (error: unknown) {
      logError('Failed to share document with all users', error);
      let errorMessage = 'Unable to share document';
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: unknown } }).response;
        if (response?.data && typeof response.data === 'object') {
          const data = response.data as Record<string, unknown>;
          if (data.detail && typeof data.detail === 'string') {
            errorMessage = data.detail;
          } else if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
            errorMessage = (data.non_field_errors as string[]).join(', ');
          }
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
      setShareProgress(0);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!document) return;

    if (shareToAll) {
      await handleConfirmShareToAll();
      return;
    }

    // Combine division IDs from directorates and directly selected divisions
    const allDivisionIds = Array.from(
      new Set([...selectedDivisionIds, ...selectedDivisionIdsFromDirectorates])
    );

    const hasSelection =
      selectedUserIds.size > 0 || allDivisionIds.length > 0 || selectedDepartmentIds.size > 0;

    if (!hasSelection) {
      toast.error("Select at least one recipient, division, or department");
      return;
    }

    // Check for duplicates
    const dupCount = countDuplicates();
    if (dupCount > 0) {
      setDuplicateCount(dupCount);
      setShowDuplicateWarning(true);
      return;
    }

    await performShare(Array.from(selectedUserIds), allDivisionIds, Array.from(selectedDepartmentIds));
  };

  const performShare = async (
    userIds: string[],
    divisionIds: string[],
    departmentIds: string[]
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
      
      setShareProgress(50);
      
      const updated = await shareDocument(document.id, {
        userIds,
        divisionIds,
        departmentIds,
        access: accessLevel,
      });
      
      setShareProgress(100);
      
      toast.success("Document shared", {
        description: `Access level: ${accessLevel}. ${userIds.length} user(s), ${divisionIds.length} division(s), ${departmentIds.length} department(s)`,
      });
      onShared?.(updated);
      onOpenChange(false);
    } catch (error: unknown) {
      logError('Failed to share document', error);
      let errorMessage = 'Unable to share document';
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: unknown } }).response;
        if (response?.data && typeof response.data === 'object') {
          const data = response.data as Record<string, unknown>;
          if (data.detail && typeof data.detail === 'string') {
            errorMessage = data.detail;
          } else if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
            errorMessage = (data.non_field_errors as string[]).join(', ');
          } else if (data.user_ids && Array.isArray(data.user_ids)) {
            errorMessage = `User errors: ${(data.user_ids as string[]).join(', ')}`;
          } else if (data.division_ids && Array.isArray(data.division_ids)) {
            errorMessage = `Division errors: ${(data.division_ids as string[]).join(', ')}`;
          }
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error('Failed to share document', {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
      setShareProgress(0);
    }
  };

  const toggleUser = (userId: string) => {
    const newSet = new Set(selectedUserIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUserIds(newSet);
  };

  const toggleAllUsers = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map((u) => u.id)));
    }
  };

  const toggleDirectorate = (dirId: string) => {
    const newSet = new Set(selectedDirectorateIds);
    if (newSet.has(dirId)) {
      newSet.delete(dirId);
    } else {
      newSet.add(dirId);
    }
    setSelectedDirectorateIds(newSet);
  };

  const toggleAllDirectorates = () => {
    if (selectedDirectorateIds.size === directorates.length) {
      setSelectedDirectorateIds(new Set());
    } else {
      setSelectedDirectorateIds(new Set(directorates.map((d) => d.id)));
    }
  };

  const toggleDivision = (divId: string) => {
    const newSet = new Set(selectedDivisionIds);
    if (newSet.has(divId)) {
      newSet.delete(divId);
    } else {
      newSet.add(divId);
    }
    setSelectedDivisionIds(newSet);
  };

  const toggleAllDivisions = () => {
    if (selectedDivisionIds.size === filteredDivisions.length) {
      setSelectedDivisionIds(new Set());
    } else {
      setSelectedDivisionIds(new Set(filteredDivisions.map((d) => d.id)));
    }
  };

  const toggleDepartment = (deptId: string) => {
    const newSet = new Set(selectedDepartmentIds);
    if (newSet.has(deptId)) {
      newSet.delete(deptId);
    } else {
      newSet.add(deptId);
    }
    setSelectedDepartmentIds(newSet);
  };

  const toggleAllDepartments = () => {
    if (selectedDepartmentIds.size === filteredDepartments.length) {
      setSelectedDepartmentIds(new Set());
    } else {
      setSelectedDepartmentIds(new Set(filteredDepartments.map((d) => d.id)));
    }
  };

  const totalSelected =
    (shareToAll ? 1 : 0) +
    selectedUserIds.size +
    selectedDirectorateIds.size +
    selectedDivisionIds.size +
    selectedDepartmentIds.size;

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const form = document.querySelector('form');
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
  }, [open, isSubmitting, showShareAllConfirm, showDuplicateWarning, activeTab, onOpenChange]);

  // Get active user count for "Share to All"
  const activeUserCount = useMemo(() => {
    return users.filter((u) => u.active).length;
  }, [users]);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Share Document</DialogTitle>
          <DialogDescription>
            Grant access to users, divisions, or departments. Shared documents will appear in their My Documents view.
          </DialogDescription>
        </DialogHeader>

        {document && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden space-y-4">
            <div className="rounded-md border bg-muted/20 p-3 space-y-2 flex-shrink-0">
              <p className="text-sm font-semibold text-foreground">{document.title}</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="capitalize">
                  {document.status}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {document.documentType}
                </Badge>
                {document.referenceNumber && <span>Ref: {document.referenceNumber}</span>}
              </div>
              {(document.sensitivity === 'restricted' || document.sensitivity === 'confidential') && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    This document is {document.sensitivity}. Ensure recipients have appropriate clearance.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Access Level Selection */}
            <div className="space-y-2 flex-shrink-0">
              <Label htmlFor="access-level">
                Access Level <span className="text-destructive">*</span>
              </Label>
              <Select value={accessLevel} onValueChange={(v) => setAccessLevel(v as PermissionAccess)}>
                <SelectTrigger id="access-level" aria-label="Select access level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="read">
                    <div>
                      <div className="font-medium">Read Only</div>
                      <div className="text-xs text-muted-foreground">View and download only</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="write">
                    <div>
                      <div className="font-medium">Read & Write</div>
                      <div className="text-xs text-muted-foreground">Can edit and create versions</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div>
                      <div className="font-medium">Full Admin</div>
                      <div className="text-xs text-muted-foreground">Full control including permissions</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {accessLevel !== 'read' && (
                <Alert className={accessLevel === 'admin' ? 'border-destructive/50 bg-destructive/10' : 'border-warning/50 bg-warning/10'}>
                  <AlertTriangle className={`h-4 w-4 ${accessLevel === 'admin' ? 'text-destructive' : 'text-warning'}`} />
                  <AlertDescription className={accessLevel === 'admin' ? 'text-destructive' : 'text-warning'}>
                    {accessLevel === 'admin'
                      ? 'Admin access grants full control. Use with caution.'
                      : 'Write access allows editing. Ensure recipients are authorized.'}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Existing Permissions Display */}
            {isLoadingPermissions ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading permissions...</span>
              </div>
            ) : existingPermissions.length > 0 && (
              <div className="space-y-2 flex-shrink-0 border rounded-lg p-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Current Access ({existingPermissions.length})</Label>
                </div>
                <ScrollArea className="max-h-32">
                  <div className="space-y-1" role="list">
                    {existingPermissions.map((perm) => (
                      <div key={perm.id} className="flex items-center justify-between text-xs p-2 bg-background rounded border" role="listitem">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {perm.access}
                          </Badge>
                          <span className="text-muted-foreground">
                            {perm.userIds.length > 0 && `${perm.userIds.length} user(s)`}
                            {perm.divisionIds.length > 0 && `${perm.divisionIds.length > 0 && perm.userIds.length > 0 ? ', ' : ''}${perm.divisionIds.length} division(s)`}
                            {perm.departmentIds.length > 0 && `${(perm.userIds.length > 0 || perm.divisionIds.length > 0) ? ', ' : ''}${perm.departmentIds.length} department(s)`}
                            {perm.gradeLevels.length > 0 && `${(perm.userIds.length > 0 || perm.divisionIds.length > 0 || perm.departmentIds.length > 0) ? ', ' : ''}${perm.gradeLevels.length} grade level(s)`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <TabsList className="grid w-full grid-cols-5 flex-shrink-0">
                  <TabsTrigger value="all" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    All
                  </TabsTrigger>
                  <TabsTrigger value="directorate" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Directorate
                  </TabsTrigger>
                  <TabsTrigger value="division" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Division
                  </TabsTrigger>
                  <TabsTrigger value="department" className="flex items-center gap-2">
                    <Users2 className="h-4 w-4" />
                    Department
                  </TabsTrigger>
                  <TabsTrigger value="users" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Users
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <Checkbox
                        id="share-to-all"
                        checked={shareToAll}
                        onCheckedChange={handleShareToAllClick}
                        aria-label="Share to all users"
                      />
                      <Label htmlFor="share-to-all" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <span className="font-medium">Share to all users</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Grant {accessLevel} access to all {activeUserCount} active users in the system
                        </p>
                      </Label>
                    </div>
                    {shareToAll && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          This will share the document with all {activeUserCount} active users. Click "Share Document" to confirm.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="directorate" className="mt-4 flex-1 flex flex-col min-h-0">
                  <div className="flex flex-col flex-1 min-h-0 space-y-3">
                    <div className="flex items-center justify-between px-1 flex-shrink-0">
                      <Label className="text-sm font-medium">
                        Select Directorates ({selectedDirectorateIds.size} selected)
                      </Label>
                      <div className="flex items-center gap-2">
                        {selectedDirectorateIds.size > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDirectorateIds(new Set())}
                            className="text-xs h-7"
                            aria-label="Clear all selections"
                          >
                            Clear ({selectedDirectorateIds.size})
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={toggleAllDirectorates}
                          className="text-xs h-7"
                          aria-label={selectedDirectorateIds.size === directorates.length ? "Deselect all directorates" : `Select all ${directorates.length} directorates`}
                        >
                          {selectedDirectorateIds.size === directorates.length ? "Deselect All" : `Select All (${directorates.length})`}
                        </Button>
                      </div>
                    </div>
                    <ScrollArea className="flex-1 border rounded-md">
                      <div className="space-y-2 p-3" role="list">
                          {directorates.length > 0 ? (
                          directorates.map((dir) => {
                            const isSelected = selectedDirectorateIds.has(dir.id);
                            const divisionCount = divisionsByDirectorate.get(dir.id)?.length || 0;
                            const existing = hasExistingAccess(undefined, undefined, undefined, dir.id);
                            return (
                              <div
                                key={dir.id}
                                className={`flex items-center space-x-3 p-3 border rounded-lg transition-colors ${
                                  isSelected 
                                    ? 'bg-primary/10 border-primary shadow-sm' 
                                    : existing.hasAccess 
                                    ? 'bg-muted/30 border-muted' 
                                    : 'hover:bg-accent/50 border-border'
                                }`}
                                role="listitem"
                              >
                                <Checkbox
                                  id={`dir-${dir.id}`}
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedDirectorateIds((prev) => new Set([...prev, dir.id]));
                                    } else {
                                      setSelectedDirectorateIds((prev) => {
                                        const next = new Set(prev);
                                        next.delete(dir.id);
                                        return next;
                                      });
                                    }
                                  }}
                                  aria-label={`${isSelected ? 'Deselect' : 'Select'} ${dir.name} directorate`}
                                />
                                <Label htmlFor={`dir-${dir.id}`} className="flex-1 cursor-pointer min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                        {dir.name}
                                      </span>
                                      {isSelected && (
                                        <Badge variant="default" className="text-xs">
                                          Selected
                                        </Badge>
                                      )}
                                      {existing.hasAccess && !isSelected && (
                                        <Badge variant="outline" className="text-xs">
                                          Has {existing.accessLevel} access
                                        </Badge>
                                      )}
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {divisionCount} division{divisionCount !== 1 ? "s" : ""}
                                    </Badge>
                                  </div>
                                </Label>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-8 text-center text-sm text-muted-foreground" role="status">
                            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                            <p className="font-medium mb-1">No directorates available</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="division" className="mt-4 flex-1 flex flex-col min-h-0">
                  <div className="flex flex-col flex-1 min-h-0 space-y-3">
                    <div className="flex items-center justify-between px-1 flex-shrink-0">
                      <Label className="text-sm font-medium">
                        Select Divisions ({selectedDivisionIds.size} selected)
                      </Label>
                      <div className="flex items-center gap-2">
                        {selectedDivisionIds.size > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDivisionIds(new Set())}
                            className="text-xs h-7"
                            aria-label="Clear all selections"
                          >
                            Clear ({selectedDivisionIds.size})
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={toggleAllDivisions}
                          className="text-xs h-7"
                          aria-label={selectedDivisionIds.size === filteredDivisions.length ? "Deselect all divisions" : `Select all ${filteredDivisions.length} divisions`}
                        >
                          {selectedDivisionIds.size === filteredDivisions.length ? "Deselect All" : `Select All (${filteredDivisions.length})`}
                        </Button>
                      </div>
                    </div>
                    <div className="relative flex-shrink-0">
                      <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                      <Input
                        value={searchDivisionQuery}
                        onChange={(e) => setSearchDivisionQuery(e.target.value)}
                        placeholder="Search divisions..."
                        className="pl-8 h-9"
                        aria-label="Search divisions"
                      />
                      {searchDivisionQuery && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setSearchDivisionQuery("")}
                          aria-label="Clear search"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <ScrollArea className="flex-1 border rounded-md">
                      <div className="space-y-2 p-3" role="list">
                          {filteredDivisions.length > 0 ? (
                          filteredDivisions.map((div) => {
                            const isSelected = selectedDivisionIds.has(div.id);
                            const directorateName = directorates.find((d) => d.id === div.directorateId)?.name;
                            const existing = hasExistingAccess(undefined, div.id);
                            return (
                              <div
                                key={div.id}
                                className={`flex items-center space-x-3 p-3 border rounded-lg transition-colors ${
                                  isSelected 
                                    ? 'bg-primary/10 border-primary shadow-sm' 
                                    : existing.hasAccess 
                                    ? 'bg-muted/30 border-muted' 
                                    : 'hover:bg-accent/50 border-border'
                                }`}
                                role="listitem"
                              >
                                <Checkbox
                                  id={`div-${div.id}`}
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedDivisionIds((prev) => new Set([...prev, div.id]));
                                    } else {
                                      setSelectedDivisionIds((prev) => {
                                        const next = new Set(prev);
                                        next.delete(div.id);
                                        return next;
                                      });
                                    }
                                  }}
                                  aria-label={`${isSelected ? 'Deselect' : 'Select'} ${div.name} division`}
                                />
                                <Label htmlFor={`div-${div.id}`} className="flex-1 cursor-pointer min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                          {div.name}
                                        </span>
                                        {isSelected && (
                                          <Badge variant="default" className="text-xs">
                                            Selected
                                          </Badge>
                                        )}
                                        {existing.hasAccess && !isSelected && (
                                          <Badge variant="outline" className="text-xs">
                                            Has {existing.accessLevel} access
                                          </Badge>
                                        )}
                                      </div>
                                      {directorateName && (
                                        <p className="text-xs text-muted-foreground mt-1">{directorateName}</p>
                                      )}
                                    </div>
                                  </div>
                                </Label>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-8 text-center text-sm text-muted-foreground" role="status">
                            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                            <p className="font-medium mb-1">No divisions found</p>
                            <p className="text-xs">
                              {searchDivisionQuery 
                                ? `No divisions match "${searchDivisionQuery}"` 
                                : 'No divisions available'}
                            </p>
                            {searchDivisionQuery && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="mt-3"
                                onClick={() => setSearchDivisionQuery("")}
                              >
                                Clear search
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="department" className="mt-4 flex-1 flex flex-col min-h-0">
                  <div className="flex flex-col flex-1 min-h-0 space-y-3">
                    <div className="flex items-center justify-between px-1 flex-shrink-0">
                      <Label className="text-sm font-medium">
                        Select Departments ({selectedDepartmentIds.size} selected)
                      </Label>
                      <div className="flex items-center gap-2">
                        {selectedDepartmentIds.size > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDepartmentIds(new Set())}
                            className="text-xs h-7"
                            aria-label="Clear all selections"
                          >
                            Clear ({selectedDepartmentIds.size})
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={toggleAllDepartments}
                          className="text-xs h-7"
                          aria-label={selectedDepartmentIds.size === filteredDepartments.length ? "Deselect all departments" : `Select all ${filteredDepartments.length} departments`}
                        >
                          {selectedDepartmentIds.size === filteredDepartments.length ? "Deselect All" : `Select All (${filteredDepartments.length})`}
                        </Button>
                      </div>
                    </div>
                    <div className="relative flex-shrink-0">
                      <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                      <Input
                        value={searchDepartmentQuery}
                        onChange={(e) => setSearchDepartmentQuery(e.target.value)}
                        placeholder="Search departments..."
                        className="pl-8 h-9"
                        aria-label="Search departments"
                      />
                      {searchDepartmentQuery && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setSearchDepartmentQuery("")}
                          aria-label="Clear search"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <ScrollArea className="flex-1 border rounded-md">
                      <div className="space-y-2 p-3" role="list">
                          {filteredDepartments.length > 0 ? (
                          filteredDepartments.map((dept) => {
                            const isSelected = selectedDepartmentIds.has(dept.id);
                            const divisionName = divisions.find((d) => d.id === dept.divisionId)?.name;
                            const existing = hasExistingAccess(undefined, undefined, dept.id);
                            return (
                              <div
                                key={dept.id}
                                className={`flex items-center space-x-3 p-3 border rounded-lg transition-colors ${
                                  isSelected 
                                    ? 'bg-primary/10 border-primary shadow-sm' 
                                    : existing.hasAccess 
                                    ? 'bg-muted/30 border-muted' 
                                    : 'hover:bg-accent/50 border-border'
                                }`}
                                role="listitem"
                              >
                                <Checkbox
                                  id={`dept-${dept.id}`}
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedDepartmentIds((prev) => new Set([...prev, dept.id]));
                                    } else {
                                      setSelectedDepartmentIds((prev) => {
                                        const next = new Set(prev);
                                        next.delete(dept.id);
                                        return next;
                                      });
                                    }
                                  }}
                                  aria-label={`${isSelected ? 'Deselect' : 'Select'} ${dept.name} department`}
                                />
                                <Label htmlFor={`dept-${dept.id}`} className="flex-1 cursor-pointer min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                          {dept.name}
                                        </span>
                                        {isSelected && (
                                          <Badge variant="default" className="text-xs">
                                            Selected
                                          </Badge>
                                        )}
                                        {existing.hasAccess && !isSelected && (
                                          <Badge variant="outline" className="text-xs">
                                            Has {existing.accessLevel} access
                                          </Badge>
                                        )}
                                      </div>
                                      {divisionName && (
                                        <p className="text-xs text-muted-foreground mt-1">{divisionName}</p>
                                      )}
                                    </div>
                                  </div>
                                </Label>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-8 text-center text-sm text-muted-foreground" role="status">
                            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                            <p className="font-medium mb-1">No departments found</p>
                            <p className="text-xs">
                              {searchDepartmentQuery 
                                ? `No departments match "${searchDepartmentQuery}"` 
                                : 'No departments available'}
                            </p>
                            {searchDepartmentQuery && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="mt-3"
                                onClick={() => setSearchDepartmentQuery("")}
                              >
                                Clear search
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="users" className="mt-4 flex-1 flex flex-col min-h-0">
                  <div className="flex flex-col flex-1 min-h-0 space-y-3">
                    <div className="flex items-center justify-between px-1 flex-shrink-0">
                      <Label className="text-sm font-medium">
                        Select Users ({selectedUserIds.size} selected)
                      </Label>
                      <div className="flex items-center gap-2">
                        {selectedUserIds.size > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedUserIds(new Set())}
                            className="text-xs h-7"
                            aria-label="Clear all selections"
                          >
                            Clear ({selectedUserIds.size})
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={toggleAllUsers}
                          className="text-xs h-7"
                          aria-label={selectedUserIds.size === filteredUsers.length ? "Deselect all users" : `Select all ${filteredUsers.length} users`}
                        >
                          {selectedUserIds.size === filteredUsers.length ? "Deselect All" : `Select All (${filteredUsers.length})`}
                        </Button>
                      </div>
                    </div>
                    <div className="relative flex-shrink-0">
                      <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                      <Input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search name, email, role..."
                        className="pl-8 h-9"
                        aria-label="Search users"
                      />
                      {searchQuery && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setSearchQuery("")}
                          aria-label="Clear search"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <ScrollArea className="flex-1 border rounded-md">
                      <div className="space-y-2 p-3" role="list">
                          {/* Recent Recipients */}
                          {recentRecipients.users.length > 0 && !searchQuery && (
                          <>
                            <div className="text-xs font-medium text-muted-foreground mb-2 px-1">Recent</div>
                            {recentRecipients.users
                              .filter((id) => shareableUsers.some((u) => u.id === id))
                              .slice(0, 5)
                              .map((userId) => {
                                const user = shareableUsers.find((u) => u.id === userId);
                                if (!user) return null;
                                const isSelected = selectedUserIds.has(user.id);
                                const existing = hasExistingAccess(user.id);
                                return (
                                  <div
                                    key={user.id}
                                    className={`flex items-center space-x-3 p-3 border rounded-lg transition-colors ${
                                      isSelected 
                                        ? 'bg-primary/10 border-primary shadow-sm' 
                                        : existing.hasAccess 
                                        ? 'bg-muted/30 border-muted' 
                                        : 'hover:bg-accent/50 border-border'
                                    }`}
                                    role="listitem"
                                  >
                                    <Checkbox
                                      id={`user-recent-${user.id}`}
                                      checked={isSelected}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedUserIds((prev) => new Set([...prev, user.id]));
                                        } else {
                                          setSelectedUserIds((prev) => {
                                            const next = new Set(prev);
                                            next.delete(user.id);
                                            return next;
                                          });
                                        }
                                      }}
                                      aria-label={`${isSelected ? 'Deselect' : 'Select'} ${user.name}`}
                                    />
                                    <Label htmlFor={`user-recent-${user.id}`} className="flex-1 cursor-pointer min-w-0">
                                      <div className="flex flex-col">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className={`font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                            {user.name}
                                          </span>
                                          {isSelected && (
                                            <Badge variant="default" className="text-xs">
                                              Selected
                                            </Badge>
                                          )}
                                          {existing.hasAccess && !isSelected && (
                                            <Badge variant="outline" className="text-xs">
                                              Has {existing.accessLevel} access
                                            </Badge>
                                          )}
                                        </div>
                                        <span className="text-xs text-muted-foreground mt-0.5">
                                          {user.email} • {user.systemRole}
                                        </span>
                                      </div>
                                    </Label>
                                  </div>
                                );
                              })}
                            <Separator className="my-3" />
                          </>
                        )}
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map((user) => {
                            const isSelected = selectedUserIds.has(user.id);
                            const existing = hasExistingAccess(user.id);
                            return (
                              <div
                                key={user.id}
                                className={`flex items-center space-x-3 p-3 border rounded-lg transition-colors ${
                                  isSelected 
                                    ? 'bg-primary/10 border-primary shadow-sm' 
                                    : existing.hasAccess 
                                    ? 'bg-muted/30 border-muted' 
                                    : 'hover:bg-accent/50 border-border'
                                }`}
                                role="listitem"
                              >
                                <Checkbox
                                  id={`user-${user.id}`}
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedUserIds((prev) => new Set([...prev, user.id]));
                                    } else {
                                      setSelectedUserIds((prev) => {
                                        const next = new Set(prev);
                                        next.delete(user.id);
                                        return next;
                                      });
                                    }
                                  }}
                                  aria-label={`${isSelected ? 'Deselect' : 'Select'} ${user.name}`}
                                />
                                <Label htmlFor={`user-${user.id}`} className="flex-1 cursor-pointer min-w-0">
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                        {user.name}
                                      </span>
                                      {isSelected && (
                                        <Badge variant="default" className="text-xs">
                                          Selected
                                        </Badge>
                                      )}
                                      {existing.hasAccess && !isSelected && (
                                        <Badge variant="outline" className="text-xs">
                                          Has {existing.accessLevel} access
                                        </Badge>
                                      )}
                                    </div>
                                    <span className="text-xs text-muted-foreground mt-0.5">
                                      {user.email} • {user.systemRole}
                                    </span>
                                  </div>
                                </Label>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-8 text-center text-sm text-muted-foreground" role="status">
                            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                            <p className="font-medium mb-1">No users found</p>
                            <p className="text-xs">
                              {searchQuery 
                                ? `No users match "${searchQuery}"` 
                                : 'No users available'}
                            </p>
                            {searchQuery && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="mt-3"
                                onClick={() => setSearchQuery("")}
                              >
                                Clear search
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="space-y-4 flex-shrink-0 border-t pt-4 mt-auto">
                <div className="space-y-2">
                  <Label htmlFor="share-note">
                    Message <span className="text-muted-foreground text-xs">(optional)</span>
                  </Label>
                  <Textarea
                    id="share-note"
                    placeholder="Add context or instructions. Notifications will include this message."
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    maxLength={MAX_NOTE_LENGTH}
                    aria-label="Share message"
                    aria-describedby="note-help"
                  />
                  <p id="note-help" className="text-xs text-muted-foreground">
                    {note.length}/{MAX_NOTE_LENGTH} characters
                  </p>
                </div>

                {shareProgress > 0 && shareProgress < 100 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Sharing...</span>
                      <span className="text-muted-foreground">{Math.round(shareProgress)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${shareProgress}%` }}
                        role="progressbar"
                        aria-valuenow={shareProgress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                  </div>
                )}

                {totalSelected > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {shareToAll
                      ? `Document will be shared with all ${activeUserCount} users with ${accessLevel} access.`
                      : `Document will be shared with ${totalSelected} selection${totalSelected !== 1 ? "s" : ""} with ${accessLevel} access.`}
                  </p>
                )}

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                    aria-label="Cancel sharing"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || (!shareToAll && totalSelected === 0)}
                    aria-label="Share document"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sharing…
                      </>
                    ) : (
                      "Share Document"
                    )}
                  </Button>
                </DialogFooter>
              </div>
            </form>
          </div>
        )}
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
              const allDivisionIds = Array.from(
                new Set([...selectedDivisionIds, ...selectedDivisionIdsFromDirectorates])
              );
              void performShare(Array.from(selectedUserIds), allDivisionIds, Array.from(selectedDepartmentIds));
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
