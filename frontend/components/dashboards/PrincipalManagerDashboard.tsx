"use client";

import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  BarChart3,
  Upload,
  Activity,
  Edit,
  Send,
  Mail,
  Plus,
  UserCheck,
  RotateCcw,
  Forward
} from "lucide-react";
import Link from "next/link";

export default function PrincipalManagerDashboard() {
  // Mock data for Principal Manager
  const stats = [
    {
      name: "Pending Reviews",
      value: "5",
      change: "+2",
      changeType: "warning",
      icon: Clock,
      description: "Awaiting my approval",
      href: "/approvals/pending"
    },
    {
      name: "Returned Memos",
      value: "3",
      change: "-1",
      changeType: "negative",
      icon: RotateCcw,
      description: "Sent back for revision",
      href: "/memos?status=returned"
    },
    {
      name: "Recently Approved",
      value: "18",
      change: "+12%",
      changeType: "positive",
      icon: CheckCircle,
      description: "This week",
      href: "/memos?status=approved&period=week"
    },
    {
      name: "Team Submissions",
      value: "24",
      change: "+8%",
      changeType: "positive",
      icon: Users,
      description: "From officers this month",
      href: "/memos/team"
    }
  ];

  const pendingApprovals = [
    {
      id: 1,
      reference: "NPA/ICT/2025/0123",
      title: "Server Infrastructure Upgrade Proposal",
      submittedBy: "Senior Officer - Software",
      submittedDate: "2025-01-15",
      department: "ICT",
      priority: "High",
      dueDate: "2025-01-20",
      comments: "Requires AGM approval after PM review"
    },
    {
      id: 2,
      reference: "NPA/ICT/2025/0120",
      title: "Software License Budget Request",
      submittedBy: "Officer - Software",
      submittedDate: "2025-01-14",
      department: "ICT",
      priority: "Medium",
      dueDate: "2025-01-18",
      comments: "Annual license renewal for development tools"
    },
    {
      id: 3,
      reference: "NPA/ICT/2025/0118",
      title: "Network Security Enhancement",
      submittedBy: "Senior Officer - Networks",
      submittedDate: "2025-01-12",
      department: "ICT",
      priority: "High",
      dueDate: "2025-01-16",
      comments: "Critical security improvements needed"
    },
    {
      id: 4,
      reference: "NPA/ICT/2025/0115",
      title: "Staff Training Program",
      submittedBy: "Officer - Software",
      submittedDate: "2025-01-10",
      department: "ICT",
      priority: "Medium",
      dueDate: "2025-01-22",
      comments: "Capacity building for technical staff"
    },
    {
      id: 5,
      reference: "NPA/ICT/2025/0110",
      title: "Hardware Procurement Plan",
      submittedBy: "Senior Officer - Hardware",
      submittedDate: "2025-01-08",
      department: "ICT",
      priority: "High",
      dueDate: "2025-01-15",
      comments: "Urgent replacement of aging equipment"
    }
  ];

  const teamActivity = [
    {
      id: 1,
      officer: "Senior Officer - Software",
      action: "Submitted memo for approval",
      item: "Server Infrastructure Upgrade Proposal",
      time: "2 hours ago",
      status: "Pending Review"
    },
    {
      id: 2,
      officer: "Officer - Networks",
      action: "Revised and resubmitted",
      item: "Network Security Enhancement",
      time: "4 hours ago",
      status: "Under Review"
    },
    {
      id: 3,
      officer: "Senior Officer - Hardware",
      action: "Memo approved and forwarded",
      item: "Hardware Procurement Plan",
      time: "1 day ago",
      status: "Approved"
    },
    {
      id: 4,
      officer: "Officer - Software",
      action: "Memo returned for correction",
      item: "Staff Training Program",
      time: "2 days ago",
      status: "Returned"
    }
  ];

  const approvalMetrics = [
    {
      period: "This Week",
      approved: 12,
      returned: 3,
      pending: 5,
      avgTime: "2.3 days"
    },
    {
      period: "Last Week",
      approved: 15,
      returned: 2,
      pending: 0,
      avgTime: "1.8 days"
    },
    {
      period: "This Month",
      approved: 45,
      returned: 8,
      pending: 5,
      avgTime: "2.1 days"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Principal Manager Dashboard</h1>
          <p className="text-gray-600">Review and approve departmental memos and manage team workflows</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/approvals/pending"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Clock className="w-4 h-4 mr-2" />
            Pending Approvals
          </Link>
          <Link
            href="/reports/department"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Department Report
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.name} stat={stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Approvals */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Pending Approvals</h2>
              <Link
                href="/approvals/pending"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View all ({pendingApprovals.length})
              </Link>
            </div>
            <div className="space-y-4">
              {pendingApprovals.map((approval) => (
                <ApprovalItem key={approval.id} approval={approval} />
              ))}
            </div>
          </div>
        </div>

        {/* Team Activity */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Team Activity</h2>
              <Link
                href="/team/activity"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View all
              </Link>
            </div>
            <div className="space-y-4">
              {teamActivity.map((activity) => (
                <TeamActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Approval Metrics */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Approval Metrics</h2>
          <Link
            href="/reports/metrics"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View detailed report
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Approved
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Returned
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pending
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg. Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {approvalMetrics.map((metric, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {metric.period}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                    {metric.approved}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                    {metric.returned}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 font-medium">
                    {metric.pending}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {metric.avgTime}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <QuickActionButton
            title="Approve Memo"
            description="Quick approve action"
            icon={UserCheck}
            href="/approvals/quick-approve"
            color="bg-green-50 text-green-600 hover:bg-green-100"
          />
          <QuickActionButton
            title="Return with Comments"
            description="Send back for revision"
            icon={RotateCcw}
            href="/approvals/return"
            color="bg-orange-50 text-orange-600 hover:bg-orange-100"
          />
          <QuickActionButton
            title="Forward to AGM"
            description="Escalate to AGM"
            icon={Forward}
            href="/approvals/forward"
            color="bg-blue-50 text-blue-600 hover:bg-blue-100"
          />
          <QuickActionButton
            title="Team Performance"
            description="View officer stats"
            icon={BarChart3}
            href="/reports/team"
            color="bg-purple-50 text-purple-600 hover:bg-purple-100"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ stat }: { stat: any }) {
  const Icon = stat.icon;
  const changeColorMap = {
    positive: "text-green-600",
    negative: "text-red-600",
    warning: "text-yellow-600",
    neutral: "text-gray-600"
  };
  const changeColor = changeColorMap[stat.changeType as keyof typeof changeColorMap] || "text-gray-600";

  return (
    <Link href={stat.href} className="block">
      <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{stat.name}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.description}</p>
          </div>
          <Icon className="h-8 w-8 text-gray-400" />
        </div>
        <div className="mt-4 flex items-center">
          <span className={`text-sm font-medium ${changeColor}`}>{stat.change}</span>
        </div>
      </div>
    </Link>
  );
}

function ApprovalItem({ approval }: { approval: any }) {
  const priorityColorMap = {
    High: "bg-red-100 text-red-800",
    Medium: "bg-yellow-100 text-yellow-800",
    Low: "bg-green-100 text-green-800"
  };
  const priorityColor = priorityColorMap[approval.priority as keyof typeof priorityColorMap] || "bg-gray-100 text-gray-800";

  const isOverdue = new Date(approval.dueDate) < new Date();

  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h4 className="text-sm font-medium text-gray-900">{approval.title}</h4>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColor}`}>
              {approval.priority}
            </span>
            {isOverdue && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                Overdue
              </span>
            )}
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Reference: <span className="font-mono">{approval.reference}</span></p>
            <p>Submitted by: {approval.submittedBy}</p>
            <p>Department: {approval.department}</p>
            <p>Due: {approval.dueDate}</p>
          </div>
          {approval.comments && (
            <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
              {approval.comments}
            </div>
          )}
        </div>
        <div className="flex space-x-2 ml-4">
          <Link
            href={`/memos/${approval.id}/review`}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
          >
            Review
          </Link>
          <Link
            href={`/memos/${approval.id}`}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            View
          </Link>
        </div>
      </div>
    </div>
  );
}

function TeamActivityItem({ activity }: { activity: any }) {
  const statusColorMap = {
    'Approved': 'text-green-600 bg-green-100',
    'Pending Review': 'text-yellow-600 bg-yellow-100',
    'Under Review': 'text-blue-600 bg-blue-100',
    'Returned': 'text-orange-600 bg-orange-100'
  };
  const statusColor = statusColorMap[activity.status as keyof typeof statusColorMap] || 'text-gray-600 bg-gray-100';

  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <Users className="w-4 h-4 text-blue-600" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">{activity.officer}</p>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
            {activity.status}
          </span>
        </div>
        <p className="text-sm text-gray-600">{activity.action}</p>
        <p className="text-xs text-gray-500">{activity.item}</p>
        <p className="text-xs text-gray-400">{activity.time}</p>
      </div>
    </div>
  );
}

function QuickActionButton({
  title,
  description,
  icon: Icon,
  href,
  color
}: {
  title: string;
  description: string;
  icon: any;
  href: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className={`p-4 rounded-lg transition-colors ${color}`}
    >
      <Icon className="h-8 w-8 mb-3" />
      <h3 className="font-medium text-sm">{title}</h3>
      <p className="text-xs opacity-75">{description}</p>
    </Link>
  );
}
