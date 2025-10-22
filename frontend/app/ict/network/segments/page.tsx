"use client";

import { useState } from "react";
import {
  Network,
  Layers,
  Activity,
  Shield,
  Filter,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle,
  Minus,
  FileText,
  MapPin,
  Building,
  Users,
  Globe,
  Zap,
  Database,
  HardDrive,
  Cpu,
  MemoryStick,
  Award,
  Star,
  Briefcase,
  DollarSign,
  Percent,
  ArrowUp,
  ArrowDown,
  Circle,
  Square,
  Triangle,
  Monitor,
  Smartphone,
  Laptop,
  Printer,
  Camera,
  Wrench,
  Tool,
  Router,
  Server,
  GitCommit,
  Code,
  GitBranch,
  Play,
  Pause,
  Stop,
  Wifi,
  Bug,
  User,
  Target,
  Gauge,
  Zap as Lightning,
  Link as LinkIcon,
  WifiOff,
  Signal,
  Wifi as WifiIcon,
  Video,
  Headphones,
  Presentation,
  FileVideo,
  Book,
  PenTool,
  Clipboard,
  CheckSquare,
  Square as SquareIcon,
  Navigation,
  Waves,
  Wind,
  Droplets,
  Thermometer,
  Gauge as Speedometer,
  Route,
  Flag,
  Map,
  Settings,
  BarChart3,
  PieChart,
  Calendar
} from "lucide-react";
import Link from "next/link";

