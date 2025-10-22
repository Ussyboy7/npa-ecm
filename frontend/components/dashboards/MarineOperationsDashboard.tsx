"use client";

import {
  Anchor,
  Ship,
  Waves,
  MapPin,
  Clock,
  Users,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  Eye,
  Settings,
  Target,
  Award,
  Calendar,
  DollarSign,
  Globe,
  Navigation,
  Compass,
  Wind,
  Thermometer,
  Gauge,
  Zap,
  FileText,
  Camera,
  Radio
} from "lucide-react";
import Link from "next/link";

export default function MarineOperationsDashboard() {
  const stats = [
    {
      name: "Port Operations Efficiency",
      value: "96%",
      change: "+2%",
      changeType: "positive",
      icon: Ship,
      description: "Overall port performance",
      href: "/marine/operations/efficiency"
    },
    {
      name: "Vessel Turnaround Time",
      value: "18.5 hrs",
      change: "-1.2 hrs",
      changeType: "positive",
      icon: Clock,
      description: "Average vessel processing",
      href: "/marine/operations/turnaround"
    },
    {
      name: "Safety Incidents",
      value: "2",
      change: "-3",
      changeType: "negative",
      icon: Shield,
      description: "This month",
      href: "/marine/safety"
    },
    {
      name: "Cargo Throughput",
      value: "2.4M TEU",
      change: "+8%",
      changeType: "positive",
      icon: BarChart3,
      description: "Year to date",
      href: "/marine/cargo/throughput"
    }
  ];

  const portOperations = [
    {
      port: "Lagos Port Complex",
      status: "Operational",
      vesselsInPort: 12,
      vesselsWaiting: 3,
      cargoHandled: "45,000 TEU",
      efficiency: "98%",
      weather: "Clear",
      windSpeed: "12 knots",
      tide: "High"
    },
    {
      port: "Tin Can Island Port",
      status: "Operational",
      vesselsInPort: 8,
      vesselsWaiting: 2,
      cargoHandled: "32,000 TEU",
      efficiency: "95%",
      weather: "Partly Cloudy",
      windSpeed: "8 knots",
      tide: "Low"
    },
    {
      port: "Onne Port",
      status: "Operational",
      vesselsInPort: 6,
      vesselsWaiting: 1,
      cargoHandled: "28,000 TEU",
      efficiency: "97%",
      weather: "Clear",
      windSpeed: "15 knots",
      tide: "High"
    },
    {
      port: "Calabar Port",
      status: "Maintenance",
      vesselsInPort: 2,
      vesselsWaiting: 0,
      cargoHandled: "8,000 TEU",
      efficiency: "85%",
      weather: "Rainy",
      windSpeed: "20 knots",
      tide: "Low"
    }
  ];

  const vesselTracking = [
    {
      vesselName: "MV NPA Express",
      vesselType: "Container Ship",
      flag: "Nigeria",
      currentLocation: "Lagos Port Complex",
      status: "Loading",
      eta: "2 hours",
      cargo: "2,500 TEU",
      destination: "Rotterdam",
      captain: "Capt. John Okonkwo"
    },
    {
      vesselName: "MV Atlantic Star",
      vesselType: "Bulk Carrier",
      flag: "Liberia",
      currentLocation: "Tin Can Island Port",
      status: "Unloading",
      eta: "4 hours",
      cargo: "45,000 MT Coal",
      destination: "Lagos Port Complex",
      captain: "Capt. Maria Santos"
    },
    {
      vesselName: "MV West Africa",
      vesselType: "Tanker",
      flag: "Panama",
      currentLocation: "Onne Port",
      status: "Anchored",
      eta: "6 hours",
      cargo: "80,000 MT Crude Oil",
      destination: "Houston",
      captain: "Capt. Ahmed Hassan"
    },
    {
      vesselName: "MV Calabar Pride",
      vesselType: "General Cargo",
      flag: "Nigeria",
      currentLocation: "Calabar Port",
      status: "Maintenance",
      eta: "12 hours",
      cargo: "5,000 MT General",
      destination: "Douala",
      captain: "Capt. Grace Williams"
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

  const cargoOperations = [
    {
      operation: "Container Handling",
      volume: "1.2M TEU",
      efficiency: "97%",
      equipment: "12 Gantry Cranes",
      status: "Optimal",
      trend: "up"
    },
    {
      operation: "Bulk Cargo",
      volume: "850K MT",
      efficiency: "94%",
      equipment: "8 Conveyor Systems",
      status: "Good",
      trend: "up"
    },
    {
      operation: "Liquid Cargo",
      volume: "320K MT",
      efficiency: "96%",
      equipment: "6 Loading Arms",
      status: "Optimal",
      trend: "stable"
    },
    {
      operation: "General Cargo",
      volume: "180K MT",
      efficiency: "92%",
      equipment: "15 Forklifts",
      status: "Good",
      trend: "up"
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
      duration: "45 minutes"
    },
    {
      id: 2,
      operation: "Cargo Loading",
      vessel: "MV Atlantic Star",
      port: "Tin Can Island Port",
      time: "4 hours ago",
      status: "In Progress",
      duration: "3 hours"
    },
    {
      id: 3,
      operation: "Safety Inspection",
      vessel: "MV West Africa",
      port: "Onne Port",
      time: "6 hours ago",
      status: "Completed",
      duration: "2 hours"
    },
    {
      id: 4,
      operation: "Pilotage Service",
      vessel: "MV Calabar Pride",
      port: "Calabar Port",
      time: "8 hours ago",
      status: "Completed",
      duration: "1.5 hours"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Marine Operations Dashboard</h1>
          <p className="text-gray-600">Port operations, vessel management, and maritime safety oversight</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/marine/operations"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Activity className="w-4 h-4 mr-2" />
            Operations Center
          </Link>
          <Link
            href="/marine/safety"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Shield className="w-4 h-4 mr-2" />
            Safety Management
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.name} stat={stat} />
        ))}
      </div>

      {/* Port Operations */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Port Operations Status</h2>
          <Link
            href="/marine/ports"
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
        {/* Vessel Tracking */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Vessel Tracking</h2>
            <Link
              href="/marine/vessels"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all vessels
            </Link>
          </div>
          <div className="space-y-4">
            {vesselTracking.map((vessel, index) => (
              <VesselItem key={index} vessel={vessel} />
            ))}
          </div>
        </div>

        {/* Safety Metrics */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Safety Metrics</h2>
            <Link
              href="/marine/safety"
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
      </div>

      {/* Cargo Operations & Environmental Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cargo Operations */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Cargo Operations</h2>
            <Link
              href="/marine/cargo"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View cargo details
            </Link>
          </div>
          <div className="space-y-4">
            {cargoOperations.map((operation, index) => (
              <CargoOperationItem key={index} operation={operation} />
            ))}
          </div>
        </div>

        {/* Environmental Data */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Environmental Monitoring</h2>
            <Link
              href="/marine/environment"
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

      {/* Recent Operations & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Operations */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Operations</h2>
            <Link
              href="/marine/operations/log"
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
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Marine Operations Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <QuickActionButton
              title="Vessel Management"
              description="Track and manage vessels"
              icon={Ship}
              href="/marine/vessels"
              color="bg-blue-50 text-blue-600 hover:bg-blue-100"
            />
            <QuickActionButton
              title="Port Operations"
              description="Monitor port activities"
              icon={Anchor}
              href="/marine/ports"
              color="bg-green-50 text-green-600 hover:bg-green-100"
            />
            <QuickActionButton
              title="Safety Management"
              description="Safety protocols & incidents"
              icon={Shield}
              href="/marine/safety"
              color="bg-red-50 text-red-600 hover:bg-red-100"
            />
            <QuickActionButton
              title="Cargo Operations"
              description="Cargo handling & logistics"
              icon={BarChart3}
              href="/marine/cargo"
              color="bg-purple-50 text-purple-600 hover:bg-purple-100"
            />
            <QuickActionButton
              title="Environmental"
              description="Environmental monitoring"
              icon={Globe}
              href="/marine/environment"
              color="bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
            />
            <QuickActionButton
              title="Reports & Analytics"
              description="Marine operations insights"
              icon={BarChart3}
              href="/marine/reports"
              color="bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
            />
          </div>
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

function VesselItem({ vessel }: { vessel: any }) {
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
            <p>Captain: {vessel.captain} | ETA: {vessel.eta}</p>
          </div>
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
          <p className="text-xs text-gray-400">Duration: {operation.duration}</p>
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
