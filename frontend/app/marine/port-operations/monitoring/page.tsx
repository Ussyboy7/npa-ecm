"use client";

import { useState } from "react";
import {
  Ship,
  Anchor,
  Waves,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  Settings,
  Calendar,
  Activity,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Clock,
  Target,
  DollarSign,
  FileText,
  MapPin,
  Users,
  Package,
  Shield,
  Globe,
  Zap,
  Wind,
  Thermometer,
  Gauge,
  Navigation,
  Radio,
  Camera
} from "lucide-react";
import Link from "next/link";

export default function PortOperationsMonitoringPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeRange, setTimeRange] = useState("24h");

  const portStats = [
    {
      name: "Active Vessels",
      value: "24",
      change: "+3",
      changeType: "positive",
      icon: Ship,
      description: "Currently in port",
      status: "Normal"
    },
    {
      name: "Cargo Throughput",
      value: "2,847 TEU",
      change: "+12.5%",
      changeType: "positive",
      icon: Package,
      description: "Today's volume",
      status: "High"
    },
    {
      name: "Berth Utilization",
      value: "78%",
      change: "+5.2%",
      changeType: "warning",
      icon: Anchor,
      description: "Current capacity",
      status: "Busy"
    },
    {
      name: "Average Wait Time",
      value: "4.2h",
      change: "-0.8h",
      changeType: "positive",
      icon: Clock,
      description: "Vessel waiting time",
      status: "Good"
    }
  ];

  const vessels = [
    {
      id: "VSL-001",
      name: "MV Lagos Express",
      type: "Container Ship",
      flag: "Nigeria",
      imo: "9876543",
      length: "280m",
      beam: "40m",
      draft: "12.5m",
      status: "At Berth",
      berth: "Berth 3",
      arrival: "2024-12-10 08:30",
      departure: "2024-12-10 18:00",
      cargo: "1,247 TEU",
      agent: "Nigerian Shipping Lines",
      captain: "Capt. John Okonkwo",
      eta: "On Time",
      operations: {
        loading: 65,
        unloading: 80,
        customs: "Cleared",
        pilotage: "Completed"
      },
      weather: {
        wind: "12 knots",
        sea: "Calm",
        visibility: "Good"
      }
    },
    {
      id: "VSL-002",
      name: "MV Port Harcourt",
      type: "Bulk Carrier",
      flag: "Liberia",
      imo: "8765432",
      length: "225m",
      beam: "32m",
      draft: "14.2m",
      status: "Anchored",
      berth: "Anchorage A",
      arrival: "2024-12-10 06:15",
      departure: "2024-12-11 12:00",
      cargo: "45,000 MT Coal",
      agent: "West African Shipping",
      captain: "Capt. Maria Santos",
      eta: "Delayed 2h",
      operations: {
        loading: 0,
        unloading: 0,
        customs: "Pending",
        pilotage: "Scheduled"
      },
      weather: {
        wind: "15 knots",
        sea: "Moderate",
        visibility: "Good"
      }
    },
    {
      id: "VSL-003",
      name: "MV Abuja Star",
      type: "General Cargo",
      flag: "Nigeria",
      imo: "7654321",
      length: "180m",
      beam: "28m",
      draft: "9.8m",
      status: "Departing",
      berth: "Berth 1",
      arrival: "2024-12-09 14:20",
      departure: "2024-12-10 16:30",
      cargo: "850 MT General",
      agent: "Nigerian Ports Authority",
      captain: "Capt. Ahmed Hassan",
      eta: "On Time",
      operations: {
        loading: 100,
        unloading: 100,
        customs: "Cleared",
        pilotage: "In Progress"
      },
      weather: {
        wind: "8 knots",
        sea: "Calm",
        visibility: "Excellent"
      }
    },
    {
      id: "VSL-004",
      name: "MV Calabar",
      type: "Tanker",
      flag: "Panama",
      imo: "6543210",
      length: "320m",
      beam: "50m",
      draft: "16.8m",
      status: "Approaching",
      berth: "Tanker Berth 2",
      arrival: "2024-12-10 10:45",
      departure: "2024-12-11 08:00",
      cargo: "120,000 MT Crude Oil",
      agent: "International Tanker Co.",
      captain: "Capt. Robert Johnson",
      eta: "On Time",
      operations: {
        loading: 0,
        unloading: 0,
        customs: "Pre-cleared",
        pilotage: "Assigned"
      },
      weather: {
        wind: "10 knots",
        sea: "Calm",
        visibility: "Good"
      }
    }
  ];

  const berths = [
    {
      id: "BRT-001",
      name: "Berth 1",
      type: "General Cargo",
      length: "200m",
      depth: "12m",
      status: "Occupied",
      vessel: "MV Abuja Star",
      utilization: 100,
      nextAvailable: "2024-12-10 16:30",
      equipment: ["Crane 1", "Crane 2", "Forklift 3"],
      services: ["Power", "Water", "Communications"]
    },
    {
      id: "BRT-002",
      name: "Berth 2",
      type: "Container",
      length: "300m",
      depth: "14m",
      status: "Available",
      vessel: null,
      utilization: 0,
      nextAvailable: "Available",
      equipment: ["Gantry Crane 1", "Gantry Crane 2", "Reach Stacker"],
      services: ["Power", "Water", "Communications", "Internet"]
    },
    {
      id: "BRT-003",
      name: "Berth 3",
      type: "Container",
      length: "300m",
      depth: "14m",
      status: "Occupied",
      vessel: "MV Lagos Express",
      utilization: 85,
      nextAvailable: "2024-12-10 18:00",
      equipment: ["Gantry Crane 3", "Gantry Crane 4", "Reach Stacker"],
      services: ["Power", "Water", "Communications", "Internet"]
    },
    {
      id: "BRT-004",
      name: "Tanker Berth 1",
      type: "Tanker",
      length: "350m",
      depth: "18m",
      status: "Available",
      vessel: null,
      utilization: 0,
      nextAvailable: "Available",
      equipment: ["Loading Arms", "Fire System", "Emergency Response"],
      services: ["Power", "Water", "Communications", "Safety"]
    },
    {
      id: "BRT-005",
      name: "Tanker Berth 2",
      type: "Tanker",
      length: "350m",
      depth: "18m",
      status: "Reserved",
      vessel: "MV Calabar",
      utilization: 0,
      nextAvailable: "2024-12-10 10:45",
      equipment: ["Loading Arms", "Fire System", "Emergency Response"],
      services: ["Power", "Water", "Communications", "Safety"]
    }
  ];

  const cargoOperations = [
    {
      id: "CGO-001",
      vessel: "MV Lagos Express",
      operation: "Container Unloading",
      type: "Import",
      quantity: "1,247 TEU",
      progress: 80,
      startTime: "2024-12-10 09:00",
      estimatedCompletion: "2024-12-10 17:00",
      status: "In Progress",
      equipment: ["Gantry Crane 3", "Gantry Crane 4"],
      workforce: 24
    },
    {
      id: "CGO-002",
      vessel: "MV Abuja Star",
      operation: "General Cargo Loading",
      type: "Export",
      quantity: "850 MT",
      progress: 100,
      startTime: "2024-12-09 15:00",
      estimatedCompletion: "2024-12-10 16:00",
      status: "Completed",
      equipment: ["Crane 1", "Crane 2"],
      workforce: 18
    },
    {
      id: "CGO-003",
      vessel: "MV Calabar",
      operation: "Crude Oil Loading",
      type: "Export",
      quantity: "120,000 MT",
      progress: 0,
      startTime: "2024-12-10 11:00",
      estimatedCompletion: "2024-12-11 07:00",
      status: "Scheduled",
      equipment: ["Loading Arms", "Pump System"],
      workforce: 12
    }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "at_berth", label: "At Berth" },
    { value: "anchored", label: "Anchored" },
    { value: "approaching", label: "Approaching" },
    { value: "departing", label: "Departing" }
  ];

  const timeRanges = [
    { value: "1h", label: "Last Hour" },
    { value: "24h", label: "Last 24 Hours" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" }
  ];

  const filteredVessels = vessels.filter(vessel => {
    const matchesSearch = vessel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vessel.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vessel.agent.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         vessel.status.toLowerCase().replace(" ", "_") === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusColorMap = {
    'At Berth': 'bg-green-100 text-green-800',
    'Anchored': 'bg-yellow-100 text-yellow-800',
    'Approaching': 'bg-blue-100 text-blue-800',
    'Departing': 'bg-purple-100 text-purple-800'
  };

  const berthStatusColorMap = {
    'Occupied': 'bg-red-100 text-red-800',
    'Available': 'bg-green-100 text-green-800',
    'Reserved': 'bg-yellow-100 text-yellow-800',
    'Maintenance': 'bg-gray-100 text-gray-800'
  };

  const operationStatusColorMap = {
    'In Progress': 'bg-blue-100 text-blue-800',
    'Completed': 'bg-green-100 text-green-800',
    'Scheduled': 'bg-yellow-100 text-yellow-800',
    'Delayed': 'bg-red-100 text-red-800'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Port Operations Monitoring</h1>
          <p className="text-gray-600">Real-time monitoring of port operations and vessel traffic</p>
        </div>
        <div className="flex space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {timeRanges.map(range => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </button>
        </div>
      </div>

      {/* Port Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {portStats.map((stat) => (
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
                stat.status === 'Normal' ? 'bg-green-100 text-green-800' :
                stat.status === 'High' ? 'bg-blue-100 text-blue-800' :
                stat.status === 'Busy' ? 'bg-yellow-100 text-yellow-800' :
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
                placeholder="Search vessels by name, type, or agent..."
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vessels */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Vessel Traffic</h2>
            <Link
              href="/marine/port-operations/vessels"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all vessels
            </Link>
          </div>
          <div className="space-y-4">
            {filteredVessels.map((vessel) => (
              <div key={vessel.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{vessel.name}</h4>
                    <p className="text-xs text-gray-500">{vessel.type} | {vessel.flag} | IMO: {vessel.imo}</p>
                    <p className="text-xs text-gray-500">Agent: {vessel.agent}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[vessel.status as keyof typeof statusColorMap]}`}>
                    {vessel.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-500">Dimensions</p>
                    <p className="text-xs text-gray-900">{vessel.length} x {vessel.beam} x {vessel.draft}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Cargo</p>
                    <p className="text-xs text-gray-900">{vessel.cargo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Berth</p>
                    <p className="text-xs text-gray-900">{vessel.berth}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">ETA</p>
                    <p className="text-xs text-gray-900">{vessel.eta}</p>
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>Arrival: {vessel.arrival}</p>
                  <p>Departure: {vessel.departure}</p>
                  <p>Captain: {vessel.captain}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Berths */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Berth Status</h2>
            <Link
              href="/marine/port-operations/berths"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all berths
            </Link>
          </div>
          <div className="space-y-4">
            {berths.map((berth) => (
              <div key={berth.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{berth.name}</h4>
                    <p className="text-xs text-gray-500">{berth.type} | {berth.length} x {berth.depth}</p>
                    {berth.vessel && (
                      <p className="text-xs text-gray-500">Vessel: {berth.vessel}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${berthStatusColorMap[berth.status as keyof typeof berthStatusColorMap]}`}>
                    {berth.status}
                  </span>
                </div>
                
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>Utilization</span>
                    <span>{berth.utilization}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        berth.utilization >= 90 ? 'bg-red-600' :
                        berth.utilization >= 70 ? 'bg-yellow-600' : 'bg-green-600'
                      }`}
                      style={{ width: `${berth.utilization}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>Next Available: {berth.nextAvailable}</p>
                  <p>Equipment: {berth.equipment.join(", ")}</p>
                  <p>Services: {berth.services.join(", ")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cargo Operations */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Cargo Operations</h2>
          <Link
            href="/marine/port-operations/cargo"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all operations
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cargoOperations.map((operation) => (
            <div key={operation.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{operation.operation}</h4>
                  <p className="text-xs text-gray-500">{operation.vessel}</p>
                  <p className="text-xs text-gray-500">{operation.type} | {operation.quantity}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${operationStatusColorMap[operation.status as keyof typeof operationStatusColorMap]}`}>
                  {operation.status}
                </span>
              </div>
              
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>Progress</span>
                  <span>{operation.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      operation.progress >= 90 ? 'bg-green-600' :
                      operation.progress >= 50 ? 'bg-blue-600' : 'bg-yellow-600'
                    }`}
                    style={{ width: `${operation.progress}%` }}
                  ></div>
                </div>
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <p>Start: {operation.startTime}</p>
                <p>Completion: {operation.estimatedCompletion}</p>
                <p>Equipment: {operation.equipment.join(", ")}</p>
                <p>Workforce: {operation.workforce} people</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Port Operations Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/marine/port-operations/vessels"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Ship className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Vessel Management</h3>
            <p className="text-xs text-gray-500">Manage vessels</p>
          </Link>
          <Link
            href="/marine/port-operations/berths"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Anchor className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Berth Management</h3>
            <p className="text-xs text-gray-500">Manage berths</p>
          </Link>
          <Link
            href="/marine/port-operations/cargo"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Package className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Cargo Operations</h3>
            <p className="text-xs text-gray-500">Manage cargo</p>
          </Link>
          <Link
            href="/marine/port-operations/analytics"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Operations Analytics</h3>
            <p className="text-xs text-gray-500">View analytics</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
