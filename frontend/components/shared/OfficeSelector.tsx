/**
 * Shared OfficeSelector component
 * Reusable office selection with search and filtering
 */

import { useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Search, ChevronDown, Check, X } from 'lucide-react';
import type { Office, Directorate, Division, Department } from '@/lib/npa-structure';
import { useOrganization } from '@/contexts/OrganizationContext';
import { cn } from '@/lib/utils';

interface OfficeSelectorProps {
  offices: Office[];
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  showKeepCurrent?: boolean;
  currentOfficeName?: string;
  keepCurrentLabel?: string;
  maxHeight?: string;
  disabled?: boolean;
  showSearch?: boolean;
  showFilters?: boolean;
  'aria-label'?: string;
  'aria-required'?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

export const OfficeSelector = ({
  offices,
  value,
  onValueChange,
  label,
  placeholder = 'Select office',
  required = false,
  error,
  showKeepCurrent = false,
  currentOfficeName,
  keepCurrentLabel,
  maxHeight = '320px',
  disabled = false,
  showSearch = true,
  showFilters = true,
  'aria-label': ariaLabel,
  'aria-required': ariaRequired,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: OfficeSelectorProps) => {
  const { directorates, divisions, departments } = useOrganization();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDirectorate, setFilterDirectorate] = useState<string>('all');
  const [filterDivision, setFilterDivision] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');

  // Get filtered divisions based on selected directorate
  const filteredDivisions = useMemo(() => {
    if (filterDirectorate === 'all') return divisions;
    return divisions.filter(d => d.directorateId === filterDirectorate);
  }, [divisions, filterDirectorate]);

  // Get filtered departments based on selected division
  const filteredDepartments = useMemo(() => {
    if (filterDivision === 'all') return departments;
    return departments.filter(d => d.divisionId === filterDivision);
  }, [departments, filterDivision]);

  // Filter and sort offices
  const filteredOffices = useMemo(() => {
    let result = [...offices];

    // Filter by directorate
    if (filterDirectorate !== 'all') {
      result = result.filter(o => o.directorateId === filterDirectorate);
    }

    // Filter by division
    if (filterDivision !== 'all') {
      result = result.filter(o => o.divisionId === filterDivision);
    }

    // Filter by department
    if (filterDepartment !== 'all') {
      result = result.filter(o => o.departmentId === filterDepartment);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(o =>
        o.name.toLowerCase().includes(query) ||
        o.code?.toLowerCase().includes(query) ||
        o.officeType?.toLowerCase().includes(query)
      );
    }

    // Sort alphabetically
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [offices, filterDirectorate, filterDivision, filterDepartment, searchQuery]);

  // Get selected office details
  const selectedOffice = offices.find(o => o.id === value);

  // Reset dependent filters when parent changes
  const handleDirectorateChange = (val: string) => {
    setFilterDirectorate(val);
    setFilterDivision('all');
    setFilterDepartment('all');
  };

  const handleDivisionChange = (val: string) => {
    setFilterDivision(val);
    setFilterDepartment('all');
  };

  const handleSelect = (officeId: string) => {
    onValueChange(officeId);
    setOpen(false);
  };

  const handleKeepCurrent = () => {
    onValueChange('');
    setOpen(false);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterDirectorate('all');
    setFilterDivision('all');
    setFilterDepartment('all');
  };

  const hasActiveFilters = filterDirectorate !== 'all' || filterDivision !== 'all' || filterDepartment !== 'all' || searchQuery.trim();

  const keepCurrentText = keepCurrentLabel || `Keep current office (${currentOfficeName || 'Unassigned'})`;

  return (
    <div className="space-y-2">
      {label && (
        <Label className={required ? 'after:content-["*"] after:ml-0.5 after:text-destructive' : ''}>
          {label}
        </Label>
      )}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={ariaLabel || label || 'Select office'}
            aria-required={ariaRequired || required}
            aria-invalid={ariaInvalid || !!error}
            aria-describedby={ariaDescribedBy}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal",
              error && 'border-destructive',
              !value && 'text-muted-foreground'
            )}
          >
            {value ? (
              <div className="flex items-center gap-2 truncate">
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="truncate">{selectedOffice?.name || 'Unknown'}</span>
                <Badge variant="outline" className="ml-1 text-xs shrink-0">
                  {selectedOffice?.officeType}
                </Badge>
              </div>
            ) : showKeepCurrent && currentOfficeName ? (
              <span className="truncate">{keepCurrentText}</span>
            ) : (
              <span>{placeholder}</span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="p-3 space-y-3">
            {/* Search */}
            {showSearch && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search offices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}

            {/* Filters */}
            {showFilters && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Filter by</span>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 text-xs">
                      <X className="h-3 w-3 mr-1" /> Clear
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {/* Directorate Filter */}
                  <Select value={filterDirectorate} onValueChange={handleDirectorateChange}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Directorate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Directorates</SelectItem>
                      {directorates.map(d => (
                        <SelectItem key={d.id} value={d.id} className="text-xs">
                          {d.shortName || d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Division Filter */}
                  <Select value={filterDivision} onValueChange={handleDivisionChange}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Division" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Divisions</SelectItem>
                      {filteredDivisions.map(d => (
                        <SelectItem key={d.id} value={d.id} className="text-xs">
                          {d.shortName || d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Department Filter */}
                  <Select value={filterDepartment} onValueChange={(val) => setFilterDepartment(val)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Depts</SelectItem>
                      {filteredDepartments.map(d => (
                        <SelectItem key={d.id} value={d.id} className="text-xs">
                          {d.shortName || d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Office List */}
          <ScrollArea className="h-[250px]">
            <div className="p-2">
              {/* Keep Current Option */}
              {showKeepCurrent && (
                <>
                  <div
                    className={cn(
                      "flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer hover:bg-muted",
                      !value && "bg-muted"
                    )}
                    onClick={handleKeepCurrent}
                  >
                    <Check className={cn("h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                    <span className="text-sm">{keepCurrentText}</span>
                  </div>
                  <Separator className="my-2" />
                </>
              )}

              {/* Filtered Results */}
              {filteredOffices.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No offices found
                </div>
              ) : (
                filteredOffices.map(office => (
                  <div
                    key={office.id}
                    className={cn(
                      "flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer hover:bg-muted",
                      value === office.id && "bg-muted"
                    )}
                    onClick={() => handleSelect(office.id)}
                  >
                    <Check className={cn("h-4 w-4 shrink-0", value === office.id ? "opacity-100" : "opacity-0")} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{office.name}</span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {office.officeType}
                        </Badge>
                      </div>
                      {office.code && (
                        <span className="text-xs text-muted-foreground">{office.code}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <Separator />
          <div className="p-2 text-xs text-muted-foreground text-center">
            {filteredOffices.length} of {offices.length} offices
          </div>
        </PopoverContent>
      </Popover>

      {error && (
        <p className="text-xs text-destructive" role="alert" id={ariaDescribedBy}>
          {error}
        </p>
      )}
    </div>
  );
};
