"use client";

import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  FileText,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Building,
  Download,
  Filter
} from "lucide-react";
import { NPA_DEPARTMENTS } from "@/lib/npa-structure";

export default function DepartmentReportsPage() {
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [timeRange, setTimeRange] = useState("30days");

  // Mock department statistics
  const departmentStats = {
    "Finance & Accounts": {
      documentsProcessed: 1247,
      avgProcessingTime: "2.3 days",
      pendingApprovals: 12,
      completedThisMonth: 89,
      staffCount: 45,
      efficiency: 94,
      topCategories: ["Budget", "Payments", "Audits"]
    },
    "Commercial Services": {
      documentsProcessed: 892,
      avgProcessingTime: "1.8 days",
      pendingApprovals: 8,
      completedThisMonth: 67,
      staffCount: 38,
      efficiency: 96,
      topCategories: ["Contracts", "Tariffs", "Customer Relations"]
    },
    "Technical Services": {
      documentsProcessed: 2156,
      avgProcessingTime: "3.1 days",
      pendingApprovals: 15,
      completedThisMonth: 145,
      staffCount: 67,
      efficiency: 89,
      topCategories: ["Maintenance", "Projects", "Safety"]
    },
    "Security": {
      documentsProcessed: 678,
      avgProcessingTime: "1.2 days",
      pendingApprovals: 5,
      completedThisMonth: 43,
      staffCount: 89,
      efficiency: 98,
      topCategories: ["Incidents", "Access", "Equipment"]
    },
    "Human Resources": {
      documentsProcessed: 445,
      avgProcessingTime: "2.7 days",
      pendingApprovals: 18,
      completedThisMonth: 34,
      staffCount: 32,
      efficiency: 91,
      topCategories: ["Recruitment", "Training", "Policies"]
    }
  };

  const overallStats = {
    totalDocuments: Object.values(departmentStats).reduce((sum, dept) => sum + dept.documentsProcessed, 0),
    totalPending: Object.values(departmentStats).reduce((sum, dept) => sum + dept.pendingApprovals, 0),
    totalCompleted: Object.values(departmentStats).reduce((sum, dept) => sum + dept.completedThisMonth, 0),
    avgEfficiency: Math.round(Object.values(departmentStats).reduce((sum, dept) => sum + dept.efficiency, 0) / Object.keys(departmentStats).length)
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 95) return "text-green-600 bg-green-50";
    if (efficiency >= 90) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const filteredStats = selectedDepartment === "all"
    ? departmentStats
    : { [selectedDepartment]: departmentStats[selectedDepartment as keyof typeof departmentStats] };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Department Reports</h1>
          <p className="text-gray-600">Performance analytics and metrics for all departments</p>
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
            Export Report
          </button>
        </div>
      </div>

      {/* Overall Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900">{overallStats.totalDocuments.toLocaleString()}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
            <span className="text-sm text-green-600">+12% from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed This Month</p>
              <p className="text-2xl font-bold text-gray-900">{overallStats.totalCompleted}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
            <span className="text-sm text-green-600">+8% from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
              <p className="text-2xl font-bold text-gray-900">{overallStats.totalPending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <div className="mt-4 flex items-center">
            <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
            <span className="text-sm text-red-600">-5% from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Efficiency</p>
              <p className="text-2xl font-bold text-gray-900">{overallStats.avgEfficiency}%</p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-600" />
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
            <span className="text-sm text-green-600">+2% from last month</span>
          </div>
        </div>
      </div>

      {/* Department Filter */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by Department:</label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Departments</option>
            {Object.keys(NPA_DEPARTMENTS).map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Department Performance Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(filteredStats).map(([deptName, stats]) => (
          <div key={deptName} className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Building className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{deptName}</h3>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEfficiencyColor(stats.efficiency)}`}>
                  {stats.efficiency}% Efficiency
                </span>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-blue-900">{stats.documentsProcessed}</p>
                  <p className="text-xs text-blue-700">Documents</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <Users className="w-6 h-6 text-green-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-green-900">{stats.staffCount}</p>
                  <p className="text-xs text-green-700">Staff</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Completed This Month</span>
                  <span className="text-sm font-medium text-gray-900">{stats.completedThisMonth}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pending Approvals</span>
                  <span className="text-sm font-medium text-gray-900">{stats.pendingApprovals}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg Processing Time</span>
                  <span className="text-sm font-medium text-gray-900">{stats.avgProcessingTime}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Top Categories:</p>
                <div className="flex flex-wrap gap-2">
                  {stats.topCategories.map((category, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Trends */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance Trends</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-2">↑ 15%</div>
            <p className="text-sm text-gray-600">Document Processing Increase</p>
            <p className="text-xs text-gray-500 mt-1">Compared to last month</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">↓ 20%</div>
            <p className="text-sm text-gray-600">Average Processing Time</p>
            <p className="text-xs text-gray-500 mt-1">Efficiency improvement</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-2">↑ 8%</div>
            <p className="text-sm text-gray-600">Staff Productivity</p>
            <p className="text-xs text-gray-500 mt-1">Per employee metrics</p>
          </div>
        </div>
      </div>
    </div>
  );
}
