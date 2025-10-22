"use client";

import { useState } from "react";
import {
  Archive,
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
  Plus,
  Trash2,
  Restore
} from "lucide-react";
import Link from "next/link";

export default function ArchiveManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const archivedDocuments = [
    {
      id: "ARC-2024-001",
      title: "Annual Financial Report 2023",
      type: "Report",
      reference: "NPA/2023/FIN/001",
      author: "Finance Department",
      archivedDate: "2024-12-31",
      originalDate: "2024-01-15",
      status: "Archived",
      category: "Financial Reports",
      retentionPeriod: "7 years",
      location: "Archive Room A-12",
      accessLevel: "Restricted",
      fileSize: "15.2 MB",
      version: "Final"
    },
    {
      id: "ARC-2024-002",
      title: "Port Operations Manual 2022",
      type: "Manual",
      reference: "NPA/2022/OPS/002",
      author: "Operations Department",
      archivedDate: "2024-11-30",
      originalDate: "2022-06-15",
      status: "Archived",
      category: "Operations Manuals",
      retentionPeriod: "10 years",
      location: "Archive Room B-08",
      accessLevel: "Internal",
      fileSize: "8.7 MB",
      version: "v3.2"
    },
    {
      id: "ARC-2024-003",
      title: "HR Policy Documents 2021",
      type: "Policy",
      reference: "NPA/2021/HR/003",
      author: "Human Resources",
      archivedDate: "2024-10-15",
      originalDate: "2021-03-20",
      status: "Archived",
      category: "HR Policies",
      retentionPeriod: "5 years",
      location: "Archive Room A-05",
      accessLevel: "Confidential",
      fileSize: "3.4 MB",
      version: "v2.1"
    },
    {
      id: "ARC-2024-004",
      title: "Safety Audit Reports 2020",
      type: "Report",
      reference: "NPA/2020/SAF/004",
      author: "Safety Department",
      archivedDate: "2024-09-20",
      originalDate: "2020-12-10",
      status: "Archived",
      category: "Safety Reports",
      retentionPeriod: "7 years",
      location: "Archive Room C-15",
      accessLevel: "Restricted",
      fileSize: "12.8 MB",
      version: "Final"
    },
    {
      id: "ARC-2024-005",
      title: "IT Infrastructure Documentation 2019",
      type: "Documentation",
      reference: "NPA/2019/IT/005",
      author: "ICT Division",
      archivedDate: "2024-08-10",
      originalDate: "2019-08-15",
      status: "Archived",
      category: "IT Documentation",
      retentionPeriod: "5 years",
      location: "Archive Room B-12",
      accessLevel: "Internal",
      fileSize: "6.2 MB",
      version: "v1.8"
    }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "archived", label: "Archived" },
    { value: "pending_destruction", label: "Pending Destruction" },
    { value: "retention_expired", label: "Retention Expired" }
  ];

  const dateOptions = [
    { value: "all", label: "All Dates" },
    { value: "this_year", label: "This Year" },
    { value: "last_year", label: "Last Year" },
    { value: "older", label: "Older" }
  ];

  const categoryOptions = [
    { value: "all", label: "All Categories" },
    { value: "Financial Reports", label: "Financial Reports" },
    { value: "Operations Manuals", label: "Operations Manuals" },
    { value: "HR Policies", label: "HR Policies" },
    { value: "Safety Reports", label: "Safety Reports" },
    { value: "IT Documentation", label: "IT Documentation" }
  ];

  const accessLevelColorMap = {
    'Public': 'bg-green-100 text-green-800',
    'Internal': 'bg-blue-100 text-blue-800',
    'Confidential': 'bg-yellow-100 text-yellow-800',
    'Restricted': 'bg-red-100 text-red-800'
  };

  const filteredDocuments = archivedDocuments.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.reference.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         doc.status.toLowerCase().replace(" ", "_") === statusFilter;
    
    const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Archive Management</h1>
          <p className="text-gray-600">Manage archived documents and records retention</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/registry/archive/retention"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Clock className="w-4 h-4 mr-2" />
            Retention Policy
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Export Archive
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Archived</p>
              <p className="text-2xl font-bold text-gray-900">15,247</p>
            </div>
            <Archive className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Retention Expired</p>
              <p className="text-2xl font-bold text-gray-900">1,234</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Destruction</p>
              <p className="text-2xl font-bold text-gray-900">567</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Storage Used</p>
              <p className="text-2xl font-bold text-gray-900">2.4 TB</p>
            </div>
            <FileText className="h-8 w-8 text-green-600" />
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
                placeholder="Search archived documents by title, author, or reference..."
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
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categoryOptions.map(option => (
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

      {/* Archived Documents Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Archived Documents</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Archived Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Retention</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Access Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                      <div className="text-sm text-gray-500">{doc.reference} | {doc.type}</div>
                      <div className="text-xs text-gray-400">Size: {doc.fileSize} | Version: {doc.version}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">{doc.author}</div>
                      <div className="text-sm text-gray-500">{doc.category}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">{doc.archivedDate}</div>
                      <div className="text-sm text-gray-500">Original: {doc.originalDate}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">{doc.retentionPeriod}</div>
                      <div className="text-sm text-gray-500">{doc.status}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{doc.location}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${accessLevelColorMap[doc.accessLevel as keyof typeof accessLevelColorMap]}`}>
                      {doc.accessLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-900">
                        <Restore className="w-4 h-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Retention Policy Info */}
      <div className="bg-yellow-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-yellow-900 mb-3">Retention Policy Information</h3>
        <div className="text-sm text-yellow-800 space-y-2">
          <p>• Documents are automatically archived based on their retention period</p>
          <p>• Financial reports: 7 years retention</p>
          <p>• HR policies: 5 years retention</p>
          <p>• Operations manuals: 10 years retention</p>
          <p>• Documents marked for destruction will be permanently deleted after approval</p>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">1</span> to <span className="font-medium">5</span> of <span className="font-medium">15,247</span> results
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
