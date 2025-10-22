"use client";

import {
  Anchor,
  Ship,
  Container,
  Clock,
  Users,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Activity,
  Shield,
  Globe,
  MapPin,
  Calendar,
  DollarSign,
  Target,
  Award,
  FileText,
  Eye,
  Settings,
  Zap,
  Waves,
  Compass,
  Wind,
  Thermometer,
  Gauge,
  Navigation,
  Radio,
  Camera,
  Download,
  Upload,
  RefreshCw,
  Play,
  Pause,
  RotateCcw
} from "lucide-react";
import Link from "next/link";

export default function PortOperationsDashboard() {
  const stats = [
    {
      name: "Vessel Turnaround Time",
      value: "18.5 hrs",
      change: "-1.2 hrs",
      changeType: "positive",
      icon: Clock,
      description: "Average processing time",
      href: "/marine/port-operations/turnaround"
    },
    {
      name: "Cargo Throughput",
      value: "2.4M TEU",
      change: "+8%",
      changeType: "positive",
      icon: Container,
      description: "Year to date",
      href: "/marine/port-operations/throughput"
    },
    {
      name: "Berth Utilization",
      value: "87%",
      change: "+3%",
      changeType: "positive",
      icon: Anchor,
      description: "Port capacity usage",
      href: "/marine/port-operations/berths"
    },
    {
      name: "Safety Incidents",
      value: "2",
      change: "-3",
      changeType: "negative",
      icon: Shield,
      description: "This month",
      href: "/marine/port-operations/safety"
    }
  ];

  const portOperations = [
    {
      port: "Lagos Port Complex",
      vesselsInPort: 12,
      vesselsWaiting: 3,
      berthsOccupied: 8,
      berthsAvailable: 4,
      cargoHandled: "45,000 TEU",
      efficiency: "98%",
      status: "Operational",
      weather: "Clear",
      windSpeed: "12 knots",
      tide: "High"
    },
    {
      port: "Tin Can Island Port",
      vesselsInPort: 8,
      vesselsWaiting: 2,
      berthsOccupied: 6,
      berthsAvailable: 2,
      cargoHandled: "32,000 TEU",
      efficiency: "95%",
      status: "Operational",
      weather: "Partly Cloudy",
      windSpeed: "8 knots",
      tide: "Low"
    },
    {
      port: "Onne Port",
      vesselsInPort: 6,
      vesselsWaiting: 1,
      berthsOccupied: 4,
      berthsAvailable: 2,
      cargoHandled: "28,000 TEU",
      efficiency: "97%",
      status: "Operational",
      weather: "Clear",
      windSpeed: "15 knots",
      tide: "High"
    },
    {
      port: "Calabar Port",
      vesselsInPort: 2,
      vesselsWaiting: 0,
      berthsOccupied: 1,
      berthsAvailable: 3,
      cargoHandled: "8,000 TEU",
      efficiency: "85%",
      status: "Maintenance",
      weather: "Rainy",
      windSpeed: "20 knots",
      tide: "Low"
    }
  ];

  const vesselOperations = [
    {
      vesselName: "MV NPA Express",
      vesselType: "Container Ship",
      flag: "Nigeria",
      currentLocation: "Lagos Port Complex - Berth 3",
      status: "Loading",
      eta: "2 hours",
      cargo: "2,500 TEU",
      destination: "Rotterdam",
      captain: "Capt. John Okonkwo",
      pilot: "Pilot Adebayo",
      tugboats: 2
    },
    {
      vesselName: "MV Atlantic Star",
      vesselType: "Bulk Carrier",
      flag: "Liberia",
      currentLocation: "Tin Can Island Port - Berth 1",
      status: "Unloading",
      eta: "4 hours",
      cargo: "45,000 MT Coal",
      destination: "Lagos Port Complex",
      captain: "Capt. Maria Santos",
      pilot: "Pilot Williams",
      tugboats: 1
    },
    {
      vesselName: "MV West Africa",
      vesselType: "Tanker",
      flag: "Panama",
      currentLocation: "Onne Port - Berth 2",
      status: "Anchored",
      eta: "6 hours",
      cargo: "80,000 MT Crude Oil",
      destination: "Houston",
      captain: "Capt. Ahmed Hassan",
      pilot: "Pilot Okafor",
      tugboats: 3
    },
    {
      vesselName: "MV Calabar Pride",
      vesselType: "General Cargo",
      flag: "Nigeria",
      currentLocation: "Calabar Port - Berth 1",
      status: "Maintenance",
      eta: "12 hours",
      cargo: "5,000 MT General",
      destination: "Douala",
      captain: "Capt. Grace Williams",
      pilot: "Pilot Johnson",
      tugboats: 1
    }
  ];

  const cargoOperations = [
    {
      operation: "Container Handling",
      volume: "1.2M TEU",
      efficiency: "97%",
      equipment: "12 Gantry Cranes",
      operators: 24,
      status: "Optimal",
      trend: "up"
    },
    {
      operation: "Bulk Cargo",
      volume: "850K MT",
      efficiency: "94%",
      equipment: "8 Conveyor Systems",
      operators: 16,
      status: "Good",
      trend: "up"
    },
    {
      operation: "Liquid Cargo",
      volume: "320K MT",
      efficiency: "96%",
      equipment: "6 Loading Arms",
      operators: 12,
      status: "Optimal",
      trend: "stable"
    },
    {
      operation: "General Cargo",
      volume: "180K MT",
      efficiency: "92%",
      equipment: "15 Forklifts",
      operators: 30,
      status: "Good",
      trend: "up"
    }
  ];

  const equipmentStatus = [
    {
      equipment: "Gantry Crane #1",
      type: "Container Crane",
      status: "Operational",
      utilization: "85%",
      lastMaintenance: "1 week ago",
      nextMaintenance: "3 weeks",
      operator: "Operator A",
      location: "Lagos Port Complex"
    },
    {
      equipment: "Gantry Crane #2",
      type: "Container Crane",
      status: "Operational",
      utilization: "92%",
      lastMaintenance: "2 weeks ago",
      nextMaintenance: "2 weeks",
      operator: "Operator B",
      location: "Lagos Port Complex"
    },
    {
      equipment: "Conveyor System A",
      type: "Bulk Handling",
      status: "Maintenance",
      utilization: "0%",
      lastMaintenance: "In Progress",
      nextMaintenance: "N/A",
      operator: "N/A",
      location: "Tin Can Island Port"
    },
    {
      equipment: "Loading Arm #1",
      type: "Liquid Handling",
      status: "Operational",
      utilization: "78%",
      lastMaintenance: "3 days ago",
      nextMaintenance: "4 weeks",
      operator: "Operator C",
      location: "Onne Port"
    }
  ];

  const safetyMetrics = [
    {
      metric: "Days Without Incident",
      value: "45",
      trend: "up",
      status: "Excellent",
      description: "Current safety streak"
    },
    {
      metric: "Safety Training Completion",
      value: "98%",
      trend: "up",
      status: "Excellent",
      description: "Staff compliance"
    },
    {
      metric: "Equipment Inspection",
      value: "100%",
      trend: "stable",
      status: "Excellent",
      description: "Monthly inspections"
    },
    {
      metric: "Emergency Response Time",
      value: "8.5 min",
      trend: "down",
      status: "Good",
      description: "Average response"
    }
  ];

  const environmentalData = [
    {
      parameter: "Water Quality",
      value: "Excellent",
      trend: "stable",
      lastTest: "2 days ago",
      compliance: "100%"
    },
    {
      parameter: "Air Quality",
      value: "Good",
      trend: "up",
      lastTest: "1 day ago",
      compliance: "98%"
    },
    {
      parameter: "Noise Levels",
      value: "Within Limits",
      trend: "stable",
      lastTest: "3 days ago",
      compliance: "95%"
    },
    {
      parameter: "Waste Management",
      value: "Compliant",
      trend: "up",
      lastTest: "1 week ago",
      compliance: "100%"
    }
  ];

  const recentOperations = [
    {
      id: 1,
      operation: "Vessel Berthing",
      vessel: "MV NPA Express",
      port: "Lagos Port Complex",
      time: "2 hours ago",
      status: "Completed",
      duration: "45 minutes",
      operator: "Pilot Adebayo"
    },
    {
      id: 2,
      operation: "Cargo Loading",
      vessel: "MV Atlantic Star",
      port: "Tin Can Island Port",
      time: "4 hours ago",
      status: "In Progress",
      duration: "3 hours",
      operator: "Crane Operator B"
    },
    {
      id: 3,
      operation: "Safety Inspection",
      vessel: "MV West Africa",
      port: "Onne Port",
      time: "6 hours ago",
      status: "Completed",
      duration: "2 hours",
      operator: "Safety Inspector"
    },
    {
      id: 4,
      operation: "Pilotage Service",
      vessel: "MV Calabar Pride",
      port: "Calabar Port",
      time: "8 hours ago",
      status: "Completed",
      duration: "1.5 hours",
      operator: "Pilot Johnson"
    }
  ];

  const performanceMetrics = [
    {
      metric: "Berth Productivity",
      value: "95 TEU/hr",
      trend: "up",
      target: "90 TEU/hr",
      status: "Above Target",
      period: "Average per berth"
    },
    {
      metric: "Crane Productivity",
      value: "28 moves/hr",
      trend: "up",
      target: "25 moves/hr",
      status: "Above Target",
      period: "Average per crane"
    },
    {
      metric: "Vessel Productivity",
      value: "1,250 TEU/day",
      trend: "up",
      target: "1,200 TEU/day",
      status: "Above Target",
      period: "Average per vessel"
    },
    {
      metric: "Labor Productivity",
      value: "42 TEU/operator",
      trend: "up",
      target: "40 TEU/operator",
      status: "Above Target",
      period: "Daily average"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Port Operations Department</h1>
          <p className="text-gray-600">Vessel management, cargo handling, and port efficiency operations</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/marine/port-operations/monitoring"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Activity className="w-4 h-4 mr-2" />
            Operations Center
          </Link>
          <Link
            href="/marine/port-operations/vessels"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Ship className="w-4 h-4 mr-2" />
            Vessel Management
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.name} stat={stat} />
        ))}
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Performance Metrics</h2>
          <Link
            href="/marine/port-operations/performance"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View detailed metrics
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {performanceMetrics.map((metric, index) => (
            <PerformanceMetricCard key={index} metric={metric} />
          ))}
        </div>
      </div>

      {/* Port Operations Status */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Port Operations Status</h2>
          <Link
            href="/marine/port-operations/ports"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all ports
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Port</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vessels</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Berths</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Efficiency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weather</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {portOperations.map((port, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {port.port}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      port.status === 'Operational' ? 'bg-green-100 text-green-800' :
                      port.status === 'Maintenance' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {port.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {port.vesselsInPort} in port, {port.vesselsWaiting} waiting
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {port.berthsOccupied}/{port.berthsOccupied + port.berthsAvailable} occupied
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {port.cargoHandled}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {port.efficiency}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {port.weather} | {port.windSpeed} | {port.tide}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vessel Operations */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Vessel Operations</h2>
            <Link
              href="/marine/port-operations/vessels"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Manage vessels
            </Link>
          </div>
          <div className="space-y-4">
            {vesselOperations.map((vessel, index) => (
              <VesselOperationItem key={index} vessel={vessel} />
            ))}
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
              Manage cargo
            </Link>
          </div>
          <div className="space-y-4">
            {cargoOperations.map((operation, index) => (
              <CargoOperationItem key={index} operation={operation} />
            ))}
          </div>
        </div>
      </div>

      {/* Equipment Status */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Equipment Status</h2>
          <Link
            href="/marine/port-operations/equipment"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Manage equipment
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Equipment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilization</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operator</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Maintenance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {equipmentStatus.map((equipment, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {equipment.equipment}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {equipment.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      equipment.status === 'Operational' ? 'bg-green-100 text-green-800' :
                      equipment.status === 'Maintenance' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {equipment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {equipment.utilization}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {equipment.operator}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {equipment.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Next: {equipment.nextMaintenance}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safety & Environmental */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Safety Metrics */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Safety Metrics</h2>
            <Link
              href="/marine/port-operations/safety"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View safety dashboard
            </Link>
          </div>
          <div className="space-y-4">
            {safetyMetrics.map((metric, index) => (
              <SafetyMetricItem key={index} metric={metric} />
            ))}
          </div>
        </div>

        {/* Environmental Data */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Environmental Monitoring</h2>
            <Link
              href="/marine/port-operations/environment"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View environmental data
            </Link>
          </div>
          <div className="space-y-4">
            {environmentalData.map((data, index) => (
              <EnvironmentalItem key={index} data={data} />
            ))}
          </div>
        </div>
      </div>

      {/* Recent Operations */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Recent Operations</h2>
          <Link
            href="/marine/port-operations/operations"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View operation logs
          </Link>
        </div>
        <div className="space-y-4">
          {recentOperations.map((operation) => (
            <OperationItem key={operation.id} operation={operation} />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Port Operations Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickActionButton
            title="Vessel Management"
            description="Track and manage vessels"
            icon={Ship}
            href="/marine/port-operations/vessels"
            color="bg-blue-50 text-blue-600 hover:bg-blue-100"
          />
          <QuickActionButton
            title="Cargo Operations"
            description="Handle cargo operations"
            icon={Container}
            href="/marine/port-operations/cargo"
            color="bg-green-50 text-green-600 hover:bg-green-100"
          />
          <QuickActionButton
            title="Equipment Management"
            description="Monitor port equipment"
            icon={Settings}
            href="/marine/port-operations/equipment"
            color="bg-purple-50 text-purple-600 hover:bg-purple-100"
          />
          <QuickActionButton
            title="Safety Management"
            description="Safety protocols & incidents"
            icon={Shield}
            href="/marine/port-operations/safety"
            color="bg-red-50 text-red-600 hover:bg-red-100"
          />
          <QuickActionButton
            title="Performance Analytics"
            description="Port performance insights"
            icon={BarChart3}
            href="/marine/port-operations/analytics"
            color="bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
          />
          <QuickActionButton
            title="Environmental"
            description="Environmental monitoring"
            icon={Globe}
            href="/marine/port-operations/environment"
            color="bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
          />
          <QuickActionButton
            title="Pilotage Services"
            description="Vessel pilotage operations"
            icon={Navigation}
            href="/marine/port-operations/pilotage"
            color="bg-pink-50 text-pink-600 hover:bg-pink-100"
          />
          <QuickActionButton
            title="Berth Management"
            description="Berth allocation & scheduling"
            icon={Anchor}
            href="/marine/port-operations/berths"
            color="bg-gray-50 text-gray-600 hover:bg-gray-100"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ stat }: { stat: any }) {
  const Icon = stat.icon;
  const changeColorMap = {
    positive: "text-green-600",
    negative: "text-red-600",
    warning: "text-yellow-600",
    neutral: "text-gray-600"
  };
  const changeColor = changeColorMap[stat.changeType as keyof typeof changeColorMap] || "text-gray-600";

  return (
    <Link href={stat.href} className="block">
      <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{stat.name}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.description}</p>
          </div>
          <Icon className="h-8 w-8 text-gray-400" />
        </div>
        <div className="mt-4 flex items-center">
          <span className={`text-sm font-medium ${changeColor}`}>{stat.change}</span>
        </div>
      </div>
    </Link>
  );
}

function PerformanceMetricCard({ metric }: { metric: any }) {
  const statusColorMap = {
    'Above Target': 'bg-green-100 text-green-800',
    'Below Target': 'bg-blue-100 text-blue-800',
    'On Target': 'bg-yellow-100 text-yellow-800',
    'Off Target': 'bg-red-100 text-red-800'
  };
  const statusColor = statusColorMap[metric.status as keyof typeof statusColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-900">{metric.metric}</h4>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
          {metric.status}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</p>
      <p className="text-xs text-gray-500">Target: {metric.target}</p>
      <p className="text-xs text-gray-400">{metric.period}</p>
    </div>
  );
}

function VesselOperationItem({ vessel }: { vessel: any }) {
  const statusColorMap = {
    'Loading': 'bg-blue-100 text-blue-800',
    'Unloading': 'bg-green-100 text-green-800',
    'Anchored': 'bg-yellow-100 text-yellow-800',
    'Maintenance': 'bg-orange-100 text-orange-800',
    'In Transit': 'bg-purple-100 text-purple-800'
  };
  const statusColor = statusColorMap[vessel.status as keyof typeof statusColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Ship className="w-4 h-4 text-blue-600" />
            <h4 className="text-sm font-medium text-gray-900">{vessel.vesselName}</h4>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
              {vessel.status}
            </span>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Type: {vessel.vesselType} | Flag: {vessel.flag}</p>
            <p>Location: {vessel.currentLocation}</p>
            <p>Cargo: {vessel.cargo} | Destination: {vessel.destination}</p>
            <p>Captain: {vessel.captain} | Pilot: {vessel.pilot}</p>
            <p>ETA: {vessel.eta} | Tugboats: {vessel.tugboats}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CargoOperationItem({ operation }: { operation: any }) {
  const statusColorMap = {
    'Optimal': 'bg-green-100 text-green-800',
    'Good': 'bg-blue-100 text-blue-800',
    'Fair': 'bg-yellow-100 text-yellow-800',
    'Poor': 'bg-red-100 text-red-800'
  };
  const statusColor = statusColorMap[operation.status as keyof typeof statusColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">{operation.operation}</h4>
          <div className="text-sm text-gray-600 space-y-1 mt-2">
            <p>Volume: {operation.volume}</p>
            <p>Equipment: {operation.equipment}</p>
            <p>Operators: {operation.operators}</p>
            <p>Efficiency: {operation.efficiency}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
            {operation.status}
          </span>
          <p className="text-xs text-gray-500 mt-1">
            {operation.trend === 'up' ? '↗' : operation.trend === 'down' ? '↘' : '→'}
          </p>
        </div>
      </div>
    </div>
  );
}

function SafetyMetricItem({ metric }: { metric: any }) {
  const statusColorMap = {
    'Excellent': 'bg-green-100 text-green-800',
    'Good': 'bg-blue-100 text-blue-800',
    'Fair': 'bg-yellow-100 text-yellow-800',
    'Poor': 'bg-red-100 text-red-800'
  };
  const statusColor = statusColorMap[metric.status as keyof typeof statusColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div>
        <h4 className="text-sm font-medium text-gray-900">{metric.metric}</h4>
        <p className="text-xs text-gray-500">{metric.description}</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold text-gray-900">{metric.value}</p>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
          {metric.status}
        </span>
      </div>
    </div>
  );
}

function EnvironmentalItem({ data }: { data: any }) {
  const statusColorMap = {
    'Excellent': 'bg-green-100 text-green-800',
    'Good': 'bg-blue-100 text-blue-800',
    'Within Limits': 'bg-yellow-100 text-yellow-800',
    'Compliant': 'bg-green-100 text-green-800'
  };
  const statusColor = statusColorMap[data.value as keyof typeof statusColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div>
        <h4 className="text-sm font-medium text-gray-900">{data.parameter}</h4>
        <p className="text-xs text-gray-500">Last test: {data.lastTest}</p>
      </div>
      <div className="text-right">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
          {data.value}
        </span>
        <p className="text-xs text-gray-500 mt-1">Compliance: {data.compliance}</p>
      </div>
    </div>
  );
}

function OperationItem({ operation }: { operation: any }) {
  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <Activity className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-900">{operation.operation}</h4>
          <p className="text-xs text-gray-500">{operation.vessel} at {operation.port}</p>
          <p className="text-xs text-gray-400">Duration: {operation.duration} | Operator: {operation.operator}</p>
        </div>
      </div>
      <div className="text-right">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          operation.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {operation.status}
        </span>
        <p className="text-xs text-gray-500 mt-1">{operation.time}</p>
      </div>
    </div>
  );
}

function QuickActionButton({
  title,
  description,
  icon: Icon,
  href,
  color
}: {
  title: string;
  description: string;
  icon: any;
  href: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className={`p-4 rounded-lg transition-colors ${color}`}
    >
      <Icon className="h-8 w-8 mb-3" />
      <h3 className="font-medium text-sm">{title}</h3>
      <p className="text-xs opacity-75">{description}</p>
    </Link>
  );
}
