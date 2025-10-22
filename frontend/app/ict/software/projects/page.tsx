"use client";

import { useState } from "react";
import {
  Code,
  GitBranch,
  Users,
  Calendar,
  BarChart3,
  Settings,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  FileText,
  Monitor,
  Globe,
  Building,
  MapPin,
  Activity,
  Zap,
  Shield,
  Database,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  GitCommit,
  Bug,
  Star,
  Award
} from "lucide-react";
import Link from "next/link";

export default function SoftwareProjectsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const projectStats = [
    {
      name: "Active Projects",
      value: "12",
      change: "+2",
      changeType: "positive",
      icon: Code,
      description: "Currently in development",
      status: "Growing"
    },
    {
      name: "Completed This Month",
      value: "8",
      change: "+3",
      changeType: "positive",
      icon: CheckCircle,
      description: "Projects delivered",
      status: "Excellent"
    },
    {
      name: "Team Velocity",
      value: "42 SP",
      change: "+5",
      changeType: "positive",
      icon: TrendingUp,
      description: "Story points per sprint",
      status: "Improving"
    },
    {
      name: "Bug Rate",
      value: "2.3%",
      change: "-0.8%",
      changeType: "positive",
      icon: Bug,
      description: "Defects per release",
      status: "Good"
    }
  ];

  const projects = [
    {
      id: "PROJ-001",
      name: "ECM System Enhancement",
      description: "Enhancement of the Electronic Content Management system with new features and performance improvements",
      status: "In Progress",
      priority: "High",
      type: "Enhancement",
      team: "Software Applications Team",
      lead: "Sarah Johnson",
      startDate: "2024-10-01",
      endDate: "2025-02-28",
      progress: 65,
      budget: "₦15.5M",
      spent: "₦9.8M",
      technologies: ["React", "Node.js", "PostgreSQL", "Docker"],
      repository: "npa-ecm/enhancement-v2",
      branches: 8,
      commits: 247,
      issues: 12,
      pullRequests: 5,
      codeQuality: {
        coverage: 87,
        complexity: 12,
        maintainability: "A",
        security: "B+"
      },
      metrics: {
        velocity: 35,
        burndown: 78,
        teamSatisfaction: 4.2,
        clientSatisfaction: 4.5
      },
      milestones: [
        { name: "Requirements Analysis", status: "Completed", date: "2024-10-15" },
        { name: "System Design", status: "Completed", date: "2024-11-01" },
        { name: "Core Development", status: "In Progress", date: "2024-12-15" },
        { name: "Testing & QA", status: "Pending", date: "2025-01-15" },
        { name: "Deployment", status: "Pending", date: "2025-02-28" }
      ]
    },
    {
      id: "PROJ-002",
      name: "Port Management Mobile App",
      description: "Development of a mobile application for port operations management and real-time monitoring",
      status: "Planning",
      priority: "Medium",
      type: "New Development",
      team: "Mobile Development Team",
      lead: "David Okafor",
      startDate: "2024-12-15",
      endDate: "2025-06-30",
      progress: 15,
      budget: "₦22.0M",
      spent: "₦2.1M",
      technologies: ["React Native", "TypeScript", "Firebase", "AWS"],
      repository: "npa-mobile/port-management",
      branches: 3,
      commits: 45,
      issues: 8,
      pullRequests: 2,
      codeQuality: {
        coverage: 0,
        complexity: 0,
        maintainability: "N/A",
        security: "N/A"
      },
      metrics: {
        velocity: 0,
        burndown: 0,
        teamSatisfaction: 0,
        clientSatisfaction: 0
      },
      milestones: [
        { name: "Project Setup", status: "In Progress", date: "2024-12-15" },
        { name: "UI/UX Design", status: "Pending", date: "2025-01-15" },
        { name: "Core Development", status: "Pending", date: "2025-02-15" },
        { name: "Testing & QA", status: "Pending", date: "2025-05-15" },
        { name: "App Store Release", status: "Pending", date: "2025-06-30" }
      ]
    },
    {
      id: "PROJ-003",
      name: "API Gateway Migration",
      description: "Migration of legacy APIs to a modern API gateway with improved security and monitoring",
      status: "In Progress",
      priority: "High",
      type: "Migration",
      team: "Backend Team",
      lead: "Grace Williams",
      startDate: "2024-11-01",
      endDate: "2025-01-31",
      progress: 78,
      budget: "₦8.5M",
      spent: "₦6.2M",
      technologies: ["Kong", "Docker", "Kubernetes", "Prometheus"],
      repository: "npa-backend/api-gateway",
      branches: 12,
      commits: 189,
      issues: 6,
      pullRequests: 8,
      codeQuality: {
        coverage: 92,
        complexity: 8,
        maintainability: "A+",
        security: "A"
      },
      metrics: {
        velocity: 28,
        burndown: 85,
        teamSatisfaction: 4.4,
        clientSatisfaction: 4.3
      },
      milestones: [
        { name: "Architecture Design", status: "Completed", date: "2024-11-15" },
        { name: "Gateway Setup", status: "Completed", date: "2024-11-30" },
        { name: "API Migration", status: "In Progress", date: "2024-12-31" },
        { name: "Testing & Validation", status: "Pending", date: "2025-01-15" },
        { name: "Production Deployment", status: "Pending", date: "2025-01-31" }
      ]
    },
    {
      id: "PROJ-004",
      name: "Data Analytics Dashboard",
      description: "Development of a comprehensive data analytics dashboard for business intelligence and reporting",
      status: "Completed",
      priority: "Medium",
      type: "New Development",
      team: "Data Analytics Team",
      lead: "Ahmed Hassan",
      startDate: "2024-08-01",
      endDate: "2024-11-30",
      progress: 100,
      budget: "₦12.0M",
      spent: "₦11.8M",
      technologies: ["Python", "Django", "PostgreSQL", "Chart.js"],
      repository: "npa-analytics/dashboard",
      branches: 15,
      commits: 312,
      issues: 0,
      pullRequests: 0,
      codeQuality: {
        coverage: 89,
        complexity: 15,
        maintainability: "A",
        security: "A-"
      },
      metrics: {
        velocity: 32,
        burndown: 100,
        teamSatisfaction: 4.6,
        clientSatisfaction: 4.7
      },
      milestones: [
        { name: "Requirements Gathering", status: "Completed", date: "2024-08-15" },
        { name: "Data Model Design", status: "Completed", date: "2024-09-01" },
        { name: "Backend Development", status: "Completed", date: "2024-10-15" },
        { name: "Frontend Development", status: "Completed", date: "2024-11-15" },
        { name: "Testing & Deployment", status: "Completed", date: "2024-11-30" }
      ]
    },
    {
      id: "PROJ-005",
      name: "Security Audit Tool",
      description: "Development of an automated security auditing tool for code and infrastructure scanning",
      status: "In Progress",
      priority: "Critical",
      type: "Security",
      team: "Security Team",
      lead: "Michael Chen",
      startDate: "2024-09-15",
      endDate: "2025-03-31",
      progress: 45,
      budget: "₦18.0M",
      spent: "₦7.2M",
      technologies: ["Python", "FastAPI", "PostgreSQL", "Docker"],
      repository: "npa-security/audit-tool",
      branches: 6,
      commits: 156,
      issues: 15,
      pullRequests: 4,
      codeQuality: {
        coverage: 76,
        complexity: 18,
        maintainability: "B+",
        security: "A+"
      },
      metrics: {
        velocity: 22,
        burndown: 45,
        teamSatisfaction: 4.1,
        clientSatisfaction: 4.2
      },
      milestones: [
        { name: "Security Requirements", status: "Completed", date: "2024-10-01" },
        { name: "Tool Architecture", status: "Completed", date: "2024-10-30" },
        { name: "Core Development", status: "In Progress", date: "2025-01-15" },
        { name: "Security Testing", status: "Pending", date: "2025-02-28" },
        { name: "Production Deployment", status: "Pending", date: "2025-03-31" }
      ]
    }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "planning", label: "Planning" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "on_hold", label: "On Hold" },
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
                         project.team.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         project.status.toLowerCase().replace(" ", "_") === statusFilter;
    const matchesPriority = priorityFilter === "all" || 
                           project.priority.toLowerCase() === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const statusColorMap = {
    'Planning': 'bg-yellow-100 text-yellow-800',
    'In Progress': 'bg-blue-100 text-blue-800',
    'Completed': 'bg-green-100 text-green-800',
    'On Hold': 'bg-gray-100 text-gray-800',
    'Cancelled': 'bg-red-100 text-red-800'
  };

  const priorityColorMap = {
    'Critical': 'bg-red-100 text-red-800',
    'High': 'bg-orange-100 text-orange-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-green-100 text-green-800'
  };

  const typeColorMap = {
    'New Development': 'bg-blue-100 text-blue-800',
    'Enhancement': 'bg-green-100 text-green-800',
    'Migration': 'bg-purple-100 text-purple-800',
    'Security': 'bg-red-100 text-red-800'
  };

  const getQualityColor = (grade: string) => {
    switch (grade) {
      case 'A+': return 'bg-green-100 text-green-800';
      case 'A': return 'bg-green-100 text-green-800';
      case 'A-': return 'bg-green-100 text-green-800';
      case 'B+': return 'bg-yellow-100 text-yellow-800';
      case 'B': return 'bg-yellow-100 text-yellow-800';
      case 'B-': return 'bg-yellow-100 text-yellow-800';
      case 'C+': return 'bg-orange-100 text-orange-800';
      case 'C': return 'bg-orange-100 text-orange-800';
      case 'C-': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Software Projects</h1>
          <p className="text-gray-600">Manage and monitor software development projects</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/ict/software/projects/create"
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

      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {projectStats.map((stat) => (
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
                stat.status === 'Growing' ? 'bg-green-100 text-green-800' :
                stat.status === 'Excellent' ? 'bg-blue-100 text-blue-800' :
                stat.status === 'Improving' ? 'bg-purple-100 text-purple-800' :
                'bg-yellow-100 text-yellow-800'
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
                placeholder="Search projects by name, description, or team..."
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
                  <Code className="w-6 h-6 text-blue-600" />
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
                  <p><span className="font-medium">Team:</span> {project.team}</p>
                  <p><span className="font-medium">Lead:</span> {project.lead}</p>
                  <p><span className="font-medium">Type:</span> {project.type}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg">
                  <GitBranch className="w-4 h-4" />
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
                  <p className="text-sm font-medium text-gray-900">Budget</p>
                  <p className="text-sm text-gray-600">{project.spent} / {project.budget}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Repository</p>
                  <p className="text-sm text-gray-600">{project.repository}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Duration</p>
                  <p className="text-sm text-gray-600">{project.startDate} - {project.endDate}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Project Progress</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      project.progress >= 90 ? 'bg-green-600' :
                      project.progress >= 70 ? 'bg-blue-600' :
                      project.progress >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                    }`}
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
                <p className="text-sm font-medium text-gray-900 mb-2">Code Quality:</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>Coverage</span>
                    <span>{project.codeQuality.coverage}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>Complexity</span>
                    <span>{project.codeQuality.complexity}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>Maintainability</span>
                    <span className={`px-1 py-0.5 text-xs rounded ${getQualityColor(project.codeQuality.maintainability)}`}>
                      {project.codeQuality.maintainability}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>Security</span>
                    <span className={`px-1 py-0.5 text-xs rounded ${getQualityColor(project.codeQuality.security)}`}>
                      {project.codeQuality.security}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Repository Stats:</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>Branches</span>
                    <span>{project.branches}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>Commits</span>
                    <span>{project.commits}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>Issues</span>
                    <span>{project.issues}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>Pull Requests</span>
                    <span>{project.pullRequests}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                    <BarChart3 className="w-3 h-3 mr-1" />
                    Analytics
                  </button>
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    <GitBranch className="w-3 h-3 mr-1" />
                    Repository
                  </button>
                </div>
                <Link
                  href={`/ict/software/projects/${project.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Software Development Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/ict/software/projects/create"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Create Project</h3>
            <p className="text-xs text-gray-500">Start new project</p>
          </Link>
          <Link
            href="/ict/software/quality"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Award className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Code Quality</h3>
            <p className="text-xs text-gray-500">Quality metrics</p>
          </Link>
          <Link
            href="/ict/software/bugs"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Bug className="h-8 w-8 text-red-600 mb-3" />
            <h3 className="font-medium text-sm">Bug Tracking</h3>
            <p className="text-xs text-gray-500">Manage bugs</p>
          </Link>
          <Link
            href="/ict/software/deployments"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Zap className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Deployments</h3>
            <p className="text-xs text-gray-500">Deployment history</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
