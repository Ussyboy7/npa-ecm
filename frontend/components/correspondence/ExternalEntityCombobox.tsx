"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { fetchExternalEntities, type ExternalEntity } from "@/lib/external-entities-api";

interface ExternalEntityComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-invalid"?: boolean;
}

export function ExternalEntityCombobox({
  value,
  onChange,
  placeholder = "Search ministries, agencies, or organizations…",
  disabled = false,
  className,
  id,
  "aria-invalid": ariaInvalid,
}: ExternalEntityComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [entities, setEntities] = useState<ExternalEntity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      try {
        const { results } = await fetchExternalEntities({
          search: search || undefined,
          activeOnly: true,
          pageSize: 25,
        });
        if (!ignore) setEntities(results);
      } catch {
        if (!ignore) setEntities([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    const handle = setTimeout(() => void load(), 250);
    return () => {
      ignore = true;
      clearTimeout(handle);
    };
  }, [search]);

  const displayValue = useMemo(() => value || placeholder, [value, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", !value && "text-muted-foreground", className)}
        >
          <span className="truncate">{displayValue}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type to search…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? "Searching…" : "No matching entity. Use custom name below."}
            </CommandEmpty>
            <CommandGroup>
              {entities.map((entity) => (
                <CommandItem
                  key={entity.id}
                  value={entity.name}
                  onSelect={() => {
                    onChange(entity.name);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === entity.name ? "opacity-100" : "opacity-0")} />
                  <div>
                    <p>{entity.name}</p>
                    {entity.acronym && (
                      <p className="text-xs text-muted-foreground">{entity.acronym}</p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {search.trim() && !entities.some((e) => e.name.toLowerCase() === search.trim().toLowerCase()) && (
              <CommandGroup heading="Custom">
                <CommandItem
                  onSelect={() => {
                    onChange(search.trim());
                    setOpen(false);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Use &quot;{search.trim()}&quot;
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
