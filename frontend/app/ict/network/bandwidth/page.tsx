"use client";

import { useState } from "react";
import {
  Wifi,
  Activity,
  TrendingUp,
  TrendingDown,
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
  Shield,
  Database,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  Award,
  Star,
  Briefcase,
  Target,
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
  ArrowUp,
  ArrowDown,
  Circle,
  Square,
  Triangle,
  DollarSign,
  Calendar,
  Percent
} from "lucide-react";
import Link from "next/link";

export default function NetworkBandwidthPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const bandwidthStats = [
    {
      name: "Total Bandwidth",
      value: "10 Gbps",
      change: "+2.1%",
      changeType: "positive",
      icon: Wifi,
      description: "Available capacity",
      status: "Optimal"
    },
    {
      name: "Current Utilization",
      value: "68.5%",
      change: "+5.2%",
      changeType: "warning",
      icon: Activity,
      description: "Network usage",
      status: "Moderate"
    },
    {
      name: "Peak Usage",
      value: "8.2 Gbps",
      change: "+1.8%",
      changeType: "warning",
      icon: TrendingUp,
      description: "Highest recorded",
      status: "High"
    },
    {
      name: "Available Capacity",
      value: "3.2 Gbps",
      change: "-2.1%",
      changeType: "negative",
      icon: TrendingDown,
      description: "Remaining bandwidth",
      status: "Reducing"
    }
  ];

  const bandwidthData = [
    {
      id: "BW-001",
      location: "Lagos HQ - Core Network",
      type: "Core Switch",
      device: "Cisco Catalyst 9300",
      interface: "GigabitEthernet0/1",
      totalBandwidth: "10 Gbps",
      currentUsage: "6.8 Gbps",
      utilization: 68.0,
      peakUsage: "8.2 Gbps",
      averageUsage: "5.9 Gbps",
      status: "Normal",
      lastUpdated: "2024-12-10 14:30:25",
      trends: {
        hourly: "+2.1%",
        daily: "+5.2%",
        weekly: "+8.3%",
        monthly: "+12.1%"
      },
      applications: [
        { name: "Web Traffic", usage: "2.1 Gbps", percentage: 30.9 },
        { name: "Email", usage: "1.8 Gbps", percentage: 26.5 },
        { name: "File Transfer", usage: "1.5 Gbps", percentage: 22.1 },
        { name: "Video Conferencing", usage: "1.2 Gbps", percentage: 17.6 },
        { name: "Database", usage: "0.2 Gbps", percentage: 2.9 }
      ],
      protocols: [
        { name: "HTTP/HTTPS", usage: "3.2 Gbps", percentage: 47.1 },
        { name: "SMTP/POP3", usage: "1.8 Gbps", percentage: 26.5 },
        { name: "FTP/SFTP", usage: "1.5 Gbps", percentage: 22.1 },
        { name: "RTP", usage: "1.2 Gbps", percentage: 17.6 },
        { name: "MySQL", usage: "0.2 Gbps", percentage: 2.9 }
      ],
      topUsers: [
        { user: "admin@npa.gov.ng", usage: "1.2 Gbps", percentage: 17.6 },
        { user: "support@npa.gov.ng", usage: "0.9 Gbps", percentage: 13.2 },
        { user: "operations@npa.gov.ng", usage: "0.8 Gbps", percentage: 11.8 },
        { user: "finance@npa.gov.ng", usage: "0.6 Gbps", percentage: 8.8 },
        { user: "hr@npa.gov.ng", usage: "0.5 Gbps", percentage: 7.4 }
      ],
      alerts: [
        { type: "Warning", message: "Utilization approaching 70% threshold", timestamp: "2024-12-10 14:15:00" },
        { type: "Info", message: "Peak usage recorded at 13:45", timestamp: "2024-12-10 13:45:00" }
      ]
    },
    {
      id: "BW-002",
      location: "Lagos HQ - Data Center",
      type: "Server Farm",
      device: "Dell PowerEdge R740",
      interface: "Network Interface 1",
      totalBandwidth: "5 Gbps",
      currentUsage: "4.1 Gbps",
      utilization: 82.0,
      peakUsage: "4.8 Gbps",
      averageUsage: "3.7 Gbps",
      status: "High",
      lastUpdated: "2024-12-10 14:30:20",
      trends: {
        hourly: "+3.2%",
        daily: "+7.1%",
        weekly: "+11.4%",
        monthly: "+18.2%"
      },
      applications: [
        { name: "Database Operations", usage: "2.1 Gbps", percentage: 51.2 },
        { name: "Backup Operations", usage: "1.2 Gbps", percentage: 29.3 },
        { name: "Application Services", usage: "0.6 Gbps", percentage: 14.6 },
        { name: "Monitoring", usage: "0.2 Gbps", percentage: 4.9 }
      ],
      protocols: [
        { name: "MySQL", usage: "2.1 Gbps", percentage: 51.2 },
        { name: "NFS", usage: "1.2 Gbps", percentage: 29.3 },
        { name: "HTTP/HTTPS", usage: "0.6 Gbps", percentage: 14.6 },
        { name: "SNMP", usage: "0.2 Gbps", percentage: 4.9 }
      ],
      topUsers: [
        { user: "dbadmin@npa.gov.ng", usage: "1.8 Gbps", percentage: 43.9 },
        { user: "backup@npa.gov.ng", usage: "1.2 Gbps", percentage: 29.3 },
        { user: "monitoring@npa.gov.ng", usage: "0.6 Gbps", percentage: 14.6 },
        { user: "appadmin@npa.gov.ng", usage: "0.5 Gbps", percentage: 12.2 }
      ],
      alerts: [
        { type: "Critical", message: "Utilization above 80% threshold", timestamp: "2024-12-10 14:20:00" },
        { type: "Warning", message: "Database backup causing high usage", timestamp: "2024-12-10 14:00:00" }
      ]
    },
    {
      id: "BW-003",
      location: "Lagos HQ - Wireless Network",
      type: "Access Point",
      device: "Cisco Aironet 2800",
      interface: "Radio 0",
      totalBandwidth: "1.3 Gbps",
      currentUsage: "0.8 Gbps",
      utilization: 61.5,
      peakUsage: "1.1 Gbps",
      averageUsage: "0.7 Gbps",
      status: "Normal",
      lastUpdated: "2024-12-10 14:30:15",
      trends: {
        hourly: "+1.5%",
        daily: "+3.8%",
        weekly: "+6.2%",
        monthly: "+9.7%"
      },
      applications: [
        { name: "Web Browsing", usage: "0.4 Gbps", percentage: 50.0 },
        { name: "Email", usage: "0.2 Gbps", percentage: 25.0 },
        { name: "Video Streaming", usage: "0.1 Gbps", percentage: 12.5 },
        { name: "File Downloads", usage: "0.1 Gbps", percentage: 12.5 }
      ],
      protocols: [
        { name: "HTTP/HTTPS", usage: "0.5 Gbps", percentage: 62.5 },
        { name: "SMTP/POP3", usage: "0.2 Gbps", percentage: 25.0 },
        { name: "RTP", usage: "0.1 Gbps", percentage: 12.5 }
      ],
      topUsers: [
        { user: "mobile.user1@npa.gov.ng", usage: "0.2 Gbps", percentage: 25.0 },
        { user: "mobile.user2@npa.gov.ng", usage: "0.15 Gbps", percentage: 18.8 },
        { user: "mobile.user3@npa.gov.ng", usage: "0.12 Gbps", percentage: 15.0 },
        { user: "mobile.user4@npa.gov.ng", usage: "0.1 Gbps", percentage: 12.5 },
        { user: "mobile.user5@npa.gov.ng", usage: "0.08 Gbps", percentage: 10.0 }
      ],
      alerts: [
        { type: "Info", message: "25 clients connected", timestamp: "2024-12-10 14:00:00" },
        { type: "Warning", message: "Signal strength low on channel 6", timestamp: "2024-12-10 13:30:00" }
      ]
    },
    {
      id: "BW-004",
      location: "Port Harcourt Branch",
      type: "WAN Link",
      device: "Cisco ISR 4331",
      interface: "GigabitEthernet0/0/0",
      totalBandwidth: "2 Gbps",
      currentUsage: "1.1 Gbps",
      utilization: 55.0,
      peakUsage: "1.6 Gbps",
      averageUsage: "0.9 Gbps",
      status: "Normal",
      lastUpdated: "2024-12-10 14:30:10",
      trends: {
        hourly: "+0.8%",
        daily: "+2.1%",
        weekly: "+4.3%",
        monthly: "+7.8%"
      },
      applications: [
        { name: "Branch Communication", usage: "0.6 Gbps", percentage: 54.5 },
        { name: "File Synchronization", usage: "0.3 Gbps", percentage: 27.3 },
        { name: "Video Conferencing", usage: "0.2 Gbps", percentage: 18.2 }
      ],
      protocols: [
        { name: "IPSec", usage: "0.8 Gbps", percentage: 72.7 },
        { name: "HTTP/HTTPS", usage: "0.2 Gbps", percentage: 18.2 },
        { name: "RTP", usage: "0.1 Gbps", percentage: 9.1 }
      ],
      topUsers: [
        { user: "branch.manager@npa.gov.ng", usage: "0.3 Gbps", percentage: 27.3 },
        { user: "branch.ops@npa.gov.ng", usage: "0.25 Gbps", percentage: 22.7 },
        { user: "branch.admin@npa.gov.ng", usage: "0.2 Gbps", percentage: 18.2 },
        { user: "branch.support@npa.gov.ng", usage: "0.15 Gbps", percentage: 13.6 },
        { user: "branch.user@npa.gov.ng", usage: "0.1 Gbps", percentage: 9.1 }
      ],
      alerts: [
        { type: "Info", message: "VPN tunnel established", timestamp: "2024-12-10 14:00:00" },
        { type: "Info", message: "Branch sync completed", timestamp: "2024-12-10 13:45:00" }
      ]
    },
    {
      id: "BW-005",
      location: "Calabar Branch",
      type: "WAN Link",
      device: "Cisco ISR 4331",
      interface: "GigabitEthernet0/0/0",
      totalBandwidth: "1.5 Gbps",
      currentUsage: "0.9 Gbps",
      utilization: 60.0,
      peakUsage: "1.3 Gbps",
      averageUsage: "0.8 Gbps",
      status: "Normal",
      lastUpdated: "2024-12-10 14:30:05",
      trends: {
        hourly: "+1.2%",
        daily: "+3.1%",
        weekly: "+5.8%",
        monthly: "+10.2%"
      },
      applications: [
        { name: "Branch Communication", usage: "0.5 Gbps", percentage: 55.6 },
        { name: "File Synchronization", usage: "0.25 Gbps", percentage: 27.8 },
        { name: "Video Conferencing", usage: "0.15 Gbps", percentage: 16.7 }
      ],
      protocols: [
        { name: "IPSec", usage: "0.7 Gbps", percentage: 77.8 },
        { name: "HTTP/HTTPS", usage: "0.15 Gbps", percentage: 16.7 },
        { name: "RTP", usage: "0.05 Gbps", percentage: 5.6 }
      ],
      topUsers: [
        { user: "calabar.manager@npa.gov.ng", usage: "0.25 Gbps", percentage: 27.8 },
        { user: "calabar.ops@npa.gov.ng", usage: "0.2 Gbps", percentage: 22.2 },
        { user: "calabar.admin@npa.gov.ng", usage: "0.15 Gbps", percentage: 16.7 },
        { user: "calabar.support@npa.gov.ng", usage: "0.1 Gbps", percentage: 11.1 },
        { user: "calabar.user@npa.gov.ng", usage: "0.1 Gbps", percentage: 11.1 }
      ],
      alerts: [
        { type: "Info", message: "VPN tunnel established", timestamp: "2024-12-10 14:00:00" },
        { type: "Info", message: "Branch sync in progress", timestamp: "2024-12-10 13:50:00" }
      ]
    }
  ];

  const locationOptions = [
    { value: "all", label: "All Locations" },
    { value: "lagos_hq", label: "Lagos HQ" },
    { value: "port_harcourt", label: "Port Harcourt Branch" },
    { value: "calabar", label: "Calabar Branch" },
    { value: "data_center", label: "Data Center" }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "normal", label: "Normal" },
    { value: "high", label: "High" },
    { value: "critical", label: "Critical" },
    { value: "warning", label: "Warning" }
  ];

  const filteredData = bandwidthData.filter(item => {
    const matchesSearch = item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.device.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLocation = locationFilter === "all" || 
                           item.location.toLowerCase().includes(locationFilter);
    const matchesStatus = statusFilter === "all" || 
                         item.status.toLowerCase() === statusFilter;
    
    return matchesSearch && matchesLocation && matchesStatus;
  });

  const statusColorMap = {
    'Normal': 'bg-green-100 text-green-800',
    'High': 'bg-yellow-100 text-yellow-800',
    'Critical': 'bg-red-100 text-red-800',
    'Warning': 'bg-orange-100 text-orange-800'
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

  const getTrendIcon = (trend: string) => {
    if (trend.startsWith('+')) return <TrendingUp className="w-3 h-3 text-red-600" />;
    if (trend.startsWith('-')) return <TrendingDown className="w-3 h-3 text-green-600" />;
    return <Minus className="w-3 h-3 text-gray-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Network Bandwidth</h1>
          <p className="text-gray-600">Monitor and analyze network bandwidth utilization across all locations</p>
        </div>
        <div className="flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh All
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <BarChart3 className="w-4 h-4 mr-2" />
            Bandwidth Report
          </button>
        </div>
      </div>

      {/* Bandwidth Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {bandwidthStats.map((stat) => (
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
                stat.status === 'Optimal' ? 'bg-green-100 text-green-800' :
                stat.status === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                stat.status === 'High' ? 'bg-orange-100 text-orange-800' :
                'bg-red-100 text-red-800'
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
                placeholder="Search bandwidth data by location, device, or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {locationOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
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

      {/* Bandwidth Data Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredData.map((data) => (
          <div key={data.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Wifi className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{data.location}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[data.status as keyof typeof statusColorMap]}`}>
                    {data.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{data.type} | {data.device}</p>
                <div className="text-sm text-gray-500 space-y-1">
                  <p><span className="font-medium">Interface:</span> {data.interface}</p>
                  <p><span className="font-medium">Total Bandwidth:</span> {data.totalBandwidth}</p>
                  <p><span className="font-medium">Last Updated:</span> {data.lastUpdated}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg">
                  <BarChart3 className="w-4 h-4" />
                </button>
                <button className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Current Usage</p>
                  <p className="text-lg font-bold text-gray-900">{data.currentUsage}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Peak Usage</p>
                  <p className="text-lg font-bold text-gray-900">{data.peakUsage}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Average Usage</p>
                  <p className="text-sm text-gray-600">{data.averageUsage}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Utilization</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getUtilizationColor(data.utilization)}`}>
                    {data.utilization}%
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Bandwidth Utilization</span>
                  <span>{data.utilization}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      data.utilization >= 90 ? 'bg-red-600' :
                      data.utilization >= 80 ? 'bg-orange-600' :
                      data.utilization >= 70 ? 'bg-yellow-600' : 'bg-green-600'
                    }`}
                    style={{ width: `${data.utilization}%` }}
                  ></div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Usage Trends:</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Hourly</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-900">{data.trends.hourly}</span>
                      {getTrendIcon(data.trends.hourly)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Daily</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-900">{data.trends.daily}</span>
                      {getTrendIcon(data.trends.daily)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Weekly</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-900">{data.trends.weekly}</span>
                      {getTrendIcon(data.trends.weekly)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Monthly</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-900">{data.trends.monthly}</span>
                      {getTrendIcon(data.trends.monthly)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Top Applications:</p>
                <div className="space-y-2">
                  {data.applications.slice(0, 3).map((app, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{app.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-900">{app.usage}</span>
                        <span className="text-gray-500">({app.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                  {data.applications.length > 3 && (
                    <div className="text-xs text-blue-600">
                      +{data.applications.length - 3} more applications
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Recent Alerts:</p>
                <div className="space-y-2">
                  {data.alerts.slice(0, 2).map((alert, index) => (
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
                  {data.alerts.length > 2 && (
                    <div className="text-xs text-blue-600">
                      +{data.alerts.length - 2} more alerts
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
                  href={`/ict/network/bandwidth/${data.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bandwidth Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Bandwidth Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Normal Utilization</h3>
                <p className="text-xs text-gray-500">Below 70% threshold</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {bandwidthData.filter(item => item.utilization < 70).length}</p>
              <p>Avg. Usage: {bandwidthData.filter(item => item.utilization < 70).reduce((sum, item) => sum + item.utilization, 0) / bandwidthData.filter(item => item.utilization < 70).length || 0}%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">High Utilization</h3>
                <p className="text-xs text-gray-500">Above 70% threshold</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {bandwidthData.filter(item => item.utilization >= 70).length}</p>
              <p>Avg. Usage: {bandwidthData.filter(item => item.utilization >= 70).reduce((sum, item) => sum + item.utilization, 0) / bandwidthData.filter(item => item.utilization >= 70).length || 0}%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Critical Utilization</h3>
                <p className="text-xs text-gray-500">Above 80% threshold</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {bandwidthData.filter(item => item.utilization >= 80).length}</p>
              <p>Avg. Usage: {bandwidthData.filter(item => item.utilization >= 80).reduce((sum, item) => sum + item.utilization, 0) / bandwidthData.filter(item => item.utilization >= 80).length || 0}%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Total Bandwidth</h3>
                <p className="text-xs text-gray-500">Available capacity</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Total: {bandwidthData.reduce((sum, item) => sum + parseFloat(item.totalBandwidth), 0)} Gbps</p>
              <p>Used: {bandwidthData.reduce((sum, item) => sum + parseFloat(item.currentUsage), 0)} Gbps</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Bandwidth Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/ict/network/bandwidth/analytics"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Bandwidth Analytics</h3>
            <p className="text-xs text-gray-500">View analytics</p>
          </Link>
          <Link
            href="/ict/network/bandwidth/forecasts"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <TrendingUp className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Usage Forecasts</h3>
            <p className="text-xs text-gray-500">Predict usage</p>
          </Link>
          <Link
            href="/ict/network/bandwidth/alerts"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <AlertTriangle className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Bandwidth Alerts</h3>
            <p className="text-xs text-gray-500">Manage alerts</p>
          </Link>
          <Link
            href="/ict/network/bandwidth/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Bandwidth Reports</h3>
            <p className="text-xs text-gray-500">Generate reports</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
