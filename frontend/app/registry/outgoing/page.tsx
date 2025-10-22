"use client";

import { useState } from "react";
import {
  Send,
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

export default function OutgoingRecordsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const outgoingRecords = [
    {
      id: "OUT-2025-001",
      reference: "NPA/2025/001",
      recipient: "Ministry of Transportation",
      subject: "Port Development Progress Report",
      sentDate: "2025-01-15",
      sentTime: "14:30",
      sentBy: "MD Office",
      status: "Delivered",
      priority: "High",
      documentType: "Official Report",
      attachments: 3,
      deliveryMethod: "Email",
      trackingNumber: "TRK001234567",
      category: "Government Correspondence"
    },
    {
      id: "OUT-2025-002",
      reference: "NPA/2025/002",
      recipient: "Lagos State Government",
      subject: "Port Security Enhancement Response",
      sentDate: "2025-01-15",
      sentTime: "16:45",
      sentBy: "Security Department",
      status: "In Transit",
      priority: "Medium",
      documentType: "Response Letter",
      attachments: 1,
      deliveryMethod: "Courier",
      trackingNumber: "TRK001234568",
      category: "Security Matters"
    },
    {
      id: "OUT-2025-003",
      reference: "NPA/2025/003",
      recipient: "Nigerian Customs Service",
      subject: "Customs Clearance Procedures Acknowledgment",
      sentDate: "2025-01-14",
      sentTime: "11:20",
      sentBy: "Operations Department",
      status: "Delivered",
      priority: "Low",
      documentType: "Acknowledgment",
      attachments: 0,
      deliveryMethod: "Email",
      trackingNumber: "TRK001234569",
      category: "Operational Procedures"
    },
    {
      id: "OUT-2025-004",
      reference: "NPA/2025/004",
      recipient: "International Maritime Organization",
      subject: "Safety Standards Compliance Response",
      sentDate: "2025-01-14",
      sentTime: "09:10",
      sentBy: "Safety Department",
      status: "Pending Delivery",
      priority: "High",
      documentType: "Compliance Report",
      attachments: 2,
      deliveryMethod: "Email",
      trackingNumber: "TRK001234570",
      category: "Safety & Compliance"
    },
    {
      id: "OUT-2025-005",
      reference: "NPA/2025/005",
      recipient: "Port Users Association",
      subject: "Tariff Review Response",
      sentDate: "2025-01-13",
      sentTime: "15:15",
      sentBy: "Finance Department",
      status: "Delivered",
      priority: "Medium",
      documentType: "Response Letter",
      attachments: 1,
      deliveryMethod: "Email",
      trackingNumber: "TRK001234571",
      category: "Financial Matters"
    }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "pending_delivery", label: "Pending Delivery" },
    { value: "in_transit", label: "In Transit" },
    { value: "delivered", label: "Delivered" },
    { value: "failed", label: "Failed" }
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
    'Pending Delivery': 'bg-yellow-100 text-yellow-800',
    'In Transit': 'bg-blue-100 text-blue-800',
    'Delivered': 'bg-green-100 text-green-800',
    'Failed': 'bg-red-100 text-red-800'
  };

  const filteredRecords = outgoingRecords.filter(record => {
    const matchesSearch = record.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.reference.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         record.status.toLowerCase().replace(" ", "_") === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Outgoing Records</h1>
          <p className="text-gray-600">Track and manage all outgoing correspondence and documents</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/registry/outgoing/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New
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
              <p className="text-sm font-medium text-gray-600">Total Sent</p>
              <p className="text-2xl font-bold text-gray-900">2,156</p>
            </div>
            <Send className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Transit</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Delivered</p>
              <p className="text-2xl font-bold text-gray-900">2,089</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-gray-900">3</p>
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
                placeholder="Search by subject, recipient, or reference..."
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

      {/* Outgoing Records Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Outgoing Correspondence Records</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{record.reference}</div>
                      <div className="text-sm text-gray-500">{record.id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{record.recipient}</div>
                      <div className="text-sm text-gray-500">{record.category}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">{record.subject}</div>
                    <div className="text-sm text-gray-500">{record.documentType}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">{record.sentDate}</div>
                      <div className="text-sm text-gray-500">{record.sentTime}</div>
                      <div className="text-xs text-gray-400">by {record.sentBy}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[record.status as keyof typeof statusColorMap]}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColorMap[record.priority as keyof typeof priorityColorMap]}`}>
                      {record.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">{record.deliveryMethod}</div>
                      <div className="text-sm text-gray-500">{record.trackingNumber}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-900">
                        <RefreshCw className="w-4 h-4" />
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
          Showing <span className="font-medium">1</span> to <span className="font-medium">5</span> of <span className="font-medium">2,156</span> results
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
