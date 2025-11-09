"use client";

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpGuideCard } from '@/components/help/HelpGuideCard';
import { ContextualHelp } from '@/components/help/ContextualHelp';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Users,
  Mail,
  Send
} from 'lucide-react';
import { MOCK_USERS, MOCK_CORRESPONDENCE, DIVISIONS, type User } from '@/lib/npa-structure';
import { formatDateShort } from '@/lib/correspondence-helpers';
import Link from 'next/link';

const Dashboard = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUserId = localStorage.getItem('npa_demo_user_id');
    if (savedUserId) {
      const user = MOCK_USERS.find(u => u.id === savedUserId);
      if (user) setCurrentUser(user);
    } else {
      const md = MOCK_USERS.find(u => u.gradeLevel === 'MDCS');
      if (md) setCurrentUser(md);
    }
  }, []);

  if (!currentUser) return null;

  const division = DIVISIONS.find(d => d.id === currentUser.division);
  const pendingCorrespondence = MOCK_CORRESPONDENCE.filter(
    c => c.currentApproverId === currentUser.id || c.divisionId === currentUser.division
  );

  const stats = [
    {
      title: 'Pending Action',
      value: pendingCorrespondence.length.toString(),
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'In Progress',
      value: MOCK_CORRESPONDENCE.filter(c => c.status === 'in-progress').length.toString(),
      icon: Send,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: 'Completed Today',
      value: '0',
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Urgent Items',
      value: MOCK_CORRESPONDENCE.filter(c => c.priority === 'urgent').length.toString(),
      icon: AlertCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ];

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

