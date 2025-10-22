"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  Download,
  Eye,
  FileText,
  Mail,
  Calendar,
  User,
  Building,
  ArrowRight,
  RefreshCw,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";

export default function DocumentSearchPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [documentType, setDocumentType] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [status, setStatus] = useState("all");
  const [searchResults, setSearchResults] = useState([]);

  const documentTypes = [
    { value: "all", label: "All Document Types" },
    { value: "memo", label: "Memo" },
    { value: "letter", label: "Letter" },
    { value: "report", label: "Report" },
    { value: "circular", label: "Circular" },
    { value: "policy", label: "Policy" },
    { value: "proposal", label: "Proposal" },
    { value: "contract", label: "Contract" }
  ];

  const dateRanges = [
    { value: "all", label: "All Dates" },
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "this_week", label: "This Week" },
    { value: "this_month", label: "This Month" },
    { value: "last_month", label: "Last Month" },
    { value: "this_year", label: "This Year" }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "draft", label: "Draft" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "archived", label: "Archived" }
  ];

  const sampleResults = [
    {
      id: "DOC-2025-001",
      title: "Port Development Project Proposal",
      type: "Proposal",
      reference: "NPA/2025/PROP/001",
      author: "Planning Department",
      createdDate: "2025-01-15",
      status: "Approved",
      department: "Planning",
      tags: ["Development", "Infrastructure", "Project"],
      summary: "Comprehensive proposal for port development project including infrastructure upgrades and capacity expansion.",
      fileSize: "2.5 MB",
      version: "v2.1"
    },
    {
      id: "DOC-2025-002",
      title: "Safety Standards Compliance Report",
      type: "Report",
      reference: "NPA/2025/REP/002",
      author: "Safety Department",
      createdDate: "2025-01-14",
      status: "Pending",
      department: "Safety",
      tags: ["Safety", "Compliance", "Standards"],
      summary: "Quarterly safety standards compliance report covering all port operations and facilities.",
      fileSize: "1.8 MB",
      version: "v1.0"
    },
    {
      id: "DOC-2025-003",
      title: "Financial Performance Analysis",
      type: "Report",
      reference: "NPA/2025/REP/003",
      author: "Finance Department",
      createdDate: "2025-01-13",
      status: "Approved",
      department: "Finance",
      tags: ["Finance", "Performance", "Analysis"],
      summary: "Detailed financial performance analysis for Q4 2024 including revenue, expenses, and profitability metrics.",
      fileSize: "3.2 MB",
      version: "v1.2"
    },
    {
      id: "DOC-2025-004",
      title: "HR Policy Update Circular",
      type: "Circular",
      reference: "NPA/2025/CIR/004",
      author: "Human Resources",
      createdDate: "2025-01-12",
      status: "Approved",
      department: "Human Resources",
      tags: ["HR", "Policy", "Update"],
      summary: "Circular announcing updates to HR policies including leave management and performance evaluation procedures.",
      fileSize: "0.8 MB",
      version: "v1.0"
    },
    {
      id: "DOC-2025-005",
      title: "IT Security Guidelines",
      type: "Policy",
      reference: "NPA/2025/POL/005",
      author: "ICT Division",
      createdDate: "2025-01-11",
      status: "Draft",
      department: "ICT",
      tags: ["IT", "Security", "Guidelines"],
      summary: "Comprehensive IT security guidelines for all employees covering password policies, data protection, and system access.",
      fileSize: "1.5 MB",
      version: "v0.9"
    }
  ];

  const handleSearch = () => {
    // Simulate search functionality
    setSearchResults(sampleResults);
  };

  const typeColorMap = {
    'Proposal': 'bg-blue-100 text-blue-800',
    'Report': 'bg-green-100 text-green-800',
    'Circular': 'bg-yellow-100 text-yellow-800',
    'Policy': 'bg-purple-100 text-purple-800',
    'Letter': 'bg-gray-100 text-gray-800',
    'Memo': 'bg-indigo-100 text-indigo-800',
    'Contract': 'bg-red-100 text-red-800'
  };

  const statusColorMap = {
    'Draft': 'bg-gray-100 text-gray-800',
    'Pending': 'bg-yellow-100 text-yellow-800',
    'Approved': 'bg-green-100 text-green-800',
    'Rejected': 'bg-red-100 text-red-800',
    'Archived': 'bg-blue-100 text-blue-800'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Document Search</h1>
          <p className="text-gray-600">Search and retrieve documents from the NPA ECM system</p>
        </div>
        <div className="flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Export Results
          </button>
        </div>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search documents by title, content, author, or reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={handleSearch}
              className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {documentTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {dateRanges.map(range => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              <Filter className="w-4 h-4 mr-2" />
              Advanced Filters
            </button>
            <button className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              <RefreshCw className="w-4 h-4 mr-2" />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Search Results</h2>
              <span className="text-sm text-gray-500">{searchResults.length} documents found</span>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {searchResults.map((doc) => (
              <div key={doc.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{doc.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeColorMap[doc.type as keyof typeof typeColorMap]}`}>
                        {doc.type}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[doc.status as keyof typeof statusColorMap]}`}>
                        {doc.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1 mb-3">
                      <p><span className="font-medium">Reference:</span> {doc.reference}</p>
                      <p><span className="font-medium">Author:</span> {doc.author} | <span className="font-medium">Department:</span> {doc.department}</p>
                      <p><span className="font-medium">Created:</span> {doc.createdDate} | <span className="font-medium">Version:</span> {doc.version} | <span className="font-medium">Size:</span> {doc.fileSize}</p>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{doc.summary}</p>
                    <div className="flex flex-wrap gap-2">
                      {doc.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg">
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg">
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {searchResults.length === 0 && searchTerm && (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
          <p className="text-gray-600">Try adjusting your search criteria or use different keywords.</p>
        </div>
      )}

      {/* Search Tips */}
      {!searchTerm && (
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">Search Tips</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• Use specific keywords to narrow down your search results</li>
            <li>• Search by document title, author, department, or reference number</li>
            <li>• Use filters to refine results by document type, date range, or status</li>
            <li>• Try different combinations of search terms for better results</li>
          </ul>
        </div>
      )}
    </div>
  );
}
