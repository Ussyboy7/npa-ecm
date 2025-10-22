"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Crown,
  FileText,
  MessageSquare,
  Eye,
  Edit3,
  Save,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Building,
  Calendar,
  ArrowRight
} from "lucide-react";

export default function MDMinutesPage() {
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [minutes, setMinutes] = useState("");
  const [action, setAction] = useState<"view" | "minute" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock documents awaiting MD review/minutes
  const pendingDocuments = [
    {
      id: "DOC-2024-001",
      title: "Annual Budget Approval 2025",
      type: "Budget Document",
      submittedBy: "GM Finance",
      submittedDate: "2024-12-15",
      department: "Finance & Accounts",
      priority: "critical",
      status: "awaiting_md_review",
      description: "Comprehensive budget proposal for fiscal year 2025 including capital expenditures and operational costs.",
      attachments: 3,
      deadline: "2024-12-20",
      previousApprovals: [
        { role: "Finance Manager", name: "John Adebayo", date: "2024-12-15", action: "Approved" },
        { role: "GM Finance", name: "Sarah Okafor", date: "2024-12-16", action: "Approved" },
        { role: "ED Finance & Admin", name: "Michael Johnson", date: "2024-12-17", action: "Approved" }
      ],
      content: "This document contains the detailed budget breakdown for 2025 operations..."
    },
    {
      id: "DOC-2024-002",
      title: "ICT Infrastructure Upgrade Proposal",
      type: "Technical Proposal",
      submittedBy: "GM ICT",
      submittedDate: "2024-12-10",
      department: "Information & Communication Technology",
      priority: "high",
      status: "awaiting_md_minutes",
      description: "Proposal for upgrading the organization's ICT infrastructure including servers, network equipment, and cybersecurity enhancements.",
      attachments: 5,
      deadline: "2024-12-18",
      previousApprovals: [
        { role: "ICT Manager", name: "David Wilson", date: "2024-12-10", action: "Approved" },
        { role: "AGM ICT", name: "Grace Nwosu", date: "2024-12-12", action: "Approved" },
        { role: "GM ICT", name: "Robert Brown", date: "2024-12-13", action: "Approved" },
        { role: "ED Engineering", name: "Paul Davis", date: "2024-12-15", action: "Approved" }
      ],
      existingMinutes: "Approved for implementation with budget allocation of ₦50M. Implementation to commence Q1 2025.",
      content: "The ICT infrastructure upgrade will modernize our systems..."
    },
    {
      id: "DOC-2024-003",
      title: "Terminal Lease Agreement Review",
      type: "Legal Agreement",
      submittedBy: "Legal Counsel",
      submittedDate: "2024-12-08",
      department: "Legal Services",
      priority: "high",
      status: "awaiting_md_decision",
      description: "Review and approval of 10-year lease agreement for additional terminal space at Lekki Port.",
      attachments: 2,
      deadline: "2024-12-16",
      previousApprovals: [
        { role: "Legal Officer", name: "Mary Thompson", date: "2024-12-08", action: "Reviewed" },
        { role: "GM Commercial", name: "James Wilson", date: "2024-12-10", action: "Approved" },
        { role: "ED Marine & Ops", name: "Linda Garcia", date: "2024-12-12", action: "Approved" }
      ],
      content: "This agreement secures additional terminal capacity..."
    }
  ];

  const handleViewDocument = (docId: string) => {
    setSelectedDocument(docId);
    setAction("view");
  };

  const handleAddMinutes = (docId: string) => {
    setSelectedDocument(docId);
    setAction("minute");
    const doc = pendingDocuments.find(d => d.id === docId);
    if (doc?.existingMinutes) {
      setMinutes(doc.existingMinutes);
    }
  };

  const handleSaveMinutes = async () => {
    if (!minutes.trim()) return;

    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setAction(null);
    setSelectedDocument(null);
    setMinutes("");
  };

  const handleApprove = async (docId: string) => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    // Update document status
  };

  const handleReturn = async (docId: string) => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    // Return document for revision
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "awaiting_md_review":
        return "bg-blue-100 text-blue-800";
      case "awaiting_md_minutes":
        return "bg-purple-100 text-purple-800";
      case "awaiting_md_decision":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const selectedDoc = pendingDocuments.find(doc => doc.id === selectedDocument);

  if (action && selectedDoc) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Crown className="w-6 h-6 text-yellow-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {action === "view" ? "View Document" : "Add Minutes"}
                </h1>
                <p className="text-gray-600">{selectedDoc.title}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setAction(null);
                setSelectedDocument(null);
                setMinutes("");
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back to Documents
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Document Details */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Information</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Type:</span>
                    <p className="text-sm text-gray-900">{selectedDoc.type}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Submitted By:</span>
                    <p className="text-sm text-gray-900">{selectedDoc.submittedBy}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Department:</span>
                    <p className="text-sm text-gray-900">{selectedDoc.department}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Submitted:</span>
                    <p className="text-sm text-gray-900">{selectedDoc.submittedDate}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Deadline:</span>
                    <p className="text-sm text-gray-900">{selectedDoc.deadline}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Priority:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(selectedDoc.priority)}`}>
                      {selectedDoc.priority.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Status:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedDoc.status)}`}>
                      {selectedDoc.status.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Approval History */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Approval History</h3>
                <div className="space-y-3">
                  {selectedDoc.previousApprovals.map((approval, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{approval.name}</p>
                        <p className="text-xs text-gray-600">{approval.role} • {approval.date}</p>
                        <p className="text-xs text-green-600">{approval.action}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-start space-x-3 pt-2 border-t border-gray-200">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Clock className="w-3 h-3 text-yellow-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">Managing Director</p>
                      <p className="text-xs text-gray-600">Awaiting Action</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => handleApprove(selectedDoc.id)}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => handleReturn(selectedDoc.id)}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>Return for Revision</span>
                  </button>
                  {action === "minute" && (
                    <button
                      onClick={handleSaveMinutes}
                      disabled={isSubmitting || !minutes.trim()}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSubmitting ? "Saving..." : "Save Minutes"}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Document Content & Minutes */}
            <div className="lg:col-span-2 space-y-6">
              {/* Document Content */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Document Content</h3>
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{selectedDoc.attachments} attachments</span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="prose max-w-none">
                    <p className="text-gray-700">{selectedDoc.content}</p>
                    <p className="text-gray-600 mt-4">{selectedDoc.description}</p>
                  </div>
                </div>
              </div>

              {/* Minutes Section */}
              {action === "minute" && (
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
                      MD Minutes & Comments
                    </h3>
                  </div>
                  <div className="p-6">
                    <textarea
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                      placeholder="Enter your minutes, decisions, and any specific instructions..."
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="mt-4 text-sm text-gray-600">
                      <p><strong>Guidelines for MD Minutes:</strong></p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Clearly state your decision (approve, reject, return for revision)</li>
                        <li>Include specific instructions or conditions if any</li>
                        <li>Mention any follow-up actions required</li>
                        <li>Reference budget implications if applicable</li>
                        <li>Indicate timeline expectations for implementation</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Existing Minutes Display */}
              {selectedDoc.existingMinutes && action === "view" && (
                <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
                  <h4 className="text-lg font-semibold text-blue-900 mb-3">Previous MD Minutes</h4>
                  <div className="bg-white rounded-md p-4 border border-blue-200">
                    <p className="text-gray-800 whitespace-pre-line">{selectedDoc.existingMinutes}</p>
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="text-xs text-blue-600">
                        Added by Managing Director • {selectedDoc.submittedDate}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Crown className="w-8 h-8 text-yellow-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">MD Review & Minutes</h1>
            <p className="text-gray-600">Documents requiring MD attention and minute-taking</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Pending</p>
              <p className="text-2xl font-bold text-gray-900">{pendingDocuments.length}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical Priority</p>
              <p className="text-2xl font-bold text-red-900">
                {pendingDocuments.filter(doc => doc.priority === "critical").length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Past Deadline</p>
              <p className="text-2xl font-bold text-orange-900">
                {pendingDocuments.filter(doc => new Date(doc.deadline) < new Date()).length}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Processing Time</p>
              <p className="text-2xl font-bold text-blue-900">2.3 days</p>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority & Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deadline
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingDocuments.map((doc) => {
                const isOverdue = new Date(doc.deadline) < new Date();

                return (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                          <div className="text-sm text-gray-500">{doc.type}</div>
                          <div className="text-xs text-gray-400">{doc.department}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{doc.submittedBy}</div>
                          <div className="text-xs text-gray-500">{doc.submittedDate}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(doc.priority)}`}>
                          {doc.priority.toUpperCase()}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                          {doc.status.replace(/_/g, " ").toUpperCase()}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                          {doc.deadline}
                          {isOverdue && (
                            <span className="block text-xs text-red-500">Overdue</span>
                          )}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDocument(doc.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Document"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAddMinutes(doc.id)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Add Minutes"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
