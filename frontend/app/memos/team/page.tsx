"use client";

import { useState } from "react";
import {
  Users,
  Search,
  Filter,
  Eye,
  Download,
  Share,
  Calendar,
  User,
  Building,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle
} from "lucide-react";

export default function TeamMemosPage() {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock team memos data
  const teamMemos = [
    {
      id: "TEAM-2024-001",
      title: "Department Meeting Minutes - October 2024",
      author: "Sarah Okafor",
      department: "Commercial Services",
      sharedWith: ["John Adebayo", "Grace Nwosu", "David Wilson"],
      sharedDate: "2024-10-18",
      type: "Meeting Minutes",
      priority: "medium",
      attachments: 1,
      views: 12,
      status: "shared"
    },
    {
      id: "TEAM-2024-002",
      title: "Q4 Budget Planning Document",
      author: "John Adebayo",
      department: "Finance & Accounts",
      sharedWith: ["Sarah Okafor", "Michael Johnson", "Grace Nwosu"],
      sharedDate: "2024-10-16",
      type: "Budget Document",
      priority: "high",
      attachments: 3,
      views: 8,
      status: "shared"
    },
    {
      id: "TEAM-2024-003",
      title: "Technical Maintenance Schedule Update",
      author: "Michael Johnson",
      department: "Technical Services",
      sharedWith: ["John Adebayo", "David Wilson"],
      sharedDate: "2024-10-14",
      type: "Technical Report",
      priority: "medium",
      attachments: 2,
      views: 6,
      status: "shared"
    },
    {
      id: "TEAM-2024-004",
      title: "Security Protocol Review",
      author: "David Wilson",
      department: "Security",
      sharedWith: ["Sarah Okafor", "John Adebayo", "Grace Nwosu", "Michael Johnson"],
      sharedDate: "2024-10-12",
      type: "Security Report",
      priority: "high",
      attachments: 1,
      views: 15,
      status: "shared"
    },
    {
      id: "TEAM-2024-005",
      title: "HR Policy Updates - Remote Work",
      author: "Grace Nwosu",
      department: "Human Resources",
      sharedWith: ["John Adebayo", "Sarah Okafor"],
      sharedDate: "2024-10-10",
      type: "Policy Document",
      priority: "low",
      attachments: 1,
      views: 4,
      status: "shared"
    }
  ];

  const filteredMemos = teamMemos.filter(memo =>
    memo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    memo.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    memo.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Meeting Minutes":
        return <Users className="w-4 h-4 text-blue-600" />;
      case "Budget Document":
        return <FileText className="w-4 h-4 text-green-600" />;
      case "Technical Report":
        return <AlertTriangle className="w-4 h-4 text-purple-600" />;
      case "Security Report":
        return <CheckCircle className="w-4 h-4 text-red-600" />;
      case "Policy Document":
        return <FileText className="w-4 h-4 text-orange-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Meeting Minutes":
        return "bg-blue-100 text-blue-800";
      case "Budget Document":
        return "bg-green-100 text-green-800";
      case "Technical Report":
        return "bg-purple-100 text-purple-800";
      case "Security Report":
        return "bg-red-100 text-red-800";
      case "Policy Document":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Documents</h1>
          <p className="text-gray-600">Documents shared with your team members</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
            {teamMemos.length} Shared Documents
          </div>
          <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
            {teamMemos.reduce((sum, memo) => sum + memo.views, 0)} Total Views
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
              placeholder="Search team documents..."
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

      {/* Team Documents List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Shared Team Documents ({filteredMemos.length})
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredMemos.map((memo) => (
            <div key={memo.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    {getTypeIcon(memo.type)}
                    <h3 className="text-lg font-medium text-gray-900">{memo.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(memo.type)}`}>
                      {memo.type}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(memo.priority)}`}>
                      {memo.priority.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      By: {memo.author}
                    </div>
                    <div className="flex items-center">
                      <Building className="w-4 h-4 mr-2" />
                      {memo.department}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Shared: {memo.sharedDate}
                    </div>
                  </div>

                  {/* Shared With */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <Users className="w-4 h-4 mr-2 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">
                            Shared with {memo.sharedWith.length} team member{memo.sharedWith.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {memo.sharedWith.map((person, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 text-xs bg-white border border-gray-300 rounded-full"
                            >
                              <User className="w-3 h-3 mr-1" />
                              {person}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <div>{memo.views} views</div>
                        <div className="flex items-center mt-1">
                          <Eye className="w-3 h-3 mr-1" />
                          Last viewed recently
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      {memo.attachments > 0 && (
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 mr-1" />
                          {memo.attachments} attachment{memo.attachments !== 1 ? 's' : ''}
                        </div>
                      )}
                      <div className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Status: {memo.status}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        <Eye className="w-4 h-4 inline mr-1" />
                        View
                      </button>
                      <button className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">
                        <Download className="w-4 h-4 inline mr-1" />
                        Download
                      </button>
                      <button className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                        <Share className="w-4 h-4 inline mr-1" />
                        Share
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredMemos.length === 0 && (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No team documents found</h3>
              <p className="text-gray-600">
                {searchTerm ? "Try adjusting your search terms" : "No documents have been shared with your team yet"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
