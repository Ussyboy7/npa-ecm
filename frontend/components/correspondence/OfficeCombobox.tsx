"use client";

import { useMemo, useState } from "react";
import { Building2, Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface OfficeSelectOption {
  id: string;
  name: string;
  officeType?: string;
  directorateId?: string | null;
  divisionId?: string | null;
}

interface OfficeComboboxProps {
  offices: OfficeSelectOption[];
  value?: string;
  onSelect: (officeId: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  emptyMessage?: string;
  excludeOfficeIds?: string[];
  ariaInvalid?: boolean;
  className?: string;
}

const OFFICE_TYPE_LABELS: Record<string, string> = {
  md: "Managing Director",
  ed: "Executive Director",
  gm: "General Manager",
  agm: "Assistant General Manager",
  directorate: "Directorate Offices",
  division: "Division Offices",
  department: "Department Offices",
  unit: "Units / Sections",
  registry: "Registry / Secretariat",
  project: "Programme / Project Offices",
  custom: "Other Offices",
};

/** Human-readable office type for compact summaries ("md" → "Managing Director"). */
export const officeTypeLabel = (officeType?: string | null): string | undefined =>
  officeType ? OFFICE_TYPE_LABELS[officeType] ?? officeType : undefined;

const OFFICE_TYPE_ORDER = [
  "md",
  "ed",
  "gm",
  "agm",
  "directorate",
  "division",
  "department",
  "unit",
  "registry",
  "project",
  "custom",
];

export function OfficeCombobox({
  offices,
  value,
  onSelect,
  placeholder = "Select office...",
  ariaLabel,
  emptyMessage = "No offices found",
  excludeOfficeIds = [],
  ariaInvalid = false,
  className,
}: OfficeComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedOffice = offices.find((office) => office.id === value);
  const excluded = useMemo(() => new Set(excludeOfficeIds), [excludeOfficeIds]);

  const groupedOffices = useMemo(() => {
    const groups = new Map<string, OfficeSelectOption[]>();
    for (const type of OFFICE_TYPE_ORDER) {
      groups.set(type, []);
    }
    for (const office of offices) {
      if (excluded.has(office.id)) continue;
      const type = OFFICE_TYPE_ORDER.includes(office.officeType ?? "")
        ? (office.officeType as string)
        : "custom";
      groups.get(type)!.push(office);
    }
    for (const group of groups.values()) {
      group.sort((a, b) => a.name.localeCompare(b.name));
    }
    return groups;
  }, [offices, excluded]);

  const availableCount = useMemo(
    () => Array.from(groupedOffices.values()).reduce((count, group) => count + group.length, 0),
    [groupedOffices],
  );

  return (
    // Modal keeps the popover inside the dialog's scroll lock, so wheel and
    // trackpad scrolling work over the office list instead of being cancelled
    // by the parent dialog.
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-label={ariaLabel ?? placeholder}
          aria-expanded={open}
          aria-invalid={ariaInvalid || undefined}
          className={cn(
            "w-full justify-between font-normal",
            !selectedOffice && "text-muted-foreground",
            ariaInvalid && "border-destructive",
            className,
          )}
        >
          {selectedOffice ? (
            <span className="flex min-w-0 items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{selectedOffice.name}</span>
            </span>
          ) : (
            <span className="truncate">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="max-h-[min(420px,var(--radix-popover-content-available-height))] w-[var(--radix-popover-trigger-width)] overflow-hidden p-0"
        align="start"
      >
        <Command className="max-h-[inherit]">
          <CommandInput placeholder="Search offices..." />
          <CommandList className="max-h-none flex-1 min-h-0">
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
                <Search className="h-5 w-5" />
                <p className="text-sm">
                  {availableCount === 0 ? "All offices already selected" : emptyMessage}
                </p>
              </div>
            </CommandEmpty>
            {OFFICE_TYPE_ORDER.map((type) => {
              const group = groupedOffices.get(type);
              if (!group || group.length === 0) return null;
              return (
                <CommandGroup key={type} heading={OFFICE_TYPE_LABELS[type] ?? type}>
                  {group.map((office) => (
                    <CommandItem
                      key={office.id}
                      value={office.id}
                      keywords={[office.name, office.officeType ?? ""]}
                      onSelect={() => {
                        onSelect(office.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === office.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{office.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
