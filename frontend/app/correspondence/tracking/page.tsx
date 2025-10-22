"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  User,
  Building,
  FileText,
  Mail,
  Send,
  Download,
  MoreHorizontal,
  ChevronDown
} from "lucide-react";

export default function CorrespondenceTrackingPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // Mock correspondence tracking data
  const trackingData = [
    {
      id: "CORR-2024-001",
      referenceNumber: "NPA/CORR/2024/001/001",
      title: "Partnership Agreement with Global Shipping Ltd",
      type: "incoming",
      sender: "Global Shipping Ltd",
      recipient: "GM Operations",
      department: "Commercial Services",
      priority: "high",
      status: "approved",
      currentLocation: "MD Office",
      submittedDate: "2024-10-01",
      lastUpdated: "2024-10-18",
      expectedCompletion: "2024-10-20",
      attachments: 3,
      trackingHistory: [
        {
          date: "2024-10-01",
          time: "09:30",
          action: "Received",
          actor: "Registry Office",
          location: "Registry",
          notes: "Correspondence registered and logged"
        },
        {
          date: "2024-10-02",
          time: "10:15",
          action: "Forwarded",
          actor: "Registry Officer",
          location: "Commercial Services",
          notes: "Forwarded to Commercial Manager for review"
        },
        {
          date: "2024-10-05",
          time: "14:20",
          action: "Reviewed",
          actor: "Commercial Manager",
          location: "Commercial Services",
          notes: "Initial review completed, requires GM approval"
        },
        {
          date: "2024-10-08",
          time: "11:45",
          action: "Forwarded",
          actor: "Commercial Manager",
          location: "GM Operations Office",
          notes: "Forwarded to GM Operations for approval"
        },
        {
          date: "2024-10-15",
          time: "16:30",
          action: "Approved",
          actor: "GM Operations",
          location: "GM Operations Office",
          notes: "Approved with minor amendments required"
        },
        {
          date: "2024-10-18",
          time: "09:00",
          action: "Forwarded",
          actor: "GM Operations",
          location: "MD Office",
          notes: "Forwarded to MD for final approval"
        }
      ]
    },
    {
      id: "CORR-2024-002",
      referenceNumber: "NPA/CORR/2024/001/002",
      title: "Infrastructure Development Proposal",
      type: "incoming",
      sender: "Federal Ministry of Works",
      recipient: "AGM Technical",
      department: "Planning & Development",
      priority: "medium",
      status: "in_review",
      currentLocation: "AGM Technical Office",
      submittedDate: "2024-10-05",
      lastUpdated: "2024-10-17",
      expectedCompletion: "2024-10-25",
      attachments: 5,
      trackingHistory: [
        {
          date: "2024-10-05",
          time: "11:00",
          action: "Received",
          actor: "Registry Office",
          location: "Registry",
          notes: "Correspondence registered with multiple attachments"
        },
        {
          date: "2024-10-07",
          time: "13:45",
          action: "Forwarded",
          actor: "Registry Officer",
          location: "Planning & Development",
          notes: "Forwarded to Planning Director for initial assessment"
        },
        {
          date: "2024-10-10",
          time: "15:20",
          action: "Under Review",
          actor: "Planning Director",
          location: "Planning & Development",
          notes: "Detailed technical review in progress"
        },
        {
          date: "2024-10-15",
          time: "10:30",
          action: "Forwarded",
          actor: "Planning Director",
          location: "AGM Technical Office",
          notes: "Forwarded to AGM Technical for technical approval"
        }
      ]
    },
    {
      id: "CORR-2024-003",
      referenceNumber: "NPA/CORR/2024/001/003",
      title: "Environmental Impact Assessment Report",
      type: "outgoing",
      sender: "NPA",
      recipient: "Nigerian Environmental Agency",
      department: "HSE",
      priority: "high",
      status: "sent",
      currentLocation: "External",
      submittedDate: "2024-10-03",
      lastUpdated: "2024-10-16",
      expectedCompletion: "2024-10-16",
      attachments: 2,
      trackingHistory: [
        {
          date: "2024-10-03",
          time: "08:30",
          action: "Created",
          actor: "HSE Officer",
          location: "HSE Department",
          notes: "Correspondence drafted and submitted for approval"
        },
        {
          date: "2024-10-04",
          time: "14:15",
          action: "Approved",
          actor: "HSE Manager",
          location: "HSE Department",
          notes: "Approved for GM Operations review"
        },
        {
          date: "2024-10-07",
          time: "11:20",
          action: "Approved",
          actor: "GM Operations",
          location: "GM Operations Office",
          notes: "Approved and forwarded to MD for final signature"
        },
        {
          date: "2024-10-10",
          time: "16:45",
          action: "Signed",
          actor: "MD",
          location: "MD Office",
          notes: "Signed and ready for dispatch"
        },
        {
          date: "2024-10-16",
          time: "09:30",
          action: "Dispatched",
          actor: "Registry Office",
          location: "Registry",
          notes: "Sent via registered mail to recipient"
        }
      ]
    },
    {
      id: "CORR-2024-004",
      referenceNumber: "NPA/CORR/2024/001/004",
      title: "Budget Amendment Request",
      type: "internal",
      sender: "Finance Department",
      recipient: "MD",
      department: "Finance & Accounts",
      priority: "urgent",
      status: "pending",
      currentLocation: "Finance Department",
      submittedDate: "2024-10-15",
      lastUpdated: "2024-10-15",
      expectedCompletion: "2024-10-22",
      attachments: 1,
      trackingHistory: [
        {
          date: "2024-10-15",
          time: "10:00",
          action: "Created",
          actor: "Finance Manager",
          location: "Finance Department",
          notes: "Urgent budget amendment request submitted"
        }
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "text-green-600 bg-green-50";
      case "in_review":
        return "text-yellow-600 bg-yellow-50";
      case "sent":
        return "text-blue-600 bg-blue-50";
      case "pending":
        return "text-gray-600 bg-gray-50";
      case "rejected":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return CheckCircle;
      case "in_review":
        return Clock;
      case "sent":
        return Send;
      case "pending":
        return AlertTriangle;
      case "rejected":
        return XCircle;
      default:
        return FileText;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredData = trackingData.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sender.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getDaysOverdue = (expectedDate: string) => {
    const expected = new Date(expectedDate);
    const now = new Date();
    const diffTime = now.getTime() - expected.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Correspondence Tracking</h1>
          <p className="text-gray-600">Monitor correspondence movement and approval status</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/correspondence/register"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Register New Correspondence
          </Link>
          <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Download className="w-4 h-4 inline mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, reference, or sender..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="sent">Sent</option>
            <option value="rejected">Rejected</option>
          </select>

          <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Filter className="w-4 h-4 inline mr-2" />
            More Filters
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{trackingData.length}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-yellow-900">
                {trackingData.filter(item => item.status === "in_review" || item.status === "pending").length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-900">
                {trackingData.filter(item => item.status === "approved" || item.status === "sent").length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Processing Time</p>
              <p className="text-2xl font-bold text-blue-900">8.2 days</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Correspondence List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference & Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type & Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((item) => {
                const StatusIcon = getStatusIcon(item.status);
                const daysOverdue = getDaysOverdue(item.expectedCompletion);

                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {item.type === "incoming" ? (
                            <Mail className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Send className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.referenceNumber}
                          </div>
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {item.title}
                          </div>
                          <div className="text-xs text-gray-400">
                            From: {item.sender}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                          {item.type}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                          {item.priority}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{item.currentLocation}</span>
                      </div>
                      <div className="text-xs text-gray-500">{item.department}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <StatusIcon className={`w-4 h-4 mr-2 ${item.status === "approved" ? "text-green-600" :
                          item.status === "in_review" ? "text-yellow-600" :
                          item.status === "sent" ? "text-blue-600" :
                          item.status === "pending" ? "text-gray-600" : "text-red-600"}`} />
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {item.status.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                      {daysOverdue > 0 && (
                        <div className="text-xs text-red-600 mt-1">
                          {daysOverdue} days overdue
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{item.lastUpdated}</div>
                      <div className="text-xs">
                        Expected: {item.expectedCompletion}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedItem(selectedItem === item.id ? null : item.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Tracking View */}
      {selectedItem && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Tracking History</h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {(() => {
              const item = trackingData.find(i => i.id === selectedItem);
              if (!item) return null;

              return (
                <div className="space-y-6">
                  {/* Item Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Reference Number</span>
                        <p className="text-sm font-mono text-gray-900">{item.referenceNumber}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Current Status</span>
                        <div className="flex items-center mt-1">
                          {React.createElement(getStatusIcon(item.status), {
                            className: `w-4 h-4 mr-2 ${item.status === "approved" ? "text-green-600" :
                              item.status === "in_review" ? "text-yellow-600" :
                              item.status === "sent" ? "text-blue-600" :
                              item.status === "pending" ? "text-gray-600" : "text-red-600"}`
                          })}
                          <span className="text-sm text-gray-900 capitalize">
                            {item.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Current Location</span>
                        <p className="text-sm text-gray-900">{item.currentLocation}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tracking Timeline */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-900">Movement History</h4>
                    <div className="space-y-4">
                      {item.trackingHistory.map((event, index) => (
                        <div key={index} className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <ArrowRight className="w-4 h-4 text-blue-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">
                                {event.action}
                              </span>
                              <span className="text-xs text-gray-500">
                                {event.date} at {event.time}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 mt-1">
                              <div className="flex items-center text-xs text-gray-600">
                                <User className="w-3 h-3 mr-1" />
                                {event.actor}
                              </div>
                              <div className="flex items-center text-xs text-gray-600">
                                <Building className="w-3 h-3 mr-1" />
                                {event.location}
                              </div>
                            </div>
                            {event.notes && (
                              <p className="text-sm text-gray-600 mt-2">{event.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                      Print Tracking Report
                    </button>
                    <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                      Update Status
                    </button>
                    <button className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700">
                      Forward to Next Approver
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
