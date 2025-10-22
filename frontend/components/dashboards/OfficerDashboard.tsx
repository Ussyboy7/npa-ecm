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
  Plus
} from "lucide-react";
import Link from "next/link";

export default function OfficerDashboard() {
  // Mock data - in real app this would come from API
  const stats = [
    {
      name: "My Drafts",
      value: "3",
      change: "+1",
      changeType: "warning",
      icon: FileText,
      description: "Memos in draft",
      href: "/memos?status=draft"
    },
    {
      name: "Approved This Month",
      value: "12",
      change: "+8%",
      changeType: "positive",
      icon: CheckCircle,
      description: "My memos approved",
      href: "/memos?status=approved&period=month"
    },
    {
      name: "Awaiting Review",
      value: "2",
      change: "PM Level",
      changeType: "neutral",
      icon: Clock,
      description: "By Principal Manager",
      href: "/memos?status=pending"
    },
    {
      name: "Returned for Correction",
      value: "1",
      change: "-50%",
      changeType: "negative",
      icon: AlertCircle,
      description: "Needs revision",
      href: "/memos?status=returned"
    }
  ];

  const recentActivities = [
    {
      id: 1,
      type: "memo_submitted",
      title: "Memo submitted",
      description: "ICT Infrastructure Budget Request submitted for approval",
      time: "2 hours ago",
      icon: Send,
      color: "text-blue-600",
      status: "Pending PM Review"
    },
    {
      id: 2,
      type: "memo_approved",
      title: "Memo approved",
      description: "Software License Renewal approved by Principal Manager",
      time: "1 day ago",
      icon: CheckCircle,
      color: "text-green-600",
      status: "Approved"
    },
    {
      id: 3,
      type: "memo_returned",
      title: "Memo returned",
      description: "Server Maintenance Schedule returned by Principal Manager",
      time: "2 days ago",
      icon: AlertCircle,
      color: "text-orange-600",
      status: "Returned for correction"
    },
    {
      id: 4,
      type: "correspondence_received",
      title: "Correspondence received",
      description: "IT Vendor Proposal assigned to you",
      time: "3 days ago",
      icon: Mail,
      color: "text-purple-600",
      status: "For Action"
    }
  ];

  const myCorrespondence = [
    {
      id: 1,
      reference: "NPA/CORR/IN/2025/0045",
      subject: "IT Infrastructure Upgrade Proposal",
      sender: "Tech Solutions Ltd",
      received: "2025-01-15",
      priority: "Normal",
      status: "Pending Action",
      action: "Review and recommend"
    },
    {
      id: 2,
      reference: "NPA/CORR/IN/2025/0042",
      subject: "Software License Renewal Notice",
      sender: "Microsoft Corporation",
      received: "2025-01-12",
      priority: "Urgent",
      status: "Acknowledged",
      action: "Response drafted"
    },
    {
      id: 3,
      reference: "NPA/CORR/IN/2025/0038",
      subject: "Cybersecurity Training Program",
      sender: "NITDA",
      received: "2025-01-10",
      priority: "Normal",
      status: "For Information",
      action: "File for reference"
    }
  ];

  const pendingTasks = [
    {
      id: 1,
      title: "Review IT Infrastructure Proposal",
      type: "Correspondence",
      priority: "Normal",
      dueDate: "Jan 20, 2025",
      status: "Overdue"
    },
    {
      id: 2,
      title: "Submit Server Maintenance Schedule",
      type: "Memo",
      priority: "High",
      dueDate: "Jan 18, 2025",
      status: "Returned"
    },
    {
      id: 3,
      title: "Update Software Inventory",
      type: "Task",
      priority: "Medium",
      dueDate: "Jan 25, 2025",
      status: "In Progress"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Officer Dashboard</h1>
          <p className="text-gray-600">Manage your memos, correspondence, and approvals</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/memos/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Memo
          </Link>
          <Link
            href="/correspondence/register"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Mail className="w-4 h-4 mr-2" />
            Register Correspondence
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
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              <Link
                href="/activity"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View all
              </Link>
            </div>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Pending Tasks</h2>
              <Link
                href="/tasks"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View all
              </Link>
            </div>
            <div className="space-y-4">
              {pendingTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* My Correspondence */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">My Correspondence</h2>
          <Link
            href="/correspondence"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sender
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {myCorrespondence.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {item.reference}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.subject}</div>
                    <div className="text-sm text-gray-500">Received: {item.received}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.sender}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      item.priority === 'Urgent' ? 'bg-red-100 text-red-800' :
                      item.priority === 'Normal' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      item.status === 'Pending Action' ? 'bg-yellow-100 text-yellow-800' :
                      item.status === 'Acknowledged' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Link
                        href={`/correspondence/${item.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </Link>
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm text-gray-600">{item.action}</span>
                    </div>
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
            title="Draft Memo"
            description="Start a new memo"
            icon={Edit}
            href="/memos/create"
            color="bg-blue-50 text-blue-600 hover:bg-blue-100"
          />
          <QuickActionButton
            title="Check Approvals"
            description="View pending items"
            icon={Clock}
            href="/approvals"
            color="bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
          />
          <QuickActionButton
            title="Correspondence"
            description="Manage incoming mail"
            icon={Mail}
            href="/correspondence"
            color="bg-purple-50 text-purple-600 hover:bg-purple-100"
          />
          <QuickActionButton
            title="Reports"
            description="View statistics"
            icon={BarChart3}
            href="/reports"
            color="bg-green-50 text-green-600 hover:bg-green-100"
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

function ActivityItem({ activity }: { activity: any }) {
  const Icon = activity.icon;

  return (
    <div className="flex items-start space-x-4">
      <div className={`flex-shrink-0 p-2 rounded-lg bg-gray-50`}>
        <Icon className={`h-5 w-5 ${activity.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">{activity.title}</p>
          <span className={`px-2 py-1 text-xs rounded-full ${
            activity.status === 'Approved' ? 'bg-green-100 text-green-800' :
            activity.status === 'Pending PM Review' ? 'bg-yellow-100 text-yellow-800' :
            activity.status === 'Returned for correction' ? 'bg-orange-100 text-orange-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {activity.status}
          </span>
        </div>
        <p className="text-sm text-gray-600">{activity.description}</p>
        <p className="text-xs text-gray-500">{activity.time}</p>
      </div>
    </div>
  );
}

function TaskItem({ task }: { task: any }) {
  const priorityColorMap = {
    High: "bg-red-100 text-red-800",
    Medium: "bg-yellow-100 text-yellow-800",
    Normal: "bg-blue-100 text-blue-800"
  };
  const priorityColor = priorityColorMap[task.priority as keyof typeof priorityColorMap] || "bg-gray-100 text-gray-800";

  const statusColorMap = {
    'Overdue': "bg-red-100 text-red-800",
    'Returned': "bg-orange-100 text-orange-800",
    'In Progress': "bg-blue-100 text-blue-800"
  };
  const statusColor = statusColorMap[task.status as keyof typeof statusColorMap] || "bg-gray-100 text-gray-800";

  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColor}`}>
              {task.priority}
            </span>
          </div>
          <p className="text-xs text-gray-600">{task.type}</p>
          <p className="text-xs text-gray-500">Due: {task.dueDate}</p>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
          {task.status}
        </span>
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

