"use client";

import { memo, useMemo, useState, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Building2, Globe, AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import type { Directorate, Division, Department, Office, OfficeMembership } from '@/contexts/OrganizationContext';
import type { User } from '@/lib/npa-structure';
import { PrimaryRoutePanel } from '@/components/correspondence/PrimaryRoutePanel';
import { getDivisionById } from '@/lib/npa-structure';
import {
  FormData,
  FlowType,
  DistributionState,
  detectCorrespondenceSource,
  RegisterRoutingConfig,
} from '../register-utils';

interface RoutingStepProps {
  formData: FormData;
  flowType: FlowType;
  distributions: DistributionState;
  routingConfig: RegisterRoutingConfig;
  errors: Record<string, string>;
  directorates: Directorate[];
  divisions: Division[];
  departments: Department[];
  offices: Office[];
  officeMemberships: OfficeMembership[];
  organizationUsers: User[];
  currentUserId?: string;
  onFormDataChange: (updates: Partial<FormData>) => void;
  onRoutingChange: (updates: Partial<RegisterRoutingConfig>) => void;
  onDistributionChange: (type: 'directorates' | 'divisions' | 'departments', ids: string[]) => void;
  onErrorClear: (field: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

export const RoutingStep = memo(function RoutingStep({
  formData,
  flowType,
  distributions,
  routingConfig,
  errors,
  directorates,
  divisions,
  departments,
  offices,
  officeMemberships,
  organizationUsers,
  currentUserId,
  onFormDataChange,
  onRoutingChange,
  onDistributionChange,
  onErrorClear,
  onPrev,
  onNext,
}: RoutingStepProps) {
  const [personSearchQuery, setPersonSearchQuery] = useState('');
  const [officeSearchQuery, setOfficeSearchQuery] = useState('');
  const [officeFilterDirectorate, setOfficeFilterDirectorate] = useState('all');
  const [officeFilterDivision, setOfficeFilterDivision] = useState('all');

  const activeUsers = useMemo(
    () => organizationUsers.filter((u) => u.active !== false && u.id !== currentUserId),
    [organizationUsers, currentUserId],
  );

  const officeOptionsForRouting = useMemo(
    () =>
      offices
        .filter((o) => o.isActive)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((o) => ({
          id: o.id,
          name: o.name,
          officeType: o.officeType ?? '',
          directorateId: o.directorateId ?? undefined,
          divisionId: o.divisionId ?? undefined,
        })),
    [offices],
  );

  const findUserById = useCallback(
    (id: string) => activeUsers.find((u) => u.id === id),
    [activeUsers],
  );

  const getUserOfficeInfo = useCallback(
    (userId: string) => {
      const membership = officeMemberships.find(
        (m) => m.userId === userId && m.isPrimary && m.isActive,
      );
      if (!membership) return null;
      const office = offices.find((o) => o.id === membership.officeId);
      const user = findUserById(userId);
      const division = user?.division ? getDivisionById(user.division) : null;
      return {
        office: office ? { name: office.name } : undefined,
        division: division ? { name: division.name } : undefined,
      };
    },
    [officeMemberships, offices, findUserById],
  );

  const syncAssignTo = useCallback(
    (updates: Partial<RegisterRoutingConfig>) => {
      const next = { ...routingConfig, ...updates };
      if (next.routeMode === 'single') {
        if (next.routeType === 'person' && next.forwardTo) {
          onFormDataChange({ assignTo: next.forwardTo });
        } else if (next.routeType === 'office' && next.targetOfficeId) {
          const primary = officeMemberships.find(
            (m) => m.officeId === next.targetOfficeId && m.isPrimary && m.isActive,
          );
          onFormDataChange({
            assignTo: primary?.userId ?? '',
            divisionId: offices.find((o) => o.id === next.targetOfficeId)?.divisionId ?? formData.divisionId,
          });
        }
      } else {
        onFormDataChange({ assignTo: '' });
      }
      if (errors.assignTo) onErrorClear('assignTo');
    },
    [routingConfig, officeMemberships, offices, formData.divisionId, onFormDataChange, errors.assignTo, onErrorClear],
  );

  const handleRoutingPatch = (updates: Partial<RegisterRoutingConfig>) => {
    onRoutingChange(updates);
    syncAssignTo(updates);
  };

  const handleDistributionToggle = (
    type: 'directorates' | 'divisions' | 'departments',
    id: string,
    checked: boolean,
  ) => {
    const currentIds = distributions[type];
    const newIds = checked ? [...currentIds, id] : currentIds.filter((item) => item !== id);
    onDistributionChange(type, newIds);
  };

  return (
    <div className="space-y-4">
      <PrimaryRoutePanel
        routeMode={routingConfig.routeMode}
        onRouteModeChange={(mode) => handleRoutingPatch({ routeMode: mode })}
        routeType={routingConfig.routeType}
        onRouteTypeChange={(type) => handleRoutingPatch({ routeType: type, forwardTo: '', targetOfficeId: '' })}
        forwardTo={routingConfig.forwardTo}
        onForwardToChange={(id) => handleRoutingPatch({ forwardTo: id, routeType: 'person' })}
        forwardToError={errors.assignTo}
        personSearchQuery={personSearchQuery}
        onPersonSearchQueryChange={setPersonSearchQuery}
        targetOfficeId={routingConfig.targetOfficeId}
        onTargetOfficeIdChange={(id) => handleRoutingPatch({ targetOfficeId: id, routeType: 'office', forwardTo: '' })}
        officeSearchQuery={officeSearchQuery}
        onOfficeSearchQueryChange={setOfficeSearchQuery}
        officeFilterDirectorate={officeFilterDirectorate}
        onOfficeFilterDirectorateChange={(v) => {
          setOfficeFilterDirectorate(v);
          setOfficeFilterDivision('all');
        }}
        officeFilterDivision={officeFilterDivision}
        onOfficeFilterDivisionChange={setOfficeFilterDivision}
        purpose={routingConfig.purpose}
        onPurposeChange={(p) => handleRoutingPatch({ purpose: p })}
        parallelUserIds={routingConfig.parallelUserIds}
        onParallelUserIdsChange={(ids) => handleRoutingPatch({ parallelUserIds: ids })}
        parallelOfficeIds={routingConfig.parallelOfficeIds}
        onParallelOfficeIdsChange={(ids) => handleRoutingPatch({ parallelOfficeIds: ids })}
        mergeStrategy={routingConfig.mergeStrategy}
        onMergeStrategyChange={(s) => handleRoutingPatch({ mergeStrategy: s })}
        branchConfigs={routingConfig.branchConfigs}
        onBranchConfigsChange={(configs) => onRoutingChange({ branchConfigs: configs })}
        defaultBranchText={routingConfig.routingNotes || formData.remarks || 'Please review and respond.'}
        distributionUserIds={routingConfig.distributionUserIds}
        onDistributionUserIdsChange={(ids) => onRoutingChange({ distributionUserIds: ids })}
        distributionOfficeIds={routingConfig.distributionOfficeIds}
        onDistributionOfficeIdsChange={(ids) => onRoutingChange({ distributionOfficeIds: ids })}
        showDistribution
        offices={officeOptionsForRouting}
        directorates={directorates}
        divisions={divisions}
        users={activeUsers}
        assistantList={[]}
        approverList={activeUsers}
        findUserById={findUserById}
        getUserOfficeInfo={getUserOfficeInfo}
      />

      {errors.assignTo && (
        <p className="text-xs text-destructive" role="alert">
          {errors.assignTo}
        </p>
      )}

      {flowType === 'outward' && (
        <div className="space-y-4">
          <Separator />

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
                    <Badge variant={displaySource === 'internal' ? 'default' : 'secondary'} className="gap-1.5">
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
                        <RadioGroup
                          value={formData.correspondenceSource || 'internal'}
                          onValueChange={(value) =>
                            onFormDataChange({ correspondenceSource: value as 'internal' | 'external' })
                          }
                          className="mt-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="internal" id="source-internal" />
                            <Label htmlFor="source-internal" className="cursor-pointer">
                              Internal (to NPA offices via distributions)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="external" id="source-external" />
                            <Label htmlFor="source-external" className="cursor-pointer">
                              External (to external organization)
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            );
          })()}

          <div>
            <Label className="text-base">Outward distribution list</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Directorate / division / department broadcast — separate from primary route and CC above.
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
                  {directorates.map((dir) => (
                    <label key={dir.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={distributions.directorates.includes(dir.id)}
                        onCheckedChange={(checked) =>
                          handleDistributionToggle('directorates', dir.id, !!checked)
                        }
                      />
                      <span className="truncate">{dir.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Divisions</p>
                <div className="max-h-40 overflow-y-auto rounded-lg border p-3 space-y-2">
                  {divisions.map((division) => (
                    <label key={division.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={distributions.divisions.includes(division.id)}
                        onCheckedChange={(checked) =>
                          handleDistributionToggle('divisions', division.id, !!checked)
                        }
                      />
                      <span className="truncate">{division.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Departments</p>
                <div className="max-h-40 overflow-y-auto rounded-lg border p-3 space-y-2">
                  {departments.map((department) => (
                    <label key={department.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={distributions.departments.includes(department.id)}
                        onCheckedChange={(checked) =>
                          handleDistributionToggle('departments', department.id, !!checked)
                        }
                      />
                      <span className="truncate">{department.name}</span>
                    </label>
                  ))}
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
