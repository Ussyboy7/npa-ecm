"use client";

import { useState } from "react";
import {
  Bug,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Calendar,
  Tag,
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
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  MapPin,
  Building,
  Users,
  Activity,
  Globe,
  Zap,
  Shield,
  Database,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  Award,
  Star,
  Briefcase,
  Target,
  Monitor,
  Smartphone,
  Laptop,
  Printer,
  Camera,
  Wrench,
  Tool,
  Router,
  Server,
  Wifi,
  GitCommit,
  Code,
  GitBranch,
  Play,
  Pause,
  Stop,
  ArrowUp,
  ArrowDown,
  Circle,
  Square,
  Triangle
} from "lucide-react";
import Link from "next/link";

export default function SoftwareBugsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const bugStats = [
    {
      name: "Total Bugs",
      value: "247",
      change: "+12",
      changeType: "warning",
      icon: Bug,
      description: "All reported bugs",
      status: "Growing"
    },
    {
      name: "Critical Bugs",
      value: "8",
      change: "-3",
      changeType: "positive",
      icon: AlertTriangle,
      description: "Require immediate fix",
      status: "Reducing"
    },
    {
      name: "Resolved Today",
      value: "15",
      change: "+5",
      changeType: "positive",
      icon: CheckCircle,
      description: "Bugs fixed today",
      status: "Active"
    },
    {
      name: "Avg. Resolution Time",
      value: "2.3 days",
      change: "-0.5 days",
      changeType: "positive",
      icon: Clock,
      description: "Time to fix bugs",
      status: "Improving"
    }
  ];

  const bugs = [
    {
      id: "BUG-001",
      title: "Login page crashes on mobile devices",
      description: "The login page crashes when accessed from mobile devices running iOS 15+ and Android 12+. The crash occurs when users tap the login button after entering credentials.",
      priority: "Critical",
      status: "Open",
      severity: "High",
      type: "Crash",
      reporter: "john.doe@npa.gov.ng",
      assignee: "sarah.wilson@npa.gov.ng",
      project: "ECM System Enhancement",
      component: "Authentication Module",
      version: "v2.1.3",
      environment: "Production",
      browser: "Mobile Safari, Chrome Mobile",
      os: "iOS 15+, Android 12+",
      created: "2024-12-10 14:30:25",
      updated: "2024-12-10 16:45:10",
      dueDate: "2024-12-12",
      estimatedHours: 8,
      actualHours: 0,
      tags: ["mobile", "authentication", "crash", "ios", "android"],
      steps: [
        "Open the application on a mobile device",
        "Navigate to the login page",
        "Enter valid credentials",
        "Tap the login button",
        "Application crashes immediately"
      ],
      expectedResult: "User should be logged in successfully",
      actualResult: "Application crashes with error code 0x0000001",
      attachments: ["crash_log.txt", "screenshot.png"],
      comments: [
        {
          author: "sarah.wilson@npa.gov.ng",
          timestamp: "2024-12-10 15:20:00",
          content: "Investigating the crash logs. This appears to be related to the new authentication library we integrated last week."
        },
        {
          author: "mike.chen@npa.gov.ng",
          timestamp: "2024-12-10 16:30:00",
          content: "I've identified the issue. It's a memory leak in the JWT token validation. Working on a fix."
        }
      ],
      relatedBugs: ["BUG-002", "BUG-015"],
      testCases: ["TC-AUTH-001", "TC-AUTH-002"],
      resolution: null
    },
    {
      id: "BUG-002",
      title: "Data export functionality returns corrupted files",
      description: "When users attempt to export data in Excel format, the generated files are corrupted and cannot be opened. This affects all export functions across the system.",
      priority: "High",
      status: "In Progress",
      severity: "High",
      type: "Functional",
      reporter: "jane.smith@npa.gov.ng",
      assignee: "alex.rodriguez@npa.gov.ng",
      project: "ECM System Enhancement",
      component: "Export Module",
      version: "v2.1.3",
      environment: "Production",
      browser: "All browsers",
      os: "All operating systems",
      created: "2024-12-09 10:15:30",
      updated: "2024-12-10 14:20:45",
      dueDate: "2024-12-13",
      estimatedHours: 12,
      actualHours: 6,
      tags: ["export", "excel", "data", "corruption"],
      steps: [
        "Navigate to any data listing page",
        "Click on the Export button",
        "Select Excel format",
        "Click Export",
        "Download the generated file",
        "Attempt to open the file in Excel"
      ],
      expectedResult: "File should open correctly in Excel with all data intact",
      actualResult: "Excel shows error 'File format is not valid' and cannot open the file",
      attachments: ["corrupted_file.xlsx", "error_screenshot.png"],
      comments: [
        {
          author: "alex.rodriguez@npa.gov.ng",
          timestamp: "2024-12-09 11:00:00",
          content: "Looking into the Excel generation library. This might be a version compatibility issue."
        },
        {
          author: "alex.rodriguez@npa.gov.ng",
          timestamp: "2024-12-10 14:20:00",
          content: "Found the issue. The library is not properly handling large datasets. Implementing a fix with chunked processing."
        }
      ],
      relatedBugs: ["BUG-001"],
      testCases: ["TC-EXPORT-001", "TC-EXPORT-002"],
      resolution: null
    },
    {
      id: "BUG-003",
      title: "Search results not displaying correctly in dark mode",
      description: "When dark mode is enabled, search results are displayed with poor contrast making them difficult to read. Text appears in dark gray on dark background.",
      priority: "Medium",
      status: "Resolved",
      severity: "Medium",
      type: "UI/UX",
      reporter: "david.brown@npa.gov.ng",
      assignee: "emma.davis@npa.gov.ng",
      project: "ECM System Enhancement",
      component: "Search Module",
      version: "v2.1.2",
      environment: "Production",
      browser: "All browsers",
      os: "All operating systems",
      created: "2024-12-08 16:45:20",
      updated: "2024-12-10 09:30:15",
      dueDate: "2024-12-11",
      estimatedHours: 4,
      actualHours: 3,
      tags: ["ui", "dark-mode", "search", "accessibility"],
      steps: [
        "Enable dark mode in user settings",
        "Navigate to the search page",
        "Enter a search query",
        "View the search results"
      ],
      expectedResult: "Search results should be clearly visible with proper contrast",
      actualResult: "Search results text is barely visible due to poor contrast",
      attachments: ["dark_mode_screenshot.png"],
      comments: [
        {
          author: "emma.davis@npa.gov.ng",
          timestamp: "2024-12-08 17:00:00",
          content: "This is a CSS issue with the dark mode theme. I'll update the color scheme for search results."
        },
        {
          author: "emma.davis@npa.gov.ng",
          timestamp: "2024-12-10 09:30:00",
          content: "Fixed the contrast issue. Updated the CSS variables for dark mode search results. Ready for testing."
        }
      ],
      relatedBugs: [],
      testCases: ["TC-UI-001", "TC-ACCESSIBILITY-001"],
      resolution: {
        status: "Fixed",
        description: "Updated CSS color variables for dark mode search results to improve contrast and readability.",
        fixedBy: "emma.davis@npa.gov.ng",
        fixedDate: "2024-12-10 09:30:00",
        testedBy: "qa.team@npa.gov.ng",
        testedDate: "2024-12-10 10:15:00"
      }
    },
    {
      id: "BUG-004",
      title: "Performance degradation in document upload",
      description: "Document upload functionality has become significantly slower, taking 3-4 times longer than expected. This affects user productivity and system performance.",
      priority: "High",
      status: "Open",
      severity: "Medium",
      type: "Performance",
      reporter: "lisa.garcia@npa.gov.ng",
      assignee: "tom.wilson@npa.gov.ng",
      project: "ECM System Enhancement",
      component: "File Upload Module",
      version: "v2.1.3",
      environment: "Production",
      browser: "All browsers",
      os: "All operating systems",
      created: "2024-12-10 11:20:15",
      updated: "2024-12-10 15:45:30",
      dueDate: "2024-12-14",
      estimatedHours: 16,
      actualHours: 2,
      tags: ["performance", "upload", "file", "slow"],
      steps: [
        "Navigate to document upload page",
        "Select a file to upload (any size)",
        "Click upload button",
        "Observe upload progress and timing"
      ],
      expectedResult: "File should upload within reasonable time (under 30 seconds for 10MB file)",
      actualResult: "Upload takes 2-3 minutes for 10MB file, significantly slower than before",
      attachments: ["performance_log.txt", "upload_timing.png"],
      comments: [
        {
          author: "tom.wilson@npa.gov.ng",
          timestamp: "2024-12-10 12:00:00",
          content: "Checking the server logs and database performance. This might be related to the recent database migration."
        },
        {
          author: "tom.wilson@npa.gov.ng",
          timestamp: "2024-12-10 15:45:00",
          content: "Found the issue. The file processing pipeline is not optimized for the new database structure. Working on optimization."
        }
      ],
      relatedBugs: [],
      testCases: ["TC-PERFORMANCE-001", "TC-UPLOAD-001"],
      resolution: null
    },
    {
      id: "BUG-005",
      title: "Email notifications not being sent for document approvals",
      description: "Users are not receiving email notifications when documents are approved or rejected. This affects workflow transparency and user awareness.",
      priority: "Medium",
      status: "In Progress",
      severity: "Medium",
      type: "Integration",
      reporter: "robert.jones@npa.gov.ng",
      assignee: "sophia.martinez@npa.gov.ng",
      project: "ECM System Enhancement",
      component: "Notification Service",
      version: "v2.1.3",
      environment: "Production",
      browser: "N/A",
      os: "Server",
      created: "2024-12-09 14:30:45",
      updated: "2024-12-10 13:15:20",
      dueDate: "2024-12-12",
      estimatedHours: 6,
      actualHours: 4,
      tags: ["email", "notifications", "workflow", "integration"],
      steps: [
        "Submit a document for approval",
        "Have an approver approve or reject the document",
        "Check if the submitter receives an email notification"
      ],
      expectedResult: "Submitter should receive an email notification about the approval/rejection",
      actualResult: "No email notification is sent to the submitter",
      attachments: ["notification_log.txt", "email_config.png"],
      comments: [
        {
          author: "sophia.martinez@npa.gov.ng",
          timestamp: "2024-12-09 15:00:00",
          content: "Checking the email service configuration and notification triggers."
        },
        {
          author: "sophia.martinez@npa.gov.ng",
          timestamp: "2024-12-10 13:15:00",
          content: "Found the issue. The email service API key expired. I've updated it and restarted the service."
        }
      ],
      relatedBugs: [],
      testCases: ["TC-NOTIFICATION-001", "TC-EMAIL-001"],
      resolution: null
    }
  ];

  const priorityOptions = [
    { value: "all", label: "All Priorities" },
    { value: "critical", label: "Critical" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In Progress" },
    { value: "resolved", label: "Resolved" },
    { value: "closed", label: "Closed" },
    { value: "reopened", label: "Reopened" }
  ];

  const filteredBugs = bugs.filter(bug => {
    const matchesSearch = bug.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bug.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bug.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bug.reporter.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = priorityFilter === "all" || 
                           bug.priority.toLowerCase() === priorityFilter;
    const matchesStatus = statusFilter === "all" || 
                         bug.status.toLowerCase().replace(" ", "_") === statusFilter;
    
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const priorityColorMap = {
    'Critical': 'bg-red-100 text-red-800',
    'High': 'bg-orange-100 text-orange-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-green-100 text-green-800'
  };

  const statusColorMap = {
    'Open': 'bg-red-100 text-red-800',
    'In Progress': 'bg-blue-100 text-blue-800',
    'Resolved': 'bg-green-100 text-green-800',
    'Closed': 'bg-gray-100 text-gray-800',
    'Reopened': 'bg-purple-100 text-purple-800'
  };

  const severityColorMap = {
    'High': 'bg-red-100 text-red-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-green-100 text-green-800'
  };

  const typeIconMap = {
    'Crash': AlertTriangle,
    'Functional': Bug,
    'UI/UX': Eye,
    'Performance': Zap,
    'Integration': Network
  };

  const getProgressPercentage = (actualHours: number, estimatedHours: number) => {
    return Math.min((actualHours / estimatedHours) * 100, 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Software Bugs</h1>
          <p className="text-gray-600">Track and manage software bugs and issues across all projects</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/ict/software/bugs/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Report Bug
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Bug Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {bugStats.map((stat) => (
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
                stat.status === 'Growing' ? 'bg-red-100 text-red-800' :
                stat.status === 'Reducing' ? 'bg-green-100 text-green-800' :
                stat.status === 'Active' ? 'bg-blue-100 text-blue-800' :
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
                placeholder="Search bugs by title, description, ID, or reporter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
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
            <button className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Bugs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredBugs.map((bug) => {
          const TypeIcon = typeIconMap[bug.type as keyof typeof typeIconMap] || Bug;
          const progressPercentage = getProgressPercentage(bug.actualHours, bug.estimatedHours);
          
          return (
            <div key={bug.id} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <TypeIcon className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{bug.title}</h3>
                    <span className="text-sm text-gray-500">#{bug.id}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{bug.description}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColorMap[bug.priority as keyof typeof priorityColorMap]}`}>
                      {bug.priority}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[bug.status as keyof typeof statusColorMap]}`}>
                      {bug.status}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityColorMap[bug.severity as keyof typeof severityColorMap]}`}>
                      {bug.severity}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      {bug.type}
                    </span>
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
                    <BarChart3 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Reporter</p>
                    <p className="text-sm text-gray-600">{bug.reporter}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Assignee</p>
                    <p className="text-sm text-gray-600">{bug.assignee}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Project</p>
                    <p className="text-sm text-gray-600">{bug.project}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Component</p>
                    <p className="text-sm text-gray-600">{bug.component}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Created</p>
                    <p className="text-sm text-gray-600">{bug.created}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Due Date</p>
                    <p className="text-sm text-gray-600">{bug.dueDate}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{bug.actualHours}h / {bug.estimatedHours}h</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        progressPercentage >= 80 ? 'bg-green-600' :
                        progressPercentage >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                      }`}
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Tags:</p>
                  <div className="flex flex-wrap gap-1">
                    {bug.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Environment:</p>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Version:</span> {bug.version}</p>
                    <p><span className="font-medium">Environment:</span> {bug.environment}</p>
                    <p><span className="font-medium">Browser:</span> {bug.browser}</p>
                    <p><span className="font-medium">OS:</span> {bug.os}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Recent Comments:</p>
                  <div className="space-y-2">
                    {bug.comments.slice(-2).map((comment, index) => (
                      <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{comment.author}</span>
                          <span>{comment.timestamp}</span>
                        </div>
                        <p>{comment.content}</p>
                      </div>
                    ))}
                    {bug.comments.length > 2 && (
                      <div className="text-xs text-blue-600">
                        +{bug.comments.length - 2} more comments
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    <button className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                      <Eye className="w-3 h-3 mr-1" />
                      View Details
                    </button>
                    <button className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </button>
                  </div>
                  <Link
                    href={`/ict/software/bugs/${bug.id}`}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    View Full Report →
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bug Analysis Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Bug Analysis Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Critical Bugs</h3>
                <p className="text-xs text-gray-500">Require immediate attention</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {bugs.filter(bug => bug.priority === 'Critical').length}</p>
              <p>Avg. Resolution: 1.2 days</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Bug className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">High Priority</h3>
                <p className="text-xs text-gray-500">Need quick resolution</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {bugs.filter(bug => bug.priority === 'High').length}</p>
              <p>Avg. Resolution: 2.1 days</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Resolved Today</h3>
                <p className="text-xs text-gray-500">Successfully fixed</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {bugs.filter(bug => bug.status === 'Resolved').length}</p>
              <p>Success Rate: 95%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Avg. Resolution Time</h3>
                <p className="text-xs text-gray-500">Time to fix bugs</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Current: 2.3 days</p>
              <p>Target: &lt; 2.0 days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Bug Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/ict/software/bugs/create"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Report Bug</h3>
            <p className="text-xs text-gray-500">Create new bug report</p>
          </Link>
          <Link
            href="/ict/software/bugs/assign"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <User className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Assign Bugs</h3>
            <p className="text-xs text-gray-500">Manage assignments</p>
          </Link>
          <Link
            href="/ict/software/bugs/analytics"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Bug Analytics</h3>
            <p className="text-xs text-gray-500">View analytics</p>
          </Link>
          <Link
            href="/ict/software/bugs/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Bug Reports</h3>
            <p className="text-xs text-gray-500">Generate reports</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
