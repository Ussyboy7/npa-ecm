"use client";

import { useState } from "react";
import {
  FileText,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  Download,
  Upload,
  Settings,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
  Workflow
} from "lucide-react";
import Link from "next/link";

export default function WorkflowTemplatesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const templates = [
    {
      id: "TEMP-001",
      name: "Document Approval Template",
      description: "Standard template for document approval workflows",
      category: "Approval",
      status: "Active",
      version: "v2.1",
      createdDate: "2024-01-15",
      lastModified: "2024-12-01",
      createdBy: "System Admin",
      steps: 5,
      estimatedDuration: "3-5 days",
      usageCount: 1247,
      rating: 4.8,
      tags: ["Document", "Approval", "Standard"],
      preview: "Officer → Manager → AGM → GM → MD"
    },
    {
      id: "TEMP-002",
      name: "Leave Request Template",
      description: "Template for processing employee leave requests",
      category: "HR",
      status: "Active",
      version: "v1.8",
      createdDate: "2024-02-20",
      lastModified: "2024-11-15",
      createdBy: "HR Manager",
      steps: 4,
      estimatedDuration: "1-2 days",
      usageCount: 856,
      rating: 4.9,
      tags: ["HR", "Leave", "Employee"],
      preview: "Employee → Supervisor → HR Manager → Department Head"
    },
    {
      id: "TEMP-003",
      name: "Purchase Request Template",
      description: "Template for purchase request approval process",
      category: "Finance",
      status: "Active",
      version: "v1.5",
      createdDate: "2024-03-10",
      lastModified: "2024-10-20",
      createdBy: "Finance Manager",
      steps: 6,
      estimatedDuration: "5-7 days",
      usageCount: 423,
      rating: 4.6,
      tags: ["Finance", "Purchase", "Approval"],
      preview: "Requester → Department Head → Finance → AGM → GM"
    },
    {
      id: "TEMP-004",
      name: "Incident Report Template",
      description: "Template for safety incident reporting and investigation",
      category: "Safety",
      status: "Draft",
      version: "v0.9",
      createdDate: "2024-11-01",
      lastModified: "2024-12-10",
      createdBy: "Safety Manager",
      steps: 7,
      estimatedDuration: "7-10 days",
      usageCount: 89,
      rating: 4.7,
      tags: ["Safety", "Incident", "Investigation"],
      preview: "Reporter → Safety Officer → Department Head → Safety Manager → GM"
    },
    {
      id: "TEMP-005",
      name: "Contract Review Template",
      description: "Template for contract review and approval process",
      category: "Legal",
      status: "Inactive",
      version: "v1.2",
      createdDate: "2024-04-05",
      lastModified: "2024-09-15",
      createdBy: "Legal Manager",
      steps: 8,
      estimatedDuration: "10-15 days",
      usageCount: 156,
      rating: 4.5,
      tags: ["Legal", "Contract", "Review"],
      preview: "Contract Officer → Legal → Finance → AGM → GM → MD"
    }
  ];

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "approval", label: "Approval" },
    { value: "hr", label: "HR" },
    { value: "finance", label: "Finance" },
    { value: "safety", label: "Safety" },
    { value: "legal", label: "Legal" },
    { value: "operations", label: "Operations" }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "draft", label: "Draft" }
  ];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === "all" || template.category.toLowerCase() === categoryFilter;
    const matchesStatus = statusFilter === "all" || template.status.toLowerCase() === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const statusColorMap = {
    'Active': 'bg-green-100 text-green-800',
    'Inactive': 'bg-gray-100 text-gray-800',
    'Draft': 'bg-yellow-100 text-yellow-800'
  };

  const categoryColorMap = {
    'Approval': 'bg-blue-100 text-blue-800',
    'HR': 'bg-purple-100 text-purple-800',
    'Finance': 'bg-green-100 text-green-800',
    'Safety': 'bg-red-100 text-red-800',
    'Legal': 'bg-indigo-100 text-indigo-800',
    'Operations': 'bg-orange-100 text-orange-800'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Workflow Templates</h1>
          <p className="text-gray-600">Browse and manage workflow templates for common business processes</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/workflows/templates/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Upload className="w-4 h-4 mr-2" />
            Import Template
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Templates</p>
              <p className="text-2xl font-bold text-gray-900">25</p>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Templates</p>
              <p className="text-2xl font-bold text-gray-900">18</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Usage</p>
              <p className="text-2xl font-bold text-gray-900">2,771</p>
            </div>
            <Play className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Rating</p>
              <p className="text-2xl font-bold text-gray-900">4.7</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
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
                placeholder="Search templates by name, description, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
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
            <button className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTemplates.map((template) => (
          <div key={template.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Workflow className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${categoryColorMap[template.category as keyof typeof categoryColorMap]}`}>
                    {template.category}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[template.status as keyof typeof statusColorMap]}`}>
                    {template.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                <div className="text-sm text-gray-500 space-y-1">
                  <p><span className="font-medium">Version:</span> {template.version}</p>
                  <p><span className="font-medium">Created:</span> {template.createdDate} by {template.createdBy}</p>
                  <p><span className="font-medium">Last Modified:</span> {template.lastModified}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg">
                  <Copy className="w-4 h-4" />
                </button>
                <button className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Steps</p>
                  <p className="text-sm text-gray-600">{template.steps}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Duration</p>
                  <p className="text-sm text-gray-600">{template.estimatedDuration}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Usage</p>
                  <p className="text-sm text-gray-600">{template.usageCount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Rating</p>
                  <p className="text-sm text-gray-600">{template.rating}/5.0</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Workflow Preview:</p>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{template.preview}</p>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Tags:</p>
                <div className="flex flex-wrap gap-2">
                  {template.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                    <Play className="w-3 h-3 mr-1" />
                    Use Template
                  </button>
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    <Settings className="w-3 h-3 mr-1" />
                    Customize
                  </button>
                </div>
                <div className="flex space-x-2">
                  <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg">
                    <Download className="w-4 h-4" />
                  </button>
                  <Link
                    href={`/workflows/templates/${template.id}`}
                    className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Template Categories */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Template Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/workflows/templates?category=approval"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Approval</h3>
                <p className="text-xs text-gray-500">8 templates</p>
              </div>
            </div>
          </Link>
          <Link
            href="/workflows/templates?category=hr"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">HR</h3>
                <p className="text-xs text-gray-500">5 templates</p>
              </div>
            </div>
          </Link>
          <Link
            href="/workflows/templates?category=finance"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Finance</h3>
                <p className="text-xs text-gray-500">4 templates</p>
              </div>
            </div>
          </Link>
          <Link
            href="/workflows/templates?category=safety"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Safety</h3>
                <p className="text-xs text-gray-500">3 templates</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">1</span> to <span className="font-medium">5</span> of <span className="font-medium">25</span> results
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
