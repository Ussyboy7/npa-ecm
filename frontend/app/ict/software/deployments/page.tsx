"use client";

import { useState } from "react";
import {
  Upload,
  CheckCircle,
  AlertTriangle,
  Clock,
  Play,
  Pause,
  Stop,
  RotateCcw,
  BarChart3,
  Settings,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
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
  GitCommit,
  Code,
  GitBranch,
  ArrowUp,
  ArrowDown,
  Circle,
  Square,
  Triangle,
  DollarSign,
  Calendar,
  Percent,
  Wifi,
  Bug,
  User
} from "lucide-react";
import Link from "next/link";

export default function SoftwareDeploymentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [environmentFilter, setEnvironmentFilter] = useState("all");

  const deploymentStats = [
    {
      name: "Total Deployments",
      value: "247",
      change: "+12",
      changeType: "positive",
      icon: Upload,
      description: "This month",
      status: "Active"
    },
    {
      name: "Successful Deployments",
      value: "234",
      change: "+8",
      changeType: "positive",
      icon: CheckCircle,
      description: "Success rate: 94.7%",
      status: "Excellent"
    },
    {
      name: "Failed Deployments",
      value: "8",
      change: "-2",
      changeType: "positive",
      icon: AlertTriangle,
      description: "Require attention",
      status: "Improving"
    },
    {
      name: "Avg. Deployment Time",
      value: "4.2 min",
      change: "-0.8 min",
      changeType: "positive",
      icon: Clock,
      description: "Time to deploy",
      status: "Optimizing"
    }
  ];

  const deployments = [
    {
      id: "DEP-001",
      application: "ECM System Enhancement",
      version: "v2.1.4",
      environment: "Production",
      status: "Success",
      deployedBy: "sarah.wilson@npa.gov.ng",
      deployedAt: "2024-12-10 14:30:25",
      duration: "3.2 minutes",
      buildNumber: "BUILD-2024.12.10.001",
      commitHash: "a1b2c3d4e5f6",
      branch: "main",
      description: "Deployed new authentication module with enhanced security features",
      changes: [
        "Added multi-factor authentication",
        "Enhanced password policy validation",
        "Improved session management",
        "Fixed login page mobile responsiveness"
      ],
      rollbackAvailable: true,
      healthCheck: {
        status: "Passed",
        responseTime: "245ms",
        uptime: "99.9%",
        errors: 0
      },
      metrics: {
        deploymentTime: "3.2 min",
        buildTime: "8.5 min",
        testTime: "12.3 min",
        totalTime: "24.0 min"
      },
      logs: [
        { timestamp: "14:30:25", level: "INFO", message: "Deployment started" },
        { timestamp: "14:31:15", level: "INFO", message: "Building application" },
        { timestamp: "14:32:45", level: "INFO", message: "Running tests" },
        { timestamp: "14:33:30", level: "INFO", message: "Deploying to production" },
        { timestamp: "14:33:47", level: "SUCCESS", message: "Deployment completed successfully" }
      ],
      notifications: [
        { type: "Email", sent: true, recipients: ["team@npa.gov.ng"] },
        { type: "Slack", sent: true, channel: "#deployments" },
        { type: "SMS", sent: false, recipients: [] }
      ]
    },
    {
      id: "DEP-002",
      application: "Port Management Mobile App",
      version: "v1.3.2",
      environment: "Staging",
      status: "In Progress",
      deployedBy: "alex.rodriguez@npa.gov.ng",
      deployedAt: "2024-12-10 15:45:10",
      duration: "2.1 minutes",
      buildNumber: "BUILD-2024.12.10.002",
      commitHash: "b2c3d4e5f6g7",
      branch: "feature/mobile-enhancements",
      description: "Deploying mobile app updates with improved user interface",
      changes: [
        "Updated mobile navigation",
        "Enhanced offline functionality",
        "Improved data synchronization",
        "Fixed crash on Android 12+"
      ],
      rollbackAvailable: false,
      healthCheck: {
        status: "Running",
        responseTime: "N/A",
        uptime: "N/A",
        errors: 0
      },
      metrics: {
        deploymentTime: "2.1 min",
        buildTime: "6.2 min",
        testTime: "8.7 min",
        totalTime: "17.0 min"
      },
      logs: [
        { timestamp: "15:45:10", level: "INFO", message: "Deployment started" },
        { timestamp: "15:46:05", level: "INFO", message: "Building mobile app" },
        { timestamp: "15:47:20", level: "INFO", message: "Running mobile tests" },
        { timestamp: "15:47:31", level: "INFO", message: "Deploying to staging" }
      ],
      notifications: [
        { type: "Email", sent: true, recipients: ["mobile-team@npa.gov.ng"] },
        { type: "Slack", sent: true, channel: "#mobile-deployments" },
        { type: "SMS", sent: false, recipients: [] }
      ]
    },
    {
      id: "DEP-003",
      application: "API Gateway Migration",
      version: "v3.0.1",
      environment: "Production",
      status: "Failed",
      deployedBy: "mike.chen@npa.gov.ng",
      deployedAt: "2024-12-10 13:20:45",
      duration: "1.8 minutes",
      buildNumber: "BUILD-2024.12.10.003",
      commitHash: "c3d4e5f6g7h8",
      branch: "main",
      description: "Failed deployment due to database connection issues",
      changes: [
        "Updated API routing configuration",
        "Enhanced rate limiting",
        "Improved error handling",
        "Added new authentication endpoints"
      ],
      rollbackAvailable: true,
      healthCheck: {
        status: "Failed",
        responseTime: "N/A",
        uptime: "0%",
        errors: 15
      },
      metrics: {
        deploymentTime: "1.8 min",
        buildTime: "5.1 min",
        testTime: "7.2 min",
        totalTime: "14.1 min"
      },
      logs: [
        { timestamp: "13:20:45", level: "INFO", message: "Deployment started" },
        { timestamp: "13:21:30", level: "INFO", message: "Building API gateway" },
        { timestamp: "13:22:15", level: "ERROR", message: "Database connection failed" },
        { timestamp: "13:22:23", level: "ERROR", message: "Deployment failed - rolling back" }
      ],
      notifications: [
        { type: "Email", sent: true, recipients: ["api-team@npa.gov.ng"] },
        { type: "Slack", sent: true, channel: "#api-deployments" },
        { type: "SMS", sent: true, recipients: ["mike.chen@npa.gov.ng"] }
      ]
    },
    {
      id: "DEP-004",
      application: "Data Analytics Dashboard",
      version: "v1.8.3",
      environment: "Development",
      status: "Success",
      deployedBy: "emma.davis@npa.gov.ng",
      deployedAt: "2024-12-10 12:15:30",
      duration: "2.8 minutes",
      buildNumber: "BUILD-2024.12.10.004",
      commitHash: "d4e5f6g7h8i9",
      branch: "feature/analytics-improvements",
      description: "Deployed analytics dashboard with new reporting features",
      changes: [
        "Added real-time analytics",
        "Enhanced data visualization",
        "Improved report generation",
        "Fixed performance issues"
      ],
      rollbackAvailable: true,
      healthCheck: {
        status: "Passed",
        responseTime: "189ms",
        uptime: "99.8%",
        errors: 0
      },
      metrics: {
        deploymentTime: "2.8 min",
        buildTime: "7.3 min",
        testTime: "10.1 min",
        totalTime: "20.2 min"
      },
      logs: [
        { timestamp: "12:15:30", level: "INFO", message: "Deployment started" },
        { timestamp: "12:16:45", level: "INFO", message: "Building dashboard" },
        { timestamp: "12:18:10", level: "INFO", message: "Running analytics tests" },
        { timestamp: "12:18:18", level: "SUCCESS", message: "Deployment completed successfully" }
      ],
      notifications: [
        { type: "Email", sent: true, recipients: ["analytics-team@npa.gov.ng"] },
        { type: "Slack", sent: true, channel: "#analytics-deployments" },
        { type: "SMS", sent: false, recipients: [] }
      ]
    },
    {
      id: "DEP-005",
      application: "Security Audit Tool",
      version: "v2.0.5",
      environment: "Production",
      status: "Success",
      deployedBy: "tom.wilson@npa.gov.ng",
      deployedAt: "2024-12-10 11:30:15",
      duration: "4.1 minutes",
      buildNumber: "BUILD-2024.12.10.005",
      commitHash: "e5f6g7h8i9j0",
      branch: "main",
      description: "Deployed security audit tool with enhanced vulnerability scanning",
      changes: [
        "Enhanced vulnerability detection",
        "Improved security reporting",
        "Added compliance checks",
        "Updated security policies"
      ],
      rollbackAvailable: true,
      healthCheck: {
        status: "Passed",
        responseTime: "312ms",
        uptime: "99.9%",
        errors: 0
      },
      metrics: {
        deploymentTime: "4.1 min",
        buildTime: "9.2 min",
        testTime: "15.6 min",
        totalTime: "28.9 min"
      },
      logs: [
        { timestamp: "11:30:15", level: "INFO", message: "Deployment started" },
        { timestamp: "11:31:20", level: "INFO", message: "Building security tool" },
        { timestamp: "11:33:45", level: "INFO", message: "Running security tests" },
        { timestamp: "11:34:26", level: "SUCCESS", message: "Deployment completed successfully" }
      ],
      notifications: [
        { type: "Email", sent: true, recipients: ["security-team@npa.gov.ng"] },
        { type: "Slack", sent: true, channel: "#security-deployments" },
        { type: "SMS", sent: false, recipients: [] }
      ]
    }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "success", label: "Success" },
    { value: "failed", label: "Failed" },
    { value: "in_progress", label: "In Progress" },
    { value: "pending", label: "Pending" }
  ];

  const environmentOptions = [
    { value: "all", label: "All Environments" },
    { value: "production", label: "Production" },
    { value: "staging", label: "Staging" },
    { value: "development", label: "Development" },
    { value: "testing", label: "Testing" }
  ];

  const filteredDeployments = deployments.filter(deployment => {
    const matchesSearch = deployment.application.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deployment.version.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deployment.deployedBy.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         deployment.status.toLowerCase().replace(" ", "_") === statusFilter;
    const matchesEnvironment = environmentFilter === "all" || 
                              deployment.environment.toLowerCase() === environmentFilter;
    
    return matchesSearch && matchesStatus && matchesEnvironment;
  });

  const statusColorMap = {
    'Success': 'bg-green-100 text-green-800',
    'Failed': 'bg-red-100 text-red-800',
    'In Progress': 'bg-blue-100 text-blue-800',
    'Pending': 'bg-yellow-100 text-yellow-800'
  };

  const environmentColorMap = {
    'Production': 'bg-red-100 text-red-800',
    'Staging': 'bg-yellow-100 text-yellow-800',
    'Development': 'bg-blue-100 text-blue-800',
    'Testing': 'bg-purple-100 text-purple-800'
  };

  const healthCheckColorMap = {
    'Passed': 'bg-green-100 text-green-800',
    'Failed': 'bg-red-100 text-red-800',
    'Running': 'bg-blue-100 text-blue-800'
  };

  const logLevelColorMap = {
    'INFO': 'bg-blue-100 text-blue-800',
    'SUCCESS': 'bg-green-100 text-green-800',
    'WARNING': 'bg-yellow-100 text-yellow-800',
    'ERROR': 'bg-red-100 text-red-800'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Software Deployments</h1>
          <p className="text-gray-600">Monitor and manage software deployments across all environments</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/ict/software/deployments/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Deployment
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh All
          </button>
        </div>
      </div>

      {/* Deployment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {deploymentStats.map((stat) => (
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
                stat.status === 'Active' ? 'bg-blue-100 text-blue-800' :
                stat.status === 'Excellent' ? 'bg-green-100 text-green-800' :
                stat.status === 'Improving' ? 'bg-yellow-100 text-yellow-800' :
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
                placeholder="Search deployments by application, version, or deployer..."
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
              value={environmentFilter}
              onChange={(e) => setEnvironmentFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {environmentOptions.map(option => (
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

      {/* Deployments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredDeployments.map((deployment) => (
          <div key={deployment.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Upload className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{deployment.application}</h3>
                  <span className="text-sm text-gray-500">#{deployment.id}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{deployment.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[deployment.status as keyof typeof statusColorMap]}`}>
                    {deployment.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${environmentColorMap[deployment.environment as keyof typeof environmentColorMap]}`}>
                    {deployment.environment}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                    {deployment.version}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg">
                  <BarChart3 className="w-4 h-4" />
                </button>
                <button className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Deployed By</p>
                  <p className="text-sm text-gray-600">{deployment.deployedBy}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Deployed At</p>
                  <p className="text-sm text-gray-600">{deployment.deployedAt}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Duration</p>
                  <p className="text-sm text-gray-600">{deployment.duration}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Build Number</p>
                  <p className="text-sm text-gray-600">{deployment.buildNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Commit Hash</p>
                  <p className="text-sm text-gray-600 font-mono">{deployment.commitHash}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Branch</p>
                  <p className="text-sm text-gray-600">{deployment.branch}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Health Check:</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${healthCheckColorMap[deployment.healthCheck.status as keyof typeof healthCheckColorMap]}`}>
                      {deployment.healthCheck.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Response Time</p>
                    <p className="text-sm text-gray-900">{deployment.healthCheck.responseTime}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Uptime</p>
                    <p className="text-sm text-gray-900">{deployment.healthCheck.uptime}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Errors</p>
                    <p className="text-sm text-gray-900">{deployment.healthCheck.errors}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Key Changes:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {deployment.changes.slice(0, 3).map((change, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>{change}</span>
                    </li>
                  ))}
                  {deployment.changes.length > 3 && (
                    <li className="text-blue-600">+{deployment.changes.length - 3} more changes</li>
                  )}
                </ul>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Recent Logs:</p>
                <div className="space-y-1">
                  {deployment.logs.slice(-3).map((log, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{log.message}</span>
                      <div className="flex items-center space-x-2">
                        <span className={`px-1 py-0.5 text-xs rounded ${logLevelColorMap[log.level as keyof typeof logLevelColorMap]}`}>
                          {log.level}
                        </span>
                        <span className="text-gray-500">{log.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                    <Eye className="w-3 h-3 mr-1" />
                    View Logs
                  </button>
                  {deployment.rollbackAvailable && (
                    <button className="inline-flex items-center px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Rollback
                    </button>
                  )}
                </div>
                <Link
                  href={`/ict/software/deployments/${deployment.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Deployment Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Deployment Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Successful Deployments</h3>
                <p className="text-xs text-gray-500">This month</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {deployments.filter(dep => dep.status === 'Success').length}</p>
              <p>Success Rate: {Math.round((deployments.filter(dep => dep.status === 'Success').length / deployments.length) * 100)}%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Failed Deployments</h3>
                <p className="text-xs text-gray-500">Require attention</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {deployments.filter(dep => dep.status === 'Failed').length}</p>
              <p>Failure Rate: {Math.round((deployments.filter(dep => dep.status === 'Failed').length / deployments.length) * 100)}%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Average Deployment Time</h3>
                <p className="text-xs text-gray-500">Time to deploy</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Current: {deployments.reduce((sum, dep) => sum + parseFloat(dep.duration), 0) / deployments.length} min</p>
              <p>Target: < 5.0 min</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Active Deployments</h3>
                <p className="text-xs text-gray-500">Currently running</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {deployments.filter(dep => dep.status === 'In Progress').length}</p>
              <p>Status: Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Deployment Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/ict/software/deployments/create"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">New Deployment</h3>
            <p className="text-xs text-gray-500">Start deployment</p>
          </Link>
          <Link
            href="/ict/software/deployments/pipeline"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Activity className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Deployment Pipeline</h3>
            <p className="text-xs text-gray-500">Manage pipeline</p>
          </Link>
          <Link
            href="/ict/software/deployments/rollback"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="h-8 w-8 text-red-600 mb-3" />
            <h3 className="font-medium text-sm">Rollback</h3>
            <p className="text-xs text-gray-500">Rollback deployment</p>
          </Link>
          <Link
            href="/ict/software/deployments/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Deployment Reports</h3>
            <p className="text-xs text-gray-500">Generate reports</p>
          </Link>
        </div>
      </div>
    </div>
  );
}