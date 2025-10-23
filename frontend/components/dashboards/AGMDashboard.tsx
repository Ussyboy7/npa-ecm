"use client";

import {
  Clock,
  CheckCircle,
  Users,
  BarChart3,
  Upload,
  Activity,
  RotateCcw,
  Forward,
  Building,
  Timer,
  Target
} from "lucide-react";
import Link from "next/link";

export default function AGMDashboard() {
  // Mock data for AGM (Assistant General Manager)
  const stats = [
    {
      name: "Pending Departmental Approvals",
      value: "8",
      change: "+3",
      changeType: "warning",
      icon: Clock,
      description: "Awaiting AGM decision",
      href: "/approvals/departmental"
    },
    {
      name: "Documents by Officer",
      value: "156",
      change: "+18%",
      changeType: "positive",
      icon: Users,
      description: "This quarter",
      href: "/reports/officer-activity"
    },
    {
      name: "Departmental Turnaround",
      value: "3.2 days",
      change: "-0.5 days",
      changeType: "positive",
      icon: Timer,
      description: "Average approval time",
      href: "/reports/turnaround"
    },
    {
      name: "Department Overview",
      value: "94%",
      change: "+2%",
      changeType: "positive",
      icon: Target,
      description: "Compliance rate",
      href: "/department/overview"
    }
  ];

  const departmentalApprovals = [
    {
      id: 1,
      reference: "NPA/ICT/2025/0156",
      title: "Annual ICT Budget Proposal 2025",
      submittedBy: "Principal Manager - ICT",
      department: "ICT",
      priority: "High",
      submittedDate: "2025-01-15",
      amount: "₦250,000,000",
      nextStep: "Forward to GM ICT"
    },
    {
      id: 2,
      reference: "NPA/ICT/2025/0148",
      title: "Staff Performance Review System",
      submittedBy: "Principal Manager - ICT",
      department: "ICT",
      priority: "Medium",
      submittedDate: "2025-01-12",
      amount: "₦15,000,000",
      nextStep: "Forward to GM ICT"
    },
    {
      id: 3,
      reference: "NPA/ICT/2025/0142",
      title: "Data Center Expansion Plan",
      submittedBy: "Principal Manager - ICT",
      department: "ICT",
      priority: "High",
      submittedDate: "2025-01-10",
      amount: "₦180,000,000",
      nextStep: "Forward to GM ICT"
    },
    {
      id: 4,
      reference: "NPA/ICT/2025/0138",
      title: "Cybersecurity Framework Update",
      submittedBy: "Principal Manager - ICT",
      department: "ICT",
      priority: "High",
      submittedDate: "2025-01-08",
      amount: "₦35,000,000",
      nextStep: "Forward to GM ICT"
    }
  ];

  const officerActivity = [
    {
      officer: "Principal Manager - Software",
      documents: 23,
      approved: 18,
      pending: 3,
      returned: 2,
      avgTime: "2.1 days",
      status: "Active"
    },
    {
      officer: "Principal Manager - Networks",
      documents: 19,
      approved: 16,
      pending: 2,
      returned: 1,
      avgTime: "2.8 days",
      status: "Active"
    },
    {
      officer: "Principal Manager - Hardware",
      documents: 15,
      approved: 12,
      pending: 1,
      returned: 2,
      avgTime: "3.2 days",
      status: "Active"
    },
    {
      officer: "Principal Manager - Database",
      documents: 12,
      approved: 10,
      pending: 1,
      returned: 1,
      avgTime: "1.9 days",
      status: "Active"
    }
  ];

  const departmentalMetrics = [
    {
      metric: "Total Departmental Budget Requests",
      value: "₦480M",
      period: "This Quarter",
      trend: "+15%",
      status: "normal"
    },
    {
      metric: "Average Approval Time",
      value: "3.2 days",
      period: "Last 30 days",
      trend: "-12%",
      status: "positive"
    },
    {
      metric: "Compliance Rate",
      value: "94%",
      period: "This Month",
      trend: "+2%",
      status: "positive"
    },
    {
      metric: "Pending High Priority Items",
      value: "5",
      period: "Current",
      trend: "+2",
      status: "warning"
    }
  ];

  const recentDepartmentalActivity = [
    {
      id: 1,
      type: "approval",
      title: "ICT Budget Proposal Approved",
      description: "Forwarded to GM ICT for final review",
      officer: "Principal Manager - Software",
      time: "2 hours ago",
      amount: "₦250M"
    },
    {
      id: 2,
      type: "submission",
      title: "New Cybersecurity Framework Submitted",
      description: "Requires AGM review and approval",
      officer: "Principal Manager - Networks",
      time: "4 hours ago",
      amount: "₦35M"
    },
    {
      id: 3,
      type: "return",
      title: "Data Center Plan Returned",
      description: "Additional cost breakdown requested",
      officer: "Principal Manager - Hardware",
      time: "1 day ago",
      amount: "₦180M"
    },
    {
      id: 4,
      type: "approval",
      title: "Staff Training Program Approved",
      description: "Forwarded to GM ICT",
      officer: "Principal Manager - Software",
      time: "2 days ago",
      amount: "₦12M"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AGM Dashboard - ICT Department</h1>
          <p className="text-gray-600">Oversee departmental operations, approve major initiatives, and manage team performance</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/department/overview"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Building className="w-4 h-4 mr-2" />
            Department Overview
          </Link>
          <Link
            href="/reports/departmental"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Departmental Reports
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Departmental Approvals */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Pending Departmental Approvals</h2>
            <Link
              href="/approvals/departmental"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all ({departmentalApprovals.length})
            </Link>
          </div>
          <div className="space-y-4">
            {departmentalApprovals.map((approval) => (
              <DepartmentalApprovalItem key={approval.id} approval={approval} />
            ))}
          </div>
        </div>

        {/* Departmental Metrics */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Departmental Metrics</h2>
            <Link
              href="/reports/metrics"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View details
            </Link>
          </div>
          <div className="space-y-4">
            {departmentalMetrics.map((metric, index) => (
              <MetricItem key={index} metric={metric} />
            ))}
          </div>
        </div>
      </div>

      {/* Officer Activity Table */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Documents by Officer</h2>
          <Link
            href="/reports/officer-activity"
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
                  Officer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Docs
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Approved
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pending
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Returned
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg. Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {officerActivity.map((officer, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {officer.officer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {officer.documents}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                    {officer.approved}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 font-medium">
                    {officer.pending}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                    {officer.returned}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {officer.avgTime}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      {officer.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Departmental Activity */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Recent Departmental Activity</h2>
          <Link
            href="/department/activity"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all activity
          </Link>
        </div>
        <div className="space-y-4">
          {recentDepartmentalActivity.map((activity) => (
            <DepartmentalActivityItem key={activity.id} activity={activity} />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <QuickActionButton
            title="Approve & Forward"
            description="Approve and send to GM"
            icon={Forward}
            href="/approvals/forward-gm"
            color="bg-blue-50 text-blue-600 hover:bg-blue-100"
          />
          <QuickActionButton
            title="Return for Revision"
            description="Send back to Principal Manager"
            icon={RotateCcw}
            href="/approvals/return-pm"
            color="bg-orange-50 text-orange-600 hover:bg-orange-100"
          />
          <QuickActionButton
            title="Departmental Reports"
            description="View department analytics"
            icon={BarChart3}
            href="/reports/department"
            color="bg-green-50 text-green-600 hover:bg-green-100"
          />
          <QuickActionButton
            title="Team Performance"
            description="Monitor officer productivity"
            icon={Users}
            href="/team/performance"
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

function DepartmentalApprovalItem({ approval }: { approval: any }) {
  const priorityColorMap = {
    High: "bg-red-100 text-red-800",
    Medium: "bg-yellow-100 text-yellow-800",
    Low: "bg-green-100 text-green-800"
  };
  const priorityColor = priorityColorMap[approval.priority as keyof typeof priorityColorMap] || "bg-gray-100 text-gray-800";

  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h4 className="text-sm font-medium text-gray-900">{approval.title}</h4>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColor}`}>
              {approval.priority}
            </span>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Reference: <span className="font-mono">{approval.reference}</span></p>
            <p>Submitted by: {approval.submittedBy}</p>
            <p>Amount: <span className="font-semibold">{approval.amount}</span></p>
            <p>Submitted: {approval.submittedDate}</p>
          </div>
          <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
            Next Step: {approval.nextStep}
          </div>
        </div>
        <div className="flex space-x-2 ml-4">
          <Link
            href={`/approvals/${approval.id}/review`}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
          >
            Review
          </Link>
          <Link
            href={`/approvals/${approval.id}/forward`}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Forward
          </Link>
        </div>
      </div>
    </div>
  );
}

function MetricItem({ metric }: { metric: any }) {
  const statusColorMap = {
    positive: "text-green-600 bg-green-100",
    warning: "text-yellow-600 bg-yellow-100",
    normal: "text-blue-600 bg-blue-100",
    negative: "text-red-600 bg-red-100"
  };
  const statusColor = statusColorMap[metric.status as keyof typeof statusColorMap] || "text-gray-600 bg-gray-100";

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div>
        <h4 className="text-sm font-medium text-gray-900">{metric.metric}</h4>
        <p className="text-xs text-gray-500">{metric.period}</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold text-gray-900">{metric.value}</p>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
          {metric.trend}
        </span>
      </div>
    </div>
  );
}

function DepartmentalActivityItem({ activity }: { activity: any }) {
  const typeIconMap = {
    approval: CheckCircle,
    submission: Upload,
    return: RotateCcw
  };
  const typeIcon = typeIconMap[activity.type as keyof typeof typeIconMap] || Activity;

  const typeColorMap = {
    approval: "text-green-600 bg-green-100",
    submission: "text-blue-600 bg-blue-100",
    return: "text-orange-600 bg-orange-100"
  };
  const typeColor = typeColorMap[activity.type as keyof typeof typeColorMap] || "text-gray-600 bg-gray-100";

  const Icon = typeIcon;

  return (
    <div className="flex items-start space-x-4">
      <div className={`flex-shrink-0 p-2 rounded-lg ${typeColor.replace('text-', 'bg-').replace('600', '100')}`}>
        <Icon className={`h-5 w-5 ${typeColor.split(' ')[0]}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">{activity.title}</h4>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeColor}`}>
            {activity.type}
          </span>
        </div>
        <p className="text-sm text-gray-600">{activity.description}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-500">By {activity.officer}</p>
          <p className="text-xs text-gray-500">{activity.time}</p>
        </div>
        {activity.amount && (
          <p className="text-sm font-medium text-gray-900 mt-1">{activity.amount}</p>
        )}
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

