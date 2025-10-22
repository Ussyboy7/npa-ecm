"use client";

import { useState } from "react";
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  GitMerge,
  Users,
  Star,
  Eye,
  Filter,
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Minus,
  FileText,
  MapPin,
  Building,
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
  Briefcase,
  DollarSign,
  Percent,
  ArrowUp,
  ArrowDown,
  Circle,
  Square,
  Triangle,
  Monitor,
  Smartphone,
  Laptop,
  Printer,
  Camera,
  Wrench,
  Tool,
  Router,
  Server,
  Code,
  Play,
  Pause,
  Stop,
  Wifi,
  Bug,
  User,
  Target,
  Gauge,
  Zap as Lightning,
  Layers,
  Link as LinkIcon,
  WifiOff,
  Signal,
  Wifi as WifiIcon,
  Video,
  Headphones,
  Presentation,
  FileVideo,
  Book,
  PenTool,
  Clipboard,
  CheckSquare,
  Square as SquareIcon,
  Navigation,
  Waves,
  Wind,
  Droplets,
  Thermometer,
  Gauge as Speedometer,
  Route,
  Flag,
  Map,
  Settings,
  BarChart3,
  PieChart,
  Github,
  GitFork,
  Lock,
  Unlock,
  ExternalLink,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import Link from "next/link";

export default function ICTSoftwareRepositoriesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");

  const repoStats = [
    {
      name: "Total Repositories",
      value: "47",
      change: "+12",
      changeType: "positive",
      icon: GitBranch,
      description: "Active repositories",
      status: "Growing"
    },
    {
      name: "Active Contributors",
      value: "23",
      change: "+3",
      changeType: "positive",
      icon: Users,
      description: "Monthly active developers",
      status: "Active"
    },
    {
      name: "Open Pull Requests",
      value: "18",
      change: "+5",
      changeType: "positive",
      icon: GitPullRequest,
      description: "Pending reviews",
      status: "Busy"
    },
    {
      name: "Code Quality Score",
      value: "87%",
      change: "+2%",
      changeType: "positive",
      icon: Award,
      description: "Average across repos",
      status: "Excellent"
    }
  ];

  const repositories = [
    {
      id: "repo-001",
      name: "npa-ecm-backend",
      fullName: "npa-ports/npa-ecm-backend",
      description: "Backend API for NPA Electronic Content Management System built with Django REST Framework",
      visibility: "Private",
      language: "Python",
      size: "45.2 MB",
      createdAt: "2024-01-15T10:30:00Z",
      updatedAt: "2024-12-10T14:45:00Z",
      stars: 12,
      forks: 8,
      watchers: 15,
      openIssues: 3,
      openPullRequests: 5,
      contributors: 8,
      commits: 1247,
      branches: 12,
      releases: 15,
      lastCommit: "2024-12-10T14:45:00Z",
      primaryBranch: "main",
      topics: ["django", "rest-api", "npa", "ecm", "backend"],
      collaborators: [
        { name: "Dr. Sarah Johnson", role: "Admin", avatar: "/avatars/sarah.jpg" },
        { name: "Eng. Michael Adebayo", role: "Maintainer", avatar: "/avatars/michael.jpg" },
        { name: "Mrs. Grace Okonkwo", role: "Developer", avatar: "/avatars/grace.jpg" }
      ],
      ciStatus: "Passing",
      coverage: 87.5,
      languages: {
        "Python": 78.3,
        "JavaScript": 15.2,
        "YAML": 4.5,
        "Dockerfile": 1.2,
        "Other": 0.8
      },
      dependencies: {
        total: 45,
        outdated: 3,
        vulnerable: 0
      },
      security: {
        alerts: 0,
        severity: "None",
        lastScan: "2024-12-09T23:00:00Z"
      },
      activity: {
        commitsLastWeek: 23,
        commitsLastMonth: 89,
        contributorsLastMonth: 5
      },
      project: "ECM System",
      team: "Backend Team",
      status: "Active",
      archived: false,
      template: false,
      license: "MIT",
      readme: true,
      contributing: true,
      codeOfConduct: true,
      issueTemplates: true,
      pullRequestTemplate: true,
      branchProtection: true,
      requiredReviews: 2,
      requiredChecks: ["tests", "lint", "security"],
      autoMerge: false,
      dependabot: true,
      codeql: true,
      repositoryUrl: "https://github.com/npa-ports/npa-ecm-backend",
      cloneUrl: "https://github.com/npa-ports/npa-ecm-backend.git"
    },
    {
      id: "repo-002",
      name: "npa-ecm-frontend",
      fullName: "npa-ports/npa-ecm-frontend",
      description: "Modern React-based frontend for NPA Electronic Content Management System",
      visibility: "Private",
      language: "TypeScript",
      size: "89.7 MB",
      createdAt: "2024-01-20T09:15:00Z",
      updatedAt: "2024-12-10T13:20:00Z",
      stars: 8,
      forks: 5,
      watchers: 12,
      openIssues: 7,
      openPullRequests: 3,
      contributors: 6,
      commits: 956,
      branches: 8,
      releases: 12,
      lastCommit: "2024-12-10T13:20:00Z",
      primaryBranch: "main",
      topics: ["react", "typescript", "nextjs", "tailwind", "frontend"],
      collaborators: [
        { name: "Eng. Michael Adebayo", role: "Admin", avatar: "/avatars/michael.jpg" },
        { name: "Mr. David Okafor", role: "Maintainer", avatar: "/avatars/david.jpg" },
        { name: "Mrs. Funmi Adebayo", role: "Developer", avatar: "/avatars/funmi.jpg" }
      ],
      ciStatus: "Passing",
      coverage: 82.3,
      languages: {
        "TypeScript": 65.4,
        "JavaScript": 18.7,
        "CSS": 12.1,
        "HTML": 2.8,
        "JSON": 1.0
      },
      dependencies: {
        total: 67,
        outdated: 5,
        vulnerable: 1
      },
      security: {
        alerts: 1,
        severity: "Low",
        lastScan: "2024-12-09T22:30:00Z"
      },
      activity: {
        commitsLastWeek: 18,
        commitsLastMonth: 67,
        contributorsLastMonth: 4
      },
      project: "ECM System",
      team: "Frontend Team",
      status: "Active",
      archived: false,
      template: false,
      license: "MIT",
      readme: true,
      contributing: true,
      codeOfConduct: true,
      issueTemplates: true,
      pullRequestTemplate: true,
      branchProtection: true,
      requiredReviews: 2,
      requiredChecks: ["build", "test", "lint"],
      autoMerge: false,
      dependabot: true,
      codeql: true,
      repositoryUrl: "https://github.com/npa-ports/npa-ecm-frontend",
      cloneUrl: "https://github.com/npa-ports/npa-ecm-frontend.git"
    },
    {
      id: "repo-003",
      name: "npa-infrastructure-as-code",
      fullName: "npa-ports/npa-infrastructure-as-code",
      description: "Infrastructure as Code repository for NPA cloud infrastructure and deployments",
      visibility: "Private",
      language: "HCL",
      size: "23.4 MB",
      createdAt: "2024-02-10T11:45:00Z",
      updatedAt: "2024-12-09T16:30:00Z",
      stars: 6,
      forks: 3,
      watchers: 8,
      openIssues: 2,
      openPullRequests: 1,
      contributors: 4,
      commits: 345,
      branches: 5,
      releases: 8,
      lastCommit: "2024-12-09T16:30:00Z",
      primaryBranch: "main",
      topics: ["terraform", "aws", "infrastructure", "iac", "cloud"],
      collaborators: [
        { name: "Mrs. Funmi Adebayo", role: "Admin", avatar: "/avatars/funmi.jpg" },
        { name: "Eng. Michael Adebayo", role: "Maintainer", avatar: "/avatars/michael.jpg" },
        { name: "Mr. Chinedu Nwosu", role: "Developer", avatar: "/avatars/chinedu.jpg" }
      ],
      ciStatus: "Passing",
      coverage: 0,
      languages: {
        "HCL": 85.6,
        "YAML": 8.9,
        "Shell": 3.4,
        "Python": 2.1
      },
      dependencies: {
        total: 12,
        outdated: 1,
        vulnerable: 0
      },
      security: {
        alerts: 0,
        severity: "None",
        lastScan: "2024-12-08T23:45:00Z"
      },
      activity: {
        commitsLastWeek: 5,
        commitsLastMonth: 23,
        contributorsLastMonth: 2
      },
      project: "Infrastructure",
      team: "DevOps Team",
      status: "Active",
      archived: false,
      template: false,
      license: "MIT",
      readme: true,
      contributing: true,
      codeOfConduct: true,
      issueTemplates: true,
      pullRequestTemplate: true,
      branchProtection: true,
      requiredReviews: 2,
      requiredChecks: ["terraform-validate", "terraform-plan"],
      autoMerge: false,
      dependabot: true,
      codeql: false,
      repositoryUrl: "https://github.com/npa-ports/npa-infrastructure-as-code",
      cloneUrl: "https://github.com/npa-ports/npa-infrastructure-as-code.git"
    },
    {
      id: "repo-004",
      name: "npa-mobile-app",
      fullName: "npa-ports/npa-mobile-app",
      description: "Cross-platform mobile application for NPA port operations and document access",
      visibility: "Private",
      language: "Dart",
      size: "156.8 MB",
      createdAt: "2024-03-05T14:20:00Z",
      updatedAt: "2024-12-10T10:15:00Z",
      stars: 4,
      forks: 2,
      watchers: 6,
      openIssues: 8,
      openPullRequests: 4,
      contributors: 3,
      commits: 678,
      branches: 6,
      releases: 5,
      lastCommit: "2024-12-10T10:15:00Z",
      primaryBranch: "main",
      topics: ["flutter", "mobile", "cross-platform", "dart", "firebase"],
      collaborators: [
        { name: "Mr. Chinedu Nwosu", role: "Admin", avatar: "/avatars/chinedu.jpg" },
        { name: "Mr. David Okafor", role: "Maintainer", avatar: "/avatars/david.jpg" },
        { name: "Mrs. Grace Okonkwo", role: "Developer", avatar: "/avatars/grace.jpg" }
      ],
      ciStatus: "Failing",
      coverage: 74.2,
      languages: {
        "Dart": 92.3,
        "YAML": 5.2,
        "JSON": 1.8,
        "Markdown": 0.7
      },
      dependencies: {
        total: 34,
        outdated: 7,
        vulnerable: 2
      },
      security: {
        alerts: 2,
        severity: "Medium",
        lastScan: "2024-12-09T21:00:00Z"
      },
      activity: {
        commitsLastWeek: 12,
        commitsLastMonth: 45,
        contributorsLastMonth: 3
      },
      project: "Mobile Application",
      team: "Mobile Team",
      status: "Active",
      archived: false,
      template: false,
      license: "MIT",
      readme: true,
      contributing: true,
      codeOfConduct: true,
      issueTemplates: true,
      pullRequestTemplate: true,
      branchProtection: true,
      requiredReviews: 1,
      requiredChecks: ["flutter-test", "flutter-build"],
      autoMerge: false,
      dependabot: true,
      codeql: true,
      repositoryUrl: "https://github.com/npa-ports/npa-mobile-app",
      cloneUrl: "https://github.com/npa-ports/npa-mobile-app.git"
    },
    {
      id: "repo-005",
      name: "npa-documentation",
      fullName: "npa-ports/npa-documentation",
      description: "Comprehensive documentation for NPA systems, processes, and procedures",
      visibility: "Internal",
      language: "Markdown",
      size: "67.3 MB",
      createdAt: "2024-01-01T08:00:00Z",
      updatedAt: "2024-12-08T17:45:00Z",
      stars: 15,
      forks: 12,
      watchers: 25,
      openIssues: 4,
      openPullRequests: 2,
      contributors: 10,
      commits: 234,
      branches: 4,
      releases: 0,
      lastCommit: "2024-12-08T17:45:00Z",
      primaryBranch: "main",
      topics: ["documentation", "wiki", "procedures", "guides", "npa"],
      collaborators: [
        { name: "Dr. Sarah Johnson", role: "Admin", avatar: "/avatars/sarah.jpg" },
        { name: "Mrs. Grace Okonkwo", role: "Maintainer", avatar: "/avatars/grace.jpg" },
        { name: "Eng. Michael Adebayo", role: "Editor", avatar: "/avatars/michael.jpg" }
      ],
      ciStatus: "Passing",
      coverage: 0,
      languages: {
        "Markdown": 94.7,
        "YAML": 3.2,
        "JSON": 1.5,
        "Shell": 0.6
      },
      dependencies: {
        total: 8,
        outdated: 2,
        vulnerable: 0
      },
      security: {
        alerts: 0,
        severity: "None",
        lastScan: "2024-12-07T23:30:00Z"
      },
      activity: {
        commitsLastWeek: 8,
        commitsLastMonth: 32,
        contributorsLastMonth: 6
      },
      project: "Documentation",
      team: "Documentation Team",
      status: "Active",
      archived: false,
      template: false,
      license: "MIT",
      readme: true,
      contributing: true,
      codeOfConduct: true,
      issueTemplates: true,
      pullRequestTemplate: true,
      branchProtection: true,
      requiredReviews: 1,
      requiredChecks: ["markdown-lint"],
      autoMerge: false,
      dependabot: false,
      codeql: false,
      repositoryUrl: "https://github.com/npa-ports/npa-documentation",
      cloneUrl: "https://github.com/npa-ports/npa-documentation.git"
    }
  ];

  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: "backend", label: "Backend" },
    { value: "frontend", label: "Frontend" },
    { value: "mobile", label: "Mobile" },
    { value: "infrastructure", label: "Infrastructure" },
    { value: "documentation", label: "Documentation" },
    { value: "utilities", label: "Utilities" }
  ];

  const visibilityOptions = [
    { value: "all", label: "All Visibility" },
    { value: "public", label: "Public" },
    { value: "private", label: "Private" },
    { value: "internal", label: "Internal" }
  ];

  const filteredRepos = repositories.filter(repo => {
    const matchesSearch = repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         repo.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         repo.language.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         repo.team.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || 
                       repo.project.toLowerCase().replace(" ", "_") === typeFilter;
    const matchesVisibility = visibilityFilter === "all" || 
                             repo.visibility.toLowerCase() === visibilityFilter;
    
    return matchesSearch && matchesType && matchesVisibility;
  });

  const statusColorMap = {
    'Passing': 'bg-green-100 text-green-800',
    'Failing': 'bg-red-100 text-red-800',
    'Pending': 'bg-yellow-100 text-yellow-800',
    'Unknown': 'bg-gray-100 text-gray-800'
  };

  const visibilityColorMap = {
    'Public': 'bg-green-100 text-green-800',
    'Private': 'bg-red-100 text-red-800',
    'Internal': 'bg-blue-100 text-blue-800'
  };

  const securitySeverityColorMap = {
    'None': 'bg-green-100 text-green-800',
    'Low': 'bg-yellow-100 text-yellow-800',
    'Medium': 'bg-orange-100 text-orange-800',
    'High': 'bg-red-100 text-red-800',
    'Critical': 'bg-red-100 text-red-800'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Software Repositories</h1>
          <p className="text-gray-600">Manage and monitor code repositories, CI/CD pipelines, and development workflows</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/ict/software/repositories/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Repository
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Repository Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {repoStats.map((stat) => (
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
                stat.changeType === 'neutral' ? 'text-gray-600' : 'text-red-600'
              }`}>
                {stat.change}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                stat.status === 'Growing' ? 'bg-green-100 text-green-800' :
                stat.status === 'Active' ? 'bg-blue-100 text-blue-800' :
                stat.status === 'Busy' ? 'bg-orange-100 text-orange-800' :
                'bg-purple-100 text-purple-800'
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
                placeholder="Search repositories by name, description, language, or team..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {typeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {visibilityOptions.map(option => (
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

      {/* Repositories Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredRepos.map((repo) => (
          <div key={repo.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <GitBranch className="w-6 h-6 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{repo.name}</h3>
                    <p className="text-sm text-gray-500">{repo.fullName}</p>
                  </div>
                  <span className="text-sm text-gray-500">#{repo.id}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{repo.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${visibilityColorMap[repo.visibility as keyof typeof visibilityColorMap]}`}>
                    {repo.visibility}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                    {repo.language}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[repo.ciStatus as keyof typeof statusColorMap]}`}>
                    CI: {repo.ciStatus}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                    {repo.team}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg">
                  <GitBranch className="w-4 h-4" />
                </button>
                <button className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Repository Stats</p>
                  <div className="grid grid-cols-2 gap-2 text-sm mt-1">
                    <div>
                      <p className="text-xs text-gray-500">Stars</p>
                      <p className="text-gray-900 flex items-center">
                        <Star className="w-3 h-3 mr-1" />
                        {repo.stars}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Forks</p>
                      <p className="text-gray-900 flex items-center">
                        <GitFork className="w-3 h-3 mr-1" />
                        {repo.forks}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Issues</p>
                      <p className="text-gray-900">{repo.openIssues}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">PRs</p>
                      <p className="text-gray-900">{repo.openPullRequests}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Activity</p>
                  <div className="grid grid-cols-2 gap-2 text-sm mt-1">
                    <div>
                      <p className="text-xs text-gray-500">Commits</p>
                      <p className="text-gray-900">{repo.commits}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Contributors</p>
                      <p className="text-gray-900">{repo.contributors}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Branches</p>
                      <p className="text-gray-900">{repo.branches}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Size</p>
                      <p className="text-gray-900">{repo.size}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Code Quality & Security:</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Test Coverage</p>
                    <p className="text-gray-900">{repo.coverage}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Security Alerts</p>
                    <p className="text-gray-900 flex items-center">
                      {repo.security.alerts > 0 ? (
                        <AlertTriangle className="w-3 h-3 mr-1 text-red-500" />
                      ) : (
                        <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                      )}
                      {repo.security.alerts} ({repo.security.severity})
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Dependencies</p>
                    <p className="text-gray-900">{repo.dependencies.total} total, {repo.dependencies.outdated} outdated</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Last Commit</p>
                    <p className="text-gray-900">{new Date(repo.lastCommit).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Languages:</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(repo.languages).slice(0, 3).map(([lang, percent]) => (
                    <span key={lang} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      {lang} {percent}%
                    </span>
                  ))}
                  {Object.keys(repo.languages).length > 3 && (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                      +{Object.keys(repo.languages).length - 3} more
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Topics:</p>
                <div className="flex flex-wrap gap-1">
                  {repo.topics.map((topic, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Branch Protection:</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Required Reviews</p>
                    <p className="text-gray-900">{repo.requiredReviews}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Required Checks</p>
                    <p className="text-gray-900">{repo.requiredChecks.join(", ")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Auto Merge</p>
                    <p className="text-gray-900">{repo.autoMerge ? "Enabled" : "Disabled"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Dependabot</p>
                    <p className="text-gray-900">{repo.dependabot ? "Enabled" : "Disabled"}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Recent Activity:</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Last Week</p>
                    <p className="text-gray-900">{repo.activity.commitsLastWeek} commits</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Last Month</p>
                    <p className="text-gray-900">{repo.activity.commitsLastMonth} commits, {repo.activity.contributorsLastMonth} contributors</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                    <Eye className="w-3 h-3 mr-1" />
                    View Details
                  </button>
                  <a
                    href={repo.repositoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Open in GitHub
                  </a>
                </div>
                <Link
                  href={`/ict/software/repositories/${repo.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Repository Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Repository Management Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Healthy Repositories</h3>
                <p className="text-xs text-gray-500">No security issues</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {repositories.filter(r => r.security.alerts === 0).length}</p>
              <p>Percentage: {Math.round((repositories.filter(r => r.security.alerts === 0).length / repositories.length) * 100)}%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <GitCommit className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Active Development</h3>
                <p className="text-xs text-gray-500">Commits this month</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Total Commits: {repositories.reduce((sum, r) => sum + r.activity.commitsLastMonth, 0)}</p>
              <p>Average: {Math.round(repositories.reduce((sum, r) => sum + r.activity.commitsLastMonth, 0) / repositories.length)}</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Security Status</h3>
                <p className="text-xs text-gray-500">Vulnerability alerts</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Total Alerts: {repositories.reduce((sum, r) => sum + r.security.alerts, 0)}</p>
              <p>Critical: {repositories.filter(r => r.security.severity === 'Critical').length}</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Award className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Code Quality</h3>
                <p className="text-xs text-gray-500">Average coverage</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Average: {Math.round(repositories.reduce((sum, r) => sum + r.coverage, 0) / repositories.length)}%</p>
              <p>Excellent: {repositories.filter(r => r.coverage >= 80).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Repository Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/ict/software/repositories/create"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Create Repository</h3>
            <p className="text-xs text-gray-500">New code repository</p>
          </Link>
          <Link
            href="/ict/software/repositories/templates"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Repository Templates</h3>
            <p className="text-xs text-gray-500">Pre-configured repos</p>
          </Link>
          <Link
            href="/ict/software/repositories/security"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Shield className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Security Dashboard</h3>
            <p className="text-xs text-gray-500">Vulnerability management</p>
          </Link>
          <Link
            href="/ict/software/repositories/analytics"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Repository Analytics</h3>
            <p className="text-xs text-gray-500">Usage and metrics</p>
          </Link>
        </div>
      </div>
    </div>
  );
}