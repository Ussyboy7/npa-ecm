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
  MapPin
} from "lucide-react";
import Link from "next/link";

export default function FinanceInvestmentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const investmentStats = [
    {
      name: "Total Portfolio Value",
      value: "₦45.2B",
      change: "+8.5%",
      changeType: "positive",
      icon: DollarSign,
      description: "Current market value",
      status: "Growing"
    },
    {
      name: "Active Investments",
      value: "24",
      change: "+3",
      changeType: "positive",
      icon: Briefcase,
      description: "Currently active",
      status: "Expanding"
    },
    {
      name: "Annual Return",
      value: "12.8%",
      change: "+2.1%",
      changeType: "positive",
      icon: TrendingUp,
      description: "Year-to-date return",
      status: "Excellent"
    },
    {
      name: "Risk Level",
      value: "Medium",
      change: "-0.3",
      changeType: "positive",
      icon: Shield,
      description: "Portfolio risk rating",
      status: "Stable"
    }
  ];

  const investments = [
    {
      id: "INV-001",
      name: "Lagos Port Expansion",
      description: "Expansion of Lagos port facilities to increase cargo handling capacity",
      category: "Infrastructure",
      type: "Capital Investment",
      status: "Active",
      priority: "High",
      amount: "₦15.5B",
      invested: "₦8.2B",
      remaining: "₦7.3B",
      startDate: "2023-01-15",
      endDate: "2025-12-31",
      expectedReturn: "18.5%",
      actualReturn: "12.3%",
      riskLevel: "Medium",
      location: "Lagos Port",
      manager: "Port Development Team",
      stakeholders: ["NPA", "Federal Government", "Private Partners"],
      milestones: [
        { name: "Phase 1 - Planning", status: "Completed", date: "2023-06-30", amount: "₦2.1B" },
        { name: "Phase 2 - Construction", status: "In Progress", date: "2024-12-31", amount: "₦8.5B" },
        { name: "Phase 3 - Equipment", status: "Pending", date: "2025-06-30", amount: "₦3.2B" },
        { name: "Phase 4 - Commissioning", status: "Pending", date: "2025-12-31", amount: "₦1.7B" }
      ],
      performance: {
        roi: 12.3,
        npv: "₦2.8B",
        irr: 15.2,
        paybackPeriod: "4.2 years"
      },
      risks: [
        "Construction delays",
        "Cost overruns",
        "Regulatory changes",
        "Economic downturn"
      ]
    },
    {
      id: "INV-002",
      name: "ICT Infrastructure Upgrade",
      description: "Comprehensive upgrade of ICT infrastructure and systems",
      category: "Technology",
      type: "Technology Investment",
      status: "Active",
      priority: "High",
      amount: "₦8.5B",
      invested: "₦5.1B",
      remaining: "₦3.4B",
      startDate: "2023-06-01",
      endDate: "2024-12-31",
      expectedReturn: "22.0%",
      actualReturn: "18.7%",
      riskLevel: "Low",
      location: "Lagos HQ",
      manager: "ICT Division",
      stakeholders: ["ICT Team", "Operations", "Finance"],
      milestones: [
        { name: "Hardware Upgrade", status: "Completed", date: "2023-12-31", amount: "₦3.2B" },
        { name: "Software Implementation", status: "In Progress", date: "2024-06-30", amount: "₦2.8B" },
        { name: "Network Infrastructure", status: "In Progress", date: "2024-09-30", amount: "₦1.5B" },
        { name: "Training & Support", status: "Pending", date: "2024-12-31", amount: "₦1.0B" }
      ],
      performance: {
        roi: 18.7,
        npv: "₦1.9B",
        irr: 24.5,
        paybackPeriod: "2.8 years"
      },
      risks: [
        "Technology obsolescence",
        "Implementation delays",
        "Staff training challenges",
        "Integration issues"
      ]
    },
    {
      id: "INV-003",
      name: "Renewable Energy Project",
      description: "Installation of solar panels and renewable energy systems",
      category: "Sustainability",
      type: "Green Investment",
      status: "Planning",
      priority: "Medium",
      amount: "₦6.2B",
      invested: "₦0.5B",
      remaining: "₦5.7B",
      startDate: "2024-03-01",
      endDate: "2026-06-30",
      expectedReturn: "15.0%",
      actualReturn: "0.0%",
      riskLevel: "Medium",
      location: "Multiple Ports",
      manager: "Sustainability Team",
      stakeholders: ["NPA", "Energy Partners", "Government"],
      milestones: [
        { name: "Feasibility Study", status: "Completed", date: "2024-06-30", amount: "₦0.5B" },
        { name: "Design & Planning", status: "In Progress", date: "2024-12-31", amount: "₦1.2B" },
        { name: "Installation Phase 1", status: "Pending", date: "2025-06-30", amount: "₦2.5B" },
        { name: "Installation Phase 2", status: "Pending", date: "2026-06-30", amount: "₦2.0B" }
      ],
      performance: {
        roi: 0.0,
        npv: "₦0.0B",
        irr: 0.0,
        paybackPeriod: "N/A"
      },
      risks: [
        "Weather dependency",
        "Technology costs",
        "Regulatory approval",
        "Grid integration"
      ]
    },
    {
      id: "INV-004",
      name: "Security Systems Upgrade",
      description: "Comprehensive upgrade of port security systems and surveillance",
      category: "Security",
      type: "Security Investment",
      status: "Active",
      priority: "Critical",
      amount: "₦4.8B",
      invested: "₦3.2B",
      remaining: "₦1.6B",
      startDate: "2023-09-01",
      endDate: "2024-09-30",
      expectedReturn: "25.0%",
      actualReturn: "28.5%",
      riskLevel: "Low",
      location: "All Ports",
      manager: "Security Team",
      stakeholders: ["Security", "Operations", "Government"],
      milestones: [
        { name: "Surveillance Systems", status: "Completed", date: "2024-03-31", amount: "₦2.1B" },
        { name: "Access Control", status: "Completed", date: "2024-06-30", amount: "₦1.1B" },
        { name: "Emergency Systems", status: "In Progress", date: "2024-09-30", amount: "₦1.6B" }
      ],
      performance: {
        roi: 28.5,
        npv: "₦1.4B",
        irr: 32.1,
        paybackPeriod: "2.1 years"
      },
      risks: [
        "Technology failures",
        "Maintenance costs",
        "Staff training",
        "Regulatory compliance"
      ]
    },
    {
      id: "INV-005",
      name: "Training & Development Center",
      description: "Establishment of a comprehensive training center for port operations",
      category: "Human Capital",
      type: "Human Capital Investment",
      status: "Completed",
      priority: "Medium",
      amount: "₦3.5B",
      invested: "₦3.5B",
      remaining: "₦0.0B",
      startDate: "2022-01-01",
      endDate: "2023-12-31",
      expectedReturn: "20.0%",
      actualReturn: "22.8%",
      riskLevel: "Low",
      location: "Lagos HQ",
      manager: "HR Division",
      stakeholders: ["HR", "Operations", "Training Partners"],
      milestones: [
        { name: "Facility Construction", status: "Completed", date: "2022-12-31", amount: "₦2.1B" },
        { name: "Equipment Installation", status: "Completed", date: "2023-06-30", amount: "₦1.0B" },
        { name: "Program Development", status: "Completed", date: "2023-12-31", amount: "₦0.4B" }
      ],
      performance: {
        roi: 22.8,
        npv: "₦0.8B",
        irr: 26.3,
        paybackPeriod: "3.1 years"
      },
      risks: [
        "Low utilization",
        "Maintenance costs",
        "Staff turnover",
        "Technology updates"
      ]
    }
  ];

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "infrastructure", label: "Infrastructure" },
    { value: "technology", label: "Technology" },
    { value: "sustainability", label: "Sustainability" },
    { value: "security", label: "Security" },
    { value: "human_capital", label: "Human Capital" }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "planning", label: "Planning" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
    { value: "on_hold", label: "On Hold" },
    { value: "cancelled", label: "Cancelled" }
  ];

  const filteredInvestments = investments.filter(investment => {
    const matchesSearch = investment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         investment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         investment.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || 
                           investment.category.toLowerCase().replace(" ", "_") === categoryFilter;
    const matchesStatus = statusFilter === "all" || 
                         investment.status.toLowerCase().replace(" ", "_") === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const statusColorMap = {
    'Planning': 'bg-yellow-100 text-yellow-800',
    'Active': 'bg-green-100 text-green-800',
    'Completed': 'bg-blue-100 text-blue-800',
    'On Hold': 'bg-gray-100 text-gray-800',
    'Cancelled': 'bg-red-100 text-red-800'
  };

  const priorityColorMap = {
    'Critical': 'bg-red-100 text-red-800',
    'High': 'bg-orange-100 text-orange-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-green-100 text-green-800'
  };

  const categoryColorMap = {
    'Infrastructure': 'bg-blue-100 text-blue-800',
    'Technology': 'bg-purple-100 text-purple-800',
    'Sustainability': 'bg-green-100 text-green-800',
    'Security': 'bg-red-100 text-red-800',
    'Human Capital': 'bg-yellow-100 text-yellow-800'
  };

  const riskColorMap = {
    'Low': 'bg-green-100 text-green-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'High': 'bg-orange-100 text-orange-800',
    'Critical': 'bg-red-100 text-red-800'
  };

  const getReturnColor = (expected: string, actual: string) => {
    const expectedNum = parseFloat(expected);
    const actualNum = parseFloat(actual);
    if (actualNum >= expectedNum) return 'text-green-600';
    if (actualNum >= expectedNum * 0.8) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Investment Portfolio</h1>
          <p className="text-gray-600">Manage and monitor investment portfolio and capital projects</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/finance/planning/investments/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Investment
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Investment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {investmentStats.map((stat) => (
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
                stat.status === 'Expanding' ? 'bg-blue-100 text-blue-800' :
                stat.status === 'Excellent' ? 'bg-purple-100 text-purple-800' :
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
                placeholder="Search investments by name, description, or category..."
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
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
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

      {/* Investments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredInvestments.map((investment) => (
          <div key={investment.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Briefcase className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{investment.name}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[investment.status as keyof typeof statusColorMap]}`}>
                    {investment.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColorMap[investment.priority as keyof typeof priorityColorMap]}`}>
                    {investment.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{investment.description}</p>
                <div className="text-sm text-gray-500 space-y-1">
                  <p><span className="font-medium">Category:</span> {investment.category}</p>
                  <p><span className="font-medium">Manager:</span> {investment.manager}</p>
                  <p><span className="font-medium">Location:</span> {investment.location}</p>
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
                  <p className="text-sm font-medium text-gray-900">Total Amount</p>
                  <p className="text-sm text-gray-600">{investment.amount}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Invested</p>
                  <p className="text-sm text-gray-600">{investment.invested}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Remaining</p>
                  <p className="text-sm text-gray-600">{investment.remaining}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Risk Level</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${riskColorMap[investment.riskLevel as keyof typeof riskColorMap]}`}>
                    {investment.riskLevel}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Investment Progress</span>
                  <span>{Math.round((parseFloat(investment.invested.replace(/[^\d.]/g, '')) / parseFloat(investment.amount.replace(/[^\d.]/g, ''))) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full bg-blue-600"
                    style={{ width: `${(parseFloat(investment.invested.replace(/[^\d.]/g, '')) / parseFloat(investment.amount.replace(/[^\d.]/g, ''))) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Performance Metrics:</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>Expected Return</span>
                    <span>{investment.expectedReturn}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>Actual Return</span>
                    <span className={getReturnColor(investment.expectedReturn, investment.actualReturn)}>
                      {investment.actualReturn}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>ROI</span>
                    <span>{investment.performance.roi}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>NPV</span>
                    <span>{investment.performance.npv}</span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Key Milestones:</p>
                <div className="space-y-2">
                  {investment.milestones.slice(0, 2).map((milestone, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{milestone.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className={`px-1 py-0.5 text-xs rounded ${
                          milestone.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          milestone.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {milestone.status}
                        </span>
                        <span className="text-gray-900">{milestone.amount}</span>
                      </div>
                    </div>
                  ))}
                  {investment.milestones.length > 2 && (
                    <div className="text-xs text-blue-600">
                      +{investment.milestones.length - 2} more milestones
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Key Risks:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {investment.risks.slice(0, 2).map((risk, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-red-600 mt-0.5">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                  {investment.risks.length > 2 && (
                    <li className="text-red-600">+{investment.risks.length - 2} more risks</li>
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
                  href={`/finance/planning/investments/${investment.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Investment Categories */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Investment Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.slice(1).map((category) => (
            <div key={category.value} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  category.value === 'infrastructure' ? 'bg-blue-100' :
                  category.value === 'technology' ? 'bg-purple-100' :
                  category.value === 'sustainability' ? 'bg-green-100' :
                  category.value === 'security' ? 'bg-red-100' :
                  'bg-yellow-100'
                }`}>
                  {category.value === 'infrastructure' ? <Building className="w-4 h-4 text-blue-600" /> :
                   category.value === 'technology' ? <Cpu className="w-4 h-4 text-purple-600" /> :
                   category.value === 'sustainability' ? <Globe className="w-4 h-4 text-green-600" /> :
                   category.value === 'security' ? <Shield className="w-4 h-4 text-red-600" /> :
                   <Users className="w-4 h-4 text-yellow-600" />}
                </div>
                <div>
                  <h3 className="font-medium text-sm">{category.label}</h3>
                  <p className="text-xs text-gray-500">
                    {investments.filter(inv => inv.category.toLowerCase().replace(" ", "_") === category.value).length} investments
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <p>Total Value: ₦{investments.filter(inv => inv.category.toLowerCase().replace(" ", "_") === category.value).reduce((sum, inv) => sum + parseFloat(inv.amount.replace(/[^\d.]/g, '')), 0).toFixed(1)}B</p>
                <p>Avg Return: {investments.filter(inv => inv.category.toLowerCase().replace(" ", "_") === category.value).reduce((sum, inv) => sum + parseFloat(inv.actualReturn), 0) / Math.max(investments.filter(inv => inv.category.toLowerCase().replace(" ", "_") === category.value).length, 1)}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Investment Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/finance/planning/investments/create"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Create Investment</h3>
            <p className="text-xs text-gray-500">New investment</p>
          </Link>
          <Link
            href="/finance/planning/investments/analytics"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Portfolio Analytics</h3>
            <p className="text-xs text-gray-500">View analytics</p>
          </Link>
          <Link
            href="/finance/planning/investments/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Investment Reports</h3>
            <p className="text-xs text-gray-500">Generate reports</p>
          </Link>
          <Link
            href="/finance/planning/investments/risk"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Shield className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Risk Assessment</h3>
            <p className="text-xs text-gray-500">Risk analysis</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
