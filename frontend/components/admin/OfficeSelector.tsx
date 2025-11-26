"use client";

import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";

interface OfficeSelectorProps {
  officeId?: string | null;
  onOfficeChange?: (officeId: string | null) => void;
  disabled?: boolean;
  filterByOfficeType?: string[];
}

export function OfficeSelector({
  officeId,
  onOfficeChange,
  disabled = false,
  filterByOfficeType,
}: OfficeSelectorProps) {
  const { offices, directorates, divisions, departments } = useOrganization();
  const [searchQuery, setSearchQuery] = useState("");
  const [officeTypeFilter, setOfficeTypeFilter] = useState<string>("");

  const availableOffices = useMemo(() => {
    let filtered = offices.filter((office) => office.isActive);

    // Filter by office type if specified
    if (filterByOfficeType && filterByOfficeType.length > 0) {
      filtered = filtered.filter((office) => filterByOfficeType.includes(office.officeType));
    }

    // Filter by selected office type filter
    if (officeTypeFilter && officeTypeFilter !== "__all__") {
      filtered = filtered.filter((office) => office.officeType === officeTypeFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (office) =>
          office.name.toLowerCase().includes(query) ||
          office.code.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [offices, searchQuery, officeTypeFilter, filterByOfficeType]);

  const selectedOffice = useMemo(() => {
    return offices.find((o) => o.id === officeId);
  }, [offices, officeId]);

  const getOfficeHierarchy = (office: typeof offices[0]) => {
    const parts: string[] = [];
    if (office.directorateId) {
      const dir = directorates.find((d) => d.id === office.directorateId);
      if (dir) parts.push(dir.name);
    }
    if (office.divisionId) {
      const div = divisions.find((d) => d.id === office.divisionId);
      if (div) parts.push(div.name);
    }
    if (office.departmentId) {
      const dept = departments.find((d) => d.id === office.departmentId);
      if (dept) parts.push(dept.name);
    }
    return parts.join(" › ");
  };

  const officeTypes = useMemo(() => {
    const types = new Set(offices.map((o) => o.officeType));
    return Array.from(types).sort();
  }, [offices]);

  return (
    <div className="space-y-2">
      <Label>Office</Label>
      <Select
        value={officeId || undefined}
        onValueChange={(value) => onOfficeChange?.(value || null)}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select office">
            {selectedOffice && (
              <div className="flex flex-col">
                <span className="font-medium">{selectedOffice.name}</span>
                <span className="text-xs text-muted-foreground uppercase">
                  {selectedOffice.officeType}
                </span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[400px]">
          {/* Search and filter controls */}
          <div className="sticky top-0 z-10 bg-popover p-2 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search offices..."
                className="pl-8 h-9"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
            <Select
              value={officeTypeFilter || "__all__"}
              onValueChange={(value) => setOfficeTypeFilter(value === "__all__" ? "" : value)}
              onOpenChange={() => {}}
            >
              <SelectTrigger className="h-9" onClick={(e) => e.stopPropagation()}>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent onClick={(e) => e.stopPropagation()}>
                <SelectItem value="__all__">All Types</SelectItem>
                {officeTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {availableOffices.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No offices match your search.
            </div>
          ) : (
            availableOffices.map((office) => {
              const hierarchy = getOfficeHierarchy(office);
              return (
                <SelectItem key={office.id} value={office.id}>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{office.name}</span>
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {office.officeType}
                      {hierarchy && ` • ${hierarchy}`}
                    </span>
                  </div>
                </SelectItem>
              );
            })
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

