"use client";

import { useState } from "react";
import {
  Wrench,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
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
  Calendar as CalendarIcon,
  PlayCircle,
  PauseCircle,
  StopCircle,
  RotateCcw,
  CheckSquare as CheckSquareIcon
} from "lucide-react";
import Link from "next/link";

export default function ICTNetworkMaintenancePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const maintenanceStats = [
    {
      name: "Scheduled Maintenance",
      value: "24",
      change: "+3",
      changeType: "positive",
      icon: Calendar,
      description: "This month",
      status: "Active"
    },
    {
      name: "Completed Maintenance",
      value: "156",
      change: "+12",
      changeType: "positive",
      icon: CheckCircle,
      description: "This year",
      status: "Successful"
    },
    {
      name: "Upcoming Maintenance",
      value: "8",
      change: "+2",
      changeType: "neutral",
      icon: Clock,
      description: "Next 7 days",
      status: "Planned"
    },
    {
      name: "Maintenance Windows",
      value: "6",
      change: "0",
      changeType: "neutral",
      icon: Wrench,
      description: "Monthly slots",
      status: "Optimal"
    }
  ];

  const maintenanceTasks = [
    {
      id: "MT-001",
      title: "Core Router Firmware Update",
      type: "Firmware Update",
      status: "Scheduled",
      priority: "High",
      scheduledDate: "2024-12-15 22:00:00",
      duration: "4 hours",
      location: "Data Center A",
      assignedTo: ["Network Team Lead", "Senior Network Engineer"],
      description: "Update firmware on core routers to latest stable version with security patches",
      affectedSystems: [
        "Core Router ASR-1006 (Primary)",
        "Core Router ASR-1006 (Secondary)",
        "Distribution Switches",
        "Firewall Cluster"
      ],
      impact: {
        downtime: "30 minutes",
        affectedUsers: 0,
        criticalServices: ["All Network Services"],
        backupPlan: "Automatic failover to secondary router"
      },
      prerequisites: [
        "Backup current configurations",
        "Test failover procedure",
        "Schedule maintenance window",
        "Notify stakeholders"
      ],
      steps: [
        { step: 1, description: "Verify backup configurations", status: "Pending" },
        { step: 2, description: "Test failover to secondary router", status: "Pending" },
        { step: 3, description: "Update primary router firmware", status: "Pending" },
        { step: 4, description: "Verify primary router functionality", status: "Pending" },
        { step: 5, description: "Failover back to primary router", status: "Pending" },
        { step: 6, description: "Update secondary router firmware", status: "Pending" },
        { step: 7, description: "Final verification and documentation", status: "Pending" }
      ],
      resources: {
        required: ["Firmware Files", "Configuration Backup", "Test Equipment"],
        tools: ["SSH Client", "Network Monitoring Tools", "Configuration Management"],
        spareParts: ["None required"]
      },
      approval: {
        required: true,
        approvedBy: "ICT Director",
        approvedDate: "2024-12-08",
        approvalNotes: "Approved with condition for minimal downtime"
      },
      communication: {
        stakeholders: ["ICT Director", "Department Heads", "Network Team"],
        notificationSent: true,
        lastUpdate: "2024-12-10 10:00:00",
        nextUpdate: "2024-12-14 18:00:00"
      },
      postMaintenance: {
        verification: ["Connectivity tests", "Performance monitoring", "Service validation"],
        rollbackPlan: "Revert to previous firmware version if issues detected",
        documentation: "Update network documentation and change logs"
      },
      tags: ["firmware", "core-router", "high-priority", "scheduled"]
    },
    {
      id: "MT-002",
      title: "Server Room UPS Battery Replacement",
      type: "Hardware Maintenance",
      status: "In Progress",
      priority: "Critical",
      scheduledDate: "2024-12-12 14:00:00",
      duration: "2 hours",
      location: "Data Center A - Server Room",
      assignedTo: ["Infrastructure Team", "Facilities Team"],
      description: "Replace aging UPS batteries to ensure continuous power supply to critical servers",
      affectedSystems: [
        "Primary UPS System",
        "Backup UPS System",
        "Critical Servers",
        "Network Equipment"
      ],
      impact: {
        downtime: "15 minutes",
        affectedUsers: 0,
        criticalServices: ["All Services"],
        backupPlan: "Generator backup available"
      },
      prerequisites: [
        "Order replacement batteries",
        "Schedule power transfer test",
        "Coordinate with facilities",
        "Prepare emergency procedures"
      ],
      steps: [
        { step: 1, description: "Verify generator functionality", status: "Completed" },
        { step: 2, description: "Transfer load to generator", status: "Completed" },
        { step: 3, description: "Disconnect old batteries", status: "In Progress" },
        { step: 4, description: "Install new batteries", status: "Pending" },
        { step: 5, description: "Test battery charging", status: "Pending" },
        { step: 6, description: "Transfer load back to UPS", status: "Pending" },
        { step: 7, description: "Verify system functionality", status: "Pending" }
      ],
      resources: {
        required: ["New Battery Units (12)", "Testing Equipment", "Safety Equipment"],
        tools: ["Multimeter", "Battery Tester", "Safety Gear"],
        spareParts: ["Replacement Batteries"]
      },
      approval: {
        required: true,
        approvedBy: "ICT Director",
        approvedDate: "2024-12-05",
        approvalNotes: "Critical for business continuity"
      },
      communication: {
        stakeholders: ["ICT Director", "Facilities Manager", "Department Heads"],
        notificationSent: true,
        lastUpdate: "2024-12-10 16:30:00",
        nextUpdate: "2024-12-12 12:00:00"
      },
      postMaintenance: {
        verification: ["Battery capacity tests", "Load transfer tests", "Runtime tests"],
        rollbackPlan: "Keep old batteries as backup if issues detected",
        documentation: "Update maintenance logs and battery replacement records"
      },
      tags: ["hardware", "ups", "batteries", "critical", "in-progress"]
    },
    {
      id: "MT-003",
      title: "Network Cable Infrastructure Audit",
      type: "Infrastructure Audit",
      status: "Completed",
      priority: "Medium",
      scheduledDate: "2024-12-08 09:00:00",
      duration: "6 hours",
      location: "Building A - All Floors",
      assignedTo: ["Network Team", "Cable Technicians"],
      description: "Comprehensive audit of network cable infrastructure and documentation update",
      affectedSystems: [
        "Network Cabling",
        "Patch Panels",
        "Wall Jacks",
        "Cable Management"
      ],
      impact: {
        downtime: "0 minutes",
        affectedUsers: 0,
        criticalServices: ["None"],
        backupPlan: "Non-disruptive maintenance"
      },
      prerequisites: [
        "Gather existing documentation",
        "Prepare audit checklist",
        "Schedule floor-by-floor access",
        "Coordinate with building management"
      ],
      steps: [
        { step: 1, description: "Review existing documentation", status: "Completed" },
        { step: 2, description: "Audit ground floor cabling", status: "Completed" },
        { step: 3, description: "Audit first floor cabling", status: "Completed" },
        { step: 4, description: "Audit second floor cabling", status: "Completed" },
        { step: 5, description: "Audit third floor cabling", status: "Completed" },
        { step: 6, description: "Update network documentation", status: "Completed" },
        { step: 7, description: "Generate audit report", status: "Completed" }
      ],
      resources: {
        required: ["Cable Tester", "Documentation Tools", "Ladders"],
        tools: ["Cable Certifier", "Documentation Software", "Digital Camera"],
        spareParts: ["Cable Labels", "Patch Cables"]
      },
      approval: {
        required: false,
        approvedBy: "Network Manager",
        approvedDate: "2024-12-06",
        approvalNotes: "Standard maintenance approval"
      },
      communication: {
        stakeholders: ["Network Team", "Building Management"],
        notificationSent: false,
        lastUpdate: "2024-12-08 15:30:00",
        nextUpdate: null
      },
      postMaintenance: {
        verification: ["Documentation accuracy", "Cable labeling", "Performance tests"],
        rollbackPlan: "Not applicable - audit only",
        documentation: "Updated network infrastructure documentation"
      },
      tags: ["audit", "cabling", "documentation", "completed"]
    },
    {
      id: "MT-004",
      title: "Security Policy Update and Implementation",
      type: "Security Update",
      status: "Scheduled",
      priority: "High",
      scheduledDate: "2024-12-20 10:00:00",
      duration: "3 hours",
      location: "All Network Devices",
      assignedTo: ["Security Team", "Network Team"],
      description: "Update firewall rules and security policies based on latest threat intelligence",
      affectedSystems: [
        "Firewall Cluster",
        "Security Gateways",
        "Access Control Lists",
        "Security Monitoring"
      ],
      impact: {
        downtime: "5 minutes",
        affectedUsers: 0,
        criticalServices: ["Internet Access", "External Connectivity"],
        backupPlan: "Secondary firewall failover"
      },
      prerequisites: [
        "Review latest threat intelligence",
        "Test new security rules",
        "Prepare rollback procedures",
        "Schedule change window"
      ],
      steps: [
        { step: 1, description: "Review threat intelligence reports", status: "Completed" },
        { step: 2, description: "Test new security rules in lab", status: "Completed" },
        { step: 3, description: "Create firewall rule backup", status: "Pending" },
        { step: 4, description: "Implement new security policies", status: "Pending" },
        { step: 5, description: "Verify policy implementation", status: "Pending" },
        { step: 6, description: "Monitor for false positives", status: "Pending" },
        { step: 7, description: "Update security documentation", status: "Pending" }
      ],
      resources: {
        required: ["New Security Rules", "Testing Environment", "Documentation"],
        tools: ["Firewall Management Console", "Security Testing Tools", "Log Analysis"],
        spareParts: ["None required"]
      },
      approval: {
        required: true,
        approvedBy: "CISO",
        approvedDate: "2024-12-09",
        approvalNotes: "Required for compliance with latest security standards"
      },
      communication: {
        stakeholders: ["CISO", "ICT Director", "Security Team", "Network Team"],
        notificationSent: true,
        lastUpdate: "2024-12-10 14:00:00",
        nextUpdate: "2024-12-19 16:00:00"
      },
      postMaintenance: {
        verification: ["Security rule validation", "Traffic monitoring", "False positive analysis"],
        rollbackPlan: "Revert to previous security policies if issues detected",
        documentation: "Update security policy documentation and change logs"
      },
      tags: ["security", "firewall", "policies", "high-priority", "scheduled"]
    },
    {
      id: "MT-005",
      title: "Wireless Access Point Firmware Upgrade",
      type: "Firmware Update",
      status: "Pending",
      priority: "Low",
      scheduledDate: "2024-12-25 22:00:00",
      duration: "2 hours",
      location: "All Buildings",
      assignedTo: ["Wireless Team"],
      description: "Upgrade wireless access point firmware to improve performance and security",
      affectedSystems: [
        "Wireless Access Points (150 units)",
        "Wireless Controllers",
        "Wireless Management System"
      ],
      impact: {
        downtime: "10 minutes per access point",
        affectedUsers: 0,
        criticalServices: ["WiFi Services"],
        backupPlan: "Staggered upgrade with redundancy"
      },
      prerequisites: [
        "Download latest firmware",
        "Test firmware in lab environment",
        "Schedule off-peak hours",
        "Prepare rollback plan"
      ],
      steps: [
        { step: 1, description: "Download and verify firmware files", status: "Pending" },
        { step: 2, description: "Test firmware in lab environment", status: "Pending" },
        { step: 3, description: "Create wireless configuration backup", status: "Pending" },
        { step: 4, description: "Upgrade access points in groups", status: "Pending" },
        { step: 5, description: "Verify wireless functionality", status: "Pending" },
        { step: 6, description: "Monitor for connectivity issues", status: "Pending" },
        { step: 7, description: "Update wireless documentation", status: "Pending" }
      ],
      resources: {
        required: ["Firmware Files", "Configuration Backup", "Testing Tools"],
        tools: ["Wireless Management Console", "Network Monitoring", "Speed Test Tools"],
        spareParts: ["None required"]
      },
      approval: {
        required: false,
        approvedBy: "Network Manager",
        approvedDate: "2024-12-07",
        approvalNotes: "Standard firmware maintenance"
      },
      communication: {
        stakeholders: ["Network Team", "Wireless Users"],
        notificationSent: false,
        lastUpdate: "2024-12-07 11:00:00",
        nextUpdate: "2024-12-24 18:00:00"
      },
      postMaintenance: {
        verification: ["Wireless connectivity tests", "Speed tests", "Client association tests"],
        rollbackPlan: "Revert to previous firmware version per access point",
        documentation: "Update wireless infrastructure documentation"
      },
      tags: ["wireless", "firmware", "access-points", "pending"]
    }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "scheduled", label: "Scheduled" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "pending", label: "Pending" },
    { value: "cancelled", label: "Cancelled" }
  ];

  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: "firmware_update", label: "Firmware Update" },
    { value: "hardware_maintenance", label: "Hardware Maintenance" },
    { value: "infrastructure_audit", label: "Infrastructure Audit" },
    { value: "security_update", label: "Security Update" },
    { value: "software_update", label: "Software Update" }
  ];

  const filteredTasks = maintenanceTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.assignedTo.some(assignee => assignee.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || 
                         task.status.toLowerCase().replace(" ", "_") === statusFilter;
    const matchesType = typeFilter === "all" || 
                       task.type.toLowerCase().replace(" ", "_") === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const statusColorMap = {
    'Scheduled': 'bg-blue-100 text-blue-800',
    'In Progress': 'bg-yellow-100 text-yellow-800',
    'Completed': 'bg-green-100 text-green-800',
    'Pending': 'bg-gray-100 text-gray-800',
    'Cancelled': 'bg-red-100 text-red-800'
  };

  const typeColorMap = {
    'Firmware Update': 'bg-purple-100 text-purple-800',
    'Hardware Maintenance': 'bg-orange-100 text-orange-800',
    'Infrastructure Audit': 'bg-blue-100 text-blue-800',
    'Security Update': 'bg-red-100 text-red-800',
    'Software Update': 'bg-green-100 text-green-800'
  };

  const priorityColorMap = {
    'Critical': 'bg-red-100 text-red-800',
    'High': 'bg-orange-100 text-orange-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-green-100 text-green-800'
  };

  const stepStatusColorMap = {
    'Completed': 'bg-green-100 text-green-800',
    'In Progress': 'bg-blue-100 text-blue-800',
    'Pending': 'bg-gray-100 text-gray-800'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Network Maintenance</h1>
          <p className="text-gray-600">Schedule, track, and manage network maintenance activities</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/ict/network/maintenance/schedule"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Schedule Maintenance
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Export Schedule
          </button>
        </div>
      </div>

      {/* Maintenance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {maintenanceStats.map((stat) => (
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
                stat.status === 'Active' ? 'bg-blue-100 text-blue-800' :
                stat.status === 'Successful' ? 'bg-green-100 text-green-800' :
                stat.status === 'Planned' ? 'bg-yellow-100 text-yellow-800' :
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
                placeholder="Search maintenance tasks by title, description, location, or assignee..."
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

      {/* Maintenance Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTasks.map((task) => (
          <div key={task.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Wrench className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                  <span className="text-sm text-gray-500">#{task.id}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[task.status as keyof typeof statusColorMap]}`}>
                    {task.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeColorMap[task.type as keyof typeof typeColorMap]}`}>
                    {task.type}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColorMap[task.priority as keyof typeof priorityColorMap]}`}>
                    {task.priority}
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
                  <PlayCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Scheduled Date</p>
                  <p className="text-sm text-gray-600">{task.scheduledDate}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Duration</p>
                  <p className="text-sm text-gray-600">{task.duration}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Location</p>
                  <p className="text-sm text-gray-600">{task.location}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Assigned To</p>
                  <p className="text-sm text-gray-600">{task.assignedTo.join(", ")}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Affected Systems:</p>
                <div className="flex flex-wrap gap-1">
                  {task.affectedSystems.map((system, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                      {system}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Impact Assessment:</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Expected Downtime</p>
                    <p className="text-gray-900">{task.impact.downtime}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Affected Users</p>
                    <p className="text-gray-900">{task.impact.affectedUsers}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Critical Services</p>
                    <p className="text-gray-900">{task.impact.criticalServices.join(", ")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Backup Plan</p>
                    <p className="text-gray-900">{task.impact.backupPlan}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Maintenance Steps:</p>
                <div className="space-y-2">
                  {task.steps.map((step, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium">
                          {step.step}
                        </span>
                        <span className="text-gray-600">{step.description}</span>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${stepStatusColorMap[step.status as keyof typeof stepStatusColorMap]}`}>
                        {step.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Prerequisites:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {task.prerequisites.map((prereq, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-green-600 mt-0.5">•</span>
                      <span>{prereq}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Resources Required:</p>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Required Items</p>
                    <p className="text-gray-900">{task.resources.required.join(", ")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Tools</p>
                    <p className="text-gray-900">{task.resources.tools.join(", ")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Spare Parts</p>
                    <p className="text-gray-900">{task.resources.spareParts.join(", ")}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Approval & Communication:</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Approval Required</p>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      task.approval.required ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {task.approval.required ? 'Required' : 'Not Required'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Approved By</p>
                    <p className="text-gray-900">{task.approval.approvedBy}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Notification Sent</p>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      task.communication.notificationSent ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {task.communication.notificationSent ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Last Update</p>
                    <p className="text-gray-900">{task.communication.lastUpdate}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Post-Maintenance:</p>
                <div className="text-sm">
                  <p className="text-xs text-gray-500">Verification Steps</p>
                  <p className="text-gray-900 mb-2">{task.postMaintenance.verification.join(", ")}</p>
                  <p className="text-xs text-gray-500">Rollback Plan</p>
                  <p className="text-gray-900">{task.postMaintenance.rollbackPlan}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                    <Eye className="w-3 h-3 mr-1" />
                    View Details
                  </button>
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                    <Edit className="w-3 h-3 mr-1" />
                    Update
                  </button>
                </div>
                <Link
                  href={`/ict/network/maintenance/${task.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Maintenance Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Maintenance Management Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Scheduled Tasks</h3>
                <p className="text-xs text-gray-500">Planned maintenance</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {maintenanceTasks.filter(t => t.status === 'Scheduled').length}</p>
              <p>Percentage: {Math.round((maintenanceTasks.filter(t => t.status === 'Scheduled').length / maintenanceTasks.length) * 100)}%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">In Progress</h3>
                <p className="text-xs text-gray-500">Active maintenance</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {maintenanceTasks.filter(t => t.status === 'In Progress').length}</p>
              <p>Critical: {maintenanceTasks.filter(t => t.status === 'In Progress' && t.priority === 'Critical').length}</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Completed Tasks</h3>
                <p className="text-xs text-gray-500">Successfully finished</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {maintenanceTasks.filter(t => t.status === 'Completed').length}</p>
              <p>On Time: {Math.round((maintenanceTasks.filter(t => t.status === 'Completed').length / maintenanceTasks.filter(t => t.status === 'Completed' || t.status === 'Scheduled').length) * 100)}%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Wrench className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Average Duration</h3>
                <p className="text-xs text-gray-500">Per maintenance task</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Duration: 3.5 hours</p>
              <p>Downtime: 25 minutes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/ict/network/maintenance/schedule"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Schedule Task</h3>
            <p className="text-xs text-gray-500">New maintenance task</p>
          </Link>
          <Link
            href="/ict/network/maintenance/calendar"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Calendar className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Maintenance Calendar</h3>
            <p className="text-xs text-gray-500">View schedule</p>
          </Link>
          <Link
            href="/ict/network/maintenance/templates"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Task Templates</h3>
            <p className="text-xs text-gray-500">Pre-built templates</p>
          </Link>
          <Link
            href="/ict/network/maintenance/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Maintenance Reports</h3>
            <p className="text-xs text-gray-500">Generate reports</p>
          </Link>
        </div>
      </div>
    </div>
  );
}