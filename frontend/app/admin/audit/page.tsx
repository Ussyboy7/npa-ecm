"use client";

import { useState } from "react";
import { Search, Filter, Download, Eye } from "lucide-react";

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const auditLogs = [
    { id: 1, user: "John Doe", action: "Document Upload", resource: "Budget Report 2024.pdf", ipAddress: "192.168.1.100", timestamp: "2024-12-16T14:30:00", status: "success" },
    { id: 2, user: "Jane Smith", action: "User Created", resource: "mike.johnson@npa.gov", ipAddress: "192.168.1.101", timestamp: "2024-12-16T13:15:00", status: "success" },
    { id: 3, user: "Mike Johnson", action: "Document Approved", resource: "Policy Document #123", ipAddress: "192.168.1.102", timestamp: "2024-12-16T12:45:00", status: "success" },
    { id: 4, user: "Sarah Wilson", action: "Login Attempt", resource: "System Access", ipAddress: "192.168.1.103", timestamp: "2024-12-16T11:20:00", status: "failed" },
    { id: 5, user: "David Lee", action: "Workflow Started", resource: "Contract Approval #456", ipAddress: "192.168.1.104", timestamp: "2024-12-16T10:00:00", status: "success" },
    { id: 6, user: "John Doe", action: "Settings Modified", resource: "Notification Preferences", ipAddress: "192.168.1.100", timestamp: "2024-12-16T09:30:00", status: "success" },
  ];

  const statusColors = {
    success: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    warning: "bg-yellow-100 text-yellow-800"
  };

  const exportLogs = () => {
    alert("Exporting audit logs...");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600">Monitor system activity and user actions</p>
        </div>
        <button 
          onClick={exportLogs}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Logs
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">All Actions</option>
              <option value="login">Login</option>
              <option value="document">Document Actions</option>
              <option value="user">User Management</option>
              <option value="workflow">Workflow</option>
              <option value="settings">Settings</option>
            </select>
          </div>
          <div>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="warning">Warning</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(log.timestamp).toLocaleString('en-US', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                        {log.user.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{log.user}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.resource}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {log.ipAddress}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[log.status as keyof typeof statusColors]}`}>
                      {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-sm text-gray-600">Total Events</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">1,284</p>
          <p className="text-xs text-green-600 mt-1">+12% from last week</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-sm text-gray-600">Successful Actions</p>
          <p className="text-2xl font-bold text-green-600 mt-1">1,256</p>
          <p className="text-xs text-gray-500 mt-1">97.8% success rate</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-sm text-gray-600">Failed Actions</p>
          <p className="text-2xl font-bold text-red-600 mt-1">28</p>
          <p className="text-xs text-red-600 mt-1">2.2% failure rate</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-sm text-gray-600">Active Users</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">45</p>
          <p className="text-xs text-gray-500 mt-1">In the last 24 hours</p>
        </div>
      </div>
    </div>
  );
}
