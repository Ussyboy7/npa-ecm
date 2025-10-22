"use client";

import { useState } from "react";
import {
  FolderOpen,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Calendar,
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  Play,
  Pause,
  Settings,
  BarChart3,
  Users,
  Target,
  TrendingUp
} from "lucide-react";
import Link from "next/link";

export default function ICTProjectsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const projects = [
    {
      id: "PROJ-001",
      name: "NPA Digital Transformation",
      description: "Comprehensive digital transformation initiative to modernize NPA operations",
      status: "In Progress",
      priority: "High",
      startDate: "2024-01-15",
      endDate: "2025-06-30",
      progress: 65,
      budget: "₦15.0B",
      spent: "₦9.8B",
      projectManager: "Engr. Sarah Johnson",
      teamSize: 25,
      department: "ICT Division",
      category: "Digital Transformation",
      technologies: ["React", "Node.js", "PostgreSQL", "AWS"],
      milestones: [
        { name: "Phase 1: Infrastructure Setup", completed: true, date: "2024-03-15" },
        { name: "Phase 2: Core System Development", completed: true, date: "2024-08-30" },
        { name: "Phase 3: Integration & Testing", completed: false, date: "2025-02-28" },
        { name: "Phase 4: Deployment & Training", completed: false, date: "2025-06-30" }
      ]
    },
    {
      id: "PROJ-002",
      name: "Port Management System Upgrade",
      description: "Upgrade existing port management system with new features and improved performance",
      status: "Planning",
      priority: "Medium",
      startDate: "2025-02-01",
      endDate: "2025-08-31",
      progress: 15,
      budget: "₦8.5B",
      spent: "₦1.2B",
      projectManager: "Mr. David Okafor",
      teamSize: 18,
      department: "Marine Operations",
      category: "System Upgrade",
      technologies: ["Vue.js", "Python", "MongoDB", "Docker"],
      milestones: [
        { name: "Requirements Analysis", completed: true, date: "2025-01-15" },
        { name: "System Design", completed: false, date: "2025-03-15" },
        { name: "Development Phase", completed: false, date: "2025-06-30" },
        { name: "Testing & Deployment", completed: false, date: "2025-08-31" }
      ]
    },
    {
      id: "PROJ-003",
      name: "Cybersecurity Enhancement",
      description: "Implement comprehensive cybersecurity measures across all NPA systems",
      status: "In Progress",
      priority: "Critical",
      startDate: "2024-06-01",
      endDate: "2025-03-31",
      progress: 45,
      budget: "₦5.2B",
      spent: "₦2.3B",
      projectManager: "Mrs. Grace Williams",
      teamSize: 12,
      department: "ICT Division",
      category: "Security",
      technologies: ["Firewall", "SIEM", "Endpoint Protection", "VPN"],
      milestones: [
        { name: "Security Assessment", completed: true, date: "2024-07-15" },
        { name: "Infrastructure Hardening", completed: false, date: "2024-12-31" },
        { name: "Security Tools Implementation", completed: false, date: "2025-02-28" },
        { name: "Training & Documentation", completed: false, date: "2025-03-31" }
      ]
    },
    {
      id: "PROJ-004",
      name: "Mobile App Development",
      description: "Develop mobile application for NPA staff and port users",
      status: "Completed",
      priority: "Medium",
      startDate: "2024-03-01",
      endDate: "2024-11-30",
      progress: 100,
      budget: "₦3.8B",
      spent: "₦3.6B",
      projectManager: "Mr. Michael Chen",
      teamSize: 15,
      department: "ICT Division",
      category: "Mobile Development",
      technologies: ["React Native", "Firebase", "Node.js", "MongoDB"],
      milestones: [
        { name: "UI/UX Design", completed: true, date: "2024-04-15" },
        { name: "Core Development", completed: true, date: "2024-08-30" },
        { name: "Testing & QA", completed: true, date: "2024-10-15" },
        { name: "App Store Release", completed: true, date: "2024-11-30" }
      ]
    },
    {
      id: "PROJ-005",
      name: "Data Analytics Platform",
      description: "Build comprehensive data analytics platform for business intelligence",
      status: "On Hold",
      priority: "Low",
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      progress: 5,
      budget: "₦6.5B",
      spent: "₦0.3B",
      projectManager: "Dr. Ahmed Hassan",
      teamSize: 20,
      department: "ICT Division",
      category: "Data Analytics",
      technologies: ["Python", "Apache Spark", "Tableau", "AWS"],
      milestones: [
        { name: "Data Architecture Design", completed: false, date: "2025-02-28" },
        { name: "ETL Pipeline Development", completed: false, date: "2025-06-30" },
        { name: "Analytics Dashboard", completed: false, date: "2025-09-30" },
        { name: "User Training", completed: false, date: "2025-12-31" }
      ]
    }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "planning", label: "Planning" },
    { value: "in_progress", label: "In Progress" },
    { value: "on_hold", label: "On Hold" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" }
  ];

  const priorityOptions = [
    { value: "all", label: "All Priorities" },
    { value: "critical", label: "Critical" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" }
  ];

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.projectManager.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         project.status.toLowerCase().replace(" ", "_") === statusFilter;
    const matchesPriority = priorityFilter === "all" || 
                           project.priority.toLowerCase() === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const statusColorMap = {
    'Planning': 'bg-yellow-100 text-yellow-800',
    'In Progress': 'bg-blue-100 text-blue-800',
    'On Hold': 'bg-gray-100 text-gray-800',
    'Completed': 'bg-green-100 text-green-800',
    'Cancelled': 'bg-red-100 text-red-800'
  };

  const priorityColorMap = {
    'Critical': 'bg-red-100 text-red-800',
    'High': 'bg-orange-100 text-orange-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-green-100 text-green-800'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ICT Projects</h1>
          <p className="text-gray-600">Manage and track ICT projects and initiatives</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/ict/projects/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <BarChart3 className="w-4 h-4 mr-2" />
            Project Analytics
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900">15</p>
            </div>
            <FolderOpen className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Projects</p>
              <p className="text-2xl font-bold text-gray-900">8</p>
            </div>
            <Play className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900">₦39.0B</p>
            </div>
            <Target className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Team Members</p>
              <p className="text-2xl font-bold text-gray-900">90</p>
            </div>
            <Users className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search projects by name, description, or project manager..."
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

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredProjects.map((project) => (
          <div key={project.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <FolderOpen className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[project.status as keyof typeof statusColorMap]}`}>
                    {project.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColorMap[project.priority as keyof typeof priorityColorMap]}`}>
                    {project.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{project.description}</p>
                <div className="text-sm text-gray-500 space-y-1">
                  <p><span className="font-medium">Project Manager:</span> {project.projectManager}</p>
                  <p><span className="font-medium">Department:</span> {project.department}</p>
                  <p><span className="font-medium">Category:</span> {project.category}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Progress</p>
                  <p className="text-sm text-gray-600">{project.progress}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Team Size</p>
                  <p className="text-sm text-gray-600">{project.teamSize} members</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Budget</p>
                  <p className="text-sm text-gray-600">{project.budget}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Spent</p>
                  <p className="text-sm text-gray-600">{project.spent}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Technologies:</p>
                <div className="flex flex-wrap gap-2">
                  {project.technologies.map((tech, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Timeline:</p>
                <div className="text-sm text-gray-600">
                  <p>Start: {project.startDate} | End: {project.endDate}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                    <Play className="w-3 h-3 mr-1" />
                    View Details
                  </button>
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    <Settings className="w-3 h-3 mr-1" />
                    Manage
                  </button>
                </div>
                <Link
                  href={`/ict/projects/${project.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Project →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Project Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/ict/projects/create"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Create Project</h3>
            <p className="text-xs text-gray-500">Start new project</p>
          </Link>
          <Link
            href="/ict/projects/portfolio"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Portfolio View</h3>
            <p className="text-xs text-gray-500">Project portfolio</p>
          </Link>
          <Link
            href="/ict/projects/resources"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Resource Management</h3>
            <p className="text-xs text-gray-500">Manage resources</p>
          </Link>
          <Link
            href="/ict/projects/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <TrendingUp className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Project Reports</h3>
            <p className="text-xs text-gray-500">View reports</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
