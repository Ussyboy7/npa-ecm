"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, History, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { registryQueueEmptyIconClass } from "@/components/shared/registry-queue-styles";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDateTime } from "@/lib/datetime";
import { logError } from "@/lib/client-logger";
import {
  listReferenceAllocations,
  type ReferenceAllocation,
  type ReferenceScopeType,
} from "@/lib/api/reference-schemes";

const PAGE_SIZE = 25;

export function ReferenceRegisterPanel() {
  const [allocations, setAllocations] = useState<ReferenceAllocation[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"all" | ReferenceScopeType>("all");
  const debouncedSearch = useDebounce(search, 250);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listReferenceAllocations({
          page,
          pageSize: PAGE_SIZE,
          scope_type: scopeFilter === "all" ? undefined : scopeFilter,
          search: debouncedSearch.trim() || undefined,
        });
        if (cancelled) return;
        setAllocations(data.results ?? []);
        setCount(data.count ?? 0);
      } catch (err) {
        if (cancelled) return;
        logError("Failed to load issued reference numbers", err);
        setError("Could not load issued reference numbers. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [page, scopeFilter, debouncedSearch, reloadToken]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const firstRow = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(page * PAGE_SIZE, count);
  const hasFilters = Boolean(search.trim()) || scopeFilter !== "all";

  if (loading && allocations.length === 0) {
    return <LoadingState message="Loading issued references…" />;
  }

  if (error && allocations.length === 0) {
    return (
      <EmptyState
        icon="file"
        title="Could not load issued references"
        message={error}
        actionLabel="Retry"
        onAction={() => setReloadToken((current) => current + 1)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-muted/30 p-2">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={scopeFilter}
            onValueChange={(value) => {
              setScopeFilter(value as "all" | ReferenceScopeType);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[150px] text-xs" aria-label="Issued reference scope">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All units</SelectItem>
              <SelectItem value="directorate">Directorates</SelectItem>
              <SelectItem value="division">Divisions</SelectItem>
              <SelectItem value="department">Departments</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search reference, unit, classification or subject…"
              aria-label="Search issued references"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="h-8 pl-8 pr-8 text-xs"
            />
            {search ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <span className="text-xs text-muted-foreground">
            {count} issued {count === 1 ? "number" : "numbers"}
          </span>
        </div>
      </div>

      {allocations.length === 0 ? (
        <EmptyState
          icon={<History className={registryQueueEmptyIconClass} />}
          title={hasFilters ? "No matching issued references" : "No reference numbers issued yet"}
          message={
            hasFilters
              ? "Try another reference, unit, classification or correspondence subject."
              : "Numbers appear here as correspondence is registered using a reference scheme."
          }
          variant="dashed"
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead>Correspondence</TableHead>
                  <TableHead>Issued</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocations.map((allocation) => (
                  <TableRow key={allocation.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs font-medium">
                      {allocation.reference_number}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-medium">
                        {allocation.unit_name || allocation.unit_code || "Unknown unit"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {allocation.scope_label}
                        {allocation.unit_code ? ` · ${allocation.unit_code}` : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                          {allocation.classification_code || "—"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {allocation.classification_label}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {allocation.correspondence ? (
                        <Link
                          href={`/correspondence/${allocation.correspondence}`}
                          className="block max-w-[320px]"
                        >
                          <span className="block truncate text-xs font-medium hover:underline">
                            {allocation.correspondence_subject || "Untitled correspondence"}
                          </span>
                          <span className="block truncate font-mono text-[11px] text-muted-foreground">
                            {allocation.correspondence_reference}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No correspondence linked
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="text-xs">{formatDateTime(allocation.created_at)}</div>
                      {allocation.created_by_name ? (
                        <div className="text-[11px] text-muted-foreground">
                          by {allocation.created_by_name}
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              Showing {firstRow}–{lastRow} of {count}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                aria-label="Previous page"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || loading}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="px-1 text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                aria-label="Next page"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages || loading}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
