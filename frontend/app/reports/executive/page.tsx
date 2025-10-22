"use client";

import { useState } from "react";
import {
  Crown,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Target,
  Calendar,
  Building,
  Award,
  Zap,
  Shield,
  Download,
  Filter
} from "lucide-react";

export default function ExecutiveReportsPage() {
  const [timeRange, setTimeRange] = useState("30days");
  const [selectedMetric, setSelectedMetric] = useState("overview");

  // Executive-level KPIs and metrics
  const executiveMetrics = {
    strategic: {
      title: "Strategic Performance",
      kpis: [
        {
          name: "Operational Efficiency",
          value: "94.2%",
          change: "+2.1%",
          trend: "up",
          target: "95%",
          status: "on_track"
        },
        {
          name: "Revenue Growth",
          value: "₦45.2B",
          change: "+12.5%",
          trend: "up",
          target: "₦50B",
          status: "on_track"
        },
        {
          name: "Cost Reduction",
          value: "₦2.8B",
          change: "+18.3%",
          trend: "up",
          target: "₦3B",
          status: "ahead"
        },
        {
          name: "Customer Satisfaction",
          value: "4.6/5",
          change: "+0.2",
          trend: "up",
          target: "4.8/5",
          status: "on_track"
        }
      ]
    },
    operational: {
      title: "Operational Excellence",
      kpis: [
        {
          name: "Document Processing Time",
          value: "2.1 days",
          change: "-0.3 days",
          trend: "up",
          target: "1.5 days",
          status: "improving"
        },
        {
          name: "Approval Completion Rate",
          value: "96.8%",
          change: "+1.2%",
          trend: "up",
          target: "98%",
          status: "on_track"
        },
        {
          name: "System Uptime",
          value: "99.9%",
          change: "0.0%",
          trend: "stable",
          target: "99.5%",
          status: "exceeded"
        },
        {
          name: "Security Incidents",
          value: "0",
          change: "-100%",
          trend: "up",
          target: "≤2",
          status: "exceeded"
        }
      ]
    }
  };

  // Executive approval workflows
  const approvalWorkflows = [
    {
      id: "wf-001",
      title: "Annual Budget 2025",
      type: "Budget",
      priority: "critical",
      status: "awaiting_md",
      currentStep: "MD Review",
      initiatedBy: "GM Finance",
      initiatedDate: "2024-12-01",
      deadline: "2024-12-15",
      progress: 85,
      steps: [
        { role: "Finance Manager", status: "completed", date: "2024-12-01" },
        { role: "GM Finance", status: "completed", date: "2024-12-03" },
        { role: "AGM Finance", status: "completed", date: "2024-12-05" },
        { role: "ED Finance & Admin", status: "completed", date: "2024-12-08" },
        { role: "MD", status: "pending", date: null }
      ]
    },
    {
      id: "wf-002",
      title: "ICT Infrastructure Upgrade",
      type: "Technical",
      priority: "high",
      status: "awaiting_gm_approval",
      currentStep: "GM ICT Approval",
      initiatedBy: "ICT Manager",
      initiatedDate: "2024-11-28",
      deadline: "2024-12-10",
      progress: 75,
      steps: [
        { role: "ICT Officer", status: "completed", date: "2024-11-28" },
        { role: "ICT Manager", status: "completed", date: "2024-11-30" },
        { role: "AGM ICT", status: "completed", date: "2024-12-02" },
        { role: "GM ICT", status: "pending", date: null },
        { role: "ED Engineering", status: "pending", date: null },
        { role: "MD", status: "pending", date: null }
      ]
    },
    {
      id: "wf-003",
      title: "Terminal Lease Agreement",
      type: "Commercial",
      priority: "high",
      status: "completed",
      currentStep: "Completed",
      initiatedBy: "Commercial Manager",
      initiatedDate: "2024-11-20",
      deadline: "2024-12-05",
      progress: 100,
      steps: [
        { role: "Commercial Officer", status: "completed", date: "2024-11-20" },
        { role: "Commercial Manager", status: "completed", date: "2024-11-22" },
        { role: "GM Commercial", status: "completed", date: "2024-11-25" },
        { role: "Legal Counsel", status: "completed", date: "2024-11-28" },
        { role: "MD", status: "completed", date: "2024-12-01" }
      ]
    }
  ];

  // Leadership team performance
  const leadershipPerformance = {
    md: {
      name: "Managing Director",
      metrics: {
        decisionsMade: 247,
        avgDecisionTime: "1.2 days",
        approvalsGranted: 189,
        approvalsDenied: 23,
        pendingReview: 35,
        efficiency: 97
      },
      recentActions: [
        "Approved ₦50M ICT infrastructure upgrade",
        "Signed terminal lease agreement for Lekki Port",
        "Authorized emergency maintenance budget",
        "Reviewed Q4 operational performance"
      ]
    },
    eds: [
      {
        name: "ED Finance & Administration",
        metrics: {
          decisionsMade: 156,
          avgDecisionTime: "2.1 days",
          approvalsGranted: 134,
          approvalsDenied: 12,
          pendingReview: 10,
          efficiency: 94
        }
      },
      {
        name: "ED Marine & Operations",
        metrics: {
          decisionsMade: 203,
          avgDecisionTime: "1.8 days",
          approvalsGranted: 178,
          approvalsDenied: 15,
          pendingReview: 10,
          efficiency: 96
        }
      },
      {
        name: "ED Engineering & Technical",
        metrics: {
          decisionsMade: 189,
          avgDecisionTime: "2.3 days",
          approvalsGranted: 156,
          approvalsDenied: 22,
          pendingReview: 11,
          efficiency: 92
        }
      }
    ],
    gms: [
      {
        name: "GM ICT",
        department: "Information & Communication Technology",
        metrics: {
          approvalsProcessed: 89,
          avgProcessingTime: "1.5 days",
          efficiency: 98,
          pendingItems: 3
        }
      },
      {
        name: "GM Finance",
        department: "Finance & Accounts",
        metrics: {
          approvalsProcessed: 124,
          avgProcessingTime: "2.1 days",
          efficiency: 95,
          pendingItems: 7
        }
      },
      {
        name: "GM Commercial",
        department: "Commercial Services",
        metrics: {
          approvalsProcessed: 156,
          avgProcessingTime: "1.8 days",
          efficiency: 97,
          pendingItems: 4
        }
      }
    ]
  };

  // Risk and compliance metrics
  const riskMetrics = {
    compliance: {
      title: "Regulatory Compliance",
      score: 98.5,
      trend: "stable",
      issues: 2,
      lastAudit: "2024-11-15",
      nextAudit: "2025-02-15"
    },
    security: {
      title: "Information Security",
      score: 99.2,
      trend: "improving",
      incidents: 0,
      lastAssessment: "2024-12-01",
      certifications: ["ISO 27001", "NIST Framework"]
    },
    governance: {
      title: "Corporate Governance",
      score: 96.8,
      trend: "improving",
      boardMeetings: 12,
      policiesUpdated: 8,
      trainingCompleted: 94
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "exceeded":
      case "ahead":
        return "text-green-600 bg-green-50";
      case "on_track":
      case "stable":
        return "text-blue-600 bg-blue-50";
      case "improving":
        return "text-yellow-600 bg-yellow-50";
      case "behind":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <BarChart3 className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Crown className="w-8 h-8 text-yellow-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Executive Reports</h1>
            <p className="text-gray-600">Strategic insights and leadership performance dashboard</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="90days">Last 90 days</option>
            <option value="1year">Last year</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            <Download className="w-4 h-4 inline mr-2" />
            Export Executive Summary
          </button>
        </div>
      </div>

      {/* Metric Selector */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Focus Area:</span>
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedMetric("overview")}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                selectedMetric === "overview"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setSelectedMetric("strategic")}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                selectedMetric === "strategic"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Strategic KPIs
            </button>
            <button
              onClick={() => setSelectedMetric("operational")}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                selectedMetric === "operational"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Operational KPIs
            </button>
          </div>
        </div>
      </div>

      {/* Strategic KPIs */}
      {(selectedMetric === "overview" || selectedMetric === "strategic") && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Target className="w-5 h-5 mr-2 text-blue-600" />
              Strategic Performance KPIs
            </h2>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {executiveMetrics.strategic.kpis.map((kpi, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">{kpi.name}</span>
                    {getTrendIcon(kpi.trend)}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{kpi.value}</div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(kpi.status)}`}>
                      {kpi.status.replace("_", " ").toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">Target: {kpi.target}</span>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    Change: {kpi.change}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Operational KPIs */}
      {(selectedMetric === "overview" || selectedMetric === "operational") && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-green-600" />
              Operational Excellence KPIs
            </h2>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {executiveMetrics.operational.kpis.map((kpi, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">{kpi.name}</span>
                    {getTrendIcon(kpi.trend)}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{kpi.value}</div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(kpi.status)}`}>
                      {kpi.status.replace("_", " ").toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">Target: {kpi.target}</span>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    Change: {kpi.change}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Critical Approval Workflows */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-orange-600" />
            Critical Approval Workflows
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {approvalWorkflows.map((workflow) => (
            <div key={workflow.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{workflow.title}</h3>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-sm text-gray-600">Type: {workflow.type}</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(workflow.priority)}`}>
                      {workflow.priority.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600">Initiated: {workflow.initiatedDate}</span>
                    <span className="text-sm text-gray-600">Deadline: {workflow.deadline}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{workflow.currentStep}</div>
                  <div className="text-xs text-gray-500">{workflow.progress}% complete</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{workflow.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${workflow.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Approval Steps */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                {workflow.steps.map((step, index) => (
                  <div key={index} className="text-center">
                    <div className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-xs font-medium ${
                      step.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : step.status === "pending"
                        ? "bg-gray-100 text-gray-800"
                        : "bg-blue-100 text-blue-800"
                    }`}>
                      {step.status === "completed" ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : step.status === "pending" ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 truncate">{step.role}</div>
                    {step.date && (
                      <div className="text-xs text-gray-400">{step.date}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leadership Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MD Performance */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Crown className="w-5 h-5 mr-2 text-yellow-600" />
              MD Performance Dashboard
            </h3>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-900">{leadershipPerformance.md.metrics.decisionsMade}</div>
                <div className="text-sm text-yellow-700">Decisions Made</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-900">{leadershipPerformance.md.metrics.efficiency}%</div>
                <div className="text-sm text-green-700">Efficiency</div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Recent Actions</h4>
              {leadershipPerformance.md.recentActions.map((action, index) => (
                <div key={index} className="flex items-start space-x-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ED Performance */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Award className="w-5 h-5 mr-2 text-purple-600" />
              Executive Directors Performance
            </h3>
          </div>

          <div className="p-6">
            {leadershipPerformance.eds.map((ed, index) => (
              <div key={index} className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-gray-900">{ed.name}</span>
                  <span className="text-sm text-gray-500">{ed.metrics.efficiency}% efficiency</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Decisions:</span>
                    <span className="font-medium ml-1">{ed.metrics.decisionsMade}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Avg Time:</span>
                    <span className="font-medium ml-1">{ed.metrics.avgDecisionTime}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GM Performance Overview */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Building className="w-5 h-5 mr-2 text-blue-600" />
            General Managers Performance Overview
          </h3>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {leadershipPerformance.gms.map((gm, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{gm.name}</h4>
                    <p className="text-sm text-gray-600">{gm.department}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-900">{gm.metrics.efficiency}%</div>
                    <div className="text-xs text-gray-500">Efficiency</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Approvals Processed:</span>
                    <span className="font-medium">{gm.metrics.approvalsProcessed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Avg Processing Time:</span>
                    <span className="font-medium">{gm.metrics.avgProcessingTime}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pending Items:</span>
                    <span className="font-medium">{gm.metrics.pendingItems}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk and Compliance */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-green-600" />
            Risk & Compliance Overview
          </h3>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(riskMetrics).map(([key, metric]) => (
              <div key={key} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">{metric.title}</h4>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-900">{metric.score}%</div>
                    <div className="text-xs text-gray-500">Score</div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {key === "compliance" && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Issues:</span>
                        <span className="font-medium">{(metric as any).issues}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Audit:</span>
                        <span className="font-medium">{(metric as any).lastAudit}</span>
                      </div>
                    </>
                  )}
                  {key === "security" && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Incidents:</span>
                        <span className="font-medium">{(metric as any).incidents}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Certifications: {(metric as any).certifications.join(", ")}
                      </div>
                    </>
                  )}
                  {key === "governance" && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Board Meetings:</span>
                        <span className="font-medium">{(metric as any).boardMeetings}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Training Completed:</span>
                        <span className="font-medium">{(metric as any).trainingCompleted}%</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
