"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { usePaginatedUserSearch } from "@/hooks/use-paginated-user-search";
import { cn } from "@/lib/utils";

interface UserSearchComboboxProps {
  /** Selected user id, or empty when nothing is chosen. */
  value?: string;
  /** Display name for the selected user, kept by the caller. */
  selectedLabel?: string;
  onSelect: (userId: string, userName: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Active-user picker backed by the server search endpoint. Results load on
 * demand (debounced, paginated) instead of preloading the whole directory.
 */
export function UserSearchCombobox({
  value,
  selectedLabel,
  onSelect,
  placeholder = "Select user...",
  id,
  className,
  disabled = false,
}: UserSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const { query, setQuery, users, loading, loadingMore, error, hasMore, loadMore } =
    usePaginatedUserSearch({ enabled: open, pageSize: 50 });

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selectedLabel && "text-muted-foreground",
            className,
          )}
        >
          {selectedLabel ? (
            <span className="flex min-w-0 items-center gap-2">
              <User className="h-4 w-4 shrink-0" />
              <span className="truncate">{selectedLabel}</span>
            </span>
          ) : (
            <span className="truncate">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search users..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && users.length === 0 ? (
              <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading users...
              </div>
            ) : users.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {error ?? "No users found."}
              </div>
            ) : (
              <CommandGroup>
                {users.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.id}
                    onSelect={() => {
                      onSelect(user.id, user.name);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === user.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate">{user.name}</span>
                      {user.email ? (
                        <span className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      ) : null}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {hasMore ? (
              <div className="p-2 pt-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Load more users
                </Button>
              </div>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
