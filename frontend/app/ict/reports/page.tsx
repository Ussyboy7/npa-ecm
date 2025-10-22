"use client";

import { useState } from "react";
import {
  FileText,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Filter,
  Search,
  Eye,
  Share,
  Plus,
  Edit,
  Trash2,
  Clock,
  Users,
  Server,
  Database,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle,
  Target,
  DollarSign,
  Globe,
  Monitor,
  HardDrive,
  Wifi,
  Cpu,
  MemoryStick
} from "lucide-react";
import Link from "next/link";

export default function ICTReportsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [timeRange, setTimeRange] = useState("30d");

  const reportStats = [
    {
      name: "Total Reports",
      value: "156",
      change: "+12",
      changeType: "positive",
      icon: FileText,
      description: "Generated this month",
      status: "Active"
    },
    {
      name: "Scheduled Reports",
      value: "24",
      change: "+3",
      changeType: "positive",
      icon: Clock,
      description: "Automated reports",
      status: "Running"
    },
    {
      name: "Report Views",
      value: "2,847",
      change: "+156",
      changeType: "positive",
      icon: Eye,
      description: "This month",
      status: "High"
    },
    {
      name: "Avg Generation Time",
      value: "3.2s",
      change: "-0.8s",
      changeType: "positive",
      icon: Activity,
      description: "Report processing",
      status: "Fast"
    }
  ];

  const reports = [
    {
      id: "RPT-001",
      title: "Monthly System Performance Report",
      description: "Comprehensive analysis of system performance metrics including CPU, memory, disk, and network utilization",
      category: "Performance",
      type: "Monthly",
      status: "Published",
      createdBy: "System Admin",
      createdDate: "2024-12-01",
      lastRun: "2024-12-01 08:00:00",
      nextRun: "2025-01-01 08:00:00",
      views: 245,
      downloads: 89,
      size: "2.4MB",
      format: "PDF",
      schedule: "Monthly",
      tags: ["Performance", "System", "Monthly"],
      dataPoints: [
        { name: "CPU Usage", value: "45%", trend: "stable" },
        { name: "Memory Usage", value: "68%", trend: "up" },
        { name: "Disk Usage", value: "72%", trend: "up" },
        { name: "Network Latency", value: "12ms", trend: "down" }
      ]
    },
    {
      id: "RPT-002",
      title: "Security Incident Summary",
      description: "Weekly summary of security incidents, threats detected, and response actions taken",
      category: "Security",
      type: "Weekly",
      status: "Published",
      createdBy: "Security Team",
      createdDate: "2024-11-25",
      lastRun: "2024-12-08 09:00:00",
      nextRun: "2024-12-15 09:00:00",
      views: 189,
      downloads: 67,
      size: "1.8MB",
      format: "PDF",
      schedule: "Weekly",
      tags: ["Security", "Incidents", "Weekly"],
      dataPoints: [
        { name: "Threats Blocked", value: "23", trend: "down" },
        { name: "Failed Logins", value: "12", trend: "up" },
        { name: "Vulnerabilities", value: "8", trend: "down" },
        { name: "Response Time", value: "2.3h", trend: "down" }
      ]
    },
    {
      id: "RPT-003",
      title: "Infrastructure Capacity Report",
      description: "Analysis of infrastructure capacity utilization and growth projections",
      category: "Infrastructure",
      type: "Quarterly",
      status: "Draft",
      createdBy: "Infrastructure Team",
      createdDate: "2024-11-20",
      lastRun: "2024-11-20 10:00:00",
      nextRun: "2025-02-20 10:00:00",
      views: 156,
      downloads: 45,
      size: "3.2MB",
      format: "Excel",
      schedule: "Quarterly",
      tags: ["Infrastructure", "Capacity", "Quarterly"],
      dataPoints: [
        { name: "Server Utilization", value: "68%", trend: "up" },
        { name: "Storage Usage", value: "72%", trend: "up" },
        { name: "Network Bandwidth", value: "45%", trend: "stable" },
        { name: "Power Consumption", value: "85%", trend: "up" }
      ]
    },
    {
      id: "RPT-004",
      title: "User Activity Analytics",
      description: "Detailed analysis of user activity patterns, login times, and system usage",
      category: "Analytics",
      type: "Daily",
      status: "Published",
      createdBy: "Analytics Team",
      createdDate: "2024-11-15",
      lastRun: "2024-12-09 06:00:00",
      nextRun: "2024-12-10 06:00:00",
      views: 312,
      downloads: 123,
      size: "1.5MB",
      format: "PDF",
      schedule: "Daily",
      tags: ["Analytics", "Users", "Daily"],
      dataPoints: [
        { name: "Active Users", value: "1,247", trend: "up" },
        { name: "Login Sessions", value: "2,891", trend: "up" },
        { name: "Peak Usage", value: "2:00 PM", trend: "stable" },
        { name: "Avg Session", value: "4.2h", trend: "down" }
      ]
    },
    {
      id: "RPT-005",
      title: "Budget and Cost Analysis",
      description: "Monthly analysis of ICT budget utilization and cost breakdown by department",
      category: "Financial",
      type: "Monthly",
      status: "Published",
      createdBy: "Finance Team",
      createdDate: "2024-11-10",
      lastRun: "2024-12-01 07:00:00",
      nextRun: "2025-01-01 07:00:00",
      views: 198,
      downloads: 78,
      size: "2.1MB",
      format: "Excel",
      schedule: "Monthly",
      tags: ["Financial", "Budget", "Monthly"],
      dataPoints: [
        { name: "Budget Used", value: "68%", trend: "up" },
        { name: "Cost per User", value: "₦45,000", trend: "down" },
        { name: "Hardware Costs", value: "₦2.1B", trend: "up" },
        { name: "Software Costs", value: "₦1.8B", trend: "stable" }
      ]
    },
    {
      id: "RPT-006",
      title: "Compliance Audit Report",
      description: "Quarterly compliance audit report covering ISO 27001, NIST, and GDPR requirements",
      category: "Compliance",
      type: "Quarterly",
      status: "In Review",
      createdBy: "Compliance Team",
      createdDate: "2024-11-05",
      lastRun: "2024-11-30 14:00:00",
      nextRun: "2025-02-28 14:00:00",
      views: 134,
      downloads: 56,
      size: "4.7MB",
      format: "PDF",
      schedule: "Quarterly",
      tags: ["Compliance", "Audit", "Quarterly"],
      dataPoints: [
        { name: "ISO 27001 Score", value: "92%", trend: "up" },
        { name: "NIST Score", value: "88%", trend: "stable" },
        { name: "GDPR Score", value: "75%", trend: "up" },
        { name: "Open Issues", value: "12", trend: "down" }
      ]
    }
  ];

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "performance", label: "Performance" },
    { value: "security", label: "Security" },
    { value: "infrastructure", label: "Infrastructure" },
    { value: "analytics", label: "Analytics" },
    { value: "financial", label: "Financial" },
    { value: "compliance", label: "Compliance" }
  ];

  const timeRanges = [
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "90d", label: "Last 90 Days" },
    { value: "1y", label: "Last Year" }
  ];

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === "all" || 
                           report.category.toLowerCase() === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const statusColorMap = {
    'Published': 'bg-green-100 text-green-800',
    'Draft': 'bg-yellow-100 text-yellow-800',
    'In Review': 'bg-blue-100 text-blue-800',
    'Scheduled': 'bg-purple-100 text-purple-800'
  };

  const categoryColorMap = {
    'Performance': 'bg-blue-100 text-blue-800',
    'Security': 'bg-red-100 text-red-800',
    'Infrastructure': 'bg-green-100 text-green-800',
    'Analytics': 'bg-purple-100 text-purple-800',
    'Financial': 'bg-yellow-100 text-yellow-800',
    'Compliance': 'bg-indigo-100 text-indigo-800'
  };

  const formatColorMap = {
    'PDF': 'bg-red-100 text-red-800',
    'Excel': 'bg-green-100 text-green-800',
    'CSV': 'bg-blue-100 text-blue-800',
    'JSON': 'bg-purple-100 text-purple-800'
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-green-600" />;
      case 'down': return <TrendingDown className="w-3 h-3 text-red-600" />;
      default: return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ICT Reports</h1>
          <p className="text-gray-600">Generate, view, and manage ICT reports and analytics</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/ict/reports/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Report
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics Dashboard
          </button>
        </div>
      </div>

      {/* Report Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {reportStats.map((stat) => (
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
                stat.status === 'Active' ? 'bg-green-100 text-green-800' :
                stat.status === 'Running' ? 'bg-blue-100 text-blue-800' :
                stat.status === 'High' ? 'bg-purple-100 text-purple-800' :
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
                placeholder="Search reports by title, description, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {timeRanges.map(range => (
                <option key={range.value} value={range.value}>
                  {range.label}
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

      {/* Reports Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredReports.map((report) => (
          <div key={report.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{report.title}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[report.status as keyof typeof statusColorMap]}`}>
                    {report.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${categoryColorMap[report.category as keyof typeof categoryColorMap]}`}>
                    {report.category}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{report.description}</p>
                <div className="text-sm text-gray-500 space-y-1">
                  <p><span className="font-medium">Created by:</span> {report.createdBy}</p>
                  <p><span className="font-medium">Created:</span> {report.createdDate}</p>
                  <p><span className="font-medium">Last Run:</span> {report.lastRun}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg">
                  <Download className="w-4 h-4" />
                </button>
                <button className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg">
                  <Share className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg">
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Type</p>
                  <p className="text-sm text-gray-600">{report.type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Schedule</p>
                  <p className="text-sm text-gray-600">{report.schedule}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Format</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${formatColorMap[report.format as keyof typeof formatColorMap]}`}>
                    {report.format}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Size</p>
                  <p className="text-sm text-gray-600">{report.size}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Views</p>
                  <p className="text-sm text-gray-600">{report.views}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Downloads</p>
                  <p className="text-sm text-gray-600">{report.downloads}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Key Metrics:</p>
                <div className="grid grid-cols-2 gap-2">
                  {report.dataPoints.map((point, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{point.name}</span>
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">{point.value}</span>
                        {getTrendIcon(point.trend)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Tags:</p>
                <div className="flex flex-wrap gap-2">
                  {report.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                    <Eye className="w-3 h-3 mr-1" />
                    View Report
                  </button>
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </button>
                </div>
                <div className="text-xs text-gray-500">
                  Next Run: {report.nextRun}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Report Categories */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Link
            href="/ict/reports?category=performance"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Performance</h3>
                <p className="text-xs text-gray-500">24 reports</p>
              </div>
            </div>
          </Link>
          <Link
            href="/ict/reports?category=security"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Security</h3>
                <p className="text-xs text-gray-500">18 reports</p>
              </div>
            </div>
          </Link>
          <Link
            href="/ict/reports?category=infrastructure"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Server className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Infrastructure</h3>
                <p className="text-xs text-gray-500">15 reports</p>
              </div>
            </div>
          </Link>
          <Link
            href="/ict/reports?category=analytics"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Analytics</h3>
                <p className="text-xs text-gray-500">22 reports</p>
              </div>
            </div>
          </Link>
          <Link
            href="/ict/reports?category=financial"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Financial</h3>
                <p className="text-xs text-gray-500">12 reports</p>
              </div>
            </div>
          </Link>
          <Link
            href="/ict/reports?category=compliance"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Compliance</h3>
                <p className="text-xs text-gray-500">8 reports</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/ict/reports/create"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Create Report</h3>
            <p className="text-xs text-gray-500">Generate new report</p>
          </Link>
          <Link
            href="/ict/reports/scheduled"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Clock className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Scheduled Reports</h3>
            <p className="text-xs text-gray-500">Manage schedules</p>
          </Link>
          <Link
            href="/ict/reports/templates"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Report Templates</h3>
            <p className="text-xs text-gray-500">Use templates</p>
          </Link>
          <Link
            href="/ict/reports/analytics"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Report Analytics</h3>
            <p className="text-xs text-gray-500">View analytics</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
