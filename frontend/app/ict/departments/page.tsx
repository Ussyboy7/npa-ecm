"use client";

import { useState } from "react";
import {
  Building,
  Users,
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
  Monitor,
  Server,
  Database,
  Shield,
  Globe
} from "lucide-react";
import Link from "next/link";

export default function ICTDepartmentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const departments = [
    {
      id: "DEPT-001",
      name: "Software Applications",
      description: "Development and maintenance of software applications and systems",
      head: "Engr. Sarah Johnson",
      email: "sarah.johnson@npa.gov.ng",
      phone: "+234-1-234-5678",
      location: "Lagos HQ - Floor 3",
      employeeCount: 25,
      budget: "₦2.5B",
      status: "Active",
      established: "2020-01-15",
      lastReview: "2024-11-15",
      nextReview: "2025-05-15",
      projects: 8,
      completedProjects: 12,
      technologies: ["React", "Node.js", "PostgreSQL", "AWS", "Docker"],
      specializations: ["Web Development", "Mobile Apps", "API Development", "DevOps"],
      performance: {
        score: 92,
        trend: "up",
        kpis: {
          projectDelivery: 95,
          codeQuality: 88,
          teamSatisfaction: 91,
          clientSatisfaction: 89
        }
      }
    },
    {
      id: "DEPT-002",
      name: "Network Infrastructure",
      description: "Management and maintenance of network infrastructure and connectivity",
      head: "Mr. David Okafor",
      email: "david.okafor@npa.gov.ng",
      phone: "+234-1-234-5679",
      location: "Lagos HQ - Floor 2",
      employeeCount: 18,
      budget: "₦1.8B",
      status: "Active",
      established: "2019-06-01",
      lastReview: "2024-10-20",
      nextReview: "2025-04-20",
      projects: 6,
      completedProjects: 15,
      technologies: ["Cisco", "Fortinet", "VMware", "Linux", "Windows Server"],
      specializations: ["Network Security", "Cloud Infrastructure", "Data Center", "Wireless"],
      performance: {
        score: 87,
        trend: "stable",
        kpis: {
          uptime: 99.5,
          securityIncidents: 2,
          teamSatisfaction: 85,
          clientSatisfaction: 87
        }
      }
    },
    {
      id: "DEPT-003",
      name: "Database Administration",
      description: "Database design, implementation, and maintenance",
      head: "Dr. Ahmed Hassan",
      email: "ahmed.hassan@npa.gov.ng",
      phone: "+234-1-234-5680",
      location: "Lagos HQ - Floor 2",
      employeeCount: 12,
      budget: "₦1.2B",
      status: "Active",
      established: "2021-03-10",
      lastReview: "2024-09-15",
      nextReview: "2025-03-15",
      projects: 4,
      completedProjects: 8,
      technologies: ["PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch"],
      specializations: ["Database Design", "Performance Tuning", "Backup & Recovery", "Data Migration"],
      performance: {
        score: 89,
        trend: "up",
        kpis: {
          queryPerformance: 94,
          backupSuccess: 100,
          teamSatisfaction: 88,
          clientSatisfaction: 92
        }
      }
    },
    {
      id: "DEPT-004",
      name: "Cybersecurity",
      description: "Information security, threat management, and compliance",
      head: "Mrs. Grace Williams",
      email: "grace.williams@npa.gov.ng",
      phone: "+234-1-234-5681",
      location: "Lagos HQ - Floor 1",
      employeeCount: 15,
      budget: "₦2.0B",
      status: "Active",
      established: "2020-08-20",
      lastReview: "2024-12-01",
      nextReview: "2025-06-01",
      projects: 5,
      completedProjects: 10,
      technologies: ["SIEM", "Firewall", "Endpoint Protection", "VPN", "PKI"],
      specializations: ["Threat Detection", "Incident Response", "Compliance", "Security Training"],
      performance: {
        score: 94,
        trend: "up",
        kpis: {
          threatDetection: 96,
          incidentResponse: 92,
          teamSatisfaction: 93,
          clientSatisfaction: 95
        }
      }
    },
    {
      id: "DEPT-005",
      name: "IT Support",
      description: "Technical support and helpdesk services",
      head: "Mr. Michael Chen",
      email: "michael.chen@npa.gov.ng",
      phone: "+234-1-234-5682",
      location: "Lagos HQ - Ground Floor",
      employeeCount: 20,
      budget: "₦1.5B",
      status: "Active",
      established: "2018-01-01",
      lastReview: "2024-11-30",
      nextReview: "2025-05-30",
      projects: 3,
      completedProjects: 20,
      technologies: ["Windows", "macOS", "Linux", "Office 365", "Active Directory"],
      specializations: ["Desktop Support", "User Training", "Hardware Maintenance", "Software Deployment"],
      performance: {
        score: 85,
        trend: "stable",
        kpis: {
          ticketResolution: 88,
          userSatisfaction: 82,
          teamSatisfaction: 86,
          clientSatisfaction: 84
        }
      }
    },
    {
      id: "DEPT-006",
      name: "Data Analytics",
      description: "Business intelligence, data analysis, and reporting",
      head: "Dr. Fatima Ibrahim",
      email: "fatima.ibrahim@npa.gov.ng",
      phone: "+234-1-234-5683",
      location: "Lagos HQ - Floor 4",
      employeeCount: 10,
      budget: "₦1.0B",
      status: "Planning",
      established: "2025-01-01",
      lastReview: "N/A",
      nextReview: "2025-07-01",
      projects: 0,
      completedProjects: 0,
      technologies: ["Python", "R", "Tableau", "Power BI", "Apache Spark"],
      specializations: ["Data Visualization", "Statistical Analysis", "Machine Learning", "Business Intelligence"],
      performance: {
        score: 0,
        trend: "new",
        kpis: {
          dataAccuracy: 0,
          reportDelivery: 0,
          teamSatisfaction: 0,
          clientSatisfaction: 0
        }
      }
    }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "planning", label: "Planning" },
    { value: "inactive", label: "Inactive" }
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
    'Planning': 'bg-yellow-100 text-yellow-800',
    'Inactive': 'bg-gray-100 text-gray-800'
  };

  const trendColorMap = {
    'up': 'text-green-600',
    'down': 'text-red-600',
    'stable': 'text-gray-600',
    'new': 'text-blue-600'
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 80) return 'bg-blue-100 text-blue-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ICT Departments</h1>
          <p className="text-gray-600">Manage and monitor ICT departments and teams</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/ict/departments/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Department
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <BarChart3 className="w-4 h-4 mr-2" />
            Department Analytics
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Departments</p>
              <p className="text-2xl font-bold text-gray-900">{departments.length}</p>
            </div>
            <Building className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">{departments.reduce((sum, dept) => sum + dept.employeeCount, 0)}</p>
            </div>
            <Users className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Projects</p>
              <p className="text-2xl font-bold text-gray-900">{departments.reduce((sum, dept) => sum + dept.projects, 0)}</p>
            </div>
            <Target className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900">₦10.0B</p>
            </div>
            <DollarSign className="h-8 w-8 text-yellow-600" />
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
                  <p className="text-sm font-medium text-gray-900">Active Projects</p>
                  <p className="text-sm text-gray-600">{department.projects}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Completed</p>
                  <p className="text-sm text-gray-600">{department.completedProjects}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Performance Score</span>
                  <span className={`font-medium ${trendColorMap[department.performance.trend as keyof typeof trendColorMap]}`}>
                    {department.performance.score}%
                    {department.performance.trend === 'up' && ' ↗'}
                    {department.performance.trend === 'down' && ' ↘'}
                    {department.performance.trend === 'stable' && ' →'}
                    {department.performance.trend === 'new' && ' ✨'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      department.performance.score >= 90 ? 'bg-green-600' :
                      department.performance.score >= 80 ? 'bg-blue-600' :
                      department.performance.score >= 70 ? 'bg-yellow-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${department.performance.score}%` }}
                  ></div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Technologies:</p>
                <div className="flex flex-wrap gap-2">
                  {department.technologies.map((tech, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Specializations:</p>
                <div className="flex flex-wrap gap-2">
                  {department.specializations.map((spec, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                      {spec}
                    </span>
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
                    <Settings className="w-3 h-3 mr-1" />
                    Manage
                  </button>
                </div>
                <Link
                  href={`/ict/departments/${department.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Department Performance Overview */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Department Performance Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.filter(dept => dept.status === 'Active').map((department) => (
            <div key={department.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">{department.name}</h4>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPerformanceColor(department.performance.score)}`}>
                  {department.performance.score}%
                </span>
              </div>
              <div className="space-y-2">
                {Object.entries(department.performance.kpis).map(([kpi, value]) => (
                  <div key={kpi} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 capitalize">{kpi.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="font-medium">{typeof value === 'number' ? `${value}%` : value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Department Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/ict/departments/create"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Create Department</h3>
            <p className="text-xs text-gray-500">Add new department</p>
          </Link>
          <Link
            href="/ict/departments/analytics"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Performance Analytics</h3>
            <p className="text-xs text-gray-500">View analytics</p>
          </Link>
          <Link
            href="/ict/departments/budget"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <DollarSign className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Budget Management</h3>
            <p className="text-xs text-gray-500">Manage budgets</p>
          </Link>
          <Link
            href="/ict/departments/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Department Reports</h3>
            <p className="text-xs text-gray-500">Generate reports</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
