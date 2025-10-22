"use client";

import { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Users,
  Target,
  Award,
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
  Minus,
  FileText,
  MapPin,
  Building,
  Activity,
  Globe,
  Zap,
  Shield,
  Database,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  Star,
  Briefcase,
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
  BarChart3,
  PieChart,
  GraduationCap,
  BookOpen,
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
  Crown
} from "lucide-react";
import Link from "next/link";

export default function HRCompensationPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const compensationStats = [
    {
      name: "Total Compensation Budget",
      value: "₦2.4B",
      change: "+8.5%",
      changeType: "positive",
      icon: DollarSign,
      description: "Annual budget for 2024",
      status: "On Track"
    },
    {
      name: "Average Salary",
      value: "₦4.2M",
      change: "+6.2%",
      changeType: "positive",
      icon: Wallet,
      description: "Monthly average",
      status: "Competitive"
    },
    {
      name: "Performance Bonuses",
      value: "₦180M",
      change: "+12%",
      changeType: "positive",
      icon: Trophy,
      description: "Paid this year",
      status: "Growing"
    },
    {
      name: "Benefits Coverage",
      value: "95%",
      change: "+2%",
      changeType: "positive",
      icon: Shield,
      description: "Employee coverage",
      status: "Excellent"
    }
  ];

  const compensationPlans = [
    {
      id: "COMP-001",
      employeeName: "Dr. Sarah Johnson",
      employeeId: "EMP-001",
      position: "General Manager - ICT",
      department: "ICT Division",
      grade: "GM-1",
      salary: {
        base: 8500000,
        housing: 1700000,
        transport: 425000,
        utility: 212500,
        totalMonthly: 10837500,
        totalAnnual: 130050000
      },
      benefits: {
        healthInsurance: 240000,
        pension: 637500,
        gratuity: 425000,
        leaveAllowance: 850000,
        totalAnnual: 2152500
      },
      bonuses: {
        performance: 4250000,
        projectCompletion: 1700000,
        annualBonus: 2550000,
        totalAnnual: 8500000
      },
      allowances: {
        furniture: 340000,
        vehicleMaintenance: 510000,
        professionalDevelopment: 255000,
        totalAnnual: 1105000
      },
      totalCompensation: {
        monthly: 10837500,
        annual: 142432500
      },
      lastReview: "2024-06-15",
      nextReview: "2025-06-15",
      performanceRating: 4.8,
      marketPosition: "Above Market",
      recommendations: [
        "Consider additional equity compensation",
        "Review housing allowance based on location",
        "Increase professional development budget"
      ],
      status: "Active",
      effectiveDate: "2024-01-01",
      contractType: "Permanent",
      taxImplications: {
        monthlyTax: 2270875,
        annualTax: 27250500,
        takeHomeMonthly: 8566625,
        taxRate: 21.0
      },
      comparison: {
        marketAverage: 11500000,
        internalAverage: 9200000,
        percentile: 75
      }
    },
    {
      id: "COMP-002",
      employeeName: "Eng. Michael Adebayo",
      employeeId: "EMP-002",
      position: "Port Operations Manager",
      department: "Marine Operations",
      grade: "MGR-2",
      salary: {
        base: 5200000,
        housing: 1040000,
        transport: 260000,
        utility: 130000,
        totalMonthly: 6630000,
        totalAnnual: 79560000
      },
      benefits: {
        healthInsurance: 156000,
        pension: 390000,
        gratuity: 260000,
        leaveAllowance: 520000,
        totalAnnual: 1326000
      },
      bonuses: {
        performance: 2080000,
        projectCompletion: 780000,
        annualBonus: 1300000,
        totalAnnual: 4160000
      },
      allowances: {
        furniture: 208000,
        vehicleMaintenance: 312000,
        professionalDevelopment: 156000,
        totalAnnual: 676000
      },
      totalCompensation: {
        monthly: 6630000,
        annual: 91716000
      },
      lastReview: "2024-07-01",
      nextReview: "2025-07-01",
      performanceRating: 4.3,
      marketPosition: "At Market",
      recommendations: [
        "Consider promotion to Senior Manager level",
        "Increase performance bonus potential",
        "Review vehicle allowance for field work"
      ],
      status: "Active",
      effectiveDate: "2024-02-01",
      contractType: "Permanent",
      taxImplications: {
        monthlyTax: 1392300,
        annualTax: 16707600,
        takeHomeMonthly: 5237700,
        taxRate: 21.0
      },
      comparison: {
        marketAverage: 6800000,
        internalAverage: 5800000,
        percentile: 65
      }
    },
    {
      id: "COMP-003",
      employeeName: "Mrs. Grace Okonkwo",
      employeeId: "EMP-003",
      position: "Chief Financial Officer",
      department: "Finance Division",
      grade: "EXEC-1",
      salary: {
        base: 7200000,
        housing: 1440000,
        transport: 360000,
        utility: 180000,
        totalMonthly: 9180000,
        totalAnnual: 110160000
      },
      benefits: {
        healthInsurance: 216000,
        pension: 540000,
        gratuity: 360000,
        leaveAllowance: 720000,
        totalAnnual: 1836000
      },
      bonuses: {
        performance: 3600000,
        projectCompletion: 1440000,
        annualBonus: 2160000,
        totalAnnual: 7200000
      },
      allowances: {
        furniture: 288000,
        vehicleMaintenance: 432000,
        professionalDevelopment: 216000,
        totalAnnual: 936000
      },
      totalCompensation: {
        monthly: 9180000,
        annual: 124452000
      },
      lastReview: "2024-08-15",
      nextReview: "2025-08-15",
      performanceRating: 4.6,
      marketPosition: "Above Market",
      recommendations: [
        "Maintain current compensation level",
        "Consider long-term incentive plan",
        "Review professional memberships coverage"
      ],
      status: "Active",
      effectiveDate: "2024-03-01",
      contractType: "Permanent",
      taxImplications: {
        monthlyTax: 1927800,
        annualTax: 23133600,
        takeHomeMonthly: 7252200,
        taxRate: 21.0
      },
      comparison: {
        marketAverage: 9500000,
        internalAverage: 7800000,
        percentile: 78
      }
    },
    {
      id: "COMP-004",
      employeeName: "Mr. David Okafor",
      employeeId: "EMP-004",
      position: "Senior Software Developer",
      department: "ICT Division",
      grade: "TECH-3",
      salary: {
        base: 2850000,
        housing: 570000,
        transport: 142500,
        utility: 71250,
        totalMonthly: 3633750,
        totalAnnual: 43605000
      },
      benefits: {
        healthInsurance: 85500,
        pension: 213750,
        gratuity: 142500,
        leaveAllowance: 285000,
        totalAnnual: 726750
      },
      bonuses: {
        performance: 1140000,
        projectCompletion: 427500,
        annualBonus: 570000,
        totalAnnual: 2137500
      },
      allowances: {
        furniture: 114000,
        vehicleMaintenance: 171000,
        professionalDevelopment: 85500,
        totalAnnual: 370500
      },
      totalCompensation: {
        monthly: 3633750,
        annual: 49338750
      },
      lastReview: "2024-09-01",
      nextReview: "2025-09-01",
      performanceRating: 4.1,
      marketPosition: "At Market",
      recommendations: [
        "Consider promotion to Tech Lead",
        "Increase base salary by 8%",
        "Add certification reimbursement"
      ],
      status: "Active",
      effectiveDate: "2024-04-01",
      contractType: "Permanent",
      taxImplications: {
        monthlyTax: 762988,
        annualTax: 9155856,
        takeHomeMonthly: 2870762,
        taxRate: 21.0
      },
      comparison: {
        marketAverage: 3800000,
        internalAverage: 3200000,
        percentile: 68
      }
    },
    {
      id: "COMP-005",
      employeeName: "Mrs. Funmi Adebayo",
      employeeId: "EMP-005",
      position: "Customer Relations Manager",
      department: "Customer Relations",
      grade: "MGR-1",
      salary: {
        base: 3950000,
        housing: 790000,
        transport: 197500,
        utility: 98750,
        totalMonthly: 5036250,
        totalAnnual: 60435000
      },
      benefits: {
        healthInsurance: 118500,
        pension: 296250,
        gratuity: 197500,
        leaveAllowance: 395000,
        totalAnnual: 1007250
      },
      bonuses: {
        performance: 1580000,
        projectCompletion: 592500,
        annualBonus: 790000,
        totalAnnual: 2962500
      },
      allowances: {
        furniture: 158000,
        vehicleMaintenance: 237000,
        professionalDevelopment: 118500,
        totalAnnual: 513500
      },
      totalCompensation: {
        monthly: 5036250,
        annual: 70155000
      },
      lastReview: "2024-10-01",
      nextReview: "2025-10-01",
      performanceRating: 4.4,
      marketPosition: "Above Market",
      recommendations: [
        "Excellent performance compensation",
        "Consider team leadership bonus",
        "Review communication training budget"
      ],
      status: "Active",
      effectiveDate: "2024-05-01",
      contractType: "Permanent",
      taxImplications: {
        monthlyTax: 1057613,
        annualTax: 12691356,
        takeHomeMonthly: 3978637,
        taxRate: 21.0
      },
      comparison: {
        marketAverage: 4800000,
        internalAverage: 4100000,
        percentile: 72
      }
    }
  ];

  const departmentOptions = [
    { value: "all", label: "All Departments" },
    { value: "ict_division", label: "ICT Division" },
    { value: "marine_operations", label: "Marine Operations" },
    { value: "finance_division", label: "Finance Division" },
    { value: "customer_relations", label: "Customer Relations" }
  ];

  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: "executive", label: "Executive" },
    { value: "management", label: "Management" },
    { value: "technical", label: "Technical" },
    { value: "administrative", label: "Administrative" }
  ];

  const filteredPlans = compensationPlans.filter(plan => {
    const matchesSearch = plan.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter === "all" || 
                             plan.department.toLowerCase().replace(" ", "_") === departmentFilter;
    const matchesType = typeFilter === "all" || 
                       (typeFilter === "executive" && plan.grade.startsWith("EXEC")) ||
                       (typeFilter === "management" && plan.grade.startsWith("MGR")) ||
                       (typeFilter === "technical" && plan.grade.startsWith("TECH")) ||
                       (typeFilter === "administrative" && !plan.grade.startsWith("EXEC") && !plan.grade.startsWith("MGR") && !plan.grade.startsWith("TECH"));
    
    return matchesSearch && matchesDepartment && matchesType;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getMarketPositionColor = (position: string) => {
    switch (position) {
      case 'Above Market': return 'bg-green-100 text-green-800';
      case 'At Market': return 'bg-blue-100 text-blue-800';
      case 'Below Market': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compensation Management</h1>
          <p className="text-gray-600">Manage employee compensation packages, salary structures, and benefits</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/hr/compensation/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Compensation Plan
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Compensation Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {compensationStats.map((stat) => (
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
                stat.status === 'Competitive' ? 'bg-blue-100 text-blue-800' :
                stat.status === 'Growing' ? 'bg-purple-100 text-purple-800' :
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
                placeholder="Search employees by name, position, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
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

      {/* Compensation Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredPlans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <User className="w-6 h-6 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{plan.employeeName}</h3>
                    <p className="text-sm text-gray-600">{plan.position}</p>
                  </div>
                  <span className="text-sm text-gray-500">#{plan.id}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{plan.department} • Grade {plan.grade}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getMarketPositionColor(plan.marketPosition)}`}>
                    {plan.marketPosition}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                    {plan.contractType}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    Performance: {plan.performanceRating}/5.0
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
                  <Calculator className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Monthly Compensation</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base Salary:</span>
                      <span className="font-medium">{formatCurrency(plan.salary.base)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Housing:</span>
                      <span className="font-medium">{formatCurrency(plan.salary.housing)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transport:</span>
                      <span className="font-medium">{formatCurrency(plan.salary.transport)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Monthly:</span>
                      <span className="font-bold text-green-600">{formatCurrency(plan.salary.totalMonthly)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Annual Benefits</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Health Insurance:</span>
                      <span className="font-medium">{formatCurrency(plan.benefits.healthInsurance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pension:</span>
                      <span className="font-medium">{formatCurrency(plan.benefits.pension)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Leave Allowance:</span>
                      <span className="font-medium">{formatCurrency(plan.benefits.leaveAllowance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Benefits:</span>
                      <span className="font-bold text-blue-600">{formatCurrency(plan.benefits.totalAnnual)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Annual Bonuses & Allowances</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Performance Bonus:</p>
                    <p className="font-medium text-purple-600">{formatCurrency(plan.bonuses.performance)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Annual Bonus:</p>
                    <p className="font-medium text-purple-600">{formatCurrency(plan.bonuses.annualBonus)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Professional Development:</p>
                    <p className="font-medium text-green-600">{formatCurrency(plan.allowances.professionalDevelopment)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Vehicle Maintenance:</p>
                    <p className="font-medium text-green-600">{formatCurrency(plan.allowances.vehicleMaintenance)}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Total Compensation Summary</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-600">Monthly Total:</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(plan.totalCompensation.monthly)}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-blue-600">Annual Total:</p>
                    <p className="text-xl font-bold text-blue-900">{formatCurrency(plan.totalCompensation.annual)}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Tax Implications</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Monthly Tax:</p>
                    <p className="font-medium text-red-600">{formatCurrency(plan.taxImplications.monthlyTax)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Take Home Monthly:</p>
                    <p className="font-medium text-green-600">{formatCurrency(plan.taxImplications.takeHomeMonthly)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Tax Rate:</p>
                    <p className="font-medium">{plan.taxImplications.taxRate}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Annual Tax:</p>
                    <p className="font-medium text-red-600">{formatCurrency(plan.taxImplications.annualTax)}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Market Comparison</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Market Average:</p>
                    <p className="font-medium">{formatCurrency(plan.comparison.marketAverage)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Internal Average:</p>
                    <p className="font-medium">{formatCurrency(plan.comparison.internalAverage)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Percentile:</p>
                    <p className="font-medium">{plan.comparison.percentile}th</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Review Information</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Last Review:</p>
                    <p className="font-medium">{plan.lastReview}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Next Review:</p>
                    <p className="font-medium">{plan.nextReview}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Recommendations</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {plan.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                    <Eye className="w-3 h-3 mr-1" />
                    View Details
                  </button>
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                    <Calculator className="w-3 h-3 mr-1" />
                    Calculate
                  </button>
                </div>
                <Link
                  href={`/hr/compensation/${plan.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Compensation Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Compensation Management Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Total Annual Compensation</h3>
                <p className="text-xs text-gray-500">All employees combined</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Amount: {formatCurrency(compensationPlans.reduce((sum, plan) => sum + plan.totalCompensation.annual, 0))}</p>
              <p>Average: {formatCurrency(Math.round(compensationPlans.reduce((sum, plan) => sum + plan.totalCompensation.annual, 0) / compensationPlans.length))}</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Trophy className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Total Bonuses Paid</h3>
                <p className="text-xs text-gray-500">This year</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Amount: {formatCurrency(compensationPlans.reduce((sum, plan) => sum + plan.bonuses.totalAnnual, 0))}</p>
              <p>Percentage: {Math.round((compensationPlans.reduce((sum, plan) => sum + plan.bonuses.totalAnnual, 0) / compensationPlans.reduce((sum, plan) => sum + plan.totalCompensation.annual, 0)) * 100)}%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Benefits Coverage</h3>
                <p className="text-xs text-gray-500">Annual benefits</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Amount: {formatCurrency(compensationPlans.reduce((sum, plan) => sum + plan.benefits.totalAnnual, 0))}</p>
              <p>Average: {formatCurrency(Math.round(compensationPlans.reduce((sum, plan) => sum + plan.benefits.totalAnnual, 0) / compensationPlans.length))}</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Award className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Market Positioning</h3>
                <p className="text-xs text-gray-500">Competitive analysis</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Above Market: {compensationPlans.filter(p => p.marketPosition === 'Above Market').length}</p>
              <p>At Market: {compensationPlans.filter(p => p.marketPosition === 'At Market').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Compensation Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/hr/compensation/create"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Create Plan</h3>
            <p className="text-xs text-gray-500">New compensation package</p>
          </Link>
          <Link
            href="/hr/compensation/salary-structure"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Briefcase className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Salary Structure</h3>
            <p className="text-xs text-gray-500">Grade and pay scales</p>
          </Link>
          <Link
            href="/hr/compensation/market-analysis"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Market Analysis</h3>
            <p className="text-xs text-gray-500">Competitive benchmarking</p>
          </Link>
          <Link
            href="/hr/compensation/benefits"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Shield className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Benefits Management</h3>
            <p className="text-xs text-gray-500">Health and benefits</p>
          </Link>
        </div>
      </div>
    </div>
  );
}