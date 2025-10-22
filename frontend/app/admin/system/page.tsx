"use client";

import { Server, Database, HardDrive, Cpu, Activity, RefreshCw, Settings } from "lucide-react";

export default function SystemAdminPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Administration</h1>
          <p className="text-gray-600">Monitor and manage system health and configuration</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Status
        </button>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">CPU Usage</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">45%</p>
            </div>
            <Cpu className="w-12 h-12 text-blue-600" />
          </div>
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{width: '45%'}}></div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Memory Usage</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">62%</p>
            </div>
            <Activity className="w-12 h-12 text-green-600" />
          </div>
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-600 h-2 rounded-full" style={{width: '62%'}}></div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Disk Usage</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">78%</p>
            </div>
            <HardDrive className="w-12 h-12 text-yellow-600" />
          </div>
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div className="bg-yellow-600 h-2 rounded-full" style={{width: '78%'}}></div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Database</p>
              <p className="text-2xl font-bold text-green-600 mt-1">Healthy</p>
            </div>
            <Database className="w-12 h-12 text-green-600" />
          </div>
          <p className="text-xs text-gray-500 mt-4">Last backup: 2 hours ago</p>
        </div>
      </div>

      {/* Services Status */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Server className="w-5 h-5 mr-2 text-blue-600" />
          Services Status
        </h2>
        <div className="space-y-3">
          {[
            { name: "Web Server", status: "running", uptime: "15 days" },
            { name: "Database Server", status: "running", uptime: "15 days" },
            { name: "Redis Cache", status: "running", uptime: "15 days" },
            { name: "Celery Worker", status: "running", uptime: "12 days" },
            { name: "Email Service", status: "running", uptime: "15 days" },
            { name: "OCR Service", status: "running", uptime: "10 days" },
          ].map((service, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-gray-900">{service.name}</p>
                  <p className="text-sm text-gray-500">Uptime: {service.uptime}</p>
                </div>
              </div>
              <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Database Stats */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Database className="w-5 h-5 mr-2 text-blue-600" />
          Database Statistics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Total Documents</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">12,458</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Total Users</p>
            <p className="text-2xl font-bold text-green-900 mt-1">125</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-600 font-medium">Active Workflows</p>
            <p className="text-2xl font-bold text-purple-900 mt-1">342</p>
          </div>
        </div>
      </div>

      {/* System Configuration */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2 text-blue-600" />
          System Configuration
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <p className="text-sm font-medium text-gray-700">Version</p>
            <p className="text-lg text-gray-900 mt-1">ECM v1.0.0</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <p className="text-sm font-medium text-gray-700">Environment</p>
            <p className="text-lg text-gray-900 mt-1">Production</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <p className="text-sm font-medium text-gray-700">File Storage</p>
            <p className="text-lg text-gray-900 mt-1">Local File System</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <p className="text-sm font-medium text-gray-700">OCR Language</p>
            <p className="text-lg text-gray-900 mt-1">English</p>
          </div>
        </div>
      </div>

      {/* Maintenance Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Backup Database
          </button>
          <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            Clear Cache
          </button>
          <button className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
            Run Maintenance
          </button>
        </div>
      </div>
    </div>
  );
}
