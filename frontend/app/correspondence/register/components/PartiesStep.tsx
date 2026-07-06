"use client";

import { memo } from 'react';
import { ArrowLeft, ArrowRight, Building2 } from 'lucide-react';
import { ExternalEntityCombobox } from "@/components/correspondence/ExternalEntityCombobox";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FormData, FlowType } from '../register-utils';

interface PartiesStepProps {
  formData: FormData;
  flowType: FlowType;
  errors: Record<string, string>;
  onFormDataChange: (updates: Partial<FormData>) => void;
  onErrorClear: (field: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

function PartiesStepComponent({
  formData,
  flowType,
  errors,
  onFormDataChange,
  onErrorClear,
  onPrev,
  onNext,
}: PartiesStepProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {flowType === 'inward' ? (
          <>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="senderOrganization">
                Sender Organization/Private Entity <span className="text-destructive">*</span>
              </Label>
              <ExternalEntityCombobox
                id="senderOrganization"
                value={formData.senderOrganization}
                onChange={(value) => {
                  onFormDataChange({ senderOrganization: value });
                  if (errors.senderOrganization) onErrorClear("senderOrganization");
                }}
                aria-invalid={!!errors.senderOrganization}
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
              <Label htmlFor="senderOrganization">External Recipient Org</Label>
              <Input
                id="senderOrganization"
                placeholder="Destination organization (optional)"
                value={formData.senderOrganization}
                onChange={(e) => onFormDataChange({ senderOrganization: e.target.value })}
              />
            </div>
          </>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onPrev}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button type="button" onClick={onNext}>
          Next: Routing
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

export const PartiesStep = memo(PartiesStepComponent);
PartiesStep.displayName = 'PartiesStep';

