"use client";

import { useState } from "react";
import {
  Award,
  Bug,
  CheckCircle,
  AlertTriangle,
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
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  FileText,
  MapPin,
  Building,
  Users,
  Activity,
  Zap,
  Shield,
  Database,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  GitCommit,
  Star,
  Code,
  GitBranch,
  Calendar,
  Monitor,
  Globe,
  Lock,
  Unlock,
  RefreshCw,
  Play,
  Pause,
  Stop
} from "lucide-react";
import Link from "next/link";

export default function SoftwareQualityPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [qualityFilter, setQualityFilter] = useState("all");

  const qualityStats = [
    {
      name: "Code Coverage",
      value: "87.3%",
      change: "+2.1%",
      changeType: "positive",
      icon: Target,
      description: "Average across projects",
      status: "Excellent"
    },
    {
      name: "Bug Density",
      value: "2.3",
      change: "-0.8",
      changeType: "positive",
      icon: Bug,
      description: "Bugs per 1000 LOC",
      status: "Good"
    },
    {
      name: "Technical Debt",
      value: "15.2h",
      change: "-3.5h",
      changeType: "positive",
      icon: Clock,
      description: "Remediation time",
      status: "Improving"
    },
    {
      name: "Security Issues",
      value: "8",
      change: "-5",
      changeType: "positive",
      icon: Shield,
      description: "Critical vulnerabilities",
      status: "Reducing"
    }
  ];

  const qualityMetrics = [
    {
      id: "QM-001",
      project: "ECM System Enhancement",
      repository: "npa-ecm/enhancement-v2",
      lastScan: "2024-12-10 14:30:25",
      status: "Passed",
      grade: "A",
      coverage: 89.2,
      complexity: 12.5,
      maintainability: "A",
      reliability: "A",
      security: "B+",
      duplications: 3.2,
      technicalDebt: "8.5h",
      bugs: 2,
      vulnerabilities: 1,
      codeSmells: 15,
      linesOfCode: 15420,
      linesToCover: 1680,
      uncoveredLines: 180,
      duplicatedLines: 493,
      cognitiveComplexity: 245,
      cyclomaticComplexity: 156,
      maintainabilityRating: "A",
      reliabilityRating: "A",
      securityRating: "B+",
      securityHotspots: 3,
      newBugs: 0,
      newVulnerabilities: 0,
      newCodeSmells: 2,
      newCoverage: 92.1,
      newDuplicatedLines: 45,
      newTechnicalDebt: "1.2h",
      qualityGate: {
        status: "Passed",
        conditions: [
          { metric: "Coverage", status: "Passed", value: "89.2%", threshold: "80%" },
          { metric: "Duplicated Lines", status: "Passed", value: "3.2%", threshold: "5%" },
          { metric: "Maintainability", status: "Passed", value: "A", threshold: "A" },
          { metric: "Reliability", status: "Passed", value: "A", threshold: "A" },
          { metric: "Security", status: "Passed", value: "B+", threshold: "B" }
        ]
      },
      trends: {
        coverage: "+2.1%",
        bugs: "-1",
        vulnerabilities: "-2",
        technicalDebt: "-1.5h"
      }
    },
    {
      id: "QM-002",
      project: "Port Management Mobile App",
      repository: "npa-mobile/port-management",
      lastScan: "2024-12-10 13:45:10",
      status: "Warning",
      grade: "B+",
      coverage: 76.8,
      complexity: 18.2,
      maintainability: "B+",
      reliability: "A",
      security: "A",
      duplications: 4.8,
      technicalDebt: "12.3h",
      bugs: 5,
      vulnerabilities: 0,
      codeSmells: 28,
      linesOfCode: 8750,
      linesToCover: 1050,
      uncoveredLines: 243,
      duplicatedLines: 420,
      cognitiveComplexity: 189,
      cyclomaticComplexity: 134,
      maintainabilityRating: "B+",
      reliabilityRating: "A",
      securityRating: "A",
      securityHotspots: 1,
      newBugs: 1,
      newVulnerabilities: 0,
      newCodeSmells: 5,
      newCoverage: 78.5,
      newDuplicatedLines: 67,
      newTechnicalDebt: "2.1h",
      qualityGate: {
        status: "Warning",
        conditions: [
          { metric: "Coverage", status: "Failed", value: "76.8%", threshold: "80%" },
          { metric: "Duplicated Lines", status: "Passed", value: "4.8%", threshold: "5%" },
          { metric: "Maintainability", status: "Passed", value: "B+", threshold: "B" },
          { metric: "Reliability", status: "Passed", value: "A", threshold: "A" },
          { metric: "Security", status: "Passed", value: "A", threshold: "B" }
        ]
      },
      trends: {
        coverage: "+1.2%",
        bugs: "+1",
        vulnerabilities: "0",
        technicalDebt: "+0.8h"
      }
    },
    {
      id: "QM-003",
      project: "API Gateway Migration",
      repository: "npa-backend/api-gateway",
      lastScan: "2024-12-10 12:20:45",
      status: "Passed",
      grade: "A+",
      coverage: 94.5,
      complexity: 8.7,
      maintainability: "A+",
      reliability: "A",
      security: "A",
      duplications: 1.8,
      technicalDebt: "4.2h",
      bugs: 0,
      vulnerabilities: 0,
      codeSmells: 8,
      linesOfCode: 12300,
      linesToCover: 890,
      uncoveredLines: 49,
      duplicatedLines: 221,
      cognitiveComplexity: 156,
      cyclomaticComplexity: 98,
      maintainabilityRating: "A+",
      reliabilityRating: "A",
      securityRating: "A",
      securityHotspots: 0,
      newBugs: 0,
      newVulnerabilities: 0,
      newCodeSmells: 1,
      newCoverage: 95.1,
      newDuplicatedLines: 23,
      newTechnicalDebt: "0.5h",
      qualityGate: {
        status: "Passed",
        conditions: [
          { metric: "Coverage", status: "Passed", value: "94.5%", threshold: "80%" },
          { metric: "Duplicated Lines", status: "Passed", value: "1.8%", threshold: "5%" },
          { metric: "Maintainability", status: "Passed", value: "A+", threshold: "A" },
          { metric: "Reliability", status: "Passed", value: "A", threshold: "A" },
          { metric: "Security", status: "Passed", value: "A", threshold: "B" }
        ]
      },
      trends: {
        coverage: "+0.6%",
        bugs: "0",
        vulnerabilities: "0",
        technicalDebt: "-0.3h"
      }
    },
    {
      id: "QM-004",
      project: "Data Analytics Dashboard",
      repository: "npa-analytics/dashboard",
      lastScan: "2024-12-10 11:15:30",
      status: "Passed",
      grade: "A",
      coverage: 91.3,
      complexity: 14.1,
      maintainability: "A",
      reliability: "A",
      security: "A-",
      duplications: 2.5,
      technicalDebt: "6.8h",
      bugs: 1,
      vulnerabilities: 1,
      codeSmells: 12,
      linesOfCode: 18900,
      linesToCover: 1450,
      uncoveredLines: 125,
      duplicatedLines: 472,
      cognitiveComplexity: 267,
      cyclomaticComplexity: 178,
      maintainabilityRating: "A",
      reliabilityRating: "A",
      securityRating: "A-",
      securityHotspots: 2,
      newBugs: 0,
      newVulnerabilities: 0,
      newCodeSmells: 2,
      newCoverage: 92.0,
      newDuplicatedLines: 38,
      newTechnicalDebt: "0.8h",
      qualityGate: {
        status: "Passed",
        conditions: [
          { metric: "Coverage", status: "Passed", value: "91.3%", threshold: "80%" },
          { metric: "Duplicated Lines", status: "Passed", value: "2.5%", threshold: "5%" },
          { metric: "Maintainability", status: "Passed", value: "A", threshold: "A" },
          { metric: "Reliability", status: "Passed", value: "A", threshold: "A" },
          { metric: "Security", status: "Passed", value: "A-", threshold: "B" }
        ]
      },
      trends: {
        coverage: "+0.7%",
        bugs: "0",
        vulnerabilities: "0",
        technicalDebt: "-0.2h"
      }
    },
    {
      id: "QM-005",
      project: "Security Audit Tool",
      repository: "npa-security/audit-tool",
      lastScan: "2024-12-10 10:30:15",
      status: "Failed",
      grade: "C+",
      coverage: 68.4,
      complexity: 22.8,
      maintainability: "C+",
      reliability: "B",
      security: "A+",
      duplications: 7.2,
      technicalDebt: "28.5h",
      bugs: 12,
      vulnerabilities: 2,
      codeSmells: 45,
      linesOfCode: 11200,
      linesToCover: 1680,
      uncoveredLines: 531,
      duplicatedLines: 806,
      cognitiveComplexity: 389,
      cyclomaticComplexity: 267,
      maintainabilityRating: "C+",
      reliabilityRating: "B",
      securityRating: "A+",
      securityHotspots: 1,
      newBugs: 3,
      newVulnerabilities: 1,
      newCodeSmells: 8,
      newCoverage: 69.1,
      newDuplicatedLines: 89,
      newTechnicalDebt: "4.2h",
      qualityGate: {
        status: "Failed",
        conditions: [
          { metric: "Coverage", status: "Failed", value: "68.4%", threshold: "80%" },
          { metric: "Duplicated Lines", status: "Failed", value: "7.2%", threshold: "5%" },
          { metric: "Maintainability", status: "Failed", value: "C+", threshold: "A" },
          { metric: "Reliability", status: "Failed", value: "B", threshold: "A" },
          { metric: "Security", status: "Passed", value: "A+", threshold: "B" }
        ]
      },
      trends: {
        coverage: "+0.7%",
        bugs: "+3",
        vulnerabilities: "+1",
        technicalDebt: "+2.1h"
      }
    }
  ];

  const projectOptions = [
    { value: "all", label: "All Projects" },
    { value: "ecm", label: "ECM System Enhancement" },
    { value: "mobile", label: "Port Management Mobile App" },
    { value: "api", label: "API Gateway Migration" },
    { value: "analytics", label: "Data Analytics Dashboard" },
    { value: "security", label: "Security Audit Tool" }
  ];

  const qualityOptions = [
    { value: "all", label: "All Quality" },
    { value: "passed", label: "Passed" },
    { value: "warning", label: "Warning" },
    { value: "failed", label: "Failed" }
  ];

  const filteredMetrics = qualityMetrics.filter(metric => {
    const matchesSearch = metric.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         metric.repository.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProject = projectFilter === "all" || 
                          metric.project.toLowerCase().includes(projectFilter);
    const matchesQuality = qualityFilter === "all" || 
                          metric.status.toLowerCase() === qualityFilter;
    
    return matchesSearch && matchesProject && matchesQuality;
  });

  const statusColorMap = {
    'Passed': 'bg-green-100 text-green-800',
    'Warning': 'bg-yellow-100 text-yellow-800',
    'Failed': 'bg-red-100 text-red-800'
  };

  const gradeColorMap = {
    'A+': 'bg-green-100 text-green-800',
    'A': 'bg-green-100 text-green-800',
    'A-': 'bg-green-100 text-green-800',
    'B+': 'bg-yellow-100 text-yellow-800',
    'B': 'bg-yellow-100 text-yellow-800',
    'B-': 'bg-yellow-100 text-yellow-800',
    'C+': 'bg-orange-100 text-orange-800',
    'C': 'bg-orange-100 text-orange-800',
    'C-': 'bg-orange-100 text-orange-800',
    'D': 'bg-red-100 text-red-800',
    'E': 'bg-red-100 text-red-800'
  };

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 90) return 'bg-green-100 text-green-800';
    if (coverage >= 80) return 'bg-yellow-100 text-yellow-800';
    if (coverage >= 70) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getComplexityColor = (complexity: number) => {
    if (complexity <= 10) return 'bg-green-100 text-green-800';
    if (complexity <= 20) return 'bg-yellow-100 text-yellow-800';
    if (complexity <= 30) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getTrendIcon = (trend: string) => {
    if (trend.startsWith('+')) return <TrendingUp className="w-3 h-3 text-green-600" />;
    if (trend.startsWith('-')) return <TrendingDown className="w-3 h-3 text-red-600" />;
    return <Minus className="w-3 h-3 text-gray-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Software Quality</h1>
          <p className="text-gray-600">Monitor and analyze code quality metrics across all projects</p>
        </div>
        <div className="flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh All
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <BarChart3 className="w-4 h-4 mr-2" />
            Quality Report
          </button>
        </div>
      </div>

      {/* Quality Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {qualityStats.map((stat) => (
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
                stat.status === 'Improving' ? 'bg-green-100 text-green-800' :
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
                placeholder="Search projects by name or repository..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {projectOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={qualityFilter}
              onChange={(e) => setQualityFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {qualityOptions.map(option => (
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

      {/* Quality Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredMetrics.map((metric) => (
          <div key={metric.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Award className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{metric.project}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[metric.status as keyof typeof statusColorMap]}`}>
                    {metric.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${gradeColorMap[metric.grade as keyof typeof gradeColorMap]}`}>
                    Grade: {metric.grade}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{metric.repository}</p>
                <div className="text-sm text-gray-500 space-y-1">
                  <p><span className="font-medium">Last Scan:</span> {metric.lastScan}</p>
                  <p><span className="font-medium">Lines of Code:</span> {metric.linesOfCode.toLocaleString()}</p>
                  <p><span className="font-medium">Technical Debt:</span> {metric.technicalDebt}</p>
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
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Coverage</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCoverageColor(metric.coverage)}`}>
                    {metric.coverage}%
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Complexity</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getComplexityColor(metric.complexity)}`}>
                    {metric.complexity}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Maintainability</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${gradeColorMap[metric.maintainability as keyof typeof gradeColorMap]}`}>
                    {metric.maintainability}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Reliability</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${gradeColorMap[metric.reliability as keyof typeof gradeColorMap]}`}>
                    {metric.reliability}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Code Coverage</span>
                  <span>{metric.coverage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      metric.coverage >= 90 ? 'bg-green-600' :
                      metric.coverage >= 80 ? 'bg-yellow-600' :
                      metric.coverage >= 70 ? 'bg-orange-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${metric.coverage}%` }}
                  ></div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Quality Issues:</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Bugs</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-900">{metric.bugs}</span>
                      {getTrendIcon(metric.trends.bugs)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Vulnerabilities</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-900">{metric.vulnerabilities}</span>
                      {getTrendIcon(metric.trends.vulnerabilities)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Code Smells</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-900">{metric.codeSmells}</span>
                      <TrendingUp className="w-3 h-3 text-yellow-600" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Duplications</span>
                    <span className="text-gray-900">{metric.duplications}%</span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Quality Gate:</p>
                <div className="space-y-2">
                  {metric.qualityGate.conditions.map((condition, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{condition.metric}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-900">{condition.value}</span>
                        <span className={`px-1 py-0.5 text-xs rounded ${
                          condition.status === 'Passed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {condition.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                    <BarChart3 className="w-3 h-3 mr-1" />
                    Details
                  </button>
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    <Settings className="w-3 h-3 mr-1" />
                    Configure
                  </button>
                </div>
                <Link
                  href={`/ict/software/quality/${metric.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Report →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quality Trends */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Quality Trends (Last 30 Days)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Code Coverage</h3>
                <p className="text-xs text-gray-500">Average across projects</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Current: 87.3%</p>
              <p>Trend: +2.1% this month</p>
              <p>Target: 90%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <Bug className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Bug Density</h3>
                <p className="text-xs text-gray-500">Bugs per 1000 LOC</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Current: 2.3</p>
              <p>Trend: -0.8 this month</p>
              <p>Target: &lt; 2.0</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Technical Debt</h3>
                <p className="text-xs text-gray-500">Remediation time</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Current: 15.2h</p>
              <p>Trend: -3.5h this month</p>
              <p>Target: &lt; 10h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quality Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/ict/software/quality/scan"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Play className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Run Quality Scan</h3>
            <p className="text-xs text-gray-500">Start quality analysis</p>
          </Link>
          <Link
            href="/ict/software/quality/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Quality Reports</h3>
            <p className="text-xs text-gray-500">Generate reports</p>
          </Link>
          <Link
            href="/ict/software/quality/rules"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Quality Rules</h3>
            <p className="text-xs text-gray-500">Configure rules</p>
          </Link>
          <Link
            href="/ict/software/quality/dashboard"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Quality Dashboard</h3>
            <p className="text-xs text-gray-500">View dashboard</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
