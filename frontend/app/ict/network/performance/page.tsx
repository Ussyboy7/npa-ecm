"use client";

import { useState } from "react";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Calendar,
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
  Shield,
  Database,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
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
  Layers,
  Link as LinkIcon,
  WifiOff,
  Signal,
  Wifi as WifiIcon
} from "lucide-react";
import Link from "next/link";

export default function ICTNetworkPerformancePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [metricFilter, setMetricFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("24h");

  const performanceStats = [
    {
      name: "Network Availability",
      value: "99.8%",
      change: "+0.2%",
      changeType: "positive",
      icon: CheckCircle,
      description: "Last 30 days",
      status: "Excellent"
    },
    {
      name: "Average Latency",
      value: "12.5ms",
      change: "-2.1ms",
      changeType: "positive",
      icon: Activity,
      description: "Core network",
      status: "Optimal"
    },
    {
      name: "Packet Loss",
      value: "0.02%",
      change: "-0.01%",
      changeType: "positive",
      icon: AlertTriangle,
      description: "Acceptable range",
      status: "Good"
    },
    {
      name: "Throughput",
      value: "2.4 Gbps",
      change: "+0.3 Gbps",
      changeType: "positive",
      icon: TrendingUp,
      description: "Peak utilization",
      status: "Growing"
    }
  ];

  const networkMetrics = [
    {
      id: "MET-001",
      name: "Core Router Performance",
      device: "Cisco ASR-1006",
      location: "Data Center A",
      status: "Optimal",
      lastUpdated: "2024-12-10 15:30:25",
      metrics: {
        cpu: 45,
        memory: 62,
        temperature: 42,
        uptime: "99.9%",
        latency: "8.2ms",
        throughput: "1.8 Gbps",
        packetLoss: "0.01%",
        errors: 0
      },
      trends: {
        cpu: "stable",
        memory: "stable",
        temperature: "stable",
        latency: "improving",
        throughput: "increasing",
        packetLoss: "stable"
      },
      alerts: [],
      healthScore: 95,
      description: "Primary core router handling main network traffic",
      interfaces: [
        { name: "GigabitEthernet0/0/0", status: "Up", speed: "1 Gbps", utilization: 78 },
        { name: "GigabitEthernet0/0/1", status: "Up", speed: "1 Gbps", utilization: 65 },
        { name: "TenGigabitEthernet0/1/0", status: "Up", speed: "10 Gbps", utilization: 45 }
      ],
      protocols: ["OSPF", "BGP", "MPLS", "VLAN"],
      neighbors: 12,
      routes: 15420
    },
    {
      id: "MET-002",
      name: "Distribution Switch Performance",
      device: "Cisco Catalyst 9300",
      location: "Building B - Floor 3",
      status: "Good",
      lastUpdated: "2024-12-10 15:28:15",
      metrics: {
        cpu: 38,
        memory: 55,
        temperature: 38,
        uptime: "99.7%",
        latency: "2.1ms",
        throughput: "850 Mbps",
        packetLoss: "0.02%",
        errors: 2
      },
      trends: {
        cpu: "stable",
        memory: "increasing",
        temperature: "stable",
        latency: "stable",
        throughput: "stable",
        packetLoss: "stable"
      },
      alerts: [
        { type: "Warning", message: "Memory usage approaching threshold", timestamp: "2024-12-10 14:45:00" }
      ],
      healthScore: 88,
      description: "Distribution switch serving office floor with 48 ports",
      interfaces: [
        { name: "GigabitEthernet1/0/1", status: "Up", speed: "1 Gbps", utilization: 92 },
        { name: "GigabitEthernet1/0/2", status: "Up", speed: "1 Gbps", utilization: 78 },
        { name: "GigabitEthernet1/0/3", status: "Down", speed: "1 Gbps", utilization: 0 },
        { name: "GigabitEthernet1/0/4", status: "Up", speed: "1 Gbps", utilization: 45 }
      ],
      protocols: ["STP", "VLAN", "LLDP", "CDP"],
      neighbors: 8,
      routes: 0
    },
    {
      id: "MET-003",
      name: "Wireless Controller Performance",
      device: "Cisco WLC 5520",
      location: "Data Center B",
      status: "Optimal",
      lastUpdated: "2024-12-10 15:25:45",
      metrics: {
        cpu: 28,
        memory: 42,
        temperature: 35,
        uptime: "99.9%",
        latency: "15.8ms",
        throughput: "1.2 Gbps",
        packetLoss: "0.01%",
        errors: 0
      },
      trends: {
        cpu: "stable",
        memory: "stable",
        temperature: "stable",
        latency: "stable",
        throughput: "increasing",
        packetLoss: "stable"
      },
      alerts: [],
      healthScore: 96,
      description: "Wireless LAN controller managing 45 access points",
      interfaces: [
        { name: "Management", status: "Up", speed: "1 Gbps", utilization: 25 },
        { name: "AP-Manager", status: "Up", speed: "1 Gbps", utilization: 68 },
        { name: "Service-Port", status: "Up", speed: "100 Mbps", utilization: 12 }
      ],
      protocols: ["CAPWAP", "LWAPP", "RADIUS", "DHCP"],
      neighbors: 45,
      routes: 0
    },
    {
      id: "MET-004",
      name: "Firewall Performance",
      device: "Fortinet FortiGate 3000D",
      location: "DMZ Zone",
      status: "Good",
      lastUpdated: "2024-12-10 15:27:30",
      metrics: {
        cpu: 52,
        memory: 68,
        temperature: 48,
        uptime: "99.8%",
        latency: "5.2ms",
        throughput: "2.1 Gbps",
        packetLoss: "0.01%",
        errors: 1
      },
      trends: {
        cpu: "increasing",
        memory: "stable",
        temperature: "stable",
        latency: "stable",
        throughput: "increasing",
        packetLoss: "stable"
      },
      alerts: [
        { type: "Info", message: "CPU usage increased due to security scanning", timestamp: "2024-12-10 15:00:00" }
      ],
      healthScore: 89,
      description: "Next-generation firewall providing security and VPN services",
      interfaces: [
        { name: "port1", status: "Up", speed: "10 Gbps", utilization: 35 },
        { name: "port2", status: "Up", speed: "10 Gbps", utilization: 42 },
        { name: "port3", status: "Up", speed: "1 Gbps", utilization: 78 }
      ],
      protocols: ["IPSec", "SSL-VPN", "NAT", "Firewall"],
      neighbors: 6,
      routes: 1250
    },
    {
      id: "MET-005",
      name: "Load Balancer Performance",
      device: "F5 BIG-IP 4200v",
      location: "Data Center A",
      status: "Optimal",
      lastUpdated: "2024-12-10 15:29:10",
      metrics: {
        cpu: 35,
        memory: 48,
        temperature: 40,
        uptime: "99.9%",
        latency: "3.8ms",
        throughput: "1.5 Gbps",
        packetLoss: "0.00%",
        errors: 0
      },
      trends: {
        cpu: "stable",
        memory: "stable",
        temperature: "stable",
        latency: "improving",
        throughput: "stable",
        packetLoss: "stable"
      },
      alerts: [],
      healthScore: 97,
      description: "Application delivery controller for web services",
      interfaces: [
        { name: "1.1", status: "Up", speed: "10 Gbps", utilization: 28 },
        { name: "1.2", status: "Up", speed: "10 Gbps", utilization: 32 },
        { name: "1.3", status: "Up", speed: "1 Gbps", utilization: 15 }
      ],
      protocols: ["HTTP", "HTTPS", "TCP", "UDP"],
      neighbors: 4,
      routes: 0
    }
  ];

  const metricOptions = [
    { value: "all", label: "All Metrics" },
    { value: "cpu", label: "CPU Usage" },
    { value: "memory", label: "Memory Usage" },
    { value: "latency", label: "Latency" },
    { value: "throughput", label: "Throughput" },
    { value: "packet_loss", label: "Packet Loss" }
  ];

  const timeOptions = [
    { value: "1h", label: "Last Hour" },
    { value: "24h", label: "Last 24 Hours" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" }
  ];

  const filteredMetrics = networkMetrics.filter(metric => {
    const matchesSearch = metric.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         metric.device.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         metric.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const statusColorMap = {
    'Optimal': 'bg-green-100 text-green-800',
    'Good': 'bg-blue-100 text-blue-800',
    'Warning': 'bg-yellow-100 text-yellow-800',
    'Critical': 'bg-red-100 text-red-800'
  };

  const trendColorMap = {
    'improving': 'text-green-600',
    'stable': 'text-gray-600',
    'increasing': 'text-blue-600',
    'decreasing': 'text-red-600'
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 95) return 'bg-green-100 text-green-800';
    if (score >= 85) return 'bg-blue-100 text-blue-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getMetricColor = (value: number, type: string) => {
    if (type === 'cpu' || type === 'memory') {
      if (value >= 90) return 'text-red-600';
      if (value >= 70) return 'text-yellow-600';
      return 'text-green-600';
    }
    if (type === 'latency') {
      if (value >= 100) return 'text-red-600';
      if (value >= 50) return 'text-yellow-600';
      return 'text-green-600';
    }
    if (type === 'packetLoss') {
      if (value >= 1) return 'text-red-600';
      if (value >= 0.1) return 'text-yellow-600';
      return 'text-green-600';
    }
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Network Performance</h1>
          <p className="text-gray-600">Monitor and analyze network performance metrics across all devices</p>
        </div>
        <div className="flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <BarChart3 className="w-4 h-4 mr-2" />
            Generate Report
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh All
          </button>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {performanceStats.map((stat) => (
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
                stat.status === 'Excellent' ? 'bg-green-100 text-green-800' :
                stat.status === 'Optimal' ? 'bg-blue-100 text-blue-800' :
                stat.status === 'Good' ? 'bg-yellow-100 text-yellow-800' :
                'bg-purple-100 text-purple-800'
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
                placeholder="Search devices by name, model, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              value={metricFilter}
              onChange={(e) => setMetricFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {metricOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {timeOptions.map(option => (
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

      {/* Network Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredMetrics.map((metric) => (
          <div key={metric.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Network className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{metric.name}</h3>
                  <span className="text-sm text-gray-500">#{metric.id}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{metric.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[metric.status as keyof typeof statusColorMap]}`}>
                    {metric.status}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                    {metric.device}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    {metric.location}
                  </span>
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
                  <p className="text-sm font-medium text-gray-900">Health Score</p>
                  <span className={`px-2 py-1 text-sm font-medium rounded-full ${getHealthScoreColor(metric.healthScore)}`}>
                    {metric.healthScore}/100
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Last Updated</p>
                  <p className="text-sm text-gray-600">{metric.lastUpdated}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Uptime</p>
                  <p className="text-sm text-gray-600">{metric.metrics.uptime}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Neighbors</p>
                  <p className="text-sm text-gray-600">{metric.neighbors}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Key Performance Metrics:</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">CPU Usage</p>
                    <p className={`text-sm font-medium ${getMetricColor(metric.metrics.cpu, 'cpu')}`}>
                      {metric.metrics.cpu}% 
                      <span className={`ml-1 text-xs ${trendColorMap[metric.trends.cpu as keyof typeof trendColorMap]}`}>
                        ({metric.trends.cpu})
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Memory Usage</p>
                    <p className={`text-sm font-medium ${getMetricColor(metric.metrics.memory, 'memory')}`}>
                      {metric.metrics.memory}% 
                      <span className={`ml-1 text-xs ${trendColorMap[metric.trends.memory as keyof typeof trendColorMap]}`}>
                        ({metric.trends.memory})
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Latency</p>
                    <p className={`text-sm font-medium ${getMetricColor(metric.metrics.latency, 'latency')}`}>
                      {metric.metrics.latency} 
                      <span className={`ml-1 text-xs ${trendColorMap[metric.trends.latency as keyof typeof trendColorMap]}`}>
                        ({metric.trends.latency})
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Throughput</p>
                    <p className={`text-sm font-medium ${getMetricColor(parseFloat(metric.metrics.throughput), 'throughput')}`}>
                      {metric.metrics.throughput} 
                      <span className={`ml-1 text-xs ${trendColorMap[metric.trends.throughput as keyof typeof trendColorMap]}`}>
                        ({metric.trends.throughput})
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Packet Loss</p>
                    <p className={`text-sm font-medium ${getMetricColor(parseFloat(metric.metrics.packetLoss), 'packetLoss')}`}>
                      {metric.metrics.packetLoss} 
                      <span className={`ml-1 text-xs ${trendColorMap[metric.trends.packetLoss as keyof typeof trendColorMap]}`}>
                        ({metric.trends.packetLoss})
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Temperature</p>
                    <p className="text-sm font-medium text-gray-900">
                      {metric.metrics.temperature}°C 
                      <span className={`ml-1 text-xs ${trendColorMap[metric.trends.temperature as keyof typeof trendColorMap]}`}>
                        ({metric.trends.temperature})
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Active Interfaces:</p>
                <div className="space-y-2">
                  {metric.interfaces.slice(0, 3).map((iface, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${iface.status === 'Up' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <span className="font-mono">{iface.name}</span>
                        <span className="text-gray-500">{iface.speed}</span>
                      </div>
                      <span className="text-gray-600">{iface.utilization}%</span>
                    </div>
                  ))}
                  {metric.interfaces.length > 3 && (
                    <div className="text-xs text-blue-600">+{metric.interfaces.length - 3} more interfaces</div>
                  )}
                </div>
              </div>

              {metric.alerts.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Active Alerts:</p>
                  <div className="space-y-1">
                    {metric.alerts.map((alert, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className={`px-2 py-1 rounded ${
                          alert.type === 'Warning' ? 'bg-yellow-100 text-yellow-800' :
                          alert.type === 'Critical' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {alert.type}
                        </span>
                        <span className="text-gray-600">{alert.message}</span>
                        <span className="text-gray-500">{alert.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                    <BarChart3 className="w-3 h-3 mr-1" />
                    View Details
                  </button>
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    <FileText className="w-3 h-3 mr-1" />
                    Logs
                  </button>
                </div>
                <Link
                  href={`/ict/network/performance/${metric.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Network Performance Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Optimal Devices</h3>
                <p className="text-xs text-gray-500">Health score ≥ 95</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {networkMetrics.filter(m => m.healthScore >= 95).length}</p>
              <p>Percentage: {Math.round((networkMetrics.filter(m => m.healthScore >= 95).length / networkMetrics.length) * 100)}%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Devices with Alerts</h3>
                <p className="text-xs text-gray-500">Require attention</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {networkMetrics.filter(m => m.alerts.length > 0).length}</p>
              <p>Total Alerts: {networkMetrics.reduce((sum, m) => sum + m.alerts.length, 0)}</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Average Latency</h3>
                <p className="text-xs text-gray-500">Network response time</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Current: {Math.round(networkMetrics.reduce((sum, m) => sum + parseFloat(m.metrics.latency), 0) / networkMetrics.length)}ms</p>
              <p>Target: &lt; 20ms</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Total Throughput</h3>
                <p className="text-xs text-gray-500">Network capacity</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Current: {networkMetrics.reduce((sum, m) => sum + parseFloat(m.metrics.throughput), 0).toFixed(1)} Gbps</p>
              <p>Capacity: 15.0 Gbps</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Network Performance Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/ict/network/performance/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Performance Reports</h3>
            <p className="text-xs text-gray-500">Generate reports</p>
          </Link>
          <Link
            href="/ict/network/performance/alerts"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <AlertTriangle className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Alert Management</h3>
            <p className="text-xs text-gray-500">Manage alerts</p>
          </Link>
          <Link
            href="/ict/network/performance/trends"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <TrendingUp className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Trend Analysis</h3>
            <p className="text-xs text-gray-500">Analyze trends</p>
          </Link>
          <Link
            href="/ict/network/performance/optimization"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Zap className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Optimization</h3>
            <p className="text-xs text-gray-500">Optimize performance</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
