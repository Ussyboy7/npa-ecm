"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Mail,
  Search,
  User as UserIcon,
  ArrowDown,
  ArrowUp,
  Clock,
  AlertCircle,
  Building2,
  Inbox,
  Filter,
} from 'lucide-react';
import { formatDateShort } from '@/lib/correspondence-helpers';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Correspondence } from '@/lib/npa-structure';
import { apiFetch } from '@/lib/api-client';
import { mapApiCorrespondence } from '@/contexts/CorrespondenceContext';

const STORAGE_KEY = 'office-inbox-selection';

const SLA_THRESHOLDS: Record<string, number> = {
  urgent: 2,
  high: 5,
  medium: 10,
  low: 14,
  default: 10,
};

const isOverdue = (item: Correspondence): boolean => {
  if (!item.receivedDate) return false;
  const priority = item.priority ?? 'default';
  const threshold = SLA_THRESHOLDS[priority] ?? SLA_THRESHOLDS.default;
  const received = new Date(item.receivedDate).getTime();
  const daysOpen = (Date.now() - received) / (1000 * 60 * 60 * 24);
  return daysOpen > threshold && item.status !== 'completed';
};

type InboxSummary = {
  total: number;
  urgent: number;
  overdue: number;
  assigned_to_user: number;
};

const DEFAULT_SUMMARY: InboxSummary = {
  total: 0,
  urgent: 0,
  overdue: 0,
  assigned_to_user: 0,
};

type StatusFilterOption = {
  value: string;
  label: string;
  statuses?: string[];
};

const STATUS_FILTERS: StatusFilterOption[] = [
  { value: 'active', label: 'Active', statuses: ['pending', 'in-progress'] },
  { value: 'pending', label: 'Pending', statuses: ['pending'] },
  { value: 'in-progress', label: 'In Progress', statuses: ['in-progress'] },
  { value: 'completed', label: 'Completed', statuses: ['completed'] },
  { value: 'archived', label: 'Archived', statuses: ['archived'] },
  { value: 'all', label: 'All' },
];

