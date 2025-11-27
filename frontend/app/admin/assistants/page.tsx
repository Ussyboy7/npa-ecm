"use client";

import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  ChevronRight,
} from "lucide-react";
import { useOrganization, type AssistantAssignment } from "@/contexts/OrganizationContext";
import { AssistantAssignmentModal } from "@/components/admin/AssistantAssignmentModal";
import { useCurrentUser } from "@/hooks/use-current-user";
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

type ViewMode = "executives" | "all";
type TypeFilter = "all" | "TA" | "PA";

const AssistantsManagement = () => {
  const { assistantAssignments, users, deleteAssignment } = useOrganization();
  const { currentUser } = useCurrentUser();
  
  // View & filter state
  const [viewMode, setViewMode] = useState<ViewMode>("executives");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  
  // Modal state
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedExecutiveId, setSelectedExecutiveId] = useState<string>("");
  const [selectedAssignment, setSelectedAssignment] = useState<AssistantAssignment | undefined>(undefined);
  const [assignmentToRemove, setAssignmentToRemove] = useState<string>("");

  const isSuperAdmin = currentUser?.systemRole === "Super Admin";
  const managementGrades = ["MDCS", "EDCS", "MSS1", "MSS2"];

  // Get executives (MD, ED, GM, AGM)
  const executives = useMemo(() => 
    users.filter((user) => managementGrades.includes(user.gradeLevel)),
    [users]
  );

  // Stats
  const stats = useMemo(() => ({
    total: assistantAssignments.length,
    tas: assistantAssignments.filter(a => a.type === "TA").length,
    pas: assistantAssignments.filter(a => a.type === "PA").length,
    executives: executives.length,
    withAssistants: new Set(assistantAssignments.map(a => a.executiveId)).size,
  }), [assistantAssignments, executives]);

  // Filtered executives
  const filteredExecutives = useMemo(() => {
    let result = isSuperAdmin ? executives : executives.filter(e => e.id === currentUser?.id);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(exec =>
        exec.name.toLowerCase().includes(query) ||
        exec.systemRole.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [executives, searchQuery, isSuperAdmin, currentUser?.id]);

  // All assignments (for table view)
  const filteredAssignments = useMemo(() => {
    let result = [...assistantAssignments];
    
    // Filter by type
    if (typeFilter !== "all") {
      result = result.filter(a => a.type === typeFilter);
    }
    
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(a => {
        const assistant = users.find(u => u.id === a.assistantId);
        const executive = users.find(u => u.id === a.executiveId);
        return (
          assistant?.name.toLowerCase().includes(query) ||
          executive?.name.toLowerCase().includes(query) ||
          a.specialization?.toLowerCase().includes(query)
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

  const canManageExecutive = (execId: string) => {
    if (isSuperAdmin) return true;
    return execId === currentUser?.id;
  };

  // Action handlers
  const handleAssignAssistant = (execId?: string) => {
    if (execId && !canManageExecutive(execId)) {
      toast({ title: "Action not allowed", description: "Only the executive or super admin can modify assistants.", variant: "destructive" });
      return;
    }
    setSelectedExecutiveId(execId || "");
    setSelectedAssignment(undefined);
    setAssignmentModalOpen(true);
  };

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
    const assignment = assistantAssignments.find((item) => item.id === assignmentId);
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
      } catch (error) {
        const description = error instanceof Error ? error.message : "Unable to remove assistant";
        toast({ title: "Request failed", description, variant: "destructive" });
      }
    }
  };

  return (
    <ClientErrorBoundary>
      <DashboardLayout>
        <div className="p-6 space-y-6">
        {/* Header */}
          <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                  <Briefcase className="h-8 w-8 text-primary" />
                  Assistants
            </h1>
            <p className="text-muted-foreground mt-1">
                  Manage Technical Assistants (TAs) and Personal Assistants (PAs) for executives
            </p>
              </div>
              <Button onClick={() => handleAssignAssistant()} className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Assign Assistant
              </Button>
          </div>
        </div>

          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${typeFilter === "all" ? "ring-2 ring-primary" : ""}`}
              onClick={() => setTypeFilter("all")}
            >
              <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Total Assistants</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${typeFilter === "TA" ? "ring-2 ring-primary" : ""}`}
              onClick={() => setTypeFilter("TA")}
            >
              <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-info/10">
                    <UserCog className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Technical (TA)</p>
                    <p className="text-2xl font-bold">{stats.tas}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${typeFilter === "PA" ? "ring-2 ring-primary" : ""}`}
              onClick={() => setTypeFilter("PA")}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-success/10">
                    <User className="h-5 w-5 text-success" />
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Personal (PA)</p>
                    <p className="text-2xl font-bold">{stats.pas}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
              <CardContent className="p-5">
              <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-warning/10">
                    <Shield className="h-5 w-5 text-warning" />
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Executives</p>
                    <p className="text-2xl font-bold">{stats.executives}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
              <CardContent className="p-5">
              <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-secondary/10">
                    <Briefcase className="h-5 w-5 text-secondary" />
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">With Assistants</p>
                    <p className="text-2xl font-bold">{stats.withAssistants}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

          {/* Main Content */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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

              <div className="flex items-center gap-2">
                <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
                    placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
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
        </div>

            {/* By Executive View */}
            <TabsContent value="executives" className="space-y-4">
              {filteredExecutives.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      {searchQuery ? "No executives match your search" : "No executives found"}
                    </p>
                  </CardContent>
                </Card>
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

            {/* All Assistants View */}
            <TabsContent value="all" className="space-y-4">
            <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">All Assistant Assignments</CardTitle>
                  <CardDescription>
                    View and manage all assistant assignments across executives
                  </CardDescription>
                </CardHeader>
                <CardContent>
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
              </CardContent>
            </Card>
            </TabsContent>
          </Tabs>
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
      </DashboardLayout>
    </ClientErrorBoundary>
  );
};

export default AssistantsManagement;
