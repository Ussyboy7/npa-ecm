"use client";

import { useState } from "react";
import {
  Target,
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
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle,
  Minus,
  FileText,
  MapPin,
  Building,
  Users,
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
  DollarSign,
  Percent,
  ArrowUp,
  ArrowDown,
  Circle,
  Square,
  Triangle,
  Monitor,
  Smartphone,
  Laptop,
  Printer,
  Camera,
  Wrench,
  Tool,
  Router,
  Server,
  GitCommit,
  Code,
  GitBranch,
  Play,
  Pause,
  Stop
} from "lucide-react";
import Link from "next/link";

export default function FinanceScenariosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const scenarioStats = [
    {
      name: "Total Scenarios",
      value: "24",
      change: "+3",
      changeType: "positive",
      icon: Target,
      description: "Active scenarios",
      status: "Growing"
    },
    {
      name: "Best Case Scenarios",
      value: "8",
      change: "+1",
      changeType: "positive",
      icon: TrendingUp,
      description: "Optimistic projections",
      status: "Active"
    },
    {
      name: "Worst Case Scenarios",
      value: "6",
      change: "0",
      changeType: "neutral",
      icon: TrendingDown,
      description: "Pessimistic projections",
      status: "Stable"
    },
    {
      name: "Base Case Scenarios",
      value: "10",
      change: "+2",
      changeType: "positive",
      icon: BarChart3,
      description: "Most likely outcomes",
      status: "Growing"
    }
  ];

  const scenarios = [
    {
      id: "SCN-001",
      name: "Port Traffic Growth - Optimistic",
      type: "Best Case",
      status: "Active",
      createdBy: "finance.team@npa.gov.ng",
      createdDate: "2024-12-01",
      lastUpdated: "2024-12-10",
      description: "Scenario assuming 15% annual growth in port traffic with new terminal operations",
      assumptions: [
        "15% annual growth in container traffic",
        "New terminal operations begin Q2 2025",
        "Increased vessel calls by 25%",
        "Enhanced cargo handling capacity",
        "Favorable economic conditions"
      ],
      timeframe: "2025-2027",
      keyMetrics: {
        revenue: "₦45.2B",
        expenses: "₦28.5B",
        netIncome: "₦16.7B",
        cashFlow: "₦18.2B",
        roi: "23.5%"
      },
      sensitivityAnalysis: {
        highImpact: ["Port traffic growth", "Cargo handling rates", "Vessel calls"],
        mediumImpact: ["Operating costs", "Fuel prices", "Labor costs"],
        lowImpact: ["Administrative costs", "Insurance", "Utilities"]
      },
      probability: 25,
      confidence: 85,
      risks: [
        "Economic downturn affecting global trade",
        "Competition from other ports",
        "Regulatory changes",
        "Infrastructure delays"
      ],
      opportunities: [
        "New shipping routes",
        "Digital transformation benefits",
        "Government infrastructure investment",
        "Regional trade agreements"
      ]
    },
    {
      id: "SCN-002",
      name: "Economic Recession Impact",
      type: "Worst Case",
      status: "Active",
      createdBy: "risk.team@npa.gov.ng",
      createdDate: "2024-11-15",
      lastUpdated: "2024-12-08",
      description: "Scenario modeling the impact of a global economic recession on port operations",
      assumptions: [
        "10% decline in global trade volumes",
        "Reduced vessel calls by 20%",
        "Lower cargo handling rates",
        "Increased competition for limited business",
        "Rising operational costs"
      ],
      timeframe: "2025-2026",
      keyMetrics: {
        revenue: "₦28.5B",
        expenses: "₦32.1B",
        netIncome: "-₦3.6B",
        cashFlow: "-₦2.8B",
        roi: "-8.2%"
      },
      sensitivityAnalysis: {
        highImpact: ["Trade volume decline", "Cargo rates", "Vessel calls"],
        mediumImpact: ["Operating costs", "Fuel prices", "Labor costs"],
        lowImpact: ["Administrative costs", "Insurance", "Utilities"]
      },
      probability: 15,
      confidence: 75,
      risks: [
        "Extended economic downturn",
        "Currency devaluation",
        "Increased competition",
        "Regulatory compliance costs"
      ],
      opportunities: [
        "Cost optimization initiatives",
        "Diversification of services",
        "Government support programs",
        "Technology efficiency gains"
      ]
    },
    {
      id: "SCN-003",
      name: "Digital Transformation Success",
      type: "Best Case",
      status: "Active",
      createdBy: "ict.team@npa.gov.ng",
      createdDate: "2024-11-20",
      lastUpdated: "2024-12-05",
      description: "Scenario modeling successful digital transformation and automation benefits",
      assumptions: [
        "Successful implementation of digital systems",
        "30% reduction in manual processes",
        "Improved operational efficiency",
        "Enhanced customer experience",
        "Reduced operational costs"
      ],
      timeframe: "2025-2027",
      keyMetrics: {
        revenue: "₦42.8B",
        expenses: "₦25.2B",
        netIncome: "₦17.6B",
        cashFlow: "₦19.1B",
        roi: "28.7%"
      },
      sensitivityAnalysis: {
        highImpact: ["Digital adoption rate", "Process automation", "Customer satisfaction"],
        mediumImpact: ["Technology costs", "Training expenses", "System maintenance"],
        lowImpact: ["Administrative costs", "Insurance", "Utilities"]
      },
      probability: 35,
      confidence: 80,
      risks: [
        "Technology implementation delays",
        "Staff resistance to change",
        "Cybersecurity threats",
        "System integration challenges"
      ],
      opportunities: [
        "Improved operational efficiency",
        "Enhanced customer experience",
        "Data-driven decision making",
        "Competitive advantage"
      ]
    },
    {
      id: "SCN-004",
      name: "Base Case - Current Trends",
      type: "Base Case",
      status: "Active",
      createdBy: "planning.team@npa.gov.ng",
      createdDate: "2024-10-01",
      lastUpdated: "2024-12-10",
      description: "Base case scenario based on current trends and historical performance",
      assumptions: [
        "5% annual growth in port traffic",
        "Stable cargo handling rates",
        "Moderate increase in operational costs",
        "Continued government support",
        "Steady economic conditions"
      ],
      timeframe: "2025-2027",
      keyMetrics: {
        revenue: "₦38.5B",
        expenses: "₦29.8B",
        netIncome: "₦8.7B",
        cashFlow: "₦10.2B",
        roi: "15.2%"
      },
      sensitivityAnalysis: {
        highImpact: ["Port traffic growth", "Cargo handling rates", "Operational efficiency"],
        mediumImpact: ["Operating costs", "Fuel prices", "Labor costs"],
        lowImpact: ["Administrative costs", "Insurance", "Utilities"]
      },
      probability: 40,
      confidence: 90,
      risks: [
        "Economic volatility",
        "Competition from other ports",
        "Regulatory changes",
        "Infrastructure maintenance"
      ],
      opportunities: [
        "Operational improvements",
        "Cost optimization",
        "Service diversification",
        "Technology upgrades"
      ]
    },
    {
      id: "SCN-005",
      name: "Climate Change Adaptation",
      type: "Base Case",
      status: "Draft",
      createdBy: "sustainability.team@npa.gov.ng",
      createdDate: "2024-12-05",
      lastUpdated: "2024-12-09",
      description: "Scenario modeling the impact of climate change adaptation measures",
      assumptions: [
        "Implementation of green port initiatives",
        "Increased investment in renewable energy",
        "Enhanced environmental compliance",
        "Moderate impact on operations",
        "Government environmental incentives"
      ],
      timeframe: "2025-2030",
      keyMetrics: {
        revenue: "₦36.2B",
        expenses: "₦31.5B",
        netIncome: "₦4.7B",
        cashFlow: "₦6.8B",
        roi: "8.9%"
      },
      sensitivityAnalysis: {
        highImpact: ["Environmental compliance costs", "Renewable energy investment", "Carbon pricing"],
        mediumImpact: ["Operating costs", "Fuel prices", "Labor costs"],
        lowImpact: ["Administrative costs", "Insurance", "Utilities"]
      },
      probability: 30,
      confidence: 70,
      risks: [
        "High environmental compliance costs",
        "Technology implementation challenges",
        "Regulatory uncertainty",
        "Market resistance to green initiatives"
      ],
      opportunities: [
        "Government incentives",
        "Improved environmental reputation",
        "Long-term cost savings",
        "Access to green financing"
      ]
    }
  ];

  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: "best_case", label: "Best Case" },
    { value: "worst_case", label: "Worst Case" },
    { value: "base_case", label: "Base Case" }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "draft", label: "Draft" },
    { value: "archived", label: "Archived" }
  ];

  const filteredScenarios = scenarios.filter(scenario => {
    const matchesSearch = scenario.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scenario.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scenario.createdBy.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || 
                       scenario.type.toLowerCase().replace(" ", "_") === typeFilter;
    const matchesStatus = statusFilter === "all" || 
                         scenario.status.toLowerCase() === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const typeColorMap = {
    'Best Case': 'bg-green-100 text-green-800',
    'Worst Case': 'bg-red-100 text-red-800',
    'Base Case': 'bg-blue-100 text-blue-800'
  };

  const statusColorMap = {
    'Active': 'bg-green-100 text-green-800',
    'Draft': 'bg-yellow-100 text-yellow-800',
    'Archived': 'bg-gray-100 text-gray-800'
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 40) return 'bg-green-100 text-green-800';
    if (probability >= 25) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
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
          <h1 className="text-3xl font-bold text-gray-900">Financial Scenarios</h1>
          <p className="text-gray-600">Create and analyze different financial scenarios and projections</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/finance/planning/scenarios/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Scenario
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <BarChart3 className="w-4 h-4 mr-2" />
            Compare Scenarios
          </button>
        </div>
      </div>

      {/* Scenario Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {scenarioStats.map((stat) => (
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
                stat.changeType === 'neutral' ? 'text-gray-600' : 'text-red-600'
              }`}>
                {stat.change}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                stat.status === 'Growing' ? 'bg-green-100 text-green-800' :
                stat.status === 'Active' ? 'bg-blue-100 text-blue-800' :
                stat.status === 'Stable' ? 'bg-gray-100 text-gray-800' :
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
                placeholder="Search scenarios by name, description, or creator..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
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
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {statusOptions.map(option => (
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

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredScenarios.map((scenario) => (
          <div key={scenario.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Target className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{scenario.name}</h3>
                  <span className="text-sm text-gray-500">#{scenario.id}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{scenario.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeColorMap[scenario.type as keyof typeof typeColorMap]}`}>
                    {scenario.type}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[scenario.status as keyof typeof statusColorMap]}`}>
                    {scenario.status}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                    {scenario.timeframe}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg">
                  <BarChart3 className="w-4 h-4" />
                </button>
                <button className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg">
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Created By</p>
                  <p className="text-sm text-gray-600">{scenario.createdBy}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Last Updated</p>
                  <p className="text-sm text-gray-600">{scenario.lastUpdated}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Probability</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getProbabilityColor(scenario.probability)}`}>
                    {scenario.probability}%
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Confidence</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getConfidenceColor(scenario.confidence)}`}>
                    {scenario.confidence}%
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Key Financial Metrics:</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Revenue</p>
                    <p className="text-sm font-medium text-green-600">{scenario.keyMetrics.revenue}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Expenses</p>
                    <p className="text-sm font-medium text-red-600">{scenario.keyMetrics.expenses}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Net Income</p>
                    <p className="text-sm font-medium text-gray-900">{scenario.keyMetrics.netIncome}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Cash Flow</p>
                    <p className="text-sm font-medium text-blue-600">{scenario.keyMetrics.cashFlow}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Key Assumptions:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {scenario.assumptions.slice(0, 3).map((assumption, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>{assumption}</span>
                    </li>
                  ))}
                  {scenario.assumptions.length > 3 && (
                    <li className="text-blue-600">+{scenario.assumptions.length - 3} more assumptions</li>
                  )}
                </ul>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">High Impact Factors:</p>
                <div className="flex flex-wrap gap-1">
                  {scenario.sensitivityAnalysis.highImpact.slice(0, 3).map((factor, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                      {factor}
                    </span>
                  ))}
                  {scenario.sensitivityAnalysis.highImpact.length > 3 && (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                      +{scenario.sensitivityAnalysis.highImpact.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                    <BarChart3 className="w-3 h-3 mr-1" />
                    Analyze
                  </button>
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    <FileText className="w-3 h-3 mr-1" />
                    Report
                  </button>
                </div>
                <Link
                  href={`/finance/planning/scenarios/${scenario.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Scenario Analysis Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Scenario Analysis Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Best Case Scenarios</h3>
                <p className="text-xs text-gray-500">Optimistic projections</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {scenarios.filter(s => s.type === 'Best Case').length}</p>
              <p>Avg. ROI: {scenarios.filter(s => s.type === 'Best Case').reduce((sum, s) => sum + parseFloat(s.keyMetrics.roi), 0) / scenarios.filter(s => s.type === 'Best Case').length || 0}%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Worst Case Scenarios</h3>
                <p className="text-xs text-gray-500">Pessimistic projections</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {scenarios.filter(s => s.type === 'Worst Case').length}</p>
              <p>Avg. ROI: {scenarios.filter(s => s.type === 'Worst Case').reduce((sum, s) => sum + parseFloat(s.keyMetrics.roi), 0) / scenarios.filter(s => s.type === 'Worst Case').length || 0}%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Base Case Scenarios</h3>
                <p className="text-xs text-gray-500">Most likely outcomes</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {scenarios.filter(s => s.type === 'Base Case').length}</p>
              <p>Avg. ROI: {scenarios.filter(s => s.type === 'Base Case').reduce((sum, s) => sum + parseFloat(s.keyMetrics.roi), 0) / scenarios.filter(s => s.type === 'Base Case').length || 0}%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Active Scenarios</h3>
                <p className="text-xs text-gray-500">Currently in use</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {scenarios.filter(s => s.status === 'Active').length}</p>
              <p>Avg. Confidence: {Math.round(scenarios.filter(s => s.status === 'Active').reduce((sum, s) => sum + s.confidence, 0) / scenarios.filter(s => s.status === 'Active').length || 0)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Scenario Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/finance/planning/scenarios/create"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Create Scenario</h3>
            <p className="text-xs text-gray-500">New scenario</p>
          </Link>
          <Link
            href="/finance/planning/scenarios/compare"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Compare Scenarios</h3>
            <p className="text-xs text-gray-500">Side-by-side analysis</p>
          </Link>
          <Link
            href="/finance/planning/scenarios/sensitivity"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Target className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Sensitivity Analysis</h3>
            <p className="text-xs text-gray-500">Analyze variables</p>
          </Link>
          <Link
            href="/finance/planning/scenarios/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Scenario Reports</h3>
            <p className="text-xs text-gray-500">Generate reports</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
