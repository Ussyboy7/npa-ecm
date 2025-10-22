"use client";

import { useState } from "react";
import {
  List,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Building,
  Calendar,
  FileText,
  Eye,
  ArrowRight,
  MessageSquare,
  Send
} from "lucide-react";

export default function SecretaryQueuePage() {
  const [activeTab, setActiveTab] = useState("pending");

  // Mock secretary queue data
  const queueItems = {
    pending: [
      {
        id: "QUEUE-2024-001",
        type: "memo_approval",
        title: "Budget Allocation Request - Finance Department",
        executive: "MD",
        department: "Finance & Accounts",
        priority: "high",
        submittedDate: "2024-10-15",
        deadline: "2024-10-20",
        sender: "John Adebayo (Finance Manager)",
        description: "Request for additional budget allocation for Q4 operations",
        attachments: 2,
        status: "awaiting_review",
        startedAt: undefined,
        completedAt: undefined,
        actionTaken: undefined
      },
      {
        id: "QUEUE-2024-002",
        type: "correspondence",
        title: "External Partnership Proposal",
        executive: "GM Operations",
        department: "Commercial Services",
        priority: "medium",
        submittedDate: "2024-10-14",
        deadline: "2024-10-18",
        sender: "Sarah Okafor (Commercial Manager)",
        description: "Partnership proposal from international shipping company",
        attachments: 1,
        status: "needs_signature",
        startedAt: undefined,
        completedAt: undefined,
        actionTaken: undefined
      },
      {
        id: "QUEUE-2024-003",
        type: "document_review",
        title: "Annual Performance Report",
        executive: "AGM Technical",
        department: "Technical Services",
        priority: "low",
        submittedDate: "2024-10-13",
        deadline: "2024-10-25",
        sender: "Michael Johnson (Technical Supervisor)",
        description: "Annual technical performance and maintenance report",
        attachments: 3,
        status: "awaiting_review",
        startedAt: undefined,
        completedAt: undefined,
        actionTaken: undefined
      }
    ],
    processing: [
      {
        id: "QUEUE-2024-004",
        type: "memo_approval",
        title: "Staff Recruitment Plan",
        executive: "MD",
        department: "Human Resources",
        priority: "high",
        submittedDate: "2024-10-12",
        deadline: "2024-10-19",
        sender: "Grace Nwosu (HR Manager)",
        description: "Comprehensive staff recruitment and training plan",
        attachments: 1,
        status: "in_progress",
        startedAt: "2024-10-16",
        completedAt: undefined,
        actionTaken: undefined
      }
    ],
    completed: [
      {
        id: "QUEUE-2024-005",
        type: "correspondence",
        title: "Infrastructure Development Agreement",
        executive: "GM Operations",
        department: "Planning & Development",
        priority: "high",
        submittedDate: "2024-10-10",
        deadline: "2024-10-15",
        sender: "David Wilson (Planning Director)",
        description: "Development agreement with construction partners",
        attachments: 4,
        status: "completed",
        startedAt: undefined,
        completedAt: "2024-10-16",
        actionTaken: "Forwarded to executive and filed"
      }
    ]
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "memo_approval":
        return <FileText className="w-4 h-4 text-blue-600" />;
      case "correspondence":
        return <MessageSquare className="w-4 h-4 text-green-600" />;
      case "document_review":
        return <Eye className="w-4 h-4 text-purple-600" />;
      default:
        return <List className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "memo_approval":
        return "bg-blue-100 text-blue-800";
      case "correspondence":
        return "bg-green-100 text-green-800";
      case "document_review":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-600 bg-red-50 border-red-200";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "awaiting_review":
        return "bg-yellow-100 text-yellow-800";
      case "needs_signature":
        return "bg-orange-100 text-orange-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const currentItems = queueItems[activeTab as keyof typeof queueItems];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Secretary's Queue</h1>
          <p className="text-gray-600">Manage items requiring executive attention</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
            {queueItems.pending.length} Pending Items
          </div>
          <div className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
            {queueItems.processing.length} In Progress
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === "pending"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Clock className="w-4 h-4 inline mr-2" />
              Pending ({queueItems.pending.length})
            </button>
            <button
              onClick={() => setActiveTab("processing")}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === "processing"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              Processing ({queueItems.processing.length})
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === "completed"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <CheckCircle className="w-4 h-4 inline mr-2" />
              Completed ({queueItems.completed.length})
            </button>
          </nav>
        </div>

        {/* Queue Items */}
        <div className="divide-y divide-gray-200">
          {currentItems.map((item) => (
            <div key={item.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    {getTypeIcon(item.type)}
                    <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(item.type)}`}>
                      {item.type.replace("_", " ").toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(item.priority)}`}>
                      {item.priority.toUpperCase()} PRIORITY
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Executive: {item.executive}
                    </div>
                    <div className="flex items-center">
                      <Building className="w-4 h-4 mr-2" />
                      {item.department}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Submitted: {item.submittedDate}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-gray-700 mb-2">{item.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>From: {item.sender}</span>
                          {item.attachments > 0 && (
                            <span>{item.attachments} attachment{item.attachments !== 1 ? 's' : ''}</span>
                          )}
                          <span>Deadline: {item.deadline}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                        {item.status.replace("_", " ").toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      {item.startedAt && (
                        <span>Started: {item.startedAt}</span>
                      )}
                      {item.completedAt && (
                        <span>Completed: {item.completedAt}</span>
                      )}
                      {item.actionTaken && (
                        <span>Action: {item.actionTaken}</span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        <Eye className="w-4 h-4 inline mr-1" />
                        Review
                      </button>
                      <button className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">
                        <Send className="w-4 h-4 inline mr-1" />
                        Process
                      </button>
                      <button className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                        <ArrowRight className="w-4 h-4 inline mr-1" />
                        Forward
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {currentItems.length === 0 && (
            <div className="p-12 text-center">
              <List className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {activeTab === "pending" && "No pending items"}
                {activeTab === "processing" && "No items in progress"}
                {activeTab === "completed" && "No completed items"}
              </h3>
              <p className="text-gray-600">
                {activeTab === "pending" && "All items have been processed"}
                {activeTab === "processing" && "No items are currently being processed"}
                {activeTab === "completed" && "No items have been completed yet"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
