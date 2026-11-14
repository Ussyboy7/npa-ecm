"use client";

import { Building2, ArrowDown, ArrowUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OfficeCombobox, type OfficeSelectOption } from '@/components/correspondence/OfficeCombobox';
import { appType } from '@/lib/app-type';
import { FlowType } from '../register-utils';

interface OfficeSelectionCardProps {
  offices: OfficeSelectOption[];
  selectedOfficeId: string;
  flowType: FlowType;
  error?: string;
  onOfficeSelect: (officeId: string) => void;
  onFlowTypeChange: (flowType: FlowType) => void;
}

export function OfficeSelectionCard({
  offices,
  selectedOfficeId,
  flowType,
  error,
  onOfficeSelect,
  onFlowTypeChange,
}: OfficeSelectionCardProps) {
  const hasSingleOffice = offices.length === 1;
  const hasNoOffice = offices.length === 0;

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-4">
      <div className="space-y-1">
        <h2 className={appType.panelTitle}>Correspondence Type & Office</h2>
        <p className={appType.caption}>
          {hasSingleOffice
            ? 'Select the correspondence flow type'
            : hasNoOffice
            ? 'Office membership required to register correspondence'
            : 'Select correspondence flow type and registering office'}
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Correspondence Flow <span className="text-destructive">*</span></label>
        <div className="flex gap-2">
          {(['inward', 'outward'] as const).map((type) => (
            <Button
              key={type}
              type="button"
              variant={flowType === type ? 'default' : 'outline'}
              size="compact"
              onClick={() => onFlowTypeChange(type)}
              className="flex-1"
            >
              {type === 'inward' ? (
                <>
                  <ArrowDown className="h-4 w-4 mr-2" />
                  Inward
                </>
              ) : (
                <>
                  <ArrowUp className="h-4 w-4 mr-2" />
                  Outward
                </>
              )}
            </Button>
          ))}
        </div>
        <p className={appType.caption}>
          {flowType === 'inward'
            ? 'Coming INTO your office: Capture external or inter-agency correspondence received (physical copy) or minuted to your office.'
            : 'Going OUT OF your office: Register correspondence prepared by your office before dispatching it.'}
        </p>
      </div>

      <Separator />

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Registering Office {!hasSingleOffice && <span className="text-destructive">*</span>}
        </label>
        
        {hasNoOffice ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">No office membership detected</p>
                <p className="text-xs">
                  You need to be assigned to an office to register correspondence. 
                  Please contact your administrator to assign you to an office.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        ) : hasSingleOffice ? (
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-background/60">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{offices[0].name}</span>
            <Badge variant="secondary" className="ml-auto text-[10px] h-5">
              Auto-selected
            </Badge>
          </div>
        ) : (
          <OfficeCombobox
            offices={offices}
            value={selectedOfficeId}
            onSelect={onOfficeSelect}
            placeholder="Select registering office..."
            emptyMessage="No offices found"
          />
        )}
        
        {error && (
          <p className="text-sm text-destructive flex items-center gap-1" role="alert">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
