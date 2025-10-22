"use client";

import { useState } from "react";
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
  Forward,
  Inbox,
  List,
  Crown,
  MessageSquare
} from "lucide-react";
import Link from "next/link";

export default function MDDashboard() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'secretary'>('inbox');

  // Mock data for MD
  const stats = [
    {
      name: "Pending for My Review",
      value: "12",
      change: "+3",
      changeType: "warning",
      icon: Clock,
      description: "Direct to MD",
      href: "/inbox/direct"
    },
    {
      name: "Recently Minuted Items",
      value: "8",
      change: "+5",
      changeType: "positive",
      icon: MessageSquare,
      description: "This week",
      href: "/inbox/minuted"
    },
    {
      name: "Performance Summary",
      value: "94%",
      change: "+2%",
      changeType: "positive",
      icon: TrendingUp,
      description: "Division compliance",
      href: "/reports/performance"
    },
    {
      name: "Total Requests Approved",
      value: "156",
      change: "+18%",
      changeType: "positive",
      icon: CheckCircle,
      description: "This month",
      href: "/reports/approvals"
    }
  ];

  const myInboxItems = [
    {
      id: 1,
      type: "memo",
      reference: "NPA/ICT/2025/0189",
      title: "Annual ICT Strategic Plan 2025",
      sender: "GM ICT",
      submittedDate: "2025-01-15",
      priority: "High",
      status: "Pending Review",
      secretaryReviewed: true,
      secretaryNotes: "Strategic initiative requiring MD attention. Budget implications: ₦500M",
      category: "Strategic Planning"
    },
    {
      id: 2,
      type: "memo",
      reference: "NPA/HR/2025/0145",
      title: "Executive Compensation Review",
      sender: "GM Human Resources",
      submittedDate: "2025-01-14",
      priority: "Confidential",
      status: "Pending Review",
      secretaryReviewed: true,
      secretaryNotes: "Sensitive HR matter. Reviewed compensation framework.",
      category: "Human Resources"
    },
    {
      id: 3,
      type: "correspondence",
      reference: "NPA/CORR/IN/2025/0067",
      title: "Federal Ministry of Transportation - Port Security Directive",
      sender: "Federal Ministry of Transportation",
      submittedDate: "2025-01-13",
      priority: "High",
      status: "Pending Review",
      secretaryReviewed: false,
      secretaryNotes: "",
      category: "Regulatory"
    },
    {
      id: 4,
      type: "memo",
      reference: "NPA/ADMIN/2025/0123",
      title: "Headquarters Building Maintenance Contract",
      sender: "GM Administration",
      submittedDate: "2025-01-12",
      priority: "Medium",
      status: "Pending Review",
      secretaryReviewed: true,
      secretaryNotes: "Maintenance contract renewal. Cost: ₦45M annually.",
      category: "Operations"
    }
  ];

  const secretaryQueueItems = [
    {
      id: 1,
      type: "memo",
      reference: "NPA/ICT/2025/0191",
      title: "Software License Compliance Report",
      sender: "AGM ICT",
      submittedDate: "2025-01-16",
      priority: "Medium",
      status: "Secretary Review",
      actionRequired: "Review and summarize for MD",
      category: "Compliance"
    },
    {
      id: 2,
      type: "correspondence",
      reference: "NPA/CORR/IN/2025/0068",
      title: "Vendor Partnership Proposal",
      sender: "Tech Solutions Ltd",
      submittedDate: "2025-01-16",
      priority: "Normal",
      status: "Secretary Review",
      actionRequired: "Categorize and prioritize",
      category: "Business Development"
    },
    {
      id: 3,
      type: "memo",
      reference: "NPA/LEGAL/2025/0098",
      title: "Contract Review - Port Concession Agreement",
      sender: "AGM Legal",
      submittedDate: "2025-01-15",
      priority: "High",
      status: "Secretary Review",
      actionRequired: "Urgent legal matter - forward to MD immediately",
      category: "Legal"
    }
  ];

  const performanceMetrics = [
    {
      division: "ICT",
      totalRequests: 89,
      approved: 78,
      pending: 8,
      avgTime: "4.2 days",
      compliance: "92%"
    },
    {
      division: "Marine Operations",
      totalRequests: 67,
      approved: 62,
      pending: 4,
      avgTime: "3.8 days",
      compliance: "96%"
    },
    {
      division: "Finance",
      totalRequests: 45,
      approved: 41,
      pending: 3,
      avgTime: "2.9 days",
      compliance: "98%"
    },
    {
      division: "Human Resources",
      totalRequests: 34,
      approved: 30,
      pending: 2,
      avgTime: "3.1 days",
      compliance: "94%"
    }
  ];

  const recentActivity = [
    {
      id: 1,
      action: "Minuted & Forwarded",
      item: "ICT Strategic Plan",
      recipient: "GM ICT, ED, GM Finance",
      time: "2 hours ago",
      type: "memo"
    },
    {
      id: 2,
      action: "Approved",
      item: "Executive Compensation Framework",
      recipient: "GM HR",
      time: "4 hours ago",
      type: "memo"
    },
    {
      id: 3,
      action: "Correspondence Received",
      item: "Port Security Directive",
      recipient: "MD Office",
      time: "6 hours ago",
      type: "correspondence"
    },
    {
      id: 4,
      action: "Minuted & Forwarded",
      item: "Maintenance Contract Renewal",
      recipient: "GM Administration, Procurement",
      time: "1 day ago",
      type: "memo"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Managing Director Dashboard</h1>
          <p className="text-gray-600">Oversee all organizational correspondence, memos, and strategic decisions</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/correspondence/register"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Mail className="w-4 h-4 mr-2" />
            Register Correspondence
          </Link>
          <Link
            href="/reports/executive"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Executive Reports
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.name} stat={stat} />
        ))}
      </div>

      {/* Dual Inbox Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'inbox'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Inbox className="w-4 h-4 mr-2 inline" />
              My Inbox ({myInboxItems.length})
            </button>
            <button
              onClick={() => setActiveTab('secretary')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'secretary'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <List className="w-4 h-4 mr-2 inline" />
              Secretary&apos;s Queue ({secretaryQueueItems.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'inbox' ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Items Requiring MD Attention</h2>
                <span className="text-sm text-gray-500">All items visible to MD directly</span>
              </div>
              <div className="space-y-4">
                {myInboxItems.map((item) => (
                  <InboxItem key={item.id} item={item} isMDInbox={true} />
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Secretary Processing Queue</h2>
                <span className="text-sm text-gray-500">Items being processed by secretary</span>
              </div>
              <div className="space-y-4">
                {secretaryQueueItems.map((item) => (
                  <InboxItem key={item.id} item={item} isMDInbox={false} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Performance Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Divisional Performance */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Divisional Performance</h2>
            <Link
              href="/reports/division"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View details
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Division
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Approved
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Compliance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {performanceMetrics.map((metric, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {metric.division}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {metric.totalRequests}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600">
                      {metric.approved}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {metric.avgTime}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        parseInt(metric.compliance) >= 95 ? 'bg-green-100 text-green-800' :
                        parseInt(metric.compliance) >= 90 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {metric.compliance}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Executive Actions</h2>
            <Link
              href="/activity/executive"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <ExecutiveActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Executive Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <QuickActionButton
            title="Minute & Forward"
            description="Add instructions and route"
            icon={MessageSquare}
            href="/actions/minute"
            color="bg-blue-50 text-blue-600 hover:bg-blue-100"
          />
          <QuickActionButton
            title="Approve Document"
            description="Final approval action"
            icon={UserCheck}
            href="/actions/approve"
            color="bg-green-50 text-green-600 hover:bg-green-100"
          />
          <QuickActionButton
            title="Executive Reports"
            description="KPI and performance data"
            icon={BarChart3}
            href="/reports/executive"
            color="bg-purple-50 text-purple-600 hover:bg-purple-100"
          />
          <QuickActionButton
            title="Delegate to Secretary"
            description="Assign processing tasks"
            icon={Forward}
            href="/actions/delegate"
            color="bg-orange-50 text-orange-600 hover:bg-orange-100"
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

function InboxItem({ item, isMDInbox }: { item: any; isMDInbox: boolean }) {
  const priorityColorMap = {
    High: "bg-red-100 text-red-800",
    Medium: "bg-yellow-100 text-yellow-800",
    Normal: "bg-blue-100 text-blue-800",
    Confidential: "bg-purple-100 text-purple-800"
  };
  const priorityColor = priorityColorMap[item.priority as keyof typeof priorityColorMap] || "bg-gray-100 text-gray-800";

  const TypeIcon = item.type === 'memo' ? FileText : Mail;

  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <TypeIcon className="w-5 h-5 text-gray-400" />
            <h4 className="text-sm font-medium text-gray-900">{item.title}</h4>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColor}`}>
              {item.priority}
            </span>
            {item.secretaryReviewed && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                Secretary Reviewed
              </span>
            )}
          </div>
          <div className="text-sm text-gray-600 space-y-1 ml-8">
            <p>Reference: <span className="font-mono">{item.reference}</span></p>
            <p>From: {item.sender}</p>
            <p>Submitted: {item.submittedDate}</p>
            <p className="text-xs text-gray-500">Category: {item.category}</p>
          </div>
          {item.secretaryNotes && isMDInbox && (
            <div className="mt-3 p-3 bg-yellow-50 rounded text-sm text-yellow-800 ml-8">
              <strong>Secretary Notes:</strong> {item.secretaryNotes}
            </div>
          )}
          {!isMDInbox && item.actionRequired && (
            <div className="mt-3 p-3 bg-blue-50 rounded text-sm text-blue-800 ml-8">
              <strong>Action Required:</strong> {item.actionRequired}
            </div>
          )}
        </div>
        <div className="flex space-x-2 ml-4">
          <Link
            href={`/${item.type}s/${item.id}`}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            View
          </Link>
          {isMDInbox ? (
            <Link
              href={`/${item.type}s/${item.id}/minute`}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Minute
            </Link>
          ) : (
            <Link
              href={`/${item.type}s/${item.id}/process`}
              className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
            >
              Process
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function ExecutiveActivityItem({ activity }: { activity: any }) {
  const actionColorMap = {
    'Minuted & Forwarded': 'text-blue-600 bg-blue-100',
    'Approved': 'text-green-600 bg-green-100',
    'Correspondence Received': 'text-purple-600 bg-purple-100'
  };
  const actionColor = actionColorMap[activity.action as keyof typeof actionColorMap] || 'text-gray-600 bg-gray-100';

  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0">
        <Crown className="w-5 h-5 text-yellow-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">{activity.action}</p>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${actionColor}`}>
            {activity.type}
          </span>
        </div>
        <p className="text-sm text-gray-600">{activity.item}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-500">To: {activity.recipient}</p>
          <p className="text-xs text-gray-500">{activity.time}</p>
        </div>
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

