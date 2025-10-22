"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Workflow, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  User, 
  Calendar,
  ArrowRight,
  Eye,
  Play,
  Pause,
  MoreVertical
} from "lucide-react";

export default function WorkflowsPage() {
  const [activeTab, setActiveTab] = useState("active");

  const tabs = [
    { id: "active", label: "Active Workflows", count: 12 },
    { id: "pending", label: "Pending My Approval", count: 5 },
    { id: "completed", label: "Completed", count: 48 },
    { id: "templates", label: "Templates", count: 8 }
  ];

  // Enhanced mock data with comprehensive workflow information
  const workflows = [
    {
      id: 1,
      title: "ICT Infrastructure Upgrade Workflow",
      documentTitle: "ICT Infrastructure Upgrade Proposal.pdf",
      status: "in_progress",
      currentStep: 2,
      totalSteps: 4,
      progress: 50,
      initiatedBy: "AGM, Software",
      initiatedDate: "2024-12-15",
      currentAssignee: "GM, ICT",
      dueDate: "2024-12-20",
      priority: "high",
      type: "technical_review",
      department: "Information & Communication Technology",
      estimatedTime: "2 days",
      actualTime: "1 day",
      participants: ["Managing Director", "GM, ICT", "AGM, Software"],
      lastActivity: "2024-12-16 14:30",
      comments: "Technical review of infrastructure specifications and vendor proposals in progress"
    },
    {
      id: 2,
      title: "HR Policy Update Workflow",
      documentTitle: "Remote Work Policy Guidelines 2025.docx",
      status: "pending_my_approval",
      currentStep: 1,
      totalSteps: 3,
      progress: 33,
      initiatedBy: "GM, Human Resources",
      initiatedDate: "2024-12-14",
      currentAssignee: "You",
      dueDate: "2024-12-18",
      priority: "medium",
      type: "policy_approval"
    },
    {
      id: 3,
      title: "Port Operations Manual Review",
      documentTitle: "Port Operations Manual Update.pdf",
      status: "completed",
      currentStep: 3,
      totalSteps: 3,
      progress: 100,
      initiatedBy: "Lisa Brown",
      initiatedDate: "2024-12-10",
      currentAssignee: "Completed",
      dueDate: "2024-12-16",
      priority: "high",
      type: "operations_review"
    },
    {
      id: 4,
      title: "Equipment Purchase Approval",
      documentTitle: "Equipment Purchase Request.xlsx",
      status: "in_progress",
      currentStep: 1,
      totalSteps: 5,
      progress: 20,
      initiatedBy: "David Lee",
      initiatedDate: "2024-12-13",
      currentAssignee: "Tom Wilson",
      dueDate: "2024-12-22",
      priority: "medium",
      type: "purchase_approval"
    }
  ];

  const workflowTemplates = [
    {
      id: 1,
      name: "Financial Report Approval",
      description: "Standard workflow for financial document approval",
      steps: 4,
      department: "Finance",
      usage: 25
    },
    {
      id: 2,
      name: "HR Policy Review",
      description: "Multi-level approval for HR policy changes",
      steps: 3,
      department: "Human Resources",
      usage: 18
    },
    {
      id: 3,
      name: "Operations Manual Update",
      description: "Technical review and approval process",
      steps: 3,
      department: "Operations",
      usage: 12
    }
  ];

  const statusColors = {
    in_progress: "bg-blue-100 text-blue-800",
    pending_my_approval: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    paused: "bg-gray-100 text-gray-800",
    rejected: "bg-red-100 text-red-800"
  };

  const priorityColors = {
    high: "bg-red-100 text-red-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-green-100 text-green-800"
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Workflows</h1>
          <p className="text-gray-600">Manage document approval workflows and templates</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/workflows/templates/new"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Workflow className="w-4 h-4 mr-2" />
            New Template
          </Link>
          <Link
            href="/workflows/start"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Workflow
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
              <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content based on active tab */}
      {activeTab === "active" && (
        <div className="space-y-6">
          {/* Active Workflows */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Active Workflows</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {workflows.filter(w => w.status === 'in_progress').map((workflow) => (
                <WorkflowCard key={workflow.id} workflow={workflow} />
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "pending" && (
        <div className="space-y-6">
          {/* Pending My Approval */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Pending My Approval</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {workflows.filter(w => w.status === 'pending_my_approval').map((workflow) => (
                <WorkflowCard key={workflow.id} workflow={workflow} showActions={true} />
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "completed" && (
        <div className="space-y-6">
          {/* Completed Workflows */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Completed Workflows</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {workflows.filter(w => w.status === 'completed').map((workflow) => (
                <WorkflowCard key={workflow.id} workflow={workflow} />
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "templates" && (
        <div className="space-y-6">
          {/* Workflow Templates */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {workflowTemplates.map((template) => (
              <div key={template.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
                    <p className="text-gray-600 mb-4">{template.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Workflow className="w-4 h-4 mr-1" />
                        {template.steps} steps
                      </span>
                      <span className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        {template.department}
                      </span>
                      <span>Used {template.usage} times</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link 
                      href={`/workflows/templates/${template.id}`}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Eye className="w-5 h-5" />
                    </Link>
                    <button className="text-gray-600 hover:text-gray-700">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WorkflowCard({ 
  workflow, 
  showActions = false 
}: { 
  workflow: any; 
  showActions?: boolean;
}) {
  const statusColors = {
    in_progress: "bg-blue-100 text-blue-800",
    pending_my_approval: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800"
  };

  const priorityColors = {
    high: "bg-red-100 text-red-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-green-100 text-green-800"
  };

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-3">
            <h3 className="text-lg font-medium text-gray-900">{workflow.title}</h3>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[workflow.status as keyof typeof statusColors]}`}>
              {workflow.status.replace('_', ' ')}
            </span>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${priorityColors[workflow.priority as keyof typeof priorityColors]}`}>
              {workflow.priority}
            </span>
          </div>

          <p className="text-gray-600 mb-4">{workflow.documentTitle}</p>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Step {workflow.currentStep} of {workflow.totalSteps}</span>
              <span>{workflow.progress}% complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${workflow.progress}%` }}
              ></div>
            </div>
          </div>

          {/* Workflow Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="flex items-center">
              <User className="w-4 h-4 mr-2 text-gray-400" />
              <span>Initiated by {workflow.initiatedBy}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
              <span>Started: {new Date(workflow.initiatedDate).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit' 
              })}</span>
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2 text-gray-400" />
              <span>Due: {new Date(workflow.dueDate).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit' 
              })}</span>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <span className="font-medium">Current assignee:</span> {workflow.currentAssignee}
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-6">
          {showActions && (
            <div className="flex space-x-2">
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                Approve
              </button>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">
                Reject
              </button>
            </div>
          )}
          <Link 
            href={`/workflows/${workflow.id}`}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <Eye className="w-5 h-5" />
          </Link>
          <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
