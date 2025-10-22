"use client";

import { useState } from "react";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Lock,
  Eye,
  EyeOff,
  Key,
  User,
  Server,
  Database,
  Globe,
  FileText,
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
  Clock,
  Users,
  Activity
} from "lucide-react";
import Link from "next/link";

export default function ICTSecurityPage() {
  const [timeRange, setTimeRange] = useState("24h");
  const [showSensitiveData, setShowSensitiveData] = useState(false);

  const securityMetrics = [
    {
      name: "Security Score",
      value: "87%",
      change: "+3%",
      changeType: "positive",
      icon: Shield,
      description: "Overall security posture",
      status: "Good"
    },
    {
      name: "Active Threats",
      value: "3",
      change: "-2",
      changeType: "positive",
      icon: AlertTriangle,
      description: "Currently blocked",
      status: "Low"
    },
    {
      name: "Failed Logins",
      value: "12",
      change: "+5",
      changeType: "warning",
      icon: Lock,
      description: "Last 24 hours",
      status: "Normal"
    },
    {
      name: "Vulnerabilities",
      value: "8",
      change: "-3",
      changeType: "positive",
      icon: AlertTriangle,
      description: "Critical & High",
      status: "Medium"
    }
  ];

  const securityEvents = [
    {
      id: 1,
      type: "Threat Detected",
      severity: "High",
      source: "192.168.1.100",
      target: "Web Server 01",
      description: "Suspicious login attempt from unknown IP",
      timestamp: "2 minutes ago",
      status: "Blocked",
      action: "IP Blocked"
    },
    {
      id: 2,
      type: "Vulnerability Scan",
      severity: "Medium",
      source: "Security Scanner",
      target: "Database Server 01",
      description: "SQL injection vulnerability detected",
      timestamp: "15 minutes ago",
      status: "Investigated",
      action: "Patch Scheduled"
    },
    {
      id: 3,
      type: "Access Violation",
      severity: "Critical",
      source: "User: john.doe",
      target: "Admin Panel",
      description: "Unauthorized access attempt to admin functions",
      timestamp: "1 hour ago",
      status: "Resolved",
      action: "Account Suspended"
    },
    {
      id: 4,
      type: "Malware Detection",
      severity: "High",
      source: "File Server 01",
      target: "Shared Drive",
      description: "Malicious file detected in shared folder",
      timestamp: "2 hours ago",
      status: "Quarantined",
      action: "File Removed"
    },
    {
      id: 5,
      type: "Data Breach Attempt",
      severity: "Critical",
      source: "External IP: 203.0.113.45",
      target: "Customer Database",
      description: "Multiple failed attempts to access customer data",
      timestamp: "3 hours ago",
      status: "Blocked",
      action: "IP Blacklisted"
    }
  ];

  const vulnerabilities = [
    {
      id: "VULN-001",
      title: "SQL Injection in Login Form",
      severity: "Critical",
      cvss: "9.8",
      affected: "Web Application",
      discovered: "2024-12-10",
      status: "Open",
      description: "Login form vulnerable to SQL injection attacks",
      remediation: "Implement parameterized queries"
    },
    {
      id: "VULN-002",
      title: "Outdated SSL Certificate",
      severity: "High",
      cvss: "7.5",
      affected: "Web Server 01",
      discovered: "2024-12-08",
      status: "In Progress",
      description: "SSL certificate expires in 15 days",
      remediation: "Renew SSL certificate"
    },
    {
      id: "VULN-003",
      title: "Weak Password Policy",
      severity: "Medium",
      cvss: "5.3",
      affected: "User Accounts",
      discovered: "2024-12-05",
      status: "Open",
      description: "Password policy allows weak passwords",
      remediation: "Enforce stronger password requirements"
    },
    {
      id: "VULN-004",
      title: "Missing Security Headers",
      severity: "Medium",
      cvss: "4.7",
      affected: "Web Application",
      discovered: "2024-12-03",
      status: "Resolved",
      description: "Missing security headers in HTTP responses",
      remediation: "Add security headers to web server"
    }
  ];

  const accessLogs = [
    {
      id: 1,
      user: "john.doe@npa.gov.ng",
      action: "Login",
      resource: "ECM System",
      ip: "192.168.1.50",
      location: "Lagos HQ",
      timestamp: "2024-12-10 14:30:25",
      status: "Success"
    },
    {
      id: 2,
      user: "sarah.johnson@npa.gov.ng",
      action: "File Access",
      resource: "Document Repository",
      ip: "192.168.1.75",
      location: "Lagos HQ",
      timestamp: "2024-12-10 14:25:10",
      status: "Success"
    },
    {
      id: 3,
      user: "admin@npa.gov.ng",
      action: "System Configuration",
      resource: "Admin Panel",
      ip: "192.168.1.10",
      location: "Lagos HQ",
      timestamp: "2024-12-10 14:20:45",
      status: "Success"
    },
    {
      id: 4,
      user: "unknown@external.com",
      action: "Login Attempt",
      resource: "ECM System",
      ip: "203.0.113.45",
      location: "External",
      timestamp: "2024-12-10 14:15:30",
      status: "Failed"
    }
  ];

  const complianceStatus = [
    {
      framework: "ISO 27001",
      status: "Compliant",
      score: "92%",
      lastAudit: "2024-11-15",
      nextAudit: "2025-05-15",
      issues: 2
    },
    {
      framework: "NIST Cybersecurity",
      status: "Compliant",
      score: "88%",
      lastAudit: "2024-10-20",
      nextAudit: "2025-04-20",
      issues: 4
    },
    {
      framework: "GDPR",
      status: "Partially Compliant",
      score: "75%",
      lastAudit: "2024-09-10",
      nextAudit: "2025-03-10",
      issues: 8
    },
    {
      framework: "PCI DSS",
      status: "Non-Compliant",
      score: "45%",
      lastAudit: "2024-08-05",
      nextAudit: "2025-02-05",
      issues: 15
    }
  ];

  const statusColorMap = {
    'Success': 'bg-green-100 text-green-800',
    'Failed': 'bg-red-100 text-red-800',
    'Blocked': 'bg-red-100 text-red-800',
    'Investigated': 'bg-yellow-100 text-yellow-800',
    'Resolved': 'bg-green-100 text-green-800',
    'Quarantined': 'bg-orange-100 text-orange-800',
    'Open': 'bg-red-100 text-red-800',
    'In Progress': 'bg-yellow-100 text-yellow-800',
    'Compliant': 'bg-green-100 text-green-800',
    'Partially Compliant': 'bg-yellow-100 text-yellow-800',
    'Non-Compliant': 'bg-red-100 text-red-800'
  };

  const severityColorMap = {
    'Critical': 'bg-red-100 text-red-800',
    'High': 'bg-orange-100 text-orange-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-green-100 text-green-800'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ICT Security Dashboard</h1>
          <p className="text-gray-600">Monitor and manage ICT security posture and threats</p>
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

      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {securityMetrics.map((metric) => (
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
                metric.status === 'Good' ? 'bg-green-100 text-green-800' :
                metric.status === 'Low' ? 'bg-green-100 text-green-800' :
                metric.status === 'Normal' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {metric.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Events */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Security Events</h2>
            <Link
              href="/ict/security/events"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all events
            </Link>
          </div>
          <div className="space-y-4">
            {securityEvents.map((event) => (
              <div key={event.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      event.severity === 'Critical' ? 'bg-red-100' :
                      event.severity === 'High' ? 'bg-orange-100' : 'bg-yellow-100'
                    }`}>
                      {event.severity === 'Critical' ? (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      ) : event.severity === 'High' ? (
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{event.type}</h4>
                      <p className="text-xs text-gray-500">{event.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityColorMap[event.severity as keyof typeof severityColorMap]}`}>
                      {event.severity}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[event.status as keyof typeof statusColorMap]}`}>
                      {event.status}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <p><span className="font-medium">Source:</span> {event.source}</p>
                  <p><span className="font-medium">Target:</span> {event.target}</p>
                  <p><span className="font-medium">Action:</span> {event.action}</p>
                  <p><span className="font-medium">Time:</span> {event.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vulnerabilities */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Security Vulnerabilities</h2>
            <Link
              href="/ict/security/vulnerabilities"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all vulnerabilities
            </Link>
          </div>
          <div className="space-y-4">
            {vulnerabilities.map((vuln) => (
              <div key={vuln.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{vuln.title}</h4>
                    <p className="text-xs text-gray-500">{vuln.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityColorMap[vuln.severity as keyof typeof severityColorMap]}`}>
                      {vuln.severity}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[vuln.status as keyof typeof statusColorMap]}`}>
                      {vuln.status}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <p><span className="font-medium">CVSS:</span> {vuln.cvss}</p>
                  <p><span className="font-medium">Affected:</span> {vuln.affected}</p>
                  <p><span className="font-medium">Discovered:</span> {vuln.discovered}</p>
                  <p><span className="font-medium">Remediation:</span> {vuln.remediation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Access Logs */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Access Logs</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowSensitiveData(!showSensitiveData)}
              className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              {showSensitiveData ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
              {showSensitiveData ? 'Hide' : 'Show'} Sensitive Data
            </button>
            <Link
              href="/ict/security/logs"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all logs
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accessLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {showSensitiveData ? log.user : '***@npa.gov.ng'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.action}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.resource}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {showSensitiveData ? log.ip : '***.***.***.***'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.location}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.timestamp}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[log.status as keyof typeof statusColorMap]}`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compliance Status */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Compliance Status</h2>
          <Link
            href="/ict/security/compliance"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View compliance details
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {complianceStatus.map((compliance) => (
            <div key={compliance.framework} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">{compliance.framework}</h4>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[compliance.status as keyof typeof statusColorMap]}`}>
                  {compliance.status}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Score</span>
                  <span className="font-medium">{compliance.score}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      compliance.score.includes('9') ? 'bg-green-600' :
                      compliance.score.includes('8') ? 'bg-blue-600' :
                      compliance.score.includes('7') ? 'bg-yellow-600' : 'bg-red-600'
                    }`}
                    style={{ width: compliance.score }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Last Audit: {compliance.lastAudit}</p>
                  <p>Next Audit: {compliance.nextAudit}</p>
                  <p>Open Issues: {compliance.issues}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Security Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/ict/security/threats"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <AlertTriangle className="h-8 w-8 text-red-600 mb-3" />
            <h3 className="font-medium text-sm">Threat Management</h3>
            <p className="text-xs text-gray-500">Manage security threats</p>
          </Link>
          <Link
            href="/ict/security/vulnerabilities"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Shield className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Vulnerability Assessment</h3>
            <p className="text-xs text-gray-500">Scan and assess vulnerabilities</p>
          </Link>
          <Link
            href="/ict/security/access"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Key className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Access Control</h3>
            <p className="text-xs text-gray-500">Manage user access</p>
          </Link>
          <Link
            href="/ict/security/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Security Reports</h3>
            <p className="text-xs text-gray-500">Generate security reports</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
