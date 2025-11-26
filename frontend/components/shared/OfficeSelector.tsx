/**
 * Shared OfficeSelector component
 * Reusable office selection dropdown
 */

import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Building2 } from 'lucide-react';
import type { Office } from '@/lib/npa-structure';

interface OfficeSelectorProps {
  offices: Office[];
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  showKeepCurrent?: boolean;
  currentOfficeName?: string;
  keepCurrentLabel?: string;
  maxHeight?: string;
  disabled?: boolean;
  'aria-label'?: string;
  'aria-required'?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

export const OfficeSelector = ({
  offices,
  value,
  onValueChange,
  label,
  placeholder = 'Select office',
  required = false,
  error,
  showKeepCurrent = false,
  currentOfficeName,
  keepCurrentLabel,
  maxHeight = '320px',
  disabled = false,
  'aria-label': ariaLabel,
  'aria-required': ariaRequired,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: OfficeSelectorProps) => {
  // Sort offices alphabetically
  const sortedOffices = useMemo(() => {
    return [...offices].sort((a, b) => a.name.localeCompare(b.name));
  }, [offices]);

  const keepCurrentValue = showKeepCurrent ? (value || '__keep_office__') : value;
  const keepCurrentText = keepCurrentLabel || `Keep current office (${currentOfficeName || 'Unassigned'})`;

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor="office-selector" className={required ? 'after:content-["*"] after:ml-0.5 after:text-destructive' : ''}>
          {label}
        </Label>
      )}
      <Select
        value={keepCurrentValue}
        onValueChange={(newValue) => {
          if (showKeepCurrent && newValue === '__keep_office__') {
            onValueChange('');
          } else {
            onValueChange(newValue);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger
          id="office-selector"
          aria-label={ariaLabel || label || 'Select office'}
          aria-required={ariaRequired || required}
          aria-invalid={ariaInvalid || !!error}
          aria-describedby={ariaDescribedBy}
          className={error ? 'border-destructive' : ''}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className={`max-h-[${maxHeight}] overflow-y-auto`}>
          {showKeepCurrent && (
            <>
              <SelectItem value="__keep_office__">
                {keepCurrentText}
              </SelectItem>
              <Separator className="my-1" />
            </>
          )}
          {sortedOffices.map((office) => (
            <SelectItem key={office.id} value={office.id}>
              <div className="flex flex-col">
                <span className="font-medium">{office.name}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  {office.officeType}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p className="text-xs text-destructive" role="alert" id={ariaDescribedBy}>
          {error}
        </p>
      )}
      {value && !error && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Building2 className="h-3.5 w-3.5" />
          Selected: {offices.find((o) => o.id === value)?.name || 'Unknown'}
        </p>
      )}
    </div>
  );
};

