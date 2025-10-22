"use client";

import { useState } from "react";
import {
  Server,
  Database,
  HardDrive,
  Cpu,
  MemoryStick,
  Wifi,
  Shield,
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
  Minus
} from "lucide-react";
import Link from "next/link";

export default function ICTInfrastructurePage() {
  const [timeRange, setTimeRange] = useState("24h");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const infrastructureMetrics = [
    {
      name: "Server Uptime",
      value: "99.8%",
      change: "+0.2%",
      changeType: "positive",
      icon: Server,
      description: "Last 30 days",
      status: "Excellent"
    },
    {
      name: "Storage Usage",
      value: "68%",
      change: "+3%",
      changeType: "warning",
      icon: HardDrive,
      description: "Total capacity",
      status: "Normal"
    },
    {
      name: "Network Latency",
      value: "12ms",
      change: "-2ms",
      changeType: "positive",
      icon: Wifi,
      description: "Average response",
      status: "Good"
    },
    {
      name: "Power Consumption",
      value: "85%",
      change: "+5%",
      changeType: "warning",
      icon: Activity,
      description: "Efficiency rating",
      status: "Normal"
    }
  ];

  const servers = [
    {
      id: "SRV-001",
      name: "Web Server Cluster 01",
      type: "Web Server",
      status: "Online",
      location: "Lagos HQ - Data Center A",
      ip: "192.168.1.10",
      os: "Ubuntu 22.04 LTS",
      cpu: "Intel Xeon E5-2680 v4",
      memory: "64GB DDR4",
      storage: "2TB SSD",
      utilization: {
        cpu: 45,
        memory: 68,
        disk: 72,
        network: 35
      },
      uptime: "45 days",
      lastMaintenance: "2024-11-15",
      nextMaintenance: "2025-02-15",
      powerConsumption: "450W",
      temperature: "42°C"
    },
    {
      id: "SRV-002",
      name: "Database Server 01",
      type: "Database Server",
      status: "Online",
      location: "Lagos HQ - Data Center A",
      ip: "192.168.1.20",
      os: "CentOS 8",
      cpu: "Intel Xeon Gold 6248R",
      memory: "128GB DDR4",
      storage: "4TB NVMe SSD",
      utilization: {
        cpu: 38,
        memory: 72,
        disk: 65,
        network: 28
      },
      uptime: "45 days",
      lastMaintenance: "2024-11-10",
      nextMaintenance: "2025-02-10",
      powerConsumption: "650W",
      temperature: "38°C"
    },
    {
      id: "SRV-003",
      name: "File Server 01",
      type: "File Server",
      status: "Online",
      location: "Lagos HQ - Data Center B",
      ip: "192.168.1.30",
      os: "Windows Server 2022",
      cpu: "Intel Xeon E5-2620 v4",
      memory: "32GB DDR4",
      storage: "8TB HDD RAID",
      utilization: {
        cpu: 28,
        memory: 58,
        disk: 82,
        network: 45
      },
      uptime: "45 days",
      lastMaintenance: "2024-11-20",
      nextMaintenance: "2025-02-20",
      powerConsumption: "380W",
      temperature: "35°C"
    },
    {
      id: "SRV-004",
      name: "Backup Server 01",
      type: "Backup Server",
      status: "Maintenance",
      location: "Lagos HQ - Data Center B",
      ip: "192.168.1.40",
      os: "Ubuntu 22.04 LTS",
      cpu: "Intel Xeon E5-2609 v4",
      memory: "16GB DDR4",
      storage: "12TB HDD",
      utilization: {
        cpu: 15,
        memory: 45,
        disk: 45,
        network: 12
      },
      uptime: "2 days",
      lastMaintenance: "2024-12-08",
      nextMaintenance: "2024-12-12",
      powerConsumption: "280W",
      temperature: "32°C"
    }
  ];

  const networkDevices = [
    {
      id: "NET-001",
      name: "Core Switch 01",
      type: "Switch",
      model: "Cisco Catalyst 9300",
      status: "Online",
      location: "Lagos HQ - Network Rack 1",
      ip: "192.168.1.1",
      ports: "48",
      utilization: 65,
      uptime: "45 days",
      lastMaintenance: "2024-11-01",
      nextMaintenance: "2025-05-01"
    },
    {
      id: "NET-002",
      name: "Firewall 01",
      type: "Firewall",
      model: "Fortinet FortiGate 300D",
      status: "Online",
      location: "Lagos HQ - Network Rack 1",
      ip: "192.168.1.2",
      ports: "16",
      utilization: 45,
      uptime: "45 days",
      lastMaintenance: "2024-11-05",
      nextMaintenance: "2025-05-05"
    },
    {
      id: "NET-003",
      name: "Router 01",
      type: "Router",
      model: "Cisco ISR 4331",
      status: "Online",
      location: "Lagos HQ - Network Rack 1",
      ip: "192.168.1.3",
      ports: "8",
      utilization: 35,
      uptime: "45 days",
      lastMaintenance: "2024-10-30",
      nextMaintenance: "2025-04-30"
    }
  ];

  const storageSystems = [
    {
      id: "STOR-001",
      name: "SAN Storage 01",
      type: "SAN",
      model: "Dell EMC PowerStore 5000",
      status: "Online",
      location: "Lagos HQ - Data Center A",
      capacity: "100TB",
      used: "68TB",
      available: "32TB",
      utilization: 68,
      uptime: "45 days",
      lastMaintenance: "2024-11-12",
      nextMaintenance: "2025-02-12"
    },
    {
      id: "STOR-002",
      name: "NAS Storage 01",
      type: "NAS",
      model: "Synology RS4021xs+",
      status: "Online",
      location: "Lagos HQ - Data Center B",
      capacity: "50TB",
      used: "35TB",
      available: "15TB",
      utilization: 70,
      uptime: "45 days",
      lastMaintenance: "2024-11-18",
      nextMaintenance: "2025-02-18"
    }
  ];

  const dataCenters = [
    {
      id: "DC-001",
      name: "Lagos HQ Data Center A",
      location: "Lagos Headquarters",
      status: "Operational",
      capacity: "100 racks",
      occupied: "75 racks",
      utilization: 75,
      powerCapacity: "2MW",
      powerUsage: "1.5MW",
      cooling: "Active",
      temperature: "22°C",
      humidity: "45%",
      lastInspection: "2024-12-01",
      nextInspection: "2025-01-01"
    },
    {
      id: "DC-002",
      name: "Lagos HQ Data Center B",
      location: "Lagos Headquarters",
      status: "Operational",
      capacity: "50 racks",
      occupied: "30 racks",
      utilization: 60,
      powerCapacity: "1MW",
      powerUsage: "600kW",
      cooling: "Active",
      temperature: "23°C",
      humidity: "47%",
      lastInspection: "2024-11-28",
      nextInspection: "2024-12-28"
    }
  ];

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "servers", label: "Servers" },
    { value: "network", label: "Network" },
    { value: "storage", label: "Storage" },
    { value: "datacenter", label: "Data Centers" }
  ];

  const statusColorMap = {
    'Online': 'bg-green-100 text-green-800',
    'Offline': 'bg-red-100 text-red-800',
    'Maintenance': 'bg-yellow-100 text-yellow-800',
    'Operational': 'bg-green-100 text-green-800'
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
          <h1 className="text-3xl font-bold text-gray-900">ICT Infrastructure</h1>
          <p className="text-gray-600">Monitor and manage ICT infrastructure components</p>
        </div>
        <div className="flex space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Infrastructure Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {infrastructureMetrics.map((metric) => (
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
                metric.status === 'Good' ? 'bg-blue-100 text-blue-800' :
                metric.status === 'Normal' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {metric.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Category Filter */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Filter by Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {categories.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Servers */}
      {(categoryFilter === "all" || categoryFilter === "servers") && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Servers</h2>
            <Link
              href="/ict/infrastructure/servers"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all servers
            </Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {servers.map((server) => (
              <div key={server.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{server.name}</h4>
                    <p className="text-xs text-gray-500">{server.type} | {server.location}</p>
                    <p className="text-xs text-gray-500">IP: {server.ip}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[server.status as keyof typeof statusColorMap]}`}>
                    {server.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">CPU</p>
                    <p className="text-sm font-medium">{server.cpu}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Memory</p>
                    <p className="text-sm font-medium">{server.memory}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Storage</p>
                    <p className="text-sm font-medium">{server.storage}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">OS</p>
                    <p className="text-sm font-medium">{server.os}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span>CPU Usage</span>
                    <span>{server.utilization.cpu}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div 
                      className="bg-blue-600 h-1 rounded-full" 
                      style={{ width: `${server.utilization.cpu}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span>Memory Usage</span>
                    <span>{server.utilization.memory}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div 
                      className="bg-green-600 h-1 rounded-full" 
                      style={{ width: `${server.utilization.memory}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span>Disk Usage</span>
                    <span>{server.utilization.disk}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div 
                      className="bg-yellow-600 h-1 rounded-full" 
                      style={{ width: `${server.utilization.disk}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>Uptime: {server.uptime}</p>
                  <p>Power: {server.powerConsumption} | Temp: {server.temperature}</p>
                  <p>Last Maintenance: {server.lastMaintenance}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Network Devices */}
      {(categoryFilter === "all" || categoryFilter === "network") && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Network Devices</h2>
            <Link
              href="/ict/infrastructure/network"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all network devices
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {networkDevices.map((device) => (
              <div key={device.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{device.name}</h4>
                    <p className="text-xs text-gray-500">{device.model}</p>
                    <p className="text-xs text-gray-500">IP: {device.ip}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[device.status as keyof typeof statusColorMap]}`}>
                    {device.status}
                  </span>
                </div>
                
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>Utilization</span>
                    <span>{device.utilization}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        device.utilization >= 80 ? 'bg-red-600' :
                        device.utilization >= 60 ? 'bg-yellow-600' : 'bg-green-600'
                      }`}
                      style={{ width: `${device.utilization}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>Ports: {device.ports}</p>
                  <p>Uptime: {device.uptime}</p>
                  <p>Location: {device.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Storage Systems */}
      {(categoryFilter === "all" || categoryFilter === "storage") && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Storage Systems</h2>
            <Link
              href="/ict/infrastructure/storage"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all storage systems
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {storageSystems.map((storage) => (
              <div key={storage.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{storage.name}</h4>
                    <p className="text-xs text-gray-500">{storage.model}</p>
                    <p className="text-xs text-gray-500">Location: {storage.location}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[storage.status as keyof typeof statusColorMap]}`}>
                    {storage.status}
                  </span>
                </div>
                
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>Storage Usage</span>
                    <span>{storage.utilization}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        storage.utilization >= 90 ? 'bg-red-600' :
                        storage.utilization >= 80 ? 'bg-yellow-600' : 'bg-green-600'
                      }`}
                      style={{ width: `${storage.utilization}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>Capacity: {storage.capacity}</p>
                  <p>Used: {storage.used} | Available: {storage.available}</p>
                  <p>Uptime: {storage.uptime}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Centers */}
      {(categoryFilter === "all" || categoryFilter === "datacenter") && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Data Centers</h2>
            <Link
              href="/ict/infrastructure/datacenters"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all data centers
            </Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {dataCenters.map((dc) => (
              <div key={dc.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{dc.name}</h4>
                    <p className="text-xs text-gray-500">{dc.location}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[dc.status as keyof typeof statusColorMap]}`}>
                    {dc.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Rack Utilization</p>
                    <p className="text-sm font-medium">{dc.occupied}/{dc.capacity} ({dc.utilization}%)</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Power Usage</p>
                    <p className="text-sm font-medium">{dc.powerUsage}/{dc.powerCapacity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Temperature</p>
                    <p className="text-sm font-medium">{dc.temperature}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Humidity</p>
                    <p className="text-sm font-medium">{dc.humidity}</p>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>Rack Utilization</span>
                    <span>{dc.utilization}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        dc.utilization >= 90 ? 'bg-red-600' :
                        dc.utilization >= 80 ? 'bg-yellow-600' : 'bg-green-600'
                      }`}
                      style={{ width: `${dc.utilization}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>Cooling: {dc.cooling}</p>
                  <p>Last Inspection: {dc.lastInspection}</p>
                  <p>Next Inspection: {dc.nextInspection}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Infrastructure Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Infrastructure Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/ict/infrastructure/servers"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Server className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Server Management</h3>
            <p className="text-xs text-gray-500">Manage servers</p>
          </Link>
          <Link
            href="/ict/infrastructure/network"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Wifi className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Network Management</h3>
            <p className="text-xs text-gray-500">Manage network</p>
          </Link>
          <Link
            href="/ict/infrastructure/storage"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <HardDrive className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Storage Management</h3>
            <p className="text-xs text-gray-500">Manage storage</p>
          </Link>
          <Link
            href="/ict/infrastructure/monitoring"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Activity className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Infrastructure Monitoring</h3>
            <p className="text-xs text-gray-500">Monitor infrastructure</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
