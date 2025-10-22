"use client";

import { useState } from "react";
import {
  Users,
  Building,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  Settings,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Activity,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Clock,
  Target,
  DollarSign,
  FileText,
  GraduationCap,
  Award,
  UserCheck,
  UserPlus,
  UserMinus,
  Briefcase
} from "lucide-react";
import Link from "next/link";

export default function HRDepartmentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const hrStats = [
    {
      name: "Total Employees",
      value: "2,471",
      change: "+45",
      changeType: "positive",
      icon: Users,
      description: "Active employees",
      status: "Growing"
    },
    {
      name: "Departments",
      value: "12",
      change: "+1",
      changeType: "positive",
      icon: Building,
      description: "Active departments",
      status: "Stable"
    },
    {
      name: "Vacancy Rate",
      value: "8.2%",
      change: "-1.3%",
      changeType: "positive",
      icon: UserMinus,
      description: "Open positions",
      status: "Improving"
    },
    {
      name: "Retention Rate",
      value: "94.5%",
      change: "+2.1%",
      changeType: "positive",
      icon: UserCheck,
      description: "Employee retention",
      status: "Excellent"
    }
  ];

  const departments = [
    {
      id: "DEPT-001",
      name: "ICT Division",
      description: "Information and Communication Technology services and support",
      head: "Engr. Sarah Johnson",
      email: "sarah.johnson@npa.gov.ng",
      phone: "+234-1-234-5678",
      location: "Lagos HQ - Floor 3",
      employeeCount: 85,
      budget: "₦2.5B",
      status: "Active",
      established: "2020-01-15",
      lastReview: "2024-11-15",
      nextReview: "2025-05-15",
      positions: [
        { title: "Software Developer", count: 25, open: 3 },
        { title: "System Administrator", count: 15, open: 2 },
        { title: "Network Engineer", count: 12, open: 1 },
        { title: "Database Administrator", count: 8, open: 1 },
        { title: "IT Support", count: 20, open: 2 },
        { title: "Project Manager", count: 5, open: 0 }
      ],
      metrics: {
        avgTenure: "4.2 years",
        turnoverRate: "8.5%",
        satisfaction: "4.3/5",
        trainingHours: "120h/year"
      },
      recentActivities: [
        "3 new hires this month",
        "2 promotions approved",
        "Team building event scheduled",
        "Performance reviews completed"
      ]
    },
    {
      id: "DEPT-002",
      name: "Marine Operations",
      description: "Port operations, vessel management, and marine services",
      head: "Capt. David Okafor",
      email: "david.okafor@npa.gov.ng",
      phone: "+234-1-234-5679",
      location: "Lagos HQ - Floor 2",
      employeeCount: 156,
      budget: "₦4.8B",
      status: "Active",
      established: "2019-06-01",
      lastReview: "2024-10-20",
      nextReview: "2025-04-20",
      positions: [
        { title: "Port Manager", count: 8, open: 1 },
        { title: "Vessel Traffic Controller", count: 24, open: 3 },
        { title: "Cargo Handler", count: 45, open: 5 },
        { title: "Pilot", count: 12, open: 2 },
        { title: "Marine Engineer", count: 18, open: 2 },
        { title: "Safety Officer", count: 15, open: 1 }
      ],
      metrics: {
        avgTenure: "6.8 years",
        turnoverRate: "12.3%",
        satisfaction: "4.1/5",
        trainingHours: "80h/year"
      },
      recentActivities: [
        "5 new hires this month",
        "1 promotion approved",
        "Safety training completed",
        "Equipment training scheduled"
      ]
    },
    {
      id: "DEPT-003",
      name: "Finance Division",
      description: "Financial management, accounting, and treasury operations",
      head: "Mrs. Grace Williams",
      email: "grace.williams@npa.gov.ng",
      phone: "+234-1-234-5680",
      location: "Lagos HQ - Floor 1",
      employeeCount: 42,
      budget: "₦1.8B",
      status: "Active",
      established: "2021-03-10",
      lastReview: "2024-09-15",
      nextReview: "2025-03-15",
      positions: [
        { title: "Accountant", count: 15, open: 2 },
        { title: "Financial Analyst", count: 8, open: 1 },
        { title: "Treasury Officer", count: 6, open: 0 },
        { title: "Budget Officer", count: 5, open: 1 },
        { title: "Auditor", count: 4, open: 0 },
        { title: "Finance Manager", count: 4, open: 0 }
      ],
      metrics: {
        avgTenure: "5.2 years",
        turnoverRate: "6.8%",
        satisfaction: "4.5/5",
        trainingHours: "100h/year"
      },
      recentActivities: [
        "2 new hires this month",
        "3 promotions approved",
        "CPA training completed",
        "Budget planning session"
      ]
    },
    {
      id: "DEPT-004",
      name: "Human Resources",
      description: "HR services, recruitment, training, and employee relations",
      head: "Mr. Michael Chen",
      email: "michael.chen@npa.gov.ng",
      phone: "+234-1-234-5681",
      location: "Lagos HQ - Ground Floor",
      employeeCount: 28,
      budget: "₦1.2B",
      status: "Active",
      established: "2018-01-01",
      lastReview: "2024-11-30",
      nextReview: "2025-05-30",
      positions: [
        { title: "HR Manager", count: 3, open: 0 },
        { title: "Recruitment Officer", count: 6, open: 1 },
        { title: "Training Coordinator", count: 4, open: 0 },
        { title: "Employee Relations", count: 5, open: 1 },
        { title: "Compensation Analyst", count: 3, open: 0 },
        { title: "HR Assistant", count: 7, open: 1 }
      ],
      metrics: {
        avgTenure: "4.8 years",
        turnoverRate: "5.2%",
        satisfaction: "4.4/5",
        trainingHours: "150h/year"
      },
      recentActivities: [
        "1 new hire this month",
        "2 promotions approved",
        "HRIS training completed",
        "Employee survey launched"
      ]
    },
    {
      id: "DEPT-005",
      name: "Safety & Security",
      description: "Port security, safety management, and emergency response",
      head: "Mr. Ahmed Hassan",
      email: "ahmed.hassan@npa.gov.ng",
      phone: "+234-1-234-5682",
      location: "Lagos HQ - Ground Floor",
      employeeCount: 78,
      budget: "₦2.2B",
      status: "Active",
      established: "2020-08-20",
      lastReview: "2024-12-01",
      nextReview: "2025-06-01",
      positions: [
        { title: "Security Officer", count: 35, open: 4 },
        { title: "Safety Inspector", count: 15, open: 2 },
        { title: "Emergency Response", count: 12, open: 1 },
        { title: "Access Control", count: 8, open: 1 },
        { title: "Security Manager", count: 4, open: 0 },
        { title: "Safety Coordinator", count: 4, open: 0 }
      ],
      metrics: {
        avgTenure: "3.9 years",
        turnoverRate: "15.2%",
        satisfaction: "4.0/5",
        trainingHours: "90h/year"
      },
      recentActivities: [
        "4 new hires this month",
        "1 promotion approved",
        "Security training completed",
        "Safety audit scheduled"
      ]
    },
    {
      id: "DEPT-006",
      name: "Administration",
      description: "General administration, facilities management, and support services",
      head: "Mrs. Fatima Ibrahim",
      email: "fatima.ibrahim@npa.gov.ng",
      phone: "+234-1-234-5683",
      location: "Lagos HQ - Ground Floor",
      employeeCount: 65,
      budget: "₦1.5B",
      status: "Active",
      established: "2017-05-01",
      lastReview: "2024-10-15",
      nextReview: "2025-04-15",
      positions: [
        { title: "Administrative Officer", count: 20, open: 2 },
        { title: "Facilities Manager", count: 8, open: 1 },
        { title: "Receptionist", count: 12, open: 1 },
        { title: "Maintenance Staff", count: 15, open: 2 },
        { title: "Procurement Officer", count: 6, open: 0 },
        { title: "Office Manager", count: 4, open: 0 }
      ],
      metrics: {
        avgTenure: "5.5 years",
        turnoverRate: "9.8%",
        satisfaction: "4.2/5",
        trainingHours: "60h/year"
      },
      recentActivities: [
        "3 new hires this month",
        "2 promotions approved",
        "Facilities training completed",
        "Office renovation planned"
      ]
    }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "restructuring", label: "Restructuring" }
  ];

  const filteredDepartments = departments.filter(department => {
    const matchesSearch = department.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         department.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         department.head.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         department.status.toLowerCase() === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusColorMap = {
    'Active': 'bg-green-100 text-green-800',
    'Inactive': 'bg-gray-100 text-gray-800',
    'Restructuring': 'bg-yellow-100 text-yellow-800'
  };

  const getTurnoverColor = (rate: string) => {
    const value = parseFloat(rate);
    if (value <= 8) return 'bg-green-100 text-green-800';
    if (value <= 12) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getSatisfactionColor = (rating: string) => {
    const value = parseFloat(rating);
    if (value >= 4.3) return 'bg-green-100 text-green-800';
    if (value >= 4.0) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">HR Departments</h1>
          <p className="text-gray-600">Manage and monitor HR departments and workforce</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/hr/departments/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Department
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <BarChart3 className="w-4 h-4 mr-2" />
            HR Analytics
          </button>
        </div>
      </div>

      {/* HR Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {hrStats.map((stat) => (
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
                stat.status === 'Stable' ? 'bg-blue-100 text-blue-800' :
                stat.status === 'Improving' ? 'bg-green-100 text-green-800' :
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
                placeholder="Search departments by name, description, or head..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
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

      {/* Departments Grid */}
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
                <p className="text-sm text-gray-600 mb-3">{department.description}</p>
                <div className="text-sm text-gray-500 space-y-1">
                  <p><span className="font-medium">Head:</span> {department.head}</p>
                  <p><span className="font-medium">Location:</span> {department.location}</p>
                  <p><span className="font-medium">Established:</span> {department.established}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Employees</p>
                  <p className="text-sm text-gray-600">{department.employeeCount}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Budget</p>
                  <p className="text-sm text-gray-600">{department.budget}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Avg Tenure</p>
                  <p className="text-sm text-gray-600">{department.metrics.avgTenure}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Training Hours</p>
                  <p className="text-sm text-gray-600">{department.metrics.trainingHours}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Key Metrics:</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Turnover Rate</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTurnoverColor(department.metrics.turnoverRate)}`}>
                      {department.metrics.turnoverRate}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Satisfaction</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSatisfactionColor(department.metrics.satisfaction)}`}>
                      {department.metrics.satisfaction}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Key Positions:</p>
                <div className="space-y-2">
                  {department.positions.slice(0, 3).map((position, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{position.title}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-900">{position.count}</span>
                        {position.open > 0 && (
                          <span className="px-1 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                            {position.open} open
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {department.positions.length > 3 && (
                    <div className="text-xs text-blue-600">
                      +{department.positions.length - 3} more positions
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Recent Activities:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {department.recentActivities.slice(0, 2).map((activity, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>{activity}</span>
                    </li>
                  ))}
                  {department.recentActivities.length > 2 && (
                    <li className="text-blue-600">+{department.recentActivities.length - 2} more activities</li>
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
                    <Users className="w-3 h-3 mr-1" />
                    Employees
                  </button>
                </div>
                <Link
                  href={`/hr/departments/${department.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Department Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Department Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((department) => (
            <div key={department.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">{department.name}</h4>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[department.status as keyof typeof statusColorMap]}`}>
                  {department.status}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Employees</span>
                  <span className="font-medium">{department.employeeCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Turnover</span>
                  <span className={`font-medium ${getTurnoverColor(department.metrics.turnoverRate)}`}>
                    {department.metrics.turnoverRate}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Satisfaction</span>
                  <span className={`font-medium ${getSatisfactionColor(department.metrics.satisfaction)}`}>
                    {department.metrics.satisfaction}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Open Positions</span>
                  <span className="font-medium">
                    {department.positions.reduce((sum, pos) => sum + pos.open, 0)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">HR Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/hr/departments/create"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Create Department</h3>
            <p className="text-xs text-gray-500">Add new department</p>
          </Link>
          <Link
            href="/hr/recruitment"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <UserPlus className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Recruitment</h3>
            <p className="text-xs text-gray-500">Manage recruitment</p>
          </Link>
          <Link
            href="/hr/training"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <GraduationCap className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Training Programs</h3>
            <p className="text-xs text-gray-500">Manage training</p>
          </Link>
          <Link
            href="/hr/performance"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Award className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Performance</h3>
            <p className="text-xs text-gray-500">Performance reviews</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
