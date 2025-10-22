"use client";

import { useState } from "react";
import {
  Workflow,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Settings,
  Eye,
  Copy,
  BarChart3,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  FileText,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

export default function WorkflowsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const workflows = [
    {
      id: "WF-001",
      name: "Document Approval Workflow",
      type: "Approval",
      description: "Standard workflow for document approval process",
      status: "Active",
      version: "v2.1",
      createdDate: "2024-01-15",
      lastModified: "2024-12-01",
      createdBy: "System Admin",
      steps: 5,
      averageDuration: "3.2 days",
      totalExecutions: 1247,
      successRate: "94.5%",
      assignedRoles: ["Officer", "Manager", "AGM", "GM", "MD"],
      triggers: ["Document Created", "Memo Submitted"],
      conditions: [
        "Document type = Official",
        "Priority = High or Medium",
        "Department = All"
      ]
    },
    {
      id: "WF-002",
      name: "Leave Request Workflow",
      type: "HR",
      description: "Workflow for processing employee leave requests",
      status: "Active",
      version: "v1.8",
      createdDate: "2024-02-20",
      lastModified: "2024-11-15",
      createdBy: "HR Manager",
      steps: 4,
      averageDuration: "1.5 days",
      totalExecutions: 856,
      successRate: "98.2%",
      assignedRoles: ["Employee", "Supervisor", "HR Manager", "Department Head"],
      triggers: ["Leave Request Submitted"],
      conditions: [
        "Leave type = Annual or Sick",
        "Duration > 3 days",
        "Employee status = Active"
      ]
    },
    {
      id: "WF-003",
      name: "Purchase Request Workflow",
      type: "Finance",
      description: "Workflow for processing purchase requests and approvals",
      status: "Active",
      version: "v1.5",
      createdDate: "2024-03-10",
      lastModified: "2024-10-20",
      createdBy: "Finance Manager",
      steps: 6,
      averageDuration: "5.8 days",
      totalExecutions: 423,
      successRate: "89.1%",
      assignedRoles: ["Requester", "Department Head", "Finance Officer", "AGM", "GM"],
      triggers: ["Purchase Request Created"],
      conditions: [
        "Amount > ₦100,000",
        "Category = Equipment or Services",
        "Budget available = Yes"
      ]
    },
    {
      id: "WF-004",
      name: "Incident Report Workflow",
      type: "Safety",
      description: "Workflow for reporting and investigating safety incidents",
      status: "Draft",
      version: "v0.9",
      createdDate: "2024-11-01",
      lastModified: "2024-12-10",
      createdBy: "Safety Manager",
      steps: 7,
      averageDuration: "7.2 days",
      totalExecutions: 89,
      successRate: "96.6%",
      assignedRoles: ["Reporter", "Safety Officer", "Department Head", "Safety Manager", "GM"],
      triggers: ["Incident Reported"],
      conditions: [
        "Severity = Medium or High",
        "Location = Port Area",
        "Injury involved = Yes or No"
      ]
    },
    {
      id: "WF-005",
      name: "Contract Approval Workflow",
      type: "Legal",
      description: "Workflow for contract review and approval process",
      status: "Inactive",
      version: "v1.2",
      createdDate: "2024-04-05",
      lastModified: "2024-09-15",
      createdBy: "Legal Manager",
      steps: 8,
      averageDuration: "12.5 days",
      totalExecutions: 156,
      successRate: "87.8%",
      assignedRoles: ["Contract Officer", "Legal Officer", "Finance Manager", "AGM", "GM", "MD"],
      triggers: ["Contract Created"],
      conditions: [
        "Contract value > ₦1M",
        "Contract type = Service or Supply",
        "Legal review required = Yes"
      ]
    }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "draft", label: "Draft" },
    { value: "suspended", label: "Suspended" }
  ];

  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: "approval", label: "Approval" },
    { value: "hr", label: "HR" },
    { value: "finance", label: "Finance" },
    { value: "safety", label: "Safety" },
    { value: "legal", label: "Legal" }
  ];

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || workflow.status.toLowerCase() === statusFilter;
    const matchesType = typeFilter === "all" || workflow.type.toLowerCase() === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const statusColorMap = {
    'Active': 'bg-green-100 text-green-800',
    'Inactive': 'bg-gray-100 text-gray-800',
    'Draft': 'bg-yellow-100 text-yellow-800',
    'Suspended': 'bg-red-100 text-red-800'
  };

  const typeColorMap = {
    'Approval': 'bg-blue-100 text-blue-800',
    'HR': 'bg-purple-100 text-purple-800',
    'Finance': 'bg-green-100 text-green-800',
    'Safety': 'bg-red-100 text-red-800',
    'Legal': 'bg-indigo-100 text-indigo-800'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Workflow Management</h1>
          <p className="text-gray-600">Configure and manage business process workflows</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/admin/workflows/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Workflow
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <BarChart3 className="w-4 h-4 mr-2" />
            Workflow Analytics
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Workflows</p>
              <p className="text-2xl font-bold text-gray-900">15</p>
            </div>
            <Workflow className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Workflows</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Executions</p>
              <p className="text-2xl font-bold text-gray-900">2,771</p>
            </div>
            <Play className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">93.2%</p>
            </div>
            <BarChart3 className="h-8 w-8 text-yellow-600" />
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
                placeholder="Search workflows by name, description, or type..."
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
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {typeOptions.map(option => (
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

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredWorkflows.map((workflow) => (
          <div key={workflow.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Workflow className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{workflow.name}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeColorMap[workflow.type as keyof typeof typeColorMap]}`}>
                    {workflow.type}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[workflow.status as keyof typeof statusColorMap]}`}>
                    {workflow.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{workflow.description}</p>
                <div className="text-sm text-gray-500 space-y-1">
                  <p><span className="font-medium">Version:</span> {workflow.version}</p>
                  <p><span className="font-medium">Created:</span> {workflow.createdDate} by {workflow.createdBy}</p>
                  <p><span className="font-medium">Last Modified:</span> {workflow.lastModified}</p>
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
                  <p className="text-sm text-gray-600">{workflow.steps}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Avg Duration</p>
                  <p className="text-sm text-gray-600">{workflow.averageDuration}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Executions</p>
                  <p className="text-sm text-gray-600">{workflow.totalExecutions.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Success Rate</p>
                  <p className="text-sm text-gray-600">{workflow.successRate}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Assigned Roles:</p>
                <div className="flex flex-wrap gap-2">
                  {workflow.assignedRoles.map((role, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                      {role}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Triggers:</p>
                <div className="flex flex-wrap gap-2">
                  {workflow.triggers.map((trigger, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                      {trigger}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                    <Play className="w-3 h-3 mr-1" />
                    Execute
                  </button>
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    <Settings className="w-3 h-3 mr-1" />
                    Configure
                  </button>
                </div>
                <Link
                  href={`/admin/workflows/${workflow.id}`}
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Workflow Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Workflow Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/admin/workflows/create"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Create Workflow</h3>
            <p className="text-xs text-gray-500">Design new workflow</p>
          </Link>
          <Link
            href="/admin/workflows/templates"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Workflow Templates</h3>
            <p className="text-xs text-gray-500">Browse templates</p>
          </Link>
          <Link
            href="/admin/workflows/executions"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Play className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Execution History</h3>
            <p className="text-xs text-gray-500">View executions</p>
          </Link>
          <Link
            href="/admin/workflows/analytics"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Analytics</h3>
            <p className="text-xs text-gray-500">Performance metrics</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
