"use client";

import { useState } from "react";
import {
  Ship,
  Anchor,
  Compass,
  MapPin,
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
  Clock,
  AlertTriangle,
  CheckCircle,
  Minus,
  FileText,
  Building,
  Users,
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
  Target,
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
  Map
} from "lucide-react";
import Link from "next/link";

export default function MarineVesselsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const vesselStats = [
    {
      name: "Total Vessels",
      value: "127",
      change: "+8",
      changeType: "positive",
      icon: Ship,
      description: "Currently in port",
      status: "Active"
    },
    {
      name: "At Berth",
      value: "89",
      change: "+12",
      changeType: "positive",
      icon: Anchor,
      description: "Docked vessels",
      status: "Docked"
    },
    {
      name: "In Transit",
      value: "23",
      change: "-3",
      changeType: "negative",
      icon: Navigation,
      description: "Moving vessels",
      status: "Moving"
    },
    {
      name: "Waiting",
      value: "15",
      change: "-1",
      changeType: "positive",
      icon: Clock,
      description: "Anchored waiting",
      status: "Waiting"
    }
  ];

  const vessels = [
    {
      id: "VSL-001",
      name: "MV NPA Lagos",
      type: "Container Ship",
      flag: "Nigeria",
      imo: "9876543",
      mmsi: "657123456",
      status: "At Berth",
      berth: "Berth 12",
      terminal: "Apapa Container Terminal",
      arrivalTime: "2024-12-10 08:30:00",
      departureTime: "2024-12-12 16:00:00",
      agent: "Nigerian Ports Authority",
      captain: "Capt. Adebayo Johnson",
      grossTonnage: 45000,
      deadweight: 52000,
      length: 280,
      beam: 32,
      draft: 12.5,
      maxSpeed: 22.5,
      currentSpeed: 0,
      cargo: {
        containers: 2847,
        teu: 2847,
        weight: 45000,
        type: "Mixed Container"
      },
      operations: {
        loading: true,
        unloading: true,
        bunkering: false,
        provisioning: true,
        maintenance: false
      },
      weather: {
        windSpeed: 15,
        windDirection: "NE",
        waveHeight: 1.2,
        visibility: 10,
        temperature: 28
      },
      position: {
        latitude: "6.4281°N",
        longitude: "3.4219°E",
        heading: 045,
        speed: 0
      },
      crew: {
        total: 24,
        officers: 8,
        ratings: 16,
        nationalities: ["Nigeria", "Ghana", "Cameroon"]
      },
      documents: {
        portClearance: "Valid",
        customsDeclaration: "Valid",
        healthCertificate: "Valid",
        cargoManifest: "Valid"
      },
      services: [
        "Pilotage",
        "Tug Assistance",
        "Mooring",
        "Stevedoring",
        "Customs Clearance"
      ],
      nextPort: "Port of Cotonou",
      etaNextPort: "2024-12-14 10:00:00",
      lastInspection: "2024-12-08",
      inspectionResult: "Passed",
      remarks: "Regular container vessel with good safety record"
    },
    {
      id: "VSL-002",
      name: "MV Atlantic Star",
      type: "Bulk Carrier",
      flag: "Liberia",
      imo: "8765432",
      mmsi: "636123456",
      status: "In Transit",
      berth: "N/A",
      terminal: "N/A",
      arrivalTime: "2024-12-11 14:00:00",
      departureTime: "N/A",
      agent: "Atlantic Shipping Ltd",
      captain: "Capt. Michael Smith",
      grossTonnage: 85000,
      deadweight: 95000,
      length: 320,
      beam: 45,
      draft: 18.2,
      maxSpeed: 18.5,
      currentSpeed: 16.2,
      cargo: {
        containers: 0,
        teu: 0,
        weight: 85000,
        type: "Iron Ore"
      },
      operations: {
        loading: false,
        unloading: false,
        bunkering: false,
        provisioning: false,
        maintenance: false
      },
      weather: {
        windSpeed: 22,
        windDirection: "SW",
        waveHeight: 2.8,
        visibility: 8,
        temperature: 26
      },
      position: {
        latitude: "6.2150°N",
        longitude: "3.1850°E",
        heading: 180,
        speed: 16.2
      },
      crew: {
        total: 28,
        officers: 10,
        ratings: 18,
        nationalities: ["Liberia", "Nigeria", "Ghana", "Philippines"]
      },
      documents: {
        portClearance: "Valid",
        customsDeclaration: "Valid",
        healthCertificate: "Valid",
        cargoManifest: "Valid"
      },
      services: [
        "Pilotage",
        "Tug Assistance",
        "Mooring",
        "Stevedoring"
      ],
      nextPort: "Port of Lagos",
      etaNextPort: "2024-12-11 14:00:00",
      lastInspection: "2024-12-05",
      inspectionResult: "Passed",
      remarks: "Large bulk carrier with iron ore cargo"
    },
    {
      id: "VSL-003",
      name: "MV Port Express",
      type: "General Cargo",
      flag: "Nigeria",
      imo: "7654321",
      mmsi: "657123457",
      status: "At Berth",
      berth: "Berth 8",
      terminal: "Tin Can Island Port",
      arrivalTime: "2024-12-09 12:15:00",
      departureTime: "2024-12-11 08:00:00",
      agent: "Port Express Shipping",
      captain: "Capt. Funmi Adebayo",
      grossTonnage: 12000,
      deadweight: 15000,
      length: 180,
      beam: 28,
      draft: 8.5,
      maxSpeed: 16.0,
      currentSpeed: 0,
      cargo: {
        containers: 0,
        teu: 0,
        weight: 12000,
        type: "General Cargo"
      },
      operations: {
        loading: true,
        unloading: false,
        bunkering: true,
        provisioning: false,
        maintenance: false
      },
      weather: {
        windSpeed: 12,
        windDirection: "E",
        waveHeight: 0.8,
        visibility: 12,
        temperature: 30
      },
      position: {
        latitude: "6.4281°N",
        longitude: "3.4219°E",
        heading: 090,
        speed: 0
      },
      crew: {
        total: 18,
        officers: 6,
        ratings: 12,
        nationalities: ["Nigeria", "Ghana"]
      },
      documents: {
        portClearance: "Valid",
        customsDeclaration: "Valid",
        healthCertificate: "Valid",
        cargoManifest: "Valid"
      },
      services: [
        "Pilotage",
        "Tug Assistance",
        "Mooring",
        "Stevedoring",
        "Bunkering"
      ],
      nextPort: "Port of Douala",
      etaNextPort: "2024-12-13 06:00:00",
      lastInspection: "2024-12-07",
      inspectionResult: "Passed",
      remarks: "Coastal vessel with general cargo operations"
    },
    {
      id: "VSL-004",
      name: "MV Oil Pioneer",
      type: "Tanker",
      flag: "Marshall Islands",
      imo: "6543210",
      mmsi: "538123456",
      status: "Waiting",
      berth: "N/A",
      terminal: "N/A",
      arrivalTime: "2024-12-10 20:00:00",
      departureTime: "N/A",
      agent: "Oil Pioneer Shipping",
      captain: "Capt. Robert Wilson",
      grossTonnage: 150000,
      deadweight: 180000,
      length: 380,
      beam: 55,
      draft: 22.5,
      maxSpeed: 20.0,
      currentSpeed: 0,
      cargo: {
        containers: 0,
        teu: 0,
        weight: 150000,
        type: "Crude Oil"
      },
      operations: {
        loading: false,
        unloading: false,
        bunkering: false,
        provisioning: false,
        maintenance: false
      },
      weather: {
        windSpeed: 18,
        windDirection: "NW",
        waveHeight: 1.5,
        visibility: 9,
        temperature: 27
      },
      position: {
        latitude: "6.3500°N",
        longitude: "3.3500°E",
        heading: 000,
        speed: 0
      },
      crew: {
        total: 32,
        officers: 12,
        ratings: 20,
        nationalities: ["Marshall Islands", "Philippines", "Nigeria", "India"]
      },
      documents: {
        portClearance: "Valid",
        customsDeclaration: "Valid",
        healthCertificate: "Valid",
        cargoManifest: "Valid"
      },
      services: [
        "Pilotage",
        "Tug Assistance",
        "Mooring",
        "Oil Terminal Services"
      ],
      nextPort: "Port of Lagos",
      etaNextPort: "2024-12-10 20:00:00",
      lastInspection: "2024-12-06",
      inspectionResult: "Passed",
      remarks: "Large crude oil tanker waiting for berth assignment"
    },
    {
      id: "VSL-005",
      name: "MV Coastal Trader",
      type: "Ro-Ro Vessel",
      flag: "Nigeria",
      imo: "5432109",
      mmsi: "657123458",
      status: "At Berth",
      berth: "Berth 15",
      terminal: "Lagos Port Complex",
      arrivalTime: "2024-12-10 06:45:00",
      departureTime: "2024-12-11 18:30:00",
      agent: "Coastal Trading Co",
      captain: "Capt. Ibrahim Musa",
      grossTonnage: 8500,
      deadweight: 12000,
      length: 160,
      beam: 25,
      draft: 6.8,
      maxSpeed: 18.5,
      currentSpeed: 0,
      cargo: {
        containers: 0,
        teu: 0,
        weight: 8500,
        type: "Roll-on/Roll-off"
      },
      operations: {
        loading: true,
        unloading: true,
        bunkering: false,
        provisioning: true,
        maintenance: false
      },
      weather: {
        windSpeed: 14,
        windDirection: "SE",
        waveHeight: 1.0,
        visibility: 11,
        temperature: 29
      },
      position: {
        latitude: "6.4281°N",
        longitude: "3.4219°E",
        heading: 135,
        speed: 0
      },
      crew: {
        total: 16,
        officers: 5,
        ratings: 11,
        nationalities: ["Nigeria", "Ghana"]
      },
      documents: {
        portClearance: "Valid",
        customsDeclaration: "Valid",
        healthCertificate: "Valid",
        cargoManifest: "Valid"
      },
      services: [
        "Pilotage",
        "Tug Assistance",
        "Mooring",
        "Stevedoring",
        "Vehicle Handling"
      ],
      nextPort: "Port of Cotonou",
      etaNextPort: "2024-12-12 12:00:00",
      lastInspection: "2024-12-08",
      inspectionResult: "Passed",
      remarks: "Ro-Ro vessel for vehicle and cargo transport"
    }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "at_berth", label: "At Berth" },
    { value: "in_transit", label: "In Transit" },
    { value: "waiting", label: "Waiting" },
    { value: "departed", label: "Departed" }
  ];

  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: "container_ship", label: "Container Ship" },
    { value: "bulk_carrier", label: "Bulk Carrier" },
    { value: "general_cargo", label: "General Cargo" },
    { value: "tanker", label: "Tanker" },
    { value: "ro_ro", label: "Ro-Ro Vessel" }
  ];

  const filteredVessels = vessels.filter(vessel => {
    const matchesSearch = vessel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vessel.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vessel.captain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vessel.agent.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         vessel.status.toLowerCase().replace(" ", "_") === statusFilter;
    const matchesType = typeFilter === "all" || 
                       vessel.type.toLowerCase().replace(" ", "_") === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const statusColorMap = {
    'At Berth': 'bg-green-100 text-green-800',
    'In Transit': 'bg-blue-100 text-blue-800',
    'Waiting': 'bg-yellow-100 text-yellow-800',
    'Departed': 'bg-gray-100 text-gray-800'
  };

  const typeColorMap = {
    'Container Ship': 'bg-blue-100 text-blue-800',
    'Bulk Carrier': 'bg-orange-100 text-orange-800',
    'General Cargo': 'bg-green-100 text-green-800',
    'Tanker': 'bg-red-100 text-red-800',
    'Ro-Ro Vessel': 'bg-purple-100 text-purple-800'
  };

  const operationColorMap = {
    'loading': 'bg-green-100 text-green-800',
    'unloading': 'bg-blue-100 text-blue-800',
    'bunkering': 'bg-yellow-100 text-yellow-800',
    'provisioning': 'bg-purple-100 text-purple-800',
    'maintenance': 'bg-red-100 text-red-800'
  };

  const documentColorMap = {
    'Valid': 'bg-green-100 text-green-800',
    'Expired': 'bg-red-100 text-red-800',
    'Pending': 'bg-yellow-100 text-yellow-800'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vessel Management</h1>
          <p className="text-gray-600">Monitor and manage vessels in port operations</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/marine/port-operations/vessels/register"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Register Vessel
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Vessel Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {vesselStats.map((stat) => (
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
                stat.status === 'Active' ? 'bg-green-100 text-green-800' :
                stat.status === 'Docked' ? 'bg-blue-100 text-blue-800' :
                stat.status === 'Moving' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
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
                placeholder="Search vessels by name, type, captain, or agent..."
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

      {/* Vessels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredVessels.map((vessel) => (
          <div key={vessel.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Ship className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{vessel.name}</h3>
                  <span className="text-sm text-gray-500">#{vessel.id}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{vessel.remarks}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[vessel.status as keyof typeof statusColorMap]}`}>
                    {vessel.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeColorMap[vessel.type as keyof typeof typeColorMap]}`}>
                    {vessel.type}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                    {vessel.flag}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg">
                  <Map className="w-4 h-4" />
                </button>
                <button className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg">
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Captain</p>
                  <p className="text-sm text-gray-600">{vessel.captain}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Agent</p>
                  <p className="text-sm text-gray-600">{vessel.agent}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">IMO</p>
                  <p className="text-sm text-gray-600">{vessel.imo}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">MMSI</p>
                  <p className="text-sm text-gray-600">{vessel.mmsi}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Gross Tonnage</p>
                  <p className="text-sm text-gray-600">{vessel.grossTonnage.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Length</p>
                  <p className="text-sm text-gray-600">{vessel.length}m</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Current Speed</p>
                  <p className="text-sm text-gray-600">{vessel.currentSpeed} knots</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Crew</p>
                  <p className="text-sm text-gray-600">{vessel.crew.total} members</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Current Operations:</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(vessel.operations).map(([operation, active]) => (
                    active && (
                      <span key={operation} className={`px-2 py-1 text-xs rounded-full ${operationColorMap[operation as keyof typeof operationColorMap]}`}>
                        {operation.charAt(0).toUpperCase() + operation.slice(1)}
                      </span>
                    )
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Cargo Information:</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Type</p>
                    <p className="text-gray-900">{vessel.cargo.type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Weight</p>
                    <p className="text-gray-900">{vessel.cargo.weight.toLocaleString()} MT</p>
                  </div>
                  {vessel.cargo.containers > 0 && (
                    <>
                      <div>
                        <p className="text-xs text-gray-500">Containers</p>
                        <p className="text-gray-900">{vessel.cargo.containers}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">TEU</p>
                        <p className="text-gray-900">{vessel.cargo.teu}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Position & Weather:</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Position</p>
                    <p className="text-gray-900">{vessel.position.latitude}, {vessel.position.longitude}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Wind</p>
                    <p className="text-gray-900">{vessel.weather.windSpeed} knots {vessel.weather.windDirection}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Wave Height</p>
                    <p className="text-gray-900">{vessel.weather.waveHeight}m</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Temperature</p>
                    <p className="text-gray-900">{vessel.weather.temperature}°C</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Documents Status:</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(vessel.documents).map(([doc, status]) => (
                    <div key={doc} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{doc.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className={`px-2 py-1 rounded-full ${documentColorMap[status as keyof typeof documentColorMap]}`}>
                        {status}
                      </span>
                    </div>
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
                    <Map className="w-3 h-3 mr-1" />
                    Track
                  </button>
                </div>
                <Link
                  href={`/marine/port-operations/vessels/${vessel.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Vessel Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Vessel Operations Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Anchor className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Vessels at Berth</h3>
                <p className="text-xs text-gray-500">Currently docked</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {vessels.filter(v => v.status === 'At Berth').length}</p>
              <p>Berth Utilization: 89%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Navigation className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Vessels in Transit</h3>
                <p className="text-xs text-gray-500">Moving vessels</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {vessels.filter(v => v.status === 'In Transit').length}</p>
              <p>Avg. Speed: 16.2 knots</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Waiting Vessels</h3>
                <p className="text-xs text-gray-500">Anchored waiting</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {vessels.filter(v => v.status === 'Waiting').length}</p>
              <p>Avg. Wait Time: 4.2 hours</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Ship className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Total Cargo</h3>
                <p className="text-xs text-gray-500">All vessels</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Weight: {vessels.reduce((sum, v) => sum + v.cargo.weight, 0).toLocaleString()} MT</p>
              <p>Containers: {vessels.reduce((sum, v) => sum + v.cargo.containers, 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Vessel Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/marine/port-operations/vessels/register"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Register Vessel</h3>
            <p className="text-xs text-gray-500">New vessel entry</p>
          </Link>
          <Link
            href="/marine/port-operations/vessels/tracking"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Map className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Vessel Tracking</h3>
            <p className="text-xs text-gray-500">Real-time tracking</p>
          </Link>
          <Link
            href="/marine/port-operations/vessels/operations"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Activity className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Operations</h3>
            <p className="text-xs text-gray-500">Manage operations</p>
          </Link>
          <Link
            href="/marine/port-operations/vessels/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Vessel Reports</h3>
            <p className="text-xs text-gray-500">Generate reports</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
