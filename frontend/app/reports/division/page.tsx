"use client";

import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  DollarSign,
  Target,
  Calendar,
  Building,
  Download,
  Filter
} from "lucide-react";

export default function DivisionReportsPage() {
  const [selectedDivision, setSelectedDivision] = useState("all");
  const [timeRange, setTimeRange] = useState("30days");

  // Mock division data
  const divisionStats = {
    "Finance & Administration": {
      departments: ["Finance", "HR", "Procurement", "Administration", "Medical", "Superannuation"],
      totalBudget: "₦8.5B",
      spentBudget: "₦6.2B",
      remainingBudget: "₦2.3B",
      staffCount: 245,
      documentsProcessed: 3456,
      avgProcessingTime: "3.2 days",
      efficiency: 92,
      keyMetrics: {
        revenue: "+12%",
        costSavings: "₦450M",
        employeeSatisfaction: "87%",
        compliance: "98%"
      }
    },
    "Marine & Operations": {
      departments: ["Marine Operations", "Security", "HSE", "Regulatory", "PPP"],
      totalBudget: "₦15.2B",
      spentBudget: "₦12.8B",
      remainingBudget: "₦2.4B",
      staffCount: 312,
      documentsProcessed: 5234,
      avgProcessingTime: "2.8 days",
      efficiency: 95,
      keyMetrics: {
        vesselUtilization: "89%",
        safetyIncidents: "-15%",
        cargoVolume: "+8%",
        compliance: "96%"
      }
    },
    "Engineering & Technical": {
      departments: ["Engineering", "ICT", "Lands & Assets"],
      totalBudget: "₦12.8B",
      spentBudget: "₦9.6B",
      remainingBudget: "₦3.2B",
      staffCount: 198,
      documentsProcessed: 2890,
      avgProcessingTime: "4.1 days",
      efficiency: 88,
      keyMetrics: {
        infrastructureProjects: "12 active",
        systemUptime: "99.5%",
        assetValue: "+5%",
        maintenance: "94% on-time"
      }
    },
    "Corporate Services": {
      departments: ["Corporate Planning", "Communications", "Audit", "Legal", "Tariff"],
      totalBudget: "₦3.9B",
      spentBudget: "₦2.8B",
      remainingBudget: "₦1.1B",
      staffCount: 156,
      documentsProcessed: 1876,
      avgProcessingTime: "2.5 days",
      efficiency: 97,
      keyMetrics: {
        stakeholderEngagement: "+25%",
        compliance: "100%",
        efficiency: "15% improvement",
        customerSatisfaction: "92%"
      }
    }
  };

  const overallStats = {
    totalBudget: Object.values(divisionStats).reduce((sum, div) =>
      sum + parseFloat(div.totalBudget.replace(/[₦B]/g, '')), 0),
    totalSpent: Object.values(divisionStats).reduce((sum, div) =>
      sum + parseFloat(div.spentBudget.replace(/[₦B]/g, '')), 0),
    totalStaff: Object.values(divisionStats).reduce((sum, div) => sum + div.staffCount, 0),
    totalDocuments: Object.values(divisionStats).reduce((sum, div) => sum + div.documentsProcessed, 0),
    avgEfficiency: Math.round(Object.values(divisionStats).reduce((sum, div) => sum + div.efficiency, 0) / Object.keys(divisionStats).length)
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 95) return "text-green-600 bg-green-50";
    if (efficiency >= 90) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const filteredStats = selectedDivision === "all"
    ? divisionStats
    : { [selectedDivision]: divisionStats[selectedDivision as keyof typeof divisionStats] };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Division Reports</h1>
          <p className="text-gray-600">Executive-level analytics across all NPA divisions</p>
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

      {/* Executive Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900">₦{overallStats.totalBudget.toFixed(1)}B</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
            <span className="text-sm text-green-600">+3% from last quarter</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Budget Utilized</p>
              <p className="text-2xl font-bold text-gray-900">₦{overallStats.totalSpent.toFixed(1)}B</p>
              <p className="text-xs text-gray-500">
                {((overallStats.totalSpent / overallStats.totalBudget) * 100).toFixed(1)}% utilized
              </p>
            </div>
            <Target className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Staff</p>
              <p className="text-2xl font-bold text-gray-900">{overallStats.totalStaff.toLocaleString()}</p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
            <span className="text-sm text-green-600">+2% from last quarter</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Efficiency</p>
              <p className="text-2xl font-bold text-gray-900">{overallStats.avgEfficiency}%</p>
            </div>
            <BarChart3 className="w-8 h-8 text-orange-600" />
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
            <span className="text-sm text-green-600">+5% improvement</span>
          </div>
        </div>
      </div>

      {/* Division Filter */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by Division:</label>
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Divisions</option>
            {Object.keys(divisionStats).map(division => (
              <option key={division} value={division}>{division}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Division Performance Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(filteredStats).map(([divisionName, stats]) => (
          <div key={divisionName} className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Building className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{divisionName}</h3>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEfficiencyColor(stats.efficiency)}`}>
                  {stats.efficiency}% Efficiency
                </span>
              </div>
            </div>

            <div className="p-6">
              {/* Budget Overview */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Budget Overview</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-lg font-bold text-gray-900">{stats.totalBudget}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-gray-500">Spent</p>
                    <p className="text-lg font-bold text-blue-900">{stats.spentBudget}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-gray-500">Remaining</p>
                    <p className="text-lg font-bold text-green-900">{stats.remainingBudget}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Budget Utilization</span>
                    <span>{((parseFloat(stats.spentBudget.replace(/[₦B]/g, '')) / parseFloat(stats.totalBudget.replace(/[₦B]/g, ''))) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(parseFloat(stats.spentBudget.replace(/[₦B]/g, '')) / parseFloat(stats.totalBudget.replace(/[₦B]/g, ''))) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Key Metrics</h4>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(stats.keyMetrics).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Departments */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Departments ({stats.departments.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {stats.departments.map((dept, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                    >
                      {dept}
                    </span>
                  ))}
                </div>
              </div>

              {/* Performance Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{stats.staffCount}</p>
                  <p className="text-xs text-gray-500">Staff</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{stats.documentsProcessed.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Documents</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{stats.avgProcessingTime}</p>
                  <p className="text-xs text-gray-500">Avg Time</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Insights */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Top Performing Divisions</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-green-900">Corporate Services</span>
                <span className="text-sm text-green-700">97% efficiency</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-green-900">Marine & Operations</span>
                <span className="text-sm text-green-700">95% efficiency</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-green-900">Finance & Administration</span>
                <span className="text-sm text-green-700">92% efficiency</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Areas for Improvement</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                <span className="text-sm font-medium text-yellow-900">Engineering Processing Time</span>
                <span className="text-sm text-yellow-700">4.1 days avg</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                <span className="text-sm font-medium text-yellow-900">Budget Utilization</span>
                <span className="text-sm text-yellow-700">76% overall</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                <span className="text-sm font-medium text-yellow-900">Staff Productivity</span>
                <span className="text-sm text-yellow-700">+2% growth</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
