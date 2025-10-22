"use client";

import { useState } from "react";
import {
  Wifi,
  Router,
  Server,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Settings,
  RefreshCw,
  Download,
  Upload,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  Monitor,
  Globe,
  Building,
  MapPin,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Shield,
  Database,
  HardDrive,
  Cpu,
  MemoryStick,
  Network
} from "lucide-react";
import Link from "next/link";

export default function NetworkMonitoringPage() {
  const [timeRange, setTimeRange] = useState("24h");
  const [statusFilter, setStatusFilter] = useState("all");

  const networkStats = [
    {
      name: "Network Uptime",
      value: "99.8%",
      change: "+0.2%",
      changeType: "positive",
      icon: Activity,
      description: "Last 30 days",
      status: "Excellent"
    },
    {
      name: "Bandwidth Usage",
      value: "68%",
      change: "+5%",
      changeType: "warning",
      icon: Wifi,
      description: "Current utilization",
      status: "Normal"
    },
    {
      name: "Active Devices",
      value: "247",
      change: "+12",
      changeType: "positive",
      icon: Router,
      description: "Connected devices",
      status: "Growing"
    },
    {
      name: "Latency",
      value: "12ms",
      change: "-2ms",
      changeType: "positive",
      icon: Clock,
      description: "Average response",
      status: "Good"
    }
  ];

  const networkDevices = [
    {
      id: "DEV-001",
      name: "Core Switch 01",
      type: "Switch",
      model: "Cisco Catalyst 9300",
      ip: "192.168.1.1",
      location: "Lagos HQ - Network Rack 1",
      status: "Online",
      uptime: "45 days",
      cpu: 25,
      memory: 45,
      temperature: "42°C",
      ports: {
        total: 48,
        used: 32,
        available: 16
      },
      traffic: {
        in: "1.2 Gbps",
        out: "0.8 Gbps",
        utilization: 65
      },
      lastMaintenance: "2024-11-01",
      nextMaintenance: "2025-05-01"
    },
    {
      id: "DEV-002",
      name: "Firewall 01",
      type: "Firewall",
      model: "Fortinet FortiGate 300D",
      ip: "192.168.1.2",
      location: "Lagos HQ - Network Rack 1",
      status: "Online",
      uptime: "45 days",
      cpu: 35,
      memory: 58,
      temperature: "38°C",
      ports: {
        total: 16,
        used: 8,
        available: 8
      },
      traffic: {
        in: "800 Mbps",
        out: "750 Mbps",
        utilization: 45
      },
      lastMaintenance: "2024-11-05",
      nextMaintenance: "2025-05-05"
    },
    {
      id: "DEV-003",
      name: "Router 01",
      type: "Router",
      model: "Cisco ISR 4331",
      ip: "192.168.1.3",
      location: "Lagos HQ - Network Rack 1",
      status: "Online",
      uptime: "45 days",
      cpu: 28,
      memory: 52,
      temperature: "35°C",
      ports: {
        total: 8,
        used: 6,
        available: 2
      },
      traffic: {
        in: "500 Mbps",
        out: "480 Mbps",
        utilization: 35
      },
      lastMaintenance: "2024-10-30",
      nextMaintenance: "2025-04-30"
    },
    {
      id: "DEV-004",
      name: "Access Point 01",
      type: "Wireless",
      model: "Cisco Aironet 2800",
      ip: "192.168.1.10",
      location: "Lagos HQ - Floor 1",
      status: "Online",
      uptime: "30 days",
      cpu: 15,
      memory: 32,
      temperature: "28°C",
      ports: {
        total: 1,
        used: 1,
        available: 0
      },
      traffic: {
        in: "150 Mbps",
        out: "120 Mbps",
        utilization: 25
      },
      lastMaintenance: "2024-11-15",
      nextMaintenance: "2025-05-15"
    },
    {
      id: "DEV-005",
      name: "Load Balancer 01",
      type: "Load Balancer",
      model: "F5 BIG-IP 2000",
      ip: "192.168.1.5",
      location: "Lagos HQ - Network Rack 2",
      status: "Maintenance",
      uptime: "2 days",
      cpu: 45,
      memory: 68,
      temperature: "45°C",
      ports: {
        total: 12,
        used: 8,
        available: 4
      },
      traffic: {
        in: "2.1 Gbps",
        out: "1.9 Gbps",
        utilization: 85
      },
      lastMaintenance: "2024-12-08",
      nextMaintenance: "2024-12-12"
    }
  ];

  const networkSegments = [
    {
      id: "SEG-001",
      name: "Core Network",
      subnet: "192.168.1.0/24",
      vlan: "VLAN 1",
      devices: 45,
      status: "Healthy",
      utilization: 68,
      bandwidth: "10 Gbps",
      description: "Main network backbone"
    },
    {
      id: "SEG-002",
      name: "Server Farm",
      subnet: "192.168.10.0/24",
      vlan: "VLAN 10",
      devices: 28,
      status: "Healthy",
      utilization: 75,
      bandwidth: "1 Gbps",
      description: "Data center network"
    },
    {
      id: "SEG-003",
      name: "User Network",
      subnet: "192.168.20.0/24",
      vlan: "VLAN 20",
      devices: 156,
      status: "Healthy",
      utilization: 45,
      bandwidth: "1 Gbps",
      description: "End user workstations"
    },
    {
      id: "SEG-004",
      name: "Guest Network",
      subnet: "192.168.100.0/24",
      vlan: "VLAN 100",
      devices: 18,
      status: "Warning",
      utilization: 85,
      bandwidth: "100 Mbps",
      description: "Guest and visitor access"
    }
  ];

  const networkAlerts = [
    {
      id: "ALT-001",
      type: "High CPU Usage",
      severity: "Warning",
      device: "Load Balancer 01",
      message: "CPU usage exceeded 80% for 5 minutes",
      timestamp: "2024-12-10 14:30:25",
      status: "Active",
      action: "Monitor closely"
    },
    {
      id: "ALT-002",
      type: "Port Down",
      severity: "Critical",
      device: "Core Switch 01",
      message: "Port 24 on Core Switch 01 is down",
      timestamp: "2024-12-10 13:45:10",
      status: "Resolved",
      action: "Port replaced"
    },
    {
      id: "ALT-003",
      type: "High Bandwidth",
      severity: "Warning",
      device: "Guest Network",
      message: "Bandwidth utilization exceeded 80%",
      timestamp: "2024-12-10 12:20:45",
      status: "Active",
      action: "Investigate traffic"
    },
    {
      id: "ALT-004",
      type: "Temperature Alert",
      severity: "Warning",
      device: "Firewall 01",
      message: "Device temperature above normal range",
      timestamp: "2024-12-10 11:15:30",
      status: "Resolved",
      action: "Cooling adjusted"
    }
  ];

  const bandwidthUsage = [
    { time: "00:00", usage: 45 },
    { time: "04:00", usage: 35 },
    { time: "08:00", usage: 75 },
    { time: "12:00", usage: 85 },
    { time: "16:00", usage: 90 },
    { time: "20:00", usage: 65 },
    { time: "24:00", usage: 50 }
  ];

  const timeRanges = [
    { value: "1h", label: "Last Hour" },
    { value: "24h", label: "Last 24 Hours" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "online", label: "Online" },
    { value: "offline", label: "Offline" },
    { value: "maintenance", label: "Maintenance" },
    { value: "warning", label: "Warning" }
  ];

  const filteredDevices = networkDevices.filter(device => {
    const matchesStatus = statusFilter === "all" || 
                         device.status.toLowerCase() === statusFilter;
    return matchesStatus;
  });

  const statusColorMap = {
    'Online': 'bg-green-100 text-green-800',
    'Offline': 'bg-red-100 text-red-800',
    'Maintenance': 'bg-yellow-100 text-yellow-800',
    'Warning': 'bg-orange-100 text-orange-800'
  };

  const severityColorMap = {
    'Critical': 'bg-red-100 text-red-800',
    'Warning': 'bg-yellow-100 text-yellow-800',
    'Info': 'bg-blue-100 text-blue-800'
  };

  const segmentStatusColorMap = {
    'Healthy': 'bg-green-100 text-green-800',
    'Warning': 'bg-yellow-100 text-yellow-800',
    'Critical': 'bg-red-100 text-red-800'
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'bg-red-100 text-red-800';
    if (utilization >= 80) return 'bg-orange-100 text-orange-800';
    if (utilization >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Network Monitoring</h1>
          <p className="text-gray-600">Real-time network monitoring and device management</p>
        </div>
        <div className="flex space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {timeRanges.map(range => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Network Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {networkStats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.description}</p>
              </div>
              <stat.icon className="h-8 w-8 text-gray-400" />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className={`text-sm font-medium ${
                stat.changeType === 'positive' ? 'text-green-600' : 
                stat.changeType === 'warning' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {stat.change}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                stat.status === 'Excellent' ? 'bg-green-100 text-green-800' :
                stat.status === 'Normal' ? 'bg-blue-100 text-blue-800' :
                stat.status === 'Growing' ? 'bg-purple-100 text-purple-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {stat.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search devices by name, type, or IP address..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Network Devices */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Network Devices</h2>
            <Link
              href="/ict/network/devices"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all devices
            </Link>
          </div>
          <div className="space-y-4">
            {filteredDevices.map((device) => (
              <div key={device.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{device.name}</h4>
                    <p className="text-xs text-gray-500">{device.model} | {device.type}</p>
                    <p className="text-xs text-gray-500">IP: {device.ip}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[device.status as keyof typeof statusColorMap]}`}>
                    {device.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-500">CPU Usage</p>
                    <p className="text-sm font-medium">{device.cpu}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Memory Usage</p>
                    <p className="text-sm font-medium">{device.memory}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Temperature</p>
                    <p className="text-sm font-medium">{device.temperature}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Uptime</p>
                    <p className="text-sm font-medium">{device.uptime}</p>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>Traffic Utilization</span>
                    <span>{device.traffic.utilization}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        device.traffic.utilization >= 90 ? 'bg-red-600' :
                        device.traffic.utilization >= 80 ? 'bg-yellow-600' : 'bg-green-600'
                      }`}
                      style={{ width: `${device.traffic.utilization}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>Traffic: {device.traffic.in} ↓ / {device.traffic.out} ↑</p>
                  <p>Ports: {device.ports.used}/{device.ports.total}</p>
                  <p>Location: {device.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Network Segments */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Network Segments</h2>
            <Link
              href="/ict/network/segments"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all segments
            </Link>
          </div>
          <div className="space-y-4">
            {networkSegments.map((segment) => (
              <div key={segment.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{segment.name}</h4>
                    <p className="text-xs text-gray-500">{segment.subnet} | {segment.vlan}</p>
                    <p className="text-xs text-gray-500">{segment.description}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${segmentStatusColorMap[segment.status as keyof typeof segmentStatusColorMap]}`}>
                    {segment.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-500">Devices</p>
                    <p className="text-sm font-medium">{segment.devices}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Bandwidth</p>
                    <p className="text-sm font-medium">{segment.bandwidth}</p>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>Utilization</span>
                    <span>{segment.utilization}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        segment.utilization >= 90 ? 'bg-red-600' :
                        segment.utilization >= 80 ? 'bg-yellow-600' : 'bg-green-600'
                      }`}
                      style={{ width: `${segment.utilization}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Network Alerts */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Network Alerts</h2>
          <Link
            href="/ict/network/incidents"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all alerts
          </Link>
        </div>
        <div className="space-y-4">
          {networkAlerts.map((alert) => (
            <div key={alert.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    alert.severity === 'Critical' ? 'bg-red-100' :
                    alert.severity === 'Warning' ? 'bg-yellow-100' : 'bg-blue-100'
                  }`}>
                    {alert.severity === 'Critical' ? (
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    ) : alert.severity === 'Warning' ? (
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{alert.type}</h4>
                    <p className="text-xs text-gray-500">{alert.message}</p>
                  </div>
                </div>
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
              <div className="text-xs text-gray-500 space-y-1">
                <p><span className="font-medium">Device:</span> {alert.device}</p>
                <p><span className="font-medium">Time:</span> {alert.timestamp}</p>
                <p><span className="font-medium">Action:</span> {alert.action}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bandwidth Usage Chart */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Bandwidth Usage (24 Hours)</h2>
        <div className="h-64 flex items-end space-x-2">
          {bandwidthUsage.map((data, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div 
                className="w-full bg-blue-500 rounded-t"
                style={{ height: `${data.usage}%` }}
              ></div>
              <span className="text-xs text-gray-500 mt-2">{data.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Network Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/ict/network/devices"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Router className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Device Management</h3>
            <p className="text-xs text-gray-500">Manage devices</p>
          </Link>
          <Link
            href="/ict/network/security"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Shield className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Network Security</h3>
            <p className="text-xs text-gray-500">Security monitoring</p>
          </Link>
          <Link
            href="/ict/network/performance"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Performance Analysis</h3>
            <p className="text-xs text-gray-500">View performance</p>
          </Link>
          <Link
            href="/ict/network/configuration"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Configuration</h3>
            <p className="text-xs text-gray-500">Network config</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
