"use client";

import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  BarChart3,
  Building,
  Target,
  DollarSign,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Award,
  Briefcase,
  Zap
} from "lucide-react";
import Link from "next/link";

export default function GMDashboard() {
  // Enhanced stats for GM/ED
  const stats = [
    {
      name: "Divisional Performance",
      value: "94%",
      change: "+3%",
      changeType: "positive",
      icon: Target,
      description: "Overall compliance",
      href: "/reports/divisional-performance"
    },
    {
      name: "Strategic Initiatives",
      value: "12",
      change: "+2",
      changeType: "positive",
      icon: Briefcase,
      description: "Active projects",
      href: "/strategic/initiatives"
    },
    {
      name: "Budget Utilization",
      value: "87%",
      change: "+5%",
      changeType: "positive",
      icon: DollarSign,
      description: "Q1 2025",
      href: "/reports/budget"
    },
    {
      name: "Risk Assessment",
      value: "Low",
      change: "Stable",
      changeType: "neutral",
      icon: Shield,
      description: "Current risk level",
      href: "/reports/risk"
    }
  ];

  const divisionalMetrics = [
    {
      division: "Information & Communication Technology",
      totalRequests: 156,
      approved: 142,
      pending: 12,
      budget: "₦2.5B",
      compliance: "94%",
      avgTime: "3.2 days",
      performance: "Excellent",
      trend: "up"
    },
    {
      division: "Marine Operations",
      totalRequests: 134,
      approved: 128,
      pending: 6,
      budget: "₦1.8B",
      compliance: "96%",
      avgTime: "2.8 days",
      performance: "Excellent",
      trend: "up"
    },
    {
      division: "Finance & Accounts",
      totalRequests: 89,
      approved: 85,
      pending: 4,
      budget: "₦1.2B",
      compliance: "98%",
      avgTime: "2.1 days",
      performance: "Outstanding",
      trend: "up"
    },
    {
      division: "Human Resources",
      totalRequests: 67,
      approved: 61,
      pending: 6,
      budget: "₦800M",
      compliance: "91%",
      avgTime: "3.8 days",
      performance: "Good",
      trend: "down"
    }
  ];

  const strategicInitiatives = [
    {
      id: 1,
      title: "Digital Transformation Initiative",
      division: "ICT",
      status: "On Track",
      progress: 75,
      budget: "₦500M",
      timeline: "Q2 2025",
      priority: "High",
      description: "Modernizing core systems and processes"
    },
    {
      id: 2,
      title: "Port Security Enhancement",
      division: "Marine Operations",
      status: "On Track",
      progress: 60,
      budget: "₦300M",
      timeline: "Q3 2025",
      priority: "Critical",
      description: "Upgrading security infrastructure across all ports"
    },
    {
      id: 3,
      title: "Staff Development Program",
      division: "Human Resources",
      status: "Behind Schedule",
      progress: 40,
      budget: "₦150M",
      timeline: "Q4 2025",
      priority: "Medium",
      description: "Comprehensive training and development initiative"
    }
  ];

  const crossDivisionalProjects = [
    {
      id: 1,
      title: "Integrated Port Management System",
      divisions: ["ICT", "Marine Operations", "Finance"],
      status: "Planning",
      budget: "₦750M",
      timeline: "18 months",
      coordinator: "GM ICT"
    },
    {
      id: 2,
      title: "Compliance Framework Implementation",
      divisions: ["Legal", "HR", "Finance"],
      status: "Implementation",
      budget: "₦120M",
      timeline: "12 months",
      coordinator: "GM Legal"
    }
  ];

  const riskAssessment = [
    {
      category: "Operational Risk",
      level: "Low",
      impact: "Medium",
      probability: "Low",
      mitigation: "Regular monitoring and process improvements",
      owner: "GM Operations"
    },
    {
      category: "Financial Risk",
      level: "Low",
      impact: "High",
      probability: "Low",
      mitigation: "Robust financial controls and regular audits",
      owner: "GM Finance"
    },
    {
      category: "Technology Risk",
      level: "Medium",
      impact: "High",
      probability: "Medium",
      mitigation: "Cybersecurity enhancements and backup systems",
      owner: "GM ICT"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">General Manager / Executive Director Dashboard</h1>
          <p className="text-gray-600">Strategic oversight, divisional coordination, and executive decision support</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/reports/executive"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Executive Reports
          </Link>
          <Link
            href="/strategic/initiatives"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Briefcase className="w-4 h-4 mr-2" />
            Strategic Initiatives
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.name} stat={stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Divisional Performance */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Divisional Performance Overview</h2>
            <Link
              href="/reports/divisional"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View detailed report
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Division</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requests</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Compliance</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {divisionalMetrics.map((division, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{division.division}</div>
                      <div className="text-sm text-gray-500">Budget: {division.budget}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{division.approved}/{division.totalRequests}</div>
                      <div className="text-sm text-gray-500">{division.pending} pending</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-900">{division.compliance}</span>
                        {division.trend === 'up' && <ArrowUpRight className="w-4 h-4 text-green-500 ml-1" />}
                        {division.trend === 'down' && <ArrowDownRight className="w-4 h-4 text-red-500 ml-1" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        division.performance === 'Outstanding' ? 'bg-green-100 text-green-800' :
                        division.performance === 'Excellent' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {division.performance}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Strategic Initiatives */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Strategic Initiatives</h2>
            <Link
              href="/strategic/initiatives"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {strategicInitiatives.map((initiative) => (
              <StrategicInitiativeItem key={initiative.id} initiative={initiative} />
            ))}
          </div>
        </div>
      </div>

      {/* Cross-Divisional Projects */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Cross-Divisional Projects</h2>
          <Link
            href="/projects/cross-divisional"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Manage projects
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {crossDivisionalProjects.map((project) => (
            <CrossDivisionalProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>

      {/* Risk Assessment & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Assessment */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Risk Assessment</h2>
            <Link
              href="/reports/risk"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View details
            </Link>
          </div>
          <div className="space-y-4">
            {riskAssessment.map((risk, index) => (
              <RiskAssessmentItem key={index} risk={risk} />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Executive Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <QuickActionButton
              title="Strategic Planning"
              description="Review and approve strategic initiatives"
              icon={Target}
              href="/strategic/planning"
              color="bg-blue-50 text-blue-600 hover:bg-blue-100"
            />
            <QuickActionButton
              title="Budget Allocation"
              description="Manage divisional budgets"
              icon={DollarSign}
              href="/budget/allocation"
              color="bg-green-50 text-green-600 hover:bg-green-100"
            />
            <QuickActionButton
              title="Risk Management"
              description="Monitor and mitigate risks"
              icon={Shield}
              href="/risk/management"
              color="bg-red-50 text-red-600 hover:bg-red-100"
            />
            <QuickActionButton
              title="Performance Review"
              description="Divisional performance analysis"
              icon={BarChart3}
              href="/reports/performance"
              color="bg-purple-50 text-purple-600 hover:bg-purple-100"
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

function StrategicInitiativeItem({ initiative }: { initiative: any }) {
  const statusColorMap = {
    'On Track': 'bg-green-100 text-green-800',
    'Behind Schedule': 'bg-red-100 text-red-800',
    'At Risk': 'bg-yellow-100 text-yellow-800',
    'Completed': 'bg-blue-100 text-blue-800'
  };
  const statusColor = statusColorMap[initiative.status as keyof typeof statusColorMap] || 'bg-gray-100 text-gray-800';

  const priorityColorMap = {
    'Critical': 'bg-red-100 text-red-800',
    'High': 'bg-orange-100 text-orange-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-green-100 text-green-800'
  };
  const priorityColor = priorityColorMap[initiative.priority as keyof typeof priorityColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h4 className="text-sm font-medium text-gray-900">{initiative.title}</h4>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
              {initiative.status}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColor}`}>
              {initiative.priority}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-2">{initiative.description}</p>
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <span>Division: {initiative.division}</span>
            <span>Budget: {initiative.budget}</span>
            <span>Timeline: {initiative.timeline}</span>
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Progress</span>
              <span>{initiative.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${initiative.progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CrossDivisionalProjectCard({ project }: { project: any }) {
  const statusColorMap = {
    'Planning': 'bg-blue-100 text-blue-800',
    'Implementation': 'bg-green-100 text-green-800',
    'On Hold': 'bg-yellow-100 text-yellow-800',
    'Completed': 'bg-gray-100 text-gray-800'
  };
  const statusColor = statusColorMap[project.status as keyof typeof statusColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900">{project.title}</h4>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
          {project.status}
        </span>
      </div>
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center">
          <Building className="w-4 h-4 mr-2" />
          <span>{project.divisions.join(', ')}</span>
        </div>
        <div className="flex items-center">
          <DollarSign className="w-4 h-4 mr-2" />
          <span>{project.budget}</span>
        </div>
        <div className="flex items-center">
          <Calendar className="w-4 h-4 mr-2" />
          <span>{project.timeline}</span>
        </div>
        <div className="flex items-center">
          <Users className="w-4 h-4 mr-2" />
          <span>Coordinator: {project.coordinator}</span>
        </div>
      </div>
    </div>
  );
}

function RiskAssessmentItem({ risk }: { risk: any }) {
  const levelColorMap = {
    'Low': 'bg-green-100 text-green-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'High': 'bg-red-100 text-red-800',
    'Critical': 'bg-red-100 text-red-800'
  };
  const levelColor = levelColorMap[risk.level as keyof typeof levelColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-900">{risk.category}</h4>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${levelColor}`}>
          {risk.level}
        </span>
      </div>
      <div className="text-sm text-gray-600 space-y-1">
        <p>Impact: {risk.impact} | Probability: {risk.probability}</p>
        <p>Mitigation: {risk.mitigation}</p>
        <p className="text-xs text-gray-500">Owner: {risk.owner}</p>
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