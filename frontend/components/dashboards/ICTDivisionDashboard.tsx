"use client";

import {
  Server,
  Database,
  Shield,
  Wifi,
  Code,
  Monitor,
  Smartphone,
  Cloud,
  Cpu,
  HardDrive,
  MemoryStick,
  Zap,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Users,
  BarChart3,
  Settings,
  Activity,
  Globe,
  Lock,
  Download,
  Upload,
  Eye,
  Clock,
  Target,
  Award
} from "lucide-react";
import Link from "next/link";

export default function ICTDivisionDashboard() {
  const stats = [
    {
      name: "System Uptime",
      value: "99.8%",
      change: "+0.2%",
      changeType: "positive",
      icon: Server,
      description: "Core systems availability",
      href: "/ict/monitoring/uptime"
    },
    {
      name: "Active Projects",
      value: "12",
      change: "+3",
      changeType: "positive",
      icon: Code,
      description: "Development initiatives",
      href: "/ict/projects"
    },
    {
      name: "Security Incidents",
      value: "2",
      change: "-1",
      changeType: "negative",
      icon: Shield,
      description: "This month",
      href: "/ict/security"
    },
    {
      name: "IT Support Tickets",
      value: "45",
      change: "+8",
      changeType: "warning",
      icon: Users,
      description: "Pending resolution",
      href: "/ict/support"
    }
  ];

  const systemMetrics = [
    {
      system: "Core Database Server",
      status: "Operational",
      uptime: "99.9%",
      responseTime: "12ms",
      cpuUsage: "45%",
      memoryUsage: "68%",
      lastBackup: "2 hours ago"
    },
    {
      system: "Web Application Server",
      status: "Operational",
      uptime: "99.7%",
      responseTime: "8ms",
      cpuUsage: "32%",
      memoryUsage: "54%",
      lastBackup: "4 hours ago"
    },
    {
      system: "Email Server",
      status: "Operational",
      uptime: "99.8%",
      responseTime: "15ms",
      cpuUsage: "28%",
      memoryUsage: "42%",
      lastBackup: "1 hour ago"
    },
    {
      system: "File Storage Server",
      status: "Maintenance",
      uptime: "98.5%",
      responseTime: "25ms",
      cpuUsage: "65%",
      memoryUsage: "78%",
      lastBackup: "6 hours ago"
    }
  ];

  const activeProjects = [
    {
      id: 1,
      name: "Digital Transformation Initiative",
      department: "Software Applications",
      progress: 75,
      budget: "₦500M",
      timeline: "Q2 2025",
      status: "On Track",
      priority: "High",
      teamSize: 8,
      technologies: ["React", "Node.js", "PostgreSQL"]
    },
    {
      id: 2,
      name: "Network Infrastructure Upgrade",
      department: "Network Infrastructure",
      progress: 60,
      budget: "₦300M",
      timeline: "Q3 2025",
      status: "On Track",
      priority: "Critical",
      teamSize: 6,
      technologies: ["Cisco", "Fortinet", "SD-WAN"]
    },
    {
      id: 3,
      name: "Cybersecurity Enhancement",
      department: "Information Security",
      progress: 45,
      budget: "₦200M",
      timeline: "Q4 2025",
      status: "Behind Schedule",
      priority: "High",
      teamSize: 5,
      technologies: ["SIEM", "EDR", "Zero Trust"]
    },
    {
      id: 4,
      name: "Mobile App Development",
      department: "Software Applications",
      progress: 30,
      budget: "₦150M",
      timeline: "Q1 2026",
      status: "Planning",
      priority: "Medium",
      teamSize: 4,
      technologies: ["React Native", "Flutter", "AWS"]
    }
  ];

  const securityMetrics = [
    {
      metric: "Firewall Blocked Attempts",
      value: "1,247",
      trend: "up",
      status: "Normal",
      description: "Last 24 hours"
    },
    {
      metric: "Malware Detections",
      value: "3",
      trend: "down",
      status: "Good",
      description: "This week"
    },
    {
      metric: "Failed Login Attempts",
      value: "89",
      trend: "up",
      status: "Monitoring",
      description: "Last 24 hours"
    },
    {
      metric: "SSL Certificate Expiry",
      value: "45 days",
      trend: "stable",
      status: "Good",
      description: "Next renewal"
    }
  ];

  const departmentPerformance = [
    {
      department: "Software Applications & Database Management",
      projects: 6,
      completed: 4,
      inProgress: 2,
      teamSize: 15,
      productivity: "94%",
      budgetUtilization: "87%",
      satisfaction: "4.8/5"
    },
    {
      department: "Network Infrastructure & Security",
      projects: 4,
      completed: 2,
      inProgress: 2,
      teamSize: 12,
      productivity: "91%",
      budgetUtilization: "92%",
      satisfaction: "4.6/5"
    },
    {
      department: "Information Security & Compliance",
      projects: 3,
      completed: 1,
      inProgress: 2,
      teamSize: 8,
      productivity: "88%",
      budgetUtilization: "78%",
      satisfaction: "4.7/5"
    },
    {
      department: "IT Support & Helpdesk",
      projects: 2,
      completed: 1,
      inProgress: 1,
      teamSize: 10,
      productivity: "96%",
      budgetUtilization: "85%",
      satisfaction: "4.5/5"
    }
  ];

  const recentIncidents = [
    {
      id: 1,
      type: "System Outage",
      severity: "High",
      description: "Database server experienced 15-minute downtime",
      affectedSystems: ["Core Database", "Web Application"],
      resolvedAt: "2 hours ago",
      resolutionTime: "15 minutes",
      status: "Resolved"
    },
    {
      id: 2,
      type: "Security Alert",
      severity: "Medium",
      description: "Suspicious login attempts detected",
      affectedSystems: ["User Authentication"],
      resolvedAt: "4 hours ago",
      resolutionTime: "30 minutes",
      status: "Resolved"
    },
    {
      id: 3,
      type: "Performance Issue",
      severity: "Low",
      description: "Slow response times on file server",
      affectedSystems: ["File Storage"],
      resolvedAt: "6 hours ago",
      resolutionTime: "45 minutes",
      status: "Resolved"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ICT Division Dashboard</h1>
          <p className="text-gray-600">Technology operations, system monitoring, and digital transformation oversight</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/ict/monitoring"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Activity className="w-4 h-4 mr-2" />
            System Monitoring
          </Link>
          <Link
            href="/ict/projects"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Code className="w-4 h-4 mr-2" />
            Manage Projects
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.name} stat={stat} />
        ))}
      </div>

      {/* System Monitoring */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">System Performance Monitoring</h2>
          <Link
            href="/ict/monitoring"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View detailed monitoring
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">System</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uptime</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Memory</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Backup</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {systemMetrics.map((system, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {system.system}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      system.status === 'Operational' ? 'bg-green-100 text-green-800' :
                      system.status === 'Maintenance' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {system.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {system.uptime}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {system.responseTime}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {system.cpuUsage}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {system.memoryUsage}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {system.lastBackup}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Projects */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Active Projects</h2>
            <Link
              href="/ict/projects"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Manage projects
            </Link>
          </div>
          <div className="space-y-4">
            {activeProjects.map((project) => (
              <ProjectItem key={project.id} project={project} />
            ))}
          </div>
        </div>

        {/* Security Metrics */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Security Metrics</h2>
            <Link
              href="/ict/security"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View security dashboard
            </Link>
          </div>
          <div className="space-y-4">
            {securityMetrics.map((metric, index) => (
              <SecurityMetricItem key={index} metric={metric} />
            ))}
          </div>
        </div>
      </div>

      {/* Department Performance */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Department Performance</h2>
          <Link
            href="/ict/departments"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View department details
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projects</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Productivity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Satisfaction</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {departmentPerformance.map((dept, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {dept.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {dept.completed}/{dept.projects} completed
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {dept.teamSize} members
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {dept.productivity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {dept.budgetUtilization}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {dept.satisfaction}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Incidents & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Incidents */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Incidents</h2>
            <Link
              href="/ict/incidents"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all incidents
            </Link>
          </div>
          <div className="space-y-4">
            {recentIncidents.map((incident) => (
              <IncidentItem key={incident.id} incident={incident} />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">ICT Management Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <QuickActionButton
              title="System Monitoring"
              description="Real-time system status"
              icon={Activity}
              href="/ict/monitoring"
              color="bg-blue-50 text-blue-600 hover:bg-blue-100"
            />
            <QuickActionButton
              title="Security Center"
              description="Threat monitoring & response"
              icon={Shield}
              href="/ict/security"
              color="bg-red-50 text-red-600 hover:bg-red-100"
            />
            <QuickActionButton
              title="Project Management"
              description="Track development projects"
              icon={Code}
              href="/ict/projects"
              color="bg-green-50 text-green-600 hover:bg-green-100"
            />
            <QuickActionButton
              title="IT Support"
              description="Helpdesk & user support"
              icon={Users}
              href="/ict/support"
              color="bg-purple-50 text-purple-600 hover:bg-purple-100"
            />
            <QuickActionButton
              title="Infrastructure"
              description="Network & server management"
              icon={Server}
              href="/ict/infrastructure"
              color="bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
            />
            <QuickActionButton
              title="Reports & Analytics"
              description="ICT performance insights"
              icon={BarChart3}
              href="/ict/reports"
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

function ProjectItem({ project }: { project: any }) {
  const statusColorMap = {
    'On Track': 'bg-green-100 text-green-800',
    'Behind Schedule': 'bg-red-100 text-red-800',
    'At Risk': 'bg-yellow-100 text-yellow-800',
    'Planning': 'bg-blue-100 text-blue-800'
  };
  const statusColor = statusColorMap[project.status as keyof typeof statusColorMap] || 'bg-gray-100 text-gray-800';

  const priorityColorMap = {
    'Critical': 'bg-red-100 text-red-800',
    'High': 'bg-orange-100 text-orange-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-green-100 text-green-800'
  };
  const priorityColor = priorityColorMap[project.priority as keyof typeof priorityColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h4 className="text-sm font-medium text-gray-900">{project.name}</h4>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
              {project.status}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColor}`}>
              {project.priority}
            </span>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Department: {project.department}</p>
            <p>Budget: {project.budget} | Timeline: {project.timeline}</p>
            <p>Team: {project.teamSize} members</p>
            <p>Technologies: {project.technologies.join(', ')}</p>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Progress</span>
              <span>{project.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${project.progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityMetricItem({ metric }: { metric: any }) {
  const statusColorMap = {
    'Normal': 'bg-green-100 text-green-800',
    'Good': 'bg-blue-100 text-blue-800',
    'Monitoring': 'bg-yellow-100 text-yellow-800',
    'Alert': 'bg-red-100 text-red-800'
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

function IncidentItem({ incident }: { incident: any }) {
  const severityColorMap = {
    'High': 'bg-red-100 text-red-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-green-100 text-green-800'
  };
  const severityColor = severityColorMap[incident.severity as keyof typeof severityColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h4 className="text-sm font-medium text-gray-900">{incident.type}</h4>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityColor}`}>
              {incident.severity}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-2">{incident.description}</p>
          <div className="text-xs text-gray-500 space-y-1">
            <p>Affected: {incident.affectedSystems.join(', ')}</p>
            <p>Resolved: {incident.resolvedAt} ({incident.resolutionTime})</p>
          </div>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          incident.status === 'Resolved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {incident.status}
        </span>
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
