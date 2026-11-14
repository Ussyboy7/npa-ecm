"use client";

import { memo } from 'react';
import { ArrowLeft, ArrowRight, Building2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  DistributionState,
  FormData,
  FlowType,
  detectCorrespondenceSource,
} from '../register-utils';

interface DistributionOption {
  id: string;
  name: string;
}

interface PartiesStepProps {
  formData: FormData;
  flowType: FlowType;
  distributions: DistributionState;
  directorates: DistributionOption[];
  divisions: DistributionOption[];
  departments: DistributionOption[];
  errors: Record<string, string>;
  onFormDataChange: (updates: Partial<FormData>) => void;
  onDistributionChange: (
    type: 'directorates' | 'divisions' | 'departments',
    ids: string[]
  ) => void;
  onErrorClear: (field: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

function PartiesStepComponent({
  formData,
  flowType,
  distributions,
  directorates,
  divisions,
  departments,
  errors,
  onFormDataChange,
  onDistributionChange,
  onErrorClear,
  onPrev,
  onNext,
}: PartiesStepProps) {
  const detectedSource = detectCorrespondenceSource(flowType, formData, distributions);
  const selectedSource =
    formData.correspondenceSource ?? (detectedSource === 'ambiguous' ? '' : detectedSource);

  const toggleDistribution = (
    type: 'directorates' | 'divisions' | 'departments',
    id: string,
    checked: boolean
  ) => {
    const currentIds = distributions[type];
    onDistributionChange(
      type,
      checked ? [...currentIds, id] : currentIds.filter((item) => item !== id)
    );
    if (errors.distribution) onErrorClear('distribution');
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {flowType === 'inward' ? (
          <>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="senderOrganization">
                Sender Organization/Private Entity <span className="text-destructive">*</span>
              </Label>
              <Input
                id="senderOrganization"
                placeholder="Organization or private entity"
                value={formData.senderOrganization}
                onChange={(e) => {
                  onFormDataChange({ senderOrganization: e.target.value });
                  if (errors.senderOrganization) onErrorClear("senderOrganization");
                }}
                aria-invalid={!!errors.senderOrganization}
                aria-describedby={
                  errors.senderOrganization ? "senderOrganization-error" : undefined
                }
                className={errors.senderOrganization ? "border-destructive" : ""}
              />
              {errors.senderOrganization && (
                <p id="senderOrganization-error" className="text-xs text-destructive" role="alert">
                  {errors.senderOrganization}
                </p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="senderName">
                Status of the Sender
              </Label>
              <Input
                id="senderName"
                placeholder="Enter sender's name or designation"
                value={formData.senderName}
                onChange={(e) => {
                  onFormDataChange({ senderName: e.target.value });
                  if (errors.senderName) onErrorClear('senderName');
                }}
                className={errors.senderName ? 'border-destructive' : ''}
                aria-invalid={!!errors.senderName}
                aria-describedby={errors.senderName ? 'senderName-error' : undefined}
              />
              {errors.senderName && (
                <p id="senderName-error" className="text-xs text-destructive" role="alert">
                  {errors.senderName}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="senderEmail">Sender Email</Label>
              <Input
                id="senderEmail"
                type="email"
                placeholder="sender@example.com"
                value={formData.senderEmail}
                onChange={(e) => {
                  onFormDataChange({ senderEmail: e.target.value });
                  if (errors.senderEmail) onErrorClear('senderEmail');
                }}
                className={errors.senderEmail ? 'border-destructive' : ''}
                aria-invalid={!!errors.senderEmail}
                aria-describedby={errors.senderEmail ? 'senderEmail-error' : undefined}
              />
              {errors.senderEmail && (
                <p id="senderEmail-error" className="text-xs text-destructive" role="alert">
                  {errors.senderEmail}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="senderPhone">Sender Phone</Label>
              <Input
                id="senderPhone"
                type="tel"
                placeholder="+234 123 456 7890"
                value={formData.senderPhone}
                onChange={(e) => onFormDataChange({ senderPhone: e.target.value })}
              />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2 sm:col-span-2">
              <Label>Originating Office</Label>
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="font-medium">
                    {formData.senderName || 'Select an office above'}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="recipientName">
                To Whom <span className="text-destructive">*</span>
              </Label>
              <Input
                id="recipientName"
                placeholder="Recipient name or office"
                value={formData.recipientName}
                onChange={(e) => {
                  onFormDataChange({ recipientName: e.target.value });
                  if (errors.recipientName) onErrorClear('recipientName');
                }}
                className={errors.recipientName ? 'border-destructive' : ''}
                aria-invalid={!!errors.recipientName}
                aria-describedby={errors.recipientName ? 'recipientName-error' : undefined}
              />
              {errors.recipientName && (
                <p id="recipientName-error" className="text-xs text-destructive" role="alert">
                  {errors.recipientName}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Recipient Email</Label>
              <Input
                id="recipientEmail"
                type="email"
                placeholder="recipient@example.com"
                value={formData.recipientEmail}
                onChange={(e) => {
                  onFormDataChange({ recipientEmail: e.target.value });
                  if (errors.recipientEmail) onErrorClear('recipientEmail');
                }}
                className={errors.recipientEmail ? 'border-destructive' : ''}
                aria-invalid={!!errors.recipientEmail}
                aria-describedby={errors.recipientEmail ? 'recipientEmail-error' : undefined}
              />
              {errors.recipientEmail && (
                <p id="recipientEmail-error" className="text-xs text-destructive" role="alert">
                  {errors.recipientEmail}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientPhone">Recipient Phone</Label>
              <Input
                id="recipientPhone"
                type="tel"
                placeholder="+234 123 456 7890"
                value={formData.recipientPhone}
                onChange={(e) => onFormDataChange({ recipientPhone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="externalRecipientOrganization">External Recipient Org</Label>
              <Input
                id="externalRecipientOrganization"
                placeholder="Destination organization (optional)"
                value={formData.senderOrganization}
                onChange={(e) => onFormDataChange({ senderOrganization: e.target.value })}
              />
            </div>
          </>
        )}
      </div>

      {flowType === 'outward' && (
        <>
          <Separator />
          <div className="space-y-3">
            <div>
              <Label className="text-base">
                Correspondence Source <span className="text-destructive">*</span>
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Choose whether this correspondence is staying inside NPA or going to an external organization.
              </p>
            </div>
            <RadioGroup
              value={selectedSource}
              onValueChange={(value) => {
                onFormDataChange({ correspondenceSource: value as 'internal' | 'external' });
                if (errors.correspondenceSource) onErrorClear('correspondenceSource');
              }}
              className="grid gap-2 sm:grid-cols-2"
            >
              <label className="flex items-center gap-2 rounded-lg border p-3 text-sm cursor-pointer">
                <RadioGroupItem value="internal" id="source-internal" />
                Internal — to NPA offices
              </label>
              <label className="flex items-center gap-2 rounded-lg border p-3 text-sm cursor-pointer">
                <RadioGroupItem value="external" id="source-external" />
                External — outside NPA
              </label>
            </RadioGroup>
            {!formData.correspondenceSource && detectedSource === 'ambiguous' && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Both an external recipient and an internal distribution are present. Choose the source explicitly.
              </p>
            )}
            {errors.correspondenceSource && (
              <p className="text-sm text-destructive" role="alert">
                {errors.correspondenceSource}
              </p>
            )}
          </div>

          <Separator />
          <div className="space-y-4">
            <div>
              <Label className="text-base">
                Outward distribution list <span className="text-destructive">*</span>
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Select the NPA directorates, divisions, or departments that should receive a copy.
              </p>
            </div>
            {errors.distribution && (
              <p className="text-sm text-destructive" role="alert">
                {errors.distribution}
              </p>
            )}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm font-medium">Directorates</p>
                <div className="max-h-40 overflow-y-auto rounded-lg border p-3 space-y-2">
                  {directorates.map((directorate) => (
                    <label
                      key={directorate.id}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={distributions.directorates.includes(directorate.id)}
                        onCheckedChange={(checked) =>
                          toggleDistribution('directorates', directorate.id, !!checked)
                        }
                      />
                      <span className="truncate">{directorate.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Divisions</p>
                <div className="max-h-40 overflow-y-auto rounded-lg border p-3 space-y-2">
                  {divisions.map((division) => (
                    <label
                      key={division.id}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={distributions.divisions.includes(division.id)}
                        onCheckedChange={(checked) =>
                          toggleDistribution('divisions', division.id, !!checked)
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
                    <label
                      key={department.id}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={distributions.departments.includes(department.id)}
                        onCheckedChange={(checked) =>
                          toggleDistribution('departments', department.id, !!checked)
                        }
                      />
                      <span className="truncate">{department.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
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
}

export const PartiesStep = memo(PartiesStepComponent);
PartiesStep.displayName = 'PartiesStep';

