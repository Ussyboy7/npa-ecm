"use client";

import { useState, useMemo, forwardRef, useImperativeHandle, useCallback } from "react";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Briefcase,
  Plus,
  Search,
  UserMinus,
  Edit3,
  Users,
  UserCog,
  MoreVertical,
  User,
  Shield,
} from "lucide-react";
import { useOrganization, type AssistantAssignment } from "@/contexts/OrganizationContext";
import { AssistantAssignmentModal } from "@/components/admin/AssistantAssignmentModal";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ContextualHelp } from "@/components/help/ContextualHelp";
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
import { toast } from "@/hooks/use-toast";
import { registryQueueEmptyIconClass } from "@/components/shared/registry-queue-styles";

type ViewMode = "executives" | "all";
type TypeFilter = "all" | "TA" | "PA";

const MANAGEMENT_GRADES = ["MDCS", "EDCS", "MSS1", "MSS2"];

export type AssistantsManagementTabHandle = {
  openAssignAssistant: () => void;
};

export const AssistantsManagementTab = forwardRef<
  AssistantsManagementTabHandle,
  {
    searchQuery?: string;
    onSearchQueryChange?: (value: string) => void;
    hideInlineSearch?: boolean;
    hideHeaderActions?: boolean;
    assistantsTypeFilter?: TypeFilter;
    onAssistantsTypeFilterChange?: (value: TypeFilter) => void;
    viewMode?: ViewMode;
    onViewModeChange?: (value: ViewMode) => void;
    hideViewModeTabs?: boolean;
  }
