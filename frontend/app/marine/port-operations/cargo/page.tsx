"use client";

import { useState } from "react";
import {
  Package,
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
  Truck as TruckIcon,
  Warehouse,
  Factory,
  Train,
  Plane
} from "lucide-react";
import Link from "next/link";

export default function MarineCargoPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const cargoStats = [
    {
      name: "Total Cargo Volume",
      value: "2.4M",
      change: "+15.2%",
      changeType: "positive",
      icon: Package,
      description: "TEUs this year",
      status: "Growing"
    },
    {
      name: "Active Shipments",
      value: "1,247",
      change: "+8.3%",
      changeType: "positive",
      icon: Ship,
      description: "In transit or processing",
      status: "Active"
    },
    {
      name: "On-Time Delivery",
      value: "94.7%",
      change: "+2.1%",
      changeType: "positive",
      icon: CheckCircle,
      description: "Delivery performance",
      status: "Excellent"
    },
    {
      name: "Cargo Value",
      value: "₦890B",
      change: "+12.5%",
      changeType: "positive",
      icon: DollarSign,
      description: "Annual cargo value",
      status: "Strong"
    }
  ];

  const cargoShipments = [
    {
      id: "CARGO-001",
      referenceNumber: "NPA-CGO-2024-001",
      containerNumber: "MSCU1234567",
      billOfLading: "BOL-2024-00123",
      vesselName: "MSC Isabella",
      voyageNumber: "MI-045",
      origin: {
        port: "Port of Rotterdam",
        country: "Netherlands",
        eta: "2024-12-15"
      },
      destination: {
        port: "Lagos Port",
        country: "Nigeria",
        eta: "2024-12-28"
      },
      cargo: {
        description: "Electronics and Consumer Goods",
        type: "Containerized",
        category: "General Cargo",
        quantity: 1,
        weight: 24000,
        volume: 67.5,
        value: 45000000
      },
      container: {
        type: "40ft Standard",
        size: "40ft",
        maxWeight: 30480,
        tareWeight: 3750,
        payloadWeight: 26730
      },
      status: "In Transit",
      currentLocation: "Atlantic Ocean - 15°N, 25°W",
      lastUpdate: "2024-12-10 08:30:00",
      milestones: [
        { event: "Gate In", location: "Rotterdam", date: "2024-12-01", status: "Completed" },
        { event: "Loaded on Vessel", location: "Rotterdam", date: "2024-12-05", status: "Completed" },
        { event: "Vessel Departed", location: "Rotterdam", date: "2024-12-06", status: "Completed" },
        { event: "Vessel Arrived", location: "Lagos", date: "2024-12-28", status: "Pending" },
        { event: "Discharged", location: "Lagos", date: "2024-12-29", status: "Pending" },
        { event: "Gate Out", location: "Lagos", date: "2024-12-30", status: "Pending" }
      ],
      parties: {
        shipper: "Electronics Corp Ltd",
        consignee: "Nigerian Electronics Ltd",
        notifyParty: "Shipping Agent Nigeria",
        freightForwarder: "Global Logistics Ltd"
      },
      documents: {
        commercialInvoice: true,
        packingList: true,
        certificateOfOrigin: true,
        insuranceCertificate: true,
        customsDeclaration: false
      },
      customs: {
        status: "Cleared",
        declarationNumber: "CUS-NG-2024-001",
        duties: 2250000,
        clearanceDate: "2024-12-09"
      },
      tracking: {
        temperature: null,
        humidity: null,
        shock: null,
        gps: "15.234°N, 25.678°W",
        lastPing: "2024-12-10 08:30:00"
      },
      insurance: {
        insured: true,
        value: 45000000,
        premium: 225000,
        coverage: "All Risk",
        validUntil: "2025-01-15"
      },
      charges: {
        freight: 12000000,
        terminalHandling: 850000,
        documentation: 125000,
        customsClearance: 375000,
        insurance: 225000,
        total: 13450000
      },
      alerts: [],
      priority: "Standard",
      specialHandling: [],
      notes: "Fragile electronics - handle with care"
    },
    {
      id: "CARGO-002",
      referenceNumber: "NPA-CGO-2024-002",
      containerNumber: "HLCU9876543",
      billOfLading: "BOL-2024-00456",
      vesselName: "Hapag Lloyd Express",
      voyageNumber: "HL-078",
      origin: {
        port: "Port of Shanghai",
        country: "China",
        eta: "2024-11-20"
      },
      destination: {
        port: "Lagos Port",
        country: "Nigeria",
        eta: "2024-12-15"
      },
      cargo: {
        description: "Agricultural Machinery Parts",
        type: "Containerized",
        category: "Industrial Equipment",
        quantity: 1,
        weight: 18500,
        volume: 52.0,
        value: 28000000
      },
      container: {
        type: "40ft High Cube",
        size: "40ft HC",
        maxWeight: 30480,
        tareWeight: 3950,
        payloadWeight: 26530
      },
      status: "At Port",
      currentLocation: "Lagos Port - Container Terminal",
      lastUpdate: "2024-12-10 14:15:00",
      milestones: [
        { event: "Gate In", location: "Shanghai", date: "2024-11-15", status: "Completed" },
        { event: "Loaded on Vessel", location: "Shanghai", date: "2024-11-18", status: "Completed" },
        { event: "Vessel Departed", location: "Shanghai", date: "2024-11-20", status: "Completed" },
        { event: "Vessel Arrived", location: "Lagos", date: "2024-12-10", status: "Completed" },
        { event: "Discharged", location: "Lagos", date: "2024-12-11", status: "Pending" },
        { event: "Gate Out", location: "Lagos", date: "2024-12-12", status: "Pending" }
      ],
      parties: {
        shipper: "China Machinery Corp",
        consignee: "Nigerian Agricultural Ltd",
        notifyParty: "Port Agent Lagos",
        freightForwarder: "International Freight Ltd"
      },
      documents: {
        commercialInvoice: true,
        packingList: true,
        certificateOfOrigin: true,
        insuranceCertificate: true,
        customsDeclaration: true
      },
      customs: {
        status: "Under Review",
        declarationNumber: "CUS-NG-2024-002",
        duties: 1680000,
        clearanceDate: null
      },
      tracking: {
        temperature: null,
        humidity: null,
        shock: "Monitored",
        gps: "6.447°N, 3.391°E",
        lastPing: "2024-12-10 14:15:00"
      },
      insurance: {
        insured: true,
        value: 28000000,
        premium: 140000,
        coverage: "All Risk",
        validUntil: "2025-01-01"
      },
      charges: {
        freight: 8500000,
        terminalHandling: 625000,
        documentation: 100000,
        customsClearance: 300000,
        insurance: 140000,
        total: 9660000
      },
      alerts: [
        { type: "Customs", message: "Additional documentation required", severity: "Medium", date: "2024-12-09" }
      ],
      priority: "Standard",
      specialHandling: ["Heavy Lift Equipment"],
      notes: "Heavy machinery parts - requires special handling equipment"
    },
    {
      id: "CARGO-003",
      referenceNumber: "NPA-CGO-2024-003",
      containerNumber: "MAEU4567890",
      billOfLading: "BOL-2024-00789",
      vesselName: "Maersk Denver",
      voyageNumber: "MD-092",
      origin: {
        port: "Port of Houston",
        country: "USA",
        eta: "2024-11-25"
      },
      destination: {
        port: "Lagos Port",
        country: "Nigeria",
        eta: "2024-12-20"
      },
      cargo: {
        description: "Perishable Food Items - Refrigerated",
        type: "Containerized",
        category: "Perishable Goods",
        quantity: 1,
        weight: 22000,
        volume: 67.5,
        value: 35000000
      },
      container: {
        type: "40ft Reefer",
        size: "40ft",
        maxWeight: 30480,
        tareWeight: 4800,
        payloadWeight: 25680
      },
      status: "In Transit",
      currentLocation: "Atlantic Ocean - 10°N, 35°W",
      lastUpdate: "2024-12-10 12:00:00",
      milestones: [
        { event: "Gate In", location: "Houston", date: "2024-11-20", status: "Completed" },
        { event: "Loaded on Vessel", location: "Houston", date: "2024-11-22", status: "Completed" },
        { event: "Vessel Departed", location: "Houston", date: "2024-11-25", status: "Completed" },
        { event: "Vessel Arrived", location: "Lagos", date: "2024-12-20", status: "Pending" },
        { event: "Discharged", location: "Lagos", date: "2024-12-21", status: "Pending" },
        { event: "Gate Out", location: "Lagos", date: "2024-12-22", status: "Pending" }
      ],
      parties: {
        shipper: "American Foods Corp",
        consignee: "Nigerian Foods Ltd",
        notifyParty: "Customs Agent Lagos",
        freightForwarder: "Global Shipping Co"
      },
      documents: {
        commercialInvoice: true,
        packingList: true,
        certificateOfOrigin: true,
        insuranceCertificate: true,
        customsDeclaration: true,
        phytosanitaryCertificate: true,
        healthCertificate: true
      },
      customs: {
        status: "Cleared",
        declarationNumber: "CUS-NG-2024-003",
        duties: 1750000,
        clearanceDate: "2024-12-08"
      },
      tracking: {
        temperature: "2-4°C",
        humidity: "60-70%",
        shock: null,
        gps: "10.123°N, 35.456°W",
        lastPing: "2024-12-10 12:00:00"
      },
      insurance: {
        insured: true,
        value: 35000000,
        premium: 175000,
        coverage: "All Risk + Temperature",
        validUntil: "2025-01-05"
      },
      charges: {
        freight: 15000000,
        terminalHandling: 750000,
        documentation: 150000,
        customsClearance: 350000,
        insurance: 175000,
        reeferCharges: 500000,
        total: 17925000
      },
      alerts: [
        { type: "Temperature", message: "Temperature alert at 08:30 - returned to normal", severity: "Low", date: "2024-12-08" }
      ],
      priority: "High",
      specialHandling: ["Refrigerated", "Perishable", "Temperature Controlled"],
      notes: "Perishable goods - maintain temperature between 2-4°C. Monitor closely."
    }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "in_transit", label: "In Transit" },
    { value: "at_port", label: "At Port" },
    { value: "cleared", label: "Cleared" },
    { value: "delivered", label: "Delivered" },
    { value: "on_hold", label: "On Hold" }
  ];

  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: "containerized", label: "Containerized" },
    { value: "bulk", label: "Bulk Cargo" },
    { value: "liquid_bulk", label: "Liquid Bulk" },
    { value: "break_bulk", label: "Break Bulk" },
    { value: "ro_ro", label: "Ro-Ro" }
  ];

  const filteredCargo = cargoShipments.filter(shipment => {
    const matchesSearch = shipment.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shipment.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shipment.cargo.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shipment.vesselName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shipment.parties.consignee.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         shipment.status.toLowerCase().replace(" ", "_") === statusFilter;
    const matchesType = typeFilter === "all" || 
                       shipment.cargo.type.toLowerCase() === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const statusColorMap = {
    'In Transit': 'bg-blue-100 text-blue-800',
    'At Port': 'bg-yellow-100 text-yellow-800',
    'Cleared': 'bg-green-100 text-green-800',
    'Delivered': 'bg-purple-100 text-purple-800',
    'On Hold': 'bg-red-100 text-red-800'
  };

  const typeColorMap = {
    'Containerized': 'bg-blue-100 text-blue-800',
    'Bulk Cargo': 'bg-green-100 text-green-800',
    'Liquid Bulk': 'bg-purple-100 text-purple-800',
    'Break Bulk': 'bg-orange-100 text-orange-800',
    'Ro-Ro': 'bg-teal-100 text-teal-800'
  };

  const priorityColorMap = {
    'Critical': 'bg-red-100 text-red-800',
    'High': 'bg-orange-100 text-orange-800',
    'Standard': 'bg-blue-100 text-blue-800',
    'Low': 'bg-green-100 text-green-800'
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatWeight = (weight: number) => {
    return `${weight.toLocaleString()} kg`;
  };

  const formatVolume = (volume: number) => {
    return `${volume} m³`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cargo Management</h1>
          <p className="text-gray-600">Track and manage cargo shipments, containers, and port operations</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/marine/port-operations/cargo/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Shipment
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Export Manifest
          </button>
        </div>
      </div>

      {/* Cargo Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cargoStats.map((stat) => (
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
                stat.status === 'Growing' ? 'bg-green-100 text-green-800' :
                stat.status === 'Active' ? 'bg-blue-100 text-blue-800' :
                stat.status === 'Excellent' ? 'bg-purple-100 text-purple-800' :
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
                placeholder="Search cargo by reference, container, description, vessel, or consignee..."
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

      {/* Cargo Shipments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCargo.map((shipment) => (
          <div key={shipment.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Container className="w-6 h-6 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{shipment.referenceNumber}</h3>
                    <p className="text-sm text-gray-500">Container: {shipment.containerNumber}</p>
                  </div>
                  <span className="text-sm text-gray-500">#{shipment.id}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{shipment.cargo.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[shipment.status as keyof typeof statusColorMap]}`}>
                    {shipment.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeColorMap[shipment.cargo.type as keyof typeof typeColorMap]}`}>
                    {shipment.cargo.type}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColorMap[shipment.priority as keyof typeof priorityColorMap]}`}>
                    {shipment.priority}
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
                  <FileText className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Route Information</p>
                  <div className="space-y-2 text-sm mt-1">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">From: {shipment.origin.port}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-600">To: {shipment.destination.port}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Ship className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{shipment.vesselName} ({shipment.voyageNumber})</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Cargo Details</p>
                  <div className="space-y-2 text-sm mt-1">
                    <div>
                      <p className="text-gray-600">Weight: {formatWeight(shipment.cargo.weight)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Volume: {formatVolume(shipment.cargo.volume)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Value: {formatCurrency(shipment.cargo.value)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Container: {shipment.container.type}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Current Location & Status</p>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-900 font-medium">{shipment.currentLocation}</p>
                  <p className="text-xs text-gray-500">Last Update: {shipment.lastUpdate}</p>
                  {shipment.tracking.gps && (
                    <p className="text-xs text-blue-600">GPS: {shipment.tracking.gps}</p>
                  )}
                  {shipment.tracking.temperature && (
                    <p className="text-xs text-green-600">Temperature: {shipment.tracking.temperature}</p>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Key Milestones</p>
                <div className="space-y-2">
                  {shipment.milestones.slice(-3).map((milestone, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        {milestone.status === 'Completed' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-gray-600">{milestone.event}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-500">{milestone.location}</span>
                        <p className="text-gray-400">{milestone.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Parties Involved</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Shipper</p>
                    <p className="text-gray-900">{shipment.parties.shipper}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Consignee</p>
                    <p className="text-gray-900">{shipment.parties.consignee}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Charges Summary</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Freight: {formatCurrency(shipment.charges.freight)}</p>
                    <p className="text-gray-600">Terminal: {formatCurrency(shipment.charges.terminalHandling)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Customs: {formatCurrency(shipment.charges.customsClearance)}</p>
                    <p className="font-bold text-gray-900">Total: {formatCurrency(shipment.charges.total)}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Special Handling</p>
                <div className="flex flex-wrap gap-1">
                  {shipment.specialHandling.map((handling, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                      {handling}
                    </span>
                  ))}
                  {shipment.specialHandling.length === 0 && (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                      Standard Handling
                    </span>
                  )}
                </div>
              </div>

              {shipment.alerts.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Active Alerts</p>
                  <div className="space-y-2">
                    {shipment.alerts.map((alert, index) => (
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
                  href={`/marine/port-operations/cargo/${shipment.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cargo Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Cargo Management Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Active Shipments</h3>
                <p className="text-xs text-gray-500">Currently in system</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {cargoShipments.filter(s => s.status !== 'Delivered').length}</p>
              <p>Percentage: {Math.round((cargoShipments.filter(s => s.status !== 'Delivered').length / cargoShipments.length) * 100)}%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Ship className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Vessels in Port</h3>
                <p className="text-xs text-gray-500">Active berths</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: 8</p>
              <p>Capacity: 65%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Container className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Containers Today</h3>
                <p className="text-xs text-gray-500">Processed</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Discharged: 156</p>
              <p>Loaded: 89</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Revenue Today</h3>
                <p className="text-xs text-gray-500">From operations</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Amount: ₦45.2M</p>
              <p>Target: ₦50M</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cargo Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/marine/port-operations/cargo/new"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">New Shipment</h3>
            <p className="text-xs text-gray-500">Register cargo</p>
          </Link>
          <Link
            href="/marine/port-operations/cargo/tracking"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Map className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Cargo Tracking</h3>
            <p className="text-xs text-gray-500">Track shipments</p>
          </Link>
          <Link
            href="/marine/port-operations/cargo/customs"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Shield className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Customs Clearance</h3>
            <p className="text-xs text-gray-500">Clearance status</p>
          </Link>
          <Link
            href="/marine/port-operations/cargo/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Cargo Reports</h3>
            <p className="text-xs text-gray-500">Generate reports</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

