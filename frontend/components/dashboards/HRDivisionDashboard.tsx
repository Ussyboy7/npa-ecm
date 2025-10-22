"use client";

import {
  Users,
  UserPlus,
  UserMinus,
  GraduationCap,
  Award,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  Clock,
  Target,
  CheckCircle,
  AlertTriangle,
  Eye,
  Settings,
  FileText,
  Download,
  Upload,
  Activity,
  Heart,
  Shield,
  Star,
  Zap,
  Building,
  MapPin,
  Globe,
  DollarSign,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  UserCheck,
  UserX,
  Briefcase,
  BookOpen,
  Trophy,
  MessageSquare,
  Mail,
  Phone,
  Home
} from "lucide-react";
import Link from "next/link";

export default function HRDivisionDashboard() {
  const stats = [
    {
      name: "Total Employees",
      value: "2,847",
      change: "+45",
      changeType: "positive",
      icon: Users,
      description: "Active workforce",
      href: "/hr/employees"
    },
    {
      name: "Employee Satisfaction",
      value: "4.2/5",
      change: "+0.3",
      changeType: "positive",
      icon: Heart,
      description: "Latest survey score",
      href: "/hr/satisfaction"
    },
    {
      name: "Training Completion",
      value: "87%",
      change: "+5%",
      changeType: "positive",
      icon: GraduationCap,
      description: "Annual training target",
      href: "/hr/training"
    },
    {
      name: "Turnover Rate",
      value: "8.2%",
      change: "-1.5%",
      changeType: "negative",
      icon: UserMinus,
      description: "Annual turnover",
      href: "/hr/turnover"
    }
  ];

  const workforceMetrics = [
    {
      metric: "Headcount Growth",
      value: "3.2%",
      trend: "up",
      target: "2.5%",
      status: "Above Target",
      period: "Year over Year"
    },
    {
      metric: "Diversity Index",
      value: "0.78",
      trend: "up",
      target: "0.75",
      status: "Above Target",
      period: "Gender & Ethnic Diversity"
    },
    {
      metric: "Average Tenure",
      value: "7.8 years",
      trend: "up",
      target: "7.0 years",
      status: "Above Target",
      period: "Employee Retention"
    },
    {
      metric: "Promotion Rate",
      value: "12.5%",
      trend: "up",
      target: "10.0%",
      status: "Above Target",
      period: "Internal Mobility"
    }
  ];

  const departmentBreakdown = [
    {
      department: "Marine Operations",
      employees: 1245,
      percentage: "43.7%",
      growth: "+2.1%",
      turnover: "6.8%",
      satisfaction: "4.3/5",
      color: "bg-blue-500"
    },
    {
      department: "ICT Division",
      employees: 456,
      percentage: "16.0%",
      growth: "+8.5%",
      turnover: "12.3%",
      satisfaction: "4.1/5",
      color: "bg-green-500"
    },
    {
      department: "Finance Division",
      employees: 234,
      percentage: "8.2%",
      growth: "+1.2%",
      turnover: "5.2%",
      satisfaction: "4.4/5",
      color: "bg-yellow-500"
    },
    {
      department: "Human Resources",
      employees: 189,
      percentage: "6.6%",
      growth: "+3.1%",
      turnover: "4.8%",
      satisfaction: "4.5/5",
      color: "bg-purple-500"
    },
    {
      department: "Administration",
      employees: 723,
      percentage: "25.4%",
      growth: "+0.8%",
      turnover: "9.1%",
      satisfaction: "4.0/5",
      color: "bg-red-500"
    }
  ];

  const recruitmentPipeline = [
    {
      position: "Software Engineer",
      department: "ICT Division",
      level: "Senior",
      applicants: 45,
      shortlisted: 8,
      interviewed: 3,
      offers: 1,
      status: "In Progress",
      priority: "High"
    },
    {
      position: "Port Operations Manager",
      department: "Marine Operations",
      level: "Manager",
      applicants: 23,
      shortlisted: 5,
      interviewed: 2,
      offers: 0,
      status: "Interviewing",
      priority: "Critical"
    },
    {
      position: "Financial Analyst",
      department: "Finance Division",
      level: "Mid",
      applicants: 67,
      shortlisted: 12,
      interviewed: 4,
      offers: 1,
      status: "Offer Extended",
      priority: "Medium"
    },
    {
      position: "HR Business Partner",
      department: "Human Resources",
      level: "Senior",
      applicants: 34,
      shortlisted: 6,
      interviewed: 3,
      offers: 0,
      status: "Final Interview",
      priority: "High"
    }
  ];

  const trainingPrograms = [
    {
      program: "Leadership Development",
      participants: 45,
      completion: "89%",
      satisfaction: "4.6/5",
      cost: "₦2.5M",
      status: "Ongoing",
      nextCohort: "Q2 2025"
    },
    {
      program: "Digital Skills Training",
      participants: 156,
      completion: "92%",
      satisfaction: "4.3/5",
      cost: "₦4.2M",
      status: "Completed",
      nextCohort: "Q3 2025"
    },
    {
      program: "Safety & Compliance",
      participants: 1245,
      completion: "98%",
      satisfaction: "4.1/5",
      cost: "₦1.8M",
      status: "Ongoing",
      nextCohort: "Monthly"
    },
    {
      program: "Customer Service Excellence",
      participants: 89,
      completion: "85%",
      satisfaction: "4.4/5",
      cost: "₦1.2M",
      status: "Planning",
      nextCohort: "Q1 2025"
    }
  ];

  const performanceMetrics = [
    {
      metric: "Performance Rating Average",
      value: "3.8/5",
      trend: "up",
      target: "3.5/5",
      status: "Above Target",
      period: "Annual Review"
    },
    {
      metric: "Goal Achievement Rate",
      value: "84%",
      trend: "up",
      target: "80%",
      status: "Above Target",
      period: "Individual Goals"
    },
    {
      metric: "360 Feedback Score",
      value: "4.2/5",
      trend: "up",
      target: "4.0/5",
      status: "Above Target",
      period: "Peer Reviews"
    },
    {
      metric: "Development Plan Completion",
      value: "76%",
      trend: "up",
      target: "70%",
      status: "Above Target",
      period: "IDP Progress"
    }
  ];

  const hrAlerts = [
    {
      id: 1,
      type: "High Turnover Alert",
      severity: "Medium",
      message: "ICT Division showing 12.3% turnover rate",
      department: "ICT Division",
      action: "Review retention strategies",
      timeframe: "Immediate"
    },
    {
      id: 2,
      type: "Recruitment Priority",
      severity: "High",
      message: "Port Operations Manager position critical",
      department: "Marine Operations",
      action: "Expedite recruitment process",
      timeframe: "2 weeks"
    },
    {
      id: 3,
      type: "Training Gap",
      severity: "Low",
      message: "Customer Service training completion below target",
      department: "All Departments",
      action: "Schedule additional sessions",
      timeframe: "1 month"
    }
  ];

  const employeeEngagement = [
    {
      category: "Job Satisfaction",
      score: "4.2/5",
      trend: "up",
      change: "+0.3",
      benchmark: "Industry: 3.8/5"
    },
    {
      category: "Work-Life Balance",
      score: "3.9/5",
      trend: "up",
      change: "+0.2",
      benchmark: "Industry: 3.6/5"
    },
    {
      category: "Career Development",
      score: "3.8/5",
      trend: "up",
      change: "+0.4",
      benchmark: "Industry: 3.5/5"
    },
    {
      category: "Management Support",
      score: "4.1/5",
      trend: "up",
      change: "+0.2",
      benchmark: "Industry: 3.7/5"
    }
  ];

  const compensationAnalysis = [
    {
      level: "Executive",
      count: 12,
      avgSalary: "₦8.5M",
      marketPosition: "95th percentile",
      increase: "+8.5%",
      status: "Competitive"
    },
    {
      level: "Senior Management",
      count: 45,
      avgSalary: "₦4.2M",
      marketPosition: "85th percentile",
      increase: "+6.2%",
      status: "Competitive"
    },
    {
      level: "Middle Management",
      count: 156,
      avgSalary: "₦2.1M",
      marketPosition: "75th percentile",
      increase: "+5.8%",
      status: "Market Rate"
    },
    {
      level: "Professional",
      count: 1234,
      avgSalary: "₦1.2M",
      marketPosition: "70th percentile",
      increase: "+4.5%",
      status: "Market Rate"
    },
    {
      level: "Support Staff",
      count: 1400,
      avgSalary: "₦0.6M",
      marketPosition: "65th percentile",
      increase: "+3.8%",
      status: "Below Market"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">HR Division Dashboard</h1>
          <p className="text-gray-600">Workforce management, talent development, and employee engagement</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/hr/employees"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Users className="w-4 h-4 mr-2" />
            Employee Management
          </Link>
          <Link
            href="/hr/recruitment"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Recruitment
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.name} stat={stat} />
        ))}
      </div>

      {/* Workforce Metrics */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Workforce Metrics</h2>
          <Link
            href="/hr/metrics"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View detailed metrics
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {workforceMetrics.map((metric, index) => (
            <WorkforceMetricCard key={index} metric={metric} />
          ))}
        </div>
      </div>

      {/* Department Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Department Workforce Breakdown</h2>
          <Link
            href="/hr/departments"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View department details
          </Link>
        </div>
        <div className="space-y-4">
          {departmentBreakdown.map((dept, index) => (
            <DepartmentItem key={index} department={dept} />
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recruitment Pipeline */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recruitment Pipeline</h2>
            <Link
              href="/hr/recruitment"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Manage recruitment
            </Link>
          </div>
          <div className="space-y-4">
            {recruitmentPipeline.map((position, index) => (
              <RecruitmentItem key={index} position={position} />
            ))}
          </div>
        </div>

        {/* Training Programs */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Training Programs</h2>
            <Link
              href="/hr/training"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Manage training
            </Link>
          </div>
          <div className="space-y-4">
            {trainingPrograms.map((program, index) => (
              <TrainingProgramItem key={index} program={program} />
            ))}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Performance Metrics</h2>
          <Link
            href="/hr/performance"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View performance details
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {performanceMetrics.map((metric, index) => (
            <PerformanceMetricCard key={index} metric={metric} />
          ))}
        </div>
      </div>

      {/* Employee Engagement & Compensation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee Engagement */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Employee Engagement</h2>
            <Link
              href="/hr/engagement"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View engagement survey
            </Link>
          </div>
          <div className="space-y-4">
            {employeeEngagement.map((category, index) => (
              <EngagementItem key={index} category={category} />
            ))}
          </div>
        </div>

        {/* Compensation Analysis */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Compensation Analysis</h2>
            <Link
              href="/hr/compensation"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View compensation details
            </Link>
          </div>
          <div className="space-y-4">
            {compensationAnalysis.map((level, index) => (
              <CompensationItem key={index} level={level} />
            ))}
          </div>
        </div>
      </div>

      {/* HR Alerts & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* HR Alerts */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">HR Alerts</h2>
            <Link
              href="/hr/alerts"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all alerts
            </Link>
          </div>
          <div className="space-y-4">
            {hrAlerts.map((alert) => (
              <HRAlertItem key={alert.id} alert={alert} />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">HR Management Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <QuickActionButton
              title="Employee Management"
              description="Manage employee records"
              icon={Users}
              href="/hr/employees"
              color="bg-blue-50 text-blue-600 hover:bg-blue-100"
            />
            <QuickActionButton
              title="Recruitment"
              description="Hire new talent"
              icon={UserPlus}
              href="/hr/recruitment"
              color="bg-green-50 text-green-600 hover:bg-green-100"
            />
            <QuickActionButton
              title="Training & Development"
              description="Employee development"
              icon={GraduationCap}
              href="/hr/training"
              color="bg-purple-50 text-purple-600 hover:bg-purple-100"
            />
            <QuickActionButton
              title="Performance Management"
              description="Reviews & appraisals"
              icon={Target}
              href="/hr/performance"
              color="bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
            />
            <QuickActionButton
              title="Compensation"
              description="Salary & benefits"
              icon={DollarSign}
              href="/hr/compensation"
              color="bg-red-50 text-red-600 hover:bg-red-100"
            />
            <QuickActionButton
              title="HR Analytics"
              description="Workforce insights"
              icon={BarChart3}
              href="/hr/analytics"
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

function WorkforceMetricCard({ metric }: { metric: any }) {
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

function DepartmentItem({ department }: { department: any }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className={`w-4 h-4 rounded-full ${department.color}`}></div>
        <div>
          <h4 className="text-sm font-medium text-gray-900">{department.department}</h4>
          <p className="text-xs text-gray-500">{department.percentage} of workforce</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold text-gray-900">{department.employees.toLocaleString()}</p>
        <div className="text-sm space-y-1">
          <p className="text-green-600">Growth: {department.growth}</p>
          <p className="text-gray-600">Turnover: {department.turnover}</p>
          <p className="text-blue-600">Satisfaction: {department.satisfaction}</p>
        </div>
      </div>
    </div>
  );
}

function RecruitmentItem({ position }: { position: any }) {
  const statusColorMap = {
    'In Progress': 'bg-blue-100 text-blue-800',
    'Interviewing': 'bg-yellow-100 text-yellow-800',
    'Offer Extended': 'bg-green-100 text-green-800',
    'Final Interview': 'bg-purple-100 text-purple-800'
  };
  const statusColor = statusColorMap[position.status as keyof typeof statusColorMap] || 'bg-gray-100 text-gray-800';

  const priorityColorMap = {
    'Critical': 'bg-red-100 text-red-800',
    'High': 'bg-orange-100 text-orange-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-green-100 text-green-800'
  };
  const priorityColor = priorityColorMap[position.priority as keyof typeof priorityColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h4 className="text-sm font-medium text-gray-900">{position.position}</h4>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
              {position.status}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColor}`}>
              {position.priority}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-2">{position.department} - {position.level}</p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Applicants</p>
          <p className="font-medium">{position.applicants}</p>
        </div>
        <div>
          <p className="text-gray-500">Shortlisted</p>
          <p className="font-medium">{position.shortlisted}</p>
        </div>
        <div>
          <p className="text-gray-500">Interviewed</p>
          <p className="font-medium">{position.interviewed}</p>
        </div>
        <div>
          <p className="text-gray-500">Offers</p>
          <p className="font-medium">{position.offers}</p>
        </div>
      </div>
    </div>
  );
}

function TrainingProgramItem({ program }: { program: any }) {
  const statusColorMap = {
    'Ongoing': 'bg-blue-100 text-blue-800',
    'Completed': 'bg-green-100 text-green-800',
    'Planning': 'bg-yellow-100 text-yellow-800',
    'Cancelled': 'bg-red-100 text-red-800'
  };
  const statusColor = statusColorMap[program.status as keyof typeof statusColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">{program.program}</h4>
          <div className="text-sm text-gray-600 space-y-1 mt-2">
            <p>Participants: {program.participants} | Cost: {program.cost}</p>
            <p>Next Cohort: {program.nextCohort}</p>
          </div>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
          {program.status}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Completion</p>
          <p className="font-medium text-green-600">{program.completion}</p>
        </div>
        <div>
          <p className="text-gray-500">Satisfaction</p>
          <p className="font-medium text-blue-600">{program.satisfaction}</p>
        </div>
      </div>
    </div>
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

function EngagementItem({ category }: { category: any }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div>
        <h4 className="text-sm font-medium text-gray-900">{category.category}</h4>
        <p className="text-xs text-gray-500">{category.benchmark}</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold text-gray-900">{category.score}</p>
        <p className={`text-sm font-medium ${
          category.trend === 'up' ? 'text-green-600' : 'text-red-600'
        }`}>
          {category.change}
        </p>
      </div>
    </div>
  );
}

function CompensationItem({ level }: { level: any }) {
  const statusColorMap = {
    'Competitive': 'bg-green-100 text-green-800',
    'Market Rate': 'bg-blue-100 text-blue-800',
    'Below Market': 'bg-yellow-100 text-yellow-800',
    'Above Market': 'bg-purple-100 text-purple-800'
  };
  const statusColor = statusColorMap[level.status as keyof typeof statusColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">{level.level}</h4>
          <div className="text-sm text-gray-600 space-y-1 mt-2">
            <p>Count: {level.count} employees</p>
            <p>Market Position: {level.marketPosition}</p>
            <p>Increase: {level.increase}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-gray-900">{level.avgSalary}</p>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
            {level.status}
          </span>
        </div>
      </div>
    </div>
  );
}

function HRAlertItem({ alert }: { alert: any }) {
  const severityColorMap = {
    'High': 'bg-red-100 text-red-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-green-100 text-green-800'
  };
  const severityColor = severityColorMap[alert.severity as keyof typeof severityColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h4 className="text-sm font-medium text-gray-900">{alert.type}</h4>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityColor}`}>
              {alert.severity}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
          <div className="text-xs text-gray-500 space-y-1">
            <p>Department: {alert.department}</p>
            <p>Action: {alert.action}</p>
            <p>Timeframe: {alert.timeframe}</p>
          </div>
        </div>
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
