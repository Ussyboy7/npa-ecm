"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Inbox,
  Loader2,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
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
import { HelpGuideCard } from "@/components/help/HelpGuideCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { apiFetch } from "@/lib/api-client";

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
  deadline: string;
  assigned_to: string | null;
  outcome: string | null;
  exemption_reason: string | null;
  acknowledged_at: string | null;
  responded_at: string | null;
  closed_at: string | null;
}

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

const STATUS_BADGE: Record<FOIAStatus, { label: string; className: string }> = {
  submitted: { label: "Submitted", className: "bg-amber-500 hover:bg-amber-600" },
  acknowledged: { label: "Acknowledged", className: "bg-blue-500 hover:bg-blue-600" },
  in_processing: { label: "In Processing", className: "bg-purple-500 hover:bg-purple-600" },
  review: { label: "Under Review", className: "bg-orange-500 hover:bg-orange-600" },
  approved: { label: "Approved", className: "bg-green-500 hover:bg-green-600" },
  partially_granted: { label: "Partially Granted", className: "bg-yellow-500 hover:bg-yellow-600" },
  denied: { label: "Denied", className: "bg-red-500 hover:bg-red-600" },
  responded: { label: "Responded", className: "bg-teal-500 hover:bg-teal-600" },
  closed: { label: "Closed", className: "bg-gray-500 hover:bg-gray-600" },
  awaiting_clarification: { label: "Awaiting Clarification", className: "bg-pink-500 hover:bg-pink-600" },
  appealed: { label: "Appealed", className: "bg-violet-500 hover:bg-violet-600" },
};

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

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setStatusFilter("all");
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [listResponse, statsResponse] = await Promise.all([
        apiFetch<{ results: FOIARequest[]; count: number }>(
          `/api/correspondence/foia-requests/?page=1&page_size=100`
        ),
        apiFetch<Stats>(
          `/api/correspondence/foia-requests/stats/`
        ),
      ]);
      setRequests(listResponse.results);
      setStats(statsResponse);
    } catch (err) {
      setError("Failed to load FOIA requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    let items = requests;

    if (activeTab === "overdue") {
      items = items.filter((r) => {
        if (!r.deadline) return false;
        return new Date(r.deadline) < new Date() && r.status !== "closed";
      });
    } else if (activeTab !== "all") {
      items = items.filter((r) => r.status === activeTab);
    }

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      items = items.filter(
        (r) =>
          r.request_number?.toLowerCase().includes(q) ||
          r.requester_name?.toLowerCase().includes(q) ||
          r.organization?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      items = items.filter((r) => r.status === statusFilter);
    }

    return items;
  }, [requests, activeTab, debouncedSearch, statusFilter]);

  const isOverdue = (deadline: string | null) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  const statCards = [
    {
      label: "Total Requests",
      value: stats.total,
      icon: Inbox,
      bgClass: "bg-primary/10",
      iconClass: "text-primary",
    },
    {
      label: "Submitted",
      value: stats.submitted,
      icon: FileText,
      bgClass: "bg-amber-500/10",
      iconClass: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "In Processing",
      value: stats.in_processing,
      icon: Clock,
      bgClass: "bg-purple-500/10",
      iconClass: "text-purple-600 dark:text-purple-400",
    },
    {
      label: "Overdue",
      value: stats.overdue,
      icon: AlertTriangle,
      bgClass: "bg-red-500/10",
      iconClass: "text-red-600 dark:text-red-400",
    },
    {
      label: "Closed This Month",
      value: stats.closed_this_month,
      icon: CheckCircle2,
      bgClass: "bg-green-500/10",
      iconClass: "text-green-600 dark:text-green-400",
    },
  ];

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">FOIA Requests</h1>
          <p className="text-muted-foreground mt-1">
            Manage Freedom of Information Act requests
          </p>
        </div>

        <HelpGuideCard
          title="FOIA Management"
          description="Track, process, and respond to FOIA requests from submission through closure."
          links={[{ label: "Help & Guides", href: "/help" }]}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {statCards.map(({ label, value, icon: Icon, bgClass, iconClass }) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${bgClass}`}>
                  <Icon className={`h-5 w-5 ${iconClass}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex gap-1 flex-wrap">
            {TABS.map((tab) => (
              <Button
                key={tab.value}
                variant={activeTab === tab.value ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(tab.value)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_BADGE).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>
                    {label}
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
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {filtered.map((req) => {
                    const badge = STATUS_BADGE[req.status] || STATUS_BADGE.submitted;
                    const overdue = isOverdue(req.deadline) && req.status !== "closed" && req.status !== "responded";
                    return (
                      <div
                        key={req.id}
                        className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/foia/${req.id}`)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">
                              {req.request_number}
                            </span>
                            {overdue && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                Overdue
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium truncate mt-0.5">{req.requester_name}</p>
                          {req.organization && (
                            <p className="text-xs text-muted-foreground truncate">{req.organization}</p>
                          )}
                        </div>
                        <div className="hidden md:block text-sm text-muted-foreground">
                          <p>Received: {req.received_date ? new Date(req.received_date).toLocaleDateString() : "—"}</p>
                          <p>
                            Deadline:{" "}
                            {req.deadline
                              ? new Date(req.deadline).toLocaleDateString()
                              : "—"}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={badge.className}>{badge.label}</Badge>
                          {req.assigned_to && (
                            <p className="text-xs text-muted-foreground mt-1">{req.assigned_to}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            <p className="text-sm text-muted-foreground text-center">
              Showing {filtered.length} of {requests.length} requests
            </p>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
