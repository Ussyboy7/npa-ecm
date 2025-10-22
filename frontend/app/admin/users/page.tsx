"use client";

import { useState } from "react";
import { UserPlus, Search, Edit, Trash2, Shield, Mail } from "lucide-react";
import { NPA_DEPARTMENTS, NPA_ROLES } from "@/lib/npa-structure";

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Sample users with real NPA departments and roles
  const users = [
    { id: 1, name: "Managing Director", email: "md@npa.gov.ng", role: "MD", department: "Headquarters", status: "active", lastLogin: "2024-12-16" },
    { id: 2, name: "GM, ICT", email: "gm.ict@npa.gov.ng", role: "GM", department: "Information & Communication Technology", status: "active", lastLogin: "2024-12-16" },
    { id: 3, name: "AGM, Software", email: "agm.software@npa.gov.ng", role: "AGM", department: "Software Applications & Database Management", status: "active", lastLogin: "2024-12-15" },
    { id: 4, name: "GM, Human Resources", email: "gm.hr@npa.gov.ng", role: "GM", department: "Human Resources", status: "active", lastLogin: "2024-12-14" },
    { id: 5, name: "GM, Finance", email: "gm.finance@npa.gov.ng", role: "GM", department: "Finance", status: "active", lastLogin: "2024-12-15" },
    { id: 6, name: "Port Manager, LPC", email: "pm.lpc@npa.gov.ng", role: "PM", department: "Port Operations", status: "active", lastLogin: "2024-12-16" },
    { id: 7, name: "AGM, Marine Operations", email: "agm.marine@npa.gov.ng", role: "AGM", department: "Marine Operations", status: "active", lastLogin: "2024-12-15" },
    { id: 8, name: "GM, Security", email: "gm.security@npa.gov.ng", role: "GM", department: "Security", status: "active", lastLogin: "2024-12-16" },
    { id: 9, name: "AGM, Legal", email: "agm.legal@npa.gov.ng", role: "AGM", department: "Legal Services", status: "active", lastLogin: "2024-12-14" },
    { id: 10, name: "GM, Audit", email: "gm.audit@npa.gov.ng", role: "GM", department: "Audit", status: "active", lastLogin: "2024-12-16" },
  ];

  const roleColors = {
    MD: "bg-purple-100 text-purple-800",
    ED: "bg-red-100 text-red-800", 
    GM: "bg-blue-100 text-blue-800",
    AGM: "bg-green-100 text-green-800",
    PM: "bg-yellow-100 text-yellow-800",
    PRINCIPAL: "bg-indigo-100 text-indigo-800",
    SENIOR: "bg-pink-100 text-pink-800",
    MANAGER: "bg-cyan-100 text-cyan-800",
    OFFICER: "bg-orange-100 text-orange-800",
    STAFF: "bg-gray-100 text-gray-800"
  };

  const statusColors = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-800"
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage user accounts and permissions</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">All Roles</option>
            {NPA_ROLES.map((role) => (
              <option key={role.code} value={role.code}>
                {role.name}
              </option>
            ))}
          </select>
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail className="w-3 h-3 mr-1" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleColors[user.role as keyof typeof roleColors]}`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[user.status as keyof typeof statusColors]}`}>
                      {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.lastLogin).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: '2-digit', 
                      day: '2-digit' 
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Shield className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-sm text-gray-600">Total Users</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">125</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-sm text-gray-600">Active Users</p>
          <p className="text-2xl font-bold text-green-600 mt-1">118</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-sm text-gray-600">Administrators</p>
          <p className="text-2xl font-bold text-red-600 mt-1">8</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-sm text-gray-600">New This Month</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">12</p>
        </div>
      </div>
    </div>
  );
}