const CorrespondenceInbox = () => {
  const router = useRouter();
  const { currentUser, hydrated } = useCurrentUser();
  const { divisions, users: organizationUsers, offices, officeMemberships } = useOrganization();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [assignedOnly, setAssignedOnly] = useState(false);

  const [inboxItems, setInboxItems] = useState<Correspondence[]>([]);
  const [summary, setSummary] = useState<InboxSummary>(DEFAULT_SUMMARY);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userOfficeMemberships = useMemo(() => {
    if (!currentUser) return [];
    return officeMemberships.filter(
      (membership) => membership.userId === currentUser.id && membership.isActive,
    );
  }, [currentUser, officeMemberships]);

  const userOfficeIds = useMemo(
    () => userOfficeMemberships.map((membership) => membership.officeId),
    [userOfficeMemberships],
  );

  const isSuperuser = Boolean(currentUser?.isSuperuser);
  const hasCorrespondenceAccess = userOfficeIds.length > 0 || isSuperuser;

  const selectableOffices = useMemo(() => {
    if (isSuperuser) {
      return offices;
    }
    const membershipOfficeIds = new Set(userOfficeIds);
    return offices.filter((office) => membershipOfficeIds.has(office.id));
  }, [isSuperuser, offices, userOfficeIds]);

  useEffect(() => {
    if (!hasCorrespondenceAccess) return;
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (
        saved &&
        (saved === 'all' ||
          userOfficeIds.includes(saved) ||
          (isSuperuser && selectableOffices.some((office) => office.id === saved)))
      ) {
        setSelectedOfficeId(saved);
        return;
      }
    }
    if (userOfficeIds.length > 0) {
      setSelectedOfficeId(userOfficeIds[0]);
    } else if (isSuperuser) {
      setSelectedOfficeId('all');
    }
  }, [hasCorrespondenceAccess, userOfficeIds, isSuperuser, selectableOffices]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, selectedOfficeId);
    }
  }, [selectedOfficeId]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [selectedOfficeId, debouncedSearch, statusFilter, assignedOnly]);

  useEffect(() => {
    if (hydrated && currentUser && !hasCorrespondenceAccess) {
      router.replace('/inbox');
    }
  }, [hydrated, currentUser, hasCorrespondenceAccess, router]);

  useEffect(() => {
    if (!hydrated || !currentUser || !hasCorrespondenceAccess) return;

    const fetchInbox = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        let appendedOffice = false;
        if (selectedOfficeId && selectedOfficeId !== 'all') {
          params.append('office', selectedOfficeId);
          appendedOffice = true;
        } else if (userOfficeIds.length > 0) {
          userOfficeIds.forEach((officeId) => params.append('office', officeId));
          appendedOffice = true;
        }

        if (!appendedOffice && isSuperuser) {
          params.append('include_all_offices', 'true');
        }
        if (debouncedSearch) params.append('search', debouncedSearch);
        const activeFilter = STATUS_FILTERS.find((option) => option.value === statusFilter);
        if (activeFilter?.statuses?.length) {
          activeFilter.statuses.forEach((status) => params.append('status', status));
        }
        if (assignedOnly) {
          params.append('assigned_only', 'true');
        }
        params.append('page', String(page));
        params.append('page_size', String(pageSize));

        const response = await apiFetch(`/correspondence/items/office-inbox/?${params.toString()}`);
        const results = Array.isArray(response.results) ? response.results : [];
        setInboxItems(results.map(mapApiCorrespondence));
        setSummary({
          total: response.summary?.total ?? response.count ?? results.length,
          urgent: response.summary?.urgent ?? 0,
          overdue: response.summary?.overdue ?? 0,
          assigned_to_user: response.summary?.assigned_to_user ?? 0,
        });
        setCount(response.count ?? results.length);
      } catch (err) {
        setError('Failed to load office inbox. Please try again.');
        setInboxItems([]);
        setSummary(DEFAULT_SUMMARY);
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    void fetchInbox();
  }, [
    hydrated,
    currentUser,
    hasCorrespondenceAccess,
    selectedOfficeId,
    debouncedSearch,
    page,
    userOfficeIds,
    isSuperuser,
    statusFilter,
    assignedOnly,
  ]);

  const pageCount = Math.max(1, Math.ceil(count / pageSize));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-warning bg-warning/10';
      case 'in-progress':
        return 'text-info bg-info/10';
      case 'completed':
        return 'text-success bg-success/10';
      case 'archived':
        return 'text-muted-foreground bg-muted';
      default:
        return 'text-foreground bg-muted';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const CorrespondenceCard = ({ corr }: { corr: Correspondence }) => {
    const division = corr.divisionId ? divisions.find((div) => div.id === corr.divisionId) : undefined;
    const currentApprover = corr.currentApproverId
      ? organizationUsers.find((user) => user.id === corr.currentApproverId)
      : undefined;
    const overdue = isOverdue(corr);

    return (
      <Link
        href={`/correspondence/${corr.id}`}
        className="p-4 border border-border rounded-lg hover:bg-muted/50 hover:shadow-soft transition-all cursor-pointer block"
      >
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-lg ${
              corr.priority === 'urgent'
                ? 'bg-destructive/10'
                : corr.priority === 'high'
                  ? 'bg-warning/10'
                  : 'bg-primary/10'
            }`}
          >
            <Mail
              className={`h-5 w-5 ${
                corr.priority === 'urgent'
                  ? 'text-destructive'
                  : corr.priority === 'high'
                    ? 'text-warning'
                    : 'text-primary'
              }`}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground truncate mb-1">{corr.subject}</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={getPriorityColor(corr.priority)}>
                    {corr.priority.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    {corr.direction === 'downward' ? (
                      <>
                        <ArrowDown className="h-3 w-3 text-info" />
                        Downward
                      </>
                    ) : (
                      <>
                        <ArrowUp className="h-3 w-3 text-success" />
                        Upward
                      </>
                    )}
                  </Badge>
                  <Badge variant="secondary" className={getStatusColor(corr.status)}>
                    {corr.status.replace('-', ' ')}
                  </Badge>
                  {overdue && <Badge variant="destructive">SLA Breach</Badge>}
                </div>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDateShort(corr.receivedDate)}
              </span>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <UserIcon className="h-3.5 w-3.5" />
                <span>From: {corr.senderName}</span>
                {corr.senderOrganization && (
                  <span className="text-xs">({corr.senderOrganization})</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                <span>Ref: {corr.referenceNumber}</span>
              </div>
              {division && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Division: {division.name}</span>
                </div>
              )}
              {currentApprover && (
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Current: {currentApprover.name}</span>
                </div>
              )}
              {corr.currentOfficeName && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Office: {corr.currentOfficeName}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  };

  if (!hydrated || !currentUser) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Loading office inbox…
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!hasCorrespondenceAccess) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-lg font-semibold">No office inbox available</p>
              <p className="text-sm text-muted-foreground mt-2">
                This persona does not have registry or routing permissions. Redirecting you to your
                personal inbox…
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Mail className="h-8 w-8 text-primary" />
              Correspondence Inbox
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor work queued in your offices and prioritize urgent escalations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => router.push('/correspondence/register')}
              className="bg-gradient-primary hover:opacity-90 transition-opacity"
            >
              Register New
            </Button>
            <ContextualHelp
              title="How to triage correspondence"
              description="Pick one of your offices, tackle urgent/SLA breaches first, and then work through the remaining approvals."
              steps={[
                'Select the office you are acting for.',
                'Use search to find specific references or senders.',
                'Open a record to minute, approve, delegate, or archive.',
              ]}
            />
          </div>
        </div>

        <HelpGuideCard
          title="Office queue basics"
          description="Department files, archives, and outgoing dispatch now live in their dedicated sections. This view is focused solely on items currently sitting with your office."
          links={[
            { label: 'Department Files', href: '/correspondence/department-files' },
            { label: 'Outbox', href: '/correspondence/outbox' },
          ]}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Total in queue',
              value: summary.total,
              icon: Inbox,
              bgClass: 'bg-primary/10',
              iconClass: 'text-primary',
            },
            {
              label: 'Urgent items',
              value: summary.urgent,
              icon: AlertCircle,
              bgClass: 'bg-destructive/10',
              iconClass: 'text-destructive',
            },
            {
              label: 'SLA breaches',
              value: summary.overdue,
              icon: Clock,
              bgClass: 'bg-warning/10',
              iconClass: 'text-warning',
            },
            {
              label: 'Assigned to you',
              value: summary.assigned_to_user,
              icon: UserIcon,
              bgClass: 'bg-info/10',
              iconClass: 'text-info',
            },
          ].map(({ label, value, icon: Icon, bgClass, iconClass }) => (
            <Card key={label}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${bgClass}`}>
                    <Icon className={`h-6 w-6 ${iconClass}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-2xl font-semibold">{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="relative max-w-xl w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by subject, reference number, or sender..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {(userOfficeMemberships.length > 0 || isSuperuser) && (
            <div className="w-full md:w-80 space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Office Filter
              </Label>
              <Select value={selectedOfficeId} onValueChange={(value) => setSelectedOfficeId(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select office" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isSuperuser ? 'All offices' : 'All my offices'}</SelectItem>
                  {selectableOffices.map((office) => (
                    <SelectItem key={office.id} value={office.id}>
                      {office.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Filter className="h-3.5 w-3.5" />
            Queue Filters
          </Label>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((option) => (
              <Button
                key={option.value}
                variant={statusFilter === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(option.value)}
                className="text-xs"
              >
                {option.label}
              </Button>
            ))}
            <Button
              variant={assignedOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAssignedOnly((prev) => !prev)}
              className="text-xs flex items-center gap-2"
            >
              <UserIcon className="h-3.5 w-3.5" />
              Assigned to me
            </Button>
          </div>
        </div>

        {error && (
          <Card>
            <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Loading office queue…
            </CardContent>
          </Card>
        ) : inboxItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No correspondence routed to your office yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {inboxItems.map((corr) => (
              <CorrespondenceCard key={corr.id} corr={corr} />
            ))}
          </div>
        )}

        {pageCount > 1 && (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing page {page} of {pageCount} ({count} items)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
                disabled={page === pageCount}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CorrespondenceInbox;

