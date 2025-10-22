"use client";

import { useState } from "react";
import {
  Send,
  Search,
  Filter,
  Eye,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  Calendar,
  User,
  Building,
  ArrowRight
} from "lucide-react";
import { NPA_DEPARTMENTS } from "@/lib/npa-structure";

export default function SentMemosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Mock sent memos data
  const sentMemos = [
    {
      id: "MEMO-2024-001",
      title: "Request for Additional Budget Allocation",
      type: "Budget Request",
      department: "Finance & Accounts",
      recipient: "MD",
      status: "approved",
      priority: "high",
      sentDate: "2024-10-15",
      approvedDate: "2024-10-18",
      approver: "MD",
      attachments: 2,
      currentStep: "Completed",
      nextAction: null
    },
    {
      id: "MEMO-2024-002",
      title: "Staff Training Program Proposal",
      type: "Training Proposal",
      department: "Human Resources",
      recipient: "GM Operations",
      status: "pending",
      priority: "medium",
      sentDate: "2024-10-12",
      approvedDate: null,
      approver: "GM Operations",
      attachments: 1,
      currentStep: "Under Review",
      nextAction: "Awaiting GM Operations approval"
    },
    {
      id: "MEMO-2024-003",
      title: "Equipment Maintenance Schedule",
      type: "Maintenance Report",
      department: "Technical Services",
      recipient: "AGM Technical",
      status: "in_review",
      priority: "low",
      sentDate: "2024-10-10",
      approvedDate: null,
      approver: "AGM Technical",
      attachments: 0,
      currentStep: "Initial Review",
      nextAction: "Department head review"
    },
    {
      id: "MEMO-2024-004",
      title: "Security Protocol Update",
      type: "Policy Update",
      department: "Security",
      recipient: "GM Security",
      status: "rejected",
      priority: "high",
      sentDate: "2024-10-08",
      approvedDate: null,
      approver: "GM Security",
      attachments: 3,
      currentStep: "Rejected",
      nextAction: "Revision required"
    },
    {
      id: "MEMO-2024-005",
      title: "Port Infrastructure Development",
      type: "Development Plan",
      department: "Planning & Development",
      recipient: "MD",
      status: "in_review",
      priority: "high",
      sentDate: "2024-10-05",
      approvedDate: null,
      approver: "MD",
      attachments: 5,
      currentStep: "MD Review",
      nextAction: "Awaiting MD approval"
    }
  ];

  const filteredMemos = sentMemos.filter(memo => {
    const matchesSearch = memo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         memo.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || memo.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "in_review":
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
      default:
        return <Send className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "in_review":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-600 bg-red-50";
      case "medium":
        return "text-yellow-600 bg-yellow-50";
      case "low":
        return "text-green-600 bg-green-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sent Memos</h1>
          <p className="text-gray-600">Track the status of memos you've sent</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search sent memos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Clear Filters */}
          <button
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
            }}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Memos List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Sent Memos ({filteredMemos.length})
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredMemos.map((memo) => (
            <div key={memo.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusIcon(memo.status)}
                    <h3 className="text-lg font-medium text-gray-900">{memo.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(memo.status)}`}>
                      {memo.status.replace("_", " ").toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(memo.priority)}`}>
                      {memo.priority.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center">
                      <Send className="w-4 h-4 mr-2" />
                      {memo.id}
                    </div>
                    <div className="flex items-center">
                      <Building className="w-4 h-4 mr-2" />
                      {memo.department}
                    </div>
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      To: {memo.recipient}
                    </div>
                  </div>

                  {/* Approval Progress */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Approval Progress</span>
                      <span className="text-sm text-gray-600">{memo.currentStep}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            memo.status === "approved" ? "bg-green-600" :
                            memo.status === "rejected" ? "bg-red-600" :
                            "bg-blue-600"
                          }`}
                          style={{
                            width: memo.status === "approved" ? "100%" :
                                   memo.status === "rejected" ? "100%" :
                                   memo.status === "in_review" ? "60%" : "30%"
                          }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {memo.approvedDate ? `Approved ${memo.approvedDate}` : memo.nextAction}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Sent: {memo.sentDate}
                      </div>
                      {memo.approvedDate && (
                        <div className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approved: {memo.approvedDate}
                        </div>
                      )}
                      {memo.attachments > 0 && (
                        <div className="flex items-center">
                          <Send className="w-4 h-4 mr-1" />
                          {memo.attachments} attachment{memo.attachments !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredMemos.length === 0 && (
            <div className="p-12 text-center">
              <Send className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No sent memos found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "You haven't sent any memos yet"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
