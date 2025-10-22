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
  Minus,
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
  MapPin,
  CreditCard,
  Receipt,
  Banknote,
  Coins
} from "lucide-react";
import Link from "next/link";

export default function FinanceCostsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("current");

  const costStats = [
    {
      name: "Total Monthly Costs",
      value: "₦28.5B",
      change: "+5.2%",
      changeType: "warning",
      icon: DollarSign,
      description: "Current month",
      status: "Increasing"
    },
    {
      name: "Budget Utilization",
      value: "78.3%",
      change: "+3.1%",
      changeType: "warning",
      icon: Target,
      description: "Year-to-date",
      status: "On Track"
    },
    {
      name: "Cost per Employee",
      value: "₦11.5M",
      change: "-2.3%",
      changeType: "positive",
      icon: Users,
      description: "Annual average",
      status: "Optimizing"
    },
    {
      name: "Variance from Budget",
      value: "₦2.1B",
      change: "+1.8B",
      changeType: "warning",
      icon: AlertTriangle,
      description: "Over budget",
      status: "Over Budget"
    }
  ];

  const costCategories = [
    {
      id: "CAT-001",
      name: "Personnel Costs",
      description: "Salaries, benefits, and compensation for all employees",
      budget: "₦15.2B",
      actual: "₦15.8B",
      variance: "₦0.6B",
      variancePercent: 3.9,
      utilization: 103.9,
      trend: "+2.1%",
      subcategories: [
        { name: "Salaries", amount: "₦12.5B", percentage: 79.1 },
        { name: "Benefits", amount: "₦2.1B", percentage: 13.3 },
        { name: "Bonuses", amount: "₦0.8B", percentage: 5.1 },
        { name: "Training", amount: "₦0.4B", percentage: 2.5 }
      ],
      monthlyBreakdown: [
        { month: "Jan", budget: "₦1.27B", actual: "₦1.28B", variance: "₦0.01B" },
        { month: "Feb", budget: "₦1.27B", actual: "₦1.29B", variance: "₦0.02B" },
        { month: "Mar", budget: "₦1.27B", actual: "₦1.30B", variance: "₦0.03B" },
        { month: "Apr", budget: "₦1.27B", actual: "₦1.31B", variance: "₦0.04B" },
        { month: "May", budget: "₦1.27B", actual: "₦1.32B", variance: "₦0.05B" },
        { month: "Jun", budget: "₦1.27B", actual: "₦1.33B", variance: "₦0.06B" }
      ],
      forecasts: {
        nextMonth: "₦1.35B",
        nextQuarter: "₦4.05B",
        nextYear: "₦16.2B"
      },
      costDrivers: [
        "Annual salary increases",
        "New employee onboarding",
        "Performance bonuses",
        "Training programs"
      ]
    },
    {
      id: "CAT-002",
      name: "Operations & Maintenance",
      description: "Day-to-day operational costs and equipment maintenance",
      budget: "₦6.8B",
      actual: "₦7.2B",
      variance: "₦0.4B",
      variancePercent: 5.9,
      utilization: 105.9,
      trend: "+1.8%",
      subcategories: [
        { name: "Equipment Maintenance", amount: "₦2.8B", percentage: 38.9 },
        { name: "Utilities", amount: "₦1.9B", percentage: 26.4 },
        { name: "Supplies", amount: "₦1.2B", percentage: 16.7 },
        { name: "Services", amount: "₦1.3B", percentage: 18.0 }
      ],
      monthlyBreakdown: [
        { month: "Jan", budget: "₦0.57B", actual: "₦0.58B", variance: "₦0.01B" },
        { month: "Feb", budget: "₦0.57B", actual: "₦0.59B", variance: "₦0.02B" },
        { month: "Mar", budget: "₦0.57B", actual: "₦0.60B", variance: "₦0.03B" },
        { month: "Apr", budget: "₦0.57B", actual: "₦0.61B", variance: "₦0.04B" },
        { month: "May", budget: "₦0.57B", actual: "₦0.62B", variance: "₦0.05B" },
        { month: "Jun", budget: "₦0.57B", actual: "₦0.63B", variance: "₦0.06B" }
      ],
      forecasts: {
        nextMonth: "₦0.64B",
        nextQuarter: "₦1.92B",
        nextYear: "₦7.68B"
      },
      costDrivers: [
        "Equipment aging and maintenance",
        "Rising utility costs",
        "Increased operational demand",
        "Supply chain disruptions"
      ]
    },
    {
      id: "CAT-003",
      name: "Technology & IT",
      description: "Information technology infrastructure and software costs",
      budget: "₦3.5B",
      actual: "₦3.2B",
      variance: "-₦0.3B",
      variancePercent: -8.6,
      utilization: 91.4,
      trend: "-2.3%",
      subcategories: [
        { name: "Software Licenses", amount: "₦1.2B", percentage: 37.5 },
        { name: "Hardware", amount: "₦0.9B", percentage: 28.1 },
        { name: "Cloud Services", amount: "₦0.7B", percentage: 21.9 },
        { name: "Support & Maintenance", amount: "₦0.4B", percentage: 12.5 }
      ],
      monthlyBreakdown: [
        { month: "Jan", budget: "₦0.29B", actual: "₦0.28B", variance: "-₦0.01B" },
        { month: "Feb", budget: "₦0.29B", actual: "₦0.27B", variance: "-₦0.02B" },
        { month: "Mar", budget: "₦0.29B", actual: "₦0.26B", variance: "-₦0.03B" },
        { month: "Apr", budget: "₦0.29B", actual: "₦0.25B", variance: "-₦0.04B" },
        { month: "May", budget: "₦0.29B", actual: "₦0.24B", variance: "-₦0.05B" },
        { month: "Jun", budget: "₦0.29B", actual: "₦0.23B", variance: "-₦0.06B" }
      ],
      forecasts: {
        nextMonth: "₦0.22B",
        nextQuarter: "₦0.66B",
        nextYear: "₦2.64B"
      },
      costDrivers: [
        "Software license optimization",
        "Cloud migration savings",
        "Hardware lifecycle management",
        "Vendor negotiations"
      ]
    },
    {
      id: "CAT-004",
      name: "Security & Compliance",
      description: "Security measures, compliance, and regulatory costs",
      budget: "₦2.1B",
      actual: "₦2.3B",
      variance: "₦0.2B",
      variancePercent: 9.5,
      utilization: 109.5,
      trend: "+3.2%",
      subcategories: [
        { name: "Security Systems", amount: "₦1.1B", percentage: 47.8 },
        { name: "Compliance", amount: "₦0.6B", percentage: 26.1 },
        { name: "Audits", amount: "₦0.4B", percentage: 17.4 },
        { name: "Training", amount: "₦0.2B", percentage: 8.7 }
      ],
      monthlyBreakdown: [
        { month: "Jan", budget: "₦0.18B", actual: "₦0.19B", variance: "₦0.01B" },
        { month: "Feb", budget: "₦0.18B", actual: "₦0.20B", variance: "₦0.02B" },
        { month: "Mar", budget: "₦0.18B", actual: "₦0.21B", variance: "₦0.03B" },
        { month: "Apr", budget: "₦0.18B", actual: "₦0.22B", variance: "₦0.04B" },
        { month: "May", budget: "₦0.18B", actual: "₦0.23B", variance: "₦0.05B" },
        { month: "Jun", budget: "₦0.18B", actual: "₦0.24B", variance: "₦0.06B" }
      ],
      forecasts: {
        nextMonth: "₦0.25B",
        nextQuarter: "₦0.75B",
        nextYear: "₦3.0B"
      },
      costDrivers: [
        "Enhanced security requirements",
        "Regulatory compliance updates",
        "Security incident response",
        "Staff security training"
      ]
    },
    {
      id: "CAT-005",
      name: "Professional Services",
      description: "Consulting, legal, and professional service costs",
      budget: "₦0.9B",
      actual: "₦1.0B",
      variance: "₦0.1B",
      variancePercent: 11.1,
      utilization: 111.1,
      trend: "+4.5%",
      subcategories: [
        { name: "Legal Services", amount: "₦0.4B", percentage: 40.0 },
        { name: "Consulting", amount: "₦0.3B", percentage: 30.0 },
        { name: "Audit Services", amount: "₦0.2B", percentage: 20.0 },
        { name: "Other Services", amount: "₦0.1B", percentage: 10.0 }
      ],
      monthlyBreakdown: [
        { month: "Jan", budget: "₦0.08B", actual: "₦0.09B", variance: "₦0.01B" },
        { month: "Feb", budget: "₦0.08B", actual: "₦0.10B", variance: "₦0.02B" },
        { month: "Mar", budget: "₦0.08B", actual: "₦0.11B", variance: "₦0.03B" },
        { month: "Apr", budget: "₦0.08B", actual: "₦0.12B", variance: "₦0.04B" },
        { month: "May", budget: "₦0.08B", actual: "₦0.13B", variance: "₦0.05B" },
        { month: "Jun", budget: "₦0.08B", actual: "₦0.14B", variance: "₦0.06B" }
      ],
      forecasts: {
        nextMonth: "₦0.15B",
        nextQuarter: "₦0.45B",
        nextYear: "₦1.8B"
      },
      costDrivers: [
        "Legal proceedings",
        "Strategic consulting projects",
        "Regulatory compliance",
        "Business transformation"
      ]
    }
  ];

  const categoryOptions = [
    { value: "all", label: "All Categories" },
    { value: "personnel", label: "Personnel Costs" },
    { value: "operations", label: "Operations & Maintenance" },
    { value: "technology", label: "Technology & IT" },
    { value: "security", label: "Security & Compliance" },
    { value: "professional", label: "Professional Services" }
  ];

  const periodOptions = [
    { value: "current", label: "Current Month" },
    { value: "quarter", label: "Current Quarter" },
    { value: "year", label: "Current Year" },
    { value: "ytd", label: "Year to Date" }
  ];

  const filteredCategories = costCategories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || 
                           category.name.toLowerCase().includes(categoryFilter);
    
    return matchesSearch && matchesCategory;
  });

  const getVarianceColor = (variance: number) => {
    if (variance > 10) return 'bg-red-100 text-red-800';
    if (variance > 5) return 'bg-orange-100 text-orange-800';
    if (variance > 0) return 'bg-yellow-100 text-yellow-800';
    if (variance < -5) return 'bg-green-100 text-green-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization > 110) return 'bg-red-100 text-red-800';
    if (utilization > 105) return 'bg-orange-100 text-orange-800';
    if (utilization > 100) return 'bg-yellow-100 text-yellow-800';
    if (utilization > 95) return 'bg-blue-100 text-blue-800';
    return 'bg-green-100 text-green-800';
  };

  const getTrendIcon = (trend: string) => {
    if (trend.startsWith('+')) return <TrendingUp className="w-3 h-3 text-red-600" />;
    if (trend.startsWith('-')) return <TrendingDown className="w-3 h-3 text-green-600" />;
    return <Minus className="w-3 h-3 text-gray-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cost Management</h1>
          <p className="text-gray-600">Monitor and analyze organizational costs and budget utilization</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/finance/planning/costs/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Cost Item
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Cost Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {costStats.map((stat) => (
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
                stat.status === 'Increasing' ? 'bg-red-100 text-red-800' :
                stat.status === 'On Track' ? 'bg-blue-100 text-blue-800' :
                stat.status === 'Optimizing' ? 'bg-green-100 text-green-800' :
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
                placeholder="Search cost categories by name or description..."
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
              {categoryOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {periodOptions.map(option => (
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

      {/* Cost Categories Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCategories.map((category) => (
          <div key={category.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getVarianceColor(category.variancePercent)}`}>
                    {category.variancePercent > 0 ? '+' : ''}{category.variancePercent}%
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                <div className="text-sm text-gray-500 space-y-1">
                  <p><span className="font-medium">Budget:</span> {category.budget}</p>
                  <p><span className="font-medium">Actual:</span> {category.actual}</p>
                  <p><span className="font-medium">Variance:</span> {category.variance}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg">
                  <BarChart3 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Utilization</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getUtilizationColor(category.utilization)}`}>
                    {category.utilization}%
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Trend</p>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm text-gray-600">{category.trend}</span>
                    {getTrendIcon(category.trend)}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Budget Utilization</span>
                  <span>{category.utilization}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      category.utilization > 110 ? 'bg-red-600' :
                      category.utilization > 105 ? 'bg-orange-600' :
                      category.utilization > 100 ? 'bg-yellow-600' :
                      category.utilization > 95 ? 'bg-blue-600' : 'bg-green-600'
                    }`}
                    style={{ width: `${Math.min(category.utilization, 120)}%` }}
                  ></div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Subcategories:</p>
                <div className="space-y-2">
                  {category.subcategories.map((sub, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{sub.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-900">{sub.amount}</span>
                        <span className="text-gray-500">({sub.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Monthly Breakdown (Last 6 Months):</p>
                <div className="space-y-1">
                  {category.monthlyBreakdown.slice(-3).map((month, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{month.month}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-900">{month.actual}</span>
                        <span className={`text-xs ${month.variance.startsWith('-') ? 'text-green-600' : 'text-red-600'}`}>
                          {month.variance}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Forecasts:</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500">Next Month</p>
                    <p className="font-medium">{category.forecasts.nextMonth}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Next Quarter</p>
                    <p className="font-medium">{category.forecasts.nextQuarter}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Next Year</p>
                    <p className="font-medium">{category.forecasts.nextYear}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Key Cost Drivers:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {category.costDrivers.slice(0, 2).map((driver, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>{driver}</span>
                    </li>
                  ))}
                  {category.costDrivers.length > 2 && (
                    <li className="text-blue-600">+{category.costDrivers.length - 2} more drivers</li>
                  )}
                </ul>
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
                  href={`/finance/planning/costs/${category.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cost Analysis Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Cost Analysis Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Over Budget Categories</h3>
                <p className="text-xs text-gray-500">Categories exceeding budget</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {costCategories.filter(cat => cat.utilization > 100).length}</p>
              <p>Total Variance: ₦{costCategories.filter(cat => cat.utilization > 100).reduce((sum, cat) => sum + parseFloat(cat.variance.replace(/[^\d.]/g, '')), 0).toFixed(1)}B</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Under Budget Categories</h3>
                <p className="text-xs text-gray-500">Categories under budget</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {costCategories.filter(cat => cat.utilization < 100).length}</p>
              <p>Total Savings: ₦{Math.abs(costCategories.filter(cat => cat.utilization < 100).reduce((sum, cat) => sum + parseFloat(cat.variance.replace(/[^\d.]/g, '')), 0)).toFixed(1)}B</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Budget Performance</h3>
                <p className="text-xs text-gray-500">Overall budget utilization</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Average: {costCategories.reduce((sum, cat) => sum + cat.utilization, 0) / costCategories.length}%</p>
              <p>Total Budget: ₦{costCategories.reduce((sum, cat) => sum + parseFloat(cat.budget.replace(/[^\d.]/g, '')), 0).toFixed(1)}B</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cost Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/finance/planning/costs/create"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Add Cost Item</h3>
            <p className="text-xs text-gray-500">Create new cost</p>
          </Link>
          <Link
            href="/finance/planning/costs/budget"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Target className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Budget Planning</h3>
            <p className="text-xs text-gray-500">Plan budgets</p>
          </Link>
          <Link
            href="/finance/planning/costs/forecasts"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Cost Forecasts</h3>
            <p className="text-xs text-gray-500">View forecasts</p>
          </Link>
          <Link
            href="/finance/planning/costs/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Cost Reports</h3>
            <p className="text-xs text-gray-500">Generate reports</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
