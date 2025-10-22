import Link from "next/link";
import { FileText, Upload, FolderOpen, Shield, Zap, Users, Workflow, Archive, CheckCircle } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <FileText className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">NPA ECM</h1>
          </div>
          <div className="flex space-x-4">
            <Link
              href="/login"
              className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              Login
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Electronic Content Management
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Digitize, organize, and streamline official documents, memos, correspondences, and operational records across headquarters, ports, and departments with intelligent workflows and approval systems.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/dashboard"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg"
            >
              Get Started
            </Link>
            <Link
              href="/about"
              className="px-8 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-50 font-semibold text-lg border-2 border-blue-600"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Enterprise ECM Features
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Upload className="h-12 w-12 text-blue-600" />}
            title="Digital Document Intake"
            description="Upload via web interface, email integration, or bulk scanner import with automatic OCR processing."
          />
          <FeatureCard
            icon={<Workflow className="h-12 w-12 text-blue-600" />}
            title="Multi-Level Workflows"
            description="Automated approval workflows with configurable routing for different document types and departments."
          />
          <FeatureCard
            icon={<Shield className="h-12 w-12 text-blue-600" />}
            title="Compliance & Security"
            description="Role-based access, audit trails, retention policies, and legal hold functionality."
          />
          <FeatureCard
            icon={<Zap className="h-12 w-12 text-blue-600" />}
            title="Advanced Search"
            description="Full-text search across OCR content with intelligent filtering by department, type, and metadata."
          />
          <FeatureCard
            icon={<Archive className="h-12 w-12 text-blue-600" />}
            title="Records Management"
            description="Automated archival, retention enforcement, and compliance reporting for regulatory requirements."
          />
          <FeatureCard
            icon={<CheckCircle className="h-12 w-12 text-blue-600" />}
            title="Approval Management"
            description="Streamlined approval queues, delegation support, and workflow visualization for efficient processing."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-gray-600">
          <p>&copy; 2024 NPA Electronic Content Management System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <div className="mb-4">{icon}</div>
      <h4 className="text-xl font-semibold text-gray-900 mb-2">{title}</h4>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}







