"use client";

import { useState } from "react";
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  Download,
  Filter
} from "lucide-react";

export default function ApprovalsReportPage() {
  const [timeRange, setTimeRange] = useState("30days");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  // Mock approval statistics
  const approvalStats = {
    totalApprovals: 1247,
    approved: 892,
    pending: 234,
    rejected: 121,
    avgApprovalTime: "3.2 days",
    approvalRate: 71.5,
    departments: {
      "Finance & Accounts": { total: 245, approved: 198, pending: 32, rejected: 15, avgTime: "2.8 days" },
      "Commercial Services": { total: 189, approved: 156, pending: 28, rejected: 5, avgTime: "2.1 days" },
      "Technical Services": { total: 312, approved: 234, pending: 45, rejected: 33, avgTime: "4.2 days" },
      "Security": { total: 156, approved: 134, pending: 18, rejected: 4, avgTime: "1.9 days" },
      "Human Resources": { total: 98, approved: 78, pending: 15, rejected: 5, avgTime: "3.5 days" },
      "Planning & Development": { total: 134, approved: 92, pending: 42, rejected: 0, avgTime: "5.1 days" },
      "Legal Services": { total: 67, approved: 58, pending: 8, rejected: 1, avgTime: "4.8 days" },
      "Information Technology": { total: 46, approved: 42, pending: 4, rejected: 0, avgTime: "2.3 days" }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "text-green-600 bg-green-50";
      case "pending":
        return "text-yellow-600 bg-yellow-50";
      case "rejected":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const filteredDepartments = departmentFilter === "all"
    ? approvalStats.departments
    : { [departmentFilter]: approvalStats.departments[departmentFilter as keyof typeof approvalStats.departments] };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Approvals Report</h1>
          <p className="text-gray-600">Comprehensive analysis of approval workflows and performance</p>
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

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Approvals</p>
              <p className="text-2xl font-bold text-gray-900">{approvalStats.totalApprovals.toLocaleString()}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
            <span className="text-sm text-green-600">+12% from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approval Rate</p>
              <p className="text-2xl font-bold text-green-900">{approvalStats.approvalRate}%</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
            <span className="text-sm text-green-600">+5% from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
              <p className="text-2xl font-bold text-yellow-900">{approvalStats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <div className="mt-4 flex items-center">
            <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
            <span className="text-sm text-red-600">-3% from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Approval Time</p>
              <p className="text-2xl font-bold text-blue-900">{approvalStats.avgApprovalTime}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
          <div className="mt-4 flex items-center">
            <TrendingDown className="w-4 h-4 text-green-600 mr-1" />
            <span className="text-sm text-green-600">-0.5 days improvement</span>
          </div>
        </div>
      </div>

      {/* Department Filter */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by Department:</label>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Departments</option>
            {Object.keys(approvalStats.departments).map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Department Performance Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Department Approval Performance</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Approved
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pending
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rejected
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Approval Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(filteredDepartments).map(([deptName, stats]) => (
                <tr key={deptName} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {deptName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {stats.total}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {stats.approved}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {stats.pending}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {stats.rejected}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {((stats.approved / stats.total) * 100).toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {stats.avgTime}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Approval Status Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Approval Status Breakdown</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                <span className="text-sm font-medium text-gray-900">Approved</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">{approvalStats.approved}</span>
                <span className="text-sm font-medium text-gray-900">
                  {((approvalStats.approved / approvalStats.totalApprovals) * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-yellow-600 mr-3" />
                <span className="text-sm font-medium text-gray-900">Pending</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">{approvalStats.pending}</span>
                <span className="text-sm font-medium text-gray-900">
                  {((approvalStats.pending / approvalStats.totalApprovals) * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <XCircle className="w-5 h-5 text-red-600 mr-3" />
                <span className="text-sm font-medium text-gray-900">Rejected</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">{approvalStats.rejected}</span>
                <span className="text-sm font-medium text-gray-900">
                  {((approvalStats.rejected / approvalStats.totalApprovals) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance Insights</h3>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center mb-2">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-900">Best Performing</span>
              </div>
              <p className="text-sm text-green-800">
                <strong>Information Technology</strong> has the fastest approval time (2.3 days)
                and highest approval rate (91.3%).
              </p>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                <span className="text-sm font-medium text-yellow-900">Needs Attention</span>
              </div>
              <p className="text-sm text-yellow-800">
                <strong>Planning & Development</strong> has the slowest approval time (5.1 days)
                with 31% of approvals still pending.
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center mb-2">
                <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-900">Improvement Trend</span>
              </div>
              <p className="text-sm text-blue-800">
                Overall approval rate improved by 5% compared to last month,
                with average processing time reduced by 0.5 days.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Approvals */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Approval Activities</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {[
            {
              id: "APPROVAL-2024-001",
              title: "Budget Allocation Request",
              department: "Finance & Accounts",
              approver: "MD",
              status: "approved",
              date: "2024-10-18",
              time: "2.5 days"
            },
            {
              id: "APPROVAL-2024-002",
              title: "Staff Training Program",
              department: "Human Resources",
              approver: "GM Operations",
              status: "approved",
              date: "2024-10-17",
              time: "1.8 days"
            },
            {
              id: "APPROVAL-2024-003",
              title: "Equipment Procurement",
              department: "Technical Services",
              approver: "AGM Technical",
              status: "pending",
              date: "2024-10-16",
              time: "4.2 days"
            },
            {
              id: "APPROVAL-2024-004",
              title: "Security Protocol Update",
              department: "Security",
              approver: "GM Security",
              status: "rejected",
              date: "2024-10-15",
              time: "3.1 days"
            },
            {
              id: "APPROVAL-2024-005",
              title: "Partnership Agreement",
              department: "Commercial Services",
              approver: "MD",
              status: "approved",
              date: "2024-10-14",
              time: "2.9 days"
            }
          ].map((approval) => (
            <div key={approval.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-sm font-medium text-gray-900">{approval.title}</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(approval.status)}`}>
                      {approval.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <span>{approval.department}</span>
                    <span>Approver: {approval.approver}</span>
                    <span>Time: {approval.time}</span>
                    <span>{approval.date}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}