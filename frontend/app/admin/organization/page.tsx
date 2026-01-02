"use client";

import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { HelpGuideCard } from "@/components/help/HelpGuideCard";
import { ContextualHelp } from "@/components/help/ContextualHelp";
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
import { useOrganization } from "@/contexts/OrganizationContext";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type EntityType = "directorate" | "division" | "department";

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
    users,
    deleteDirectorate,
    deleteDivision,
    deleteDepartment,
  } = useOrganization();

  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Expanded state for tree nodes
  const [expandedDirectorates, setExpandedDirectorates] = useState<Set<string>>(new Set());
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());
  
  // Modal states
  const [directorateFormOpen, setDirectorateFormOpen] = useState(false);
  const [directorateLeadershipOpen, setDirectorateLeadershipOpen] = useState(false);
  const [divisionFormOpen, setDivisionFormOpen] = useState(false);
  const [departmentFormOpen, setDepartmentFormOpen] = useState(false);
  
  // Selected entities for editing
  const [selectedDirectorate, setSelectedDirectorate] = useState<Record<string, unknown> | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<Record<string, unknown> | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<Record<string, unknown> | null>(null);
  
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
  }, [searchQuery, filteredData]);

  // Stats
  const stats = useMemo(() => ({
    directorates: directorates.filter(d => d.isActive).length,
    divisions: divisions.filter(d => d.isActive).length,
    departments: departments.filter(d => d.isActive).length,
    withLeadership: directorates.filter(d => d.isActive && d.executiveDirectorId).length,
  }), [directorates, divisions, departments]);

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

  const handleEditDirectorate = (directorate: Record<string, unknown>) => {
    setSelectedDirectorate(directorate);
    setDirectorateFormOpen(true);
  };

  const handleAssignLeader = (directorate: Record<string, unknown>) => {
    setSelectedDirectorate(directorate);
    setDirectorateLeadershipOpen(true);
  };

  const handleCreateDivision = (directorateId: string) => {
    setSelectedDivision(null);
    setParentDirectorateId(directorateId);
    setDivisionFormOpen(true);
  };

  const handleEditDivision = (division: Record<string, unknown>) => {
    setSelectedDivision(division);
    setParentDirectorateId(typeof division.directorateId === 'string' ? division.directorateId : null);
    setDivisionFormOpen(true);
  };

  const handleCreateDepartment = (divisionId: string) => {
    setSelectedDepartment(null);
    setParentDivisionId(divisionId);
    setDepartmentFormOpen(true);
  };

  const handleEditDepartment = (department: Record<string, unknown>) => {
    setSelectedDepartment(department);
    setParentDivisionId(typeof department.divisionId === 'string' ? department.divisionId : null);
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
    } catch (error) {
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

  return (
    <ClientErrorBoundary>
      <DashboardLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <FolderTree className="h-8 w-8 text-primary" />
                Organization Structure
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage directorates, divisions, and departments in a unified tree view
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleCreateDirectorate} className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Add Directorate
              </Button>
              <ContextualHelp
                title="Organization Structure"
                description="View and manage your entire organizational hierarchy in one place. Expand nodes to see child units, and use inline actions to edit or add new entries."
                steps={[
                  "Click on a directorate to expand and see its divisions",
                  "Click on a division to see its departments",
                  "Use the action buttons to edit, add children, or deactivate units",
                ]}
              />
            </div>
          </div>

          <HelpGuideCard
            title="Unified Organization Management"
            description="This tree view consolidates Directorates, Divisions, and Departments into a single interface. Expand/collapse nodes, search across all levels, and manage leadership assignments."
            links={[
              { label: "User Management", href: "/admin/users-roles?tab=users" },
              { label: "Help & Guides", href: "/help" },
            ]}
          />

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Directorates</p>
                  <p className="text-2xl font-bold">{stats.directorates}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-success/10">
                  <Network className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Divisions</p>
                  <p className="text-2xl font-bold">{stats.divisions}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-info/10">
                  <Layers className="h-6 w-6 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Departments</p>
                  <p className="text-2xl font-bold">{stats.departments}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-warning/10">
                  <UserCircle2 className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">With Leadership</p>
                  <p className="text-2xl font-bold">{stats.withLeadership}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search & Controls */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search directorates, divisions, or departments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
          </div>

          {/* Tree View */}
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
                                    onClick={() => handleAssignLeader(directorate as Record<string, unknown>)}
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
                                    onClick={() => handleEditDirectorate(directorate as Record<string, unknown>)}
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
        </div>

        {/* Modals */}
        <DirectorateFormModal
          open={directorateFormOpen}
          onOpenChange={(open) => {
            setDirectorateFormOpen(open);
            if (!open) setSelectedDirectorate(null);
          }}
          directorate={selectedDirectorate || undefined}
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
          division={selectedDivision}
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
          department={selectedDepartment}
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
      </DashboardLayout>
    </ClientErrorBoundary>
  );
};

export default OrganizationStructurePage;

