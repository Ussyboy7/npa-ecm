"use client";

import { useState, useEffect, useMemo } from "react";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContextualHelp } from "@/components/help/ContextualHelp";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { AdminPageShell } from "@/components/shared/AdminPageShell";
import {
  Building2,
  ChevronRight,
  ChevronDown,
  Plus,
  Edit3,
  Trash2,
  Users,
  Network,
  UserCircle2,
  Search,
  Layers,
  FolderTree,
} from "lucide-react";
import { useOrganization, type Directorate, type Division, type Department } from "@/contexts/OrganizationContext";
import {
  registryQueueStatCardContentClass,
  registryQueueStatIconBoxClass,
  registryQueueStatIconClass,
  registryQueueStatLabelClass,
  registryQueueStatValueClass,
  registryQueueEmptyIconClass,
} from "@/components/shared/registry-queue-styles";
import { DirectorateFormModal } from "@/components/admin/DirectorateFormModal";
import { DirectorateLeadershipDialog } from "@/components/admin/DirectorateLeadershipDialog";
import { DivisionFormModal } from "@/components/admin/DivisionFormModal";
import { DepartmentFormModal } from "@/components/admin/DepartmentFormModal";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";

type EntityType = "directorate" | "division" | "department";
type OrganizationTab = "structure" | "offices" | "memberships";

interface DeactivateTarget {
  type: EntityType;
  id: string;
  name: string;
}

