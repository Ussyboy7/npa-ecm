"use client";

import { useState } from "react";
import {
  CheckCircle,
  Search,
  Filter,
  FileText,
  Download,
  Archive,
  Calendar,
  User,
  Building,
  Eye,
  FolderOpen,
  Tag,
  Clock
} from "lucide-react";
import { NPA_DEPARTMENTS, NPA_DOCUMENT_TYPES } from "@/lib/npa-structure";

export default function ApprovedDocumentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Mock approved documents data
  const approvedDocuments = [
    {
      id: "APPROVED-2024-001",
      title: "Q4 Budget Allocation Memo",
      type: "Memo",
      department: "Finance & Accounts",
      approvedBy: "MD",
      approvalDate: "2024-10-18",
      approvedDate: "2024-10-18",
      referenceNumber: "NPA/MEMO/2024/001",
      status: "filed",
      filedDate: "2024-10-19",
      attachments: 2,
      category: "Financial",
      priority: "high"
    },
    {
      id: "APPROVED-2024-002",
      title: "Infrastructure Development Agreement",
      type: "Contract",
      department: "Planning & Development",
      approvedBy: "GM Operations",
      approvalDate: "2024-10-16",
      approvedDate: "2024-10-16",
      referenceNumber: "NPA/CON/2024/015",
      status: "filed",
      filedDate: "2024-10-17",
      attachments: 5,
      category: "Infrastructure",
      priority: "high"
    },
    {
      id: "APPROVED-2024-003",
      title: "Staff Training Program Approval",
      type: "Policy Document",
      department: "Human Resources",
      approvedBy: "GM Operations",
      approvalDate: "2024-10-14",
      approvedDate: "2024-10-14",
      referenceNumber: "NPA/POL/2024/008",
      status: "pending_filing",
      filedDate: null,
      attachments: 1,
      category: "HR",
      priority: "medium"
    },
    {
      id: "APPROVED-2024-004",
      title: "Security Equipment Procurement Tender",
      type: "Procurement Document",
      department: "Security",
      approvedBy: "MD",
      approvalDate: "2024-10-12",
      approvedDate: "2024-10-12",
      referenceNumber: "NPA/PROC/2024/022",
      status: "filed",
      filedDate: "2024-10-13",
      attachments: 3,
      category: "Procurement",
      priority: "high"
    },
    {
      id: "APPROVED-2024-005",
      title: "Annual Performance Report",
      type: "Report",
      department: "Technical Services",
      approvedBy: "AGM Technical",
      approvalDate: "2024-10-10",
      approvedDate: "2024-10-10",
      referenceNumber: "NPA/RPT/2024/045",
      status: "archived",
      filedDate: "2024-10-11",
      attachments: 4,
      category: "Technical",
      priority: "medium"
    }
  ];

  const filteredDocuments = approvedDocuments.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "filed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "pending_filing":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "archived":
        return <Archive className="w-4 h-4 text-blue-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "filed":
        return "bg-green-100 text-green-800";
      case "pending_filing":
        return "bg-yellow-100 text-yellow-800";
      case "archived":
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Financial":
        return "bg-blue-100 text-blue-800";
      case "Infrastructure":
        return "bg-purple-100 text-purple-800";
      case "HR":
        return "bg-green-100 text-green-800";
      case "Procurement":
        return "bg-orange-100 text-orange-800";
      case "Technical":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const pendingFilingCount = approvedDocuments.filter(doc => doc.status === "pending_filing").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Approved Documents</h1>
          <p className="text-gray-600">Documents that have been approved and require filing</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
            {pendingFilingCount} Pending Filing
          </div>
          <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
            {approvedDocuments.filter(doc => doc.status === "filed").length} Filed
          </div>
          <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
            {approvedDocuments.filter(doc => doc.status === "archived").length} Archived
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search approved documents..."
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
            <option value="pending_filing">Pending Filing</option>
            <option value="filed">Filed</option>
            <option value="archived">Archived</option>
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

      {/* Approved Documents List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Approved Documents ({filteredDocuments.length})
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredDocuments.map((doc) => (
            <div key={doc.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusIcon(doc.status)}
                    <h3 className="text-lg font-medium text-gray-900">{doc.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(doc.status)}`}>
                      {doc.status.replace("_", " ").toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(doc.priority)}`}>
                      {doc.priority.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(doc.category)}`}>
                      {doc.category}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      {doc.referenceNumber}
                    </div>
                    <div className="flex items-center">
                      <Building className="w-4 h-4 mr-2" />
                      {doc.department}
                    </div>
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Approved by: {doc.approvedBy}
                    </div>
                  </div>

                  {/* Filing Information */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Approval Date</div>
                        <div className="text-sm font-medium text-gray-900">{doc.approvalDate}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Filed Date</div>
                        <div className="text-sm font-medium text-gray-900">
                          {doc.filedDate || "Not yet filed"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Attachments</div>
                        <div className="text-sm font-medium text-gray-900">
                          {doc.attachments} file{doc.attachments !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Document Type: {doc.type}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        <Eye className="w-4 h-4 inline mr-1" />
                        View Details
                      </button>
                      <button className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">
                        <Download className="w-4 h-4 inline mr-1" />
                        Download
                      </button>
                      {doc.status === "pending_filing" && (
                        <button className="px-3 py-1 text-sm bg-yellow-600 text-white rounded-md hover:bg-yellow-700">
                          <FolderOpen className="w-4 h-4 inline mr-1" />
                          File Document
                        </button>
                      )}
                      {doc.status === "filed" && (
                        <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                          <Archive className="w-4 h-4 inline mr-1" />
                          Archive
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredDocuments.length === 0 && (
            <div className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No approved documents found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "No documents have been approved yet"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
