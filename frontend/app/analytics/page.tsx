"use client";

import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  Activity,
  Calendar,
  Download,
  Filter
} from "lucide-react";
import {
  LazyMemoStatusChart,
  LazyDocumentTrendChart,
  LazyDepartmentActivityChart,
  LazyWorkflowCompletionChart,
  LazyUserActivityRadar
} from "@/lib/performance/lazyComponents";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30d");

  // Mock analytics data
  const memoStatusData = [12, 8, 15, 25, 3]; // Draft, Pending, In Review, Approved, Rejected

  const documentTrendData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    values: [65, 78, 90, 81, 95, 102]
  };

  const departmentActivityData = {
    labels: ["Finance & Accounts", "Human Resources", "Operations", "ICT", "Legal", "Procurement"],
    values: [45, 32, 28, 52, 18, 35]
  };

  const workflowCompletionData = {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    completed: [28, 35, 42, 38],
    pending: [8, 12, 6, 15]
  };

  const userActivityData = {
    labels: ["Documents Created", "Approvals Given", "Reviews Completed", "Queries Handled", "Reports Generated"],
    values: [85, 92, 78, 88, 65]
  };

  const stats = [
    {
      title: "Total Documents",
      value: "2,847",
      change: "+12.5%",
      changeType: "positive",
      icon: FileText,
    },
    {
      title: "Active Workflows",
      value: "156",
      change: "+8.2%",
      changeType: "positive",
      icon: Activity,
    },
    {
      title: "Active Users",
      value: "423",
      change: "+15.3%",
      changeType: "positive",
      icon: Users,
    },
    {
      title: "Avg. Processing Time",
      value: "2.4 days",
      change: "-5.1%",
      changeType: "positive",
      icon: Calendar,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive insights into ECM system performance</p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>

          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-sm font-medium ${
                  stat.changeType === "positive" ? "text-green-600" : "text-red-600"
                }`}>
                  {stat.change}
                </span>
                <span className="text-sm text-gray-500 ml-2">vs last period</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Trends */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Document Upload Trends</h3>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <LazyDocumentTrendChart data={documentTrendData} />
        </div>

        {/* Memo Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Memo Status Distribution</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <LazyMemoStatusChart data={memoStatusData} />
        </div>

        {/* Department Activity */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Department Activity</h3>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <LazyDepartmentActivityChart data={departmentActivityData} />
        </div>

        {/* Workflow Completion */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Workflow Completion</h3>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          <LazyWorkflowCompletionChart data={workflowCompletionData} />
        </div>
      </div>

      {/* User Activity Radar */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">User Activity Overview</h3>
          <Users className="w-5 h-5 text-gray-400" />
        </div>
        <div className="max-w-md mx-auto">
          <LazyUserActivityRadar data={userActivityData} />
        </div>
      </div>

      {/* Detailed Reports Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <h4 className="font-medium text-gray-900">Monthly Activity Report</h4>
            <p className="text-sm text-gray-600 mt-1">Comprehensive monthly analytics</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <h4 className="font-medium text-gray-900">Department Performance</h4>
            <p className="text-sm text-gray-600 mt-1">Department-wise productivity metrics</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <h4 className="font-medium text-gray-900">User Engagement Report</h4>
            <p className="text-sm text-gray-600 mt-1">User activity and engagement data</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <h4 className="font-medium text-gray-900">Workflow Efficiency</h4>
            <p className="text-sm text-gray-600 mt-1">Approval process performance metrics</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <h4 className="font-medium text-gray-900">Document Lifecycle</h4>
            <p className="text-sm text-gray-600 mt-1">Document creation to archive analytics</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <h4 className="font-medium text-gray-900">Compliance Report</h4>
            <p className="text-sm text-gray-600 mt-1">Regulatory compliance metrics</p>
          </div>
        </div>
      </div>
    </div>
  );
}

