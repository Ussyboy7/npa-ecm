"use client";

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Mail,
  Send,
  AlertTriangle,
  Layers,
  Building2,
  Search,
  Loader2,
  Users,
} from 'lucide-react';
import { useCorrespondence } from '@/contexts/CorrespondenceContext';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOrganization } from '@/contexts/OrganizationContext';
import { formatDateShort } from '@/lib/correspondence-helpers';
import Link from 'next/link';
import {
  ExecutivePortfolio,
  ExecutiveRecord,
  fetchExecutivePortfolio,
  searchExecutiveRecords,
} from '@/lib/analytics-client';

const Dashboard = () => {
  const { correspondence, minutes } = useCorrespondence();
  const { currentUser, hydrated } = useCurrentUser();
  const { divisions, officeMemberships, offices } = useOrganization();
  const [recordsQuery, setRecordsQuery] = useState('');
  const [executiveRange, setExecutiveRange] = useState<string>('30');
  const [executivePortfolio, setExecutivePortfolio] = useState<ExecutivePortfolio | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [recordsResults, setRecordsResults] = useState<ExecutiveRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const division = useMemo(() => {
    if (!currentUser?.division) return undefined;
    return divisions.find((item) => item.id === currentUser.division);
  }, [currentUser?.division, divisions]);

  const pendingCorrespondence = useMemo(() => {
    if (!currentUser) return [];
    const userDivisionId = currentUser.division;

    return correspondence
      .filter((item) => {
        if (item.status === 'completed') return false;
        if (item.currentApproverId === currentUser.id) return true;
        if (userDivisionId && item.divisionId === userDivisionId) return true;
        return false;
      })
      .sort((a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime());
  }, [correspondence, currentUser]);

  const stats = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const inProgress = correspondence.filter((item) => item.status === 'in-progress').length;
    const urgent = correspondence.filter(
      (item) => item.priority === 'urgent' && item.status !== 'completed',
    ).length;
    const completedToday = correspondence.filter((item) => {
      if (item.status !== 'completed') return false;
      const referenceDate = item.updatedAt ?? item.receivedDate;
      return new Date(referenceDate).getTime() >= startOfToday.getTime();
    }).length;

    return [
      {
        title: 'Pending Action',
        value: pendingCorrespondence.length.toString(),
        icon: Clock,
        color: 'text-warning',
        bgColor: 'bg-warning/10',
      },
      {
        title: 'In Progress',
        value: inProgress.toString(),
        icon: Send,
        color: 'text-info',
        bgColor: 'bg-info/10',
      },
      {
        title: 'Completed Today',
        value: completedToday.toString(),
        icon: CheckCircle,
        color: 'text-success',
        bgColor: 'bg-success/10',
      },
      {
        title: 'Urgent Items',
        value: urgent.toString(),
        icon: AlertCircle,
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
      },
    ];
  }, [correspondence, pendingCorrespondence.length]);

  const userOfficeMemberships = useMemo(() => {
    if (!currentUser) return [];
    return officeMemberships.filter(
      (membership) => membership.userId === currentUser.id && membership.isActive,
    );
  }, [currentUser, officeMemberships]);

  const officeAssignments = useMemo(() => {
    return userOfficeMemberships
      .map((membership) => {
        const office = offices.find((item) => item.id === membership.officeId);
        if (!office) return null;
        return { membership, office };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }, [userOfficeMemberships, offices]);

  const executiveOfficeTypes = new Set(['md', 'ed', 'gm', 'agm']);
  const isExecutive = officeAssignments.some((assignment) =>
    executiveOfficeTypes.has(assignment.office.officeType),
  );

  useEffect(() => {
    if (!isExecutive) {
      setExecutivePortfolio(null);
      setRecordsResults([]);
      setPortfolioError(null);
      return;
    }
    let ignore = false;
    setPortfolioLoading(true);
    setPortfolioError(null);
    fetchExecutivePortfolio({ range: executiveRange, records: 8 })
      .then((data) => {
        if (ignore) return;
        setExecutivePortfolio(data);
        setRecordsResults(data.records);
      })
      .catch((error) => {
        if (ignore) return;
        setPortfolioError(error instanceof Error ? error.message : 'Unable to load executive overview');
      })
      .finally(() => {
        if (!ignore) {
          setPortfolioLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [isExecutive, executiveRange]);

  useEffect(() => {
    if (!isExecutive) return;
    const query = recordsQuery.trim();
    if (!query) {
      setRecordsResults(executivePortfolio?.records ?? []);
      setRecordsLoading(false);
      return;
    }
    let ignore = false;
    setRecordsLoading(true);
    const handle = setTimeout(() => {
      searchExecutiveRecords({ query })
        .then((data) => {
          if (!ignore) {
            setRecordsResults(data.results);
          }
        })
        .catch(() => {
          if (!ignore) {
            setRecordsResults([]);
          }
        })
        .finally(() => {
          if (!ignore) {
            setRecordsLoading(false);
          }
        });
    }, 400);
    return () => {
      ignore = true;
      clearTimeout(handle);
    };
  }, [isExecutive, recordsQuery, executivePortfolio]);

  const officeWorkload = useMemo(() => {
    if (!isExecutive || !executivePortfolio) return [];
    return executivePortfolio.offices.map((office) => ({
      id: office.id,
      name: office.name,
      officeType: office.officeType,
      total: office.total,
      urgent: office.urgent,
      overdue: office.slaBreaches,
      approaching: office.approachingSLA,
    }));
  }, [isExecutive, executivePortfolio]);

  const escalationItems = useMemo(() => {
    if (!isExecutive || !executivePortfolio) return [];
    return executivePortfolio.escalations;
  }, [executivePortfolio, isExecutive]);

  const executiveStats = useMemo(() => {
    if (!isExecutive || !executivePortfolio) return [];
    const summary = executivePortfolio.summary;
    return [
      {
        title: 'Office Workload',
        value: summary.totalQueue.toString(),
        icon: Layers,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
      },
      {
        title: 'Urgent Items',
        value: summary.urgent.toString(),
        icon: AlertTriangle,
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
      },
      {
        title: 'SLA Breaches',
        value: summary.slaBreaches.toString(),
        icon: AlertCircle,
        color: 'text-warning',
        bgColor: 'bg-warning/10',
      },
      {
        title: 'Completion Rate',
        value: `${summary.completionRate ?? 0}%`,
        icon: Building2,
        color: 'text-success',
        bgColor: 'bg-success/10',
      },
    ];
  }, [executivePortfolio, isExecutive]);

  const executiveRecords = useMemo(() => {
    if (!isExecutive) return [];
    return recordsResults;
  }, [isExecutive, recordsResults]);

  const inboxPreview = executivePortfolio?.inboxPreview ?? [];
  const approvalsList = executivePortfolio?.approvals ?? [];
  const delegationSnapshot = executivePortfolio?.delegations ?? [];

  if (!hydrated) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <Card className="shadow-soft">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Loading dashboard…
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!currentUser) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <HelpGuideCard
            title="Select a persona"
            description="Use the Role Switcher to choose a user context after signing in."
            links={[{ label: 'Role Switcher', href: '/settings' }]}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {currentUser.name.split(' ')[0]}
            </h1>
            <p className="text-muted-foreground mt-1">
              {currentUser.systemRole}
              {division && ` - ${division.name}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ContextualHelp
              title="How to use the Dashboard"
              description="Switch personas with the Role Switcher to see different perspectives. Use the cards below to monitor workload, then jump into the inbox or DMS from the quick links."
              steps={[
                "Use Role Switcher in the top bar to change persona.",
                "Review pending actions and urgent items.",
                "Open a correspondence or document directly from the lists."
              ]}
            />
            <Badge variant="outline" className="text-sm px-4 py-2">
              {currentUser.employeeId}
            </Badge>
          </div>
        </div>

        <HelpGuideCard
          title="Dashboard Overview"
          description="Track high-level workload, recent correspondence, and divisional performance for your current persona. Use the Role Switcher to see how metrics change for MD, ED, GM, and departmental views."
          links={[
            { label: "Role Switcher", href: "/settings" },
            { label: "Help & Guides", href: "/help" },
          ]}
        />

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="shadow-soft hover:shadow-medium transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`${stat.bgColor} p-2 rounded-lg`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {isExecutive && (
          <>
            <Card className="shadow-soft">
              <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    Executive Overview
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Multi-office workload, SLA breaches, and completion trends for your portfolio.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {portfolioLoading && (
                    <Badge variant="outline" className="gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Refreshing
                    </Badge>
                  )}
                  <Select value={executiveRange} onValueChange={setExecutiveRange} disabled={portfolioLoading}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {portfolioError && (
                  <p className="text-sm text-destructive mb-3">{portfolioError}</p>
                )}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {executiveStats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                      <Card key={index} className="shadow-soft border border-border/60">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            {stat.title}
                          </CardTitle>
                          <div className={`${stat.bgColor} p-2 rounded-lg`}>
                            <Icon className={`h-4 w-4 ${stat.color}`} />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{stat.value}</div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {!portfolioLoading && executiveStats.length === 0 && (
                    <p className="text-sm text-muted-foreground col-span-full">
                      No executive data available for this range.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Office Queues
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Workload across the offices you oversee. Use this to rebalance or delegate.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {officeWorkload.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {portfolioLoading ? 'Loading offices…' : 'No offices assigned.'}
                    </p>
                  ) : (
                    officeWorkload.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between border border-border rounded-lg p-3"
                      >
                        <div>
                          <p className="font-semibold">{entry.name}</p>
                          <p className="text-xs text-muted-foreground uppercase">
                            {entry.officeType}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-center">
                            <p className="font-bold">{entry.total}</p>
                            <p className="text-xs text-muted-foreground">In Queue</p>
                          </div>
                          <div className="text-center">
                            <p className="font-bold text-destructive">{entry.urgent}</p>
                            <p className="text-xs text-muted-foreground">Urgent</p>
                          </div>
                          <div className="text-center">
                            <p className="font-bold text-warning">{entry.overdue}</p>
                            <p className="text-xs text-muted-foreground">SLA Breach</p>
                          </div>
                          <div className="text-center">
                            <p className="font-bold text-muted-foreground">{entry.approaching}</p>
                            <p className="text-xs text-muted-foreground">Approaching</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    Combined Office Inbox
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    View urgent and aging correspondence across every office you oversee.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {inboxPreview.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {portfolioLoading ? 'Loading inbox data…' : 'No open correspondence in your offices.'}
                    </p>
                  ) : (
                    inboxPreview.map((item) => (
                      <Link
                        key={item.id}
                        href={`/correspondence/${item.id}`}
                        className="block border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold truncate">{item.subject}</p>
                          <Badge
                            variant={
                              item.slaStatus === 'breach'
                                ? 'destructive'
                                : item.slaStatus === 'approaching'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {item.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Ref: {item.referenceNumber} • Office: {item.officeName ?? 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Aging: {item.agingDays} days • SLA: {item.slaStatus.toUpperCase()}
                        </p>
                      </Link>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    Escalations & Approvals
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    High-priority items awaiting executive treatment or delegation.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Escalations
                    </p>
                    {escalationItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No escalations detected in your offices.
                      </p>
                    ) : (
                      escalationItems.map((item) => (
                        <Link
                          key={item.id}
                          href={`/correspondence/${item.id}`}
                          className="block border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold truncate">{item.subject}</p>
                            <Badge variant="destructive">{item.priority}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Ref: {item.referenceNumber} • Office: {item.officeName ?? 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Received: {item.receivedDate ? formatDateShort(item.receivedDate) : '—'}
                          </p>
                        </Link>
                      ))
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Awaiting Executive Approval
                    </p>
                    {approvalsList.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No approvals pending your action.
                      </p>
                    ) : (
                      approvalsList.map((item) => (
                        <Link
                          key={item.id}
                          href={`/correspondence/${item.id}`}
                          className="block border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold truncate">{item.subject}</p>
                            <Badge variant="outline">{item.priority}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Ref: {item.referenceNumber} • Office: {item.officeName ?? 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Aging: {item.agingDays} days
                          </p>
                        </Link>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Delegation Panel
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    See who currently represents each office and quickly identify acting officers.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {delegationSnapshot.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No delegation data available for your offices.
                    </p>
                  ) : (
                    delegationSnapshot.map((entry) => (
                      <div key={entry.officeId} className="border border-border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{entry.officeName}</p>
                            <p className="text-xs text-muted-foreground">
                              {entry.members.length} active assignment{entry.members.length === 1 ? '' : 's'}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {entry.members.map((member) => (
                            <Badge
                              key={member.userId + member.role}
                              variant={member.isPrimary ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {member.name} • {member.role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-secondary" />
                  Records & Intelligence
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Search archived correspondence across your offices and directorates.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative max-w-xl">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={recordsQuery}
                    onChange={(event) => setRecordsQuery(event.target.value)}
                    placeholder="Search records by subject, reference, or participant..."
                    className="pl-10"
                  />
                </div>
                {recordsLoading && (
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Searching records…
                  </p>
                )}
                {executiveRecords.length === 0 && !recordsLoading ? (
                  <p className="text-sm text-muted-foreground">
                    No archived correspondence matches this search.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {executiveRecords.map((item) => (
                      <Link
                        key={item.id}
                        href={`/correspondence/${item.id}`}
                        className="block border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold truncate">{item.subject}</p>
                          <Badge variant="outline">{item.owningOffice ?? 'Office Record'}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Ref: {item.referenceNumber} • Completed:{' '}
                          {item.updatedAt ? formatDateShort(item.updatedAt) : '—'}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Recent Correspondence */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Recent Correspondence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingCorrespondence.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No pending correspondence</p>
                </div>
              ) : (
                pendingCorrespondence.map(corr => (
                  <Link
                    key={corr.id}
                    href={`/correspondence/${corr.id}`}
                    className="flex items-start gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer block"
                  >
                    <div className={`p-2 rounded-lg ${
                      corr.priority === 'urgent' ? 'bg-destructive/10' :
                      corr.priority === 'high' ? 'bg-warning/10' :
                      'bg-primary/10'
                    }`}>
                      <Mail className={`h-5 w-5 ${
                        corr.priority === 'urgent' ? 'text-destructive' :
                        corr.priority === 'high' ? 'text-warning' :
                        'text-primary'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm truncate">{corr.subject}</h4>
                        <Badge variant={corr.priority === 'urgent' ? 'destructive' : 'secondary'}>
                          {corr.priority}
                        </Badge>
                        <Badge variant="outline">
                          {corr.direction === 'downward' ? '↓ Downward' : '↑ Upward'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        From: {corr.senderName} • Ref: {corr.referenceNumber}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Received: {formatDateShort(corr.receivedDate)}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/correspondence/register">
            <Card className="shadow-soft hover:shadow-medium transition-shadow cursor-pointer border-primary/20 hover:border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5 text-primary" />
                  Create Document
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Start a new memo or internal document
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/correspondence/register">
            <Card className="shadow-soft hover:shadow-medium transition-shadow cursor-pointer border-secondary/20 hover:border-secondary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mail className="h-5 w-5 text-secondary" />
                  Register Correspondence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Register incoming external correspondence
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/analytics">
            <Card className="shadow-soft hover:shadow-medium transition-shadow cursor-pointer border-success/20 hover:border-success">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5 text-success" />
                  View Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Track performance and turnaround times
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;

