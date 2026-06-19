"use client";

import { Building2, ArrowDown, ArrowUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FlowType } from '../register-utils';

interface Office {
  id: string;
  name: string;
}

interface OfficeSelectionCardProps {
  offices: Office[];
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
  const _selectedOffice = offices.find((o) => o.id === selectedOfficeId);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Correspondence Type & Office</CardTitle>
        <CardDescription>
          {hasSingleOffice
            ? 'Select the correspondence flow type'
            : hasNoOffice
            ? 'Office membership required to register correspondence'
            : 'Select correspondence flow type and registering office'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Flow Type Selection - More Prominent */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Correspondence Flow <span className="text-destructive">*</span></label>
          <div className="flex gap-2">
            {(['inward', 'outward'] as const).map((type) => (
              <Button
                key={type}
                type="button"
                variant={flowType === type ? 'default' : 'outline'}
                size="default"
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
          <p className="text-xs text-muted-foreground">
            {flowType === 'inward'
              ? 'Coming INTO your office: Capture external or inter-agency correspondence received (physical copy) or minuted to your office.'
              : 'Going OUT OF your office: Register drafts prepared by your office before dispatching outward (minute internally or print & mail externally).'}
          </p>
        </div>

        <Separator />

        {/* Office Selection */}
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
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{offices[0].name}</span>
              <Badge variant="secondary" className="ml-auto">
                Auto-selected
              </Badge>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {offices.map((office) => (
                <Button
                  key={office.id}
                  type="button"
                  variant={selectedOfficeId === office.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onOfficeSelect(office.id)}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  {office.name}
                </Button>
              ))}
            </div>
          )}
          
          {error && (
            <p className="text-sm text-destructive flex items-center gap-1" role="alert">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

