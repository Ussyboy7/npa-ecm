"use client";

import { useState } from "react";
import {
  UserPlus,
  Users,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  Settings,
  Calendar,
  Activity,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Clock,
  Target,
  DollarSign,
  FileText,
  MapPin,
  Building,
  GraduationCap,
  Award,
  UserCheck,
  UserMinus,
  Briefcase,
  Mail,
  Phone,
  Star,
  Heart,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Download,
  Upload
} from "lucide-react";
import Link from "next/link";

export default function HRRecruitmentPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const recruitmentStats = [
    {
      name: "Active Positions",
      value: "24",
      change: "+5",
      changeType: "positive",
      icon: Briefcase,
      description: "Currently open",
      status: "Growing"
    },
    {
      name: "Applications This Month",
      value: "156",
      change: "+23",
      changeType: "positive",
      icon: UserPlus,
      description: "New applications",
      status: "High"
    },
    {
      name: "Hired This Month",
      value: "12",
      change: "+3",
      changeType: "positive",
      icon: UserCheck,
      description: "Successful hires",
      status: "Good"
    },
    {
      name: "Average Time to Hire",
      value: "28 days",
      change: "-5 days",
      changeType: "positive",
      icon: Clock,
      description: "Time to fill position",
      status: "Improving"
    }
  ];

  const jobPositions = [
    {
      id: "POS-001",
      title: "Senior Software Developer",
      department: "ICT Division",
      location: "Lagos HQ",
      type: "Full-time",
      level: "Senior",
      status: "Open",
      priority: "High",
      salary: "₦450,000 - ₦650,000",
      postedDate: "2024-12-01",
      closingDate: "2024-12-31",
      applications: 45,
      shortlisted: 8,
      interviewed: 3,
      hired: 0,
      description: "We are looking for an experienced software developer to join our ICT team and work on cutting-edge port management systems.",
      requirements: [
        "Bachelor's degree in Computer Science or related field",
        "5+ years of software development experience",
        "Proficiency in React, Node.js, and PostgreSQL",
        "Experience with cloud platforms (AWS/Azure)",
        "Strong problem-solving and communication skills"
      ],
      responsibilities: [
        "Develop and maintain web applications",
        "Collaborate with cross-functional teams",
        "Write clean, maintainable code",
        "Participate in code reviews",
        "Mentor junior developers"
      ],
      benefits: [
        "Competitive salary package",
        "Health insurance",
        "Professional development opportunities",
        "Flexible working hours",
        "Annual performance bonus"
      ],
      hiringManager: "Sarah Johnson",
      recruiter: "Michael Chen"
    },
    {
      id: "POS-002",
      title: "Port Operations Manager",
      department: "Marine Operations",
      location: "Lagos Port",
      type: "Full-time",
      level: "Manager",
      status: "Open",
      priority: "Critical",
      salary: "₦800,000 - ₦1,200,000",
      postedDate: "2024-11-25",
      closingDate: "2024-12-20",
      applications: 28,
      shortlisted: 5,
      interviewed: 2,
      hired: 0,
      description: "Lead port operations and ensure efficient cargo handling and vessel management.",
      requirements: [
        "Bachelor's degree in Maritime Studies or related field",
        "8+ years of port operations experience",
        "Strong leadership and management skills",
        "Knowledge of port regulations and procedures",
        "Excellent communication and problem-solving skills"
      ],
      responsibilities: [
        "Oversee daily port operations",
        "Manage port staff and resources",
        "Ensure compliance with regulations",
        "Optimize operational efficiency",
        "Coordinate with shipping companies"
      ],
      benefits: [
        "Competitive salary package",
        "Health insurance",
        "Transportation allowance",
        "Professional development opportunities",
        "Performance-based bonuses"
      ],
      hiringManager: "David Okafor",
      recruiter: "Grace Williams"
    },
    {
      id: "POS-003",
      title: "Financial Analyst",
      department: "Finance Division",
      location: "Lagos HQ",
      type: "Full-time",
      level: "Mid-level",
      status: "Interviewing",
      priority: "Medium",
      salary: "₦350,000 - ₦500,000",
      postedDate: "2024-11-15",
      closingDate: "2024-12-15",
      applications: 32,
      shortlisted: 6,
      interviewed: 4,
      hired: 0,
      description: "Analyze financial data and provide insights to support business decisions.",
      requirements: [
        "Bachelor's degree in Finance, Accounting, or related field",
        "3+ years of financial analysis experience",
        "Proficiency in Excel and financial modeling",
        "Knowledge of accounting principles",
        "Strong analytical and communication skills"
      ],
      responsibilities: [
        "Prepare financial reports and analysis",
        "Develop financial models and forecasts",
        "Support budgeting and planning processes",
        "Analyze investment opportunities",
        "Present findings to management"
      ],
      benefits: [
        "Competitive salary package",
        "Health insurance",
        "Professional development opportunities",
        "Flexible working hours",
        "Annual performance bonus"
      ],
      hiringManager: "Grace Williams",
      recruiter: "Ahmed Hassan"
    },
    {
      id: "POS-004",
      title: "Security Officer",
      department: "Safety & Security",
      location: "Lagos Port",
      type: "Full-time",
      level: "Entry-level",
      status: "Closed",
      priority: "High",
      salary: "₦180,000 - ₦250,000",
      postedDate: "2024-10-01",
      closingDate: "2024-11-30",
      applications: 67,
      shortlisted: 12,
      interviewed: 8,
      hired: 3,
      description: "Ensure port security and safety of personnel and assets.",
      requirements: [
        "High school diploma or equivalent",
        "Security training certification preferred",
        "Physical fitness and good health",
        "Ability to work in shifts",
        "Strong attention to detail"
      ],
      responsibilities: [
        "Monitor port security systems",
        "Conduct security patrols",
        "Respond to security incidents",
        "Maintain security equipment",
        "Report security violations"
      ],
      benefits: [
        "Competitive salary package",
        "Health insurance",
        "Shift allowances",
        "Uniform and equipment provided",
        "Career advancement opportunities"
      ],
      hiringManager: "Ahmed Hassan",
      recruiter: "Fatima Ibrahim"
    },
    {
      id: "POS-005",
      title: "HR Business Partner",
      department: "Human Resources",
      location: "Lagos HQ",
      type: "Full-time",
      level: "Senior",
      status: "Open",
      priority: "Medium",
      salary: "₦600,000 - ₦850,000",
      postedDate: "2024-12-05",
      closingDate: "2025-01-05",
      applications: 18,
      shortlisted: 4,
      interviewed: 1,
      hired: 0,
      description: "Partner with business units to provide strategic HR support and drive organizational effectiveness.",
      requirements: [
        "Bachelor's degree in Human Resources or related field",
        "6+ years of HR experience",
        "Strong knowledge of HR practices and employment law",
        "Excellent interpersonal and communication skills",
        "Experience with HRIS systems"
      ],
      responsibilities: [
        "Partner with business leaders on HR strategy",
        "Manage employee relations and performance",
        "Support talent acquisition and development",
        "Implement HR policies and procedures",
        "Drive organizational culture initiatives"
      ],
      benefits: [
        "Competitive salary package",
        "Health insurance",
        "Professional development opportunities",
        "Flexible working hours",
        "Annual performance bonus"
      ],
      hiringManager: "Michael Chen",
      recruiter: "Sarah Johnson"
    }
  ];

  const candidates = [
    {
      id: "CAN-001",
      name: "John Adebayo",
      email: "john.adebayo@email.com",
      phone: "+234-801-234-5678",
      position: "Senior Software Developer",
      status: "Interviewed",
      appliedDate: "2024-12-05",
      experience: "6 years",
      education: "B.Sc Computer Science",
      skills: ["React", "Node.js", "PostgreSQL", "AWS"],
      rating: 4.5,
      notes: "Strong technical skills, good communication",
      nextStep: "Final Interview",
      scheduledDate: "2024-12-15"
    },
    {
      id: "CAN-002",
      name: "Mary Okonkwo",
      email: "mary.okonkwo@email.com",
      phone: "+234-802-345-6789",
      position: "Port Operations Manager",
      status: "Shortlisted",
      appliedDate: "2024-12-01",
      experience: "10 years",
      education: "B.Sc Maritime Studies",
      skills: ["Port Operations", "Leadership", "Regulations"],
      rating: 4.2,
      notes: "Extensive port experience, leadership qualities",
      nextStep: "Technical Interview",
      scheduledDate: "2024-12-18"
    },
    {
      id: "CAN-003",
      name: "Peter Okafor",
      email: "peter.okafor@email.com",
      phone: "+234-803-456-7890",
      position: "Financial Analyst",
      status: "Hired",
      appliedDate: "2024-11-20",
      experience: "4 years",
      education: "B.Sc Finance",
      skills: ["Financial Analysis", "Excel", "Modeling"],
      rating: 4.7,
      notes: "Excellent analytical skills, cultural fit",
      nextStep: "Onboarding",
      scheduledDate: "2024-12-20"
    }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "open", label: "Open" },
    { value: "interviewing", label: "Interviewing" },
    { value: "closed", label: "Closed" },
    { value: "on_hold", label: "On Hold" }
  ];

  const departmentOptions = [
    { value: "all", label: "All Departments" },
    { value: "ict", label: "ICT Division" },
    { value: "marine", label: "Marine Operations" },
    { value: "finance", label: "Finance Division" },
    { value: "hr", label: "Human Resources" },
    { value: "safety", label: "Safety & Security" }
  ];

  const filteredPositions = jobPositions.filter(position => {
    const matchesSearch = position.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         position.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         position.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         position.status.toLowerCase().replace(" ", "_") === statusFilter;
    const matchesDepartment = departmentFilter === "all" || 
                             position.department.toLowerCase().includes(departmentFilter);
    
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const statusColorMap = {
    'Open': 'bg-green-100 text-green-800',
    'Interviewing': 'bg-blue-100 text-blue-800',
    'Closed': 'bg-gray-100 text-gray-800',
    'On Hold': 'bg-yellow-100 text-yellow-800'
  };

  const priorityColorMap = {
    'Critical': 'bg-red-100 text-red-800',
    'High': 'bg-orange-100 text-orange-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-green-100 text-green-800'
  };

  const candidateStatusColorMap = {
    'Applied': 'bg-blue-100 text-blue-800',
    'Shortlisted': 'bg-yellow-100 text-yellow-800',
    'Interviewed': 'bg-purple-100 text-purple-800',
    'Hired': 'bg-green-100 text-green-800',
    'Rejected': 'bg-red-100 text-red-800'
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recruitment Management</h1>
          <p className="text-gray-600">Manage job positions, applications, and hiring process</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/hr/recruitment/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Post New Job
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <BarChart3 className="w-4 h-4 mr-2" />
            Recruitment Analytics
          </button>
        </div>
      </div>

      {/* Recruitment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {recruitmentStats.map((stat) => (
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
                stat.changeType === 'warning' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {stat.change}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                stat.status === 'Growing' ? 'bg-green-100 text-green-800' :
                stat.status === 'High' ? 'bg-blue-100 text-blue-800' :
                stat.status === 'Good' ? 'bg-green-100 text-green-800' :
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
                placeholder="Search positions by title, department, or description..."
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
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {departmentOptions.map(option => (
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Positions */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Job Positions</h2>
            <Link
              href="/hr/recruitment/positions"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all positions
            </Link>
          </div>
          <div className="space-y-4">
            {filteredPositions.map((position) => (
              <div key={position.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{position.title}</h4>
                    <p className="text-xs text-gray-500">{position.department} | {position.location}</p>
                    <p className="text-xs text-gray-500">{position.type} | {position.level}</p>
                  </div>
                  <div className="flex space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[position.status as keyof typeof statusColorMap]}`}>
                      {position.status}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColorMap[position.priority as keyof typeof priorityColorMap]}`}>
                      {position.priority}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-500">Salary</p>
                    <p className="text-sm font-medium">{position.salary}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Applications</p>
                    <p className="text-sm font-medium">{position.applications}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Shortlisted</p>
                    <p className="text-sm font-medium">{position.shortlisted}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Interviewed</p>
                    <p className="text-sm font-medium">{position.interviewed}</p>
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>Posted: {position.postedDate}</p>
                  <p>Closing: {position.closingDate}</p>
                  <p>Manager: {position.hiringManager}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Candidates */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Candidates</h2>
            <Link
              href="/hr/recruitment/candidates"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all candidates
            </Link>
          </div>
          <div className="space-y-4">
            {candidates.map((candidate) => (
              <div key={candidate.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{candidate.name}</h4>
                    <p className="text-xs text-gray-500">{candidate.position}</p>
                    <p className="text-xs text-gray-500">{candidate.experience} | {candidate.education}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${candidateStatusColorMap[candidate.status as keyof typeof candidateStatusColorMap]}`}>
                    {candidate.status}
                  </span>
                </div>
                
                <div className="mb-3">
                  <div className="flex items-center space-x-1 mb-1">
                    {getRatingStars(candidate.rating)}
                    <span className="text-xs text-gray-500 ml-1">({candidate.rating})</span>
                  </div>
                  <p className="text-xs text-gray-500">{candidate.notes}</p>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>Applied: {candidate.appliedDate}</p>
                  <p>Next: {candidate.nextStep}</p>
                  <p>Scheduled: {candidate.scheduledDate}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recruitment Pipeline */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Recruitment Pipeline</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <UserPlus className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900">Applied</h3>
            <p className="text-2xl font-bold text-blue-600">156</p>
            <p className="text-xs text-gray-500">This month</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Eye className="w-8 h-8 text-yellow-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900">Screened</h3>
            <p className="text-2xl font-bold text-yellow-600">89</p>
            <p className="text-xs text-gray-500">Initial review</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <MessageSquare className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900">Interviewed</h3>
            <p className="text-2xl font-bold text-purple-600">34</p>
            <p className="text-xs text-gray-500">Interview stage</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <UserCheck className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900">Offered</h3>
            <p className="text-2xl font-bold text-green-600">12</p>
            <p className="text-xs text-gray-500">Job offers</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Award className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900">Hired</h3>
            <p className="text-2xl font-bold text-gray-600">8</p>
            <p className="text-xs text-gray-500">Successful hires</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recruitment Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/hr/recruitment/create"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Post New Job</h3>
            <p className="text-xs text-gray-500">Create job posting</p>
          </Link>
          <Link
            href="/hr/recruitment/candidates"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Manage Candidates</h3>
            <p className="text-xs text-gray-500">Review applications</p>
          </Link>
          <Link
            href="/hr/recruitment/interviews"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Calendar className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Schedule Interviews</h3>
            <p className="text-xs text-gray-500">Manage interviews</p>
          </Link>
          <Link
            href="/hr/recruitment/analytics"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Recruitment Analytics</h3>
            <p className="text-xs text-gray-500">View analytics</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
