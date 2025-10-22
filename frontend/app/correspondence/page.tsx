"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mail,
  Plus,
  Search,
  Filter,
  Eye,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Calendar,
  Building,
  User,
  FileText
} from "lucide-react";

export default function CorrespondencePage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Mock correspondence data
  const correspondenceItems = {
    all: [
      {
        id: "CORR-2024-001",
        referenceNumber: "NPA/CORR/2024/001",
        title: "Partnership Proposal - Mediterranean Shipping Company",
        type: "incoming",
        sender: "Mediterranean Shipping Company",
        recipient: "GM Operations",
        department: "Commercial Services",
        priority: "high",
        receivedDate: "2024-10-15",
        status: "pending_review",
        category: "Commercial",
        description: "Proposal for joint container terminal operations and services",
        attachments: 3,
        assignedTo: "Sarah Okafor"
      },
      {
        id: "CORR-2024-002",
        referenceNumber: "NPA/CORR/2024/002",
        title: "Annual Audit Report - External Auditors",
        type: "incoming",
        sender: "KPMG Audit Services",
        recipient: "MD",
        department: "Finance & Accounts",
        priority: "medium",
        receivedDate: "2024-10-12",
        status: "under_review",
        category: "Financial",
        description: "Comprehensive annual financial audit report and recommendations",
        attachments: 2,
        assignedTo: "John Adebayo"
      },
      {
        id: "CORR-2024-003",
        referenceNumber: "NPA/CORR/2024/003",
        title: "Infrastructure Development Agreement Response",
        type: "outgoing",
        sender: "NPA Legal Department",
        recipient: "Federal Ministry of Transportation",
        department: "Legal Services",
        priority: "high",
        sentDate: "2024-10-10",
        status: "sent",
        category: "Legal",
        description: "Response to infrastructure development partnership proposal",
        attachments: 1,
        assignedTo: "Grace Nwosu"
      },
      {
        id: "CORR-2024-004",
        referenceNumber: "NPA/CORR/2024/004",
        title: "Security Equipment Procurement Tender",
        type: "outgoing",
        sender: "NPA Security Department",
        recipient: "Various Security Companies",
        department: "Security",
        priority: "medium",
        sentDate: "2024-10-08",
        status: "acknowledged",
        category: "Procurement",
        description: "Tender documents for security equipment and systems procurement",
        attachments: 5,
        assignedTo: "David Wilson"
      }
    ],
    incoming: [
      {
        id: "CORR-2024-001",
        referenceNumber: "NPA/CORR/2024/001",
        title: "Partnership Proposal - Mediterranean Shipping Company",
        type: "incoming",
        sender: "Mediterranean Shipping Company",
        recipient: "GM Operations",
        department: "Commercial Services",
        priority: "high",
        receivedDate: "2024-10-15",
        status: "pending_review",
        category: "Commercial",
        description: "Proposal for joint container terminal operations and services",
        attachments: 3,
        assignedTo: "Sarah Okafor"
      },
      {
        id: "CORR-2024-002",
        referenceNumber: "NPA/CORR/2024/002",
        title: "Annual Audit Report - External Auditors",
        type: "incoming",
        sender: "KPMG Audit Services",
        recipient: "MD",
        department: "Finance & Accounts",
        priority: "medium",
        receivedDate: "2024-10-12",
        status: "under_review",
        category: "Financial",
        description: "Comprehensive annual financial audit report and recommendations",
        attachments: 2,
        assignedTo: "John Adebayo"
      }
    ],
    outgoing: [
      {
        id: "CORR-2024-003",
        referenceNumber: "NPA/CORR/2024/003",
        title: "Infrastructure Development Agreement Response",
        type: "outgoing",
        sender: "NPA Legal Department",
        recipient: "Federal Ministry of Transportation",
        department: "Legal Services",
        priority: "high",
        sentDate: "2024-10-10",
        status: "sent",
        category: "Legal",
        description: "Response to infrastructure development partnership proposal",
        attachments: 1,
        assignedTo: "Grace Nwosu"
      },
      {
        id: "CORR-2024-004",
        referenceNumber: "NPA/CORR/2024/004",
        title: "Security Equipment Procurement Tender",
        type: "outgoing",
        sender: "NPA Security Department",
        recipient: "Various Security Companies",
        department: "Security",
        priority: "medium",
        sentDate: "2024-10-08",
        status: "acknowledged",
        category: "Procurement",
        description: "Tender documents for security equipment and systems procurement",
        attachments: 5,
        assignedTo: "David Wilson"
      }
    ]
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending_review":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "under_review":
        return <Eye className="w-4 h-4 text-blue-600" />;
      case "sent":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "acknowledged":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <Mail className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending_review":
        return "bg-yellow-100 text-yellow-800";
      case "under_review":
        return "bg-blue-100 text-blue-800";
      case "sent":
        return "bg-green-100 text-green-800";
      case "acknowledged":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "incoming":
        return "bg-blue-100 text-blue-800";
      case "outgoing":
        return "bg-purple-100 text-purple-800";
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Commercial":
        return "bg-green-100 text-green-800";
      case "Financial":
        return "bg-blue-100 text-blue-800";
      case "Legal":
        return "bg-purple-100 text-purple-800";
      case "Procurement":
        return "bg-orange-100 text-orange-800";
      case "Security":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const currentItems = correspondenceItems[activeTab as keyof typeof correspondenceItems] || correspondenceItems.all;

  const filteredItems = currentItems.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sender.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Correspondence</h1>
          <p className="text-gray-600">Manage incoming and outgoing official correspondence</p>
        </div>
        <Link
          href="/correspondence/register"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Register Correspondence
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search correspondence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
            <Filter className="w-4 h-4 inline mr-2" />
            Advanced Filter
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
              <Mail className="w-4 h-4 inline mr-2" />
              All Correspondence ({correspondenceItems.all.length})
            </button>
            <button
              onClick={() => setActiveTab("incoming")}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === "incoming"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <ArrowRight className="w-4 h-4 inline mr-2" />
              Incoming ({correspondenceItems.incoming.length})
            </button>
            <button
              onClick={() => setActiveTab("outgoing")}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === "outgoing"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <ArrowRight className="w-4 h-4 inline mr-2 rotate-180" />
              Outgoing ({correspondenceItems.outgoing.length})
            </button>
          </nav>
        </div>

        {/* Correspondence Items */}
        <div className="divide-y divide-gray-200">
          {filteredItems.map((item) => (
            <div key={item.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusIcon(item.status)}
                    <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(item.type)}`}>
                      {item.type.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                      {item.status.replace("_", " ").toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(item.priority)}`}>
                      {item.priority.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(item.category)}`}>
                      {item.category}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      {item.referenceNumber}
                    </div>
                    <div className="flex items-center">
                      <Building className="w-4 h-4 mr-2" />
                      {item.department}
                    </div>
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      {item.assignedTo}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-gray-700 mb-2">{item.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{item.type === "incoming" ? "From" : "To"}: {item.sender}</span>
                          <span>Recipient: {item.recipient}</span>
                          {item.attachments > 0 && (
                            <span>{item.attachments} attachment{item.attachments !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        <div>{item.type === "incoming" ? "Received" : "Sent"}</div>
                        <div>{(item as any).receivedDate || (item as any).sentDate}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {item.type === "incoming" ? "Received" : "Sent"} {(item as any).receivedDate || (item as any).sentDate}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        <Eye className="w-4 h-4 inline mr-1" />
                        View Details
                      </button>
                      <button className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">
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
              <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No correspondence found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? "Try adjusting your search terms" : "No correspondence items match your current filter"}
              </p>
              <Link
                href="/correspondence/register"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Register New Correspondence
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
