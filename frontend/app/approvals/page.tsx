"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Calendar,
  Eye,
  MessageSquare,
  ArrowRight,
  AlertTriangle,
  FileText,
  X
} from "lucide-react";
import { NPA_DEPARTMENTS, NPA_DOCUMENT_TYPES } from "@/lib/npa-structure";

export default function ApprovalsPage() {
  const [selectedApprovals, setSelectedApprovals] = useState<number[]>([]);
  const [filter, setFilter] = useState("all");
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [currentApproval, setCurrentApproval] = useState<any>(null);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [approvalComments, setApprovalComments] = useState("");

  // Enhanced mock data with real NPA departments and comprehensive approval workflows
  const approvals = [
    {
      id: 1,
      documentTitle: "Q4 Financial Report 2024.pdf",
      documentType: "Financial Report",
      requester: "GM, Finance",
      department: "Finance",
      submittedDate: "2024-12-15",
      dueDate: "2024-12-18",
      priority: "high",
      status: "pending",
      currentStep: "Executive Director Review",
      comments: "Please review the financial projections for Q4. This report includes revenue analysis, expenditure breakdown, and budget variance analysis.",
      workflowStep: 2,
      totalSteps: 4,
      fileSize: "2.3 MB",
      version: "1.0",
      tags: ["finance", "quarterly", "report"],
      approverRole: "ED",
      approverName: "Executive Director",
      estimatedTime: "2 hours",
      attachments: ["Supporting Data.xlsx", "Charts.pdf"]
    },
    {
      id: 2,
      documentTitle: "HR Policy Guidelines 2025.docx",
      documentType: "Policy Document",
      requester: "GM, Human Resources",
      department: "Human Resources",
      submittedDate: "2024-12-14",
      dueDate: "2024-12-20",
      priority: "medium",
      status: "pending",
      currentStep: "Legal Services Review",
      comments: "Updated policies for remote work arrangements, including new guidelines for hybrid work models and employee wellness programs.",
      workflowStep: 1,
      totalSteps: 3,
      fileSize: "1.8 MB",
      version: "2.1",
      tags: ["hr", "policy", "guidelines"],
      approverRole: "AGM",
      approverName: "AGM, Legal",
      estimatedTime: "1.5 hours",
      attachments: ["Legal Review Notes.pdf"]
    },
    {
      id: 3,
      documentTitle: "ICT Infrastructure Upgrade Request.xlsx",
      documentType: "Purchase Request",
      requester: "AGM, Software",
      department: "Information & Communication Technology",
      submittedDate: "2024-12-13",
      dueDate: "2024-12-15",
      priority: "high",
      status: "overdue",
      currentStep: "Budget Approval",
      comments: "Urgent requirement for server infrastructure upgrade to support increased data processing demands. Includes cost-benefit analysis and technical specifications.",
      workflowStep: 1,
      totalSteps: 5,
      fileSize: "3.2 MB",
      version: "1.3",
      tags: ["ict", "infrastructure", "purchase"],
      approverRole: "GM",
      approverName: "GM, Finance",
      estimatedTime: "3 hours",
      attachments: ["Technical Specs.pdf", "Vendor Quotes.xlsx", "ROI Analysis.docx"]
    },
    {
      id: 4,
      documentTitle: "Security Incident Report - Dec 12.pdf",
      documentType: "Incident Report",
      requester: "GM, Security",
      department: "Security",
      submittedDate: "2024-12-12",
      dueDate: "2024-12-16",
      priority: "medium",
      status: "pending",
      currentStep: "Management Review",
      comments: "Security breach investigation report detailing unauthorized access attempt, response actions taken, and recommendations for prevention.",
      workflowStep: 2,
      totalSteps: 3,
      fileSize: "890 KB",
      version: "1.0",
      tags: ["security", "incident", "report"],
      approverRole: "MD",
      approverName: "Managing Director",
      estimatedTime: "1 hour",
      attachments: ["Security Logs.txt", "Response Timeline.pdf"]
    },
    {
      id: 5,
      documentTitle: "Marine Operations Manual Update.pdf",
      documentType: "Operational Document",
      requester: "AGM, Marine Operations",
      department: "Marine & Operations",
      submittedDate: "2024-12-11",
      dueDate: "2024-12-19",
      priority: "medium",
      status: "pending",
      currentStep: "Technical Review",
      comments: "Updated marine operations procedures including new safety protocols, vessel management guidelines, and port operations standards.",
      workflowStep: 1,
      totalSteps: 4,
      fileSize: "4.1 MB",
      version: "3.0",
      tags: ["marine", "operations", "manual"],
      approverRole: "GM",
      approverName: "GM, Marine & Operations",
      estimatedTime: "2.5 hours",
      attachments: ["Safety Guidelines.pdf", "Vessel Procedures.docx"]
    },
    {
      id: 6,
      documentTitle: "Port Expansion Feasibility Study.pdf",
      documentType: "Technical Document",
      requester: "GM, Engineering",
      department: "Engineering & Technical Services",
      submittedDate: "2024-12-10",
      dueDate: "2024-12-22",
      priority: "high",
      status: "pending",
      currentStep: "Executive Review",
      comments: "Comprehensive feasibility study for port expansion project including environmental impact assessment, cost analysis, and timeline projections.",
      workflowStep: 2,
      totalSteps: 6,
      fileSize: "5.7 MB",
      version: "1.0",
      tags: ["engineering", "expansion", "feasibility"],
      approverRole: "ED",
      approverName: "Executive Director",
      estimatedTime: "4 hours",
      attachments: ["Environmental Report.pdf", "Cost Analysis.xlsx", "Timeline Gantt.pdf"]
    }
  ];

  const filters = [
    { id: "all", label: "All Approvals", count: approvals.length },
    { id: "pending", label: "Pending", count: approvals.filter(a => a.status === "pending").length },
    { id: "overdue", label: "Overdue", count: approvals.filter(a => a.status === "overdue").length },
    { id: "high", label: "High Priority", count: approvals.filter(a => a.priority === "high").length }
  ];

  const filteredApprovals = filter === "all" 
    ? approvals 
    : approvals.filter(a => a.status === filter || a.priority === filter);

  const priorityColors = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    low: "bg-green-100 text-green-800 border-green-200"
  };

  const statusColors = {
    pending: "bg-blue-100 text-blue-800",
    overdue: "bg-red-100 text-red-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-gray-100 text-gray-800"
  };

  const handleSelectAll = () => {
    if (selectedApprovals.length === filteredApprovals.length) {
      setSelectedApprovals([]);
    } else {
      setSelectedApprovals(filteredApprovals.map(a => a.id));
    }
  };

  const handleSelectApproval = (id: number) => {
    setSelectedApprovals(prev => 
      prev.includes(id) 
        ? prev.filter(approvalId => approvalId !== id)
        : [...prev, id]
    );
  };

  const handleBatchAction = (action: string) => {
    console.log(`Batch ${action} for approvals:`, selectedApprovals);
    alert(`${action === "approve" ? "Approved" : "Rejected"} ${selectedApprovals.length} document(s) successfully!`);
    setSelectedApprovals([]);
  };

  const handleSingleAction = (approval: any, action: "approve" | "reject") => {
    setCurrentApproval(approval);
    setApprovalAction(action);
    setApprovalComments("");
    setShowApprovalDialog(true);
  };

  const handleConfirmAction = () => {
    alert(`Document "${currentApproval?.documentTitle}" ${approvalAction === "approve" ? "approved" : "rejected"} successfully!`);
    setShowApprovalDialog(false);
    setCurrentApproval(null);
    setApprovalComments("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Approvals</h1>
          <p className="text-gray-600">Review and approve documents in your workflow queue</p>
        </div>
        <div className="flex space-x-3">
          {selectedApprovals.length > 0 && (
            <>
              <button
                onClick={() => handleBatchAction("approve")}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve Selected ({selectedApprovals.length})
              </button>
              <button
                onClick={() => handleBatchAction("reject")}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject Selected
              </button>
            </>
          )}
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

      {/* Approvals List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <input
                type="checkbox"
                checked={selectedApprovals.length === filteredApprovals.length && filteredApprovals.length > 0}
                onChange={handleSelectAll}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <h2 className="text-lg font-semibold text-gray-900">
                Documents Awaiting Your Approval
              </h2>
            </div>
            <div className="text-sm text-gray-500">
              {filteredApprovals.length} item(s) to review
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredApprovals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              isSelected={selectedApprovals.includes(approval.id)}
              onSelect={() => handleSelectApproval(approval.id)}
              onAction={handleSingleAction}
              priorityColors={priorityColors}
              statusColors={statusColors}
            />
          ))}
        </div>

        {filteredApprovals.length === 0 && (
          <div className="p-8 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No approvals</h3>
            <p className="mt-1 text-sm text-gray-500">
              No documents are currently awaiting your approval.
            </p>
          </div>
        )}
      </div>

      {/* Approval Dialog */}
      {showApprovalDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {approvalAction === "approve" ? "Approve Document" : "Reject Document"}
              </h3>
              <button
                onClick={() => setShowApprovalDialog(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Document:</p>
                <p className="text-sm text-gray-900">{currentApproval?.documentTitle}</p>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  {approvalAction === "approve" ? "Approval" : "Rejection"} Comments 
                  {approvalAction === "reject" && <span className="text-red-600">*</span>}
                </p>
                <textarea
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`Add your ${approvalAction === "approve" ? "approval" : "rejection"} comments...`}
                  required={approvalAction === "reject"}
                />
              </div>

              {approvalAction === "reject" && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    Please provide a reason for rejection.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowApprovalDialog(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={approvalAction === "reject" && !approvalComments.trim()}
                className={`px-4 py-2 rounded-lg text-white transition-colors ${
                  approvalAction === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {approvalAction === "approve" ? "Confirm Approval" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ApprovalCard({ 
  approval, 
  isSelected, 
  onSelect,
  onAction, 
  priorityColors, 
  statusColors 
}: {
  approval: any;
  isSelected: boolean;
  onSelect: () => void;
  onAction: (approval: any, action: "approve" | "reject") => void;
  priorityColors: Record<string, string>;
  statusColors: Record<string, string>;
}) {
  const isOverdue = new Date(approval.dueDate) < new Date() && approval.status === "pending";

  return (
    <div className={`p-6 hover:bg-gray-50 transition-colors ${isSelected ? "bg-blue-50" : ""}`}>
      <div className="flex items-start space-x-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />

        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <Link 
                  href={`/documents/${approval.id}`}
                  className="text-lg font-medium text-gray-900 hover:text-blue-600"
                >
                  {approval.documentTitle}
                </Link>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${priorityColors[approval.priority]}`}>
                  {approval.priority}
                </span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[approval.status]}`}>
                  {approval.status}
                </span>
                {isOverdue && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Overdue
                  </span>
                )}
              </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{approval.documentType}</span>
                    </div>
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2 text-gray-400" />
                      <span>Requested by {approval.requester}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2">Department:</span>
                      <span>{approval.department}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      <span>Due: {new Date(approval.dueDate).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit' 
                      })}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2">File Size:</span>
                      <span>{approval.fileSize}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2">Version:</span>
                      <span>{approval.version}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2">Approver:</span>
                      <span>{approval.approverName}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2">Est. Time:</span>
                      <span>{approval.estimatedTime}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {approval.tags.map((tag: string) => (
                      <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Attachments */}
                  {approval.attachments && approval.attachments.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Attachments:</p>
                      <div className="flex flex-wrap gap-2">
                        {approval.attachments.map((attachment: string, index: number) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded border">
                            {attachment}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

              {approval.comments && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="flex items-start space-x-2">
                    <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Comments:</p>
                      <p className="text-sm text-gray-600">{approval.comments}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Current Step: {approval.currentStep}</span>
                  <span>Step {approval.workflowStep} of {approval.totalSteps}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(approval.workflowStep / approval.totalSteps) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 ml-4">
              <Link 
                href={`/documents/${approval.id}`}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <Eye className="w-5 h-5" />
              </Link>
              <button 
                onClick={() => onAction(approval, "approve")}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
              >
                <CheckCircle className="w-4 h-4 mr-2 inline" />
                Approve
              </button>
              <button 
                onClick={() => onAction(approval, "reject")}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
              >
                <XCircle className="w-4 h-4 mr-2 inline" />
                Reject
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
