"use client";

import { useState } from "react";
import {
  Inbox,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  MessageSquare,
  User,
  Building,
  Calendar,
  Eye,
  Download,
  ArrowRight,
  Search,
  Filter
} from "lucide-react";

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Mock inbox items
  const inboxItems = {
    all: [
      {
        id: "INBOX-2024-001",
        type: "memo",
        title: "Quarterly Budget Review and Approval",
        sender: "Finance & Accounts Department",
        senderPerson: "John Adebayo (Finance Manager)",
        priority: "high",
        receivedDate: "2024-10-18",
        deadline: "2024-10-22",
        status: "unread",
        category: "Financial",
        description: "Comprehensive review of Q3 budget performance and Q4 allocation proposals",
        attachments: 3,
        requiresAction: "Approval required"
      },
      {
        id: "INBOX-2024-002",
        type: "correspondence",
        title: "International Shipping Partnership Proposal",
        sender: "Commercial Services Department",
        senderPerson: "Sarah Okafor (Commercial Manager)",
        priority: "medium",
        receivedDate: "2024-10-17",
        deadline: "2024-10-25",
        status: "read",
        category: "Commercial",
        description: "Partnership proposal from Mediterranean Shipping Company for joint container terminal operations",
        attachments: 2,
        requiresAction: "Review and decision"
      },
      {
        id: "INBOX-2024-003",
        type: "report",
        title: "Port Security Incident Report",
        sender: "Security Department",
        senderPerson: "David Wilson (Security Chief)",
        priority: "urgent",
        receivedDate: "2024-10-16",
        deadline: "2024-10-19",
        status: "unread",
        category: "Security",
        description: "Detailed report on recent security breach attempt and implemented countermeasures",
        attachments: 1,
        requiresAction: "Immediate attention required"
      },
      {
        id: "INBOX-2024-004",
        type: "memo",
        title: "Staff Training and Development Plan",
        sender: "Human Resources Department",
        senderPerson: "Grace Nwosu (HR Manager)",
        priority: "medium",
        receivedDate: "2024-10-15",
        deadline: "2024-10-28",
        status: "read",
        category: "HR",
        description: "Comprehensive training program for technical and administrative staff",
        attachments: 4,
        requiresAction: "Approval for implementation"
      }
    ],
    unread: [
      {
        id: "INBOX-2024-001",
        type: "memo",
        title: "Quarterly Budget Review and Approval",
        sender: "Finance & Accounts Department",
        senderPerson: "John Adebayo (Finance Manager)",
        priority: "high",
        receivedDate: "2024-10-18",
        deadline: "2024-10-22",
        status: "unread",
        category: "Financial",
        description: "Comprehensive review of Q3 budget performance and Q4 allocation proposals",
        attachments: 3,
        requiresAction: "Approval required"
      },
      {
        id: "INBOX-2024-003",
        type: "report",
        title: "Port Security Incident Report",
        sender: "Security Department",
        senderPerson: "David Wilson (Security Chief)",
        priority: "urgent",
        receivedDate: "2024-10-16",
        deadline: "2024-10-19",
        status: "unread",
        category: "Security",
        description: "Detailed report on recent security breach attempt and implemented countermeasures",
        attachments: 1,
        requiresAction: "Immediate attention required"
      }
    ],
    urgent: [
      {
        id: "INBOX-2024-003",
        type: "report",
        title: "Port Security Incident Report",
        sender: "Security Department",
        senderPerson: "David Wilson (Security Chief)",
        priority: "urgent",
        receivedDate: "2024-10-16",
        deadline: "2024-10-19",
        status: "unread",
        category: "Security",
        description: "Detailed report on recent security breach attempt and implemented countermeasures",
        attachments: 1,
        requiresAction: "Immediate attention required"
      }
    ]
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "memo":
        return <FileText className="w-4 h-4 text-blue-600" />;
      case "correspondence":
        return <MessageSquare className="w-4 h-4 text-green-600" />;
      case "report":
        return <AlertTriangle className="w-4 h-4 text-purple-600" />;
      default:
        return <Inbox className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Financial":
        return "bg-blue-100 text-blue-800";
      case "Commercial":
        return "bg-green-100 text-green-800";
      case "Security":
        return "bg-red-100 text-red-800";
      case "HR":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const currentItems = inboxItems[activeTab as keyof typeof inboxItems] || inboxItems.all;

  const filteredItems = currentItems.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const unreadCount = inboxItems.all.filter(item => item.status === "unread").length;
  const urgentCount = inboxItems.all.filter(item => item.priority === "urgent").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Executive Inbox</h1>
          <p className="text-gray-600">Review and act on items requiring your attention</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
            {urgentCount} Urgent Items
          </div>
          <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
            {unreadCount} Unread Items
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search inbox items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
            <Filter className="w-4 h-4 inline mr-2" />
            Filter
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === "all"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Inbox className="w-4 h-4 inline mr-2" />
              All Items ({inboxItems.all.length})
            </button>
            <button
              onClick={() => setActiveTab("unread")}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === "unread"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Clock className="w-4 h-4 inline mr-2" />
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setActiveTab("urgent")}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === "urgent"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              Urgent ({urgentCount})
            </button>
          </nav>
        </div>

        {/* Inbox Items */}
        <div className="divide-y divide-gray-200">
          {filteredItems.map((item) => (
            <div key={item.id} className={`p-6 hover:bg-gray-50 ${item.status === "unread" ? "bg-blue-50 border-l-4 border-blue-500" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    {getTypeIcon(item.type)}
                    <h3 className={`text-lg font-medium ${item.status === "unread" ? "text-gray-900" : "text-gray-900"}`}>
                      {item.title}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(item.priority)}`}>
                      {item.priority.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(item.category)}`}>
                      {item.category}
                    </span>
                    {item.status === "unread" && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        UNREAD
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center">
                      <Building className="w-4 h-4 mr-2" />
                      {item.sender}
                    </div>
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      {item.senderPerson}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Received: {item.receivedDate}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-700 mb-2">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        {item.attachments > 0 && (
                          <span>{item.attachments} attachment{item.attachments !== 1 ? 's' : ''}</span>
                        )}
                        <span>Deadline: {item.deadline}</span>
                      </div>
                      <span className="text-xs font-medium text-blue-600">{item.requiresAction}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Received {item.receivedDate}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        <Eye className="w-4 h-4 inline mr-1" />
                        Review
                      </button>
                      <button className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">
                        <CheckCircle className="w-4 h-4 inline mr-1" />
                        Approve
                      </button>
                      <button className="px-3 py-1 text-sm bg-yellow-600 text-white rounded-md hover:bg-yellow-700">
                        <ArrowRight className="w-4 h-4 inline mr-1" />
                        Forward
                      </button>
                      <button className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                        <Download className="w-4 h-4 inline mr-1" />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="p-12 text-center">
              <Inbox className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
              <p className="text-gray-600">
                {searchTerm ? "Try adjusting your search terms" : "Your inbox is empty"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
