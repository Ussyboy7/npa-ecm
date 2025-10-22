"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  User,
  Building,
  FileText,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertTriangle,
  Send,
  Eye,
  Edit3,
  X,
  Save
} from "lucide-react";
import { NPA_DEPARTMENTS, NPA_ROLES } from "@/lib/npa-structure";

export default function ForwardReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemId = searchParams.get("id");

  const [action, setAction] = useState<"forward" | "review" | null>(null);
  const [selectedApprover, setSelectedApprover] = useState("");
  const [comments, setComments] = useState("");
  const [priority, setPriority] = useState("medium");
  const [deadline, setDeadline] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock item data - in real app, this would be fetched based on itemId
  const itemData = {
    id: itemId || "DOC-2024-001",
    title: "Budget Allocation Request - Q1 Operations",
    type: "Budget Document",
    currentLocation: "Finance Department",
    submittedBy: "John Adebayo (Finance Manager)",
    submittedDate: "2024-12-15",
    description: "Request for additional budget allocation of ₦15M for Q1 operational expenses including maintenance and supplies.",
    attachments: 2,
    currentStep: "Manager Review",
    nextPossibleApprovers: [
      { id: "gm-finance", name: "GM Finance", department: "Finance & Accounts", role: "General Manager" },
      { id: "agm-finance", name: "AGM Finance", department: "Finance & Accounts", role: "Assistant General Manager" },
      { id: "ed-finance", name: "ED Finance & Admin", department: "Executive Director", role: "Executive Director" },
      { id: "md", name: "Managing Director", department: "Headquarters", role: "Managing Director" }
    ],
    workflowHistory: [
      {
        step: "Submitted",
        actor: "Finance Manager",
        date: "2024-12-15 09:00",
        action: "Initial submission",
        comments: "Budget request for Q1 operations"
      },
      {
        step: "Officer Review",
        actor: "Finance Officer",
        date: "2024-12-15 10:30",
        action: "Reviewed and approved",
        comments: "Figures verified, amounts reasonable"
      },
      {
        step: "Manager Review",
        actor: "Finance Manager",
        date: "2024-12-15 14:15",
        action: "Approved for GM review",
        comments: "Approved for executive review"
      }
    ]
  };

  const handleForward = async () => {
    if (!selectedApprover || !comments) return;

    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);

    // Redirect back to approvals or dashboard
    router.push("/approvals");
  };

  const handleReview = async () => {
    if (!comments) return;

    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);

    // Redirect back
    router.push("/approvals");
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-300";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "low":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  if (!action) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <ArrowRight className="w-6 h-6 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Forward & Review</h1>
                <p className="text-gray-600">Process document: {itemData.title}</p>
              </div>
            </div>
            <Link
              href="/approvals"
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back to Approvals
            </Link>
          </div>

          {/* Document Summary */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Document Details</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Document Title</label>
                    <p className="mt-1 text-sm text-gray-900">{itemData.title}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <p className="mt-1 text-sm text-gray-900">{itemData.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Submitted By</label>
                    <p className="mt-1 text-sm text-gray-900">{itemData.submittedBy}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Submitted Date</label>
                    <p className="mt-1 text-sm text-gray-900">{itemData.submittedDate}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current Location</label>
                    <p className="mt-1 text-sm text-gray-900">{itemData.currentLocation}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current Step</label>
                    <p className="mt-1 text-sm text-gray-900">{itemData.currentStep}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Attachments</label>
                    <p className="mt-1 text-sm text-gray-900">{itemData.attachments} files</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <p className="mt-1 text-sm text-gray-900">{itemData.description}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex items-center justify-center space-x-4">
                <button
                  onClick={() => setAction("review")}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <Eye className="w-5 h-5" />
                  <span>Review Document</span>
                </button>
                <button
                  onClick={() => setAction("forward")}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                >
                  <ArrowRight className="w-5 h-5" />
                  <span>Forward for Approval</span>
                </button>
              </div>
            </div>
          </div>

          {/* Workflow History */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Workflow History</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {itemData.workflowHistory.map((step, index) => (
                <div key={index} className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{step.step}</p>
                          <p className="text-sm text-gray-500">{step.actor} • {step.date}</p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {step.action}
                        </span>
                      </div>
                      {step.comments && (
                        <p className="mt-2 text-sm text-gray-600">{step.comments}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {action === "forward" ? (
              <ArrowRight className="w-6 h-6 text-green-600" />
            ) : (
              <Eye className="w-6 h-6 text-blue-600" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {action === "forward" ? "Forward for Approval" : "Review Document"}
              </h1>
              <p className="text-gray-600">{itemData.title}</p>
            </div>
          </div>
          <button
            onClick={() => setAction(null)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
        </div>

        {/* Action Form */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {action === "forward" ? "Forward to Next Approver" : "Document Review"}
            </h2>
          </div>

          <div className="p-6 space-y-6">
            {action === "forward" && (
              <>
                {/* Approver Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Next Approver *
                  </label>
                  <div className="space-y-2">
                    {itemData.nextPossibleApprovers.map((approver) => (
                      <label key={approver.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="approver"
                          value={approver.id}
                          checked={selectedApprover === approver.id}
                          onChange={(e) => setSelectedApprover(e.target.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{approver.name}</span>
                            <span className="text-xs text-gray-500">({approver.role})</span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Building className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-600">{approver.department}</span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Priority and Deadline */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority Level
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deadline (Optional)
                    </label>
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Comments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments *
                {action === "forward" ? " (Forwarding Notes)" : " (Review Notes)"}
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={
                  action === "forward"
                    ? "Add notes about why this is being forwarded and any specific instructions..."
                    : "Add your review comments and recommendations..."
                }
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setAction(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={action === "forward" ? handleForward : handleReview}
                disabled={
                  isSubmitting ||
                  !comments ||
                  (action === "forward" && !selectedApprover)
                }
                className="px-6 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <Clock className="w-4 h-4 animate-spin" />
                ) : action === "forward" ? (
                  <Send className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>
                  {isSubmitting
                    ? "Processing..."
                    : action === "forward"
                    ? "Forward Document"
                    : "Save Review"
                  }
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
