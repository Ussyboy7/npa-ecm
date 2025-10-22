"use client";

import { useState } from "react";
import Link from "next/link";
import { Document } from "@/types";
import { 
  Archive, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Tag, 
  FileText,
  Download,
  Eye,
  Trash2,
  AlertTriangle,
  Building,
  Clock
} from "lucide-react";

interface ExpiryStatus {
  status: "expired" | "expiring" | "active";
  color: string;
  text: string;
}

export default function ArchivePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Mock archived documents
  const archivedDocuments = [
    {
      id: 1,
      title: "Q3 Financial Report 2023",
      type: "Financial Report",
      department: "Finance",
      author: "John Smith",
      archivedDate: "2024-01-15",
      originalDate: "2023-09-30",
      retentionExpiry: "2028-09-30",
      archiveReason: "End of retention period",
      fileSize: "2.1 MB",
      status: "active",
      tags: ["finance", "quarterly", "2023"]
    },
    {
      id: 2,
      title: "Port Safety Guidelines 2022",
      type: "Operations Manual",
      department: "Operations",
      author: "Sarah Wilson",
      archivedDate: "2024-03-10",
      originalDate: "2022-06-15",
      retentionExpiry: "2027-06-15",
      archiveReason: "Superseded by new version",
      fileSize: "3.8 MB",
      status: "active",
      tags: ["safety", "guidelines", "operations"]
    },
    {
      id: 3,
      title: "Personnel Records - Department A",
      type: "Personnel Record",
      department: "Human Resources",
      author: "Mike Johnson",
      archivedDate: "2024-02-28",
      originalDate: "2021-12-31",
      retentionExpiry: "2026-12-31",
      archiveReason: "Employee termination",
      fileSize: "1.2 MB",
      status: "legal_hold",
      tags: ["personnel", "records", "hr"]
    },
    {
      id: 4,
      title: "Equipment Maintenance Log 2023",
      type: "Maintenance Record",
      department: "Technical",
      author: "David Lee",
      archivedDate: "2024-04-20",
      originalDate: "2023-12-31",
      retentionExpiry: "2028-12-31",
      archiveReason: "Annual archival",
      fileSize: "4.5 MB",
      status: "ready_for_destruction",
      tags: ["maintenance", "equipment", "2023"]
    }
  ];

  const filters = [
    { id: "all", label: "All Documents", count: archivedDocuments.length },
    { id: "active", label: "Active Archive", count: archivedDocuments.filter(d => d.status === "active").length },
    { id: "legal_hold", label: "Legal Hold", count: archivedDocuments.filter(d => d.status === "legal_hold").length },
    { id: "ready_for_destruction", label: "Ready for Destruction", count: archivedDocuments.filter(d => d.status === "ready_for_destruction").length }
  ];

  const filteredDocuments = filter === "all" 
    ? archivedDocuments 
    : archivedDocuments.filter(doc => doc.status === filter);

  const searchedDocuments = searchQuery
    ? filteredDocuments.filter(doc => 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.department.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredDocuments;

  const statusColors = {
    active: "bg-blue-100 text-blue-800",
    legal_hold: "bg-yellow-100 text-yellow-800",
    ready_for_destruction: "bg-red-100 text-red-800",
    destroyed: "bg-gray-100 text-gray-800"
  };

  const getExpiryStatus = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { status: "expired", color: "text-red-600", text: "Expired" };
    } else if (daysUntilExpiry < 30) {
      return { status: "expiring", color: "text-yellow-600", text: `${daysUntilExpiry} days left` };
    } else {
      return { status: "active", color: "text-green-600", text: `${Math.ceil(daysUntilExpiry / 365)} years left` };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Document Archive</h1>
          <p className="text-gray-600">Manage archived documents and retention policies</p>
        </div>
        <div className="flex space-x-3">
          <div className="flex items-center space-x-2 bg-white border rounded-lg p-1">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1 rounded text-sm font-medium ${
                viewMode === "list" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1 rounded text-sm font-medium ${
                viewMode === "grid" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Grid
            </button>
          </div>
        </div>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search archived documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Archive Stats */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Archive Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Archived</span>
              <span className="font-medium">{archivedDocuments.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Legal Hold</span>
              <span className="font-medium text-yellow-600">
                {archivedDocuments.filter(d => d.status === "legal_hold").length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ready for Destruction</span>
              <span className="font-medium text-red-600">
                {archivedDocuments.filter(d => d.status === "ready_for_destruction").length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-wrap gap-2">
          {filters.map((filterOption) => (
            <button
              key={filterOption.id}
              onClick={() => setFilter(filterOption.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === filterOption.id
                  ? "bg-blue-100 text-blue-700 border border-blue-200"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {filterOption.label}
              <span className="ml-2 bg-gray-200 text-gray-700 py-0.5 px-2 rounded-full text-xs">
                {filterOption.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Archived Documents ({searchedDocuments.length})
          </h2>
        </div>

        {viewMode === "list" ? (
          <div className="divide-y divide-gray-200">
            {searchedDocuments.map((document) => (
              <ArchiveListItem key={document.id} document={document} statusColors={statusColors} getExpiryStatus={getExpiryStatus} />
            ))}
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {searchedDocuments.map((document) => (
              <ArchiveCard key={document.id} document={document} statusColors={statusColors} getExpiryStatus={getExpiryStatus} />
            ))}
          </div>
        )}

        {searchedDocuments.length === 0 && (
          <div className="p-8 text-center">
            <Archive className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No archived documents</h3>
            <p className="mt-1 text-sm text-gray-500">
              No documents match your current filter criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ArchiveListItem({ document, statusColors, getExpiryStatus }: { document: Document; statusColors: Record<string, string>; getExpiryStatus: (date: string) => ExpiryStatus }) {
  const expiryInfo = getExpiryStatus(document.retentionExpiry);

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <Archive className="h-6 w-6 text-gray-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 mb-2">
              <Link 
                href={`/documents/${document.id}`}
                className="text-lg font-medium text-gray-900 hover:text-blue-600"
              >
                {document.title}
              </Link>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[document.status]}`}>
                {document.status.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
              <div className="flex items-center">
                <FileText className="w-4 h-4 mr-2 text-gray-400" />
                <span>{document.type}</span>
              </div>
              <div className="flex items-center">
                <Building className="w-4 h-4 mr-2 text-gray-400" />
                <span>{document.department}</span>
              </div>
              <div className="flex items-center">
                <User className="w-4 h-4 mr-2 text-gray-400" />
                <span>{document.author}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                <span>Archived: {new Date(document.archivedDate).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: '2-digit', 
                  day: '2-digit' 
                })}</span>
              </div>
            </div>

            <div className="text-sm text-gray-600 mb-3">
              <span className="font-medium">Archive Reason:</span> {document.archiveReason}
            </div>

            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2 text-gray-400" />
                <span className={expiryInfo.color}>{expiryInfo.text}</span>
              </div>
              {document.tags && document.tags.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <div className="flex space-x-1">
                    {document.tags.slice(0, 3).map((tag: string, index: number) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                        {tag}
                      </span>
                    ))}
                    {document.tags.length > 3 && (
                      <span className="text-xs text-gray-500">+{document.tags.length - 3} more</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          <Link 
            href={`/documents/${document.id}`}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <Eye className="w-5 h-5" />
          </Link>
          <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
            <Download className="w-5 h-5" />
          </button>
          {document.status === "ready_for_destruction" && (
            <button className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg">
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ArchiveCard({ document, statusColors, getExpiryStatus }: { document: Document; statusColors: Record<string, string>; getExpiryStatus: (date: string) => ExpiryStatus }) {
  const expiryInfo = getExpiryStatus(document.retentionExpiry);

  return (
    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-shrink-0 h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
          <Archive className="h-6 w-6 text-gray-600" />
        </div>
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[document.status]}`}>
          {document.status.replace('_', ' ')}
        </span>
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-2 line-clamp-2">
        <Link href={`/documents/${document.id}`} className="hover:text-blue-600">
          {document.title}
        </Link>
      </h3>

      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex items-center">
          <FileText className="w-4 h-4 mr-2 text-gray-400" />
          <span>{document.type}</span>
        </div>
        <div className="flex items-center">
          <Building className="w-4 h-4 mr-2 text-gray-400" />
          <span>{document.department}</span>
        </div>
        <div className="flex items-center">
          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
          <span>{new Date(document.archivedDate).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
          })}</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Retention Expiry</span>
          <span className={expiryInfo.color}>{expiryInfo.text}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <Link 
            href={`/documents/${document.id}`}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
            <Download className="w-4 h-4" />
          </button>
        </div>
        {document.status === "ready_for_destruction" && (
          <button className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
