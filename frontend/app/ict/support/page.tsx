"use client";

import { useState } from "react";
import {
  Headphones,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Calendar,
  Tag,
  Priority,
  Activity,
  BarChart3,
  Download,
  Upload,
  Phone,
  Mail,
  MapPin,
  Settings,
  RefreshCw
} from "lucide-react";
import Link from "next/link";

export default function ICTSupportPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const supportStats = [
    {
      name: "Open Tickets",
      value: "24",
      change: "+3",
      changeType: "warning",
      icon: AlertTriangle,
      description: "Currently active",
      status: "Active"
    },
    {
      name: "Resolved Today",
      value: "12",
      change: "+5",
      changeType: "positive",
      icon: CheckCircle,
      description: "Tickets closed",
      status: "Good"
    },
    {
      name: "Avg Response Time",
      value: "2.3h",
      change: "-0.5h",
      changeType: "positive",
      icon: Clock,
      description: "Time to first response",
      status: "Good"
    },
    {
      name: "Satisfaction Score",
      value: "4.7/5",
      change: "+0.2",
      changeType: "positive",
      icon: Activity,
      description: "Customer satisfaction",
      status: "Excellent"
    }
  ];

  const tickets = [
    {
      id: "TICKET-001",
      title: "Email Server Connection Issues",
      description: "Users unable to send emails through the corporate email server",
      status: "Open",
      priority: "High",
      category: "Email",
      requester: "Sarah Johnson",
      department: "HR",
      assignedTo: "Mike Chen",
      createdDate: "2024-12-10 09:30:00",
      lastUpdate: "2024-12-10 14:15:00",
      responseTime: "2.5h",
      resolutionTime: "Pending",
      tags: ["Email", "Server", "Connectivity"]
    },
    {
      id: "TICKET-002",
      title: "VPN Access Problems",
      description: "Remote users cannot connect to VPN from home",
      status: "In Progress",
      priority: "Medium",
      category: "Network",
      requester: "David Okafor",
      department: "Finance",
      assignedTo: "Grace Williams",
      createdDate: "2024-12-10 11:45:00",
      lastUpdate: "2024-12-10 15:30:00",
      responseTime: "1.2h",
      resolutionTime: "Pending",
      tags: ["VPN", "Remote Access", "Network"]
    },
    {
      id: "TICKET-003",
      title: "Printer Not Working",
      description: "Office printer in Finance department is not printing",
      status: "Resolved",
      priority: "Low",
      category: "Hardware",
      requester: "Mary Okonkwo",
      department: "Finance",
      assignedTo: "John Smith",
      createdDate: "2024-12-09 16:20:00",
      lastUpdate: "2024-12-10 10:45:00",
      responseTime: "0.8h",
      resolutionTime: "18.5h",
      tags: ["Printer", "Hardware", "Finance"]
    },
    {
      id: "TICKET-004",
      title: "Software License Renewal",
      description: "Adobe Creative Suite license expires next week",
      status: "Open",
      priority: "Medium",
      category: "Software",
      requester: "Peter Adebayo",
      department: "Marketing",
      assignedTo: "Unassigned",
      createdDate: "2024-12-10 13:15:00",
      lastUpdate: "2024-12-10 13:15:00",
      responseTime: "Pending",
      resolutionTime: "Pending",
      tags: ["Software", "License", "Adobe"]
    },
    {
      id: "TICKET-005",
      title: "Database Performance Issues",
      description: "ECM system running slowly, affecting user productivity",
      status: "In Progress",
      priority: "Critical",
      category: "Database",
      requester: "Admin User",
      department: "ICT",
      assignedTo: "Ahmed Hassan",
      createdDate: "2024-12-10 08:00:00",
      lastUpdate: "2024-12-10 16:00:00",
      responseTime: "0.5h",
      resolutionTime: "Pending",
      tags: ["Database", "Performance", "ECM"]
    }
  ];

  const categories = [
    { name: "Email", count: 8, color: "bg-blue-100 text-blue-800" },
    { name: "Network", count: 12, color: "bg-green-100 text-green-800" },
    { name: "Hardware", count: 6, color: "bg-yellow-100 text-yellow-800" },
    { name: "Software", count: 15, color: "bg-purple-100 text-purple-800" },
    { name: "Database", count: 4, color: "bg-red-100 text-red-800" },
    { name: "Security", count: 3, color: "bg-orange-100 text-orange-800" }
  ];

  const supportTeam = [
    {
      name: "Mike Chen",
      role: "Senior Support Engineer",
      specialization: "Email & Network",
      activeTickets: 8,
      avgResolutionTime: "4.2h",
      satisfaction: "4.8/5",
      status: "Available"
    },
    {
      name: "Grace Williams",
      role: "Network Specialist",
      specialization: "VPN & Security",
      activeTickets: 6,
      avgResolutionTime: "3.8h",
      satisfaction: "4.6/5",
      status: "Busy"
    },
    {
      name: "John Smith",
      role: "Hardware Technician",
      specialization: "Hardware & Printers",
      activeTickets: 4,
      avgResolutionTime: "2.5h",
      satisfaction: "4.9/5",
      status: "Available"
    },
    {
      name: "Ahmed Hassan",
      role: "Database Administrator",
      specialization: "Database & Performance",
      activeTickets: 3,
      avgResolutionTime: "6.1h",
      satisfaction: "4.7/5",
      status: "Available"
    }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In Progress" },
    { value: "resolved", label: "Resolved" },
    { value: "closed", label: "Closed" }
  ];

  const priorityOptions = [
    { value: "all", label: "All Priorities" },
    { value: "critical", label: "Critical" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" }
  ];

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.requester.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         ticket.status.toLowerCase().replace(" ", "_") === statusFilter;
    const matchesPriority = priorityFilter === "all" || 
                           ticket.priority.toLowerCase() === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const statusColorMap = {
    'Open': 'bg-red-100 text-red-800',
    'In Progress': 'bg-yellow-100 text-yellow-800',
    'Resolved': 'bg-green-100 text-green-800',
    'Closed': 'bg-gray-100 text-gray-800'
  };

  const priorityColorMap = {
    'Critical': 'bg-red-100 text-red-800',
    'High': 'bg-orange-100 text-orange-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-green-100 text-green-800'
  };

  const teamStatusColorMap = {
    'Available': 'bg-green-100 text-green-800',
    'Busy': 'bg-yellow-100 text-yellow-800',
    'Offline': 'bg-gray-100 text-gray-800'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ICT Support Center</h1>
          <p className="text-gray-600">Manage and track ICT support tickets and requests</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/ict/support/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Ticket
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <BarChart3 className="w-4 h-4 mr-2" />
            Reports
          </button>
        </div>
      </div>

      {/* Support Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {supportStats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.description}</p>
              </div>
              <stat.icon className="h-8 w-8 text-gray-400" />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className={`text-sm font-medium ${
                stat.changeType === 'positive' ? 'text-green-600' : 
                stat.changeType === 'warning' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {stat.change}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                stat.status === 'Excellent' ? 'bg-green-100 text-green-800' :
                stat.status === 'Good' ? 'bg-blue-100 text-blue-800' :
                stat.status === 'Active' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {stat.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search tickets by title, description, or requester..."
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
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {priorityOptions.map(option => (
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Support Tickets</h2>
              <Link
                href="/ict/support/tickets"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View all tickets
              </Link>
            </div>
            <div className="space-y-4">
              {filteredTickets.map((ticket) => (
                <div key={ticket.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-sm font-medium text-gray-900">{ticket.title}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[ticket.status as keyof typeof statusColorMap]}`}>
                          {ticket.status}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColorMap[ticket.priority as keyof typeof priorityColorMap]}`}>
                          {ticket.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{ticket.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span><span className="font-medium">Requester:</span> {ticket.requester}</span>
                        <span><span className="font-medium">Department:</span> {ticket.department}</span>
                        <span><span className="font-medium">Assigned:</span> {ticket.assignedTo}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-4">
                      <span><span className="font-medium">Created:</span> {ticket.createdDate}</span>
                      <span><span className="font-medium">Last Update:</span> {ticket.lastUpdate}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span><span className="font-medium">Response:</span> {ticket.responseTime}</span>
                      <span><span className="font-medium">Resolution:</span> {ticket.resolutionTime}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ticket.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Categories */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ticket Categories</h3>
            <div className="space-y-3">
              {categories.map((category) => (
                <div key={category.name} className="flex items-center justify-between">
                  <span className="text-sm text-gray-900">{category.name}</span>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${category.color}`}>
                      {category.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Support Team */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Support Team</h3>
            <div className="space-y-4">
              {supportTeam.map((member) => (
                <div key={member.name} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">{member.name}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${teamStatusColorMap[member.status as keyof typeof teamStatusColorMap]}`}>
                      {member.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{member.role}</p>
                  <p className="text-xs text-gray-500 mb-2">Specialization: {member.specialization}</p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Active Tickets: {member.activeTickets}</p>
                    <p>Avg Resolution: {member.avgResolutionTime}</p>
                    <p>Satisfaction: {member.satisfaction}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                href="/ict/support/create"
                className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-900">Create New Ticket</span>
              </Link>
              <Link
                href="/ict/support/knowledge"
                className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <MessageSquare className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-900">Knowledge Base</span>
              </Link>
              <Link
                href="/ict/support/chat"
                className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Headphones className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-gray-900">Live Chat Support</span>
              </Link>
              <Link
                href="/ict/support/phone"
                className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Phone className="w-5 h-5 text-orange-600" />
                <span className="text-sm text-gray-900">Phone Support</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Need Immediate Help?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center space-x-3">
            <Phone className="w-6 h-6 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">Phone Support</p>
              <p className="text-sm text-blue-800">+234-1-234-5678</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Mail className="w-6 h-6 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">Email Support</p>
              <p className="text-sm text-blue-800">support@npa.gov.ng</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <MapPin className="w-6 h-6 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">Office Hours</p>
              <p className="text-sm text-blue-800">8:00 AM - 6:00 PM</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
