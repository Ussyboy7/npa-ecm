"use client";

import { useState } from "react";
import {
  Target,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  Filter,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  RefreshCw,
  Minus,
  FileText,
  MapPin,
  Building,
  Users,
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
  Stop,
  Wifi,
  Bug,
  User,
  Gauge,
  Zap as Lightning,
  Layers,
  Link as LinkIcon,
  WifiOff,
  Signal,
  Wifi as WifiIcon,
  Video,
  Headphones,
  Presentation,
  FileVideo,
  Book,
  PenTool,
  Clipboard,
  CheckSquare,
  Square as SquareIcon,
  Navigation,
  Waves,
  Wind,
  Droplets,
  Thermometer,
  Gauge as Speedometer,
  Route,
  Flag,
  Map,
  Settings,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Calculator,
  PiggyBank,
  Receipt,
  CreditCard,
  Wallet,
  Banknote,
  Coins,
  Landmark,
  Scale,
  Trophy,
  Medal,
  Crown,
  Ruler,
  Compass,
  Crosshair
} from "lucide-react";
import Link from "next/link";

export default function FinanceKPIsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const kpiStats = [
    {
      name: "Total KPIs",
      value: "156",
      change: "+12",
      changeType: "positive",
      icon: Target,
      description: "Active key performance indicators",
      status: "On Track"
    },
    {
      name: "KPIs On Target",
      value: "134",
      change: "+8",
      changeType: "positive",
      icon: CheckCircle,
      description: "Meeting or exceeding targets",
      status: "Excellent"
    },
    {
      name: "KPIs At Risk",
      value: "15",
      change: "-3",
      changeType: "positive",
      icon: AlertTriangle,
      description: "Require attention",
      status: "Improving"
    },
    {
      name: "Average Performance",
      value: "87%",
      change: "+5%",
      changeType: "positive",
      icon: Gauge,
      description: "Overall KPI achievement",
      status: "Strong"
    }
  ];

  const kpis = [
    {
      id: "KPI-001",
      name: "Revenue Growth Rate",
      category: "Financial Performance",
      description: "Year-over-year revenue growth percentage",
      target: {
        value: 15.0,
        unit: "%",
        period: "Annual",
        timeframe: "FY 2024"
      },
      current: {
        value: 12.8,
        unit: "%",
        lastUpdated: "2024-12-01",
        trend: "up"
      },
      status: "On Track",
      priority: "High",
      owner: "Chief Financial Officer",
      department: "Finance Division",
      calculation: "((Current Year Revenue - Previous Year Revenue) / Previous Year Revenue) × 100",
      dataSource: "General Ledger System",
      frequency: "Monthly",
      benchmark: {
        industry: 12.5,
        internal: 13.2,
        competitor: 11.8
      },
      actions: [
        "Increase marketing spend in Q4",
        "Launch new service offerings",
        "Expand customer base"
      ],
      risks: [
        "Economic downturn",
        "Increased competition",
        "Regulatory changes"
      ],
      weight: 25,
      scorecard: "Financial",
      tags: ["revenue", "growth", "financial", "annual"]
    },
    {
      id: "KPI-002",
      name: "Operating Profit Margin",
      category: "Profitability",
      description: "Operating profit as a percentage of total revenue",
      target: {
        value: 28.0,
        unit: "%",
        period: "Annual",
        timeframe: "FY 2024"
      },
      current: {
        value: 31.2,
        unit: "%",
        lastUpdated: "2024-11-30",
        trend: "up"
      },
      status: "Exceeding",
      priority: "Critical",
      owner: "Chief Financial Officer",
      department: "Finance Division",
      calculation: "(Operating Profit / Total Revenue) × 100",
      dataSource: "Financial Reporting System",
      frequency: "Monthly",
      benchmark: {
        industry: 24.5,
        internal: 26.8,
        competitor: 23.1
      },
      actions: [
        "Cost optimization initiatives",
        "Efficiency improvement programs",
        "Pricing strategy review"
      ],
      risks: [
        "Rising operational costs",
        "Revenue volatility",
        "Market competition"
      ],
      weight: 30,
      scorecard: "Financial",
      tags: ["profitability", "margin", "operating", "critical"]
    },
    {
      id: "KPI-003",
      name: "Customer Satisfaction Score",
      category: "Customer Experience",
      description: "Average customer satisfaction rating from surveys",
      target: {
        value: 4.5,
        unit: "/5.0",
        period: "Quarterly",
        timeframe: "Q4 2024"
      },
      current: {
        value: 4.2,
        unit: "/5.0",
        lastUpdated: "2024-12-01",
        trend: "stable"
      },
      status: "On Track",
      priority: "High",
      owner: "Customer Relations Manager",
      department: "Customer Relations",
      calculation: "Average of all customer survey responses (1-5 scale)",
      dataSource: "Customer Feedback System",
      frequency: "Weekly",
      benchmark: {
        industry: 4.1,
        internal: 4.3,
        competitor: 4.0
      },
      actions: [
        "Improve response times",
        "Enhance service quality",
        "Staff training programs"
      ],
      risks: [
        "Staff turnover",
        "System downtime",
        "Service complexity"
      ],
      weight: 20,
      scorecard: "Customer",
      tags: ["customer", "satisfaction", "experience", "service"]
    },
    {
      id: "KPI-004",
      name: "Employee Productivity Index",
      category: "Operational Efficiency",
      description: "Revenue per employee adjusted for inflation",
      target: {
        value: 8500000,
        unit: "₦",
        period: "Annual",
        timeframe: "FY 2024"
      },
      current: {
        value: 7820000,
        unit: "₦",
        lastUpdated: "2024-11-30",
        trend: "up"
      },
      status: "At Risk",
      priority: "Medium",
      owner: "Chief Operating Officer",
      department: "Operations",
      calculation: "Total Revenue / Number of Employees (inflation adjusted)",
      dataSource: "HR & Financial Systems",
      frequency: "Monthly",
      benchmark: {
        industry: 7200000,
        internal: 8100000,
        competitor: 6900000
      },
      actions: [
        "Staff training and development",
        "Process automation",
        "Performance incentives"
      ],
      risks: [
        "Staff turnover",
        "Economic inflation",
        "Market changes"
      ],
      weight: 15,
      scorecard: "Operational",
      tags: ["productivity", "efficiency", "employee", "operations"]
    },
    {
      id: "KPI-005",
      name: "Port Throughput Efficiency",
      category: "Operational Performance",
      description: "Container throughput per hour of operation",
      target: {
        value: 45,
        unit: "containers/hour",
        period: "Monthly",
        timeframe: "December 2024"
      },
      current: {
        value: 42,
        unit: "containers/hour",
        lastUpdated: "2024-12-01",
        trend: "down"
      },
      status: "At Risk",
      priority: "High",
      owner: "Port Operations Manager",
      department: "Marine Operations",
      calculation: "Total Containers Handled / Total Operating Hours",
      dataSource: "Port Management System",
      frequency: "Daily",
      benchmark: {
        industry: 38,
        internal: 43,
        competitor: 36
      },
      actions: [
        "Equipment maintenance schedule",
        "Staff training programs",
        "Process optimization"
      ],
      risks: [
        "Equipment failure",
        "Weather conditions",
        "Staff shortages"
      ],
      weight: 20,
      scorecard: "Operational",
      tags: ["port", "throughput", "efficiency", "operations", "marine"]
    },
    {
      id: "KPI-006",
      name: "IT System Uptime",
      category: "Technology Performance",
      description: "Percentage of time critical IT systems are operational",
      target: {
        value: 99.9,
        unit: "%",
        period: "Monthly",
        timeframe: "December 2024"
      },
      current: {
        value: 99.7,
        unit: "%",
        lastUpdated: "2024-12-01",
        trend: "stable"
      },
      status: "On Track",
      priority: "Critical",
      owner: "Chief Technology Officer",
      department: "ICT Division",
      calculation: "(Total Available Time - Downtime) / Total Available Time × 100",
      dataSource: "IT Monitoring System",
      frequency: "Real-time",
      benchmark: {
        industry: 99.5,
        internal: 99.8,
        competitor: 99.3
      },
      actions: [
        "Regular system maintenance",
        "Redundant system design",
        "24/7 monitoring and support"
      ],
      risks: [
        "Hardware failure",
        "Cybersecurity incidents",
        "Human error"
      ],
      weight: 25,
      scorecard: "Technology",
      tags: ["uptime", "reliability", "it", "systems", "critical"]
    },
    {
      id: "KPI-007",
      name: "Health & Safety Incident Rate",
      category: "Safety & Compliance",
      description: "Number of safety incidents per 100,000 working hours",
      target: {
        value: 2.5,
        unit: "incidents/100k hours",
        period: "Annual",
        timeframe: "FY 2024"
      },
      current: {
        value: 1.8,
        unit: "incidents/100k hours",
        lastUpdated: "2024-12-01",
        trend: "down"
      },
      status: "Exceeding",
      priority: "Critical",
      owner: "Safety Manager",
      department: "Health & Safety",
      calculation: "(Number of Incidents × 100,000) / Total Working Hours",
      dataSource: "Safety Management System",
      frequency: "Monthly",
      benchmark: {
        industry: 3.2,
        internal: 2.8,
        competitor: 3.5
      },
      actions: [
        "Safety training programs",
        "Equipment safety checks",
        "Incident investigation process"
      ],
      risks: [
        "Equipment failure",
        "Human error",
        "Environmental factors"
      ],
      weight: 20,
      scorecard: "Safety",
      tags: ["safety", "health", "incidents", "compliance", "critical"]
    },
    {
      id: "KPI-008",
      name: "Cash Flow Coverage Ratio",
      category: "Financial Health",
      description: "Ratio of operating cash flow to total debt obligations",
      target: {
        value: 1.5,
        unit: "ratio",
        period: "Quarterly",
        timeframe: "Q4 2024"
      },
      current: {
        value: 1.3,
        unit: "ratio",
        lastUpdated: "2024-11-30",
        trend: "stable"
      },
      status: "At Risk",
      priority: "High",
      owner: "Treasury Manager",
      department: "Finance Division",
      calculation: "Operating Cash Flow / (Principal + Interest Payments)",
      dataSource: "Treasury Management System",
      frequency: "Monthly",
      benchmark: {
        industry: 1.2,
        internal: 1.4,
        competitor: 1.1
      },
      actions: [
        "Improve cash flow management",
        "Debt restructuring",
        "Cost reduction initiatives"
      ],
      risks: [
        "Revenue volatility",
        "Interest rate changes",
        "Economic downturn"
      ],
      weight: 18,
      scorecard: "Financial",
      tags: ["cashflow", "debt", "liquidity", "financial", "treasury"]
    }
  ];

  const categoryOptions = [
    { value: "all", label: "All Categories" },
    { value: "financial_performance", label: "Financial Performance" },
    { value: "profitability", label: "Profitability" },
    { value: "customer_experience", label: "Customer Experience" },
    { value: "operational_efficiency", label: "Operational Efficiency" },
    { value: "operational_performance", label: "Operational Performance" },
    { value: "technology_performance", label: "Technology Performance" },
    { value: "safety_compliance", label: "Safety & Compliance" },
    { value: "financial_health", label: "Financial Health" }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "on_track", label: "On Track" },
    { value: "exceeding", label: "Exceeding" },
    { value: "at_risk", label: "At Risk" },
    { value: "critical", label: "Critical" },
    { value: "off_track", label: "Off Track" }
  ];

  const filteredKpis = kpis.filter(kpi => {
    const matchesSearch = kpi.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         kpi.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         kpi.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         kpi.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || 
                           kpi.category.toLowerCase().replace(" ", "_").replace("&", "").replace("-", "_") === categoryFilter;
    const matchesStatus = statusFilter === "all" || 
                         kpi.status.toLowerCase().replace(" ", "_") === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const statusColorMap = {
    'On Track': 'bg-green-100 text-green-800',
    'Exceeding': 'bg-blue-100 text-blue-800',
    'At Risk': 'bg-yellow-100 text-yellow-800',
    'Critical': 'bg-orange-100 text-orange-800',
    'Off Track': 'bg-red-100 text-red-800'
  };

  const categoryColorMap = {
    'Financial Performance': 'bg-blue-100 text-blue-800',
    'Profitability': 'bg-green-100 text-green-800',
    'Customer Experience': 'bg-purple-100 text-purple-800',
    'Operational Efficiency': 'bg-orange-100 text-orange-800',
    'Operational Performance': 'bg-yellow-100 text-yellow-800',
    'Technology Performance': 'bg-indigo-100 text-indigo-800',
    'Safety & Compliance': 'bg-red-100 text-red-800',
    'Financial Health': 'bg-teal-100 text-teal-800'
  };

  const priorityColorMap = {
    'Critical': 'bg-red-100 text-red-800',
    'High': 'bg-orange-100 text-orange-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-green-100 text-green-800'
  };

  const scorecardColorMap = {
    'Financial': 'bg-blue-100 text-blue-800',
    'Customer': 'bg-purple-100 text-purple-800',
    'Operational': 'bg-orange-100 text-orange-800',
    'Technology': 'bg-indigo-100 text-indigo-800',
    'Safety': 'bg-red-100 text-red-800'
  };

  const getPerformanceColor = (current: number, target: number, higherIsBetter: boolean = true) => {
    const ratio = higherIsBetter ? current / target : target / current;
    if (ratio >= 1.05) return 'text-green-600';
    if (ratio >= 0.95) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Key Performance Indicators</h1>
          <p className="text-gray-600">Monitor and track organizational KPIs and performance metrics</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/finance/planning/kpis/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create KPI
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Export Dashboard
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiStats.map((stat) => (
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
                stat.status === 'On Track' ? 'bg-green-100 text-green-800' :
                stat.status === 'Excellent' ? 'bg-blue-100 text-blue-800' :
                stat.status === 'Improving' ? 'bg-yellow-100 text-yellow-800' :
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
                placeholder="Search KPIs by name, description, owner, or department..."
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

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredKpis.map((kpi) => (
          <div key={kpi.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Target className="w-6 h-6 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{kpi.name}</h3>
                    <p className="text-sm text-gray-500">{kpi.category}</p>
                  </div>
                  <span className="text-sm text-gray-500">#{kpi.id}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{kpi.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[kpi.status as keyof typeof statusColorMap]}`}>
                    {kpi.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColorMap[kpi.priority as keyof typeof priorityColorMap]}`}>
                    {kpi.priority}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${scorecardColorMap[kpi.scorecard as keyof typeof scorecardColorMap]}`}>
                    {kpi.scorecard}
                  </span>
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
                  <p className="text-sm font-medium text-gray-900">Target vs Current</p>
                  <div className="space-y-2 text-sm mt-1">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Target:</span>
                      <span className="font-medium">{kpi.target.value} {kpi.target.unit}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Current:</span>
                      <span className={`font-medium ${getPerformanceColor(kpi.current.value, kpi.target.value)}`}>
                        {kpi.current.value} {kpi.current.unit}
                        {getTrendIcon(kpi.current.trend)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Gap:</span>
                      <span className={`font-medium ${getPerformanceColor(kpi.current.value, kpi.target.value) === 'text-green-600' ? 'text-green-600' : 'text-red-600'}`}>
                        {Math.abs(kpi.current.value - kpi.target.value)} {kpi.target.unit}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">KPI Details</p>
                  <div className="space-y-2 text-sm mt-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Owner:</span>
                      <span className="font-medium">{kpi.owner}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Department:</span>
                      <span className="font-medium">{kpi.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Weight:</span>
                      <span className="font-medium">{kpi.weight}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Frequency:</span>
                      <span className="font-medium">{kpi.frequency}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Benchmarking</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Industry</p>
                    <p className="text-gray-900">{kpi.benchmark.industry} {kpi.target.unit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Internal</p>
                    <p className="text-gray-900">{kpi.benchmark.internal} {kpi.target.unit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Competitor</p>
                    <p className="text-gray-900">{kpi.benchmark.competitor} {kpi.target.unit}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Data Source & Calculation</p>
                <div className="text-sm">
                  <p className="text-gray-600 mb-1"><strong>Source:</strong> {kpi.dataSource}</p>
                  <p className="text-gray-600 text-xs">{kpi.calculation}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Action Items</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {kpi.actions.slice(0, 3).map((action, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-green-600 mt-0.5">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                  {kpi.actions.length > 3 && (
                    <li className="text-blue-600">+{kpi.actions.length - 3} more actions</li>
                  )}
                </ul>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Risk Factors</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {kpi.risks.map((risk, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-yellow-600 mt-0.5">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {kpi.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                    <Eye className="w-3 h-3 mr-1" />
                    View Details
                  </button>
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                    <BarChart3 className="w-3 h-3 mr-1" />
                    Analytics
                  </button>
                </div>
                <Link
                  href={`/finance/planning/kpis/${kpi.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* KPI Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">KPI Performance Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">On Track KPIs</h3>
                <p className="text-xs text-gray-500">Meeting targets</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {kpis.filter(k => k.status === 'On Track').length}</p>
              <p>Percentage: {Math.round((kpis.filter(k => k.status === 'On Track').length / kpis.length) * 100)}%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Trophy className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Exceeding Targets</h3>
                <p className="text-xs text-gray-500">Above expectations</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {kpis.filter(k => k.status === 'Exceeding').length}</p>
              <p>Average Overage: 12.5%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">At Risk KPIs</h3>
                <p className="text-xs text-gray-500">Require attention</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {kpis.filter(k => k.status === 'At Risk').length}</p>
              <p>Critical: {kpis.filter(k => k.priority === 'Critical' && k.status === 'At Risk').length}</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Average Weight</h3>
                <p className="text-xs text-gray-500">Scorecard impact</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Weight: {Math.round(kpis.reduce((sum, k) => sum + k.weight, 0) / kpis.length)}%</p>
              <p>Total: {kpis.reduce((sum, k) => sum + k.weight, 0)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">KPI Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/finance/planning/kpis/create"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Create KPI</h3>
            <p className="text-xs text-gray-500">New performance indicator</p>
          </Link>
          <Link
            href="/finance/planning/kpis/dashboard"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">KPI Dashboard</h3>
            <p className="text-xs text-gray-500">Visual performance dashboard</p>
          </Link>
          <Link
            href="/finance/planning/kpis/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">KPI Reports</h3>
            <p className="text-xs text-gray-500">Generate performance reports</p>
          </Link>
          <Link
            href="/finance/planning/kpis/targets"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Target className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Target Management</h3>
            <p className="text-xs text-gray-500">Adjust KPI targets</p>
          </Link>
        </div>
      </div>
    </div>
  );
}