"use client";

import { useState } from "react";
import { 
  CheckCircle, 
  Clock, 
  User, 
  ArrowRight,
  AlertTriangle,
  FileText,
  Calendar,
  Building,
  Mail,
  Phone
} from "lucide-react";
import { NPA_DEPARTMENTS, NPA_ROLES } from "@/lib/npa-structure";

export default function ApprovalWorkflowPage() {
  const [selectedWorkflow, setSelectedWorkflow] = useState("");

  // Enhanced NPA Approval Workflows with comprehensive data
  const workflows = [
    {
      id: "md-gm-ict-sadm",
      name: "MD → GM ICT → SA&DM",
      description: "Managing Director to GM ICT to Software Applications & Database Management",
      category: "Technical",
      priority: "high",
      status: "in_progress",
      createdDate: "2024-12-15",
      lastActivity: "2024-12-16 14:30",
      estimatedCompletion: "2024-12-20",
      steps: [
        {
          id: 1,
          role: "MD",
          title: "Managing Director",
          department: "Headquarters",
          status: "completed",
          completedBy: "Managing Director",
          completedAt: "2024-12-16 09:00",
          comments: "Initial review and approval for ICT infrastructure upgrade. Approved budget allocation of ₦50M for server upgrades and network infrastructure improvements.",
          estimatedTime: "1 hour",
          actualTime: "45 minutes"
        },
        {
          id: 2,
          role: "GM",
          title: "General Manager, ICT",
          department: "Information & Communication Technology",
          status: "in_progress",
          assignedTo: "GM, ICT",
          dueDate: "2024-12-18 17:00",
          priority: "high",
          estimatedTime: "3 hours",
          comments: "Technical review of infrastructure specifications and vendor proposals"
        },
        {
          id: 3,
          role: "AGM",
          title: "Assistant General Manager, Software",
          department: "Software Applications & Database Management",
          status: "pending",
          assignedTo: "AGM, Software",
          dueDate: "2024-12-20 17:00",
          priority: "medium",
          estimatedTime: "2 hours",
          comments: "Final implementation review and database migration planning"
        }
      ],
      document: {
        title: "ICT Infrastructure Upgrade Proposal",
        type: "Technical Document",
        department: "Information & Communication Technology",
        submittedBy: "AGM, Software",
        submittedDate: "2024-12-15",
        fileSize: "2.3 MB",
        version: "1.2",
        tags: ["ict", "infrastructure", "upgrade"],
        attachments: ["Technical Specs.pdf", "Vendor Quotes.xlsx", "ROI Analysis.docx"]
      }
    },
    {
      id: "md-gm-finance-audit",
      name: "MD → GM Finance → Audit",
      description: "Managing Director to GM Finance to Audit Department",
      steps: [
        {
          id: 1,
          role: "MD",
          title: "Managing Director",
          department: "Headquarters",
          status: "completed",
          completedBy: "Managing Director",
          completedAt: "2024-12-14 14:30",
          comments: "Approved budget allocation for Q1 2025"
        },
        {
          id: 2,
          role: "GM",
          title: "General Manager, Finance",
          department: "Finance",
          status: "in_progress",
          assignedTo: "GM, Finance",
          dueDate: "2024-12-17 17:00",
          priority: "high"
        },
        {
          id: 3,
          role: "GM",
          title: "General Manager, Audit",
          department: "Audit",
          status: "pending",
          assignedTo: "GM, Audit",
          dueDate: "2024-12-19 17:00",
          priority: "high"
        }
      ],
      document: {
        title: "Q1 2025 Budget Proposal",
        type: "Financial Report",
        department: "Finance",
        submittedBy: "GM, Finance",
        submittedDate: "2024-12-14",
        fileSize: "1.8 MB"
      }
    },
    {
      id: "md-gm-hr-legal",
      name: "MD → GM HR → Legal",
      description: "Managing Director to GM HR to Legal Services",
      steps: [
        {
          id: 1,
          role: "MD",
          title: "Managing Director",
          department: "Headquarters",
          status: "completed",
          completedBy: "Managing Director",
          completedAt: "2024-12-13 11:00",
          comments: "Approved new HR policy framework"
        },
        {
          id: 2,
          role: "GM",
          title: "General Manager, Human Resources",
          department: "Human Resources",
          status: "completed",
          completedBy: "GM, Human Resources",
          completedAt: "2024-12-15 16:00",
          comments: "HR policy review completed with recommendations"
        },
        {
          id: 3,
          role: "AGM",
          title: "Assistant General Manager, Legal",
          department: "Legal Services",
          status: "in_progress",
          assignedTo: "AGM, Legal",
          dueDate: "2024-12-18 17:00",
          priority: "medium"
        }
      ],
      document: {
        title: "Remote Work Policy Guidelines 2025",
        type: "Policy Document",
        department: "Human Resources",
        submittedBy: "GM, Human Resources",
        submittedDate: "2024-12-13",
        fileSize: "1.2 MB"
      }
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "pending":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "overdue":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "in_progress":
        return <Clock className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "overdue":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const selectedWorkflowData = workflows.find(w => w.id === selectedWorkflow);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Approval Workflows</h1>
          <p className="text-gray-600">Track document approval processes across NPA hierarchy</p>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            Export Report
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Create Workflow
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Workflows</h2>
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  onClick={() => setSelectedWorkflow(workflow.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedWorkflow === workflow.id
                      ? "border-blue-300 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <h3 className="font-medium text-gray-900 mb-1">{workflow.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{workflow.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{workflow.steps.length} steps</span>
                    <span>{workflow.document.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Workflow Details */}
        <div className="lg:col-span-2">
          {selectedWorkflowData ? (
            <div className="space-y-6">
              {/* Document Info */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">{selectedWorkflowData.document.title}</p>
                      <p className="text-sm text-gray-600">{selectedWorkflowData.document.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Building className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{selectedWorkflowData.document.department}</p>
                      <p className="text-sm text-gray-600">Submitted by {selectedWorkflowData.document.submittedBy}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{selectedWorkflowData.document.submittedDate}</p>
                      <p className="text-sm text-gray-600">{selectedWorkflowData.document.fileSize}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Approval Steps */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Approval Steps</h2>
                <div className="space-y-4">
                  {selectedWorkflowData.steps.map((step, index) => (
                    <div key={step.id} className="relative">
                      <div className={`flex items-center p-4 border rounded-lg ${getStatusColor(step.status)}`}>
                        <div className="flex-shrink-0 mr-4">
                          {getStatusIcon(step.status)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-gray-900">{step.title}</h3>
                              <p className="text-sm text-gray-600">{step.department}</p>
                            </div>
                            <div className="text-right">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(step.status)}`}>
                                {step.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                          </div>
                          
                          {step.status === "completed" && (
                            <div className="mt-2 text-sm text-gray-600">
                              <p>Completed by: {step.completedBy}</p>
                              <p>Completed at: {step.completedAt}</p>
                              {step.comments && (
                                <p className="mt-1 italic">"{step.comments}"</p>
                              )}
                            </div>
                          )}
                          
                          {step.status === "in_progress" && (
                            <div className="mt-2 text-sm text-gray-600">
                              <p>Assigned to: {step.assignedTo}</p>
                              <p>Due: {step.dueDate}</p>
                              <p>Priority: <span className="font-medium">{step.priority}</span></p>
                            </div>
                          )}
                          
                          {step.status === "pending" && (
                            <div className="mt-2 text-sm text-gray-600">
                              <p>Assigned to: {step.assignedTo}</p>
                              <p>Due: {step.dueDate}</p>
                              <p>Priority: <span className="font-medium">{step.priority}</span></p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Arrow between steps */}
                      {index < selectedWorkflowData.steps.length - 1 && (
                        <div className="flex justify-center my-2">
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
                <div className="flex space-x-3">
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    Approve Document
                  </button>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    Reject Document
                  </button>
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                    Add Comments
                  </button>
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                    View Document
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Select a workflow</h3>
              <p className="mt-1 text-sm text-gray-500">
                Choose a workflow from the list to view its details and approval steps.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
