"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Tag, 
  FileText,
  Download,
  Eye,
  ChevronDown,
  ChevronUp,
  Clock,
  Building
} from "lucide-react";

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState({
    documentType: "",
    department: "",
    status: "",
    dateFrom: "",
    dateTo: "",
    author: "",
    tags: ""
  });

  // Mock search results
  const mockResults = [
    {
      id: 1,
      title: "Q4 Financial Report 2024",
      content: "This report outlines the financial performance for Q4 2024...",
      type: "Financial Report",
      status: "approved",
      department: "Finance",
      author: "John Smith",
      createdDate: "2024-12-15",
      fileSize: "2.3 MB",
      tags: ["finance", "quarterly", "report"],
      relevance: 95,
      highlights: [
        "This <mark>report</mark> outlines the financial performance",
        "Q4 <mark>financial</mark> results show positive growth"
      ]
    },
    {
      id: 2,
      title: "Port Operations Manual Update",
      content: "Updated guidelines for port operations and safety procedures...",
      type: "Operations Manual",
      status: "pending_review",
      department: "Operations",
      author: "Sarah Wilson",
      createdDate: "2024-12-14",
      fileSize: "5.1 MB",
      tags: ["operations", "manual", "update"],
      relevance: 87,
      highlights: [
        "Updated <mark>guidelines</mark> for port operations",
        "Safety <mark>procedures</mark> have been revised"
      ]
    },
    {
      id: 3,
      title: "HR Policy Guidelines 2025",
      content: "New HR policies for the upcoming year including remote work...",
      type: "Policy Document",
      status: "draft",
      department: "Human Resources",
      author: "Mike Johnson",
      createdDate: "2024-12-13",
      fileSize: "1.8 MB",
      tags: ["hr", "policy", "guidelines"],
      relevance: 82,
      highlights: [
        "New <mark>HR</mark> policies for the upcoming year",
        "<mark>Remote</mark> work arrangements updated"
      ]
    }
  ];

  useEffect(() => {
    if (searchQuery.length > 2) {
      setIsLoading(true);
      // Simulate API call
      setTimeout(() => {
        setSearchResults(mockResults);
        setIsLoading(false);
      }, 500);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsLoading(true);
      // In real app, this would trigger API call
      setTimeout(() => {
        setSearchResults(mockResults);
        setIsLoading(false);
      }, 500);
    }
  };

  const statusColors = {
    approved: "bg-green-100 text-green-800",
    pending_review: "bg-yellow-100 text-yellow-800",
    in_review: "bg-blue-100 text-blue-800",
    draft: "bg-gray-100 text-gray-800"
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Document Search</h1>
        <p className="text-gray-600">Find documents across all departments and types</p>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents, content, metadata, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
            >
              <Filter className="w-4 h-4 mr-2 inline" />
              All Types
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              This Month
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              My Department
            </button>
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Advanced Filters
              {showAdvancedFilters ? (
                <ChevronUp className="w-4 h-4 ml-2 inline" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-2 inline" />
              )}
            </button>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Type
                </label>
                <select
                  value={filters.documentType}
                  onChange={(e) => setFilters({...filters, documentType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="report">Report</option>
                  <option value="policy">Policy</option>
                  <option value="contract">Contract</option>
                  <option value="memo">Memo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  value={filters.department}
                  onChange={(e) => setFilters({...filters, department: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Departments</option>
                  <option value="finance">Finance</option>
                  <option value="operations">Operations</option>
                  <option value="hr">Human Resources</option>
                  <option value="security">Security</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date From
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date To
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Search Results */}
      <div className="space-y-4">
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Searching...</p>
          </div>
        )}

        {!isLoading && searchQuery && searchResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Search Results ({searchResults.length})
              </h2>
              <p className="text-sm text-gray-600">
                Results for "{searchQuery}"
              </p>
            </div>
            <div className="divide-y divide-gray-200">
              {searchResults.map((result) => (
                <SearchResultCard key={result.id} result={result} statusColors={statusColors} />
              ))}
            </div>
          </div>
        )}

        {!isLoading && searchQuery && searchResults.length === 0 && (
          <div className="text-center py-12">
            <Search className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search terms or filters.
            </p>
          </div>
        )}

        {!searchQuery && (
          <div className="text-center py-12">
            <Search className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Start searching</h3>
            <p className="mt-1 text-sm text-gray-500">
              Enter keywords to search across all documents and content.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchResultCard({ result, statusColors }: { result: any; statusColors: Record<string, string> }) {
  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <Link 
                  href={`/documents/${result.id}`}
                  className="text-lg font-medium text-gray-900 hover:text-blue-600"
                >
                  {result.title}
                </Link>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[result.status]}`}>
                  {result.status.replace('_', ' ')}
                </span>
              </div>

              <div className="text-sm text-gray-600 mb-3">
                {result.highlights && result.highlights.length > 0 ? (
                  <div dangerouslySetInnerHTML={{ __html: result.highlights[0] }} />
                ) : (
                  result.content.substring(0, 200) + "..."
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                <div className="flex items-center">
                  <Building className="w-4 h-4 mr-2 text-gray-400" />
                  <span>{result.department}</span>
                </div>
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-2 text-gray-400" />
                  <span>{result.author}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  <span>{new Date(result.createdDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit' 
                  })}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-600 font-medium">{result.relevance}% relevant</span>
                </div>
              </div>

              {result.tags && result.tags.length > 0 && (
                <div className="flex items-center space-x-2 mb-3">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <div className="flex flex-wrap gap-1">
                    {result.tags.map((tag: string, index: number) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          <Link 
            href={`/documents/${result.id}`}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <Eye className="w-5 h-5" />
          </Link>
          <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