const OrganizationStructurePage = () => {
  const {
    directorates,
    divisions,
    departments,
    offices,
    officeMemberships,
    users,
    isSyncing,
    deleteDirectorate,
    deleteDivision,
    deleteDepartment,
  } = useOrganization();

  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<OrganizationTab>("structure");
  
  // Expanded state for tree nodes
  const [expandedDirectorates, setExpandedDirectorates] = useState<Set<string>>(new Set());
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());
  
  // Modal states
  const [directorateFormOpen, setDirectorateFormOpen] = useState(false);
  const [directorateLeadershipOpen, setDirectorateLeadershipOpen] = useState(false);
  const [divisionFormOpen, setDivisionFormOpen] = useState(false);
  const [departmentFormOpen, setDepartmentFormOpen] = useState(false);
  
  // Selected entities for editing
  const [selectedDirectorate, setSelectedDirectorate] = useState<Directorate | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  
  // For creating new entities with parent context
  const [parentDirectorateId, setParentDirectorateId] = useState<string | null>(null);
  const [parentDivisionId, setParentDivisionId] = useState<string | null>(null);
  
  // Deactivate confirmation
  const [deactivateTarget, setDeactivateTarget] = useState<DeactivateTarget | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Expand all by default for better UX
    setExpandedDirectorates(new Set(directorates.map(d => d.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter logic for search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return {
        directorates: directorates.filter(d => d.isActive),
        matchedDivisions: new Set<string>(),
        matchedDepartments: new Set<string>(),
      };
    }

    const query = searchQuery.toLowerCase();
    const matchedDepartments = new Set<string>();
    const matchedDivisions = new Set<string>();
    const matchedDirectorates = new Set<string>();

    // Find matching departments
    departments.filter(d => d.isActive).forEach(dept => {
      if (dept.name.toLowerCase().includes(query) || dept.code.toLowerCase().includes(query)) {
        matchedDepartments.add(dept.id);
        matchedDivisions.add(dept.divisionId);
      }
    });

    // Find matching divisions
    divisions.filter(d => d.isActive).forEach(div => {
      if (div.name.toLowerCase().includes(query) || div.code.toLowerCase().includes(query)) {
        matchedDivisions.add(div.id);
        matchedDirectorates.add(div.directorateId);
      }
    });

    // Propagate division matches to directorates
    matchedDivisions.forEach(divId => {
      const div = divisions.find(d => d.id === divId);
      if (div) matchedDirectorates.add(div.directorateId);
    });

    // Find matching directorates
    directorates.filter(d => d.isActive).forEach(dir => {
      if (dir.name.toLowerCase().includes(query) || dir.code.toLowerCase().includes(query)) {
        matchedDirectorates.add(dir.id);
      }
    });

    return {
      directorates: directorates.filter(d => d.isActive && matchedDirectorates.has(d.id)),
      matchedDivisions,
      matchedDepartments,
    };
  }, [directorates, divisions, departments, searchQuery]);

  // Auto-expand when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      // Expand all matching directorates and divisions
      const dirsToExpand = new Set<string>();
      const divsToExpand = new Set<string>();
      
      filteredData.matchedDivisions.forEach(divId => {
        const div = divisions.find(d => d.id === divId);
        if (div) {
          dirsToExpand.add(div.directorateId);
          divsToExpand.add(divId);
        }
      });
      
      filteredData.matchedDepartments.forEach(deptId => {
        const dept = departments.find(d => d.id === deptId);
        if (dept) {
          divsToExpand.add(dept.divisionId);
          const div = divisions.find(d => d.id === dept.divisionId);
          if (div) dirsToExpand.add(div.directorateId);
        }
      });
      
      setExpandedDirectorates(dirsToExpand);
      setExpandedDivisions(divsToExpand);
    }
  }, [searchQuery, filteredData, departments, divisions]);

  // Stats
  const stats = useMemo(() => ({
    directorates: directorates.filter(d => d.isActive).length,
    divisions: divisions.filter(d => d.isActive).length,
    departments: departments.filter(d => d.isActive).length,
    withLeadership: directorates.filter(d => d.isActive && d.executiveDirectorId).length,
  }), [directorates, divisions, departments]);

  const filteredOffices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const activeOnly = offices.filter((office) => office.isActive);
    if (!query) return activeOnly;
    return activeOnly.filter((office) =>
      office.name.toLowerCase().includes(query) ||
      office.code.toLowerCase().includes(query) ||
      office.officeType.toLowerCase().includes(query),
    );
  }, [offices, searchQuery]);

  const filteredMemberships = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const activeOnly = officeMemberships.filter((membership) => membership.isActive);
    if (!query) return activeOnly;
    return activeOnly.filter((membership) => {
      const officeName = offices.find((office) => office.id === membership.officeId)?.name ?? membership.officeName ?? "";
      const userName = users.find((user) => user.id === membership.userId)?.name ?? "";
      return (
        officeName.toLowerCase().includes(query) ||
        userName.toLowerCase().includes(query) ||
        membership.assignmentRole.toLowerCase().includes(query)
      );
    });
  }, [officeMemberships, offices, users, searchQuery]);

  // Helper functions
  const getExecutive = (directorateId: string) => {
    const dir = directorates.find(d => d.id === directorateId);
    if (!dir?.executiveDirectorId) return null;
    return users.find(u => u.id === dir.executiveDirectorId);
  };

  const getGM = (divisionId: string) => {
    const div = divisions.find(d => d.id === divisionId);
    if (!div?.generalManagerId) return null;
    return users.find(u => u.id === div.generalManagerId);
  };

  const getAGM = (departmentId: string) => {
    const dept = departments.find(d => d.id === departmentId);
    if (!dept?.assistantGeneralManagerId) return null;
    return users.find(u => u.id === dept.assistantGeneralManagerId);
  };

  // Toggle expand functions
  const toggleDirectorate = (id: string) => {
    setExpandedDirectorates(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDivision = (id: string) => {
    setExpandedDivisions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Action handlers
  const handleCreateDirectorate = () => {
    setSelectedDirectorate(null);
    setDirectorateFormOpen(true);
  };

  const handleEditDirectorate = (directorate: Directorate) => {
    setSelectedDirectorate(directorate);
    setDirectorateFormOpen(true);
  };

  const handleAssignLeader = (directorate: Directorate) => {
    setSelectedDirectorate(directorate);
    setDirectorateLeadershipOpen(true);
  };

  const handleCreateDivision = (directorateId: string) => {
    setSelectedDivision(null);
    setParentDirectorateId(directorateId);
    setDivisionFormOpen(true);
  };

  const handleEditDivision = (division: Division) => {
    setSelectedDivision(division);
    setParentDirectorateId(division.directorateId);
    setDivisionFormOpen(true);
  };

  const handleCreateDepartment = (divisionId: string) => {
    setSelectedDepartment(null);
    setParentDivisionId(divisionId);
    setDepartmentFormOpen(true);
  };

  const handleEditDepartment = (department: Department) => {
    setSelectedDepartment(department);
    setParentDivisionId(department.divisionId);
    setDepartmentFormOpen(true);
  };

  const handleDeactivate = (type: EntityType, id: string, name: string) => {
    setDeactivateTarget({ type, id, name });
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget || isProcessing) return;

    setIsProcessing(true);
    try {
      switch (deactivateTarget.type) {
        case "directorate":
          await deleteDirectorate(deactivateTarget.id);
          break;
        case "division":
          await deleteDivision(deactivateTarget.id);
          break;
        case "department":
          await deleteDepartment(deactivateTarget.id);
          break;
      }
      toast({ title: "Success", description: `${deactivateTarget.name} deactivated successfully` });
      setDeactivateTarget(null);
      } catch (error: unknown) {
      const description = error instanceof Error ? error.message : "Unable to deactivate";
      toast({ title: "Request failed", description, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const expandAll = () => {
    setExpandedDirectorates(new Set(directorates.filter(d => d.isActive).map(d => d.id)));
    setExpandedDivisions(new Set(divisions.filter(d => d.isActive).map(d => d.id)));
  };

  const collapseAll = () => {
    setExpandedDirectorates(new Set());
    setExpandedDivisions(new Set());
  };

  const isBootstrapping =
    isSyncing &&
    directorates.length === 0 &&
    divisions.length === 0 &&
    departments.length === 0 &&
    offices.length === 0 &&
    officeMemberships.length === 0;

  const searchPlaceholder = useMemo(() => {
    if (activeTab === "offices") return "Search offices by name, code, or type...";
    if (activeTab === "memberships") return "Search memberships by office, user, or role...";
    return "Search directorates, divisions, or departments...";
  }, [activeTab]);

  const tabSubtitle = useMemo(() => {
    if (activeTab === "offices") {
      return "Office records route correspondence to the right teams. Add or edit offices from registry workflows.";
    }
    if (activeTab === "memberships") {
      return "Link users to offices with register, route, and approve permissions.";
    }
    return "Build the hierarchy from directorates down to departments, then assign leadership.";
  }, [activeTab]);

  const orgStatCards = [
    { label: "Directorates", value: stats.directorates, icon: Building2, bgClass: "bg-primary/10", iconClass: "text-primary" },
    { label: "Divisions", value: stats.divisions, icon: Network, bgClass: "bg-emerald-500/10", iconClass: "text-emerald-600 dark:text-emerald-400" },
    { label: "Departments", value: stats.departments, icon: Layers, bgClass: "bg-blue-500/10", iconClass: "text-blue-600 dark:text-blue-400" },
    { label: "With Leadership", value: stats.withLeadership, icon: UserCircle2, bgClass: "bg-amber-500/10", iconClass: "text-amber-600 dark:text-amber-400" },
  ] as const;

  return (
    <ClientErrorBoundary>
      <>
        {isBootstrapping ? (
          <div className="container mx-auto p-6">
            <LoadingState message="Loading organization & offices…" />
          </div>
        ) : (
        <AdminPageShell
          title="Organization & Offices"
          subtitle={tabSubtitle}
          icon={FolderTree}
          actions={
            <>
              <Button onClick={handleCreateDirectorate} className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Add Directorate
              </Button>
              <ContextualHelp
                title="Organization Structure"
                description="Manage the organization hierarchy from directorate down to department."
                steps={[
                  "Expand directorates to see divisions and departments.",
                  "Use inline actions to add, edit, or deactivate units.",
                  "Keep leadership assignments current as structures change.",
                ]}
              />
            </>
          }
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {orgStatCards.map(({ label, value, icon: Icon, bgClass, iconClass }) => (
              <Card key={label}>
                <CardContent className={registryQueueStatCardContentClass}>
                  <div className="flex items-center gap-4">
                    <div className={cn(registryQueueStatIconBoxClass, bgClass)}>
                      <Icon className={cn(registryQueueStatIconClass, iconClass)} />
                    </div>
                    <div>
                      <p className={registryQueueStatLabelClass}>{label}</p>
                      <p className={registryQueueStatValueClass}>{value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="flex flex-wrap items-center gap-2 p-2">
              <div className="relative min-w-[200px] flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>
              {activeTab === "structure" ? (
                <>
                  <Button variant="outline" size="sm" onClick={expandAll} className="h-8 text-xs">
                    Expand All
                  </Button>
                  <Button variant="outline" size="sm" onClick={collapseAll} className="h-8 text-xs">
                    Collapse All
                  </Button>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as OrganizationTab)}>
            <TabsList>
              <TabsTrigger value="structure" className="text-xs px-2.5 py-1">Structure</TabsTrigger>
              <TabsTrigger value="offices" className="text-xs px-2.5 py-1">Offices</TabsTrigger>
              <TabsTrigger value="memberships" className="text-xs px-2.5 py-1">Memberships</TabsTrigger>
            </TabsList>

            <TabsContent value="structure" className="mt-6 focus-visible:outline-none">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-primary" />
                Organization Hierarchy
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!mounted ? (
                <div className="py-8 text-center text-muted-foreground">Loading...</div>
              ) : filteredData.directorates.length === 0 ? (
                <div className="py-12 text-center">
                  <FolderTree className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    {searchQuery ? "No results match your search" : "No directorates found"}
                  </p>
                </div>
              ) : (
                  <div className="space-y-2">
                    {filteredData.directorates.map((directorate) => {
                      const isExpanded = expandedDirectorates.has(directorate.id);
                      const dirDivisions = divisions.filter(
                        d => d.directorateId === directorate.id && d.isActive
                      );
                      const executive = getExecutive(directorate.id);
                      const divisionCount = dirDivisions.length;
                      const deptCount = dirDivisions.reduce((acc, div) => {
                        return acc + departments.filter(d => d.divisionId === div.id && d.isActive).length;
                      }, 0);

                      return (
                        <div key={directorate.id} className="border border-border rounded-lg">
                          {/* Directorate Row */}
                          <div
                            className={cn(
                              "flex items-center gap-2 p-3 hover:bg-muted/50 transition-colors",
                              isExpanded && "border-b border-border"
                            )}
                          >
                            <button
                              onClick={() => toggleDirectorate(directorate.id)}
                              className="p-1 hover:bg-muted rounded"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                            
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{directorate.name}</span>
                                <Badge variant="outline" className="text-xs">{directorate.code}</Badge>
                                <Badge variant="secondary" className="text-xs">{divisionCount} div</Badge>
                                <Badge variant="outline" className="text-xs">{deptCount} dept</Badge>
                              </div>
                              {executive && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  ED: {executive.name}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleCreateDivision(directorate.id)}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Add Division</TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleAssignLeader(directorate)}
                                  >
                                    <Users className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Assign Leader</TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleEditDirectorate(directorate)}
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => handleDeactivate("directorate", directorate.id, directorate.name)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Deactivate</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>

                          {/* Divisions */}
                          {isExpanded && dirDivisions.length > 0 && (
                            <div className="pl-8 py-2 space-y-1 bg-muted/20">
                              {dirDivisions.map((division) => {
                                const isDivExpanded = expandedDivisions.has(division.id);
                                const divDepts = departments.filter(
                                  d => d.divisionId === division.id && d.isActive
                                );
                                const gm = getGM(division.id);

                                return (
                                  <div key={division.id} className="border border-border/50 rounded-lg bg-background mx-2">
                                    {/* Division Row */}
                                    <div
                                      className={cn(
                                        "flex items-center gap-2 p-2 hover:bg-muted/50 transition-colors",
                                        isDivExpanded && divDepts.length > 0 && "border-b border-border/50"
                                      )}
                                    >
                                      <button
                                        onClick={() => toggleDivision(division.id)}
                                        className="p-1 hover:bg-muted rounded"
                                        disabled={divDepts.length === 0}
                                      >
                                        {divDepts.length === 0 ? (
                                          <span className="w-4 h-4 block" />
                                        ) : isDivExpanded ? (
                                          <ChevronDown className="h-4 w-4" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4" />
                                        )}
                                      </button>
                                      
                                      <div className="p-1.5 rounded bg-success/10">
                                        <Network className="h-3.5 w-3.5 text-success" />
                                      </div>
                                      
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-sm">{division.name}</span>
                                          <Badge variant="outline" className="text-xs">{division.code}</Badge>
                                          <Badge variant="secondary" className="text-xs">{divDepts.length} dept</Badge>
                                        </div>
                                        {gm && (
                                          <p className="text-xs text-muted-foreground">GM: {gm.name}</p>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-1">
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7"
                                              onClick={() => handleCreateDepartment(division.id)}
                                            >
                                              <Plus className="h-3.5 w-3.5" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Add Department</TooltipContent>
                                        </Tooltip>
                                        
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7"
                                              onClick={() => handleEditDivision(division)}
                                            >
                                              <Edit3 className="h-3.5 w-3.5" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Edit</TooltipContent>
                                        </Tooltip>
                                        
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 text-destructive hover:text-destructive"
                                              onClick={() => handleDeactivate("division", division.id, division.name)}
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Deactivate</TooltipContent>
                                        </Tooltip>
                                      </div>
                                    </div>

                                    {/* Departments */}
                                    {isDivExpanded && divDepts.length > 0 && (
                                      <div className="pl-8 py-2 space-y-1 bg-muted/10">
                                        {divDepts.map((department) => {
                                          const agm = getAGM(department.id);

                                          return (
                                            <div
                                              key={department.id}
                                              className="flex items-center gap-2 p-2 mx-2 border border-border/30 rounded bg-background hover:bg-muted/50 transition-colors"
                                            >
                                              <div className="p-1.5 rounded bg-info/10">
                                                <Layers className="h-3 w-3 text-info" />
                                              </div>
                                              
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-sm">{department.name}</span>
                                                  <Badge variant="outline" className="text-xs">{department.code}</Badge>
                                                </div>
                                                {agm && (
                                                  <p className="text-xs text-muted-foreground">AGM: {agm.name}</p>
                                                )}
                                              </div>

                                              <div className="flex items-center gap-1">
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      className="h-6 w-6"
                                                      onClick={() => handleEditDepartment(department)}
                                                    >
                                                      <Edit3 className="h-3 w-3" />
                                                    </Button>
                                                  </TooltipTrigger>
                                                  <TooltipContent>Edit</TooltipContent>
                                                </Tooltip>
                                                
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      className="h-6 w-6 text-destructive hover:text-destructive"
                                                      onClick={() => handleDeactivate("department", department.id, department.name)}
                                                    >
                                                      <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                  </TooltipTrigger>
                                                  <TooltipContent>Deactivate</TooltipContent>
                                                </Tooltip>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Empty state for no divisions */}
                          {isExpanded && dirDivisions.length === 0 && (
                            <div className="pl-12 py-4 text-sm text-muted-foreground bg-muted/20">
                              No divisions yet.{" "}
                              <button
                                onClick={() => handleCreateDivision(directorate.id)}
                                className="text-primary hover:underline"
                              >
                                Add the first division
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
              )}
            </CardContent>
          </Card>
            </TabsContent>

            <TabsContent value="offices" className="mt-6 focus-visible:outline-none">
              <Card>
                <CardContent className="pt-6">
                  {filteredOffices.length === 0 ? (
                    <EmptyState
                      icon={<Building2 className={registryQueueEmptyIconClass} />}
                      title={searchQuery.trim() ? "No offices match your search" : "No offices configured yet"}
                      message={
                        searchQuery.trim()
                          ? "Try a different name, code, or office type. Clear search to see all offices."
                          : "Offices connect users to correspondence routing. Create offices from the registry or ask your administrator to add them here."
                      }
                      actionLabel={searchQuery.trim() ? "Clear search" : undefined}
                      onAction={searchQuery.trim() ? () => setSearchQuery("") : undefined}
                      variant="dashed"
                    />
                  ) : (
                    <div className="space-y-2">
                      {filteredOffices.map((office) => (
                        <div key={office.id} className="rounded-lg border border-border p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{office.name}</span>
                            <Badge variant="outline" className="text-xs">{office.code}</Badge>
                            <Badge variant="secondary" className="text-xs">{office.officeType}</Badge>
                          </div>
                          {office.description ? (
                            <p className="mt-1 text-xs text-muted-foreground">{office.description}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="memberships" className="mt-6 focus-visible:outline-none">
              <Card>
                <CardContent className="pt-6">
                  {filteredMemberships.length === 0 ? (
                    <EmptyState
                      icon={<Users className={registryQueueEmptyIconClass} />}
                      title={searchQuery.trim() ? "No memberships match your search" : "No office memberships yet"}
                      message={
                        searchQuery.trim()
                          ? "Try a different office name, user, or assignment role."
                          : "Memberships grant users access to an office inbox. Assign members when onboarding staff to a registry office."
                      }
                      actionLabel={searchQuery.trim() ? "Clear search" : undefined}
                      onAction={searchQuery.trim() ? () => setSearchQuery("") : undefined}
                      variant="dashed"
                    />
                  ) : (
                    <div className="space-y-2">
                      {filteredMemberships.map((membership) => {
                        const officeName = offices.find((office) => office.id === membership.officeId)?.name ?? membership.officeName ?? "Unknown office";
                        const userName = users.find((user) => user.id === membership.userId)?.name ?? "Unknown user";
                        return (
                          <div key={membership.id} className="rounded-lg border border-border p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{userName}</span>
                              <Badge variant="outline" className="text-xs">{officeName}</Badge>
                              <Badge variant="secondary" className="text-xs">{membership.assignmentRole}</Badge>
                              {membership.isPrimary ? <Badge className="text-xs">Primary</Badge> : null}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Permissions: {membership.canRegister ? "Register " : ""}{membership.canRoute ? "Route " : ""}{membership.canApprove ? "Approve" : ""}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </AdminPageShell>
        )}

        {/* Modals */}
        <DirectorateFormModal
          open={directorateFormOpen}
          onOpenChange={(open) => {
            setDirectorateFormOpen(open);
            if (!open) setSelectedDirectorate(null);
          }}
          directorate={selectedDirectorate ?? undefined}
        />

        <DirectorateLeadershipDialog
          open={directorateLeadershipOpen}
          onOpenChange={(open) => {
            setDirectorateLeadershipOpen(open);
            if (!open) setSelectedDirectorate(null);
          }}
          directorate={selectedDirectorate}
        />

        <DivisionFormModal
          open={divisionFormOpen}
          onOpenChange={(open) => {
            setDivisionFormOpen(open);
            if (!open) {
              setSelectedDivision(null);
              setParentDirectorateId(null);
            }
          }}
          division={selectedDivision ?? undefined}
          defaultDirectorateId={parentDirectorateId || undefined}
        />

        <DepartmentFormModal
          open={departmentFormOpen}
          onOpenChange={(open) => {
            setDepartmentFormOpen(open);
            if (!open) {
              setSelectedDepartment(null);
              setParentDivisionId(null);
            }
          }}
          department={selectedDepartment ?? undefined}
          defaultDivisionId={parentDivisionId || undefined}
        />

        {/* Deactivate Confirmation */}
        <AlertDialog open={deactivateTarget !== null} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate {deactivateTarget?.type}</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to deactivate "{deactivateTarget?.name}"? This will hide it from active lists but won't delete any data.
                {deactivateTarget?.type === "directorate" && (
                  <span className="block mt-2 text-warning">
                    Warning: This will also affect all divisions and departments under this directorate.
                  </span>
                )}
                {deactivateTarget?.type === "division" && (
                  <span className="block mt-2 text-warning">
                    Warning: This will also affect all departments under this division.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeactivate}
                disabled={isProcessing}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isProcessing ? "Deactivating…" : "Deactivate"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    </ClientErrorBoundary>
  );
};

export default OrganizationStructurePage;

