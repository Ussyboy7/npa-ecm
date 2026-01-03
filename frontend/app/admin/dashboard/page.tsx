"use client";

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  Shield,
  Building2,
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  CheckCircle,
  FileText,
  ArrowRight,
  Briefcase,
} from 'lucide-react';
import Link from 'next/link';
import { useOrganization } from '@/contexts/OrganizationContext';
import { apiFetch } from '@/lib/api-client';
import { formatDistanceToNow } from 'date-fns';
import { logError } from '@/lib/client-logger';

interface ActivityLogEntry {
  id: string;
  user: string;
  action: string;
  description: string;
  timestamp: string;
  module: string;
}

interface AdminStats {
  users: {
    total: number;
    active: number;
    inactive: number;
    new_this_week: number;
  };
  roles: {
    total: number;
    with_users: number;
  };
  organization: {
    directorates: number;
    divisions: number;
    departments: number;
  };
  activity: {
    today: number;
    this_week: number;
    this_month: number;
  };
}

export default function AdminDashboardPage() {
  const { users, roles, directorates, divisions, departments } = useOrganization();
  const [recentActivity, setRecentActivity] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const stats: AdminStats = {
    users: {
      total: users.length,
      active: users.filter(u => u.active).length,
      inactive: users.filter(u => !u.active).length,
      new_this_week: 0, // Will be calculated from API if needed
    },
    roles: {
      total: roles.length,
      with_users: roles.filter(r => (r.userCount || 0) > 0).length,
    },
    organization: {
      directorates: directorates.filter(d => d.isActive).length,
      divisions: divisions.filter(d => d.isActive).length,
      departments: departments.filter(d => d.isActive).length,
    },
    activity: {
      today: 0,
      this_week: 0,
      this_month: 0,
    },
  };

  useEffect(() => {
    loadRecentActivity();
  }, []);

  const loadRecentActivity = async () => {
    try {
      setLoading(true);
      const response = await apiFetch<{ results: ActivityLogEntry[] }>(
        '/audit/activity-logs/?module=organization,accounts&page_size=10&ordering=-timestamp'
      );
      setRecentActivity(response.results || []);
      } catch (error: unknown) {
      logError('Failed to load activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('CREATE')) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (action.includes('UPDATE')) return <Activity className="h-4 w-4 text-blue-500" />;
    if (action.includes('DELETE')) return <AlertCircle className="h-4 w-4 text-red-500" />;
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            Administration Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Overview of system administration and recent activities
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Users Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.users.total}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <span className="text-green-600 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {stats.users.new_this_week} new this week
                </span>
              </div>
              <div className="mt-2 flex gap-2">
                <Badge variant="outline" className="text-xs">
                  {stats.users.active} active
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {stats.users.inactive} inactive
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Roles Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Roles</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.roles.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.roles.with_users} roles assigned to users
              </p>
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  {stats.roles.total - stats.roles.with_users} unused
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Organization Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organization Units</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.organization.directorates + stats.organization.divisions + stats.organization.departments}
              </div>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <div>{stats.organization.directorates} Directorates</div>
                <div>{stats.organization.divisions} Divisions</div>
                <div>{stats.organization.departments} Departments</div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recentActivity.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Admin actions in the last hour
              </p>
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  Live monitoring
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/admin/users-roles?tab=users">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Users
                </Button>
              </Link>
              <Link href="/admin/users-roles?tab=roles">
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="h-4 w-4 mr-2" />
                  Manage Roles
                </Button>
              </Link>
              <Link href="/admin/users-roles?tab=assistants">
                <Button variant="outline" className="w-full justify-start">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Manage Assistants
                </Button>
              </Link>
              <Link href="/admin/organization">
                <Button variant="outline" className="w-full justify-start">
                  <Building2 className="h-4 w-4 mr-2" />
                  Organization Structure
                </Button>
              </Link>
              <Link href="/audit">
                <Button variant="outline" className="w-full justify-start">
                  <Activity className="h-4 w-4 mr-2" />
                  View Audit Logs
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Admin Activity</CardTitle>
                <CardDescription>Latest administrative actions across the system</CardDescription>
              </div>
              <Link href="/audit">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading activity...
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="mt-1">{getActionIcon(activity.action)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{activity.user}</p>
                        <Badge variant="outline" className="text-xs">
                          {activity.module}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

