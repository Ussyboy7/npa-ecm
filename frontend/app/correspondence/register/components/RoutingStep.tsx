"use client";

import { memo, useMemo } from 'react';
import { ArrowLeft, ArrowRight, Search, Building2, Globe, AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Directorate, Division, Department, Office, OfficeMembership } from '@/contexts/OrganizationContext';
import type { User } from '@/lib/npa-structure';
import { FormData, FlowType, DistributionState, detectCorrespondenceSource } from '../register-utils';
import { REGISTER_CONSTANTS } from '../register-constants';

interface RoutingStepProps {
  formData: FormData;
  flowType: FlowType;
  distributions: DistributionState;
  errors: Record<string, string>;
  assignSearch: string;
  directorates: Directorate[];
  divisions: Division[];
  departments: Department[];
  offices: Office[];
  officeMemberships: OfficeMembership[];
  organizationUsers: User[];
  onFormDataChange: (updates: Partial<FormData>) => void;
  onDistributionChange: (type: 'directorates' | 'divisions' | 'departments', ids: string[]) => void;
  onAssignSearchChange: (search: string) => void;
  onErrorClear: (field: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

export const RoutingStep = memo(function RoutingStep({
  formData,
  flowType,
  distributions,
  errors,
  assignSearch,
  directorates,
  divisions,
  departments,
  offices,
  officeMemberships,
  organizationUsers,
  onFormDataChange,
  onDistributionChange,
  onAssignSearchChange,
  onErrorClear,
  onPrev,
  onNext,
}: RoutingStepProps) {
  // Get primary office holder for each office
  const officesWithOccupants = useMemo(() => {
    return offices
      .filter((office) => office.isActive)
      .map((office) => {
        // Find primary office holder
        const primaryMembership = officeMemberships.find(
          (m) => m.officeId === office.id && m.isPrimary && m.isActive
        );
        const occupant = primaryMembership
          ? organizationUsers.find((u) => u.id === primaryMembership.userId)
          : undefined;

        return {
          office,
          occupant,
          occupantUserId: primaryMembership?.userId || null,
        };
      })
      .filter((item) => item.occupantUserId); // Only show offices with occupants
  }, [offices, officeMemberships, organizationUsers]);

  // Filter offices by search
  const filteredOfficesWithOccupants = useMemo(() => {
    if (!assignSearch.trim()) return officesWithOccupants;
    const query = assignSearch.toLowerCase();
    return officesWithOccupants.filter((item) => {
      const office = item.office;
      const occupant = item.occupant;
      return (
        office.name.toLowerCase().includes(query) ||
        office.code?.toLowerCase().includes(query) ||
        occupant?.name?.toLowerCase().includes(query) ||
        occupant?.systemRole?.toLowerCase().includes(query) ||
        occupant?.email?.toLowerCase().includes(query)
      );
    });
  }, [officesWithOccupants, assignSearch]);

  // Group offices by directorate
  const officesByDirectorate = useMemo(() => {
    const grouped = new Map<string, typeof filteredOfficesWithOccupants>();
    
    filteredOfficesWithOccupants.forEach((item) => {
      const directorateId = item.office.directorateId || 'unassigned';
      if (!grouped.has(directorateId)) {
        grouped.set(directorateId, []);
      }
      grouped.get(directorateId)!.push(item);
    });

    return Array.from(grouped.entries()).map(([directorateId, items]) => {
      const directorate = directorateId !== 'unassigned' 
        ? directorates.find((d) => d.id === directorateId)
        : null;
      return {
        directorate,
        directorateId,
        offices: items.sort((a, b) => a.office.name.localeCompare(b.office.name)),
      };
    }).sort((a, b) => {
      if (a.directorateId === 'unassigned') return 1;
      if (b.directorateId === 'unassigned') return -1;
      return (a.directorate?.name || '').localeCompare(b.directorate?.name || '');
    });
  }, [filteredOfficesWithOccupants, directorates]);

  const handleAssignChange = (value: string) => {
    if (value === REGISTER_CONSTANTS.ASSIGN_PLACEHOLDER) {
      onFormDataChange({ assignTo: '', divisionId: '' });
      return;
    }
    // Value is the office ID, find the primary office holder
    const officeWithOccupant = officesWithOccupants.find((item) => item.office.id === value);
    if (officeWithOccupant && officeWithOccupant.occupantUserId) {
      const occupant = officeWithOccupant.occupant;
      onFormDataChange({
        assignTo: officeWithOccupant.occupantUserId, // Store user ID for backend
        divisionId: occupant?.division || officeWithOccupant.office.divisionId || '',
      });
    }
    if (errors.assignTo) onErrorClear('assignTo');
  };

  // Get currently selected office (by finding which office has the selected user as primary holder)
  const selectedOffice = useMemo(() => {
    if (!formData.assignTo) return null;
    return officesWithOccupants.find((item) => item.occupantUserId === formData.assignTo);
  }, [formData.assignTo, officesWithOccupants]);

  const handleDistributionToggle = (
    type: 'directorates' | 'divisions' | 'departments',
    id: string,
    checked: boolean
  ) => {
    const currentIds = distributions[type];
    const newIds = checked
      ? [...currentIds, id]
      : currentIds.filter((item) => item !== id);
    onDistributionChange(type, newIds);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>
          Assign To <span className="text-destructive">*</span>
        </Label>
        <Select
          value={selectedOffice?.office.id || REGISTER_CONSTANTS.ASSIGN_PLACEHOLDER}
          onValueChange={handleAssignChange}
        >
          <SelectTrigger
            className={errors.assignTo ? 'border-destructive' : ''}
            aria-invalid={!!errors.assignTo}
            aria-describedby={errors.assignTo ? 'assignTo-error' : undefined}
          >
            <SelectValue placeholder="Select office" />
          </SelectTrigger>
          <SelectContent className="max-h-[400px]">
            <div className="sticky top-0 z-10 bg-popover p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={assignSearch}
                  onChange={(e) => onAssignSearchChange(e.target.value)}
                  placeholder="Search office or occupant name..."
                  className="pl-8 h-9"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <SelectItem value={REGISTER_CONSTANTS.ASSIGN_PLACEHOLDER} disabled>
              Select office
            </SelectItem>
            {officesByDirectorate.map(({ directorate, directorateId, offices: dirOffices }) => (
              <div key={directorateId} className="border-t first:border-t-0">
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50">
                  {directorate?.name || 'Unassigned'}
                </div>
                {dirOffices.map(({ office, occupant }) => {
                  const division = divisions.find((div) => div.id === office.divisionId);
                  return (
                    <SelectItem key={office.id} value={office.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{office.name}</span>
                        {occupant && (
                          <span className="text-xs text-muted-foreground">
                            Occupied by: {occupant.name}
                            {occupant.systemRole && ` • ${occupant.systemRole}`}
                            {division && ` • ${division.name}`}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </div>
            ))}
          </SelectContent>
        </Select>
        {errors.assignTo && (
          <p id="assignTo-error" className="text-xs text-destructive" role="alert">
            {errors.assignTo}
          </p>
        )}
      </div>

      {flowType === 'outward' && (
        <div className="space-y-4">
          <Separator />
          
          {/* Source Type Detection & Selection */}
          {(() => {
            const detectedSource = detectCorrespondenceSource(flowType, formData, distributions);
            const isAmbiguous = detectedSource === 'ambiguous';
            const explicitSource = formData.correspondenceSource;
            const displaySource = explicitSource || (detectedSource === 'ambiguous' ? 'internal' : detectedSource);

            return (
              <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-base font-semibold">Correspondence Type</Label>
                    <Badge 
                      variant={displaySource === 'internal' ? 'default' : 'secondary'}
                      className="gap-1.5"
                    >
                      {displaySource === 'internal' ? (
                        <>
                          <Building2 className="h-3 w-3" />
                          Outward (Internal)
                        </>
                      ) : (
                        <>
                          <Globe className="h-3 w-3" />
                          Outward (External)
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
                
                {isAmbiguous && !explicitSource && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Ambiguous routing detected</p>
                        <p className="text-xs text-muted-foreground">
                          You've selected both distributions (NPA offices) and external recipient fields. 
                          Please specify the intended routing type:
                        </p>
                        <RadioGroup
                          value={formData.correspondenceSource || 'internal'}
                          onValueChange={(value) => onFormDataChange({ correspondenceSource: value as 'internal' | 'external' })}
                          className="mt-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="internal" id="source-internal" />
                            <Label htmlFor="source-internal" className="flex items-center gap-2 cursor-pointer">
                              <Building2 className="h-4 w-4" />
                              <span>Internal (to NPA offices via distributions)</span>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="external" id="source-external" />
                            <Label htmlFor="source-external" className="flex items-center gap-2 cursor-pointer">
                              <Globe className="h-4 w-4" />
                              <span>External (to external organization)</span>
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                
                {!isAmbiguous && (
                  <p className="text-xs text-muted-foreground">
                    {displaySource === 'internal' 
                      ? 'Detected: Routing to NPA offices via distribution list'
                      : 'Detected: Routing to external organization'}
                  </p>
                )}
              </div>
            );
          })()}
          
          <div>
            <Label className="text-base">Distribution List</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Select units that should receive this dispatch
            </p>
            {errors.distribution && (
              <p className="text-sm text-destructive mb-2" role="alert">
                {errors.distribution}
              </p>
            )}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm font-medium">Directorates</p>
                <div className="max-h-40 overflow-y-auto rounded-lg border p-3 space-y-2">
                  {directorates.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No directorates</p>
                  ) : (
                    directorates.map((dir) => (
                      <label
                        key={dir.id}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded"
                      >
                        <Checkbox
                          checked={distributions.directorates.includes(dir.id)}
                          onCheckedChange={(checked) =>
                            handleDistributionToggle('directorates', dir.id, !!checked)
                          }
                        />
                        <span className="truncate">{dir.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Divisions</p>
                <div className="max-h-40 overflow-y-auto rounded-lg border p-3 space-y-2">
                  {divisions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No divisions</p>
                  ) : (
                    divisions.map((division) => (
                      <label
                        key={division.id}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded"
                      >
                        <Checkbox
                          checked={distributions.divisions.includes(division.id)}
                          onCheckedChange={(checked) =>
                            handleDistributionToggle('divisions', division.id, !!checked)
                          }
                        />
                        <span className="truncate">{division.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Departments</p>
                <div className="max-h-40 overflow-y-auto rounded-lg border p-3 space-y-2">
                  {departments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No departments</p>
                  ) : (
                    departments.map((department) => (
                      <label
                        key={department.id}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded"
                      >
                        <Checkbox
                          checked={distributions.departments.includes(department.id)}
                          onCheckedChange={(checked) =>
                            handleDistributionToggle('departments', department.id, !!checked)
                          }
                        />
                        <span className="truncate">{department.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button type="button" variant="ghost" size="sm" onClick={onPrev}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button type="button" size="compact" onClick={onNext}>
          Next: Documents
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
});

