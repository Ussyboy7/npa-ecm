"use client";

import { useState } from "react";
import {
  Router,
  Server,
  Wifi,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Settings,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  RefreshCw,
  Power,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  Shield,
  MapPin,
  Building,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Database,
  Globe,
  Monitor,
  Smartphone,
  Laptop,
  Printer,
  Camera,
  Lock,
  Unlock,
  Wrench,
  Tool
} from "lucide-react";
import Link from "next/link";

export default function NetworkDevicesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const deviceStats = [
    {
      name: "Total Devices",
      value: "247",
      change: "+12",
      changeType: "positive",
      icon: Network,
      description: "All network devices",
      status: "Growing"
    },
    {
      name: "Online Devices",
      value: "234",
      change: "+8",
      changeType: "positive",
      icon: CheckCircle,
      description: "Currently active",
      status: "Healthy"
    },
    {
      name: "Offline Devices",
      value: "8",
      change: "-2",
      changeType: "positive",
      icon: AlertTriangle,
      description: "Require attention",
      status: "Improving"
    },
    {
      name: "Maintenance Due",
      value: "15",
      change: "+3",
      changeType: "warning",
      icon: Wrench,
      description: "Scheduled maintenance",
      status: "Pending"
    }
  ];

  const devices = [
    {
      id: "DEV-001",
      name: "Core Switch 01",
      type: "Switch",
      model: "Cisco Catalyst 9300",
      manufacturer: "Cisco",
      serialNumber: "FCW2140L0A1",
      ipAddress: "192.168.1.1",
      macAddress: "00:1A:2B:3C:4D:5E",
      location: "Lagos HQ - Network Rack 1",
      status: "Online",
      uptime: "45 days, 12 hours",
      lastSeen: "2024-12-10 14:30:25",
      firmware: "16.12.07",
      hardware: {
        cpu: 25,
        memory: 45,
        temperature: 42,
        power: 95
      },
      ports: {
        total: 48,
        used: 32,
        available: 16,
        gigabit: 24,
        tenGigabit: 4
      },
      traffic: {
        in: "1.2 Gbps",
        out: "0.8 Gbps",
        utilization: 65,
        packets: "2.5M pps"
      },
      configuration: {
        vlan: "VLAN 1",
        spanningTree: "Enabled",
        portSecurity: "Enabled",
        qos: "Enabled"
      },
      maintenance: {
        lastMaintenance: "2024-11-01",
        nextMaintenance: "2025-05-01",
        warranty: "2026-12-31",
        support: "Active"
      },
      alerts: [
        { type: "Info", message: "Port 24 utilization high", timestamp: "2024-12-10 13:45" },
        { type: "Warning", message: "Temperature above normal", timestamp: "2024-12-10 12:30" }
      ]
    },
    {
      id: "DEV-002",
      name: "Firewall 01",
      type: "Firewall",
      model: "Fortinet FortiGate 300D",
      manufacturer: "Fortinet",
      serialNumber: "FG300D3919600001",
      ipAddress: "192.168.1.2",
      macAddress: "00:09:0F:12:34:56",
      location: "Lagos HQ - Network Rack 1",
      status: "Online",
      uptime: "45 days, 12 hours",
      lastSeen: "2024-12-10 14:30:20",
      firmware: "7.0.12",
      hardware: {
        cpu: 35,
        memory: 58,
        temperature: 38,
        power: 88
      },
      ports: {
        total: 16,
        used: 8,
        available: 8,
        gigabit: 12,
        tenGigabit: 4
      },
      traffic: {
        in: "800 Mbps",
        out: "750 Mbps",
        utilization: 45,
        packets: "1.8M pps"
      },
      configuration: {
        vlan: "VLAN 1",
        spanningTree: "N/A",
        portSecurity: "Enabled",
        qos: "Enabled"
      },
      maintenance: {
        lastMaintenance: "2024-11-05",
        nextMaintenance: "2025-05-05",
        warranty: "2027-03-15",
        support: "Active"
      },
      alerts: [
        { type: "Info", message: "VPN tunnel established", timestamp: "2024-12-10 14:00" },
        { type: "Warning", message: "Memory usage above 80%", timestamp: "2024-12-10 13:15" }
      ]
    },
    {
      id: "DEV-003",
      name: "Router 01",
      type: "Router",
      model: "Cisco ISR 4331",
      manufacturer: "Cisco",
      serialNumber: "FDO2140L0A1",
      ipAddress: "192.168.1.3",
      macAddress: "00:1A:2B:3C:4D:5F",
      location: "Lagos HQ - Network Rack 1",
      status: "Online",
      uptime: "45 days, 12 hours",
      lastSeen: "2024-12-10 14:30:15",
      firmware: "16.09.07",
      hardware: {
        cpu: 28,
        memory: 52,
        temperature: 35,
        power: 92
      },
      ports: {
        total: 8,
        used: 6,
        available: 2,
        gigabit: 6,
        tenGigabit: 2
      },
      traffic: {
        in: "500 Mbps",
        out: "480 Mbps",
        utilization: 35,
        packets: "1.2M pps"
      },
      configuration: {
        vlan: "VLAN 1",
        spanningTree: "N/A",
        portSecurity: "Enabled",
        qos: "Enabled"
      },
      maintenance: {
        lastMaintenance: "2024-10-30",
        nextMaintenance: "2025-04-30",
        warranty: "2026-08-20",
        support: "Active"
      },
      alerts: [
        { type: "Info", message: "BGP session established", timestamp: "2024-12-10 14:00" },
        { type: "Info", message: "OSPF neighbor up", timestamp: "2024-12-10 13:45" }
      ]
    },
    {
      id: "DEV-004",
      name: "Access Point 01",
      type: "Wireless",
      model: "Cisco Aironet 2800",
      manufacturer: "Cisco",
      serialNumber: "FCW2140L0A2",
      ipAddress: "192.168.1.10",
      macAddress: "00:1A:2B:3C:4D:60",
      location: "Lagos HQ - Floor 1",
      status: "Online",
      uptime: "30 days, 8 hours",
      lastSeen: "2024-12-10 14:30:10",
      firmware: "8.10.151.0",
      hardware: {
        cpu: 15,
        memory: 32,
        temperature: 28,
        power: 75
      },
      ports: {
        total: 1,
        used: 1,
        available: 0,
        gigabit: 1,
        tenGigabit: 0
      },
      traffic: {
        in: "150 Mbps",
        out: "120 Mbps",
        utilization: 25,
        packets: "800K pps"
      },
      configuration: {
        vlan: "VLAN 20",
        spanningTree: "N/A",
        portSecurity: "N/A",
        qos: "Enabled"
      },
      maintenance: {
        lastMaintenance: "2024-11-15",
        nextMaintenance: "2025-05-15",
        warranty: "2026-06-10",
        support: "Active"
      },
      alerts: [
        { type: "Info", message: "25 clients connected", timestamp: "2024-12-10 14:00" },
        { type: "Warning", message: "Signal strength low on channel 6", timestamp: "2024-12-10 13:30" }
      ]
    },
    {
      id: "DEV-005",
      name: "Load Balancer 01",
      type: "Load Balancer",
      model: "F5 BIG-IP 2000",
      manufacturer: "F5 Networks",
      serialNumber: "F5-BIG-IP-2000-001",
      ipAddress: "192.168.1.5",
      macAddress: "00:0C:29:12:34:56",
      location: "Lagos HQ - Network Rack 2",
      status: "Maintenance",
      uptime: "2 days, 4 hours",
      lastSeen: "2024-12-10 14:30:05",
      firmware: "16.1.2",
      hardware: {
        cpu: 45,
        memory: 68,
        temperature: 45,
        power: 85
      },
      ports: {
        total: 12,
        used: 8,
        available: 4,
        gigabit: 8,
        tenGigabit: 4
      },
      traffic: {
        in: "2.1 Gbps",
        out: "1.9 Gbps",
        utilization: 85,
        packets: "3.2M pps"
      },
      configuration: {
        vlan: "VLAN 10",
        spanningTree: "N/A",
        portSecurity: "N/A",
        qos: "Enabled"
      },
      maintenance: {
        lastMaintenance: "2024-12-08",
        nextMaintenance: "2024-12-12",
        warranty: "2027-01-15",
        support: "Active"
      },
      alerts: [
        { type: "Critical", message: "High CPU usage detected", timestamp: "2024-12-10 14:15" },
        { type: "Warning", message: "Pool member down", timestamp: "2024-12-10 13:45" }
      ]
    },
    {
      id: "DEV-006",
      name: "Server 01",
      type: "Server",
      model: "Dell PowerEdge R740",
      manufacturer: "Dell",
      serialNumber: "7X8K9L2",
      ipAddress: "192.168.10.10",
      macAddress: "00:1B:44:11:3A:B7",
      location: "Lagos HQ - Server Room 1",
      status: "Online",
      uptime: "120 days, 6 hours",
      lastSeen: "2024-12-10 14:30:00",
      firmware: "2.15.0",
      hardware: {
        cpu: 60,
        memory: 75,
        temperature: 38,
        power: 78
      },
      ports: {
        total: 4,
        used: 2,
        available: 2,
        gigabit: 4,
        tenGigabit: 0
      },
      traffic: {
        in: "800 Mbps",
        out: "600 Mbps",
        utilization: 70,
        packets: "1.5M pps"
      },
      configuration: {
        vlan: "VLAN 10",
        spanningTree: "N/A",
        portSecurity: "N/A",
        qos: "Enabled"
      },
      maintenance: {
        lastMaintenance: "2024-10-15",
        nextMaintenance: "2025-01-15",
        warranty: "2026-03-20",
        support: "Active"
      },
      alerts: [
        { type: "Warning", message: "Memory usage above 80%", timestamp: "2024-12-10 14:00" },
        { type: "Info", message: "Backup completed successfully", timestamp: "2024-12-10 02:00" }
      ]
    }
  ];

  const deviceTypes = [
    { value: "all", label: "All Types" },
    { value: "switch", label: "Switch" },
    { value: "router", label: "Router" },
    { value: "firewall", label: "Firewall" },
    { value: "wireless", label: "Wireless" },
    { value: "server", label: "Server" },
    { value: "load_balancer", label: "Load Balancer" }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "online", label: "Online" },
    { value: "offline", label: "Offline" },
    { value: "maintenance", label: "Maintenance" },
    { value: "warning", label: "Warning" }
  ];

  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.ipAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || 
                       device.type.toLowerCase() === typeFilter;
    const matchesStatus = statusFilter === "all" || 
                         device.status.toLowerCase() === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const statusColorMap = {
    'Online': 'bg-green-100 text-green-800',
    'Offline': 'bg-red-100 text-red-800',
    'Maintenance': 'bg-yellow-100 text-yellow-800',
    'Warning': 'bg-orange-100 text-orange-800'
  };

  const typeIconMap = {
    'Switch': Router,
    'Router': Network,
    'Firewall': Shield,
    'Wireless': Wifi,
    'Server': Server,
    'Load Balancer': Activity
  };

  const alertTypeColorMap = {
    'Critical': 'bg-red-100 text-red-800',
    'Warning': 'bg-yellow-100 text-yellow-800',
    'Info': 'bg-blue-100 text-blue-800'
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'bg-red-100 text-red-800';
    if (utilization >= 80) return 'bg-orange-100 text-orange-800';
    if (utilization >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getTemperatureColor = (temp: number) => {
    if (temp >= 60) return 'bg-red-100 text-red-800';
    if (temp >= 50) return 'bg-orange-100 text-orange-800';
    if (temp >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Network Devices</h1>
          <p className="text-gray-600">Manage and monitor network devices and infrastructure</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/ict/network/devices/add"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Device
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh All
          </button>
        </div>
      </div>

      {/* Device Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {deviceStats.map((stat) => (
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
                stat.status === 'Growing' ? 'bg-green-100 text-green-800' :
                stat.status === 'Healthy' ? 'bg-blue-100 text-blue-800' :
                stat.status === 'Improving' ? 'bg-green-100 text-green-800' :
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
                placeholder="Search devices by name, model, IP, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {deviceTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
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

      {/* Devices Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredDevices.map((device) => {
          const TypeIcon = typeIconMap[device.type as keyof typeof typeIconMap] || Network;
          
          return (
            <div key={device.id} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <TypeIcon className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{device.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[device.status as keyof typeof statusColorMap]}`}>
                      {device.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{device.model} | {device.manufacturer}</p>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p><span className="font-medium">IP:</span> {device.ipAddress}</p>
                    <p><span className="font-medium">Location:</span> {device.location}</p>
                    <p><span className="font-medium">Serial:</span> {device.serialNumber}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg">
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Uptime</p>
                    <p className="text-sm text-gray-600">{device.uptime}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Firmware</p>
                    <p className="text-sm text-gray-600">{device.firmware}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Last Seen</p>
                    <p className="text-sm text-gray-600">{device.lastSeen}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">MAC Address</p>
                    <p className="text-sm text-gray-600">{device.macAddress}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Hardware Status:</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>CPU Usage</span>
                      <span className={device.hardware.cpu >= 80 ? 'text-red-600' : device.hardware.cpu >= 60 ? 'text-yellow-600' : 'text-green-600'}>
                        {device.hardware.cpu}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Memory Usage</span>
                      <span className={device.hardware.memory >= 80 ? 'text-red-600' : device.hardware.memory >= 60 ? 'text-yellow-600' : 'text-green-600'}>
                        {device.hardware.memory}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Temperature</span>
                      <span className={getTemperatureColor(device.hardware.temperature)}>
                        {device.hardware.temperature}°C
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Power</span>
                      <span className="text-green-600">{device.hardware.power}%</span>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Network Information:</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Ports</p>
                      <p className="text-sm text-gray-900">{device.ports.used}/{device.ports.total}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Traffic Utilization</p>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getUtilizationColor(device.traffic.utilization)}`}>
                        {device.traffic.utilization}%
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Traffic In</p>
                      <p className="text-sm text-gray-900">{device.traffic.in}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Traffic Out</p>
                      <p className="text-sm text-gray-900">{device.traffic.out}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Recent Alerts:</p>
                  <div className="space-y-2">
                    {device.alerts.slice(0, 2).map((alert, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{alert.message}</span>
                        <div className="flex items-center space-x-2">
                          <span className={`px-1 py-0.5 text-xs rounded ${alertTypeColorMap[alert.type as keyof typeof alertTypeColorMap]}`}>
                            {alert.type}
                          </span>
                          <span className="text-gray-500">{alert.timestamp}</span>
                        </div>
                      </div>
                    ))}
                    {device.alerts.length > 2 && (
                      <div className="text-xs text-blue-600">
                        +{device.alerts.length - 2} more alerts
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    <button className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                      <BarChart3 className="w-3 h-3 mr-1" />
                      Analytics
                    </button>
                    <button className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                      <Settings className="w-3 h-3 mr-1" />
                      Configure
                    </button>
                  </div>
                  <Link
                    href={`/ict/network/devices/${device.id}`}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Device Types Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Device Types Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {deviceTypes.slice(1).map((type) => {
            const count = devices.filter(device => device.type.toLowerCase() === type.value).length;
            const onlineCount = devices.filter(device => device.type.toLowerCase() === type.value && device.status === 'Online').length;
            const TypeIcon = typeIconMap[type.label as keyof typeof typeIconMap] || Network;
            
            return (
              <div key={type.value} className="p-4 border border-gray-200 rounded-lg text-center">
                <TypeIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h3 className="text-sm font-medium text-gray-900">{type.label}</h3>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500">{onlineCount} online</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Device Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/ict/network/devices/add"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Add Device</h3>
            <p className="text-xs text-gray-500">Register new device</p>
          </Link>
          <Link
            href="/ict/network/devices/bulk"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Upload className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Bulk Import</h3>
            <p className="text-xs text-gray-500">Import devices</p>
          </Link>
          <Link
            href="/ict/network/devices/maintenance"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Wrench className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Maintenance</h3>
            <p className="text-xs text-gray-500">Schedule maintenance</p>
          </Link>
          <Link
            href="/ict/network/devices/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Device Reports</h3>
            <p className="text-xs text-gray-500">Generate reports</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
