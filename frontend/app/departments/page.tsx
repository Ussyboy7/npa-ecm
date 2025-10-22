"use client";

import { useState } from "react";
import {
  Building,
  Users,
  FileText,
  Search,
  Filter,
  Eye,
  Settings,
  UserCheck,
  Calendar,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { NPA_DEPARTMENTS } from "@/lib/npa-structure";

export default function DepartmentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  // Mock department data with detailed information
  const departmentDetails = {
    "Finance & Accounts": {
      head: "John Adebayo (GM Finance)",
      staffCount: 45,
      activeProjects: 8,
      pendingApprovals: 12,
      recentActivity: "Q4 Budget Review",
      budget: "₦2.4B",
      documents: 1247,
      description: "Manages all financial operations, budgeting, accounting, and financial reporting for NPA operations."
    },
    "Commercial Services": {
      head: "Sarah Okafor (GM Commercial)",
      staffCount: 38,
      activeProjects: 15,
      pendingApprovals: 8,
      recentActivity: "Terminal Lease Agreements",
      budget: "₦1.8B",
      documents: 892,
      description: "Handles commercial operations, customer relations, tariff management, and business development."
    },
    "Technical Services": {
      head: "Michael Johnson (GM Technical)",
      staffCount: 67,
      activeProjects: 23,
      pendingApprovals: 15,
      recentActivity: "Infrastructure Upgrade",
      budget: "₦3.2B",
      documents: 2156,
      description: "Responsible for technical operations, maintenance, engineering, and infrastructure development."
    },
    "Security": {
      head: "David Wilson (GM Security)",
      staffCount: 89,
      activeProjects: 6,
      pendingApprovals: 5,
      recentActivity: "Security System Upgrade",
      budget: "₦950M",
      documents: 678,
      description: "Manages port security, access control, surveillance, and emergency response operations."
    },
    "Human Resources": {
      head: "Grace Nwosu (GM HR)",
      staffCount: 32,
      activeProjects: 12,
      pendingApprovals: 18,
      recentActivity: "Staff Training Program",
      budget: "₦420M",
      documents: 445,
      description: "Handles human resources management, staff development, recruitment, and employee relations."
    },
    "Planning & Development": {
      head: "Robert Okafor (GM Planning)",
      staffCount: 28,
      activeProjects: 19,
      pendingApprovals: 22,
      recentActivity: "Master Plan Update",
      budget: "₦1.1B",
      documents: 734,
      description: "Responsible for strategic planning, development projects, and long-term port infrastructure planning."
    },
    "Legal Services": {
      head: "Amaka Eze (GM Legal)",
      staffCount: 18,
      activeProjects: 7,
      pendingApprovals: 9,
      recentActivity: "Contract Reviews",
      budget: "₦280M",
      documents: 523,
      description: "Provides legal counsel, contract management, and regulatory compliance support."
    },
    "Information Technology": {
      head: "Emeka Nwosu (GM IT)",
      staffCount: 35,
      activeProjects: 11,
      pendingApprovals: 6,
      recentActivity: "Digital Transformation",
      budget: "₦680M",
      documents: 389,
      description: "Manages IT infrastructure, systems development, cybersecurity, and digital services."
    },
    "Audit & Compliance": {
      head: "Ngozi Adebayo (GM Audit)",
      staffCount: 22,
      activeProjects: 5,
      pendingApprovals: 7,
      recentActivity: "Annual Audit",
      budget: "₦350M",
      documents: 298,
      description: "Conducts internal audits, ensures compliance, and monitors regulatory requirements."
    },
    "Corporate Services": {
      head: "Ifeanyi Okoro (GM Corporate)",
      staffCount: 41,
      activeProjects: 9,
      pendingApprovals: 11,
      recentActivity: "Corporate Communications",
      budget: "₦520M",
      documents: 567,
      description: "Manages corporate communications, stakeholder relations, and administrative services."
    }
  };

  const filteredDepartments = Object.keys(NPA_DEPARTMENTS).filter(dept =>
    dept.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedDeptDetails = selectedDepartment ? departmentDetails[selectedDepartment as keyof typeof departmentDetails] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
          <p className="text-gray-600">Overview of all NPA departments and their activities</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
            {Object.keys(NPA_DEPARTMENTS).length} Departments
          </div>
          <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
            {Object.values(departmentDetails).reduce((sum, dept) => sum + dept.staffCount, 0)} Staff Members
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
            <Filter className="w-4 h-4 inline mr-2" />
            Filter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Departments List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                NPA Departments ({filteredDepartments.length})
              </h2>
            </div>

            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {filteredDepartments.map((dept) => {
                const details = departmentDetails[dept as keyof typeof departmentDetails];
                return (
                  <div
                    key={dept}
                    className={`p-4 hover:bg-gray-50 cursor-pointer ${
                      selectedDepartment === dept ? "bg-blue-50 border-r-2 border-blue-500" : ""
                    }`}
                    onClick={() => setSelectedDepartment(dept)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Building className="w-5 h-5 text-blue-600" />
                        <div>
                          <h3 className="font-medium text-gray-900">{dept}</h3>
                          <p className="text-sm text-gray-600">
                            {details?.head || "Department Head"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {details?.staffCount || 0} staff
                        </div>
                        <div className="text-xs text-gray-500">
                          {details?.activeProjects || 0} active projects
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Department Details */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border sticky top-6">
            {selectedDeptDetails ? (
              <>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedDepartment}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Department Overview
                  </p>
                </div>

                <div className="p-6 space-y-4">
                  {/* Department Head */}
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <UserCheck className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Department Head</p>
                      <p className="text-sm text-gray-600">{selectedDeptDetails.head}</p>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <Users className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-blue-900">{selectedDeptDetails.staffCount}</p>
                      <p className="text-xs text-blue-700">Staff</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <FileText className="w-6 h-6 text-green-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-green-900">{selectedDeptDetails.documents}</p>
                      <p className="text-xs text-green-700">Documents</p>
                    </div>
                  </div>

                  {/* Activity Stats */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Active Projects</span>
                      <span className="text-sm font-medium text-gray-900">{selectedDeptDetails.activeProjects}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Pending Approvals</span>
                      <span className="text-sm font-medium text-gray-900">{selectedDeptDetails.pendingApprovals}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Budget</span>
                      <span className="text-sm font-medium text-gray-900">{selectedDeptDetails.budget}</span>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <Calendar className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-900">Recent Activity</span>
                    </div>
                    <p className="text-sm text-yellow-800">{selectedDeptDetails.recentActivity}</p>
                  </div>

                  {/* Description */}
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-sm text-gray-600">{selectedDeptDetails.description}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2 pt-2">
                    <button className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                      <Eye className="w-4 h-4 inline mr-1" />
                      View Details
                    </button>
                    <button className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center">
                <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Department</h3>
                <p className="text-gray-600">
                  Click on a department from the list to view detailed information
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