export default function ICTNetworkSegmentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const segmentStats = [
    {
      name: "Total Segments",
      value: "24",
      change: "+2",
      changeType: "positive",
      icon: Network,
      description: "Active network segments",
      status: "Growing"
    },
    {
      name: "Active Segments",
      value: "22",
      change: "+1",
      changeType: "positive",
      icon: CheckCircle,
      description: "Currently operational",
      status: "Healthy"
    },
    {
      name: "VLANs",
      value: "156",
      change: "+8",
      changeType: "positive",
      icon: Layers,
      description: "Virtual LANs configured",
      status: "Active"
    },
    {
      name: "Security Zones",
      value: "12",
      change: "0",
      changeType: "neutral",
      icon: Shield,
      description: "Security boundaries",
      status: "Stable"
    }
  ];

  const networkSegments = [
    {
      id: "SEG-001",
      name: "Core Network Segment",
      type: "Core",
      status: "Active",
      vlanId: 1,
      subnet: "10.0.0.0/16",
      gateway: "10.0.0.1",
      dhcp: "10.0.0.10-10.0.0.100",
      dns: ["10.0.0.2", "10.0.0.3"],
      description: "Primary core network segment for critical infrastructure",
      location: "Data Center A",
      createdDate: "2024-01-15",
      lastUpdated: "2024-12-10",
      devices: 45,
      users: 0,
      bandwidth: "10 Gbps",
      utilization: 68,
      securityLevel: "High",
      protocols: ["OSPF", "BGP", "MPLS"],
      services: ["DHCP", "DNS", "NTP", "SNMP"],
      accessControl: "Strict",
      monitoring: {
        enabled: true,
        tools: ["SNMP", "NetFlow", "Syslog"],
        alerts: 2,
        lastAlert: "2024-12-09 14:30:00"
      },
      redundancy: {
        enabled: true,
        type: "HSRP",
        backup: "10.0.0.2"
      },
      qos: {
        enabled: true,
        policies: ["Voice", "Video", "Data"],
        priority: "High"
      },
      compliance: {
        standards: ["ISO 27001", "PCI DSS"],
        lastAudit: "2024-11-15",
        status: "Compliant"
      },
      maintenance: {
        window: "Sunday 02:00-04:00",
        lastMaintenance: "2024-12-08",
        nextMaintenance: "2024-12-15"
      }
    },
    {
      id: "SEG-002",
      name: "Office Network Segment",
      type: "Access",
      status: "Active",
      vlanId: 100,
      subnet: "192.168.1.0/24",
      gateway: "192.168.1.1",
      dhcp: "192.168.1.10-192.168.1.200",
      dns: ["192.168.1.2", "8.8.8.8"],
      description: "Office network segment for employee workstations and devices",
      location: "Building A - Floors 1-5",
      createdDate: "2024-02-20",
      lastUpdated: "2024-12-09",
      devices: 156,
      users: 142,
      bandwidth: "1 Gbps",
      utilization: 45,
      securityLevel: "Medium",
      protocols: ["STP", "VLAN", "LLDP"],
      services: ["DHCP", "DNS", "HTTP", "HTTPS"],
      accessControl: "Standard",
      monitoring: {
        enabled: true,
        tools: ["SNMP", "NetFlow"],
        alerts: 0,
        lastAlert: null
      },
      redundancy: {
        enabled: false,
        type: null,
        backup: null
      },
      qos: {
        enabled: true,
        policies: ["Voice", "Data"],
        priority: "Medium"
      },
      compliance: {
        standards: ["ISO 27001"],
        lastAudit: "2024-11-20",
        status: "Compliant"
      },
      maintenance: {
        window: "Saturday 22:00-24:00",
        lastMaintenance: "2024-12-07",
        nextMaintenance: "2024-12-14"
      }
    },
    {
      id: "SEG-003",
      name: "DMZ Network Segment",
      type: "DMZ",
      status: "Active",
      vlanId: 200,
      subnet: "172.16.0.0/24",
      gateway: "172.16.0.1",
      dhcp: "172.16.0.10-172.16.0.50",
      dns: ["172.16.0.2", "172.16.0.3"],
      description: "Demilitarized zone for public-facing servers and services",
      location: "Data Center B",
      createdDate: "2024-03-10",
      lastUpdated: "2024-12-08",
      devices: 12,
      users: 0,
      bandwidth: "2 Gbps",
      utilization: 32,
      securityLevel: "High",
      protocols: ["OSPF", "BGP"],
      services: ["HTTP", "HTTPS", "FTP", "SMTP"],
      accessControl: "Restricted",
      monitoring: {
        enabled: true,
        tools: ["SNMP", "NetFlow", "IDS", "IPS"],
        alerts: 1,
        lastAlert: "2024-12-10 09:15:00"
      },
      redundancy: {
        enabled: true,
        type: "VRRP",
        backup: "172.16.0.2"
      },
      qos: {
        enabled: true,
        policies: ["Web", "Email", "FTP"],
        priority: "High"
      },
      compliance: {
        standards: ["ISO 27001", "PCI DSS", "SOX"],
        lastAudit: "2024-11-25",
        status: "Compliant"
      },
      maintenance: {
        window: "Sunday 01:00-03:00",
        lastMaintenance: "2024-12-08",
        nextMaintenance: "2024-12-15"
      }
    },
    {
      id: "SEG-004",
      name: "Guest Network Segment",
      type: "Guest",
      status: "Active",
      vlanId: 300,
      subnet: "192.168.100.0/24",
      gateway: "192.168.100.1",
      dhcp: "192.168.100.10-192.168.100.200",
      dns: ["8.8.8.8", "8.8.4.4"],
      description: "Guest network for visitors and temporary access",
      location: "All Buildings",
      createdDate: "2024-04-05",
      lastUpdated: "2024-12-07",
      devices: 89,
      users: 67,
      bandwidth: "500 Mbps",
      utilization: 28,
      securityLevel: "Low",
      protocols: ["VLAN", "WPA2"],
      services: ["DHCP", "DNS", "HTTP", "HTTPS"],
      accessControl: "Open",
      monitoring: {
        enabled: true,
        tools: ["SNMP", "NetFlow"],
        alerts: 0,
        lastAlert: null
      },
      redundancy: {
        enabled: false,
        type: null,
        backup: null
      },
      qos: {
        enabled: false,
        policies: [],
        priority: "Low"
      },
      compliance: {
        standards: ["ISO 27001"],
        lastAudit: "2024-11-30",
        status: "Compliant"
      },
      maintenance: {
        window: "Saturday 23:00-01:00",
        lastMaintenance: "2024-12-06",
        nextMaintenance: "2024-12-13"
      }
    },
    {
      id: "SEG-005",
      name: "Management Network Segment",
      type: "Management",
      status: "Active",
      vlanId: 400,
      subnet: "10.1.0.0/24",
      gateway: "10.1.0.1",
      dhcp: "10.1.0.10-10.1.0.50",
      dns: ["10.1.0.2", "10.1.0.3"],
      description: "Out-of-band management network for network devices",
      location: "Data Center A & B",
      createdDate: "2024-05-12",
      lastUpdated: "2024-12-09",
      devices: 28,
      users: 8,
      bandwidth: "100 Mbps",
      utilization: 15,
      securityLevel: "Critical",
      protocols: ["SSH", "SNMP", "HTTPS"],
      services: ["SSH", "SNMP", "HTTPS", "TACACS+"],
      accessControl: "Restricted",
      monitoring: {
        enabled: true,
        tools: ["SNMP", "Syslog", "TACACS+"],
        alerts: 0,
        lastAlert: null
      },
      redundancy: {
        enabled: true,
        type: "HSRP",
        backup: "10.1.0.2"
      },
      qos: {
        enabled: true,
        policies: ["Management"],
        priority: "Critical"
      },
      compliance: {
        standards: ["ISO 27001", "PCI DSS", "SOX"],
        lastAudit: "2024-12-01",
        status: "Compliant"
      },
      maintenance: {
        window: "Sunday 00:00-02:00",
        lastMaintenance: "2024-12-08",
        nextMaintenance: "2024-12-15"
      }
    }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "maintenance", label: "Maintenance" },
    { value: "error", label: "Error" }
  ];

  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: "core", label: "Core" },
    { value: "access", label: "Access" },
    { value: "dmz", label: "DMZ" },
    { value: "guest", label: "Guest" },
    { value: "management", label: "Management" }
  ];

  const filteredSegments = networkSegments.filter(segment => {
    const matchesSearch = segment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         segment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         segment.subnet.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         segment.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         segment.status.toLowerCase() === statusFilter;
    const matchesType = typeFilter === "all" || 
                       segment.type.toLowerCase() === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const statusColorMap = {
    'Active': 'bg-green-100 text-green-800',
    'Inactive': 'bg-gray-100 text-gray-800',
    'Maintenance': 'bg-yellow-100 text-yellow-800',
    'Error': 'bg-red-100 text-red-800'
  };

  const typeColorMap = {
    'Core': 'bg-blue-100 text-blue-800',
    'Access': 'bg-green-100 text-green-800',
    'DMZ': 'bg-orange-100 text-orange-800',
    'Guest': 'bg-purple-100 text-purple-800',
    'Management': 'bg-red-100 text-red-800'
  };

  const securityLevelColorMap = {
    'Critical': 'bg-red-100 text-red-800',
    'High': 'bg-orange-100 text-orange-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-green-100 text-green-800'
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'text-red-600';
    if (utilization >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Network Segments</h1>
          <p className="text-gray-600">Manage and monitor network segments and VLANs</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/ict/network/segments/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Segment
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <BarChart3 className="w-4 h-4 mr-2" />
            Generate Report
          </button>
        </div>
      </div>

      {/* Segment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {segmentStats.map((stat) => (
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
                stat.changeType === 'neutral' ? 'text-gray-600' : 'text-red-600'
              }`}>
                {stat.change}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                stat.status === 'Growing' ? 'bg-green-100 text-green-800' :
                stat.status === 'Healthy' ? 'bg-blue-100 text-blue-800' :
                stat.status === 'Active' ? 'bg-purple-100 text-purple-800' :
                'bg-gray-100 text-gray-800'
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
                placeholder="Search segments by name, description, subnet, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {typeOptions.map(option => (
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

      {/* Network Segments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredSegments.map((segment) => (
          <div key={segment.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Network className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{segment.name}</h3>
                  <span className="text-sm text-gray-500">#{segment.id}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{segment.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[segment.status as keyof typeof statusColorMap]}`}>
                    {segment.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeColorMap[segment.type as keyof typeof typeColorMap]}`}>
                    {segment.type}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${securityLevelColorMap[segment.securityLevel as keyof typeof securityLevelColorMap]}`}>
                    {segment.securityLevel} Security
                  </span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg">
                  <Activity className="w-4 h-4" />
                </button>
                <button className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">VLAN ID</p>
                  <p className="text-sm text-gray-600">{segment.vlanId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Subnet</p>
                  <p className="text-sm text-gray-600 font-mono">{segment.subnet}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Gateway</p>
                  <p className="text-sm text-gray-600 font-mono">{segment.gateway}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Location</p>
                  <p className="text-sm text-gray-600">{segment.location}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Devices</p>
                  <p className="text-sm text-gray-600">{segment.devices}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Users</p>
                  <p className="text-sm text-gray-600">{segment.users}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Bandwidth</p>
                  <p className="text-sm text-gray-600">{segment.bandwidth}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Utilization</p>
                  <p className={`text-sm font-medium ${getUtilizationColor(segment.utilization)}`}>
                    {segment.utilization}%
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Network Configuration:</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">DHCP Range</p>
                    <p className="text-gray-900 font-mono">{segment.dhcp}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">DNS Servers</p>
                    <p className="text-gray-900 font-mono">{segment.dns.join(", ")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Access Control</p>
                    <p className="text-gray-900">{segment.accessControl}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Redundancy</p>
                    <p className="text-gray-900">{segment.redundancy.enabled ? segment.redundancy.type : "None"}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Protocols & Services:</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {segment.protocols.map((protocol, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      {protocol}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {segment.services.map((service, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                      {service}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Monitoring & Alerts:</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Monitoring</p>
                    <p className="text-gray-900">{segment.monitoring.enabled ? "Enabled" : "Disabled"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Active Alerts</p>
                    <p className="text-gray-900">{segment.monitoring.alerts}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Tools</p>
                    <p className="text-gray-900">{segment.monitoring.tools.join(", ")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Last Alert</p>
                    <p className="text-gray-900">{segment.monitoring.lastAlert || "None"}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Compliance & Maintenance:</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Compliance Status</p>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      segment.compliance.status === 'Compliant' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {segment.compliance.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Last Audit</p>
                    <p className="text-gray-900">{segment.compliance.lastAudit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Next Maintenance</p>
                    <p className="text-gray-900">{segment.maintenance.nextMaintenance}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Maintenance Window</p>
                    <p className="text-gray-900">{segment.maintenance.window}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                    <Eye className="w-3 h-3 mr-1" />
                    View Details
                  </button>
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                    <Activity className="w-3 h-3 mr-1" />
                    Monitor
                  </button>
                </div>
                <Link
                  href={`/ict/network/segments/${segment.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Network Segment Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Network Segment Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Active Segments</h3>
                <p className="text-xs text-gray-500">Currently operational</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {networkSegments.filter(s => s.status === 'Active').length}</p>
              <p>Percentage: {Math.round((networkSegments.filter(s => s.status === 'Active').length / networkSegments.length) * 100)}%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Layers className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Total VLANs</h3>
                <p className="text-xs text-gray-500">Virtual LANs</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {networkSegments.reduce((sum, s) => sum + 1, 0)}</p>
              <p>Range: 1-400</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Total Devices</h3>
                <p className="text-xs text-gray-500">Connected devices</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {networkSegments.reduce((sum, s) => sum + s.devices, 0)}</p>
              <p>Users: {networkSegments.reduce((sum, s) => sum + s.users, 0)}</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Security Zones</h3>
                <p className="text-xs text-gray-500">Security boundaries</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {new Set(networkSegments.map(s => s.securityLevel)).size}</p>
              <p>Levels: Critical, High, Medium, Low</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Network Segment Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/ict/network/segments/create"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Create Segment</h3>
            <p className="text-xs text-gray-500">New network segment</p>
          </Link>
          <Link
            href="/ict/network/segments/vlans"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Layers className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">VLAN Management</h3>
            <p className="text-xs text-gray-500">Manage VLANs</p>
          </Link>
          <Link
            href="/ict/network/segments/security"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Shield className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Security Policies</h3>
            <p className="text-xs text-gray-500">Configure security</p>
          </Link>
          <Link
            href="/ict/network/segments/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Segment Reports</h3>
            <p className="text-xs text-gray-500">Generate reports</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
