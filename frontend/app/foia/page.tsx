"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
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
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { QueuePageShell } from "@/components/shared/QueuePageShell";
import { StatStrip } from "@/components/shared/StatStrip";
import { apiFetch } from "@/lib/api-client";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { unwrapResults } from "@/lib/type-utils";
import { getFoiaStatusBadge } from "@/lib/status-badge";
import { appType } from "@/lib/app-type";
import { cn } from "@/lib/utils";
import { formatDateShort } from '@/lib/datetime';

interface FOIARequestRow {
  id: string;
  request_number: string;
  requester_name: string;
  requester_email?: string;
  requester_phone?: string;
  organization?: string;
  description_of_documents?: string;
  status: FOIAStatus;
  received_date: string;
  deadline_date: string | null;
  is_overdue?: boolean;
  assigned_to?: { name?: string; username?: string } | string | null;
}

interface FOIARequest {
  id: string;
  request_number: string;
  requester_name: string;
  requester_email: string;
  requester_phone: string;
  organization: string;
  description: string;
  status: FOIAStatus;
  received_date: string;
  deadline_date: string | null;
  is_overdue: boolean;
  assigned_to_name: string | null;
}

const mapFoiaRequest = (row: FOIARequestRow): FOIARequest => {
  const assigned =
    row.assigned_to && typeof row.assigned_to === "object"
      ? row.assigned_to.name || row.assigned_to.username || null
      : typeof row.assigned_to === "string"
        ? row.assigned_to
        : null;
  return {
    id: row.id,
    request_number: row.request_number,
    requester_name: row.requester_name,
    requester_email: row.requester_email ?? "",
    requester_phone: row.requester_phone ?? "",
    organization: row.organization ?? "",
    description: row.description_of_documents ?? "",
    status: row.status,
    received_date: row.received_date,
    deadline_date: row.deadline_date,
    is_overdue: Boolean(row.is_overdue),
    assigned_to_name: assigned,
  };
};

type FOIAStatus =
  | "submitted"
  | "acknowledged"
  | "in_processing"
  | "review"
  | "approved"
  | "partially_granted"
  | "denied"
  | "responded"
  | "closed"
  | "awaiting_clarification"
  | "appealed";

interface Stats {
  total: number;
  submitted: number;
  in_processing: number;
  overdue: number;
  closed_this_month: number;
}

const FOIA_STATUS_OPTIONS: FOIAStatus[] = [
  "submitted",
  "acknowledged",
  "in_processing",
  "review",
  "approved",
  "partially_granted",
  "denied",
  "responded",
  "closed",
  "awaiting_clarification",
  "appealed",
];

const TABS: { value: FOIAStatus | "all" | "overdue"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "in_processing", label: "In Processing" },
  { value: "overdue", label: "Overdue" },
  { value: "closed", label: "Closed" },
];

export default function FOIAListPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<FOIARequest[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    submitted: 0,
    in_processing: 0,
    overdue: 0,
    closed_this_month: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FOIAStatus | "all" | "overdue">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [count, setCount] = useState(0);
  const pagination = usePagination({ totalCount: count });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setStatusFilter("all");
    pagination.goToFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset page when tab changes
  }, [activeTab]);

  useEffect(() => {
    pagination.goToFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset page when filters change
  }, [debouncedSearch, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        page_size: String(pagination.pageSize),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const statusParam =
        statusFilter !== "all"
          ? statusFilter
          : activeTab !== "all" && activeTab !== "overdue"
            ? activeTab
            : "";
      if (statusParam) params.set("status", statusParam);
      if (activeTab === "overdue") params.set("overdue", "true");

      const [listResponse, statsResponse] = await Promise.all([
        apiFetch<{ results?: FOIARequestRow[]; count?: number }>(
          `/correspondence/foia-requests/?${params.toString()}`,
        ),
        apiFetch<Stats>(`/correspondence/foia-requests/stats/`),
      ]);
      const rows = unwrapResults<FOIARequestRow>(listResponse).map(mapFoiaRequest);
      setRequests(rows);
      setCount(
        typeof listResponse.count === "number" ? listResponse.count : rows.length,
      );
      setStats(statsResponse);
    } catch (_err) {
      setError("Failed to load FOIA requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load when pagination or filters change
  }, [pagination.page, pagination.pageSize, debouncedSearch, statusFilter, activeTab]);

  const filtered = requests;

  const isOverdue = (req: FOIARequest) =>
    req.is_overdue
    || (req.deadline_date
      ? new Date(req.deadline_date) < new Date()
        && !["closed", "responded", "appealed"].includes(req.status)
      : false);

  return (
    <QueuePageShell
      title="FOIA Requests"
      subtitle="Manage Freedom of Information Act requests"
      stats={
        <StatStrip
          items={[
            { key: "total", label: "Total", value: stats.total },
            { key: "submitted", label: "Submitted", value: stats.submitted },
            { key: "processing", label: "In processing", value: stats.in_processing },
            { key: "overdue", label: "Overdue", value: stats.overdue },
            { key: "closed", label: "Closed this month", value: stats.closed_this_month },
          ]}
        />
      }
    >
      <div className="mt-4 flex gap-1 flex-wrap">
        {TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={activeTab === tab.value ? "default" : "outline"}
            size="compact"
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="rounded-xl bg-muted/30 p-2 mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {FOIA_STATUS_OPTIONS.map((value) => (
                <SelectItem key={value} value={value}>
                  {getFoiaStatusBadge(value).label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <ErrorState message={error} variant="inline" />}

      {loading ? (
        <LoadingState message="Loading FOIA requests..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="search"
          title="No FOIA requests found"
          message={
            debouncedSearch || statusFilter !== "all" || activeTab !== "all"
              ? "Try adjusting your filters or search query."
              : "No FOIA requests have been submitted yet."
          }
        />
      ) : (
        <>
          <div className="rounded-xl border border-border/50 bg-muted/20 divide-y divide-border/50 overflow-hidden">
            {filtered.map((req) => {
              const badge = getFoiaStatusBadge(req.status);
              const overdue = isOverdue(req);
              return (
                <button
                  key={req.id}
                  type="button"
                  className="flex w-full items-center gap-4 p-4 text-left hover:bg-muted/40 transition-colors"
                  onClick={() => router.push(`/foia/${req.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(appType.caption, "font-mono")}>
                        {req.request_number}
                      </span>
                      {overdue && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          Overdue
                        </Badge>
                      )}
                    </div>
                    <p className={cn(appType.listTitle, "mt-0.5 truncate")}>
                      {req.requester_name}
                    </p>
                    {req.organization ? (
                      <p className={cn(appType.meta, "truncate")}>{req.organization}</p>
                    ) : null}
                  </div>
                  <div className={cn("hidden md:block", appType.meta)}>
                    <p>Received: {req.received_date ? formatDateShort(req.received_date) : "—"}</p>
                    <p>
                      Deadline:{" "}
                      {req.deadline_date
                        ? formatDateShort(req.deadline_date)
                        : "—"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant={badge.variant} className={badge.className}>
                      {badge.label}
                    </Badge>
                    {req.assigned_to_name ? (
                      <p className={cn(appType.caption, "mt-1")}>{req.assigned_to_name}</p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
          <PaginationControls pagination={pagination} />
        </>
      )}
    </QueuePageShell>
  );
}
