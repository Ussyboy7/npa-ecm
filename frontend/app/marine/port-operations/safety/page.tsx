"use client";

import { useState } from "react";
import {
  Shield,
  AlertTriangle,
  Users,
  Activity,
  TrendingUp,
  TrendingDown,
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
  MapPin,
  Building,
  Clock,
  CheckCircle,
  BookOpen,
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
  Screwdriver,
  HardHat,
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
  BarChart3,
  PieChart,
  Calendar,
  Target,
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
  Gauge,
  Navigation as NavigationIcon,
  LifeBuoy,
  Siren,
  Flame,
  Biohazard,
  Radiation
} from "lucide-react";
import Link from "next/link";

export default function MarineSafetyPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const safetyStats = [
    {
      name: "Safety Incidents",
      value: "8",
      change: "-3",
      changeType: "positive",
      icon: AlertTriangle,
      description: "This month",
      status: "Improving"
    },
    {
      name: "Lost Time Injuries",
      value: "2",
      change: "-1",
      changeType: "positive",
      icon: Users,
      description: "This year",
      status: "Reduced"
    },
    {
      name: "Safety Training",
      value: "94%",
      change: "+5%",
      changeType: "positive",
      icon: CheckCircle,
      description: "Completion rate",
      status: "Excellent"
    },
    {
      name: "Days Since Last Incident",
      value: "127",
      change: "+15",
      changeType: "positive",
      icon: Calendar,
      description: "Current streak",
      status: "Strong"
    }
  ];

  const safetyIncidents = [
    {
      id: "INC-SFT-001",
      title: "Forklift Accident - Container Terminal",
      severity: "High",
      status: "Investigated",
      category: "Equipment Accident",
      reportedDate: "2024-11-25 14:30:00",
      incidentDate: "2024-11-25 13:45:00",
      location: "Container Terminal A - Berth 4",
      injuredPerson: "John Adebayo (Equipment Operator)",
      injuryType: "Minor Contusion",
      description: "Operator sustained minor injuries when forklift collided with container stack during unloading operations",
      immediateActions: [
        "Medical attention provided immediately",
        "Equipment secured and removed from service",
        "Area cordoned off for investigation",
        "Incident reported to management"
      ],
      rootCause: [
        "Inadequate visibility in high-stacking area",
        "Operator fatigue after extended shift",
        "Inadequate lighting in terminal area"
      ],
      correctiveActions: [
        "Install additional lighting in terminal areas",
        "Implement mandatory rest breaks for operators",
        "Conduct additional safety training on visibility hazards",
        "Install proximity sensors on forklifts"
      ],
      investigationTeam: ["Safety Manager", "Terminal Supervisor", "HR Representative"],
      investigationStatus: "Completed",
      investigationDate: "2024-11-28",
      followUpActions: [
        "Medical follow-up with injured employee",
        "Equipment inspection and maintenance",
        "Staff counseling and support",
        "Safety procedure review and update"
      ],
      costImpact: {
        medical: 25000,
        equipment: 150000,
        lostTime: 50000,
        total: 225000
      },
      lessonsLearned: [
        "Importance of adequate lighting in operational areas",
        "Need for fatigue management programs",
        "Value of proximity detection systems"
      ],
      preventiveMeasures: [
        "Enhanced lighting installation - Q1 2025",
        "Fatigue monitoring system implementation",
        "Proximity sensor installation on all forklifts"
      ],
      tags: ["equipment", "forklift", "terminal", "injury", "high-severity"]
    },
    {
      id: "INC-SFT-002",
      title: "Near-Miss - Crane Load Swing",
      severity: "Medium",
      status: "Closed",
      category: "Near-Miss Incident",
      reportedDate: "2024-12-02 09:15:00",
      incidentDate: "2024-12-02 08:45:00",
      location: "Container Terminal B - STS Crane #2",
      injuredPerson: "None",
      injuryType: "None",
      description: "Container load swung dangerously close to ground personnel during discharge operations from MSC Isabella",
      immediateActions: [
        "Operations halted immediately",
        "Personnel evacuated from danger zone",
        "Crane operations suspended for inspection",
        "Weather conditions assessed"
      ],
      rootCause: [
        "High winds affecting load stability",
        "Inadequate wind speed monitoring",
        "Delayed response to changing conditions"
      ],
      correctiveActions: [
        "Implement wind speed monitoring system",
        "Establish wind speed operational limits",
        "Train operators on wind condition procedures",
        "Install wind speed indicators at crane positions"
      ],
      investigationTeam: ["Safety Manager", "Crane Operations Lead", "Weather Monitoring Team"],
      investigationStatus: "Completed",
      investigationDate: "2024-12-05",
      followUpActions: [
        "Weather monitoring system installation",
        "Operational procedure updates",
        "Staff training on wind conditions",
        "Equipment inspection completion"
      ],
      costImpact: {
        medical: 0,
        equipment: 25000,
        lostTime: 15000,
        total: 40000
      },
      lessonsLearned: [
        "Critical importance of weather monitoring",
        "Need for real-time operational limits",
        "Value of immediate response procedures"
      ],
      preventiveMeasures: [
        "Wind monitoring system installation - Q1 2025",
        "Weather-based operational protocols",
        "Enhanced training programs"
      ],
      tags: ["near-miss", "crane", "weather", "wind", "medium-severity"]
    },
    {
      id: "INC-SFT-003",
      title: "Slip and Fall Incident",
      severity: "Low",
      status: "Resolved",
      category: "Slips, Trips, and Falls",
      reportedDate: "2024-12-08 16:20:00",
      incidentDate: "2024-12-08 15:30:00",
      location: "Administrative Building - Main Entrance",
      injuredPerson: "Grace Okonkwo (Administrative Officer)",
      injuryType: "Minor Sprain",
      description: "Employee slipped on wet floor in main entrance area during rainy conditions",
      immediateActions: [
        "Medical assistance provided",
        "Floor dried and secured",
        "Warning signs placed",
        "Incident reported and documented"
      ],
      rootCause: [
        "Wet floor from rain ingress",
        "Inadequate floor drainage",
        "Lack of immediate cleanup response"
      ],
      correctiveActions: [
        "Improve entrance drainage system",
        "Install automatic floor drying system",
        "Implement immediate spill response procedure",
        "Regular maintenance of entrance area"
      ],
      investigationTeam: ["Safety Officer", "Facilities Manager", "Administrative Supervisor"],
      investigationStatus: "Completed",
      investigationDate: "2024-12-10",
      followUpActions: [
        "Employee medical follow-up",
        "Facilities maintenance scheduling",
        "Staff awareness training",
        "Entrance area inspection"
      ],
      costImpact: {
        medical: 15000,
        equipment: 50000,
        lostTime: 10000,
        total: 75000
      },
      lessonsLearned: [
        "Importance of immediate response to weather conditions",
        "Value of proactive maintenance",
        "Need for comprehensive spill prevention"
      ],
      preventiveMeasures: [
        "Drainage system upgrade - Q1 2025",
        "Automatic drying system installation",
        "Enhanced maintenance procedures"
      ],
      tags: ["slip-fall", "weather", "facilities", "low-severity"]
    },
    {
      id: "INC-SFT-004",
      title: "Chemical Spill Incident",
      severity: "Medium",
      status: "Under Investigation",
      category: "Hazardous Materials",
      reportedDate: "2024-12-10 11:45:00",
      incidentDate: "2024-12-10 11:20:00",
      location: "Fuel Storage Facility",
      injuredPerson: "None",
      injuryType: "None",
      description: "Minor fuel spill during transfer operations at fuel storage facility",
      immediateActions: [
        "Operations halted immediately",
        "Spill contained and neutralized",
        "Area evacuated and secured",
        "Environmental monitoring initiated"
      ],
      rootCause: [
        "Equipment malfunction during transfer",
        "Inadequate secondary containment",
        "Delayed detection of leak"
      ],
      correctiveActions: [
        "Upgrade fuel transfer equipment",
        "Improve secondary containment systems",
        "Install leak detection systems",
        "Enhance spill response training"
      ],
      investigationTeam: ["Safety Manager", "Environmental Officer", "Operations Manager"],
      investigationStatus: "In Progress",
      investigationDate: null,
      followUpActions: [
        "Environmental impact assessment",
        "Equipment inspection and repair",
        "Staff retraining",
        "Containment system upgrade"
      ],
      costImpact: {
        medical: 0,
        equipment: 200000,
        lostTime: 25000,
        total: 225000
      },
      lessonsLearned: [
        "Importance of leak detection systems",
        "Value of secondary containment",
        "Need for immediate response capabilities"
      ],
      preventiveMeasures: [
        "Leak detection system installation",
        "Equipment upgrade program",
        "Enhanced spill response training"
      ],
      tags: ["chemical-spill", "fuel", "hazardous", "equipment", "medium-severity"]
    },
    {
      id: "INC-SFT-005",
      title: "Fire Alarm False Activation",
      severity: "Low",
      status: "Resolved",
      category: "False Alarm",
      reportedDate: "2024-12-09 08:30:00",
      incidentDate: "2024-12-09 08:15:00",
      location: "Warehouse Complex - Zone B",
      injuredPerson: "None",
      injuryType: "None",
      description: "False fire alarm activation in warehouse zone B, causing temporary evacuation",
      immediateActions: [
        "Building evacuation completed safely",
        "Fire systems checked and reset",
        "Area inspected for actual fire hazards",
        "Operations resumed after clearance"
      ],
      rootCause: [
        "Dust accumulation on smoke detector",
        "Inadequate preventive maintenance schedule",
        "Sensor sensitivity too high"
      ],
      correctiveActions: [
        "Increase frequency of detector cleaning",
        "Adjust smoke detector sensitivity",
        "Implement regular maintenance schedule",
        "Staff training on false alarm procedures"
      ],
      investigationTeam: ["Safety Officer", "Facilities Technician", "Warehouse Manager"],
      investigationStatus: "Completed",
      investigationDate: "2024-12-09",
      followUpActions: [
        "Maintenance schedule update",
        "Detector sensitivity adjustment",
        "Staff communication",
        "Documentation update"
      ],
      costImpact: {
        medical: 0,
        equipment: 5000,
        lostTime: 15000,
        total: 20000
      },
      lessonsLearned: [
        "Importance of regular maintenance",
        "Value of appropriate sensor settings",
        "Need for efficient evacuation procedures"
      ],
      preventiveMeasures: [
        "Enhanced maintenance schedule",
        "Sensor calibration program",
        "Regular system testing"
      ],
      tags: ["false-alarm", "fire-system", "maintenance", "low-severity"]
    }
  ];

  const safetyTraining = [
    {
      id: "TRAIN-SFT-001",
      courseName: "Basic Safety Awareness",
      category: "General Safety",
      requiredFor: "All Employees",
      completionRate: 96,
      lastConducted: "2024-12-01",
      nextScheduled: "2025-03-01",
      duration: "4 hours",
      instructor: "Safety Training Team",
      participants: 450,
      certification: "Valid for 1 year"
    },
    {
      id: "TRAIN-SFT-002",
      courseName: "Equipment Safety Operation",
      category: "Equipment Safety",
      requiredFor: "Equipment Operators",
      completionRate: 92,
      lastConducted: "2024-11-15",
      nextScheduled: "2025-02-15",
      duration: "8 hours",
      instructor: "Equipment Training Team",
      participants: 85,
      certification: "Valid for 2 years"
    },
    {
      id: "TRAIN-SFT-003",
      courseName: "Hazardous Materials Handling",
      category: "Chemical Safety",
      requiredFor: "Fuel & Chemical Handlers",
      completionRate: 100,
      lastConducted: "2024-10-20",
      nextScheduled: "2025-04-20",
      duration: "12 hours",
      instructor: "Environmental Safety Team",
      participants: 35,
      certification: "Valid for 1 year"
    }
  ];

  const safetyInspections = [
    {
      id: "INSP-SFT-001",
      inspectionType: "Monthly Safety Audit",
      area: "Container Terminal A",
      inspector: "Safety Audit Team",
      scheduledDate: "2024-12-15",
      status: "Scheduled",
      findings: 0,
      criticalIssues: 0,
      lastInspection: "2024-11-15",
      complianceScore: 98
    },
    {
      id: "INSP-SFT-002",
      inspectionType: "Equipment Safety Check",
      area: "Heavy Equipment Workshop",
      inspector: "Equipment Safety Team",
      scheduledDate: "2024-12-12",
      status: "In Progress",
      findings: 2,
      criticalIssues: 0,
      lastInspection: "2024-11-12",
      complianceScore: 95
    }
  ];

  const severityOptions = [
    { value: "all", label: "All Severities" },
    { value: "critical", label: "Critical" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "reported", label: "Reported" },
    { value: "investigated", label: "Investigated" },
    { value: "resolved", label: "Resolved" },
    { value: "closed", label: "Closed" },
    { value: "under_investigation", label: "Under Investigation" }
  ];

  const filteredIncidents = safetyIncidents.filter(incident => {
    const matchesSearch = incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = severityFilter === "all" || 
                           incident.severity.toLowerCase() === severityFilter;
    const matchesStatus = statusFilter === "all" || 
                         incident.status.toLowerCase().replace(" ", "_") === statusFilter;
    
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const severityColorMap = {
    'Critical': 'bg-red-100 text-red-800',
    'High': 'bg-orange-100 text-orange-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-green-100 text-green-800'
  };

  const statusColorMap = {
    'Reported': 'bg-blue-100 text-blue-800',
    'Investigated': 'bg-yellow-100 text-yellow-800',
    'Resolved': 'bg-green-100 text-green-800',
    'Closed': 'bg-gray-100 text-gray-800',
    'Under Investigation': 'bg-purple-100 text-purple-800'
  };

  const categoryColorMap = {
    'Equipment Accident': 'bg-red-100 text-red-800',
    'Near-Miss Incident': 'bg-yellow-100 text-yellow-800',
    'Slips, Trips, and Falls': 'bg-blue-100 text-blue-800',
    'Hazardous Materials': 'bg-purple-100 text-purple-800',
    'False Alarm': 'bg-gray-100 text-gray-800'
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
          <h1 className="text-3xl font-bold text-gray-900">Safety Management</h1>
          <p className="text-gray-600">Monitor, investigate, and prevent safety incidents across port operations</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/marine/port-operations/safety/report"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Report Incident
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Safety Report
          </button>
        </div>
      </div>

      {/* Safety Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {safetyStats.map((stat) => (
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
                stat.status === 'Improving' ? 'bg-green-100 text-green-800' :
                stat.status === 'Reduced' ? 'bg-blue-100 text-blue-800' :
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
                placeholder="Search incidents by title, description, location, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {severityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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

      {/* Safety Incidents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredIncidents.map((incident) => (
          <div key={incident.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{incident.title}</h3>
                    <p className="text-sm text-gray-500">{incident.id}</p>
                  </div>
                  <span className="text-sm text-gray-500">{incident.incidentDate}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{incident.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityColorMap[incident.severity as keyof typeof severityColorMap]}`}>
                    {incident.severity}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[incident.status as keyof typeof statusColorMap]}`}>
                    {incident.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${categoryColorMap[incident.category as keyof typeof categoryColorMap]}`}>
                    {incident.category}
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
                  <FileText className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Incident Details</p>
                  <div className="space-y-2 text-sm mt-1">
                    <div>
                      <p className="text-gray-600">Location: {incident.location}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Injured Person: {incident.injuredPerson || 'None'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Injury Type: {incident.injuryType || 'None'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Investigation Status: {incident.investigationStatus}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Cost Impact</p>
                  <div className="space-y-2 text-sm mt-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Medical:</span>
                      <span className="font-medium">{formatCurrency(incident.costImpact.medical)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Equipment:</span>
                      <span className="font-medium">{formatCurrency(incident.costImpact.equipment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lost Time:</span>
                      <span className="font-medium">{formatCurrency(incident.costImpact.lostTime)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-1">
                      <span className="text-gray-900 font-medium">Total:</span>
                      <span className="font-bold text-red-600">{formatCurrency(incident.costImpact.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Root Cause Analysis</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {incident.rootCause.map((cause, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-red-600 mt-0.5">•</span>
                      <span>{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Corrective Actions</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {incident.correctiveActions.map((action, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Preventive Measures</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {incident.preventiveMeasures.map((measure, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-green-600 mt-0.5">•</span>
                      <span>{measure}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Investigation Team</p>
                <div className="flex flex-wrap gap-1">
                  {incident.investigationTeam.map((member, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                      {member}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {incident.tags.map((tag, index) => (
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
                    <FileText className="w-3 h-3 mr-1" />
                    Investigation
                  </button>
                </div>
                <Link
                  href={`/marine/port-operations/safety/${incident.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Safety Training & Inspections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Safety Training */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Safety Training Programs</h2>
          <div className="space-y-4">
            {safetyTraining.map((training) => (
              <div key={training.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{training.courseName}</h3>
                  <span className="text-sm text-green-600 font-medium">{training.completionRate}%</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div>Duration: {training.duration}</div>
                  <div>Participants: {training.participants}</div>
                  <div>Next: {training.nextScheduled}</div>
                  <div>Valid: {training.certification}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Safety Inspections */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Scheduled Inspections</h2>
          <div className="space-y-4">
            {safetyInspections.map((inspection) => (
              <div key={inspection.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{inspection.inspectionType}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    inspection.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                    inspection.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {inspection.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div>Area: {inspection.area}</div>
                  <div>Inspector: {inspection.inspector}</div>
                  <div>Date: {inspection.scheduledDate}</div>
                  <div>Score: {inspection.complianceScore}%</div>
                </div>
                <div className="mt-2 text-sm">
                  <span className="text-gray-600">Findings: </span>
                  <span className="text-orange-600">{inspection.findings}</span>
                  <span className="text-gray-600 ml-2">Critical: </span>
                  <span className="text-red-600">{inspection.criticalIssues}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Safety Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Safety Management Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Active Incidents</h3>
                <p className="text-xs text-gray-500">Under investigation</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {safetyIncidents.filter(i => i.status === 'Under Investigation' || i.status === 'Investigated').length}</p>
              <p>High Severity: {safetyIncidents.filter(i => i.severity === 'High' || i.severity === 'Critical').length}</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Incident Costs</h3>
                <p className="text-xs text-gray-500">This year</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Total: {formatCurrency(safetyIncidents.reduce((sum, i) => sum + i.costImpact.total, 0))}</p>
              <p>Average: {formatCurrency(Math.round(safetyIncidents.reduce((sum, i) => sum + i.costImpact.total, 0) / safetyIncidents.length))}</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Resolved Incidents</h3>
                <p className="text-xs text-gray-500">Successfully closed</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {safetyIncidents.filter(i => i.status === 'Resolved' || i.status === 'Closed').length}</p>
              <p>Percentage: {Math.round((safetyIncidents.filter(i => i.status === 'Resolved' || i.status === 'Closed').length / safetyIncidents.length) * 100)}%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Training Compliance</h3>
                <p className="text-xs text-gray-500">Average completion</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Average: {Math.round(safetyTraining.reduce((sum, t) => sum + t.completionRate, 0) / safetyTraining.length)}%</p>
              <p>Programs: {safetyTraining.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Safety Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/marine/port-operations/safety/report"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Report Incident</h3>
            <p className="text-xs text-gray-500">New safety incident</p>
          </Link>
          <Link
            href="/marine/port-operations/safety/training"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BookOpen className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Training Programs</h3>
            <p className="text-xs text-gray-500">Safety education</p>
          </Link>
          <Link
            href="/marine/port-operations/safety/inspections"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Search className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Safety Inspections</h3>
            <p className="text-xs text-gray-500">Regular audits</p>
          </Link>
          <Link
            href="/marine/port-operations/safety/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Safety Reports</h3>
            <p className="text-xs text-gray-500">Analytics and reporting</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

