"use client";

import { useState } from "react";
import {
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
  DollarSign,
  Activity,
  Globe,
  Zap
} from "lucide-react";
import Link from "next/link";

export default function FinanceForecastsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [timeHorizon, setTimeHorizon] = useState("12m");
  const [scenarioFilter, setScenarioFilter] = useState("all");

  const forecastStats = [
    {
      name: "Revenue Forecast",
      value: "₦52.8B",
      change: "+12.5%",
      changeType: "positive",
      icon: TrendingUp,
      description: "Next 12 months",
      status: "Growing"
    },
    {
      name: "Expense Forecast",
      value: "₦38.2B",
      change: "+8.3%",
      changeType: "warning",
      icon: TrendingDown,
      description: "Next 12 months",
      status: "Controlled"
    },
    {
      name: "Profit Margin",
      value: "27.6%",
      change: "+2.1%",
      changeType: "positive",
      icon: Percent,
      description: "Projected margin",
      status: "Healthy"
    },
    {
      name: "Cash Flow",
      value: "₦14.6B",
      change: "+15.2%",
      changeType: "positive",
      icon: Activity,
      description: "Net cash position",
      status: "Strong"
    }
  ];

  const forecasts = [
    {
      id: "FC-001",
      title: "Revenue Growth Forecast",
      description: "Projected revenue growth based on port operations and new services",
      category: "Revenue",
      scenario: "Optimistic",
      timeHorizon: "24 months",
      createdBy: "Finance Team",
      createdDate: "2024-12-01",
      lastUpdate: "2024-12-10",
      status: "Active",
      confidence: 85,
      accuracy: 92,
      dataPoints: [
        { period: "Q1 2025", value: "₦12.5B", growth: "+8.2%" },
        { period: "Q2 2025", value: "₦13.2B", growth: "+5.6%" },
        { period: "Q3 2025", value: "₦13.8B", growth: "+4.5%" },
        { period: "Q4 2025", value: "₦14.5B", growth: "+5.1%" }
      ],
      assumptions: [
        "Port traffic increases by 8% annually",
        "New container terminal operational by Q2 2025",
        "Fuel prices remain stable",
        "No major economic disruptions"
      ],
      risks: [
        "Economic downturn affecting trade volumes",
        "Competition from other ports",
        "Regulatory changes",
        "Currency fluctuations"
      ]
    },
    {
      id: "FC-002",
      title: "Operating Cost Forecast",
      description: "Projected operating costs including personnel, maintenance, and utilities",
      category: "Expenses",
      scenario: "Realistic",
      timeHorizon: "18 months",
      createdBy: "Operations Team",
      createdDate: "2024-11-28",
      lastUpdate: "2024-12-08",
      status: "Active",
      confidence: 78,
      accuracy: 88,
      dataPoints: [
        { period: "Q1 2025", value: "₦9.2B", growth: "+6.8%" },
        { period: "Q2 2025", value: "₦9.5B", growth: "+3.3%" },
        { period: "Q3 2025", value: "₦9.8B", growth: "+3.2%" },
        { period: "Q4 2025", value: "₦10.1B", growth: "+3.1%" }
      ],
      assumptions: [
        "Personnel costs increase by 5% annually",
        "Maintenance costs remain stable",
        "Utility costs increase by 3% annually",
        "No major equipment failures"
      ],
      risks: [
        "Unexpected equipment breakdowns",
        "Rising utility costs",
        "Labor disputes",
        "Inflation impact on costs"
      ]
    },
    {
      id: "FC-003",
      title: "Capital Expenditure Forecast",
      description: "Planned capital investments in infrastructure and equipment",
      category: "Capital",
      scenario: "Conservative",
      timeHorizon: "36 months",
      createdBy: "Planning Team",
      createdDate: "2024-11-25",
      lastUpdate: "2024-12-05",
      status: "Draft",
      confidence: 72,
      accuracy: 85,
      dataPoints: [
        { period: "2025", value: "₦8.5B", growth: "+15.2%" },
        { period: "2026", value: "₦7.2B", growth: "-15.3%" },
        { period: "2027", value: "₦6.8B", growth: "-5.6%" }
      ],
      assumptions: [
        "New terminal construction completed by 2026",
        "Equipment replacement schedule maintained",
        "Infrastructure upgrades as planned",
        "Funding secured for major projects"
      ],
      risks: [
        "Construction delays and cost overruns",
        "Funding shortfalls",
        "Equipment delivery delays",
        "Regulatory approval delays"
      ]
    },
    {
      id: "FC-004",
      title: "Cash Flow Forecast",
      description: "Projected cash inflows and outflows for liquidity management",
      category: "Cash Flow",
      scenario: "Realistic",
      timeHorizon: "12 months",
      createdBy: "Treasury Team",
      createdDate: "2024-11-30",
      lastUpdate: "2024-12-09",
      status: "Active",
      confidence: 82,
      accuracy: 90,
      dataPoints: [
        { period: "Q1 2025", value: "₦3.2B", growth: "+12.5%" },
        { period: "Q2 2025", value: "₦3.8B", growth: "+18.8%" },
        { period: "Q3 2025", value: "₦3.5B", growth: "-7.9%" },
        { period: "Q4 2025", value: "₦4.1B", growth: "+17.1%" }
      ],
      assumptions: [
        "Payment terms remain consistent",
        "Seasonal variations in cash flow",
        "No major unexpected expenses",
        "Investment returns as projected"
      ],
      risks: [
        "Customer payment delays",
        "Unexpected large expenses",
        "Interest rate changes",
        "Economic volatility"
      ]
    },
    {
      id: "FC-005",
      title: "Port Traffic Forecast",
      description: "Projected vessel traffic and cargo volumes through NPA ports",
      category: "Operations",
      scenario: "Optimistic",
      timeHorizon: "24 months",
      createdBy: "Marine Operations",
      createdDate: "2024-11-20",
      lastUpdate: "2024-12-07",
      status: "Active",
      confidence: 75,
      accuracy: 87,
      dataPoints: [
        { period: "Q1 2025", value: "1,247 vessels", growth: "+6.2%" },
        { period: "Q2 2025", value: "1,312 vessels", growth: "+5.2%" },
        { period: "Q3 2025", value: "1,289 vessels", growth: "-1.8%" },
        { period: "Q4 2025", value: "1,356 vessels", growth: "+5.2%" }
      ],
      assumptions: [
        "Economic growth continues at current pace",
        "New shipping routes established",
        "Port efficiency improvements",
        "No major disruptions"
      ],
      risks: [
        "Economic recession",
        "Shipping route changes",
        "Port congestion issues",
        "Weather-related disruptions"
      ]
    }
  ];

  const scenarios = [
    { value: "all", label: "All Scenarios" },
    { value: "optimistic", label: "Optimistic" },
    { value: "realistic", label: "Realistic" },
    { value: "conservative", label: "Conservative" },
    { value: "pessimistic", label: "Pessimistic" }
  ];

  const timeHorizons = [
    { value: "6m", label: "6 Months" },
    { value: "12m", label: "12 Months" },
    { value: "18m", label: "18 Months" },
    { value: "24m", label: "24 Months" },
    { value: "36m", label: "36 Months" }
  ];

  const filteredForecasts = forecasts.filter(forecast => {
    const matchesSearch = forecast.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         forecast.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         forecast.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesScenario = scenarioFilter === "all" || 
                           forecast.scenario.toLowerCase() === scenarioFilter;
    
    return matchesSearch && matchesScenario;
  });

  const statusColorMap = {
    'Active': 'bg-green-100 text-green-800',
    'Draft': 'bg-yellow-100 text-yellow-800',
    'Archived': 'bg-gray-100 text-gray-800',
    'Under Review': 'bg-blue-100 text-blue-800'
  };

  const scenarioColorMap = {
    'Optimistic': 'bg-green-100 text-green-800',
    'Realistic': 'bg-blue-100 text-blue-800',
    'Conservative': 'bg-yellow-100 text-yellow-800',
    'Pessimistic': 'bg-red-100 text-red-800'
  };

  const categoryColorMap = {
    'Revenue': 'bg-green-100 text-green-800',
    'Expenses': 'bg-red-100 text-red-800',
    'Capital': 'bg-blue-100 text-blue-800',
    'Cash Flow': 'bg-purple-100 text-purple-800',
    'Operations': 'bg-orange-100 text-orange-800'
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-800';
    if (confidence >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getGrowthIcon = (growth: string) => {
    const value = parseFloat(growth);
    if (value > 0) return <ArrowUp className="w-3 h-3 text-green-600" />;
    if (value < 0) return <ArrowDown className="w-3 h-3 text-red-600" />;
    return <Minus className="w-3 h-3 text-gray-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Forecasts</h1>
          <p className="text-gray-600">Create and manage financial forecasts and projections</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/finance/planning/forecasts/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Forecast
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Export Forecasts
          </button>
        </div>
      </div>

      {/* Forecast Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {forecastStats.map((stat) => (
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
                stat.status === 'Growing' ? 'bg-green-100 text-green-800' :
                stat.status === 'Controlled' ? 'bg-blue-100 text-blue-800' :
                stat.status === 'Healthy' ? 'bg-green-100 text-green-800' :
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
                placeholder="Search forecasts by title, description, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              value={timeHorizon}
              onChange={(e) => setTimeHorizon(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {timeHorizons.map(horizon => (
                <option key={horizon.value} value={horizon.value}>
                  {horizon.label}
                </option>
              ))}
            </select>
            <select
              value={scenarioFilter}
              onChange={(e) => setScenarioFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {scenarios.map(scenario => (
                <option key={scenario.value} value={scenario.value}>
                  {scenario.label}
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

      {/* Forecasts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredForecasts.map((forecast) => (
          <div key={forecast.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{forecast.title}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[forecast.status as keyof typeof statusColorMap]}`}>
                    {forecast.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${scenarioColorMap[forecast.scenario as keyof typeof scenarioColorMap]}`}>
                    {forecast.scenario}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{forecast.description}</p>
                <div className="text-sm text-gray-500 space-y-1">
                  <p><span className="font-medium">Category:</span> {forecast.category}</p>
                  <p><span className="font-medium">Time Horizon:</span> {forecast.timeHorizon}</p>
                  <p><span className="font-medium">Created by:</span> {forecast.createdBy}</p>
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
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Confidence</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getConfidenceColor(forecast.confidence)}`}>
                    {forecast.confidence}%
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Accuracy</p>
                  <p className="text-sm text-gray-600">{forecast.accuracy}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Last Update</p>
                  <p className="text-sm text-gray-600">{forecast.lastUpdate}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Created</p>
                  <p className="text-sm text-gray-600">{forecast.createdDate}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Forecast Data Points:</p>
                <div className="space-y-2">
                  {forecast.dataPoints.map((point, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{point.period}</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{point.value}</span>
                        <div className="flex items-center space-x-1">
                          <span className={`text-xs ${point.growth.startsWith('+') ? 'text-green-600' : point.growth.startsWith('-') ? 'text-red-600' : 'text-gray-600'}`}>
                            {point.growth}
                          </span>
                          {getGrowthIcon(point.growth)}
                        </div>
                      </div>
                    </div>
                  ))}
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
                    View Chart
                  </button>
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    <Calculator className="w-3 h-3 mr-1" />
                    Analyze
                  </button>
                </div>
                <Link
                  href={`/finance/planning/forecasts/${forecast.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Forecast Scenarios */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Forecast Scenarios</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Optimistic</h3>
                <p className="text-xs text-gray-500">Best case scenario</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Revenue: +15%</p>
              <p>Costs: +5%</p>
              <p>Margin: 32%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Realistic</h3>
                <p className="text-xs text-gray-500">Most likely scenario</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Revenue: +8%</p>
              <p>Costs: +6%</p>
              <p>Margin: 28%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Conservative</h3>
                <p className="text-xs text-gray-500">Cautious approach</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Revenue: +3%</p>
              <p>Costs: +8%</p>
              <p>Margin: 24%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Pessimistic</h3>
                <p className="text-xs text-gray-500">Worst case scenario</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Revenue: -5%</p>
              <p>Costs: +12%</p>
              <p>Margin: 18%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Forecast Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/finance/planning/forecasts/create"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Create Forecast</h3>
            <p className="text-xs text-gray-500">Create new forecast</p>
          </Link>
          <Link
            href="/finance/planning/scenarios"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Target className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Scenario Planning</h3>
            <p className="text-xs text-gray-500">Manage scenarios</p>
          </Link>
          <Link
            href="/finance/planning/forecasts/analytics"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Forecast Analytics</h3>
            <p className="text-xs text-gray-500">View analytics</p>
          </Link>
          <Link
            href="/finance/planning/forecasts/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Forecast Reports</h3>
            <p className="text-xs text-gray-500">Generate reports</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
