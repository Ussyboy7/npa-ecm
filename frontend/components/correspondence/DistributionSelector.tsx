"use client";

import { useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Building2, Users, Info, CheckCircle, MessageSquare, Layers } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { DistributionRecipient } from '@/lib/npa-structure';

interface DistributionSelectorProps {
  selectedDistribution: DistributionRecipient[];
  onDistributionChange: (distribution: DistributionRecipient[]) => void;
  currentDivisionId?: string; // Exclude current division from selection
  currentDepartmentId?: string; // Exclude current department from selection
}

export const DistributionSelector = ({
  selectedDistribution,
  onDistributionChange,
  currentDivisionId,
  currentDepartmentId,
}: DistributionSelectorProps) => {
  const { directorates, divisions, departments } = useOrganization();
  const allDirectorates = useMemo(() => directorates, [directorates]);
  const allDivisions = useMemo(() => divisions, [divisions]);
  const allDepartments = useMemo(() => departments, [departments]);
  const [selectedType, setSelectedType] = useState<'directorate' | 'division' | 'department'>('division');
  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedPurpose, setSelectedPurpose] = useState<'information' | 'action' | 'comment'>('information');

  const currentDirectorateId = useMemo(() => {
    if (currentDivisionId) {
      const currentDivision = allDivisions.find((division) => division.id === currentDivisionId);
      if (currentDivision) return currentDivision.directorateId;
    }
    if (currentDepartmentId) {
      const currentDepartment = allDepartments.find((department) => department.id === currentDepartmentId);
      if (currentDepartment) {
        const parentDivision = allDivisions.find((division) => division.id === currentDepartment.divisionId);
        return parentDivision?.directorateId;
      }
    }
    return undefined;
  }, [allDepartments, allDivisions, currentDepartmentId, currentDivisionId]);

  const availableDirectorates = useMemo(() => {
    const filtered = allDirectorates
      .filter((dir) => dir.isActive !== false)
      .filter((dir) => dir.id !== currentDirectorateId)
      .filter((dir) => !selectedDistribution.some((recipient) => recipient.type === 'directorate' && recipient.id === dir.id));

    if (filtered.length > 0) return filtered;

    return allDirectorates
      .filter((dir) => dir.isActive !== false)
      .filter((dir) => !selectedDistribution.some((recipient) => recipient.type === 'directorate' && recipient.id === dir.id));
  }, [allDirectorates, currentDirectorateId, selectedDistribution]);

  const availableDivisions = useMemo(() => {
    const filtered = allDivisions
      .filter((division) => division.isActive !== false)
      .filter((division) => division.id !== currentDivisionId)
      .filter((division) => !selectedDistribution.some((recipient) => recipient.type === 'division' && recipient.id === division.id));

    if (filtered.length > 0) return filtered;

    return allDivisions
      .filter((division) => division.isActive !== false)
      .filter((division) => !selectedDistribution.some((recipient) => recipient.type === 'division' && recipient.id === division.id));
  }, [allDivisions, currentDivisionId, selectedDistribution]);

  const availableDepartments = useMemo(() => {
    const filtered = allDepartments
      .filter((department) => department.isActive !== false)
      .filter((department) => department.id !== currentDepartmentId)
      .filter((department) => !selectedDistribution.some((recipient) => recipient.type === 'department' && recipient.id === department.id));

    if (filtered.length > 0) return filtered;

    return allDepartments
      .filter((department) => department.isActive !== false)
      .filter((department) => !selectedDistribution.some((recipient) => recipient.type === 'department' && recipient.id === department.id));
  }, [allDepartments, currentDepartmentId, selectedDistribution]);

  const handleAdd = () => {
    if (!selectedId) return;

    let name = '';
    const newRecipient: DistributionRecipient = {
      type: selectedType,
      id: selectedId,
      directorateId: selectedType === 'directorate' ? selectedId : undefined,
      divisionId: selectedType === 'division' ? selectedId : undefined,
      departmentId: selectedType === 'department' ? selectedId : undefined,
      purpose: selectedPurpose,
    };

    if (selectedType === 'directorate') {
      name = allDirectorates.find((directorate) => directorate.id === selectedId)?.name ?? '';
    } else if (selectedType === 'division') {
      const division = allDivisions.find((item) => item.id === selectedId);
      name = division?.name ?? '';
      newRecipient.directorateId = division?.directorateId;
    } else {
      const department = allDepartments.find((item) => item.id === selectedId);
      name = department?.name ?? '';
      newRecipient.divisionId = department?.divisionId;
      if (department?.divisionId) {
        const parentDivision = allDivisions.find((item) => item.id === department.divisionId);
        newRecipient.directorateId = parentDivision?.directorateId;
      }
    }

    newRecipient.name = name;
    onDistributionChange([...selectedDistribution, newRecipient]);
    setSelectedId('');
  };

  const handleRemove = (id: string, type: DistributionRecipient['type']) => {
    onDistributionChange(
      selectedDistribution.filter(d => !(d.id === id && d.type === type))
    );
  };

  const getPurposeIcon = (purpose: 'information' | 'action' | 'comment') => {
    switch (purpose) {
      case 'information':
        return <Info className="h-3 w-3" />;
      case 'action':
        return <CheckCircle className="h-3 w-3" />;
      case 'comment':
        return <MessageSquare className="h-3 w-3" />;
    }
  };

  const getPurposeColor = (purpose: 'information' | 'action' | 'comment') => {
    switch (purpose) {
      case 'information':
        return 'bg-info/10 text-info border-info/20';
      case 'action':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'comment':
        return 'bg-success/10 text-success border-success/20';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-semibold">Distribution (CC)</Label>
        <Badge variant="outline" className="text-xs">
          {selectedDistribution.length} recipient{selectedDistribution.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Add New Recipient */}
      <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select value={selectedType} onValueChange={(value) => {
              setSelectedType(value as 'directorate' | 'division' | 'department');
              setSelectedId('');
            }}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="directorate">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Directorate
                  </div>
                </SelectItem>
                <SelectItem value="division">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Division
                  </div>
                </SelectItem>
                <SelectItem value="department">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Department
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {selectedType === 'directorate'
                ? 'Directorate'
                : selectedType === 'division'
                ? 'Division'
                : 'Department'}
            </Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder={`Select ${selectedType}`} />
              </SelectTrigger>
              <SelectContent>
                {selectedType === 'directorate'
                  ? availableDirectorates.map((directorate) => (
                      <SelectItem key={directorate.id} value={directorate.id}>
                        {directorate.name}
                      </SelectItem>
                    ))
                  : selectedType === 'division'
                  ? availableDivisions.map((division) => (
                      <SelectItem key={division.id} value={division.id}>
                        {division.name}
                      </SelectItem>
                    ))
                  : availableDepartments.map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Purpose</Label>
            <Select value={selectedPurpose} onValueChange={(value) => {
              setSelectedPurpose(value as 'information' | 'action' | 'comment');
            }}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="information">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    For Information
                  </div>
                </SelectItem>
                <SelectItem value="action">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    For Action
                  </div>
                </SelectItem>
                <SelectItem value="comment">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    For Comment
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleAdd}
          disabled={!selectedId}
          size="sm"
          variant="outline"
          className="w-full"
        >
          Add to Distribution
        </Button>
      </div>

      {/* Selected Recipients */}
      {selectedDistribution.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Selected Recipients ({selectedDistribution.length})
          </Label>
          <div className="space-y-2">
            {selectedDistribution.map((recipient, idx) => (
              <Card key={`${recipient.type}-${recipient.id}-${idx}`} className="border-border">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {recipient.type === 'directorate' ? (
                        <Layers className="h-4 w-4 text-primary" />
                      ) : recipient.type === 'division' ? (
                        <Building2 className="h-4 w-4 text-primary" />
                      ) : (
                        <Users className="h-4 w-4 text-secondary" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{recipient.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {recipient.type}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs gap-1 ${getPurposeColor(recipient.purpose || 'information')}`}
                      >
                        {getPurposeIcon(recipient.purpose || 'information')}
                        {recipient.purpose === 'information' ? 'Info' : 
                         recipient.purpose === 'action' ? 'Action' : 'Comment'}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 ml-2"
                      onClick={() => handleRemove(recipient.id, recipient.type)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {selectedDistribution.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              No distribution recipients added yet. Add directorates, divisions, or departments to CC.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