>(function AssistantsManagementTab(
  {
    searchQuery: controlledSearchQuery,
    onSearchQueryChange,
    hideInlineSearch = false,
    hideHeaderActions = false,
    assistantsTypeFilter: controlledTypeFilter,
    onAssistantsTypeFilterChange,
    viewMode: controlledViewMode,
    onViewModeChange,
    hideViewModeTabs = false,
  },
  ref,
) {
  const { assistantAssignments, users, deleteAssignment } = useOrganization();
  const { currentUser } = useCurrentUser();
  
  // View & filter state
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>("executives");
  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = (value: ViewMode) => {
    onViewModeChange?.(value);
    if (controlledViewMode === undefined) {
      setInternalViewMode(value);
    }
  };
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const searchQuery = controlledSearchQuery ?? internalSearchQuery;
  const setSearchQuery = (value: string) => {
    onSearchQueryChange?.(value);
    if (controlledSearchQuery === undefined) {
      setInternalSearchQuery(value);
    }
  };
  const [internalTypeFilter, setInternalTypeFilter] = useState<TypeFilter>("all");
  const typeFilter = controlledTypeFilter ?? internalTypeFilter;
  const setTypeFilter = (value: TypeFilter) => {
    onAssistantsTypeFilterChange?.(value);
    if (controlledTypeFilter === undefined) {
      setInternalTypeFilter(value);
    }
  };
  
  // Modal state
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedExecutiveId, setSelectedExecutiveId] = useState<string>("");
  const [selectedAssignment, setSelectedAssignment] = useState<AssistantAssignment | undefined>(undefined);
  const [assignmentToRemove, setAssignmentToRemove] = useState<string>("");

  const isSuperAdmin = currentUser?.systemRole === "Super Admin";
  // Get executives (MD, ED, GM, AGM)
  const executives = useMemo(() => 
    users.filter((user) => MANAGEMENT_GRADES.includes(user.gradeLevel)),
    [users]
  );

  // Filtered executives
  const filteredExecutives = useMemo(() => {
    let result = isSuperAdmin ? executives : executives.filter(e => e.id === currentUser?.id);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(exec => {
        // Search by executive name or role
        if (exec.name.toLowerCase().includes(query) || exec.systemRole.toLowerCase().includes(query)) {
          return true;
        }
        // Also search by assigned assistants' names
        const execAssignments = assistantAssignments.filter(a => a.executiveId === exec.id);
        return execAssignments.some(assignment => {
          const assistant = users.find(u => u.id === assignment.assistantId);
          return assistant?.name.toLowerCase().includes(query) || 
                 assistant?.systemRole.toLowerCase().includes(query) ||
                 assignment.specialization?.toLowerCase().includes(query);
        });
      });
    }
    
    return result;
  }, [executives, searchQuery, isSuperAdmin, currentUser?.id, assistantAssignments, users]);

  // All assignments (for table view)
  const filteredAssignments = useMemo(() => {
    let result = [...assistantAssignments];
    
    // Filter by type
    if (typeFilter !== "all") {
      result = result.filter(a => a.type === typeFilter);
    }
    
    // Filter by search - enhanced to search assistants more thoroughly
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(a => {
        const assistant = users.find(u => u.id === a.assistantId);
        const executive = users.find(u => u.id === a.executiveId);
        return (
          assistant?.name.toLowerCase().includes(query) ||
          assistant?.email?.toLowerCase().includes(query) ||
          assistant?.systemRole.toLowerCase().includes(query) ||
          assistant?.gradeLevel.toLowerCase().includes(query) ||
          executive?.name.toLowerCase().includes(query) ||
          executive?.systemRole.toLowerCase().includes(query) ||
          a.specialization?.toLowerCase().includes(query) ||
          a.permissions.some(p => p.toLowerCase().includes(query))
        );
      });
    }
    
    // Filter by permission if not super admin
    if (!isSuperAdmin) {
      result = result.filter(a => a.executiveId === currentUser?.id);
    }
    
    return result;
  }, [assistantAssignments, typeFilter, searchQuery, users, isSuperAdmin, currentUser?.id]);

  // Helper functions
  const getAssistantsForExecutive = (execId: string) => {
    return assistantAssignments.filter(a => a.executiveId === execId);
  };

  const getAssistantInfo = (assistantId: string) => {
    return users.find(u => u.id === assistantId);
  };

  const getExecutiveInfo = (executiveId: string) => {
    return users.find(u => u.id === executiveId);
  };

  const canManageExecutive = useCallback((execId: string) => {
    if (isSuperAdmin) return true;
    return execId === currentUser?.id;
  }, [isSuperAdmin, currentUser?.id]);

  // Action handlers
  const handleAssignAssistant = useCallback((execId?: string) => {
    if (execId && !canManageExecutive(execId)) {
      toast({ title: "Action not allowed", description: "Only the executive or super admin can modify assistants.", variant: "destructive" });
      return;
    }
    setSelectedExecutiveId(execId || "");
    setSelectedAssignment(undefined);
    setAssignmentModalOpen(true);
  }, [canManageExecutive]);

  useImperativeHandle(ref, () => ({
    openAssignAssistant: () => handleAssignAssistant(),
  }), [handleAssignAssistant]);

  const handleEditAssignment = (assignment: AssistantAssignment) => {
    if (!canManageExecutive(assignment.executiveId)) {
      toast({ title: "Action not allowed", description: "Only the executive or super admin can modify assistants.", variant: "destructive" });
      return;
    }
    setSelectedExecutiveId(assignment.executiveId);
    setSelectedAssignment(assignment);
    setAssignmentModalOpen(true);
  };

  const handleRemoveAssistant = (assignmentId: string) => {
    const assignment = assistantAssignments.find((item) => item.id as string === assignmentId);
    if (!assignment) return;

    if (!canManageExecutive(assignment.executiveId)) {
      toast({ title: "Action not allowed", description: "Only the executive or super admin can modify assistants.", variant: "destructive" });
      return;
    }

    setAssignmentToRemove(assignmentId);
    setRemoveDialogOpen(true);
  };

  const confirmRemove = async () => {
    if (assignmentToRemove) {
      try {
        await deleteAssignment(assignmentToRemove);
        toast({ title: "Success", description: "Assistant removed successfully" });
        setRemoveDialogOpen(false);
        setAssignmentToRemove("");
      } catch (error: unknown) {
        const description = error instanceof Error ? error.message : "Unable to remove assistant";
        toast({ title: "Request failed", description, variant: "destructive" });
      }
    }
  };

  return (
    <ClientErrorBoundary>
      <div className="space-y-6">
        {!hideHeaderActions ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
            <Button 
              onClick={() => handleAssignAssistant()} 
              size="sm"
              className="bg-gradient-primary"
              aria-label="Assign assistant"
            >
              <Plus className="h-4 w-4 mr-2" />
              Assign Assistant
            </Button>
            <ContextualHelp
              title="How to manage assistants"
              description="Assign assistants to executives with the right permissions."
              steps={[
                'Create an assignment by selecting executive and assistant.',
                'Set assistant type (TA/PA) and permissions.',
                'Edit or remove assignments as staffing changes.',
              ]}
            />
        </div>
        ) : null}

        <Card>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            {!hideViewModeTabs ? (
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CardTitle>Assistant Assignments</CardTitle>
                  <TabsList>
                    <TabsTrigger value="executives" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      By Executive
                    </TabsTrigger>
                    <TabsTrigger value="all" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      All Assistants
                    </TabsTrigger>
                  </TabsList>
                </div>
                {!hideInlineSearch ? (
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search assistants..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                      aria-label="Search assistants"
                    />
                  </div>
                  {viewMode === "all" && (
                    <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="TA">Technical</SelectItem>
                        <SelectItem value="PA">Personal</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                ) : null}
              </div>
            </CardHeader>
            ) : null}
            <CardContent className={hideViewModeTabs ? "pt-6" : undefined}>

              <TabsContent value="executives" className="space-y-4">
              {filteredExecutives.length === 0 ? (
                <EmptyState
                  icon={<Shield className={registryQueueEmptyIconClass} />}
                  title={searchQuery.trim() ? "No executives match your search" : "No executives in scope"}
                  message={
                    searchQuery.trim()
                      ? "Try a different name, role, or grade level keyword."
                      : "Assistants are assigned to managing directors, executive directors, and general managers. Assignments appear here once executives exist in your scope."
                  }
                  actionLabel={searchQuery.trim() ? "Clear search" : "Assign assistant"}
                  onAction={
                    searchQuery.trim()
                      ? () => setSearchQuery("")
                      : () => handleAssignAssistant()
                  }
                  variant="dashed"
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredExecutives.map((executive) => {
            const assignments = getAssistantsForExecutive(executive.id);
            const canManage = canManageExecutive(executive.id);

            return (
                      <Card key={executive.id} className="group">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                                <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                                <CardTitle className="text-base">{executive.name}</CardTitle>
                                <CardDescription className="text-xs">
                                  {executive.systemRole} • {executive.gradeLevel}
                                </CardDescription>
                              </div>
                      </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={assignments.length > 0 ? "default" : "secondary"}>
                                {assignments.length} assistant{assignments.length !== 1 ? "s" : ""}
                      </Badge>
                              {canManage && (
                    <Button 
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleAssignAssistant(executive.id)}
                    >
                                  <Plus className="h-4 w-4" />
                    </Button>
                              )}
                            </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {assignments.length === 0 ? (
                            <div className="text-center py-6 border border-dashed rounded-lg">
                              <Briefcase className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                              <p className="text-sm text-muted-foreground">No assistants assigned</p>
                              {canManage && (
                                <Button
                                  variant="link"
                                  size="sm"
                                  onClick={() => handleAssignAssistant(executive.id)}
                                  className="mt-1"
                                >
                                  Assign first assistant
                                </Button>
                              )}
                    </div>
                  ) : (
                            <div className="space-y-2">
                              {assignments.map((assignment) => {
                        const assistant = getAssistantInfo(assignment.assistantId);
                        return (
                          <div
                            key={assignment.id}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                          >
                                    <div className="flex items-center gap-3">
                                      <div className={`p-1.5 rounded ${assignment.type === "TA" ? "bg-info/10" : "bg-success/10"}`}>
                                        {assignment.type === "TA" ? (
                                          <UserCog className="h-4 w-4 text-info" />
                                        ) : (
                                          <User className="h-4 w-4 text-success" />
                                        )}
                                </div>
                                      <div>
                                        <p className="font-medium text-sm">{assistant?.name || "Unknown"}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {assignment.specialization || "General"} • {assignment.permissions.length} permissions
                                </p>
                              </div>
                            </div>
                                    <div className="flex items-center gap-1">
                                      <Badge variant="outline" className="text-xs">
                                        {assignment.type}
                                      </Badge>
                                      {canManage && (
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                              <MoreVertical className="h-4 w-4" />
                              </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEditAssignment(assignment)}>
                                              <Edit3 className="h-4 w-4 mr-2" />
                                              Edit Permissions
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                onClick={() => handleRemoveAssistant(assignment.id)}
                                              className="text-destructive"
                              >
                                              <UserMinus className="h-4 w-4 mr-2" />
                                              Remove
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
                </div>
              )}
            </TabsContent>

              <TabsContent value="all" className="space-y-4">
                  {filteredAssignments.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">
                        {searchQuery || typeFilter !== "all" 
                          ? "No assignments match your filters" 
                          : "No assistant assignments yet"}
                      </p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Assistant</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Executive</TableHead>
                            <TableHead>Specialization</TableHead>
                            <TableHead>Permissions</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAssignments.map((assignment) => {
                            const assistant = getAssistantInfo(assignment.assistantId);
                            const executive = getExecutiveInfo(assignment.executiveId);
                            const canManage = canManageExecutive(assignment.executiveId);

                            return (
                              <TableRow key={assignment.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded ${assignment.type === "TA" ? "bg-info/10" : "bg-success/10"}`}>
                                      {assignment.type === "TA" ? (
                                        <UserCog className="h-4 w-4 text-info" />
                                      ) : (
                                        <User className="h-4 w-4 text-success" />
                                      )}
                                    </div>
                                    <span className="font-medium">{assistant?.name || "Unknown"}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={assignment.type === "TA" ? "default" : "secondary"} className="text-xs">
                                    {assignment.type === "TA" ? "Technical" : "Personal"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium text-sm">{executive?.name || "Unknown"}</p>
                                    <p className="text-xs text-muted-foreground">{executive?.systemRole}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm">{assignment.specialization || "General"}</span>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {assignment.permissions.length} permissions
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {canManage && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleEditAssignment(assignment)}>
                                          <Edit3 className="h-4 w-4 mr-2" />
                                          Edit Permissions
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={() => handleRemoveAssistant(assignment.id)}
                                          className="text-destructive"
                                        >
                                          <UserMinus className="h-4 w-4 mr-2" />
                                          Remove
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

        {/* Assignment Modal */}
      <AssistantAssignmentModal
        open={assignmentModalOpen}
        onOpenChange={setAssignmentModalOpen}
        executiveId={selectedExecutiveId}
        assignment={selectedAssignment}
      />

        {/* Remove Confirmation */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Assistant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this assistant assignment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmRemove} className="bg-destructive text-destructive-foreground">
                Remove
              </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ClientErrorBoundary>
  );
});

