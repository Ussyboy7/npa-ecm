"use client";

import {
  Code,
  Database,
  Server,
  GitBranch,
  Bug,
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
  BarChart3,
  Activity,
  Zap,
  Shield,
  Globe,
  Smartphone,
  Monitor,
  Cloud,
  Cpu,
  HardDrive,
  MemoryStick,
  Wifi,
  Lock,
  Download,
  Upload,
  Eye,
  Settings,
  Target,
  Award,
  TrendingUp,
  FileText,
  Play,
  Pause,
  RotateCcw
} from "lucide-react";
import Link from "next/link";

export default function SoftwareApplicationsDashboard() {
  const stats = [
    {
      name: "Active Projects",
      value: "8",
      change: "+2",
      changeType: "positive",
      icon: Code,
      description: "Development initiatives",
      href: "/ict/software/projects"
    },
    {
      name: "Code Quality Score",
      value: "94%",
      change: "+3%",
      changeType: "positive",
      icon: CheckCircle,
      description: "SonarQube analysis",
      href: "/ict/software/quality"
    },
    {
      name: "Bug Resolution Time",
      value: "2.3 days",
      change: "-0.5 days",
      changeType: "positive",
      icon: Bug,
      description: "Average fix time",
      href: "/ict/software/bugs"
    },
    {
      name: "Deployment Success Rate",
      value: "98.5%",
      change: "+1.2%",
      changeType: "positive",
      icon: Zap,
      description: "CI/CD pipeline",
      href: "/ict/software/deployments"
    }
  ];

  const activeProjects = [
    {
      id: 1,
      name: "NPA Mobile App",
      technology: "React Native",
      progress: 75,
      teamSize: 6,
      status: "In Development",
      priority: "High",
      deadline: "2025-06-15",
      features: ["User Authentication", "Document Upload", "Approval Workflow", "Notifications"],
      repository: "npa-mobile-app",
      lastCommit: "2 hours ago"
    },
    {
      id: 2,
      name: "Port Management System",
      technology: "React + Node.js",
      progress: 60,
      teamSize: 8,
      status: "In Development",
      priority: "Critical",
      deadline: "2025-08-30",
      features: ["Vessel Tracking", "Cargo Management", "Port Operations", "Reporting"],
      repository: "port-management-system",
      lastCommit: "4 hours ago"
    },
    {
      id: 3,
      name: "Financial Analytics Dashboard",
      technology: "Vue.js + Python",
      progress: 45,
      teamSize: 4,
      status: "Planning",
      priority: "Medium",
      deadline: "2025-09-15",
      features: ["Data Visualization", "Report Generation", "Trend Analysis", "Export Functions"],
      repository: "financial-analytics",
      lastCommit: "1 day ago"
    },
    {
      id: 4,
      name: "HR Management Portal",
      technology: "Angular + .NET",
      progress: 30,
      teamSize: 5,
      status: "Planning",
      priority: "High",
      deadline: "2025-10-01",
      features: ["Employee Records", "Performance Tracking", "Leave Management", "Payroll Integration"],
      repository: "hr-management-portal",
      lastCommit: "3 days ago"
    }
  ];

  const developmentMetrics = [
    {
      metric: "Lines of Code",
      value: "245,678",
      trend: "up",
      target: "200,000",
      status: "Above Target",
      period: "Total codebase"
    },
    {
      metric: "Test Coverage",
      value: "87%",
      trend: "up",
      target: "85%",
      status: "Above Target",
      period: "Unit & integration tests"
    },
    {
      metric: "Code Review Completion",
      value: "96%",
      trend: "up",
      target: "90%",
      status: "Above Target",
      period: "Pull request reviews"
    },
    {
      metric: "Technical Debt Ratio",
      value: "12%",
      trend: "down",
      target: "15%",
      status: "Below Target",
      period: "SonarQube analysis"
    }
  ];

  const teamPerformance = [
    {
      developer: "Sarah Johnson",
      role: "Senior Full-Stack Developer",
      commits: 45,
      pullRequests: 12,
      codeReviews: 28,
      bugsFixed: 8,
      productivity: "95%",
      technologies: ["React", "Node.js", "TypeScript", "PostgreSQL"]
    },
    {
      developer: "Michael Chen",
      role: "Frontend Developer",
      commits: 38,
      pullRequests: 10,
      codeReviews: 22,
      bugsFixed: 6,
      productivity: "92%",
      technologies: ["React", "Vue.js", "JavaScript", "CSS"]
    },
    {
      developer: "David Okafor",
      role: "Backend Developer",
      commits: 42,
      pullRequests: 11,
      codeReviews: 25,
      bugsFixed: 10,
      productivity: "98%",
      technologies: ["Python", "Django", "PostgreSQL", "Redis"]
    },
    {
      developer: "Grace Williams",
      role: "Mobile Developer",
      commits: 35,
      pullRequests: 9,
      codeReviews: 20,
      bugsFixed: 5,
      productivity: "89%",
      technologies: ["React Native", "Flutter", "JavaScript", "Firebase"]
    }
  ];

  const codeQualityMetrics = [
    {
      project: "NPA Mobile App",
      maintainability: "A",
      reliability: "A",
      security: "B",
      coverage: "89%",
      bugs: 2,
      vulnerabilities: 0,
      codeSmells: 12
    },
    {
      project: "Port Management System",
      maintainability: "A",
      reliability: "A",
      security: "A",
      coverage: "92%",
      bugs: 1,
      vulnerabilities: 0,
      codeSmells: 8
    },
    {
      project: "Financial Analytics Dashboard",
      maintainability: "B",
      reliability: "A",
      security: "A",
      coverage: "85%",
      bugs: 3,
      vulnerabilities: 1,
      codeSmells: 15
    },
    {
      project: "HR Management Portal",
      maintainability: "B",
      reliability: "B",
      security: "A",
      coverage: "78%",
      bugs: 5,
      vulnerabilities: 0,
      codeSmells: 18
    }
  ];

  const deploymentHistory = [
    {
      id: 1,
      project: "NPA Mobile App",
      version: "v2.1.3",
      environment: "Production",
      status: "Success",
      deployedAt: "2 hours ago",
      duration: "8 minutes",
      changes: "Bug fixes and performance improvements"
    },
    {
      id: 2,
      project: "Port Management System",
      version: "v1.4.2",
      environment: "Staging",
      status: "Success",
      deployedAt: "6 hours ago",
      duration: "12 minutes",
      changes: "New vessel tracking features"
    },
    {
      id: 3,
      project: "Financial Analytics Dashboard",
      version: "v1.0.1",
      environment: "Development",
      status: "Success",
      deployedAt: "1 day ago",
      duration: "5 minutes",
      changes: "Initial deployment with basic features"
    },
    {
      id: 4,
      project: "HR Management Portal",
      version: "v0.9.5",
      environment: "Testing",
      status: "Failed",
      deployedAt: "2 days ago",
      duration: "3 minutes",
      changes: "Database migration issues"
    }
  ];

  const recentBugs = [
    {
      id: 1,
      title: "Login timeout issue on mobile app",
      severity: "High",
      status: "In Progress",
      assignedTo: "Sarah Johnson",
      reportedAt: "4 hours ago",
      project: "NPA Mobile App",
      priority: "P1"
    },
    {
      id: 2,
      title: "Data export functionality not working",
      severity: "Medium",
      status: "Open",
      assignedTo: "Michael Chen",
      reportedAt: "1 day ago",
      project: "Port Management System",
      priority: "P2"
    },
    {
      id: 3,
      title: "Performance issue with large datasets",
      severity: "Medium",
      status: "Resolved",
      assignedTo: "David Okafor",
      reportedAt: "2 days ago",
      project: "Financial Analytics Dashboard",
      priority: "P2"
    },
    {
      id: 4,
      title: "UI alignment issues on tablet view",
      severity: "Low",
      status: "Open",
      assignedTo: "Grace Williams",
      reportedAt: "3 days ago",
      project: "HR Management Portal",
      priority: "P3"
    }
  ];

  const technologyStack = [
    {
      category: "Frontend",
      technologies: [
        { name: "React", usage: "60%", projects: 3, color: "bg-blue-500" },
        { name: "Vue.js", usage: "25%", projects: 1, color: "bg-green-500" },
        { name: "Angular", usage: "15%", projects: 1, color: "bg-red-500" }
      ]
    },
    {
      category: "Backend",
      technologies: [
        { name: "Node.js", usage: "50%", projects: 2, color: "bg-green-600" },
        { name: "Python", usage: "30%", projects: 1, color: "bg-yellow-500" },
        { name: ".NET", usage: "20%", projects: 1, color: "bg-purple-500" }
      ]
    },
    {
      category: "Database",
      technologies: [
        { name: "PostgreSQL", usage: "70%", projects: 3, color: "bg-blue-600" },
        { name: "MongoDB", usage: "20%", projects: 1, color: "bg-green-700" },
        { name: "Redis", usage: "10%", projects: 1, color: "bg-red-600" }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Software Applications Department</h1>
          <p className="text-gray-600">Development team performance, project tracking, and code quality metrics</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/ict/software/projects"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Code className="w-4 h-4 mr-2" />
            Manage Projects
          </Link>
          <Link
            href="/ict/software/code-quality"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Code Quality
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.name} stat={stat} />
        ))}
      </div>

      {/* Development Metrics */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Development Metrics</h2>
          <Link
            href="/ict/software/metrics"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View detailed metrics
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {developmentMetrics.map((metric, index) => (
            <DevelopmentMetricCard key={index} metric={metric} />
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Projects */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Active Projects</h2>
            <Link
              href="/ict/software/projects"
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

        {/* Team Performance */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Team Performance</h2>
            <Link
              href="/ict/software/team"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View team details
            </Link>
          </div>
          <div className="space-y-4">
            {teamPerformance.map((member, index) => (
              <TeamMemberItem key={index} member={member} />
            ))}
          </div>
        </div>
      </div>

      {/* Code Quality Metrics */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Code Quality Metrics</h2>
          <Link
            href="/ict/software/quality"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View quality reports
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Maintainability</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reliability</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Security</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coverage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issues</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {codeQualityMetrics.map((project, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {project.project}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      project.maintainability === 'A' ? 'bg-green-100 text-green-800' :
                      project.maintainability === 'B' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {project.maintainability}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      project.reliability === 'A' ? 'bg-green-100 text-green-800' :
                      project.reliability === 'B' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {project.reliability}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      project.security === 'A' ? 'bg-green-100 text-green-800' :
                      project.security === 'B' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {project.security}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.coverage}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.bugs} bugs, {project.vulnerabilities} vulnerabilities, {project.codeSmells} smells
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deployment History & Recent Bugs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deployment History */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Deployment History</h2>
            <Link
              href="/ict/software/deployments"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all deployments
            </Link>
          </div>
          <div className="space-y-4">
            {deploymentHistory.map((deployment) => (
              <DeploymentItem key={deployment.id} deployment={deployment} />
            ))}
          </div>
        </div>

        {/* Recent Bugs */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Bugs</h2>
            <Link
              href="/ict/software/bugs"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all bugs
            </Link>
          </div>
          <div className="space-y-4">
            {recentBugs.map((bug) => (
              <BugItem key={bug.id} bug={bug} />
            ))}
          </div>
        </div>
      </div>

      {/* Technology Stack */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Technology Stack Usage</h2>
          <Link
            href="/ict/software/technologies"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View technology details
          </Link>
        </div>
        <div className="space-y-6">
          {technologyStack.map((category, index) => (
            <TechnologyCategory key={index} category={category} />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Software Development Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickActionButton
            title="Project Management"
            description="Track development projects"
            icon={Code}
            href="/ict/software/projects"
            color="bg-blue-50 text-blue-600 hover:bg-blue-100"
          />
          <QuickActionButton
            title="Code Quality"
            description="Monitor code quality metrics"
            icon={CheckCircle}
            href="/ict/software/quality"
            color="bg-green-50 text-green-600 hover:bg-green-100"
          />
          <QuickActionButton
            title="Bug Tracking"
            description="Manage bug reports"
            icon={Bug}
            href="/ict/software/bugs"
            color="bg-red-50 text-red-600 hover:bg-red-100"
          />
          <QuickActionButton
            title="Deployments"
            description="Monitor deployments"
            icon={Zap}
            href="/ict/software/deployments"
            color="bg-purple-50 text-purple-600 hover:bg-purple-100"
          />
          <QuickActionButton
            title="Team Performance"
            description="Developer productivity"
            icon={Users}
            href="/ict/software/team"
            color="bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
          />
          <QuickActionButton
            title="Repository Management"
            description="Git repositories"
            icon={GitBranch}
            href="/ict/software/repositories"
            color="bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
          />
          <QuickActionButton
            title="CI/CD Pipeline"
            description="Build and deployment"
            icon={Activity}
            href="/ict/software/pipeline"
            color="bg-pink-50 text-pink-600 hover:bg-pink-100"
          />
          <QuickActionButton
            title="Documentation"
            description="Technical documentation"
            icon={FileText}
            href="/ict/software/docs"
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

function DevelopmentMetricCard({ metric }: { metric: any }) {
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

function ProjectItem({ project }: { project: any }) {
  const statusColorMap = {
    'In Development': 'bg-blue-100 text-blue-800',
    'Planning': 'bg-yellow-100 text-yellow-800',
    'Testing': 'bg-purple-100 text-purple-800',
    'Completed': 'bg-green-100 text-green-800'
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
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Code className="w-4 h-4 text-blue-600" />
            <h4 className="text-sm font-medium text-gray-900">{project.name}</h4>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
              {project.status}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColor}`}>
              {project.priority}
            </span>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Technology: {project.technology} | Team: {project.teamSize} members</p>
            <p>Repository: {project.repository} | Last commit: {project.lastCommit}</p>
            <p>Deadline: {project.deadline}</p>
            <p>Features: {project.features.join(', ')}</p>
          </div>
        </div>
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
  );
}

function TeamMemberItem({ member }: { member: any }) {
  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">{member.developer}</h4>
          <p className="text-sm text-gray-600 mb-2">{member.role}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Commits</p>
              <p className="font-medium">{member.commits}</p>
            </div>
            <div>
              <p className="text-gray-500">Pull Requests</p>
              <p className="font-medium">{member.pullRequests}</p>
            </div>
            <div>
              <p className="text-gray-500">Code Reviews</p>
              <p className="font-medium">{member.codeReviews}</p>
            </div>
            <div>
              <p className="text-gray-500">Bugs Fixed</p>
              <p className="font-medium">{member.bugsFixed}</p>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-1">Technologies</p>
            <div className="flex flex-wrap gap-1">
              {member.technologies.map((tech: string, index: number) => (
                <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-gray-900">{member.productivity}</p>
          <p className="text-xs text-gray-500">Productivity</p>
        </div>
      </div>
    </div>
  );
}

function DeploymentItem({ deployment }: { deployment: any }) {
  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          deployment.status === 'Success' ? 'bg-green-100' : 'bg-red-100'
        }`}>
          {deployment.status === 'Success' ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600" />
          )}
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-900">{deployment.project}</h4>
          <p className="text-xs text-gray-500">{deployment.version} - {deployment.environment}</p>
          <p className="text-xs text-gray-400">{deployment.changes}</p>
        </div>
      </div>
      <div className="text-right">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          deployment.status === 'Success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {deployment.status}
        </span>
        <p className="text-xs text-gray-500 mt-1">{deployment.deployedAt}</p>
        <p className="text-xs text-gray-400">Duration: {deployment.duration}</p>
      </div>
    </div>
  );
}

function BugItem({ bug }: { bug: any }) {
  const severityColorMap = {
    'High': 'bg-red-100 text-red-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-green-100 text-green-800'
  };
  const severityColor = severityColorMap[bug.severity as keyof typeof severityColorMap] || 'bg-gray-100 text-gray-800';

  const statusColorMap = {
    'Open': 'bg-red-100 text-red-800',
    'In Progress': 'bg-yellow-100 text-yellow-800',
    'Resolved': 'bg-green-100 text-green-800',
    'Closed': 'bg-gray-100 text-gray-800'
  };
  const statusColor = statusColorMap[bug.status as keyof typeof statusColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Bug className="w-4 h-4 text-red-500" />
            <h4 className="text-sm font-medium text-gray-900">{bug.title}</h4>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityColor}`}>
              {bug.severity}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
              {bug.status}
            </span>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Project: {bug.project} | Priority: {bug.priority}</p>
            <p>Assigned to: {bug.assignedTo}</p>
            <p>Reported: {bug.reportedAt}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TechnologyCategory({ category }: { category: any }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-900 mb-3">{category.category}</h3>
      <div className="space-y-2">
        {category.technologies.map((tech: any, index: number) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${tech.color}`}></div>
              <span className="text-sm font-medium text-gray-900">{tech.name}</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{tech.usage}</p>
              <p className="text-xs text-gray-500">{tech.projects} projects</p>
            </div>
          </div>
        ))}
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
