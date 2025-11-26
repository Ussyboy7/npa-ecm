"use client";

import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown, Building2, Network, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { cn } from "@/lib/utils";

interface OrganizationHierarchyTreeProps {
  onSelect?: (type: "directorate" | "division" | "department" | "office", id: string) => void;
  selectedIds?: {
    directorate?: string;
    division?: string;
    department?: string;
    office?: string;
  };
  className?: string;
}

export function OrganizationHierarchyTree({
  onSelect,
  selectedIds,
  className,
}: OrganizationHierarchyTreeProps) {
  const { directorates, divisions, departments, offices } = useOrganization();
  const [expandedDirectorates, setExpandedDirectorates] = useState<Set<string>>(new Set());
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const activeDirectorates = useMemo(() => {
    return directorates.filter((dir) => dir.isActive).sort((a, b) => a.name.localeCompare(b.name));
  }, [directorates]);

  const toggleDirectorate = (dirId: string) => {
    const newExpanded = new Set(expandedDirectorates);
    if (newExpanded.has(dirId)) {
      newExpanded.delete(dirId);
    } else {
      newExpanded.add(dirId);
    }
    setExpandedDirectorates(newExpanded);
  };

  const toggleDivision = (divId: string) => {
    const newExpanded = new Set(expandedDivisions);
    if (newExpanded.has(divId)) {
      newExpanded.delete(divId);
    } else {
      newExpanded.add(divId);
    }
    setExpandedDivisions(newExpanded);
  };

  const getDivisionsForDirectorate = (dirId: string) => {
    return divisions
      .filter((div) => div.directorateId === dirId && div.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const getDepartmentsForDivision = (divId: string) => {
    return departments
      .filter((dept) => dept.divisionId === divId && dept.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const getOfficesForDepartment = (deptId: string) => {
    return offices
      .filter((office) => office.departmentId === deptId && office.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const filteredDirectorates = useMemo(() => {
    if (!searchQuery.trim()) return activeDirectorates;
    const query = searchQuery.toLowerCase();
    return activeDirectorates.filter(
      (dir) =>
        dir.name.toLowerCase().includes(query) ||
        dir.code.toLowerCase().includes(query)
    );
  }, [activeDirectorates, searchQuery]);

  return (
    <div className={cn("border rounded-lg p-4 bg-background", className)}>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hierarchy..."
            className="pl-8"
          />
        </div>

        <div className="space-y-1 max-h-[600px] overflow-y-auto">
          {filteredDirectorates.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4 text-center">
              No directorates found
            </div>
          ) : (
            filteredDirectorates.map((directorate) => {
              const isExpanded = expandedDirectorates.has(directorate.id);
              const isSelected = selectedIds?.directorate === directorate.id;
              const dirDivisions = getDivisionsForDirectorate(directorate.id);

              return (
                <div key={directorate.id} className="space-y-1">
                  <div
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer",
                      isSelected && "bg-primary/10 border border-primary"
                    )}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => toggleDirectorate(directorate.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    <Network className="h-4 w-4 text-primary" />
                    <span
                      className="flex-1 text-sm font-medium"
                      onClick={() => onSelect?.("directorate", directorate.id)}
                    >
                      {directorate.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{directorate.code}</span>
                  </div>

                  {isExpanded && (
                    <div className="ml-6 space-y-1">
                      {dirDivisions.map((division) => {
                        const isDivExpanded = expandedDivisions.has(division.id);
                        const isDivSelected = selectedIds?.division === division.id;
                        const divDepartments = getDepartmentsForDivision(division.id);

                        return (
                          <div key={division.id} className="space-y-1">
                            <div
                              className={cn(
                                "flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer",
                                isDivSelected && "bg-primary/10 border border-primary"
                              )}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => toggleDivision(division.id)}
                              >
                                {isDivExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                              <Building2 className="h-4 w-4 text-info" />
                              <span
                                className="flex-1 text-sm"
                                onClick={() => onSelect?.("division", division.id)}
                              >
                                {division.name}
                              </span>
                              <span className="text-xs text-muted-foreground">{division.code}</span>
                            </div>

                            {isDivExpanded && (
                              <div className="ml-6 space-y-1">
                                {divDepartments.map((department) => {
                                  const isDeptSelected = selectedIds?.department === department.id;
                                  const deptOffices = getOfficesForDepartment(department.id);

                                  return (
                                    <div key={department.id} className="space-y-1">
                                      <div
                                        className={cn(
                                          "flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer",
                                          isDeptSelected && "bg-primary/10 border border-primary"
                                        )}
                                        onClick={() => onSelect?.("department", department.id)}
                                      >
                                        <Users className="h-4 w-4 text-success" />
                                        <span className="flex-1 text-sm">{department.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {department.code}
                                        </span>
                                      </div>

                                      {deptOffices.length > 0 && (
                                        <div className="ml-6 space-y-1">
                                          {deptOffices.map((office) => {
                                            const isOfficeSelected = selectedIds?.office === office.id;
                                            return (
                                              <div
                                                key={office.id}
                                                className={cn(
                                                  "flex items-center gap-2 p-1.5 rounded-md hover:bg-muted cursor-pointer text-xs",
                                                  isOfficeSelected && "bg-primary/10 border border-primary"
                                                )}
                                                onClick={() => onSelect?.("office", office.id)}
                                              >
                                                <span className="flex-1">{office.name}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase">
                                                  {office.officeType}
                                                </span>
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
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

