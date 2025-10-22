"use client";

import { useState } from "react";
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle,
  Filter,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  RefreshCw,
  Minus,
  FileText,
  MapPin,
  Building,
  Users,
  Activity,
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
  Calendar,
  XCircle,
  Info
} from "lucide-react";
import Link from "next/link";

export default function ICTNetworkIncidentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const incidentStats = [
    {
      name: "Total Incidents",
      value: "47",
      change: "+8",
      changeType: "negative",
      icon: AlertTriangle,
      description: "This month",
      status: "Active"
    },
    {
      name: "Critical Incidents",
      value: "3",
      change: "-1",
      changeType: "positive",
      icon: AlertCircle,
      description: "Require immediate attention",
      status: "Critical"
    },
    {
      name: "Resolved Incidents",
      value: "42",
      change: "+12",
      changeType: "positive",
      icon: CheckCircle,
      description: "Successfully resolved",
      status: "Resolved"
    },
    {
      name: "Avg. Resolution Time",
      value: "2.4 hrs",
      change: "-0.8 hrs",
      changeType: "positive",
      icon: Clock,
      description: "Time to resolve",
      status: "Improving"
    }
  ];

  const incidents = [
    {
      id: "INC-001",
      title: "Core Router Failure - Data Center A",
      severity: "Critical",
      status: "Open",
      priority: "P1",
      category: "Hardware Failure",
      assignedTo: "Network Team",
      reportedBy: "system.monitor@npa.gov.ng",
      reportedDate: "2024-12-10 14:30:00",
      lastUpdated: "2024-12-10 15:45:00",
      description: "Primary core router in Data Center A has failed, causing network connectivity issues across multiple departments",
      affectedSystems: [
        "Core Router ASR-1006",
        "Distribution Switches",
        "Wireless Controllers",
        "Firewall Cluster"
      ],
      impact: {
        users: 450,
        departments: ["ICT", "Finance", "HR", "Marine Operations"],
        services: ["Email", "File Sharing", "Database Access", "Internet"],
        estimatedDowntime: "4 hours"
      },
      rootCause: "Hardware failure - Power supply unit malfunction",
      resolution: "Replace power supply unit and restore service",
      timeline: [
        { timestamp: "14:30:00", action: "Incident reported", user: "System Monitor" },
        { timestamp: "14:35:00", action: "Incident assigned to Network Team", user: "ICT Manager" },
        { timestamp: "14:45:00", action: "Team dispatched to Data Center A", user: "Network Team Lead" },
        { timestamp: "15:00:00", action: "Root cause identified - PSU failure", user: "Senior Network Engineer" },
        { timestamp: "15:30:00", action: "Spare PSU ordered from vendor", user: "Network Team Lead" },
        { timestamp: "15:45:00", action: "ETA for resolution: 2 hours", user: "Network Team Lead" }
      ],
      workaround: "Traffic routed through secondary core router with reduced capacity",
      sla: {
        target: "4 hours",
        current: "1.25 hours",
        status: "On Track"
      },
      escalation: {
        level: 2,
        escalatedTo: "ICT Director",
        escalatedAt: "2024-12-10 15:00:00",
        reason: "Critical business impact"
      },
      communication: {
        stakeholders: ["ICT Director", "Department Heads", "End Users"],
        lastUpdate: "2024-12-10 15:45:00",
        nextUpdate: "2024-12-10 16:30:00"
      },
      tags: ["hardware", "critical", "network", "datacenter"]
    },
    {
      id: "INC-002",
      title: "Email Server Performance Degradation",
      severity: "High",
      status: "In Progress",
      priority: "P2",
      category: "Performance Issue",
      assignedTo: "Systems Team",
      reportedBy: "helpdesk@npa.gov.ng",
      reportedDate: "2024-12-10 09:15:00",
      lastUpdated: "2024-12-10 11:20:00",
      description: "Email server experiencing slow response times and intermittent connectivity issues",
      affectedSystems: [
        "Exchange Server 2019",
        "Email Gateway",
        "Active Directory",
        "DNS Servers"
      ],
      impact: {
        users: 1200,
        departments: ["All Departments"],
        services: ["Email", "Calendar", "Contacts"],
        estimatedDowntime: "2 hours"
      },
      rootCause: "High CPU usage due to database corruption",
      resolution: "Repair database and optimize performance",
      timeline: [
        { timestamp: "09:15:00", action: "Incident reported by helpdesk", user: "Helpdesk Team" },
        { timestamp: "09:30:00", action: "Incident assigned to Systems Team", user: "ICT Manager" },
        { timestamp: "10:00:00", action: "Initial investigation started", user: "Systems Engineer" },
        { timestamp: "10:45:00", action: "Root cause identified - DB corruption", user: "Senior Systems Engineer" },
        { timestamp: "11:20:00", action: "Database repair in progress", user: "Systems Engineer" }
      ],
      workaround: "Users can access email via web interface with limited functionality",
      sla: {
        target: "8 hours",
        current: "2.05 hours",
        status: "On Track"
      },
      escalation: {
        level: 1,
        escalatedTo: "Systems Manager",
        escalatedAt: "2024-12-10 10:30:00",
        reason: "Performance impact on all users"
      },
      communication: {
        stakeholders: ["Systems Manager", "Helpdesk Team", "End Users"],
        lastUpdate: "2024-12-10 11:20:00",
        nextUpdate: "2024-12-10 12:00:00"
      },
      tags: ["email", "performance", "database", "server"]
    },
    {
      id: "INC-003",
      title: "Wireless Network Intermittent Connectivity",
      severity: "Medium",
      status: "Resolved",
      priority: "P3",
      category: "Connectivity Issue",
      assignedTo: "Network Team",
      reportedBy: "user.support@npa.gov.ng",
      reportedDate: "2024-12-09 16:20:00",
      lastUpdated: "2024-12-09 18:45:00",
      description: "Intermittent wireless connectivity issues in Building B affecting mobile device users",
      affectedSystems: [
        "Wireless Access Points",
        "Wireless Controller",
        "DHCP Server",
        "RADIUS Server"
      ],
      impact: {
        users: 85,
        departments: ["Marine Operations", "Finance"],
        services: ["WiFi", "Mobile Email", "VPN"],
        estimatedDowntime: "1 hour"
      },
      rootCause: "Access point firmware bug causing intermittent disconnections",
      resolution: "Updated access point firmware to latest stable version",
      timeline: [
        { timestamp: "16:20:00", action: "Incident reported", user: "User Support" },
        { timestamp: "16:30:00", action: "Incident assigned to Network Team", user: "ICT Manager" },
        { timestamp: "17:00:00", action: "Investigation started", user: "Network Engineer" },
        { timestamp: "17:30:00", action: "Root cause identified - firmware bug", user: "Network Engineer" },
        { timestamp: "18:00:00", action: "Firmware update initiated", user: "Network Engineer" },
        { timestamp: "18:45:00", action: "Incident resolved", user: "Network Engineer" }
      ],
      workaround: "Users advised to use wired connections where possible",
      sla: {
        target: "24 hours",
        current: "2.25 hours",
        status: "Resolved"
      },
      escalation: {
        level: 0,
        escalatedTo: null,
        escalatedAt: null,
        reason: null
      },
      communication: {
        stakeholders: ["Network Team", "Affected Users"],
        lastUpdate: "2024-12-09 18:45:00",
        nextUpdate: null
      },
      tags: ["wireless", "connectivity", "firmware", "resolved"]
    },
    {
      id: "INC-004",
      title: "Database Server High Memory Usage",
      severity: "High",
      status: "Open",
      priority: "P2",
      category: "Performance Issue",
      assignedTo: "Database Team",
      reportedBy: "monitoring.system@npa.gov.ng",
      reportedDate: "2024-12-10 13:45:00",
      lastUpdated: "2024-12-10 14:30:00",
      description: "Primary database server experiencing high memory usage causing slow query performance",
      affectedSystems: [
        "SQL Server 2019",
        "Application Servers",
        "Reporting Services",
        "Backup Systems"
      ],
      impact: {
        users: 200,
        departments: ["Finance", "HR", "ICT"],
        services: ["Financial Reports", "HR System", "ECM System"],
        estimatedDowntime: "3 hours"
      },
      rootCause: "Memory leak in application causing excessive memory consumption",
      resolution: "Identify and fix memory leak, restart affected services",
      timeline: [
        { timestamp: "13:45:00", action: "Incident reported by monitoring", user: "Monitoring System" },
        { timestamp: "14:00:00", action: "Incident assigned to Database Team", user: "ICT Manager" },
        { timestamp: "14:15:00", action: "Investigation started", user: "Database Administrator" },
        { timestamp: "14:30:00", action: "Root cause analysis in progress", user: "Senior DBA" }
      ],
      workaround: "Reduced concurrent user connections to alleviate memory pressure",
      sla: {
        target: "8 hours",
        current: "0.75 hours",
        status: "On Track"
      },
      escalation: {
        level: 1,
        escalatedTo: "Database Manager",
        escalatedAt: "2024-12-10 14:15:00",
        reason: "Performance impact on critical systems"
      },
      communication: {
        stakeholders: ["Database Manager", "Application Teams", "End Users"],
        lastUpdate: "2024-12-10 14:30:00",
        nextUpdate: "2024-12-10 15:30:00"
      },
      tags: ["database", "performance", "memory", "critical"]
    },
    {
      id: "INC-005",
      title: "Security Alert - Unauthorized Access Attempt",
      severity: "Critical",
      status: "Under Investigation",
      priority: "P1",
      category: "Security Incident",
      assignedTo: "Security Team",
      reportedBy: "security.monitor@npa.gov.ng",
      reportedDate: "2024-12-10 12:00:00",
      lastUpdated: "2024-12-10 13:15:00",
      description: "Multiple unauthorized access attempts detected from external IP addresses targeting admin accounts",
      affectedSystems: [
        "Firewall",
        "Active Directory",
        "VPN Gateway",
        "Security Information System"
      ],
      impact: {
        users: 0,
        departments: ["All Systems"],
        services: ["Authentication", "VPN", "Admin Access"],
        estimatedDowntime: "Unknown"
      },
      rootCause: "Under investigation - possible brute force attack",
      resolution: "Block malicious IPs, strengthen authentication, investigate source",
      timeline: [
        { timestamp: "12:00:00", action: "Security alert triggered", user: "Security Monitor" },
        { timestamp: "12:05:00", action: "Incident assigned to Security Team", user: "Security Manager" },
        { timestamp: "12:15:00", action: "Initial response initiated", user: "Security Analyst" },
        { timestamp: "12:30:00", action: "Malicious IPs blocked", user: "Security Engineer" },
        { timestamp: "13:00:00", action: "Investigation expanded", user: "Senior Security Analyst" },
        { timestamp: "13:15:00", action: "Forensic analysis in progress", user: "Security Team" }
      ],
      workaround: "Enhanced monitoring and temporary IP restrictions",
      sla: {
        target: "2 hours",
        current: "1.25 hours",
        status: "On Track"
      },
      escalation: {
        level: 3,
        escalatedTo: "CISO",
        escalatedAt: "2024-12-10 12:30:00",
        reason: "Critical security incident"
      },
      communication: {
        stakeholders: ["CISO", "ICT Director", "Security Team", "Management"],
        lastUpdate: "2024-12-10 13:15:00",
        nextUpdate: "2024-12-10 14:00:00"
      },
      tags: ["security", "critical", "unauthorized-access", "investigation"]
    }
  ];

  const severityOptions = [
    { value: "all", label: "All Severities" },
    { value: "critical", label: "Critical" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In Progress" },
    { value: "under_investigation", label: "Under Investigation" },
    { value: "resolved", label: "Resolved" },
    { value: "closed", label: "Closed" }
  ];

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = severityFilter === "all" || 
                           incident.severity.toLowerCase() === severityFilter;
    const matchesStatus = statusFilter === "all" || 
                         incident.status.toLowerCase().replace(" ", "_") === statusFilter;
    
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const severityColorMap = {
    'Critical': 'bg-red-100 text-red-800',
    'High': 'bg-orange-100 text-orange-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-green-100 text-green-800'
  };

  const statusColorMap = {
    'Open': 'bg-red-100 text-red-800',
    'In Progress': 'bg-yellow-100 text-yellow-800',
    'Under Investigation': 'bg-blue-100 text-blue-800',
    'Resolved': 'bg-green-100 text-green-800',
    'Closed': 'bg-gray-100 text-gray-800'
  };

  const priorityColorMap = {
    'P1': 'bg-red-100 text-red-800',
    'P2': 'bg-orange-100 text-orange-800',
    'P3': 'bg-yellow-100 text-yellow-800',
    'P4': 'bg-green-100 text-green-800'
  };

  const slaStatusColorMap = {
    'On Track': 'bg-green-100 text-green-800',
    'At Risk': 'bg-yellow-100 text-yellow-800',
    'Breached': 'bg-red-100 text-red-800',
    'Resolved': 'bg-blue-100 text-blue-800'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Network Incidents</h1>
          <p className="text-gray-600">Track and manage network security incidents and outages</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/ict/network/incidents/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Report Incident
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Incident Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {incidentStats.map((stat) => (
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
                stat.status === 'Active' ? 'bg-red-100 text-red-800' :
                stat.status === 'Critical' ? 'bg-red-100 text-red-800' :
                stat.status === 'Resolved' ? 'bg-green-100 text-green-800' :
                'bg-blue-100 text-blue-800'
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
                placeholder="Search incidents by title, description, assignee, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {severityOptions.map(option => (
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

      {/* Incidents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredIncidents.map((incident) => (
          <div key={incident.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{incident.title}</h3>
                  <span className="text-sm text-gray-500">#{incident.id}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{incident.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityColorMap[incident.severity as keyof typeof severityColorMap]}`}>
                    {incident.severity}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[incident.status as keyof typeof statusColorMap]}`}>
                    {incident.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColorMap[incident.priority as keyof typeof priorityColorMap]}`}>
                    {incident.priority}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                    {incident.category}
                  </span>
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
                  <Activity className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Assigned To</p>
                  <p className="text-sm text-gray-600">{incident.assignedTo}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Reported By</p>
                  <p className="text-sm text-gray-600">{incident.reportedBy}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Reported Date</p>
                  <p className="text-sm text-gray-600">{incident.reportedDate}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Last Updated</p>
                  <p className="text-sm text-gray-600">{incident.lastUpdated}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Affected Users</p>
                  <p className="text-sm text-gray-600">{incident.impact.users}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Est. Downtime</p>
                  <p className="text-sm text-gray-600">{incident.impact.estimatedDowntime}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Affected Systems:</p>
                <div className="flex flex-wrap gap-1">
                  {incident.affectedSystems.map((system, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                      {system}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Impact Assessment:</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Departments</p>
                    <p className="text-gray-900">{incident.impact.departments.join(", ")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Services</p>
                    <p className="text-gray-900">{incident.impact.services.join(", ")}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">SLA Status:</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Target</p>
                    <p className="text-gray-900">{incident.sla.target}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Current</p>
                    <p className="text-gray-900">{incident.sla.current}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <span className={`px-2 py-1 text-xs rounded-full ${slaStatusColorMap[incident.sla.status as keyof typeof slaStatusColorMap]}`}>
                      {incident.sla.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Recent Timeline:</p>
                <div className="space-y-2">
                  {incident.timeline.slice(-3).map((event, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-600">{event.action}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-500">{event.timestamp}</span>
                        <p className="text-gray-400">{event.user}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {incident.escalation.level > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Escalation:</p>
                  <div className="text-sm">
                    <p className="text-gray-600">Level {incident.escalation.level} - {incident.escalation.escalatedTo}</p>
                    <p className="text-xs text-gray-500">Reason: {incident.escalation.reason}</p>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Workaround:</p>
                <p className="text-sm text-gray-600">{incident.workaround}</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                    <Eye className="w-3 h-3 mr-1" />
                    View Details
                  </button>
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                    <Edit className="w-3 h-3 mr-1" />
                    Update
                  </button>
                </div>
                <Link
                  href={`/ict/network/incidents/${incident.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Incident Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Incident Management Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Open Incidents</h3>
                <p className="text-xs text-gray-500">Require attention</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {incidents.filter(i => i.status === 'Open' || i.status === 'In Progress' || i.status === 'Under Investigation').length}</p>
              <p>Critical: {incidents.filter(i => i.severity === 'Critical' && (i.status === 'Open' || i.status === 'In Progress' || i.status === 'Under Investigation')).length}</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Resolved Incidents</h3>
                <p className="text-xs text-gray-500">Successfully closed</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {incidents.filter(i => i.status === 'Resolved').length}</p>
              <p>Percentage: {Math.round((incidents.filter(i => i.status === 'Resolved').length / incidents.length) * 100)}%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">SLA Performance</h3>
                <p className="text-xs text-gray-500">Response time</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>On Track: {incidents.filter(i => i.sla.status === 'On Track').length}</p>
              <p>At Risk: {incidents.filter(i => i.sla.status === 'At Risk').length}</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Total Impact</h3>
                <p className="text-xs text-gray-500">Affected users</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Users: {incidents.reduce((sum, i) => sum + i.impact.users, 0)}</p>
              <p>Departments: {new Set(incidents.flatMap(i => i.impact.departments)).size}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Incident Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/ict/network/incidents/create"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Report Incident</h3>
            <p className="text-xs text-gray-500">New incident</p>
          </Link>
          <Link
            href="/ict/network/incidents/escalation"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <AlertTriangle className="h-8 w-8 text-red-600 mb-3" />
            <h3 className="font-medium text-sm">Escalation</h3>
            <p className="text-xs text-gray-500">Manage escalations</p>
          </Link>
          <Link
            href="/ict/network/incidents/communication"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Communication</h3>
            <p className="text-xs text-gray-500">Stakeholder updates</p>
          </Link>
          <Link
            href="/ict/network/incidents/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Incident Reports</h3>
            <p className="text-xs text-gray-500">Generate reports</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
