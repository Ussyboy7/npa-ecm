"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDirectoratesSearch, useDivisionsSearch, useDepartmentsSearch } from "@/hooks/use-org-search";

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
  const { items: directorates, loading: loadingDirectorates } = useDirectoratesSearch({ enabled: true });
  const { items: divisions, loading: loadingDivisions } = useDivisionsSearch({
    directorateId: directorateId ?? undefined,
    enabled: Boolean(directorateId),
  });
  const { items: departments, loading: loadingDepartments } = useDepartmentsSearch({
    divisionId: divisionId ?? undefined,
    enabled: Boolean(divisionId),
  });

  const activeDirectorates = directorates.filter((dir) => dir.isActive);

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
            {loadingDirectorates ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
            ) : (
            activeDirectorates.map((dir) => (
              <SelectItem key={dir.id} value={dir.id}>
                {dir.name} ({dir.code})
              </SelectItem>
            ))
            )}
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
            {loadingDivisions ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
            ) : (
            divisions.filter((div) => div.isActive).map((div) => (
                <SelectItem key={div.id} value={div.id}>
                  {div.name} ({div.code})
              </SelectItem>
            ))
            )}
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
            {loadingDepartments ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
            ) : (
            departments.filter((dept) => dept.isActive).map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
              </SelectItem>
            ))
            )}
          </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

