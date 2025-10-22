"use client";

import { useState } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  FileText, 
  Users, 
  Clock,
  Download,
  Filter,
  Calendar,
  Building,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  // Mock data
  const dashboardStats = [
    {
      title: "Total Documents",
      value: "12,847",
      change: "+12.5%",
      changeType: "increase",
      icon: FileText,
      color: "text-blue-600"
    },
    {
      title: "Active Workflows",
      value: "45",
      change: "-3.2%",
      changeType: "decrease",
      icon: Clock,
      color: "text-yellow-600"
    },
    {
      title: "Completed Approvals",
      value: "2,341",
      change: "+18.7%",
      changeType: "increase",
      icon: CheckCircle,
      color: "text-green-600"
    },
    {
      title: "Overdue Tasks",
      value: "12",
      change: "-25%",
      changeType: "decrease",
      icon: AlertTriangle,
      color: "text-red-600"
    }
  ];

  const departmentStats = [
    { department: "Finance", documents: 3420, workflows: 23, completed: 1892 },
    { department: "Operations", documents: 2891, workflows: 34, completed: 1567 },
    { department: "Human Resources", documents: 2156, workflows: 18, completed: 1234 },
    { department: "Security", documents: 1876, workflows: 12, completed: 987 },
    { department: "Technical", documents: 2504, workflows: 21, completed: 1345 }
  ];

  const workflowMetrics = [
    { type: "Memo", avgTime: "2.5", completionRate: "94%" },
    { type: "Report", avgTime: "5.2", completionRate: "87%" },
    { type: "Policy", avgTime: "7.8", completionRate: "92%" },
    { type: "Contract", avgTime: "12.4", completionRate: "79%" }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Monitor ECM system performance and usage metrics</p>
        </div>
        <div className="flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Date and Department Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Period
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Departments</option>
              <option value="finance">Finance</option>
              <option value="operations">Operations</option>
              <option value="hr">Human Resources</option>
              <option value="security">Security</option>
              <option value="technical">Technical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat) => (
          <MetricCard key={stat.title} stat={stat} />
        ))}
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Performance */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Department Performance</h2>
            <Building className="h-6 w-6 text-gray-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-sm font-medium text-gray-600">Department</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-600">Documents</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-600">Workflows</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-600">Completed</th>
                </tr>
              </thead>
              <tbody>
                {departmentStats.map((dept) => (
                  <tr key={dept.department} className="border-b border-gray-100">
                    <td className="py-3 text-sm font-medium text-gray-900">{dept.department}</td>
                    <td className="py-3 text-sm text-gray-600 text-right">{dept.documents.toLocaleString()}</td>
                    <td className="py-3 text-sm text-gray-600 text-right">{dept.workflows}</td>
                    <td className="py-3 text-sm text-gray-600 text-right">{dept.completed.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Workflow Metrics */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Workflow Performance</h2>
            <TrendingUp className="h-6 w-6 text-gray-400" />
          </div>
          <div className="space-y-4">
            {workflowMetrics.map((metric) => (
              <div key={metric.type} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{metric.type}</p>
                  <p className="text-xs text-gray-500">Avg completion time</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{metric.avgTime} days</p>
                  <p className="text-xs text-gray-500">{metric.completionRate} completion rate</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Document Type Distribution */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Document Type Distribution</h2>
          <BarChart3 className="h-6 w-6 text-gray-400" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="font-medium text-gray-900">Reports</h3>
            <p className="text-2xl font-bold text-blue-600">3,420</p>
            <p className="text-xs text-gray-500">26.6%</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="font-medium text-gray-900">Policies</h3>
            <p className="text-2xl font-bold text-green-600">2,891</p>
            <p className="text-xs text-gray-500">22.5%</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="font-medium text-gray-900">Contracts</h3>
            <p className="text-2xl font-bold text-purple-600">2,156</p>
            <p className="text-xs text-gray-500">16.8%</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="h-8 w-8 text-yellow-600" />
            </div>
            <h3 className="font-medium text-gray-900">Memos</h3>
            <p className="text-2xl font-bold text-yellow-600">1,876</p>
            <p className="text-xs text-gray-500">14.6%</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="h-8 w-8 text-gray-600" />
            </div>
            <h3 className="font-medium text-gray-900">Others</h3>
            <p className="text-2xl font-bold text-gray-600">2,504</p>
            <p className="text-xs text-gray-500">19.5%</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Recent System Activity</h2>
          <Clock className="h-6 w-6 text-gray-400" />
        </div>
        <div className="space-y-4">
          {[
            { action: "Document uploaded", user: "John Smith", time: "2 minutes ago", type: "upload" },
            { action: "Workflow approved", user: "Sarah Wilson", time: "15 minutes ago", type: "approval" },
            { action: "Policy updated", user: "Mike Johnson", time: "1 hour ago", type: "update" },
            { action: "Report generated", user: "System", time: "2 hours ago", type: "system" }
          ].map((activity, index) => (
            <div key={index} className="flex items-center space-x-4 py-3 border-b border-gray-100 last:border-b-0">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  activity.type === "upload" ? "bg-blue-100" :
                  activity.type === "approval" ? "bg-green-100" :
                  activity.type === "update" ? "bg-yellow-100" : "bg-gray-100"
                }`}>
                  <Users className="h-4 w-4 text-gray-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                <p className="text-sm text-gray-500">by {activity.user} • {activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ stat }: { stat: any }) {
  const Icon = stat.icon;
  const isIncrease = stat.changeType === "increase";
  
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{stat.title}</p>
          <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
          <div className="flex items-center mt-2">
            <span className={`text-sm font-medium ${isIncrease ? "text-green-600" : "text-red-600"}`}>
              {stat.change}
            </span>
            <span className="text-xs text-gray-500 ml-2">from last period</span>
          </div>
        </div>
        <Icon className={`h-8 w-8 ${stat.color}`} />
      </div>
    </div>
  );
}
