"use client";

import { useState } from "react";
import {
  Building,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Users,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Eye,
  Settings,
  UserPlus,
  FileText,
  BarChart3
} from "lucide-react";
import Link from "next/link";

export default function DepartmentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const departments = [
    {
      id: "DEPT-001",
      name: "Marine Operations",
      code: "MARINE",
      division: "Operations",
      headOfDepartment: "Capt. John Okonkwo",
      email: "marine.ops@npa.gov.ng",
      phone: "+234-1-234-5678",
      location: "Lagos Port Complex",
      establishedDate: "1960-01-01",
      status: "Active",
      employeeCount: 1247,
      budget: "₦12.5B",
      description: "Responsible for port operations, vessel management, and cargo handling",
      responsibilities: [
        "Port Operations Management",
        "Vessel Traffic Control",
        "Cargo Handling Operations",
        "Pilotage Services",
        "Port Security Coordination"
      ]
    },
    {
      id: "DEPT-002",
      name: "ICT Division",
      code: "ICT",
      division: "Technology",
      headOfDepartment: "Engr. Sarah Johnson",
      email: "ict@npa.gov.ng",
      phone: "+234-1-234-5679",
      location: "Lagos Headquarters",
      establishedDate: "2005-03-15",
      status: "Active",
      employeeCount: 456,
      budget: "₦8.2B",
      description: "Manages information technology infrastructure and digital transformation",
      responsibilities: [
        "IT Infrastructure Management",
        "Software Development",
        "Network Administration",
        "Cybersecurity",
        "Digital Transformation"
      ]
    },
    {
      id: "DEPT-003",
      name: "Finance Division",
      code: "FINANCE",
      division: "Administration",
      headOfDepartment: "Mr. David Okafor",
      email: "finance@npa.gov.ng",
      phone: "+234-1-234-5680",
      location: "Lagos Headquarters",
      establishedDate: "1960-01-01",
      status: "Active",
      employeeCount: 234,
      budget: "₦3.5B",
      description: "Handles financial planning, budgeting, and accounting operations",
      responsibilities: [
        "Financial Planning",
        "Budget Management",
        "Accounting Operations",
        "Revenue Collection",
        "Financial Reporting"
      ]
    },
    {
      id: "DEPT-004",
      name: "Human Resources",
      code: "HR",
      division: "Administration",
      headOfDepartment: "Mrs. Grace Williams",
      email: "hr@npa.gov.ng",
      phone: "+234-1-234-5681",
      location: "Lagos Headquarters",
      establishedDate: "1960-01-01",
      status: "Active",
      employeeCount: 189,
      budget: "₦4.8B",
      description: "Manages human resources, recruitment, and employee relations",
      responsibilities: [
        "Recruitment & Selection",
        "Employee Relations",
        "Training & Development",
        "Performance Management",
        "Compensation & Benefits"
      ]
    },
    {
      id: "DEPT-005",
      name: "Safety & Security",
      code: "SAFETY",
      division: "Operations",
      headOfDepartment: "Mr. Michael Chen",
      email: "safety@npa.gov.ng",
      phone: "+234-1-234-5682",
      location: "Lagos Port Complex",
      establishedDate: "2010-06-01",
      status: "Active",
      employeeCount: 345,
      budget: "₦2.8B",
      description: "Ensures port safety, security, and compliance with regulations",
      responsibilities: [
        "Port Security",
        "Safety Compliance",
        "Emergency Response",
        "Risk Management",
        "Regulatory Compliance"
      ]
    }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "suspended", label: "Suspended" }
  ];

  const filteredDepartments = departments.filter(dept => {
    const matchesSearch = dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dept.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dept.headOfDepartment.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || dept.status.toLowerCase() === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Department Management</h1>
          <p className="text-gray-600">Manage organizational departments and their configurations</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/admin/departments/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Department
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <BarChart3 className="w-4 h-4 mr-2" />
            Department Analytics
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Departments</p>
              <p className="text-2xl font-bold text-gray-900">15</p>
            </div>
            <Building className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Departments</p>
              <p className="text-2xl font-bold text-gray-900">14</p>
            </div>
            <Users className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">2,471</p>
            </div>
            <UserPlus className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900">₦31.8B</p>
            </div>
            <FileText className="h-8 w-8 text-yellow-600" />
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
                placeholder="Search departments by name, code, or head of department..."
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
        {filteredDepartments.map((dept) => (
          <div key={dept.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Building className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{dept.name}</h3>
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    {dept.code}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{dept.description}</p>
                <div className="text-sm text-gray-500 space-y-1">
                  <p><span className="font-medium">Division:</span> {dept.division}</p>
                  <p><span className="font-medium">Established:</span> {dept.establishedDate}</p>
                  <p><span className="font-medium">Status:</span> 
                    <span className={`ml-1 px-2 py-1 text-xs font-medium rounded-full ${
                      dept.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {dept.status}
                    </span>
                  </p>
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
                  <p className="text-sm font-medium text-gray-900">Head of Department</p>
                  <p className="text-sm text-gray-600">{dept.headOfDepartment}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Employee Count</p>
                  <p className="text-sm text-gray-600">{dept.employeeCount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Budget</p>
                  <p className="text-sm text-gray-600">{dept.budget}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Location</p>
                  <p className="text-sm text-gray-600">{dept.location}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-1" />
                  {dept.email}
                </div>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-1" />
                  {dept.phone}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Key Responsibilities:</p>
                <div className="flex flex-wrap gap-2">
                  {dept.responsibilities.slice(0, 3).map((responsibility, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                      {responsibility}
                    </span>
                  ))}
                  {dept.responsibilities.length > 3 && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                      +{dept.responsibilities.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Department Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Department Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/admin/departments/create"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Create Department</h3>
            <p className="text-xs text-gray-500">Add new department</p>
          </Link>
          <Link
            href="/admin/departments/hierarchy"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Building className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Organizational Chart</h3>
            <p className="text-xs text-gray-500">View department hierarchy</p>
          </Link>
          <Link
            href="/admin/departments/budget"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Budget Allocation</h3>
            <p className="text-xs text-gray-500">Manage department budgets</p>
          </Link>
          <Link
            href="/admin/departments/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Department Reports</h3>
            <p className="text-xs text-gray-500">View analytics and reports</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
