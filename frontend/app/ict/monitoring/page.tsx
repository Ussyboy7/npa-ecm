"use client";

import { useState } from "react";
import {
  Monitor,
  Server,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wifi,
  Database,
  Cpu,
  HardDrive,
  MemoryStick,
  Shield,
  Globe,
  BarChart3,
  RefreshCw,
  Settings,
  Eye,
  Download,
  Filter,
  Search
} from "lucide-react";
import Link from "next/link";

export default function ICTMonitoringPage() {
  const [timeRange, setTimeRange] = useState("1h");
  const [refreshInterval, setRefreshInterval] = useState(30);

  const systemMetrics = [
    {
      name: "System Uptime",
      value: "99.9%",
      change: "+0.1%",
      changeType: "positive",
      icon: CheckCircle,
      description: "Last 30 days",
      status: "Excellent"
    },
    {
      name: "CPU Usage",
      value: "45%",
      change: "+5%",
      changeType: "warning",
      icon: Cpu,
      description: "Average across servers",
      status: "Normal"
    },
    {
      name: "Memory Usage",
      value: "68%",
      change: "+2%",
      changeType: "warning",
      icon: MemoryStick,
      description: "RAM utilization",
      status: "Normal"
    },
    {
      name: "Disk Usage",
      value: "72%",
      change: "+1%",
      changeType: "warning",
      icon: HardDrive,
      description: "Storage utilization",
      status: "Normal"
    }
  ];

  const servers = [
    {
      name: "Web Server 01",
      ip: "192.168.1.10",
      status: "Online",
      cpu: "42%",
      memory: "65%",
      disk: "68%",
      uptime: "45 days",
      lastUpdate: "2 minutes ago",
      location: "Lagos HQ"
    },
    {
      name: "Database Server 01",
      ip: "192.168.1.20",
      status: "Online",
      cpu: "38%",
      memory: "72%",
      disk: "75%",
      uptime: "45 days",
      lastUpdate: "1 minute ago",
      location: "Lagos HQ"
    },
    {
      name: "File Server 01",
      ip: "192.168.1.30",
      status: "Online",
      cpu: "28%",
      memory: "58%",
      disk: "82%",
      uptime: "45 days",
      lastUpdate: "3 minutes ago",
      location: "Lagos HQ"
    },
    {
      name: "Backup Server 01",
      ip: "192.168.1.40",
      status: "Maintenance",
      cpu: "15%",
      memory: "45%",
      disk: "45%",
      uptime: "2 days",
      lastUpdate: "5 minutes ago",
      location: "Lagos HQ"
    }
  ];

  const applications = [
    {
      name: "NPA ECM System",
      status: "Running",
      version: "v2.1.3",
      uptime: "45 days",
      responseTime: "120ms",
      users: "1,247",
      lastDeployment: "2 weeks ago"
    },
    {
      name: "Email Server",
      status: "Running",
      version: "v3.2.1",
      uptime: "45 days",
      responseTime: "45ms",
      users: "2,471",
      lastDeployment: "1 month ago"
    },
    {
      name: "File Storage",
      status: "Running",
      version: "v1.8.5",
      uptime: "45 days",
      responseTime: "85ms",
      users: "2,471",
      lastDeployment: "3 weeks ago"
    },
    {
      name: "Backup System",
      status: "Running",
      version: "v2.0.2",
      uptime: "45 days",
      responseTime: "N/A",
      users: "System",
      lastDeployment: "1 month ago"
    }
  ];

  const alerts = [
    {
      id: 1,
      type: "Warning",
      message: "High CPU usage detected on Web Server 01",
      timestamp: "5 minutes ago",
      severity: "Medium",
      status: "Active"
    },
    {
      id: 2,
      type: "Info",
      message: "Scheduled maintenance completed on Backup Server 01",
      timestamp: "1 hour ago",
      severity: "Low",
      status: "Resolved"
    },
    {
      id: 3,
      type: "Error",
      message: "Database connection timeout on secondary server",
      timestamp: "2 hours ago",
      severity: "High",
      status: "Resolved"
    },
    {
      id: 4,
      type: "Warning",
      message: "Disk space running low on File Server 01",
      timestamp: "3 hours ago",
      severity: "Medium",
      status: "Active"
    }
  ];

  const networkStats = [
    {
      metric: "Bandwidth Usage",
      value: "2.4 Gbps",
      utilization: "68%",
      trend: "up"
    },
    {
      metric: "Active Connections",
      value: "1,247",
      utilization: "45%",
      trend: "stable"
    },
    {
      metric: "Packet Loss",
      value: "0.02%",
      utilization: "Low",
      trend: "down"
    },
    {
      metric: "Latency",
      value: "12ms",
      utilization: "Good",
      trend: "stable"
    }
  ];

  const statusColorMap = {
    'Online': 'bg-green-100 text-green-800',
    'Offline': 'bg-red-100 text-red-800',
    'Maintenance': 'bg-yellow-100 text-yellow-800',
    'Running': 'bg-green-100 text-green-800',
    'Stopped': 'bg-red-100 text-red-800'
  };

  const severityColorMap = {
    'High': 'bg-red-100 text-red-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-blue-100 text-blue-800'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ICT System Monitoring</h1>
          <p className="text-gray-600">Real-time monitoring of ICT infrastructure and applications</p>
        </div>
        <div className="flex space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {systemMetrics.map((metric) => (
          <div key={metric.name} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.name}</p>
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                <p className="text-xs text-gray-500">{metric.description}</p>
              </div>
              <metric.icon className="h-8 w-8 text-gray-400" />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className={`text-sm font-medium ${
                metric.changeType === 'positive' ? 'text-green-600' : 
                metric.changeType === 'warning' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {metric.change}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                metric.status === 'Excellent' ? 'bg-green-100 text-green-800' :
                metric.status === 'Normal' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {metric.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Network Statistics */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Network Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {networkStats.map((stat, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900">{stat.metric}</h4>
                <span className={`text-sm font-medium ${
                  stat.trend === 'up' ? 'text-green-600' : 
                  stat.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {stat.trend === 'up' ? '↗' : stat.trend === 'down' ? '↘' : '→'}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-xs text-gray-500">Utilization: {stat.utilization}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Server Status */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Server Status</h2>
            <Link
              href="/ict/servers"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all servers
            </Link>
          </div>
          <div className="space-y-4">
            {servers.map((server, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{server.name}</h4>
                    <p className="text-xs text-gray-500">{server.ip} | {server.location}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[server.status as keyof typeof statusColorMap]}`}>
                    {server.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">CPU</p>
                    <p className="font-medium">{server.cpu}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Memory</p>
                    <p className="font-medium">{server.memory}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Disk</p>
                    <p className="font-medium">{server.disk}</p>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <p>Uptime: {server.uptime} | Last Update: {server.lastUpdate}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Application Status */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Application Status</h2>
            <Link
              href="/ict/applications"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all applications
            </Link>
          </div>
          <div className="space-y-4">
            {applications.map((app, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{app.name}</h4>
                    <p className="text-xs text-gray-500">v{app.version}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[app.status as keyof typeof statusColorMap]}`}>
                    {app.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Response Time</p>
                    <p className="font-medium">{app.responseTime}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Active Users</p>
                    <p className="font-medium">{app.users}</p>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <p>Uptime: {app.uptime} | Last Deployment: {app.lastDeployment}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Alerts */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">System Alerts</h2>
          <Link
            href="/ict/alerts"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all alerts
          </Link>
        </div>
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                alert.type === 'Error' ? 'bg-red-100' :
                alert.type === 'Warning' ? 'bg-yellow-100' : 'bg-blue-100'
              }`}>
                {alert.type === 'Error' ? (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                ) : alert.type === 'Warning' ? (
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">{alert.message}</h4>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityColorMap[alert.severity as keyof typeof severityColorMap]}`}>
                      {alert.severity}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      alert.status === 'Active' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {alert.status}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{alert.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Monitoring Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/ict/servers"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Server className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Server Management</h3>
            <p className="text-xs text-gray-500">Manage servers</p>
          </Link>
          <Link
            href="/ict/applications"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Monitor className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Applications</h3>
            <p className="text-xs text-gray-500">Monitor applications</p>
          </Link>
          <Link
            href="/ict/alerts"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <AlertTriangle className="h-8 w-8 text-red-600 mb-3" />
            <h3 className="font-medium text-sm">Alert Management</h3>
            <p className="text-xs text-gray-500">Manage alerts</p>
          </Link>
          <Link
            href="/ict/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Reports</h3>
            <p className="text-xs text-gray-500">View reports</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
