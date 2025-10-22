"use client";

import {
  Wifi,
  Server,
  Router,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  BarChart3,
  Zap,
  Globe,
  Lock,
  Download,
  Upload,
  Eye,
  Settings,
  Target,
  Award,
  TrendingUp,
  FileText,
  Play,
  Pause,
  RotateCcw,
  Database,
  Cpu,
  HardDrive,
  MemoryStick,
  Cloud,
  Monitor,
  Smartphone,
  Network,
  Cable,
  Signal,
  WifiOff,
  RefreshCw
} from "lucide-react";
import Link from "next/link";

export default function NetworkInfrastructureDashboard() {
  const stats = [
    {
      name: "Network Uptime",
      value: "99.9%",
      change: "+0.1%",
      changeType: "positive",
      icon: Wifi,
      description: "Core network availability",
      href: "/ict/network/uptime"
    },
    {
      name: "Active Devices",
      value: "1,247",
      change: "+23",
      changeType: "positive",
      icon: Router,
      description: "Network infrastructure",
      href: "/ict/network/devices"
    },
    {
      name: "Security Incidents",
      value: "1",
      change: "-2",
      changeType: "negative",
      icon: Shield,
      description: "This month",
      href: "/ict/network/security"
    },
    {
      name: "Bandwidth Utilization",
      value: "68%",
      change: "+5%",
      changeType: "warning",
      icon: Activity,
      description: "Average usage",
      href: "/ict/network/bandwidth"
    }
  ];

  const networkDevices = [
    {
      name: "Core Switch - Lagos HQ",
      type: "Cisco Catalyst 9500",
      status: "Operational",
      uptime: "99.9%",
      cpuUsage: "45%",
      memoryUsage: "62%",
      temperature: "42°C",
      lastMaintenance: "2 weeks ago",
      location: "Lagos Headquarters"
    },
    {
      name: "Edge Router - Tin Can Port",
      type: "Cisco ASR 1000",
      status: "Operational",
      uptime: "99.8%",
      cpuUsage: "38%",
      memoryUsage: "55%",
      temperature: "38°C",
      lastMaintenance: "1 week ago",
      location: "Tin Can Island Port"
    },
    {
      name: "Firewall - Onne Port",
      type: "Fortinet FortiGate 3000D",
      status: "Operational",
      uptime: "99.7%",
      cpuUsage: "52%",
      memoryUsage: "68%",
      temperature: "45°C",
      lastMaintenance: "3 days ago",
      location: "Onne Port"
    },
    {
      name: "Wireless Controller",
      type: "Cisco WLC 9800",
      status: "Maintenance",
      uptime: "98.5%",
      cpuUsage: "65%",
      memoryUsage: "78%",
      temperature: "48°C",
      lastMaintenance: "In Progress",
      location: "Lagos Headquarters"
    }
  ];

  const networkPerformance = [
    {
      metric: "Latency",
      value: "12ms",
      trend: "down",
      target: "15ms",
      status: "Below Target",
      period: "Average response time"
    },
    {
      metric: "Packet Loss",
      value: "0.02%",
      trend: "down",
      target: "0.1%",
      status: "Below Target",
      period: "Network reliability"
    },
    {
      metric: "Throughput",
      value: "2.4 Gbps",
      trend: "up",
      target: "2.0 Gbps",
      status: "Above Target",
      period: "Data transfer rate"
    },
    {
      metric: "Jitter",
      value: "3ms",
      trend: "stable",
      target: "5ms",
      status: "Below Target",
      period: "Network stability"
    }
  ];

  const securityMetrics = [
    {
      metric: "Firewall Blocked Attempts",
      value: "1,247",
      trend: "up",
      status: "Normal",
      description: "Last 24 hours"
    },
    {
      metric: "Intrusion Detections",
      value: "3",
      trend: "down",
      status: "Good",
      description: "This week"
    },
    {
      metric: "VPN Connections",
      value: "89",
      trend: "up",
      status: "Active",
      description: "Current sessions"
    },
    {
      metric: "SSL Certificate Status",
      value: "Valid",
      trend: "stable",
      status: "Good",
      description: "All certificates"
    }
  ];

  const networkSegments = [
    {
      segment: "Corporate Network",
      devices: 456,
      users: 1247,
      bandwidth: "1.2 Gbps",
      utilization: "65%",
      status: "Healthy",
      color: "bg-blue-500"
    },
    {
      segment: "Port Operations",
      devices: 234,
      users: 567,
      bandwidth: "800 Mbps",
      utilization: "72%",
      status: "Healthy",
      color: "bg-green-500"
    },
    {
      segment: "Guest Network",
      devices: 89,
      users: 234,
      bandwidth: "200 Mbps",
      utilization: "45%",
      status: "Healthy",
      color: "bg-yellow-500"
    },
    {
      segment: "DMZ",
      devices: 45,
      users: 12,
      bandwidth: "100 Mbps",
      utilization: "38%",
      status: "Healthy",
      color: "bg-purple-500"
    }
  ];

  const recentIncidents = [
    {
      id: 1,
      type: "Network Outage",
      severity: "High",
      description: "Core switch experienced 15-minute downtime",
      affectedDevices: ["Core Switch - Lagos HQ", "Edge Router - Tin Can Port"],
      resolvedAt: "2 hours ago",
      resolutionTime: "15 minutes",
      status: "Resolved"
    },
    {
      id: 2,
      type: "Security Alert",
      severity: "Medium",
      description: "Suspicious traffic detected from external IP",
      affectedDevices: ["Firewall - Onne Port"],
      resolvedAt: "4 hours ago",
      resolutionTime: "30 minutes",
      status: "Resolved"
    },
    {
      id: 3,
      type: "Performance Issue",
      severity: "Low",
      description: "High latency on wireless network",
      affectedDevices: ["Wireless Controller"],
      resolvedAt: "6 hours ago",
      resolutionTime: "45 minutes",
      status: "Resolved"
    }
  ];

  const bandwidthUsage = [
    {
      application: "Web Traffic",
      usage: "45%",
      bandwidth: "540 Mbps",
      trend: "up",
      users: 1247
    },
    {
      application: "Email",
      usage: "20%",
      bandwidth: "240 Mbps",
      trend: "stable",
      users: 1247
    },
    {
      application: "File Transfer",
      usage: "15%",
      bandwidth: "180 Mbps",
      trend: "up",
      users: 234
    },
    {
      application: "Video Conferencing",
      usage: "12%",
      bandwidth: "144 Mbps",
      trend: "up",
      users: 89
    },
    {
      application: "Backup Operations",
      usage: "8%",
      bandwidth: "96 Mbps",
      trend: "down",
      users: 12
    }
  ];

  const maintenanceSchedule = [
    {
      device: "Core Switch - Lagos HQ",
      type: "Preventive Maintenance",
      scheduledDate: "2025-02-15",
      estimatedDuration: "2 hours",
      status: "Scheduled",
      priority: "High"
    },
    {
      device: "Edge Router - Tin Can Port",
      type: "Firmware Update",
      scheduledDate: "2025-02-20",
      estimatedDuration: "1 hour",
      status: "Scheduled",
      priority: "Medium"
    },
    {
      device: "Firewall - Onne Port",
      type: "Security Patch",
      scheduledDate: "2025-02-25",
      estimatedDuration: "30 minutes",
      status: "Scheduled",
      priority: "High"
    },
    {
      device: "Wireless Controller",
      type: "Configuration Update",
      scheduledDate: "2025-03-01",
      estimatedDuration: "45 minutes",
      status: "Planned",
      priority: "Low"
    }
  ];

  const networkTopology = [
    {
      location: "Lagos Headquarters",
      devices: 456,
      connections: 12,
      status: "Operational",
      lastUpdate: "5 minutes ago"
    },
    {
      location: "Tin Can Island Port",
      devices: 234,
      connections: 8,
      status: "Operational",
      lastUpdate: "3 minutes ago"
    },
    {
      location: "Onne Port",
      devices: 189,
      connections: 6,
      status: "Operational",
      lastUpdate: "7 minutes ago"
    },
    {
      location: "Calabar Port",
      devices: 123,
      connections: 4,
      status: "Degraded",
      lastUpdate: "15 minutes ago"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Network Infrastructure Department</h1>
          <p className="text-gray-600">Network monitoring, device management, and infrastructure performance</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/ict/network/monitoring"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Activity className="w-4 h-4 mr-2" />
            Network Monitoring
          </Link>
          <Link
            href="/ict/network/devices"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Router className="w-4 h-4 mr-2" />
            Device Management
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.name} stat={stat} />
        ))}
      </div>

      {/* Network Performance Metrics */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Network Performance Metrics</h2>
          <Link
            href="/ict/network/performance"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View detailed metrics
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {networkPerformance.map((metric, index) => (
            <NetworkMetricCard key={index} metric={metric} />
          ))}
        </div>
      </div>

      {/* Network Devices */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Network Devices Status</h2>
          <Link
            href="/ict/network/devices"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Manage devices
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uptime</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Memory</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temperature</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {networkDevices.map((device, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {device.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {device.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      device.status === 'Operational' ? 'bg-green-100 text-green-800' :
                      device.status === 'Maintenance' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {device.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {device.uptime}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {device.cpuUsage}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {device.memoryUsage}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {device.temperature}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {device.location}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Network Segments */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Network Segments</h2>
            <Link
              href="/ict/network/segments"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Manage segments
            </Link>
          </div>
          <div className="space-y-4">
            {networkSegments.map((segment, index) => (
              <NetworkSegmentItem key={index} segment={segment} />
            ))}
          </div>
        </div>

        {/* Security Metrics */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Security Metrics</h2>
            <Link
              href="/ict/network/security"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View security dashboard
            </Link>
          </div>
          <div className="space-y-4">
            {securityMetrics.map((metric, index) => (
              <SecurityMetricItem key={index} metric={metric} />
            ))}
          </div>
        </div>
      </div>

      {/* Bandwidth Usage */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Bandwidth Usage by Application</h2>
          <Link
            href="/ict/network/bandwidth"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View bandwidth details
          </Link>
        </div>
        <div className="space-y-4">
          {bandwidthUsage.map((app, index) => (
            <BandwidthUsageItem key={index} app={app} />
          ))}
        </div>
      </div>

      {/* Recent Incidents & Maintenance Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Incidents */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Incidents</h2>
            <Link
              href="/ict/network/incidents"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all incidents
            </Link>
          </div>
          <div className="space-y-4">
            {recentIncidents.map((incident) => (
              <IncidentItem key={incident.id} incident={incident} />
            ))}
          </div>
        </div>

        {/* Maintenance Schedule */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Maintenance Schedule</h2>
            <Link
              href="/ict/network/maintenance"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Manage maintenance
            </Link>
          </div>
          <div className="space-y-4">
            {maintenanceSchedule.map((maintenance, index) => (
              <MaintenanceItem key={index} maintenance={maintenance} />
            ))}
          </div>
        </div>
      </div>

      {/* Network Topology */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Network Topology Status</h2>
          <Link
            href="/ict/network/topology"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View network topology
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {networkTopology.map((location, index) => (
            <TopologyLocationItem key={index} location={location} />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Network Infrastructure Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickActionButton
            title="Network Monitoring"
            description="Real-time network status"
            icon={Activity}
            href="/ict/network/monitoring"
            color="bg-blue-50 text-blue-600 hover:bg-blue-100"
          />
          <QuickActionButton
            title="Device Management"
            description="Manage network devices"
            icon={Router}
            href="/ict/network/devices"
            color="bg-green-50 text-green-600 hover:bg-green-100"
          />
          <QuickActionButton
            title="Security Center"
            description="Network security monitoring"
            icon={Shield}
            href="/ict/network/security"
            color="bg-red-50 text-red-600 hover:bg-red-100"
          />
          <QuickActionButton
            title="Bandwidth Analysis"
            description="Traffic and usage analysis"
            icon={BarChart3}
            href="/ict/network/bandwidth"
            color="bg-purple-50 text-purple-600 hover:bg-purple-100"
          />
          <QuickActionButton
            title="Maintenance"
            description="Schedule maintenance"
            icon={Settings}
            href="/ict/network/maintenance"
            color="bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
          />
          <QuickActionButton
            title="Network Topology"
            description="Visual network map"
            icon={Network}
            href="/ict/network/topology"
            color="bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
          />
          <QuickActionButton
            title="Performance Reports"
            description="Network performance insights"
            icon={TrendingUp}
            href="/ict/network/reports"
            color="bg-pink-50 text-pink-600 hover:bg-pink-100"
          />
          <QuickActionButton
            title="Configuration"
            description="Network configuration"
            icon={Cable}
            href="/ict/network/configuration"
            color="bg-gray-50 text-gray-600 hover:bg-gray-100"
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

function NetworkMetricCard({ metric }: { metric: any }) {
  const statusColorMap = {
    'Above Target': 'bg-green-100 text-green-800',
    'Below Target': 'bg-blue-100 text-blue-800',
    'On Target': 'bg-yellow-100 text-yellow-800',
    'Off Target': 'bg-red-100 text-red-800'
  };
  const statusColor = statusColorMap[metric.status as keyof typeof statusColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-900">{metric.metric}</h4>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
          {metric.status}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</p>
      <p className="text-xs text-gray-500">Target: {metric.target}</p>
      <p className="text-xs text-gray-400">{metric.period}</p>
    </div>
  );
}

function NetworkSegmentItem({ segment }: { segment: any }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className={`w-4 h-4 rounded-full ${segment.color}`}></div>
        <div>
          <h4 className="text-sm font-medium text-gray-900">{segment.segment}</h4>
          <p className="text-xs text-gray-500">{segment.devices} devices, {segment.users} users</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold text-gray-900">{segment.bandwidth}</p>
        <p className="text-sm text-gray-600">Utilization: {segment.utilization}</p>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          segment.status === 'Healthy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {segment.status}
        </span>
      </div>
    </div>
  );
}

function SecurityMetricItem({ metric }: { metric: any }) {
  const statusColorMap = {
    'Normal': 'bg-green-100 text-green-800',
    'Good': 'bg-blue-100 text-blue-800',
    'Active': 'bg-yellow-100 text-yellow-800',
    'Alert': 'bg-red-100 text-red-800'
  };
  const statusColor = statusColorMap[metric.status as keyof typeof statusColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div>
        <h4 className="text-sm font-medium text-gray-900">{metric.metric}</h4>
        <p className="text-xs text-gray-500">{metric.description}</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold text-gray-900">{metric.value}</p>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
          {metric.status}
        </span>
      </div>
    </div>
  );
}

function BandwidthUsageItem({ app }: { app: any }) {
  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">{app.application}</h4>
          <div className="text-sm text-gray-600 space-y-1 mt-2">
            <p>Bandwidth: {app.bandwidth} | Users: {app.users}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-gray-900">{app.usage}</p>
          <p className={`text-sm font-medium ${
            app.trend === 'up' ? 'text-green-600' : app.trend === 'down' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {app.trend === 'up' ? '↗' : app.trend === 'down' ? '↘' : '→'}
          </p>
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full" 
          style={{ width: app.usage }}
        ></div>
      </div>
    </div>
  );
}

function IncidentItem({ incident }: { incident: any }) {
  const severityColorMap = {
    'High': 'bg-red-100 text-red-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-green-100 text-green-800'
  };
  const severityColor = severityColorMap[incident.severity as keyof typeof severityColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h4 className="text-sm font-medium text-gray-900">{incident.type}</h4>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityColor}`}>
              {incident.severity}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-2">{incident.description}</p>
          <div className="text-xs text-gray-500 space-y-1">
            <p>Affected: {incident.affectedDevices.join(', ')}</p>
            <p>Resolved: {incident.resolvedAt} ({incident.resolutionTime})</p>
          </div>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          incident.status === 'Resolved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {incident.status}
        </span>
      </div>
    </div>
  );
}

function MaintenanceItem({ maintenance }: { maintenance: any }) {
  const priorityColorMap = {
    'High': 'bg-red-100 text-red-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-green-100 text-green-800'
  };
  const priorityColor = priorityColorMap[maintenance.priority as keyof typeof priorityColorMap] || 'bg-gray-100 text-gray-800';

  const statusColorMap = {
    'Scheduled': 'bg-blue-100 text-blue-800',
    'Planned': 'bg-yellow-100 text-yellow-800',
    'In Progress': 'bg-orange-100 text-orange-800',
    'Completed': 'bg-green-100 text-green-800'
  };
  const statusColor = statusColorMap[maintenance.status as keyof typeof statusColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">{maintenance.device}</h4>
          <div className="text-sm text-gray-600 space-y-1 mt-2">
            <p>Type: {maintenance.type}</p>
            <p>Date: {maintenance.scheduledDate}</p>
            <p>Duration: {maintenance.estimatedDuration}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
            {maintenance.status}
          </span>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColor} ml-2`}>
            {maintenance.priority}
          </span>
        </div>
      </div>
    </div>
  );
}

function TopologyLocationItem({ location }: { location: any }) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-900">{location.location}</h4>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          location.status === 'Operational' ? 'bg-green-100 text-green-800' :
          location.status === 'Degraded' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {location.status}
        </span>
      </div>
      <div className="text-sm text-gray-600 space-y-1">
        <p>Devices: {location.devices}</p>
        <p>Connections: {location.connections}</p>
        <p>Last Update: {location.lastUpdate}</p>
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
