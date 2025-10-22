"use client";

import { useState } from "react";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Activity,
  BarChart3,
  Settings,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
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
  Network,
  Award,
  Star,
  Briefcase,
  CreditCard,
  Receipt,
  Banknote,
  Coins,
  Target,
  Calendar,
  Monitor,
  Smartphone,
  Laptop,
  Printer,
  Camera,
  Wrench,
  Tool,
  Router,
  Server,
  Wifi
} from "lucide-react";
import Link from "next/link";

export default function NetworkSecurityPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const securityStats = [
    {
      name: "Security Score",
      value: "87/100",
      change: "+3",
      changeType: "positive",
      icon: Shield,
      description: "Overall security rating",
      status: "Good"
    },
    {
      name: "Active Threats",
      value: "12",
      change: "-5",
      changeType: "positive",
      icon: AlertTriangle,
      description: "Currently detected",
      status: "Reducing"
    },
    {
      name: "Blocked Attacks",
      value: "2,847",
      change: "+156",
      changeType: "positive",
      icon: Lock,
      description: "Last 24 hours",
      status: "Active"
    },
    {
      name: "Vulnerabilities",
      value: "8",
      change: "-3",
      changeType: "positive",
      icon: Eye,
      description: "Critical issues",
      status: "Improving"
    }
  ];

  const securityEvents = [
    {
      id: "SEC-001",
      type: "Intrusion Attempt",
      severity: "High",
      status: "Blocked",
      source: "192.168.100.45",
      destination: "192.168.1.10",
      port: "22",
      protocol: "SSH",
      timestamp: "2024-12-10 14:30:25",
      description: "Multiple failed SSH login attempts detected",
      action: "IP blocked for 1 hour",
      device: "Firewall 01",
      location: "Lagos HQ",
      user: "N/A",
      details: {
        attempts: 15,
        timeWindow: "5 minutes",
        attackType: "Brute Force",
        signature: "SSH_BRUTE_FORCE_001",
        confidence: 95
      },
      remediation: {
        status: "Completed",
        action: "IP address blocked",
        timestamp: "2024-12-10 14:32:10",
        assignedTo: "Security Team"
      }
    },
    {
      id: "SEC-002",
      type: "Malware Detection",
      severity: "Critical",
      status: "Contained",
      source: "10.0.0.15",
      destination: "192.168.20.45",
      port: "80",
      protocol: "HTTP",
      timestamp: "2024-12-10 13:45:10",
      description: "Malicious file detected in email attachment",
      action: "File quarantined, endpoint isolated",
      device: "Email Gateway",
      location: "Lagos HQ",
      user: "john.doe@npa.gov.ng",
      details: {
        malwareType: "Trojan",
        fileHash: "a1b2c3d4e5f6...",
        fileName: "invoice.pdf",
        threatLevel: "High",
        confidence: 98
      },
      remediation: {
        status: "In Progress",
        action: "Endpoint scanning and cleanup",
        timestamp: "2024-12-10 13:50:00",
        assignedTo: "IT Security Team"
      }
    },
    {
      id: "SEC-003",
      type: "Data Exfiltration",
      severity: "Critical",
      status: "Investigation",
      source: "192.168.10.25",
      destination: "External IP",
      port: "443",
      protocol: "HTTPS",
      timestamp: "2024-12-10 12:20:45",
      description: "Unusual data transfer pattern detected",
      action: "Connection terminated, user account suspended",
      device: "DLP System",
      location: "Lagos HQ",
      user: "jane.smith@npa.gov.ng",
      details: {
        dataSize: "2.5 GB",
        fileTypes: "PDF, DOCX, XLSX",
        transferMethod: "Cloud Storage",
        anomalyScore: 92,
        confidence: 89
      },
      remediation: {
        status: "Investigation",
        action: "Forensic analysis in progress",
        timestamp: "2024-12-10 12:25:00",
        assignedTo: "Security Investigation Team"
      }
    },
    {
      id: "SEC-004",
      type: "Unauthorized Access",
      severity: "Medium",
      status: "Resolved",
      source: "192.168.20.78",
      destination: "192.168.10.5",
      port: "3389",
      protocol: "RDP",
      timestamp: "2024-12-10 11:15:30",
      description: "Unauthorized RDP access attempt",
      action: "Access denied, account locked",
      device: "Domain Controller",
      location: "Lagos HQ",
      user: "temp.user@npa.gov.ng",
      details: {
        accessAttempts: 3,
        timeWindow: "10 minutes",
        accountStatus: "Locked",
        lastLogin: "2024-12-09 16:30:00",
        confidence: 85
      },
      remediation: {
        status: "Completed",
        action: "Account locked, password reset required",
        timestamp: "2024-12-10 11:20:00",
        assignedTo: "IT Support"
      }
    },
    {
      id: "SEC-005",
      type: "Network Scan",
      severity: "Low",
      status: "Monitored",
      source: "External IP",
      destination: "192.168.1.0/24",
      port: "Multiple",
      protocol: "TCP/UDP",
      timestamp: "2024-12-10 10:30:15",
      description: "Port scanning activity detected",
      action: "Traffic blocked, source IP logged",
      device: "Firewall 01",
      location: "Lagos HQ",
      user: "N/A",
      details: {
        scanType: "Port Scan",
        portsScanned: 150,
        duration: "2 minutes",
        sourceCountry: "Unknown",
        confidence: 75
      },
      remediation: {
        status: "Completed",
        action: "Source IP blocked",
        timestamp: "2024-12-10 10:32:00",
        assignedTo: "Network Security"
      }
    }
  ];

  const vulnerabilities = [
    {
      id: "VULN-001",
      title: "Outdated SSL/TLS Configuration",
      severity: "High",
      status: "Open",
      cve: "CVE-2023-1234",
      cvss: 7.5,
      affectedSystems: ["Web Server 01", "Load Balancer 01"],
      discovered: "2024-12-08",
      description: "SSL/TLS configuration allows weak cipher suites",
      impact: "Potential man-in-the-middle attacks",
      remediation: "Update SSL/TLS configuration to use strong cipher suites",
      assignedTo: "Network Team",
      dueDate: "2024-12-15",
      progress: 25
    },
    {
      id: "VULN-002",
      title: "Unpatched Windows Server",
      severity: "Critical",
      status: "In Progress",
      cve: "CVE-2023-5678",
      cvss: 9.2,
      affectedSystems: ["Domain Controller", "File Server 01"],
      discovered: "2024-12-05",
      description: "Windows Server missing critical security patches",
      impact: "Remote code execution vulnerability",
      remediation: "Apply latest Windows security patches",
      assignedTo: "System Admin Team",
      dueDate: "2024-12-12",
      progress: 60
    },
    {
      id: "VULN-003",
      title: "Weak Password Policy",
      severity: "Medium",
      status: "Open",
      cve: "N/A",
      cvss: 5.0,
      affectedSystems: ["Active Directory"],
      discovered: "2024-12-01",
      description: "Password policy allows weak passwords",
      impact: "Increased risk of account compromise",
      remediation: "Strengthen password policy requirements",
      assignedTo: "Security Team",
      dueDate: "2024-12-20",
      progress: 10
    }
  ];

  const securityPolicies = [
    {
      id: "POL-001",
      name: "Network Access Control",
      status: "Active",
      lastUpdated: "2024-11-15",
      compliance: 95,
      description: "Controls network access based on device and user identity",
      rules: 24,
      violations: 3
    },
    {
      id: "POL-002",
      name: "Data Loss Prevention",
      status: "Active",
      lastUpdated: "2024-11-20",
      compliance: 88,
      description: "Prevents unauthorized data exfiltration",
      rules: 18,
      violations: 7
    },
    {
      id: "POL-003",
      name: "Endpoint Security",
      status: "Active",
      lastUpdated: "2024-11-10",
      compliance: 92,
      description: "Ensures endpoint devices meet security requirements",
      rules: 15,
      violations: 2
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
    { value: "blocked", label: "Blocked" },
    { value: "contained", label: "Contained" },
    { value: "investigation", label: "Investigation" },
    { value: "resolved", label: "Resolved" },
    { value: "monitored", label: "Monitored" }
  ];

  const filteredEvents = securityEvents.filter(event => {
    const matchesSearch = event.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.source.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = severityFilter === "all" || 
                           event.severity.toLowerCase() === severityFilter;
    const matchesStatus = statusFilter === "all" || 
                         event.status.toLowerCase() === statusFilter;
    
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const severityColorMap = {
    'Critical': 'bg-red-100 text-red-800',
    'High': 'bg-orange-100 text-orange-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-green-100 text-green-800'
  };

  const statusColorMap = {
    'Blocked': 'bg-green-100 text-green-800',
    'Contained': 'bg-blue-100 text-blue-800',
    'Investigation': 'bg-yellow-100 text-yellow-800',
    'Resolved': 'bg-gray-100 text-gray-800',
    'Monitored': 'bg-purple-100 text-purple-800'
  };

  const getCVSSColor = (score: number) => {
    if (score >= 9.0) return 'bg-red-100 text-red-800';
    if (score >= 7.0) return 'bg-orange-100 text-orange-800';
    if (score >= 4.0) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getComplianceColor = (compliance: number) => {
    if (compliance >= 95) return 'bg-green-100 text-green-800';
    if (compliance >= 85) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Network Security</h1>
          <p className="text-gray-600">Monitor and manage network security threats and vulnerabilities</p>
        </div>
        <div className="flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Shield className="w-4 h-4 mr-2" />
            Security Report
          </button>
        </div>
      </div>

      {/* Security Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {securityStats.map((stat) => (
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
                stat.status === 'Good' ? 'bg-green-100 text-green-800' :
                stat.status === 'Reducing' ? 'bg-blue-100 text-blue-800' :
                stat.status === 'Active' ? 'bg-purple-100 text-purple-800' :
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
                placeholder="Search security events by type, description, or source..."
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Events */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Security Events</h2>
            <Link
              href="/ict/network/security/events"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all events
            </Link>
          </div>
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <div key={event.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{event.type}</h4>
                    <p className="text-xs text-gray-500">{event.description}</p>
                    <p className="text-xs text-gray-500">Source: {event.source} → {event.destination}</p>
                  </div>
                  <div className="flex space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityColorMap[event.severity as keyof typeof severityColorMap]}`}>
                      {event.severity}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[event.status as keyof typeof statusColorMap]}`}>
                      {event.status}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-500">Timestamp</p>
                    <p className="text-sm text-gray-900">{event.timestamp}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Device</p>
                    <p className="text-sm text-gray-900">{event.device}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Protocol</p>
                    <p className="text-sm text-gray-900">{event.protocol}:{event.port}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="text-sm text-gray-900">{event.location}</p>
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p><span className="font-medium">Action:</span> {event.action}</p>
                  <p><span className="font-medium">User:</span> {event.user}</p>
                  <p><span className="font-medium">Remediation:</span> {event.remediation.status} - {event.remediation.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vulnerabilities */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Vulnerabilities</h2>
            <Link
              href="/ict/network/security/vulnerabilities"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all vulnerabilities
            </Link>
          </div>
          <div className="space-y-4">
            {vulnerabilities.map((vuln) => (
              <div key={vuln.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{vuln.title}</h4>
                    <p className="text-xs text-gray-500">{vuln.description}</p>
                    <p className="text-xs text-gray-500">CVE: {vuln.cve}</p>
                  </div>
                  <div className="flex space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityColorMap[vuln.severity as keyof typeof severityColorMap]}`}>
                      {vuln.severity}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCVSSColor(vuln.cvss)}`}>
                      CVSS: {vuln.cvss}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <p className="text-sm text-gray-900">{vuln.status}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Assigned To</p>
                    <p className="text-sm text-gray-900">{vuln.assignedTo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Due Date</p>
                    <p className="text-sm text-gray-900">{vuln.dueDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Progress</p>
                    <p className="text-sm text-gray-900">{vuln.progress}%</p>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>Remediation Progress</span>
                    <span>{vuln.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        vuln.progress >= 80 ? 'bg-green-600' :
                        vuln.progress >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                      }`}
                      style={{ width: `${vuln.progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p><span className="font-medium">Impact:</span> {vuln.impact}</p>
                  <p><span className="font-medium">Affected Systems:</span> {vuln.affectedSystems.join(", ")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security Policies */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Security Policies</h2>
          <Link
            href="/ict/network/security/policies"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Manage policies
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {securityPolicies.map((policy) => (
            <div key={policy.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{policy.name}</h4>
                  <p className="text-xs text-gray-500">{policy.description}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getComplianceColor(policy.compliance)}`}>
                  {policy.compliance}%
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-xs text-gray-500">Rules</p>
                  <p className="text-sm text-gray-900">{policy.rules}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Violations</p>
                  <p className="text-sm text-gray-900">{policy.violations}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="text-sm text-gray-900">{policy.status}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Last Updated</p>
                  <p className="text-sm text-gray-900">{policy.lastUpdated}</p>
                </div>
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>Compliance</span>
                  <span>{policy.compliance}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      policy.compliance >= 95 ? 'bg-green-600' :
                      policy.compliance >= 85 ? 'bg-yellow-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${policy.compliance}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Dashboard */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Security Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900">Critical Alerts</h3>
            <p className="text-2xl font-bold text-red-600">3</p>
            <p className="text-xs text-gray-500">Require immediate attention</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Eye className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900">High Priority</h3>
            <p className="text-2xl font-bold text-orange-600">8</p>
            <p className="text-xs text-gray-500">Need investigation</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900">Resolved Today</h3>
            <p className="text-2xl font-bold text-green-600">15</p>
            <p className="text-xs text-gray-500">Successfully handled</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900">Security Score</h3>
            <p className="text-2xl font-bold text-blue-600">87/100</p>
            <p className="text-xs text-gray-500">Overall rating</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Security Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/ict/network/security/incidents"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <AlertTriangle className="h-8 w-8 text-red-600 mb-3" />
            <h3 className="font-medium text-sm">Security Incidents</h3>
            <p className="text-xs text-gray-500">Manage incidents</p>
          </Link>
          <Link
            href="/ict/network/security/vulnerabilities"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Eye className="h-8 w-8 text-orange-600 mb-3" />
            <h3 className="font-medium text-sm">Vulnerabilities</h3>
            <p className="text-xs text-gray-500">Track vulnerabilities</p>
          </Link>
          <Link
            href="/ict/network/security/policies"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Shield className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Security Policies</h3>
            <p className="text-xs text-gray-500">Manage policies</p>
          </Link>
          <Link
            href="/ict/network/security/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Security Reports</h3>
            <p className="text-xs text-gray-500">Generate reports</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
