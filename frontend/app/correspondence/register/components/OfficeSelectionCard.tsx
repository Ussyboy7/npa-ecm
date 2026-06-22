"use client";

import { useState, useMemo } from 'react';
import { Building2, ArrowDown, ArrowUp, AlertCircle, CheckCircle2, ChevronsUpDown, Check, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { FlowType } from '../register-utils';

interface Office {
  id: string;
  name: string;
  officeType: string;
}

interface OfficeSelectionCardProps {
  offices: Office[];
  selectedOfficeId: string;
  flowType: FlowType;
  error?: string;
  onOfficeSelect: (officeId: string) => void;
  onFlowTypeChange: (flowType: FlowType) => void;
}

const OFFICE_TYPE_LABELS: Record<string, string> = {
  md: 'Managing Director',
  ed: 'Executive Director',
  gm: 'General Manager',
  agm: 'Assistant General Manager',
  directorate: 'Directorate Offices',
  division: 'Division Offices',
  department: 'Department Offices',
  unit: 'Units / Sections',
  registry: 'Registry / Secretariat',
  project: 'Programme / Project Offices',
  custom: 'Other Offices',
};

const OFFICE_TYPE_ORDER = [
  'md', 'ed', 'gm', 'agm',
  'directorate', 'division', 'department',
  'unit', 'registry', 'project', 'custom',
];

export function OfficeSelectionCard({
  offices,
  selectedOfficeId,
  flowType,
  error,
  onOfficeSelect,
  onFlowTypeChange,
}: OfficeSelectionCardProps) {
  const [open, setOpen] = useState(false);
  const hasSingleOffice = offices.length === 1;
  const hasNoOffice = offices.length === 0;
  const selectedOffice = offices.find((o) => o.id === selectedOfficeId);

  const groupedOffices = useMemo(() => {
    const groups = new Map<string, Office[]>();
    for (const type of OFFICE_TYPE_ORDER) {
      groups.set(type, []);
    }
    for (const office of offices) {
      const type = OFFICE_TYPE_ORDER.includes(office.officeType) ? office.officeType : 'custom';
      groups.get(type)!.push(office);
    }
    return groups;
  }, [offices]);

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
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {selectedOffice ? (
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 shrink-0" />
                      {selectedOffice.name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select registering office...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search offices..." />
                  <CommandList>
                    <CommandEmpty>
                      <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
                        <Search className="h-5 w-5" />
                        <p className="text-sm">No offices found</p>
                      </div>
                    </CommandEmpty>
                    {OFFICE_TYPE_ORDER.map((type) => {
                      const group = groupedOffices.get(type);
                      if (!group || group.length === 0) return null;
                      return (
                        <CommandGroup key={type} heading={OFFICE_TYPE_LABELS[type] || type}>
                          {group.map((office) => (
                            <CommandItem
                              key={office.id}
                              value={office.name}
                              onSelect={() => {
                                onOfficeSelect(office.id);
                                setOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedOfficeId === office.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                              {office.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      );
                    })}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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

