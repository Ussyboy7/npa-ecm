"use client";

import { memo, useEffect, useState } from 'react';
import { ArrowRight, RefreshCcw, Clock } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { FormData, FlowType, generateReferenceNumber } from '../register-utils';
import { PRIORITY_OPTIONS, DOCUMENT_TYPE_OPTIONS } from '../register-constants';
import { fetchSLATargets, type SLATargets } from '@/lib/sla-client';

interface BasicInfoStepProps {
  formData: FormData;
  flowType: FlowType;
  errors: Record<string, string>;
  onFormDataChange: (updates: Partial<FormData>) => void;
  onErrorClear: (field: string) => void;
  onNext: () => void;
}

export const BasicInfoStep = memo(function BasicInfoStep({
  formData,
  flowType,
  errors,
  onFormDataChange,
  onErrorClear,
  onNext,
}: BasicInfoStepProps) {
  const [slaTargets, setSlaTargets] = useState<SLATargets | null>(null);

  useEffect(() => {
    // Fetch SLA targets on mount
    fetchSLATargets()
      .then(setSlaTargets)
      .catch(() => {
        // Use defaults if fetch fails
        setSlaTargets({ urgent: 2, high: 3, medium: 5, low: 7 });
      });
  }, []);

  const getSLADays = (priority: string): number | null => {
    if (!slaTargets) return null;
    switch (priority) {
      case 'urgent': return slaTargets.urgent;
      case 'high': return slaTargets.high;
      case 'medium': return slaTargets.medium;
      case 'low': return slaTargets.low;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="subject">
            Subject <span className="text-destructive">*</span>
          </Label>
          <Input
            id="subject"
            placeholder="e.g. Request for ICT infrastructure upgrade"
            value={formData.subject}
            onChange={(e) => {
              onFormDataChange({ subject: e.target.value });
              if (errors.subject) onErrorClear('subject');
            }}
            className={errors.subject ? 'border-destructive' : ''}
            aria-invalid={!!errors.subject}
            aria-describedby={errors.subject ? 'subject-error' : undefined}
          />
          {errors.subject && (
            <p id="subject-error" className="text-xs text-destructive" role="alert">
              {errors.subject}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="referenceNumber">Reference Number</Label>
          <div className="flex gap-2">
            <Input
              id="referenceNumber"
              value={formData.referenceNumber}
              onChange={(e) => onFormDataChange({ referenceNumber: e.target.value })}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => onFormDataChange({ referenceNumber: generateReferenceNumber() })}
              aria-label="Generate new reference number"
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select
            value={formData.priority}
            onValueChange={(value) => onFormDataChange({ priority: value as FormData['priority'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((option) => {
                const slaDays = getSLADays(option.value);
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2 w-full">
                      <Badge
                        variant={option.color as 'default' | 'secondary' | 'destructive' | 'outline'}
                        className="h-2 w-2 p-0 rounded-full flex-shrink-0"
                      />
                      <span className="flex-1">{option.label}</span>
                      {slaDays !== null && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{slaDays} hour{slaDays !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="documentType">Document Type</Label>
          <Select
            value={formData.documentType}
            onValueChange={(value) => onFormDataChange({ documentType: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPE_OPTIONS.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {flowType === 'inward' ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="senderReference">Sender's Reference</Label>
              <Input
                id="senderReference"
                placeholder="Reference on the letter"
                value={formData.senderReference}
                onChange={(e) => onFormDataChange({ senderReference: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="letterDate">Date of Letter</Label>
              <Input
                id="letterDate"
                type="date"
                value={formData.letterDate}
                onChange={(e) => onFormDataChange({ letterDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receivedDate">
                Date Received <span className="text-destructive">*</span>
              </Label>
              <Input
                id="receivedDate"
                type="date"
                value={formData.receivedDate}
                onChange={(e) => {
                  onFormDataChange({ receivedDate: e.target.value });
                  if (errors.receivedDate) onErrorClear('receivedDate');
                }}
                className={errors.receivedDate ? 'border-destructive' : ''}
                aria-invalid={!!errors.receivedDate}
                aria-describedby={errors.receivedDate ? 'receivedDate-error' : undefined}
              />
              {errors.receivedDate && (
                <p id="receivedDate-error" className="text-xs text-destructive" role="alert">
                  {errors.receivedDate}
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="letterDate">
                Date of Letter <span className="text-destructive">*</span>
              </Label>
              <Input
                id="letterDate"
                type="date"
                value={formData.letterDate}
                onChange={(e) => {
                  onFormDataChange({ letterDate: e.target.value });
                  if (errors.letterDate) onErrorClear('letterDate');
                }}
                className={errors.letterDate ? 'border-destructive' : ''}
                aria-invalid={!!errors.letterDate}
                aria-describedby={errors.letterDate ? 'letterDate-error' : undefined}
              />
              {errors.letterDate && (
                <p id="letterDate-error" className="text-xs text-destructive" role="alert">
                  {errors.letterDate}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dispatchDate">
                Date of Dispatch <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dispatchDate"
                type="date"
                value={formData.dispatchDate}
                onChange={(e) => {
                  onFormDataChange({ dispatchDate: e.target.value });
                  if (errors.dispatchDate) onErrorClear('dispatchDate');
                }}
                className={errors.dispatchDate ? 'border-destructive' : ''}
                aria-invalid={!!errors.dispatchDate}
                aria-describedby={errors.dispatchDate ? 'dispatchDate-error' : undefined}
              />
              {errors.dispatchDate && (
                <p id="dispatchDate-error" className="text-xs text-destructive" role="alert">
                  {errors.dispatchDate}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end pt-4">
        <Button type="button" onClick={onNext}>
          Next: Parties
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
});

