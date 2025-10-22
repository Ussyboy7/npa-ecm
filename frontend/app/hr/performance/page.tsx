"use client";

import { useState } from "react";
import {
  TrendingUp,
  Users,
  Target,
  Award,
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
  GraduationCap,
  BookOpen
} from "lucide-react";
import Link from "next/link";

export default function HRPerformancePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");

  const performanceStats = [
    {
      name: "Total Employees",
      value: "1,247",
      change: "+23",
      changeType: "positive",
      icon: Users,
      description: "Active employees",
      status: "Growing"
    },
    {
      name: "Average Rating",
      value: "4.2",
      change: "+0.1",
      changeType: "positive",
      icon: Star,
      description: "Out of 5.0",
      status: "Excellent"
    },
    {
      name: "Top Performers",
      value: "156",
      change: "+12",
      changeType: "positive",
      icon: Award,
      description: "Rating ≥ 4.5",
      status: "High"
    },
    {
      name: "Improvement Needed",
      value: "23",
      change: "-5",
      changeType: "positive",
      icon: TrendingUp,
      description: "Rating < 3.0",
      status: "Improving"
    }
  ];

  const performanceReviews = [
    {
      id: "PERF-001",
      employeeName: "Dr. Sarah Johnson",
      employeeId: "EMP-001",
      position: "General Manager - ICT",
      department: "ICT Division",
      manager: "Mr. Michael Adebayo",
      reviewPeriod: "Q4 2024",
      reviewDate: "2024-12-10",
      overallRating: 4.8,
      status: "Completed",
      goals: [
        {
          goal: "Implement digital transformation initiatives",
          target: "Complete 3 major projects",
          achieved: "Completed 4 projects",
          rating: 5.0,
          weight: 30
        },
        {
          goal: "Improve team productivity",
          target: "Increase efficiency by 20%",
          achieved: "Increased by 25%",
          rating: 4.5,
          weight: 25
        },
        {
          goal: "Enhance customer satisfaction",
          target: "Achieve 90% satisfaction",
          achieved: "Achieved 94%",
          rating: 4.5,
          weight: 20
        },
        {
          goal: "Develop team members",
          target: "Complete 5 training programs",
          achieved: "Completed 6 programs",
          rating: 5.0,
          weight: 15
        },
        {
          goal: "Budget management",
          target: "Stay within budget",
          achieved: "Under budget by 5%",
          rating: 4.5,
          weight: 10
        }
      ],
      competencies: [
        { competency: "Leadership", rating: 4.8, comments: "Excellent leadership skills" },
        { competency: "Communication", rating: 4.5, comments: "Clear and effective communication" },
        { competency: "Problem Solving", rating: 4.7, comments: "Strong analytical abilities" },
        { competency: "Teamwork", rating: 4.6, comments: "Collaborative approach" },
        { competency: "Innovation", rating: 4.9, comments: "Creative solutions" }
      ],
      achievements: [
        "Successfully launched ECM system",
        "Reduced system downtime by 40%",
        "Led team of 25+ professionals",
        "Implemented cost-saving measures",
        "Mentored 3 junior staff members"
      ],
      areasForImprovement: [
        "Time management during peak periods",
        "Delegation of routine tasks"
      ],
      developmentPlan: [
        "Attend advanced leadership workshop",
        "Complete project management certification",
        "Mentor new team members"
      ],
      nextReviewDate: "2025-03-10",
      salaryIncrease: "8%",
      promotionEligible: true,
      bonus: "₦2,500,000",
      comments: "Outstanding performance across all areas. Strong candidate for promotion."
    },
    {
      id: "PERF-002",
      employeeName: "Eng. Michael Adebayo",
      employeeId: "EMP-002",
      position: "Port Operations Manager",
      department: "Marine Operations",
      manager: "Capt. Funmi Adebayo",
      reviewPeriod: "Q4 2024",
      reviewDate: "2024-12-09",
      overallRating: 4.3,
      status: "Completed",
      goals: [
        {
          goal: "Improve port efficiency",
          target: "Reduce vessel turnaround time by 15%",
          achieved: "Reduced by 18%",
          rating: 4.5,
          weight: 35
        },
        {
          goal: "Safety compliance",
          target: "Zero safety incidents",
          achieved: "1 minor incident",
          rating: 4.0,
          weight: 30
        },
        {
          goal: "Cost optimization",
          target: "Reduce operational costs by 10%",
          achieved: "Reduced by 12%",
          rating: 4.5,
          weight: 20
        },
        {
          goal: "Team development",
          target: "Train 10 team members",
          achieved: "Trained 12 members",
          rating: 4.5,
          weight: 15
        }
      ],
      competencies: [
        { competency: "Leadership", rating: 4.2, comments: "Good leadership skills" },
        { competency: "Communication", rating: 4.0, comments: "Effective communication" },
        { competency: "Problem Solving", rating: 4.4, comments: "Strong problem-solving" },
        { competency: "Teamwork", rating: 4.3, comments: "Works well with team" },
        { competency: "Safety Awareness", rating: 4.1, comments: "Good safety practices" }
      ],
      achievements: [
        "Improved port efficiency significantly",
        "Maintained high safety standards",
        "Reduced operational costs",
        "Developed team members",
        "Implemented new procedures"
      ],
      areasForImprovement: [
        "Safety incident prevention",
        "Communication with external stakeholders"
      ],
      developmentPlan: [
        "Attend safety management course",
        "Complete communication skills training",
        "Lead safety improvement initiative"
      ],
      nextReviewDate: "2025-03-09",
      salaryIncrease: "5%",
      promotionEligible: false,
      bonus: "₦1,800,000",
      comments: "Good performance with room for improvement in safety management."
    },
    {
      id: "PERF-003",
      employeeName: "Mrs. Grace Okonkwo",
      employeeId: "EMP-003",
      position: "Chief Financial Officer",
      department: "Finance Division",
      manager: "Mr. Michael Adebayo",
      reviewPeriod: "Q4 2024",
      reviewDate: "2024-12-08",
      overallRating: 4.6,
      status: "Completed",
      goals: [
        {
          goal: "Financial reporting accuracy",
          target: "100% accuracy in reports",
          achieved: "99.8% accuracy",
          rating: 4.5,
          weight: 30
        },
        {
          goal: "Budget management",
          target: "Stay within budget",
          achieved: "Under budget by 3%",
          rating: 4.5,
          weight: 25
        },
        {
          goal: "Compliance",
          target: "Zero compliance issues",
          achieved: "Zero issues",
          rating: 5.0,
          weight: 25
        },
        {
          goal: "Team development",
          target: "Develop 5 team members",
          achieved: "Developed 6 members",
          rating: 4.5,
          weight: 20
        }
      ],
      competencies: [
        { competency: "Leadership", rating: 4.5, comments: "Strong leadership" },
        { competency: "Communication", rating: 4.4, comments: "Clear communication" },
        { competency: "Problem Solving", rating: 4.6, comments: "Excellent analysis" },
        { competency: "Teamwork", rating: 4.5, comments: "Collaborative leader" },
        { competency: "Financial Acumen", rating: 4.8, comments: "Expert financial knowledge" }
      ],
      achievements: [
        "Maintained excellent financial controls",
        "Improved reporting processes",
        "Ensured full compliance",
        "Developed finance team",
        "Implemented cost controls"
      ],
      areasForImprovement: [
        "Technology adoption",
        "Cross-department collaboration"
      ],
      developmentPlan: [
        "Complete digital finance course",
        "Attend leadership summit",
        "Lead cross-functional projects"
      ],
      nextReviewDate: "2025-03-08",
      salaryIncrease: "7%",
      promotionEligible: true,
      bonus: "₦2,200,000",
      comments: "Excellent financial leadership with strong compliance record."
    },
    {
      id: "PERF-004",
      employeeName: "Mr. David Okafor",
      employeeId: "EMP-004",
      position: "Senior Software Developer",
      department: "ICT Division",
      manager: "Dr. Sarah Johnson",
      reviewPeriod: "Q4 2024",
      reviewDate: "2024-12-07",
      overallRating: 4.1,
      status: "Completed",
      goals: [
        {
          goal: "Software development",
          target: "Complete 5 projects",
          achieved: "Completed 4 projects",
          rating: 4.0,
          weight: 40
        },
        {
          goal: "Code quality",
          target: "95% code coverage",
          achieved: "92% coverage",
          rating: 3.5,
          weight: 25
        },
        {
          goal: "Team collaboration",
          target: "Lead 2 team projects",
          achieved: "Led 2 projects",
          rating: 4.5,
          weight: 20
        },
        {
          goal: "Learning and development",
          target: "Complete 3 certifications",
          achieved: "Completed 2 certifications",
          rating: 3.5,
          weight: 15
        }
      ],
      competencies: [
        { competency: "Technical Skills", rating: 4.2, comments: "Strong technical abilities" },
        { competency: "Communication", rating: 3.8, comments: "Good communication" },
        { competency: "Problem Solving", rating: 4.3, comments: "Strong problem-solving" },
        { competency: "Teamwork", rating: 4.1, comments: "Works well in team" },
        { competency: "Innovation", rating: 4.0, comments: "Creative solutions" }
      ],
      achievements: [
        "Delivered key software projects",
        "Improved development processes",
        "Mentored junior developers",
        "Contributed to team success",
        "Maintained good code quality"
      ],
      areasForImprovement: [
        "Code testing and coverage",
        "Communication skills",
        "Time management"
      ],
      developmentPlan: [
        "Complete testing certification",
        "Attend communication workshop",
        "Improve time management skills"
      ],
      nextReviewDate: "2025-03-07",
      salaryIncrease: "4%",
      promotionEligible: false,
      bonus: "₦1,200,000",
      comments: "Good technical performance with areas for improvement in testing and communication."
    },
    {
      id: "PERF-005",
      employeeName: "Mrs. Funmi Adebayo",
      employeeId: "EMP-005",
      position: "Customer Relations Manager",
      department: "Customer Relations",
      manager: "Mr. Michael Adebayo",
      reviewPeriod: "Q4 2024",
      reviewDate: "2024-12-06",
      overallRating: 4.4,
      status: "Completed",
      goals: [
        {
          goal: "Customer satisfaction",
          target: "Achieve 95% satisfaction",
          achieved: "Achieved 96%",
          rating: 4.5,
          weight: 35
        },
        {
          goal: "Response time",
          target: "Respond within 2 hours",
          achieved: "Average 1.5 hours",
          rating: 4.5,
          weight: 25
        },
        {
          goal: "Team management",
          target: "Manage 15 team members",
          achieved: "Managed 15 members",
          rating: 4.3,
          weight: 20
        },
        {
          goal: "Process improvement",
          target: "Implement 3 improvements",
          achieved: "Implemented 4 improvements",
          rating: 4.5,
          weight: 20
        }
      ],
      competencies: [
        { competency: "Leadership", rating: 4.3, comments: "Good leadership skills" },
        { competency: "Communication", rating: 4.6, comments: "Excellent communication" },
        { competency: "Problem Solving", rating: 4.2, comments: "Good problem-solving" },
        { competency: "Teamwork", rating: 4.4, comments: "Strong team player" },
        { competency: "Customer Focus", rating: 4.7, comments: "Exceptional customer service" }
      ],
      achievements: [
        "Exceeded customer satisfaction targets",
        "Improved response times",
        "Led customer relations team",
        "Implemented process improvements",
        "Maintained high service standards"
      ],
      areasForImprovement: [
        "Conflict resolution",
        "Data analysis skills"
      ],
      developmentPlan: [
        "Complete conflict resolution training",
        "Attend data analysis course",
        "Lead customer feedback initiative"
      ],
      nextReviewDate: "2025-03-06",
      salaryIncrease: "6%",
      promotionEligible: true,
      bonus: "₦1,900,000",
      comments: "Strong customer focus with excellent communication skills."
    }
  ];

  const departmentOptions = [
    { value: "all", label: "All Departments" },
    { value: "ict_division", label: "ICT Division" },
    { value: "marine_operations", label: "Marine Operations" },
    { value: "finance_division", label: "Finance Division" },
    { value: "customer_relations", label: "Customer Relations" }
  ];

  const ratingOptions = [
    { value: "all", label: "All Ratings" },
    { value: "excellent", label: "Excellent (4.5-5.0)" },
    { value: "good", label: "Good (4.0-4.4)" },
    { value: "satisfactory", label: "Satisfactory (3.5-3.9)" },
    { value: "needs_improvement", label: "Needs Improvement (<3.5)" }
  ];

  const filteredReviews = performanceReviews.filter(review => {
    const matchesSearch = review.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         review.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         review.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter === "all" || 
                             review.department.toLowerCase().replace(" ", "_") === departmentFilter;
    const matchesRating = ratingFilter === "all" || 
                         (ratingFilter === "excellent" && review.overallRating >= 4.5) ||
                         (ratingFilter === "good" && review.overallRating >= 4.0 && review.overallRating < 4.5) ||
                         (ratingFilter === "satisfactory" && review.overallRating >= 3.5 && review.overallRating < 4.0) ||
                         (ratingFilter === "needs_improvement" && review.overallRating < 3.5);
    
    return matchesSearch && matchesDepartment && matchesRating;
  });

  const statusColorMap = {
    'Completed': 'bg-green-100 text-green-800',
    'In Progress': 'bg-yellow-100 text-yellow-800',
    'Pending': 'bg-blue-100 text-blue-800',
    'Overdue': 'bg-red-100 text-red-800'
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'bg-green-100 text-green-800';
    if (rating >= 4.0) return 'bg-blue-100 text-blue-800';
    if (rating >= 3.5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getRatingText = (rating: number) => {
    if (rating >= 4.5) return 'Excellent';
    if (rating >= 4.0) return 'Good';
    if (rating >= 3.5) return 'Satisfactory';
    return 'Needs Improvement';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Performance Management</h1>
          <p className="text-gray-600">Track and manage employee performance reviews and evaluations</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/hr/performance/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Review
          </Link>
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {performanceStats.map((stat) => (
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
                stat.status === 'Excellent' ? 'bg-blue-100 text-blue-800' :
                stat.status === 'High' ? 'bg-purple-100 text-purple-800' :
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
                placeholder="Search employees by name, position, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
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
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {ratingOptions.map(option => (
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

      {/* Performance Reviews Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredReviews.map((review) => (
          <div key={review.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <User className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{review.employeeName}</h3>
                  <span className="text-sm text-gray-500">#{review.id}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{review.position} - {review.department}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[review.status as keyof typeof statusColorMap]}`}>
                    {review.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRatingColor(review.overallRating)}`}>
                    {review.overallRating}/5.0 - {getRatingText(review.overallRating)}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                    {review.reviewPeriod}
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
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Manager</p>
                  <p className="text-sm text-gray-600">{review.manager}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Review Date</p>
                  <p className="text-sm text-gray-600">{review.reviewDate}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Next Review</p>
                  <p className="text-sm text-gray-600">{review.nextReviewDate}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Salary Increase</p>
                  <p className="text-sm text-gray-600">{review.salaryIncrease}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Bonus</p>
                  <p className="text-sm text-gray-600">{review.bonus}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Promotion Eligible</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    review.promotionEligible ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {review.promotionEligible ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Key Goals Performance:</p>
                <div className="space-y-2">
                  {review.goals.slice(0, 3).map((goal, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{goal.goal}</p>
                        <p className="text-gray-600">Target: {goal.target}</p>
                        <p className="text-gray-600">Achieved: {goal.achieved}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs rounded-full ${getRatingColor(goal.rating)}`}>
                          {goal.rating}/5.0
                        </span>
                        <p className="text-xs text-gray-500 mt-1">Weight: {goal.weight}%</p>
                      </div>
                    </div>
                  ))}
                  {review.goals.length > 3 && (
                    <div className="text-xs text-blue-600">+{review.goals.length - 3} more goals</div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Competency Ratings:</p>
                <div className="grid grid-cols-2 gap-2">
                  {review.competencies.map((comp, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{comp.competency}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getRatingColor(comp.rating)}`}>
                        {comp.rating}/5.0
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Key Achievements:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {review.achievements.slice(0, 3).map((achievement, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-green-600 mt-0.5">•</span>
                      <span>{achievement}</span>
                    </li>
                  ))}
                  {review.achievements.length > 3 && (
                    <li className="text-blue-600">+{review.achievements.length - 3} more achievements</li>
                  )}
                </ul>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Areas for Improvement:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {review.areasForImprovement.map((area, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-yellow-600 mt-0.5">•</span>
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Development Plan:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {review.developmentPlan.map((plan, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>{plan}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Manager Comments:</p>
                <p className="text-xs text-gray-600 italic">"{review.comments}"</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                    <Eye className="w-3 h-3 mr-1" />
                    View Full
                  </button>
                  <button className="inline-flex items-center px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </button>
                </div>
                <Link
                  href={`/hr/performance/${review.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Performance Review Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Completed Reviews</h3>
                <p className="text-xs text-gray-500">This quarter</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {performanceReviews.filter(r => r.status === 'Completed').length}</p>
              <p>Percentage: {Math.round((performanceReviews.filter(r => r.status === 'Completed').length / performanceReviews.length) * 100)}%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Star className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Average Rating</h3>
                <p className="text-xs text-gray-500">Overall performance</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Rating: {Math.round((performanceReviews.reduce((sum, r) => sum + r.overallRating, 0) / performanceReviews.length) * 10) / 10}/5.0</p>
              <p>Status: {getRatingText(performanceReviews.reduce((sum, r) => sum + r.overallRating, 0) / performanceReviews.length)}</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Award className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Top Performers</h3>
                <p className="text-xs text-gray-500">Rating ≥ 4.5</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {performanceReviews.filter(r => r.overallRating >= 4.5).length}</p>
              <p>Percentage: {Math.round((performanceReviews.filter(r => r.overallRating >= 4.5).length / performanceReviews.length) * 100)}%</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Promotion Eligible</h3>
                <p className="text-xs text-gray-500">Ready for promotion</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Count: {performanceReviews.filter(r => r.promotionEligible).length}</p>
              <p>Percentage: {Math.round((performanceReviews.filter(r => r.promotionEligible).length / performanceReviews.length) * 100)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Management Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/hr/performance/create"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-medium text-sm">New Review</h3>
            <p className="text-xs text-gray-500">Create performance review</p>
          </Link>
          <Link
            href="/hr/performance/goals"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Target className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-medium text-sm">Goal Setting</h3>
            <p className="text-xs text-gray-500">Set performance goals</p>
          </Link>
          <Link
            href="/hr/performance/development"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <TrendingUp className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-medium text-sm">Development Plans</h3>
            <p className="text-xs text-gray-500">Create development plans</p>
          </Link>
          <Link
            href="/hr/performance/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-yellow-600 mb-3" />
            <h3 className="font-medium text-sm">Performance Reports</h3>
            <p className="text-xs text-gray-500">Generate reports</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
