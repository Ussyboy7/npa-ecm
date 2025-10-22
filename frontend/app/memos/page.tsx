"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Eye,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  Calendar,
  User,
  Building
} from "lucide-react";
import { NPA_DEPARTMENTS, NPA_DOCUMENT_TYPES } from "@/lib/npa-structure";
import AdvancedSearch, { SearchFilter, SortOption } from "@/components/search/AdvancedSearch";
import Pagination from "@/components/search/Pagination";
import { LoadingWrapper } from "@/components/ui/LoadingWrapper";
import { MobileTable } from "@/components/ui/MobileTable";

export default function MemosPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filteredMemos, setFilteredMemos] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Search filters configuration
  const searchFilters: SearchFilter[] = [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "all", label: "All Statuses" },
        { value: "draft", label: "Draft" },
        { value: "pending", label: "Pending" },
        { value: "in_review", label: "In Review" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" }
      ]
    },
    {
      key: "department",
      label: "Department",
      type: "select",
      options: [
        { value: "all", label: "All Departments" },
        ...Object.keys(NPA_DEPARTMENTS).map(key => ({
          value: key,
          label: key
        }))
      ]
    },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: [
        { value: "all", label: "All Priorities" },
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
        { value: "urgent", label: "Urgent" }
      ]
    },
    {
      key: "dateFrom",
      label: "Date From",
      type: "date"
    },
    {
      key: "dateTo",
      label: "Date To",
      type: "date"
    }
  ];

  const sortOptions: SortOption[] = [
    { key: "createdDate", label: "Date Created" },
    { key: "lastUpdated", label: "Last Updated" },
    { key: "title", label: "Title" },
    { key: "priority", label: "Priority" },
    { key: "status", label: "Status" }
  ];

  // Mock memos data
  const memos = [
    {
      id: "MEMO-2024-001",
      title: "Request for Additional Budget Allocation",
      type: "Budget Request",
      department: "Finance & Accounts",
      status: "approved",
      priority: "high",
      createdDate: "2024-10-15",
      createdBy: "John Adebayo",
      approver: "MD",
      attachments: 2,
      lastUpdated: "2024-10-18"
    },
    {
      id: "MEMO-2024-002",
      title: "Staff Training Program Proposal",
      type: "Training Proposal",
      department: "Human Resources",
      status: "pending",
      priority: "medium",
      createdDate: "2024-10-12",
      createdBy: "Sarah Okafor",
      approver: "GM Operations",
      attachments: 1,
      lastUpdated: "2024-10-16"
    },
    {
      id: "MEMO-2024-003",
      title: "Equipment Maintenance Schedule",
      type: "Maintenance Report",
      department: "Technical Services",
      status: "draft",
      priority: "low",
      createdDate: "2024-10-10",
      createdBy: "Michael Johnson",
      approver: "AGM Technical",
      attachments: 0,
      lastUpdated: "2024-10-10"
    },
    {
      id: "MEMO-2024-004",
      title: "Security Protocol Update",
      type: "Policy Update",
      department: "Security",
      status: "rejected",
      priority: "high",
      createdDate: "2024-10-08",
      createdBy: "David Wilson",
      approver: "GM Security",
      attachments: 3,
      lastUpdated: "2024-10-14"
    },
    {
      id: "MEMO-2024-005",
      title: "Port Infrastructure Development",
      type: "Development Plan",
      department: "Planning & Development",
      status: "in_review",
      priority: "high",
      createdDate: "2024-10-05",
      createdBy: "Grace Nwosu",
      approver: "MD",
      attachments: 5,
      lastUpdated: "2024-10-17"
    }
  ];

  // Search handler
  const handleSearch = async (query: string, filters: Record<string, any>, sort: SortOption | null) => {
    setIsLoading(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    let results = memos.filter(memo => {
      // Text search
      const matchesQuery = !query ||
        memo.title.toLowerCase().includes(query.toLowerCase()) ||
        memo.id.toLowerCase().includes(query.toLowerCase()) ||
        memo.type.toLowerCase().includes(query.toLowerCase()) ||
        memo.createdBy.toLowerCase().includes(query.toLowerCase());

      // Filters
      const matchesStatus = !filters.status || filters.status === "all" || memo.status === filters.status;
      const matchesDepartment = !filters.department || filters.department === "all" || memo.department === filters.department;
      const matchesPriority = !filters.priority || filters.priority === "all" || memo.priority === filters.priority;

      // Date filters
      const matchesDateFrom = !filters.dateFrom || new Date(memo.createdDate) >= new Date(filters.dateFrom);
      const matchesDateTo = !filters.dateTo || new Date(memo.createdDate) <= new Date(filters.dateTo);

      return matchesQuery && matchesStatus && matchesDepartment && matchesPriority && matchesDateFrom && matchesDateTo;
    });

    // Sorting
    if (sort) {
      results.sort((a, b) => {
        const aValue = a[sort.key as keyof typeof a];
        const bValue = b[sort.key as keyof typeof b];

        if (aValue < bValue) return sort.direction === "desc" ? 1 : -1;
        if (aValue > bValue) return sort.direction === "desc" ? -1 : 1;
        return 0;
      });
    }

    setTotalItems(results.length);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setFilteredMemos(results.slice(startIndex, endIndex));
    setIsLoading(false);
  };

  // Handle page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Initialize data
  useEffect(() => {
    handleSearch("", {}, null);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "draft":
        return <FileText className="w-4 h-4 text-gray-600" />;
      case "in_review":
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
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
      case "draft":
        return "bg-gray-100 text-gray-800";
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
          <h1 className="text-3xl font-bold text-gray-900">My Memos</h1>
          <p className="text-gray-600">View and manage your internal memos</p>
        </div>
        <Link
          href="/memos/create"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Memo
        </Link>
      </div>

      {/* Advanced Search */}
      <AdvancedSearch
        placeholder="Search memos by title, ID, type, or creator..."
        filters={searchFilters}
        sortOptions={sortOptions}
        onSearch={handleSearch}
        onExport={() => console.log("Export memos")}
        searchHistory={["budget", "training", "approval"]}
        savedSearches={[
          {
            name: "Pending Approvals",
            query: "",
            filters: { status: "pending" }
          },
          {
            name: "Finance Department",
            query: "",
            filters: { department: "Finance & Accounts" }
          }
        ]}
      />

      {/* Memos List */}
      <LoadingWrapper isLoading={isLoading} skeleton="memos">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Memos ({totalItems})
            </h2>
          </div>

          <MobileTable
            data={filteredMemos}
            keyField="id"
            columns={[
              {
                key: "title",
                label: "Title",
                render: (value, item) => (
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(item.status)}
                    <div>
                      <div className="font-medium text-gray-900">{value}</div>
                      <div className="text-sm text-gray-500">{item.id}</div>
                    </div>
                  </div>
                )
              },
              {
                key: "status",
                label: "Status",
                render: (value) => (
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(value)}`}>
                    {value.replace("_", " ").toUpperCase()}
                  </span>
                )
              },
              {
                key: "priority",
                label: "Priority",
                render: (value) => (
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(value)}`}>
                    {value.toUpperCase()}
                  </span>
                )
              },
              {
                key: "department",
                label: "Department",
                render: (value) => (
                  <div className="flex items-center">
                    <Building className="w-4 h-4 mr-1 text-gray-400" />
                    <span className="text-sm">{value}</span>
                  </div>
                )
              },
              {
                key: "createdBy",
                label: "Created By",
                render: (value) => (
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-1 text-gray-400" />
                    <span className="text-sm">{value}</span>
                  </div>
                )
              },
              {
                key: "actions",
                label: "Actions",
                render: (value, item) => (
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                )
              }
            ]}
          />

          {filteredMemos.length === 0 && (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No memos found</h3>
              <p className="text-gray-600 mb-4">
                {totalItems === 0
                  ? "You haven't created any memos yet"
                  : "No memos match your current search criteria. Try adjusting your filters."}
              </p>
              <Link
                href="/memos/create"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Memo
              </Link>
            </div>
          )}
        </div>
      </LoadingWrapper>

      {/* Pagination */}
      {totalItems > itemsPerPage && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / itemsPerPage)}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
