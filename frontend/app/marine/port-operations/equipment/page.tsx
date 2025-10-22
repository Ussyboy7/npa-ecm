"use client";

import { useState } from "react";
import {
  Wrench,
  Truck,
  Ship,
  Container,
  Scale,
  MapPin,
  Clock,
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
  Map,
  Settings,
  BarChart3,
  PieChart,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Calculator,
  PiggyBank,
  Receipt,
  CreditCard,
  Wallet,
  Banknote,
  Coins,
  Landmark,
  Scale as ScaleIcon,
  Trophy,
  Medal,
  Crown,
  Ruler,
  Compass,
  Crosshair,
  Anchor,
  Sailboat,
  Ship as ShipIcon,
  Warehouse,
  Factory,
  Train,
  Plane,
  Crane,
  Forklift,
  Truck as TruckIcon,
  Cog,
  Gear,
  Settings as SettingsIcon,
  Wrench as WrenchIcon,
  Hammer,
  Screwdriver
} from "lucide-react";
import Link from "next/link";

export default function MarineEquipmentPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const equipmentStats = [
    {
      name: "Total Equipment",
      value: "156",
      change: "+8",
      changeType: "positive",
      icon: Cog,
      description: "Active equipment units",
      status: "Operational"
    },
    {
      name: "Equipment Utilization",
      value: "78%",
      change: "+5%",
      changeType: "positive",
      icon: Gauge,
      description: "Average utilization rate",
      status: "Optimal"
    },
    {
      name: "Maintenance Due",
      value: "23",
      change: "-3",
      changeType: "positive",
      icon: Wrench,
      description: "Require maintenance",
      status: "Managed"
    },
    {
      name: "Equipment Availability",
      value: "92%",
      change: "+2%",
      changeType: "positive",
      icon: CheckCircle,
      description: "Operational availability",
      status: "Excellent"
    }
  ];

  const equipmentUnits = [
    {
      id: "EQUIP-001",
      name: "Container Crane #1",
      type: "Container Crane",
      model: "Liebherr STS 400",
      serialNumber: "LBH-STS-400-001",
      manufacturer: "Liebherr",
      status: "Operational",
      location: "Container Terminal A",
      capacity: "65 tons",
      yearOfManufacture: 2018,
      lastMaintenance: "2024-11-15",
      nextMaintenance: "2025-02-15",
      maintenanceInterval: "90 days",
      utilization: 85,
      availability: 96,
      currentJob: "Discharging MSC Isabella",
      operator: "John Adebayo",
      fuelLevel: "78%",
      engineHours: 24567,
      operatingHours: 18934,
      specifications: {
        liftHeight: "18 meters",
        outreach: "22 meters",
        speed: "150 m/min",
        power: "2.5 MW"
      },
      maintenance: {
        lastService: "2024-11-15",
        nextService: "2025-02-15",
        serviceType: "Major Service",
        technician: "Port Engineering Team",
        cost: 450000
      },
      performance: {
        movesPerHour: 28,
        downtimeHours: 156,
        efficiency: 89,
        reliability: 94
      },
      alerts: [],
      documents: {
        manual: true,
        certifications: true,
        insurance: true,
        permits: true
      },
      cost: {
        acquisition: 450000000,
        operatingCost: 8500000,
        maintenanceCost: 3200000,
        depreciation: 22500000
      },
      tags: ["crane", "container", "heavy-lift", "critical"]
    },
    {
      id: "EQUIP-002",
      name: "Reach Stacker #3",
      type: "Reach Stacker",
      model: "Kalmar DRF450-65S5X",
      serialNumber: "KAL-DRF-450-003",
      manufacturer: "Kalmar",
      status: "In Maintenance",
      location: "Equipment Workshop",
      capacity: "45 tons",
      yearOfManufacture: 2020,
      lastMaintenance: "2024-12-08",
      nextMaintenance: "2025-03-08",
      maintenanceInterval: "90 days",
      utilization: 0,
      availability: 0,
      currentJob: "Maintenance - Engine Overhaul",
      operator: "N/A",
      fuelLevel: "0%",
      engineHours: 12890,
      operatingHours: 9876,
      specifications: {
        liftHeight: "15 meters",
        outreach: "8 meters",
        speed: "25 km/h",
        power: "335 kW"
      },
      maintenance: {
        lastService: "2024-12-08",
        nextService: "2025-03-08",
        serviceType: "Engine Overhaul",
        technician: "Equipment Maintenance Team",
        cost: 1250000,
        estimatedCompletion: "2024-12-12",
        partsRequired: ["Engine Block", "Pistons", "Turbocharger"]
      },
      performance: {
        movesPerHour: 22,
        downtimeHours: 89,
        efficiency: 82,
        reliability: 91
      },
      alerts: [
        { type: "Maintenance", message: "Engine overhaul in progress", severity: "Info", date: "2024-12-08" }
      ],
      documents: {
        manual: true,
        certifications: true,
        insurance: true,
        permits: true
      },
      cost: {
        acquisition: 180000000,
        operatingCost: 4200000,
        maintenanceCost: 1800000,
        depreciation: 9000000
      },
      tags: ["reach-stacker", "container-handler", "maintenance"]
    },
    {
      id: "EQUIP-003",
      name: "Forklift FLT-012",
      type: "Forklift",
      model: "Toyota 8FGU25",
      serialNumber: "TYT-8FGU25-012",
      manufacturer: "Toyota",
      status: "Operational",
      location: "Warehouse B",
      capacity: "2.5 tons",
      yearOfManufacture: 2022,
      lastMaintenance: "2024-10-20",
      nextMaintenance: "2025-01-20",
      maintenanceInterval: "90 days",
      utilization: 65,
      availability: 88,
      currentJob: "Loading containers to warehouse",
      operator: "Samuel Okon",
      fuelLevel: "92%",
      engineHours: 5678,
      operatingHours: 4234,
      specifications: {
        liftHeight: "6 meters",
        speed: "18 km/h",
        power: "48 kW",
        battery: "80V/600Ah"
      },
      maintenance: {
        lastService: "2024-10-20",
        nextService: "2025-01-20",
        serviceType: "Routine Service",
        technician: "Warehouse Maintenance",
        cost: 85000
      },
      performance: {
        movesPerHour: 15,
        downtimeHours: 23,
        efficiency: 76,
        reliability: 85
      },
      alerts: [
        { type: "Low Battery", message: "Battery level below 20% - charge required", severity: "Warning", date: "2024-12-09" }
      ],
      documents: {
        manual: true,
        certifications: true,
        insurance: true,
        permits: true
      },
      cost: {
        acquisition: 8500000,
        operatingCost: 240000,
        maintenanceCost: 120000,
        depreciation: 425000
      },
      tags: ["forklift", "warehouse", "material-handling"]
    },
    {
      id: "EQUIP-004",
      name: "Mobile Crane MC-005",
      type: "Mobile Crane",
      model: "Liebherr LTM 1060-3.1",
      serialNumber: "LBH-LTM-1060-005",
      manufacturer: "Liebherr",
      status: "Operational",
      location: "Berth 7",
      capacity: "60 tons",
      yearOfManufacture: 2019,
      lastMaintenance: "2024-09-15",
      nextMaintenance: "2024-12-15",
      maintenanceInterval: "90 days",
      utilization: 45,
      availability: 92,
      currentJob: "Loading break bulk cargo",
      operator: "Emeka Nwosu",
      fuelLevel: "67%",
      engineHours: 8923,
      operatingHours: 6789,
      specifications: {
        boomLength: "50 meters",
        liftCapacity: "60 tons",
        speed: "80 km/h",
        power: "400 kW"
      },
      maintenance: {
        lastService: "2024-09-15",
        nextService: "2024-12-15",
        serviceType: "Routine Inspection",
        technician: "Heavy Equipment Team",
        cost: 285000
      },
      performance: {
        movesPerHour: 8,
        downtimeHours: 67,
        efficiency: 79,
        reliability: 88
      },
      alerts: [],
      documents: {
        manual: true,
        certifications: true,
        insurance: true,
        permits: true
      },
      cost: {
        acquisition: 280000000,
        operatingCost: 6500000,
        maintenanceCost: 2400000,
        depreciation: 14000000
      },
      tags: ["mobile-crane", "heavy-lift", "break-bulk", "versatile"]
    },
    {
      id: "EQUIP-005",
      name: "Straddle Carrier SC-08",
      type: "Straddle Carrier",
      model: "Kalmar FastCharge",
      serialNumber: "KAL-FC-SC-008",
      manufacturer: "Kalmar",
      status: "Operational",
      location: "Container Yard C",
      capacity: "65 tons",
      yearOfManufacture: 2021,
      lastMaintenance: "2024-11-30",
      nextMaintenance: "2025-02-28",
      maintenanceInterval: "90 days",
      utilization: 78,
      availability: 95,
      currentJob: "Container stacking operations",
      operator: "Ahmed Hassan",
      fuelLevel: "84%",
      engineHours: 14567,
      operatingHours: 11234,
      specifications: {
        liftHeight: "6 containers",
        speed: "30 km/h",
        power: "470 kW",
        turningRadius: "12 meters"
      },
      maintenance: {
        lastService: "2024-11-30",
        nextService: "2025-02-28",
        serviceType: "Routine Service",
        technician: "Container Equipment Team",
        cost: 195000
      },
      performance: {
        movesPerHour: 25,
        downtimeHours: 45,
        efficiency: 87,
        reliability: 93
      },
      alerts: [],
      documents: {
        manual: true,
        certifications: true,
        insurance: true,
        permits: true
      },
      cost: {
        acquisition: 195000000,
        operatingCost: 4800000,
        maintenanceCost: 1950000,
        depreciation: 9750000
      },
      tags: ["straddle-carrier", "container", "yard-operations", "efficient"]
    }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "operational", label: "Operational" },
    { value: "in_maintenance", label: "In Maintenance" },
    { value: "out_of_service", label: "Out of Service" },
    { value: "standby", label: "Standby" },
    { value: "retired", label: "Retired" }
  ];

  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: "container_crane", label: "Container Crane" },
    { value: "reach_stacker", label: "Reach Stacker" },
    { value: "forklift", label: "Forklift" },
    { value: "mobile_crane", label: "Mobile Crane" },
    { value: "straddle_carrier", label: "Straddle Carrier" },
    { value: "rtg_crane", label: "RTG Crane" },
    { value: "truck", label: "Truck" }
  ];

  const filteredEquipment = equipmentUnits.filter(equipment => {
    const matchesSearch = equipment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         equipment.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         equipment.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         equipment.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         equipment.status.toLowerCase().replace(" ", "_") === statusFilter;
    const matchesType = typeFilter === "all" || 
                       equipment.type.toLowerCase().replace(" ", "_") === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const statusColorMap = {
    'Operational': 'bg-green-100 text-green-800',
    'In Maintenance': 'bg-yellow-100 text-yellow-800',
    'Out of Service': 'bg-red-100 text-red-800',
    'Standby': 'bg-blue-100 text-blue-800',
    'Retired': 'bg-gray-100 text-gray-800'
  };

  const typeColorMap = {
    'Container Crane': 'bg-blue-100 text-blue-800',
    'Reach Stacker': 'bg-green-100 text-green-800',
    'Forklift': 'bg-purple-100 text-purple-800',
    'Mobile Crane': 'bg-orange-100 text-orange-800',
    'Straddle Carrier': 'bg-teal-100 text-teal-800',
    'RTG Crane': 'bg-indigo-100 text-indigo-800',
    'Truck': 'bg-pink-100 text-pink-800'
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 80) return 'text-green-600';
    if (utilization >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAvailabilityColor = (availability: number) => {
    if (availability >= 95) return 'text-green-600';
    if (availability >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Equipment Management</h1>
          <p className="text-gray-600">Monitor and manage port equipment, maintenance schedules, and performance</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/marine/port-operations/equipment/add"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Equipment
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Equipment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {equipmentStats.map((stat) => (
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
                stat.status === 'Operational' ? 'bg-green-100 text-green-800' :
                stat.status === 'Optimal' ? 'bg-blue-100 text-blue-800' :
                stat.status === 'Managed' ? 'bg-yellow-100 text-yellow-800' :
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
                placeholder="Search equipment by name, type, model, or location..."
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

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredEquipment.map((equipment) => (
          <div key={equipment.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Cog className="w-6 h-6 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{equipment.name}</h3>
                    <p className="text-sm text-gray-500">{equipment.model} • {equipment.serialNumber}</p>
                  </div>
                  <span className="text-sm text-gray-500">#{equipment.id}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{equipment.manufacturer} • {equipment.yearOfManufacture}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[equipment.status as keyof typeof statusColorMap]}`}>
                    {equipment.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeColorMap[equipment.type as keyof typeof typeColorMap]}`}>
                    {equipment.type}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                    {equipment.capacity}
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
                  <Wrench className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Current Status</p>
                  <div className="space-y-2 text-sm mt-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium">{equipment.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Utilization:</span>
                      <span className={`font-medium ${getUtilizationColor(equipment.utilization)}`}>
                        {equipment.utilization}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Availability:</span>
                      <span className={`font-medium ${getAvailabilityColor(equipment.availability)}`}>
                        {equipment.availability}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fuel Level:</span>
                      <span className="font-medium">{equipment.fuelLevel}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Current Operation</p>
                  <div className="space-y-2 text-sm mt-1">
                    <div>
                      <p className="text-gray-600">Current Job:</p>
                      <p className="font-medium">{equipment.currentJob}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Operator:</p>
                      <p className="font-medium">{equipment.operator}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Operating Hours:</p>
                      <p className="font-medium">{equipment.operatingHours.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Engine Hours:</p>
                      <p className="font-medium">{equipment.engineHours.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Specifications</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Lift Height: {equipment.specifications.liftHeight || 'N/A'}</p>
                    <p className="text-gray-600">Speed: {equipment.specifications.speed}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Power: {equipment.specifications.power}</p>
                    <p className="text-gray-600">Outreach: {equipment.specifications.outreach || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Maintenance Schedule</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Last Service:</p>
                    <p className="font-medium">{equipment.maintenance.lastService}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Next Service:</p>
                    <p className="font-medium">{equipment.maintenance.nextService}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Service Type:</p>
                    <p className="font-medium">{equipment.maintenance.serviceType}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Cost:</p>
                    <p className="font-medium">{formatCurrency(equipment.maintenance.cost)}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Performance Metrics</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Moves/Hour: {equipment.performance.movesPerHour || 'N/A'}</p>
                    <p className="text-gray-600">Efficiency: {equipment.performance.efficiency}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Reliability: {equipment.performance.reliability}%</p>
                    <p className="text-gray-600">Downtime: {equipment.performance.downtimeHours}h</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Cost Analysis</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Acquisition:</p>
                    <p className="font-medium">{formatCurrency(equipment.cost.acquisition)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Operating:</p>
                    <p className="font-medium">{formatCurrency(equipment.cost.operatingCost)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Maintenance:</p>
                    <p className="font-medium">{formatCurrency(equipment.cost.maintenanceCost)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Depreciation:</p>
                    <p className="font-medium">{formatCurrency(equipment.cost.depreciation)}</p>
                  </div>
                </div>
              </div>

              {equipment.alerts.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Active Alerts</p>
                  <div className="space-y-2">
                    {equipment.alerts.map((alert, index) => (
                      <div key={index} className="flex items-start space-x-2 p-2 bg-yellow-50 rounded text-sm">
                        <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="text-yellow-800 font-medium">{alert.message}</p>
                          <p className="text-yellow-600 text-xs">{alert.date} • {alert.type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Documentation Status</p>
                <div className="flex flex-wrap gap-1">
                  {equipment.documents.manual && (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                      Manual
                    </span>
                  )}
                  {equipment.documents.certifications && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      Certifications
                    </span>
                  )}
                  {equipment.documents.insurance && (
                    <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                      Insurance
                    </span>
                  )}
                  {equipment.documents.permits && (
                    <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                      Permits
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {equipment.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                      {tag}
                    </span>
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
                    <Wrench className="w-3 h-3 mr-1" />
                    Maintenance
                  </button>
                </div>
                <Link
                  href={`/marine/port-operations/equipment/${equipment.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Equipment Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Equipment Management Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Cog className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Operational Equipment</h3>
                <p className="text-xs text-gray-500">Currently working</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {equipmentUnits.filter(e => e.status === 'Operational').length}</p>
              <p>Percentage: {Math.round((equipmentUnits.filter(e => e.status === 'Operational').length / equipmentUnits.length) * 100)}%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Wrench className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Under Maintenance</h3>
                <p className="text-xs text-gray-500">Scheduled service</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {equipmentUnits.filter(e => e.status === 'In Maintenance').length}</p>
              <p>Critical: {equipmentUnits.filter(e => e.status === 'In Maintenance' && e.type === 'Container Crane').length}</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Gauge className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Average Utilization</h3>
                <p className="text-xs text-gray-500">Across all equipment</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Rate: {Math.round(equipmentUnits.filter(e => e.status === 'Operational').reduce((sum, e) => sum + e.utilization, 0) / equipmentUnits.filter(e => e.status === 'Operational').length)}%</p>
              <p>Optimal: >70%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Maintenance Budget</h3>
                <p className="text-xs text-gray-500">Annual allocation</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Spent: ₦45.2M</p>
              <p>Remaining: ₦18.7M</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Equipment Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/marine/port-operations/equipment/add"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Add Equipment</h3>
            <p className="text-xs text-gray-500">New equipment unit</p>
          </Link>
          <Link
            href="/marine/port-operations/equipment/maintenance"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Wrench className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Maintenance Schedule</h3>
            <p className="text-xs text-gray-500">Service planning</p>
          </Link>
          <Link
            href="/marine/port-operations/equipment/performance"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Performance Analytics</h3>
            <p className="text-xs text-gray-500">Equipment metrics</p>
          </Link>
          <Link
            href="/marine/port-operations/equipment/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Equipment Reports</h3>
            <p className="text-xs text-gray-500">Generate reports</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

