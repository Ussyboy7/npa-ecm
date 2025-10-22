"use client";

import {
  FileText,
  Clock,
  CheckCircle,
  Archive,
  Upload,
  Search,
  BarChart3,
  Download,
  Eye,
  Filter,
  Calendar,
  Tag,
  FolderOpen,
  Database,
  Shield,
  AlertTriangle,
  TrendingUp,
  Users,
  Building
} from "lucide-react";
import Link from "next/link";

export default function RegistryDashboard() {
  const stats = [
    {
      name: "Approved Documents",
      value: "1,247",
      change: "+89",
      changeType: "positive",
      icon: CheckCircle,
      description: "Ready for archiving",
      href: "/registry/approved"
    },
    {
      name: "Incoming Logs",
      value: "156",
      change: "+23",
      changeType: "positive",
      icon: Upload,
      description: "This month",
      href: "/registry/incoming"
    },
    {
      name: "Outgoing Records",
      value: "98",
      change: "+15",
      changeType: "positive",
      icon: FileText,
      description: "Dispatched",
      href: "/registry/outgoing"
    },
    {
      name: "Search Queries",
      value: "445",
      change: "+67",
      changeType: "positive",
      icon: Search,
      description: "Document searches",
      href: "/reports/searches"
    }
  ];

  const recentDocuments = [
    {
      id: 1,
      reference: "NPA/ADMIN/2025/0189",
      title: "Headquarters Building Maintenance Contract",
      type: "Contract",
      department: "Administration",
      status: "Approved",
      approvedDate: "2025-01-15",
      approvedBy: "MD",
      archiveLocation: "A-15-2025",
      retentionPeriod: "7 years",
      priority: "High"
    },
    {
      id: 2,
      reference: "NPA/ICT/2025/0176",
      title: "Software License Renewal Agreement",
      type: "Agreement",
      department: "ICT",
      status: "Approved",
      approvedDate: "2025-01-14",
      approvedBy: "GM ICT",
      archiveLocation: "B-12-2025",
      retentionPeriod: "5 years",
      priority: "Medium"
    },
    {
      id: 3,
      reference: "NPA/HR/2025/0145",
      title: "Staff Performance Review Policy",
      type: "Policy",
      department: "Human Resources",
      status: "Approved",
      approvedDate: "2025-01-13",
      approvedBy: "GM HR",
      archiveLocation: "C-08-2025",
      retentionPeriod: "10 years",
      priority: "High"
    },
    {
      id: 4,
      reference: "NPA/LEGAL/2025/0098",
      title: "Port Concession Agreement Amendment",
      type: "Legal Document",
      department: "Legal Services",
      status: "Approved",
      approvedDate: "2025-01-12",
      approvedBy: "GM Legal",
      archiveLocation: "D-05-2025",
      retentionPeriod: "15 years",
      priority: "Critical"
    }
  ];

  const incomingCorrespondence = [
    {
      id: 1,
      reference: "NPA/CORR/IN/2025/0067",
      subject: "Federal Ministry of Transportation - Port Security Directive",
      sender: "Federal Ministry of Transportation",
      receivedDate: "2025-01-15",
      priority: "High",
      status: "Registered",
      assignedTo: "GM Marine Operations",
      actionRequired: "Compliance Review"
    },
    {
      id: 2,
      reference: "NPA/CORR/IN/2025/0065",
      subject: "NITDA Cybersecurity Compliance Notice",
      sender: "National Information Technology Development Agency",
      receivedDate: "2025-01-14",
      priority: "Medium",
      status: "Registered",
      assignedTo: "GM ICT",
      actionRequired: "Implementation Plan"
    },
    {
      id: 3,
      reference: "NPA/CORR/IN/2025/0062",
      subject: "Vendor Partnership Proposal",
      sender: "Tech Solutions Ltd",
      receivedDate: "2025-01-13",
      priority: "Normal",
      status: "Registered",
      assignedTo: "AGM ICT",
      actionRequired: "Technical Evaluation"
    }
  ];

  const outgoingCorrespondence = [
    {
      id: 1,
      reference: "NPA/CORR/OUT/2025/0045",
      subject: "Response to Port Security Directive",
      recipient: "Federal Ministry of Transportation",
      sentDate: "2025-01-16",
      priority: "High",
      status: "Dispatched",
      sentBy: "GM Marine Operations",
      deliveryMethod: "Official Courier"
    },
    {
      id: 2,
      reference: "NPA/CORR/OUT/2025/0042",
      subject: "ICT Infrastructure Upgrade Proposal",
      recipient: "Ministry of Communications",
      sentDate: "2025-01-15",
      priority: "Medium",
      status: "Dispatched",
      sentBy: "GM ICT",
      deliveryMethod: "Email + Hard Copy"
    }
  ];

  const documentCategories = [
    {
      category: "Contracts & Agreements",
      count: 234,
      retention: "7-15 years",
      lastUpdated: "2025-01-15",
      status: "Active"
    },
    {
      category: "Policies & Procedures",
      count: 156,
      retention: "10 years",
      lastUpdated: "2025-01-14",
      status: "Active"
    },
    {
      category: "Financial Records",
      count: 445,
      retention: "7 years",
      lastUpdated: "2025-01-13",
      status: "Active"
    },
    {
      category: "Legal Documents",
      count: 89,
      retention: "15 years",
      lastUpdated: "2025-01-12",
      status: "Active"
    },
    {
      category: "Correspondence",
      count: 1247,
      retention: "5 years",
      lastUpdated: "2025-01-16",
      status: "Active"
    }
  ];

  const complianceMetrics = [
    {
      metric: "Document Retention Compliance",
      value: "98%",
      status: "Excellent",
      trend: "up"
    },
    {
      metric: "Archive Organization",
      value: "95%",
      status: "Good",
      trend: "up"
    },
    {
      metric: "Search Response Time",
      value: "2.3 min",
      status: "Good",
      trend: "down"
    },
    {
      metric: "Document Security",
      value: "100%",
      status: "Excellent",
      trend: "stable"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Registry Dashboard</h1>
          <p className="text-gray-600">Document lifecycle management, archiving, and compliance tracking</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/registry/register"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            Register Document
          </Link>
          <Link
            href="/registry/search"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Search className="w-4 h-4 mr-2" />
            Advanced Search
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
        {/* Recent Approved Documents */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Approved Documents</h2>
            <Link
              href="/registry/approved"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {recentDocuments.map((doc) => (
              <DocumentItem key={doc.id} document={doc} />
            ))}
          </div>
        </div>

        {/* Document Categories */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Document Categories</h2>
            <Link
              href="/registry/categories"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Manage categories
            </Link>
          </div>
          <div className="space-y-4">
            {documentCategories.map((category, index) => (
              <CategoryItem key={index} category={category} />
            ))}
          </div>
        </div>
      </div>

      {/* Correspondence Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incoming Correspondence */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Incoming Correspondence</h2>
            <Link
              href="/registry/incoming"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {incomingCorrespondence.map((corr) => (
              <CorrespondenceItem key={corr.id} correspondence={corr} type="incoming" />
            ))}
          </div>
        </div>

        {/* Outgoing Correspondence */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Outgoing Correspondence</h2>
            <Link
              href="/registry/outgoing"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {outgoingCorrespondence.map((corr) => (
              <CorrespondenceItem key={corr.id} correspondence={corr} type="outgoing" />
            ))}
          </div>
        </div>
      </div>

      {/* Compliance & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Metrics */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Compliance Metrics</h2>
            <Link
              href="/reports/compliance"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View report
            </Link>
          </div>
          <div className="space-y-4">
            {complianceMetrics.map((metric, index) => (
              <ComplianceMetricItem key={index} metric={metric} />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Registry Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <QuickActionButton
              title="Document Search"
              description="Advanced search and retrieval"
              icon={Search}
              href="/registry/search"
              color="bg-blue-50 text-blue-600 hover:bg-blue-100"
            />
            <QuickActionButton
              title="Archive Management"
              description="Organize and manage archives"
              icon={Archive}
              href="/registry/archive"
              color="bg-green-50 text-green-600 hover:bg-green-100"
            />
            <QuickActionButton
              title="Compliance Check"
              description="Review retention policies"
              icon={Shield}
              href="/registry/compliance"
              color="bg-red-50 text-red-600 hover:bg-red-100"
            />
            <QuickActionButton
              title="Reports & Analytics"
              description="Registry performance data"
              icon={BarChart3}
              href="/reports/registry"
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

function DocumentItem({ document }: { document: any }) {
  const priorityColorMap = {
    'Critical': 'bg-red-100 text-red-800',
    'High': 'bg-orange-100 text-orange-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-green-100 text-green-800'
  };
  const priorityColor = priorityColorMap[document.priority as keyof typeof priorityColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h4 className="text-sm font-medium text-gray-900">{document.title}</h4>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColor}`}>
              {document.priority}
            </span>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Reference: <span className="font-mono">{document.reference}</span></p>
            <p>Type: {document.type} | Department: {document.department}</p>
            <p>Approved: {document.approvedDate} by {document.approvedBy}</p>
            <p>Archive: {document.archiveLocation} | Retention: {document.retentionPeriod}</p>
          </div>
        </div>
        <div className="flex space-x-2 ml-4">
          <Link
            href={`/registry/documents/${document.id}`}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <Link
            href={`/registry/documents/${document.id}/download`}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function CategoryItem({ category }: { category: any }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <FolderOpen className="w-5 h-5 text-gray-400" />
        <div>
          <h4 className="text-sm font-medium text-gray-900">{category.category}</h4>
          <p className="text-xs text-gray-500">Retention: {category.retention}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold text-gray-900">{category.count}</p>
        <p className="text-xs text-gray-500">Updated: {category.lastUpdated}</p>
      </div>
    </div>
  );
}

function CorrespondenceItem({ correspondence, type }: { correspondence: any; type: string }) {
  const priorityColorMap = {
    'High': 'bg-red-100 text-red-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Normal': 'bg-blue-100 text-blue-800'
  };
  const priorityColor = priorityColorMap[correspondence.priority as keyof typeof priorityColorMap] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h4 className="text-sm font-medium text-gray-900">{correspondence.subject}</h4>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColor}`}>
              {correspondence.priority}
            </span>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Reference: <span className="font-mono">{correspondence.reference}</span></p>
            {type === 'incoming' ? (
              <>
                <p>From: {correspondence.sender}</p>
                <p>Received: {correspondence.receivedDate}</p>
                <p>Assigned to: {correspondence.assignedTo}</p>
                <p>Action: {correspondence.actionRequired}</p>
              </>
            ) : (
              <>
                <p>To: {correspondence.recipient}</p>
                <p>Sent: {correspondence.sentDate}</p>
                <p>By: {correspondence.sentBy}</p>
                <p>Method: {correspondence.deliveryMethod}</p>
              </>
            )}
          </div>
        </div>
        <div className="flex space-x-2 ml-4">
          <Link
            href={`/registry/correspondence/${correspondence.id}`}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            View
          </Link>
        </div>
      </div>
    </div>
  );
}

function ComplianceMetricItem({ metric }: { metric: any }) {
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
        <p className="text-xs text-gray-500">Current performance</p>
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