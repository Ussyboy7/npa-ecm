"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  FileText, 
  Upload, 
  Search, 
  Filter, 
  MoreVertical,
  Eye,
  Download,
  Edit,
  Trash2,
  Calendar,
  User,
  Tag
} from "lucide-react";
import { NPA_DEPARTMENTS, NPA_DOCUMENT_TYPES } from "@/lib/npa-structure";

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState({
    type: "",
    status: "",
    department: "",
    dateRange: ""
  });

  // Enhanced mock data with comprehensive document information
  const documents = [
    {
      id: 1,
      title: "Q4 Financial Report 2024",
      type: "Financial Report",
      status: "approved",
      department: "Finance",
      author: "GM, Finance",
      createdDate: "2024-12-15",
      fileSize: "2.3 MB",
      version: "1.0",
      tags: ["finance", "quarterly", "report"],
      lastModified: "2024-12-15 14:30",
      modifiedBy: "GM, Finance",
      accessLevel: "confidential",
      downloadCount: 12,
      viewCount: 45,
      approvalStatus: "approved",
      approvedBy: "Managing Director",
      approvedDate: "2024-12-16 10:15"
    },
    {
      id: 2,
      title: "Port Operations Manual Update",
      type: "Operational Document",
      status: "pending_review",
      department: "Marine & Operations",
      author: "AGM, Marine Operations",
      createdDate: "2024-12-14",
      fileSize: "5.1 MB",
      version: "2.1",
      tags: ["operations", "manual", "update"],
      lastModified: "2024-12-14 16:45",
      modifiedBy: "AGM, Marine Operations",
      accessLevel: "internal",
      downloadCount: 8,
      viewCount: 23,
      approvalStatus: "pending",
      currentApprover: "GM, Marine & Operations"
    },
    {
      id: 3,
      title: "HR Policy Guidelines 2025",
      type: "Policy Document",
      status: "draft",
      department: "Human Resources",
      author: "GM, Human Resources",
      createdDate: "2024-12-13",
      fileSize: "1.8 MB",
      version: "1.2",
      tags: ["hr", "policy", "guidelines"],
      lastModified: "2024-12-13 11:20",
      modifiedBy: "GM, Human Resources",
      accessLevel: "internal",
      downloadCount: 0,
      viewCount: 3,
      approvalStatus: "draft"
    },
    {
      id: 4,
      title: "Security Incident Report - Dec 12",
      type: "Incident Report",
      status: "approved",
      department: "Security",
      author: "GM, Security",
      createdDate: "2024-12-12",
      fileSize: "890 KB",
      version: "1.0",
      tags: ["security", "incident", "report"],
      lastModified: "2024-12-12 09:15",
      modifiedBy: "GM, Security",
      accessLevel: "restricted",
      downloadCount: 5,
      viewCount: 18,
      approvalStatus: "approved",
      approvedBy: "Managing Director",
      approvedDate: "2024-12-13 08:30"
    },
    {
      id: 5,
      title: "ICT Infrastructure Report",
      type: "Technical Document",
      status: "in_review",
      department: "Information & Communication Technology",
      author: "AGM, Software",
      createdDate: "2024-12-11",
      fileSize: "3.2 MB",
      version: "1.5",
      tags: ["ict", "infrastructure", "technical"],
      lastModified: "2024-12-11 15:30",
      modifiedBy: "AGM, Software",
      accessLevel: "internal",
      downloadCount: 3,
      viewCount: 12,
      approvalStatus: "in_review",
      currentApprover: "GM, ICT"
    },
    {
      id: 6,
      title: "Marine Safety Procedures Manual",
      type: "Operational Document",
      status: "approved",
      department: "Marine & Operations",
      author: "AGM, Marine Operations",
      createdDate: "2024-12-10",
      fileSize: "4.2 MB",
      version: "3.0",
      tags: ["marine", "safety", "procedures"],
      lastModified: "2024-12-10 13:45",
      modifiedBy: "AGM, Marine Operations",
      accessLevel: "internal",
      downloadCount: 15,
      viewCount: 67,
      approvalStatus: "approved",
      approvedBy: "GM, Marine & Operations",
      approvedDate: "2024-12-11 14:20"
    },
    {
      id: 7,
      title: "Port Expansion Feasibility Study",
      type: "Technical Document",
      status: "pending_review",
      department: "Engineering & Technical Services",
      author: "GM, Engineering",
      createdDate: "2024-12-09",
      fileSize: "6.8 MB",
      version: "1.0",
      tags: ["engineering", "expansion", "feasibility"],
      lastModified: "2024-12-09 17:00",
      modifiedBy: "GM, Engineering",
      accessLevel: "confidential",
      downloadCount: 2,
      viewCount: 8,
      approvalStatus: "pending",
      currentApprover: "Executive Director"
    },
    {
      id: 8,
      title: "Vendor Contract - ABC Corp",
      type: "Contract",
      status: "approved",
      department: "Procurement",
      author: "GM, Procurement",
      createdDate: "2024-12-08",
      fileSize: "1.2 MB",
      version: "2.0",
      tags: ["contract", "vendor", "procurement"],
      lastModified: "2024-12-08 10:30",
      modifiedBy: "GM, Procurement",
      accessLevel: "restricted",
      downloadCount: 4,
      viewCount: 15,
      approvalStatus: "approved",
      approvedBy: "Managing Director",
      approvedDate: "2024-12-09 16:45"
    }
  ];

  const statusColors = {
    approved: "bg-green-100 text-green-800",
    pending_review: "bg-yellow-100 text-yellow-800",
    in_review: "bg-blue-100 text-blue-800",
    draft: "bg-gray-100 text-gray-800",
    rejected: "bg-red-100 text-red-800"
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Manage and organize your electronic content</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/documents/upload-bulk"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            Bulk Upload
          </Link>
          <div className="flex space-x-3">
            <Link
              href="/documents/create"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FileText className="w-4 h-4 mr-2" />
              Create Document
            </Link>
            <Link
              href="/documents/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Link>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents, content, or metadata..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={selectedFilters.type}
              onChange={(e) => setSelectedFilters({...selectedFilters, type: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              {NPA_DOCUMENT_TYPES.map((type) => (
                <option key={type.code} value={type.code.toLowerCase()}>
                  {type.name}
                </option>
              ))}
            </select>

            <select
              value={selectedFilters.status}
              onChange={(e) => setSelectedFilters({...selectedFilters, status: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending_review">Pending Review</option>
              <option value="in_review">In Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={selectedFilters.department}
              onChange={(e) => setSelectedFilters({...selectedFilters, department: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Departments</option>
              {NPA_DEPARTMENTS
                .filter(dept => dept.parent === null)
                .map((dept) => (
                  <option key={dept.code} value={dept.code.toLowerCase()}>
                    {dept.name}
                  </option>
                ))}
            </select>

            <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-4 flex gap-6 text-sm text-gray-600">
          <span>Total: {documents.length}</span>
          <span>Approved: {documents.filter(d => d.status === 'approved').length}</span>
          <span>Pending: {documents.filter(d => ['pending_review', 'in_review'].includes(d.status)).length}</span>
          <span>Draft: {documents.filter(d => d.status === 'draft').length}</span>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Document Library</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          <Link href={`/documents/${doc.id}`} className="hover:text-blue-600">
                            {doc.title}
                          </Link>
                        </div>
                        <div className="text-sm text-gray-500">
                          {doc.fileSize} • v{doc.version}
                        </div>
                        <div className="flex items-center mt-1 space-x-2">
                          {doc.tags.map((tag, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                              <Tag className="w-3 h-3 mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {doc.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[doc.status as keyof typeof statusColors]}`}>
                      {doc.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {doc.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <User className="h-4 w-4 mr-2 text-gray-400" />
                      {doc.author}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      {new Date(doc.createdDate).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit' 
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Link 
                        href={`/documents/${doc.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button className="text-gray-600 hover:text-gray-900">
                        <Download className="h-4 w-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">1</span> to <span className="font-medium">5</span> of <span className="font-medium">{documents.length}</span> results
            </div>
            <div className="flex space-x-2">
              <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50">
                Previous
              </button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
                1
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50">
                2
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
