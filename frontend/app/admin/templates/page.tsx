"use client";

import { useState } from "react";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  FileText, 
  Search,
  Filter,
  MoreVertical,
  Copy,
  Download
} from "lucide-react";

export default function AdminTemplatesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Mock template data
  const templates = [
    {
      id: 1,
      name: "Official Memo Template",
      description: "Standard memo format for official communications",
      category: "Communication",
      department: "All Departments",
      createdBy: "Admin",
      createdDate: "2024-12-01",
      lastModified: "2024-12-15",
      usage: 45,
      isActive: true,
      tags: ["memo", "official", "communication"]
    },
    {
      id: 2,
      name: "Financial Report Template",
      description: "Template for financial reports and budget documents",
      category: "Financial",
      department: "Finance",
      createdBy: "GM, Finance",
      createdDate: "2024-11-20",
      lastModified: "2024-12-10",
      usage: 23,
      isActive: true,
      tags: ["financial", "report", "budget"]
    },
    {
      id: 3,
      name: "Incident Report Template",
      description: "Template for security and operational incident reports",
      category: "Security",
      department: "Security",
      createdBy: "GM, Security",
      createdDate: "2024-11-15",
      lastModified: "2024-12-05",
      usage: 12,
      isActive: true,
      tags: ["incident", "security", "report"]
    },
    {
      id: 4,
      name: "HR Policy Template",
      description: "Template for creating HR policy documents",
      category: "HR",
      department: "Human Resources",
      createdBy: "GM, HR",
      createdDate: "2024-10-30",
      lastModified: "2024-11-25",
      usage: 8,
      isActive: true,
      tags: ["hr", "policy", "procedures"]
    },
    {
      id: 5,
      name: "Contract Template",
      description: "Standard template for vendor contracts and agreements",
      category: "Legal",
      department: "Legal Services",
      createdBy: "AGM, Legal",
      createdDate: "2024-10-15",
      lastModified: "2024-11-20",
      usage: 15,
      isActive: false,
      tags: ["contract", "legal", "vendor"]
    }
  ];

  const categories = [
    "All Categories",
    "Communication",
    "Financial", 
    "Security",
    "HR",
    "Legal",
    "Operations",
    "Technical"
  ];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleEdit = (template: any) => {
    console.log('Edit template:', template);
    // Navigate to edit page
  };

  const handleDelete = (template: any) => {
    if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
      console.log('Delete template:', template);
    }
  };

  const handleDuplicate = (template: any) => {
    console.log('Duplicate template:', template);
  };

  const handleDownload = (template: any) => {
    console.log('Download template:', template);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Document Templates</h1>
          <p className="text-gray-600">Manage document templates for the organization</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {categories.map((category) => (
              <option key={category} value={category === "All Categories" ? "" : category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div key={template.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleEdit(template)}
                    className="p-1 text-gray-400 hover:text-blue-600"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicate(template)}
                    className="p-1 text-gray-400 hover:text-green-600"
                    title="Duplicate"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">{template.description}</p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Category:</span>
                  <span className="font-medium">{template.category}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Department:</span>
                  <span className="font-medium">{template.department}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Usage:</span>
                  <span className="font-medium">{template.usage} times</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    template.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {template.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Modified: {new Date(template.lastModified).toLocaleDateString()}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDownload(template)}
                    className="p-2 text-gray-400 hover:text-blue-600"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(template)}
                    className="p-2 text-gray-400 hover:text-blue-600"
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No templates found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery || selectedCategory 
              ? "Try adjusting your search criteria."
              : "Get started by creating your first template."
            }
          </p>
        </div>
      )}
    </div>
  );
}
