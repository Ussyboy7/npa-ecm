"use client";

import { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Calendar,
  Filter,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Building,
  FileText,
  Calculator,
  Percent,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react";
import Link from "next/link";

export default function FinanceBudgetPlanningPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("2025");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const budgetStats = [
    {
      name: "Total Budget",
      value: "₦45.2B",
      change: "+8.5%",
      changeType: "positive",
      icon: DollarSign,
      description: "Annual budget allocation",
      status: "Approved"
    },
    {
      name: "Budget Used",
      value: "₦28.7B",
      change: "+12.3%",
      changeType: "warning",
      icon: TrendingUp,
      description: "Year-to-date spending",
      status: "On Track"
    },
    {
      name: "Remaining Budget",
      value: "₦16.5B",
      change: "-3.8%",
      changeType: "warning",
      icon: TrendingDown,
      description: "Available for spending",
      status: "Monitoring"
    },
    {
      name: "Budget Efficiency",
      value: "87%",
      change: "+2.1%",
      changeType: "positive",
      icon: Target,
      description: "Cost effectiveness",
      status: "Good"
    }
  ];

  const departments = [
    {
      id: "DEPT-001",
      name: "ICT Division",
      budget: "₦8.5B",
      allocated: "₦8.5B",
      spent: "₦5.2B",
      remaining: "₦3.3B",
      utilization: 61,
      variance: "+2.3%",
      status: "On Track",
      categories: [
        { name: "Hardware", budget: "₦3.0B", spent: "₦1.8B", remaining: "₦1.2B" },
        { name: "Software", budget: "₦2.5B", spent: "₦1.5B", remaining: "₦1.0B" },
        { name: "Personnel", budget: "₦2.0B", spent: "₦1.5B", remaining: "₦0.5B" },
        { name: "Maintenance", budget: "₦1.0B", spent: "₦0.4B", remaining: "₦0.6B" }
      ],
      projects: 12,
      completedProjects: 8,
      efficiency: 89
    },
    {
      id: "DEPT-002",
      name: "Marine Operations",
      budget: "₦12.0B",
      allocated: "₦12.0B",
      spent: "₦7.8B",
      remaining: "₦4.2B",
      utilization: 65,
      variance: "-1.2%",
      status: "On Track",
      categories: [
        { name: "Port Operations", budget: "₦5.0B", spent: "₦3.2B", remaining: "₦1.8B" },
        { name: "Equipment", budget: "₦3.0B", spent: "₦2.0B", remaining: "₦1.0B" },
        { name: "Personnel", budget: "₦2.5B", spent: "₦1.8B", remaining: "₦0.7B" },
        { name: "Maintenance", budget: "₦1.5B", spent: "₦0.8B", remaining: "₦0.7B" }
      ],
      projects: 18,
      completedProjects: 12,
      efficiency: 92
    },
    {
      id: "DEPT-003",
      name: "Finance Division",
      budget: "₦4.5B",
      allocated: "₦4.5B",
      spent: "₦2.9B",
      remaining: "₦1.6B",
      utilization: 64,
      variance: "+0.8%",
      status: "On Track",
      categories: [
        { name: "Systems", budget: "₦1.5B", spent: "₦0.9B", remaining: "₦0.6B" },
        { name: "Personnel", budget: "₦1.8B", spent: "₦1.2B", remaining: "₦0.6B" },
        { name: "Operations", budget: "₦1.0B", spent: "₦0.7B", remaining: "₦0.3B" },
        { name: "Training", budget: "₦0.2B", spent: "₦0.1B", remaining: "₦0.1B" }
      ],
      projects: 8,
      completedProjects: 5,
      efficiency: 85
    },
    {
      id: "DEPT-004",
      name: "Human Resources",
      budget: "₦6.8B",
      allocated: "₦6.8B",
      spent: "₦4.2B",
      remaining: "₦2.6B",
      utilization: 62,
      variance: "+3.1%",
      status: "Over Budget",
      categories: [
        { name: "Recruitment", budget: "₦2.0B", spent: "₦1.3B", remaining: "₦0.7B" },
        { name: "Training", budget: "₦1.5B", spent: "₦0.9B", remaining: "₦0.6B" },
        { name: "Compensation", budget: "₦2.8B", spent: "₦1.7B", remaining: "₦1.1B" },
        { name: "Benefits", budget: "₦0.5B", spent: "₦0.3B", remaining: "₦0.2B" }
      ],
      projects: 15,
      completedProjects: 9,
      efficiency: 78
    },
    {
      id: "DEPT-005",
      name: "Safety & Security",
      budget: "₦5.2B",
      allocated: "₦5.2B",
      spent: "₦3.1B",
      remaining: "₦2.1B",
      utilization: 60,
      variance: "-0.5%",
      status: "On Track",
      categories: [
        { name: "Security Systems", budget: "₦2.0B", spent: "₦1.2B", remaining: "₦0.8B" },
        { name: "Personnel", budget: "₦2.0B", spent: "₦1.2B", remaining: "₦0.8B" },
        { name: "Equipment", budget: "₦1.0B", spent: "₦0.6B", remaining: "₦0.4B" },
        { name: "Training", budget: "₦0.2B", spent: "₦0.1B", remaining: "₦0.1B" }
      ],
      projects: 10,
      completedProjects: 6,
      efficiency: 88
    },
    {
      id: "DEPT-006",
      name: "Administration",
      budget: "₦8.2B",
      allocated: "₦8.2B",
      spent: "₦5.5B",
      remaining: "₦2.7B",
      utilization: 67,
      variance: "+1.8%",
      status: "On Track",
      categories: [
        { name: "Facilities", budget: "₦3.0B", spent: "₦2.0B", remaining: "₦1.0B" },
        { name: "Personnel", budget: "₦3.5B", spent: "₦2.3B", remaining: "₦1.2B" },
        { name: "Operations", budget: "₦1.5B", spent: "₦1.0B", remaining: "₦0.5B" },
        { name: "Utilities", budget: "₦0.2B", spent: "₦0.2B", remaining: "₦0.0B" }
      ],
      projects: 20,
      completedProjects: 14,
      efficiency: 91
    }
  ];

  const budgetCategories = [
    { name: "Personnel Costs", amount: "₦18.5B", percentage: 41, color: "bg-blue-500" },
    { name: "Operations", amount: "₦12.3B", percentage: 27, color: "bg-green-500" },
    { name: "Capital Expenditure", amount: "₦8.7B", percentage: 19, color: "bg-yellow-500" },
    { name: "Maintenance", amount: "₦3.2B", percentage: 7, color: "bg-purple-500" },
    { name: "Training & Development", amount: "₦2.5B", percentage: 6, color: "bg-red-500" }
  ];

  const yearOptions = [
    { value: "2023", label: "2023" },
    { value: "2024", label: "2024" },
    { value: "2025", label: "2025" },
    { value: "2026", label: "2026" }
  ];

  const departmentOptions = [
    { value: "all", label: "All Departments" },
    { value: "ict", label: "ICT Division" },
    { value: "marine", label: "Marine Operations" },
    { value: "finance", label: "Finance Division" },
    { value: "hr", label: "Human Resources" },
    { value: "safety", label: "Safety & Security" },
    { value: "admin", label: "Administration" }
  ];

  const filteredDepartments = departments.filter(department => {
    const matchesSearch = department.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = departmentFilter === "all" || 
                             department.name.toLowerCase().includes(departmentFilter);
    
    return matchesSearch && matchesDepartment;
  });

  const statusColorMap = {
    'On Track': 'bg-green-100 text-green-800',
    'Over Budget': 'bg-red-100 text-red-800',
    'Under Budget': 'bg-blue-100 text-blue-800',
    'Monitoring': 'bg-yellow-100 text-yellow-800'
  };

  const getVarianceColor = (variance: string) => {
    const value = parseFloat(variance);
    if (value > 0) return 'text-red-600';
    if (value < 0) return 'text-green-600';
    return 'text-gray-600';
  };

  const getVarianceIcon = (variance: string) => {
    const value = parseFloat(variance);
    if (value > 0) return <ArrowUp className="w-3 h-3" />;
    if (value < 0) return <ArrowDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Budget Planning & Management</h1>
          <p className="text-gray-600">Monitor and manage departmental budgets and financial planning</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/finance/planning/budget/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Budget
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Budget Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {budgetStats.map((stat) => (
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
                stat.status === 'Approved' ? 'bg-green-100 text-green-800' :
                stat.status === 'On Track' ? 'bg-blue-100 text-blue-800' :
                stat.status === 'Monitoring' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {stat.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Budget Categories Overview */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Budget Categories Overview</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">Budget Distribution</h3>
            <div className="space-y-4">
              {budgetCategories.map((category) => (
                <div key={category.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${category.color}`}></div>
                    <span className="text-sm text-gray-900">{category.name}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-900">{category.amount}</span>
                    <span className="text-sm text-gray-500">{category.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">Budget Utilization</h3>
            <div className="space-y-4">
              {budgetCategories.map((category) => (
                <div key={category.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">{category.name}</span>
                    <span className="font-medium">{category.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${category.color}`}
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search departments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {yearOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {departmentOptions.map(option => (
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

      {/* Department Budgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredDepartments.map((department) => (
          <div key={department.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Building className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{department.name}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[department.status as keyof typeof statusColorMap]}`}>
                    {department.status}
                  </span>
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <p><span className="font-medium">Budget:</span> {department.budget}</p>
                  <p><span className="font-medium">Spent:</span> {department.spent}</p>
                  <p><span className="font-medium">Remaining:</span> {department.remaining}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg">
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Utilization</p>
                  <p className="text-sm text-gray-600">{department.utilization}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Variance</p>
                  <div className="flex items-center space-x-1">
                    <span className={`text-sm font-medium ${getVarianceColor(department.variance)}`}>
                      {department.variance}
                    </span>
                    <span className={getVarianceColor(department.variance)}>
                      {getVarianceIcon(department.variance)}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Projects</p>
                  <p className="text-sm text-gray-600">{department.projects}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Efficiency</p>
                  <p className="text-sm text-gray-600">{department.efficiency}%</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Budget Utilization</span>
                  <span>{department.utilization}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      department.utilization >= 90 ? 'bg-red-600' :
                      department.utilization >= 80 ? 'bg-yellow-600' : 'bg-green-600'
                    }`}
                    style={{ width: `${department.utilization}%` }}
                  ></div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Budget Categories:</p>
                <div className="space-y-2">
                  {department.categories.map((category, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{category.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-900">{category.spent}</span>
                        <span className="text-gray-500">/ {category.budget}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                    <BarChart3 className="w-3 h-3 mr-1" />
                    Analytics
                  </button>
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    <FileText className="w-3 h-3 mr-1" />
                    Report
                  </button>
                </div>
                <Link
                  href={`/finance/planning/budget/${department.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Budget Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Budget Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/finance/planning/budget/create"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Create Budget</h3>
            <p className="text-xs text-gray-500">Create new budget</p>
          </Link>
          <Link
            href="/finance/planning/forecasts"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <TrendingUp className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Budget Forecasts</h3>
            <p className="text-xs text-gray-500">View forecasts</p>
          </Link>
          <Link
            href="/finance/planning/approvals"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <CheckCircle className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Budget Approvals</h3>
            <p className="text-xs text-gray-500">Manage approvals</p>
          </Link>
          <Link
            href="/finance/planning/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Budget Reports</h3>
            <p className="text-xs text-gray-500">Generate reports</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
