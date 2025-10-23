"use client";

import {
  Users,
  Clock,
  AlertTriangle,
  Settings,
  BarChart3,
  Shield,
  Database,
  Activity,
  Server,
  Plus,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Globe,
  HardDrive,
  Cpu,
  MemoryStick
} from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  const stats = [
    {
      name: "Total Active Users",
      value: "234",
      change: "+12",
      changeType: "positive",
      icon: Users,
      description: "System users",
      href: "/admin/users"
    },
    {
      name: "Pending Approvals",
      value: "18",
      change: "+3",
      changeType: "warning",
      icon: Clock,
      description: "Across departments",
      href: "/admin/approvals"
    },
    {
      name: "Workflow Errors",
      value: "2",
      change: "-1",
      changeType: "negative",
      icon: AlertTriangle,
      description: "Require attention",
      href: "/admin/errors"
    },
    {
      name: "System Health",
      value: "98%",
      change: "+1%",
      changeType: "positive",
      icon: Activity,
      description: "Uptime",
      href: "/admin/health"
    }
  ];

  const systemMetrics = [
    {
      metric: "Server Performance",
      value: "94%",
      status: "Excellent",
      trend: "up",
      icon: Server
    },
    {
      metric: "Database Health",
      value: "97%",
      status: "Excellent",
      trend: "up",
      icon: Database
    },
    {
      metric: "Storage Usage",
      value: "68%",
      status: "Good",
      trend: "up",
      icon: HardDrive
    },
    {
      metric: "Memory Usage",
      value: "72%",
      status: "Good",
      trend: "stable",
      icon: MemoryStick
    },
    {
      metric: "CPU Usage",
      value: "45%",
      status: "Excellent",
      trend: "down",
      icon: Cpu
    },
    {
      metric: "Network Latency",
      value: "12ms",
      status: "Excellent",
      trend: "down",
      icon: Globe
    }
  ];

  const recentUsers = [
    {
      id: 1,
      name: "Dr. Sarah Okafor",
      role: "AGM",
      department: "Software Applications & Database Management",
      lastLogin: "2 hours ago",
      status: "Active",
      actions: 45
    },
    {
      id: 2,
      name: "Engr. Michael Johnson",
      role: "GM",
      department: "Information & Communication Technology",
      lastLogin: "4 hours ago",
      status: "Active",
      actions: 32
    },
    {
      id: 3,
      name: "John Adebayo",
      role: "Officer",
      department: "Software Applications & Database Management",
      lastLogin: "1 day ago",
      status: "Active",
      actions: 18
    },
    {
      id: 4,
      name: "Mary Okonkwo",
      role: "Principal Manager",
      department: "Marine Operations",
      lastLogin: "2 days ago",
      status: "Inactive",
      actions: 7
    }
  ];

  const securityAlerts = [
    {
      id: 1,
      type: "Login Attempt",
      severity: "Medium",
      description: "Multiple failed login attempts from IP 192.168.1.100",
      timestamp: "2 hours ago",
      status: "Investigated",
      user: "Unknown"
    },
    {
      id: 2,
      type: "Permission Change",
      severity: "Low",
      description: "User role updated from Officer to Principal Manager",
      timestamp: "4 hours ago",
      status: "Approved",
      user: "Dr. Sarah Okafor"
    },
    {
      id: 3,
      type: "Data Export",
      severity: "High",
      description: "Large document export by user with sensitive access",
      timestamp: "6 hours ago",
      status: "Under Review",
      user: "Engr. Michael Johnson"
    }
  ];

  const workflowErrors = [
    {
      id: 1,
      workflow: "Memo Approval Process",
      error: "Timeout in AGM approval step",
      frequency: 3,
      lastOccurred: "1 hour ago",
      status: "Investigating",
      impact: "Medium"
    },
    {
      id: 2,
      workflow: "Document Upload",
      error: "File size validation failure",
      frequency: 1,
      lastOccurred: "3 hours ago",
      status: "Resolved",
      impact: "Low"
    }
  ];

  const auditLogs = [
    {
      id: 1,
      action: "User Created",
      user: "System Admin",
      target: "New Officer Account",
      timestamp: "2 hours ago",
      ip: "192.168.1.50",
      status: "Success"
    },
    {
      id: 2,
      action: "Role Modified",
      user: "System Admin",
      target: "Dr. Sarah Okafor",
      timestamp: "4 hours ago",
      ip: "192.168.1.50",
      status: "Success"
    },
    {
      id: 3,
      action: "System Backup",
      user: "Automated System",
      target: "Database Backup",
      timestamp: "6 hours ago",
      ip: "System",
      status: "Success"
    },
    {
      id: 4,
      action: "Failed Login",
      user: "Unknown",
      target: "Admin Account",
      timestamp: "8 hours ago",
      ip: "192.168.1.100",
      status: "Failed"
    }
  ];

  const backupStatus = [
    {
      type: "Database Backup",
      lastBackup: "2 hours ago",
      size: "2.3 GB",
      status: "Success",
      nextScheduled: "In 22 hours"
    },
    {
      type: "File System Backup",
      lastBackup: "4 hours ago",
      size: "15.7 GB",
      status: "Success",
      nextScheduled: "In 20 hours"
    },
    {
      type: "Configuration Backup",
      lastBackup: "1 day ago",
      size: "45 MB",
      status: "Success",
      nextScheduled: "In 6 days"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Admin Dashboard</h1>
          <p className="text-gray-600">Manage system setup, users, security, and monitor performance</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/admin/users/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Link>
          <Link
            href="/admin/system/backup"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Database className="w-4 h-4 mr-2" />
            Backup System
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.name} stat={stat} />
        ))}
      </div>

      {/* System Metrics */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">System Performance Metrics</h2>
          <Link
            href="/admin/system/monitoring"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View detailed monitoring
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {systemMetrics.map((metric, index) => (
            <SystemMetricItem key={index} metric={metric} />
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent User Activity</h2>
            <Link
              href="/admin/users"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Manage users
            </Link>
          </div>
          <div className="space-y-4">
            {recentUsers.map((user) => (
              <UserActivityItem key={user.id} user={user} />
            ))}
          </div>
        </div>

        {/* Security Alerts */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Security Alerts</h2>
            <Link
              href="/admin/security"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all alerts
            </Link>
          </div>
          <div className="space-y-4">
            {securityAlerts.map((alert) => (
              <SecurityAlertItem key={alert.id} alert={alert} />
            ))}
          </div>
        </div>
      </div>

      {/* Workflow Errors & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workflow Errors */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Workflow Errors</h2>
            <Link
              href="/admin/workflows"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Manage workflows
            </Link>
          </div>
          <div className="space-y-4">
            {workflowErrors.map((error) => (
              <WorkflowErrorItem key={error.id} error={error} />
            ))}
          </div>
        </div>

        {/* Audit Logs */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Audit Logs</h2>
            <Link
              href="/admin/audit"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all logs
            </Link>
          </div>
          <div className="space-y-4">
            {auditLogs.map((log) => (
              <AuditLogItem key={log.id} log={log} />
            ))}
          </div>
        </div>
      </div>

      {/* Backup Status & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backup Status */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Backup Status</h2>
            <Link
              href="/admin/backup"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Manage backups
            </Link>
          </div>
          <div className="space-y-4">
            {backupStatus.map((backup, index) => (
              <BackupStatusItem key={index} backup={backup} />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">System Management</h2>
          <div className="grid grid-cols-2 gap-4">
            <QuickActionButton
              title="User Management"
              description="Create, edit, and manage users"
              icon={Users}
              href="/admin/users"
              color="bg-blue-50 text-blue-600 hover:bg-blue-100"
            />
            <QuickActionButton
              title="Security Settings"
              description="Configure security policies"
              icon={Shield}
              href="/admin/security"
              color="bg-red-50 text-red-600 hover:bg-red-100"
            />
            <QuickActionButton
              title="System Monitoring"
              description="Monitor system performance"
              icon={Activity}
              href="/admin/monitoring"
              color="bg-green-50 text-green-600 hover:bg-green-100"
            />
            <QuickActionButton
              title="Workflow Config"
              description="Configure approval workflows"
              icon={Settings}
              href="/admin/workflows"
              color="bg-purple-50 text-purple-600 hover:bg-purple-100"
            />
            <QuickActionButton
              title="Database Admin"
              description="Manage database operations"
              icon={Database}
              href="/admin/database"
              color="bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
            />
            <QuickActionButton
              title="System Reports"
              description="Generate system reports"
              icon={BarChart3}
              href="/admin/reports"
              color="bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
            />
          </div>
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

function SystemMetricItem({ metric }: { metric: any }) {
  const Icon = metric.icon;
  const statusColorMap = {
    'Excellent': 'bg-green-100 text-green-800',
    'Good': 'bg-blue-100 text-blue-800',
    'Fair': 'bg-yellow-100 text-yellow-800',
    'Poor': 'bg-red-100 text-red-800'
  };
  const statusColor = statusColorMap[metric.status as keyof typeof statusColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Icon className="w-5 h-5 text-gray-400" />
          <h4 className="text-sm font-medium text-gray-900">{metric.metric}</h4>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
          {metric.status}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold text-gray-900">{metric.value}</p>
        {metric.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
        {metric.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
        {metric.trend === 'stable' && <div className="w-4 h-4 bg-gray-400 rounded-full"></div>}
      </div>
    </div>
  );
}

function UserActivityItem({ user }: { user: any }) {
  const statusColorMap = {
    'Active': 'bg-green-100 text-green-800',
    'Inactive': 'bg-gray-100 text-gray-800',
    'Suspended': 'bg-red-100 text-red-800'
  };
  const statusColor = statusColorMap[user.status as keyof typeof statusColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-900">{user.name}</h4>
          <p className="text-xs text-gray-500">{user.role} - {user.department}</p>
          <p className="text-xs text-gray-400">Last login: {user.lastLogin}</p>
        </div>
      </div>
      <div className="text-right">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
          {user.status}
        </span>
        <p className="text-xs text-gray-500 mt-1">{user.actions} actions</p>
      </div>
    </div>
  );
}

function SecurityAlertItem({ alert }: { alert: any }) {
  const severityColorMap = {
    'High': 'bg-red-100 text-red-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-blue-100 text-blue-800'
  };
  const severityColor = severityColorMap[alert.severity as keyof typeof severityColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h4 className="text-sm font-medium text-gray-900">{alert.type}</h4>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityColor}`}>
              {alert.severity}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>User: {alert.user}</span>
            <span>{alert.timestamp}</span>
          </div>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          alert.status === 'Investigated' ? 'bg-green-100 text-green-800' :
          alert.status === 'Under Review' ? 'bg-yellow-100 text-yellow-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {alert.status}
        </span>
      </div>
    </div>
  );
}

function WorkflowErrorItem({ error }: { error: any }) {
  const impactColorMap = {
    'High': 'bg-red-100 text-red-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-green-100 text-green-800'
  };
  const impactColor = impactColorMap[error.impact as keyof typeof impactColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">{error.workflow}</h4>
          <p className="text-sm text-gray-600 mb-2">{error.error}</p>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Frequency: {error.frequency} times</span>
            <span>Last: {error.lastOccurred}</span>
          </div>
        </div>
        <div className="text-right">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${impactColor}`}>
            {error.impact}
          </span>
          <p className="text-xs text-gray-500 mt-1">{error.status}</p>
        </div>
      </div>
    </div>
  );
}

function AuditLogItem({ log }: { log: any }) {
  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          log.status === 'Success' ? 'bg-green-100' : 'bg-red-100'
        }`}>
          {log.status === 'Success' ? 
            <CheckCircle className="w-4 h-4 text-green-600" /> : 
            <XCircle className="w-4 h-4 text-red-600" />
          }
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-900">{log.action}</h4>
          <p className="text-xs text-gray-500">Target: {log.target}</p>
          <p className="text-xs text-gray-400">IP: {log.ip}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs text-gray-500">{log.timestamp}</p>
        <p className="text-xs text-gray-400">By: {log.user}</p>
      </div>
    </div>
  );
}

function BackupStatusItem({ backup }: { backup: any }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div>
        <h4 className="text-sm font-medium text-gray-900">{backup.type}</h4>
        <p className="text-xs text-gray-500">Size: {backup.size}</p>
        <p className="text-xs text-gray-400">Next: {backup.nextScheduled}</p>
      </div>
      <div className="text-right">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          backup.status === 'Success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {backup.status}
        </span>
        <p className="text-xs text-gray-500 mt-1">Last: {backup.lastBackup}</p>
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