"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganization } from "@/contexts/OrganizationContext";

interface HierarchySelectorProps {
  directorateId?: string | null;
  divisionId?: string | null;
  departmentId?: string | null;
  onDirectorateChange?: (directorateId: string | null) => void;
  onDivisionChange?: (divisionId: string | null) => void;
  onDepartmentChange?: (departmentId: string | null) => void;
  disabled?: boolean;
}

export function HierarchySelector({
  directorateId,
  divisionId,
  departmentId,
  onDirectorateChange,
  onDivisionChange,
  onDepartmentChange,
  disabled = false,
}: HierarchySelectorProps) {
  const { directorates, divisions, departments } = useOrganization();

  const availableDivisions = useMemo(() => {
    if (!directorateId) return [];
    return divisions.filter((div) => div.directorateId === directorateId && div.isActive);
  }, [directorates, divisions, directorateId]);

  const availableDepartments = useMemo(() => {
    if (!divisionId) return [];
    return departments.filter((dept) => dept.divisionId === divisionId && dept.isActive);
  }, [departments, divisionId]);

  const activeDirectorates = useMemo(() => {
    return directorates.filter((dir) => dir.isActive);
  }, [directorates]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Directorate</Label>
        <Select
          value={directorateId || undefined}
          onValueChange={(value) => {
            onDirectorateChange?.(value || null);
            // Clear division and department when directorate changes
            onDivisionChange?.(null);
            onDepartmentChange?.(null);
          }}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select directorate" />
          </SelectTrigger>
          <SelectContent>
            {activeDirectorates.map((dir) => (
              <SelectItem key={dir.id} value={dir.id}>
                {dir.name} ({dir.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {directorateId && (
        <div className="space-y-2">
          <Label>Division</Label>
          <Select
            value={divisionId || undefined}
            onValueChange={(value) => {
              onDivisionChange?.(value || null);
              // Clear department when division changes
              onDepartmentChange?.(null);
            }}
            disabled={disabled || !directorateId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select division" />
            </SelectTrigger>
            <SelectContent>
              {availableDivisions.map((div) => (
                <SelectItem key={div.id} value={div.id}>
                  {div.name} ({div.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {divisionId && (
        <div className="space-y-2">
          <Label>Department</Label>
          <Select
            value={departmentId || undefined}
            onValueChange={(value) => onDepartmentChange?.(value || null)}
            disabled={disabled || !divisionId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {availableDepartments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

