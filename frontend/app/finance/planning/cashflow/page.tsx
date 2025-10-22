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
  Coins,
  Wallet,
  PiggyBank,
  TrendingUp as TrendUp,
  TrendingDown as TrendDown
} from "lucide-react";
import Link from "next/link";

export default function FinanceCashflowPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState("current");
  const [typeFilter, setTypeFilter] = useState("all");

  const cashflowStats = [
    {
      name: "Net Cash Flow",
      value: "₦2.8B",
      change: "+15.2%",
      changeType: "positive",
      icon: DollarSign,
      description: "Current month",
      status: "Positive"
    },
    {
      name: "Operating Cash Flow",
      value: "₦4.2B",
      change: "+8.5%",
      changeType: "positive",
      icon: Activity,
      description: "From operations",
      status: "Healthy"
    },
    {
      name: "Investing Cash Flow",
      value: "-₦1.1B",
      change: "-12.3%",
      changeType: "negative",
      icon: TrendingDown,
      description: "Capital investments",
      status: "Investing"
    },
    {
      name: "Financing Cash Flow",
      value: "-₦0.3B",
      change: "-5.8%",
      changeType: "negative",
      icon: CreditCard,
      description: "Debt payments",
      status: "Reducing"
    }
  ];

  const cashflowData = [
    {
      id: "CF-001",
      period: "2024-12",
      month: "December 2024",
      operating: {
        revenue: "₦8.5B",
        expenses: "₦4.3B",
        net: "₦4.2B",
        change: "+8.5%"
      },
      investing: {
        capitalExpenditures: "₦1.2B",
        assetPurchases: "₦0.3B",
        investments: "₦0.1B",
        net: "-₦1.1B",
        change: "-12.3%"
      },
      financing: {
        debtPayments: "₦0.4B",
        dividends: "₦0.1B",
        borrowings: "₦0.2B",
        net: "-₦0.3B",
        change: "-5.8%"
      },
      netCashFlow: "₦2.8B",
      beginningBalance: "₦12.5B",
      endingBalance: "₦15.3B",
      status: "Positive",
      forecast: {
        nextMonth: "₦3.1B",
        nextQuarter: "₦9.2B",
        confidence: 85
      }
    },
    {
      id: "CF-002",
      period: "2024-11",
      month: "November 2024",
      operating: {
        revenue: "₦8.2B",
        expenses: "₦4.1B",
        net: "₦4.1B",
        change: "+6.2%"
      },
      investing: {
        capitalExpenditures: "₦1.0B",
        assetPurchases: "₦0.2B",
        investments: "₦0.1B",
        net: "-₦0.9B",
        change: "-8.1%"
      },
      financing: {
        debtPayments: "₦0.3B",
        dividends: "₦0.1B",
        borrowings: "₦0.1B",
        net: "-₦0.3B",
        change: "-3.2%"
      },
      netCashFlow: "₦2.9B",
      beginningBalance: "₦9.6B",
      endingBalance: "₦12.5B",
      status: "Positive",
      forecast: {
        nextMonth: "₦2.8B",
        nextQuarter: "₦8.5B",
        confidence: 90
      }
    },
    {
      id: "CF-003",
      period: "2024-10",
      month: "October 2024",
      operating: {
        revenue: "₦7.8B",
        expenses: "₦3.9B",
        net: "₦3.9B",
        change: "+4.1%"
      },
      investing: {
        capitalExpenditures: "₦0.8B",
        assetPurchases: "₦0.3B",
        investments: "₦0.2B",
        net: "-₦0.7B",
        change: "-5.2%"
      },
      financing: {
        debtPayments: "₦0.2B",
        dividends: "₦0.1B",
        borrowings: "₦0.3B",
        net: "₦0.0B",
        change: "0.0%"
      },
      netCashFlow: "₦3.2B",
      beginningBalance: "₦6.4B",
      endingBalance: "₦9.6B",
      status: "Positive",
      forecast: {
        nextMonth: "₦2.9B",
        nextQuarter: "₦8.7B",
        confidence: 88
      }
    }
  ];

  const cashflowCategories = [
    {
      id: "CAT-001",
      name: "Operating Activities",
      description: "Cash flows from core business operations",
      currentMonth: "₦4.2B",
      previousMonth: "₦4.1B",
      change: "+2.4%",
      trend: "up",
      components: [
        { name: "Port Operations Revenue", amount: "₦3.2B", percentage: 76.2 },
        { name: "Cargo Handling Fees", amount: "₦1.8B", percentage: 42.9 },
        { name: "Vessel Services", amount: "₦1.2B", percentage: 28.6 },
        { name: "Storage Fees", amount: "₦0.8B", percentage: 19.0 },
        { name: "Other Services", amount: "₦0.5B", percentage: 11.9 }
      ],
      expenses: [
        { name: "Personnel Costs", amount: "₦1.8B", percentage: 41.9 },
        { name: "Operations & Maintenance", amount: "₦1.2B", percentage: 27.9 },
        { name: "Utilities", amount: "₦0.6B", percentage: 14.0 },
        { name: "Supplies", amount: "₦0.4B", percentage: 9.3 },
        { name: "Other Expenses", amount: "₦0.3B", percentage: 7.0 }
      ]
    },
    {
      id: "CAT-002",
      name: "Investing Activities",
      description: "Cash flows from capital investments and asset purchases",
      currentMonth: "-₦1.1B",
      previousMonth: "-₦0.9B",
      change: "-22.2%",
      trend: "down",
      components: [
        { name: "Equipment Purchases", amount: "₦0.8B", percentage: 72.7 },
        { name: "Infrastructure Development", amount: "₦0.3B", percentage: 27.3 },
        { name: "Technology Investments", amount: "₦0.1B", percentage: 9.1 },
        { name: "Property Acquisitions", amount: "₦0.0B", percentage: 0.0 }
      ],
      expenses: [
        { name: "Capital Expenditures", amount: "₦1.2B", percentage: 109.1 },
        { name: "Asset Purchases", amount: "₦0.3B", percentage: 27.3 },
        { name: "Investment Securities", amount: "₦0.1B", percentage: 9.1 }
      ]
    },
    {
      id: "CAT-003",
      name: "Financing Activities",
      description: "Cash flows from debt, equity, and dividend payments",
      currentMonth: "-₦0.3B",
      previousMonth: "-₦0.3B",
      change: "0.0%",
      trend: "stable",
      components: [
        { name: "Debt Repayments", amount: "₦0.4B", percentage: 133.3 },
        { name: "Dividend Payments", amount: "₦0.1B", percentage: 33.3 },
        { name: "New Borrowings", amount: "₦0.2B", percentage: 66.7 }
      ],
      expenses: [
        { name: "Principal Payments", amount: "₦0.3B", percentage: 100.0 },
        { name: "Interest Payments", amount: "₦0.1B", percentage: 33.3 },
        { name: "Dividend Distributions", amount: "₦0.1B", percentage: 33.3 }
      ]
    }
  ];

  const cashflowForecasts = [
    {
      id: "FC-001",
      period: "Q1 2025",
      quarter: "Q1 2025",
      operating: "₦12.8B",
      investing: "-₦3.2B",
      financing: "-₦0.8B",
      net: "₦8.8B",
      confidence: 85,
      assumptions: [
        "Port traffic increases by 8%",
        "Cargo handling rates remain stable",
        "Capital expenditure program continues",
        "Debt repayment schedule maintained"
      ],
      risks: [
        "Economic downturn affecting port traffic",
        "Currency fluctuation impact",
        "Regulatory changes in port operations",
        "Competition from other ports"
      ]
    },
    {
      id: "FC-002",
      period: "Q2 2025",
      quarter: "Q2 2025",
      operating: "₦13.5B",
      investing: "-₦2.8B",
      financing: "-₦0.9B",
      net: "₦9.8B",
      confidence: 80,
      assumptions: [
        "Peak season port activity",
        "New terminal operations begin",
        "Increased vessel calls",
        "Enhanced cargo handling capacity"
      ],
      risks: [
        "Weather-related disruptions",
        "Labor disputes affecting operations",
        "Fuel price volatility",
        "Global trade tensions"
      ]
    },
    {
      id: "FC-003",
      period: "Q3 2025",
      quarter: "Q3 2025",
      operating: "₦12.2B",
      investing: "-₦3.5B",
      financing: "-₦1.0B",
      net: "₦7.7B",
      confidence: 75,
      assumptions: [
        "Seasonal slowdown in port activity",
        "Major infrastructure projects",
        "Technology upgrade investments",
        "Debt refinancing activities"
      ],
      risks: [
        "Hurricane season impact",
        "Economic recession concerns",
        "Interest rate changes",
        "Supply chain disruptions"
      ]
    }
  ];

  const periodOptions = [
    { value: "current", label: "Current Month" },
    { value: "quarter", label: "Current Quarter" },
    { value: "year", label: "Current Year" },
    { value: "ytd", label: "Year to Date" }
  ];

  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: "operating", label: "Operating" },
    { value: "investing", label: "Investing" },
    { value: "financing", label: "Financing" }
  ];

  const filteredData = cashflowData.filter(item => {
    const matchesSearch = item.month.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.period.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Positive': return 'bg-green-100 text-green-800';
      case 'Negative': return 'bg-red-100 text-red-800';
      case 'Neutral': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'bg-green-100 text-green-800';
    if (confidence >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cash Flow Management</h1>
          <p className="text-gray-600">Monitor and analyze cash flow across operating, investing, and financing activities</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/finance/planning/cashflow/forecast"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Forecast
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Cash Flow Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cashflowStats.map((stat) => (
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
                stat.changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {stat.change}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                stat.status === 'Positive' ? 'bg-green-100 text-green-800' :
                stat.status === 'Healthy' ? 'bg-blue-100 text-blue-800' :
                stat.status === 'Investing' ? 'bg-purple-100 text-purple-800' :
                'bg-orange-100 text-orange-800'
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
                placeholder="Search cash flow data by period or month..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
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
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {typeOptions.map(option => (
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

      {/* Cash Flow Data Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredData.map((data) => (
          <div key={data.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{data.month}</h3>
                <p className="text-sm text-gray-600">Period: {data.period}</p>
                <div className="mt-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(data.status)}`}>
                    {data.status}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{data.netCashFlow}</p>
                <p className="text-sm text-gray-500">Net Cash Flow</p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900">Operating</p>
                  <p className="text-lg font-bold text-green-600">{data.operating.net}</p>
                  <p className="text-xs text-gray-500">{data.operating.change}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900">Investing</p>
                  <p className="text-lg font-bold text-red-600">{data.investing.net}</p>
                  <p className="text-xs text-gray-500">{data.investing.change}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900">Financing</p>
                  <p className="text-lg font-bold text-red-600">{data.financing.net}</p>
                  <p className="text-xs text-gray-500">{data.financing.change}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Cash Balance:</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Beginning Balance</p>
                    <p className="font-medium">{data.beginningBalance}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Ending Balance</p>
                    <p className="font-medium">{data.endingBalance}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Forecast:</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Next Month</p>
                    <p className="font-medium">{data.forecast.nextMonth}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Next Quarter</p>
                    <p className="font-medium">{data.forecast.nextQuarter}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Confidence</p>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getConfidenceColor(data.forecast.confidence)}`}>
                      {data.forecast.confidence}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                    <BarChart3 className="w-3 h-3 mr-1" />
                    Details
                  </button>
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    <FileText className="w-3 h-3 mr-1" />
                    Report
                  </button>
                </div>
                <Link
                  href={`/finance/planning/cashflow/${data.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cash Flow Categories */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Cash Flow Categories</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {cashflowCategories.map((category) => (
            <div key={category.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{category.name}</h4>
                  <p className="text-xs text-gray-500">{category.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">{category.currentMonth}</span>
                  {getTrendIcon(category.trend)}
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Change from Previous Month</span>
                  <span className={category.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}>
                    {category.change}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Key Components:</p>
                <div className="space-y-2">
                  {category.components.slice(0, 3).map((component, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{component.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-900">{component.amount}</span>
                        <span className="text-gray-500">({component.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                  {category.components.length > 3 && (
                    <div className="text-xs text-blue-600">
                      +{category.components.length - 3} more components
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                    <BarChart3 className="w-3 h-3 mr-1" />
                    Analyze
                  </button>
                </div>
                <Link
                  href={`/finance/planning/cashflow/categories/${category.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cash Flow Forecasts */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Cash Flow Forecasts</h2>
          <Link
            href="/finance/planning/cashflow/forecasts"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all forecasts
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cashflowForecasts.map((forecast) => (
            <div key={forecast.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{forecast.quarter}</h4>
                  <p className="text-xs text-gray-500">Forecast Period</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getConfidenceColor(forecast.confidence)}`}>
                  {forecast.confidence}% confidence
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500">Operating</p>
                  <p className="text-sm font-medium text-green-600">{forecast.operating}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Investing</p>
                  <p className="text-sm font-medium text-red-600">{forecast.investing}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Financing</p>
                  <p className="text-sm font-medium text-red-600">{forecast.financing}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Net Cash Flow</p>
                  <p className="text-sm font-bold text-gray-900">{forecast.net}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Key Assumptions:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {forecast.assumptions.slice(0, 2).map((assumption, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>{assumption}</span>
                    </li>
                  ))}
                  {forecast.assumptions.length > 2 && (
                    <li className="text-blue-600">+{forecast.assumptions.length - 2} more assumptions</li>
                  )}
                </ul>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Key Risks:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {forecast.risks.slice(0, 2).map((risk, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-red-600 mt-0.5">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                  {forecast.risks.length > 2 && (
                    <li className="text-red-600">+{forecast.risks.length - 2} more risks</li>
                  )}
                </ul>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                    <BarChart3 className="w-3 h-3 mr-1" />
                    Analyze
                  </button>
                </div>
                <Link
                  href={`/finance/planning/cashflow/forecasts/${forecast.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cash Flow Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/finance/planning/cashflow/forecast"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Create Forecast</h3>
            <p className="text-xs text-gray-500">Generate cash flow forecast</p>
          </Link>
          <Link
            href="/finance/planning/cashflow/analysis"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Cash Flow Analysis</h3>
            <p className="text-xs text-gray-500">Analyze cash flow trends</p>
          </Link>
          <Link
            href="/finance/planning/cashflow/scenarios"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Target className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Scenario Planning</h3>
            <p className="text-xs text-gray-500">Create scenarios</p>
          </Link>
          <Link
            href="/finance/planning/cashflow/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Cash Flow Reports</h3>
            <p className="text-xs text-gray-500">Generate reports</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
