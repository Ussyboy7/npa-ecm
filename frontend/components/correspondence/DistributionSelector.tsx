"use client";

import { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { X, Building2, Users, Info, CheckCircle, MessageSquare } from 'lucide-react';
import { DIVISIONS, DEPARTMENTS, getDivisionById, getDepartmentById } from '@/lib/npa-structure';
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
  const [selectedType, setSelectedType] = useState<'division' | 'department'>('division');
  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedPurpose, setSelectedPurpose] = useState<'information' | 'action' | 'comment'>('information');

  // Filter out current division/department and already selected ones
  const availableDivisions = DIVISIONS.filter(
    div => div.active && 
    div.id !== currentDivisionId && 
    !selectedDistribution.some(d => d.type === 'division' && d.id === div.id)
  );

  const availableDepartments = DEPARTMENTS.filter(
    dept => dept.active && 
    dept.id !== currentDepartmentId && 
    !selectedDistribution.some(d => d.type === 'department' && d.id === dept.id)
  );

  const handleAdd = () => {
    if (!selectedId) return;

    let name = '';
    if (selectedType === 'division') {
      const division = getDivisionById(selectedId);
      name = division?.name || '';
    } else {
      const department = getDepartmentById(selectedId);
      name = department?.name || '';
    }

    if (!name) return;

    const newRecipient: DistributionRecipient = {
      type: selectedType,
      id: selectedId,
      name,
      addedBy: '', // Will be set by parent component
      addedAt: new Date().toISOString(),
      purpose: selectedPurpose,
    };

    onDistributionChange([...selectedDistribution, newRecipient]);
    setSelectedId('');
  };

  const handleRemove = (id: string, type: 'division' | 'department') => {
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
              setSelectedType(value as 'division' | 'department');
              setSelectedId('');
            }}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
              {selectedType === 'division' ? 'Division' : 'Department'}
            </Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder={`Select ${selectedType}`} />
              </SelectTrigger>
              <SelectContent>
                {selectedType === 'division' ? (
                  availableDivisions.map(div => (
                    <SelectItem key={div.id} value={div.id}>
                      {div.name}
                    </SelectItem>
                  ))
                ) : (
                  availableDepartments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))
                )}
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
                      {recipient.type === 'division' ? (
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
              No distribution recipients added yet. Add divisions or departments to CC.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

