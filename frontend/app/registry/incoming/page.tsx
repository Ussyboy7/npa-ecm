"use client";

import { useState } from "react";
import {
  Upload,
  Search,
  Filter,
  Download,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Mail,
  Calendar,
  User,
  Building,
  ArrowRight,
  RefreshCw,
  Plus
} from "lucide-react";
import Link from "next/link";

export default function IncomingLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const incomingLogs = [
    {
      id: "INC-2025-001",
      reference: "REF/2025/001",
      sender: "Ministry of Transportation",
      subject: "Port Development Project Approval",
      receivedDate: "2025-01-15",
      receivedTime: "09:30",
      receivedBy: "Registry Officer A",
      status: "Registered",
      priority: "High",
      documentType: "Official Letter",
      attachments: 2,
      assignedTo: "MD Office",
      dueDate: "2025-01-22",
      category: "Government Correspondence"
    },
    {
      id: "INC-2025-002",
      reference: "REF/2025/002",
      sender: "Lagos State Government",
      subject: "Port Security Enhancement Request",
      receivedDate: "2025-01-15",
      receivedTime: "11:45",
      receivedBy: "Registry Officer B",
      status: "Processing",
      priority: "Medium",
      documentType: "Request Letter",
      attachments: 1,
      assignedTo: "Security Department",
      dueDate: "2025-01-25",
      category: "Security Matters"
    },
    {
      id: "INC-2025-003",
      reference: "REF/2025/003",
      sender: "Nigerian Customs Service",
      subject: "Customs Clearance Procedures Update",
      receivedDate: "2025-01-14",
      receivedTime: "14:20",
      receivedBy: "Registry Officer A",
      status: "Completed",
      priority: "Low",
      documentType: "Circular",
      attachments: 0,
      assignedTo: "Operations Department",
      dueDate: "2025-01-20",
      category: "Operational Procedures"
    },
    {
      id: "INC-2025-004",
      reference: "REF/2025/004",
      sender: "International Maritime Organization",
      subject: "Safety Standards Compliance Report",
      receivedDate: "2025-01-14",
      receivedTime: "16:10",
      receivedBy: "Registry Officer C",
      status: "Pending Review",
      priority: "High",
      documentType: "Report",
      attachments: 3,
      assignedTo: "Safety Department",
      dueDate: "2025-01-28",
      category: "Safety & Compliance"
    },
    {
      id: "INC-2025-005",
      reference: "REF/2025/005",
      sender: "Port Users Association",
      subject: "Tariff Review Proposal",
      receivedDate: "2025-01-13",
      receivedTime: "10:15",
      receivedBy: "Registry Officer B",
      status: "Under Review",
      priority: "Medium",
      documentType: "Proposal",
      attachments: 1,
      assignedTo: "Finance Department",
      dueDate: "2025-01-30",
      category: "Financial Matters"
    }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "registered", label: "Registered" },
    { value: "processing", label: "Processing" },
    { value: "pending_review", label: "Pending Review" },
    { value: "under_review", label: "Under Review" },
    { value: "completed", label: "Completed" }
  ];

  const dateOptions = [
    { value: "all", label: "All Dates" },
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "this_week", label: "This Week" },
    { value: "this_month", label: "This Month" }
  ];

  const priorityColorMap = {
    'High': 'bg-red-100 text-red-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-green-100 text-green-800'
  };

  const statusColorMap = {
    'Registered': 'bg-blue-100 text-blue-800',
    'Processing': 'bg-yellow-100 text-yellow-800',
    'Pending Review': 'bg-orange-100 text-orange-800',
    'Under Review': 'bg-purple-100 text-purple-800',
    'Completed': 'bg-green-100 text-green-800'
  };

  const filteredLogs = incomingLogs.filter(log => {
    const matchesSearch = log.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.reference.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         log.status.toLowerCase().replace(" ", "_") === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Incoming Logs</h1>
          <p className="text-gray-600">Track and manage all incoming correspondence and documents</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/registry/incoming/register"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Register New
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Received</p>
              <p className="text-2xl font-bold text-gray-900">1,247</p>
            </div>
            <Upload className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold text-gray-900">23</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">1,156</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-gray-900">5</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by subject, sender, or reference..."
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
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {dateOptions.map(option => (
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

      {/* Incoming Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Incoming Correspondence Log</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sender</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{log.reference}</div>
                      <div className="text-sm text-gray-500">{log.id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{log.sender}</div>
                      <div className="text-sm text-gray-500">{log.category}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">{log.subject}</div>
                    <div className="text-sm text-gray-500">{log.documentType}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">{log.receivedDate}</div>
                      <div className="text-sm text-gray-500">{log.receivedTime}</div>
                      <div className="text-xs text-gray-400">by {log.receivedBy}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[log.status as keyof typeof statusColorMap]}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColorMap[log.priority as keyof typeof priorityColorMap]}`}>
                      {log.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">{log.assignedTo}</div>
                      <div className="text-sm text-gray-500">Due: {log.dueDate}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-900">
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">1</span> to <span className="font-medium">5</span> of <span className="font-medium">1,247</span> results
        </div>
        <div className="flex space-x-2">
          <button className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
            Previous
          </button>
          <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md">
            1
          </button>
          <button className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
            2
          </button>
          <button className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
            3
          </button>
          <button className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
