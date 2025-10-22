"use client";

import { useState } from "react";
import {
  GraduationCap,
  BookOpen,
  Users,
  Calendar,
  Filter,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle,
  Minus,
  FileText,
  MapPin,
  Building,
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
  Square as SquareIcon
} from "lucide-react";
import Link from "next/link";

export default function HRTrainingPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const trainingStats = [
    {
      name: "Total Training Programs",
      value: "47",
      change: "+5",
      changeType: "positive",
      icon: GraduationCap,
      description: "Active programs",
      status: "Growing"
    },
    {
      name: "Employees Trained",
      value: "1,247",
      change: "+89",
      changeType: "positive",
      icon: Users,
      description: "This quarter",
      status: "Active"
    },
    {
      name: "Completion Rate",
      value: "94.2%",
      change: "+2.1%",
      changeType: "positive",
      icon: CheckCircle,
      description: "Average completion",
      status: "Excellent"
    },
    {
      name: "Training Hours",
      value: "3,456",
      change: "+234",
      changeType: "positive",
      icon: Clock,
      description: "Total hours logged",
      status: "Increasing"
    }
  ];

  const trainingPrograms = [
    {
      id: "TRN-001",
      title: "NPA Leadership Development Program",
      category: "Leadership",
      status: "Active",
      instructor: "Dr. Sarah Johnson",
      department: "Human Resources",
      createdDate: "2024-01-15",
      lastUpdated: "2024-12-05",
      description: "Comprehensive leadership development program for senior and middle management",
      duration: "6 months",
      totalHours: 120,
      maxParticipants: 25,
      currentParticipants: 23,
      completionRate: 96,
      cost: "₦2,500,000",
      objectives: [
        "Develop strategic thinking capabilities",
        "Enhance team leadership skills",
        "Improve decision-making processes",
        "Build effective communication skills",
        "Foster innovation and change management"
      ],
      modules: [
        { name: "Strategic Leadership", duration: "20 hours", status: "Completed" },
        { name: "Team Management", duration: "18 hours", status: "In Progress" },
        { name: "Communication Excellence", duration: "16 hours", status: "Pending" },
        { name: "Change Management", duration: "14 hours", status: "Pending" },
        { name: "Performance Management", duration: "12 hours", status: "Pending" }
      ],
      prerequisites: ["Minimum 5 years experience", "Management role", "Performance rating ≥ 4.0"],
      certification: "NPA Leadership Certificate",
      nextSession: "2024-12-15",
      location: "NPA Training Center, Lagos",
      format: "Blended (Online + In-person)",
      feedback: {
        average: 4.7,
        total: 156,
        comments: [
          "Excellent program structure and content",
          "Very practical and applicable to daily work",
          "Great instructor with real-world experience"
        ]
      }
    },
    {
      id: "TRN-002",
      title: "Port Operations Safety Training",
      category: "Safety",
      status: "Active",
      instructor: "Eng. Michael Adebayo",
      department: "Marine Operations",
      createdDate: "2024-02-20",
      lastUpdated: "2024-11-28",
      description: "Comprehensive safety training for port operations personnel",
      duration: "2 weeks",
      totalHours: 40,
      maxParticipants: 50,
      currentParticipants: 48,
      completionRate: 98,
      cost: "₦1,200,000",
      objectives: [
        "Understand port safety regulations",
        "Learn emergency response procedures",
        "Master equipment safety protocols",
        "Develop risk assessment skills",
        "Implement safety best practices"
      ],
      modules: [
        { name: "Safety Regulations", duration: "8 hours", status: "Completed" },
        { name: "Emergency Response", duration: "10 hours", status: "Completed" },
        { name: "Equipment Safety", duration: "8 hours", status: "In Progress" },
        { name: "Risk Assessment", duration: "6 hours", status: "Pending" },
        { name: "Safety Management", duration: "8 hours", status: "Pending" }
      ],
      prerequisites: ["Port operations experience", "Valid medical certificate", "Basic English proficiency"],
      certification: "Port Safety Certificate",
      nextSession: "2024-12-20",
      location: "Port Training Facility, Apapa",
      format: "In-person",
      feedback: {
        average: 4.5,
        total: 89,
        comments: [
          "Very practical and hands-on training",
          "Excellent safety protocols covered",
          "Great for port operations staff"
        ]
      }
    },
    {
      id: "TRN-003",
      title: "Digital Transformation for NPA Staff",
      category: "Technology",
      status: "Active",
      instructor: "Tech. Lead David Okafor",
      department: "ICT Division",
      createdDate: "2024-03-10",
      lastUpdated: "2024-12-01",
      description: "Digital skills training to support NPA's digital transformation initiatives",
      duration: "4 weeks",
      totalHours: 60,
      maxParticipants: 30,
      currentParticipants: 28,
      completionRate: 93,
      cost: "₦1,800,000",
      objectives: [
        "Master digital tools and platforms",
        "Understand data analytics basics",
        "Learn cybersecurity fundamentals",
        "Develop digital communication skills",
        "Embrace digital workflow processes"
      ],
      modules: [
        { name: "Digital Tools", duration: "12 hours", status: "Completed" },
        { name: "Data Analytics", duration: "15 hours", status: "In Progress" },
        { name: "Cybersecurity", duration: "10 hours", status: "Pending" },
        { name: "Digital Communication", duration: "8 hours", status: "Pending" },
        { name: "Workflow Automation", duration: "15 hours", status: "Pending" }
      ],
      prerequisites: ["Basic computer skills", "NPA email account", "Willingness to learn"],
      certification: "Digital Skills Certificate",
      nextSession: "2024-12-18",
      location: "ICT Training Lab, NPA HQ",
      format: "Blended (Online + Lab)",
      feedback: {
        average: 4.6,
        total: 67,
        comments: [
          "Great introduction to digital tools",
          "Very relevant to current work needs",
          "Excellent hands-on practice sessions"
        ]
      }
    },
    {
      id: "TRN-004",
      title: "Financial Management for Non-Finance Staff",
      category: "Finance",
      status: "Active",
      instructor: "CFO Mrs. Grace Okonkwo",
      department: "Finance Division",
      createdDate: "2024-04-05",
      lastUpdated: "2024-11-25",
      description: "Financial literacy training for non-finance personnel",
      duration: "3 weeks",
      totalHours: 45,
      maxParticipants: 35,
      currentParticipants: 32,
      completionRate: 91,
      cost: "₦1,500,000",
      objectives: [
        "Understand basic financial concepts",
        "Learn budget preparation and monitoring",
        "Master cost control techniques",
        "Develop financial reporting skills",
        "Understand procurement processes"
      ],
      modules: [
        { name: "Financial Basics", duration: "10 hours", status: "Completed" },
        { name: "Budget Management", duration: "12 hours", status: "Completed" },
        { name: "Cost Control", duration: "8 hours", status: "In Progress" },
        { name: "Financial Reporting", duration: "8 hours", status: "Pending" },
        { name: "Procurement", duration: "7 hours", status: "Pending" }
      ],
      prerequisites: ["Basic numeracy skills", "Department approval", "Interest in finance"],
      certification: "Financial Literacy Certificate",
      nextSession: "2024-12-22",
      location: "Finance Training Room, NPA HQ",
      format: "In-person",
      feedback: {
        average: 4.4,
        total: 45,
        comments: [
          "Very practical financial concepts",
          "Great for understanding budgets",
          "Excellent real-world examples"
        ]
      }
    },
    {
      id: "TRN-005",
      title: "Customer Service Excellence",
      category: "Customer Service",
      status: "Active",
      instructor: "Mrs. Funmi Adebayo",
      department: "Customer Relations",
      createdDate: "2024-05-12",
      lastUpdated: "2024-12-03",
      description: "Customer service training for front-line staff and customer-facing roles",
      duration: "2 weeks",
      totalHours: 35,
      maxParticipants: 40,
      currentParticipants: 38,
      completionRate: 95,
      cost: "₦950,000",
      objectives: [
        "Develop customer service skills",
        "Learn conflict resolution techniques",
        "Master communication strategies",
        "Understand customer expectations",
        "Build customer loyalty"
      ],
      modules: [
        { name: "Service Fundamentals", duration: "8 hours", status: "Completed" },
        { name: "Communication Skills", duration: "10 hours", status: "Completed" },
        { name: "Conflict Resolution", duration: "6 hours", status: "In Progress" },
        { name: "Customer Expectations", duration: "5 hours", status: "Pending" },
        { name: "Loyalty Building", duration: "6 hours", status: "Pending" }
      ],
      prerequisites: ["Customer-facing role", "Good communication skills", "Positive attitude"],
      certification: "Customer Service Certificate",
      nextSession: "2024-12-25",
      location: "Customer Service Training Center",
      format: "In-person",
      feedback: {
        average: 4.8,
        total: 78,
        comments: [
          "Excellent customer service techniques",
          "Very practical and applicable",
          "Great role-playing exercises"
        ]
      }
    }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
    { value: "scheduled", label: "Scheduled" },
    { value: "cancelled", label: "Cancelled" }
  ];

  const categoryOptions = [
    { value: "all", label: "All Categories" },
    { value: "leadership", label: "Leadership" },
    { value: "safety", label: "Safety" },
    { value: "technology", label: "Technology" },
    { value: "finance", label: "Finance" },
    { value: "customer_service", label: "Customer Service" }
  ];

  const filteredPrograms = trainingPrograms.filter(program => {
    const matchesSearch = program.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         program.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         program.instructor.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         program.status.toLowerCase() === statusFilter;
    const matchesCategory = categoryFilter === "all" || 
                           program.category.toLowerCase().replace(" ", "_") === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const statusColorMap = {
    'Active': 'bg-green-100 text-green-800',
    'Completed': 'bg-blue-100 text-blue-800',
    'Scheduled': 'bg-yellow-100 text-yellow-800',
    'Cancelled': 'bg-red-100 text-red-800'
  };

  const categoryColorMap = {
    'Leadership': 'bg-purple-100 text-purple-800',
    'Safety': 'bg-red-100 text-red-800',
    'Technology': 'bg-blue-100 text-blue-800',
    'Finance': 'bg-green-100 text-green-800',
    'Customer Service': 'bg-orange-100 text-orange-800'
  };

  const moduleStatusColorMap = {
    'Completed': 'bg-green-100 text-green-800',
    'In Progress': 'bg-yellow-100 text-yellow-800',
    'Pending': 'bg-gray-100 text-gray-800'
  };

  const formatColorMap = {
    'In-person': 'bg-blue-100 text-blue-800',
    'Online': 'bg-green-100 text-green-800',
    'Blended (Online + In-person)': 'bg-purple-100 text-purple-800',
    'Blended (Online + Lab)': 'bg-orange-100 text-orange-800'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Training Programs</h1>
          <p className="text-gray-600">Manage and track employee training programs and development</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/hr/training/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Program
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Training Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {trainingStats.map((stat) => (
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
                placeholder="Search training programs by title, description, or instructor..."
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
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categoryOptions.map(option => (
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

      {/* Training Programs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredPrograms.map((program) => (
          <div key={program.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <GraduationCap className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{program.title}</h3>
                  <span className="text-sm text-gray-500">#{program.id}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{program.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[program.status as keyof typeof statusColorMap]}`}>
                    {program.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${categoryColorMap[program.category as keyof typeof categoryColorMap]}`}>
                    {program.category}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${formatColorMap[program.format as keyof typeof formatColorMap]}`}>
                    {program.format}
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
                  <Users className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Instructor</p>
                  <p className="text-sm text-gray-600">{program.instructor}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Department</p>
                  <p className="text-sm text-gray-600">{program.department}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Duration</p>
                  <p className="text-sm text-gray-600">{program.duration}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Total Hours</p>
                  <p className="text-sm text-gray-600">{program.totalHours} hours</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Participants</p>
                  <p className="text-sm text-gray-600">{program.currentParticipants}/{program.maxParticipants}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Completion Rate</p>
                  <p className="text-sm text-gray-600">{program.completionRate}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Cost</p>
                  <p className="text-sm text-gray-600">{program.cost}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Next Session</p>
                  <p className="text-sm text-gray-600">{program.nextSession}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Training Modules:</p>
                <div className="space-y-2">
                  {program.modules.slice(0, 3).map((module, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{module.name}</span>
                        <span className="text-gray-500">({module.duration})</span>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${moduleStatusColorMap[module.status as keyof typeof moduleStatusColorMap]}`}>
                        {module.status}
                      </span>
                    </div>
                  ))}
                  {program.modules.length > 3 && (
                    <div className="text-xs text-blue-600">+{program.modules.length - 3} more modules</div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Key Objectives:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {program.objectives.slice(0, 3).map((objective, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>{objective}</span>
                    </li>
                  ))}
                  {program.objectives.length > 3 && (
                    <li className="text-blue-600">+{program.objectives.length - 3} more objectives</li>
                  )}
                </ul>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Feedback:</p>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">{program.feedback.average}</span>
                    <span className="text-gray-500">({program.feedback.total} reviews)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                    <Eye className="w-3 h-3 mr-1" />
                    View Details
                  </button>
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                    <Users className="w-3 h-3 mr-1" />
                    Participants
                  </button>
                </div>
                <Link
                  href={`/hr/training/${program.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Training Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Training Program Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Active Programs</h3>
                <p className="text-xs text-gray-500">Currently running</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {trainingPrograms.filter(p => p.status === 'Active').length}</p>
              <p>Total Participants: {trainingPrograms.filter(p => p.status === 'Active').reduce((sum, p) => sum + p.currentParticipants, 0)}</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Total Participants</h3>
                <p className="text-xs text-gray-500">Across all programs</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Current: {trainingPrograms.reduce((sum, p) => sum + p.currentParticipants, 0)}</p>
              <p>Capacity: {trainingPrograms.reduce((sum, p) => sum + p.maxParticipants, 0)}</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Average Completion</h3>
                <p className="text-xs text-gray-500">Program completion rate</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Rate: {Math.round(trainingPrograms.reduce((sum, p) => sum + p.completionRate, 0) / trainingPrograms.length)}%</p>
              <p>Target: ≥ 90%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Total Investment</h3>
                <p className="text-xs text-gray-500">Training budget</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Amount: ₦{trainingPrograms.reduce((sum, p) => sum + parseInt(p.cost.replace(/[^\d]/g, '')), 0).toLocaleString()}</p>
              <p>ROI: Positive</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Training Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/hr/training/create"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Create Program</h3>
            <p className="text-xs text-gray-500">New training program</p>
          </Link>
          <Link
            href="/hr/training/participants"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Manage Participants</h3>
            <p className="text-xs text-gray-500">Enroll and track</p>
          </Link>
          <Link
            href="/hr/training/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Training Reports</h3>
            <p className="text-xs text-gray-500">Generate reports</p>
          </Link>
          <Link
            href="/hr/training/certificates"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Award className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Certificates</h3>
            <p className="text-xs text-gray-500">Manage certificates</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
