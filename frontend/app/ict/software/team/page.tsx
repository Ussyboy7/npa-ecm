"use client";

import { useState } from "react";
import {
  Users,
  UserPlus,
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
  Mail,
  Phone,
  MessageSquare,
  Github,
  Linkedin,
  Twitter,
  ExternalLink
} from "lucide-react";
import Link from "next/link";

export default function ICTSoftwareTeamPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const teamStats = [
    {
      name: "Total Team Members",
      value: "24",
      change: "+3",
      changeType: "positive",
      icon: Users,
      description: "Active developers",
      status: "Growing"
    },
    {
      name: "Senior Developers",
      value: "8",
      change: "+1",
      changeType: "positive",
      icon: Star,
      description: "Senior level",
      status: "Strong"
    },
    {
      name: "Active Projects",
      value: "12",
      change: "+2",
      changeType: "positive",
      icon: Code,
      description: "Currently working",
      status: "Busy"
    },
    {
      name: "Team Utilization",
      value: "87%",
      change: "+5%",
      changeType: "positive",
      icon: Gauge,
      description: "Average capacity",
      status: "Optimal"
    }
  ];

  const teamMembers = [
    {
      id: "DEV-001",
      name: "Dr. Sarah Johnson",
      role: "Senior Software Architect",
      level: "Senior",
      status: "Active",
      department: "Software Applications",
      email: "sarah.johnson@npa.gov.ng",
      phone: "+234-801-234-5678",
      location: "Lagos Office",
      joinDate: "2022-03-15",
      lastActive: "2024-12-10 14:30:00",
      avatar: "/avatars/sarah.jpg",
      skills: [
        "React", "Node.js", "Python", "AWS", "Docker", "Kubernetes", "Microservices", "System Design"
      ],
      currentProjects: [
        { name: "ECM System", role: "Lead Architect", progress: 85 },
        { name: "Port Management", role: "Technical Lead", progress: 92 },
        { name: "API Gateway", role: "Architect", progress: 78 }
      ],
      performance: {
        rating: 4.8,
        commits: 156,
        codeReviews: 89,
        bugsFixed: 23,
        featuresDelivered: 12
      },
      availability: {
        status: "Available",
        nextVacation: "2025-02-15",
        workload: 85
      },
      certifications: [
        "AWS Solutions Architect",
        "Certified Kubernetes Administrator",
        "Microsoft Azure Developer"
      ],
      education: "PhD Computer Science - University of Lagos",
      experience: "8 years",
      github: "sarah-johnson",
      linkedin: "sarah-johnson-dev",
      bio: "Experienced software architect with expertise in cloud-native applications and microservices architecture."
    },
    {
      id: "DEV-002",
      name: "Eng. Michael Adebayo",
      role: "Full Stack Developer",
      level: "Mid-Level",
      status: "Active",
      department: "Software Applications",
      email: "michael.adebayo@npa.gov.ng",
      phone: "+234-802-345-6789",
      location: "Lagos Office",
      joinDate: "2023-01-20",
      lastActive: "2024-12-10 13:45:00",
      avatar: "/avatars/michael.jpg",
      skills: [
        "React", "Vue.js", "Node.js", "MongoDB", "PostgreSQL", "Redis", "GraphQL", "TypeScript"
      ],
      currentProjects: [
        { name: "ECM System", role: "Frontend Developer", progress: 85 },
        { name: "Mobile App", role: "Full Stack Developer", progress: 65 }
      ],
      performance: {
        rating: 4.3,
        commits: 234,
        codeReviews: 67,
        bugsFixed: 18,
        featuresDelivered: 8
      },
      availability: {
        status: "Available",
        nextVacation: "2025-01-20",
        workload: 75
      },
      certifications: [
        "MongoDB Certified Developer",
        "React Developer Certification"
      ],
      education: "BSc Computer Science - University of Ibadan",
      experience: "4 years",
      github: "michael-adebayo",
      linkedin: "michael-adebayo-dev",
      bio: "Passionate full-stack developer with strong focus on modern web technologies and user experience."
    },
    {
      id: "DEV-003",
      name: "Mrs. Grace Okonkwo",
      role: "Backend Developer",
      level: "Senior",
      status: "Active",
      department: "Software Applications",
      email: "grace.okonkwo@npa.gov.ng",
      phone: "+234-803-456-7890",
      location: "Lagos Office",
      joinDate: "2021-08-10",
      lastActive: "2024-12-10 12:20:00",
      avatar: "/avatars/grace.jpg",
      skills: [
        "Python", "Django", "FastAPI", "PostgreSQL", "Redis", "Celery", "Docker", "AWS"
      ],
      currentProjects: [
        { name: "ECM System", role: "Backend Lead", progress: 85 },
        { name: "Data Pipeline", role: "Senior Developer", progress: 70 },
        { name: "API Services", role: "Lead Developer", progress: 95 }
      ],
      performance: {
        rating: 4.6,
        commits: 189,
        codeReviews: 112,
        bugsFixed: 31,
        featuresDelivered: 15
      },
      availability: {
        status: "Available",
        nextVacation: "2025-03-10",
        workload: 90
      },
      certifications: [
        "Python Institute Certification",
        "AWS Developer Associate",
        "Django Certified Developer"
      ],
      education: "MSc Software Engineering - University of Lagos",
      experience: "6 years",
      github: "grace-okonkwo",
      linkedin: "grace-okonkwo-dev",
      bio: "Senior backend developer specializing in scalable Python applications and database optimization."
    },
    {
      id: "DEV-004",
      name: "Mr. David Okafor",
      role: "Frontend Developer",
      level: "Mid-Level",
      status: "Active",
      department: "Software Applications",
      email: "david.okafor@npa.gov.ng",
      phone: "+234-804-567-8901",
      location: "Lagos Office",
      joinDate: "2023-06-05",
      lastActive: "2024-12-10 11:15:00",
      avatar: "/avatars/david.jpg",
      skills: [
        "React", "Next.js", "TypeScript", "Tailwind CSS", "Storybook", "Jest", "Cypress", "Figma"
      ],
      currentProjects: [
        { name: "ECM System", role: "Frontend Developer", progress: 85 },
        { name: "Design System", role: "UI Developer", progress: 60 }
      ],
      performance: {
        rating: 4.1,
        commits: 198,
        codeReviews: 45,
        bugsFixed: 12,
        featuresDelivered: 6
      },
      availability: {
        status: "Available",
        nextVacation: "2025-02-28",
        workload: 70
      },
      certifications: [
        "React Developer Certification",
        "UI/UX Design Certificate"
      ],
      education: "BSc Computer Science - Covenant University",
      experience: "3 years",
      github: "david-okafor",
      linkedin: "david-okafor-dev",
      bio: "Creative frontend developer with strong design skills and attention to user experience details."
    },
    {
      id: "DEV-005",
      name: "Mrs. Funmi Adebayo",
      role: "DevOps Engineer",
      level: "Senior",
      status: "Active",
      department: "Software Applications",
      email: "funmi.adebayo@npa.gov.ng",
      phone: "+234-805-678-9012",
      location: "Lagos Office",
      joinDate: "2020-11-12",
      lastActive: "2024-12-10 10:30:00",
      avatar: "/avatars/funmi.jpg",
      skills: [
        "AWS", "Docker", "Kubernetes", "Terraform", "Jenkins", "GitLab CI", "Prometheus", "Grafana"
      ],
      currentProjects: [
        { name: "Infrastructure", role: "DevOps Lead", progress: 80 },
        { name: "CI/CD Pipeline", role: "Senior Engineer", progress: 95 },
        { name: "Monitoring", role: "Lead Engineer", progress: 88 }
      ],
      performance: {
        rating: 4.7,
        commits: 145,
        codeReviews: 78,
        bugsFixed: 19,
        featuresDelivered: 11
      },
      availability: {
        status: "Available",
        nextVacation: "2025-01-15",
        workload: 85
      },
      certifications: [
        "AWS Solutions Architect",
        "Certified Kubernetes Administrator",
        "Terraform Associate"
      ],
      education: "BSc Computer Engineering - University of Lagos",
      experience: "7 years",
      github: "funmi-adebayo",
      linkedin: "funmi-adebayo-devops",
      bio: "Experienced DevOps engineer with expertise in cloud infrastructure and automation."
    },
    {
      id: "DEV-006",
      name: "Mr. Chinedu Nwosu",
      role: "Mobile Developer",
      level: "Mid-Level",
      status: "Active",
      department: "Software Applications",
      email: "chinedu.nwosu@npa.gov.ng",
      phone: "+234-806-789-0123",
      location: "Lagos Office",
      joinDate: "2023-09-18",
      lastActive: "2024-12-10 09:45:00",
      avatar: "/avatars/chinedu.jpg",
      skills: [
        "React Native", "Flutter", "iOS", "Android", "Firebase", "Redux", "TypeScript", "Jest"
      ],
      currentProjects: [
        { name: "Mobile App", role: "Mobile Developer", progress: 65 },
        { name: "ECM Mobile", role: "Lead Mobile Dev", progress: 40 }
      ],
      performance: {
        rating: 4.2,
        commits: 167,
        codeReviews: 34,
        bugsFixed: 15,
        featuresDelivered: 7
      },
      availability: {
        status: "Available",
        nextVacation: "2025-04-05",
        workload: 80
      },
      certifications: [
        "React Native Certification",
        "Flutter Developer Certification"
      ],
      education: "BSc Computer Science - University of Nigeria",
      experience: "3 years",
      github: "chinedu-nwosu",
      linkedin: "chinedu-nwosu-mobile",
      bio: "Mobile developer with expertise in cross-platform development and native mobile applications."
    }
  ];

  const roleOptions = [
    { value: "all", label: "All Roles" },
    { value: "senior_software_architect", label: "Senior Software Architect" },
    { value: "full_stack_developer", label: "Full Stack Developer" },
    { value: "backend_developer", label: "Backend Developer" },
    { value: "frontend_developer", label: "Frontend Developer" },
    { value: "devops_engineer", label: "DevOps Engineer" },
    { value: "mobile_developer", label: "Mobile Developer" }
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "on_leave", label: "On Leave" },
    { value: "busy", label: "Busy" },
    { value: "available", label: "Available" }
  ];

  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === "all" || 
                       member.role.toLowerCase().replace(" ", "_") === roleFilter;
    const matchesStatus = statusFilter === "all" || 
                         member.status.toLowerCase() === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const levelColorMap = {
    'Senior': 'bg-purple-100 text-purple-800',
    'Mid-Level': 'bg-blue-100 text-blue-800',
    'Junior': 'bg-green-100 text-green-800',
    'Lead': 'bg-red-100 text-red-800'
  };

  const statusColorMap = {
    'Active': 'bg-green-100 text-green-800',
    'On Leave': 'bg-yellow-100 text-yellow-800',
    'Busy': 'bg-orange-100 text-orange-800',
    'Available': 'bg-blue-100 text-blue-800'
  };

  const availabilityColorMap = {
    'Available': 'bg-green-100 text-green-800',
    'Busy': 'bg-orange-100 text-orange-800',
    'On Leave': 'bg-yellow-100 text-yellow-800',
    'Unavailable': 'bg-red-100 text-red-800'
  };

  const getWorkloadColor = (workload: number) => {
    if (workload >= 90) return 'text-red-600';
    if (workload >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Software Development Team</h1>
          <p className="text-gray-600">Manage and track software development team members and their activities</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/ict/software/team/add"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Member
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Export Team
          </button>
        </div>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {teamStats.map((stat) => (
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
                stat.status === 'Strong' ? 'bg-blue-100 text-blue-800' :
                stat.status === 'Busy' ? 'bg-orange-100 text-orange-800' :
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
                placeholder="Search team members by name, role, or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {roleOptions.map(option => (
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

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredMembers.map((member) => (
          <div key={member.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                  <p className="text-sm text-gray-600">{member.role}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${levelColorMap[member.level as keyof typeof levelColorMap]}`}>
                      {member.level}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[member.status as keyof typeof statusColorMap]}`}>
                      {member.status}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${availabilityColorMap[member.availability.status as keyof typeof availabilityColorMap]}`}>
                      {member.availability.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg">
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg">
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Department</p>
                  <p className="text-sm text-gray-600">{member.department}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Location</p>
                  <p className="text-sm text-gray-600">{member.location}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Experience</p>
                  <p className="text-sm text-gray-600">{member.experience}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Join Date</p>
                  <p className="text-sm text-gray-600">{member.joinDate}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Last Active</p>
                  <p className="text-sm text-gray-600">{member.lastActive}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Workload</p>
                  <p className={`text-sm font-medium ${getWorkloadColor(member.availability.workload)}`}>
                    {member.availability.workload}%
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Contact Information:</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{member.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{member.phone}</span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Technical Skills:</p>
                <div className="flex flex-wrap gap-1">
                  {member.skills.map((skill, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Current Projects:</p>
                <div className="space-y-2">
                  {member.currentProjects.map((project, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{project.name}</p>
                        <p className="text-gray-600">{project.role}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-600">{project.progress}%</span>
                        <div className="w-16 h-2 bg-gray-200 rounded-full mt-1">
                          <div 
                            className="h-2 bg-blue-600 rounded-full" 
                            style={{ width: `${project.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Performance Metrics:</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Rating</p>
                    <p className="text-gray-900">{member.performance.rating}/5.0</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Commits</p>
                    <p className="text-gray-900">{member.performance.commits}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Code Reviews</p>
                    <p className="text-gray-900">{member.performance.codeReviews}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Bugs Fixed</p>
                    <p className="text-gray-900">{member.performance.bugsFixed}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Certifications:</p>
                <div className="flex flex-wrap gap-1">
                  {member.certifications.map((cert, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                      {cert}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Social Links:</p>
                <div className="flex space-x-2">
                  <a href={`https://github.com/${member.github}`} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                    <Github className="w-4 h-4" />
                  </a>
                  <a href={`https://linkedin.com/in/${member.linkedin}`} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                    <Linkedin className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Bio:</p>
                <p className="text-sm text-gray-600">{member.bio}</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                    <Eye className="w-3 h-3 mr-1" />
                    View Profile
                  </button>
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Message
                  </button>
                </div>
                <Link
                  href={`/ict/software/team/${member.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Team Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Team Performance Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Active Members</h3>
                <p className="text-xs text-gray-500">Currently working</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {teamMembers.filter(m => m.status === 'Active').length}</p>
              <p>Percentage: {Math.round((teamMembers.filter(m => m.status === 'Active').length / teamMembers.length) * 100)}%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Star className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Average Rating</h3>
                <p className="text-xs text-gray-500">Team performance</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Rating: {Math.round((teamMembers.reduce((sum, m) => sum + m.performance.rating, 0) / teamMembers.length) * 10) / 10}/5.0</p>
              <p>Status: Excellent</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Code className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Total Commits</h3>
                <p className="text-xs text-gray-500">This month</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {teamMembers.reduce((sum, m) => sum + m.performance.commits, 0)}</p>
              <p>Average: {Math.round(teamMembers.reduce((sum, m) => sum + m.performance.commits, 0) / teamMembers.length)}</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Gauge className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Team Utilization</h3>
                <p className="text-xs text-gray-500">Average workload</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Average: {Math.round(teamMembers.reduce((sum, m) => sum + m.availability.workload, 0) / teamMembers.length)}%</p>
              <p>Status: Optimal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/ict/software/team/add"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <UserPlus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">Add Team Member</h3>
            <p className="text-xs text-gray-500">New developer</p>
          </Link>
          <Link
            href="/ict/software/team/projects"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Code className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Project Assignment</h3>
            <p className="text-xs text-gray-500">Assign projects</p>
          </Link>
          <Link
            href="/ict/software/team/performance"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Performance Review</h3>
            <p className="text-xs text-gray-500">Track performance</p>
          </Link>
          <Link
            href="/ict/software/team/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Team Reports</h3>
            <p className="text-xs text-gray-500">Generate reports</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
